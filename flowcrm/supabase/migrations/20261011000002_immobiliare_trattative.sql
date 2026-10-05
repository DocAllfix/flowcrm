-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Agenzia immobiliare (Sprint 7) · 2/2: visite, proposte e
-- controproposte, preliminare e rogito con il post-vendita, locazioni con
-- l'adeguamento ISTAT, provvigioni con la ripartizione al 100%, modelli di
-- contratto con approvazione, antiriciclaggio e privacy, report al
-- proprietario, giro notturno delle scadenze, indicatori, cruscotto,
-- agenda, agenti, segmenti delle campagne, ricerca.
--
-- Documento Agenzia immobiliare §13–15, §17–26, §28–29.
--
-- Le provvigioni sono dati economici: le vede la direzione; l'agente vede
-- solo le sue. Il rogito vuole l'adeguata verifica antiriciclaggio
-- dell'acquirente (D.Lgs. 231/2007).
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. VISITE (§13) ════════════════════════════════════════════════
CREATE TABLE imm_visite (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  immobile_id      UUID NOT NULL REFERENCES imm_immobili(id) ON DELETE CASCADE,
  contatto_id      UUID NOT NULL REFERENCES contatti(id) ON DELETE CASCADE,
  richiesta_id     UUID REFERENCES imm_richieste(id) ON DELETE SET NULL,
  agente_id        UUID REFERENCES imm_agenti(id) ON DELETE SET NULL,
  inizio           TIMESTAMPTZ NOT NULL,
  durata_min       INT NOT NULL DEFAULT 45 CHECK (durata_min BETWEEN 10 AND 480),
  numero           INT NOT NULL DEFAULT 1,                 -- prima, seconda visita…
  stato            TEXT NOT NULL DEFAULT 'confermata' CHECK (stato IN ('proposta', 'confermata', 'svolta', 'annullata', 'non_presentato')),
  esito            TEXT CHECK (esito IN ('non_interessato', 'interessato', 'molto_interessato', 'vuole_offrire')),
  gradimento       INT CHECK (gradimento BETWEEN 1 AND 5),
  feedback         TEXT,                                    -- cosa ha detto il cliente
  prossime_azioni  TEXT,
  note             TEXT,
  fine             TIMESTAMPTZ NOT NULL,                    -- inizio + durata, la scrive il trigger
  periodo          TSTZRANGE GENERATED ALWAYS AS (tstzrange(inizio, fine, '[)')) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id),
  -- Un agente non è in due visite alla stessa ora.
  CONSTRAINT imm_agente_una_visita EXCLUDE USING gist (agente_id WITH =, periodo WITH &&) WHERE (agente_id IS NOT NULL AND stato IN ('proposta', 'confermata'))
);
CREATE INDEX idx_imm_visite_inizio ON imm_visite (inizio);
CREATE INDEX idx_imm_visite_immobile ON imm_visite (immobile_id);

-- ═══ 2. PROPOSTE E CONTROPROPOSTE (§14) ═════════════════════════════
CREATE TABLE imm_proposte (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  codice                TEXT UNIQUE,
  immobile_id           UUID NOT NULL REFERENCES imm_immobili(id) ON DELETE CASCADE,
  contatto_id           UUID NOT NULL REFERENCES contatti(id) ON DELETE CASCADE,   -- chi vuole comprare o affittare
  tipo                  TEXT NOT NULL DEFAULT 'acquisto' CHECK (tipo IN ('acquisto', 'locazione')),
  padre_id              UUID REFERENCES imm_proposte(id) ON DELETE CASCADE,         -- la proposta a cui risponde
  da                    TEXT NOT NULL DEFAULT 'cliente' CHECK (da IN ('cliente', 'proprietario')),
  prezzo_richiesto      NUMERIC(12,2),
  prezzo_offerto        NUMERIC(12,2) NOT NULL CHECK (prezzo_offerto > 0),
  caparra               NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (caparra >= 0),
  condizioni            TEXT,
  condizioni_sospensive TEXT,
  mutuo                 BOOLEAN NOT NULL DEFAULT false,
  importo_mutuo         NUMERIC(12,2) CHECK (importo_mutuo >= 0),
  scadenza              DATE,
  stato                 TEXT NOT NULL DEFAULT 'in_attesa' CHECK (stato IN ('in_attesa', 'controproposta', 'accettata', 'rifiutata', 'scaduta', 'ritirata')),
  decisa_il             DATE,
  agente_id             UUID REFERENCES imm_agenti(id) ON DELETE SET NULL,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_imm_proposte_immobile ON imm_proposte (immobile_id, created_at);
-- Una sola proposta accettata per immobile e tipo.
CREATE UNIQUE INDEX idx_imm_proposte_accettata ON imm_proposte (immobile_id, tipo) WHERE stato = 'accettata';

-- ═══ 3. PRELIMINARE, ROGITO, POST-VENDITA (§15, §24) ════════════════
CREATE TABLE imm_chiusure (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                  TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  codice                  TEXT UNIQUE,
  immobile_id             UUID NOT NULL REFERENCES imm_immobili(id) ON DELETE CASCADE,
  proposta_id             UUID REFERENCES imm_proposte(id) ON DELETE SET NULL,
  contatto_id             UUID NOT NULL REFERENCES contatti(id) ON DELETE RESTRICT,   -- l'acquirente
  prezzo                  NUMERIC(12,2) NOT NULL CHECK (prezzo > 0),
  preliminare_il          DATE,
  caparra_versata         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (caparra_versata >= 0),
  rogito_previsto         DATE,
  rogito_il               DATE,
  notaio_id               UUID REFERENCES imm_collaboratori(id) ON DELETE SET NULL,
  stato                   TEXT NOT NULL DEFAULT 'preliminare' CHECK (stato IN ('preliminare', 'rogitato', 'saltato')),
  -- Post-vendita.
  consegna_chiavi_il      DATE,
  documentazione_finale   BOOLEAN NOT NULL DEFAULT false,
  soddisfazione           INT CHECK (soddisfazione BETWEEN 1 AND 5),
  recensione_richiesta_il DATE,
  referral                TEXT,                                -- chi ci ha segnalato o chi ci segnala
  note                    TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID REFERENCES user_profiles(id),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by              UUID REFERENCES user_profiles(id),
  CHECK (rogito_il IS NULL OR stato = 'rogitato')
);
CREATE UNIQUE INDEX idx_imm_chiusure_immobile ON imm_chiusure (immobile_id) WHERE stato <> 'saltato';

-- ═══ 4. LOCAZIONI E ADEGUAMENTI ISTAT (§17) ═════════════════════════
CREATE TABLE imm_locazioni (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                 TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  codice                 TEXT UNIQUE,
  immobile_id            UUID NOT NULL REFERENCES imm_immobili(id) ON DELETE CASCADE,
  proposta_id            UUID REFERENCES imm_proposte(id) ON DELETE SET NULL,
  conduttore_id          UUID NOT NULL REFERENCES contatti(id) ON DELETE RESTRICT,
  tipo_contratto         TEXT NOT NULL DEFAULT '4+4' CHECK (tipo_contratto IN ('4+4', '3+2', 'transitorio', 'studenti', 'commerciale_6+6', 'altro')),
  canone_richiesto       NUMERIC(10,2),
  canone_iniziale        NUMERIC(10,2) NOT NULL CHECK (canone_iniziale > 0),
  canone                 NUMERIC(10,2),                       -- quello in vigore, dopo gli adeguamenti
  deposito               NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposito >= 0),
  garanzie               TEXT,                                -- fideiussione, garante…
  inizio                 DATE NOT NULL,
  durata_mesi            INT,
  fine                   DATE,
  rinnovo_tacito         BOOLEAN NOT NULL DEFAULT true,
  istat                  BOOLEAN NOT NULL DEFAULT true,
  ultimo_adeguamento     DATE,
  prossimo_adeguamento   DATE,
  stato                  TEXT NOT NULL DEFAULT 'attiva' CHECK (stato IN ('attiva', 'disdetta', 'cessata')),
  disdetta_il            DATE,
  note                   TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES user_profiles(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES user_profiles(id),
  CHECK (fine IS NULL OR fine > inizio)
);
CREATE UNIQUE INDEX idx_imm_locazioni_attiva ON imm_locazioni (immobile_id) WHERE stato = 'attiva';

CREATE TABLE imm_canoni (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  locazione_id     UUID NOT NULL REFERENCES imm_locazioni(id) ON DELETE CASCADE,
  canone           NUMERIC(10,2) NOT NULL,
  dal              DATE NOT NULL,
  variazione_istat NUMERIC(6,2),                             -- variazione dell'indice FOI, in %
  motivo           TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id)
);

-- ═══ 5. PROVVIGIONI E RIPARTIZIONI (§19, §27) ═══════════════════════
CREATE TABLE imm_provvigioni (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  codice            TEXT UNIQUE,
  immobile_id       UUID NOT NULL REFERENCES imm_immobili(id) ON DELETE CASCADE,
  chiusura_id       UUID REFERENCES imm_chiusure(id) ON DELETE CASCADE,
  locazione_id      UUID REFERENCES imm_locazioni(id) ON DELETE CASCADE,
  lato              TEXT NOT NULL CHECK (lato IN ('venditore', 'acquirente', 'locatore', 'conduttore')),
  contatto_id       UUID REFERENCES contatti(id) ON DELETE SET NULL,           -- chi la paga
  organizzazione_id UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  base              NUMERIC(12,2) NOT NULL DEFAULT 0,                          -- prezzo o canone di riferimento
  pct               NUMERIC(5,2),
  fisso             NUMERIC(10,2),
  importo           NUMERIC(12,2) NOT NULL CHECK (importo >= 0),               -- IVA esclusa
  agente_id         UUID REFERENCES imm_agenti(id) ON DELETE SET NULL,
  stato             TEXT NOT NULL DEFAULT 'maturata' CHECK (stato IN ('maturata', 'fatturata', 'incassata', 'annullata')),
  fattura_id        UUID REFERENCES fatture(id) ON DELETE SET NULL,
  incassata_il      DATE,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  CHECK ((chiusura_id IS NOT NULL) OR (locazione_id IS NOT NULL) OR lato IS NOT NULL)
);
CREATE INDEX idx_imm_provvigioni_agente ON imm_provvigioni (agente_id, created_at);

-- Chi si divide la provvigione: agenzia, agenti, collaboratori (co-mediazione, segnalazione).
CREATE TABLE imm_ripartizioni (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  provvigione_id   UUID NOT NULL REFERENCES imm_provvigioni(id) ON DELETE CASCADE,
  beneficiario     TEXT NOT NULL CHECK (beneficiario IN ('agenzia', 'agente', 'collaboratore')),
  agente_id        UUID REFERENCES imm_agenti(id) ON DELETE SET NULL,
  collaboratore_id UUID REFERENCES imm_collaboratori(id) ON DELETE SET NULL,
  pct              NUMERIC(5,2) NOT NULL CHECK (pct > 0 AND pct <= 100),
  importo          NUMERIC(12,2) NOT NULL DEFAULT 0,
  pagata_il        DATE,                                      -- quota pagata all'agente o al collaboratore
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  CHECK ((beneficiario = 'agente') = (agente_id IS NOT NULL) AND (beneficiario = 'collaboratore') = (collaboratore_id IS NOT NULL))
);
CREATE INDEX idx_imm_ripartizioni ON imm_ripartizioni (provvigione_id);

-- ═══ 6. MODELLI E CONTRATTI (§18) ═══════════════════════════════════
CREATE TABLE imm_modelli (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo      TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  nome        TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('incarico', 'proposta_acquisto', 'proposta_locazione', 'contratto_locazione', 'preliminare', 'contratto_vendita',
                'mandato', 'accordo', 'informativa_privacy')),
  testo       TEXT NOT NULL,                                -- con i segnaposto {{…}}
  attivo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);

CREATE TABLE imm_contratti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo          TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  modello_id      UUID REFERENCES imm_modelli(id) ON DELETE SET NULL,
  tipo            TEXT NOT NULL,
  titolo          TEXT NOT NULL,
  immobile_id     UUID REFERENCES imm_immobili(id) ON DELETE CASCADE,
  contatto_id     UUID REFERENCES contatti(id) ON DELETE SET NULL,
  incarico_id     UUID REFERENCES imm_incarichi(id) ON DELETE SET NULL,
  proposta_id     UUID REFERENCES imm_proposte(id) ON DELETE SET NULL,
  locazione_id    UUID REFERENCES imm_locazioni(id) ON DELETE SET NULL,
  chiusura_id     UUID REFERENCES imm_chiusure(id) ON DELETE SET NULL,
  testo           TEXT NOT NULL,
  stato           TEXT NOT NULL DEFAULT 'bozza' CHECK (stato IN ('bozza', 'in_approvazione', 'approvato', 'inviato_firma', 'firmato', 'annullato')),
  approvazione_id UUID REFERENCES approvazioni(id) ON DELETE SET NULL,
  firmato_il      DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id)
);

