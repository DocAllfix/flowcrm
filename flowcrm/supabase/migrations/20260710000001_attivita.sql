-- ═══════════════════════════════════════════════════════════════════
-- F5.1 — Attività unificata (task/chiamata/email/riunione/nota)
-- Una sola tabella con FK opzionali verso le entità: la timeline dei
-- 360° aggrega tutto ciò che è collegato a quel record.
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE attivita_tipo AS ENUM (
  'task', 'chiamata', 'email', 'riunione', 'nota'
);

CREATE TYPE attivita_stato AS ENUM (
  'da_fare', 'in_corso', 'completata', 'annullata'
);

CREATE TYPE priorita_type AS ENUM (
  'bassa', 'media', 'alta', 'critica'
);

CREATE TABLE attivita (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo              attivita_tipo NOT NULL,
  titolo            TEXT NOT NULL,
  descrizione       TEXT,
  stato             attivita_stato NOT NULL DEFAULT 'da_fare',
  priorita          priorita_type NOT NULL DEFAULT 'media',
  scadenza          TIMESTAMPTZ,
  -- Specifici riunione
  inizio            TIMESTAMPTZ,
  durata_minuti     INT,
  luogo             TEXT,
  assegnato_a       UUID REFERENCES user_profiles(id),
  -- Collegamenti opzionali alle entità (la timeline li aggrega)
  organizzazione_id UUID REFERENCES organizzazioni(id) ON DELETE CASCADE,
  contatto_id       UUID REFERENCES contatti(id) ON DELETE CASCADE,
  deal_id           UUID REFERENCES deals(id) ON DELETE CASCADE,
  -- FK a progetti/commesse aggiunte in F7 (le tabelle non esistono ancora)
  progetto_id       UUID,
  commessa_id       UUID,
  completata_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_attivita_assegnato ON attivita (assegnato_a, stato, scadenza);
CREATE INDEX idx_attivita_organizzazione ON attivita (organizzazione_id);
CREATE INDEX idx_attivita_contatto ON attivita (contatto_id);
CREATE INDEX idx_attivita_deal ON attivita (deal_id);
CREATE INDEX idx_attivita_tipo ON attivita (tipo);

CREATE TRIGGER attivita_updated_at
  BEFORE UPDATE ON attivita FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- completata_at derivato dallo stato
CREATE OR REPLACE FUNCTION attivita_completata_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stato = 'completata' AND (OLD.stato IS DISTINCT FROM 'completata') THEN
    NEW.completata_at := NOW();
  ELSIF NEW.stato <> 'completata' THEN
    NEW.completata_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attivita_set_completata_at
  BEFORE INSERT OR UPDATE OF stato ON attivita
  FOR EACH ROW EXECUTE FUNCTION attivita_completata_at();

CREATE TRIGGER attivita_audit
  AFTER INSERT OR UPDATE OR DELETE ON attivita
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ── Partecipanti riunioni (contatti esterni + utenti interni) ────
CREATE TABLE riunioni_partecipanti (
  attivita_id UUID NOT NULL REFERENCES attivita(id) ON DELETE CASCADE,
  contatto_id UUID REFERENCES contatti(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  -- almeno uno dei due dev'essere valorizzato
  CHECK (contatto_id IS NOT NULL OR user_id IS NOT NULL)
);

CREATE INDEX idx_riunioni_partecipanti_attivita ON riunioni_partecipanti (attivita_id);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE attivita ENABLE ROW LEVEL SECURITY;
ALTER TABLE riunioni_partecipanti ENABLE ROW LEVEL SECURITY;

-- Attività CRM visibili a tutti gli autenticati; delete solo admin.
CREATE POLICY "attivita_select" ON attivita FOR SELECT TO authenticated USING (true);
CREATE POLICY "attivita_insert" ON attivita FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "attivita_update" ON attivita FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "attivita_delete" ON attivita FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- Partecipanti: leggibili da tutti, gestibili da chi può scrivere l'attività.
CREATE POLICY "riunioni_partecipanti_select" ON riunioni_partecipanti
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "riunioni_partecipanti_insert" ON riunioni_partecipanti
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "riunioni_partecipanti_delete" ON riunioni_partecipanti
  FOR DELETE TO authenticated USING (true);
