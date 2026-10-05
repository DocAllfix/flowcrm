-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Fioraio (Sprint 5) · 1/2: ordini, composizioni su misura,
-- produzione, consegne, ricorrenze, abbonamenti floreali, cerimonie.
--
-- Documento Fioraio §5–14, §22.
--
-- Catalogo, lotti deperibili, composizioni standard (distinta base),
-- fornitori, cassa, eventi, fidelizzazione e campagne sono le fondamenta
-- con modulo = 'fioraio': qui c'è ciò che è solo del fiorista.
--
-- Chi ordina non è chi riceve: l'ordine tiene separati committente,
-- pagatore, destinatario e mittente del biglietto. Alla conferma nascono
-- la commessa di produzione di ogni composizione e la consegna; la
-- produzione finita scarica fiori e materiali dal magazzino.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TYPE fior_ordine_stato AS ENUM (
  'ricevuto', 'confermato', 'in_preparazione', 'pronto', 'in_consegna', 'consegnato', 'chiuso', 'annullato'
);

-- ═══ 1. IMPOSTAZIONI E ZONE DI CONSEGNA ═════════════════════════════
CREATE TABLE fior_impostazioni (
  id                          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),      -- una sola riga
  modulo                      TEXT NOT NULL DEFAULT 'fioraio' CHECK (modulo = 'fioraio'),
  negozio                     TEXT,
  indirizzo                   TEXT,
  ricarico_pct                NUMERIC(6,2) NOT NULL DEFAULT 150 CHECK (ricarico_pct >= 0),  -- sul costo, per il prezzo proposto
  costo_orario                NUMERIC(8,2) NOT NULL DEFAULT 20 CHECK (costo_orario >= 0),   -- manodopera nelle composizioni
  fasce                       TEXT[] NOT NULL DEFAULT '{09:00–13:00,15:00–19:00}',
  promemoria_ricorrenze_giorni INT NOT NULL DEFAULT 7 CHECK (promemoria_ricorrenze_giorni BETWEEN 1 AND 60),
  abbonamenti_anticipo_giorni  INT NOT NULL DEFAULT 3 CHECK (abbonamenti_anticipo_giorni BETWEEN 0 AND 30),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                  UUID REFERENCES user_profiles(id),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                  UUID REFERENCES user_profiles(id)
);

CREATE TABLE fior_zone (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo      TEXT NOT NULL DEFAULT 'fioraio' CHECK (modulo = 'fioraio'),
  nome        TEXT NOT NULL UNIQUE,
  cap         TEXT[] NOT NULL DEFAULT '{}',             -- i CAP serviti: la zona si riconosce dall'indirizzo
  importo     NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (importo >= 0),
  ordine      INT NOT NULL DEFAULT 0,                   -- nel giro delle consegne
  attiva      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);

-- ═══ 2. ABBONAMENTI FLOREALI (§14) ══════════════════════════════════
CREATE TABLE fior_abbonamenti (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo             TEXT NOT NULL DEFAULT 'fioraio' CHECK (modulo = 'fioraio'),
  codice             TEXT UNIQUE,
  contatto_id        UUID REFERENCES contatti(id) ON DELETE SET NULL,
  organizzazione_id  UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  piano              TEXT NOT NULL,                       -- «Bouquet settimanale», «Fiori per la reception»
  tipo               TEXT NOT NULL DEFAULT 'bouquet' CHECK (tipo IN ('bouquet', 'fiori_ufficio', 'fiori_hotel', 'fiori_ristorante',
                       'piante_ufficio', 'manutenzione_verde', 'altro')),
  frequenza          TEXT NOT NULL DEFAULT 'settimanale' CHECK (frequenza IN ('settimanale', 'quindicinale', 'mensile')),
  prezzo             NUMERIC(10,2) NOT NULL CHECK (prezzo >= 0), -- a consegna
  distinta_id        UUID REFERENCES distinte_base(id) ON DELETE SET NULL,
  prodotti           TEXT,                                -- descrizione, se non c'è una composizione standard
  destinatario_nome  TEXT NOT NULL,
  destinatario_telefono TEXT,
  indirizzo          TEXT,
  cap                TEXT,
  citta              TEXT,
  fascia             TEXT,
  ritiro             BOOLEAN NOT NULL DEFAULT false,      -- ritira in negozio invece della consegna
  prossima_consegna  DATE NOT NULL,
  data_rinnovo       DATE,                                -- fine del periodo concordato
  pagamento          TEXT NOT NULL DEFAULT 'a_consegna' CHECK (pagamento IN ('a_consegna', 'mensile', 'ricorrente')),
  stato              TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo', 'sospeso', 'chiuso')),
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id),
  CHECK (contatto_id IS NOT NULL OR organizzazione_id IS NOT NULL)
);

