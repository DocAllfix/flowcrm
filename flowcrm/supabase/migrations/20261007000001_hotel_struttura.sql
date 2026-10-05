-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Hotel (Sprint 3) · 1/3: struttura, tariffe, prenotazioni, soggiorno.
--
-- Documento Hotel §1–3 (struttura, camere, tipologie), §5 (ospiti), §7–10
-- (prenotazioni, disponibilità, tariffe), §14–17 (check-in, check-out,
-- conto camera, trattamenti), §29–31 (gruppi, intermediari, pagamenti),
-- §33 (tassa di soggiorno), §47 (più strutture).
--
-- Il conto camera è un conto della cassa delle fondamenta (modulo 'hotel'):
-- ristorante, bar e servizi vi addebitano con l'«addebito su altro conto».
-- Una camera non è mai assegnata due volte nella stessa notte (vincolo di
-- esclusione); chi parte e chi arriva lo stesso giorno non si toccano.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TYPE hotel_prenotazione_stato AS ENUM (
  'richiesta', 'opzionata', 'confermata', 'in_soggiorno', 'partita', 'annullata', 'no_show'
);
CREATE TYPE hotel_pulizia_stato AS ENUM ('da_pulire', 'in_pulizia', 'pulita', 'verificata');

-- ═══ 1. STRUTTURE, AREE, TIPOLOGIE, CAMERE ══════════════════════════
CREATE TABLE hotel_strutture (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                    TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  nome                      TEXT NOT NULL,
  categoria                 TEXT,                    -- «4 stelle», «Residence»
  indirizzo                 TEXT,
  comune                    TEXT,
  provincia                 TEXT,
  cap                       TEXT,
  telefono                  TEXT,
  email                     TEXT,
  sito                      TEXT,
  codice_cir                TEXT,                    -- codice identificativo regionale
  codice_istat              TEXT,                    -- per le statistiche del movimento
  codice_alloggiati         TEXT,                    -- utenza Alloggiati Web (predisposto)
  piani                     INT CHECK (piani > 0),
  edifici                   TEXT[] NOT NULL DEFAULT '{}',
  servizi                   TEXT[] NOT NULL DEFAULT '{}',  -- parcheggio, piscina, spa, ristorante, bar, sale_meeting…
  check_in_dalle            TIME NOT NULL DEFAULT '14:00',
  check_out_entro           TIME NOT NULL DEFAULT '11:00',
  cambio_biancheria_giorni  INT NOT NULL DEFAULT 3 CHECK (cambio_biancheria_giorni BETWEEN 1 AND 30),
  minuti_pulizia_partenza   INT NOT NULL DEFAULT 40 CHECK (minuti_pulizia_partenza > 0),
  minuti_pulizia_soggiorno  INT NOT NULL DEFAULT 20 CHECK (minuti_pulizia_soggiorno > 0),
  costo_orario_medio        NUMERIC(8,2) CHECK (costo_orario_medio >= 0),
  attiva                    BOOLEAN NOT NULL DEFAULT true,
  note                      TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                UUID REFERENCES user_profiles(id),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                UUID REFERENCES user_profiles(id)
);

CREATE TABLE hotel_aree (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo       TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  nome         TEXT NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'altro' CHECK (tipo IN ('reception', 'ascensore', 'scale', 'sala', 'ristorante', 'bar',
                                                             'spa', 'piscina', 'parcheggio', 'altro')),
  piano        INT,
  edificio     TEXT,
  ordine       INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id)
);

CREATE TABLE hotel_tipologie (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id      UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo            TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  codice            TEXT NOT NULL,                  -- DBL, SGL, JS…
  nome              TEXT NOT NULL,
  categoria         TEXT NOT NULL DEFAULT 'doppia' CHECK (categoria IN (
                      'singola', 'doppia', 'matrimoniale', 'twin', 'tripla', 'quadrupla', 'familiare', 'suite',
                      'junior_suite', 'executive', 'deluxe', 'apartment', 'altro')),
  occupazione_base  INT NOT NULL DEFAULT 2 CHECK (occupazione_base > 0),
  occupazione_min   INT NOT NULL DEFAULT 1 CHECK (occupazione_min > 0),
  occupazione_max   INT NOT NULL DEFAULT 2 CHECK (occupazione_max > 0),
  prezzo_base       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (prezzo_base >= 0),
  dotazioni         TEXT[] NOT NULL DEFAULT '{}',
  politiche         TEXT,
  descrizione       TEXT,
  ordine            INT NOT NULL DEFAULT 0,
  attiva            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  UNIQUE (struttura_id, codice),
  CHECK (occupazione_min <= occupazione_base AND occupazione_base <= occupazione_max)
);

CREATE TABLE hotel_camere (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id          UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo                TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  tipologia_id          UUID NOT NULL REFERENCES hotel_tipologie(id) ON DELETE RESTRICT,
  numero                TEXT NOT NULL,
  piano                 INT,
  edificio              TEXT,
  posti_letto           INT CHECK (posti_letto > 0),
  letti                 TEXT CHECK (letti IN ('matrimoniale', 'singoli', 'matrimoniale_e_singolo', 'divano_letto', 'altro')),
  metri_quadri          NUMERIC(6,1) CHECK (metri_quadri > 0),
  vista                 TEXT,
  balcone               BOOLEAN NOT NULL DEFAULT false,
  servizi               TEXT[] NOT NULL DEFAULT '{}',
  accessibile           BOOLEAN NOT NULL DEFAULT false,
  dotazioni             TEXT[] NOT NULL DEFAULT '{}',
  tariffa_standard      NUMERIC(10,2) CHECK (tariffa_standard >= 0),
  stato_pulizia         hotel_pulizia_stato NOT NULL DEFAULT 'verificata',
  fuori_servizio        BOOLEAN NOT NULL DEFAULT false,
  fuori_servizio_motivo TEXT,
  fuori_servizio_fino   DATE,
  ordine                INT NOT NULL DEFAULT 0,
  attiva                BOOLEAN NOT NULL DEFAULT true,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id),
  UNIQUE (struttura_id, numero)
);
CREATE INDEX idx_hotel_camere_tipologia ON hotel_camere (tipologia_id);

-- ═══ 2. TRATTAMENTI, PIANI TARIFFARI, TARIFFE ═══════════════════════
CREATE TABLE hotel_trattamenti (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id         UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo               TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  codice               TEXT NOT NULL,              -- SO, BB, HB, FB, AI
  nome                 TEXT NOT NULL,
  colazione            BOOLEAN NOT NULL DEFAULT false,
  pranzo               BOOLEAN NOT NULL DEFAULT false,
  cena                 BOOLEAN NOT NULL DEFAULT false,
  bevande              BOOLEAN NOT NULL DEFAULT false,
  supplemento_adulto   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (supplemento_adulto >= 0),   -- a notte
  supplemento_bambino  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (supplemento_bambino >= 0),
  servizi_inclusi      TEXT[] NOT NULL DEFAULT '{}',
  ordine               INT NOT NULL DEFAULT 0,
  attivo               BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES user_profiles(id),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES user_profiles(id),
  UNIQUE (struttura_id, codice)
);

CREATE TABLE hotel_piani_tariffari (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id         UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo               TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  codice               TEXT NOT NULL,
  nome                 TEXT NOT NULL,
  tipo                 TEXT NOT NULL DEFAULT 'bar' CHECK (tipo IN (
                         'bar', 'non_rimborsabile', 'flex', 'corporate', 'gruppi', 'long_stay', 'weekend',
                         'stagionale', 'early_booking', 'last_minute', 'pacchetto')),
  -- Derivato da un altro piano (es. non rimborsabile = BAR −10%) quando non ha tariffe proprie.
  base_piano_id        UUID REFERENCES hotel_piani_tariffari(id) ON DELETE SET NULL,
  variazione_pct       NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (variazione_pct > -100),
  rimborsabile         BOOLEAN NOT NULL DEFAULT true,
  cancellazione_giorni INT NOT NULL DEFAULT 1 CHECK (cancellazione_giorni >= 0),  -- gratis fino a N giorni prima
  penale_pct           NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (penale_pct BETWEEN 0 AND 100),
  caparra_pct          NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (caparra_pct BETWEEN 0 AND 100),
  anticipo_min_giorni  INT CHECK (anticipo_min_giorni >= 0),   -- early booking
  anticipo_max_giorni  INT CHECK (anticipo_max_giorni >= 0),   -- last minute
  soggiorno_min        INT CHECK (soggiorno_min > 0),
  soggiorno_max        INT CHECK (soggiorno_max > 0),
  giorni_arrivo        SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',          -- 1 = lunedì
  canali               TEXT[] NOT NULL DEFAULT '{}',                           -- vuoto = tutti
  organizzazione_id    UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,   -- corporate
  trattamento_id       UUID REFERENCES hotel_trattamenti(id) ON DELETE SET NULL,
  servizi_inclusi      TEXT[] NOT NULL DEFAULT '{}',                           -- pacchetti
  valido_dal           DATE,
  valido_al            DATE,
  descrizione          TEXT,
  ordine               INT NOT NULL DEFAULT 0,
  attivo               BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES user_profiles(id),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES user_profiles(id),
  UNIQUE (struttura_id, codice),
  CHECK (giorni_arrivo <@ ARRAY[1,2,3,4,5,6,7]::smallint[]),
  CHECK (base_piano_id IS DISTINCT FROM id)
);

