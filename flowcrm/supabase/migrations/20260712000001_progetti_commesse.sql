-- ═══════════════════════════════════════════════════════════════════
-- F7.1 — Progetti (cliente/interno) e Commesse (con codice auto race-safe)
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE progetto_tipo AS ENUM ('cliente', 'interno');
CREATE TYPE progetto_stato AS ENUM (
  'pianificazione', 'in_corso', 'in_revisione', 'completato', 'sospeso'
);
CREATE TYPE commessa_stato AS ENUM (
  'attiva', 'in_pausa', 'completata', 'annullata'
);

-- ── PROGETTI ─────────────────────────────────────────────────────
CREATE TABLE progetti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo              progetto_tipo NOT NULL,
  nome              TEXT NOT NULL,
  organizzazione_id UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  budget            NUMERIC(12,2),
  scadenza          DATE,
  stato             progetto_stato NOT NULL DEFAULT 'pianificazione',
  priorita          priorita_type NOT NULL DEFAULT 'media',
  responsabile_id   UUID REFERENCES user_profiles(id),
  descrizione       TEXT,
  attivo            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  -- un progetto cliente deve avere un'organizzazione
  CHECK (tipo <> 'cliente' OR organizzazione_id IS NOT NULL)
);

CREATE INDEX idx_progetti_organizzazione ON progetti (organizzazione_id);
CREATE INDEX idx_progetti_stato ON progetti (stato);

CREATE TRIGGER progetti_updated_at
  BEFORE UPDATE ON progetti FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER progetti_audit
  AFTER INSERT OR UPDATE OR DELETE ON progetti FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ── COMMESSE ─────────────────────────────────────────────────────
CREATE TABLE commesse (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice             TEXT UNIQUE,              -- COMM-YYYY-NNNN via trigger
  organizzazione_id  UUID NOT NULL REFERENCES organizzazioni(id),
  deal_id            UUID REFERENCES deals(id) ON DELETE SET NULL,      -- tracciabilità offerta→commessa
  progetto_id        UUID REFERENCES progetti(id) ON DELETE SET NULL,
  descrizione        TEXT NOT NULL,
  importo            NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_inizio        DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fine_prevista DATE,
  stato              commessa_stato NOT NULL DEFAULT 'attiva',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_commesse_organizzazione ON commesse (organizzazione_id);
CREATE INDEX idx_commesse_deal ON commesse (deal_id);
CREATE INDEX idx_commesse_stato ON commesse (stato);

-- Numerazione COMM-YYYY-NNNN race-safe (pattern advisory-lock CertDesk)
CREATE OR REPLACE FUNCTION genera_codice_commessa()
RETURNS TRIGGER AS $$
DECLARE
  anno INT := EXTRACT(YEAR FROM NOW());
  progressivo INT;
BEGIN
  PERFORM pg_advisory_xact_lock(3000 + anno);
  SELECT COALESCE(MAX(CAST(SPLIT_PART(codice, '-', 3) AS INT)), 0) + 1
  INTO progressivo
  FROM commesse
  WHERE codice LIKE 'COMM-' || anno || '-%';
  NEW.codice := 'COMM-' || anno || '-' || LPAD(progressivo::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_codice_commessa
  BEFORE INSERT ON commesse
  FOR EACH ROW WHEN (NEW.codice IS NULL)
  EXECUTE FUNCTION genera_codice_commessa();

CREATE TRIGGER commesse_updated_at
  BEFORE UPDATE ON commesse FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER commesse_audit
  AFTER INSERT OR UPDATE OR DELETE ON commesse FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ── Chiusura FK differite di attivita (create in F5 senza vincolo) ─
ALTER TABLE attivita
  ADD CONSTRAINT fk_attivita_progetto
  FOREIGN KEY (progetto_id) REFERENCES progetti(id) ON DELETE CASCADE;
ALTER TABLE attivita
  ADD CONSTRAINT fk_attivita_commessa
  FOREIGN KEY (commessa_id) REFERENCES commesse(id) ON DELETE CASCADE;
CREATE INDEX idx_attivita_progetto ON attivita (progetto_id);
CREATE INDEX idx_attivita_commessa ON attivita (commessa_id);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE progetti ENABLE ROW LEVEL SECURITY;
ALTER TABLE commesse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progetti_select" ON progetti FOR SELECT TO authenticated USING (true);
CREATE POLICY "progetti_insert" ON progetti FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "progetti_update" ON progetti FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "progetti_delete" ON progetti FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "commesse_select" ON commesse FOR SELECT TO authenticated USING (true);
CREATE POLICY "commesse_insert" ON commesse FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "commesse_update" ON commesse FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "commesse_delete" ON commesse FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');
