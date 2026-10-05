-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Palestra (Sprint 4) · 1/3: sedi, soci, formule, abbonamenti,
-- carnet, sospensioni, incassi ricorrenti, accessi, convenzioni aziendali,
-- armadietti, prospect, certificazioni del personale.
--
-- Documento Palestra §1–8 (iscritti, prospect, abbonamenti, carnet,
-- sospensioni, rinnovi, accessi, controllo accessi), §26 (spogliatoi),
-- §27 (sale), §29 (corporate wellness), §30–32 (pagamenti, fatture,
-- incassi ricorrenti), §39 (certificazioni).
--
-- Il socio è un contatto del nucleo (cliente) iscritto alla palestra
-- (socio) che usa i servizi (utilizzatore). Il controllo dell'accesso è una
-- sola funzione, `pal_verifica_accesso`, che dice sì o no con il motivo:
-- la usano la reception, il lettore di badge e l'app (predisposti).
-- Biometria esclusa (art. 9 GDPR): né sviluppata né predisposta.
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. SEDI (CON LE REGOLE) E SALE ═════════════════════════════════
CREATE TABLE pal_sedi (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                     TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  nome                       TEXT NOT NULL,
  indirizzo                  TEXT,
  comune                     TEXT,
  telefono                   TEXT,
  email                      TEXT,
  orari                      JSONB NOT NULL DEFAULT '[]',   -- [{giorni:[1..7], dalle:'06:30', alle:'22:30'}]
  -- Regole di accesso e d'incasso
  richiede_certificato       BOOLEAN NOT NULL DEFAULT true,  -- certificato medico per l'attività sportiva
  tolleranza_insoluto_giorni INT NOT NULL DEFAULT 10 CHECK (tolleranza_insoluto_giorni >= 0),
  retry_giorni               INT NOT NULL DEFAULT 3 CHECK (retry_giorni > 0),
  tentativi_max              INT NOT NULL DEFAULT 3 CHECK (tentativi_max > 0),
  -- Regole dei corsi
  cancellazione_ore          INT NOT NULL DEFAULT 2 CHECK (cancellazione_ore >= 0),   -- disdetta senza no-show
  noshow_penale              NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (noshow_penale >= 0),
  noshow_soglia              INT NOT NULL DEFAULT 3 CHECK (noshow_soglia > 0),        -- no-show nella finestra…
  noshow_finestra_giorni     INT NOT NULL DEFAULT 30 CHECK (noshow_finestra_giorni > 0),
  noshow_blocco_giorni       INT NOT NULL DEFAULT 7 CHECK (noshow_blocco_giorni >= 0), -- …blocco delle prenotazioni
  noshow_consuma_credito     BOOLEAN NOT NULL DEFAULT true,
  avvisi_email               BOOLEAN NOT NULL DEFAULT true,  -- conferme, promemoria, scadenze, pagamenti
  referral_giorni            INT NOT NULL DEFAULT 7 CHECK (referral_giorni >= 0),  -- «porta un amico»: giorni in regalo
  attiva                     BOOLEAN NOT NULL DEFAULT true,
  note                       TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                 UUID REFERENCES user_profiles(id),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                 UUID REFERENCES user_profiles(id)
);

CREATE TABLE pal_sale (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id      UUID NOT NULL REFERENCES pal_sedi(id) ON DELETE CASCADE,
  modulo       TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  nome         TEXT NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'multifunzione' CHECK (tipo IN ('sala_pesi', 'sala_corsi', 'spinning', 'pt', 'piscina',
                                                                       'wellness', 'spogliatoio', 'multifunzione', 'altro')),
  capienza     INT CHECK (capienza > 0),
  attrezzature TEXT[] NOT NULL DEFAULT '{}',
  attiva       BOOLEAN NOT NULL DEFAULT true,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id),
  UNIQUE (sede_id, nome)
);

-- ═══ 2. CONVENZIONI AZIENDALI (§29) ═════════════════════════════════
CREATE TABLE pal_convenzioni (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  codice            TEXT UNIQUE,
  organizzazione_id UUID NOT NULL REFERENCES organizzazioni(id) ON DELETE RESTRICT,
  nome              TEXT,
  sconto_pct        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (sconto_pct BETWEEN 0 AND 100),
  quota_azienda_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (quota_azienda_pct BETWEEN 0 AND 100), -- parte pagata dall'azienda
  budget_annuo      NUMERIC(12,2) CHECK (budget_annuo >= 0),
  formule_ammesse   UUID[] NOT NULL DEFAULT '{}',          -- vuoto = tutte
  servizi           TEXT,
  dal               DATE,
  al                DATE,
  attiva            BOOLEAN NOT NULL DEFAULT true,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);

-- ═══ 3. SOCI (§1) ═══════════════════════════════════════════════════
CREATE TABLE pal_soci (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  codice                TEXT UNIQUE,                       -- SOC-2026-0001, anche sulla tessera
  contatto_id           UUID NOT NULL UNIQUE REFERENCES contatti(id) ON DELETE RESTRICT,
  sede_id               UUID NOT NULL REFERENCES pal_sedi(id) ON DELETE RESTRICT,
  data_iscrizione       DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  data_nascita          DATE,
  emergenza_nome        TEXT,
  emergenza_telefono    TEXT,
  badge                 TEXT UNIQUE,                       -- tessera o badge fisico
  qr_token              TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),  -- QR dell'app
  convenzione_id        UUID REFERENCES pal_convenzioni(id) ON DELETE SET NULL,
  presentato_da         UUID REFERENCES pal_soci(id) ON DELETE SET NULL,     -- «porta un amico»
  trainer_id            UUID,                              -- PT di riferimento (FK aggiunta con i trainer)
  certificato_scadenza  DATE,                              -- certificato medico sportivo
  condizioni_accettate  BOOLEAN NOT NULL DEFAULT false,    -- iscrizione e regolamento sottoscritti
  condizioni_at         TIMESTAMPTZ,
  consenso_salute       BOOLEAN NOT NULL DEFAULT false,    -- art. 9 GDPR: misure, progressi, valutazioni
  consenso_salute_at    TIMESTAMPTZ,
  bloccato              BOOLEAN NOT NULL DEFAULT false,
  blocco_motivo         TEXT,
  blocco_fino           DATE,
  prenotazioni_bloccate_fino DATE,                         -- dalla regola dei no-show
  preferenze            TEXT,
  note                  TEXT,
  ex_socio_at           DATE,                              -- uscito dalla palestra
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id),
  ricerca               TSVECTOR
);
CREATE INDEX idx_pal_soci_ricerca ON pal_soci USING GIN (ricerca);

-- ═══ 4. FORMULE, PACCHETTI, ABBONAMENTI, CARNET (§3–4) ══════════════
CREATE TABLE pal_formule (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo             TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  nome               TEXT NOT NULL,
  tipo               TEXT NOT NULL DEFAULT 'mensile' CHECK (tipo IN ('mensile', 'trimestrale', 'semestrale', 'annuale', 'open',
                       'fasce_orarie', 'sala_pesi', 'corsi', 'piscina', 'wellness', 'personal_training', 'corporate',
                       'studenti', 'famiglie', 'altro')),
  durata_mesi        INT NOT NULL DEFAULT 1 CHECK (durata_mesi > 0),
  prezzo             NUMERIC(10,2) NOT NULL CHECK (prezzo >= 0),
  quota_iscrizione   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quota_iscrizione >= 0),
  rate               INT NOT NULL DEFAULT 1 CHECK (rate BETWEEN 1 AND 24),   -- 1 = in un'unica soluzione
  accessi            INT CHECK (accessi > 0),             -- NULL = illimitati
  fasce              JSONB,                               -- NULL = sempre; [{giorni:[1..7], dalle, alle}]
  servizi            TEXT[] NOT NULL DEFAULT '{sala_pesi}' CHECK (servizi <@ ARRAY['sala_pesi','corsi','piscina','wellness','pt']::text[]),
  limitazioni        TEXT,
  rinnovo_automatico BOOLEAN NOT NULL DEFAULT false,
  attiva             BOOLEAN NOT NULL DEFAULT true,
  ordine             INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);