-- Prezzo per notte all'occupazione base: per piano, tipologia e periodo.
-- Le restrizioni (soggiorno minimo, chiuso all'arrivo o alla partenza,
-- stop vendita) sono quelle che il channel manager riceverà (predisposto).
CREATE TABLE hotel_tariffe (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id         UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo               TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  piano_id             UUID NOT NULL REFERENCES hotel_piani_tariffari(id) ON DELETE CASCADE,
  tipologia_id         UUID NOT NULL REFERENCES hotel_tipologie(id) ON DELETE CASCADE,
  dal                  DATE NOT NULL,
  al                   DATE NOT NULL,
  giorni               SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
  prezzo               NUMERIC(10,2) NOT NULL CHECK (prezzo >= 0),
  supplemento_persona  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (supplemento_persona >= 0),
  riduzione_singola    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (riduzione_singola >= 0),
  soggiorno_min        INT CHECK (soggiorno_min > 0),
  chiuso_arrivo        BOOLEAN NOT NULL DEFAULT false,
  chiuso_partenza      BOOLEAN NOT NULL DEFAULT false,
  stop_vendita         BOOLEAN NOT NULL DEFAULT false,
  priorita             INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES user_profiles(id),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES user_profiles(id),
  CHECK (al >= dal),
  CHECK (giorni <@ ARRAY[1,2,3,4,5,6,7]::smallint[])
);
CREATE INDEX idx_hotel_tariffe_ricerca ON hotel_tariffe (piano_id, tipologia_id, dal, al);

-- ═══ 3. INTERMEDIARI, GRUPPI ════════════════════════════════════════
CREATE TABLE hotel_intermediari (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id          UUID REFERENCES hotel_strutture(id) ON DELETE CASCADE,   -- NULL = tutte le strutture
  modulo                TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  organizzazione_id     UUID NOT NULL REFERENCES organizzazioni(id) ON DELETE RESTRICT,
  tipo                  TEXT NOT NULL CHECK (tipo IN ('agenzia', 'tour_operator', 'ota', 'gds', 'corporate', 'event_planner')),
  commissione_pct       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (commissione_pct BETWEEN 0 AND 100),
  tariffa_netta         BOOLEAN NOT NULL DEFAULT false,
  contratto_dal         DATE,
  contratto_al          DATE,
  condizioni_pagamento  TEXT,
  codice_canale         TEXT,                     -- identificativo nel channel manager (predisposto)
  attivo                BOOLEAN NOT NULL DEFAULT true,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id),
  CHECK (contratto_al IS NULL OR contratto_dal IS NULL OR contratto_al >= contratto_dal)
);

CREATE TABLE hotel_gruppi (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id      UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo            TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  codice            TEXT UNIQUE,                 -- GRP-AAAA-NNNN
  nome              TEXT NOT NULL,
  organizzazione_id UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  intermediario_id  UUID REFERENCES hotel_intermediari(id) ON DELETE SET NULL,
  referente_id      UUID REFERENCES contatti(id) ON DELETE SET NULL,
  arrivo            DATE NOT NULL,
  partenza          DATE NOT NULL,
  piano_id          UUID REFERENCES hotel_piani_tariffari(id) ON DELETE SET NULL,
  trattamento_id    UUID REFERENCES hotel_trattamenti(id) ON DELETE SET NULL,
  rilascio          DATE,                         -- le camere non nominate tornano in vendita
  stato             TEXT NOT NULL DEFAULT 'opzione' CHECK (stato IN ('opzione', 'confermato', 'annullato')),
  fatturazione      TEXT NOT NULL DEFAULT 'capogruppo' CHECK (fatturazione IN ('capogruppo', 'singoli', 'misto')),
  servizi           TEXT,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  CHECK (partenza > arrivo)
);

CREATE TABLE hotel_gruppi_blocchi (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gruppo_id     UUID NOT NULL REFERENCES hotel_gruppi(id) ON DELETE CASCADE,
  modulo        TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  tipologia_id  UUID NOT NULL REFERENCES hotel_tipologie(id) ON DELETE RESTRICT,
  camere        INT NOT NULL CHECK (camere > 0),
  prezzo        NUMERIC(10,2) CHECK (prezzo >= 0),   -- tariffa concordata a notte
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  UNIQUE (gruppo_id, tipologia_id)
);

-- ═══ 4. OSPITI ══════════════════════════════════════════════════════
-- Il contatto del CRM con i dati del documento e della registrazione.
CREATE TABLE hotel_ospiti (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                  TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  contatto_id             UUID NOT NULL UNIQUE REFERENCES contatti(id) ON DELETE CASCADE,
  sesso                   TEXT CHECK (sesso IN ('M', 'F')),
  data_nascita            DATE,
  comune_nascita          TEXT,
  codice_comune_nascita   TEXT,          -- codici delle tabelle di Alloggiati Web
  provincia_nascita       TEXT,
  stato_nascita           TEXT,
  codice_stato_nascita    TEXT,
  cittadinanza            TEXT,
  codice_cittadinanza     TEXT,
  documento_tipo          TEXT,          -- IDENT, PASOR, PATEN…
  documento_numero        TEXT,
  documento_luogo         TEXT,
  codice_luogo_documento  TEXT,
  documento_scadenza      DATE,
  preferenze              TEXT,
  allergie                TEXT,
  vip                     BOOLEAN NOT NULL DEFAULT false,
  note                    TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID REFERENCES user_profiles(id),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by              UUID REFERENCES user_profiles(id)
);

-- ═══ 5. PRENOTAZIONI E NOTTI ════════════════════════════════════════
CREATE TABLE hotel_prenotazioni (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id           UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE RESTRICT,
  modulo                 TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  codice                 TEXT UNIQUE,                  -- PRN-AAAA-NNNN
  stato                  hotel_prenotazione_stato NOT NULL DEFAULT 'confermata',
  -- prenotante → ospite → pagatore → azienda
  contatto_id            UUID REFERENCES contatti(id) ON DELETE SET NULL,
  ospite_nome            TEXT NOT NULL,
  pagatore_contatto_id   UUID REFERENCES contatti(id) ON DELETE SET NULL,
  organizzazione_id      UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  adulti                 INT NOT NULL DEFAULT 2 CHECK (adulti >= 1),
  bambini                INT NOT NULL DEFAULT 0 CHECK (bambini >= 0),
  arrivo                 DATE NOT NULL,
  partenza               DATE NOT NULL,
  notti                  INT GENERATED ALWAYS AS (partenza - arrivo) STORED,
  tipologia_id           UUID NOT NULL REFERENCES hotel_tipologie(id) ON DELETE RESTRICT,
  camera_id              UUID REFERENCES hotel_camere(id) ON DELETE RESTRICT,
  piano_id               UUID REFERENCES hotel_piani_tariffari(id) ON DELETE SET NULL,
  trattamento_id         UUID REFERENCES hotel_trattamenti(id) ON DELETE SET NULL,
  prezzo_totale          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (prezzo_totale >= 0),
  prezzo_manuale         BOOLEAN NOT NULL DEFAULT false,
  canale                 TEXT NOT NULL DEFAULT 'diretto' CHECK (canale IN (
                           'diretto', 'telefono', 'email', 'walk_in', 'sito', 'booking_engine', 'ota', 'agenzia',
                           'tour_operator', 'gds', 'corporate', 'gruppo')),
  intermediario_id       UUID REFERENCES hotel_intermediari(id) ON DELETE SET NULL,
  canale_riferimento     TEXT,                         -- numero della prenotazione sul portale (predisposto)
  gruppo_id              UUID REFERENCES hotel_gruppi(id) ON DELETE SET NULL,
  metodo_pagamento       TEXT,
  caparra_richiesta      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (caparra_richiesta >= 0),
  caparra_scadenza       DATE,
  opzione_scadenza       DATE,
  arrivo_ora             TIME,
  early_check_in         BOOLEAN NOT NULL DEFAULT false,
  late_check_out         BOOLEAN NOT NULL DEFAULT false,
  richieste              TEXT,
  note                   TEXT,
  conto_id               UUID REFERENCES conti(id) ON DELETE SET NULL,
  check_in_at            TIMESTAMPTZ,
  check_out_at           TIMESTAMPTZ,
  annullata_at           TIMESTAMPTZ,
  motivo_annullamento    TEXT,
  penale                 NUMERIC(12,2),
  periodo                DATERANGE GENERATED ALWAYS AS (daterange(arrivo, partenza, '[)')) STORED,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES user_profiles(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES user_profiles(id),
  CHECK (partenza > arrivo),
  CHECK (stato <> 'in_soggiorno' OR camera_id IS NOT NULL),
  -- Nessuna camera assegnata due volte: chi parte e chi arriva lo stesso giorno non si toccano.
  CONSTRAINT hotel_camera_libera EXCLUDE USING gist (camera_id WITH =, periodo WITH &&)
    WHERE (camera_id IS NOT NULL AND stato IN ('opzionata', 'confermata', 'in_soggiorno'))
);
CREATE INDEX idx_hotel_prenotazioni_struttura ON hotel_prenotazioni (struttura_id, arrivo, partenza);
CREATE INDEX idx_hotel_prenotazioni_contatto ON hotel_prenotazioni (contatto_id);
CREATE INDEX idx_hotel_prenotazioni_periodo ON hotel_prenotazioni USING gist (periodo);

-- Prezzo bloccato notte per notte: base dell'ADR e del conto camera.
CREATE TABLE hotel_notti (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenotazione_id     UUID NOT NULL REFERENCES hotel_prenotazioni(id) ON DELETE CASCADE,
  modulo              TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  data                DATE NOT NULL,
  prezzo_camera       NUMERIC(10,2) NOT NULL DEFAULT 0,
  prezzo_trattamento  NUMERIC(10,2) NOT NULL DEFAULT 0,
  conto_riga_id       UUID REFERENCES conti_righe(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prenotazione_id, data)
);
CREATE INDEX idx_hotel_notti_data ON hotel_notti (data);

-- Chi dorme in camera: registrazione per le autorità e per la tassa.
CREATE TABLE hotel_soggiorno_ospiti (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenotazione_id       UUID NOT NULL REFERENCES hotel_prenotazioni(id) ON DELETE CASCADE,
  modulo                TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  ospite_id             UUID NOT NULL REFERENCES hotel_ospiti(id) ON DELETE RESTRICT,
  -- Tipo alloggiato di Alloggiati Web: 16 singolo, 17 capofamiglia, 18 capogruppo, 19 familiare, 20 membro di gruppo.
  tipo_alloggiato       TEXT NOT NULL DEFAULT '16' CHECK (tipo_alloggiato IN ('16', '17', '18', '19', '20')),
  esenzione_tassa       TEXT,                       -- motivo dell'esenzione, se c'è
  inviato_alloggiati_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id),
  UNIQUE (prenotazione_id, ospite_id)
);

