-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Garage e autorimesse (Sprint 6) · 1/2: struttura e posti, clienti
-- e veicoli, tariffari, contratti e abbonamenti con le rate, ingressi e
-- uscite, sosta a rotazione, prenotazioni, accessi autorizzati.
--
-- Documento Garage §1–11, §13–14.
--
-- Un posto non è mai di due veicoli insieme, né riservato a due contratti
-- nello stesso periodo, né prenotato due volte (vincoli nel database).
-- La tariffa della sosta la calcola una sola funzione, `gar_calcola_tariffa`:
-- franchigia, frazioni, notte a prezzo fisso, festivi, tetto giornaliero.
-- Lettori di targhe, badge, RFID, telecomandi e app sono predisposti:
-- chiamano `gar_ingresso` e `gar_uscita` come fa l'operatore.
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. STRUTTURE, AREE, POSTI (§1–3) ═══════════════════════════════
CREATE TABLE gar_strutture (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  nome             TEXT NOT NULL,
  indirizzo        TEXT,
  comune           TEXT,
  tipologia        TEXT NOT NULL DEFAULT 'autorimessa' CHECK (tipologia IN ('autorimessa', 'parcheggio_coperto', 'parcheggio_scoperto', 'silos', 'box', 'misto')),
  superficie_mq    NUMERIC(10,1) CHECK (superficie_mq > 0),
  piani            INT NOT NULL DEFAULT 1 CHECK (piani > 0),
  altezza_max_m    NUMERIC(4,2) CHECK (altezza_max_m > 0),
  peso_max_kg      INT CHECK (peso_max_kg > 0),
  orari            JSONB NOT NULL DEFAULT '[]',          -- [{giorni:[1..7], dalle, alle}]; vuoto = sempre aperto
  modalita_accesso TEXT[] NOT NULL DEFAULT '{manuale}',  -- manuale, targa, badge, rfid, qr, telecomando, app
  responsabile_id  UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  avvisa_ingresso  BOOLEAN NOT NULL DEFAULT false,       -- conferma d'ingresso per email al cliente
  attiva           BOOLEAN NOT NULL DEFAULT true,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);

-- Ciò che sulla mappa non è un posto: corsie, rampe, ingressi, uscite, aree riservate e di servizio.
CREATE TABLE gar_aree (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  struttura_id UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  piano        INT NOT NULL DEFAULT 0,
  nome         TEXT NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'corsia' CHECK (tipo IN ('corsia', 'rampa', 'ingresso', 'uscita', 'riservata', 'servizio', 'altro')),
  ordine       INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id)
);

CREATE TABLE gar_posti (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo        TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  struttura_id  UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  codice        TEXT NOT NULL,                           -- «P1-A-12»
  piano         INT NOT NULL DEFAULT 0,
  zona          TEXT,
  numero        INT,
  tipo          TEXT NOT NULL DEFAULT 'auto' CHECK (tipo IN ('auto', 'moto', 'commerciale', 'elettrico', 'disabili')),
  lunghezza_m   NUMERIC(4,2) CHECK (lunghezza_m > 0),
  larghezza_m   NUMERIC(4,2) CHECK (larghezza_m > 0),
  coperto       BOOLEAN NOT NULL DEFAULT true,
  riservato     BOOLEAN NOT NULL DEFAULT false,          -- solo per contratti: mai dato alla rotazione
  fermo         TEXT CHECK (fermo IN ('manutenzione', 'non_disponibile')),
  canone        NUMERIC(10,2) CHECK (canone >= 0),       -- canone mensile di listino
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id),
  UNIQUE (struttura_id, codice)
);
CREATE INDEX idx_gar_posti_struttura ON gar_posti (struttura_id, piano, numero);

-- ═══ 2. CLIENTI E VEICOLI (§4–5) ════════════════════════════════════
-- La scheda garage del cliente: privato (contatto) o azienda (organizzazione).
CREATE TABLE gar_clienti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  codice            TEXT UNIQUE,
  tipo              TEXT NOT NULL DEFAULT 'privato' CHECK (tipo IN ('privato', 'azienda')),
  nome              TEXT NOT NULL,
  contatto_id       UUID UNIQUE REFERENCES contatti(id) ON DELETE SET NULL,
  organizzazione_id UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  codice_fiscale    TEXT,
  partita_iva       TEXT,
  telefono          TEXT,
  email             TEXT,
  indirizzo         TEXT,
  note              TEXT,
  attivo            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  ricerca           TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple',
                      COALESCE(codice, '') || ' ' || nome || ' ' || COALESCE(telefono, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(partita_iva, ''))) STORED
);
CREATE INDEX idx_gar_clienti_ricerca ON gar_clienti USING gin (ricerca);

CREATE TABLE gar_veicoli (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  cliente_id            UUID REFERENCES gar_clienti(id) ON DELETE SET NULL,
  targa                 TEXT NOT NULL UNIQUE,              -- maiuscola, senza spazi
  marca                 TEXT,
  modello               TEXT,
  tipo                  TEXT NOT NULL DEFAULT 'auto' CHECK (tipo IN ('auto', 'moto', 'suv', 'furgone', 'camper', 'commerciale', 'altro')),
  colore                TEXT,
  alimentazione         TEXT CHECK (alimentazione IN ('benzina', 'diesel', 'gpl', 'metano', 'ibrida', 'elettrica', 'altro')),
  cilindrata            INT CHECK (cilindrata > 0),
  lunghezza_m           NUMERIC(4,2),
  larghezza_m           NUMERIC(4,2),
  altezza_m             NUMERIC(4,2),
  peso_kg               INT,
  proprietario          TEXT,
  utilizzatore          TEXT,
  assicurazione         TEXT,                              -- compagnia e polizza
  assicurazione_scadenza DATE,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id)
);
ALTER TABLE gar_veicoli ADD COLUMN ricerca TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple',
  targa || ' ' || COALESCE(marca, '') || ' ' || COALESCE(modello, '') || ' ' || COALESCE(colore, ''))) STORED;
CREATE INDEX idx_gar_veicoli_cliente ON gar_veicoli (cliente_id);
CREATE INDEX idx_gar_veicoli_ricerca ON gar_veicoli USING gin (ricerca);

-- ═══ 3. TARIFFARI E FESTIVI (§9) ════════════════════════════════════
CREATE TABLE gar_tariffari (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo              TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  struttura_id        UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  nome                TEXT NOT NULL,
  tipo_veicolo        TEXT CHECK (tipo_veicolo IN ('auto', 'moto', 'suv', 'furgone', 'camper', 'commerciale', 'altro')),  -- NULL = tutti
  convenzionato       BOOLEAN NOT NULL DEFAULT false,      -- tariffa delle convenzioni aziendali
  franchigia_min      INT NOT NULL DEFAULT 10 CHECK (franchigia_min >= 0),   -- sotto questa durata non si paga
  frazione_min        INT NOT NULL DEFAULT 60 CHECK (frazione_min > 0),      -- 60 = tariffa oraria, 30 = mezz'ora
  prezzo_frazione     NUMERIC(8,2) NOT NULL CHECK (prezzo_frazione >= 0),
  notte_dalle         TIME,                                -- fascia notturna a prezzo fisso (può scavalcare la mezzanotte)
  notte_alle          TIME,
  prezzo_notte        NUMERIC(8,2) CHECK (prezzo_notte >= 0),
  festivo_pct         NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (festivo_pct BETWEEN -100 AND 300),  -- maggiorazione (o sconto) nei festivi
  tetto_giornaliero   NUMERIC(8,2) CHECK (tetto_giornaliero >= 0),           -- massimo per ogni 24 ore = tariffa giornaliera
  settimanale         NUMERIC(8,2) CHECK (settimanale >= 0),
  mensile             NUMERIC(8,2) CHECK (mensile >= 0),
  annuale             NUMERIC(8,2) CHECK (annuale >= 0),
  condizioni          TEXT,
  attivo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES user_profiles(id),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by          UUID REFERENCES user_profiles(id),
  CHECK ((notte_dalle IS NULL) = (notte_alle IS NULL) AND (notte_dalle IS NULL) = (prezzo_notte IS NULL))
);

