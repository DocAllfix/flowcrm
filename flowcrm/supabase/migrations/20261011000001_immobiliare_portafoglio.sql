-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Agenzia immobiliare (Sprint 7) · 1/2: agenti e rete, fascicolo
-- dell'immobile con proprietari, documenti e storico dei prezzi, incarichi,
-- valutazioni con i comparabili, annunci e feed per i portali, richieste di
-- acquirenti e conduttori, lead, campagne pubblicitarie, pipeline di
-- acquisizione e di trattativa sul nucleo, matching domanda/offerta.
--
-- Documento Agenzia immobiliare §1–12, §16, §20, §22, §27.
--
-- Il matching sta in una funzione sola (`imm_match`): filtri che escludono
-- (contratto, prezzo oltre il 10% del budget, tipologia, comune, due camere
-- in meno) e un punteggio su 100 con i motivi. I portali sono predisposti:
-- `imm_feed_annunci` produce il file da caricare.
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. IMPOSTAZIONI, AGENTI, RETE (§20, §27) ═══════════════════════
CREATE TABLE imm_impostazioni (
  id                        INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  modulo                    TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  agenzia                   TEXT NOT NULL,
  provvigione_venditore_pct NUMERIC(5,2) NOT NULL DEFAULT 3 CHECK (provvigione_venditore_pct BETWEEN 0 AND 20),
  provvigione_acquirente_pct NUMERIC(5,2) NOT NULL DEFAULT 3 CHECK (provvigione_acquirente_pct BETWEEN 0 AND 20),
  provvigione_minima        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (provvigione_minima >= 0),
  locazione_mensilita       NUMERIC(4,2) NOT NULL DEFAULT 1 CHECK (locazione_mensilita >= 0),  -- provvigione di locazione, per lato
  quota_agente_pct          NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (quota_agente_pct BETWEEN 0 AND 100),
  istat_pct                 NUMERIC(5,2) NOT NULL DEFAULT 75 CHECK (istat_pct BETWEEN 0 AND 100),  -- quota della variazione ISTAT applicata
  report_giorni             INT NOT NULL DEFAULT 30 CHECK (report_giorni > 0),                      -- ogni quanto il report al proprietario
  lead_risposta_ore         INT NOT NULL DEFAULT 24 CHECK (lead_risposta_ore > 0),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                UUID REFERENCES user_profiles(id),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                UUID REFERENCES user_profiles(id)
);

CREATE TABLE imm_agenti (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                   TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  user_id                  UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  quota_pct                NUMERIC(5,2) CHECK (quota_pct BETWEEN 0 AND 100),   -- NULL = quella dell'agenzia
  zone                     TEXT[] NOT NULL DEFAULT '{}',
  obiettivo_acquisizioni   INT CHECK (obiettivo_acquisizioni >= 0),           -- al mese
  obiettivo_chiusure       INT CHECK (obiettivo_chiusure >= 0),
  obiettivo_provvigioni    NUMERIC(12,2) CHECK (obiettivo_provvigioni >= 0),
  iscrizione_ruolo         TEXT,                                               -- iscrizione al registro dei mediatori
  attivo                   BOOLEAN NOT NULL DEFAULT true,
  note                     TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               UUID REFERENCES user_profiles(id),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by               UUID REFERENCES user_profiles(id)
);

CREATE OR REPLACE FUNCTION imm_agente_corrente()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT id FROM imm_agenti WHERE user_id = auth.uid() AND attivo
$$;

-- Agenzie partner, segnalatori, geometri, architetti, notai, consulenti e mediatori creditizi.
CREATE TABLE imm_collaboratori (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  tipo              TEXT NOT NULL CHECK (tipo IN ('agenzia', 'segnalatore', 'geometra', 'architetto', 'notaio', 'consulente_finanziario', 'mediatore_creditizio', 'altro')),
  nome              TEXT NOT NULL,
  organizzazione_id UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  contatto_id       UUID REFERENCES contatti(id) ON DELETE SET NULL,
  telefono          TEXT,
  email             TEXT,
  provvigione_pct   NUMERIC(5,2) CHECK (provvigione_pct BETWEEN 0 AND 100),  -- quota abituale in co-mediazione o segnalazione
  attivo            BOOLEAN NOT NULL DEFAULT true,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);

-- ═══ 2. IMMOBILI (§1–2) ═════════════════════════════════════════════
CREATE TABLE imm_immobili (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  codice                TEXT UNIQUE,
  tipologia             TEXT NOT NULL DEFAULT 'appartamento' CHECK (tipologia IN ('appartamento', 'villa', 'villetta', 'ufficio', 'negozio', 'capannone', 'terreno',
                          'industriale', 'commerciale', 'albergo', 'ricettivo', 'box', 'agricolo', 'nuova_costruzione', 'fabbricato', 'altro')),
  contratto             TEXT NOT NULL DEFAULT 'vendita' CHECK (contratto IN ('vendita', 'affitto', 'entrambi')),
  titolo                TEXT,
  indirizzo             TEXT NOT NULL,
  comune                TEXT NOT NULL,
  provincia             TEXT,
  cap                   TEXT,
  zona                  TEXT,
  piano                 TEXT,
  superficie_commerciale NUMERIC(9,2) CHECK (superficie_commerciale > 0),
  superficie_calpestabile NUMERIC(9,2) CHECK (superficie_calpestabile > 0),
  locali                INT CHECK (locali >= 0),
  camere                INT CHECK (camere >= 0),
  bagni                 INT CHECK (bagni >= 0),
  balconi               INT NOT NULL DEFAULT 0 CHECK (balconi >= 0),
  terrazzi              INT NOT NULL DEFAULT 0 CHECK (terrazzi >= 0),
  giardino              BOOLEAN NOT NULL DEFAULT false,
  garage                BOOLEAN NOT NULL DEFAULT false,
  posto_auto            BOOLEAN NOT NULL DEFAULT false,
  cantina               BOOLEAN NOT NULL DEFAULT false,
  ascensore             BOOLEAN NOT NULL DEFAULT false,
  condizionamento       BOOLEAN NOT NULL DEFAULT false,
  arredato              TEXT NOT NULL DEFAULT 'no' CHECK (arredato IN ('no', 'si', 'parziale')),
  classe_energetica     TEXT CHECK (classe_energetica IN ('A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G', 'esente', 'in_attesa')),
  ipe                   NUMERIC(7,2),                       -- kWh/m² anno
  stato_conservazione   TEXT CHECK (stato_conservazione IN ('nuovo', 'ristrutturato', 'ottimo', 'buono', 'da_ristrutturare', 'grezzo')),
  anno_costruzione      INT CHECK (anno_costruzione BETWEEN 1000 AND 2100),
  riscaldamento         TEXT,                               -- autonomo, centralizzato, pompa di calore…
  prezzo                NUMERIC(12,2) CHECK (prezzo >= 0),  -- richiesto per la vendita
  canone                NUMERIC(10,2) CHECK (canone >= 0),  -- richiesto al mese per la locazione
  spese_condominiali    NUMERIC(9,2) CHECK (spese_condominiali >= 0),   -- al mese
  prezzo_iniziale       NUMERIC(12,2),                      -- il primo prezzo, per il report dei ribassi
  stato                 TEXT NOT NULL DEFAULT 'in_acquisizione' CHECK (stato IN ('in_acquisizione', 'in_valutazione', 'disponibile', 'sotto_offerta',
                          'venduto', 'affittato', 'ritirato')),
  agente_id             UUID REFERENCES imm_agenti(id) ON DELETE SET NULL,
  descrizione           TEXT,
  pubblicato_il         DATE,                               -- primo giorno sul mercato
  prezzo_vendita        NUMERIC(12,2),                      -- prezzo finale al rogito
  concluso_il           DATE,
  note                  TEXT,
  prezzo_mq             NUMERIC(12,2) GENERATED ALWAYS AS (CASE WHEN superficie_commerciale > 0 AND prezzo IS NOT NULL THEN round(prezzo / superficie_commerciale, 2) END) STORED,
  ricerca               TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple',
                          COALESCE(codice, '') || ' ' || COALESCE(titolo, '') || ' ' || indirizzo || ' ' || comune || ' ' || COALESCE(zona, ''))) STORED,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_imm_immobili_stato ON imm_immobili (stato, comune);