-- ═══ 3. ORDINI (§6, §9, §10) ════════════════════════════════════════
CREATE TABLE fior_ordini (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                TEXT NOT NULL DEFAULT 'fioraio' CHECK (modulo = 'fioraio'),
  codice                TEXT UNIQUE,
  stato                 fior_ordine_stato NOT NULL DEFAULT 'ricevuto',
  canale                TEXT NOT NULL DEFAULT 'negozio' CHECK (canale IN ('negozio', 'telefono', 'email', 'sito', 'whatsapp', 'marketplace', 'social', 'abbonamento')),
  canale_riferimento    TEXT,                             -- numero d'ordine del sito o del marketplace
  data_ordine           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- I quattro ruoli (§9)
  committente_id        UUID REFERENCES contatti(id) ON DELETE SET NULL,
  committente_nome      TEXT NOT NULL,
  committente_telefono  TEXT,
  organizzazione_id     UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,   -- azienda cliente
  pagatore_id           UUID REFERENCES contatti(id) ON DELETE SET NULL,         -- se diverso dal committente
  pagatore_organizzazione_id UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  destinatario_nome     TEXT,                             -- chi riceve i fiori
  destinatario_telefono TEXT,
  indirizzo             TEXT,
  cap                   TEXT,
  citta                 TEXT,
  indicazioni           TEXT,                             -- citofono, piano, orari del portiere
  -- Consegna o ritiro
  modalita              TEXT NOT NULL DEFAULT 'ritiro' CHECK (modalita IN ('ritiro', 'consegna', 'banco')),
  data_richiesta        DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  ora_richiesta         TIME,
  fascia                TEXT,
  zona_id               UUID REFERENCES fior_zone(id) ON DELETE SET NULL,
  importo_consegna      NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (importo_consegna >= 0),
  -- Biglietto (§10)
  messaggio             TEXT,
  firma                 TEXT,                             -- il mittente del messaggio
  anonimo               BOOLEAN NOT NULL DEFAULT false,
  biglietto_stampato    BOOLEAN NOT NULL DEFAULT false,
  -- Ricorrenza (§7)
  occasione             TEXT,
  ricorda_ricorrenza    BOOLEAN NOT NULL DEFAULT false,
  -- Collegamenti
  evento_id             UUID REFERENCES eventi(id) ON DELETE SET NULL,
  abbonamento_id        UUID REFERENCES fior_abbonamenti(id) ON DELETE SET NULL,
  addetto_preparazione  UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  addetto_consegna      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  -- Importi
  sconto                NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (sconto >= 0),
  totale                NUMERIC(10,2) NOT NULL DEFAULT 0,
  costo_stimato         NUMERIC(10,2) NOT NULL DEFAULT 0,
  conto_id              UUID REFERENCES conti(id) ON DELETE SET NULL,
  materiali_scaricati   BOOLEAN NOT NULL DEFAULT false,
  confermato_at         TIMESTAMPTZ,
  pronto_at             TIMESTAMPTZ,
  consegnato_at         TIMESTAMPTZ,
  annullato_motivo      TEXT,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id),
  ricerca               TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple',
                          COALESCE(codice, '') || ' ' || committente_nome || ' ' || COALESCE(destinatario_nome, '') || ' ' || COALESCE(indirizzo, ''))) STORED,
  CHECK (modalita <> 'consegna' OR (destinatario_nome IS NOT NULL AND indirizzo IS NOT NULL))
);
CREATE INDEX idx_fior_ordini_data ON fior_ordini (data_richiesta, stato);
CREATE INDEX idx_fior_ordini_committente ON fior_ordini (committente_id);
CREATE INDEX idx_fior_ordini_ricerca ON fior_ordini USING gin (ricerca);

