-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Hotel (Sprint 3) · 2/3: operatività.
--
-- Documento Hotel §18 servizi extra, §19–20 housekeeping e pulizie
-- (pianificate da arrivi e partenze), §21 biancheria, §22 minibar, §23
-- manutenzione camere, §25–26 ristorante e bar (pasti previsti, addebito in
-- camera), §27 SPA, §28 sale meeting, §34 adempimenti (Alloggiati Web e
-- movimento ISTAT), §35 parcheggio, §36 transfer, §41 oggetti smarriti,
-- §42 sicurezza (furti, non conformità).
-- Ogni servizio erogato finisce sul conto camera.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TYPE segnalazione_tipo ADD VALUE IF NOT EXISTS 'furto';
ALTER TYPE segnalazione_tipo ADD VALUE IF NOT EXISTS 'non_conformita';

ALTER TABLE hotel_strutture ADD COLUMN posti_auto INT CHECK (posti_auto >= 0);
-- Residenza dell'ospite: serve al movimento ISTAT (provenienza), non al documento.
ALTER TABLE hotel_ospiti
  ADD COLUMN residenza_comune TEXT,
  ADD COLUMN residenza_provincia TEXT,
  ADD COLUMN residenza_stato TEXT;

-- Riga sul conto della prenotazione (servizi, minibar, parcheggio, transfer).
CREATE OR REPLACE FUNCTION hotel_addebito(p_prenotazione UUID, p_descrizione TEXT, p_quantita NUMERIC, p_prezzo NUMERIC,
                                          p_aliquota NUMERIC, p_rif_tipo TEXT, p_rif_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_conto UUID;
  v_riga UUID;
BEGIN
  IF p_prenotazione IS NULL OR COALESCE(p_prezzo, 0) <= 0 THEN RETURN NULL; END IF;
  SELECT conto_id INTO v_conto FROM hotel_prenotazioni WHERE id = p_prenotazione;
  IF v_conto IS NULL OR (SELECT stato FROM conti WHERE id = v_conto) <> 'aperto' THEN
    RAISE EXCEPTION 'Il soggiorno non ha un conto aperto su cui addebitare' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, riferimento_id, created_by)
  VALUES (v_conto, p_descrizione, p_quantita, p_prezzo, COALESCE(p_aliquota, 22), p_rif_tipo, p_rif_id, auth.uid())
  RETURNING id INTO v_riga;
  RETURN v_riga;
END;
$$;

-- Il soggiorno in casa in una camera (per minibar e parcheggio).
CREATE OR REPLACE FUNCTION hotel_in_casa(p_camera UUID)
RETURNS UUID
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT id FROM hotel_prenotazioni WHERE camera_id = p_camera AND stato = 'in_soggiorno' LIMIT 1
$$;

-- ═══ 1. HOUSEKEEPING ════════════════════════════════════════════════
CREATE TYPE hotel_pulizia_tipo AS ENUM (
  'partenza', 'soggiorno', 'ordinaria', 'straordinaria', 'cambio_biancheria', 'cambio_asciugamani', 'profonda'
);

CREATE TABLE hotel_pulizie (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id     UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo           TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  camera_id        UUID NOT NULL REFERENCES hotel_camere(id) ON DELETE CASCADE,
  data             DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Europe/Rome')::date),
  tipo             hotel_pulizia_tipo NOT NULL,
  prenotazione_id  UUID REFERENCES hotel_prenotazioni(id) ON DELETE SET NULL,
  assegnata_a      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  priorita         TEXT NOT NULL DEFAULT 'normale' CHECK (priorita IN ('normale', 'alta')),   -- alta: arrivo in giornata
  minuti_previsti  INT CHECK (minuti_previsti > 0),
  stato            TEXT NOT NULL DEFAULT 'da_fare' CHECK (stato IN ('da_fare', 'in_corso', 'fatta', 'verificata', 'da_rifare')),
  inizio_at        TIMESTAMPTZ,
  fine_at          TIMESTAMPTZ,
  minuti_effettivi INT,
  verificata_da    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  verificata_at    TIMESTAMPTZ,
  esito_controllo  TEXT,
  anomalie         TEXT,                 -- diventano una segnalazione di manutenzione
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id),
  UNIQUE (camera_id, data, tipo)
);
CREATE INDEX idx_hotel_pulizie_giorno ON hotel_pulizie (struttura_id, data);

-- ═══ 2. MANUTENZIONE CAMERE E STRUTTURA ═════════════════════════════
CREATE TABLE hotel_manutenzioni (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id         UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo               TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  codice               TEXT UNIQUE,              -- MAN-AAAA-NNNN
  camera_id            UUID REFERENCES hotel_camere(id) ON DELETE SET NULL,
  area_id              UUID REFERENCES hotel_aree(id) ON DELETE SET NULL,
  asset_id             UUID REFERENCES asset(id) ON DELETE SET NULL,
  categoria            TEXT NOT NULL DEFAULT 'altro' CHECK (categoria IN (
                         'climatizzazione', 'tv', 'frigorifero', 'illuminazione', 'bagno', 'serrature', 'impianti', 'arredi',
                         'ascensore', 'caldaia', 'piscina', 'elettrico', 'antincendio', 'cucina', 'spa', 'aree_comuni', 'altro')),
  descrizione          TEXT NOT NULL,
  priorita             TEXT NOT NULL DEFAULT 'media' CHECK (priorita IN ('bassa', 'media', 'alta', 'urgente')),
  stato                TEXT NOT NULL DEFAULT 'aperta' CHECK (stato IN ('aperta', 'assegnata', 'in_corso', 'risolta', 'annullata')),
  mette_fuori_servizio BOOLEAN NOT NULL DEFAULT false,
  segnalata_da         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  tecnico_id           UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  tecnico_esterno      TEXT,
  data_intervento      DATE,
  costo                NUMERIC(12,2) CHECK (costo >= 0),
  risolta_at           TIMESTAMPTZ,
  pulizia_id           UUID REFERENCES hotel_pulizie(id) ON DELETE SET NULL,
  note                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES user_profiles(id),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES user_profiles(id)
);

-- ═══ 3. BIANCHERIA ══════════════════════════════════════════════════
CREATE TABLE hotel_biancheria (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id    UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo          TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  tipo            TEXT NOT NULL CHECK (tipo IN ('lenzuola', 'federe', 'asciugamani', 'accappatoi', 'tovaglie', 'tovaglioli', 'divise', 'altro')),
  descrizione     TEXT NOT NULL,
  dotazione       INT NOT NULL DEFAULT 0 CHECK (dotazione >= 0),
  in_lavanderia   INT NOT NULL DEFAULT 0 CHECK (in_lavanderia >= 0),
  lavaggi_totali  INT NOT NULL DEFAULT 0 CHECK (lavaggi_totali >= 0),
  costo_unitario  NUMERIC(10,2) CHECK (costo_unitario >= 0),
  costo_lavaggio  NUMERIC(10,2) CHECK (costo_lavaggio >= 0),
  cicli_vita      INT CHECK (cicli_vita > 0),       -- lavaggi prima di sostituire
  scorta_minima   INT NOT NULL DEFAULT 0 CHECK (scorta_minima >= 0),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id),
  CHECK (in_lavanderia <= dotazione)
);

