-- ═══════════════════════════════════════════════════════════════════
-- MODULO POLIAMBULATORI — schema completo (documento "Modulo
-- Poliambulatori": 19 sezioni). Pazienti con fascicolo (codice
-- PAZ-AAAA-NNNN), consensi, agenda con anti-doppia-prenotazione,
-- prestazioni con tariffe, professionisti, cartella clinica, referti
-- con validazione e contenuto congelato, apparecchiature, convenzioni,
-- magazzino sanitario con lotti/scadenze, comunicazioni, qualità.
--
-- ⚠️ RLS CLINICA (GDPR art. 9): i CONTENUTI sanitari (fascicolo,
-- visite, referti) sono leggibili SOLO da admin e dai professionisti
-- collegati a un utente (puo_clinica()). La segreteria (operatore/
-- manager) gestisce anagrafica, agenda, consensi e fatturazione ma
-- NON legge i dati clinici. L'audit_log fa da registro accessi.
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE paziente_sesso AS ENUM ('m', 'f', 'altro');
CREATE TYPE consenso_tipo AS ENUM ('privacy', 'informato', 'marketing');
CREATE TYPE condizione_tipo AS ENUM (
  'patologia', 'allergia', 'terapia', 'intervento', 'farmaco', 'vaccinazione'
);
CREATE TYPE appuntamento_stato AS ENUM (
  'prenotato', 'confermato', 'in_sala', 'eseguito', 'annullato', 'no_show'
);
CREATE TYPE prestazione_tipo AS ENUM (
  'visita', 'esame', 'infermieristica', 'terapia', 'pacchetto'
);
CREATE TYPE referto_stato AS ENUM ('bozza', 'da_validare', 'validato', 'inviato');
CREATE TYPE apparecchiatura_stato AS ENUM ('operativa', 'in_manutenzione', 'fuori_servizio');
CREATE TYPE articolo_sanitario_tipo AS ENUM ('farmaco', 'dispositivo', 'consumo');
CREATE TYPE comunicazione_canale AS ENUM (
  'email', 'sms', 'pec', 'telefono', 'whatsapp', 'notifica'
);
CREATE TYPE evento_qualita_tipo AS ENUM (
  'reclamo', 'non_conformita', 'evento_avverso', 'audit'
);

-- ── PROFESSIONISTI (§5) ──────────────────────────────────────────
CREATE TABLE professionisti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  cognome         TEXT,
  specializzazione TEXT,
  albo            TEXT,
  contratto       TEXT,
  email           TEXT,
  telefono        TEXT,
  colore          TEXT,               -- colore in agenda
  user_id         UUID UNIQUE REFERENCES user_profiles(id) ON DELETE SET NULL,
  note            TEXT,
  attivo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id)
);

-- Helper RLS: chi può leggere i contenuti clinici (dopo la tabella
-- professionisti che referenzia). Admin + professionisti collegati a
-- un utente. La segreteria (operatore/manager) NO.
CREATE OR REPLACE FUNCTION puo_clinica()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT get_user_role() = 'admin'
      OR EXISTS (SELECT 1 FROM professionisti WHERE user_id = auth.uid() AND attivo)
$$;
REVOKE ALL ON FUNCTION puo_clinica() FROM PUBLIC;
REVOKE ALL ON FUNCTION puo_clinica() FROM anon;
GRANT EXECUTE ON FUNCTION puo_clinica() TO authenticated;

-- ── PAZIENTI (§1) ────────────────────────────────────────────────
CREATE TABLE convenzioni (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  ente_tipo  TEXT,                    -- SSN, fondo, assicurazione, azienda, cassa
  contatto   TEXT,
  note       TEXT,
  attivo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id)
);

CREATE TABLE pazienti (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice             TEXT UNIQUE,     -- PAZ-AAAA-NNNN via trigger
  nome               TEXT NOT NULL,
  cognome            TEXT,
  codice_fiscale     TEXT,
  documento          TEXT,
  data_nascita       DATE,
  luogo_nascita      TEXT,
  sesso              paziente_sesso,
  residenza          TEXT,
  domicilio          TEXT,
  telefono           TEXT,
  email              TEXT,
  medico_curante     TEXT,
  contatto_emergenza TEXT,
  convenzione_id     UUID REFERENCES convenzioni(id) ON DELETE SET NULL,
  note_amministrative TEXT,
  attivo             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);

ALTER TABLE pazienti ADD COLUMN ricerca tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(codice,'') || ' ' || coalesce(nome,'') || ' ' ||
      coalesce(cognome,'') || ' ' || coalesce(codice_fiscale,'')
    )
  ) STORED;