CREATE TABLE fior_ordini_righe (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'fioraio' CHECK (modulo = 'fioraio'),
  ordine_id         UUID NOT NULL REFERENCES fior_ordini(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL CHECK (tipo IN ('articolo', 'composizione', 'su_misura')),
  articolo_id       UUID REFERENCES mag_articoli(id) ON DELETE RESTRICT,
  distinta_id       UUID REFERENCES distinte_base(id) ON DELETE RESTRICT,
  descrizione       TEXT,
  quantita          NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantita > 0),
  prezzo_unitario   NUMERIC(10,2),
  sconto_pct        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (sconto_pct BETWEEN 0 AND 100),
  aliquota_iva      NUMERIC(5,2) NOT NULL DEFAULT 10,       -- fiori e piante al 10%; accessori al 22
  importo           NUMERIC(10,2) NOT NULL DEFAULT 0,
  costo_unitario    NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Composizione su misura (§5)
  richiesta         JSONB NOT NULL DEFAULT '{}',            -- {tipo, colori, fiori, dimensioni, stile, budget, accessori, note}
  minuti            INT CHECK (minuti >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  CHECK ((tipo = 'articolo' AND articolo_id IS NOT NULL) OR (tipo = 'composizione' AND distinta_id IS NOT NULL)
      OR (tipo = 'su_misura' AND descrizione IS NOT NULL))
);
CREATE INDEX idx_fior_righe_ordine ON fior_ordini_righe (ordine_id);

-- Materiali di una composizione su misura: da qui costo, prezzo proposto e scarico.
CREATE TABLE fior_righe_materiali (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo      TEXT NOT NULL DEFAULT 'fioraio' CHECK (modulo = 'fioraio'),
  riga_id     UUID NOT NULL REFERENCES fior_ordini_righe(id) ON DELETE CASCADE,
  articolo_id UUID NOT NULL REFERENCES mag_articoli(id) ON DELETE RESTRICT,
  quantita    NUMERIC(10,2) NOT NULL CHECK (quantita > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  UNIQUE (riga_id, articolo_id)
);

-- ═══ 4. PRODUZIONE (§22) ════════════════════════════════════════════
CREATE TABLE fior_produzione (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo          TEXT NOT NULL DEFAULT 'fioraio' CHECK (modulo = 'fioraio'),
  codice          TEXT UNIQUE,
  ordine_id       UUID NOT NULL REFERENCES fior_ordini(id) ON DELETE CASCADE,
  riga_id         UUID NOT NULL UNIQUE REFERENCES fior_ordini_righe(id) ON DELETE CASCADE,
  descrizione     TEXT NOT NULL,
  quantita        NUMERIC(10,2) NOT NULL,
  operatore_id    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  minuti_previsti INT,
  pronta_entro    TIMESTAMPTZ,                              -- data e ora della consegna o del ritiro
  stato           TEXT NOT NULL DEFAULT 'da_fare' CHECK (stato IN ('da_fare', 'in_corso', 'pronta', 'annullata')),
  inizio_at       TIMESTAMPTZ,
  fine_at         TIMESTAMPTZ,
  minuti_effettivi INT,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_fior_produzione_stato ON fior_produzione (stato, pronta_entro);

-- ═══ 5. CONSEGNE (§8) ═══════════════════════════════════════════════
CREATE TABLE fior_consegne (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo        TEXT NOT NULL DEFAULT 'fioraio' CHECK (modulo = 'fioraio'),
  ordine_id     UUID NOT NULL UNIQUE REFERENCES fior_ordini(id) ON DELETE CASCADE,
  data          DATE NOT NULL,
  fascia        TEXT,
  zona_id       UUID REFERENCES fior_zone(id) ON DELETE SET NULL,
  autista_id    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  veicolo       TEXT,                                       -- targa o nome del mezzo
  sequenza      INT,                                        -- posizione nel giro
  importo       NUMERIC(8,2) NOT NULL DEFAULT 0,
  stato         TEXT NOT NULL DEFAULT 'da_assegnare' CHECK (stato IN ('da_assegnare', 'assegnata', 'in_consegna', 'consegnata', 'fallita')),
  partita_at    TIMESTAMPTZ,
  consegnata_at TIMESTAMPTZ,
  ricevuta_da   TEXT,                                       -- chi ha ritirato (firma o nome)
  esito         TEXT,                                       -- assente, indirizzo errato…
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_fior_consegne_data ON fior_consegne (data, stato);

-- ═══ 6. RICORRENZE (§7) ═════════════════════════════════════════════
CREATE TABLE fior_ricorrenze (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL DEFAULT 'fioraio' CHECK (modulo = 'fioraio'),
  contatto_id  UUID NOT NULL REFERENCES contatti(id) ON DELETE CASCADE,   -- il cliente da avvisare
  tipo         TEXT NOT NULL DEFAULT 'compleanno' CHECK (tipo IN ('compleanno', 'anniversario', 'san_valentino', 'festa_mamma', 'festa_donna',
                 'laurea', 'nascita', 'battesimo', 'comunione', 'cresima', 'matrimonio', 'aziendale', 'commemorativa', 'altro')),
  per_chi      TEXT,                                        -- «la moglie Anna», «la mamma»
  giorno       INT NOT NULL CHECK (giorno BETWEEN 1 AND 31),
  mese         INT NOT NULL CHECK (mese BETWEEN 1 AND 12),
  anno         INT,                                         -- l'anno dell'evento, se noto (per «10 anni di matrimonio»)
  ordine_id    UUID REFERENCES fior_ordini(id) ON DELETE SET NULL,   -- l'ordine da cui è nata
  ultimo_avviso DATE,
  attiva       BOOLEAN NOT NULL DEFAULT true,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id),
  UNIQUE (contatto_id, tipo, giorno, mese, per_chi)
);

-- ═══ 7. CERIMONIE, FUNERALI, EVENTI AZIENDALI (§11–13) ══════════════
-- L'evento (cliente, data, location, invitati, budget, costi e ricavi) è
-- quello delle fondamenta; qui i dettagli floreali.
CREATE TABLE fior_cerimonie (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'fioraio' CHECK (modulo = 'fioraio'),
  evento_id         UUID NOT NULL UNIQUE REFERENCES eventi(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL DEFAULT 'matrimonio' CHECK (tipo IN ('matrimonio', 'cerimonia', 'funerale', 'aziendale', 'altro')),
  tema              TEXT,
  colori            TEXT,
  fiori             TEXT,
  allestimenti      JSONB NOT NULL DEFAULT '[]',            -- [{voce:'Bouquet sposa', quantita:1, note:'', fatto:false}]
  luogo_cerimonia   TEXT,                                   -- chiesa, sala del commiato
  consegna_at       TIMESTAMPTZ,
  montaggio_at      TIMESTAMPTZ,
  smontaggio_at     TIMESTAMPTZ,
  agenzia_id        UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,   -- agenzia funebre, wedding planner
  defunto           TEXT,                                   -- per i servizi commemorativi
  ricorrente        BOOLEAN NOT NULL DEFAULT false,         -- servizio ricorrente per l'azienda
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);

-- ═══ 8. FUNZIONI DI SERVIZIO ════════════════════════════════════════
CREATE OR REPLACE FUNCTION fior_oggi()
RETURNS DATE LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT (NOW() AT TIME ZONE 'Europe/Rome')::date
$$;

CREATE OR REPLACE FUNCTION fior_regole()
RETURNS fior_impostazioni LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT COALESCE((SELECT i FROM fior_impostazioni i WHERE id = 1), ROW(1, 'fioraio', NULL, NULL, 150, 20, '{09:00–13:00,15:00–19:00}'::text[], 7, 3,
                   NOW(), NULL, NOW(), NULL)::fior_impostazioni)
$$;

-- Costo e prezzo proposto di una composizione su misura: materiali al costo
-- più la manodopera, poi il ricarico del negozio (§5).
CREATE OR REPLACE FUNCTION fior_stima(p_materiali JSONB, p_minuti INT DEFAULT 0)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  g fior_impostazioni := fior_regole();
  v_materiali NUMERIC := 0;
  v_manodopera NUMERIC;
  v_costo NUMERIC;
BEGIN
  IF NOT modulo_attivo('fioraio') THEN RAISE EXCEPTION 'Modulo Fioraio non attivo' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(sum((x->>'quantita')::numeric * COALESCE(a.costo_unitario, 0)), 0) INTO v_materiali
    FROM jsonb_array_elements(COALESCE(p_materiali, '[]'::jsonb)) x JOIN mag_articoli a ON a.id = (x->>'articolo_id')::uuid;
  v_manodopera := round(COALESCE(p_minuti, 0) / 60.0 * g.costo_orario, 2);
  v_costo := round(v_materiali + v_manodopera, 2);
  RETURN jsonb_build_object('materiali', round(v_materiali, 2), 'manodopera', v_manodopera, 'costo', v_costo,
                            'prezzo', ceil(v_costo * (1 + g.ricarico_pct / 100)), 'ricarico_pct', g.ricarico_pct);
END;
$$;

-- ═══ 9. RIGHE: PREZZO, COSTO, IMPORTO; TOTALE DELL'ORDINE ═══════════
CREATE OR REPLACE FUNCTION fior_riga_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  a mag_articoli%ROWTYPE;
  d distinte_base%ROWTYPE;
  v_stato fior_ordine_stato;
BEGIN
  SELECT stato INTO v_stato FROM fior_ordini WHERE id = NEW.ordine_id;
  IF v_stato IN ('consegnato', 'chiuso', 'annullato') AND current_setting('fior.interno', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'L''ordine è %: le righe non si cambiano', replace(v_stato::text, '_', ' ') USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.tipo = 'articolo' THEN
    SELECT * INTO a FROM mag_articoli WHERE id = NEW.articolo_id;
    NEW.descrizione := COALESCE(NEW.descrizione, a.descrizione);
    NEW.prezzo_unitario := COALESCE(NEW.prezzo_unitario, a.prezzo_vendita, 0);
    NEW.costo_unitario := COALESCE(a.costo_unitario, 0);
    IF TG_OP = 'INSERT' THEN NEW.aliquota_iva := COALESCE(a.aliquota_iva, NEW.aliquota_iva); END IF;
  ELSIF NEW.tipo = 'composizione' THEN
    SELECT * INTO d FROM distinte_base WHERE id = NEW.distinta_id;
    NEW.descrizione := COALESCE(NEW.descrizione, d.nome);
    NEW.prezzo_unitario := COALESCE(NEW.prezzo_unitario, d.prezzo_vendita, 0);
    NEW.costo_unitario := COALESCE(costo_distinta(NEW.distinta_id), 0)
                          + round(COALESCE(d.tempo_preparazione_min, 0) / 60.0 * (fior_regole()).costo_orario, 2);
    NEW.minuti := COALESCE(NEW.minuti, d.tempo_preparazione_min);
  ELSE
    NEW.prezzo_unitario := COALESCE(NEW.prezzo_unitario, 0);   -- il costo arriva dai materiali
  END IF;
  NEW.importo := round(NEW.quantita * NEW.prezzo_unitario * (1 - NEW.sconto_pct / 100), 2);
  RETURN NEW;
END;
$$;
CREATE TRIGGER fior_ordini_righe_prepara BEFORE INSERT OR UPDATE ON fior_ordini_righe FOR EACH ROW EXECUTE FUNCTION fior_riga_prepara();

CREATE OR REPLACE FUNCTION fior_ordine_ricalcola(p_ordine UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  UPDATE fior_ordini o SET
    totale = GREATEST(COALESCE((SELECT sum(importo) FROM fior_ordini_righe WHERE ordine_id = o.id), 0) + o.importo_consegna - o.sconto, 0),
    costo_stimato = COALESCE((SELECT sum(quantita * costo_unitario) FROM fior_ordini_righe WHERE ordine_id = o.id), 0)
   WHERE o.id = p_ordine
$$;

CREATE OR REPLACE FUNCTION fior_riga_totale()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM fior_ordine_ricalcola(COALESCE(NEW.ordine_id, OLD.ordine_id));
  RETURN NULL;
END;
$$;
CREATE TRIGGER fior_ordini_righe_totale AFTER INSERT OR UPDATE OR DELETE ON fior_ordini_righe FOR EACH ROW EXECUTE FUNCTION fior_riga_totale();

-- Materiali di una riga su misura: il costo della riga li segue.
CREATE OR REPLACE FUNCTION fior_materiale_costo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_riga UUID := COALESCE(NEW.riga_id, OLD.riga_id);
  v_minuti INT;
  v JSONB;
BEGIN
  SELECT minuti INTO v_minuti FROM fior_ordini_righe WHERE id = v_riga;
  IF NOT FOUND THEN RETURN NULL; END IF;              -- riga cancellata a cascata
  v := fior_stima((SELECT COALESCE(jsonb_agg(jsonb_build_object('articolo_id', articolo_id, 'quantita', quantita)), '[]')
                     FROM fior_righe_materiali WHERE riga_id = v_riga), v_minuti);
  PERFORM set_config('fior.interno', '1', true);
  UPDATE fior_ordini_righe SET costo_unitario = (v->>'costo')::numeric WHERE id = v_riga;
  PERFORM set_config('fior.interno', '0', true);
  RETURN NULL;
END;
$$;
CREATE TRIGGER fior_righe_materiali_costo AFTER INSERT OR UPDATE OR DELETE ON fior_righe_materiali FOR EACH ROW EXECUTE FUNCTION fior_materiale_costo();

-- ═══ 10. ORDINE: CODICE, ZONA, PASSAGGI DI STATO ════════════════════
CREATE OR REPLACE FUNCTION fior_ordine_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  z fior_zone%ROWTYPE;
  ordine_stati CONSTANT TEXT[] := ARRAY['ricevuto', 'confermato', 'in_preparazione', 'pronto', 'in_consegna', 'consegnato', 'chiuso'];
BEGIN
  IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('FIO'); END IF;
  -- Zona dal CAP e costo della consegna, se non già scelti.
  IF NEW.modalita = 'consegna' THEN
    IF NEW.zona_id IS NULL AND NEW.cap IS NOT NULL THEN
      SELECT * INTO z FROM fior_zone WHERE attiva AND NEW.cap = ANY (cap) ORDER BY ordine LIMIT 1;
      NEW.zona_id := z.id;
    END IF;
    IF TG_OP = 'INSERT' AND NEW.importo_consegna = 0 AND NEW.zona_id IS NOT NULL THEN
      SELECT importo INTO NEW.importo_consegna FROM fior_zone WHERE id = NEW.zona_id;
    END IF;
  ELSE
    NEW.zona_id := NULL; NEW.importo_consegna := 0;
  END IF;
  IF NEW.anonimo THEN NEW.firma := NULL; END IF;

  IF TG_OP = 'UPDATE' AND NEW.stato IS DISTINCT FROM OLD.stato THEN
    IF OLD.stato IN ('chiuso', 'annullato') THEN
      RAISE EXCEPTION 'L''ordine è %: non cambia più', OLD.stato USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.stato <> 'annullato' AND array_position(ordine_stati, NEW.stato::text) < array_position(ordine_stati, OLD.stato::text) THEN
      RAISE EXCEPTION 'Un ordine % non torna a %', replace(OLD.stato::text, '_', ' '), replace(NEW.stato::text, '_', ' ') USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.stato = 'annullato' AND OLD.stato IN ('in_consegna', 'consegnato') THEN
      RAISE EXCEPTION 'Un ordine % non si annulla', replace(OLD.stato::text, '_', ' ') USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.stato NOT IN ('ricevuto', 'annullato') AND NOT EXISTS (SELECT 1 FROM fior_ordini_righe WHERE ordine_id = NEW.id) THEN
      RAISE EXCEPTION 'L''ordine è vuoto: aggiungi almeno un prodotto' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.stato <> 'annullato' AND array_position(ordine_stati, NEW.stato::text) >= 2 THEN NEW.confermato_at := COALESCE(NEW.confermato_at, NOW()); END IF;
    IF NEW.stato <> 'annullato' AND array_position(ordine_stati, NEW.stato::text) >= 4 THEN NEW.pronto_at := COALESCE(NEW.pronto_at, NOW()); END IF;
    IF NEW.stato IN ('consegnato', 'chiuso') THEN NEW.consegnato_at := COALESCE(NEW.consegnato_at, NOW()); END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fior_ordini_prepara BEFORE INSERT OR UPDATE ON fior_ordini FOR EACH ROW EXECUTE FUNCTION fior_ordine_prepara();

-- Quando cambiano consegna o sconto il totale si ricalcola.
CREATE OR REPLACE FUNCTION fior_ordine_importi()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM fior_ordine_ricalcola(NEW.id);
  RETURN NULL;
END;
$$;
CREATE TRIGGER fior_ordini_importi AFTER UPDATE OF importo_consegna, sconto ON fior_ordini FOR EACH ROW EXECUTE FUNCTION fior_ordine_importi();

-- Scarico degli articoli venduti così come sono (vasi, piante, accessori): una volta sola.
-- Al banco escono subito anche le composizioni già pronte in negozio (niente commessa).
CREATE OR REPLACE FUNCTION fior_scarica_articoli(p_ordine UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  o fior_ordini%ROWTYPE;
  r RECORD;
  m RECORD;
BEGIN
  SELECT * INTO o FROM fior_ordini WHERE id = p_ordine FOR UPDATE;
  IF o.materiali_scaricati THEN RETURN; END IF;
  FOR r IN SELECT * FROM fior_ordini_righe WHERE ordine_id = p_ordine LOOP
    IF r.tipo = 'articolo' THEN
      PERFORM mag_scarica(r.articolo_id, r.quantita, 'vendita', 'fior_ordini_righe', r.id, 'Ordine fiorista');
    ELSIF o.modalita = 'banco' AND r.tipo = 'composizione' THEN
      PERFORM scarica_distinta(r.distinta_id, r.quantita, 'vendita', 'fior_ordini_righe', r.id);
    ELSIF o.modalita = 'banco' THEN
      FOR m IN SELECT * FROM fior_righe_materiali WHERE riga_id = r.id LOOP
        PERFORM mag_scarica(m.articolo_id, m.quantita * r.quantita, 'vendita', 'fior_ordini_righe', r.id, 'Vendita al banco');
      END LOOP;
    END IF;
  END LOOP;
  UPDATE fior_ordini SET materiali_scaricati = true WHERE id = p_ordine;
END;
$$;

-- Effetti dei passaggi: conferma → produzione, consegna e ricorrenza;
-- pronto → scarico degli articoli; annullo → commesse e consegna annullate.
CREATE OR REPLACE FUNCTION fior_ordine_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r RECORD;
  v_entro TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stato IS NOT DISTINCT FROM OLD.stato THEN RETURN NEW; END IF;
  IF NEW.stato IN ('confermato', 'in_preparazione', 'pronto', 'in_consegna', 'consegnato', 'chiuso') THEN
    -- Senza un'ora precisa la composizione serve entro la fine della giornata.
    v_entro := (NEW.data_richiesta + COALESCE(NEW.ora_richiesta, TIME '18:00')) AT TIME ZONE 'Europe/Rome';
    FOR r IN SELECT x.* FROM fior_ordini_righe x WHERE x.ordine_id = NEW.id AND x.tipo IN ('composizione', 'su_misura')
              AND NEW.modalita <> 'banco'
              AND NOT EXISTS (SELECT 1 FROM fior_produzione p WHERE p.riga_id = x.id) LOOP
      INSERT INTO fior_produzione (codice, ordine_id, riga_id, descrizione, quantita, operatore_id, minuti_previsti, pronta_entro, created_by)
      VALUES (genera_codice('PRD'), NEW.id, r.id, r.descrizione, r.quantita, NEW.addetto_preparazione,
              CASE WHEN r.minuti IS NOT NULL THEN ceil(r.minuti * r.quantita)::int END, v_entro, NEW.created_by);
    END LOOP;
    IF NEW.modalita = 'consegna' AND NOT EXISTS (SELECT 1 FROM fior_consegne WHERE ordine_id = NEW.id) THEN
      INSERT INTO fior_consegne (ordine_id, data, fascia, zona_id, autista_id, importo, stato, created_by)
      VALUES (NEW.id, NEW.data_richiesta, NEW.fascia, NEW.zona_id, NEW.addetto_consegna, NEW.importo_consegna,
              CASE WHEN NEW.addetto_consegna IS NULL THEN 'da_assegnare' ELSE 'assegnata' END, NEW.created_by);
    END IF;
    -- La ricorrenza si registra da sola nel profilo del cliente (§7).
    IF NEW.ricorda_ricorrenza AND NEW.committente_id IS NOT NULL AND NEW.occasione IS NOT NULL THEN
      INSERT INTO fior_ricorrenze (contatto_id, tipo, per_chi, giorno, mese, anno, ordine_id, created_by)
      VALUES (NEW.committente_id,
              CASE WHEN NEW.occasione IN ('compleanno', 'anniversario', 'san_valentino', 'festa_mamma', 'festa_donna', 'laurea', 'nascita', 'battesimo',
                                          'comunione', 'cresima', 'matrimonio', 'aziendale', 'commemorativa') THEN NEW.occasione ELSE 'altro' END,
              COALESCE(NEW.destinatario_nome, ''), EXTRACT(DAY FROM NEW.data_richiesta)::int, EXTRACT(MONTH FROM NEW.data_richiesta)::int,
              EXTRACT(YEAR FROM NEW.data_richiesta)::int, NEW.id, NEW.created_by)
      ON CONFLICT (contatto_id, tipo, giorno, mese, per_chi) DO NOTHING;
    END IF;
  END IF;
  -- Senza composizioni da produrre, l'ordine confermato è già «pronto» quando lo si dichiara tale.
  IF NEW.stato IN ('pronto', 'in_consegna', 'consegnato', 'chiuso') THEN
    PERFORM fior_scarica_articoli(NEW.id);
  END IF;
  IF NEW.stato = 'annullato' THEN
    UPDATE fior_produzione SET stato = 'annullata' WHERE ordine_id = NEW.id AND stato IN ('da_fare', 'in_corso');
    DELETE FROM fior_consegne WHERE ordine_id = NEW.id AND stato IN ('da_assegnare', 'assegnata');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fior_ordini_effetti AFTER INSERT OR UPDATE OF stato ON fior_ordini FOR EACH ROW EXECUTE FUNCTION fior_ordine_effetti();

-- ═══ 11. PRODUZIONE: AVANZAMENTO E SCARICO DEI MATERIALI ════════════
CREATE OR REPLACE FUNCTION fior_produzione_avanza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r fior_ordini_righe%ROWTYPE;
  m RECORD;
BEGIN
  IF NEW.stato = OLD.stato THEN RETURN NEW; END IF;
  IF OLD.stato IN ('pronta', 'annullata') THEN
    RAISE EXCEPTION 'Commessa già %', OLD.stato USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.stato = 'in_corso' THEN
    NEW.inizio_at := COALESCE(NEW.inizio_at, NOW());
    NEW.operatore_id := COALESCE(NEW.operatore_id, auth.uid());
  ELSIF NEW.stato = 'pronta' THEN
    NEW.inizio_at := COALESCE(NEW.inizio_at, NOW());
    NEW.fine_at := NOW();
    NEW.operatore_id := COALESCE(NEW.operatore_id, auth.uid());
    NEW.minuti_effettivi := GREATEST(round(EXTRACT(EPOCH FROM (NEW.fine_at - NEW.inizio_at)) / 60)::int, 0);
    -- Fiori e materiali escono dal magazzino: dalla distinta o dall'elenco della composizione su misura.
    SELECT * INTO r FROM fior_ordini_righe WHERE id = NEW.riga_id;
    IF r.tipo = 'composizione' THEN
      PERFORM scarica_distinta(r.distinta_id, r.quantita, 'consumo', 'fior_produzione', NEW.id);
    ELSE
      FOR m IN SELECT * FROM fior_righe_materiali WHERE riga_id = r.id LOOP
        PERFORM mag_scarica(m.articolo_id, m.quantita * r.quantita, 'consumo', 'fior_produzione', NEW.id, 'Composizione su misura');
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fior_produzione_avanza BEFORE UPDATE OF stato ON fior_produzione FOR EACH ROW EXECUTE FUNCTION fior_produzione_avanza();

-- L'ordine segue le sue commesse: una iniziata = in preparazione; tutte pronte = pronto.
CREATE OR REPLACE FUNCTION fior_produzione_ordine()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_stato fior_ordine_stato;
BEGIN
  IF NEW.stato = OLD.stato THEN RETURN NEW; END IF;
  SELECT stato INTO v_stato FROM fior_ordini WHERE id = NEW.ordine_id FOR UPDATE;
  IF NEW.stato = 'in_corso' AND v_stato IN ('ricevuto', 'confermato') THEN
    UPDATE fior_ordini SET stato = 'in_preparazione' WHERE id = NEW.ordine_id;
  ELSIF NEW.stato = 'pronta' AND v_stato IN ('confermato', 'in_preparazione')
        AND NOT EXISTS (SELECT 1 FROM fior_produzione WHERE ordine_id = NEW.ordine_id AND stato IN ('da_fare', 'in_corso')) THEN
    UPDATE fior_ordini SET stato = 'pronto' WHERE id = NEW.ordine_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fior_produzione_ordine AFTER UPDATE OF stato ON fior_produzione FOR EACH ROW EXECUTE FUNCTION fior_produzione_ordine();

-- ═══ 12. CONSEGNE: L'ORDINE SEGUE LA CONSEGNA ═══════════════════════
CREATE OR REPLACE FUNCTION fior_consegna_avanza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_stato fior_ordine_stato;
BEGIN
  IF NEW.autista_id IS NOT NULL AND NEW.stato = 'da_assegnare' THEN NEW.stato := 'assegnata'; END IF;
  IF NEW.autista_id IS NULL AND NEW.stato = 'assegnata' THEN NEW.stato := 'da_assegnare'; END IF;
  IF NEW.stato IS DISTINCT FROM OLD.stato THEN
    IF OLD.stato = 'consegnata' THEN RAISE EXCEPTION 'Consegna già fatta' USING ERRCODE = 'check_violation'; END IF;
    SELECT stato INTO v_stato FROM fior_ordini WHERE id = NEW.ordine_id;
    IF NEW.stato = 'in_consegna' THEN
      IF v_stato NOT IN ('pronto', 'in_consegna') THEN
        RAISE EXCEPTION 'L''ordine non è pronto: è %', replace(v_stato::text, '_', ' ') USING ERRCODE = 'check_violation';
      END IF;
      NEW.partita_at := COALESCE(NEW.partita_at, NOW());
      NEW.autista_id := COALESCE(NEW.autista_id, auth.uid());
      UPDATE fior_ordini SET stato = 'in_consegna', addetto_consegna = NEW.autista_id WHERE id = NEW.ordine_id AND stato = 'pronto';
    ELSIF NEW.stato = 'consegnata' THEN
      IF v_stato NOT IN ('pronto', 'in_consegna') THEN
        RAISE EXCEPTION 'L''ordine non è pronto: è %', replace(v_stato::text, '_', ' ') USING ERRCODE = 'check_violation';
      END IF;
      NEW.consegnata_at := NOW();
      NEW.partita_at := COALESCE(NEW.partita_at, NOW());
      UPDATE fior_ordini SET stato = 'consegnato' WHERE id = NEW.ordine_id;
    ELSIF NEW.stato = 'fallita' AND NEW.esito IS NULL THEN
      RAISE EXCEPTION 'Scrivi perché la consegna non è riuscita' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fior_consegne_avanza BEFORE UPDATE ON fior_consegne FOR EACH ROW EXECUTE FUNCTION fior_consegna_avanza();

-- ═══ 13. CONTO DI CASSA DELL'ORDINE ═════════════════════════════════
-- L'ordine si paga dalla cassa delle fondamenta: acconto all'ordine, saldo
-- alla consegna. Il conto chiuso chiude l'ordine consegnato.
CREATE OR REPLACE FUNCTION fior_conto_ordine(p_ordine UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  o fior_ordini%ROWTYPE;
  v_conto UUID;
  r RECORD;
BEGIN
  IF NOT modulo_attivo('fioraio') THEN RAISE EXCEPTION 'Modulo Fioraio non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO o FROM fior_ordini WHERE id = p_ordine FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Ordine inesistente'; END IF;
  IF o.conto_id IS NOT NULL THEN RETURN o.conto_id; END IF;
  IF o.stato = 'annullato' THEN RAISE EXCEPTION 'Ordine annullato' USING ERRCODE = 'check_violation'; END IF;
  IF NOT EXISTS (SELECT 1 FROM fior_ordini_righe WHERE ordine_id = o.id) THEN
    RAISE EXCEPTION 'L''ordine è vuoto' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO conti (modulo, descrizione, riferimento_tipo, riferimento_id, contatto_id, organizzazione_id, accetta_acconti, sconto_importo, created_by)
  VALUES ('fioraio', o.codice || ' · ' || o.committente_nome, 'fior_ordini', o.id, COALESCE(o.pagatore_id, o.committente_id),
          COALESCE(o.pagatore_organizzazione_id, o.organizzazione_id), true, o.sconto, COALESCE(auth.uid(), o.created_by))
  RETURNING id INTO v_conto;
  FOR r IN SELECT * FROM fior_ordini_righe WHERE ordine_id = o.id ORDER BY created_at LOOP
    INSERT INTO conti_righe (conto_id, descrizione, articolo_id, distinta_id, quantita, prezzo_unitario, sconto_percentuale, aliquota_iva,
                             riferimento_tipo, riferimento_id, created_by)
    VALUES (v_conto, r.descrizione, r.articolo_id, r.distinta_id, r.quantita, r.prezzo_unitario, r.sconto_pct, r.aliquota_iva,
            'fior_ordini_righe', r.id, COALESCE(auth.uid(), o.created_by));
  END LOOP;
  IF o.importo_consegna > 0 THEN
    INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, riferimento_id, created_by)
    VALUES (v_conto, 'Consegna a domicilio', 1, o.importo_consegna, 22, 'fior_consegna', o.id, COALESCE(auth.uid(), o.created_by));
  END IF;
  UPDATE fior_ordini SET conto_id = v_conto WHERE id = o.id;
  RETURN v_conto;
END;
$$;

CREATE OR REPLACE FUNCTION fior_conto_chiuso()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.riferimento_tipo = 'fior_ordini' AND NEW.stato = 'chiuso' AND OLD.stato <> 'chiuso' THEN
    UPDATE fior_ordini SET stato = 'chiuso' WHERE id = NEW.riferimento_id AND stato = 'consegnato';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER conti_fior_chiuso AFTER UPDATE OF stato ON conti FOR EACH ROW EXECUTE FUNCTION fior_conto_chiuso();

-- L'ordine consegnato si chiude da solo se il conto era già saldato e chiuso.
CREATE OR REPLACE FUNCTION fior_ordine_chiudi_se_pagato()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato = 'consegnato' AND NEW.conto_id IS NOT NULL AND EXISTS (SELECT 1 FROM conti WHERE id = NEW.conto_id AND stato = 'chiuso') THEN
    UPDATE fior_ordini SET stato = 'chiuso' WHERE id = NEW.id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER fior_ordini_chiudi_se_pagato AFTER UPDATE OF stato ON fior_ordini FOR EACH ROW EXECUTE FUNCTION fior_ordine_chiudi_se_pagato();

-- ═══ 14. ABBONAMENTI: GLI ORDINI NASCONO DA SOLI ════════════════════
CREATE OR REPLACE FUNCTION fior_abbonamento_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.codice IS NULL THEN NEW.codice := genera_codice('ABF'); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fior_abbonamenti_prepara BEFORE INSERT ON fior_abbonamenti FOR EACH ROW EXECUTE FUNCTION fior_abbonamento_prepara();

CREATE OR REPLACE FUNCTION fior_genera_ordini_abbonamenti()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  a RECORD;
  g fior_impostazioni := fior_regole();
  v_ordine UUID;
  v_nome TEXT;
  n INT := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT modulo_attivo('fioraio') THEN RAISE EXCEPTION 'Modulo Fioraio non attivo' USING ERRCODE = '42501'; END IF;
  FOR a IN SELECT * FROM fior_abbonamenti
            WHERE stato = 'attivo' AND prossima_consegna <= fior_oggi() + g.abbonamenti_anticipo_giorni
              AND (data_rinnovo IS NULL OR prossima_consegna <= data_rinnovo) FOR UPDATE LOOP
    SELECT COALESCE((SELECT trim(nome || ' ' || COALESCE(cognome, '')) FROM contatti WHERE id = a.contatto_id),
                    (SELECT ragione_sociale FROM organizzazioni WHERE id = a.organizzazione_id)) INTO v_nome;
    INSERT INTO fior_ordini (canale, committente_id, committente_nome, organizzazione_id, destinatario_nome, destinatario_telefono, indirizzo, cap, citta,
                             modalita, data_richiesta, fascia, abbonamento_id, note, created_by)
    VALUES ('abbonamento', a.contatto_id, COALESCE(v_nome, a.destinatario_nome), a.organizzazione_id, a.destinatario_nome, a.destinatario_telefono,
            a.indirizzo, a.cap, a.citta, CASE WHEN a.ritiro OR a.indirizzo IS NULL THEN 'ritiro' ELSE 'consegna' END, a.prossima_consegna, a.fascia,
            a.id, 'Abbonamento ' || a.codice || ' · ' || a.piano, a.created_by)
    RETURNING id INTO v_ordine;
    IF a.distinta_id IS NOT NULL THEN
      INSERT INTO fior_ordini_righe (ordine_id, tipo, distinta_id, prezzo_unitario, created_by) VALUES (v_ordine, 'composizione', a.distinta_id, a.prezzo, a.created_by);
    ELSE
      INSERT INTO fior_ordini_righe (ordine_id, tipo, descrizione, prezzo_unitario, created_by)
      VALUES (v_ordine, 'su_misura', COALESCE(a.prodotti, a.piano), a.prezzo, a.created_by);
    END IF;
    UPDATE fior_ordini SET stato = 'confermato' WHERE id = v_ordine;
    UPDATE fior_abbonamenti SET prossima_consegna = CASE frequenza
             WHEN 'settimanale' THEN prossima_consegna + 7 WHEN 'quindicinale' THEN prossima_consegna + 14
             ELSE (prossima_consegna + INTERVAL '1 month')::date END
     WHERE id = a.id;
    n := n + 1;
  END LOOP;
  -- Arrivati al rinnovo: la direzione decide se proseguire.
  UPDATE fior_abbonamenti SET stato = 'chiuso' WHERE stato = 'attivo' AND data_rinnovo IS NOT NULL AND prossima_consegna > data_rinnovo;
  RETURN n;
END;
$$;

-- ═══ 15. RICORRENZE: PROMEMORIA AL NEGOZIO ══════════════════════════
-- Prossima data della ricorrenza (quest'anno o il prossimo).
CREATE OR REPLACE FUNCTION fior_prossima(p_giorno INT, p_mese INT)
RETURNS DATE LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT CASE WHEN d >= fior_oggi() THEN d ELSE (d + INTERVAL '1 year')::date END
    FROM (SELECT make_date(EXTRACT(YEAR FROM fior_oggi())::int, p_mese,
                           LEAST(p_giorno, EXTRACT(DAY FROM (make_date(EXTRACT(YEAR FROM fior_oggi())::int, p_mese, 1) + INTERVAL '1 month - 1 day'))::int)) AS d) x
$$;

CREATE OR REPLACE FUNCTION fior_promemoria_ricorrenze()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r RECORD;
  dest UUID;
  g fior_impostazioni := fior_regole();
  n INT := 0;
BEGIN
  FOR r IN SELECT x.*, trim(k.nome || ' ' || COALESCE(k.cognome, '')) AS cliente, fior_prossima(x.giorno, x.mese) AS quando
             FROM fior_ricorrenze x JOIN contatti k ON k.id = x.contatto_id
            WHERE x.attiva AND fior_prossima(x.giorno, x.mese) = fior_oggi() + g.promemoria_ricorrenze_giorni
              AND x.ultimo_avviso IS DISTINCT FROM fior_oggi() LOOP
    FOR dest IN SELECT id FROM user_profiles WHERE attivo LOOP
      PERFORM crea_notifica(dest, 'info', 'Ricorrenza in arrivo: ' || r.cliente,
        initcap(replace(r.tipo, '_', ' ')) || COALESCE(' · ' || NULLIF(r.per_chi, ''), '') || ' il ' || to_char(r.quando, 'DD/MM')
        || ': un buon momento per proporre un pensiero floreale.', '/fioraio/clienti');
    END LOOP;
    UPDATE fior_ricorrenze SET ultimo_avviso = fior_oggi() WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ═══ 16. TRIGGER COMUNI, RLS, PERMESSI ══════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fior_impostazioni','fior_zone','fior_abbonamenti','fior_ordini','fior_ordini_righe','fior_produzione',
                           'fior_consegne','fior_ricorrenze','fior_cerimonie'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['fior_zone','fior_abbonamenti','fior_ordini','fior_ordini_righe','fior_produzione','fior_consegne',
                           'fior_ricorrenze','fior_cerimonie'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['fior_impostazioni','fior_zone','fior_abbonamenti','fior_ordini','fior_ordini_righe','fior_righe_materiali',
                           'fior_produzione','fior_consegne','fior_ricorrenze','fior_cerimonie'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
  END LOOP;

  -- Regole del negozio e zone: la direzione.
  FOREACH t IN ARRAY ARRAY['fior_impostazioni','fior_zone'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;

  -- Il lavoro del negozio: tutto il personale.
  FOREACH t IN ARRAY ARRAY['fior_abbonamenti','fior_ordini','fior_ordini_righe','fior_righe_materiali','fior_consegne','fior_ricorrenze','fior_cerimonie'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['fior_abbonamenti','fior_ordini','fior_ordini_righe','fior_produzione','fior_consegne','fior_ricorrenze','fior_cerimonie'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;
  -- Righe, materiali e ricorrenze si tolgono mentre si compone l'ordine; gli ordini li cancella solo l'amministratore.
  FOREACH t IN ARRAY ARRAY['fior_ordini_righe','fior_righe_materiali','fior_ricorrenze'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated USING (modulo_attivo(modulo))$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['fior_abbonamenti','fior_ordini','fior_cerimonie','fior_consegne','fior_produzione'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;
END $$;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'fior_regole()', 'fior_riga_prepara()', 'fior_ordine_ricalcola(uuid)', 'fior_riga_totale()', 'fior_materiale_costo()', 'fior_ordine_prepara()',
    'fior_ordine_importi()', 'fior_scarica_articoli(uuid)', 'fior_ordine_effetti()', 'fior_produzione_avanza()', 'fior_produzione_ordine()',
    'fior_consegna_avanza()', 'fior_conto_chiuso()', 'fior_ordine_chiudi_se_pagato()', 'fior_abbonamento_prepara()', 'fior_promemoria_ricorrenze()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY['fior_oggi()', 'fior_stima(jsonb,integer)', 'fior_conto_ordine(uuid)', 'fior_genera_ordini_abbonamenti()',
                           'fior_prossima(integer,integer)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('fioraio-abbonamenti', 'fioraio-ricorrenze');
SELECT cron.schedule('fioraio-abbonamenti', '10 5 * * *', $$SELECT fior_genera_ordini_abbonamenti()$$);
SELECT cron.schedule('fioraio-ricorrenze', '30 7 * * *', $$SELECT fior_promemoria_ricorrenze()$$);

SELECT applica_protezioni_tabelle();
