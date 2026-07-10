-- ═══════════════════════════════════════════════════════════════════
-- F4.1 — Vendite: pipeline configurabili, stage, deal, storico fasi
-- Le FASI dei deal sono TABELLE (non enum) → Kanban configurabile.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE pipelines (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Una sola pipeline di default (unique index parziale)
CREATE UNIQUE INDEX idx_pipelines_unica_default ON pipelines (is_default) WHERE is_default;

CREATE TABLE pipeline_stages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id  UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  ordine       INT NOT NULL,
  probabilita  SMALLINT NOT NULL DEFAULT 50 CHECK (probabilita BETWEEN 0 AND 100),
  is_won       BOOLEAN NOT NULL DEFAULT false,
  is_lost      BOOLEAN NOT NULL DEFAULT false,
  colore       TEXT,
  attivo       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (pipeline_id, ordine),
  -- Uno stage non può essere insieme vinto e perso
  CHECK (NOT (is_won AND is_lost))
);

CREATE INDEX idx_pipeline_stages_pipeline ON pipeline_stages (pipeline_id, ordine);

CREATE TABLE deals (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                   TEXT NOT NULL,
  organizzazione_id      UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  contatto_id            UUID REFERENCES contatti(id) ON DELETE SET NULL,
  pipeline_id            UUID NOT NULL REFERENCES pipelines(id),
  stage_id               UUID NOT NULL REFERENCES pipeline_stages(id),
  importo                NUMERIC(12,2) NOT NULL DEFAULT 0,
  valuta                 CHAR(3) NOT NULL DEFAULT 'EUR',
  data_chiusura_prevista DATE,
  chiuso_at              TIMESTAMPTZ,      -- impostato dal trigger su stage won/lost
  motivo_perdita         TEXT,
  responsabile_id        UUID REFERENCES user_profiles(id),
  note                   TEXT,
  attivo                 BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES user_profiles(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_deals_stage ON deals (stage_id);
CREATE INDEX idx_deals_pipeline ON deals (pipeline_id);
CREATE INDEX idx_deals_organizzazione ON deals (organizzazione_id);
CREATE INDEX idx_deals_responsabile ON deals (responsabile_id);

ALTER TABLE deals ADD COLUMN ricerca tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(nome,''))) STORED;
CREATE INDEX idx_deals_ricerca ON deals USING GIN (ricerca);

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Storico cambi stage (immutabile) ─────────────────────────────
CREATE TABLE deal_stage_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id          UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  stage_precedente UUID REFERENCES pipeline_stages(id),
  stage_nuovo      UUID NOT NULL REFERENCES pipeline_stages(id),
  cambiato_da      UUID REFERENCES user_profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deal_stage_history_deal ON deal_stage_history (deal_id, created_at);

-- ── Trigger: coerenza stage↔pipeline + chiuso_at + log storico ───
-- Un solo trigger BEFORE per coerenza/chiuso_at, uno AFTER per lo storico.

CREATE OR REPLACE FUNCTION deal_before_write()
RETURNS TRIGGER AS $$
DECLARE
  st RECORD;
BEGIN
  -- Lo stage deve appartenere alla pipeline del deal
  SELECT pipeline_id, is_won, is_lost INTO st
  FROM pipeline_stages WHERE id = NEW.stage_id;
  IF st IS NULL THEN
    RAISE EXCEPTION 'Stage inesistente';
  END IF;
  IF st.pipeline_id <> NEW.pipeline_id THEN
    RAISE EXCEPTION 'Lo stage non appartiene alla pipeline del deal';
  END IF;

  -- chiuso_at derivato: valorizzato entrando in won/lost, azzerato uscendo
  IF st.is_won OR st.is_lost THEN
    IF NEW.chiuso_at IS NULL THEN NEW.chiuso_at := NOW(); END IF;
  ELSE
    NEW.chiuso_at := NULL;
    NEW.motivo_perdita := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_before_write
  BEFORE INSERT OR UPDATE OF stage_id, pipeline_id ON deals
  FOR EACH ROW EXECUTE FUNCTION deal_before_write();

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
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_log_stage_change
  AFTER INSERT OR UPDATE OF stage_id ON deals
  FOR EACH ROW EXECUTE FUNCTION log_deal_stage_change();

-- ── Protezione: uno stage con deal dentro non è eliminabile ──────
-- (si disattiva, non si cancella — evita deal orfani)
CREATE OR REPLACE FUNCTION protect_stage_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM deals WHERE stage_id = OLD.id) THEN
    RAISE EXCEPTION 'Impossibile eliminare uno stage che contiene deal: disattivalo invece';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pipeline_stages_protect_delete
  BEFORE DELETE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION protect_stage_delete();

-- ── Audit deal ───────────────────────────────────────────────────
CREATE TRIGGER deals_audit
  AFTER INSERT OR UPDATE OR DELETE ON deals
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;

-- Pipelines/stages: lettura tutti; scrittura solo admin/manager (config).
CREATE POLICY "pipelines_select" ON pipelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "pipelines_write" ON pipelines FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','manager'))
  WITH CHECK (get_user_role() IN ('admin','manager'));

CREATE POLICY "stages_select" ON pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "stages_write" ON pipeline_stages FOR ALL TO authenticated
  USING (get_user_role() IN ('admin','manager'))
  WITH CHECK (get_user_role() IN ('admin','manager'));

-- Deals: CRM visibile a tutti gli autenticati; delete solo admin.
CREATE POLICY "deals_select" ON deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "deals_insert" ON deals FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "deals_update" ON deals FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "deals_delete" ON deals FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- Storico stage: sola lettura (immutabile). Scrive solo il trigger.
CREATE POLICY "deal_stage_history_select" ON deal_stage_history
  FOR SELECT TO authenticated USING (true);

-- ── Seed pipeline default ────────────────────────────────────────
DO $$
DECLARE
  pid UUID;
BEGIN
  INSERT INTO pipelines (nome, is_default) VALUES ('Pipeline commerciale', true)
  RETURNING id INTO pid;

  INSERT INTO pipeline_stages (pipeline_id, nome, ordine, probabilita, is_won, is_lost, colore) VALUES
    (pid, 'Proposta',      1, 20,  false, false, '#3b82f6'),
    (pid, 'Negoziazione',  2, 60,  false, false, '#f59e0b'),
    (pid, 'Vinto',         3, 100, true,  false, '#10b981'),
    (pid, 'Perso',         4, 0,   false, true,  '#f2545b');
END $$;
