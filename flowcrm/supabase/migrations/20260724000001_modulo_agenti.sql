-- ═══════════════════════════════════════════════════════════════════
-- MODULO AGENTI DI COMMERCIO — schema completo (documento "Modulo
-- gestione agenti di commercio": 19 sezioni). Fascicolo agente con
-- codice AGEN-AAAA-NNNN, mandati (fine → scadenza automatica),
-- portafoglio clienti, rapporti visita, offerte→ordini con righe,
-- PROVVIGIONI (piano base + regole per cliente/zona/prodotto, calcolo
-- automatico dal venduto), obiettivi, note spese con approvazione.
--
-- PORTALE AGENTE (§19): un agente può essere collegato a un utente
-- (agenti.user_id). Se l'utente È un agente, la RLS lo confina ai SOLI
-- suoi dati (portafoglio, visite, ordini, provvigioni, spese). Lo staff
-- interno vede tutto; provvigioni/piani/obiettivi/mandati restano
-- riservati a admin/manager (+ l'agente per i propri).
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE agente_tipologia AS ENUM (
  'monomandatario', 'plurimandatario', 'procacciatore', 'dipendente'
);
CREATE TYPE agente_stato AS ENUM ('attivo', 'sospeso', 'cessato');
CREATE TYPE visita_esito AS ENUM ('positivo', 'neutro', 'negativo', 'da_ricontattare');
CREATE TYPE offerta_stato AS ENUM ('bozza', 'inviata', 'accettata', 'rifiutata', 'scaduta');
CREATE TYPE ordine_stato AS ENUM (
  'bozza', 'confermato', 'in_consegna', 'consegnato', 'fatturato', 'annullato'
);
CREATE TYPE provvigione_ambito AS ENUM ('cliente', 'zona', 'prodotto', 'fascia_fatturato');
CREATE TYPE nota_spese_tipo AS ENUM (
  'carburante', 'pedaggi', 'vitto', 'alloggio', 'trasferta', 'parcheggi', 'altro'
);
CREATE TYPE nota_spese_stato AS ENUM ('presentata', 'approvata', 'rifiutata', 'rimborsata');

-- ── ANAGRAFICA AGENTI (§1) ───────────────────────────────────────
CREATE TABLE agenti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice           TEXT UNIQUE,               -- AGEN-AAAA-NNNN via trigger
  nome             TEXT NOT NULL,
  cognome          TEXT,
  ragione_sociale  TEXT,
  codice_fiscale   TEXT,
  piva             TEXT,
  enasarco         TEXT,
  cciaa            TEXT,
  tipologia        agente_tipologia NOT NULL DEFAULT 'plurimandatario',
  data_inizio      DATE,
  data_cessazione  DATE,
  stato            agente_stato NOT NULL DEFAULT 'attivo',
  area_geografica  TEXT,
  zone             TEXT,
  settori          TEXT,
  referente_id     UUID REFERENCES user_profiles(id),
  iban             TEXT,
  email            TEXT,
  telefono         TEXT,
  -- Portale agente: utente collegato (RLS lo confina ai suoi dati)
  user_id          UUID UNIQUE REFERENCES user_profiles(id) ON DELETE SET NULL,
  note             TEXT,
  attivo           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);

ALTER TABLE agenti ADD COLUMN ricerca tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(codice,'') || ' ' || coalesce(nome,'') || ' ' ||
      coalesce(cognome,'') || ' ' || coalesce(ragione_sociale,'') || ' ' ||
      coalesce(zone,'') || ' ' || coalesce(area_geografica,'')
    )
  ) STORED;

CREATE INDEX idx_agenti_ricerca ON agenti USING GIN (ricerca);
CREATE INDEX idx_agenti_stato ON agenti (stato, attivo);

CREATE OR REPLACE FUNCTION agente_set_codice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.codice := genera_codice('AGEN');
  RETURN NEW;
END;
$$;
CREATE TRIGGER agenti_set_codice
  BEFORE INSERT ON agenti
  FOR EACH ROW WHEN (NEW.codice IS NULL)
  EXECUTE FUNCTION agente_set_codice();

-- Helper RLS: l'id dell'agente collegato all'utente corrente (NULL = staff).
CREATE OR REPLACE FUNCTION agente_corrente()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT id FROM agenti WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION agente_corrente() FROM PUBLIC;
REVOKE ALL ON FUNCTION agente_corrente() FROM anon;
GRANT EXECUTE ON FUNCTION agente_corrente() TO authenticated;