-- Festività mobili o locali (Pasquetta, patrono): le fisse nazionali le conosce la funzione.
CREATE TABLE gar_festivi (
  data        DATE PRIMARY KEY,
  modulo      TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  descrizione TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id)
);

-- ═══ 4. CONVENZIONI AZIENDALI (§13) ═════════════════════════════════
CREATE TABLE gar_convenzioni (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  codice            TEXT UNIQUE,
  struttura_id      UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  cliente_id        UUID NOT NULL REFERENCES gar_clienti(id) ON DELETE RESTRICT,   -- l'azienda
  posti_acquistati  INT NOT NULL DEFAULT 1 CHECK (posti_acquistati > 0),
  tariffario_id     UUID REFERENCES gar_tariffari(id) ON DELETE SET NULL,          -- tariffa convenzionata per le soste a consumo
  canone_mensile    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (canone_mensile >= 0),  -- per i posti acquistati
  dal               DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  al                DATE,
  fatturazione      TEXT NOT NULL DEFAULT 'mensile' CHECK (fatturazione IN ('mensile', 'trimestrale', 'annuale')),
  fatturato_fino    DATE,
  attiva            BOOLEAN NOT NULL DEFAULT true,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  CHECK (al IS NULL OR al >= dal)
);

-- ═══ 5. CONTRATTI E ABBONAMENTI (§6, §11) ═══════════════════════════
CREATE TABLE gar_contratti (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo               TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  codice               TEXT UNIQUE,
  struttura_id         UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  cliente_id           UUID NOT NULL REFERENCES gar_clienti(id) ON DELETE RESTRICT,
  veicolo_id           UUID REFERENCES gar_veicoli(id) ON DELETE SET NULL,
  posto_id             UUID REFERENCES gar_posti(id) ON DELETE SET NULL,
  tipo                 TEXT NOT NULL DEFAULT 'abbonamento_mensile' CHECK (tipo IN ('abbonamento_mensile', 'abbonamento_annuale', 'sosta_giornaliera',
                         'sosta_oraria', 'sosta_notturna', 'posto_riservato', 'custodia', 'noleggio_posto', 'convenzione')),
  convenzione_id       UUID REFERENCES gar_convenzioni(id) ON DELETE SET NULL,
  inizio               DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  fine                 DATE,                               -- NULL = a tempo indeterminato
  canone               NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (canone >= 0),
  periodicita          TEXT NOT NULL DEFAULT 'mensile' CHECK (periodicita IN ('una_tantum', 'mensile', 'trimestrale', 'annuale')),
  deposito_cauzionale  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposito_cauzionale >= 0),
  deposito_versato     BOOLEAN NOT NULL DEFAULT false,
  condizioni           TEXT,
  rinnovo_automatico   BOOLEAN NOT NULL DEFAULT true,
  preavviso_giorni     INT NOT NULL DEFAULT 30 CHECK (preavviso_giorni >= 0),
  recesso_il           DATE,                               -- comunicato il recesso: finisce a questa data
  pagamento_automatico BOOLEAN NOT NULL DEFAULT false,     -- addebito ricorrente (predisposto)
  stato                TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo', 'sospeso', 'scaduto', 'disdetto')),
  sospeso_dal          DATE,
  sospeso_al           DATE,
  rate_fino            DATE,                               -- fin dove sono state emesse le rate
  note                 TEXT,
  periodo              DATERANGE GENERATED ALWAYS AS (daterange(inizio, COALESCE(recesso_il, fine), '[]')) STORED,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES user_profiles(id),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES user_profiles(id),
  CHECK (fine IS NULL OR fine >= inizio),
  -- Un posto non è di due contratti nello stesso periodo.
  CONSTRAINT gar_posto_un_contratto EXCLUDE USING gist (posto_id WITH =, periodo WITH &&) WHERE (posto_id IS NOT NULL AND stato IN ('attivo', 'sospeso'))
);
CREATE INDEX idx_gar_contratti_cliente ON gar_contratti (cliente_id);
CREATE INDEX idx_gar_contratti_veicolo ON gar_contratti (veicolo_id);

CREATE TABLE gar_rate (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo        TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  contratto_id  UUID NOT NULL REFERENCES gar_contratti(id) ON DELETE CASCADE,
  cliente_id    UUID NOT NULL REFERENCES gar_clienti(id) ON DELETE CASCADE,
  descrizione   TEXT NOT NULL,
  periodo_dal   DATE NOT NULL,
  periodo_al    DATE NOT NULL,
  scadenza      DATE NOT NULL,
  importo       NUMERIC(10,2) NOT NULL CHECK (importo > 0),
  stato         TEXT NOT NULL DEFAULT 'da_pagare' CHECK (stato IN ('da_pagare', 'pagata', 'insoluta', 'annullata')),
  pagata_il     DATE,
  conto_id      UUID REFERENCES conti(id) ON DELETE SET NULL,
  avviso_il     DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id),
  UNIQUE (contratto_id, periodo_dal)
);
CREATE INDEX idx_gar_rate_stato ON gar_rate (stato, scadenza);

-- ═══ 6. ACCESSI AUTORIZZATI (§14) ═══════════════════════════════════
CREATE TABLE gar_autorizzazioni (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  cliente_id   UUID NOT NULL REFERENCES gar_clienti(id) ON DELETE CASCADE,
  convenzione_id UUID REFERENCES gar_convenzioni(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL DEFAULT 'delegato' CHECK (tipo IN ('titolare', 'delegato', 'dipendente', 'ospite', 'temporaneo')),
  persona      TEXT,                                      -- chi è autorizzato
  veicolo_id   UUID REFERENCES gar_veicoli(id) ON DELETE CASCADE,
  targa        TEXT,                                      -- veicolo non in anagrafica (ospite)
  livello      TEXT NOT NULL DEFAULT 'accesso' CHECK (livello IN ('accesso', 'accesso_e_ritiro', 'completo')),
  fasce        JSONB NOT NULL DEFAULT '[]',               -- [{giorni:[1..7], dalle, alle}]; vuoto = sempre
  posti        UUID[] NOT NULL DEFAULT '{}',              -- vuoto = quelli del contratto
  dal          DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  al           DATE,                                      -- accessi temporanei e ospiti
  codice       TEXT,                                      -- badge, RFID, QR, telecomando
  attiva       BOOLEAN NOT NULL DEFAULT true,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id),
  CHECK (veicolo_id IS NOT NULL OR targa IS NOT NULL OR persona IS NOT NULL)
);
CREATE INDEX idx_gar_autorizzazioni_cliente ON gar_autorizzazioni (cliente_id);