CREATE INDEX idx_pazienti_ricerca ON pazienti USING GIN (ricerca);
CREATE INDEX idx_pazienti_cognome ON pazienti (cognome);

CREATE OR REPLACE FUNCTION paziente_set_codice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.codice := genera_codice('PAZ');
  RETURN NEW;
END;
$$;
CREATE TRIGGER pazienti_set_codice
  BEFORE INSERT ON pazienti
  FOR EACH ROW WHEN (NEW.codice IS NULL)
  EXECUTE FUNCTION paziente_set_codice();

-- Consensi (§1/§12): amministrativi, li gestisce la segreteria
CREATE TABLE pazienti_consensi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paziente_id UUID NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  tipo        consenso_tipo NOT NULL,
  versione    TEXT,
  firmato_il  DATE NOT NULL DEFAULT CURRENT_DATE,
  revocato_il DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_pazienti_consensi ON pazienti_consensi (paziente_id);

-- Fascicolo sanitario (§2) — ⚠️ CLINICA
CREATE TABLE pazienti_condizioni (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paziente_id UUID NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  tipo        condizione_tipo NOT NULL,
  descrizione TEXT NOT NULL,
  data        DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_pazienti_condizioni ON pazienti_condizioni (paziente_id, tipo);

-- ── STRUTTURA: ambulatori, prestazioni, apparecchiature ──────────
CREATE TABLE ambulatori (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  descrizione TEXT,
  attivo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id)
);

CREATE TABLE prestazioni (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                TEXT NOT NULL,
  tipo                prestazione_tipo NOT NULL DEFAULT 'visita',
  durata_minuti       INT NOT NULL DEFAULT 30,
  tariffa_privata     NUMERIC(10,2),
  tariffa_convenzione NUMERIC(10,2),
  note                TEXT,
  attivo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES user_profiles(id),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by          UUID REFERENCES user_profiles(id)
);