-- ── MANDATI (§2) — fine mandato → scadenza automatica ────────────
CREATE TABLE agenti_mandati (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id      UUID NOT NULL REFERENCES agenti(id) ON DELETE CASCADE,
  descrizione    TEXT NOT NULL,
  zone           TEXT,
  esclusiva      BOOLEAN NOT NULL DEFAULT false,
  prodotti       TEXT,
  listino        TEXT,
  obiettivo_annuo NUMERIC(14,2),
  data_inizio    DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fine      DATE,
  clausole       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES user_profiles(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_agenti_mandati ON agenti_mandati (agente_id);

CREATE OR REPLACE FUNCTION mandato_sync_scadenza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_agente TEXT;
BEGIN
  DELETE FROM scadenze_moduli
  WHERE entita = 'agenti_mandati' AND entita_id = NEW.id AND stato = 'aperta';

  IF NEW.data_fine IS NOT NULL AND NEW.data_fine >= CURRENT_DATE THEN
    SELECT trim(nome || ' ' || COALESCE(cognome, '')) INTO v_agente
    FROM agenti WHERE id = NEW.agente_id;
    INSERT INTO scadenze_moduli
      (modulo, entita, entita_id, tipo, descrizione, data_scadenza,
       azione_url, solo_manager, created_by)
    VALUES
      ('agenti', 'agenti_mandati', NEW.id, 'Rinnovo mandato',
       COALESCE(v_agente, 'Agente') || ' — ' || NEW.descrizione,
       NEW.data_fine, '/agenti/' || NEW.agente_id, true, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER agenti_mandati_sync_scadenza
  AFTER INSERT OR UPDATE OF data_fine ON agenti_mandati
  FOR EACH ROW EXECUTE FUNCTION mandato_sync_scadenza();

-- ── PORTAFOGLIO CLIENTI (§3) ─────────────────────────────────────
CREATE TABLE agenti_clienti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id         UUID NOT NULL REFERENCES agenti(id) ON DELETE CASCADE,
  organizzazione_id UUID NOT NULL REFERENCES organizzazioni(id) ON DELETE CASCADE,
  dal               DATE NOT NULL DEFAULT CURRENT_DATE,
  al                DATE,
  classificazione   TEXT,               -- A/B/C
  priorita          priorita_type NOT NULL DEFAULT 'media',
  potenziale        TEXT,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  UNIQUE (agente_id, organizzazione_id)
);
CREATE INDEX idx_agenti_clienti ON agenti_clienti (agente_id);

-- ── RAPPORTI VISITA (§5) ─────────────────────────────────────────
CREATE TABLE agenti_visite (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id         UUID NOT NULL REFERENCES agenti(id) ON DELETE CASCADE,
  organizzazione_id UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  data              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  durata_minuti     INT,
  referenti         TEXT,
  esito             visita_esito NOT NULL DEFAULT 'neutro',
  argomenti         TEXT,
  opportunita       TEXT,
  criticita         TEXT,
  azioni            TEXT,
  lat               NUMERIC(9,6),
  lng               NUMERIC(9,6),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_agenti_visite ON agenti_visite (agente_id, data DESC);

-- ── OFFERTE (§7) e ORDINI con righe (§8) ─────────────────────────
CREATE TABLE agenti_ordini (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id         UUID NOT NULL REFERENCES agenti(id) ON DELETE CASCADE,
  organizzazione_id UUID NOT NULL REFERENCES organizzazioni(id),
  data              DATE NOT NULL DEFAULT CURRENT_DATE,
  stato             ordine_stato NOT NULL DEFAULT 'bozza',
  valore            NUMERIC(14,2) NOT NULL DEFAULT 0,   -- ricalcolato dalle righe
  consegna_prevista DATE,
  fattura_id        UUID REFERENCES fatture(id) ON DELETE SET NULL,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_agenti_ordini ON agenti_ordini (agente_id, data DESC);

CREATE TABLE agenti_ordini_righe (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordine_id       UUID NOT NULL REFERENCES agenti_ordini(id) ON DELETE CASCADE,
  prodotto        TEXT NOT NULL,
  quantita        NUMERIC(12,2) NOT NULL DEFAULT 1,
  prezzo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_agenti_ordini_righe ON agenti_ordini_righe (ordine_id);

-- Il valore dell'ordine si ricalcola dalle righe (in transazione)
CREATE OR REPLACE FUNCTION ordine_ricalcola_valore()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_ordine UUID := COALESCE(NEW.ordine_id, OLD.ordine_id);
BEGIN
  UPDATE agenti_ordini SET valore = COALESCE((
    SELECT SUM(quantita * prezzo_unitario) FROM agenti_ordini_righe
    WHERE ordine_id = v_ordine
  ), 0)
  WHERE id = v_ordine;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER agenti_ordini_righe_valore
  AFTER INSERT OR UPDATE OR DELETE ON agenti_ordini_righe
  FOR EACH ROW EXECUTE FUNCTION ordine_ricalcola_valore();

CREATE TABLE agenti_offerte (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id         UUID NOT NULL REFERENCES agenti(id) ON DELETE CASCADE,
  organizzazione_id UUID NOT NULL REFERENCES organizzazioni(id),
  descrizione       TEXT NOT NULL,
  importo           NUMERIC(14,2) NOT NULL DEFAULT 0,
  sconto_percentuale NUMERIC(5,2),
  stato             offerta_stato NOT NULL DEFAULT 'bozza',
  validita          DATE,
  revisione         INT NOT NULL DEFAULT 1,
  ordine_id         UUID REFERENCES agenti_ordini(id) ON DELETE SET NULL,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_agenti_offerte ON agenti_offerte (agente_id, stato);

-- ── PROVVIGIONI (§9): piano base + regole + maturato per periodo ─
CREATE TABLE agenti_piani_provvigionali (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id        UUID NOT NULL UNIQUE REFERENCES agenti(id) ON DELETE CASCADE,
  percentuale_base NUMERIC(5,2) NOT NULL DEFAULT 0,
  premi_note       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);

CREATE TABLE agenti_provvigioni_regole (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id   UUID NOT NULL REFERENCES agenti(id) ON DELETE CASCADE,
  ambito      provvigione_ambito NOT NULL,
  riferimento TEXT NOT NULL,     -- nome cliente/zona/prodotto o soglia fascia
  percentuale NUMERIC(5,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_agenti_regole ON agenti_provvigioni_regole (agente_id);

CREATE TABLE agenti_provvigioni (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id        UUID NOT NULL REFERENCES agenti(id) ON DELETE CASCADE,
  periodo          TEXT NOT NULL,       -- 'AAAA-MM'
  importo_maturato NUMERIC(14,2) NOT NULL DEFAULT 0,
  importo_liquidato NUMERIC(14,2) NOT NULL DEFAULT 0,
  anticipi         NUMERIC(14,2) NOT NULL DEFAULT 0,
  conguagli        NUMERIC(14,2) NOT NULL DEFAULT 0,
  liquidata_at     DATE,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id),
  UNIQUE (agente_id, periodo)
);
CREATE INDEX idx_agenti_provvigioni ON agenti_provvigioni (agente_id, periodo);

-- Calcolo del maturato dal venduto (ordini consegnati/fatturati del
-- periodo): percentuale della regola 'cliente' se combacia, altrimenti
-- base del piano. Riservato a admin/manager (check interno).
CREATE OR REPLACE FUNCTION calcola_provvigioni(p_agente UUID, p_periodo TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_base NUMERIC := 0;
  v_totale NUMERIC := 0;
  rec RECORD;
  v_pct NUMERIC;
BEGIN
  IF NOT puo_amministrazione() THEN
    RAISE EXCEPTION 'Il calcolo delle provvigioni è riservato ad admin e manager';
  END IF;

  SELECT percentuale_base INTO v_base
  FROM agenti_piani_provvigionali WHERE agente_id = p_agente;
  v_base := COALESCE(v_base, 0);

  FOR rec IN
    SELECT o.valore, org.ragione_sociale
    FROM agenti_ordini o
    JOIN organizzazioni org ON org.id = o.organizzazione_id
    WHERE o.agente_id = p_agente
      AND o.stato IN ('consegnato', 'fatturato')
      AND to_char(o.data, 'YYYY-MM') = p_periodo
  LOOP
    SELECT percentuale INTO v_pct
    FROM agenti_provvigioni_regole
    WHERE agente_id = p_agente AND ambito = 'cliente'
      AND lower(riferimento) = lower(rec.ragione_sociale)
    LIMIT 1;
    v_totale := v_totale + rec.valore * COALESCE(v_pct, v_base) / 100.0;
  END LOOP;

  INSERT INTO agenti_provvigioni (agente_id, periodo, importo_maturato, created_by)
  VALUES (p_agente, p_periodo, ROUND(v_totale, 2), auth.uid())
  ON CONFLICT (agente_id, periodo)
  DO UPDATE SET importo_maturato = ROUND(v_totale, 2), updated_at = NOW();

  RETURN ROUND(v_totale, 2);
END;
$$;
REVOKE ALL ON FUNCTION calcola_provvigioni(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION calcola_provvigioni(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION calcola_provvigioni(UUID, TEXT) TO authenticated;

-- ── OBIETTIVI (§10) ──────────────────────────────────────────────
CREATE TABLE agenti_obiettivi (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id        UUID NOT NULL REFERENCES agenti(id) ON DELETE CASCADE,
  anno             INT NOT NULL,
  mese             INT CHECK (mese BETWEEN 1 AND 12),
  ambito           TEXT,                -- area/cliente/linea (opzionale)
  importo_obiettivo NUMERIC(14,2) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_agenti_obiettivi ON agenti_obiettivi (agente_id, anno);

-- ── NOTE SPESE (§11) — transizioni blindate ──────────────────────
CREATE TABLE agenti_note_spese (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id   UUID NOT NULL REFERENCES agenti(id) ON DELETE CASCADE,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo        nota_spese_tipo NOT NULL DEFAULT 'altro',
  descrizione TEXT NOT NULL,
  importo     NUMERIC(10,2) NOT NULL,
  stato       nota_spese_stato NOT NULL DEFAULT 'presentata',
  motivazione TEXT,
  decisa_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_agenti_note_spese ON agenti_note_spese (agente_id, stato);

CREATE OR REPLACE FUNCTION nota_spese_transizione()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato IS DISTINCT FROM OLD.stato THEN
    IF NEW.stato IN ('approvata', 'rifiutata', 'rimborsata')
       AND NOT puo_amministrazione() THEN
      RAISE EXCEPTION 'Solo admin o manager possono decidere una nota spese';
    END IF;
    IF NEW.stato IN ('approvata', 'rifiutata') THEN
      NEW.decisa_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER agenti_note_spese_transizione
  BEFORE UPDATE ON agenti_note_spese
  FOR EACH ROW EXECUTE FUNCTION nota_spese_transizione();

-- ── Collegamenti CRM: deal e attività per agente ─────────────────
ALTER TABLE deals ADD COLUMN agente_id UUID REFERENCES agenti(id) ON DELETE SET NULL;
CREATE INDEX idx_deals_agente ON deals (agente_id);
ALTER TABLE attivita ADD COLUMN agente_id UUID REFERENCES agenti(id) ON DELETE CASCADE;
CREATE INDEX idx_attivita_agente ON attivita (agente_id);

-- ── Trigger comuni ───────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agenti','agenti_mandati','agenti_clienti','agenti_visite',
    'agenti_ordini','agenti_offerte','agenti_piani_provvigionali',
    'agenti_provvigioni_regole','agenti_provvigioni','agenti_obiettivi',
    'agenti_note_spese'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;
END $$;

-- ═══ RLS ═════════════════════════════════════════════════════════
ALTER TABLE agenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenti_mandati ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenti_clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenti_visite ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenti_ordini ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenti_ordini_righe ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenti_offerte ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenti_piani_provvigionali ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenti_provvigioni_regole ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenti_provvigioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenti_obiettivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenti_note_spese ENABLE ROW LEVEL SECURITY;

-- Anagrafica: staff tutto; l'agente vede solo il proprio fascicolo.
CREATE POLICY "agenti_select" ON agenti FOR SELECT TO authenticated
  USING (modulo_licenziato('agenti')
    AND (agente_corrente() IS NULL OR id = agente_corrente()));
CREATE POLICY "agenti_insert" ON agenti FOR INSERT TO authenticated
  WITH CHECK (modulo_licenziato('agenti') AND agente_corrente() IS NULL
    AND created_by = auth.uid());
CREATE POLICY "agenti_update" ON agenti FOR UPDATE TO authenticated
  USING (modulo_licenziato('agenti') AND agente_corrente() IS NULL)
  WITH CHECK (modulo_licenziato('agenti'));
CREATE POLICY "agenti_delete" ON agenti FOR DELETE TO authenticated
  USING (modulo_licenziato('agenti') AND get_user_role() = 'admin');

-- Tabelle operative per-agente: staff tutto; l'agente SOLO le proprie
-- righe (in lettura e scrittura, agente_id imposto dal WITH CHECK).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agenti_clienti','agenti_visite','agenti_ordini','agenti_offerte'
  ] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_licenziato('agenti')
        AND (agente_corrente() IS NULL OR agente_id = agente_corrente()))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_licenziato('agenti') AND created_by = auth.uid()
        AND (agente_corrente() IS NULL OR agente_id = agente_corrente()))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_licenziato('agenti')
        AND (agente_corrente() IS NULL OR agente_id = agente_corrente()))
      WITH CHECK (modulo_licenziato('agenti')
        AND (agente_corrente() IS NULL OR agente_id = agente_corrente()))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_licenziato('agenti') AND get_user_role() = 'admin')$f$, t);
  END LOOP;
END $$;

-- Righe ordine: seguono l'ordine padre.
CREATE POLICY "agenti_ordini_righe_select" ON agenti_ordini_righe FOR SELECT TO authenticated
  USING (modulo_licenziato('agenti') AND EXISTS (
    SELECT 1 FROM agenti_ordini o WHERE o.id = ordine_id
      AND (agente_corrente() IS NULL OR o.agente_id = agente_corrente())));
CREATE POLICY "agenti_ordini_righe_insert" ON agenti_ordini_righe FOR INSERT TO authenticated
  WITH CHECK (modulo_licenziato('agenti') AND created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM agenti_ordini o WHERE o.id = ordine_id
      AND (agente_corrente() IS NULL OR o.agente_id = agente_corrente())));
CREATE POLICY "agenti_ordini_righe_update" ON agenti_ordini_righe FOR UPDATE TO authenticated
  USING (modulo_licenziato('agenti') AND EXISTS (
    SELECT 1 FROM agenti_ordini o WHERE o.id = ordine_id
      AND (agente_corrente() IS NULL OR o.agente_id = agente_corrente())))
  WITH CHECK (modulo_licenziato('agenti'));
CREATE POLICY "agenti_ordini_righe_delete" ON agenti_ordini_righe FOR DELETE TO authenticated
  USING (modulo_licenziato('agenti') AND (get_user_role() = 'admin' OR EXISTS (
    SELECT 1 FROM agenti_ordini o WHERE o.id = ordine_id
      AND agente_corrente() IS NOT NULL AND o.agente_id = agente_corrente())));

-- Economici (mandati, piani, regole, provvigioni, obiettivi): admin/
-- manager + l'agente per i SOLI propri (in lettura). Scrittura manager.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agenti_mandati','agenti_piani_provvigionali',
    'agenti_provvigioni_regole','agenti_provvigioni','agenti_obiettivi'
  ] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_licenziato('agenti')
        AND (puo_amministrazione() OR agente_id = agente_corrente()))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_licenziato('agenti') AND puo_amministrazione()
        AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_licenziato('agenti') AND puo_amministrazione())
      WITH CHECK (modulo_licenziato('agenti') AND puo_amministrazione())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_licenziato('agenti') AND get_user_role() = 'admin')$f$, t);
  END LOOP;