CREATE TABLE hotel_biancheria_movimenti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biancheria_id   UUID NOT NULL REFERENCES hotel_biancheria(id) ON DELETE CASCADE,
  modulo          TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  tipo            TEXT NOT NULL CHECK (tipo IN ('acquisto', 'invio_lavanderia', 'rientro_lavanderia', 'perdita', 'scarto')),
  quantita        INT NOT NULL CHECK (quantita > 0),
  lavanderia_id   UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  costo           NUMERIC(12,2) CHECK (costo >= 0),
  data            DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Europe/Rome')::date),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id)
);

-- ═══ 4. MINIBAR ═════════════════════════════════════════════════════
CREATE TABLE hotel_minibar_dotazioni (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id  UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo        TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  tipologia_id  UUID REFERENCES hotel_tipologie(id) ON DELETE CASCADE,   -- vuoto = tutte le camere
  articolo_id   UUID NOT NULL REFERENCES mag_articoli(id) ON DELETE CASCADE,
  quantita      INT NOT NULL DEFAULT 1 CHECK (quantita > 0),
  prezzo        NUMERIC(10,2) NOT NULL CHECK (prezzo >= 0),
  ordine        INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id),
  UNIQUE NULLS NOT DISTINCT (struttura_id, tipologia_id, articolo_id)
);

CREATE TABLE hotel_minibar_consumi (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id     UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo           TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  camera_id        UUID NOT NULL REFERENCES hotel_camere(id) ON DELETE CASCADE,
  prenotazione_id  UUID REFERENCES hotel_prenotazioni(id) ON DELETE SET NULL,
  articolo_id      UUID NOT NULL REFERENCES mag_articoli(id) ON DELETE RESTRICT,
  quantita         INT NOT NULL CHECK (quantita > 0),
  prezzo_unitario  NUMERIC(10,2),
  conto_riga_id    UUID REFERENCES conti_righe(id) ON DELETE SET NULL,
  rifornito        BOOLEAN NOT NULL DEFAULT false,
  rilevato_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);

-- ═══ 5. SERVIZI EXTRA, SPA E BENESSERE ══════════════════════════════
CREATE TABLE hotel_servizi (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id       UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo             TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  nome               TEXT NOT NULL,
  tipo               TEXT NOT NULL DEFAULT 'altro' CHECK (tipo IN (
                       'colazione', 'room_service', 'lavanderia', 'spa', 'massaggio', 'trattamento_benessere', 'sauna',
                       'piscina', 'percorso_benessere', 'noleggio_bici', 'escursione', 'late_check_out', 'early_check_in', 'altro')),
  prezzo             NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (prezzo >= 0),
  aliquota_iva       NUMERIC(5,2) NOT NULL DEFAULT 22 CHECK (aliquota_iva >= 0),
  unita              TEXT NOT NULL DEFAULT 'volta' CHECK (unita IN ('volta', 'persona', 'notte', 'ora')),
  durata_min         INT CHECK (durata_min > 0),
  richiede_operatore BOOLEAN NOT NULL DEFAULT false,
  risorse            TEXT[] NOT NULL DEFAULT '{}',     -- cabine, postazioni
  descrizione        TEXT,
  attivo             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);

CREATE TABLE hotel_servizi_prenotazioni (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id     UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo           TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  servizio_id      UUID NOT NULL REFERENCES hotel_servizi(id) ON DELETE RESTRICT,
  prenotazione_id  UUID REFERENCES hotel_prenotazioni(id) ON DELETE SET NULL,   -- ospite in casa
  contatto_id      UUID REFERENCES contatti(id) ON DELETE SET NULL,             -- cliente esterno
  ospite_nome      TEXT NOT NULL,
  inizio           TIMESTAMPTZ NOT NULL,
  fine             TIMESTAMPTZ NOT NULL,
  quantita         NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (quantita > 0),
  prezzo_unitario  NUMERIC(10,2),
  operatore_id     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  risorsa          TEXT,
  stato            TEXT NOT NULL DEFAULT 'prenotato' CHECK (stato IN ('prenotato', 'confermato', 'erogato', 'annullato', 'no_show')),
  conto_id         UUID REFERENCES conti(id) ON DELETE SET NULL,
  conto_riga_id    UUID REFERENCES conti_righe(id) ON DELETE SET NULL,
  note             TEXT,
  periodo          TSTZRANGE GENERATED ALWAYS AS (tstzrange(inizio, fine, '[)')) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id),
  CHECK (fine > inizio),
  -- Stessa cabina o stesso operatore mai due volte nello stesso momento.
  CONSTRAINT hotel_risorsa_libera EXCLUDE USING gist (struttura_id WITH =, risorsa WITH =, periodo WITH &&)
    WHERE (risorsa IS NOT NULL AND stato IN ('prenotato', 'confermato')),
  CONSTRAINT hotel_operatore_libero EXCLUDE USING gist (operatore_id WITH =, periodo WITH &&)
    WHERE (operatore_id IS NOT NULL AND stato IN ('prenotato', 'confermato'))
);
CREATE INDEX idx_hotel_servizi_pren_giorno ON hotel_servizi_prenotazioni (struttura_id, inizio);

-- ═══ 6. PARCHEGGIO E TRANSFER ═══════════════════════════════════════
CREATE TABLE hotel_parcheggio (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id     UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo           TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  prenotazione_id  UUID REFERENCES hotel_prenotazioni(id) ON DELETE SET NULL,
  targa            TEXT NOT NULL,
  veicolo          TEXT,
  posto            TEXT,
  ingresso_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uscita_at        TIMESTAMPTZ,
  tariffa_giorno   NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (tariffa_giorno >= 0),
  giorni           INT,
  conto_riga_id    UUID REFERENCES conti_righe(id) ON DELETE SET NULL,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id),
  CHECK (uscita_at IS NULL OR uscita_at >= ingresso_at)
);
CREATE UNIQUE INDEX uq_hotel_parcheggio_posto_occupato ON hotel_parcheggio (struttura_id, posto) WHERE uscita_at IS NULL AND posto IS NOT NULL;

CREATE TABLE hotel_transfer (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id     UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo           TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  prenotazione_id  UUID REFERENCES hotel_prenotazioni(id) ON DELETE SET NULL,
  ospite_nome      TEXT NOT NULL,
  tipo             TEXT NOT NULL DEFAULT 'aeroporto' CHECK (tipo IN ('aeroporto', 'stazione', 'porto', 'escursione', 'navetta', 'altro')),
  direzione        TEXT NOT NULL DEFAULT 'arrivo' CHECK (direzione IN ('arrivo', 'partenza', 'andata_ritorno', 'giro')),
  data_ora         TIMESTAMPTZ NOT NULL,
  luogo            TEXT NOT NULL,
  riferimento      TEXT,                 -- volo, treno, nave
  passeggeri       INT NOT NULL DEFAULT 1 CHECK (passeggeri > 0),
  autista_id       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  autista          TEXT,
  veicolo          TEXT,
  costo            NUMERIC(10,2) CHECK (costo >= 0),     -- per l'hotel
  prezzo           NUMERIC(10,2) CHECK (prezzo >= 0),    -- all'ospite
  stato            TEXT NOT NULL DEFAULT 'richiesto' CHECK (stato IN ('richiesto', 'confermato', 'svolto', 'annullato')),
  conto_riga_id    UUID REFERENCES conti_righe(id) ON DELETE SET NULL,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);