CREATE INDEX idx_imm_immobili_ricerca ON imm_immobili USING gin (ricerca);
CREATE INDEX idx_imm_immobili_agente ON imm_immobili (agente_id);

-- Storico dei prezzi: ogni ritocco resta (il report al proprietario conta i ribassi).
CREATE TABLE imm_prezzi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo      TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  immobile_id UUID NOT NULL REFERENCES imm_immobili(id) ON DELETE CASCADE,
  prezzo      NUMERIC(12,2),
  canone      NUMERIC(10,2),
  dal         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_imm_prezzi ON imm_prezzi (immobile_id, dal);

-- ═══ 3. PROPRIETARI (§3) ════════════════════════════════════════════
CREATE TABLE imm_proprietari (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  immobile_id       UUID NOT NULL REFERENCES imm_immobili(id) ON DELETE CASCADE,
  contatto_id       UUID REFERENCES contatti(id) ON DELETE RESTRICT,
  organizzazione_id UUID REFERENCES organizzazioni(id) ON DELETE RESTRICT,
  quota_pct         NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (quota_pct > 0 AND quota_pct <= 100),
  titolo            TEXT NOT NULL DEFAULT 'piena_proprieta' CHECK (titolo IN ('piena_proprieta', 'nuda_proprieta', 'usufrutto', 'comproprieta', 'superficie', 'altro')),
  referente         BOOLEAN NOT NULL DEFAULT false,         -- chi riceve il report
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  CHECK ((contatto_id IS NOT NULL) <> (organizzazione_id IS NOT NULL))
);
CREATE INDEX idx_imm_proprietari_immobile ON imm_proprietari (immobile_id);
CREATE INDEX idx_imm_proprietari_contatto ON imm_proprietari (contatto_id);

-- ═══ 4. DOCUMENTI DELL'IMMOBILE (§16) ═══════════════════════════════
-- Ogni documento è una riga con il suo stato; il file è un allegato della riga.
CREATE TABLE imm_documenti (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo      TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  immobile_id UUID NOT NULL REFERENCES imm_immobili(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('atto_provenienza', 'visura_catastale', 'planimetria_catastale', 'visura_ipotecaria', 'ape', 'conformita_urbanistica',
                'conformita_catastale', 'certificazioni_impianti', 'regolamento_condominiale', 'verbali_condominiali', 'tabelle_millesimali',
                'documentazione_edilizia', 'permessi', 'autorizzazioni', 'relazione_tecnica', 'altro')),
  descrizione TEXT,
  obbligatorio BOOLEAN NOT NULL DEFAULT false,
  stato       TEXT NOT NULL DEFAULT 'mancante' CHECK (stato IN ('mancante', 'richiesto', 'presente', 'non_necessario')),
  ricevuto_il DATE,
  scadenza    DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);
CREATE UNIQUE INDEX idx_imm_documenti_tipo ON imm_documenti (immobile_id, tipo) WHERE tipo <> 'altro';

-- ═══ 5. INCARICHI (§6) ══════════════════════════════════════════════
CREATE TABLE imm_incarichi (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  codice            TEXT UNIQUE,
  immobile_id       UUID NOT NULL REFERENCES imm_immobili(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL DEFAULT 'vendita' CHECK (tipo IN ('vendita', 'locazione')),
  esclusiva         BOOLEAN NOT NULL DEFAULT true,
  conferito_il      DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  durata_mesi       INT NOT NULL DEFAULT 6 CHECK (durata_mesi BETWEEN 1 AND 60),
  scadenza          DATE,
  prezzo_richiesto  NUMERIC(12,2) CHECK (prezzo_richiesto >= 0),
  prezzo_minimo     NUMERIC(12,2) CHECK (prezzo_minimo >= 0),
  provvigione_pct   NUMERIC(5,2) CHECK (provvigione_pct BETWEEN 0 AND 20),
  provvigione_fissa NUMERIC(10,2) CHECK (provvigione_fissa >= 0),
  condizioni        TEXT,
  obiettivi         TEXT,
  agente_id         UUID REFERENCES imm_agenti(id) ON DELETE SET NULL,
  rinnovo_tacito    BOOLEAN NOT NULL DEFAULT false,
  firmato_il        DATE,
  stato             TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo', 'scaduto', 'revocato', 'concluso')),
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  CHECK (prezzo_minimo IS NULL OR prezzo_richiesto IS NULL OR prezzo_minimo <= prezzo_richiesto)
);
-- Un immobile ha un solo incarico in corso per tipo.
CREATE UNIQUE INDEX idx_imm_incarichi_attivo ON imm_incarichi (immobile_id, tipo) WHERE stato = 'attivo';

-- ═══ 6. VALUTAZIONI (§8) ════════════════════════════════════════════
CREATE TABLE imm_valutazioni (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  codice            TEXT UNIQUE,
  immobile_id       UUID NOT NULL REFERENCES imm_immobili(id) ON DELETE CASCADE,
  data              DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  superficie        NUMERIC(9,2) CHECK (superficie > 0),
  comparabili       JSONB NOT NULL DEFAULT '[]',     -- [{codice, indirizzo, superficie, prezzo, prezzo_mq, fonte}]
  correttivi        JSONB NOT NULL DEFAULT '[]',     -- [{voce, pct}]
  valore_mq         NUMERIC(10,2),                   -- media dei comparabili
  valore_automatico NUMERIC(12,2),
  valore_agente     NUMERIC(12,2) CHECK (valore_agente >= 0),
  valore_min        NUMERIC(12,2),
  valore_max        NUMERIC(12,2),
  note              TEXT,
  agente_id         UUID REFERENCES imm_agenti(id) ON DELETE SET NULL,
  presentata_il     DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_imm_valutazioni_immobile ON imm_valutazioni (immobile_id, data DESC);

-- ═══ 7. ANNUNCI (§9–10) ═════════════════════════════════════════════
CREATE TABLE imm_annunci (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo        TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  immobile_id   UUID NOT NULL UNIQUE REFERENCES imm_immobili(id) ON DELETE CASCADE,
  titolo        TEXT NOT NULL,
  descrizione   TEXT NOT NULL,
  stato         TEXT NOT NULL DEFAULT 'bozza' CHECK (stato IN ('bozza', 'pubblicato', 'sospeso', 'ritirato')),
  portali       TEXT[] NOT NULL DEFAULT '{}',          -- dove va pubblicato (predisposto)
  sito          BOOLEAN NOT NULL DEFAULT true,
  social        BOOLEAN NOT NULL DEFAULT false,
  video_url     TEXT,
  tour_url      TEXT,                                  -- virtual tour
  pubblicato_il DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id)
);

-- ═══ 8. CAMPAGNE PUBBLICITARIE (§22) ════════════════════════════════
CREATE TABLE imm_marketing (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  codice       TEXT UNIQUE,
  nome         TEXT NOT NULL,
  canale       TEXT NOT NULL DEFAULT 'portale' CHECK (canale IN ('portale', 'social', 'google', 'cartellone', 'volantino', 'open_house', 'email', 'sms',
                 'newsletter', 'evento', 'altro')),
  obiettivo    TEXT NOT NULL DEFAULT 'vendita' CHECK (obiettivo IN ('acquisizione', 'vendita', 'locazione', 'immagine')),
  immobile_id  UUID REFERENCES imm_immobili(id) ON DELETE SET NULL,
  campagna_id  UUID REFERENCES campagne(id) ON DELETE SET NULL,   -- invio email o SMS dalle fondamenta
  dal          DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  al           DATE,
  costo        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id),
  CHECK (al IS NULL OR al >= dal)
);