END $$;

-- Note spese: l'agente presenta e vede le proprie; i manager tutto.
CREATE POLICY "agenti_note_spese_select" ON agenti_note_spese FOR SELECT TO authenticated
  USING (modulo_licenziato('agenti')
    AND (puo_amministrazione() OR agente_id = agente_corrente()
         OR (agente_corrente() IS NULL AND created_by = auth.uid())));
CREATE POLICY "agenti_note_spese_insert" ON agenti_note_spese FOR INSERT TO authenticated
  WITH CHECK (modulo_licenziato('agenti') AND created_by = auth.uid()
    AND (agente_corrente() IS NULL OR agente_id = agente_corrente()));
CREATE POLICY "agenti_note_spese_update" ON agenti_note_spese FOR UPDATE TO authenticated
  USING (modulo_licenziato('agenti')
    AND (puo_amministrazione() OR agente_id = agente_corrente()))
  WITH CHECK (modulo_licenziato('agenti'));
CREATE POLICY "agenti_note_spese_delete" ON agenti_note_spese FOR DELETE TO authenticated
  USING (modulo_licenziato('agenti') AND get_user_role() = 'admin');

-- ═══ VISTE KPI (§16-§17) ═════════════════════════════════════════
-- Direzione commerciale: confronto agenti. Manager + l'agente (per sé).
CREATE VIEW vw_agenti_kpi WITH (security_invoker = true) AS
SELECT
  a.id AS agente_id,
  trim(a.nome || ' ' || COALESCE(a.cognome, '')) AS agente,
  COALESCE(v.n_visite, 0)::int AS visite,
  COALESCE(o.n_ordini, 0)::int AS ordini,
  COALESCE(o.valore_ordini, 0)::numeric(14,2) AS valore_ordini,
  COALESCE(ofrt.inviate, 0)::int AS offerte_inviate,
  COALESCE(ofrt.accettate, 0)::int AS offerte_accettate,
  CASE WHEN COALESCE(ofrt.inviate, 0) > 0
    THEN ROUND(ofrt.accettate::numeric * 100 / ofrt.inviate, 1)
  END AS tasso_conversione,
  COALESCE(c.n_clienti, 0)::int AS clienti,
  CASE WHEN COALESCE(v.n_visite, 0) > 0
    THEN ROUND(COALESCE(o.valore_ordini, 0) / v.n_visite, 0)
  END AS fatturato_per_visita,
  COALESCE(p.maturato_anno, 0)::numeric(14,2) AS provvigioni_anno
