-- ═══════════════════════════════════════════════════════════════════
-- F10.1 — Scadenzario automatico: aggiorna stati scaduti + notifiche a
-- soglie, in modo IDEMPOTENTE (rieseguibile senza duplicare notifiche).
-- Pattern escalation di CertDesk (cron-scadenze) adattato.
-- ═══════════════════════════════════════════════════════════════════

-- Tracking notifiche già inviate (idempotenza multi-soglia)
CREATE TABLE notifiche_scadenza_inviate (
  entita        TEXT NOT NULL,        -- 'scadenza_pagamento' | 'scadenza_tassa' | 'fattura'
  entita_id     UUID NOT NULL,
  giorni_soglia INT NOT NULL,         -- 7, 1, 0 (=scaduto)
  inviata_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entita, entita_id, giorni_soglia)
);

-- Solo admin può leggere il tracking (monitoraggio); scrittura via funzione.
ALTER TABLE notifiche_scadenza_inviate ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracking_select_admin" ON notifiche_scadenza_inviate
  FOR SELECT TO authenticated USING (get_user_role() = 'admin');

-- ── Funzione principale (SECURITY DEFINER, chiamata dal cron) ─────
-- 1. Aggiorna gli stati scaduti (una sola fonte di verità: qui, non a mano)
-- 2. Crea notifiche in-app ad admin+manager alle soglie [7,1,0] giorni
--    per incassi, tasse e fatture, idempotente via tracking.
-- Ritorna il numero di notifiche create (per logging/test).
CREATE OR REPLACE FUNCTION processa_scadenze()
RETURNS INT AS $$
DECLARE
  soglie INT[] := ARRAY[7, 1, 0];
  soglia INT;
  rec RECORD;
  destinatari UUID[];
  dest UUID;
  n_creaste INT := 0;
  giorni INT;
BEGIN
  -- Destinatari: tutti gli admin e manager attivi
  SELECT array_agg(id) INTO destinatari
  FROM user_profiles WHERE ruolo IN ('admin', 'manager') AND attivo;
  IF destinatari IS NULL THEN RETURN 0; END IF;

  -- ── 1. Aggiorna stati scaduti ──────────────────────────────────
  UPDATE scadenze_pagamento SET stato = 'in_ritardo'
    WHERE stato = 'da_incassare' AND data_prevista < CURRENT_DATE;
  UPDATE scadenze_tasse SET stato = 'scaduta'
    WHERE stato = 'da_pagare' AND scadenza < CURRENT_DATE;
  UPDATE fatture SET stato = 'scaduta'
    WHERE stato = 'da_pagare' AND scadenza < CURRENT_DATE;

  -- ── 2. Notifiche a soglie per INCASSI in avvicinamento/scaduti ──
  FOREACH soglia IN ARRAY soglie LOOP
    FOR rec IN
      SELECT sp.id, sp.descrizione, sp.data_prevista, sp.importo,
             (sp.data_prevista - CURRENT_DATE) AS gg
      FROM scadenze_pagamento sp
      WHERE sp.stato IN ('da_incassare', 'in_ritardo')
        AND (sp.data_prevista - CURRENT_DATE) = soglia
    LOOP
      -- idempotenza: salta se già notificato a questa soglia
      INSERT INTO notifiche_scadenza_inviate (entita, entita_id, giorni_soglia)
      VALUES ('scadenza_pagamento', rec.id, soglia)
      ON CONFLICT DO NOTHING;
      IF NOT FOUND THEN CONTINUE; END IF;

      FOREACH dest IN ARRAY destinatari LOOP
        PERFORM crea_notifica(
          dest,
          CASE WHEN soglia <= 0 THEN 'warning' ELSE 'info' END::notifica_tipo,
          CASE WHEN soglia = 0 THEN 'Incasso in scadenza oggi'
               WHEN soglia < 0 THEN 'Incasso in ritardo'
               ELSE 'Incasso tra ' || soglia || ' giorni' END,
          rec.descrizione || ' — € ' || rec.importo,
          '/incassi'
        );
        n_creaste := n_creaste + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  -- ── 3. Notifiche a soglie per SCADENZE FISCALI ─────────────────
  FOREACH soglia IN ARRAY soglie LOOP
    FOR rec IN
      SELECT st.id, st.tipo_tassa, st.importo,
             (st.scadenza - CURRENT_DATE) AS gg
      FROM scadenze_tasse st
      WHERE st.stato IN ('da_pagare', 'scaduta')
        AND (st.scadenza - CURRENT_DATE) = soglia
    LOOP
      INSERT INTO notifiche_scadenza_inviate (entita, entita_id, giorni_soglia)
      VALUES ('scadenza_tassa', rec.id, soglia)
      ON CONFLICT DO NOTHING;
      IF NOT FOUND THEN CONTINUE; END IF;

      FOREACH dest IN ARRAY destinatari LOOP
        PERFORM crea_notifica(
          dest,
          CASE WHEN soglia <= 0 THEN 'critical' ELSE 'warning' END::notifica_tipo,
          CASE WHEN soglia = 0 THEN 'Tassa in scadenza oggi'
               WHEN soglia < 0 THEN 'Tassa scaduta'
               ELSE 'Tassa tra ' || soglia || ' giorni' END,
          rec.tipo_tassa || ' — € ' || rec.importo,
          '/tasse'
        );
        n_creaste := n_creaste + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN n_creaste;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION processa_scadenze() FROM PUBLIC;
-- Eseguibile solo dal cron (service_role) e da admin per test manuali.
GRANT EXECUTE ON FUNCTION processa_scadenze() TO service_role;

-- ── Scheduling pg_cron (ogni giorno alle 06:00 UTC) ──────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Rimuove eventuale schedule preesistente con lo stesso nome (idempotente)
SELECT cron.unschedule('processa-scadenze-giornaliero')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'processa-scadenze-giornaliero');

SELECT cron.schedule(
  'processa-scadenze-giornaliero',
  '0 6 * * *',
  $$SELECT processa_scadenze()$$
);