CREATE TABLE apparecchiature (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           TEXT NOT NULL,
  ubicazione     TEXT,
  matricola      TEXT,
  stato_operativo apparecchiatura_stato NOT NULL DEFAULT 'operativa',
  note           TEXT,
  attivo         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES user_profiles(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID REFERENCES user_profiles(id)
);

-- ── AGENDA E PRENOTAZIONI (§3) — anti doppia prenotazione ────────
CREATE TABLE appuntamenti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paziente_id       UUID NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  professionista_id UUID NOT NULL REFERENCES professionisti(id) ON DELETE CASCADE,
  ambulatorio_id    UUID REFERENCES ambulatori(id) ON DELETE SET NULL,
  prestazione_id    UUID REFERENCES prestazioni(id) ON DELETE SET NULL,
  apparecchiatura_id UUID REFERENCES apparecchiature(id) ON DELETE SET NULL,
  inizio            TIMESTAMPTZ NOT NULL,
  durata_minuti     INT NOT NULL DEFAULT 30,
  stato             appuntamento_stato NOT NULL DEFAULT 'prenotato',
  urgente           BOOLEAN NOT NULL DEFAULT false,
  lista_attesa      BOOLEAN NOT NULL DEFAULT false,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_appuntamenti_inizio ON appuntamenti (inizio);
CREATE INDEX idx_appuntamenti_professionista ON appuntamenti (professionista_id, inizio);
CREATE INDEX idx_appuntamenti_paziente ON appuntamenti (paziente_id, inizio DESC);

-- Il medico non può avere due appuntamenti sovrapposti (salvo annullati
-- e lista d'attesa).
CREATE OR REPLACE FUNCTION appuntamento_no_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato IN ('annullato', 'no_show') OR NEW.lista_attesa THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM appuntamenti a
    WHERE a.professionista_id = NEW.professionista_id
      AND a.id <> NEW.id
      AND a.stato NOT IN ('annullato', 'no_show')
      AND NOT a.lista_attesa
      AND tstzrange(a.inizio, a.inizio + make_interval(mins => a.durata_minuti))
          && tstzrange(NEW.inizio, NEW.inizio + make_interval(mins => NEW.durata_minuti))
  ) THEN
    RAISE EXCEPTION 'Il professionista ha già un appuntamento in quell''orario';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER appuntamenti_no_overlap
  BEFORE INSERT OR UPDATE OF inizio, durata_minuti, professionista_id, stato ON appuntamenti
  FOR EACH ROW EXECUTE FUNCTION appuntamento_no_overlap();

-- ── CARTELLA CLINICA (§6) e REFERTI (§7) — ⚠️ CLINICA ────────────
CREATE TABLE visite (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appuntamento_id   UUID REFERENCES appuntamenti(id) ON DELETE SET NULL,
  paziente_id       UUID NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  professionista_id UUID REFERENCES professionisti(id) ON DELETE SET NULL,
  data              DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo            TEXT,
  anamnesi          TEXT,
  esame_obiettivo   TEXT,
  diagnosi          TEXT,
  prescrizioni      TEXT,
  terapia           TEXT,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_visite_paziente ON visite (paziente_id, data DESC);

CREATE TABLE referti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id         UUID REFERENCES visite(id) ON DELETE SET NULL,
  paziente_id       UUID NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  professionista_id UUID REFERENCES professionisti(id) ON DELETE SET NULL,
  titolo            TEXT NOT NULL,
  contenuto         TEXT NOT NULL,
  stato             referto_stato NOT NULL DEFAULT 'bozza',
  validato_at       TIMESTAMPTZ,
  inviato_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_referti_paziente ON referti (paziente_id, created_at DESC);
CREATE INDEX idx_referti_stato ON referti (stato);

-- Validazione: date derivate + contenuto CONGELATO dopo la validazione.
CREATE OR REPLACE FUNCTION referto_transizioni()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.stato IN ('validato', 'inviato')
     AND (NEW.contenuto IS DISTINCT FROM OLD.contenuto
          OR NEW.titolo IS DISTINCT FROM OLD.titolo) THEN
    RAISE EXCEPTION 'Un referto validato non è modificabile (storico revisioni: creane uno nuovo)';
  END IF;
  IF NEW.stato = 'validato' AND OLD.stato IS DISTINCT FROM 'validato' THEN
    NEW.validato_at := NOW();
  END IF;
  IF NEW.stato = 'inviato' AND OLD.stato IS DISTINCT FROM 'inviato' THEN
    IF OLD.stato NOT IN ('validato') THEN
      RAISE EXCEPTION 'Si invia solo un referto validato';
    END IF;
    NEW.inviato_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER referti_transizioni
  BEFORE UPDATE ON referti
  FOR EACH ROW EXECUTE FUNCTION referto_transizioni();

-- ── MAGAZZINO SANITARIO (§13) — lotti e scadenze automatiche ─────
CREATE TABLE magazzino_sanitario (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descrizione     TEXT NOT NULL,
  tipo            articolo_sanitario_tipo NOT NULL DEFAULT 'consumo',
  lotto           TEXT,
  scadenza        DATE,
  quantita        NUMERIC(10,2) NOT NULL DEFAULT 0,
  soglia_riordino NUMERIC(10,2),
  note            TEXT,
  attivo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id)
);

CREATE OR REPLACE FUNCTION articolo_sync_scadenza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  DELETE FROM scadenze_moduli
  WHERE entita = 'magazzino_sanitario' AND entita_id = NEW.id AND stato = 'aperta';

  IF NEW.attivo AND NEW.scadenza IS NOT NULL AND NEW.scadenza >= CURRENT_DATE
     AND NEW.quantita > 0 THEN
    INSERT INTO scadenze_moduli
      (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
    VALUES
      ('poliambulatori', 'magazzino_sanitario', NEW.id, 'Scadenza lotto',
       NEW.descrizione || COALESCE(' (lotto ' || NEW.lotto || ')', ''),
       NEW.scadenza, '/poliambulatorio-struttura', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER magazzino_sync_scadenza
  AFTER INSERT OR UPDATE OF scadenza, quantita, attivo ON magazzino_sanitario
  FOR EACH ROW EXECUTE FUNCTION articolo_sync_scadenza();

-- ── COMUNICAZIONI (§15) e QUALITÀ (§16) ──────────────────────────
CREATE TABLE pazienti_comunicazioni (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paziente_id UUID NOT NULL REFERENCES pazienti(id) ON DELETE CASCADE,
  canale      comunicazione_canale NOT NULL DEFAULT 'telefono',
  oggetto     TEXT NOT NULL,
  testo       TEXT,
  data        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  esito       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_pazienti_comunicazioni ON pazienti_comunicazioni (paziente_id, data DESC);

CREATE TABLE eventi_qualita (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        evento_qualita_tipo NOT NULL,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  descrizione TEXT NOT NULL,
  gravita     priorita_type NOT NULL DEFAULT 'media',
  azioni      TEXT,
  chiuso      BOOLEAN NOT NULL DEFAULT false,
  chiuso_at   DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);

CREATE OR REPLACE FUNCTION evento_qualita_chiuso_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.chiuso AND NOT COALESCE(OLD.chiuso, false) THEN
    NEW.chiuso_at := CURRENT_DATE;
  ELSIF NOT NEW.chiuso THEN
    NEW.chiuso_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER eventi_qualita_set_chiuso
  BEFORE INSERT OR UPDATE OF chiuso ON eventi_qualita
  FOR EACH ROW EXECUTE FUNCTION evento_qualita_chiuso_at();

-- ── Trigger comuni ───────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'professionisti','convenzioni','pazienti','pazienti_consensi',
    'pazienti_condizioni','ambulatori','prestazioni','apparecchiature',
    'appuntamenti','visite','referti','magazzino_sanitario',
    'pazienti_comunicazioni','eventi_qualita'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;
END $$;

-- ═══ RLS ═════════════════════════════════════════════════════════
-- Amministrativi: tutto lo staff (licenza). Clinici: solo puo_clinica().
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'professionisti','convenzioni','pazienti','pazienti_consensi',
    'ambulatori','prestazioni','apparecchiature','appuntamenti',
    'magazzino_sanitario','pazienti_comunicazioni','eventi_qualita'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_licenziato('poliambulatori'))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_licenziato('poliambulatori') AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_licenziato('poliambulatori')) WITH CHECK (modulo_licenziato('poliambulatori'))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_licenziato('poliambulatori') AND get_user_role() = 'admin')$f$, t);
  END LOOP;

  -- Contenuti clinici: SOLO admin + professionisti (nemmeno il manager)
  FOREACH t IN ARRAY ARRAY['pazienti_condizioni','visite','referti'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_licenziato('poliambulatori') AND puo_clinica())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_licenziato('poliambulatori') AND puo_clinica() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_licenziato('poliambulatori') AND puo_clinica())
      WITH CHECK (modulo_licenziato('poliambulatori') AND puo_clinica())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_licenziato('poliambulatori') AND get_user_role() = 'admin')$f$, t);
  END LOOP;
