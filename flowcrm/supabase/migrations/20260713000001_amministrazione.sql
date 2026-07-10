-- ═══════════════════════════════════════════════════════════════════
-- F8.1 — Amministrazione: fatture (attive+passive), incassi, tasse
-- ⚠️ GATE RLS PIÙ IMPORTANTE: l'operatore NON deve avere alcun accesso
-- (nemmeno SELECT) a queste tabelle. Solo admin + manager.
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE fattura_direzione AS ENUM ('attiva', 'passiva');
CREATE TYPE fattura_stato     AS ENUM ('da_pagare', 'pagata', 'scaduta', 'parziale');
CREATE TYPE pagamento_stato   AS ENUM ('da_incassare', 'incassato', 'in_ritardo', 'parziale');
CREATE TYPE tassa_stato       AS ENUM ('da_pagare', 'pagata', 'scaduta');
-- Stato SDI separato dallo stato pagamento (predisposizione F13)
CREATE TYPE sdi_stato         AS ENUM ('non_applicabile', 'da_inviare', 'inviata', 'consegnata', 'scartata', 'mancata_consegna');

-- Helper: true se l'utente corrente può vedere l'amministrazione.
CREATE OR REPLACE FUNCTION puo_amministrazione()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('admin', 'manager')
$$ LANGUAGE sql STABLE SECURITY DEFINER;
REVOKE ALL ON FUNCTION puo_amministrazione() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION puo_amministrazione() TO authenticated;

-- ── FATTURE ──────────────────────────────────────────────────────
CREATE TABLE fatture (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direzione         fattura_direzione NOT NULL DEFAULT 'attiva',
  numero            TEXT NOT NULL,
  data              DATE NOT NULL DEFAULT CURRENT_DATE,
  organizzazione_id UUID NOT NULL REFERENCES organizzazioni(id),
  commessa_id       UUID REFERENCES commesse(id) ON DELETE SET NULL,
  imponibile        NUMERIC(12,2) NOT NULL DEFAULT 0,
  aliquota_iva      NUMERIC(5,2) NOT NULL DEFAULT 22,
  -- totale: NON generated. Default calcolato dal trigger, ma sovrascrivibile
  -- (bollo, ritenuta, cassa, multi-aliquota, import da XML SDI in F13).
  totale            NUMERIC(12,2) NOT NULL DEFAULT 0,
  stato             fattura_stato NOT NULL DEFAULT 'da_pagare',
  sdi_stato         sdi_stato NOT NULL DEFAULT 'non_applicabile',
  scadenza          DATE NOT NULL,
  pagata_at         DATE,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);

-- Unicità DIFFERENZIATA:
--  attive → (numero, anno) unico (è il nostro numero, non deve ripetersi)
--  passive → (organizzazione_id, numero, anno) unico (due fornitori possono
--            avere lo stesso numero fattura)
CREATE UNIQUE INDEX idx_fatture_attive_uniche
  ON fatture (numero, EXTRACT(YEAR FROM data))
  WHERE direzione = 'attiva';
CREATE UNIQUE INDEX idx_fatture_passive_uniche
  ON fatture (organizzazione_id, numero, EXTRACT(YEAR FROM data))
  WHERE direzione = 'passiva';

CREATE INDEX idx_fatture_organizzazione ON fatture (organizzazione_id);
CREATE INDEX idx_fatture_scadenza ON fatture (scadenza, stato);