-- ═══ 9. RICHIESTE DI ACQUIRENTI E CONDUTTORI (§4–5) ═════════════════
CREATE TABLE imm_richieste (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo          TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  codice          TEXT UNIQUE,
  contatto_id     UUID NOT NULL REFERENCES contatti(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL DEFAULT 'acquisto' CHECK (tipo IN ('acquisto', 'affitto')),
  tipo_cliente    TEXT NOT NULL DEFAULT 'privato' CHECK (tipo_cliente IN ('privato', 'famiglia', 'investitore', 'azienda', 'studente', 'altro')),
  tipologie       TEXT[] NOT NULL DEFAULT '{}',        -- vuoto = qualsiasi
  comuni          TEXT[] NOT NULL DEFAULT '{}',
  zone            TEXT[] NOT NULL DEFAULT '{}',
  budget_min      NUMERIC(12,2) CHECK (budget_min >= 0),
  budget_max      NUMERIC(12,2) CHECK (budget_max >= 0),
  superficie_min  NUMERIC(9,2) CHECK (superficie_min > 0),
  camere_min      INT CHECK (camere_min >= 0),
  bagni_min       INT CHECK (bagni_min >= 0),
  requisiti       TEXT[] NOT NULL DEFAULT '{}',        -- ascensore, terrazzo, balcone, giardino, garage, posto_auto, cantina, arredato, condizionamento
  finanziamento   BOOLEAN NOT NULL DEFAULT false,       -- serve un mutuo
  tempistica      TEXT,
  preferenze      TEXT,
  -- Per chi cerca in affitto (§5).
  reddito_mensile NUMERIC(10,2) CHECK (reddito_mensile >= 0),
  garanzie        TEXT,
  referenze       TEXT,
  agente_id       UUID REFERENCES imm_agenti(id) ON DELETE SET NULL,
  stato           TEXT NOT NULL DEFAULT 'attiva' CHECK (stato IN ('attiva', 'sospesa', 'soddisfatta', 'persa')),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id),
  CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max)
);
CREATE INDEX idx_imm_richieste_contatto ON imm_richieste (contatto_id);

-- Immobili proposti a una richiesta: preferiti, scartati, visitati.
CREATE TABLE imm_selezioni (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo      TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  richiesta_id UUID NOT NULL REFERENCES imm_richieste(id) ON DELETE CASCADE,
  immobile_id UUID NOT NULL REFERENCES imm_immobili(id) ON DELETE CASCADE,
  punteggio   INT,
  stato       TEXT NOT NULL DEFAULT 'proposto' CHECK (stato IN ('proposto', 'inviato', 'preferito', 'scartato', 'visitato')),
  inviato_il  DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id),
  UNIQUE (richiesta_id, immobile_id)
);

-- ═══ 10. LEAD (§11) ═════════════════════════════════════════════════
CREATE TABLE imm_lead (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'immobiliare' CHECK (modulo = 'immobiliare'),
  codice            TEXT UNIQUE,
  tipo              TEXT NOT NULL DEFAULT 'acquirente' CHECK (tipo IN ('acquirente', 'conduttore', 'proprietario', 'locatore')),
  nome              TEXT NOT NULL,
  telefono          TEXT,
  email             TEXT,
  contatto_id       UUID REFERENCES contatti(id) ON DELETE SET NULL,
  origine           TEXT NOT NULL DEFAULT 'portale' CHECK (origine IN ('portale', 'sito', 'social', 'telefono', 'insegna', 'passaparola', 'campagna', 'segnalatore', 'altro')),
  fonte             TEXT,                                -- quale portale, quale annuncio
  immobile_id       UUID REFERENCES imm_immobili(id) ON DELETE SET NULL,
  marketing_id      UUID REFERENCES imm_marketing(id) ON DELETE SET NULL,
  collaboratore_id  UUID REFERENCES imm_collaboratori(id) ON DELETE SET NULL,   -- segnalatore
  messaggio         TEXT,
  agente_id         UUID REFERENCES imm_agenti(id) ON DELETE SET NULL,
  stato             TEXT NOT NULL DEFAULT 'nuovo' CHECK (stato IN ('nuovo', 'contattato', 'qualificato', 'appuntamento', 'convertito', 'perso')),
  priorita          TEXT NOT NULL DEFAULT 'media' CHECK (priorita IN ('bassa', 'media', 'alta')),
  ricevuto_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima_interazione_at TIMESTAMPTZ,
  prossima_azione   TEXT,
  prossima_azione_il DATE,
  deal_id           UUID REFERENCES deals(id) ON DELETE SET NULL,
  richiesta_id      UUID REFERENCES imm_richieste(id) ON DELETE SET NULL,
  motivo_perdita    TEXT,
  sollecito_at      TIMESTAMPTZ,                         -- avviso «senza risposta» già dato
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  CHECK (telefono IS NOT NULL OR email IS NOT NULL OR contatto_id IS NOT NULL)
);
CREATE INDEX idx_imm_lead_stato ON imm_lead (stato, ricevuto_at DESC);

-- ═══ 11. LEGAMI CON IL NUCLEO: TRATTATIVE E ATTIVITÀ (§7, §15, §21) ═
ALTER TABLE deals ADD COLUMN immobile_id UUID REFERENCES imm_immobili(id) ON DELETE SET NULL;
CREATE INDEX idx_deals_immobile ON deals (immobile_id);
ALTER TABLE attivita ADD COLUMN immobile_id UUID REFERENCES imm_immobili(id) ON DELETE CASCADE;
CREATE INDEX idx_attivita_immobile ON attivita (immobile_id);

INSERT INTO pipelines (nome, is_default)
SELECT x.nome, false FROM (VALUES ('Immobiliare · Acquisizione'), ('Immobiliare · Trattative')) x(nome)
 WHERE NOT EXISTS (SELECT 1 FROM pipelines p WHERE p.nome = x.nome);
INSERT INTO pipeline_stages (pipeline_id, nome, ordine, probabilita, is_won, is_lost)
SELECT p.id, s.nome, s.ordine, s.prob, s.won, s.lost
  FROM pipelines p,
       (VALUES ('Lead proprietario', 1, 5, false, false), ('Contatto', 2, 10, false, false), ('Appuntamento', 3, 25, false, false),
               ('Valutazione', 4, 40, false, false), ('Proposta di incarico', 5, 60, false, false), ('Incarico acquisito', 6, 100, true, false),
               ('Perso', 7, 0, false, true)) s(nome, ordine, prob, won, lost)
 WHERE p.nome = 'Immobiliare · Acquisizione' AND NOT EXISTS (SELECT 1 FROM pipeline_stages x WHERE x.pipeline_id = p.id);
INSERT INTO pipeline_stages (pipeline_id, nome, ordine, probabilita, is_won, is_lost)
SELECT p.id, s.nome, s.ordine, s.prob, s.won, s.lost
  FROM pipelines p,
       (VALUES ('Interesse', 1, 5, false, false), ('Visita', 2, 15, false, false), ('Seconda visita', 3, 30, false, false),
               ('Offerta', 4, 50, false, false), ('Controproposta', 5, 60, false, false), ('Accettazione', 6, 80, false, false),
               ('Preliminare', 7, 95, false, false), ('Rogito', 8, 100, true, false), ('Persa', 9, 0, false, true)) s(nome, ordine, prob, won, lost)
 WHERE p.nome = 'Immobiliare · Trattative' AND NOT EXISTS (SELECT 1 FROM pipeline_stages x WHERE x.pipeline_id = p.id);

CREATE OR REPLACE FUNCTION imm_pipeline(p_nome TEXT)
RETURNS UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT id FROM pipelines WHERE nome = 'Immobiliare · ' || p_nome LIMIT 1
$$;