END $$;

-- Anche gli ALLEGATI clinici (referti) restano riservati: la policy degli
-- allegati economici viene estesa alle entità cliniche.
ALTER POLICY "allegati_select" ON allegati
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      (entita IN ('fatture', 'scadenze_pagamento', 'scadenze_tasse') AND puo_amministrazione())
      OR (entita IN ('visite', 'referti', 'pazienti_condizioni') AND puo_clinica())
      OR entita NOT IN ('fatture', 'scadenze_pagamento', 'scadenze_tasse',
                        'visite', 'referti', 'pazienti_condizioni')
    )
  );

-- ═══ VISTE KPI (§17-§19) ═════════════════════════════════════════
CREATE VIEW vw_poliambulatorio_kpi WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM pazienti WHERE attivo)::int AS pazienti_totali,
  (SELECT COUNT(*) FROM pazienti
   WHERE attivo AND created_at >= date_trunc('month', CURRENT_DATE))::int AS nuovi_pazienti_mese,
  (SELECT COUNT(*) FROM appuntamenti
   WHERE inizio::date = CURRENT_DATE AND stato NOT IN ('annullato'))::int AS appuntamenti_oggi,
  (SELECT COUNT(*) FROM appuntamenti
   WHERE inizio::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
     AND stato NOT IN ('annullato'))::int AS appuntamenti_7gg,
  (SELECT COUNT(*) FROM appuntamenti WHERE lista_attesa
     AND stato = 'prenotato')::int AS lista_attesa,
  ROUND((SELECT COUNT(*) FILTER (WHERE stato = 'no_show')::numeric * 100
           / NULLIF(COUNT(*) FILTER (WHERE stato IN ('eseguito', 'no_show')), 0)
         FROM appuntamenti
         WHERE inizio >= CURRENT_DATE - 30), 1) AS tasso_no_show_30gg,
  (SELECT COUNT(*) FROM referti WHERE stato = 'da_validare')::int AS referti_da_validare,
  (SELECT COUNT(*) FROM eventi_qualita WHERE NOT chiuso)::int AS eventi_qualita_aperti;

GRANT SELECT ON vw_poliambulatorio_kpi TO authenticated;

-- ═══ Ricerca globale: + pazienti ═════════════════════════════════
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
    UNION ALL
    SELECT 'paziente', pz.id,
           pz.codice || ' · ' || trim(pz.nome || ' ' || COALESCE(pz.cognome, '')),
           COALESCE(pz.codice_fiscale, '')
    FROM pazienti pz
    WHERE pz.attivo AND pz.ricerca @@ websearch_to_tsquery('simple', q)
  ) t
  LIMIT 20
$$;

-- ═══ Hardening nuove funzioni ═════════════════════════════════════
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'paziente_set_codice()', 'appuntamento_no_overlap()',
    'referto_transizioni()', 'articolo_sync_scadenza()',
    'evento_qualita_chiuso_at()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
END $$;
