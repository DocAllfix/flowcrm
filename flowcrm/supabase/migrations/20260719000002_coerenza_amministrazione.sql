-- ═══════════════════════════════════════════════════════════════════
-- FASE 2 — Coerenza amministrazione
-- 1) Modificando una fattura attiva, la scadenza/incasso collegato (non
--    ancora incassato) si riallinea (importo, data, descrizione).
-- 2) Segnando incassata una scadenza, la fattura collegata diventa 'pagata'
--    (e torna indietro se l'incasso viene annullato).
-- 3) processa_scadenze NON marca 'scaduta' una fattura già incassata.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Fattura UPDATE → risincronizza la scadenza collegata ───────
CREATE OR REPLACE FUNCTION fattura_risincronizza_scadenza()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.direzione = 'attiva' AND (
       NEW.totale   IS DISTINCT FROM OLD.totale
    OR NEW.scadenza IS DISTINCT FROM OLD.scadenza
    OR NEW.numero   IS DISTINCT FROM OLD.numero
  ) THEN
    UPDATE scadenze_pagamento
       SET importo       = NEW.totale,
           data_prevista = NEW.scadenza,
           descrizione   = 'Incasso fattura ' || NEW.numero
     WHERE fattura_id = NEW.id
       AND stato <> 'incassato';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS fatture_risincronizza_scadenza ON fatture;
CREATE TRIGGER fatture_risincronizza_scadenza
  AFTER UPDATE ON fatture
  FOR EACH ROW EXECUTE FUNCTION fattura_risincronizza_scadenza();

-- ── 2. Incasso ↔ stato fattura ────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_fattura_da_scadenza()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.fattura_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.stato = 'incassato' AND OLD.stato IS DISTINCT FROM 'incassato' THEN
    UPDATE fatture SET stato = 'pagata'
      WHERE id = NEW.fattura_id AND stato <> 'pagata';
  ELSIF OLD.stato = 'incassato' AND NEW.stato <> 'incassato' THEN
    -- incasso annullato: la fattura torna da_pagare (o scaduta se oltre)
    UPDATE fatture
       SET stato = (CASE WHEN scadenza < CURRENT_DATE THEN 'scaduta' ELSE 'da_pagare' END)::fattura_stato
     WHERE id = NEW.fattura_id AND stato = 'pagata';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS scadenza_sync_fattura ON scadenze_pagamento;
CREATE TRIGGER scadenza_sync_fattura
  AFTER UPDATE OF stato ON scadenze_pagamento
  FOR EACH ROW EXECUTE FUNCTION sync_fattura_da_scadenza();

-- ── 3. processa_scadenze: non marcare 'scaduta' una fattura incassata ─
CREATE OR REPLACE FUNCTION processa_scadenze()
RETURNS INT AS $$
DECLARE
  soglie INT[] := ARRAY[7, 1, 0];
  soglia INT;
  rec RECORD;
  destinatari UUID[];
  dest UUID;
  n_creaste INT := 0;
BEGIN
  SELECT array_agg(id) INTO destinatari
  FROM user_profiles WHERE ruolo IN ('admin', 'manager') AND attivo;
  IF destinatari IS NULL THEN RETURN 0; END IF;

  -- 1. Aggiorna stati scaduti
  UPDATE scadenze_pagamento SET stato = 'in_ritardo'
    WHERE stato = 'da_incassare' AND data_prevista < CURRENT_DATE;
  UPDATE scadenze_tasse SET stato = 'scaduta'
    WHERE stato = 'da_pagare' AND scadenza < CURRENT_DATE;
  UPDATE fatture SET stato = 'scaduta'
    WHERE stato = 'da_pagare' AND scadenza < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM scadenze_pagamento
        WHERE fattura_id = fatture.id AND stato = 'incassato'
      );

  -- 2. Incassi: soglia>0 → giorno esatto; soglia 0 → oggi o in ritardo
  FOREACH soglia IN ARRAY soglie LOOP
    FOR rec IN
      SELECT sp.id, sp.descrizione, sp.importo, (sp.data_prevista - CURRENT_DATE) AS gg
      FROM scadenze_pagamento sp
      WHERE sp.stato IN ('da_incassare', 'in_ritardo')
        AND ((soglia > 0 AND (sp.data_prevista - CURRENT_DATE) = soglia)
          OR (soglia = 0 AND (sp.data_prevista - CURRENT_DATE) <= 0))
    LOOP
      INSERT INTO notifiche_scadenza_inviate (entita, entita_id, giorni_soglia)
      VALUES ('scadenza_pagamento', rec.id, soglia)
      ON CONFLICT DO NOTHING;
      IF NOT FOUND THEN CONTINUE; END IF;
      FOREACH dest IN ARRAY destinatari LOOP
        PERFORM crea_notifica(
          dest,
          CASE WHEN soglia = 0 THEN 'warning' ELSE 'info' END::notifica_tipo,
          CASE WHEN soglia = 0 AND rec.gg < 0 THEN 'Incasso in ritardo'
               WHEN soglia = 0 THEN 'Incasso in scadenza oggi'
               ELSE 'Incasso tra ' || soglia || ' giorni' END,
          rec.descrizione || ' — € ' || rec.importo, '/incassi'
        );
        n_creaste := n_creaste + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  -- 3. Scadenze fiscali: stessa logica
  FOREACH soglia IN ARRAY soglie LOOP
    FOR rec IN
      SELECT st.id, st.tipo_tassa, st.importo, (st.scadenza - CURRENT_DATE) AS gg
      FROM scadenze_tasse st
      WHERE st.stato IN ('da_pagare', 'scaduta')
        AND ((soglia > 0 AND (st.scadenza - CURRENT_DATE) = soglia)
          OR (soglia = 0 AND (st.scadenza - CURRENT_DATE) <= 0))
    LOOP
      INSERT INTO notifiche_scadenza_inviate (entita, entita_id, giorni_soglia)
      VALUES ('scadenza_tassa', rec.id, soglia)
      ON CONFLICT DO NOTHING;
      IF NOT FOUND THEN CONTINUE; END IF;
      FOREACH dest IN ARRAY destinatari LOOP
        PERFORM crea_notifica(
          dest,
          CASE WHEN soglia = 0 THEN 'critical' ELSE 'warning' END::notifica_tipo,
          CASE WHEN soglia = 0 AND rec.gg < 0 THEN 'Tassa scaduta'
               WHEN soglia = 0 THEN 'Tassa in scadenza oggi'
               ELSE 'Tassa tra ' || soglia || ' giorni' END,
          rec.tipo_tassa || ' — € ' || rec.importo, '/tasse'
        );
        n_creaste := n_creaste + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN n_creaste;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
