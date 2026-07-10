-- ═══════════════════════════════════════════════════════════════════
-- F2.1 — Organizzazioni + ruoli multipli
-- Sostituisce 5 collezioni del prototipo (aziende/clienti/fornitori/
-- partner/potenziali-partner) con UNA tabella + ruoli n:n.
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE org_ruolo AS ENUM (
  'cliente', 'fornitore', 'partner', 'potenziale_partner', 'prospect'
);

CREATE TYPE partner_tipo AS ENUM (
  'rivenditore', 'tecnologico', 'strategico', 'commerciale'
);

CREATE TYPE lead_fonte AS ENUM (
  'fiera', 'referral', 'linkedin', 'web', 'evento', 'altro'
);

CREATE TABLE organizzazioni (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ragione_sociale   TEXT NOT NULL,
  piva              TEXT,
  codice_fiscale    TEXT,
  sdi_codice        TEXT,
  pec               TEXT,
  email             TEXT,
  telefono          TEXT,
  dominio           TEXT,
  settore           TEXT,
  indirizzo         TEXT,
  citta             TEXT,
  cap               TEXT,
  provincia         TEXT,
  dipendenti        INT,
  fatturato_annuo   NUMERIC(14,2),
  -- Campi specifici per ruolo (nullable; valorizzati quando pertinente)
  valutazione_fornitore SMALLINT CHECK (valutazione_fornitore BETWEEN 1 AND 5),
  categoria_fornitore   TEXT,
  partner_tipo          partner_tipo,
  partner_data_inizio   DATE,
  lead_fonte            lead_fonte,
  note              TEXT,
  attivo            BOOLEAN NOT NULL DEFAULT true,
  -- referente_principale_id: FK aggiunta dopo la creazione di contatti
  referente_principale_id UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);

-- Ricerca full-text (cmd+K): colonna generata da campi chiave
ALTER TABLE organizzazioni ADD COLUMN ricerca tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(ragione_sociale,'') || ' ' ||
      coalesce(piva,'') || ' ' ||
      coalesce(citta,'') || ' ' ||
      coalesce(settore,'') || ' ' ||
      coalesce(email,'')
    )
  ) STORED;

CREATE INDEX idx_organizzazioni_ricerca ON organizzazioni USING GIN (ricerca);
CREATE INDEX idx_organizzazioni_ragione ON organizzazioni (ragione_sociale);
CREATE INDEX idx_organizzazioni_attivo ON organizzazioni (attivo);

CREATE TRIGGER organizzazioni_updated_at
  BEFORE UPDATE ON organizzazioni
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Ruoli n:n ────────────────────────────────────────────────────
CREATE TABLE organizzazioni_ruoli (
  organizzazione_id UUID NOT NULL REFERENCES organizzazioni(id) ON DELETE CASCADE,
  ruolo             org_ruolo NOT NULL,
  dal               DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (organizzazione_id, ruolo)
);

CREATE INDEX idx_org_ruoli_ruolo ON organizzazioni_ruoli (ruolo);

-- ── RLS ──────────────────────────────────────────────────────────
-- F2: le anagrafiche CRM sono visibili a tutti i ruoli autenticati
-- (operatore incluso: gli servono per lavorare deal/attività).
-- La restrizione forte è sul modulo amministrazione (F8), non qui.
ALTER TABLE organizzazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizzazioni_ruoli ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizzazioni_select" ON organizzazioni
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "organizzazioni_insert" ON organizzazioni
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "organizzazioni_update" ON organizzazioni
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Cancellazione definitiva: solo admin (regola generale del progetto).
CREATE POLICY "organizzazioni_delete" ON organizzazioni
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "org_ruoli_select" ON organizzazioni_ruoli
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "org_ruoli_insert" ON organizzazioni_ruoli
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "org_ruoli_delete" ON organizzazioni_ruoli
  FOR DELETE TO authenticated USING (true);

-- ── Audit trail ──────────────────────────────────────────────────
CREATE TRIGGER organizzazioni_audit
  AFTER INSERT OR UPDATE OR DELETE ON organizzazioni
  FOR EACH ROW EXECUTE FUNCTION log_audit();