-- ═══ 7. PRENOTAZIONI (§10) ══════════════════════════════════════════
CREATE TABLE gar_prenotazioni (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  codice       TEXT UNIQUE,
  struttura_id UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  cliente_id   UUID REFERENCES gar_clienti(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  telefono     TEXT,
  veicolo_id   UUID REFERENCES gar_veicoli(id) ON DELETE SET NULL,
  targa        TEXT,
  tipo_veicolo TEXT NOT NULL DEFAULT 'auto',
  posto_id     UUID REFERENCES gar_posti(id) ON DELETE SET NULL,
  ingresso     TIMESTAMPTZ NOT NULL,
  uscita       TIMESTAMPTZ NOT NULL,
  tariffario_id UUID REFERENCES gar_tariffari(id) ON DELETE SET NULL,
  importo_previsto NUMERIC(10,2),
  anticipo     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (anticipo >= 0),
  stato        TEXT NOT NULL DEFAULT 'confermata' CHECK (stato IN ('richiesta', 'confermata', 'arrivata', 'annullata', 'non_presentato')),
  canale       TEXT NOT NULL DEFAULT 'telefono' CHECK (canale IN ('banco', 'telefono', 'email', 'online', 'app')),
  note         TEXT,
  periodo      TSTZRANGE GENERATED ALWAYS AS (tstzrange(ingresso, uscita, '[)')) STORED,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id),
  CHECK (uscita > ingresso),
  CONSTRAINT gar_posto_una_prenotazione EXCLUDE USING gist (posto_id WITH =, periodo WITH &&) WHERE (posto_id IS NOT NULL AND stato IN ('richiesta', 'confermata', 'arrivata'))
);
CREATE INDEX idx_gar_prenotazioni_ingresso ON gar_prenotazioni (struttura_id, ingresso);

-- ═══ 8. SOSTE: REGISTRO DI INGRESSI E USCITE (§7–8) ═════════════════
CREATE TABLE gar_soste (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  ticket            TEXT UNIQUE,                          -- TKT-2026-000123
  struttura_id      UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  targa             TEXT NOT NULL,
  veicolo_id        UUID REFERENCES gar_veicoli(id) ON DELETE SET NULL,
  cliente_id        UUID REFERENCES gar_clienti(id) ON DELETE SET NULL,
  contratto_id      UUID REFERENCES gar_contratti(id) ON DELETE SET NULL,   -- abbonato: niente tariffa
  convenzione_id    UUID REFERENCES gar_convenzioni(id) ON DELETE SET NULL, -- a consumo, sul conto dell'azienda
  prenotazione_id   UUID REFERENCES gar_prenotazioni(id) ON DELETE SET NULL,
  posto_id          UUID REFERENCES gar_posti(id) ON DELETE SET NULL,
  tipo_veicolo      TEXT NOT NULL DEFAULT 'auto',
  ingresso_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uscita_at         TIMESTAMPTZ,
  modalita_ingresso TEXT NOT NULL DEFAULT 'manuale' CHECK (modalita_ingresso IN ('manuale', 'targa', 'badge', 'rfid', 'qr', 'telecomando', 'app')),
  modalita_uscita   TEXT CHECK (modalita_uscita IN ('manuale', 'targa', 'badge', 'rfid', 'qr', 'telecomando', 'app')),
  operatore_ingresso UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  operatore_uscita  UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  tariffario_id     UUID REFERENCES gar_tariffari(id) ON DELETE SET NULL,
  minuti            INT,
  importo           NUMERIC(10,2),
  dettaglio         JSONB,                                -- come è stato calcolato l'importo
  stato             TEXT NOT NULL DEFAULT 'in_corso' CHECK (stato IN ('in_corso', 'da_pagare', 'chiusa')),
  conto_id          UUID REFERENCES conti(id) ON DELETE SET NULL,
  fatturata         BOOLEAN NOT NULL DEFAULT false,        -- sosta in convenzione già in fattura
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  CHECK (uscita_at IS NULL OR uscita_at >= ingresso_at)
);
-- Un posto ospita un veicolo alla volta; una targa non è dentro due volte.
CREATE UNIQUE INDEX idx_gar_soste_posto_occupato ON gar_soste (posto_id) WHERE uscita_at IS NULL AND posto_id IS NOT NULL;
CREATE UNIQUE INDEX idx_gar_soste_targa_dentro ON gar_soste (struttura_id, targa) WHERE uscita_at IS NULL;
CREATE INDEX idx_gar_soste_ingresso ON gar_soste (struttura_id, ingresso_at DESC);

-- ═══ 9. FUNZIONI DI SERVIZIO ════════════════════════════════════════
CREATE OR REPLACE FUNCTION gar_oggi()
RETURNS DATE LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT (NOW() AT TIME ZONE 'Europe/Rome')::date
$$;

