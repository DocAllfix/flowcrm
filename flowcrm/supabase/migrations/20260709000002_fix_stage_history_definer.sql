-- ═══════════════════════════════════════════════════════════════════
-- F4 fix — log_deal_stage_change deve essere SECURITY DEFINER.
-- deal_stage_history ha RLS con la sola policy SELECT (storico immutabile):
-- il trigger che vi scrive va eseguito come owner per bypassare la RLS,
-- esattamente come log_audit(). Senza questo, ogni INSERT/UPDATE su deals
-- fallisce con "violates row-level security policy".
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO deal_stage_history (deal_id, stage_precedente, stage_nuovo, cambiato_da)
    VALUES (NEW.id, NULL, NEW.stage_id, auth.uid());
  ELSIF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    INSERT INTO deal_stage_history (deal_id, stage_precedente, stage_nuovo, cambiato_da)
    VALUES (NEW.id, OLD.stage_id, NEW.stage_id, COALESCE(NEW.updated_by, auth.uid()));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION log_deal_stage_change() FROM PUBLIC;