FROM agenti a
LEFT JOIN (
  SELECT agente_id, COUNT(*) AS n_visite FROM agenti_visite
  WHERE data >= date_trunc('year', CURRENT_DATE) GROUP BY agente_id
) v ON v.agente_id = a.id
LEFT JOIN (
  SELECT agente_id, COUNT(*) AS n_ordini, SUM(valore) AS valore_ordini
  FROM agenti_ordini
  WHERE stato <> 'annullato' AND data >= date_trunc('year', CURRENT_DATE)
  GROUP BY agente_id
) o ON o.agente_id = a.id
LEFT JOIN (
  SELECT agente_id,
         COUNT(*) FILTER (WHERE stato IN ('inviata','accettata','rifiutata','scaduta')) AS inviate,
         COUNT(*) FILTER (WHERE stato = 'accettata') AS accettate
  FROM agenti_offerte GROUP BY agente_id
) ofrt ON ofrt.agente_id = a.id
LEFT JOIN (
  SELECT agente_id, COUNT(*) AS n_clienti FROM agenti_clienti
  WHERE al IS NULL GROUP BY agente_id
) c ON c.agente_id = a.id
LEFT JOIN (
  SELECT agente_id, SUM(importo_maturato) AS maturato_anno
  FROM agenti_provvigioni
  WHERE periodo LIKE to_char(CURRENT_DATE, 'YYYY') || '-%'
  GROUP BY agente_id
) p ON p.agente_id = a.id
WHERE a.attivo;