-- Carnet in vendita: una o più voci (il pacchetto combinato ne ha più d'una).
CREATE TABLE pal_pacchetti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo          TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  nome            TEXT NOT NULL,                          -- «10 ingressi», «10 lezioni PT»
  voci            JSONB NOT NULL,                         -- [{servizio:'ingressi', quantita:10}, …]
  prezzo          NUMERIC(10,2) NOT NULL CHECK (prezzo >= 0),
  validita_giorni INT NOT NULL DEFAULT 180 CHECK (validita_giorni > 0),
  attivo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id),
  CHECK (jsonb_typeof(voci) = 'array' AND jsonb_array_length(voci) > 0)
);

CREATE TYPE pal_abbonamento_stato AS ENUM ('attivo', 'sospeso', 'scaduto', 'disdetto');

CREATE TABLE pal_abbonamenti (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo             TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  codice             TEXT UNIQUE,
  socio_id           UUID NOT NULL REFERENCES pal_soci(id) ON DELETE CASCADE,
  formula_id         UUID NOT NULL REFERENCES pal_formule(id) ON DELETE RESTRICT,
  inizio             DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  fine               DATE,                                -- dalla formula, spostata dalle sospensioni
  prezzo             NUMERIC(10,2),                       -- dal listino, meno lo sconto della convenzione
  quota_azienda      NUMERIC(10,2) NOT NULL DEFAULT 0,    -- la parte della convenzione aziendale
  accessi_totali     INT,
  accessi_usati      INT NOT NULL DEFAULT 0 CHECK (accessi_usati >= 0),
  stato              pal_abbonamento_stato NOT NULL DEFAULT 'attivo',
  rinnovo_automatico BOOLEAN,
  metodo_pagamento   TEXT NOT NULL DEFAULT 'pos' CHECK (metodo_pagamento IN ('contanti', 'pos', 'carta', 'bonifico', 'online', 'addebito_ricorrente')),
  rinnovo_di         UUID REFERENCES pal_abbonamenti(id) ON DELETE SET NULL,
  disdetto_at        DATE,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id),
  CHECK (fine IS NULL OR fine >= inizio),
  CHECK (accessi_totali IS NULL OR accessi_usati <= accessi_totali)
);
CREATE INDEX idx_pal_abbonamenti_socio ON pal_abbonamenti (socio_id, fine);

CREATE TABLE pal_carnet (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo        TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  socio_id      UUID NOT NULL REFERENCES pal_soci(id) ON DELETE CASCADE,
  pacchetto_id  UUID REFERENCES pal_pacchetti(id) ON DELETE SET NULL,
  acquisto      UUID NOT NULL DEFAULT gen_random_uuid(),   -- le voci dello stesso pacchetto combinato
  nome          TEXT NOT NULL,
  servizio      TEXT NOT NULL CHECK (servizio IN ('ingressi', 'corsi', 'lezioni_pt', 'massaggi', 'wellness', 'piscina')),
  totale        INT NOT NULL CHECK (totale > 0),
  usati         INT NOT NULL DEFAULT 0 CHECK (usati >= 0),
  prezzo        NUMERIC(10,2) NOT NULL DEFAULT 0,
  acquistato_il DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  scadenza      DATE,
  annullato     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id),
  CHECK (usati <= totale)
);
CREATE INDEX idx_pal_carnet_socio ON pal_carnet (socio_id, servizio);

