-- ═══════════════════════════════════════════════════════════════════
-- F10 fix — la soglia 0 deve coprire "in scadenza oggi O già scaduto"
-- (gg <= 0), non solo gg = 0: altrimenti gli elementi già scaduti
-- (gg negativo) non generano mai la notifica.
-- ═══════════════════════════════════════════════════════════════════

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
    WHERE stato = 'da_pagare' AND scadenza < CURRENT_DATE;

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