-- ═══ 7. SALE MEETING ════════════════════════════════════════════════
CREATE TABLE hotel_sale (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id          UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo                TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  nome                  TEXT NOT NULL,
  -- {"teatro": 120, "banchi": 60, "ferro_di_cavallo": 30, "cabaret": 50, "banchetto": 80, "cocktail": 150}
  capienze              JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(capienze) = 'object'),
  metri_quadri          NUMERIC(7,1),
  attrezzature          TEXT[] NOT NULL DEFAULT '{}',
  prezzo_mezza_giornata NUMERIC(10,2) CHECK (prezzo_mezza_giornata >= 0),
  prezzo_giornata       NUMERIC(10,2) CHECK (prezzo_giornata >= 0),
  attiva                BOOLEAN NOT NULL DEFAULT true,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id)
);

CREATE TABLE hotel_sale_prenotazioni (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id       UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo             TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  sala_id            UUID NOT NULL REFERENCES hotel_sale(id) ON DELETE RESTRICT,
  titolo             TEXT NOT NULL,
  evento_id          UUID REFERENCES eventi(id) ON DELETE SET NULL,          -- pacchetto con ristorazione e personale
  gruppo_id          UUID REFERENCES hotel_gruppi(id) ON DELETE SET NULL,    -- pacchetto con le camere
  organizzazione_id  UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  inizio             TIMESTAMPTZ NOT NULL,
  fine               TIMESTAMPTZ NOT NULL,
  allestimento       TEXT,
  partecipanti       INT CHECK (partecipanti > 0),
  attrezzature       TEXT[] NOT NULL DEFAULT '{}',
  coffee_break       INT NOT NULL DEFAULT 0 CHECK (coffee_break >= 0),
  catering           TEXT,
  prezzo             NUMERIC(12,2) CHECK (prezzo >= 0),
  stato              TEXT NOT NULL DEFAULT 'opzione' CHECK (stato IN ('opzione', 'confermata', 'annullata')),
  note               TEXT,
  periodo            TSTZRANGE GENERATED ALWAYS AS (tstzrange(inizio, fine, '[)')) STORED,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id),
  CHECK (fine > inizio),
  CONSTRAINT hotel_sala_libera EXCLUDE USING gist (sala_id WITH =, periodo WITH &&) WHERE (stato <> 'annullata')
);