-- Garanzie: mai il numero di carta (predisposto per il gateway, solo il riferimento).
CREATE TABLE hotel_garanzie (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenotazione_id  UUID NOT NULL REFERENCES hotel_prenotazioni(id) ON DELETE CASCADE,
  modulo           TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  tipo             TEXT NOT NULL CHECK (tipo IN ('carta_garanzia', 'preautorizzazione', 'virtual_card', 'voucher', 'prepagato')),
  importo          NUMERIC(12,2) CHECK (importo >= 0),
  riferimento      TEXT,              -- token del gateway o numero del voucher, mai i dati della carta
  stato            TEXT NOT NULL DEFAULT 'attiva' CHECK (stato IN ('attiva', 'incassata', 'rilasciata', 'scaduta')),
  scadenza         DATE,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);

-- ═══ 6. TASSA DI SOGGIORNO ══════════════════════════════════════════
CREATE TABLE hotel_tassa_regole (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id         UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo               TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  comune               TEXT NOT NULL,
  dal                  DATE,                      -- periodo (stagione); vuoto = sempre
  al                   DATE,
  importo_notte        NUMERIC(8,2) NOT NULL CHECK (importo_notte >= 0),
  notti_max            INT CHECK (notti_max > 0),
  eta_esenzione_sotto  INT CHECK (eta_esenzione_sotto >= 0),
  -- [{"eta_da": 14, "eta_a": 17, "pct": 50}]
  riduzioni            JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(riduzioni) = 'array'),
  esenzioni            TEXT[] NOT NULL DEFAULT '{}',   -- motivi ammessi dal regolamento comunale
  note                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES user_profiles(id),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES user_profiles(id),
  CHECK (al IS NULL OR dal IS NULL OR al >= dal)
);

-- ═══ 7. RIMBORSI SUI CONTI (fondamenta) ═════════════════════════════
-- Caparra restituita, penale minore del versato: il pagato netto scende.
CREATE TABLE conti_rimborsi (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conto_id     UUID NOT NULL REFERENCES conti(id) ON DELETE CASCADE,
  modulo       TEXT NOT NULL,
  importo      NUMERIC(12,2) NOT NULL CHECK (importo > 0),
  metodo       pagamento_metodo NOT NULL,
  riferimento  TEXT,
  motivo       TEXT NOT NULL,
  eseguito_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_conti_rimborsi_conto ON conti_rimborsi (conto_id);

CREATE OR REPLACE VIEW conti_saldi WITH (security_invoker = true) AS
SELECT c.id AS conto_id, c.modulo, c.codice, c.stato, c.descrizione,
       GREATEST(COALESCE(r.lordo, 0) - c.sconto_importo, 0)::numeric(12,2) AS totale,
       (COALESCE(p.pagato, 0) - COALESCE(x.rimborsato, 0))::numeric(12,2) AS pagato,
       (GREATEST(COALESCE(r.lordo, 0) - c.sconto_importo, 0) - COALESCE(p.pagato, 0) + COALESCE(x.rimborsato, 0))::numeric(12,2) AS residuo
  FROM conti c
  LEFT JOIN (SELECT conto_id, SUM(importo) AS lordo FROM conti_righe WHERE NOT stornata GROUP BY conto_id) r ON r.conto_id = c.id
  LEFT JOIN (SELECT conto_id, SUM(importo) AS pagato FROM conti_pagamenti GROUP BY conto_id) p ON p.conto_id = c.id
  LEFT JOIN (SELECT conto_id, SUM(importo) AS rimborsato FROM conti_rimborsi GROUP BY conto_id) x ON x.conto_id = c.id;

CREATE OR REPLACE FUNCTION conto_rimborso_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_stato conto_stato;
  v_modulo TEXT;
  v_residuo NUMERIC;
BEGIN
  SELECT stato, modulo INTO v_stato, v_modulo FROM conti WHERE id = NEW.conto_id FOR UPDATE;
  IF v_stato IS DISTINCT FROM 'aperto' THEN
    RAISE EXCEPTION 'Il conto non è aperto' USING ERRCODE = 'check_violation';
  END IF;
  SELECT residuo INTO v_residuo FROM conti_saldi WHERE conto_id = NEW.conto_id;
  IF NEW.importo > -v_residuo + 0.005 THEN
    RAISE EXCEPTION 'Si rimborsa al massimo il versato in più (% €)',
      replace(to_char(GREATEST(-v_residuo, 0), 'FM999999990.00'), '.', ',') USING ERRCODE = 'check_violation';
  END IF;
  NEW.modulo := v_modulo;
  RETURN NEW;
END;
$$;
CREATE TRIGGER conti_rimborsi_controlla BEFORE INSERT ON conti_rimborsi
  FOR EACH ROW EXECUTE FUNCTION conto_rimborso_controlla();

-- Conti che accettano acconti oltre il totale (caparra prima del soggiorno):
-- il saldo può andare sotto zero, e a fine soggiorno si rimborsa la differenza.
ALTER TABLE conti ADD COLUMN accetta_acconti BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION conto_pagamento_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_residuo NUMERIC;
  v_acconti BOOLEAN;
  v_totale NUMERIC;
  v_codice TEXT;
  v_dest conti%ROWTYPE;
  v_resto NUMERIC;
  v_quota NUMERIC;
  a RECORD;
  n INT;
  i INT := 0;
BEGIN
  SELECT accetta_acconti INTO v_acconti FROM conti WHERE id = NEW.conto_id FOR UPDATE;
  SELECT residuo, totale, codice INTO v_residuo, v_totale, v_codice FROM conti_saldi WHERE conto_id = NEW.conto_id;
  IF NOT COALESCE(v_acconti, false) AND NEW.importo > v_residuo + 0.005 THEN
    RAISE EXCEPTION 'Pagamento oltre il dovuto: residuo %', v_residuo USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.metodo = 'addebito_conto' THEN
    IF NEW.conto_destinazione_id = NEW.conto_id THEN
      RAISE EXCEPTION 'Non si addebita un conto su sé stesso' USING ERRCODE = 'check_violation';
    END IF;
    SELECT * INTO v_dest FROM conti WHERE id = NEW.conto_destinazione_id FOR UPDATE;
    IF v_dest.stato IS DISTINCT FROM 'aperto' OR NOT modulo_attivo(v_dest.modulo) THEN
      RAISE EXCEPTION 'Il conto di destinazione non è aperto' USING ERRCODE = 'check_violation';
    END IF;
    SELECT count(*) INTO n FROM conto_per_aliquota(NEW.conto_id);
    v_resto := NEW.importo;
    FOR a IN SELECT * FROM conto_per_aliquota(NEW.conto_id) ORDER BY aliquota_iva LOOP
      i := i + 1;
      v_quota := CASE WHEN i = n THEN v_resto ELSE ROUND(NEW.importo * a.importo / NULLIF(v_totale, 0), 2) END;
      v_resto := v_resto - v_quota;
      IF v_quota > 0 THEN
        INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva,
                                 riferimento_tipo, riferimento_id, created_by)
        VALUES (v_dest.id, 'Addebito da ' || COALESCE(v_codice, 'altro conto'), 1, v_quota, a.aliquota_iva,
                'addebito', NEW.id, NEW.created_by);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- ═══ 8. PREZZI ══════════════════════════════════════════════════════
-- Prezzo della camera per una notte: tariffa del piano (o del piano da cui
-- deriva, con la sua variazione), poi persone in più o occupazione singola.
CREATE OR REPLACE FUNCTION hotel_prezzo_notte(p_piano UUID, p_tipologia UUID, p_data DATE, p_persone INT)
RETURNS TABLE (prezzo NUMERIC, stop_vendita BOOLEAN, soggiorno_min INT, chiuso_arrivo BOOLEAN, chiuso_partenza BOOLEAN)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  t hotel_tipologie%ROWTYPE;
  r hotel_tariffe%ROWTYPE;
  v_piano UUID := p_piano;
  v_fattore NUMERIC := 1;
  v_profondita INT := 0;
  v_base NUMERIC;