CREATE OR REPLACE FUNCTION gar_targa(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT upper(regexp_replace(COALESCE(p, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

CREATE OR REPLACE FUNCTION gar_euro(p NUMERIC)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT replace(replace(replace(to_char(p, 'FM999G999G990D00'), ',', '#'), '.', ','), '#', '.') || ' €'
$$;

-- Domenica, festività nazionali fisse, più quelle scritte in tabella.
CREATE OR REPLACE FUNCTION gar_festivo(p_data DATE)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT EXTRACT(ISODOW FROM p_data) = 7
      OR to_char(p_data, 'MM-DD') IN ('01-01', '01-06', '04-25', '05-01', '06-02', '08-15', '11-01', '12-08', '12-25', '12-26')
      OR EXISTS (SELECT 1 FROM gar_festivi f WHERE f.data = p_data)
$$;

-- Avviso al cliente per email (servizio, non promozione). SMS e app predisposti.
CREATE OR REPLACE FUNCTION gar_avvisa(p_cliente UUID, p_oggetto TEXT, p_testo TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE c gar_clienti%ROWTYPE;
BEGIN
  SELECT * INTO c FROM gar_clienti WHERE id = p_cliente;
  IF c.email IS NULL THEN RETURN false; END IF;
  INSERT INTO mail_outbox (destinatario, oggetto, corpo_testo, corpo_html)
  VALUES (c.email, p_oggetto, 'Gentile ' || c.nome || E',\n\n' || p_testo,
          '<div style="font-family:system-ui,sans-serif;line-height:1.5"><p>Gentile ' || html_escape(c.nome) || ',</p><p>'
            || replace(html_escape(p_testo), E'\n', '<br>') || '</p></div>');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION gar_notifica_direzione(p_titolo TEXT, p_messaggio TEXT, p_url TEXT, p_tipo notifica_tipo DEFAULT 'warning')
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE dest UUID;
BEGIN
  FOR dest IN SELECT id FROM user_profiles WHERE attivo AND ruolo IN ('admin', 'manager') LOOP
    PERFORM crea_notifica(dest, p_tipo, p_titolo, p_messaggio, p_url);
  END LOOP;
END;
$$;

-- ═══ 10. CALCOLO DELLA TARIFFA DI SOSTA (§8–9) ══════════════════════
-- La sosta si divide in blocchi di 24 ore dall'ingresso. In ogni blocco:
-- i minuti nella fascia notturna costano il prezzo fisso della notte (una
-- volta per notte, anche se scavalca la mezzanotte o due blocchi); gli
-- altri si pagano a frazioni, maggiorate se il blocco comincia in un
-- festivo; il totale del blocco non supera il tetto giornaliero.
CREATE OR REPLACE FUNCTION gar_calcola_tariffa(p_tariffario UUID, p_ingresso TIMESTAMPTZ, p_uscita TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  t gar_tariffari%ROWTYPE;
  v_minuti INT;
  v_blocco_inizio TIMESTAMPTZ := p_ingresso;
  v_blocco_fine TIMESTAMPTZ;
  v_totale NUMERIC := 0;
  v_dettaglio JSONB := '[]';
  v_notti_pagate TIMESTAMPTZ[] := '{}';
  g DATE;
  n_inizio TIMESTAMPTZ;
  n_fine TIMESTAMPTZ;
  v_sovra INT;
  v_notte_min INT;
  v_notti INT;
  v_giorno_min INT;
  v_frazioni INT;
  v_festivo BOOLEAN;
  v_diurno NUMERIC;
  v_blocco NUMERIC;
BEGIN
  SELECT * INTO t FROM gar_tariffari WHERE id = p_tariffario;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Tariffario inesistente'; END IF;
  IF p_uscita < p_ingresso THEN RAISE EXCEPTION 'L''uscita precede l''ingresso'; END IF;
  v_minuti := ceil(EXTRACT(EPOCH FROM (p_uscita - p_ingresso)) / 60.0)::int;
  IF v_minuti <= t.franchigia_min THEN
    RETURN jsonb_build_object('importo', 0, 'minuti', v_minuti, 'franchigia', true, 'blocchi', '[]'::jsonb);
  END IF;

  WHILE v_blocco_inizio < p_uscita LOOP
    v_blocco_fine := LEAST(v_blocco_inizio + INTERVAL '24 hours', p_uscita);
    v_notte_min := 0; v_notti := 0;
    IF t.prezzo_notte IS NOT NULL THEN
      -- Le notti che toccano il blocco: quella cominciata il giorno prima e quelle dei giorni del blocco.
      FOR g IN SELECT d::date FROM generate_series(((v_blocco_inizio AT TIME ZONE 'Europe/Rome')::date - 1)::timestamp,
                                                   (v_blocco_fine AT TIME ZONE 'Europe/Rome')::date::timestamp, INTERVAL '1 day') d LOOP
        n_inizio := (g + t.notte_dalle) AT TIME ZONE 'Europe/Rome';
        n_fine := (CASE WHEN t.notte_alle <= t.notte_dalle THEN g + 1 ELSE g END + t.notte_alle) AT TIME ZONE 'Europe/Rome';
        v_sovra := GREATEST(ceil(EXTRACT(EPOCH FROM (LEAST(n_fine, v_blocco_fine) - GREATEST(n_inizio, v_blocco_inizio))) / 60.0)::int, 0);
        IF v_sovra > 0 THEN
          v_notte_min := v_notte_min + v_sovra;
          IF NOT (n_inizio = ANY (v_notti_pagate)) THEN
            v_notti := v_notti + 1;
            v_notti_pagate := v_notti_pagate || n_inizio;
          END IF;
        END IF;
      END LOOP;
    END IF;
    v_giorno_min := GREATEST(ceil(EXTRACT(EPOCH FROM (v_blocco_fine - v_blocco_inizio)) / 60.0)::int - v_notte_min, 0);
    v_frazioni := ceil(v_giorno_min::numeric / t.frazione_min)::int;
    v_festivo := gar_festivo((v_blocco_inizio AT TIME ZONE 'Europe/Rome')::date);
    v_diurno := round(v_frazioni * t.prezzo_frazione * (1 + (CASE WHEN v_festivo THEN t.festivo_pct ELSE 0 END) / 100), 2);
    v_blocco := v_diurno + v_notti * COALESCE(t.prezzo_notte, 0);
    IF t.tetto_giornaliero IS NOT NULL AND v_blocco > t.tetto_giornaliero THEN v_blocco := t.tetto_giornaliero; END IF;
    v_totale := v_totale + v_blocco;
    v_dettaglio := v_dettaglio || jsonb_build_object('dal', v_blocco_inizio, 'al', v_blocco_fine, 'frazioni', v_frazioni, 'notti', v_notti,
                                                     'festivo', v_festivo, 'importo', v_blocco,
                                                     'tetto', t.tetto_giornaliero IS NOT NULL AND v_diurno + v_notti * COALESCE(t.prezzo_notte, 0) > t.tetto_giornaliero);
    v_blocco_inizio := v_blocco_fine;
  END LOOP;
  RETURN jsonb_build_object('importo', v_totale, 'minuti', v_minuti, 'franchigia', false, 'blocchi', v_dettaglio);
END;
$$;

-- Il tariffario che vale per un veicolo: prima quello del suo tipo, poi il generale.
CREATE OR REPLACE FUNCTION gar_tariffario_per(p_struttura UUID, p_tipo_veicolo TEXT, p_convenzionato BOOLEAN DEFAULT false)
RETURNS UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT id FROM gar_tariffari
   WHERE struttura_id = p_struttura AND attivo AND convenzionato = p_convenzionato AND (tipo_veicolo IS NULL OR tipo_veicolo = p_tipo_veicolo)
   ORDER BY (tipo_veicolo IS NULL), created_at LIMIT 1
$$;

-- ═══ 11. STATO DEI POSTI (§3) ═══════════════════════════════════════
CREATE VIEW gar_posti_stato WITH (security_invoker = true) AS
SELECT p.id AS posto_id, p.struttura_id, p.modulo, p.codice, p.piano, p.zona, p.numero, p.tipo, p.coperto, p.riservato, p.fermo, p.canone,
       s.id AS sosta_id, s.targa, s.ingresso_at, s.ticket,
       c.id AS contratto_id, c.cliente_id, k.nome AS cliente, c.veicolo_id, v.targa AS targa_assegnata, c.inizio AS assegnato_dal,
       pr.id AS prenotazione_id, pr.cliente_nome AS prenotato_da, pr.ingresso AS prenotato_dalle,
       CASE
         WHEN p.fermo = 'manutenzione' THEN 'manutenzione'
         WHEN p.fermo = 'non_disponibile' THEN 'non_disponibile'
         WHEN s.id IS NOT NULL THEN 'occupato'
         WHEN pr.id IS NOT NULL THEN 'prenotato'
         WHEN c.id IS NOT NULL OR p.riservato THEN 'riservato'
         ELSE 'libero'
       END AS stato,
       p.note
  FROM gar_posti p
  LEFT JOIN gar_soste s ON s.posto_id = p.id AND s.uscita_at IS NULL
  LEFT JOIN LATERAL (SELECT x.* FROM gar_contratti x WHERE x.posto_id = p.id AND x.stato IN ('attivo', 'sospeso') AND x.periodo @> gar_oggi()
                      ORDER BY x.inizio DESC LIMIT 1) c ON true
  LEFT JOIN gar_clienti k ON k.id = c.cliente_id
  LEFT JOIN gar_veicoli v ON v.id = c.veicolo_id
  LEFT JOIN LATERAL (SELECT x.* FROM gar_prenotazioni x WHERE x.posto_id = p.id AND x.stato IN ('richiesta', 'confermata')
                        AND x.ingresso <= NOW() + INTERVAL '2 hours' AND x.uscita > NOW() ORDER BY x.ingresso LIMIT 1) pr ON true;

-- ═══ 12. CODICI E CONTROLLI ═════════════════════════════════════════
CREATE OR REPLACE FUNCTION gar_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_TABLE_NAME = 'gar_clienti' THEN
    IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('CLG'); END IF;
    -- Il cliente del garage è anche nel CRM: se non è collegato, la scheda nasce qui.
    IF TG_OP = 'INSERT' AND NEW.tipo = 'azienda' AND NEW.organizzazione_id IS NULL THEN
      INSERT INTO organizzazioni (ragione_sociale, piva, codice_fiscale, email, telefono, indirizzo, created_by)
      VALUES (NEW.nome, NEW.partita_iva, NEW.codice_fiscale, NEW.email, NEW.telefono, NEW.indirizzo, NEW.created_by)
      RETURNING id INTO NEW.organizzazione_id;
      INSERT INTO organizzazioni_ruoli (organizzazione_id, ruolo) VALUES (NEW.organizzazione_id, 'cliente') ON CONFLICT DO NOTHING;
    ELSIF TG_OP = 'INSERT' AND NEW.tipo = 'privato' AND NEW.contatto_id IS NULL THEN
      INSERT INTO contatti (nome, cognome, email, telefono, created_by)
      VALUES (split_part(NEW.nome, ' ', 1), NULLIF(trim(substr(NEW.nome, length(split_part(NEW.nome, ' ', 1)) + 1)), ''), NEW.email, NEW.telefono, NEW.created_by)
      RETURNING id INTO NEW.contatto_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'gar_veicoli' THEN
    NEW.targa := gar_targa(NEW.targa);
    IF NEW.targa = '' THEN RAISE EXCEPTION 'La targa è obbligatoria' USING ERRCODE = 'check_violation'; END IF;
  ELSIF TG_TABLE_NAME = 'gar_convenzioni' THEN
    IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('CVG'); END IF;
  ELSIF TG_TABLE_NAME = 'gar_autorizzazioni' THEN
    IF NEW.targa IS NOT NULL THEN NEW.targa := NULLIF(gar_targa(NEW.targa), ''); END IF;
  ELSIF TG_TABLE_NAME = 'gar_prenotazioni' THEN
    IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('PRG'); END IF;
    IF NEW.targa IS NOT NULL THEN NEW.targa := NULLIF(gar_targa(NEW.targa), ''); END IF;
    IF NEW.posto_id IS NOT NULL AND EXISTS (SELECT 1 FROM gar_posti WHERE id = NEW.posto_id AND (fermo IS NOT NULL OR struttura_id <> NEW.struttura_id)) THEN
      RAISE EXCEPTION 'Il posto non è prenotabile' USING ERRCODE = 'check_violation';
    END IF;
    NEW.tariffario_id := COALESCE(NEW.tariffario_id, gar_tariffario_per(NEW.struttura_id, NEW.tipo_veicolo));
    IF NEW.tariffario_id IS NOT NULL AND (TG_OP = 'INSERT' OR (NEW.ingresso, NEW.uscita) IS DISTINCT FROM (OLD.ingresso, OLD.uscita)) THEN
      NEW.importo_previsto := (gar_calcola_tariffa(NEW.tariffario_id, NEW.ingresso, NEW.uscita)->>'importo')::numeric;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_clienti_prepara BEFORE INSERT OR UPDATE ON gar_clienti FOR EACH ROW EXECUTE FUNCTION gar_prepara();
CREATE TRIGGER gar_veicoli_prepara BEFORE INSERT OR UPDATE ON gar_veicoli FOR EACH ROW EXECUTE FUNCTION gar_prepara();
CREATE TRIGGER gar_convenzioni_prepara BEFORE INSERT OR UPDATE ON gar_convenzioni FOR EACH ROW EXECUTE FUNCTION gar_prepara();
CREATE TRIGGER gar_autorizzazioni_prepara BEFORE INSERT OR UPDATE ON gar_autorizzazioni FOR EACH ROW EXECUTE FUNCTION gar_prepara();
CREATE TRIGGER gar_prenotazioni_prepara BEFORE INSERT OR UPDATE ON gar_prenotazioni FOR EACH ROW EXECUTE FUNCTION gar_prepara();

-- ═══ 13. CONTRATTI: CODICE, RATE, SCADENZE ══════════════════════════
CREATE OR REPLACE FUNCTION gar_contratto_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE p gar_posti%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('CTG'); END IF;
  IF NEW.posto_id IS NOT NULL THEN
    SELECT * INTO p FROM gar_posti WHERE id = NEW.posto_id;
    IF p.struttura_id <> NEW.struttura_id THEN RAISE EXCEPTION 'Il posto è di un''altra struttura' USING ERRCODE = 'check_violation'; END IF;
    IF TG_OP = 'INSERT' AND NEW.canone = 0 AND p.canone IS NOT NULL THEN NEW.canone := p.canone; END IF;
  END IF;
  IF NEW.stato = 'sospeso' AND NEW.sospeso_dal IS NULL THEN NEW.sospeso_dal := gar_oggi(); END IF;
  IF NEW.stato <> 'sospeso' THEN NEW.sospeso_dal := NULL; NEW.sospeso_al := NULL; END IF;
  IF NEW.recesso_il IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.recesso_il IS NULL) THEN NEW.rinnovo_automatico := false; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_contratti_prepara BEFORE INSERT OR UPDATE ON gar_contratti FOR EACH ROW EXECUTE FUNCTION gar_contratto_prepara();

-- Emette le rate del contratto fino alla data: una per periodo, in anticipo.
CREATE OR REPLACE FUNCTION gar_emetti_rate(p_contratto UUID, p_fino DATE DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c gar_contratti%ROWTYPE;
  v_dal DATE;
  v_al DATE;
  v_fine DATE;
  v_passo INTERVAL;
  v_fino DATE := COALESCE(p_fino, gar_oggi());
  n INT := 0;
BEGIN
  SELECT * INTO c FROM gar_contratti WHERE id = p_contratto FOR UPDATE;
  IF c.id IS NULL OR c.canone <= 0 OR c.stato NOT IN ('attivo') THEN RETURN 0; END IF;
  v_fine := COALESCE(c.recesso_il, c.fine);
  IF c.periodicita = 'una_tantum' THEN
    IF c.rate_fino IS NULL THEN
      INSERT INTO gar_rate (contratto_id, cliente_id, descrizione, periodo_dal, periodo_al, scadenza, importo, created_by)
      VALUES (c.id, c.cliente_id, c.codice || ' · canone', c.inizio, COALESCE(v_fine, c.inizio), c.inizio, c.canone, c.created_by);
      UPDATE gar_contratti SET rate_fino = COALESCE(v_fine, c.inizio) WHERE id = c.id;
      RETURN 1;
    END IF;
    RETURN 0;
  END IF;
  v_passo := CASE c.periodicita WHEN 'mensile' THEN INTERVAL '1 month' WHEN 'trimestrale' THEN INTERVAL '3 months' ELSE INTERVAL '1 year' END;
  v_dal := COALESCE(c.rate_fino + 1, c.inizio);
  WHILE v_dal <= v_fino AND (v_fine IS NULL OR v_dal <= v_fine) LOOP
    v_al := LEAST((v_dal + v_passo - INTERVAL '1 day')::date, COALESCE(v_fine, 'infinity'::date));
    INSERT INTO gar_rate (contratto_id, cliente_id, descrizione, periodo_dal, periodo_al, scadenza, importo, created_by)
    VALUES (c.id, c.cliente_id, c.codice || ' · ' || to_char(v_dal, 'DD/MM/YYYY') || '–' || to_char(v_al, 'DD/MM/YYYY'), v_dal, v_al, v_dal, c.canone, c.created_by)
    ON CONFLICT (contratto_id, periodo_dal) DO NOTHING;
    IF FOUND THEN n := n + 1; END IF;
    UPDATE gar_contratti SET rate_fino = v_al WHERE id = c.id;
    v_dal := v_al + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION gar_contratto_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_nome TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM gar_emetti_rate(NEW.id); END IF;
  -- Scadenza del contratto tra le scadenze dei moduli (avviso a 30/7/1/0 giorni).
  DELETE FROM scadenze_moduli WHERE entita = 'gar_contratti' AND entita_id = NEW.id AND stato = 'aperta';
  IF NEW.stato IN ('attivo', 'sospeso') AND COALESCE(NEW.recesso_il, NEW.fine) IS NOT NULL THEN
    SELECT nome INTO v_nome FROM gar_clienti WHERE id = NEW.cliente_id;
    INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
    VALUES ('garage', 'gar_contratti', NEW.id, CASE WHEN NEW.recesso_il IS NOT NULL THEN 'Fine per recesso' ELSE 'Scadenza contratto' END,
            v_nome || ' · ' || NEW.codice, COALESCE(NEW.recesso_il, NEW.fine), '/garage/contratti', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_contratti_effetti AFTER INSERT OR UPDATE OF stato, fine, recesso_il ON gar_contratti FOR EACH ROW EXECUTE FUNCTION gar_contratto_effetti();

-- Incasso di una rata: conto della cassa delle fondamenta, pagato e chiuso.
CREATE OR REPLACE FUNCTION gar_incassa_rata(p_rata UUID, p_metodo pagamento_metodo DEFAULT 'pos')
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r gar_rate%ROWTYPE;
  k gar_clienti%ROWTYPE;
  v_conto UUID;
  v_sessione UUID;
  v_io UUID := auth.uid();
BEGIN
  IF NOT modulo_attivo('garage') THEN RAISE EXCEPTION 'Modulo Garage non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM gar_rate WHERE id = p_rata FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Rata inesistente'; END IF;
  IF r.stato NOT IN ('da_pagare', 'insoluta') THEN RAISE EXCEPTION 'Rata già %', r.stato USING ERRCODE = 'check_violation'; END IF;
  SELECT * INTO k FROM gar_clienti WHERE id = r.cliente_id;
  SELECT id INTO v_sessione FROM cassa_sessioni WHERE modulo = 'garage' AND stato = 'aperta' ORDER BY aperta_at DESC LIMIT 1;
  INSERT INTO conti (modulo, descrizione, riferimento_tipo, riferimento_id, contatto_id, organizzazione_id, sessione_id, created_by)
  VALUES ('garage', k.nome || ' · ' || r.descrizione, 'gar_rate', r.id, k.contatto_id, k.organizzazione_id, v_sessione, COALESCE(v_io, r.created_by))
  RETURNING id INTO v_conto;
  INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, riferimento_id, created_by)
  VALUES (v_conto, 'Canone ' || r.descrizione, 1, r.importo, 22, 'gar_rate', r.id, COALESCE(v_io, r.created_by));
  INSERT INTO conti_pagamenti (conto_id, modulo, metodo, importo, sessione_id, created_by)
  VALUES (v_conto, 'garage', p_metodo, r.importo, v_sessione, COALESCE(v_io, r.created_by));
  UPDATE conti SET stato = 'chiuso', chiuso_at = NOW() WHERE id = v_conto;
  UPDATE gar_rate SET stato = 'pagata', pagata_il = gar_oggi(), conto_id = v_conto WHERE id = r.id;
  RETURN v_conto;
END;
$$;

-- ═══ 14. CONTROLLO DELL'ACCESSO (§14) ═══════════════════════════════
-- Dice chi è il veicolo e con che titolo entra: abbonato, autorizzato
-- (delegato, dipendente di un'azienda convenzionata, ospite) o rotazione.
CREATE OR REPLACE FUNCTION gar_verifica_accesso(p_struttura UUID, p_targa TEXT, p_istante TIMESTAMPTZ DEFAULT NOW())
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_targa TEXT := gar_targa(p_targa);
  v_giorno DATE := (p_istante AT TIME ZONE 'Europe/Rome')::date;
  v_ora TIME := (p_istante AT TIME ZONE 'Europe/Rome')::time;
  v_dow INT := EXTRACT(ISODOW FROM (p_istante AT TIME ZONE 'Europe/Rome'))::int;
  ve gar_veicoli%ROWTYPE;
  c gar_contratti%ROWTYPE;
  a RECORD;
  v_fuori TEXT;
BEGIN
  IF NOT modulo_attivo('garage') THEN RAISE EXCEPTION 'Modulo Garage non attivo' USING ERRCODE = '42501'; END IF;
  IF v_targa = '' THEN RETURN jsonb_build_object('consentito', false, 'titolo', 'nessuno', 'motivo', 'Targa non letta'); END IF;
  IF EXISTS (SELECT 1 FROM gar_soste WHERE struttura_id = p_struttura AND targa = v_targa AND uscita_at IS NULL) THEN
    RETURN jsonb_build_object('consentito', false, 'titolo', 'nessuno', 'motivo', 'Il veicolo risulta già dentro');
  END IF;
  SELECT * INTO ve FROM gar_veicoli WHERE targa = v_targa;

  -- Contratto del veicolo (o del cliente, senza veicolo indicato) in corso.
  IF ve.id IS NOT NULL THEN
    SELECT * INTO c FROM gar_contratti x
     WHERE x.struttura_id = p_struttura AND x.stato IN ('attivo', 'sospeso') AND x.periodo @> v_giorno
       AND (x.veicolo_id = ve.id OR (x.veicolo_id IS NULL AND x.cliente_id = ve.cliente_id))
     ORDER BY (x.veicolo_id = ve.id) DESC, x.inizio DESC LIMIT 1;
    IF c.id IS NOT NULL THEN
      IF c.stato = 'sospeso' AND (c.sospeso_al IS NULL OR v_giorno <= c.sospeso_al) THEN
        v_fuori := 'Contratto ' || c.codice || ' sospeso';
      ELSIF EXISTS (SELECT 1 FROM gar_rate r WHERE r.contratto_id = c.id AND r.stato = 'insoluta') THEN
        v_fuori := 'Canone insoluto sul contratto ' || c.codice;
      ELSE
        RETURN jsonb_build_object('consentito', true, 'titolo', 'contratto', 'motivo', 'Contratto ' || c.codice, 'contratto_id', c.id, 'cliente_id', c.cliente_id,
                                  'veicolo_id', ve.id, 'posto_id', c.posto_id);
      END IF;
    END IF;
  END IF;

  -- Autorizzazione valida oggi e a quest'ora (veicolo o targa di un ospite).
  FOR a IN SELECT x.*, cv.id AS conv, cv.attiva AS conv_attiva, cv.dal AS conv_dal, cv.al AS conv_al
             FROM gar_autorizzazioni x LEFT JOIN gar_convenzioni cv ON cv.id = x.convenzione_id
            WHERE x.attiva AND (x.veicolo_id = ve.id OR x.targa = v_targa) AND v_giorno >= x.dal AND (x.al IS NULL OR v_giorno <= x.al)
            ORDER BY x.created_at DESC LOOP
    IF jsonb_array_length(a.fasce) > 0 AND NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(a.fasce) f
          WHERE v_dow IN (SELECT jsonb_array_elements_text(f->'giorni')::int) AND v_ora BETWEEN (f->>'dalle')::time AND (f->>'alle')::time) THEN
      v_fuori := COALESCE(v_fuori, 'Fuori dalla fascia oraria autorizzata'); CONTINUE;
    END IF;
    IF a.conv IS NOT NULL THEN
      IF NOT a.conv_attiva OR v_giorno < a.conv_dal OR (a.conv_al IS NOT NULL AND v_giorno > a.conv_al) THEN
        v_fuori := COALESCE(v_fuori, 'Convenzione non in corso'); CONTINUE;
      END IF;
      RETURN jsonb_build_object('consentito', true, 'titolo', 'convenzione', 'motivo', 'Convenzione aziendale', 'convenzione_id', a.conv, 'cliente_id', a.cliente_id,
                                'veicolo_id', ve.id, 'autorizzazione_id', a.id);
    END IF;
    RETURN jsonb_build_object('consentito', true, 'titolo', 'autorizzazione', 'motivo', initcap(a.tipo) || COALESCE(' · ' || a.persona, ''), 'cliente_id', a.cliente_id,
                              'veicolo_id', ve.id, 'autorizzazione_id', a.id,
                              'posto_id', (SELECT posto_id FROM gar_contratti WHERE cliente_id = a.cliente_id AND stato = 'attivo' AND periodo @> v_giorno
                                             AND posto_id IS NOT NULL ORDER BY inizio DESC LIMIT 1));
  END LOOP;

  -- Altrimenti è una sosta a rotazione: entra se c'è un posto, ma si segnala il titolo mancato.
  RETURN jsonb_build_object('consentito', true, 'titolo', 'rotazione', 'motivo', COALESCE(v_fuori || ': entra a tariffa', 'Sosta a tariffa'),
                            'cliente_id', ve.cliente_id, 'veicolo_id', ve.id, 'avviso', v_fuori);
END;
$$;

-- ═══ 15. INGRESSO E USCITA (§7–8) ═══════════════════════════════════
CREATE OR REPLACE FUNCTION gar_ingresso(p_struttura UUID, p_targa TEXT, p_posto UUID DEFAULT NULL, p_modalita TEXT DEFAULT 'manuale',
                                        p_tipo_veicolo TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_targa TEXT := gar_targa(p_targa);
  v JSONB;
  v_posto UUID := p_posto;
  v_tipo TEXT;
  v_tipo_posto TEXT;
  v_pren gar_prenotazioni%ROWTYPE;
  v_sosta gar_soste%ROWTYPE;
  v_contratto UUID;
  v_conv UUID;
BEGIN
  IF NOT modulo_attivo('garage') THEN RAISE EXCEPTION 'Modulo Garage non attivo' USING ERRCODE = '42501'; END IF;
  v := gar_verifica_accesso(p_struttura, v_targa);
  IF NOT (v->>'consentito')::boolean THEN
    RAISE EXCEPTION '%', v->>'motivo' USING ERRCODE = 'check_violation';
  END IF;
  v_contratto := (v->>'contratto_id')::uuid;
  v_conv := (v->>'convenzione_id')::uuid;
  v_tipo := COALESCE(p_tipo_veicolo, (SELECT tipo FROM gar_veicoli WHERE id = (v->>'veicolo_id')::uuid), 'auto');
  v_tipo_posto := CASE v_tipo WHEN 'moto' THEN 'moto' WHEN 'furgone' THEN 'commerciale' WHEN 'commerciale' THEN 'commerciale' WHEN 'camper' THEN 'commerciale' ELSE 'auto' END;

  -- Prenotazione di questa targa per adesso (tolleranza di due ore).
  SELECT * INTO v_pren FROM gar_prenotazioni
   WHERE struttura_id = p_struttura AND stato IN ('richiesta', 'confermata') AND targa = v_targa
     AND ingresso <= NOW() + INTERVAL '2 hours' AND uscita > NOW() ORDER BY ingresso LIMIT 1 FOR UPDATE;

  -- Il posto: quello chiesto, poi quello del contratto, della prenotazione, o il primo libero adatto.
  v_posto := COALESCE(v_posto, (v->>'posto_id')::uuid, v_pren.posto_id);
  IF v_posto IS NOT NULL AND EXISTS (SELECT 1 FROM gar_soste WHERE posto_id = v_posto AND uscita_at IS NULL) THEN
    IF p_posto IS NOT NULL THEN RAISE EXCEPTION 'Il posto è già occupato' USING ERRCODE = 'check_violation'; END IF;
    v_posto := NULL;                                       -- il posto abituale è occupato: se ne cerca un altro
  END IF;
  IF v_posto IS NULL THEN
    SELECT ps.posto_id INTO v_posto FROM gar_posti_stato ps
     WHERE ps.struttura_id = p_struttura AND ps.stato = 'libero' AND NOT ps.riservato
       AND (ps.tipo = v_tipo_posto OR (v_tipo_posto = 'auto' AND ps.tipo = 'elettrico'))
     ORDER BY (ps.tipo = v_tipo_posto) DESC, ps.piano, ps.numero, ps.codice LIMIT 1;
    IF v_posto IS NULL THEN RAISE EXCEPTION 'Nessun posto libero per questo veicolo' USING ERRCODE = 'check_violation'; END IF;
  ELSIF EXISTS (SELECT 1 FROM gar_posti WHERE id = v_posto AND (fermo IS NOT NULL OR struttura_id <> p_struttura)) THEN
    RAISE EXCEPTION 'Il posto non è utilizzabile' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO gar_soste (ticket, struttura_id, targa, veicolo_id, cliente_id, contratto_id, convenzione_id, prenotazione_id, posto_id, tipo_veicolo,
                         modalita_ingresso, operatore_ingresso, tariffario_id, created_by)
  VALUES (genera_codice('TKT'), p_struttura, v_targa, (v->>'veicolo_id')::uuid, COALESCE((v->>'cliente_id')::uuid, v_pren.cliente_id), v_contratto, v_conv,
          v_pren.id, v_posto, v_tipo, p_modalita, auth.uid(),
          CASE WHEN v_contratto IS NOT NULL THEN NULL
               WHEN v_conv IS NOT NULL THEN
                 CASE WHEN (SELECT count(*) FROM gar_soste WHERE convenzione_id = v_conv AND uscita_at IS NULL)
                           < (SELECT posti_acquistati FROM gar_convenzioni WHERE id = v_conv) THEN NULL
                      ELSE COALESCE((SELECT tariffario_id FROM gar_convenzioni WHERE id = v_conv), gar_tariffario_per(p_struttura, v_tipo, true),
                                    gar_tariffario_per(p_struttura, v_tipo)) END
               ELSE COALESCE(v_pren.tariffario_id, gar_tariffario_per(p_struttura, v_tipo)) END,
          auth.uid())
  RETURNING * INTO v_sosta;
  IF v_pren.id IS NOT NULL THEN UPDATE gar_prenotazioni SET stato = 'arrivata', posto_id = v_posto WHERE id = v_pren.id; END IF;
  IF v_sosta.cliente_id IS NOT NULL AND (SELECT avvisa_ingresso FROM gar_strutture WHERE id = p_struttura) THEN
    PERFORM gar_avvisa(v_sosta.cliente_id, 'Ingresso registrato', 'il veicolo ' || v_targa || ' è entrato alle '
      || to_char(v_sosta.ingresso_at AT TIME ZONE 'Europe/Rome', 'HH24:MI') || ', posto ' || (SELECT codice FROM gar_posti WHERE id = v_posto) || '.');
  END IF;
  RETURN jsonb_build_object('sosta_id', v_sosta.id, 'ticket', v_sosta.ticket, 'posto_id', v_posto,
                            'posto', (SELECT codice FROM gar_posti WHERE id = v_posto), 'titolo', v->>'titolo', 'motivo', v->>'motivo', 'avviso', v->>'avviso');
END;
$$;

-- Uscita: l'abbonato esce e basta; la rotazione paga la tariffa calcolata
-- (conto di cassa da incassare); la convenzione va sul conto dell'azienda.
CREATE OR REPLACE FUNCTION gar_uscita(p_sosta UUID, p_modalita TEXT DEFAULT 'manuale')
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  s gar_soste%ROWTYPE;
  v JSONB;
  v_importo NUMERIC := 0;
  v_minuti INT;
  v_conto UUID;
  v_anticipo NUMERIC := 0;
  k gar_clienti%ROWTYPE;
BEGIN
  IF NOT modulo_attivo('garage') THEN RAISE EXCEPTION 'Modulo Garage non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM gar_soste WHERE id = p_sosta FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Sosta inesistente'; END IF;
  IF s.uscita_at IS NOT NULL THEN RAISE EXCEPTION 'Il veicolo è già uscito' USING ERRCODE = 'check_violation'; END IF;
  v_minuti := ceil(EXTRACT(EPOCH FROM (NOW() - s.ingresso_at)) / 60.0)::int;
  IF s.contratto_id IS NULL AND s.tariffario_id IS NOT NULL THEN
    v := gar_calcola_tariffa(s.tariffario_id, s.ingresso_at, NOW());
    v_importo := (v->>'importo')::numeric;
  END IF;
  IF s.prenotazione_id IS NOT NULL THEN SELECT anticipo INTO v_anticipo FROM gar_prenotazioni WHERE id = s.prenotazione_id; END IF;
  v_importo := GREATEST(v_importo - COALESCE(v_anticipo, 0), 0);

  IF v_importo > 0 AND s.convenzione_id IS NULL THEN
    SELECT * INTO k FROM gar_clienti WHERE id = s.cliente_id;
    INSERT INTO conti (modulo, descrizione, riferimento_tipo, riferimento_id, contatto_id, organizzazione_id, created_by)
    VALUES ('garage', 'Sosta ' || s.targa || ' · ' || s.ticket, 'gar_soste', s.id, k.contatto_id, k.organizzazione_id, COALESCE(auth.uid(), s.created_by))
    RETURNING id INTO v_conto;
    INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, riferimento_id, created_by)
    VALUES (v_conto, 'Sosta di ' || (v_minuti / 60) || ' h ' || (v_minuti % 60) || ' min', 1, v_importo, 22, 'gar_soste', s.id, COALESCE(auth.uid(), s.created_by));
  END IF;
  PERFORM set_config('gar.interno', '1', true);
  UPDATE gar_soste SET uscita_at = NOW(), modalita_uscita = p_modalita, operatore_uscita = auth.uid(), minuti = v_minuti, importo = v_importo, dettaglio = v,
                       conto_id = v_conto, stato = CASE WHEN v_conto IS NOT NULL THEN 'da_pagare' ELSE 'chiusa' END
   WHERE id = s.id;
  PERFORM set_config('gar.interno', '0', true);
  RETURN jsonb_build_object('sosta_id', s.id, 'ticket', s.ticket, 'minuti', v_minuti, 'importo', v_importo, 'conto_id', v_conto,
                            'titolo', CASE WHEN s.contratto_id IS NOT NULL THEN 'contratto' WHEN s.convenzione_id IS NOT NULL THEN 'convenzione' ELSE 'rotazione' END,
                            'dettaglio', v);
END;
$$;

-- Il conto della sosta saldato e chiuso chiude la sosta.
CREATE OR REPLACE FUNCTION gar_conto_chiuso()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.riferimento_tipo = 'gar_soste' AND NEW.stato = 'chiuso' AND OLD.stato <> 'chiuso' THEN
    PERFORM set_config('gar.interno', '1', true);
    UPDATE gar_soste SET stato = 'chiusa' WHERE id = NEW.riferimento_id AND stato = 'da_pagare';
    PERFORM set_config('gar.interno', '0', true);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER conti_gar_chiuso AFTER UPDATE OF stato ON conti FOR EACH ROW EXECUTE FUNCTION gar_conto_chiuso();

-- ═══ 16. TRIGGER COMUNI, RLS, PERMESSI ══════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gar_strutture','gar_aree','gar_posti','gar_clienti','gar_veicoli','gar_tariffari','gar_convenzioni','gar_contratti',
                           'gar_rate','gar_autorizzazioni','gar_prenotazioni','gar_soste'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['gar_strutture','gar_aree','gar_posti','gar_clienti','gar_veicoli','gar_tariffari','gar_festivi','gar_convenzioni','gar_contratti',
                           'gar_rate','gar_autorizzazioni','gar_prenotazioni','gar_soste'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;

  -- Struttura, tariffe, convenzioni e contratti: la direzione.
  FOREACH t IN ARRAY ARRAY['gar_strutture','gar_aree','gar_tariffari','gar_festivi','gar_convenzioni','gar_contratti'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;
  -- I posti li crea la direzione; il personale li mette in manutenzione o li libera.
  EXECUTE $f$CREATE POLICY "gar_posti_insert" ON gar_posti FOR INSERT TO authenticated
    WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$;
  EXECUTE $f$CREATE POLICY "gar_posti_update" ON gar_posti FOR UPDATE TO authenticated USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$;

  -- Clienti, veicoli, autorizzazioni e prenotazioni: tutto il personale.
  FOREACH t IN ARRAY ARRAY['gar_clienti','gar_veicoli','gar_autorizzazioni','gar_prenotazioni'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;
  -- Soste e rate le scrivono le funzioni (ingresso, uscita, incasso); il personale annota la sosta.
  EXECUTE $f$CREATE POLICY "gar_soste_update_note" ON gar_soste FOR UPDATE TO authenticated USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$;
END $$;

-- Sulla sosta il personale cambia solo le note e il posto: orari e importi sono delle funzioni.
CREATE OR REPLACE FUNCTION gar_sosta_protetta()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND current_setting('gar.interno', true) IS DISTINCT FROM '1'
     AND (NEW.ingresso_at, NEW.uscita_at, NEW.importo, NEW.minuti, NEW.stato, NEW.targa, NEW.contratto_id, NEW.convenzione_id, NEW.tariffario_id, NEW.conto_id, NEW.fatturata)
         IS DISTINCT FROM (OLD.ingresso_at, OLD.uscita_at, OLD.importo, OLD.minuti, OLD.stato, OLD.targa, OLD.contratto_id, OLD.convenzione_id, OLD.tariffario_id, OLD.conto_id, OLD.fatturata) THEN
    RAISE EXCEPTION 'Orari e importi della sosta li scrivono l''ingresso e l''uscita' USING ERRCODE = '42501';
  END IF;
  -- Lo spostamento su un altro posto: deve essere libero e della stessa struttura.
  IF NEW.posto_id IS DISTINCT FROM OLD.posto_id AND NEW.posto_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM gar_posti WHERE id = NEW.posto_id AND (fermo IS NOT NULL OR struttura_id <> NEW.struttura_id)) THEN
    RAISE EXCEPTION 'Il posto non è utilizzabile' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_soste_protetta BEFORE UPDATE ON gar_soste FOR EACH ROW EXECUTE FUNCTION gar_sosta_protetta();

GRANT SELECT ON gar_posti_stato TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['gar_avvisa(uuid,text,text)', 'gar_notifica_direzione(text,text,text,notifica_tipo)', 'gar_prepara()', 'gar_contratto_prepara()',
                           'gar_emetti_rate(uuid,date)', 'gar_contratto_effetti()', 'gar_conto_chiuso()', 'gar_sosta_protetta()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY['gar_oggi()', 'gar_targa(text)', 'gar_euro(numeric)', 'gar_festivo(date)', 'gar_calcola_tariffa(uuid,timestamptz,timestamptz)',
                           'gar_tariffario_per(uuid,text,boolean)', 'gar_incassa_rata(uuid,pagamento_metodo)', 'gar_verifica_accesso(uuid,text,timestamptz)',
                           'gar_ingresso(uuid,text,uuid,text,text)', 'gar_uscita(uuid,text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT applica_protezioni_tabelle();