-- ═══ 5. SOSPENSIONI (§5) ════════════════════════════════════════════
CREATE TABLE pal_sospensioni (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo         TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  abbonamento_id UUID NOT NULL REFERENCES pal_abbonamenti(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL DEFAULT 'sospensione' CHECK (tipo IN ('sospensione', 'congelamento', 'proroga', 'recupero')),
  dal            DATE,                                    -- sospensione e congelamento: il periodo
  al             DATE,
  giorni         INT,                                     -- proroga e recupero: i giorni; per il periodo, calcolati
  motivo         TEXT NOT NULL,
  stato          TEXT NOT NULL DEFAULT 'richiesta' CHECK (stato IN ('richiesta', 'approvata', 'rifiutata')),
  autorizzata_da UUID REFERENCES user_profiles(id),
  autorizzata_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES user_profiles(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID REFERENCES user_profiles(id),
  CHECK ((tipo IN ('sospensione', 'congelamento') AND dal IS NOT NULL AND al IS NOT NULL AND al >= dal)
      OR (tipo IN ('proroga', 'recupero') AND giorni > 0))
);

-- ═══ 6. RATE E INCASSI RICORRENTI (§30–32) ══════════════════════════
CREATE TABLE pal_rate (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  socio_id          UUID NOT NULL REFERENCES pal_soci(id) ON DELETE CASCADE,
  abbonamento_id    UUID REFERENCES pal_abbonamenti(id) ON DELETE CASCADE,
  carnet_acquisto   UUID,
  descrizione       TEXT NOT NULL,
  numero            INT NOT NULL DEFAULT 1,
  scadenza          DATE NOT NULL,
  importo           NUMERIC(10,2) NOT NULL CHECK (importo > 0),
  pagatore          TEXT NOT NULL DEFAULT 'socio' CHECK (pagatore IN ('socio', 'azienda')),
  organizzazione_id UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  metodo            TEXT NOT NULL DEFAULT 'pos' CHECK (metodo IN ('contanti', 'pos', 'carta', 'bonifico', 'online', 'addebito_ricorrente', 'fattura')),
  stato             TEXT NOT NULL DEFAULT 'da_pagare' CHECK (stato IN ('da_pagare', 'pagata', 'fallita', 'insoluta', 'fatturata', 'annullata')),
  tentativi         INT NOT NULL DEFAULT 0,
  prossimo_tentativo DATE,
  ultimo_esito      TEXT,
  pagata_il         DATE,
  conto_id          UUID REFERENCES conti(id) ON DELETE SET NULL,
  fattura_id        UUID REFERENCES fatture(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  CHECK ((pagatore = 'azienda') = (organizzazione_id IS NOT NULL))
);
CREATE INDEX idx_pal_rate_scadenza ON pal_rate (stato, scadenza);
CREATE INDEX idx_pal_rate_socio ON pal_rate (socio_id);

-- ═══ 7. ACCESSI (§7) ════════════════════════════════════════════════
CREATE TABLE pal_accessi (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo         TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  socio_id       UUID NOT NULL REFERENCES pal_soci(id) ON DELETE CASCADE,
  sede_id        UUID NOT NULL REFERENCES pal_sedi(id) ON DELETE CASCADE,
  ingresso_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uscita_at      TIMESTAMPTZ,
  tipo           TEXT NOT NULL DEFAULT 'manuale' CHECK (tipo IN ('badge', 'qr', 'app', 'tessera', 'manuale')),
  servizio       TEXT NOT NULL DEFAULT 'sala_pesi',
  consentito     BOOLEAN NOT NULL,
  motivo         TEXT,                                    -- perché no (o con che cosa sì)
  abbonamento_id UUID REFERENCES pal_abbonamenti(id) ON DELETE SET NULL,
  carnet_id      UUID REFERENCES pal_carnet(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES user_profiles(id),
  CHECK (uscita_at IS NULL OR uscita_at >= ingresso_at)
);
CREATE INDEX idx_pal_accessi_socio ON pal_accessi (socio_id, ingresso_at DESC);
CREATE INDEX idx_pal_accessi_sede ON pal_accessi (sede_id, ingresso_at DESC);

-- ═══ 8. ARMADIETTI (§26) ════════════════════════════════════════════
CREATE TABLE pal_armadietti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id           UUID NOT NULL REFERENCES pal_sedi(id) ON DELETE CASCADE,
  modulo            TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  numero            TEXT NOT NULL,
  zona              TEXT,                                 -- spogliatoio uomini, donne…
  socio_id          UUID REFERENCES pal_soci(id) ON DELETE SET NULL,
  chiave            TEXT,                                 -- numero di chiave o badge
  cauzione          NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (cauzione >= 0),
  cauzione_versata  BOOLEAN NOT NULL DEFAULT false,
  stato             TEXT NOT NULL DEFAULT 'libero' CHECK (stato IN ('libero', 'assegnato', 'guasto')),
  assegnato_dal     DATE,
  assegnato_fino    DATE,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  UNIQUE (sede_id, numero),
  CHECK ((stato = 'assegnato') = (socio_id IS NOT NULL))
);

-- ═══ 9. PROSPECT: PROVE E VISITE (§2) ═══════════════════════════════
-- La trattativa è un deal del nucleo nella pipeline «Palestra · Prospect»
-- (Lead → Contatto → Visita → Prova → Offerta → Iscrizione, più Persa con
-- il motivo); appuntamenti e richiami sono attività del nucleo sul deal.
CREATE TABLE pal_prove (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo      TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  contatto_id UUID NOT NULL REFERENCES contatti(id) ON DELETE CASCADE,
  deal_id     UUID REFERENCES deals(id) ON DELETE SET NULL,
  sede_id     UUID NOT NULL REFERENCES pal_sedi(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL DEFAULT 'prova' CHECK (tipo IN ('visita', 'prova')),
  quando      TIMESTAMPTZ NOT NULL,
  servizio    TEXT,
  stato       TEXT NOT NULL DEFAULT 'prenotata' CHECK (stato IN ('prenotata', 'svolta', 'non_presentato', 'annullata')),
  esito       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);

-- ═══ 10. CERTIFICAZIONI DEL PERSONALE (§39) ═════════════════════════
CREATE TABLE pal_certificazioni (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo         TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  dipendente_id  UUID NOT NULL REFERENCES dipendenti(id) ON DELETE CASCADE,
  certificazione TEXT NOT NULL,                          -- «Istruttore Pilates Matwork», «BLSD»
  tipo           TEXT NOT NULL DEFAULT 'abilitazione' CHECK (tipo IN ('abilitazione', 'brevetto', 'primo_soccorso', 'blsd', 'antincendio', 'specializzazione', 'altro')),
  ente           TEXT,
  conseguita_il  DATE,
  scadenza       DATE,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES user_profiles(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID REFERENCES user_profiles(id),
  CHECK (scadenza IS NULL OR conseguita_il IS NULL OR scadenza >= conseguita_il)
);

-- ═══ 11. FUNZIONI DI SERVIZIO ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION pal_oggi()
RETURNS DATE LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT (NOW() AT TIME ZONE 'Europe/Rome')::date
$$;

CREATE OR REPLACE FUNCTION pal_euro(p NUMERIC)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT replace(replace(replace(to_char(p, 'FM999G999G990D00'), ',', '#'), '.', ','), '#', '.') || ' €'
$$;

-- Avviso al socio per email (servizio, non promozione: non serve il consenso
-- al marketing). SMS, push e WhatsApp sono predisposti.
CREATE OR REPLACE FUNCTION pal_avvisa(p_socio UUID, p_oggetto TEXT, p_testo TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_email TEXT;
  v_nome TEXT;
  v_attivo BOOLEAN;
BEGIN
  SELECT k.email, k.nome, s.avvisi_email INTO v_email, v_nome, v_attivo
    FROM pal_soci so JOIN contatti k ON k.id = so.contatto_id JOIN pal_sedi s ON s.id = so.sede_id
   WHERE so.id = p_socio;
  IF v_email IS NULL OR NOT COALESCE(v_attivo, false) THEN RETURN false; END IF;
  INSERT INTO mail_outbox (destinatario, oggetto, corpo_testo, corpo_html)
  VALUES (v_email, p_oggetto, 'Ciao ' || COALESCE(v_nome, '') || E',\n\n' || p_testo,
          '<div style="font-family:system-ui,sans-serif;line-height:1.5"><p>Ciao ' || html_escape(COALESCE(v_nome, '')) || ',</p><p>'
            || replace(html_escape(p_testo), E'\n', '<br>') || '</p></div>');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION pal_notifica_direzione(p_titolo TEXT, p_messaggio TEXT, p_url TEXT, p_tipo notifica_tipo DEFAULT 'warning')
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE dest UUID;
BEGIN
  FOR dest IN SELECT id FROM user_profiles WHERE attivo AND ruolo IN ('admin', 'manager') LOOP
    PERFORM crea_notifica(dest, p_tipo, p_titolo, p_messaggio, p_url);
  END LOOP;
END;
$$;

-- ═══ 12. SOCI: CODICE, RICERCA, PIPELINE ════════════════════════════
CREATE OR REPLACE FUNCTION pal_socio_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE k contatti%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('SOC'); END IF;
  IF NEW.condizioni_accettate AND (TG_OP = 'INSERT' OR NOT OLD.condizioni_accettate) THEN NEW.condizioni_at := NOW(); END IF;
  IF NOT NEW.condizioni_accettate THEN NEW.condizioni_at := NULL; END IF;
  IF NEW.consenso_salute AND (TG_OP = 'INSERT' OR NOT OLD.consenso_salute) THEN NEW.consenso_salute_at := NOW(); END IF;
  IF NOT NEW.consenso_salute THEN NEW.consenso_salute_at := NULL; END IF;
  IF NOT NEW.bloccato THEN NEW.blocco_motivo := NULL; NEW.blocco_fino := NULL; END IF;
  SELECT * INTO k FROM contatti WHERE id = NEW.contatto_id;
  NEW.ricerca := to_tsvector('simple', concat_ws(' ', NEW.codice, k.nome, k.cognome, k.email, k.telefono, NEW.badge));
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_soci_prepara BEFORE INSERT OR UPDATE ON pal_soci FOR EACH ROW EXECUTE FUNCTION pal_socio_prepara();

-- La pipeline dei prospect, creata una volta.
INSERT INTO pipelines (nome, is_default)
SELECT 'Palestra · Prospect', false WHERE NOT EXISTS (SELECT 1 FROM pipelines WHERE nome = 'Palestra · Prospect');
INSERT INTO pipeline_stages (pipeline_id, nome, ordine, probabilita, is_won, is_lost)
SELECT p.id, s.nome, s.ordine, s.prob, s.won, s.lost
  FROM pipelines p,
       (VALUES ('Lead', 1, 10, false, false), ('Contatto', 2, 20, false, false), ('Visita', 3, 40, false, false),
               ('Prova', 4, 60, false, false), ('Offerta', 5, 80, false, false), ('Iscrizione', 6, 100, true, false),
               ('Persa', 7, 0, false, true)) s(nome, ordine, prob, won, lost)
 WHERE p.nome = 'Palestra · Prospect'
   AND NOT EXISTS (SELECT 1 FROM pipeline_stages x WHERE x.pipeline_id = p.id);

CREATE OR REPLACE FUNCTION pal_pipeline()
RETURNS UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT id FROM pipelines WHERE nome = 'Palestra · Prospect' LIMIT 1
$$;

-- Chi si iscrive chiude la sua trattativa aperta come vinta.
CREATE OR REPLACE FUNCTION pal_socio_iscritto()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE deals d SET stage_id = (SELECT id FROM pipeline_stages WHERE pipeline_id = pal_pipeline() AND is_won LIMIT 1),
                     chiuso_at = NOW()
   WHERE d.pipeline_id = pal_pipeline() AND d.contatto_id = NEW.contatto_id AND d.chiuso_at IS NULL AND d.attivo;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_soci_iscritto AFTER INSERT ON pal_soci FOR EACH ROW EXECUTE FUNCTION pal_socio_iscritto();

-- ═══ 13. ABBONAMENTI: DATE, PREZZO, RATE ════════════════════════════
CREATE OR REPLACE FUNCTION pal_abbonamento_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  f pal_formule%ROWTYPE;
  c pal_convenzioni%ROWTYPE;
  v_listino NUMERIC;
BEGIN
  SELECT * INTO f FROM pal_formule WHERE id = NEW.formula_id;
  IF TG_OP = 'INSERT' THEN
    IF NEW.codice IS NULL THEN NEW.codice := genera_codice('ABB'); END IF;
    NEW.fine := COALESCE(NEW.fine, (NEW.inizio + make_interval(months => f.durata_mesi) - INTERVAL '1 day')::date);
    NEW.accessi_totali := COALESCE(NEW.accessi_totali, f.accessi);
    NEW.rinnovo_automatico := COALESCE(NEW.rinnovo_automatico, f.rinnovo_automatico);
    IF NEW.prezzo IS NULL THEN
      v_listino := f.prezzo;
      SELECT cv.* INTO c FROM pal_soci s JOIN pal_convenzioni cv ON cv.id = s.convenzione_id
       WHERE s.id = NEW.socio_id AND cv.attiva
         AND (cv.dal IS NULL OR NEW.inizio >= cv.dal) AND (cv.al IS NULL OR NEW.inizio <= cv.al)
         AND (cardinality(cv.formule_ammesse) = 0 OR NEW.formula_id = ANY (cv.formule_ammesse));
      NEW.prezzo := round(v_listino * (1 - COALESCE(c.sconto_pct, 0) / 100), 2);
      NEW.quota_azienda := round(NEW.prezzo * COALESCE(c.quota_azienda_pct, 0) / 100, 2);
    END IF;
  END IF;
  IF NEW.quota_azienda > NEW.prezzo THEN
    RAISE EXCEPTION 'La quota dell''azienda supera il prezzo' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.stato = 'disdetto' AND NEW.disdetto_at IS NULL THEN NEW.disdetto_at := pal_oggi(); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_abbonamenti_prepara BEFORE INSERT OR UPDATE ON pal_abbonamenti
  FOR EACH ROW EXECUTE FUNCTION pal_abbonamento_prepara();

-- Rate alla vendita: la quota d'iscrizione sulla prima, il resto diviso nei
-- mesi; la parte dell'azienda è una rata a parte da fatturare.
CREATE OR REPLACE FUNCTION pal_abbonamento_rate()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  f pal_formule%ROWTYPE;
  v_org UUID;
  v_socio NUMERIC := NEW.prezzo - NEW.quota_azienda;
  v_rata NUMERIC;
  v_resto NUMERIC;
  v_iscr NUMERIC := 0;
  v_importo NUMERIC;
  i INT;
BEGIN
  SELECT * INTO f FROM pal_formule WHERE id = NEW.formula_id;
  -- La quota d'iscrizione la paga solo chi non ha già un abbonamento.
  IF NEW.rinnovo_di IS NULL AND NOT EXISTS (SELECT 1 FROM pal_abbonamenti WHERE socio_id = NEW.socio_id AND id <> NEW.id) THEN
    v_iscr := f.quota_iscrizione;
  END IF;
  v_rata := trunc(v_socio / f.rate, 2);
  v_resto := v_socio - v_rata * f.rate;
  FOR i IN 1 .. f.rate LOOP
    v_importo := v_rata + (CASE WHEN i = 1 THEN v_resto + v_iscr ELSE 0 END);
    IF v_importo > 0 THEN
      INSERT INTO pal_rate (socio_id, abbonamento_id, descrizione, numero, scadenza, importo, metodo, created_by)
      VALUES (NEW.socio_id, NEW.id,
              f.nome || (CASE WHEN f.rate > 1 THEN ' · rata ' || i || ' di ' || f.rate ELSE '' END)
                     || (CASE WHEN i = 1 AND v_iscr > 0 THEN ' + iscrizione' ELSE '' END),
              i, (NEW.inizio + make_interval(months => i - 1))::date, v_importo, NEW.metodo_pagamento, NEW.created_by);
    END IF;
  END LOOP;
  IF NEW.quota_azienda > 0 THEN
    SELECT cv.organizzazione_id INTO v_org FROM pal_soci s JOIN pal_convenzioni cv ON cv.id = s.convenzione_id WHERE s.id = NEW.socio_id;
    INSERT INTO pal_rate (socio_id, abbonamento_id, descrizione, scadenza, importo, pagatore, organizzazione_id, metodo, created_by)
    VALUES (NEW.socio_id, NEW.id, f.nome || ' · quota azienda', NEW.inizio, NEW.quota_azienda, 'azienda', v_org, 'fattura', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_abbonamenti_rate AFTER INSERT ON pal_abbonamenti FOR EACH ROW EXECUTE FUNCTION pal_abbonamento_rate();

-- Scadenza dell'abbonamento tra le scadenze dei moduli (avviso a 30/7/1/0 giorni).
CREATE OR REPLACE FUNCTION pal_abbonamento_scadenza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_nome TEXT;
BEGIN
  DELETE FROM scadenze_moduli WHERE entita = 'pal_abbonamenti' AND entita_id = NEW.id AND stato = 'aperta';
  IF NEW.stato IN ('attivo', 'sospeso') AND NEW.fine IS NOT NULL THEN
    SELECT trim(k.nome || ' ' || COALESCE(k.cognome, '')) INTO v_nome FROM pal_soci s JOIN contatti k ON k.id = s.contatto_id WHERE s.id = NEW.socio_id;
    INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
    VALUES ('palestra', 'pal_abbonamenti', NEW.id, 'Scadenza abbonamento', v_nome || ' · ' || NEW.codice,
            NEW.fine, '/palestra/soci/' || NEW.socio_id, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_abbonamenti_scadenza AFTER INSERT OR UPDATE OF fine, stato ON pal_abbonamenti
  FOR EACH ROW EXECUTE FUNCTION pal_abbonamento_scadenza();

-- ═══ 14. CARNET: VENDITA DI UN PACCHETTO E SCALO ════════════════════
CREATE OR REPLACE FUNCTION pal_vendi_pacchetto(p_socio UUID, p_pacchetto UUID, p_metodo TEXT DEFAULT 'pos')
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p pal_pacchetti%ROWTYPE;
  v_acquisto UUID := gen_random_uuid();
  v JSONB;
BEGIN
  IF NOT modulo_attivo('palestra') THEN RAISE EXCEPTION 'Modulo Palestra non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO p FROM pal_pacchetti WHERE id = p_pacchetto AND attivo;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Pacchetto non disponibile'; END IF;
  FOR v IN SELECT * FROM jsonb_array_elements(p.voci) LOOP
    INSERT INTO pal_carnet (socio_id, pacchetto_id, acquisto, nome, servizio, totale, prezzo, scadenza, created_by)
    VALUES (p_socio, p.id, v_acquisto, p.nome, v->>'servizio', (v->>'quantita')::int,
            CASE WHEN v = p.voci->0 THEN p.prezzo ELSE 0 END, pal_oggi() + p.validita_giorni, auth.uid());
  END LOOP;
  IF p.prezzo > 0 THEN
    INSERT INTO pal_rate (socio_id, carnet_acquisto, descrizione, scadenza, importo, metodo, created_by)
    VALUES (p_socio, v_acquisto, p.nome, pal_oggi(), p.prezzo, p_metodo, auth.uid());
  END IF;
  RETURN v_acquisto;
END;
$$;

-- Scala una prestazione dal carnet valido che scade per primo.
CREATE OR REPLACE FUNCTION pal_scala_carnet(p_socio UUID, p_servizio TEXT, p_quando DATE DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM pal_carnet
   WHERE socio_id = p_socio AND servizio = p_servizio AND NOT annullato AND usati < totale
     AND (scadenza IS NULL OR scadenza >= COALESCE(p_quando, pal_oggi()))
   ORDER BY scadenza NULLS LAST, created_at
   LIMIT 1 FOR UPDATE;
  IF v_id IS NOT NULL THEN UPDATE pal_carnet SET usati = usati + 1 WHERE id = v_id; END IF;
  RETURN v_id;
END;
$$;

-- Restituisce una prestazione al carnet (disdetta in tempo).
CREATE OR REPLACE FUNCTION pal_rendi_carnet(p_carnet UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  UPDATE pal_carnet SET usati = usati - 1 WHERE id = p_carnet AND usati > 0
$$;

-- ═══ 15. SOSPENSIONI: LA SCADENZA SI SPOSTA DA SOLA ═════════════════
CREATE OR REPLACE FUNCTION pal_sospensione_applica()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  a pal_abbonamenti%ROWTYPE;
BEGIN
  IF NEW.tipo IN ('sospensione', 'congelamento') THEN NEW.giorni := NEW.al - NEW.dal + 1; END IF;
  IF TG_OP = 'UPDATE' AND OLD.stato <> 'richiesta' AND NEW.stato IS DISTINCT FROM OLD.stato THEN
    RAISE EXCEPTION 'Sospensione già %: non si cambia', OLD.stato USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.stato = 'approvata' AND (TG_OP = 'INSERT' OR OLD.stato = 'richiesta') THEN
    -- L'autorizzazione è della direzione (o di chi la registra come amministratore).
    IF auth.uid() IS NOT NULL AND NOT puo_amministrazione() AND current_setting('pal.interno', true) IS DISTINCT FROM '1' THEN
      RAISE EXCEPTION 'La sospensione la autorizza la direzione' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO a FROM pal_abbonamenti WHERE id = NEW.abbonamento_id FOR UPDATE;
    IF a.stato NOT IN ('attivo', 'sospeso') THEN
      RAISE EXCEPTION 'L''abbonamento è %: non si sospende', a.stato USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.tipo IN ('sospensione', 'congelamento') AND (NEW.dal < a.inizio OR NEW.dal > a.fine) THEN
      RAISE EXCEPTION 'Il periodo deve cominciare dentro l''abbonamento (% – %)', to_char(a.inizio, 'DD/MM/YYYY'), to_char(a.fine, 'DD/MM/YYYY')
        USING ERRCODE = 'check_violation';
    END IF;
    PERFORM set_config('pal.interno', '1', true);
    UPDATE pal_abbonamenti SET fine = fine + NEW.giorni WHERE id = NEW.abbonamento_id;
    PERFORM set_config('pal.interno', '0', true);
    NEW.autorizzata_da := COALESCE(auth.uid(), NEW.created_by);
    NEW.autorizzata_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_sospensioni_applica BEFORE INSERT OR UPDATE ON pal_sospensioni
  FOR EACH ROW EXECUTE FUNCTION pal_sospensione_applica();

-- In sospensione il giorno d'oggi? (vale per accessi e prenotazioni)
CREATE OR REPLACE FUNCTION pal_in_sospensione(p_abbonamento UUID, p_giorno DATE)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM pal_sospensioni WHERE abbonamento_id = p_abbonamento AND stato = 'approvata'
                    AND tipo IN ('sospensione', 'congelamento') AND p_giorno BETWEEN dal AND al)
$$;

-- ═══ 16. INCASSI: RATA PAGATA, ADDEBITO RICORRENTE, INSOLUTI ════════
-- Incasso alla reception: un conto della cassa delle fondamenta, pagato e
-- chiuso, così l'incasso entra nella chiusura di cassa e nella fattura.
CREATE OR REPLACE FUNCTION pal_incassa_rata(p_rata UUID, p_metodo pagamento_metodo DEFAULT 'pos', p_riferimento TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r pal_rate%ROWTYPE;
  v_conto UUID;
  v_contatto UUID;
  v_sessione UUID;
BEGIN
  IF NOT modulo_attivo('palestra') THEN RAISE EXCEPTION 'Modulo Palestra non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM pal_rate WHERE id = p_rata FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Rata inesistente'; END IF;
  IF r.stato NOT IN ('da_pagare', 'fallita', 'insoluta') THEN
    RAISE EXCEPTION 'Rata già %', replace(r.stato, '_', ' ') USING ERRCODE = 'check_violation';
  END IF;
  IF r.pagatore = 'azienda' THEN RAISE EXCEPTION 'La quota dell''azienda si fattura alla convenzione' USING ERRCODE = 'check_violation'; END IF;
  SELECT contatto_id INTO v_contatto FROM pal_soci WHERE id = r.socio_id;
  SELECT id INTO v_sessione FROM cassa_sessioni WHERE modulo = 'palestra' AND stato = 'aperta' ORDER BY aperta_at DESC LIMIT 1;
  INSERT INTO conti (modulo, descrizione, riferimento_tipo, riferimento_id, contatto_id, sessione_id, created_by)
  VALUES ('palestra', r.descrizione, 'pal_rate', r.id, v_contatto, v_sessione, COALESCE(auth.uid(), r.created_by))
  RETURNING id INTO v_conto;
  INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, riferimento_id, created_by)
  VALUES (v_conto, r.descrizione, 1, r.importo, 22, 'pal_rate', r.id, COALESCE(auth.uid(), r.created_by));
  INSERT INTO conti_pagamenti (conto_id, modulo, metodo, importo, riferimento, sessione_id, created_by)
  VALUES (v_conto, 'palestra', p_metodo, r.importo, p_riferimento, v_sessione, COALESCE(auth.uid(), r.created_by));
  UPDATE conti SET stato = 'chiuso', chiuso_at = NOW() WHERE id = v_conto;
  UPDATE pal_rate SET stato = 'pagata', pagata_il = pal_oggi(), conto_id = v_conto, ultimo_esito = 'Incassata'
   WHERE id = r.id;
  RETURN v_conto;
END;
$$;

-- Esito dell'addebito ricorrente (SDD o carta; il collegamento al gestore dei
-- pagamenti è predisposto): riuscito = incassata; fallito = nuovo tentativo
-- dopo N giorni; oltre i tentativi = insoluta, socio avvisato, direzione pure.
CREATE OR REPLACE FUNCTION pal_esito_addebito(p_rata UUID, p_riuscito BOOLEAN, p_esito TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r pal_rate%ROWTYPE;
  s pal_sedi%ROWTYPE;
BEGIN
  IF NOT modulo_attivo('palestra') OR NOT puo_amministrazione() THEN RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM pal_rate WHERE id = p_rata FOR UPDATE;
  IF r.stato NOT IN ('da_pagare', 'fallita') THEN RAISE EXCEPTION 'Rata già %', replace(r.stato, '_', ' ') USING ERRCODE = 'check_violation'; END IF;
  IF p_riuscito THEN
    PERFORM pal_incassa_rata(p_rata, 'online', COALESCE(p_esito, 'Addebito ricorrente'));
    RETURN 'pagata';
  END IF;
  SELECT se.* INTO s FROM pal_soci so JOIN pal_sedi se ON se.id = so.sede_id WHERE so.id = r.socio_id;
  IF r.tentativi + 1 >= s.tentativi_max THEN
    UPDATE pal_rate SET tentativi = tentativi + 1, stato = 'insoluta', ultimo_esito = p_esito, prossimo_tentativo = NULL WHERE id = r.id;
    PERFORM pal_avvisa(r.socio_id, 'Pagamento non riuscito',
      'non siamo riusciti ad addebitare ' || pal_euro(r.importo) || ' (' || r.descrizione || '). Passa in reception per regolarizzare: '
      || 'fino ad allora l''accesso è sospeso.');
    PERFORM pal_notifica_direzione('Insoluto', r.descrizione || ' · ' || pal_euro(r.importo) || ': tentativi esauriti.', '/palestra/incassi');
    RETURN 'insoluta';
  END IF;
  UPDATE pal_rate SET tentativi = tentativi + 1, stato = 'fallita', ultimo_esito = p_esito,
                      prossimo_tentativo = pal_oggi() + s.retry_giorni WHERE id = r.id;
  PERFORM pal_avvisa(r.socio_id, 'Pagamento da ritentare',
    'l''addebito di ' || pal_euro(r.importo) || ' non è andato a buon fine. Riproveremo il ' || to_char(pal_oggi() + s.retry_giorni, 'DD/MM/YYYY') || '.');
  RETURN 'fallita';
END;
$$;

-- Ogni mattina: le rate scadute oltre la tolleranza diventano insolute.
CREATE OR REPLACE FUNCTION pal_rate_scadute()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r RECORD;
  n INT := 0;
BEGIN
  FOR r IN SELECT ra.* FROM pal_rate ra JOIN pal_soci so ON so.id = ra.socio_id JOIN pal_sedi se ON se.id = so.sede_id
            WHERE ra.stato IN ('da_pagare', 'fallita') AND ra.pagatore = 'socio'
              AND ra.scadenza + se.tolleranza_insoluto_giorni < pal_oggi() FOR UPDATE OF ra LOOP
    UPDATE pal_rate SET stato = 'insoluta', ultimo_esito = COALESCE(ultimo_esito, 'Scaduta senza pagamento') WHERE id = r.id;
    PERFORM pal_avvisa(r.socio_id, 'Pagamento scaduto',
      'risulta da pagare ' || pal_euro(r.importo) || ' (' || r.descrizione || ', scaduta il ' || to_char(r.scadenza, 'DD/MM/YYYY')
      || '). L''accesso resta sospeso fino al pagamento.');
    n := n + 1;
  END LOOP;
  IF n > 0 THEN PERFORM pal_notifica_direzione('Nuovi insoluti', n || ' rate sono diventate insolute.', '/palestra/incassi'); END IF;
  RETURN n;
END;
$$;

-- ═══ 17. CONTROLLO ACCESSI (§8) ═════════════════════════════════════
-- Dice sì o no, con il motivo, senza scrivere nulla.
CREATE OR REPLACE FUNCTION pal_verifica_accesso(p_socio UUID, p_istante TIMESTAMPTZ DEFAULT NOW(), p_servizio TEXT DEFAULT 'sala_pesi')
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  so pal_soci%ROWTYPE;
  se pal_sedi%ROWTYPE;
  a RECORD;
  v_giorno DATE := (p_istante AT TIME ZONE 'Europe/Rome')::date;
  v_ora TIME := (p_istante AT TIME ZONE 'Europe/Rome')::time;
  v_dow INT := EXTRACT(ISODOW FROM (p_istante AT TIME ZONE 'Europe/Rome'))::int;
  v_motivo TEXT;
  v_carnet UUID;
  v_servizio_carnet TEXT := CASE p_servizio WHEN 'sala_pesi' THEN 'ingressi' ELSE p_servizio END;
BEGIN
  IF NOT modulo_attivo('palestra') THEN RAISE EXCEPTION 'Modulo Palestra non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO so FROM pal_soci WHERE id = p_socio;
  IF so.id IS NULL THEN RETURN jsonb_build_object('consentito', false, 'motivo', 'Socio sconosciuto'); END IF;
  SELECT * INTO se FROM pal_sedi WHERE id = so.sede_id;
  IF so.ex_socio_at IS NOT NULL THEN RETURN jsonb_build_object('consentito', false, 'motivo', 'Non è più socio'); END IF;
  IF so.bloccato AND (so.blocco_fino IS NULL OR so.blocco_fino >= v_giorno) THEN
    RETURN jsonb_build_object('consentito', false, 'motivo', 'Bloccato: ' || COALESCE(so.blocco_motivo, 'chiedere alla direzione'));
  END IF;
  IF NOT so.condizioni_accettate THEN
    RETURN jsonb_build_object('consentito', false, 'motivo', 'Manca la firma delle condizioni di iscrizione');
  END IF;
  IF se.richiede_certificato AND (so.certificato_scadenza IS NULL OR so.certificato_scadenza < v_giorno) THEN
    RETURN jsonb_build_object('consentito', false, 'motivo',
      CASE WHEN so.certificato_scadenza IS NULL THEN 'Manca il certificato medico'
           ELSE 'Certificato medico scaduto il ' || to_char(so.certificato_scadenza, 'DD/MM/YYYY') END);
  END IF;
  IF EXISTS (SELECT 1 FROM pal_rate WHERE socio_id = p_socio AND stato = 'insoluta' AND pagatore = 'socio') THEN
    RETURN jsonb_build_object('consentito', false, 'motivo', 'Pagamento insoluto: regolarizzare in reception');
  END IF;

  -- Abbonamenti in corso che coprono il servizio: il primo che va bene vince.
  FOR a IN SELECT ab.*, f.servizi, f.fasce FROM pal_abbonamenti ab JOIN pal_formule f ON f.id = ab.formula_id
            WHERE ab.socio_id = p_socio AND ab.stato IN ('attivo', 'sospeso') AND v_giorno BETWEEN ab.inizio AND ab.fine
            ORDER BY ab.fine DESC LOOP
    IF NOT (p_servizio = ANY (a.servizi)) THEN v_motivo := COALESCE(v_motivo, 'L''abbonamento non comprende questo servizio'); CONTINUE; END IF;
    IF a.stato = 'sospeso' OR pal_in_sospensione(a.id, v_giorno) THEN v_motivo := 'Abbonamento sospeso oggi'; CONTINUE; END IF;
    IF a.fasce IS NOT NULL AND jsonb_array_length(a.fasce) > 0 AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(a.fasce) x
          WHERE v_dow IN (SELECT jsonb_array_elements_text(x->'giorni')::int)
            AND v_ora BETWEEN (x->>'dalle')::time AND (x->>'alle')::time) THEN
      v_motivo := 'Fuori dalla fascia oraria dell''abbonamento'; CONTINUE;
    END IF;
    IF a.accessi_totali IS NOT NULL AND a.accessi_usati >= a.accessi_totali THEN v_motivo := 'Ingressi dell''abbonamento esauriti'; CONTINUE; END IF;
    RETURN jsonb_build_object('consentito', true, 'motivo', 'Abbonamento ' || a.codice || ' fino al ' || to_char(a.fine, 'DD/MM/YYYY'),
                              'abbonamento_id', a.id, 'scadenza', a.fine,
                              'residui', CASE WHEN a.accessi_totali IS NULL THEN NULL ELSE a.accessi_totali - a.accessi_usati END);
  END LOOP;

  -- Altrimenti un carnet con prestazioni residue.
  SELECT id INTO v_carnet FROM pal_carnet
   WHERE socio_id = p_socio AND servizio = v_servizio_carnet AND NOT annullato AND usati < totale
     AND (scadenza IS NULL OR scadenza >= v_giorno)
   ORDER BY scadenza NULLS LAST, created_at LIMIT 1;
  IF v_carnet IS NOT NULL THEN
    RETURN (SELECT jsonb_build_object('consentito', true, 'motivo', 'Carnet ' || nome || ': ' || (totale - usati) || ' residui',
                                      'carnet_id', id, 'residui', totale - usati, 'scadenza', scadenza)
              FROM pal_carnet WHERE id = v_carnet);
  END IF;

  IF v_motivo IS NULL THEN
    v_motivo := CASE WHEN EXISTS (SELECT 1 FROM pal_abbonamenti WHERE socio_id = p_socio AND fine < v_giorno)
                     THEN 'Abbonamento scaduto' ELSE 'Nessun abbonamento o carnet valido' END;
  END IF;
  RETURN jsonb_build_object('consentito', false, 'motivo', v_motivo);
END;
$$;

-- Registra l'ingresso (dal socio, dal codice del badge o dal QR) con
-- l'esito; se consentito, scala l'ingresso dall'abbonamento o dal carnet.
CREATE OR REPLACE FUNCTION pal_registra_ingresso(p_codice TEXT, p_sede UUID DEFAULT NULL, p_tipo TEXT DEFAULT 'manuale',
                                                 p_servizio TEXT DEFAULT 'sala_pesi')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  so pal_soci%ROWTYPE;
  v JSONB;
  v_carnet UUID;
  v_nome TEXT;
BEGIN
  IF NOT modulo_attivo('palestra') THEN RAISE EXCEPTION 'Modulo Palestra non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO so FROM pal_soci
   WHERE id::text = p_codice OR codice = upper(p_codice) OR badge = p_codice OR qr_token = p_codice LIMIT 1;
  IF so.id IS NULL THEN RETURN jsonb_build_object('consentito', false, 'motivo', 'Tessera non riconosciuta'); END IF;
  SELECT trim(nome || ' ' || COALESCE(cognome, '')) INTO v_nome FROM contatti WHERE id = so.contatto_id;
  v := pal_verifica_accesso(so.id, NOW(), p_servizio);
  IF (v->>'consentito')::boolean THEN
    IF v ? 'abbonamento_id' THEN
      PERFORM set_config('pal.interno', '1', true);
      UPDATE pal_abbonamenti SET accessi_usati = accessi_usati + 1
       WHERE id = (v->>'abbonamento_id')::uuid AND accessi_totali IS NOT NULL;
      PERFORM set_config('pal.interno', '0', true);
    ELSE
      v_carnet := pal_scala_carnet(so.id, CASE p_servizio WHEN 'sala_pesi' THEN 'ingressi' ELSE p_servizio END);
    END IF;
  END IF;
  INSERT INTO pal_accessi (socio_id, sede_id, tipo, servizio, consentito, motivo, abbonamento_id, carnet_id, created_by)
  VALUES (so.id, COALESCE(p_sede, so.sede_id), p_tipo, p_servizio, (v->>'consentito')::boolean, v->>'motivo',
          (v->>'abbonamento_id')::uuid, COALESCE(v_carnet, (v->>'carnet_id')::uuid), auth.uid());
  RETURN v || jsonb_build_object('socio_id', so.id, 'socio', v_nome, 'codice', so.codice);
END;
$$;

CREATE OR REPLACE FUNCTION pal_registra_uscita(p_socio UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT modulo_attivo('palestra') THEN RAISE EXCEPTION 'Modulo Palestra non attivo' USING ERRCODE = '42501'; END IF;
  UPDATE pal_accessi SET uscita_at = NOW()
   WHERE id = (SELECT id FROM pal_accessi WHERE socio_id = p_socio AND consentito AND uscita_at IS NULL
                  AND ingresso_at > NOW() - INTERVAL '18 hours' ORDER BY ingresso_at DESC LIMIT 1);
  RETURN FOUND;
END;
$$;

-- ═══ 18. RINNOVI (§6) ═══════════════════════════════════════════════
-- Rinnovo: nuovo abbonamento dal giorno dopo la fine, stessa formula (o
-- un'altra), rate generate; il vecchio resta nello storico.
CREATE OR REPLACE FUNCTION pal_rinnova(p_abbonamento UUID, p_formula UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  a pal_abbonamenti%ROWTYPE;
  v_id UUID;
BEGIN
  IF NOT modulo_attivo('palestra') THEN RAISE EXCEPTION 'Modulo Palestra non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO a FROM pal_abbonamenti WHERE id = p_abbonamento;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Abbonamento inesistente'; END IF;
  IF EXISTS (SELECT 1 FROM pal_abbonamenti WHERE rinnovo_di = a.id AND stato <> 'disdetto') THEN
    RAISE EXCEPTION 'Abbonamento già rinnovato' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO pal_abbonamenti (socio_id, formula_id, inizio, metodo_pagamento, rinnovo_di, created_by)
  VALUES (a.socio_id, COALESCE(p_formula, a.formula_id), GREATEST(a.fine + 1, pal_oggi()), a.metodo_pagamento, a.id,
          COALESCE(auth.uid(), a.created_by))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Ogni notte: scadono gli abbonamenti finiti, si rinnovano quelli con il
-- rinnovo automatico (se il socio non ha insoluti), si avvisano i soci a
-- 15 giorni dalla fine.
CREATE OR REPLACE FUNCTION pal_rinnovi_notturni()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  a RECORD;
  n_rinnovati INT := 0;
  n_scaduti INT := 0;
  n_avvisi INT := 0;
BEGIN
  FOR a IN SELECT ab.* FROM pal_abbonamenti ab
            WHERE ab.stato IN ('attivo', 'sospeso') AND ab.fine < pal_oggi() + 1 AND ab.rinnovo_automatico
              AND NOT EXISTS (SELECT 1 FROM pal_abbonamenti x WHERE x.rinnovo_di = ab.id)
              AND NOT EXISTS (SELECT 1 FROM pal_rate r WHERE r.socio_id = ab.socio_id AND r.stato = 'insoluta')
              AND NOT EXISTS (SELECT 1 FROM pal_soci s WHERE s.id = ab.socio_id AND s.ex_socio_at IS NOT NULL) LOOP
    PERFORM pal_rinnova(a.id);
    PERFORM pal_avvisa(a.socio_id, 'Abbonamento rinnovato', 'il tuo abbonamento è stato rinnovato automaticamente. Buon allenamento!');
    n_rinnovati := n_rinnovati + 1;
  END LOOP;
  PERFORM set_config('pal.interno', '1', true);
  UPDATE pal_abbonamenti SET stato = 'scaduto' WHERE stato IN ('attivo', 'sospeso') AND fine < pal_oggi();
  GET DIAGNOSTICS n_scaduti = ROW_COUNT;
  FOR a IN SELECT ab.* FROM pal_abbonamenti ab
            WHERE ab.stato = 'attivo' AND ab.fine = pal_oggi() + 15 AND NOT ab.rinnovo_automatico
              AND NOT EXISTS (SELECT 1 FROM pal_abbonamenti x WHERE x.rinnovo_di = ab.id) LOOP
    IF pal_avvisa(a.socio_id, 'Il tuo abbonamento scade tra 15 giorni',
         'il tuo abbonamento scade il ' || to_char(a.fine, 'DD/MM/YYYY') || '. Rinnovalo in reception per continuare senza interruzioni.') THEN
      n_avvisi := n_avvisi + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('rinnovati', n_rinnovati, 'scaduti', n_scaduti, 'avvisi', n_avvisi);
END;
$$;

-- ═══ 19. ARMADIETTI E CERTIFICAZIONI: SCADENZE ══════════════════════
CREATE OR REPLACE FUNCTION pal_armadietto_coerente()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.socio_id IS NOT NULL AND NEW.stato = 'libero' THEN NEW.stato := 'assegnato'; END IF;
  IF NEW.socio_id IS NULL AND NEW.stato = 'assegnato' THEN NEW.stato := 'libero'; END IF;
  IF NEW.stato = 'assegnato' AND (TG_OP = 'INSERT' OR OLD.socio_id IS DISTINCT FROM NEW.socio_id) THEN
    NEW.assegnato_dal := COALESCE(NEW.assegnato_dal, pal_oggi());
  END IF;
  IF NEW.stato <> 'assegnato' THEN NEW.assegnato_dal := NULL; NEW.assegnato_fino := NULL; NEW.cauzione_versata := false; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_armadietti_coerente BEFORE INSERT OR UPDATE ON pal_armadietti FOR EACH ROW EXECUTE FUNCTION pal_armadietto_coerente();

CREATE OR REPLACE FUNCTION pal_scadenza_riga()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_data DATE;
  v_desc TEXT;
  v_tipo TEXT;
  v_url TEXT;
BEGIN
  DELETE FROM scadenze_moduli WHERE entita = TG_TABLE_NAME AND entita_id = NEW.id AND stato = 'aperta';
  IF TG_TABLE_NAME = 'pal_armadietti' THEN
    v_data := CASE WHEN NEW.stato = 'assegnato' THEN NEW.assegnato_fino END;
    v_desc := 'Armadietto ' || NEW.numero; v_tipo := 'Fine assegnazione'; v_url := '/palestra/spogliatoi';
  ELSE
    v_data := NEW.scadenza;
    SELECT trim(d.nome || ' ' || d.cognome) || ' · ' || NEW.certificazione INTO v_desc FROM dipendenti d WHERE d.id = NEW.dipendente_id;
    v_tipo := 'Scadenza certificazione'; v_url := '/palestra/personale';
  END IF;
  IF v_data IS NOT NULL THEN
    INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
    VALUES ('palestra', TG_TABLE_NAME, NEW.id, v_tipo, v_desc, v_data, v_url, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_armadietti_scadenza AFTER INSERT OR UPDATE OF stato, assegnato_fino ON pal_armadietti
  FOR EACH ROW EXECUTE FUNCTION pal_scadenza_riga();
CREATE TRIGGER pal_certificazioni_scadenza AFTER INSERT OR UPDATE OF scadenza, certificazione ON pal_certificazioni
  FOR EACH ROW EXECUTE FUNCTION pal_scadenza_riga();

-- ═══ 20. VISTE ══════════════════════════════════════════════════════
-- Stato del socio (§1): attivo, sospeso, scaduto, ex, moroso, senza titolo.
CREATE VIEW pal_soci_stato WITH (security_invoker = true) AS
SELECT s.id AS socio_id, s.codice, s.contatto_id, s.sede_id, trim(k.nome || ' ' || COALESCE(k.cognome, '')) AS nome,
       k.email, k.telefono, s.data_iscrizione, s.badge, s.trainer_id, s.convenzione_id, s.certificato_scadenza,
       s.bloccato, s.condizioni_accettate, s.consenso_salute,
       CASE
         WHEN s.ex_socio_at IS NOT NULL THEN 'ex'
         WHEN EXISTS (SELECT 1 FROM pal_rate r WHERE r.socio_id = s.id AND r.stato = 'insoluta' AND r.pagatore = 'socio') THEN 'moroso'
         WHEN EXISTS (SELECT 1 FROM pal_abbonamenti a WHERE a.socio_id = s.id AND a.stato = 'attivo' AND pal_oggi() BETWEEN a.inizio AND a.fine
                         AND NOT pal_in_sospensione(a.id, pal_oggi())) THEN 'attivo'
         WHEN EXISTS (SELECT 1 FROM pal_abbonamenti a WHERE a.socio_id = s.id AND a.stato IN ('attivo', 'sospeso')
                         AND pal_oggi() BETWEEN a.inizio AND a.fine) THEN 'sospeso'
         WHEN EXISTS (SELECT 1 FROM pal_carnet c WHERE c.socio_id = s.id AND NOT c.annullato AND c.usati < c.totale
                         AND (c.scadenza IS NULL OR c.scadenza >= pal_oggi())) THEN 'attivo'
         WHEN EXISTS (SELECT 1 FROM pal_abbonamenti a WHERE a.socio_id = s.id) THEN 'scaduto'
         ELSE 'senza_titolo'
       END AS stato,
       (SELECT max(a.fine) FROM pal_abbonamenti a WHERE a.socio_id = s.id AND a.stato IN ('attivo', 'sospeso')) AS scadenza,
       (SELECT max(x.ingresso_at) FROM pal_accessi x WHERE x.socio_id = s.id AND x.consentito) AS ultimo_accesso,
       (SELECT COALESCE(sum(r.importo), 0) FROM pal_rate r WHERE r.socio_id = s.id AND r.pagatore = 'socio'
           AND r.stato IN ('da_pagare', 'fallita', 'insoluta') AND r.scadenza <= pal_oggi()) AS da_pagare
  FROM pal_soci s JOIN contatti k ON k.id = s.contatto_id;

CREATE VIEW pal_carnet_stato WITH (security_invoker = true) AS
SELECT c.*, c.totale - c.usati AS residui,
       CASE WHEN c.annullato THEN 'annullato' WHEN c.usati >= c.totale THEN 'esaurito'
            WHEN c.scadenza < pal_oggi() THEN 'scaduto' ELSE 'attivo' END AS stato
  FROM pal_carnet c;

-- Presenti in sala adesso (entrati da meno di 6 ore e non ancora usciti).
CREATE VIEW pal_presenti WITH (security_invoker = true) AS
SELECT DISTINCT ON (a.socio_id) a.socio_id, a.sede_id, a.ingresso_at, a.servizio, s.nome
  FROM pal_accessi a JOIN pal_soci_stato s ON s.socio_id = a.socio_id
 WHERE a.consentito AND a.uscita_at IS NULL AND a.ingresso_at > NOW() - INTERVAL '6 hours'
 ORDER BY a.socio_id, a.ingresso_at DESC;

-- ═══ 21. TRIGGER COMUNI, RLS, PERMESSI ══════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['pal_sedi','pal_sale','pal_convenzioni','pal_soci','pal_formule','pal_pacchetti','pal_abbonamenti',
                           'pal_carnet','pal_sospensioni','pal_rate','pal_armadietti','pal_prove','pal_certificazioni'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['pal_sedi','pal_sale','pal_convenzioni','pal_soci','pal_formule','pal_pacchetti','pal_abbonamenti',
                           'pal_carnet','pal_sospensioni','pal_rate','pal_accessi','pal_armadietti','pal_prove','pal_certificazioni'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;

  -- Configurazione e listini, convenzioni, certificazioni: la direzione.
  FOREACH t IN ARRAY ARRAY['pal_sedi','pal_sale','pal_convenzioni','pal_formule','pal_pacchetti','pal_certificazioni'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;

  -- Lavoro di reception: tutto il personale della palestra.
  FOREACH t IN ARRAY ARRAY['pal_soci','pal_abbonamenti','pal_sospensioni','pal_armadietti','pal_prove'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;
END $$;
-- Carnet, rate e accessi li scrivono le funzioni (vendita, incasso, ingresso):
-- nessuna policy di scrittura diretta. Il prezzo di un abbonamento venduto
-- lo cambia solo la direzione.
CREATE OR REPLACE FUNCTION pal_abbonamento_prezzo_protetto()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT puo_amministrazione() AND current_setting('pal.interno', true) IS DISTINCT FROM '1' THEN
    IF TG_OP = 'INSERT' AND NEW.prezzo IS NOT NULL THEN
      RAISE EXCEPTION 'Il prezzo lo applica il listino: per uno sconto serve la direzione' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.prezzo, NEW.quota_azienda, NEW.fine, NEW.accessi_usati) IS DISTINCT FROM
                            (OLD.prezzo, OLD.quota_azienda, OLD.fine, OLD.accessi_usati) THEN
      RAISE EXCEPTION 'Prezzo, scadenza e ingressi li cambia la direzione' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
-- Il nome fa scattare questo controllo prima del calcolo del prezzo (ordine alfabetico).
CREATE TRIGGER pal_abbonamenti_a_protetto BEFORE INSERT OR UPDATE ON pal_abbonamenti
  FOR EACH ROW EXECUTE FUNCTION pal_abbonamento_prezzo_protetto();

GRANT SELECT ON pal_soci_stato, pal_carnet_stato, pal_presenti TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'pal_socio_prepara()', 'pal_socio_iscritto()', 'pal_abbonamento_prepara()', 'pal_abbonamento_rate()',
    'pal_abbonamento_scadenza()', 'pal_sospensione_applica()', 'pal_armadietto_coerente()', 'pal_scadenza_riga()',
    'pal_abbonamento_prezzo_protetto()', 'pal_avvisa(uuid,text,text)', 'pal_notifica_direzione(text,text,text,notifica_tipo)',
    'pal_scala_carnet(uuid,text,date)', 'pal_rendi_carnet(uuid)', 'pal_rate_scadute()', 'pal_rinnovi_notturni()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
    'pal_oggi()', 'pal_euro(numeric)', 'pal_pipeline()', 'pal_in_sospensione(uuid,date)',
    'pal_vendi_pacchetto(uuid,uuid,text)', 'pal_incassa_rata(uuid,pagamento_metodo,text)', 'pal_esito_addebito(uuid,boolean,text)',
    'pal_verifica_accesso(uuid,timestamptz,text)', 'pal_registra_ingresso(text,uuid,text,text)', 'pal_registra_uscita(uuid)',
    'pal_rinnova(uuid,uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('palestra-rinnovi', 'palestra-insoluti');
SELECT cron.schedule('palestra-rinnovi', '15 2 * * *', $$SELECT pal_rinnovi_notturni()$$);
SELECT cron.schedule('palestra-insoluti', '20 6 * * *', $$SELECT pal_rate_scadute()$$);

SELECT applica_protezioni_tabelle();
