-- ═══════════════════════════════════════════════════════════════════
-- FASE 10 — Milestone di progetto (avanzamento grafico, richiesto dal
-- beta test per i progetti esterni). % avanzamento = milestone completate.
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE milestone (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progetto_id  UUID NOT NULL REFERENCES progetti(id) ON DELETE CASCADE,
  titolo       TEXT NOT NULL,
  data         DATE,
  completata   BOOLEAN NOT NULL DEFAULT false,
  ordine       INT NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES user_profiles(id),
  updated_by   UUID REFERENCES user_profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_milestone_progetto ON milestone(progetto_id, ordine);

ALTER TABLE milestone ENABLE ROW LEVEL SECURITY;

-- Team: lettura/scrittura per gli autenticati (come le altre entità CRM);
-- delete solo admin.
CREATE POLICY "milestone_select" ON milestone
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "milestone_insert" ON milestone
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "milestone_update" ON milestone
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "milestone_delete" ON milestone
  FOR DELETE TO authenticated USING (get_user_role() = 'admin');

CREATE TRIGGER milestone_updated_at
  BEFORE UPDATE ON milestone FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER milestone_freeze_autore
  BEFORE UPDATE ON milestone FOR EACH ROW EXECUTE FUNCTION freeze_created_by();
CREATE TRIGGER milestone_audit
  AFTER INSERT OR UPDATE OR DELETE ON milestone FOR EACH ROW EXECUTE FUNCTION log_audit();