GRANT SELECT ON vw_agenti_kpi TO authenticated;

-- ═══ Ricerca globale: + agenti ═══════════════════════════════════
CREATE OR REPLACE FUNCTION ricerca_globale(q TEXT)
RETURNS TABLE (
  tipo         TEXT,
  id           UUID,
  titolo       TEXT,
  sottotitolo  TEXT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT * FROM (
    SELECT 'organizzazione' AS tipo, o.id,
           o.ragione_sociale AS titolo,
           COALESCE(o.citta, o.settore, '') AS sottotitolo
    FROM organizzazioni o
    WHERE o.attivo AND o.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'contatto', c.id,
           trim(c.nome || ' ' || COALESCE(c.cognome, '')),
           COALESCE(c.email, c.ruolo_aziendale, '')
    FROM contatti c
    WHERE c.attivo AND c.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'gara', g.id,
           g.codice || ' · ' || g.titolo,
           COALESCE(g.ente_appaltante, g.settore, '')
    FROM gare g
    WHERE g.attivo AND g.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'cantiere', ca.id,
           ca.codice || ' · ' || ca.denominazione,
           COALESCE(ca.citta, ca.categoria_lavori, '')
    FROM cantieri ca
    WHERE ca.attivo AND ca.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'automezzo', au.id,
           COALESCE(au.targa, au.codice) || ' · ' || au.marca || ' ' || au.modello,
           COALESCE(au.centro_costo, au.sede, '')
    FROM automezzi au
    WHERE au.attivo AND au.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'agente', ag.id,
           ag.codice || ' · ' || trim(ag.nome || ' ' || COALESCE(ag.cognome, '')),
           COALESCE(ag.zone, ag.area_geografica, '')
    FROM agenti ag
    WHERE ag.attivo AND ag.ricerca @@ websearch_to_tsquery('simple', q)
  ) t
  LIMIT 20
$$;

-- ═══ Hardening nuove funzioni ═════════════════════════════════════
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'agente_set_codice()', 'mandato_sync_scadenza()',
    'ordine_ricalcola_valore()', 'nota_spese_transizione()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
END $$;
