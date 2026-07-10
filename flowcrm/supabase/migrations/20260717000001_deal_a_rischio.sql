-- ═══════════════════════════════════════════════════════════════════
-- F12c — Proattivo: notifica i deal APERTI fermi da troppo tempo
-- (nessuna attività recente). Idempotente: una volta a settimana per deal.
-- Riusa il tracking di F10 (notifiche_scadenza_inviate) e pg_cron.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notifica_deal_a_rischio(giorni INT DEFAULT 7)
RETURNS INT AS $$
DECLARE
  rec RECORD;
  settimana INT := (EXTRACT(ISOYEAR FROM CURRENT_DATE)::INT * 100
                    + EXTRACT(WEEK FROM CURRENT_DATE)::INT);
  destinatari UUID[];
  dest UUID;
  n INT := 0;
BEGIN
  FOR rec IN
    SELECT d.id, d.nome, d.responsabile_id,
           GREATEST(
             d.updated_at,
             COALESCE((SELECT max(a.created_at) FROM attivita a WHERE a.deal_id = d.id), d.created_at)
           ) AS ultima_attivita
    FROM deals d
    JOIN pipeline_stages s ON s.id = d.stage_id
    WHERE d.attivo AND NOT s.is_won AND NOT s.is_lost
  LOOP
    -- solo se fermo da più di `giorni`
    CONTINUE WHEN rec.ultima_attivita > (NOW() - (giorni || ' days')::INTERVAL);

    -- idempotenza settimanale
    INSERT INTO notifiche_scadenza_inviate (entita, entita_id, giorni_soglia)
    VALUES ('deal_rischio', rec.id, settimana)
    ON CONFLICT DO NOTHING;
    CONTINUE WHEN NOT FOUND;

    -- destinatari: il responsabile del deal, o tutti gli admin/manager
    IF rec.responsabile_id IS NOT NULL THEN
      destinatari := ARRAY[rec.responsabile_id];
    ELSE
      SELECT array_agg(id) INTO destinatari
      FROM user_profiles WHERE ruolo IN ('admin', 'manager') AND attivo;
    END IF;

    IF destinatari IS NULL THEN CONTINUE; END IF;
    FOREACH dest IN ARRAY destinatari LOOP
      PERFORM crea_notifica(
        dest, 'warning'::notifica_tipo,
        'Deal fermo da rivedere',
        'Il deal "' || rec.nome || '" non ha attività da oltre ' || giorni || ' giorni.',
        '/deal/' || rec.id
      );
      n := n + 1;
    END LOOP;
  END LOOP;

  RETURN n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION notifica_deal_a_rischio(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION notifica_deal_a_rischio(INT) TO service_role;

-- Cron settimanale: lunedì alle 07:00 UTC
SELECT cron.unschedule('deal-a-rischio-settimanale')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'deal-a-rischio-settimanale');

SELECT cron.schedule(
  'deal-a-rischio-settimanale',
  '0 7 * * 1',
  $$SELECT notifica_deal_a_rischio(7)$$
);