-- Default del totale se non fornito esplicitamente (imponibile + IVA).
CREATE OR REPLACE FUNCTION fattura_default_totale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.totale IS NULL OR NEW.totale = 0 THEN
    NEW.totale := ROUND(NEW.imponibile * (1 + NEW.aliquota_iva / 100), 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fatture_set_totale
  BEFORE INSERT ON fatture
  FOR EACH ROW EXECUTE FUNCTION fattura_default_totale();

CREATE TRIGGER fatture_updated_at
  BEFORE UPDATE ON fatture FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER fatture_audit
  AFTER INSERT OR UPDATE OR DELETE ON fatture FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ── SCADENZE PAGAMENTO (incassi previsti) ────────────────────────
CREATE TABLE scadenze_pagamento (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descrizione       TEXT NOT NULL,
  organizzazione_id UUID NOT NULL REFERENCES organizzazioni(id),
  fattura_id        UUID REFERENCES fatture(id) ON DELETE SET NULL,
  commessa_id       UUID REFERENCES commesse(id) ON DELETE SET NULL,
  importo           NUMERIC(12,2) NOT NULL,
  data_prevista     DATE NOT NULL,
  stato             pagamento_stato NOT NULL DEFAULT 'da_incassare',
  incassato_at      DATE,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_scadenze_pagamento_data ON scadenze_pagamento (data_prevista, stato);

CREATE TRIGGER scadenze_pagamento_updated_at
  BEFORE UPDATE ON scadenze_pagamento FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER scadenze_pagamento_audit
  AFTER INSERT OR UPDATE OR DELETE ON scadenze_pagamento FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Trigger: una fattura ATTIVA genera automaticamente l'incasso previsto,
-- nella stessa transazione (il dato nasce nel DB, impossibile dimenticarlo).
CREATE OR REPLACE FUNCTION fattura_crea_scadenza()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direzione = 'attiva' THEN
    INSERT INTO scadenze_pagamento
      (descrizione, organizzazione_id, fattura_id, commessa_id, importo, data_prevista, created_by)
    VALUES
      ('Incasso fattura ' || NEW.numero, NEW.organizzazione_id, NEW.id, NEW.commessa_id,
       NEW.totale, NEW.scadenza, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER fatture_genera_scadenza
  AFTER INSERT ON fatture
  FOR EACH ROW EXECUTE FUNCTION fattura_crea_scadenza();

-- Trigger: vieta di eliminare una fattura con incasso già registrato.
CREATE OR REPLACE FUNCTION protect_fattura_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM scadenze_pagamento
    WHERE fattura_id = OLD.id AND stato = 'incassato'
  ) THEN
    RAISE EXCEPTION 'Impossibile eliminare una fattura con un incasso già registrato';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fatture_protect_delete
  BEFORE DELETE ON fatture
  FOR EACH ROW EXECUTE FUNCTION protect_fattura_delete();

-- ── SCADENZE TASSE ───────────────────────────────────────────────
CREATE TABLE scadenze_tasse (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_tassa     TEXT NOT NULL,
  importo        NUMERIC(12,2) NOT NULL,
  scadenza       DATE NOT NULL,
  stato          tassa_stato NOT NULL DEFAULT 'da_pagare',
  data_pagamento DATE,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES user_profiles(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_scadenze_tasse_scadenza ON scadenze_tasse (scadenza, stato);

CREATE TRIGGER scadenze_tasse_updated_at
  BEFORE UPDATE ON scadenze_tasse FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER scadenze_tasse_audit
  AFTER INSERT OR UPDATE OR DELETE ON scadenze_tasse FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ═══ RLS — SOLO admin+manager. Operatore: ZERO accesso. ══════════
ALTER TABLE fatture ENABLE ROW LEVEL SECURITY;
ALTER TABLE scadenze_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE scadenze_tasse ENABLE ROW LEVEL SECURITY;

-- fatture
CREATE POLICY "fatture_select" ON fatture FOR SELECT TO authenticated
  USING (puo_amministrazione());
CREATE POLICY "fatture_insert" ON fatture FOR INSERT TO authenticated
  WITH CHECK (puo_amministrazione() AND created_by = auth.uid());
CREATE POLICY "fatture_update" ON fatture FOR UPDATE TO authenticated
  USING (puo_amministrazione()) WITH CHECK (puo_amministrazione());
CREATE POLICY "fatture_delete" ON fatture FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');   -- solo admin cancella

-- scadenze_pagamento
CREATE POLICY "scadenze_pagamento_select" ON scadenze_pagamento FOR SELECT TO authenticated
  USING (puo_amministrazione());
CREATE POLICY "scadenze_pagamento_insert" ON scadenze_pagamento FOR INSERT TO authenticated
  WITH CHECK (puo_amministrazione() AND created_by = auth.uid());
CREATE POLICY "scadenze_pagamento_update" ON scadenze_pagamento FOR UPDATE TO authenticated
  USING (puo_amministrazione()) WITH CHECK (puo_amministrazione());
CREATE POLICY "scadenze_pagamento_delete" ON scadenze_pagamento FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- scadenze_tasse
CREATE POLICY "scadenze_tasse_select" ON scadenze_tasse FOR SELECT TO authenticated
  USING (puo_amministrazione());
CREATE POLICY "scadenze_tasse_insert" ON scadenze_tasse FOR INSERT TO authenticated
  WITH CHECK (puo_amministrazione() AND created_by = auth.uid());
CREATE POLICY "scadenze_tasse_update" ON scadenze_tasse FOR UPDATE TO authenticated
  USING (puo_amministrazione()) WITH CHECK (puo_amministrazione());
CREATE POLICY "scadenze_tasse_delete" ON scadenze_tasse FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');