BEGIN
  SELECT * INTO t FROM hotel_tipologie WHERE id = p_tipologia;
  LOOP
    r := NULL;
    IF v_piano IS NOT NULL THEN
      SELECT * INTO r FROM hotel_tariffe x
       WHERE x.piano_id = v_piano AND x.tipologia_id = p_tipologia AND p_data BETWEEN x.dal AND x.al
         AND EXTRACT(ISODOW FROM p_data)::smallint = ANY (x.giorni)
       ORDER BY x.priorita DESC, x.dal DESC
       LIMIT 1;
    END IF;
    EXIT WHEN r.id IS NOT NULL OR v_piano IS NULL OR v_profondita > 5;
    -- Piano derivato senza tariffe proprie: si prende quello di base con la variazione.
    SELECT v_fattore * (1 + p.variazione_pct / 100), p.base_piano_id INTO v_fattore, v_piano
      FROM hotel_piani_tariffari p WHERE p.id = v_piano;
    v_profondita := v_profondita + 1;
  END LOOP;

  IF r.id IS NULL THEN
    prezzo := ROUND(t.prezzo_base * v_fattore, 2);
    stop_vendita := false; soggiorno_min := NULL; chiuso_arrivo := false; chiuso_partenza := false;
  ELSE
    v_base := r.prezzo
              + GREATEST(p_persone - t.occupazione_base, 0) * r.supplemento_persona
              - CASE WHEN p_persone = 1 AND t.occupazione_base > 1 THEN r.riduzione_singola ELSE 0 END;
    prezzo := ROUND(GREATEST(v_base, 0) * v_fattore, 2);
    stop_vendita := r.stop_vendita; soggiorno_min := r.soggiorno_min;
    chiuso_arrivo := r.chiuso_arrivo; chiuso_partenza := r.chiuso_partenza;
  END IF;
  RETURN NEXT;
END;
$$;

-- Preventivo di un soggiorno, notte per notte, con le regole del piano.
CREATE OR REPLACE FUNCTION hotel_quota(p_struttura UUID, p_tipologia UUID, p_arrivo DATE, p_partenza DATE,
                                       p_adulti INT DEFAULT 2, p_bambini INT DEFAULT 0, p_piano UUID DEFAULT NULL,
                                       p_trattamento UUID DEFAULT NULL, p_canale TEXT DEFAULT 'diretto',
                                       p_prenotata_il DATE DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date)
RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  p hotel_piani_tariffari%ROWTYPE;
  tr hotel_trattamenti%ROWTYPE;
  t hotel_tipologie%ROWTYPE;
  d DATE;
  n RECORD;
  v_notti JSONB := '[]'::jsonb;
  v_motivi TEXT[] := '{}';
  v_totale NUMERIC := 0;
  v_persone INT := p_adulti + p_bambini;
  v_tratt NUMERIC;
  v_n INT := p_partenza - p_arrivo;
  v_min INT;
BEGIN
  IF p_partenza <= p_arrivo THEN RAISE EXCEPTION 'La partenza deve seguire l''arrivo'; END IF;
  SELECT * INTO t FROM hotel_tipologie WHERE id = p_tipologia AND struttura_id = p_struttura;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Tipologia di un''altra struttura'; END IF;
  IF v_persone > t.occupazione_max THEN
    v_motivi := v_motivi || format('La %s ospita al massimo %s %s', t.nome, t.occupazione_max,
                                   CASE WHEN t.occupazione_max = 1 THEN 'persona' ELSE 'persone' END);
  END IF;
  IF p_piano IS NOT NULL THEN
    SELECT * INTO p FROM hotel_piani_tariffari WHERE id = p_piano AND struttura_id = p_struttura;
    IF p.id IS NULL THEN RAISE EXCEPTION 'Piano tariffario di un''altra struttura'; END IF;
    IF NOT p.attivo THEN v_motivi := v_motivi || 'Piano tariffario non attivo'::text; END IF;
    IF (p.valido_dal IS NOT NULL AND p_arrivo < p.valido_dal) OR (p.valido_al IS NOT NULL AND p_arrivo > p.valido_al) THEN
      v_motivi := v_motivi || 'Il piano non vale in queste date'::text;
    END IF;
    IF p.anticipo_min_giorni IS NOT NULL AND p_arrivo - p_prenotata_il < p.anticipo_min_giorni THEN
      v_motivi := v_motivi || format('Prenotazione anticipata: almeno %s giorni prima', p.anticipo_min_giorni);
    END IF;
    IF p.anticipo_max_giorni IS NOT NULL AND p_arrivo - p_prenotata_il > p.anticipo_max_giorni THEN
      v_motivi := v_motivi || format('Ultimo minuto: al massimo %s giorni prima', p.anticipo_max_giorni);
    END IF;
    IF p.soggiorno_min IS NOT NULL AND v_n < p.soggiorno_min THEN v_motivi := v_motivi || format('Soggiorno minimo di %s notti', p.soggiorno_min); END IF;
    IF p.soggiorno_max IS NOT NULL AND v_n > p.soggiorno_max THEN v_motivi := v_motivi || format('Soggiorno massimo di %s notti', p.soggiorno_max); END IF;
    IF NOT (EXTRACT(ISODOW FROM p_arrivo)::smallint = ANY (p.giorni_arrivo)) THEN v_motivi := v_motivi || 'Arrivo non ammesso in questo giorno della settimana'::text; END IF;
    IF cardinality(p.canali) > 0 AND NOT (p_canale = ANY (p.canali)) THEN v_motivi := v_motivi || 'Piano non venduto su questo canale'::text; END IF;
  END IF;
  SELECT * INTO tr FROM hotel_trattamenti WHERE id = COALESCE(p_trattamento, p.trattamento_id);
  v_tratt := COALESCE(tr.supplemento_adulto, 0) * p_adulti + COALESCE(tr.supplemento_bambino, 0) * p_bambini;

  d := p_arrivo;
  WHILE d < p_partenza LOOP
    SELECT * INTO n FROM hotel_prezzo_notte(p_piano, p_tipologia, d, v_persone);
    IF n.stop_vendita THEN v_motivi := v_motivi || format('Vendita chiusa il %s', to_char(d, 'DD/MM')); END IF;
    IF d = p_arrivo THEN
      v_min := n.soggiorno_min;
      IF n.chiuso_arrivo THEN v_motivi := v_motivi || 'Chiuso all''arrivo in questa data'::text; END IF;
    END IF;
    v_notti := v_notti || jsonb_build_object('data', d, 'camera', n.prezzo, 'trattamento', v_tratt);
    v_totale := v_totale + n.prezzo + v_tratt;
    d := d + 1;
  END LOOP;
  IF v_min IS NOT NULL AND v_n < v_min THEN v_motivi := v_motivi || format('Soggiorno minimo di %s notti per questo arrivo', v_min); END IF;
  IF (SELECT x.chiuso_partenza FROM hotel_prezzo_notte(p_piano, p_tipologia, p_partenza, v_persone) x) THEN
    v_motivi := v_motivi || 'Chiuso alla partenza in questa data'::text;
  END IF;

  RETURN jsonb_build_object('notti', v_notti, 'numero_notti', v_n, 'totale', ROUND(v_totale, 2),
                            'valida', cardinality(v_motivi) = 0, 'motivi', to_jsonb(v_motivi),
                            'caparra', ROUND(v_totale * COALESCE(p.caparra_pct, 0) / 100, 2),
                            'trattamento', tr.nome);
END;
$$;

-- ═══ 9. REGOLE DELLA PRENOTAZIONE ═══════════════════════════════════
CREATE OR REPLACE FUNCTION hotel_prenotazione_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  t hotel_tipologie%ROWTYPE;
  c hotel_camere%ROWTYPE;
  q JSONB;
  v_ok BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('PRN'); END IF;
  SELECT * INTO t FROM hotel_tipologie WHERE id = NEW.tipologia_id;
  IF t.struttura_id IS DISTINCT FROM NEW.struttura_id THEN
    RAISE EXCEPTION 'La tipologia è di un''altra struttura' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.adulti + NEW.bambini > t.occupazione_max THEN
    RAISE EXCEPTION 'La % ospita al massimo %', t.nome,
      t.occupazione_max || CASE WHEN t.occupazione_max = 1 THEN ' persona' ELSE ' persone' END USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.camera_id IS NOT NULL THEN
    SELECT * INTO c FROM hotel_camere WHERE id = NEW.camera_id;
    IF c.struttura_id IS DISTINCT FROM NEW.struttura_id THEN
      RAISE EXCEPTION 'La camera è di un''altra struttura' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Stati: avanti, mai indietro; check-in e check-out dalle loro funzioni.
    v_ok := NEW.stato = OLD.stato OR (OLD.stato, NEW.stato) IN (
      ('richiesta', 'opzionata'), ('richiesta', 'confermata'), ('richiesta', 'annullata'),
      ('opzionata', 'confermata'), ('opzionata', 'annullata'), ('opzionata', 'in_soggiorno'),
      ('confermata', 'opzionata'), ('confermata', 'in_soggiorno'), ('confermata', 'annullata'), ('confermata', 'no_show'),
      ('in_soggiorno', 'partita'), ('no_show', 'confermata'));
    IF NOT v_ok THEN
      RAISE EXCEPTION 'Una prenotazione % non diventa %', OLD.stato, NEW.stato USING ERRCODE = 'check_violation';
    END IF;
    IF OLD.stato IN ('partita', 'annullata') AND (NEW.arrivo, NEW.partenza, NEW.camera_id, NEW.prezzo_totale)
         IS DISTINCT FROM (OLD.arrivo, OLD.partenza, OLD.camera_id, OLD.prezzo_totale) THEN
      RAISE EXCEPTION 'Prenotazione chiusa: non si modifica' USING ERRCODE = 'check_violation';
    END IF;
    IF OLD.stato = 'in_soggiorno' AND NEW.arrivo <> OLD.arrivo THEN
      RAISE EXCEPTION 'L''ospite è già arrivato: si cambia solo la partenza' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.stato = 'in_soggiorno' AND OLD.stato <> 'in_soggiorno' AND NEW.check_in_at IS NULL THEN
      RAISE EXCEPTION 'L''arrivo si registra con il check-in' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.stato = 'partita' AND NEW.check_out_at IS NULL THEN
      RAISE EXCEPTION 'La partenza si registra con il check-out' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.stato = 'opzionata' AND NEW.opzione_scadenza IS NULL THEN
    NEW.opzione_scadenza := LEAST(NEW.arrivo, (NOW() AT TIME ZONE 'Europe/Rome')::date + 3);
  END IF;

  -- Prezzo dal piano tariffario, se non è stato fissato a mano.
  IF NOT NEW.prezzo_manuale AND (TG_OP = 'INSERT' OR (NEW.arrivo, NEW.partenza, NEW.tipologia_id, NEW.piano_id, NEW.trattamento_id,
       NEW.adulti, NEW.bambini) IS DISTINCT FROM (OLD.arrivo, OLD.partenza, OLD.tipologia_id, OLD.piano_id, OLD.trattamento_id,
       OLD.adulti, OLD.bambini)) THEN
    q := hotel_quota(NEW.struttura_id, NEW.tipologia_id, NEW.arrivo, NEW.partenza, NEW.adulti, NEW.bambini,
                     NEW.piano_id, NEW.trattamento_id, NEW.canale,
                     COALESCE((NEW.created_at AT TIME ZONE 'Europe/Rome')::date, (NOW() AT TIME ZONE 'Europe/Rome')::date));
    -- Le notti già addebitate restano al loro prezzo.
    NEW.prezzo_totale := (q->>'totale')::numeric;
    IF TG_OP = 'UPDATE' THEN
      NEW.prezzo_totale := NEW.prezzo_totale
        + COALESCE((SELECT SUM(n.prezzo_camera + n.prezzo_trattamento) FROM hotel_notti n
                     WHERE n.prenotazione_id = NEW.id AND n.conto_riga_id IS NOT NULL AND n.data >= NEW.arrivo AND n.data < NEW.partenza), 0)
        - COALESCE((SELECT SUM((x->>'camera')::numeric + (x->>'trattamento')::numeric)
                      FROM jsonb_array_elements(q->'notti') x
                     WHERE EXISTS (SELECT 1 FROM hotel_notti n WHERE n.prenotazione_id = NEW.id AND n.conto_riga_id IS NOT NULL
                                     AND n.data = (x->>'data')::date)), 0);
    END IF;
    IF NEW.caparra_richiesta = 0 AND TG_OP = 'INSERT' THEN NEW.caparra_richiesta := COALESCE((q->>'caparra')::numeric, 0); END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_prenotazioni_prepara BEFORE INSERT OR UPDATE ON hotel_prenotazioni
  FOR EACH ROW EXECUTE FUNCTION hotel_prenotazione_prepara();

