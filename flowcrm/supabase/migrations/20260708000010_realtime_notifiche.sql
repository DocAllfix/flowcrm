-- ═══════════════════════════════════════════════════════════════════
-- F3 — Abilita Realtime sulla tabella notifiche.
-- Senza questo, il canale postgres_changes non riceve gli INSERT.
-- La RLS resta la barriera: l'utente riceve solo le righe che può SELECT
-- (notifiche_select → destinatario_id = auth.uid()).
-- ═══════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE notifiche;
