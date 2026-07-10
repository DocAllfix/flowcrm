-- ═══════════════════════════════════════════════════════════════════
-- FASE 11 — Modulo HR (trasversale). Personale, ferie/permessi, formazione.
-- Visibile SOLO ad admin/manager (puo_amministrazione()); operatore escluso.
-- ═══════════════════════════════════════════════════════════════════
CREATE TYPE tipo_contratto AS ENUM
  ('indeterminato', 'determinato', 'apprendistato', 'collaborazione', 'stage', 'partita_iva');
CREATE TYPE assenza_tipo AS ENUM ('ferie', 'permesso', 'malattia');
CREATE TYPE assenza_stato AS ENUM ('richiesta', 'approvata', 'rifiutata');

CREATE TABLE dipendenti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  cognome         TEXT,
  email           TEXT,
  telefono        TEXT,
  qualifica       TEXT,
  tipo_contratto  tipo_contratto,
  data_assunzione DATE,
  data_fine       DATE,
  note            TEXT,
  attivo          BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES user_profiles(id),
  updated_by      UUID REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assenze (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dipendente_id UUID NOT NULL REFERENCES dipendenti(id) ON DELETE CASCADE,
  tipo          assenza_tipo NOT NULL DEFAULT 'ferie',
  data_inizio   DATE NOT NULL,
  data_fine     DATE NOT NULL,
  stato         assenza_stato NOT NULL DEFAULT 'richiesta',
  note          TEXT,
  created_by    UUID REFERENCES user_profiles(id),
  updated_by    UUID REFERENCES user_profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE formazione (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dipendente_id UUID NOT NULL REFERENCES dipendenti(id) ON DELETE CASCADE,
  corso         TEXT NOT NULL,
  data          DATE,
  ore           NUMERIC(6,1),
  completato    BOOLEAN NOT NULL DEFAULT false,
  note          TEXT,
  created_by    UUID REFERENCES user_profiles(id),
  updated_by    UUID REFERENCES user_profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assenze_dip ON assenze(dipendente_id);
CREATE INDEX idx_formazione_dip ON formazione(dipendente_id);

-- ── RLS: tutto riservato ad admin/manager; delete solo admin ──────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['dipendenti','assenze','formazione'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (puo_amministrazione())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated WITH CHECK (puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated USING (puo_amministrazione()) WITH CHECK (puo_amministrazione())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated USING (get_user_role() = 'admin')$f$, t);
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;
END $$;