-- Notti ricostruite a ogni cambio: quelle già sul conto non si toccano.
CREATE OR REPLACE FUNCTION hotel_prenotazione_notti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  q JSONB;
  x JSONB;
  v_fissate NUMERIC;
  v_libere INT;
  v_quota NUMERIC;
  v_resto NUMERIC;
  i INT := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.arrivo, NEW.partenza, NEW.tipologia_id, NEW.piano_id, NEW.trattamento_id, NEW.adulti,
       NEW.bambini, NEW.prezzo_totale, NEW.prezzo_manuale) IS NOT DISTINCT FROM (OLD.arrivo, OLD.partenza, OLD.tipologia_id,
       OLD.piano_id, OLD.trattamento_id, OLD.adulti, OLD.bambini, OLD.prezzo_totale, OLD.prezzo_manuale) THEN
    RETURN NEW;
  END IF;
  DELETE FROM hotel_notti WHERE prenotazione_id = NEW.id AND conto_riga_id IS NULL;
  -- Notti addebitate fuori dal nuovo periodo: errore (si storna prima la riga del conto).
  IF EXISTS (SELECT 1 FROM hotel_notti WHERE prenotazione_id = NEW.id AND (data < NEW.arrivo OR data >= NEW.partenza)) THEN
    RAISE EXCEPTION 'Ci sono notti già addebitate fuori dal nuovo periodo' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.prezzo_manuale THEN
    SELECT COALESCE(SUM(prezzo_camera + prezzo_trattamento), 0) INTO v_fissate FROM hotel_notti WHERE prenotazione_id = NEW.id;
    v_libere := NEW.notti - (SELECT count(*) FROM hotel_notti WHERE prenotazione_id = NEW.id);
    v_resto := NEW.prezzo_totale - v_fissate;
    FOR x IN SELECT jsonb_build_object('data', g::date) FROM generate_series(NEW.arrivo, NEW.partenza - 1, INTERVAL '1 day') g
              WHERE NOT EXISTS (SELECT 1 FROM hotel_notti n WHERE n.prenotazione_id = NEW.id AND n.data = g::date) LOOP
      i := i + 1;
      v_quota := CASE WHEN i = v_libere THEN v_resto ELSE ROUND((NEW.prezzo_totale - v_fissate) / NULLIF(v_libere, 0), 2) END;
      v_resto := v_resto - v_quota;
      INSERT INTO hotel_notti (prenotazione_id, data, prezzo_camera) VALUES (NEW.id, (x->>'data')::date, GREATEST(v_quota, 0));
    END LOOP;
  ELSE
    q := hotel_quota(NEW.struttura_id, NEW.tipologia_id, NEW.arrivo, NEW.partenza, NEW.adulti, NEW.bambini,
                     NEW.piano_id, NEW.trattamento_id, NEW.canale, (NEW.created_at AT TIME ZONE 'Europe/Rome')::date);
    INSERT INTO hotel_notti (prenotazione_id, data, prezzo_camera, prezzo_trattamento)
    SELECT NEW.id, (e->>'data')::date, (e->>'camera')::numeric, (e->>'trattamento')::numeric
      FROM jsonb_array_elements(q->'notti') e
     WHERE NOT EXISTS (SELECT 1 FROM hotel_notti n WHERE n.prenotazione_id = NEW.id AND n.data = (e->>'data')::date);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_prenotazioni_notti AFTER INSERT OR UPDATE ON hotel_prenotazioni
  FOR EACH ROW EXECUTE FUNCTION hotel_prenotazione_notti();

-- ═══ 10. DISPONIBILITÀ E OVERBOOKING ════════════════════════════════
-- Per giorno e tipologia: camere vendibili, vendute (anche senza camera
-- assegnata), bloccate dai gruppi fino al rilascio, disponibili. Con meno
-- di zero è overbooking.
CREATE OR REPLACE FUNCTION hotel_disponibilita(p_struttura UUID, p_dal DATE, p_al DATE)
RETURNS TABLE (data DATE, tipologia_id UUID, tipologia TEXT, camere INT, fuori_servizio INT, vendute INT,
               bloccate INT, disponibili INT, overbooking BOOLEAN)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH giorni AS (
    SELECT g::date AS data FROM generate_series(p_dal, p_al, INTERVAL '1 day') g
  ), tip AS (
    SELECT id, nome, ordine FROM hotel_tipologie WHERE struttura_id = p_struttura AND attiva
  ), base AS (
    SELECT g.data, t.id, t.nome, t.ordine,
           (SELECT count(*)::int FROM hotel_camere c WHERE c.tipologia_id = t.id AND c.attiva) AS camere,
           (SELECT count(*)::int FROM hotel_camere c WHERE c.tipologia_id = t.id AND c.attiva AND c.fuori_servizio
               AND (c.fuori_servizio_fino IS NULL OR c.fuori_servizio_fino >= g.data)) AS fs,
           (SELECT count(*)::int FROM hotel_prenotazioni p WHERE p.tipologia_id = t.id
               AND p.stato IN ('opzionata', 'confermata', 'in_soggiorno') AND g.data >= p.arrivo AND g.data < p.partenza) AS vendute,
           (SELECT COALESCE(SUM(GREATEST(b.camere - (SELECT count(*) FROM hotel_prenotazioni p2
                                                      WHERE p2.gruppo_id = gr.id AND p2.tipologia_id = t.id
                                                        AND p2.stato IN ('opzionata', 'confermata', 'in_soggiorno')
                                                        AND g.data >= p2.arrivo AND g.data < p2.partenza), 0)), 0)::int
              FROM hotel_gruppi_blocchi b JOIN hotel_gruppi gr ON gr.id = b.gruppo_id
             WHERE b.tipologia_id = t.id AND gr.stato <> 'annullato' AND g.data >= gr.arrivo AND g.data < gr.partenza
               AND (gr.rilascio IS NULL OR (NOW() AT TIME ZONE 'Europe/Rome')::date <= gr.rilascio)) AS bloccate
      FROM giorni g CROSS JOIN tip t
  )
  SELECT data, id, nome, camere, fs, vendute, bloccate, camere - fs - vendute - bloccate, camere - fs - vendute - bloccate < 0
    FROM base ORDER BY data, ordine, nome
$$;

-- Overbooking ammesso ma mai silenzioso: avviso alla direzione.
CREATE OR REPLACE FUNCTION hotel_prenotazione_overbooking()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_giorni TEXT;
  v_tip TEXT;
  dest UUID;