-- Porta avanti (mai indietro) la trattativa di un cliente su un immobile; la crea se non c'è.
CREATE OR REPLACE FUNCTION imm_avanza(p_pipeline TEXT, p_contatto UUID, p_immobile UUID, p_fase TEXT, p_valore NUMERIC DEFAULT NULL,
                                      p_organizzazione UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_pipe UUID := imm_pipeline(p_pipeline);
  v_stage pipeline_stages%ROWTYPE;
  v_deal deals%ROWTYPE;
  v_ordine INT;
  v_nome TEXT;
  v_resp UUID;
BEGIN
  IF p_contatto IS NULL AND p_organizzazione IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_stage FROM pipeline_stages WHERE pipeline_id = v_pipe AND nome = p_fase;
  SELECT d.* INTO v_deal FROM deals d
   WHERE d.pipeline_id = v_pipe AND d.attivo AND d.chiuso_at IS NULL AND d.immobile_id IS NOT DISTINCT FROM p_immobile
     AND (d.contatto_id = p_contatto OR (p_contatto IS NULL AND d.organizzazione_id = p_organizzazione))
   ORDER BY d.created_at DESC LIMIT 1;
  IF v_deal.id IS NULL THEN
    SELECT COALESCE(i.codice || ' · ', '') || COALESCE(trim(k.nome || ' ' || COALESCE(k.cognome, '')), o.ragione_sociale, '')
      INTO v_nome FROM (SELECT 1) x LEFT JOIN imm_immobili i ON i.id = p_immobile LEFT JOIN contatti k ON k.id = p_contatto
      LEFT JOIN organizzazioni o ON o.id = p_organizzazione;
    SELECT a.user_id INTO v_resp FROM imm_immobili i JOIN imm_agenti a ON a.id = i.agente_id WHERE i.id = p_immobile;
    INSERT INTO deals (nome, contatto_id, organizzazione_id, pipeline_id, stage_id, importo, immobile_id, responsabile_id, created_by)
    VALUES (COALESCE(NULLIF(v_nome, ''), 'Trattativa'), p_contatto, p_organizzazione, v_pipe, v_stage.id, COALESCE(p_valore, 0), p_immobile,
            COALESCE(v_resp, auth.uid()), COALESCE(auth.uid(), v_resp))
    RETURNING * INTO v_deal;
    RETURN v_deal.id;
  END IF;
  SELECT ordine INTO v_ordine FROM pipeline_stages WHERE id = v_deal.stage_id;
  IF v_stage.ordine > v_ordine OR v_stage.is_won THEN
    UPDATE deals SET stage_id = v_stage.id, importo = COALESCE(p_valore, importo) WHERE id = v_deal.id;
  ELSIF p_valore IS NOT NULL THEN
    UPDATE deals SET importo = p_valore WHERE id = v_deal.id;
  END IF;
  RETURN v_deal.id;
END;
$$;

-- ═══ 12. PREPARAZIONI E AUTOMATISMI ═════════════════════════════════
CREATE OR REPLACE FUNCTION imm_oggi()
RETURNS DATE LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT (NOW() AT TIME ZONE 'Europe/Rome')::date
$$;

CREATE OR REPLACE FUNCTION imm_euro(p NUMERIC)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT replace(replace(replace(to_char(p, 'FM999G999G990D00'), ',', '#'), '.', ','), '#', '.') || ' €'
$$;

CREATE OR REPLACE FUNCTION imm_notifica_direzione(p_titolo TEXT, p_messaggio TEXT, p_url TEXT, p_tipo notifica_tipo DEFAULT 'info')
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE dest UUID;
BEGIN
  FOR dest IN SELECT id FROM user_profiles WHERE attivo AND ruolo IN ('admin', 'manager') LOOP
    PERFORM crea_notifica(dest, p_tipo, p_titolo, p_messaggio, p_url);
  END LOOP;
END;
$$;

-- Avviso all'agente (o, senza agente, alla direzione).
CREATE OR REPLACE FUNCTION imm_notifica_agente(p_agente UUID, p_titolo TEXT, p_messaggio TEXT, p_url TEXT, p_tipo notifica_tipo DEFAULT 'info')
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_user UUID;
BEGIN
  SELECT user_id INTO v_user FROM imm_agenti WHERE id = p_agente AND attivo;
  IF v_user IS NULL THEN PERFORM imm_notifica_direzione(p_titolo, p_messaggio, p_url, p_tipo);
  ELSE PERFORM crea_notifica(v_user, p_tipo, p_titolo, p_messaggio, p_url); END IF;
END;
$$;

-- Email a un contatto (servizio, non promozione). SMS e WhatsApp predisposti.
CREATE OR REPLACE FUNCTION imm_scrivi(p_contatto UUID, p_oggetto TEXT, p_testo TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE k contatti%ROWTYPE;
BEGIN
  SELECT * INTO k FROM contatti WHERE id = p_contatto;
  IF k.email IS NULL THEN RETURN false; END IF;
  INSERT INTO mail_outbox (destinatario, oggetto, corpo_testo, corpo_html)
  VALUES (k.email, p_oggetto, 'Gentile ' || k.nome || E',\n\n' || p_testo,
          '<div style="font-family:system-ui,sans-serif;line-height:1.5"><p>Gentile ' || html_escape(k.nome) || ',</p><p>'
            || replace(html_escape(p_testo), E'\n', '<br>') || '</p></div>');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION imm_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_pref TEXT;
  i imm_immobili%ROWTYPE;
BEGIN
  v_pref := CASE TG_TABLE_NAME WHEN 'imm_immobili' THEN 'IMM' WHEN 'imm_incarichi' THEN 'INC' WHEN 'imm_valutazioni' THEN 'VAL'
                               WHEN 'imm_richieste' THEN 'RCH' WHEN 'imm_lead' THEN 'LDI' WHEN 'imm_marketing' THEN 'MKI' END;
  -- Il campo codice esiste solo su alcune tabelle: la condizione si annida (in PL/pgSQL l'AND non si ferma al primo falso).
  IF v_pref IS NOT NULL AND TG_OP = 'INSERT' THEN
    IF NEW.codice IS NULL THEN NEW.codice := genera_codice(v_pref); END IF;
  END IF;

  IF TG_TABLE_NAME = 'imm_immobili' THEN
    IF NEW.prezzo_iniziale IS NULL AND NEW.prezzo IS NOT NULL THEN NEW.prezzo_iniziale := NEW.prezzo; END IF;
    IF NEW.stato = 'disponibile' AND NEW.pubblicato_il IS NULL THEN NEW.pubblicato_il := imm_oggi(); END IF;
    IF NEW.stato IN ('venduto', 'affittato') AND NEW.concluso_il IS NULL THEN NEW.concluso_il := imm_oggi(); END IF;
    IF NEW.contratto = 'affitto' AND NEW.prezzo IS NOT NULL AND NEW.canone IS NULL THEN
      RAISE EXCEPTION 'Per un immobile in affitto si indica il canone' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF TG_TABLE_NAME = 'imm_incarichi' THEN
    SELECT * INTO i FROM imm_immobili WHERE id = NEW.immobile_id;
    NEW.scadenza := COALESCE(NEW.scadenza, (NEW.conferito_il + make_interval(months => NEW.durata_mesi))::date);
    IF TG_OP = 'UPDATE' AND NEW.durata_mesi <> OLD.durata_mesi AND NEW.scadenza = OLD.scadenza THEN
      NEW.scadenza := (NEW.conferito_il + make_interval(months => NEW.durata_mesi))::date;
    END IF;
    NEW.agente_id := COALESCE(NEW.agente_id, i.agente_id, imm_agente_corrente());
    NEW.prezzo_richiesto := COALESCE(NEW.prezzo_richiesto, CASE WHEN NEW.tipo = 'vendita' THEN i.prezzo ELSE i.canone END);
    IF NEW.tipo = 'vendita' AND NEW.provvigione_pct IS NULL AND NEW.provvigione_fissa IS NULL THEN
      SELECT provvigione_venditore_pct INTO NEW.provvigione_pct FROM imm_impostazioni WHERE id = 1;
    END IF;
  ELSIF TG_TABLE_NAME = 'imm_valutazioni' THEN
    NEW.agente_id := COALESCE(NEW.agente_id, imm_agente_corrente());
  ELSIF TG_TABLE_NAME = 'imm_lead' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.agente_id := COALESCE(NEW.agente_id, (SELECT agente_id FROM imm_immobili WHERE id = NEW.immobile_id));
      IF NEW.contatto_id IS NULL AND NEW.email IS NOT NULL THEN
        SELECT id INTO NEW.contatto_id FROM contatti WHERE lower(email) = lower(NEW.email) ORDER BY created_at LIMIT 1;
      END IF;
    END IF;
    IF NEW.stato <> 'nuovo' AND (TG_OP = 'INSERT' OR OLD.stato IS DISTINCT FROM NEW.stato) THEN NEW.ultima_interazione_at := NOW(); END IF;
    IF NEW.stato = 'perso' AND COALESCE(trim(NEW.motivo_perdita), '') = '' THEN
      RAISE EXCEPTION 'Indica perché il lead è perso' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF TG_TABLE_NAME = 'imm_annunci' THEN
    IF NEW.stato = 'pubblicato' AND (TG_OP = 'INSERT' OR OLD.stato <> 'pubblicato') THEN
      IF (SELECT stato FROM imm_immobili WHERE id = NEW.immobile_id) NOT IN ('disponibile', 'sotto_offerta') THEN
        RAISE EXCEPTION 'Si pubblica solo un immobile disponibile' USING ERRCODE = 'check_violation';
      END IF;
      NEW.pubblicato_il := COALESCE(NEW.pubblicato_il, imm_oggi());
    END IF;
  ELSIF TG_TABLE_NAME = 'imm_documenti' THEN
    IF NEW.stato = 'presente' AND NEW.ricevuto_il IS NULL THEN NEW.ricevuto_il := imm_oggi(); END IF;
    IF NEW.stato <> 'presente' THEN NEW.ricevuto_il := NULL; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['imm_immobili', 'imm_incarichi', 'imm_valutazioni', 'imm_richieste', 'imm_lead', 'imm_marketing', 'imm_annunci', 'imm_documenti'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_prepara BEFORE INSERT OR UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION imm_prepara()', t);
  END LOOP;
END $$;

-- Quote di proprietà: insieme non superano il 100%.
CREATE OR REPLACE FUNCTION imm_quote_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_tot NUMERIC;
BEGIN
  SELECT COALESCE(sum(quota_pct), 0) INTO v_tot FROM imm_proprietari WHERE immobile_id = NEW.immobile_id AND id <> NEW.id AND titolo = NEW.titolo;
  IF v_tot + NEW.quota_pct > 100 THEN
    RAISE EXCEPTION 'Le quote di proprietà superano il 100%% (già assegnato %%%)', replace(to_char(v_tot, 'FM990.##'), '.', ',') USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_proprietari_quote BEFORE INSERT OR UPDATE ON imm_proprietari FOR EACH ROW EXECUTE FUNCTION imm_quote_controlla();

-- Immobile nuovo: i documenti che servono sempre, da raccogliere.
-- Prezzo cambiato: lo storico. Venduto, affittato o ritirato: l'annuncio si ritira.
CREATE OR REPLACE FUNCTION imm_immobile_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO imm_documenti (immobile_id, tipo, obbligatorio, created_by)
    SELECT NEW.id, t, true, NEW.created_by
      FROM unnest(CASE WHEN NEW.tipologia = 'terreno' THEN ARRAY['atto_provenienza', 'visura_catastale', 'conformita_urbanistica']
                       ELSE ARRAY['atto_provenienza', 'visura_catastale', 'planimetria_catastale', 'ape', 'conformita_urbanistica', 'conformita_catastale',
                                  'certificazioni_impianti'] END) t;
  END IF;
  IF TG_OP = 'INSERT' OR (NEW.prezzo, NEW.canone) IS DISTINCT FROM (OLD.prezzo, OLD.canone) THEN
    IF NEW.prezzo IS NOT NULL OR NEW.canone IS NOT NULL THEN
      INSERT INTO imm_prezzi (immobile_id, prezzo, canone, created_by) VALUES (NEW.id, NEW.prezzo, NEW.canone, COALESCE(auth.uid(), NEW.created_by));
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.stato IN ('venduto', 'affittato', 'ritirato') AND OLD.stato <> NEW.stato THEN
    UPDATE imm_annunci SET stato = 'ritirato' WHERE immobile_id = NEW.id AND stato IN ('pubblicato', 'sospeso', 'bozza');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_immobili_effetti AFTER INSERT OR UPDATE OF prezzo, canone, stato ON imm_immobili FOR EACH ROW EXECUTE FUNCTION imm_immobile_effetti();

-- Scadenze dell'immobile: documenti con data (APE, certificazioni) e incarichi.
CREATE OR REPLACE FUNCTION imm_scadenza_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_imm TEXT;
BEGIN
  SELECT codice || ' · ' || indirizzo INTO v_imm FROM imm_immobili WHERE id = NEW.immobile_id;
  DELETE FROM scadenze_moduli WHERE entita = TG_TABLE_NAME AND entita_id = NEW.id AND stato = 'aperta';
  IF TG_TABLE_NAME = 'imm_documenti' THEN
    IF NEW.scadenza IS NOT NULL AND NEW.stato = 'presente' THEN
      INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
      VALUES ('immobiliare', 'imm_documenti', NEW.id, CASE NEW.tipo WHEN 'ape' THEN 'APE' ELSE 'Documento' END,
              v_imm || ' · ' || COALESCE(NEW.descrizione, replace(NEW.tipo, '_', ' ')), NEW.scadenza, '/immobiliare/immobili/' || NEW.immobile_id, NEW.created_by);
    END IF;
  ELSE
    IF NEW.stato = 'attivo' THEN
      INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
      VALUES ('immobiliare', 'imm_incarichi', NEW.id, 'Incarico ' || CASE WHEN NEW.esclusiva THEN 'in esclusiva' ELSE 'non esclusivo' END,
              v_imm || ' · ' || NEW.codice, NEW.scadenza, '/immobiliare/immobili/' || NEW.immobile_id, NEW.created_by);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_documenti_scadenza AFTER INSERT OR UPDATE OF scadenza, stato ON imm_documenti FOR EACH ROW EXECUTE FUNCTION imm_scadenza_effetti();
CREATE TRIGGER imm_incarichi_scadenza AFTER INSERT OR UPDATE OF scadenza, stato ON imm_incarichi FOR EACH ROW EXECUTE FUNCTION imm_scadenza_effetti();

-- Incarico acquisito: l'immobile va sul mercato e la trattativa di acquisizione è vinta.
CREATE OR REPLACE FUNCTION imm_incarico_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE p imm_proprietari%ROWTYPE;
BEGIN
  IF NEW.stato = 'attivo' AND (TG_OP = 'INSERT' OR OLD.stato <> 'attivo') THEN
    UPDATE imm_immobili SET stato = 'disponibile', agente_id = COALESCE(agente_id, NEW.agente_id),
                            prezzo = CASE WHEN NEW.tipo = 'vendita' THEN COALESCE(prezzo, NEW.prezzo_richiesto) ELSE prezzo END,
                            canone = CASE WHEN NEW.tipo = 'locazione' THEN COALESCE(canone, NEW.prezzo_richiesto) ELSE canone END
     WHERE id = NEW.immobile_id AND stato IN ('in_acquisizione', 'in_valutazione', 'ritirato');
    FOR p IN SELECT * FROM imm_proprietari WHERE immobile_id = NEW.immobile_id ORDER BY referente DESC, quota_pct DESC LIMIT 1 LOOP
      PERFORM imm_avanza('Acquisizione', p.contatto_id, NEW.immobile_id, 'Incarico acquisito', NEW.prezzo_richiesto, p.organizzazione_id);
    END LOOP;
  END IF;
  -- Revocato o scaduto senza altri incarichi: l'immobile esce dal mercato.
  IF TG_OP = 'UPDATE' AND NEW.stato IN ('revocato', 'scaduto') AND OLD.stato = 'attivo'
     AND NOT EXISTS (SELECT 1 FROM imm_incarichi WHERE immobile_id = NEW.immobile_id AND stato = 'attivo' AND id <> NEW.id) THEN
    UPDATE imm_immobili SET stato = 'ritirato' WHERE id = NEW.immobile_id AND stato IN ('disponibile', 'sotto_offerta');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_incarichi_effetti AFTER INSERT OR UPDATE OF stato ON imm_incarichi FOR EACH ROW EXECUTE FUNCTION imm_incarico_effetti();

-- Valutazione registrata: l'acquisizione arriva almeno a «Valutazione».
CREATE OR REPLACE FUNCTION imm_valutazione_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE p imm_proprietari%ROWTYPE;
BEGIN
  UPDATE imm_immobili SET stato = 'in_valutazione' WHERE id = NEW.immobile_id AND stato = 'in_acquisizione';
  FOR p IN SELECT * FROM imm_proprietari WHERE immobile_id = NEW.immobile_id ORDER BY referente DESC, quota_pct DESC LIMIT 1 LOOP
    PERFORM imm_avanza('Acquisizione', p.contatto_id, NEW.immobile_id, CASE WHEN NEW.presentata_il IS NOT NULL THEN 'Proposta di incarico' ELSE 'Valutazione' END,
                       COALESCE(NEW.valore_agente, NEW.valore_automatico), p.organizzazione_id);
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_valutazioni_effetti AFTER INSERT OR UPDATE OF presentata_il, valore_agente ON imm_valutazioni FOR EACH ROW EXECUTE FUNCTION imm_valutazione_effetti();

-- Lead nuovo: avviso all'agente.
CREATE OR REPLACE FUNCTION imm_lead_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM imm_notifica_agente(NEW.agente_id, 'Nuovo lead: ' || NEW.nome,
    initcap(NEW.tipo) || COALESCE(' · ' || (SELECT codice FROM imm_immobili WHERE id = NEW.immobile_id), '') || COALESCE(' · ' || NEW.fonte, '')
      || COALESCE(E'\n' || left(NEW.messaggio, 200), ''), '/immobiliare/lead', CASE WHEN NEW.priorita = 'alta' THEN 'warning' ELSE 'info' END::notifica_tipo);
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_lead_avvisa AFTER INSERT ON imm_lead FOR EACH ROW EXECUTE FUNCTION imm_lead_effetti();

-- Conversione del lead: contatto nel CRM, richiesta (acquirenti e conduttori) e trattativa sulla pipeline giusta.
CREATE OR REPLACE FUNCTION imm_converti_lead(p_lead UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  l imm_lead%ROWTYPE;
  v_contatto UUID;
  v_richiesta UUID;
  v_deal UUID;
  i imm_immobili%ROWTYPE;
BEGIN
  IF NOT modulo_attivo('immobiliare') THEN RAISE EXCEPTION 'Modulo Agenzia immobiliare non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO l FROM imm_lead WHERE id = p_lead FOR UPDATE;
  IF l.id IS NULL THEN RAISE EXCEPTION 'Lead inesistente'; END IF;
  IF l.stato IN ('convertito', 'perso') THEN RAISE EXCEPTION 'Il lead è già %', l.stato USING ERRCODE = 'check_violation'; END IF;
  v_contatto := l.contatto_id;
  IF v_contatto IS NULL THEN
    INSERT INTO contatti (nome, cognome, email, telefono, note, created_by)
    VALUES (split_part(l.nome, ' ', 1), NULLIF(trim(substr(l.nome, length(split_part(l.nome, ' ', 1)) + 1)), ''), l.email, l.telefono,
            'Lead ' || l.codice || ' (' || l.origine || ')', COALESCE(auth.uid(), l.created_by))
    RETURNING id INTO v_contatto;
  END IF;
  SELECT * INTO i FROM imm_immobili WHERE id = l.immobile_id;
  IF l.tipo IN ('acquirente', 'conduttore') THEN
    INSERT INTO imm_richieste (contatto_id, tipo, tipologie, comuni, budget_max, camere_min, agente_id, note, created_by)
    VALUES (v_contatto, CASE WHEN l.tipo = 'acquirente' THEN 'acquisto' ELSE 'affitto' END,
            CASE WHEN i.id IS NOT NULL THEN ARRAY[i.tipologia] ELSE '{}' END, CASE WHEN i.id IS NOT NULL THEN ARRAY[i.comune] ELSE '{}' END,
            CASE WHEN i.id IS NULL THEN NULL WHEN l.tipo = 'acquirente' THEN round(i.prezzo * 1.1, -3) ELSE round(i.canone * 1.1) END,
            CASE WHEN i.camere IS NOT NULL THEN GREATEST(i.camere - 1, 0) END, l.agente_id,
            'Dal lead ' || l.codice || COALESCE(': ' || l.messaggio, ''), COALESCE(auth.uid(), l.created_by))
    RETURNING id INTO v_richiesta;
    IF i.id IS NOT NULL THEN
      v_deal := imm_avanza('Trattative', v_contatto, i.id, 'Interesse', CASE WHEN l.tipo = 'acquirente' THEN i.prezzo ELSE i.canone END);
    END IF;
  ELSE
    v_deal := imm_avanza('Acquisizione', v_contatto, l.immobile_id, 'Contatto', NULL);
  END IF;
  UPDATE imm_lead SET stato = 'convertito', contatto_id = v_contatto, richiesta_id = v_richiesta, deal_id = v_deal WHERE id = l.id;
  RETURN jsonb_build_object('contatto_id', v_contatto, 'richiesta_id', v_richiesta, 'deal_id', v_deal);
END;
$$;

-- ═══ 13. VALUTAZIONE AUTOMATICA (§8) ════════════════════════════════
-- I comparabili sono gli immobili dell'archivio nello stesso comune e della
-- stessa tipologia (prima i venduti, al prezzo di vendita; poi quelli sul
-- mercato, al prezzo richiesto), con la superficie; valore = superficie ×
-- media del prezzo al m² × (1 + somma dei correttivi).
CREATE OR REPLACE FUNCTION imm_stima(p_immobile UUID, p_correttivi JSONB DEFAULT '[]')
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  i imm_immobili%ROWTYPE;
  v_comp JSONB;
  v_mq NUMERIC;
  v_corr NUMERIC;
  v_valore NUMERIC;
BEGIN
  IF NOT modulo_attivo('immobiliare') THEN RAISE EXCEPTION 'Modulo Agenzia immobiliare non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO i FROM imm_immobili WHERE id = p_immobile;
  IF i.id IS NULL THEN RAISE EXCEPTION 'Immobile inesistente'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('codice', c.codice, 'indirizzo', c.indirizzo, 'superficie', c.superficie_commerciale, 'prezzo', c.valore,
                                               'prezzo_mq', round(c.valore / c.superficie_commerciale, 2), 'fonte', c.fonte) ORDER BY c.ordine, c.quando DESC), '[]'),
         avg(c.valore / c.superficie_commerciale)
    INTO v_comp, v_mq
    FROM (SELECT x.codice, x.indirizzo, x.superficie_commerciale, COALESCE(x.prezzo_vendita, x.prezzo) AS valore,
                 CASE WHEN x.prezzo_vendita IS NOT NULL THEN 'venduto' ELSE 'in vendita' END AS fonte,
                 CASE WHEN x.prezzo_vendita IS NOT NULL THEN 0 ELSE 1 END AS ordine, COALESCE(x.concluso_il, x.pubblicato_il, x.created_at::date) AS quando
            FROM imm_immobili x
           WHERE x.id <> i.id AND lower(x.comune) = lower(i.comune) AND x.tipologia = i.tipologia AND x.superficie_commerciale > 0
             AND COALESCE(x.prezzo_vendita, x.prezzo) > 0 AND x.contratto IN ('vendita', 'entrambi')
             AND (x.stato IN ('disponibile', 'sotto_offerta') OR (x.stato = 'venduto' AND x.concluso_il >= imm_oggi() - 730))
           ORDER BY ordine, quando DESC LIMIT 10) c;
  SELECT COALESCE(sum((e->>'pct')::numeric), 0) INTO v_corr FROM jsonb_array_elements(p_correttivi) e;
  IF v_mq IS NOT NULL AND i.superficie_commerciale IS NOT NULL THEN
    v_valore := round(i.superficie_commerciale * v_mq * (1 + v_corr / 100), -3);
  END IF;
  RETURN jsonb_build_object('superficie', i.superficie_commerciale, 'comparabili', v_comp, 'valore_mq', round(v_mq, 2), 'correttivi_pct', v_corr,
                            'valore', v_valore, 'valore_min', round(v_valore * 0.95, -3), 'valore_max', round(v_valore * 1.05, -3),
                            'storico_prezzi', COALESCE((SELECT jsonb_agg(jsonb_build_object('dal', p.dal, 'prezzo', p.prezzo, 'canone', p.canone) ORDER BY p.dal)
                                                         FROM imm_prezzi p WHERE p.immobile_id = i.id), '[]'));
END;
$$;

-- ═══ 14. MATCHING DOMANDA/OFFERTA (§12) ═════════════════════════════
-- Escludono: contratto diverso, prezzo oltre il 10% del budget massimo,
-- tipologia o comune non cercati, due camere in meno. Punteggio su 100:
-- prezzo 30, zona 15, camere 20, superficie 15, requisiti 20.
CREATE OR REPLACE FUNCTION imm_punteggio(r imm_richieste, i imm_immobili)
RETURNS TABLE (punteggio INT, motivi TEXT[])
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  v_prezzo NUMERIC := CASE WHEN r.tipo = 'acquisto' THEN i.prezzo ELSE i.canone END;
  v INT := 0;
  m TEXT[] := '{}';
  v_req TEXT;
  v_ok INT := 0;
  v_ha BOOLEAN;
BEGIN
  IF i.stato <> 'disponibile' THEN RETURN; END IF;
  IF r.tipo = 'acquisto' AND i.contratto NOT IN ('vendita', 'entrambi') THEN RETURN; END IF;
  IF r.tipo = 'affitto' AND i.contratto NOT IN ('affitto', 'entrambi') THEN RETURN; END IF;
  IF v_prezzo IS NULL THEN RETURN; END IF;
  IF r.budget_max IS NOT NULL AND v_prezzo > r.budget_max * 1.10 THEN RETURN; END IF;
  IF cardinality(r.tipologie) > 0 AND NOT (i.tipologia = ANY (r.tipologie)) THEN RETURN; END IF;
  IF cardinality(r.comuni) > 0 AND NOT (lower(i.comune) = ANY (SELECT lower(x) FROM unnest(r.comuni) x)) THEN RETURN; END IF;
  IF r.camere_min IS NOT NULL AND COALESCE(i.camere, 0) < r.camere_min - 1 THEN RETURN; END IF;

  -- Prezzo.
  IF r.budget_max IS NULL OR v_prezzo <= r.budget_max THEN
    v := v + 30;
    IF r.budget_min IS NOT NULL AND v_prezzo < r.budget_min THEN m := array_append(m, 'sotto il budget minimo'); END IF;
  ELSE
    v := v + 15; m := array_append(m, ('sopra il budget del ' || round(100 * (v_prezzo / r.budget_max - 1)) || '%'));
  END IF;
  -- Zona.
  IF cardinality(r.zone) = 0 OR lower(COALESCE(i.zona, '')) = ANY (SELECT lower(x) FROM unnest(r.zone) x) THEN v := v + 15;
  ELSE v := v + 5; m := array_append(m, ('zona ' || COALESCE(i.zona, 'non indicata'))); END IF;
  -- Camere.
  IF r.camere_min IS NULL OR COALESCE(i.camere, 0) >= r.camere_min THEN v := v + 20;
  ELSE v := v + 8; m := array_append(m, 'una camera in meno'); END IF;
  -- Superficie.
  IF r.superficie_min IS NULL OR COALESCE(i.superficie_commerciale, 0) >= r.superficie_min THEN v := v + 15;
  ELSIF COALESCE(i.superficie_commerciale, 0) >= r.superficie_min * 0.9 THEN v := v + 8; m := array_append(m, 'superficie un po'' più piccola');
  ELSE m := array_append(m, 'superficie più piccola'); END IF;
  -- Requisiti.
  IF cardinality(r.requisiti) = 0 THEN v := v + 20;
  ELSE
    FOREACH v_req IN ARRAY r.requisiti LOOP
      v_ha := CASE v_req WHEN 'ascensore' THEN i.ascensore WHEN 'terrazzo' THEN i.terrazzi > 0 WHEN 'balcone' THEN i.balconi > 0
                         WHEN 'giardino' THEN i.giardino WHEN 'garage' THEN i.garage WHEN 'posto_auto' THEN i.posto_auto OR i.garage
                         WHEN 'cantina' THEN i.cantina WHEN 'arredato' THEN i.arredato <> 'no' WHEN 'condizionamento' THEN i.condizionamento
                         ELSE false END;
      IF v_ha THEN v_ok := v_ok + 1; ELSE m := array_append(m, ('senza ' || replace(v_req, '_', ' '))); END IF;
    END LOOP;
    v := v + round(20.0 * v_ok / cardinality(r.requisiti))::int;
  END IF;
  punteggio := v; motivi := m;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION imm_match(p_richiesta UUID)
RETURNS TABLE (immobile_id UUID, punteggio INT, motivi TEXT[])
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT i.id, p.punteggio, p.motivi
    FROM imm_richieste r CROSS JOIN imm_immobili i CROSS JOIN LATERAL imm_punteggio(r, i) p
   WHERE r.id = p_richiesta AND modulo_attivo('immobiliare')
   ORDER BY p.punteggio DESC, i.pubblicato_il DESC NULLS LAST
$$;

-- Dall'immobile: chi lo sta cercando.
CREATE OR REPLACE FUNCTION imm_match_immobile(p_immobile UUID)
RETURNS TABLE (richiesta_id UUID, contatto_id UUID, punteggio INT, motivi TEXT[])
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT r.id, r.contatto_id, p.punteggio, p.motivi
    FROM imm_immobili i CROSS JOIN imm_richieste r CROSS JOIN LATERAL imm_punteggio(r, i) p
   WHERE i.id = p_immobile AND r.stato = 'attiva' AND modulo_attivo('immobiliare')
   ORDER BY p.punteggio DESC, r.created_at
$$;

-- Le proposte compatibili diventano la selezione della richiesta.
CREATE OR REPLACE FUNCTION imm_proponi(p_richiesta UUID, p_soglia INT DEFAULT 60)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n INT;
BEGIN
  IF NOT modulo_attivo('immobiliare') THEN RAISE EXCEPTION 'Modulo Agenzia immobiliare non attivo' USING ERRCODE = '42501'; END IF;
  INSERT INTO imm_selezioni (richiesta_id, immobile_id, punteggio, created_by)
  SELECT p_richiesta, m.immobile_id, m.punteggio, auth.uid() FROM imm_match(p_richiesta) m WHERE m.punteggio >= p_soglia
  ON CONFLICT (richiesta_id, immobile_id) DO UPDATE SET punteggio = EXCLUDED.punteggio;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Invio al cliente degli immobili selezionati e non ancora inviati.
CREATE OR REPLACE FUNCTION imm_invia_selezione(p_richiesta UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r imm_richieste%ROWTYPE;
  v_testo TEXT;
  n INT;
BEGIN
  IF NOT modulo_attivo('immobiliare') THEN RAISE EXCEPTION 'Modulo Agenzia immobiliare non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM imm_richieste WHERE id = p_richiesta;
  SELECT string_agg('• ' || i.codice || ' · ' || COALESCE(i.titolo, initcap(i.tipologia)) || ', ' || i.indirizzo || ', ' || i.comune || ' — '
                    || imm_euro(CASE WHEN r.tipo = 'acquisto' THEN i.prezzo ELSE i.canone END) || CASE WHEN r.tipo = 'affitto' THEN ' al mese' ELSE '' END,
                    E'\n' ORDER BY s.punteggio DESC), count(*)
    INTO v_testo, n
    FROM imm_selezioni s JOIN imm_immobili i ON i.id = s.immobile_id
   WHERE s.richiesta_id = r.id AND s.stato = 'proposto' AND i.stato = 'disponibile';
  IF n = 0 THEN RAISE EXCEPTION 'Nessun immobile da inviare' USING ERRCODE = 'check_violation'; END IF;
  IF NOT imm_scrivi(r.contatto_id, 'Immobili selezionati per lei', E'ecco gli immobili che rispondono alla sua ricerca:\n\n' || v_testo
       || E'\n\nCi contatti per fissare una visita.') THEN
    RAISE EXCEPTION 'Il cliente non ha un indirizzo email' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE imm_selezioni SET stato = 'inviato', inviato_il = imm_oggi()
   WHERE richiesta_id = r.id AND stato = 'proposto' AND immobile_id IN (SELECT id FROM imm_immobili WHERE stato = 'disponibile');
  RETURN n;
END;
$$;

-- Nuovo immobile disponibile: l'agente sa subito quante richieste lo cercano.
CREATE OR REPLACE FUNCTION imm_disponibile_avvisa()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n INT;
BEGIN
  IF NEW.stato = 'disponibile' AND OLD.stato <> 'disponibile' AND OLD.stato <> 'sotto_offerta' THEN
    SELECT count(*) INTO n FROM imm_match_immobile(NEW.id) WHERE punteggio >= 60;
    IF n > 0 THEN
      PERFORM imm_notifica_agente(NEW.agente_id, NEW.codice || ': ' || n || ' clienti lo cercano', 'Richieste compatibili con ' || NEW.indirizzo || '.',
                                  '/immobiliare/immobili/' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_immobili_disponibile AFTER UPDATE OF stato ON imm_immobili FOR EACH ROW EXECUTE FUNCTION imm_disponibile_avvisa();

-- ═══ 15. FEED PER I PORTALI (§10, predisposto) ═══════════════════════
-- Il file da caricare sui portali e sul sito: annunci pubblicati con prezzo,
-- descrizione e disponibilità. Le foto sono gli allegati dell'immobile.
CREATE OR REPLACE FUNCTION imm_feed_annunci()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT '<?xml version="1.0" encoding="UTF-8"?>' || E'\n' || xmlelement(name annunci,
           xmlagg(xmlelement(name annuncio, xmlattributes(i.codice AS codice),
             xmlforest(a.titolo AS titolo, a.descrizione AS descrizione, i.tipologia AS tipologia,
                       CASE i.contratto WHEN 'affitto' THEN 'affitto' WHEN 'vendita' THEN 'vendita' ELSE 'vendita,affitto' END AS contratto,
                       i.prezzo AS prezzo, i.canone AS canone, i.indirizzo AS indirizzo, i.comune AS comune, i.zona AS zona, i.cap AS cap,
                       i.superficie_commerciale AS superficie, i.locali AS locali, i.camere AS camere, i.bagni AS bagni, i.piano AS piano,
                       i.classe_energetica AS classe_energetica, i.ipe AS ipe, i.stato AS disponibilita, a.video_url AS video, a.tour_url AS tour,
                       array_to_string(a.portali, ',') AS portali, a.pubblicato_il AS pubblicato_il)) ORDER BY a.pubblicato_il DESC))::text
    FROM imm_annunci a JOIN imm_immobili i ON i.id = a.immobile_id
   WHERE a.stato = 'pubblicato' AND modulo_attivo('immobiliare')
$$;

-- ═══ 16. TRIGGER COMUNI, RLS, PERMESSI ══════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['imm_impostazioni','imm_agenti','imm_collaboratori','imm_immobili','imm_proprietari','imm_documenti','imm_incarichi','imm_valutazioni',
                           'imm_annunci','imm_marketing','imm_richieste','imm_selezioni','imm_lead'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['imm_agenti','imm_collaboratori','imm_immobili','imm_proprietari','imm_documenti','imm_incarichi','imm_valutazioni',
                           'imm_annunci','imm_marketing','imm_richieste','imm_selezioni','imm_lead'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['imm_impostazioni','imm_agenti','imm_collaboratori','imm_immobili','imm_prezzi','imm_proprietari','imm_documenti','imm_incarichi',
                           'imm_valutazioni','imm_annunci','imm_marketing','imm_richieste','imm_selezioni','imm_lead'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;

  -- Regole dell'agenzia, agenti, rete e campagne a pagamento: la direzione.
  FOREACH t IN ARRAY ARRAY['imm_impostazioni','imm_agenti','imm_collaboratori','imm_marketing'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;
  -- Il lavoro dell'agenzia: tutto il personale.
  FOREACH t IN ARRAY ARRAY['imm_immobili','imm_proprietari','imm_documenti','imm_incarichi','imm_valutazioni','imm_annunci','imm_richieste','imm_selezioni','imm_lead'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;
  -- Lo storico dei prezzi lo scrive il trigger.
END $$;

-- L'incarico in esclusiva, il prezzo minimo e la provvigione li fissa la direzione o l'agente dell'immobile.
CREATE OR REPLACE FUNCTION imm_incarico_protetto()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL OR puo_amministrazione() THEN RETURN NEW; END IF;
  IF NEW.agente_id IS DISTINCT FROM imm_agente_corrente() OR imm_agente_corrente() IS NULL THEN
    IF TG_OP = 'INSERT' OR (NEW.provvigione_pct, NEW.provvigione_fissa, NEW.prezzo_minimo, NEW.esclusiva, NEW.stato)
                           IS DISTINCT FROM (OLD.provvigione_pct, OLD.provvigione_fissa, OLD.prezzo_minimo, OLD.esclusiva, OLD.stato) THEN
      RAISE EXCEPTION 'L''incarico lo gestiscono la direzione o l''agente dell''immobile' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER imm_incarichi_protetto BEFORE INSERT OR UPDATE ON imm_incarichi FOR EACH ROW EXECUTE FUNCTION imm_incarico_protetto();

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['imm_avanza(text,uuid,uuid,text,numeric,uuid)', 'imm_notifica_direzione(text,text,text,notifica_tipo)',
                           'imm_notifica_agente(uuid,text,text,text,notifica_tipo)', 'imm_scrivi(uuid,text,text)', 'imm_prepara()', 'imm_quote_controlla()',
                           'imm_immobile_effetti()', 'imm_scadenza_effetti()', 'imm_incarico_effetti()', 'imm_valutazione_effetti()', 'imm_lead_effetti()',
                           'imm_disponibile_avvisa()', 'imm_incarico_protetto()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY['imm_agente_corrente()', 'imm_pipeline(text)', 'imm_oggi()', 'imm_euro(numeric)', 'imm_converti_lead(uuid)', 'imm_stima(uuid,jsonb)',
                           'imm_match(uuid)', 'imm_match_immobile(uuid)', 'imm_proponi(uuid,integer)', 'imm_invia_selezione(uuid)', 'imm_feed_annunci()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;
-- imm_punteggio è usata dentro imm_match (SECURITY INVOKER): chi chiama deve poterla eseguire.
REVOKE ALL ON FUNCTION imm_punteggio(imm_richieste, imm_immobili) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION imm_punteggio(imm_richieste, imm_immobili) TO authenticated;

SELECT applica_protezioni_tabelle();
