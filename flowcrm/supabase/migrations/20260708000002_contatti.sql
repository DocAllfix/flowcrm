-- ═══════════════════════════════════════════════════════════════════
-- F2.2 — Contatti + chiusura FK referente_principale su organizzazioni
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE contatti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              TEXT NOT NULL,
  cognome           TEXT,
  email             TEXT,
  telefono          TEXT,
  ruolo_aziendale   TEXT,
  organizzazione_id UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  note              TEXT,
  attivo            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);

ALTER TABLE contatti ADD COLUMN ricerca tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(nome,'') || ' ' ||
      coalesce(cognome,'') || ' ' ||
      coalesce(email,'') || ' ' ||
      coalesce(ruolo_aziendale,'')
    )
  ) STORED;

CREATE INDEX idx_contatti_ricerca ON contatti USING GIN (ricerca);
CREATE INDEX idx_contatti_organizzazione ON contatti (organizzazione_id);
CREATE INDEX idx_contatti_cognome ON contatti (cognome);

CREATE TRIGGER contatti_updated_at
  BEFORE UPDATE ON contatti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Ora che contatti esiste, chiudo la FK del referente principale.
ALTER TABLE organizzazioni
  ADD CONSTRAINT fk_referente_principale
  FOREIGN KEY (referente_principale_id)
  REFERENCES contatti(id) ON DELETE SET NULL;

-- Coerenza: il referente principale deve appartenere all'organizzazione.
CREATE OR REPLACE FUNCTION check_referente_coerenza()
RETURNS TRIGGER AS $$
DECLARE
  org_del_contatto UUID;
BEGIN
  IF NEW.referente_principale_id IS NULL THEN RETURN NEW; END IF;
  SELECT organizzazione_id INTO org_del_contatto
  FROM contatti WHERE id = NEW.referente_principale_id;
  IF org_del_contatto IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Il referente principale deve essere un contatto di questa organizzazione';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizzazioni_check_referente
  BEFORE INSERT OR UPDATE OF referente_principale_id ON organizzazioni
  FOR EACH ROW EXECUTE FUNCTION check_referente_coerenza();

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE contatti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contatti_select" ON contatti
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "contatti_insert" ON contatti
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "contatti_update" ON contatti
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "contatti_delete" ON contatti
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

CREATE TRIGGER contatti_audit
  AFTER INSERT OR UPDATE OR DELETE ON contatti
  FOR EACH ROW EXECUTE FUNCTION log_audit();