BEGIN
  IF NEW.stato NOT IN ('opzionata', 'confermata', 'in_soggiorno') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.arrivo, NEW.partenza, NEW.tipologia_id, NEW.stato) IS NOT DISTINCT FROM
                          (OLD.arrivo, OLD.partenza, OLD.tipologia_id, OLD.stato) THEN
    RETURN NEW;
  END IF;
  SELECT string_agg(to_char(d.data, 'DD/MM'), ', ' ORDER BY d.data), min(d.tipologia) INTO v_giorni, v_tip
    FROM hotel_disponibilita(NEW.struttura_id, NEW.arrivo, NEW.partenza - 1) d
   WHERE d.tipologia_id = NEW.tipologia_id AND d.overbooking;
  IF v_giorni IS NOT NULL THEN
    FOR dest IN SELECT id FROM user_profiles WHERE attivo AND ruolo IN ('admin', 'manager') LOOP
      PERFORM crea_notifica(dest, 'warning', 'Overbooking: ' || v_tip,
        'La prenotazione ' || NEW.codice || ' (' || NEW.ospite_nome || ') supera le camere disponibili il ' || v_giorni || '.',
        '/hotel/planning');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_prenotazioni_overbooking AFTER INSERT OR UPDATE ON hotel_prenotazioni
  FOR EACH ROW EXECUTE FUNCTION hotel_prenotazione_overbooking();

-- Stato della camera oggi: occupazione dalle prenotazioni, pulizia dalla camera.
CREATE VIEW hotel_camere_stato WITH (security_invoker = true) AS
SELECT c.id AS camera_id, c.struttura_id, c.modulo, c.numero, c.piano, c.edificio, c.tipologia_id, t.codice AS tipologia_codice,
       t.nome AS tipologia, c.posti_letto, c.stato_pulizia, c.fuori_servizio, c.fuori_servizio_motivo, c.ordine,
       occ.id AS prenotazione_id, occ.ospite_nome, occ.partenza AS partenza_prevista, occ.adulti + occ.bambini AS ospiti,
       arr.id AS arrivo_id, arr.ospite_nome AS arrivo_ospite, arr.arrivo_ora,
       CASE
         WHEN c.fuori_servizio THEN 'fuori_servizio'
         WHEN occ.id IS NOT NULL THEN 'occupata'
         WHEN c.stato_pulizia = 'verificata' THEN 'disponibile'
         ELSE c.stato_pulizia::text
       END AS stato,
       occ.partenza = (NOW() AT TIME ZONE 'Europe/Rome')::date AS partenza_oggi,
       arr.id IS NOT NULL AS arrivo_oggi
  FROM hotel_camere c
  JOIN hotel_tipologie t ON t.id = c.tipologia_id
  LEFT JOIN LATERAL (
    SELECT p.id, p.ospite_nome, p.partenza, p.adulti, p.bambini FROM hotel_prenotazioni p
     WHERE p.camera_id = c.id AND p.stato = 'in_soggiorno' LIMIT 1
  ) occ ON true
  LEFT JOIN LATERAL (
    SELECT p.id, p.ospite_nome, p.arrivo_ora FROM hotel_prenotazioni p
     WHERE p.camera_id = c.id AND p.stato IN ('opzionata', 'confermata')
       AND p.arrivo = (NOW() AT TIME ZONE 'Europe/Rome')::date LIMIT 1
  ) arr ON true
 WHERE c.attiva;

-- ═══ 11. CONTO CAMERA, CHECK-IN, NOTTI, CHECK-OUT ═══════════════════
CREATE OR REPLACE FUNCTION hotel_conto_prenotazione(p_prenotazione UUID)
RETURNS UUID
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  p hotel_prenotazioni%ROWTYPE;
  v_camera TEXT;
  v_conto UUID;
BEGIN
  SELECT * INTO p FROM hotel_prenotazioni WHERE id = p_prenotazione FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Prenotazione inesistente'; END IF;
  IF p.conto_id IS NOT NULL THEN RETURN p.conto_id; END IF;
  SELECT numero INTO v_camera FROM hotel_camere WHERE id = p.camera_id;
  INSERT INTO conti (modulo, descrizione, riferimento_tipo, riferimento_id, contatto_id, organizzazione_id, coperti,
                     accetta_acconti, created_by)
  VALUES ('hotel', COALESCE('Camera ' || v_camera || ' · ', '') || p.ospite_nome || ' · ' || p.codice, 'hotel_prenotazioni', p.id,
          COALESCE(p.pagatore_contatto_id, p.contatto_id), p.organizzazione_id, p.adulti + p.bambini, true, auth.uid())
  RETURNING id INTO v_conto;
  UPDATE hotel_prenotazioni SET conto_id = v_conto WHERE id = p.id;
  RETURN v_conto;
END;
$$;

-- Addebito delle notti fino al giorno indicato (escluso): una riga per notte.
CREATE OR REPLACE FUNCTION hotel_addebita_notti(p_prenotazione UUID, p_fino DATE)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p hotel_prenotazioni%ROWTYPE;
  n RECORD;
  v_tratt TEXT;
  v_riga UUID;
  k INT := 0;
BEGIN
  SELECT * INTO p FROM hotel_prenotazioni WHERE id = p_prenotazione;
  IF p.conto_id IS NULL OR NOT modulo_attivo('hotel') OR p.stato NOT IN ('in_soggiorno', 'partita') THEN RETURN 0; END IF;
  p_fino := LEAST(p_fino, p.partenza);
  SELECT nome INTO v_tratt FROM hotel_trattamenti WHERE id = p.trattamento_id;
  FOR n IN SELECT * FROM hotel_notti WHERE prenotazione_id = p.id AND conto_riga_id IS NULL AND data < p_fino ORDER BY data LOOP
    INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, riferimento_id, created_by)
    VALUES (p.conto_id, 'Pernottamento del ' || to_char(n.data, 'DD/MM/YYYY') || COALESCE(' · ' || v_tratt, ''),
            1, n.prezzo_camera + n.prezzo_trattamento, 10, 'hotel_notti', n.id, COALESCE(auth.uid(), p.created_by))
    RETURNING id INTO v_riga;
    UPDATE hotel_notti SET conto_riga_id = v_riga WHERE id = n.id;
    k := k + 1;
  END LOOP;
  RETURN k;
END;
$$;

-- Chiusura notturna: a ogni ospite in casa si addebitano le notti passate.
CREATE OR REPLACE FUNCTION hotel_audit_notturno()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p RECORD;
  k INT := 0;
BEGIN
  FOR p IN SELECT id FROM hotel_prenotazioni WHERE stato = 'in_soggiorno' AND conto_id IS NOT NULL LOOP
    k := k + hotel_addebita_notti(p.id, (NOW() AT TIME ZONE 'Europe/Rome')::date);
  END LOOP;
  RETURN k;
END;
$$;

CREATE OR REPLACE FUNCTION hotel_check_in(p_prenotazione UUID, p_camera UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  p hotel_prenotazioni%ROWTYPE;
  c hotel_camere%ROWTYPE;
  v_oggi DATE := (NOW() AT TIME ZONE 'Europe/Rome')::date;
  v_conto UUID;
BEGIN
  SELECT * INTO p FROM hotel_prenotazioni WHERE id = p_prenotazione FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Prenotazione inesistente'; END IF;
  IF p.stato NOT IN ('confermata', 'opzionata') THEN
    RAISE EXCEPTION 'Check-in non possibile: la prenotazione è %', p.stato USING ERRCODE = 'check_violation';
  END IF;
  IF p.arrivo > v_oggi THEN
    RAISE EXCEPTION 'L''arrivo è previsto il %', to_char(p.arrivo, 'DD/MM/YYYY') USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM hotel_soggiorno_ospiti so JOIN hotel_ospiti o ON o.id = so.ospite_id
                  WHERE so.prenotazione_id = p.id AND o.documento_numero IS NOT NULL AND o.documento_tipo IS NOT NULL) THEN
    RAISE EXCEPTION 'Registra almeno un ospite con il documento' USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO c FROM hotel_camere WHERE id = COALESCE(p_camera, p.camera_id);
  IF c.id IS NULL THEN RAISE EXCEPTION 'Assegna una camera' USING ERRCODE = 'check_violation'; END IF;
  IF c.fuori_servizio THEN RAISE EXCEPTION 'La camera % è fuori servizio', c.numero USING ERRCODE = 'check_violation'; END IF;
  IF c.stato_pulizia NOT IN ('pulita', 'verificata') THEN
    RAISE EXCEPTION 'La camera % non è pronta (%)', c.numero, replace(c.stato_pulizia::text, '_', ' ') USING ERRCODE = 'check_violation';
  END IF;
  UPDATE hotel_prenotazioni SET camera_id = c.id, stato = 'in_soggiorno', check_in_at = NOW() WHERE id = p.id;
  v_conto := hotel_conto_prenotazione(p.id);
  UPDATE conti SET descrizione = 'Camera ' || c.numero || ' · ' || p.ospite_nome || ' · ' || p.codice WHERE id = v_conto;
  RETURN v_conto;
END;
$$;

-- Tassa di soggiorno per ospite: regole del comune, periodi, età, notti massime, esenzioni.
CREATE OR REPLACE FUNCTION hotel_tassa_calcola(p_prenotazione UUID)
RETURNS TABLE (ospite_id UUID, nome TEXT, eta INT, notti INT, notti_tassabili INT, importo NUMERIC, esenzione TEXT)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  p hotel_prenotazioni%ROWTYPE;
  o RECORD;
  d DATE;
  r hotel_tassa_regole%ROWTYPE;
  v_pct NUMERIC;
  v_eta INT;
  v_tass INT;
  v_imp NUMERIC;
  v_max INT;
  v_righe INT := 0;