-- ═══ 7. ANTIRICICLAGGIO E PRIVACY (§29) ═════════════════════════════
CREATE TABLE imm_aml_verifiche (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo             TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  contatto_id        UUID REFERENCES contatti(id) ON DELETE RESTRICT,
  organizzazione_id  UUID REFERENCES organizzazioni(id) ON DELETE RESTRICT,
  immobile_id        UUID REFERENCES imm_immobili(id) ON DELETE SET NULL,
  ruolo              TEXT NOT NULL DEFAULT 'acquirente' CHECK (ruolo IN ('acquirente', 'venditore', 'conduttore', 'locatore')),
  documento_tipo     TEXT NOT NULL DEFAULT 'carta_identita' CHECK (documento_tipo IN ('carta_identita', 'passaporto', 'patente', 'permesso_soggiorno', 'visura_camerale', 'altro')),
  documento_numero   TEXT NOT NULL,
  documento_scadenza DATE,
  identificato_il    DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  modalita           TEXT NOT NULL DEFAULT 'presenza' CHECK (modalita IN ('presenza', 'remoto', 'terzi')),
  titolare_effettivo TEXT,
  pep                BOOLEAN NOT NULL DEFAULT false,          -- persona politicamente esposta
  scopo_natura       TEXT,
  origine_fondi      TEXT,
  rischio            TEXT NOT NULL DEFAULT 'basso' CHECK (rischio IN ('basso', 'medio', 'alto')),
  adeguata_verifica  TEXT NOT NULL DEFAULT 'ordinaria' CHECK (adeguata_verifica IN ('semplificata', 'ordinaria', 'rafforzata')),
  conservare_fino    DATE,                                   -- 10 anni dalla fine del rapporto
  operatore_id       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id),
  CHECK ((contatto_id IS NOT NULL) <> (organizzazione_id IS NOT NULL))
);
CREATE INDEX idx_imm_aml_contatto ON imm_aml_verifiche (contatto_id, identificato_il DESC);

CREATE TABLE imm_privacy (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  contatto_id           UUID NOT NULL UNIQUE REFERENCES contatti(id) ON DELETE CASCADE,
  informativa_il        DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  consenso_trattamento  BOOLEAN NOT NULL DEFAULT true,
  consenso_marketing    BOOLEAN NOT NULL DEFAULT false,
  consenso_terzi        BOOLEAN NOT NULL DEFAULT false,     -- comunicazione a notai, banche, collaboratori
  revocato_il           DATE,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id)
);