-- ═══ 8. OGGETTI SMARRITI ════════════════════════════════════════════
CREATE TABLE hotel_oggetti_smarriti (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id           UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo                 TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  codice                 TEXT UNIQUE,              -- OGG-AAAA-NNNN
  descrizione            TEXT NOT NULL,
  categoria              TEXT,
  camera_id              UUID REFERENCES hotel_camere(id) ON DELETE SET NULL,
  area                   TEXT,
  prenotazione_id        UUID REFERENCES hotel_prenotazioni(id) ON DELETE SET NULL,
  contatto_id            UUID REFERENCES contatti(id) ON DELETE SET NULL,     -- proprietario
  trovato_il             DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Europe/Rome')::date),
  trovato_da             UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  ubicazione             TEXT,                      -- dove è custodito
  custodia_fino          DATE,
  stato                  TEXT NOT NULL DEFAULT 'custodito' CHECK (stato IN ('custodito', 'restituito', 'spedito', 'smaltito', 'consegnato_comune')),
  restituito_il          DATE,
  modalita_restituzione  TEXT,
  spedizione             TEXT,                      -- corriere e tracciamento
  note                   TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES user_profiles(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES user_profiles(id)
);

-- ═══ 9. LOGICHE ═════════════════════════════════════════════════════
-- Pulizie del giorno: partenze e camere da pulire, fermate (cambio della
-- biancheria ogni N giorni). Le camere con un arrivo in giornata passano avanti.
CREATE OR REPLACE FUNCTION hotel_genera_pulizie(p_struttura UUID, p_giorno DATE DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  s hotel_strutture%ROWTYPE;
  n INT := 0;
  k INT;
BEGIN
  SELECT * INTO s FROM hotel_strutture WHERE id = p_struttura;
  IF s.id IS NULL OR NOT modulo_attivo('hotel') THEN RETURN 0; END IF;

  -- Partenze del giorno e camere lasciate da pulire.
  INSERT INTO hotel_pulizie (struttura_id, camera_id, data, tipo, prenotazione_id, priorita, minuti_previsti)
  SELECT p_struttura, c.id, p_giorno, 'partenza',
         (SELECT p.id FROM hotel_prenotazioni p WHERE p.camera_id = c.id AND p.partenza = p_giorno
            AND p.stato IN ('in_soggiorno', 'partita') LIMIT 1),
         CASE WHEN EXISTS (SELECT 1 FROM hotel_prenotazioni a WHERE a.camera_id = c.id AND a.arrivo = p_giorno
                             AND a.stato IN ('opzionata', 'confermata')) THEN 'alta' ELSE 'normale' END,
         s.minuti_pulizia_partenza
    FROM hotel_camere c
   WHERE c.struttura_id = p_struttura AND c.attiva AND NOT c.fuori_servizio
     AND (c.stato_pulizia = 'da_pulire'
          OR EXISTS (SELECT 1 FROM hotel_prenotazioni p WHERE p.camera_id = c.id AND p.partenza = p_giorno
                       AND p.stato IN ('in_soggiorno', 'partita')))
  ON CONFLICT (camera_id, data, tipo) DO NOTHING;
  GET DIAGNOSTICS k = ROW_COUNT; n := n + k;

  -- Fermate: riassetto, o cambio della biancheria ogni N notti.
  INSERT INTO hotel_pulizie (struttura_id, camera_id, data, tipo, prenotazione_id, minuti_previsti)
  SELECT p_struttura, p.camera_id, p_giorno,
         CASE WHEN (p_giorno - p.arrivo) % s.cambio_biancheria_giorni = 0 THEN 'cambio_biancheria' ELSE 'soggiorno' END::hotel_pulizia_tipo,
         p.id,
         CASE WHEN (p_giorno - p.arrivo) % s.cambio_biancheria_giorni = 0 THEN s.minuti_pulizia_soggiorno + 10
              ELSE s.minuti_pulizia_soggiorno END
    FROM hotel_prenotazioni p
   WHERE p.struttura_id = p_struttura AND p.stato = 'in_soggiorno' AND p.arrivo < p_giorno AND p.partenza > p_giorno
  ON CONFLICT (camera_id, data, tipo) DO NOTHING;
  GET DIAGNOSTICS k = ROW_COUNT; n := n + k;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION hotel_genera_pulizie_tutte()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  s RECORD;
  n INT := 0;
BEGIN
  FOR s IN SELECT id FROM hotel_strutture WHERE attiva LOOP
    n := n + hotel_genera_pulizie(s.id);
  END LOOP;
  RETURN n;
END;
$$;

-- Il check-out crea subito la pulizia di partenza.
CREATE OR REPLACE FUNCTION hotel_partenza_pulizia()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato = 'partita' AND OLD.stato <> 'partita' AND NEW.camera_id IS NOT NULL THEN
    INSERT INTO hotel_pulizie (struttura_id, camera_id, data, tipo, prenotazione_id, priorita, minuti_previsti)
    SELECT NEW.struttura_id, NEW.camera_id, (NOW() AT TIME ZONE 'Europe/Rome')::date, 'partenza', NEW.id,
           CASE WHEN EXISTS (SELECT 1 FROM hotel_prenotazioni a WHERE a.camera_id = NEW.camera_id
                               AND a.arrivo = (NOW() AT TIME ZONE 'Europe/Rome')::date AND a.stato IN ('opzionata', 'confermata'))
                THEN 'alta' ELSE 'normale' END,
           s.minuti_pulizia_partenza
      FROM hotel_strutture s WHERE s.id = NEW.struttura_id
    ON CONFLICT (camera_id, data, tipo) DO UPDATE SET stato = 'da_fare', prenotazione_id = EXCLUDED.prenotazione_id
      WHERE hotel_pulizie.stato IN ('fatta', 'verificata');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_prenotazioni_pulizia AFTER UPDATE OF stato ON hotel_prenotazioni
  FOR EACH ROW EXECUTE FUNCTION hotel_partenza_pulizia();

-- Avanzamento della pulizia: lo stato della camera segue.
CREATE OR REPLACE FUNCTION hotel_pulizia_avanza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_ok BOOLEAN;
  v_camera hotel_pulizia_stato;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.struttura_id := COALESCE(NEW.struttura_id, (SELECT struttura_id FROM hotel_camere WHERE id = NEW.camera_id));
    RETURN NEW;
  END IF;
  IF NEW.stato = OLD.stato THEN RETURN NEW; END IF;
  v_ok := (OLD.stato, NEW.stato) IN (('da_fare', 'in_corso'), ('in_corso', 'fatta'), ('da_fare', 'fatta'),
                                     ('fatta', 'verificata'), ('fatta', 'da_rifare'), ('da_rifare', 'in_corso'),
                                     ('da_rifare', 'fatta'), ('in_corso', 'da_fare'),
                                     -- un nuovo check-out riapre la pulizia della camera
                                     ('fatta', 'da_fare'), ('verificata', 'da_fare'));
  IF NOT v_ok THEN
    RAISE EXCEPTION 'Una pulizia % non diventa %', replace(OLD.stato, '_', ' '), replace(NEW.stato, '_', ' ')
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.stato = 'in_corso' THEN
    NEW.inizio_at := NOW(); v_camera := 'in_pulizia';
  ELSIF NEW.stato = 'fatta' THEN
    NEW.fine_at := NOW();
    NEW.minuti_effettivi := CASE WHEN NEW.inizio_at IS NULL THEN NULL
                                 ELSE GREATEST(1, ROUND(EXTRACT(EPOCH FROM NOW() - NEW.inizio_at) / 60))::int END;
    v_camera := 'pulita';
  ELSIF NEW.stato = 'verificata' THEN
    NEW.verificata_da := auth.uid(); NEW.verificata_at := NOW(); v_camera := 'verificata';
  ELSIF NEW.stato = 'da_rifare' THEN
    NEW.verificata_da := auth.uid(); NEW.verificata_at := NOW(); v_camera := 'da_pulire';
  ELSIF NEW.stato = 'da_fare' THEN
    NEW.inizio_at := NULL; v_camera := 'da_pulire';
  END IF;
  UPDATE hotel_camere SET stato_pulizia = v_camera WHERE id = NEW.camera_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_pulizie_avanza BEFORE INSERT OR UPDATE OF stato ON hotel_pulizie
  FOR EACH ROW EXECUTE FUNCTION hotel_pulizia_avanza();

-- Anomalia rilevata in pulizia: diventa una segnalazione di manutenzione.
CREATE OR REPLACE FUNCTION hotel_pulizia_anomalia()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NULLIF(trim(NEW.anomalie), '') IS NOT NULL AND NEW.anomalie IS DISTINCT FROM OLD.anomalie THEN
    INSERT INTO hotel_manutenzioni (struttura_id, camera_id, descrizione, priorita, segnalata_da, pulizia_id, created_by)
    VALUES (NEW.struttura_id, NEW.camera_id, NEW.anomalie, 'media', auth.uid(), NEW.id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_pulizie_anomalia AFTER UPDATE OF anomalie ON hotel_pulizie
  FOR EACH ROW EXECUTE FUNCTION hotel_pulizia_anomalia();

-- Assegnazione bilanciata: piano per piano, a chi ha meno minuti.
CREATE OR REPLACE FUNCTION hotel_assegna_pulizie(p_struttura UUID, p_giorno DATE, p_persone UUID[])
RETURNS INT
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  p RECORD;
  v_carichi JSONB := '{}'::jsonb;
  v_chi UUID;
  u UUID;
  n INT := 0;
BEGIN
  IF cardinality(p_persone) = 0 THEN RAISE EXCEPTION 'Scegli chi pulisce'; END IF;
  FOREACH u IN ARRAY p_persone LOOP v_carichi := v_carichi || jsonb_build_object(u::text, 0); END LOOP;
  FOR p IN
    SELECT x.id, COALESCE(x.minuti_previsti, 30) AS minuti FROM hotel_pulizie x JOIN hotel_camere c ON c.id = x.camera_id
     WHERE x.struttura_id = p_struttura AND x.data = p_giorno AND x.stato = 'da_fare' AND x.assegnata_a IS NULL
     ORDER BY x.priorita DESC, c.piano NULLS LAST, c.numero
  LOOP
    SELECT key::uuid INTO v_chi FROM jsonb_each_text(v_carichi) ORDER BY value::int, key LIMIT 1;
    UPDATE hotel_pulizie SET assegnata_a = v_chi WHERE id = p.id;
    v_carichi := jsonb_set(v_carichi, ARRAY[v_chi::text], to_jsonb((v_carichi->>v_chi::text)::int + p.minuti));
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Manutenzione: la camera esce e rientra in servizio con la segnalazione.
CREATE OR REPLACE FUNCTION hotel_manutenzione_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.codice IS NULL THEN NEW.codice := genera_codice('MAN'); END IF;
    NEW.segnalata_da := COALESCE(NEW.segnalata_da, auth.uid());
  END IF;
  IF NEW.stato = 'risolta' AND (TG_OP = 'INSERT' OR OLD.stato <> 'risolta') THEN NEW.risolta_at := NOW(); END IF;
  IF NEW.camera_id IS NOT NULL THEN
    IF NEW.mette_fuori_servizio AND NEW.stato IN ('aperta', 'assegnata', 'in_corso') THEN
      UPDATE hotel_camere SET fuori_servizio = true, fuori_servizio_motivo = COALESCE(NEW.codice || ': ', '') || NEW.descrizione
       WHERE id = NEW.camera_id AND NOT fuori_servizio;
    ELSIF TG_OP = 'UPDATE' AND OLD.mette_fuori_servizio AND NEW.stato IN ('risolta', 'annullata')
          AND NOT EXISTS (SELECT 1 FROM hotel_manutenzioni m WHERE m.camera_id = NEW.camera_id AND m.id <> NEW.id
                            AND m.mette_fuori_servizio AND m.stato IN ('aperta', 'assegnata', 'in_corso')) THEN
      UPDATE hotel_camere SET fuori_servizio = false WHERE id = NEW.camera_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_manutenzioni_effetti BEFORE INSERT OR UPDATE ON hotel_manutenzioni
  FOR EACH ROW EXECUTE FUNCTION hotel_manutenzione_effetti();

-- Biancheria: dotazione, lavanderia e lavaggi.
CREATE OR REPLACE FUNCTION hotel_biancheria_movimento()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  b hotel_biancheria%ROWTYPE;
BEGIN
  SELECT * INTO b FROM hotel_biancheria WHERE id = NEW.biancheria_id FOR UPDATE;
  IF NEW.tipo = 'acquisto' THEN
    UPDATE hotel_biancheria SET dotazione = dotazione + NEW.quantita WHERE id = b.id;
    NEW.costo := COALESCE(NEW.costo, NEW.quantita * b.costo_unitario);
  ELSIF NEW.tipo = 'invio_lavanderia' THEN
    IF NEW.quantita > b.dotazione - b.in_lavanderia THEN
      RAISE EXCEPTION 'Disponibili solo % pezzi di %', b.dotazione - b.in_lavanderia, b.descrizione USING ERRCODE = 'check_violation';
    END IF;
    UPDATE hotel_biancheria SET in_lavanderia = in_lavanderia + NEW.quantita WHERE id = b.id;
    NEW.costo := COALESCE(NEW.costo, NEW.quantita * b.costo_lavaggio);
  ELSIF NEW.tipo = 'rientro_lavanderia' THEN
    IF NEW.quantita > b.in_lavanderia THEN
      RAISE EXCEPTION 'In lavanderia ci sono solo % pezzi di %', b.in_lavanderia, b.descrizione USING ERRCODE = 'check_violation';
    END IF;
    UPDATE hotel_biancheria SET in_lavanderia = in_lavanderia - NEW.quantita, lavaggi_totali = lavaggi_totali + NEW.quantita
     WHERE id = b.id;
  ELSE  -- perdita, scarto
    IF NEW.quantita > b.dotazione - b.in_lavanderia THEN
      RAISE EXCEPTION 'Disponibili solo % pezzi di %', b.dotazione - b.in_lavanderia, b.descrizione USING ERRCODE = 'check_violation';
    END IF;
    UPDATE hotel_biancheria SET dotazione = dotazione - NEW.quantita WHERE id = b.id;
    NEW.costo := COALESCE(NEW.costo, NEW.quantita * b.costo_unitario);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_biancheria_movimenti_effetti BEFORE INSERT ON hotel_biancheria_movimenti
  FOR EACH ROW EXECUTE FUNCTION hotel_biancheria_movimento();

CREATE VIEW hotel_biancheria_stato WITH (security_invoker = true) AS
SELECT b.id AS biancheria_id, b.struttura_id, b.modulo, b.tipo, b.descrizione, b.dotazione, b.in_lavanderia,
       b.dotazione - b.in_lavanderia AS disponibili, b.scorta_minima,
       b.dotazione - b.in_lavanderia < b.scorta_minima AS sotto_scorta,
       ROUND(b.lavaggi_totali::numeric / NULLIF(b.dotazione, 0), 1) AS lavaggi_medi,
       b.cicli_vita,
       b.cicli_vita IS NOT NULL AND b.lavaggi_totali::numeric / NULLIF(b.dotazione, 0) >= b.cicli_vita * 0.9 AS da_sostituire,
       COALESCE((SELECT SUM(m.quantita) FROM hotel_biancheria_movimenti m WHERE m.biancheria_id = b.id
                   AND m.tipo IN ('perdita', 'scarto') AND m.data >= (NOW() AT TIME ZONE 'Europe/Rome')::date - 90), 0) AS persi_90_giorni,
       COALESCE((SELECT SUM(m.costo) FROM hotel_biancheria_movimenti m WHERE m.biancheria_id = b.id
                   AND m.tipo = 'invio_lavanderia' AND m.data >= (NOW() AT TIME ZONE 'Europe/Rome')::date - 30), 0) AS lavanderia_30_giorni
  FROM hotel_biancheria b;

-- Minibar: prezzo dalla dotazione, scarico dal magazzino, riga sul conto.
CREATE OR REPLACE FUNCTION hotel_minibar_consumo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_tipologia UUID;
  v_articolo TEXT;
  v_aliquota NUMERIC;
BEGIN
  SELECT tipologia_id, struttura_id INTO v_tipologia, NEW.struttura_id FROM hotel_camere WHERE id = NEW.camera_id;
  NEW.prenotazione_id := COALESCE(NEW.prenotazione_id, hotel_in_casa(NEW.camera_id));
  SELECT descrizione, aliquota_iva INTO v_articolo, v_aliquota FROM mag_articoli WHERE id = NEW.articolo_id;
  NEW.prezzo_unitario := COALESCE(NEW.prezzo_unitario,
    (SELECT d.prezzo FROM hotel_minibar_dotazioni d WHERE d.struttura_id = NEW.struttura_id AND d.articolo_id = NEW.articolo_id
        AND (d.tipologia_id = v_tipologia OR d.tipologia_id IS NULL) ORDER BY d.tipologia_id NULLS LAST LIMIT 1));
  IF NEW.prezzo_unitario IS NULL THEN
    RAISE EXCEPTION '% non è nella dotazione del minibar', v_articolo USING ERRCODE = 'check_violation';
  END IF;
  PERFORM mag_scarica(NEW.articolo_id, NEW.quantita, 'vendita', 'hotel_minibar_consumi', NEW.id, 'Minibar');
  NEW.conto_riga_id := hotel_addebito(NEW.prenotazione_id, 'Minibar · ' || v_articolo, NEW.quantita, NEW.prezzo_unitario,
                                      v_aliquota, 'hotel_minibar_consumi', NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_minibar_consumi_effetti BEFORE INSERT ON hotel_minibar_consumi
  FOR EACH ROW EXECUTE FUNCTION hotel_minibar_consumo();

-- Servizi: prezzo e fine dal catalogo; erogato → sul conto (camera o cliente esterno).
CREATE OR REPLACE FUNCTION hotel_servizio_prenotazione()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  sv hotel_servizi%ROWTYPE;
BEGIN
  SELECT * INTO sv FROM hotel_servizi WHERE id = NEW.servizio_id;
  IF TG_OP = 'INSERT' THEN
    NEW.struttura_id := sv.struttura_id;
    NEW.prezzo_unitario := COALESCE(NEW.prezzo_unitario, sv.prezzo);
    IF NEW.fine IS NULL OR NEW.fine <= NEW.inizio THEN
      NEW.fine := NEW.inizio + make_interval(mins => COALESCE(sv.durata_min, 60));
    END IF;
    IF NEW.risorsa IS NOT NULL AND cardinality(sv.risorse) > 0 AND NOT (NEW.risorsa = ANY (sv.risorse)) THEN
      RAISE EXCEPTION 'Per % si usano: %', sv.nome, array_to_string(sv.risorse, ', ') USING ERRCODE = 'check_violation';
    END IF;
    IF sv.richiede_operatore AND NEW.operatore_id IS NULL THEN
      RAISE EXCEPTION '% richiede un operatore', sv.nome USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.stato = 'erogato' AND (TG_OP = 'INSERT' OR OLD.stato <> 'erogato') AND NEW.conto_riga_id IS NULL THEN
    IF NEW.prenotazione_id IS NOT NULL THEN
      NEW.conto_riga_id := hotel_addebito(NEW.prenotazione_id, sv.nome || ' · ' || NEW.ospite_nome, NEW.quantita,
                                          NEW.prezzo_unitario, sv.aliquota_iva, 'hotel_servizi_prenotazioni', NEW.id);
    ELSIF NEW.prezzo_unitario > 0 THEN
      -- Cliente esterno: un conto suo, da incassare alla cassa dell'hotel.
      IF NEW.conto_id IS NULL THEN
        INSERT INTO conti (modulo, descrizione, riferimento_tipo, riferimento_id, contatto_id, created_by)
        VALUES ('hotel', sv.nome || ' · ' || NEW.ospite_nome, 'hotel_servizi_prenotazioni', NEW.id, NEW.contatto_id, auth.uid())
        RETURNING id INTO NEW.conto_id;
      END IF;
      INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, riferimento_id, created_by)
      VALUES (NEW.conto_id, sv.nome, NEW.quantita, NEW.prezzo_unitario, sv.aliquota_iva, 'hotel_servizi_prenotazioni', NEW.id, auth.uid())
      RETURNING id INTO NEW.conto_riga_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_servizi_prenotazioni_effetti BEFORE INSERT OR UPDATE ON hotel_servizi_prenotazioni
  FOR EACH ROW EXECUTE FUNCTION hotel_servizio_prenotazione();

-- Parcheggio: all'uscita i giorni (minimo uno) vanno sul conto.
CREATE OR REPLACE FUNCTION hotel_parcheggio_uscita()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.targa := upper(regexp_replace(NEW.targa, '\s', '', 'g'));
    IF EXISTS (SELECT 1 FROM hotel_parcheggio x WHERE x.struttura_id = NEW.struttura_id AND x.targa = NEW.targa AND x.uscita_at IS NULL) THEN
      RAISE EXCEPTION 'Il veicolo % risulta già nel parcheggio', NEW.targa USING ERRCODE = 'check_violation';
    END IF;
    IF (SELECT posti_auto FROM hotel_strutture WHERE id = NEW.struttura_id) IS NOT NULL
       AND (SELECT count(*) FROM hotel_parcheggio x WHERE x.struttura_id = NEW.struttura_id AND x.uscita_at IS NULL)
           >= (SELECT posti_auto FROM hotel_strutture WHERE id = NEW.struttura_id) THEN
      RAISE EXCEPTION 'Parcheggio completo' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.uscita_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.uscita_at IS NULL) THEN
    NEW.giorni := GREATEST(1, CEIL(EXTRACT(EPOCH FROM NEW.uscita_at - NEW.ingresso_at) / 86400.0))::int;
    NEW.conto_riga_id := hotel_addebito(NEW.prenotazione_id, 'Parcheggio · ' || NEW.targa || ' · ' || NEW.giorni
                                          || CASE WHEN NEW.giorni = 1 THEN ' giorno' ELSE ' giorni' END,
                                        NEW.giorni, NEW.tariffa_giorno, 22, 'hotel_parcheggio', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_parcheggio_effetti BEFORE INSERT OR UPDATE OF uscita_at ON hotel_parcheggio
  FOR EACH ROW EXECUTE FUNCTION hotel_parcheggio_uscita();

-- Transfer svolto: il prezzo va sul conto.
CREATE OR REPLACE FUNCTION hotel_transfer_svolto()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato = 'svolto' AND (TG_OP = 'INSERT' OR OLD.stato <> 'svolto') AND NEW.conto_riga_id IS NULL THEN
    NEW.conto_riga_id := hotel_addebito(NEW.prenotazione_id, 'Transfer ' || NEW.tipo || ' · ' || NEW.luogo || ' · '
                                          || to_char(NEW.data_ora AT TIME ZONE 'Europe/Rome', 'DD/MM HH24:MI'),
                                        1, NEW.prezzo, 10, 'hotel_transfer', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_transfer_effetti BEFORE INSERT OR UPDATE OF stato ON hotel_transfer
  FOR EACH ROW EXECUTE FUNCTION hotel_transfer_svolto();

-- Sala: partecipanti entro la capienza dell'allestimento.
CREATE OR REPLACE FUNCTION hotel_sala_prenotazione_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  sa hotel_sale%ROWTYPE;
  v_max INT;
BEGIN
  SELECT * INTO sa FROM hotel_sale WHERE id = NEW.sala_id;
  NEW.struttura_id := sa.struttura_id;
  IF NEW.allestimento IS NOT NULL AND NEW.partecipanti IS NOT NULL THEN
    v_max := (sa.capienze->>NEW.allestimento)::int;
    IF v_max IS NOT NULL AND NEW.partecipanti > v_max THEN
      RAISE EXCEPTION 'La sala % allestita a % ospita al massimo % persone', sa.nome, replace(NEW.allestimento, '_', ' '), v_max
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_sale_prenotazioni_controlla BEFORE INSERT OR UPDATE ON hotel_sale_prenotazioni
  FOR EACH ROW EXECUTE FUNCTION hotel_sala_prenotazione_controlla();

-- Oggetti smarriti: codice e scadenza della custodia.
CREATE OR REPLACE FUNCTION hotel_oggetto_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.codice IS NULL THEN NEW.codice := genera_codice('OGG'); END IF;
    NEW.trovato_da := COALESCE(NEW.trovato_da, auth.uid());
    NEW.custodia_fino := COALESCE(NEW.custodia_fino, NEW.trovato_il + 365);
  END IF;
  IF NEW.stato IN ('restituito', 'spedito') AND NEW.restituito_il IS NULL THEN
    NEW.restituito_il := (NOW() AT TIME ZONE 'Europe/Rome')::date;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_oggetti_smarriti_prepara BEFORE INSERT OR UPDATE ON hotel_oggetti_smarriti
  FOR EACH ROW EXECUTE FUNCTION hotel_oggetto_prepara();

CREATE OR REPLACE FUNCTION hotel_oggetto_scadenza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  DELETE FROM scadenze_moduli WHERE entita = 'hotel_oggetti_smarriti' AND entita_id = NEW.id AND stato = 'aperta';
  IF NEW.stato = 'custodito' AND NEW.custodia_fino IS NOT NULL THEN
    INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
    VALUES ('hotel', 'hotel_oggetti_smarriti', NEW.id, 'Fine custodia', NEW.codice || ' · ' || NEW.descrizione,
            NEW.custodia_fino, '/hotel/smarriti', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER hotel_oggetti_smarriti_scadenza AFTER INSERT OR UPDATE OF stato, custodia_fino ON hotel_oggetti_smarriti
  FOR EACH ROW EXECUTE FUNCTION hotel_oggetto_scadenza();

-- ═══ 10. RISTORANTE E BAR: PASTI PREVISTI, CONTI IN CASA ════════════
-- Colazioni del mattino (chi ha dormito la notte prima) e cene della sera
-- (chi dorme la notte), secondo il trattamento.
CREATE OR REPLACE FUNCTION hotel_pasti_previsti(p_struttura UUID, p_giorno DATE DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date)
RETURNS TABLE (pasto TEXT, camera TEXT, ospite TEXT, persone INT, trattamento TEXT)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT 'colazione', c.numero, p.ospite_nome, p.adulti + p.bambini, t.nome
    FROM hotel_prenotazioni p JOIN hotel_trattamenti t ON t.id = p.trattamento_id
    LEFT JOIN hotel_camere c ON c.id = p.camera_id
   WHERE p.struttura_id = p_struttura AND t.colazione AND p.stato IN ('confermata', 'in_soggiorno', 'partita')
     AND p.arrivo < p_giorno AND p.partenza >= p_giorno
  UNION ALL
  SELECT 'pranzo', c.numero, p.ospite_nome, p.adulti + p.bambini, t.nome
    FROM hotel_prenotazioni p JOIN hotel_trattamenti t ON t.id = p.trattamento_id
    LEFT JOIN hotel_camere c ON c.id = p.camera_id
   WHERE p.struttura_id = p_struttura AND t.pranzo AND p.stato IN ('confermata', 'in_soggiorno')
     AND p.arrivo < p_giorno AND p.partenza > p_giorno
  UNION ALL
  SELECT 'cena', c.numero, p.ospite_nome, p.adulti + p.bambini, t.nome
    FROM hotel_prenotazioni p JOIN hotel_trattamenti t ON t.id = p.trattamento_id
    LEFT JOIN hotel_camere c ON c.id = p.camera_id
   WHERE p.struttura_id = p_struttura AND t.cena AND p.stato IN ('confermata', 'in_soggiorno')
     AND p.arrivo <= p_giorno AND p.partenza > p_giorno
   ORDER BY 1, 2
$$;

-- Conti camera aperti degli ospiti in casa: il ristorante e il bar ci addebitano.
CREATE VIEW hotel_conti_in_casa WITH (security_invoker = true) AS
SELECT p.conto_id, p.id AS prenotazione_id, p.struttura_id, p.modulo, c.numero AS camera, p.ospite_nome, p.arrivo, p.partenza,
       t.nome AS trattamento, t.colazione, t.pranzo, t.cena, s.residuo
  FROM hotel_prenotazioni p
  JOIN hotel_camere c ON c.id = p.camera_id
  JOIN conti k ON k.id = p.conto_id AND k.stato = 'aperto'
  LEFT JOIN hotel_trattamenti t ON t.id = p.trattamento_id
  LEFT JOIN conti_saldi s ON s.conto_id = p.conto_id
 WHERE p.stato = 'in_soggiorno';

-- ═══ 11. ADEMPIMENTI: ALLOGGIATI WEB E ISTAT ════════════════════════
-- Ospiti arrivati nel giorno con i dati che mancano per la schedina.
CREATE OR REPLACE FUNCTION hotel_alloggiati_controllo(p_struttura UUID, p_giorno DATE)
RETURNS TABLE (soggiorno_ospite_id UUID, prenotazione TEXT, ospite TEXT, tipo_alloggiato TEXT, mancanti TEXT[])
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT so.id, p.codice, trim(k.nome || ' ' || COALESCE(k.cognome, '')), so.tipo_alloggiato,
         array_remove(ARRAY[
           CASE WHEN k.cognome IS NULL THEN 'cognome' END,
           CASE WHEN h.sesso IS NULL THEN 'sesso' END,
           CASE WHEN h.data_nascita IS NULL THEN 'data di nascita' END,
           CASE WHEN h.codice_stato_nascita IS NULL THEN 'stato di nascita' END,
           CASE WHEN h.codice_stato_nascita = '100000100' AND h.codice_comune_nascita IS NULL THEN 'comune di nascita' END,
           CASE WHEN h.codice_cittadinanza IS NULL THEN 'cittadinanza' END,
           CASE WHEN so.tipo_alloggiato IN ('16', '17', '18') AND h.documento_tipo IS NULL THEN 'tipo di documento' END,
           CASE WHEN so.tipo_alloggiato IN ('16', '17', '18') AND h.documento_numero IS NULL THEN 'numero del documento' END,
           CASE WHEN so.tipo_alloggiato IN ('16', '17', '18') AND h.codice_luogo_documento IS NULL THEN 'luogo di rilascio' END
         ], NULL)
    FROM hotel_soggiorno_ospiti so
    JOIN hotel_prenotazioni p ON p.id = so.prenotazione_id
    JOIN hotel_ospiti h ON h.id = so.ospite_id
    JOIN contatti k ON k.id = h.contatto_id
   WHERE p.struttura_id = p_struttura AND p.arrivo = p_giorno AND p.stato IN ('in_soggiorno', 'partita')
   ORDER BY p.codice, so.tipo_alloggiato
$$;

-- File per il caricamento manuale su Alloggiati Web: un record di 168
-- caratteri per ospite (tracciato a lunghezza fissa), capofamiglia o
-- capogruppo prima dei familiari e dei membri. Il collegamento diretto è predisposto.
CREATE OR REPLACE FUNCTION hotel_alloggiati_file(p_struttura UUID, p_giorno DATE)
RETURNS TEXT
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT string_agg(
           rpad(so.tipo_alloggiato, 2)
        || to_char(p.arrivo, 'DD/MM/YYYY')
        || lpad(LEAST(p.partenza - p.arrivo, 30)::text, 2, '0')
        || rpad(upper(COALESCE(k.cognome, '')), 50)
        || rpad(upper(k.nome), 30)
        || CASE h.sesso WHEN 'M' THEN '1' WHEN 'F' THEN '2' ELSE ' ' END
        || COALESCE(to_char(h.data_nascita, 'DD/MM/YYYY'), rpad('', 10))
        || rpad(COALESCE(h.codice_comune_nascita, ''), 9)
        || rpad(upper(COALESCE(h.provincia_nascita, '')), 2)
        || rpad(COALESCE(h.codice_stato_nascita, ''), 9)
        || rpad(COALESCE(h.codice_cittadinanza, ''), 9)
        || CASE WHEN so.tipo_alloggiato IN ('16', '17', '18')
                THEN rpad(COALESCE(h.documento_tipo, ''), 5) || rpad(upper(COALESCE(h.documento_numero, '')), 20)
                     || rpad(COALESCE(h.codice_luogo_documento, ''), 9)
                ELSE rpad('', 34) END,
           E'\r\n' ORDER BY p.codice, so.tipo_alloggiato, k.cognome, k.nome)
    FROM hotel_soggiorno_ospiti so
    JOIN hotel_prenotazioni p ON p.id = so.prenotazione_id
    JOIN hotel_ospiti h ON h.id = so.ospite_id
    JOIN contatti k ON k.id = h.contatto_id
   WHERE p.struttura_id = p_struttura AND p.arrivo = p_giorno AND p.stato IN ('in_soggiorno', 'partita')
$$;

CREATE OR REPLACE FUNCTION hotel_alloggiati_segna_inviati(p_struttura UUID, p_giorno DATE)
RETURNS INT
LANGUAGE sql SET search_path = pg_catalog, public AS $$
  WITH x AS (
    UPDATE hotel_soggiorno_ospiti so SET inviato_alloggiati_at = NOW()
      FROM hotel_prenotazioni p
     WHERE p.id = so.prenotazione_id AND p.struttura_id = p_struttura AND p.arrivo = p_giorno
       AND p.stato IN ('in_soggiorno', 'partita') AND so.inviato_alloggiati_at IS NULL
    RETURNING so.id
  )
  SELECT count(*)::int FROM x
$$;

-- Movimento del giorno per provenienza (residenza): arrivi, partenze e presenze.
CREATE OR REPLACE FUNCTION hotel_istat_movimento(p_struttura UUID, p_giorno DATE)
RETURNS TABLE (provenienza TEXT, italiano BOOLEAN, arrivi INT, partenze INT, presenze INT)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH o AS (
    SELECT p.arrivo, p.partenza,
           CASE WHEN COALESCE(h.residenza_stato, 'Italia') ILIKE 'italia' THEN COALESCE(h.residenza_provincia, 'Provincia non indicata')
                ELSE h.residenza_stato END AS provenienza,
           COALESCE(h.residenza_stato, 'Italia') ILIKE 'italia' AS italiano
      FROM hotel_soggiorno_ospiti so
      JOIN hotel_prenotazioni p ON p.id = so.prenotazione_id
      JOIN hotel_ospiti h ON h.id = so.ospite_id
     WHERE p.struttura_id = p_struttura AND p.stato IN ('in_soggiorno', 'partita')
       AND p.arrivo <= p_giorno AND p.partenza >= p_giorno
  )
  SELECT provenienza, italiano,
         count(*) FILTER (WHERE arrivo = p_giorno)::int,
         count(*) FILTER (WHERE partenza = p_giorno)::int,
         count(*) FILTER (WHERE arrivo <= p_giorno AND partenza > p_giorno)::int
    FROM o GROUP BY provenienza, italiano
   ORDER BY italiano DESC, provenienza
$$;

-- ═══ 12. TRIGGER COMUNI, RLS, PROTEZIONI ════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['hotel_pulizie','hotel_manutenzioni','hotel_biancheria','hotel_minibar_dotazioni','hotel_minibar_consumi',
                           'hotel_servizi','hotel_servizi_prenotazioni','hotel_parcheggio','hotel_transfer','hotel_sale',
                           'hotel_sale_prenotazioni','hotel_oggetti_smarriti'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['hotel_manutenzioni','hotel_biancheria','hotel_biancheria_movimenti','hotel_minibar_dotazioni',
                           'hotel_minibar_consumi','hotel_servizi','hotel_servizi_prenotazioni','hotel_parcheggio','hotel_transfer',
                           'hotel_sale','hotel_sale_prenotazioni','hotel_oggetti_smarriti'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['hotel_pulizie','hotel_manutenzioni','hotel_biancheria','hotel_biancheria_movimenti',
                           'hotel_minibar_dotazioni','hotel_minibar_consumi','hotel_servizi','hotel_servizi_prenotazioni',
                           'hotel_parcheggio','hotel_transfer','hotel_sale','hotel_sale_prenotazioni','hotel_oggetti_smarriti'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;

  -- Cataloghi e dotazioni: la direzione.
  FOREACH t IN ARRAY ARRAY['hotel_biancheria','hotel_minibar_dotazioni','hotel_servizi','hotel_sale'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;

  -- Lavoro quotidiano: tutto il personale dell'hotel.
  FOREACH t IN ARRAY ARRAY['hotel_pulizie','hotel_manutenzioni','hotel_biancheria_movimenti','hotel_minibar_consumi',
                           'hotel_servizi_prenotazioni','hotel_parcheggio','hotel_transfer','hotel_sale_prenotazioni',
                           'hotel_oggetti_smarriti'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['hotel_pulizie','hotel_manutenzioni','hotel_minibar_consumi','hotel_servizi_prenotazioni',
                           'hotel_parcheggio','hotel_transfer','hotel_sale_prenotazioni','hotel_oggetti_smarriti'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;
END $$;

GRANT SELECT ON hotel_biancheria_stato, hotel_conti_in_casa TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'hotel_addebito(uuid,text,numeric,numeric,numeric,text,uuid)', 'hotel_genera_pulizie_tutte()', 'hotel_partenza_pulizia()',
    'hotel_pulizia_avanza()', 'hotel_pulizia_anomalia()', 'hotel_manutenzione_effetti()', 'hotel_biancheria_movimento()',
    'hotel_minibar_consumo()', 'hotel_servizio_prenotazione()', 'hotel_parcheggio_uscita()', 'hotel_transfer_svolto()',
    'hotel_sala_prenotazione_controlla()', 'hotel_oggetto_prepara()', 'hotel_oggetto_scadenza()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
    'hotel_in_casa(uuid)', 'hotel_genera_pulizie(uuid,date)', 'hotel_assegna_pulizie(uuid,date,uuid[])',
    'hotel_pasti_previsti(uuid,date)', 'hotel_alloggiati_controllo(uuid,date)', 'hotel_alloggiati_file(uuid,date)',
    'hotel_alloggiati_segna_inviati(uuid,date)', 'hotel_istat_movimento(uuid,date)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'hotel-pulizie-del-giorno';
SELECT cron.schedule('hotel-pulizie-del-giorno', '0 4 * * *', $$SELECT hotel_genera_pulizie_tutte()$$);

SELECT applica_protezioni_tabelle();