BEGIN
  SELECT * INTO p FROM hotel_prenotazioni WHERE id = p_prenotazione;
  FOR o IN
    SELECT so.ospite_id, trim(k.nome || ' ' || COALESCE(k.cognome, '')) AS nome, h.data_nascita, so.esenzione_tassa
      FROM hotel_soggiorno_ospiti so JOIN hotel_ospiti h ON h.id = so.ospite_id JOIN contatti k ON k.id = h.contatto_id
     WHERE so.prenotazione_id = p.id
  LOOP
    v_righe := v_righe + 1;
    v_eta := CASE WHEN o.data_nascita IS NULL THEN NULL ELSE date_part('year', age(p.arrivo, o.data_nascita))::int END;
    v_tass := 0; v_imp := 0; v_max := NULL;
    d := p.arrivo;
    WHILE d < p.partenza LOOP
      SELECT * INTO r FROM hotel_tassa_regole x
       WHERE x.struttura_id = p.struttura_id AND (x.dal IS NULL OR d >= x.dal) AND (x.al IS NULL OR d <= x.al)
       ORDER BY x.dal DESC NULLS LAST LIMIT 1;
      IF r.id IS NOT NULL AND o.esenzione_tassa IS NULL
         AND NOT (r.eta_esenzione_sotto IS NOT NULL AND v_eta IS NOT NULL AND v_eta < r.eta_esenzione_sotto)
         AND (r.notti_max IS NULL OR v_tass < r.notti_max) THEN
        SELECT COALESCE(max((x->>'pct')::numeric), 0) INTO v_pct FROM jsonb_array_elements(r.riduzioni) x
         WHERE v_eta IS NOT NULL AND v_eta BETWEEN (x->>'eta_da')::int AND (x->>'eta_a')::int;
        v_tass := v_tass + 1;
        v_imp := v_imp + r.importo_notte * (1 - v_pct / 100);
      END IF;
      d := d + 1;
    END LOOP;
    ospite_id := o.ospite_id; nome := o.nome; eta := v_eta; notti := p.partenza - p.arrivo;
    notti_tassabili := v_tass; importo := ROUND(v_imp, 2);
    esenzione := COALESCE(o.esenzione_tassa,
                   CASE WHEN v_tass = 0 AND v_eta IS NOT NULL AND r.eta_esenzione_sotto IS NOT NULL AND v_eta < r.eta_esenzione_sotto
                        THEN 'minore di ' || r.eta_esenzione_sotto || ' anni' END);
    RETURN NEXT;
  END LOOP;
  -- Ospiti non ancora registrati: si contano gli adulti della prenotazione.
  IF v_righe = 0 THEN
    v_tass := 0; v_imp := 0;
    d := p.arrivo;
    WHILE d < p.partenza LOOP
      SELECT * INTO r FROM hotel_tassa_regole x
       WHERE x.struttura_id = p.struttura_id AND (x.dal IS NULL OR d >= x.dal) AND (x.al IS NULL OR d <= x.al)
       ORDER BY x.dal DESC NULLS LAST LIMIT 1;
      IF r.id IS NOT NULL AND (r.notti_max IS NULL OR v_tass < r.notti_max) THEN
        v_tass := v_tass + 1; v_imp := v_imp + r.importo_notte;
      END IF;
      d := d + 1;
    END LOOP;
    ospite_id := NULL; nome := p.adulti || ' adulti (non registrati)'; eta := NULL; notti := p.partenza - p.arrivo;
    notti_tassabili := v_tass * p.adulti; importo := ROUND(v_imp * p.adulti, 2); esenzione := NULL;
    RETURN NEXT;
  END IF;
END;
$$;

-- Check-out in due tempi: il primo passaggio addebita notti e tassa e
-- restituisce quanto resta da saldare; a conto saldato chiude il soggiorno.
CREATE OR REPLACE FUNCTION hotel_check_out(p_prenotazione UUID)
RETURNS JSONB
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  p hotel_prenotazioni%ROWTYPE;
  v_oggi DATE := (NOW() AT TIME ZONE 'Europe/Rome')::date;
  v_conto UUID;
  v_residuo NUMERIC;
  v_tassa NUMERIC := 0;
  t RECORD;
BEGIN
  SELECT * INTO p FROM hotel_prenotazioni WHERE id = p_prenotazione FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Prenotazione inesistente'; END IF;
  IF p.stato <> 'in_soggiorno' THEN
    RAISE EXCEPTION 'Check-out non possibile: la prenotazione è %', p.stato USING ERRCODE = 'check_violation';
  END IF;
  -- Partenza anticipata: le notti non godute spariscono.
  IF p.partenza > v_oggi AND v_oggi > p.arrivo THEN
    UPDATE hotel_prenotazioni SET partenza = v_oggi WHERE id = p.id;
    SELECT * INTO p FROM hotel_prenotazioni WHERE id = p.id;
  END IF;
  v_conto := hotel_conto_prenotazione(p.id);
  PERFORM hotel_addebita_notti(p.id, p.partenza);
  -- Tassa di soggiorno: fuori campo IVA, una riga per ospite.
  IF NOT EXISTS (SELECT 1 FROM conti_righe WHERE conto_id = v_conto AND riferimento_tipo = 'hotel_tassa' AND NOT stornata) THEN
    FOR t IN SELECT * FROM hotel_tassa_calcola(p.id) WHERE importo > 0 LOOP
      INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, riferimento_id, created_by)
      VALUES (v_conto, 'Tassa di soggiorno · ' || t.nome || ' (' || t.notti_tassabili || ' notti)', 1, t.importo, 0,
              'hotel_tassa', p.id, auth.uid());
    END LOOP;
  END IF;
  SELECT COALESCE(SUM(importo), 0) INTO v_tassa FROM conti_righe
   WHERE conto_id = v_conto AND riferimento_tipo = 'hotel_tassa' AND NOT stornata;
  SELECT residuo INTO v_residuo FROM conti_saldi WHERE conto_id = v_conto;
  -- Da saldare (positivo) o da rimborsare (negativo, caparra più alta del conto).
  IF abs(v_residuo) > 0.005 THEN
    RETURN jsonb_build_object('completato', false, 'residuo', v_residuo, 'conto_id', v_conto, 'tassa', v_tassa);
  END IF;
  IF (SELECT stato FROM conti WHERE id = v_conto) = 'aperto' THEN PERFORM chiudi_conto(v_conto); END IF;
  UPDATE hotel_prenotazioni SET stato = 'partita', check_out_at = NOW() WHERE id = p.id;
  UPDATE hotel_camere SET stato_pulizia = 'da_pulire' WHERE id = p.camera_id;
  RETURN jsonb_build_object('completato', true, 'residuo', 0, 'conto_id', v_conto, 'tassa', v_tassa);
END;
$$;

-- Annullamento con la politica del piano: penale, caparra trattenuta o restituita.
CREATE OR REPLACE FUNCTION hotel_annulla_prenotazione(p_prenotazione UUID, p_motivo TEXT, p_rimborso_metodo pagamento_metodo DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  p hotel_prenotazioni%ROWTYPE;
  pi hotel_piani_tariffari%ROWTYPE;
  v_oggi DATE := (NOW() AT TIME ZONE 'Europe/Rome')::date;
  v_penale NUMERIC := 0;
  v_pagato NUMERIC := 0;
  v_rimborso NUMERIC := 0;
  v_conto UUID;
BEGIN
  SELECT * INTO p FROM hotel_prenotazioni WHERE id = p_prenotazione FOR UPDATE;
  IF p.stato NOT IN ('richiesta', 'opzionata', 'confermata') THEN
    RAISE EXCEPTION 'Non si annulla una prenotazione %', p.stato USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO pi FROM hotel_piani_tariffari WHERE id = p.piano_id;
  IF p.stato = 'confermata' THEN
    IF pi.id IS NOT NULL AND NOT pi.rimborsabile THEN
      v_penale := p.prezzo_totale;
    ELSIF pi.id IS NOT NULL AND p.arrivo - v_oggi < pi.cancellazione_giorni THEN
      v_penale := ROUND(p.prezzo_totale * pi.penale_pct / 100, 2);
    END IF;
  END IF;
  v_conto := p.conto_id;
  IF v_conto IS NOT NULL THEN
    SELECT pagato INTO v_pagato FROM conti_saldi WHERE conto_id = v_conto;
  END IF;
  IF v_penale > 0 THEN
    v_conto := hotel_conto_prenotazione(p.id);
    INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, riferimento_id, created_by)
    VALUES (v_conto, 'Penale di cancellazione · ' || p.codice, 1, v_penale, 0, 'hotel_penale', p.id, auth.uid());
  END IF;
  IF v_pagato > v_penale AND p_rimborso_metodo IS NOT NULL THEN
    v_rimborso := v_pagato - v_penale;
    INSERT INTO conti_rimborsi (conto_id, modulo, importo, metodo, motivo, created_by)
    VALUES (v_conto, 'hotel', v_rimborso, p_rimborso_metodo, 'Annullamento ' || p.codice, auth.uid());
  END IF;
  UPDATE hotel_prenotazioni SET stato = 'annullata', annullata_at = NOW(), motivo_annullamento = p_motivo,
         penale = NULLIF(v_penale, 0) WHERE id = p.id;
  IF v_conto IS NOT NULL AND (SELECT residuo FROM conti_saldi WHERE conto_id = v_conto) BETWEEN -0.005 AND 0.005
     AND (SELECT stato FROM conti WHERE id = v_conto) = 'aperto' THEN
    PERFORM chiudi_conto(v_conto);
  END IF;
  RETURN jsonb_build_object('penale', v_penale, 'pagato', v_pagato, 'rimborso', v_rimborso,
                            'credito', GREATEST(v_pagato - v_penale - v_rimborso, 0));
END;
$$;

-- No-show: prima notte (o tutto, se non rimborsabile) sul conto, da incassare.
CREATE OR REPLACE FUNCTION hotel_no_show(p_prenotazione UUID)
RETURNS NUMERIC
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  p hotel_prenotazioni%ROWTYPE;
  v_penale NUMERIC;
  v_conto UUID;