-- ═══ 8. REPORT AL PROPRIETARIO (§23) ════════════════════════════════
CREATE TABLE imm_report_inviati (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo      TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  immobile_id UUID NOT NULL REFERENCES imm_immobili(id) ON DELETE CASCADE,
  inviato_il  DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  destinatari INT NOT NULL DEFAULT 0,
  dati        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_imm_report ON imm_report_inviati (immobile_id, inviato_il DESC);

-- ═══ 9. VISITE: NUMERO, AVVISI, TRATTATIVA ══════════════════════════
CREATE OR REPLACE FUNCTION imm_visita_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.fine := NEW.inizio + make_interval(mins => NEW.durata_min);
  IF TG_OP = 'INSERT' THEN
    NEW.agente_id := COALESCE(NEW.agente_id, (SELECT agente_id FROM imm_immobili WHERE id = NEW.immobile_id), imm_agente_corrente());
    NEW.numero := 1 + (SELECT count(*) FROM imm_visite v WHERE v.immobile_id = NEW.immobile_id AND v.contatto_id = NEW.contatto_id AND v.stato = 'svolta');
    IF (SELECT stato FROM imm_immobili WHERE id = NEW.immobile_id) NOT IN ('disponibile', 'sotto_offerta') THEN
      RAISE EXCEPTION 'Si visita solo un immobile sul mercato' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.stato = 'svolta' AND NEW.esito IS NULL THEN
    RAISE EXCEPTION 'Indica com''è andata la visita' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_visite_prepara BEFORE INSERT OR UPDATE ON imm_visite FOR EACH ROW EXECUTE FUNCTION imm_visita_prepara();

CREATE OR REPLACE FUNCTION imm_visita_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  i imm_immobili%ROWTYPE;
  v_user UUID;
  v_quando TEXT := to_char(NEW.inizio AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY "alle" HH24:MI');
BEGIN
  SELECT * INTO i FROM imm_immobili WHERE id = NEW.immobile_id;
  SELECT user_id INTO v_user FROM imm_agenti WHERE id = NEW.agente_id;
  IF NEW.stato = 'confermata' AND (TG_OP = 'INSERT' OR OLD.stato <> 'confermata' OR OLD.inizio <> NEW.inizio) THEN
    PERFORM imm_scrivi(NEW.contatto_id, 'Visita confermata', 'la visita all''immobile ' || i.codice || ' in ' || i.indirizzo || ', ' || i.comune
      || ' è fissata per il ' || v_quando || '. Per spostarla ci chiami.');
    PERFORM imm_notifica_agente(NEW.agente_id, 'Visita ' || v_quando, i.codice || ' · ' || i.indirizzo
      || COALESCE(' con ' || (SELECT trim(nome || ' ' || COALESCE(cognome, '')) FROM contatti WHERE id = NEW.contatto_id), ''), '/immobiliare/visite');
  END IF;
  IF NEW.stato = 'svolta' AND (TG_OP = 'INSERT' OR OLD.stato <> 'svolta') THEN
    PERFORM imm_avanza('Trattative', NEW.contatto_id, NEW.immobile_id, CASE WHEN NEW.numero >= 2 THEN 'Seconda visita' ELSE 'Visita' END,
                       CASE WHEN i.contratto = 'affitto' THEN i.canone ELSE i.prezzo END);
    UPDATE imm_selezioni SET stato = 'visitato' WHERE immobile_id = NEW.immobile_id
       AND richiesta_id IN (SELECT id FROM imm_richieste WHERE contatto_id = NEW.contatto_id);
    -- Il seguito: una telefonata all'agente fra due giorni, se il cliente non ha detto di no.
    IF NEW.esito <> 'non_interessato' THEN
      INSERT INTO attivita (tipo, titolo, descrizione, scadenza, assegnato_a, contatto_id, immobile_id, created_by)
      VALUES ('chiamata', 'Sentire ' || (SELECT trim(nome || ' ' || COALESCE(cognome, '')) FROM contatti WHERE id = NEW.contatto_id) || ' dopo la visita a ' || i.codice,
              COALESCE(NEW.prossime_azioni, NEW.feedback), NEW.inizio + INTERVAL '2 days', v_user, NEW.contatto_id, NEW.immobile_id, COALESCE(auth.uid(), NEW.created_by));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_visite_effetti AFTER INSERT OR UPDATE OF stato, inizio ON imm_visite FOR EACH ROW EXECUTE FUNCTION imm_visita_effetti();

-- ═══ 10. PROPOSTE: CATENA, ACCETTAZIONE, IMMOBILE SOTTO OFFERTA ═════

CREATE OR REPLACE FUNCTION imm_proposta_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_imm TEXT;
BEGIN
  SELECT codice || ' · ' || indirizzo INTO v_imm FROM imm_immobili WHERE id = NEW.immobile_id;
  IF TG_OP = 'INSERT' THEN
    IF NEW.padre_id IS NOT NULL THEN
      PERFORM set_config('imm.interno', '1', true);
      UPDATE imm_proposte SET stato = 'controproposta' WHERE id = NEW.padre_id;
      PERFORM set_config('imm.interno', '0', true);
    END IF;
    IF NEW.tipo = 'acquisto' THEN
      PERFORM imm_avanza('Trattative', NEW.contatto_id, NEW.immobile_id, CASE WHEN NEW.padre_id IS NULL THEN 'Offerta' ELSE 'Controproposta' END, NEW.prezzo_offerto);
    END IF;
    PERFORM imm_notifica_agente(NEW.agente_id, CASE WHEN NEW.padre_id IS NULL THEN 'Nuova proposta' ELSE 'Controproposta' END || ' su ' || v_imm,
      imm_euro(NEW.prezzo_offerto) || COALESCE(', scade il ' || to_char(NEW.scadenza, 'DD/MM/YYYY'), ''), '/immobiliare/trattative', 'warning');
  END IF;
  -- Scadenza della proposta tra le scadenze.
  DELETE FROM scadenze_moduli WHERE entita = 'imm_proposte' AND entita_id = NEW.id AND stato = 'aperta';
  IF NEW.stato = 'in_attesa' AND NEW.scadenza IS NOT NULL THEN
    INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
    VALUES ('immobiliare', 'imm_proposte', NEW.id, 'Proposta', v_imm || ' · ' || NEW.codice || ' · ' || imm_euro(NEW.prezzo_offerto), NEW.scadenza,
            '/immobiliare/trattative', NEW.created_by);
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.stato <> OLD.stato THEN
    IF NEW.stato = 'accettata' THEN
      UPDATE imm_immobili SET stato = 'sotto_offerta' WHERE id = NEW.immobile_id AND stato = 'disponibile';
      IF NEW.tipo = 'acquisto' THEN PERFORM imm_avanza('Trattative', NEW.contatto_id, NEW.immobile_id, 'Accettazione', NEW.prezzo_offerto); END IF;
      -- Le altre proposte in attesa sull'immobile decadono.
      PERFORM set_config('imm.interno', '1', true);
      UPDATE imm_proposte SET stato = 'rifiutata', note = COALESCE(note || ' · ', '') || 'Accettata un''altra proposta'
       WHERE immobile_id = NEW.immobile_id AND tipo = NEW.tipo AND stato = 'in_attesa' AND id <> NEW.id;
      PERFORM set_config('imm.interno', '0', true);
      PERFORM imm_scrivi(NEW.contatto_id, 'Proposta accettata', 'la sua proposta ' || NEW.codice || ' di ' || imm_euro(NEW.prezzo_offerto)
        || ' per l''immobile ' || v_imm || ' è stata accettata. La contatteremo per i passi successivi.');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_proposte_effetti AFTER INSERT OR UPDATE OF stato, scadenza ON imm_proposte FOR EACH ROW EXECUTE FUNCTION imm_proposta_effetti();

-- ═══ 11. PROVVIGIONI: CALCOLO E RIPARTIZIONE ════════════════════════
CREATE OR REPLACE FUNCTION imm_crea_provvigione(p_immobile UUID, p_lato TEXT, p_contatto UUID, p_organizzazione UUID, p_base NUMERIC, p_pct NUMERIC, p_fisso NUMERIC,
                                                p_chiusura UUID, p_locazione UUID, p_agente UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  s imm_impostazioni%ROWTYPE;
  v_importo NUMERIC;
  v_id UUID;
  v_quota NUMERIC;
BEGIN
  SELECT * INTO s FROM imm_impostazioni WHERE id = 1;
  v_importo := COALESCE(p_fisso, round(p_base * COALESCE(p_pct, 0) / 100, 2));
  IF p_fisso IS NULL AND p_lato IN ('venditore', 'acquirente') THEN v_importo := GREATEST(v_importo, COALESCE(s.provvigione_minima, 0)); END IF;
  IF v_importo <= 0 THEN RETURN NULL; END IF;
  INSERT INTO imm_provvigioni (codice, immobile_id, chiusura_id, locazione_id, lato, contatto_id, organizzazione_id, base, pct, fisso, importo, agente_id, created_by)
  VALUES (genera_codice('PRV'), p_immobile, p_chiusura, p_locazione, p_lato, p_contatto, p_organizzazione, p_base, CASE WHEN p_fisso IS NULL THEN p_pct END, p_fisso,
          v_importo, p_agente, auth.uid())
  RETURNING id INTO v_id;
  -- Ripartizione di partenza: la quota dell'agente e il resto all'agenzia.
  IF p_agente IS NOT NULL THEN
    SELECT COALESCE(quota_pct, s.quota_agente_pct, 50) INTO v_quota FROM imm_agenti WHERE id = p_agente;
  END IF;
  IF COALESCE(v_quota, 0) > 0 THEN
    INSERT INTO imm_ripartizioni (provvigione_id, beneficiario, agente_id, pct, importo, created_by)
    VALUES (v_id, 'agente', p_agente, v_quota, round(v_importo * v_quota / 100, 2), auth.uid());
  END IF;
  IF COALESCE(v_quota, 0) < 100 THEN
    INSERT INTO imm_ripartizioni (provvigione_id, beneficiario, pct, importo, created_by)
    VALUES (v_id, 'agenzia', 100 - COALESCE(v_quota, 0), v_importo - round(v_importo * COALESCE(v_quota, 0) / 100, 2), auth.uid());
  END IF;
  RETURN v_id;
END;
$$;

-- Nuova ripartizione: sostituisce la precedente e deve fare 100%.
-- p_righe = [{beneficiario, agente_id?, collaboratore_id?, pct}]
CREATE OR REPLACE FUNCTION imm_ripartisci(p_provvigione UUID, p_righe JSONB)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p imm_provvigioni%ROWTYPE;
  v_tot NUMERIC;
  v_assegnato NUMERIC := 0;
  r JSONB;
  n INT := 0;
  v_ultima INT;
BEGIN
  IF NOT modulo_attivo('immobiliare') OR NOT puo_amministrazione() THEN
    RAISE EXCEPTION 'La ripartizione la decide la direzione' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM imm_provvigioni WHERE id = p_provvigione FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Provvigione inesistente'; END IF;
  SELECT COALESCE(sum((x->>'pct')::numeric), 0) INTO v_tot FROM jsonb_array_elements(p_righe) x;
  IF v_tot <> 100 THEN
    RAISE EXCEPTION 'La ripartizione deve fare 100%%: ora fa %%%', replace(to_char(v_tot, 'FM990.##'), '.', ',') USING ERRCODE = 'check_violation';
  END IF;
  DELETE FROM imm_ripartizioni WHERE provvigione_id = p.id;
  v_ultima := jsonb_array_length(p_righe);
  FOR r IN SELECT * FROM jsonb_array_elements(p_righe) LOOP
    n := n + 1;
    -- L'ultima quota prende i centesimi dell'arrotondamento: la somma è esatta.
    INSERT INTO imm_ripartizioni (provvigione_id, beneficiario, agente_id, collaboratore_id, pct, importo, created_by)
    VALUES (p.id, r->>'beneficiario', NULLIF(r->>'agente_id', '')::uuid, NULLIF(r->>'collaboratore_id', '')::uuid, (r->>'pct')::numeric,
            CASE WHEN n = v_ultima THEN p.importo - v_assegnato ELSE round(p.importo * (r->>'pct')::numeric / 100, 2) END, auth.uid());
    v_assegnato := v_assegnato + round(p.importo * (r->>'pct')::numeric / 100, 2);
  END LOOP;
  RETURN n;
END;
$$;

-- Fattura della provvigione dal nucleo: al cliente (per un privato nasce la sua scheda fiscale).
CREATE OR REPLACE FUNCTION imm_fattura_provvigione(p_provvigione UUID, p_numero TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p imm_provvigioni%ROWTYPE;
  k contatti%ROWTYPE;
  v_org UUID;
  v_fattura UUID;
  v_iva NUMERIC := 22;
  v_imm TEXT;
BEGIN
  IF NOT modulo_attivo('immobiliare') OR NOT puo_amministrazione() THEN
    RAISE EXCEPTION 'La fattura la emette la direzione' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM imm_provvigioni WHERE id = p_provvigione FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Provvigione inesistente'; END IF;
  IF p.stato <> 'maturata' THEN RAISE EXCEPTION 'Provvigione già %', p.stato USING ERRCODE = 'check_violation'; END IF;
  v_org := p.organizzazione_id;
  IF v_org IS NULL THEN
    SELECT * INTO k FROM contatti WHERE id = p.contatto_id;
    v_org := k.organizzazione_id;
    IF v_org IS NULL THEN
      INSERT INTO organizzazioni (ragione_sociale, email, telefono, note, created_by)
      VALUES (trim(k.nome || ' ' || COALESCE(k.cognome, '')), k.email, k.telefono, 'Persona fisica (cliente dell''agenzia)', auth.uid())
      RETURNING id INTO v_org;
      INSERT INTO organizzazioni_ruoli (organizzazione_id, ruolo) VALUES (v_org, 'cliente') ON CONFLICT DO NOTHING;
      UPDATE contatti SET organizzazione_id = v_org WHERE id = k.id;
    END IF;
  END IF;
  SELECT codice || ' · ' || indirizzo || ', ' || comune INTO v_imm FROM imm_immobili WHERE id = p.immobile_id;
  INSERT INTO fatture (direzione, numero, data, organizzazione_id, imponibile, aliquota_iva, totale, scadenza, note, created_by)
  VALUES ('attiva', p_numero, imm_oggi(), v_org, p.importo, v_iva, round(p.importo * (1 + v_iva / 100), 2), imm_oggi() + 30,
          'Provvigione di mediazione (lato ' || p.lato || ') · ' || v_imm, auth.uid())
  RETURNING id INTO v_fattura;
  PERFORM set_config('imm.interno', '1', true);
  UPDATE imm_provvigioni SET stato = 'fatturata', fattura_id = v_fattura, organizzazione_id = v_org WHERE id = p.id;
  PERFORM set_config('imm.interno', '0', true);
  RETURN v_fattura;
END;
$$;

-- ═══ 12. CHIUSURE: PRELIMINARE, ROGITO, ANTIRICICLAGGIO ═════════════
CREATE OR REPLACE FUNCTION imm_chiusura_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p imm_proposte%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.codice IS NULL THEN NEW.codice := genera_codice('ROG'); END IF;
    IF NEW.proposta_id IS NOT NULL THEN
      SELECT * INTO p FROM imm_proposte WHERE id = NEW.proposta_id;
      IF p.stato <> 'accettata' THEN RAISE EXCEPTION 'Il preliminare segue una proposta accettata' USING ERRCODE = 'check_violation'; END IF;
      NEW.contatto_id := COALESCE(NEW.contatto_id, p.contatto_id);
      NEW.prezzo := COALESCE(NEW.prezzo, p.prezzo_offerto);
    END IF;
  END IF;
  IF NEW.stato = 'rogitato' AND (TG_OP = 'INSERT' OR OLD.stato <> 'rogitato') THEN
    NEW.rogito_il := COALESCE(NEW.rogito_il, imm_oggi());
    -- D.Lgs. 231/2007: niente rogito senza l'adeguata verifica dell'acquirente.
    IF NOT EXISTS (SELECT 1 FROM imm_aml_verifiche a WHERE a.contatto_id = NEW.contatto_id AND a.identificato_il >= NEW.rogito_il - 365) THEN
      RAISE EXCEPTION 'Manca l''adeguata verifica antiriciclaggio dell''acquirente' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.stato IN ('rogitato', 'saltato') AND NEW.stato <> OLD.stato THEN
    RAISE EXCEPTION 'La chiusura è già %', OLD.stato USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_chiusure_prepara BEFORE INSERT OR UPDATE ON imm_chiusure FOR EACH ROW EXECUTE FUNCTION imm_chiusura_prepara();

CREATE OR REPLACE FUNCTION imm_chiusura_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  i imm_immobili%ROWTYPE;
  inc imm_incarichi%ROWTYPE;
  s imm_impostazioni%ROWTYPE;
  v_prop imm_proprietari%ROWTYPE;
  v_user UUID;
  v_imm TEXT;
BEGIN
  SELECT * INTO i FROM imm_immobili WHERE id = NEW.immobile_id;
  SELECT * INTO s FROM imm_impostazioni WHERE id = 1;
  v_imm := i.codice || ' · ' || i.indirizzo;
  -- Data del rogito previsto tra le scadenze.
  DELETE FROM scadenze_moduli WHERE entita = 'imm_chiusure' AND entita_id = NEW.id AND stato = 'aperta';
  IF NEW.stato = 'preliminare' AND NEW.rogito_previsto IS NOT NULL THEN
    INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
    VALUES ('immobiliare', 'imm_chiusure', NEW.id, 'Rogito', v_imm || ' · ' || NEW.codice, NEW.rogito_previsto, '/immobiliare/trattative', NEW.created_by);
  END IF;
  IF TG_OP = 'INSERT' AND NEW.stato = 'preliminare' THEN
    UPDATE imm_immobili SET stato = 'sotto_offerta' WHERE id = NEW.immobile_id AND stato = 'disponibile';
    PERFORM imm_avanza('Trattative', NEW.contatto_id, NEW.immobile_id, 'Preliminare', NEW.prezzo);
  END IF;
  IF NEW.stato = 'rogitato' AND (TG_OP = 'INSERT' OR OLD.stato <> 'rogitato') THEN
    UPDATE imm_immobili SET stato = 'venduto', prezzo_vendita = NEW.prezzo, concluso_il = NEW.rogito_il WHERE id = NEW.immobile_id;
    PERFORM imm_avanza('Trattative', NEW.contatto_id, NEW.immobile_id, 'Rogito', NEW.prezzo);
    UPDATE imm_richieste SET stato = 'soddisfatta' WHERE contatto_id = NEW.contatto_id AND tipo = 'acquisto' AND stato = 'attiva';
    -- Le trattative degli altri sull'immobile sono perse.
    UPDATE deals SET stage_id = (SELECT id FROM pipeline_stages WHERE pipeline_id = imm_pipeline('Trattative') AND is_lost LIMIT 1),
                     motivo_perdita = 'Immobile venduto ad altri'
     WHERE pipeline_id = imm_pipeline('Trattative') AND immobile_id = NEW.immobile_id AND chiuso_at IS NULL AND contatto_id <> NEW.contatto_id;
    -- Provvigioni: lato venditore dall'incarico, lato acquirente dalle regole dell'agenzia.
    SELECT * INTO inc FROM imm_incarichi WHERE immobile_id = NEW.immobile_id AND tipo = 'vendita' AND stato = 'attivo' ORDER BY conferito_il DESC LIMIT 1;
    SELECT * INTO v_prop FROM imm_proprietari WHERE immobile_id = NEW.immobile_id ORDER BY referente DESC, quota_pct DESC LIMIT 1;
    PERFORM imm_crea_provvigione(NEW.immobile_id, 'venditore', v_prop.contatto_id, v_prop.organizzazione_id, NEW.prezzo,
                                 COALESCE(inc.provvigione_pct, s.provvigione_venditore_pct), inc.provvigione_fissa, NEW.id, NULL, COALESCE(inc.agente_id, i.agente_id));
    PERFORM imm_crea_provvigione(NEW.immobile_id, 'acquirente', NEW.contatto_id, NULL, NEW.prezzo, s.provvigione_acquirente_pct, NULL, NEW.id, NULL,
                                 COALESCE(inc.agente_id, i.agente_id));
    UPDATE imm_incarichi SET stato = 'concluso' WHERE immobile_id = NEW.immobile_id AND stato = 'attivo';
    -- Post-vendita: il seguito con il cliente dopo sei mesi.
    SELECT user_id INTO v_user FROM imm_agenti WHERE id = i.agente_id;
    INSERT INTO attivita (tipo, titolo, descrizione, scadenza, assegnato_a, contatto_id, immobile_id, created_by)
    VALUES ('chiamata', 'Seguito post-vendita · ' || (SELECT trim(nome || ' ' || COALESCE(cognome, '')) FROM contatti WHERE id = NEW.contatto_id),
            'Sei mesi dal rogito di ' || v_imm || ': come va, servono altri servizi, conosce qualcuno che cerca casa?',
            (NEW.rogito_il + 182)::timestamp AT TIME ZONE 'Europe/Rome', v_user, NEW.contatto_id, NEW.immobile_id, COALESCE(auth.uid(), NEW.created_by));
    PERFORM imm_scrivi(NEW.contatto_id, 'Benvenuto nella sua nuova casa', 'grazie per averci scelto per l''acquisto di ' || i.indirizzo || ', ' || i.comune
      || E'. Saremo felici di leggere un suo parere sul nostro lavoro e di aiutare chi lei ci vorrà segnalare.');
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.stato = 'saltato' AND OLD.stato <> 'saltato' THEN
    UPDATE imm_immobili SET stato = 'disponibile' WHERE id = NEW.immobile_id AND stato = 'sotto_offerta';
    PERFORM set_config('imm.interno', '1', true);
    UPDATE imm_proposte SET stato = 'ritirata', note = COALESCE(note || ' · ', '') || 'Trattativa saltata' WHERE id = NEW.proposta_id AND stato = 'accettata';
    PERFORM set_config('imm.interno', '0', true);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_chiusure_effetti AFTER INSERT OR UPDATE OF stato, rogito_previsto ON imm_chiusure FOR EACH ROW EXECUTE FUNCTION imm_chiusura_effetti();

-- Una proposta accettata si può ritirare solo da qui (trattativa saltata): il permesso passa dal segnale interno.
CREATE OR REPLACE FUNCTION imm_proposta_accettata_protetta()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.stato = 'accettata' AND NEW.stato <> 'accettata' AND current_setting('imm.interno', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'La proposta è già accettata: se la trattativa salta, si segna sulla chiusura' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_proposte_a_accettata BEFORE UPDATE OF stato ON imm_proposte FOR EACH ROW EXECUTE FUNCTION imm_proposta_accettata_protetta();

-- Preparazione della proposta: codice, prezzo richiesto, catena delle controproposte; una decisione non si cambia
-- (le funzioni fidate passano con il segnale interno).
CREATE OR REPLACE FUNCTION imm_proposta_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  i imm_immobili%ROWTYPE;
  p imm_proposte%ROWTYPE;
BEGIN
  SELECT * INTO i FROM imm_immobili WHERE id = NEW.immobile_id;
  IF TG_OP = 'INSERT' THEN
    IF NEW.codice IS NULL THEN NEW.codice := genera_codice('PRI'); END IF;
    IF i.stato NOT IN ('disponibile', 'sotto_offerta') THEN
      RAISE EXCEPTION 'L''immobile non è in vendita né in affitto' USING ERRCODE = 'check_violation';
    END IF;
    NEW.prezzo_richiesto := COALESCE(NEW.prezzo_richiesto, CASE WHEN NEW.tipo = 'acquisto' THEN i.prezzo ELSE i.canone END);
    NEW.agente_id := COALESCE(NEW.agente_id, i.agente_id);
    IF NEW.padre_id IS NOT NULL THEN
      SELECT * INTO p FROM imm_proposte WHERE id = NEW.padre_id;
      IF p.stato <> 'in_attesa' THEN RAISE EXCEPTION 'Si risponde solo a una proposta in attesa' USING ERRCODE = 'check_violation'; END IF;
      NEW.contatto_id := p.contatto_id;
      NEW.tipo := p.tipo;
      NEW.da := CASE WHEN p.da = 'cliente' THEN 'proprietario' ELSE 'cliente' END;
    END IF;
  ELSIF NEW.stato <> OLD.stato THEN
    IF current_setting('imm.interno', true) IS DISTINCT FROM '1' THEN
      IF OLD.stato <> 'in_attesa' THEN RAISE EXCEPTION 'La proposta è già %', OLD.stato USING ERRCODE = 'check_violation'; END IF;
      IF NEW.stato = 'controproposta' THEN
        RAISE EXCEPTION 'La controproposta si registra come nuova proposta in risposta' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    NEW.decisa_il := imm_oggi();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER imm_proposte_prepara BEFORE INSERT OR UPDATE ON imm_proposte FOR EACH ROW EXECUTE FUNCTION imm_proposta_prepara();

-- ═══ 13. LOCAZIONI: DATE, PROVVIGIONI, ISTAT ════════════════════════
CREATE OR REPLACE FUNCTION imm_locazione_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.codice IS NULL THEN NEW.codice := genera_codice('LOC'); END IF;
    NEW.canone := COALESCE(NEW.canone, NEW.canone_iniziale);
    NEW.canone_richiesto := COALESCE(NEW.canone_richiesto, (SELECT canone FROM imm_immobili WHERE id = NEW.immobile_id));
    NEW.durata_mesi := COALESCE(NEW.durata_mesi, CASE NEW.tipo_contratto WHEN '4+4' THEN 48 WHEN '3+2' THEN 36 WHEN 'commerciale_6+6' THEN 72
                                                                      WHEN 'transitorio' THEN 12 WHEN 'studenti' THEN 12 ELSE 12 END);
    NEW.fine := COALESCE(NEW.fine, ((NEW.inizio + make_interval(months => NEW.durata_mesi))::date - 1));
    IF NEW.istat AND NEW.tipo_contratto NOT IN ('transitorio', 'studenti') THEN
      NEW.prossimo_adeguamento := COALESCE(NEW.prossimo_adeguamento, (NEW.inizio + INTERVAL '1 year')::date);
    ELSE
      NEW.istat := false; NEW.prossimo_adeguamento := NULL;
    END IF;
  END IF;
  IF NEW.stato = 'disdetta' AND NEW.disdetta_il IS NULL THEN NEW.disdetta_il := imm_oggi(); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_locazioni_prepara BEFORE INSERT OR UPDATE ON imm_locazioni FOR EACH ROW EXECUTE FUNCTION imm_locazione_prepara();

CREATE OR REPLACE FUNCTION imm_locazione_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  i imm_immobili%ROWTYPE;
  s imm_impostazioni%ROWTYPE;
  v_prop imm_proprietari%ROWTYPE;
  inc imm_incarichi%ROWTYPE;
  v_imm TEXT;
BEGIN
  SELECT * INTO i FROM imm_immobili WHERE id = NEW.immobile_id;
  SELECT * INTO s FROM imm_impostazioni WHERE id = 1;
  v_imm := i.codice || ' · ' || i.indirizzo;
  IF TG_OP = 'INSERT' THEN
    UPDATE imm_immobili SET stato = 'affittato', concluso_il = NEW.inizio WHERE id = NEW.immobile_id;
    INSERT INTO imm_canoni (locazione_id, canone, dal, motivo, created_by) VALUES (NEW.id, NEW.canone, NEW.inizio, 'Canone iniziale', NEW.created_by);
    PERFORM imm_avanza('Trattative', NEW.conduttore_id, NEW.immobile_id, 'Rogito', NEW.canone * 12);
    UPDATE imm_richieste SET stato = 'soddisfatta' WHERE contatto_id = NEW.conduttore_id AND tipo = 'affitto' AND stato = 'attiva';
    -- Provvigioni: per lato, mensilità del canone (o la percentuale dell'incarico sul canone annuo).
    SELECT * INTO inc FROM imm_incarichi WHERE immobile_id = NEW.immobile_id AND tipo = 'locazione' AND stato = 'attivo' ORDER BY conferito_il DESC LIMIT 1;
    SELECT * INTO v_prop FROM imm_proprietari WHERE immobile_id = NEW.immobile_id ORDER BY referente DESC, quota_pct DESC LIMIT 1;
    PERFORM imm_crea_provvigione(NEW.immobile_id, 'locatore', v_prop.contatto_id, v_prop.organizzazione_id, NEW.canone * 12,
                                 inc.provvigione_pct, COALESCE(inc.provvigione_fissa, CASE WHEN inc.provvigione_pct IS NULL THEN round(NEW.canone * s.locazione_mensilita, 2) END),
                                 NULL, NEW.id, COALESCE(inc.agente_id, i.agente_id));
    PERFORM imm_crea_provvigione(NEW.immobile_id, 'conduttore', NEW.conduttore_id, NULL, NEW.canone * 12, NULL, round(NEW.canone * s.locazione_mensilita, 2),
                                 NULL, NEW.id, COALESCE(inc.agente_id, i.agente_id));
    UPDATE imm_incarichi SET stato = 'concluso' WHERE immobile_id = NEW.immobile_id AND tipo = 'locazione' AND stato = 'attivo';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.stato IN ('disdetta', 'cessata') AND OLD.stato = 'attiva' THEN
    UPDATE imm_immobili SET stato = 'ritirato' WHERE id = NEW.immobile_id AND stato = 'affittato';
  END IF;
  DELETE FROM scadenze_moduli WHERE entita = 'imm_locazioni' AND entita_id = NEW.id AND stato = 'aperta';
  IF NEW.stato = 'attiva' THEN
    INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
    VALUES ('immobiliare', 'imm_locazioni', NEW.id, 'Fine locazione', v_imm || ' · ' || NEW.codice, NEW.fine, '/immobiliare/locazioni', NEW.created_by);
    IF NEW.prossimo_adeguamento IS NOT NULL THEN
      INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
      VALUES ('immobiliare', 'imm_locazioni', NEW.id, 'Adeguamento ISTAT', v_imm || ' · ' || NEW.codice, NEW.prossimo_adeguamento, '/immobiliare/locazioni', NEW.created_by);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_locazioni_effetti AFTER INSERT OR UPDATE OF stato, fine, prossimo_adeguamento ON imm_locazioni FOR EACH ROW EXECUTE FUNCTION imm_locazione_effetti();

-- Adeguamento annuale: canone × (1 + variazione FOI × quota ISTAT dell'agenzia).
CREATE OR REPLACE FUNCTION imm_adegua_istat(p_locazione UUID, p_variazione NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  l imm_locazioni%ROWTYPE;
  v_quota NUMERIC;
  v_nuovo NUMERIC;
BEGIN
  IF NOT modulo_attivo('immobiliare') THEN RAISE EXCEPTION 'Modulo Agenzia immobiliare non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO l FROM imm_locazioni WHERE id = p_locazione FOR UPDATE;
  IF l.id IS NULL THEN RAISE EXCEPTION 'Locazione inesistente'; END IF;
  IF NOT l.istat OR l.stato <> 'attiva' THEN RAISE EXCEPTION 'La locazione non prevede l''adeguamento ISTAT' USING ERRCODE = 'check_violation'; END IF;
  SELECT istat_pct INTO v_quota FROM imm_impostazioni WHERE id = 1;
  v_nuovo := round(l.canone * (1 + p_variazione * COALESCE(v_quota, 75) / 100 / 100), 2);
  INSERT INTO imm_canoni (locazione_id, canone, dal, variazione_istat, motivo, created_by)
  VALUES (l.id, v_nuovo, COALESCE(l.prossimo_adeguamento, imm_oggi()), p_variazione, 'Adeguamento ISTAT (' || COALESCE(v_quota, 75) || '% della variazione)', auth.uid());
  UPDATE imm_locazioni SET canone = v_nuovo, ultimo_adeguamento = COALESCE(prossimo_adeguamento, imm_oggi()),
                           prossimo_adeguamento = (COALESCE(prossimo_adeguamento, imm_oggi()) + INTERVAL '1 year')::date
   WHERE id = l.id;
  PERFORM imm_scrivi(l.conduttore_id, 'Aggiornamento del canone', 'in base alla variazione ISTAT del ' || replace(p_variazione::text, '.', ',')
    || '% il canone di locazione passa da ' || imm_euro(l.canone) || ' a ' || imm_euro(v_nuovo) || ' al mese.');
  RETURN v_nuovo;
END;
$$;

-- ═══ 14. CONTRATTI DA MODELLO E APPROVAZIONE (§18) ══════════════════
INSERT INTO imm_modelli (nome, tipo, testo) VALUES
  ('Incarico di mediazione in esclusiva', 'incarico',
   E'INCARICO DI MEDIAZIONE\n\nIl/la sottoscritto/a {{proprietari}}, proprietario/a dell''immobile {{immobile}} sito in {{indirizzo}}, {{comune}}, conferisce a {{agenzia}} incarico {{esclusiva}} per la {{tipo_incarico}} al prezzo di {{prezzo}}, fino al {{scadenza}}.\nProvvigione: {{provvigione}} oltre IVA, dovuta alla conclusione dell''affare.\n\n{{condizioni}}\n\nData {{data}}\nFirma del proprietario ____________________     Per l''agenzia ____________________'),
  ('Proposta di acquisto', 'proposta_acquisto',
   E'PROPOSTA IRREVOCABILE DI ACQUISTO\n\nIl/la sottoscritto/a {{cliente}} propone di acquistare l''immobile {{immobile}} sito in {{indirizzo}}, {{comune}}, al prezzo di {{offerta}}, versando a titolo di caparra {{caparra}}.\nCondizioni: {{condizioni}}\nCondizioni sospensive: {{condizioni_sospensive}}\nLa proposta è irrevocabile fino al {{scadenza}}.\n\nData {{data}}\nFirma del proponente ____________________'),
  ('Proposta di locazione', 'proposta_locazione',
   E'PROPOSTA DI LOCAZIONE\n\nIl/la sottoscritto/a {{cliente}} propone di prendere in locazione l''immobile {{immobile}} sito in {{indirizzo}}, {{comune}}, al canone mensile di {{offerta}}.\nCondizioni: {{condizioni}}\nValida fino al {{scadenza}}.\n\nData {{data}}\nFirma ____________________'),
  ('Contratto di locazione', 'contratto_locazione',
   E'CONTRATTO DI LOCAZIONE ({{tipo_contratto}})\n\nTra {{proprietari}} (locatore) e {{cliente}} (conduttore) si conviene la locazione dell''immobile {{immobile}} sito in {{indirizzo}}, {{comune}}.\nCanone mensile: {{canone}}. Deposito cauzionale: {{deposito}}. Durata dal {{inizio}} al {{fine}}. Aggiornamento ISTAT: {{istat}}.\nGaranzie: {{garanzie}}\n\nData {{data}}\nIl locatore ____________________     Il conduttore ____________________'),
  ('Contratto preliminare', 'preliminare',
   E'CONTRATTO PRELIMINARE DI COMPRAVENDITA\n\n{{proprietari}} (promittente venditore) promette di vendere a {{cliente}} (promissario acquirente), che promette di acquistare, l''immobile {{immobile}} sito in {{indirizzo}}, {{comune}}, al prezzo di {{prezzo_chiusura}}, di cui {{caparra_versata}} versati oggi a titolo di caparra confirmatoria.\nIl rogito si terrà entro il {{rogito_previsto}}.\n\nData {{data}}\nFirme ____________________'),
  ('Informativa sul trattamento dei dati', 'informativa_privacy',
   E'INFORMATIVA AI SENSI DEGLI ARTT. 13–14 DEL REGOLAMENTO UE 2016/679\n\nGentile {{cliente}}, {{agenzia}} tratta i suoi dati per svolgere l''attività di mediazione richiesta, per gli obblighi di legge (anche antiriciclaggio, D.Lgs. 231/2007) e, solo con il suo consenso, per inviarle proposte commerciali.\n\nData {{data}}\nFirma per presa visione ____________________');

-- Compila il testo di un modello con i dati del caso: immobile, cliente, incarico, proposta, locazione, chiusura.
CREATE OR REPLACE FUNCTION imm_compila(p_modello UUID, p_immobile UUID, p_contatto UUID DEFAULT NULL, p_incarico UUID DEFAULT NULL, p_proposta UUID DEFAULT NULL,
                                       p_locazione UUID DEFAULT NULL, p_chiusura UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  m imm_modelli%ROWTYPE;
  i imm_immobili%ROWTYPE;
  inc imm_incarichi%ROWTYPE;
  p imm_proposte%ROWTYPE;
  l imm_locazioni%ROWTYPE;
  c imm_chiusure%ROWTYPE;
  v TEXT;
  d DATE;
  v_val JSONB;
  k TEXT;
BEGIN
  SELECT * INTO m FROM imm_modelli WHERE id = p_modello;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Modello inesistente'; END IF;
  SELECT * INTO i FROM imm_immobili WHERE id = p_immobile;
  SELECT * INTO inc FROM imm_incarichi WHERE id = COALESCE(p_incarico, (SELECT id FROM imm_incarichi WHERE immobile_id = p_immobile AND stato = 'attivo' ORDER BY conferito_il DESC LIMIT 1));
  SELECT * INTO p FROM imm_proposte WHERE id = p_proposta;
  SELECT * INTO l FROM imm_locazioni WHERE id = p_locazione;
  SELECT * INTO c FROM imm_chiusure WHERE id = p_chiusura;
  v_val := jsonb_build_object(
    'agenzia', (SELECT agenzia FROM imm_impostazioni WHERE id = 1),
    'data', to_char(imm_oggi(), 'DD/MM/YYYY'),
    'immobile', i.codice, 'indirizzo', i.indirizzo, 'comune', i.comune,
    'prezzo', imm_euro(COALESCE(inc.prezzo_richiesto, i.prezzo)),
    'proprietari', (SELECT string_agg(COALESCE(trim(k2.nome || ' ' || COALESCE(k2.cognome, '')), o.ragione_sociale)
                                      || CASE WHEN pr.quota_pct < 100 THEN ' (' || replace(to_char(pr.quota_pct, 'FM990.##'), '.', ',') || '%)' ELSE '' END, ', ')
                      FROM imm_proprietari pr LEFT JOIN contatti k2 ON k2.id = pr.contatto_id LEFT JOIN organizzazioni o ON o.id = pr.organizzazione_id
                     WHERE pr.immobile_id = i.id),
    'cliente', (SELECT trim(nome || ' ' || COALESCE(cognome, '')) FROM contatti WHERE id = COALESCE(p_contatto, p.contatto_id, l.conduttore_id, c.contatto_id)),
    'esclusiva', CASE WHEN inc.esclusiva THEN 'in esclusiva' ELSE 'non in esclusiva' END,
    'tipo_incarico', CASE inc.tipo WHEN 'locazione' THEN 'locazione' ELSE 'vendita' END,
    'scadenza', to_char(COALESCE(p.scadenza, inc.scadenza), 'DD/MM/YYYY'),
    'provvigione', CASE WHEN inc.provvigione_fissa IS NOT NULL THEN imm_euro(inc.provvigione_fissa)
                        ELSE replace(to_char(COALESCE(inc.provvigione_pct, 0), 'FM990.##'), '.', ',') || '% del prezzo' END,
    'condizioni', COALESCE(p.condizioni, inc.condizioni, ''),
    'condizioni_sospensive', COALESCE(p.condizioni_sospensive, 'nessuna'),
    'offerta', imm_euro(p.prezzo_offerto), 'caparra', imm_euro(COALESCE(p.caparra, 0)),
    'tipo_contratto', COALESCE(l.tipo_contratto, ''), 'canone', imm_euro(COALESCE(l.canone, i.canone)), 'deposito', imm_euro(COALESCE(l.deposito, 0)),
    'inizio', to_char(l.inizio, 'DD/MM/YYYY'), 'fine', to_char(l.fine, 'DD/MM/YYYY'), 'istat', CASE WHEN l.istat THEN 'sì' ELSE 'no' END,
    'garanzie', COALESCE(l.garanzie, 'nessuna'),
    'prezzo_chiusura', imm_euro(c.prezzo), 'caparra_versata', imm_euro(COALESCE(c.caparra_versata, 0)), 'rogito_previsto', to_char(c.rogito_previsto, 'DD/MM/YYYY'));
  v := m.testo;
  FOR k IN SELECT jsonb_object_keys(v_val) LOOP
    v := replace(v, '{{' || k || '}}', COALESCE(v_val->>k, '—'));
  END LOOP;
  RETURN v;
END;
$$;

-- Il contratto va in approvazione alla direzione; la decisione aggiorna il contratto.
CREATE OR REPLACE FUNCTION imm_contratto_approvazione()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_app UUID;
BEGIN
  IF TG_TABLE_NAME = 'imm_contratti' THEN
    IF NEW.stato = 'in_approvazione' AND (TG_OP = 'INSERT' OR OLD.stato <> 'in_approvazione') THEN
      INSERT INTO approvazioni (modulo, entita, entita_id, tipo_richiesta, descrizione, richiedente_id, azione_url)
      VALUES ('immobiliare', 'imm_contratti', NEW.id, 'contratto', NEW.titolo, COALESCE(auth.uid(), NEW.created_by), '/immobiliare/contratti')
      RETURNING id INTO v_app;
      NEW.approvazione_id := v_app;
    END IF;
    IF NEW.stato = 'firmato' AND NEW.firmato_il IS NULL THEN NEW.firmato_il := imm_oggi(); END IF;
    IF TG_OP = 'UPDATE' AND NEW.testo <> OLD.testo AND OLD.stato NOT IN ('bozza', 'in_approvazione') THEN
      RAISE EXCEPTION 'Un contratto approvato non si riscrive: se ne prepara uno nuovo' USING ERRCODE = 'check_violation';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.stato IN ('approvato', 'inviato_firma', 'firmato') AND OLD.stato IN ('bozza', 'in_approvazione')
       AND current_setting('imm.interno', true) IS DISTINCT FROM '1' THEN
      RAISE EXCEPTION 'Il contratto passa prima dall''approvazione della direzione' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  -- Su approvazioni: la decisione della direzione.
  IF NEW.entita = 'imm_contratti' AND NEW.stato <> OLD.stato THEN
    PERFORM set_config('imm.interno', '1', true);
    UPDATE imm_contratti SET stato = CASE NEW.stato WHEN 'approvata' THEN 'approvato' ELSE 'bozza' END WHERE id = NEW.entita_id AND stato = 'in_approvazione';
    PERFORM set_config('imm.interno', '0', true);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_contratti_approvazione BEFORE INSERT OR UPDATE ON imm_contratti FOR EACH ROW EXECUTE FUNCTION imm_contratto_approvazione();
CREATE TRIGGER approvazioni_imm_contratti AFTER UPDATE OF stato ON approvazioni FOR EACH ROW EXECUTE FUNCTION imm_contratto_approvazione();

-- ═══ 15. ANTIRICICLAGGIO E PRIVACY ══════════════════════════════════
CREATE OR REPLACE FUNCTION imm_aml_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_TABLE_NAME = 'imm_aml_verifiche' THEN
    NEW.operatore_id := COALESCE(NEW.operatore_id, auth.uid());
    -- Persona politicamente esposta o rischio alto: verifica rafforzata.
    IF NEW.pep OR NEW.rischio = 'alto' THEN NEW.adeguata_verifica := 'rafforzata'; END IF;
    IF NEW.adeguata_verifica = 'rafforzata' AND COALESCE(trim(NEW.origine_fondi), '') = '' THEN
      RAISE EXCEPTION 'Per la verifica rafforzata va indicata l''origine dei fondi' USING ERRCODE = 'check_violation';
    END IF;
    NEW.conservare_fino := COALESCE(NEW.conservare_fino, (NEW.identificato_il + INTERVAL '10 years')::date);
  ELSE
    IF NEW.consenso_marketing IS DISTINCT FROM (CASE WHEN TG_OP = 'UPDATE' THEN OLD.consenso_marketing END) THEN
      UPDATE contatti SET consenso_marketing = NEW.consenso_marketing, consenso_marketing_at = NOW(), consenso_marketing_fonte = 'agenzia immobiliare'
       WHERE id = NEW.contatto_id;
    END IF;
    IF NOT NEW.consenso_trattamento AND NEW.revocato_il IS NULL THEN NEW.revocato_il := imm_oggi(); END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_aml_prepara BEFORE INSERT OR UPDATE ON imm_aml_verifiche FOR EACH ROW EXECUTE FUNCTION imm_aml_prepara();
CREATE TRIGGER imm_privacy_prepara BEFORE INSERT OR UPDATE ON imm_privacy FOR EACH ROW EXECUTE FUNCTION imm_aml_prepara();

CREATE OR REPLACE FUNCTION imm_aml_scadenza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  DELETE FROM scadenze_moduli WHERE entita = 'imm_aml_verifiche' AND entita_id = NEW.id AND stato = 'aperta';
  IF NEW.documento_scadenza IS NOT NULL THEN
    INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, solo_manager, created_by)
    VALUES ('immobiliare', 'imm_aml_verifiche', NEW.id, 'Documento d''identità',
            COALESCE((SELECT trim(nome || ' ' || COALESCE(cognome, '')) FROM contatti WHERE id = NEW.contatto_id),
                     (SELECT ragione_sociale FROM organizzazioni WHERE id = NEW.organizzazione_id)) || ' · ' || NEW.documento_numero,
            NEW.documento_scadenza, '/immobiliare/compliance', true, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_aml_scadenza AFTER INSERT OR UPDATE OF documento_scadenza ON imm_aml_verifiche FOR EACH ROW EXECUTE FUNCTION imm_aml_scadenza();

-- ═══ 16. REPORT AL PROPRIETARIO (§23) ═══════════════════════════════
CREATE OR REPLACE FUNCTION imm_report(p_immobile UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  i imm_immobili%ROWTYPE;
  v_giorni INT;
  v_visite INT;
  v_ribassi INT;
  v_offerte INT;
  v_prob INT;
BEGIN
  IF NOT modulo_attivo('immobiliare') THEN RAISE EXCEPTION 'Modulo Agenzia immobiliare non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO i FROM imm_immobili WHERE id = p_immobile;
  IF i.id IS NULL THEN RAISE EXCEPTION 'Immobile inesistente'; END IF;
  v_giorni := CASE WHEN i.pubblicato_il IS NOT NULL THEN COALESCE(i.concluso_il, imm_oggi()) - i.pubblicato_il END;
  SELECT count(*) INTO v_visite FROM imm_visite WHERE immobile_id = i.id AND stato = 'svolta';
  SELECT count(*) INTO v_ribassi FROM (SELECT prezzo, lag(prezzo) OVER (ORDER BY dal) AS prima FROM imm_prezzi WHERE immobile_id = i.id) x WHERE x.prezzo < x.prima;
  SELECT count(*) INTO v_offerte FROM imm_proposte WHERE immobile_id = i.id AND padre_id IS NULL;
  SELECT max(s.probabilita) INTO v_prob FROM deals d JOIN pipeline_stages s ON s.id = d.stage_id
   WHERE d.pipeline_id = imm_pipeline('Trattative') AND d.immobile_id = i.id AND d.chiuso_at IS NULL AND d.attivo;
  RETURN jsonb_build_object(
    'codice', i.codice, 'indirizzo', i.indirizzo, 'comune', i.comune, 'stato', i.stato,
    'giorni_sul_mercato', v_giorni,
    'visite', v_visite,
    'visite_30_giorni', (SELECT count(*) FROM imm_visite WHERE immobile_id = i.id AND stato = 'svolta' AND inizio >= NOW() - INTERVAL '30 days'),
    'richieste', (SELECT count(*) FROM imm_lead WHERE immobile_id = i.id),
    'clienti_compatibili', (SELECT count(*) FROM imm_match_immobile(i.id) WHERE punteggio >= 60),
    'prezzo_iniziale', i.prezzo_iniziale, 'prezzo_attuale', i.prezzo,
    'riduzioni', v_ribassi,
    'riduzione_pct', CASE WHEN i.prezzo_iniziale > 0 AND i.prezzo IS NOT NULL THEN round(100 * (1 - i.prezzo / i.prezzo_iniziale), 1) ELSE 0 END,
    'offerte', v_offerte,
    'offerta_migliore', (SELECT max(prezzo_offerto) FROM imm_proposte WHERE immobile_id = i.id AND da = 'cliente'),
    'probabilita', COALESCE(v_prob, CASE WHEN v_visite = 0 THEN 10 ELSE 25 END),
    'gradimento_medio', (SELECT round(avg(gradimento), 1) FROM imm_visite WHERE immobile_id = i.id AND gradimento IS NOT NULL),
    'commenti', COALESCE((SELECT jsonb_agg(feedback ORDER BY inizio DESC) FROM (SELECT feedback, inizio FROM imm_visite
                           WHERE immobile_id = i.id AND feedback IS NOT NULL ORDER BY inizio DESC LIMIT 5) f), '[]'),
    'attivita_agente', (SELECT count(*) FROM attivita WHERE immobile_id = i.id AND created_at >= NOW() - INTERVAL '30 days')
                       + (SELECT count(*) FROM imm_visite WHERE immobile_id = i.id AND created_at >= NOW() - INTERVAL '30 days'));
END;
$$;

CREATE OR REPLACE FUNCTION imm_invia_report(p_immobile UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r JSONB;
  pr RECORD;
  n INT := 0;
  v_testo TEXT;
BEGIN
  IF NOT modulo_attivo('immobiliare') THEN RAISE EXCEPTION 'Modulo Agenzia immobiliare non attivo' USING ERRCODE = '42501'; END IF;
  r := imm_report(p_immobile);
  v_testo := 'ecco l''andamento dell''immobile ' || (r->>'codice') || ' in ' || (r->>'indirizzo') || E':\n\n'
    || '• giorni sul mercato: ' || COALESCE(r->>'giorni_sul_mercato', '—') || E'\n'
    || '• visite: ' || (r->>'visite') || ' (negli ultimi 30 giorni: ' || (r->>'visite_30_giorni') || E')\n'
    || '• richieste di informazioni: ' || (r->>'richieste') || E'\n'
    || '• clienti in archivio che cercano un immobile come il suo: ' || (r->>'clienti_compatibili') || E'\n'
    || '• prezzo: ' || COALESCE(imm_euro((r->>'prezzo_attuale')::numeric), '—')
    || CASE WHEN (r->>'riduzioni')::int > 0 THEN ' (iniziale ' || imm_euro((r->>'prezzo_iniziale')::numeric) || ')' ELSE '' END || E'\n'
    || '• proposte ricevute: ' || (r->>'offerte') || E'\n\nRestiamo a disposizione per commentarlo insieme.';
  FOR pr IN SELECT DISTINCT contatto_id FROM imm_proprietari WHERE immobile_id = p_immobile AND contatto_id IS NOT NULL
             ORDER BY contatto_id LOOP
    IF imm_scrivi(pr.contatto_id, 'Il suo immobile: report dell''agenzia', v_testo) THEN n := n + 1; END IF;
  END LOOP;
  INSERT INTO imm_report_inviati (immobile_id, destinatari, dati, created_by) VALUES (p_immobile, n, r, auth.uid());
  RETURN n;
END;
$$;

-- ═══ 17. GIRO NOTTURNO DELLE SCADENZE (§28) ═════════════════════════
CREATE OR REPLACE FUNCTION imm_giro_notturno()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  s imm_impostazioni%ROWTYPE;
  x RECORD;
  n_incarichi INT := 0; n_rinnovati INT := 0; n_proposte INT := 0; n_lead INT := 0; n_report INT := 0; n_locazioni INT := 0; n_istat INT := 0;
BEGIN
  SELECT * INTO s FROM imm_impostazioni WHERE id = 1;
  -- Incarichi scaduti: con il rinnovo tacito proseguono, altrimenti scadono (e l'agente lo sa).
  FOR x IN SELECT * FROM imm_incarichi WHERE stato = 'attivo' AND scadenza < imm_oggi() LOOP
    IF x.rinnovo_tacito THEN
      UPDATE imm_incarichi SET scadenza = (scadenza + make_interval(months => durata_mesi))::date WHERE id = x.id;
      n_rinnovati := n_rinnovati + 1;
    ELSE
      UPDATE imm_incarichi SET stato = 'scaduto' WHERE id = x.id;
      PERFORM imm_notifica_agente(x.agente_id, 'Incarico scaduto: ' || x.codice, 'L''incarico è scaduto senza rinnovo: l''immobile esce dal mercato.',
                                  '/immobiliare/immobili/' || x.immobile_id, 'warning');
      n_incarichi := n_incarichi + 1;
    END IF;
  END LOOP;
  -- Proposte oltre la scadenza.
  UPDATE imm_proposte SET stato = 'scaduta' WHERE stato = 'in_attesa' AND scadenza < imm_oggi();
  GET DIAGNOSTICS n_proposte = ROW_COUNT;
  -- Richieste senza risposta: lead nuovi oltre il tempo di risposta.
  FOR x IN SELECT * FROM imm_lead WHERE stato = 'nuovo' AND sollecito_at IS NULL
                                    AND ricevuto_at < NOW() - make_interval(hours => COALESCE(s.lead_risposta_ore, 24)) LOOP
    PERFORM imm_notifica_agente(x.agente_id, 'Lead senza risposta: ' || x.nome, 'Ricevuto ' || to_char(x.ricevuto_at AT TIME ZONE 'Europe/Rome', 'DD/MM HH24:MI')
                                || ' e ancora da contattare.', '/immobiliare/lead', 'warning');
    UPDATE imm_lead SET sollecito_at = NOW() WHERE id = x.id;
    n_lead := n_lead + 1;
  END LOOP;
  IF n_lead > 0 THEN PERFORM imm_notifica_direzione('Lead senza risposta', n_lead || ' richieste attendono un contatto.', '/immobiliare/lead', 'warning'); END IF;
  -- Locazioni arrivate alla fine: con il rinnovo tacito proseguono di un periodo uguale.
  FOR x IN SELECT * FROM imm_locazioni WHERE stato = 'attiva' AND fine < imm_oggi() LOOP
    IF x.rinnovo_tacito THEN
      UPDATE imm_locazioni SET fine = (fine + make_interval(months => CASE tipo_contratto WHEN '4+4' THEN 48 WHEN '3+2' THEN 24 WHEN 'commerciale_6+6' THEN 72
                                                                                       ELSE durata_mesi END))::date WHERE id = x.id;
    ELSE
      UPDATE imm_locazioni SET stato = 'cessata' WHERE id = x.id;
    END IF;
    n_locazioni := n_locazioni + 1;
  END LOOP;
  -- Adeguamenti ISTAT da fare oggi.
  SELECT count(*) INTO n_istat FROM imm_locazioni WHERE stato = 'attiva' AND istat AND prossimo_adeguamento = imm_oggi();
  IF n_istat > 0 THEN
    PERFORM imm_notifica_direzione('Adeguamenti ISTAT', n_istat || ' canoni vanno aggiornati con la variazione ISTAT di oggi.', '/immobiliare/locazioni');
  END IF;
  -- Report periodico ai proprietari degli immobili sul mercato.
  FOR x IN SELECT i.id FROM imm_immobili i
            WHERE i.stato IN ('disponibile', 'sotto_offerta') AND i.pubblicato_il <= imm_oggi() - s.report_giorni
              AND NOT EXISTS (SELECT 1 FROM imm_report_inviati r WHERE r.immobile_id = i.id AND r.inviato_il > imm_oggi() - s.report_giorni) LOOP
    PERFORM imm_invia_report(x.id);
    n_report := n_report + 1;
  END LOOP;
  RETURN jsonb_build_object('incarichi_scaduti', n_incarichi, 'incarichi_rinnovati', n_rinnovati, 'proposte_scadute', n_proposte, 'lead_solleciti', n_lead,
                            'locazioni', n_locazioni, 'istat', n_istat, 'report', n_report);
END;
$$;

-- ═══ 18. AGENTI (§20) ═══════════════════════════════════════════════
-- Le provvigioni nel riepilogo seguono la RLS: la direzione le vede tutte, l'agente le sue.
CREATE VIEW imm_agenti_riepilogo WITH (security_invoker = true) AS
SELECT a.id AS agente_id, a.modulo, a.user_id, trim(u.nome || ' ' || COALESCE(u.cognome, '')) AS nome, a.attivo, a.zone,
       a.obiettivo_acquisizioni, a.obiettivo_chiusure, a.obiettivo_provvigioni,
       (SELECT count(*) FROM imm_immobili i WHERE i.agente_id = a.id AND i.stato IN ('disponibile', 'sotto_offerta'))::int AS portafoglio,
       (SELECT COALESCE(sum(i.prezzo), 0) FROM imm_immobili i WHERE i.agente_id = a.id AND i.stato IN ('disponibile', 'sotto_offerta'))::numeric(14,2) AS valore_portafoglio,
       (SELECT count(*) FROM imm_richieste r WHERE r.agente_id = a.id AND r.stato = 'attiva')::int AS clienti,
       (SELECT count(*) FROM imm_lead l WHERE l.agente_id = a.id AND l.stato NOT IN ('convertito', 'perso'))::int AS lead_aperti,
       (SELECT count(*) FROM imm_visite v WHERE v.agente_id = a.id AND v.stato = 'svolta' AND v.inizio >= date_trunc('month', NOW()))::int AS visite_mese,
       (SELECT count(*) FROM deals d WHERE d.responsabile_id = a.user_id AND d.pipeline_id = imm_pipeline('Trattative') AND d.chiuso_at IS NULL AND d.attivo)::int AS trattative,
       (SELECT count(*) FROM imm_incarichi n WHERE n.agente_id = a.id AND n.conferito_il >= date_trunc('month', NOW())::date)::int AS acquisizioni_mese,
       (SELECT count(*) FROM imm_chiusure c JOIN imm_immobili i ON i.id = c.immobile_id WHERE i.agente_id = a.id AND c.stato = 'rogitato'
           AND c.rogito_il >= date_trunc('month', NOW())::date)::int AS vendite_mese,
       (SELECT count(*) FROM imm_locazioni l JOIN imm_immobili i ON i.id = l.immobile_id WHERE i.agente_id = a.id
           AND l.created_at >= date_trunc('month', NOW()))::int AS locazioni_mese,
       (SELECT COALESCE(sum(r.importo), 0) FROM imm_ripartizioni r JOIN imm_provvigioni p ON p.id = r.provvigione_id
         WHERE r.agente_id = a.id AND p.stato <> 'annullata' AND p.created_at >= date_trunc('month', NOW()))::numeric(12,2) AS provvigioni_mese
  FROM imm_agenti a JOIN user_profiles u ON u.id = a.user_id;

-- ═══ 19. INDICATORI (§25) ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION imm_kpi(p_dal DATE, p_al DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_da TIMESTAMPTZ := (p_dal::timestamp) AT TIME ZONE 'Europe/Rome';
  v_a TIMESTAMPTZ := ((p_al + 1)::timestamp) AT TIME ZONE 'Europe/Rome';
  v_dir BOOLEAN := puo_amministrazione();
  v_acq UUID := imm_pipeline('Acquisizione');
  v_proprietari INT;
  v_incarichi INT;
  v_visite INT;
  v_proposte INT;
  v_provv NUMERIC;
  v_quote NUMERIC;
  v_mkt NUMERIC;
BEGIN
  IF NOT modulo_attivo('immobiliare') THEN RAISE EXCEPTION 'Modulo Agenzia immobiliare non attivo' USING ERRCODE = '42501'; END IF;
  SELECT count(*) INTO v_proprietari FROM deals WHERE pipeline_id = v_acq AND created_at >= v_da AND created_at < v_a;
  SELECT count(*) INTO v_incarichi FROM imm_incarichi WHERE conferito_il BETWEEN p_dal AND p_al;
  SELECT count(*) INTO v_visite FROM imm_visite WHERE stato = 'svolta' AND inizio >= v_da AND inizio < v_a;
  SELECT count(*) INTO v_proposte FROM imm_proposte WHERE padre_id IS NULL AND created_at >= v_da AND created_at < v_a;
  SELECT COALESCE(sum(importo), 0) INTO v_provv FROM imm_provvigioni WHERE stato <> 'annullata' AND created_at >= v_da AND created_at < v_a;
  SELECT COALESCE(sum(r.importo), 0) INTO v_quote FROM imm_ripartizioni r JOIN imm_provvigioni p ON p.id = r.provvigione_id
   WHERE r.beneficiario <> 'agenzia' AND p.stato <> 'annullata' AND p.created_at >= v_da AND p.created_at < v_a;
  SELECT COALESCE(sum(costo), 0) INTO v_mkt FROM imm_marketing WHERE dal <= p_al AND COALESCE(al, dal) >= p_dal;
  RETURN jsonb_build_object(
    'acquisizione', jsonb_build_object(
      'proprietari_contattati', v_proprietari,
      'appuntamenti', (SELECT count(DISTINCT h.deal_id) FROM deal_stage_history h JOIN pipeline_stages s ON s.id = h.stage_nuovo
                        WHERE s.pipeline_id = v_acq AND s.nome = 'Appuntamento' AND h.created_at >= v_da AND h.created_at < v_a),
      'valutazioni', (SELECT count(*) FROM imm_valutazioni WHERE data BETWEEN p_dal AND p_al),
      'incarichi', v_incarichi,
      'esclusive', (SELECT count(*) FROM imm_incarichi WHERE esclusiva AND conferito_il BETWEEN p_dal AND p_al),
      'conversione_pct', CASE WHEN v_proprietari > 0 THEN round(100.0 * v_incarichi / v_proprietari, 1) END,
      'valore_portafoglio', (SELECT COALESCE(sum(prezzo), 0) FROM imm_immobili WHERE stato IN ('disponibile', 'sotto_offerta'))),
    'vendita', jsonb_build_object(
      'disponibili', (SELECT count(*) FROM imm_immobili WHERE stato = 'disponibile'),
      'sotto_offerta', (SELECT count(*) FROM imm_immobili WHERE stato = 'sotto_offerta'),
      'venduti', (SELECT count(*) FROM imm_chiusure WHERE stato = 'rogitato' AND rogito_il BETWEEN p_dal AND p_al),
      'locati', (SELECT count(*) FROM imm_locazioni WHERE inizio BETWEEN p_dal AND p_al),
      'giorni_medi_vendita', (SELECT round(avg(c.rogito_il - i.pubblicato_il)) FROM imm_chiusure c JOIN imm_immobili i ON i.id = c.immobile_id
                               WHERE c.stato = 'rogitato' AND c.rogito_il BETWEEN p_dal AND p_al AND i.pubblicato_il IS NOT NULL),
      'prezzo_medio', (SELECT round(avg(prezzo)) FROM imm_chiusure WHERE stato = 'rogitato' AND rogito_il BETWEEN p_dal AND p_al),
      'sconto_medio_pct', (SELECT round(avg(100 * (1 - c.prezzo / i.prezzo_iniziale)), 1) FROM imm_chiusure c JOIN imm_immobili i ON i.id = c.immobile_id
                            WHERE c.stato = 'rogitato' AND c.rogito_il BETWEEN p_dal AND p_al AND i.prezzo_iniziale > 0),
      'visite', v_visite, 'proposte', v_proposte,
      'conversione_visite_offerte_pct', CASE WHEN v_visite > 0 THEN round(100.0 * v_proposte / v_visite, 1) END),
    'clienti', jsonb_build_object(
      'lead', (SELECT count(*) FROM imm_lead WHERE ricevuto_at >= v_da AND ricevuto_at < v_a),
      'lead_qualificati', (SELECT count(*) FROM imm_lead WHERE ricevuto_at >= v_da AND ricevuto_at < v_a AND stato IN ('qualificato', 'appuntamento', 'convertito')),
      'per_origine', COALESCE((SELECT jsonb_object_agg(origine, n) FROM (SELECT origine, count(*) AS n FROM imm_lead WHERE ricevuto_at >= v_da AND ricevuto_at < v_a
                                GROUP BY origine) o), '{}'),
      'clienti_attivi', (SELECT count(DISTINCT contatto_id) FROM imm_richieste WHERE stato = 'attiva'),
      'clienti_convertiti', (SELECT count(DISTINCT contatto_id) FROM imm_chiusure WHERE stato = 'rogitato' AND rogito_il BETWEEN p_dal AND p_al)
                          + (SELECT count(DISTINCT conduttore_id) FROM imm_locazioni WHERE inizio BETWEEN p_dal AND p_al)),
    'economici', CASE WHEN v_dir THEN jsonb_build_object(
      'fatturato', (SELECT COALESCE(sum(f.imponibile), 0) FROM fatture f JOIN imm_provvigioni p ON p.fattura_id = f.id WHERE f.data BETWEEN p_dal AND p_al),
      'provvigioni', v_provv,
      'provvigione_media', (SELECT round(avg(importo), 2) FROM imm_provvigioni WHERE stato <> 'annullata' AND created_at >= v_da AND created_at < v_a),
      'incassate', (SELECT COALESCE(sum(importo), 0) FROM imm_provvigioni WHERE stato = 'incassata' AND incassata_il BETWEEN p_dal AND p_al),
      'quote_agenti_collaboratori', v_quote,
      'costi_marketing', v_mkt,
      'margine', v_provv - v_quote - v_mkt,
      'per_agente', COALESCE((SELECT jsonb_agg(jsonb_build_object('agente', x.nome, 'provvigioni', x.tot) ORDER BY x.tot DESC)
                              FROM (SELECT trim(u.nome || ' ' || COALESCE(u.cognome, '')) AS nome, sum(p.importo) AS tot
                                      FROM imm_provvigioni p JOIN imm_agenti a ON a.id = p.agente_id JOIN user_profiles u ON u.id = a.user_id
                                     WHERE p.stato <> 'annullata' AND p.created_at >= v_da AND p.created_at < v_a GROUP BY 1) x), '[]'),
      -- ROI di ogni campagna: provvigioni degli affari nati dai suoi lead, meno il costo, sul costo.
      'campagne', COALESCE((SELECT jsonb_agg(jsonb_build_object('nome', m.nome, 'canale', m.canale, 'costo', m.costo, 'lead', m.lead, 'provvigioni', m.provv,
                                                                'roi_pct', CASE WHEN m.costo > 0 THEN round(100 * (m.provv - m.costo) / m.costo, 1) END) ORDER BY m.costo DESC)
                            FROM (SELECT mk.nome, mk.canale, mk.costo,
                                         (SELECT count(*) FROM imm_lead l WHERE l.marketing_id = mk.id) AS lead,
                                         (SELECT COALESCE(sum(p.importo), 0) FROM imm_provvigioni p
                                           WHERE p.stato <> 'annullata' AND (p.contatto_id IN (SELECT contatto_id FROM imm_lead l WHERE l.marketing_id = mk.id AND l.contatto_id IS NOT NULL)
                                                  OR (mk.immobile_id IS NOT NULL AND p.immobile_id = mk.immobile_id))) AS provv
                                    FROM imm_marketing mk WHERE mk.dal <= p_al AND COALESCE(mk.al, mk.dal) >= p_dal) m), '[]')) END
  );
END;
$$;

-- ═══ 20. CRUSCOTTO DELLA DIREZIONE (§26) ════════════════════════════
CREATE OR REPLACE FUNCTION imm_cruscotto()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_oggi DATE := imm_oggi();
  v_mese DATE := date_trunc('month', imm_oggi())::date;
  v_da TIMESTAMPTZ := (imm_oggi()::timestamp) AT TIME ZONE 'Europe/Rome';
  s imm_impostazioni%ROWTYPE;
BEGIN
  IF NOT modulo_attivo('immobiliare') THEN RAISE EXCEPTION 'Modulo Agenzia immobiliare non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM imm_impostazioni WHERE id = 1;
  RETURN jsonb_build_object(
    'portafoglio', (SELECT count(*) FROM imm_immobili WHERE stato IN ('disponibile', 'sotto_offerta')),
    'in_acquisizione', (SELECT count(*) FROM imm_immobili WHERE stato IN ('in_acquisizione', 'in_valutazione')),
    'nuovi_incarichi', (SELECT count(*) FROM imm_incarichi WHERE conferito_il >= v_mese),
    'incarichi_in_scadenza', (SELECT count(*) FROM imm_incarichi WHERE stato = 'attivo' AND scadenza BETWEEN v_oggi AND v_oggi + 30),
    'lead_nuovi', (SELECT count(*) FROM imm_lead WHERE stato = 'nuovo'),
    'lead_senza_risposta', (SELECT count(*) FROM imm_lead WHERE stato = 'nuovo' AND ricevuto_at < NOW() - make_interval(hours => COALESCE(s.lead_risposta_ore, 24))),
    'visite_oggi', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', v.id, 'inizio', v.inizio, 'immobile', i.codice, 'indirizzo', i.indirizzo,
                                                                 'cliente', trim(k.nome || ' ' || COALESCE(k.cognome, '')), 'stato', v.stato) ORDER BY v.inizio)
                               FROM imm_visite v JOIN imm_immobili i ON i.id = v.immobile_id JOIN contatti k ON k.id = v.contatto_id
                              WHERE v.inizio >= v_da AND v.inizio < v_da + INTERVAL '1 day' AND v.stato <> 'annullata'), '[]'),
    'trattative_aperte', (SELECT count(*) FROM deals WHERE pipeline_id = imm_pipeline('Trattative') AND chiuso_at IS NULL AND attivo),
    'offerte_in_attesa', (SELECT count(*) FROM imm_proposte WHERE stato = 'in_attesa'),
    'vendite_mese', (SELECT count(*) FROM imm_chiusure WHERE stato = 'rogitato' AND rogito_il >= v_mese),
    'locazioni_mese', (SELECT count(*) FROM imm_locazioni WHERE inizio >= v_mese),
    'rogiti_in_arrivo', (SELECT count(*) FROM imm_chiusure WHERE stato = 'preliminare' AND rogito_previsto BETWEEN v_oggi AND v_oggi + 30),
    'documenti_mancanti', (SELECT count(*) FROM imm_documenti d JOIN imm_immobili i ON i.id = d.immobile_id
                            WHERE d.obbligatorio AND d.stato IN ('mancante', 'richiesto') AND i.stato IN ('disponibile', 'sotto_offerta', 'in_valutazione')),
    'pipeline', COALESCE((SELECT jsonb_agg(jsonb_build_object('pipeline', replace(p.nome, 'Immobiliare · ', ''), 'fase', st.nome, 'ordine', st.ordine, 'trattative', x.n,
                                                              'valore', x.v) ORDER BY p.nome, st.ordine)
                            FROM pipeline_stages st JOIN pipelines p ON p.id = st.pipeline_id
                            LEFT JOIN LATERAL (SELECT count(*) AS n, COALESCE(sum(d.importo), 0) AS v FROM deals d WHERE d.stage_id = st.id AND d.chiuso_at IS NULL AND d.attivo) x ON true
                           WHERE p.nome LIKE 'Immobiliare · %' AND NOT st.is_lost AND NOT st.is_won), '[]'),
    -- Provvigioni attese: valore delle trattative pesato per la probabilità della fase, per le percentuali dei due lati.
    'fatturato_previsto', CASE WHEN puo_amministrazione() THEN
        (SELECT round(COALESCE(sum(d.importo * st.probabilita / 100.0), 0) * (COALESCE(s.provvigione_venditore_pct, 3) + COALESCE(s.provvigione_acquirente_pct, 3)) / 100, 2)
           FROM deals d JOIN pipeline_stages st ON st.id = d.stage_id WHERE d.pipeline_id = imm_pipeline('Trattative') AND d.chiuso_at IS NULL AND d.attivo) END,
    'provvigioni_mese', CASE WHEN puo_amministrazione() THEN (SELECT COALESCE(sum(importo), 0) FROM imm_provvigioni WHERE stato <> 'annullata' AND created_at >= v_mese) END,
    'agenti', COALESCE((SELECT jsonb_agg(jsonb_build_object('nome', r.nome, 'portafoglio', r.portafoglio, 'visite', r.visite_mese, 'acquisizioni', r.acquisizioni_mese,
                                                            'vendite', r.vendite_mese + r.locazioni_mese, 'provvigioni', CASE WHEN puo_amministrazione() THEN r.provvigioni_mese END)
                                         ORDER BY r.vendite_mese + r.locazioni_mese DESC, r.acquisizioni_mese DESC)
                          FROM imm_agenti_riepilogo r WHERE r.attivo), '[]')
  );
END;
$$;

-- ═══ 21. AGENDA (§21) ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION imm_agenda(p_dal DATE, p_al DATE, p_agente UUID DEFAULT NULL)
RETURNS TABLE (quando TIMESTAMPTZ, tipo TEXT, titolo TEXT, dettaglio TEXT, percorso TEXT, riferimento UUID)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  WITH r AS (SELECT (p_dal::timestamp) AT TIME ZONE 'Europe/Rome' AS da, ((p_al + 1)::timestamp) AT TIME ZONE 'Europe/Rome' AS a)
  SELECT v.inizio, 'visita', 'Visita · ' || i.codice, trim(k.nome || ' ' || COALESCE(k.cognome, '')) || ' · ' || i.indirizzo, '/immobiliare/visite', v.id
    FROM imm_visite v JOIN imm_immobili i ON i.id = v.immobile_id JOIN contatti k ON k.id = v.contatto_id, r
   WHERE v.inizio >= r.da AND v.inizio < r.a AND v.stato IN ('proposta', 'confermata', 'svolta') AND (p_agente IS NULL OR v.agente_id = p_agente)
  UNION ALL
  SELECT COALESCE(t.inizio, t.scadenza), CASE t.tipo WHEN 'chiamata' THEN 'telefonata' WHEN 'riunione' THEN 'appuntamento' ELSE 'attivita' END, t.titolo,
         COALESCE(i.codice || ' · ' || i.indirizzo, ''), '/immobiliare/immobili/' || i.id, t.id
    FROM attivita t JOIN imm_immobili i ON i.id = t.immobile_id, r
   WHERE COALESCE(t.inizio, t.scadenza) >= r.da AND COALESCE(t.inizio, t.scadenza) < r.a AND t.stato <> 'completata' AND t.attivo
     AND (p_agente IS NULL OR t.assegnato_a = (SELECT user_id FROM imm_agenti WHERE id = p_agente))
  UNION ALL
  SELECT (c.rogito_previsto + TIME '10:00') AT TIME ZONE 'Europe/Rome', 'rogito', 'Rogito · ' || i.codice, i.indirizzo || COALESCE(' · notaio ' || n.nome, ''),
         '/immobiliare/trattative', c.id
    FROM imm_chiusure c JOIN imm_immobili i ON i.id = c.immobile_id LEFT JOIN imm_collaboratori n ON n.id = c.notaio_id
   WHERE c.stato = 'preliminare' AND c.rogito_previsto BETWEEN p_dal AND p_al AND (p_agente IS NULL OR i.agente_id = p_agente)
  UNION ALL
  SELECT (n.scadenza + TIME '09:00') AT TIME ZONE 'Europe/Rome', 'scadenza', 'Scade l''incarico · ' || i.codice, i.indirizzo, '/immobiliare/immobili/' || i.id, n.id
    FROM imm_incarichi n JOIN imm_immobili i ON i.id = n.immobile_id
   WHERE n.stato = 'attivo' AND n.scadenza BETWEEN p_dal AND p_al AND (p_agente IS NULL OR n.agente_id = p_agente)
  UNION ALL
  SELECT (pr.scadenza + TIME '18:00') AT TIME ZONE 'Europe/Rome', 'scadenza', 'Scade la proposta · ' || pr.codice, i.codice || ' · ' || imm_euro(pr.prezzo_offerto),
         '/immobiliare/trattative', pr.id
    FROM imm_proposte pr JOIN imm_immobili i ON i.id = pr.immobile_id
   WHERE pr.stato = 'in_attesa' AND pr.scadenza BETWEEN p_dal AND p_al AND (p_agente IS NULL OR pr.agente_id = p_agente)
  UNION ALL
  SELECT (l.prossimo_adeguamento + TIME '09:00') AT TIME ZONE 'Europe/Rome', 'scadenza', 'Adeguamento ISTAT · ' || l.codice, i.indirizzo, '/immobiliare/locazioni', l.id
    FROM imm_locazioni l JOIN imm_immobili i ON i.id = l.immobile_id
   WHERE l.stato = 'attiva' AND l.istat AND l.prossimo_adeguamento BETWEEN p_dal AND p_al AND (p_agente IS NULL OR i.agente_id = p_agente)
  ORDER BY 1
$$;

-- ═══ 22. SEGMENTI DELLE CAMPAGNE (§22) ══════════════════════════════
CREATE OR REPLACE FUNCTION seg_imm_cercano(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT contatto_id FROM imm_richieste
   WHERE stato = 'attiva' AND (COALESCE(p_parametri->>'tipo', '') = '' OR tipo = p_parametri->>'tipo')
     AND (COALESCE(p_parametri->>'comune', '') = '' OR lower(p_parametri->>'comune') = ANY (SELECT lower(x) FROM unnest(comuni) x))
$$;
CREATE OR REPLACE FUNCTION seg_imm_proprietari(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT p.contatto_id FROM imm_proprietari p JOIN imm_immobili i ON i.id = p.immobile_id
   WHERE p.contatto_id IS NOT NULL AND (COALESCE(p_parametri->>'stato', '') = '' OR i.stato = p_parametri->>'stato')
$$;
CREATE OR REPLACE FUNCTION seg_imm_clienti_conclusi(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT contatto_id FROM imm_chiusure WHERE stato = 'rogitato' AND rogito_il >= imm_oggi() - (COALESCE((p_parametri->>'mesi')::int, 24) || ' months')::interval
  UNION
  SELECT conduttore_id FROM imm_locazioni WHERE inizio >= imm_oggi() - (COALESCE((p_parametri->>'mesi')::int, 24) || ' months')::interval
$$;
CREATE OR REPLACE FUNCTION seg_imm_senza_visite(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT r.contatto_id FROM imm_richieste r
   WHERE r.stato = 'attiva' AND r.created_at < NOW() - (COALESCE((p_parametri->>'giorni')::int, 60) || ' days')::interval
     AND NOT EXISTS (SELECT 1 FROM imm_visite v WHERE v.contatto_id = r.contatto_id
                       AND v.inizio >= NOW() - (COALESCE((p_parametri->>'giorni')::int, 60) || ' days')::interval)
$$;
INSERT INTO campagne_segmenti (slug, modulo, etichetta, descrizione, funzione, parametri) VALUES
  ('immobiliare_cercano', 'immobiliare', 'Chi sta cercando casa', 'Acquirenti e conduttori con una richiesta attiva, anche per comune.',
     'seg_imm_cercano', '{"tipo": {"etichetta": "Acquisto o affitto (vuoto = entrambi)", "default": ""}, "comune": {"etichetta": "Comune (vuoto = tutti)", "default": ""}}'),
  ('immobiliare_proprietari', 'immobiliare', 'Proprietari', 'Proprietari degli immobili in archivio: per le campagne di acquisizione.',
     'seg_imm_proprietari', '{"stato": {"etichetta": "Stato dell''immobile (vuoto = tutti)", "default": ""}}'),
  ('immobiliare_conclusi', 'immobiliare', 'Clienti che hanno comprato o affittato', 'Post-vendita: recensioni, segnalazioni, nuovi servizi.',
     'seg_imm_clienti_conclusi', '{"mesi": {"etichetta": "Negli ultimi (mesi)", "default": 24}}'),
  ('immobiliare_senza_visite', 'immobiliare', 'Clienti fermi', 'Richiesta attiva ma nessuna visita da N giorni.',
     'seg_imm_senza_visite', '{"giorni": {"etichetta": "Senza visite da (giorni)", "default": 60}}')
ON CONFLICT (slug) DO NOTHING;

-- ═══ 23. RICERCA ════════════════════════════════════════════════════
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
    UNION ALL
    SELECT 'prodotto_fb', pr.id,
           pr.codice || ' · ' || pr.nome,
           COALESCE(pr.descrizione, '')
    FROM fb_prodotti pr
    WHERE pr.stato <> 'sospeso' AND pr.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'prenotazione_fb', pn.id,
           pn.nome || ' · ' || pn.persone || ' persone',
           to_char(pn.inizio AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI')
    FROM fb_prenotazioni pn
    WHERE pn.stato NOT IN ('annullata') AND pn.inizio >= NOW() - INTERVAL '30 days'
      AND pn.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'evento', ev.id,
           ev.codice || ' · ' || ev.titolo,
           ev.modulo || ' · ' || to_char(ev.inizio AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY')
    FROM eventi ev
    WHERE ev.stato <> 'annullato' AND ev.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'prenotazione_hotel', hp.id,
           hp.codice || ' · ' || hp.ospite_nome,
           to_char(hp.arrivo, 'DD/MM/YYYY') || ' → ' || to_char(hp.partenza, 'DD/MM/YYYY')
    FROM hotel_prenotazioni hp
    WHERE hp.stato NOT IN ('annullata') AND hp.partenza >= (NOW() AT TIME ZONE 'Europe/Rome')::date - 180
      AND hp.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'socio_palestra', so.id,
           so.codice || ' · ' || trim(k.nome || ' ' || COALESCE(k.cognome, '')),
           COALESCE(k.email, k.telefono, '')
    FROM pal_soci so JOIN contatti k ON k.id = so.contatto_id
    WHERE so.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'ordine_fiorista', fo.id,
           fo.codice || ' · ' || fo.committente_nome,
           COALESCE('per ' || fo.destinatario_nome || ' · ', '') || to_char(fo.data_richiesta, 'DD/MM/YYYY')
    FROM fior_ordini fo
    WHERE fo.stato <> 'annullato' AND fo.data_richiesta >= (NOW() AT TIME ZONE 'Europe/Rome')::date - 365
      AND fo.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'veicolo_garage', gv.cliente_id,
           gv.targa || COALESCE(' · ' || NULLIF(trim(COALESCE(gv.marca, '') || ' ' || COALESCE(gv.modello, '')), ''), ''),
           COALESCE((SELECT gk.nome FROM gar_clienti gk WHERE gk.id = gv.cliente_id), '')
    FROM gar_veicoli gv
    WHERE gv.cliente_id IS NOT NULL AND gv.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'cliente_garage', gc.id,
           gc.codice || ' · ' || gc.nome,
           COALESCE(gc.telefono, gc.email, '')
    FROM gar_clienti gc
    WHERE gc.attivo AND gc.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'immobile', im.id,
           im.codice || ' · ' || COALESCE(im.titolo, initcap(replace(im.tipologia, '_', ' '))),
           im.indirizzo || ', ' || im.comune
    FROM imm_immobili im
    WHERE im.ricerca @@ websearch_to_tsquery('simple', q)
  ) t
  LIMIT 20
$$;

-- ═══ 24. TRIGGER COMUNI, RLS, PERMESSI, TEMPO REALE ═════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['imm_visite','imm_proposte','imm_chiusure','imm_locazioni','imm_provvigioni','imm_modelli','imm_contratti','imm_aml_verifiche','imm_privacy'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;
  CREATE TRIGGER imm_ripartizioni_audit AFTER INSERT OR UPDATE OR DELETE ON imm_ripartizioni FOR EACH ROW EXECUTE FUNCTION log_audit();

  FOREACH t IN ARRAY ARRAY['imm_visite','imm_proposte','imm_chiusure','imm_locazioni','imm_canoni','imm_provvigioni','imm_ripartizioni','imm_modelli','imm_contratti',
                           'imm_aml_verifiche','imm_privacy','imm_report_inviati'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['imm_visite','imm_proposte','imm_chiusure','imm_locazioni','imm_canoni','imm_modelli','imm_contratti','imm_privacy','imm_report_inviati'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
  END LOOP;
  -- Il lavoro commerciale: tutto il personale.
  FOREACH t IN ARRAY ARRAY['imm_visite','imm_proposte','imm_chiusure','imm_locazioni','imm_contratti','imm_privacy'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;
  -- I modelli dei contratti: la direzione.
  CREATE POLICY "imm_modelli_insert" ON imm_modelli FOR INSERT TO authenticated
    WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid());
  CREATE POLICY "imm_modelli_update" ON imm_modelli FOR UPDATE TO authenticated
    USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione());
  -- Provvigioni: la direzione tutte, l'agente le sue. Le scrivono le funzioni (rogito, locazione, fattura, ripartizione); la direzione segna l'incasso.
  CREATE POLICY "imm_provvigioni_select" ON imm_provvigioni FOR SELECT TO authenticated
    USING (modulo_attivo(modulo) AND (puo_amministrazione() OR agente_id = imm_agente_corrente()
           OR EXISTS (SELECT 1 FROM imm_ripartizioni r WHERE r.provvigione_id = imm_provvigioni.id AND r.agente_id = imm_agente_corrente())));
  CREATE POLICY "imm_provvigioni_update" ON imm_provvigioni FOR UPDATE TO authenticated
    USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione());
  CREATE POLICY "imm_ripartizioni_select" ON imm_ripartizioni FOR SELECT TO authenticated
    USING (modulo_attivo(modulo) AND (puo_amministrazione() OR agente_id = imm_agente_corrente()));
  CREATE POLICY "imm_ripartizioni_update" ON imm_ripartizioni FOR UPDATE TO authenticated
    USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione());
  -- Antiriciclaggio: dati riservati, la direzione e chi ha fatto l'identificazione.
  CREATE POLICY "imm_aml_select" ON imm_aml_verifiche FOR SELECT TO authenticated
    USING (modulo_attivo(modulo) AND (puo_amministrazione() OR operatore_id = auth.uid()));
  CREATE POLICY "imm_aml_insert" ON imm_aml_verifiche FOR INSERT TO authenticated WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid());
  CREATE POLICY "imm_aml_update" ON imm_aml_verifiche FOR UPDATE TO authenticated
    USING (modulo_attivo(modulo) AND (puo_amministrazione() OR operatore_id = auth.uid())) WITH CHECK (modulo_attivo(modulo));
END $$;

-- Sulla provvigione la direzione cambia solo stato, incasso e note: gli importi li fissano le funzioni.
CREATE OR REPLACE FUNCTION imm_provvigione_protetta()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND current_setting('imm.interno', true) IS DISTINCT FROM '1'
     AND (NEW.importo, NEW.base, NEW.pct, NEW.fisso, NEW.lato, NEW.immobile_id, NEW.fattura_id)
         IS DISTINCT FROM (OLD.importo, OLD.base, OLD.pct, OLD.fisso, OLD.lato, OLD.immobile_id, OLD.fattura_id) THEN
    RAISE EXCEPTION 'Gli importi della provvigione non si cambiano a mano: si annulla e si ricalcola' USING ERRCODE = '42501';
  END IF;
  IF NEW.stato = 'incassata' AND OLD.stato <> 'incassata' THEN NEW.incassata_il := COALESCE(NEW.incassata_il, imm_oggi()); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_provvigioni_protetta BEFORE UPDATE ON imm_provvigioni FOR EACH ROW EXECUTE FUNCTION imm_provvigione_protetta();

GRANT SELECT ON imm_agenti_riepilogo TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['imm_visita_prepara()', 'imm_visita_effetti()', 'imm_proposta_prepara()', 'imm_proposta_effetti()', 'imm_proposta_accettata_protetta()',
                           'imm_crea_provvigione(uuid,text,uuid,uuid,numeric,numeric,numeric,uuid,uuid,uuid)', 'imm_chiusura_prepara()', 'imm_chiusura_effetti()',
                           'imm_locazione_prepara()', 'imm_locazione_effetti()', 'imm_contratto_approvazione()', 'imm_aml_prepara()', 'imm_aml_scadenza()',
                           'imm_giro_notturno()', 'imm_provvigione_protetta()', 'seg_imm_cercano(text,jsonb)', 'seg_imm_proprietari(text,jsonb)',
                           'seg_imm_clienti_conclusi(text,jsonb)', 'seg_imm_senza_visite(text,jsonb)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY['imm_ripartisci(uuid,jsonb)', 'imm_fattura_provvigione(uuid,text)', 'imm_adegua_istat(uuid,numeric)',
                           'imm_compila(uuid,uuid,uuid,uuid,uuid,uuid,uuid)', 'imm_report(uuid)', 'imm_invia_report(uuid)', 'imm_kpi(date,date)', 'imm_cruscotto()',
                           'imm_agenda(date,date,uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('immobiliare-giro-notturno');
SELECT cron.schedule('immobiliare-giro-notturno', '50 2 * * *', $$SELECT imm_giro_notturno()$$);

ALTER PUBLICATION supabase_realtime ADD TABLE imm_lead, imm_visite, imm_proposte;

SELECT applica_protezioni_tabelle();