BEGIN
  SELECT * INTO p FROM hotel_prenotazioni WHERE id = p_prenotazione FOR UPDATE;
  IF p.stato <> 'confermata' OR p.arrivo >= (NOW() AT TIME ZONE 'Europe/Rome')::date THEN
    RAISE EXCEPTION 'No-show solo per una prenotazione confermata con l''arrivo già passato' USING ERRCODE = 'check_violation';
  END IF;
  SELECT CASE WHEN pi.id IS NOT NULL AND NOT pi.rimborsabile THEN p.prezzo_totale
              ELSE (SELECT prezzo_camera + prezzo_trattamento FROM hotel_notti WHERE prenotazione_id = p.id ORDER BY data LIMIT 1) END
    INTO v_penale
    FROM (SELECT 1) x LEFT JOIN hotel_piani_tariffari pi ON pi.id = p.piano_id;
  UPDATE hotel_prenotazioni SET stato = 'no_show', penale = v_penale WHERE id = p.id;
  IF COALESCE(v_penale, 0) > 0 THEN
    v_conto := hotel_conto_prenotazione(p.id);
    INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, riferimento_id, created_by)
    VALUES (v_conto, 'Mancata presentazione · ' || p.codice, 1, v_penale, 0, 'hotel_penale', p.id, auth.uid());
  END IF;
  RETURN COALESCE(v_penale, 0);
END;
$$;

-- Opzioni scadute: tornano in vendita (con avviso a chi le aveva create).
CREATE OR REPLACE FUNCTION hotel_opzioni_scadute()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p RECORD;
  k INT := 0;
BEGIN
  FOR p IN SELECT id, codice, ospite_nome, created_by FROM hotel_prenotazioni
            WHERE stato = 'opzionata' AND opzione_scadenza < (NOW() AT TIME ZONE 'Europe/Rome')::date LOOP
    UPDATE hotel_prenotazioni SET stato = 'annullata', annullata_at = NOW(), motivo_annullamento = 'Opzione scaduta' WHERE id = p.id;
    IF p.created_by IS NOT NULL THEN
      PERFORM crea_notifica(p.created_by, 'info', 'Opzione scaduta: ' || p.codice,
                            p.ospite_nome || ': la camera è tornata in vendita.', '/hotel/prenotazioni');
    END IF;
    k := k + 1;
  END LOOP;
  RETURN k;
END;
$$;

-- Scadenze in notifica: caparra da ricevere, opzione in scadenza.
CREATE OR REPLACE FUNCTION hotel_prenotazione_scadenze()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  DELETE FROM scadenze_moduli WHERE entita = 'hotel_prenotazioni' AND entita_id = NEW.id AND stato = 'aperta';
  IF NEW.stato IN ('opzionata', 'confermata') THEN
    IF NEW.stato = 'opzionata' AND NEW.opzione_scadenza IS NOT NULL THEN
      INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
      VALUES ('hotel', 'hotel_prenotazioni', NEW.id, 'Opzione', NEW.codice || ' · ' || NEW.ospite_nome,
              NEW.opzione_scadenza, '/hotel/prenotazioni', NEW.created_by);
    END IF;
    IF NEW.caparra_richiesta > 0 AND NEW.caparra_scadenza IS NOT NULL
       AND COALESCE((SELECT pagato FROM conti_saldi WHERE conto_id = NEW.conto_id), 0) < NEW.caparra_richiesta THEN
      INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, solo_manager, created_by)
      VALUES ('hotel', 'hotel_prenotazioni', NEW.id, 'Caparra', NEW.codice || ' · ' || NEW.ospite_nome || ' · ' || NEW.caparra_richiesta || ' €',
              NEW.caparra_scadenza, '/hotel/prenotazioni', false, NEW.created_by);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_prenotazioni_scadenze AFTER INSERT OR UPDATE OF stato, opzione_scadenza, caparra_richiesta, caparra_scadenza, conto_id
  ON hotel_prenotazioni FOR EACH ROW EXECUTE FUNCTION hotel_prenotazione_scadenze();

-- Un pagamento sul conto della prenotazione aggiorna la scadenza della caparra.
CREATE OR REPLACE FUNCTION hotel_pagamento_scadenze()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF (SELECT riferimento_tipo FROM conti WHERE id = NEW.conto_id) = 'hotel_prenotazioni' THEN
    UPDATE hotel_prenotazioni SET caparra_scadenza = caparra_scadenza WHERE conto_id = NEW.conto_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER conti_pagamenti_hotel_scadenze AFTER INSERT ON conti_pagamenti
  FOR EACH ROW EXECUTE FUNCTION hotel_pagamento_scadenze();

-- Codici e coerenze.
CREATE OR REPLACE FUNCTION hotel_gruppo_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('GRP'); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_gruppi_prepara BEFORE INSERT ON hotel_gruppi FOR EACH ROW EXECUTE FUNCTION hotel_gruppo_prepara();

CREATE OR REPLACE FUNCTION hotel_camera_coerente()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF (SELECT struttura_id FROM hotel_tipologie WHERE id = NEW.tipologia_id) IS DISTINCT FROM NEW.struttura_id THEN
    RAISE EXCEPTION 'La tipologia è di un''altra struttura' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT NEW.fuori_servizio THEN NEW.fuori_servizio_motivo := NULL; NEW.fuori_servizio_fino := NULL; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_camere_coerente BEFORE INSERT OR UPDATE OF tipologia_id, struttura_id, fuori_servizio ON hotel_camere
  FOR EACH ROW EXECUTE FUNCTION hotel_camera_coerente();

-- ═══ 12. TRIGGER COMUNI, RLS, PROTEZIONI ════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['hotel_strutture','hotel_aree','hotel_tipologie','hotel_camere','hotel_trattamenti',
                           'hotel_piani_tariffari','hotel_tariffe','hotel_intermediari','hotel_gruppi','hotel_ospiti',
                           'hotel_prenotazioni','hotel_soggiorno_ospiti','hotel_garanzie','hotel_tassa_regole'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['hotel_strutture','hotel_tipologie','hotel_camere','hotel_trattamenti','hotel_piani_tariffari',
                           'hotel_tariffe','hotel_intermediari','hotel_gruppi','hotel_gruppi_blocchi','hotel_ospiti',
                           'hotel_prenotazioni','hotel_soggiorno_ospiti','hotel_garanzie','hotel_tassa_regole','conti_rimborsi'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['hotel_strutture','hotel_aree','hotel_tipologie','hotel_camere','hotel_trattamenti',
                           'hotel_piani_tariffari','hotel_tariffe','hotel_intermediari','hotel_gruppi','hotel_gruppi_blocchi',
                           'hotel_ospiti','hotel_prenotazioni','hotel_notti','hotel_soggiorno_ospiti','hotel_garanzie',
                           'hotel_tassa_regole','conti_rimborsi'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;

  -- Configurazione (struttura, camere, tariffe, contratti, regole della tassa): la direzione.
  FOREACH t IN ARRAY ARRAY['hotel_strutture','hotel_aree','hotel_tipologie','hotel_trattamenti','hotel_piani_tariffari',
                           'hotel_tariffe','hotel_intermediari','hotel_tassa_regole'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;

  -- Lavoro di ricevimento: tutto il personale dell'hotel.
  FOREACH t IN ARRAY ARRAY['hotel_gruppi','hotel_gruppi_blocchi','hotel_ospiti','hotel_prenotazioni','hotel_soggiorno_ospiti',
                           'hotel_garanzie','conti_rimborsi'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['hotel_gruppi','hotel_ospiti','hotel_prenotazioni','hotel_soggiorno_ospiti','hotel_garanzie'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;
END $$;

-- Camere: la direzione le crea; il personale ne cambia lo stato (pulizia, fuori servizio).
CREATE POLICY "hotel_camere_insert" ON hotel_camere FOR INSERT TO authenticated
  WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid());
CREATE POLICY "hotel_camere_update" ON hotel_camere FOR UPDATE TO authenticated
  USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo));
-- Le notti le scrivono i trigger: in lettura per tutti.
-- (nessuna policy di scrittura su hotel_notti)

GRANT SELECT ON hotel_camere_stato TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'hotel_prenotazione_prepara()', 'hotel_prenotazione_notti()', 'hotel_prenotazione_overbooking()',
    'hotel_prenotazione_scadenze()', 'hotel_camera_coerente()', 'hotel_audit_notturno()', 'hotel_opzioni_scadute()',
    'conto_pagamento_controlla()',
    'conto_rimborso_controlla()', 'hotel_gruppo_prepara()', 'hotel_pagamento_scadenze()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
    'hotel_prezzo_notte(uuid,uuid,date,integer)',
    'hotel_quota(uuid,uuid,date,date,integer,integer,uuid,uuid,text,date)',
    'hotel_disponibilita(uuid,date,date)', 'hotel_addebita_notti(uuid,date)',
    'hotel_conto_prenotazione(uuid)', 'hotel_check_in(uuid,uuid)', 'hotel_tassa_calcola(uuid)', 'hotel_check_out(uuid)',
    'hotel_annulla_prenotazione(uuid,text,pagamento_metodo)', 'hotel_no_show(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('hotel-audit-notturno', 'hotel-opzioni-scadute');
SELECT cron.schedule('hotel-audit-notturno', '0 3 * * *', $$SELECT hotel_audit_notturno()$$);
SELECT cron.schedule('hotel-opzioni-scadute', '30 23 * * *', $$SELECT hotel_opzioni_scadute()$$);

SELECT applica_protezioni_tabelle();
