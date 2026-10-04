-- ═══════════════════════════════════════════════════════════════════
-- MODULI 2 · RISTORANTE E BAR — MOTORE FOOD & BEVERAGE (fb_)
--
-- Un solo motore per Ristorante e Bar (stesse sale, comande, cucina,
-- banco, listini). Ogni riga porta il suo `modulo`:
--   - le righe di un locale ereditano il modulo del locale ('ristorante'
--     o 'bar'): spento il Ristorante, i suoi tavoli e le sue comande
--     spariscono, quelle del bar dell'hotel restano;
--   - il catalogo (categorie, prodotti, vini, preferenze dei clienti) è
--     condiviso: modulo 'fb', visibile con l'una o l'altra licenza.
--
-- Si appoggia alle fondamenta: distinta base e lotti (scarico teorico alla
-- preparazione, per scadenza), cassa (ogni riga della comanda è una riga
-- del conto), eventi, turni, registri HACCP, asset, fidelizzazione.
--
-- Predisposti, non collegati: piattaforme di delivery e ordini online
-- (`piattaforma`, `piattaforma_ordine_id`), avviso automatico al cliente
-- in lista d'attesa (SMS/WhatsApp), carta vini pubblica via QR.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION moduli_fb()
RETURNS TEXT[]
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT ARRAY['fb', 'ristorante', 'bar']::text[]
$$;

-- ═══ LOCALI, SALE, TAVOLI, STAZIONI ═════════════════════════════════
CREATE TABLE fb_locali (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                 TEXT NOT NULL CHECK (modulo IN ('ristorante', 'bar')),
  nome                   TEXT NOT NULL,
  indirizzo              TEXT,
  durata_tavolo_min      INT NOT NULL DEFAULT 120 CHECK (durata_tavolo_min BETWEEN 15 AND 600),
  anticipo_prenotato_min INT NOT NULL DEFAULT 60 CHECK (anticipo_prenotato_min >= 0),
  pausa_uscite_min       INT NOT NULL DEFAULT 0 CHECK (pausa_uscite_min >= 0),
  coperti_per_cameriere  INT NOT NULL DEFAULT 20 CHECK (coperti_per_cameriere > 0),
  coperti_per_cuoco      INT NOT NULL DEFAULT 30 CHECK (coperti_per_cuoco > 0),
  attivo                 BOOLEAN NOT NULL DEFAULT true,
  note                   TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES user_profiles(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES user_profiles(id)
);

CREATE TABLE fb_sale (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale_id  UUID NOT NULL REFERENCES fb_locali(id) ON DELETE CASCADE,
  modulo     TEXT NOT NULL,
  nome       TEXT NOT NULL,                 -- Sala, Terrazza, Dehor, Sala privata, Banco
  tipo       TEXT NOT NULL DEFAULT 'sala' CHECK (tipo IN ('sala', 'terrazza', 'dehor', 'sala_privata', 'banco')),
  larghezza  INT NOT NULL DEFAULT 1000 CHECK (larghezza > 0),   -- unità della mappa
  altezza    INT NOT NULL DEFAULT 700 CHECK (altezza > 0),
  ordine     INT NOT NULL DEFAULT 0,
  attiva     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id)
);

CREATE TABLE fb_tavoli (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id        UUID NOT NULL REFERENCES fb_sale(id) ON DELETE CASCADE,
  locale_id      UUID NOT NULL,
  modulo         TEXT NOT NULL,
  numero         TEXT NOT NULL,
  posti          INT NOT NULL CHECK (posti > 0),
  posti_max      INT CHECK (posti_max >= posti),
  forma          TEXT NOT NULL DEFAULT 'quadrato' CHECK (forma IN ('quadrato', 'rotondo', 'rettangolare')),
  x              INT NOT NULL DEFAULT 0,
  y              INT NOT NULL DEFAULT 0,
  larghezza      INT NOT NULL DEFAULT 80 CHECK (larghezza > 0),
  altezza        INT NOT NULL DEFAULT 80 CHECK (altezza > 0),
  rotazione      INT NOT NULL DEFAULT 0,
  cameriere_id   UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  fuori_servizio BOOLEAN NOT NULL DEFAULT false,   -- «Chiuso»
  attivo         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES user_profiles(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID REFERENCES user_profiles(id),
  UNIQUE (locale_id, numero)
);

-- Postazioni di preparazione: ognuna vede solo ciò che deve preparare.
CREATE TABLE fb_stazioni (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale_id   UUID NOT NULL REFERENCES fb_locali(id) ON DELETE CASCADE,
  modulo      TEXT NOT NULL,
  nome        TEXT NOT NULL,                -- Antipasti, Primi, Griglia, Pizzeria, Banco bar, Macchina caffè…
  tipo        TEXT NOT NULL DEFAULT 'cucina' CHECK (tipo IN ('cucina', 'pizzeria', 'pasticceria', 'bar', 'banco', 'caffetteria')),
  categorie   UUID[] NOT NULL DEFAULT '{}', -- categorie che riceve
  prodotti    UUID[] NOT NULL DEFAULT '{}', -- prodotti che riceve (vincono sulle categorie)
  predefinita BOOLEAN NOT NULL DEFAULT false,
  ordine      INT NOT NULL DEFAULT 0,
  attiva      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);
CREATE UNIQUE INDEX idx_fb_stazioni_predefinita ON fb_stazioni (locale_id) WHERE predefinita;

-- ═══ CATALOGO (condiviso: modulo 'fb') ══════════════════════════════
CREATE TABLE fb_categorie (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo     TEXT NOT NULL DEFAULT 'fb' CHECK (modulo = ANY (moduli_fb())),
  nome       TEXT NOT NULL,                 -- Antipasti, Primi, Pizze, Caffetteria, Cocktail…
  area       TEXT NOT NULL DEFAULT 'food' CHECK (area IN ('food', 'beverage')),
  uscita     SMALLINT NOT NULL DEFAULT 1 CHECK (uscita BETWEEN 0 AND 9),  -- 0 = subito (bevande)
  ordine     INT NOT NULL DEFAULT 0,
  attiva     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id)
);

CREATE TABLE fb_prodotti (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                   TEXT NOT NULL DEFAULT 'fb' CHECK (modulo = ANY (moduli_fb())),
  codice                   TEXT UNIQUE,     -- PRD-AAAA-NNNN
  nome                     TEXT NOT NULL,
  descrizione              TEXT,
  categoria_id             UUID NOT NULL REFERENCES fb_categorie(id) ON DELETE RESTRICT,
  prezzo                   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (prezzo >= 0),
  aliquota_iva             NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (aliquota_iva >= 0),
  unita_vendita            TEXT NOT NULL DEFAULT 'pz',    -- pz, porzione, calice, bottiglia, pinta…
  foto_path                TEXT,
  stato                    TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo', 'sospeso', 'esaurito')),
  mesi_disponibili         SMALLINT[] NOT NULL DEFAULT '{}',  -- stagionalità; vuoto = tutto l'anno
  tempo_preparazione_min   INT CHECK (tempo_preparazione_min >= 0),
  -- Costo: dalla ricetta, da un articolo venduto così com'è, o a mano.
  distinta_id              UUID REFERENCES distinte_base(id) ON DELETE SET NULL,
  articolo_id              UUID REFERENCES mag_articoli(id) ON DELETE SET NULL,
  articolo_quantita        NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (articolo_quantita > 0),
  costo_manuale            NUMERIC(12,4) CHECK (costo_manuale >= 0),
  -- Combo, menu del giorno, menu degustazione: i piatti che lo compongono.
  componenti               UUID[] NOT NULL DEFAULT '{}',
  allergeni_potenziali     TEXT[] NOT NULL DEFAULT '{}' CHECK (allergeni_potenziali <@ allergeni_ue()),
  ingredienti_sostituibili TEXT,
  contaminazioni           TEXT,
  note_operative           TEXT,
  beverage_tipo            TEXT CHECK (beverage_tipo IN ('vino', 'birra', 'cocktail', 'distillato', 'analcolico', 'caffetteria', 'acqua')),
  mescita                  BOOLEAN NOT NULL DEFAULT false,
  fornitore_id             UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  canali                   TEXT[] NOT NULL DEFAULT ARRAY['sala','banco','asporto','delivery','online'],
  attributi                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               UUID REFERENCES user_profiles(id),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by               UUID REFERENCES user_profiles(id),
  CHECK (distinta_id IS NULL OR articolo_id IS NULL),
  CHECK (mesi_disponibili <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[])
);
ALTER TABLE fb_prodotti ADD COLUMN ricerca tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', coalesce(codice,'') || ' ' || coalesce(nome,'') || ' ' || coalesce(descrizione,''))) STORED;
CREATE INDEX idx_fb_prodotti_ricerca ON fb_prodotti USING GIN (ricerca);
CREATE INDEX idx_fb_prodotti_categoria ON fb_prodotti (categoria_id);

CREATE OR REPLACE FUNCTION fb_prodotto_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('PRD'); END IF;
  IF NEW.id = ANY (NEW.componenti) THEN
    RAISE EXCEPTION 'Un prodotto non può comporre sé stesso' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(NEW.componenti) c WHERE NOT EXISTS (SELECT 1 FROM fb_prodotti WHERE id = c)) THEN
    RAISE EXCEPTION 'Componente del menu inesistente' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM fb_prodotti WHERE id = ANY (NEW.componenti) AND cardinality(componenti) > 0) THEN
    RAISE EXCEPTION 'I componenti di un menu sono piatti singoli, non altri menu' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_prodotti_controlla BEFORE INSERT OR UPDATE ON fb_prodotti
  FOR EACH ROW EXECUTE FUNCTION fb_prodotto_controlla();

-- Costo standard di una unità venduta.
CREATE OR REPLACE FUNCTION fb_costo_prodotto(p_prodotto UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT ROUND(CASE
    WHEN cardinality(p.componenti) > 0 THEN
      (SELECT COALESCE(SUM(fb_costo_prodotto(c)), 0) FROM unnest(p.componenti) c)
    WHEN p.distinta_id IS NOT NULL THEN COALESCE(costo_distinta(p.distinta_id), 0)
    WHEN p.articolo_id IS NOT NULL THEN
      COALESCE((SELECT a.costo_unitario FROM mag_articoli a WHERE a.id = p.articolo_id), 0) * p.articolo_quantita
    ELSE COALESCE(p.costo_manuale, 0)
  END, 4)
  FROM fb_prodotti p WHERE p.id = p_prodotto
$$;

-- Allergeni presenti: dalla ricetta, dall'articolo e dai componenti.
CREATE OR REPLACE FUNCTION fb_allergeni_prodotto(p_prodotto UUID)
RETURNS TEXT[]
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT COALESCE(array_agg(DISTINCT x ORDER BY x), '{}') FROM (
    SELECT unnest(allergeni_distinta(p.distinta_id)) AS x FROM fb_prodotti p
     WHERE p.id = p_prodotto AND p.distinta_id IS NOT NULL
    UNION
    SELECT unnest(a.allergeni) FROM fb_prodotti p JOIN mag_articoli a ON a.id = p.articolo_id
     WHERE p.id = p_prodotto
    UNION
    SELECT unnest(fb_allergeni_prodotto(c)) FROM fb_prodotti p, unnest(p.componenti) c
     WHERE p.id = p_prodotto
  ) s
$$;

-- ═══ MENU, LISTINI, PROMOZIONI ══════════════════════════════════════
CREATE TABLE fb_menu (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale_id         UUID NOT NULL REFERENCES fb_locali(id) ON DELETE CASCADE,
  modulo            TEXT NOT NULL,
  nome              TEXT NOT NULL,
  tipo              TEXT NOT NULL DEFAULT 'carta' CHECK (tipo IN (
                      'carta', 'standard', 'colazione', 'pranzo', 'aperitivo', 'cena', 'serale', 'degustazione',
                      'turistico', 'business', 'bambini', 'stagionale', 'eventi', 'asporto', 'delivery', 'convenzionato')),
  canale            TEXT NOT NULL DEFAULT 'tutti' CHECK (canale IN ('tutti', 'sala', 'banco', 'asporto', 'delivery', 'online')),
  giorni            SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',   -- 1 = lunedì
  ora_inizio        TIME,
  ora_fine          TIME,
  valido_dal        DATE,
  valido_al         DATE,
  tipologia_cliente TEXT,                    -- NULL = tutti; convenzionato, dipendente…
  prezzo_fisso      NUMERIC(10,2) CHECK (prezzo_fisso >= 0),   -- degustazione, business
  priorita          INT NOT NULL DEFAULT 0,
  descrizione       TEXT,
  attivo            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  CHECK (giorni <@ ARRAY[1,2,3,4,5,6,7]::smallint[])
);

CREATE TABLE fb_menu_voci (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id     UUID NOT NULL REFERENCES fb_menu(id) ON DELETE CASCADE,
  modulo      TEXT NOT NULL,
  prodotto_id UUID NOT NULL REFERENCES fb_prodotti(id) ON DELETE CASCADE,
  prezzo      NUMERIC(10,2) CHECK (prezzo >= 0),   -- NULL = prezzo del prodotto
  disponibile BOOLEAN NOT NULL DEFAULT true,
  sezione     TEXT,
  ordine      INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id),
  UNIQUE (menu_id, prodotto_id)
);

CREATE TABLE fb_promozioni (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale_id          UUID REFERENCES fb_locali(id) ON DELETE CASCADE,   -- NULL = tutti i locali
  modulo             TEXT NOT NULL DEFAULT 'fb' CHECK (modulo = ANY (moduli_fb())),
  nome               TEXT NOT NULL,          -- Happy hour, 2×1 sulle birre, Colazione…
  tipo               TEXT NOT NULL CHECK (tipo IN ('prezzo_speciale', 'sconto_percentuale', 'x_per_y')),
  prodotti           UUID[] NOT NULL DEFAULT '{}',
  categorie          UUID[] NOT NULL DEFAULT '{}',
  prezzo             NUMERIC(10,2) CHECK (prezzo >= 0),
  sconto_percentuale NUMERIC(5,2) CHECK (sconto_percentuale > 0 AND sconto_percentuale <= 100),
  quantita_x         INT CHECK (quantita_x > 1),        -- 2×1: x = 2, y = 1
  quantita_y         INT CHECK (quantita_y >= 1),
  giorni             SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
  ora_inizio         TIME,
  ora_fine           TIME,
  valido_dal         DATE,
  valido_al          DATE,
  canali             TEXT[] NOT NULL DEFAULT '{}',      -- vuoto = tutti
  tipologia_cliente  TEXT,
  attiva             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id),
  CHECK (cardinality(prodotti) > 0 OR cardinality(categorie) > 0),
  CHECK (CASE tipo WHEN 'prezzo_speciale' THEN prezzo IS NOT NULL
                   WHEN 'sconto_percentuale' THEN sconto_percentuale IS NOT NULL
                   ELSE quantita_x IS NOT NULL AND quantita_y IS NOT NULL AND quantita_y < quantita_x END)
);

-- Una fascia oraria attiva in quel momento (Europe/Rome), anche a cavallo
-- della mezzanotte (aperitivo 18–02).
CREATE OR REPLACE FUNCTION fb_in_fascia(p_istante TIMESTAMPTZ, p_giorni SMALLINT[], p_dalle TIME, p_alle TIME,
                                        p_dal DATE, p_al DATE)
RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH l AS (SELECT (p_istante AT TIME ZONE 'Europe/Rome') AS t)
  SELECT (p_dal IS NULL OR l.t::date >= p_dal)
     AND (p_al IS NULL OR l.t::date <= p_al)
     AND CASE
           WHEN p_dalle IS NULL OR p_alle IS NULL THEN EXTRACT(ISODOW FROM l.t)::smallint = ANY (p_giorni)
           WHEN p_dalle < p_alle THEN EXTRACT(ISODOW FROM l.t)::smallint = ANY (p_giorni)
                                      AND l.t::time >= p_dalle AND l.t::time < p_alle
           -- a cavallo: dopo l'inizio vale il giorno stesso, prima della fine il giorno prima
           ELSE (l.t::time >= p_dalle AND EXTRACT(ISODOW FROM l.t)::smallint = ANY (p_giorni))
             OR (l.t::time < p_alle AND EXTRACT(ISODOW FROM l.t - INTERVAL '1 day')::smallint = ANY (p_giorni))
         END
    FROM l
$$;

-- Prezzo di vendita in quel momento, su quel canale, per quel cliente:
-- prezzo del prodotto → listino attivo con priorità più alta → la
-- promozione più conveniente. Restituisce anche da dove viene.
CREATE OR REPLACE FUNCTION fb_prezzo(p_prodotto UUID, p_locale UUID, p_canale TEXT DEFAULT 'sala',
                                     p_istante TIMESTAMPTZ DEFAULT NOW(), p_tipologia TEXT DEFAULT NULL)
RETURNS TABLE (prezzo NUMERIC, origine TEXT, promozione_id UUID)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  p fb_prodotti%ROWTYPE;
  v_prezzo NUMERIC;
  v_origine TEXT := 'prodotto';
  v_listino NUMERIC;
  v_listino_nome TEXT;
  r RECORD;
  v_promo NUMERIC;
  v_best NUMERIC;
  v_best_id UUID;
  v_best_nome TEXT;
BEGIN
  SELECT * INTO p FROM fb_prodotti WHERE id = p_prodotto;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Prodotto inesistente'; END IF;
  v_prezzo := p.prezzo;
  SELECT v.prezzo, m.nome INTO v_listino, v_listino_nome
    FROM fb_menu m JOIN fb_menu_voci v ON v.menu_id = m.id
   WHERE m.locale_id = p_locale AND m.attivo AND v.prodotto_id = p_prodotto AND v.disponibile AND v.prezzo IS NOT NULL
     AND (m.canale = 'tutti' OR m.canale = p_canale)
     AND (m.tipologia_cliente IS NULL OR m.tipologia_cliente = p_tipologia)
     AND fb_in_fascia(p_istante, m.giorni, m.ora_inizio, m.ora_fine, m.valido_dal, m.valido_al)
   ORDER BY m.priorita DESC, v.prezzo
   LIMIT 1;
  IF v_listino IS NOT NULL THEN
    v_prezzo := v_listino;
    v_origine := 'listino: ' || v_listino_nome;
  END IF;
  v_best := v_prezzo;
  FOR r IN
    SELECT pr.* FROM fb_promozioni pr
     WHERE pr.attiva AND pr.tipo IN ('prezzo_speciale', 'sconto_percentuale')
       AND (pr.locale_id IS NULL OR pr.locale_id = p_locale)
       AND (p_prodotto = ANY (pr.prodotti) OR p.categoria_id = ANY (pr.categorie))
       AND (cardinality(pr.canali) = 0 OR p_canale = ANY (pr.canali))
       AND (pr.tipologia_cliente IS NULL OR pr.tipologia_cliente = p_tipologia)
       AND fb_in_fascia(p_istante, pr.giorni, pr.ora_inizio, pr.ora_fine, pr.valido_dal, pr.valido_al)
  LOOP
    v_promo := CASE r.tipo WHEN 'prezzo_speciale' THEN r.prezzo
                           ELSE ROUND(v_prezzo * (1 - r.sconto_percentuale / 100), 2) END;
    IF v_promo < v_best THEN
      v_best := v_promo; v_best_id := r.id; v_best_nome := r.nome;
    END IF;
  END LOOP;
  IF v_best_id IS NOT NULL THEN
    RETURN QUERY SELECT v_best, 'promozione: ' || v_best_nome, v_best_id;
  ELSE
    RETURN QUERY SELECT v_prezzo, v_origine, NULL::uuid;
  END IF;
END;
$$;

-- Disponibilità segnata dal personale (piatto finito, di nuovo disponibile)
-- senza poter toccare prezzi e ricette.
CREATE OR REPLACE FUNCTION fb_imposta_disponibilita(p_prodotto UUID, p_stato TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF p_stato NOT IN ('attivo', 'esaurito') THEN
    RAISE EXCEPTION 'Stato non valido: %', p_stato USING ERRCODE = 'check_violation';
  END IF;
  UPDATE fb_prodotti SET stato = p_stato WHERE id = p_prodotto AND modulo_attivo(modulo) AND stato <> 'sospeso';
  IF NOT FOUND THEN RAISE EXCEPTION 'Prodotto non trovato o sospeso dalla direzione'; END IF;
END;
$$;

-- Postazione che prepara un prodotto in un locale: prodotto esplicito →
-- categoria → postazione predefinita.
CREATE OR REPLACE FUNCTION fb_stazione_per(p_locale UUID, p_prodotto UUID)
RETURNS UUID
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT s.id FROM fb_stazioni s, fb_prodotti p
   WHERE p.id = p_prodotto AND s.locale_id = p_locale AND s.attiva
     AND (p.id = ANY (s.prodotti) OR p.categoria_id = ANY (s.categorie) OR s.predefinita)
   ORDER BY (p.id = ANY (s.prodotti)) DESC, (p.categoria_id = ANY (s.categorie)) DESC, s.ordine
   LIMIT 1
$$;

-- ═══ PRENOTAZIONI E LISTA D'ATTESA ══════════════════════════════════
CREATE TYPE fb_prenotazione_stato AS ENUM ('richiesta', 'confermata', 'arrivata', 'servita', 'conclusa', 'no_show', 'annullata');

CREATE TABLE fb_prenotazioni (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale_id          UUID NOT NULL REFERENCES fb_locali(id) ON DELETE CASCADE,
  modulo             TEXT NOT NULL,
  contatto_id        UUID REFERENCES contatti(id) ON DELETE SET NULL,
  nome               TEXT NOT NULL,
  telefono           TEXT,
  email              TEXT,
  inizio             TIMESTAMPTZ NOT NULL,
  durata_min         INT CHECK (durata_min BETWEEN 15 AND 600),
  fine               TIMESTAMPTZ,
  persone            INT NOT NULL CHECK (persone > 0),
  sala_id            UUID REFERENCES fb_sale(id) ON DELETE SET NULL,   -- zona richiesta
  tavoli             UUID[] NOT NULL DEFAULT '{}',
  stato              fb_prenotazione_stato NOT NULL DEFAULT 'richiesta',
  canale             TEXT NOT NULL DEFAULT 'telefono' CHECK (canale IN ('telefono', 'sito', 'app', 'email', 'walk_in', 'piattaforma')),
  occasione          TEXT,
  richieste_speciali TEXT,
  allergie           TEXT[] NOT NULL DEFAULT '{}' CHECK (allergie <@ allergeni_ue()),
  intolleranze       TEXT,
  note               TEXT,
  evento_id          UUID REFERENCES eventi(id) ON DELETE SET NULL,
  piattaforma_id     TEXT,                    -- predisposto: prenotazione da portale esterno
  arrivata_at        TIMESTAMPTZ,
  conclusa_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_fb_prenotazioni_giorno ON fb_prenotazioni (locale_id, inizio);
CREATE INDEX idx_fb_prenotazioni_contatto ON fb_prenotazioni (contatto_id);
ALTER TABLE fb_prenotazioni ADD COLUMN ricerca tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', coalesce(nome,'') || ' ' || coalesce(telefono,'') || ' ' || coalesce(email,''))) STORED;
CREATE INDEX idx_fb_prenotazioni_ricerca ON fb_prenotazioni USING GIN (ricerca);

-- Un tavolo non si prenota due volte nella stessa fascia: vincolo di
-- esclusione sull'intervallo (fine e inizio successivo che coincidono
-- sono ammessi).
CREATE TABLE fb_prenotazioni_tavoli (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prenotazione_id UUID NOT NULL REFERENCES fb_prenotazioni(id) ON DELETE CASCADE,
  tavolo_id       UUID NOT NULL REFERENCES fb_tavoli(id) ON DELETE CASCADE,
  modulo          TEXT NOT NULL,
  periodo         TSTZRANGE NOT NULL,
  attiva          BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT fb_tavolo_gia_prenotato EXCLUDE USING gist (tavolo_id WITH =, periodo WITH &&) WHERE (attiva)
);
CREATE INDEX idx_fb_prenotazioni_tavoli ON fb_prenotazioni_tavoli (prenotazione_id);

CREATE OR REPLACE FUNCTION fb_prenotazione_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  l fb_locali%ROWTYPE;
  v_posti INT;
  v_fuori INT;
BEGIN
  SELECT * INTO l FROM fb_locali WHERE id = NEW.locale_id;
  NEW.modulo := l.modulo;
  NEW.durata_min := COALESCE(NEW.durata_min, l.durata_tavolo_min);
  NEW.fine := NEW.inizio + make_interval(mins => NEW.durata_min);
  IF cardinality(NEW.tavoli) > 0 THEN
    SELECT count(*) FILTER (WHERE t.locale_id <> NEW.locale_id), COALESCE(SUM(COALESCE(t.posti_max, t.posti)), 0)
      INTO v_fuori, v_posti
      FROM fb_tavoli t WHERE t.id = ANY (NEW.tavoli);
    IF v_fuori > 0 OR (SELECT count(*) FROM fb_tavoli WHERE id = ANY (NEW.tavoli)) <> cardinality(NEW.tavoli) THEN
      RAISE EXCEPTION 'Tavoli non validi per questo locale' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.persone > v_posti THEN
      RAISE EXCEPTION 'I tavoli scelti hanno % posti per % persone', v_posti, NEW.persone USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.stato = 'arrivata' AND (TG_OP = 'INSERT' OR OLD.stato <> 'arrivata') THEN
    NEW.arrivata_at := COALESCE(NEW.arrivata_at, NOW());
  END IF;
  IF NEW.stato IN ('conclusa', 'no_show', 'annullata') AND (TG_OP = 'INSERT' OR OLD.stato <> NEW.stato) THEN
    NEW.conclusa_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_prenotazioni_prepara BEFORE INSERT OR UPDATE ON fb_prenotazioni
  FOR EACH ROW EXECUTE FUNCTION fb_prenotazione_prepara();

CREATE OR REPLACE FUNCTION fb_prenotazione_sync_tavoli()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.tavoli = OLD.tavoli AND NEW.inizio = OLD.inizio AND NEW.fine = OLD.fine
     AND (NEW.stato IN ('richiesta', 'confermata', 'arrivata', 'servita'))
       = (OLD.stato IN ('richiesta', 'confermata', 'arrivata', 'servita')) THEN
    RETURN NEW;
  END IF;
  DELETE FROM fb_prenotazioni_tavoli WHERE prenotazione_id = NEW.id;
  INSERT INTO fb_prenotazioni_tavoli (prenotazione_id, tavolo_id, modulo, periodo, attiva)
  SELECT NEW.id, t, NEW.modulo, tstzrange(NEW.inizio, NEW.fine, '[)'),
         NEW.stato IN ('richiesta', 'confermata', 'arrivata', 'servita')
    FROM unnest(NEW.tavoli) t;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_prenotazioni_sync_tavoli AFTER INSERT OR UPDATE ON fb_prenotazioni
  FOR EACH ROW EXECUTE FUNCTION fb_prenotazione_sync_tavoli();

CREATE TABLE fb_attesa (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale_id          UUID NOT NULL REFERENCES fb_locali(id) ON DELETE CASCADE,
  modulo             TEXT NOT NULL,
  contatto_id        UUID REFERENCES contatti(id) ON DELETE SET NULL,
  nome               TEXT NOT NULL,
  telefono           TEXT,
  persone            INT NOT NULL CHECK (persone > 0),
  sala_id            UUID REFERENCES fb_sale(id) ON DELETE SET NULL,    -- zona preferita
  tavolo_id          UUID REFERENCES fb_tavoli(id) ON DELETE SET NULL,  -- tavolo richiesto
  priorita           SMALLINT NOT NULL DEFAULT 0,
  ora_richiesta      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attesa_stimata_min INT CHECK (attesa_stimata_min >= 0),
  stato              TEXT NOT NULL DEFAULT 'in_attesa' CHECK (stato IN ('in_attesa', 'avvisato', 'seduto', 'rinunciato')),
  avvisato_at        TIMESTAMPTZ,
  seduto_at          TIMESTAMPTZ,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_fb_attesa ON fb_attesa (locale_id, stato, ora_richiesta);

CREATE OR REPLACE FUNCTION fb_attesa_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  SELECT modulo INTO NEW.modulo FROM fb_locali WHERE id = NEW.locale_id;
  IF NEW.stato = 'avvisato' AND (TG_OP = 'INSERT' OR OLD.stato <> 'avvisato') THEN NEW.avvisato_at := NOW(); END IF;
  IF NEW.stato = 'seduto' AND (TG_OP = 'INSERT' OR OLD.stato <> 'seduto') THEN NEW.seduto_at := NOW(); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_attesa_prepara BEFORE INSERT OR UPDATE ON fb_attesa
  FOR EACH ROW EXECUTE FUNCTION fb_attesa_prepara();

-- ═══ COMANDE, RIGHE, CUCINA ═════════════════════════════════════════
CREATE TYPE fb_comanda_stato AS ENUM ('aperta', 'chiusa', 'annullata');
CREATE TYPE fb_riga_stato AS ENUM (
  'in_attesa',        -- trattenuta: parte quando si «marcia» l'uscita
  'da_preparare', 'presa_in_carico', 'in_preparazione', 'pronta', 'servita',
  'annullata'
);

CREATE TABLE fb_comande (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale_id             UUID NOT NULL REFERENCES fb_locali(id) ON DELETE CASCADE,
  modulo                TEXT NOT NULL,
  numero                INT,                    -- progressivo del giorno, per cucina e banco
  canale                TEXT NOT NULL DEFAULT 'sala' CHECK (canale IN ('sala', 'banco', 'asporto', 'delivery', 'online', 'telefono', 'app')),
  tavolo_id             UUID REFERENCES fb_tavoli(id) ON DELETE RESTRICT,   -- col suo storico: si disattiva
  prenotazione_id       UUID REFERENCES fb_prenotazioni(id) ON DELETE SET NULL,
  contatto_id           UUID REFERENCES contatti(id) ON DELETE SET NULL,
  cameriere_id          UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  coperti               INT CHECK (coperti >= 0),
  tipologia_cliente     TEXT,
  stato                 fb_comanda_stato NOT NULL DEFAULT 'aperta',
  priorita              TEXT NOT NULL DEFAULT 'normale' CHECK (priorita IN ('normale', 'alta', 'urgente')),
  uscite_automatiche    BOOLEAN NOT NULL DEFAULT false,   -- marcia da sola la portata successiva
  conto_id              UUID REFERENCES conti(id) ON DELETE SET NULL,
  conto_richiesto_at    TIMESTAMPTZ,
  ritiro_at             TIMESTAMPTZ,            -- asporto
  cliente_nome          TEXT,
  cliente_telefono      TEXT,
  piattaforma           TEXT,                   -- predisposto: delivery e ordini online esterni
  piattaforma_ordine_id TEXT,
  note                  TEXT,
  aperta_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chiusa_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id),
  CHECK (canale <> 'sala' OR tavolo_id IS NOT NULL)
);
-- Un tavolo ha al massimo una comanda aperta.
CREATE UNIQUE INDEX idx_fb_comande_tavolo_aperta ON fb_comande (tavolo_id) WHERE stato = 'aperta' AND tavolo_id IS NOT NULL;
CREATE INDEX idx_fb_comande_giorno ON fb_comande (locale_id, aperta_at DESC);
CREATE INDEX idx_fb_comande_contatto ON fb_comande (contatto_id);

CREATE OR REPLACE FUNCTION fb_comanda_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  l fb_locali%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO l FROM fb_locali WHERE id = NEW.locale_id FOR UPDATE;
    NEW.modulo := l.modulo;
    SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero FROM fb_comande
     WHERE locale_id = NEW.locale_id
       AND (aperta_at AT TIME ZONE 'Europe/Rome')::date = (NOW() AT TIME ZONE 'Europe/Rome')::date;
  ELSIF NEW.locale_id <> OLD.locale_id THEN
    RAISE EXCEPTION 'Una comanda non cambia locale' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.tavolo_id IS NOT NULL AND (SELECT locale_id FROM fb_tavoli WHERE id = NEW.tavolo_id) <> NEW.locale_id THEN
    RAISE EXCEPTION 'Il tavolo è di un altro locale' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.stato <> 'aperta' AND (TG_OP = 'INSERT' OR OLD.stato = 'aperta') THEN
    NEW.chiusa_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_comande_prepara BEFORE INSERT OR UPDATE ON fb_comande
  FOR EACH ROW EXECUTE FUNCTION fb_comanda_prepara();

-- Arrivo e fine della prenotazione seguono la comanda.
CREATE OR REPLACE FUNCTION fb_comanda_prenotazione()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.prenotazione_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.stato = 'aperta' THEN
    UPDATE fb_prenotazioni SET stato = 'arrivata' WHERE id = NEW.prenotazione_id AND stato IN ('richiesta', 'confermata');
  ELSIF NEW.stato = 'chiusa' THEN
    UPDATE fb_prenotazioni SET stato = 'conclusa' WHERE id = NEW.prenotazione_id AND stato IN ('arrivata', 'servita');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_comande_prenotazione AFTER INSERT OR UPDATE OF stato, prenotazione_id ON fb_comande
  FOR EACH ROW EXECUTE FUNCTION fb_comanda_prenotazione();

-- Il conto della comanda (cassa F0.3), creato alla prima riga.
CREATE OR REPLACE FUNCTION fb_conto_comanda(p_comanda UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c fb_comande%ROWTYPE;
  v_conto UUID;
  v_tavolo TEXT;
BEGIN
  SELECT * INTO c FROM fb_comande WHERE id = p_comanda FOR UPDATE;
  IF c.conto_id IS NOT NULL THEN RETURN c.conto_id; END IF;
  SELECT numero INTO v_tavolo FROM fb_tavoli WHERE id = c.tavolo_id;
  INSERT INTO conti (modulo, descrizione, riferimento_tipo, riferimento_id, contatto_id, coperti, created_by)
  VALUES (c.modulo,
          CASE WHEN v_tavolo IS NOT NULL THEN 'Tavolo ' || v_tavolo
               ELSE initcap(c.canale) || ' n. ' || c.numero END,
          'fb_comande', c.id, c.contatto_id, c.coperti, COALESCE(auth.uid(), c.created_by))
  RETURNING id INTO v_conto;
  UPDATE fb_comande SET conto_id = v_conto WHERE id = p_comanda;
  RETURN v_conto;
END;
$$;

CREATE TABLE fb_comande_righe (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id         UUID NOT NULL REFERENCES fb_comande(id) ON DELETE CASCADE,
  locale_id          UUID NOT NULL,
  modulo             TEXT NOT NULL,
  prodotto_id        UUID NOT NULL REFERENCES fb_prodotti(id) ON DELETE RESTRICT,
  padre_id           UUID REFERENCES fb_comande_righe(id) ON DELETE CASCADE,   -- piatto di un menu o combo
  descrizione        TEXT NOT NULL,
  quantita           NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (quantita > 0),
  prezzo_unitario    NUMERIC(10,2) CHECK (prezzo_unitario >= 0),    -- quello applicato
  prezzo_origine     TEXT,
  promozione_id      UUID REFERENCES fb_promozioni(id) ON DELETE SET NULL,
  promo_omaggi       NUMERIC(8,2) NOT NULL DEFAULT 0,               -- pezzi gratuiti generati (2×1)
  aliquota_iva       NUMERIC(5,2),
  costo_unitario     NUMERIC(12,4),                                 -- costo standard al momento dell'ordine
  personalizzazioni  TEXT,                                          -- «senza rosmarino», «latte di soia»
  note               TEXT,
  allergie           TEXT[] NOT NULL DEFAULT '{}' CHECK (allergie <@ allergeni_ue()),
  uscita             SMALLINT CHECK (uscita BETWEEN 0 AND 9),
  invio              TEXT NOT NULL DEFAULT 'immediato' CHECK (invio IN ('immediato', 'differito')),
  stazione_id        UUID REFERENCES fb_stazioni(id) ON DELETE SET NULL,
  priorita           TEXT NOT NULL DEFAULT 'normale' CHECK (priorita IN ('normale', 'alta', 'urgente')),
  stato              fb_riga_stato NOT NULL DEFAULT 'da_preparare',
  omaggio            BOOLEAN NOT NULL DEFAULT false,
  rifacimento_di     UUID REFERENCES fb_comande_righe(id) ON DELETE SET NULL,
  motivo_rifacimento TEXT CHECK (motivo_rifacimento IN ('restituito', 'errore', 'caduto', 'altro')),
  ordinata_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inviata_at         TIMESTAMPTZ,
  presa_at           TIMESTAMPTZ,
  preparazione_at    TIMESTAMPTZ,
  pronta_at          TIMESTAMPTZ,
  servita_at         TIMESTAMPTZ,
  annullata_at       TIMESTAMPTZ,
  preparata_da       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  cameriere_id       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  conti_riga_id      UUID REFERENCES conti_righe(id) ON DELETE SET NULL,
  scaricata          BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_fb_righe_comanda ON fb_comande_righe (comanda_id, uscita);
CREATE INDEX idx_fb_righe_kds ON fb_comande_righe (stazione_id, stato)
  WHERE stato IN ('da_preparare', 'presa_in_carico', 'in_preparazione', 'pronta');
CREATE INDEX idx_fb_righe_prodotto ON fb_comande_righe (prodotto_id, ordinata_at);

CREATE OR REPLACE FUNCTION fb_riga_rango(s fb_riga_stato)
RETURNS INT
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT CASE s WHEN 'in_attesa' THEN 0 WHEN 'da_preparare' THEN 1 WHEN 'presa_in_carico' THEN 2
                WHEN 'in_preparazione' THEN 3 WHEN 'pronta' THEN 4 WHEN 'servita' THEN 5 ELSE 9 END
$$;

-- Scarico teorico dal magazzino quando il piatto è pronto (o servito
-- direttamente): ricetta esplosa per lotti in ordine di scadenza, con il
-- riferimento alla riga → tracciabilità dal lotto al tavolo.
CREATE OR REPLACE FUNCTION fb_riga_scarica(r fb_comande_righe)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p fb_prodotti%ROWTYPE;
BEGIN
  SELECT * INTO p FROM fb_prodotti WHERE id = r.prodotto_id;
  IF cardinality(p.componenti) > 0 THEN RETURN; END IF;   -- scaricano i piatti del menu
  IF p.distinta_id IS NOT NULL THEN
    PERFORM scarica_distinta(p.distinta_id, r.quantita, 'vendita', 'fb_comande_righe', r.id);
  ELSIF p.articolo_id IS NOT NULL THEN
    PERFORM mag_scarica(p.articolo_id, r.quantita * p.articolo_quantita, 'vendita', 'fb_comande_righe', r.id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION fb_riga_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c fb_comande%ROWTYPE;
  p fb_prodotti%ROWTYPE;
  v_uscita SMALLINT;
  v_prezzo RECORD;
  v_promo fb_promozioni%ROWTYPE;
  v_conto UUID;
BEGIN
  SELECT * INTO c FROM fb_comande WHERE id = NEW.comanda_id;
  IF c.stato <> 'aperta' THEN
    RAISE EXCEPTION 'La comanda è %', c.stato USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO p FROM fb_prodotti WHERE id = NEW.prodotto_id;
  NEW.locale_id := c.locale_id;
  NEW.modulo := c.modulo;
  NEW.descrizione := COALESCE(NEW.descrizione, p.nome);
  NEW.aliquota_iva := p.aliquota_iva;
  NEW.cameriere_id := COALESCE(NEW.cameriere_id, c.cameriere_id, auth.uid());
  NEW.ordinata_at := NOW();

  IF NEW.padre_id IS NULL AND NEW.rifacimento_di IS NULL THEN
    IF p.stato <> 'attivo' THEN
      RAISE EXCEPTION '«%» non è disponibile (%)', p.nome, p.stato USING ERRCODE = 'check_violation';
    END IF;
    IF cardinality(p.mesi_disponibili) > 0
       AND NOT EXTRACT(MONTH FROM NOW() AT TIME ZONE 'Europe/Rome')::smallint = ANY (p.mesi_disponibili) THEN
      RAISE EXCEPTION '«%» è fuori stagione', p.nome USING ERRCODE = 'check_violation';
    END IF;
    IF NOT (CASE WHEN c.canale IN ('telefono', 'app') THEN 'online' ELSE c.canale END) = ANY (p.canali) THEN
      RAISE EXCEPTION '«%» non è in vendita su questo canale', p.nome USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Prezzo: componenti di un menu e rifacimenti non si pagano; omaggi a zero.
  IF NEW.padre_id IS NOT NULL OR NEW.rifacimento_di IS NOT NULL THEN
    NEW.prezzo_unitario := 0;
    NEW.prezzo_origine := CASE WHEN NEW.padre_id IS NOT NULL THEN 'nel menu' ELSE 'rifacimento' END;
  ELSIF NEW.omaggio THEN
    NEW.prezzo_unitario := 0;
    NEW.prezzo_origine := COALESCE(NEW.prezzo_origine, 'omaggio');
  ELSIF NEW.prezzo_unitario IS NULL THEN
    SELECT * INTO v_prezzo FROM fb_prezzo(NEW.prodotto_id, c.locale_id,
      CASE WHEN c.canale IN ('telefono', 'app') THEN 'online' ELSE c.canale END, NOW(), c.tipologia_cliente);
    NEW.prezzo_unitario := v_prezzo.prezzo;
    NEW.prezzo_origine := v_prezzo.origine;
    NEW.promozione_id := v_prezzo.promozione_id;
  ELSE
    NEW.prezzo_origine := COALESCE(NEW.prezzo_origine, 'manuale');
  END IF;

  -- 2×1 e simili: i pezzi gratuiti diventano una riga omaggio a parte.
  IF NOT NEW.omaggio AND NEW.padre_id IS NULL AND NEW.rifacimento_di IS NULL THEN
    SELECT pr.* INTO v_promo FROM fb_promozioni pr
     WHERE pr.attiva AND pr.tipo = 'x_per_y'
       AND (pr.locale_id IS NULL OR pr.locale_id = c.locale_id)
       AND (NEW.prodotto_id = ANY (pr.prodotti) OR p.categoria_id = ANY (pr.categorie))
       AND (cardinality(pr.canali) = 0 OR c.canale = ANY (pr.canali))
       AND fb_in_fascia(NOW(), pr.giorni, pr.ora_inizio, pr.ora_fine, pr.valido_dal, pr.valido_al)
     ORDER BY pr.quantita_x LIMIT 1;
    IF v_promo.id IS NOT NULL AND NEW.quantita >= v_promo.quantita_x THEN
      NEW.promo_omaggi := floor(NEW.quantita / v_promo.quantita_x) * (v_promo.quantita_x - v_promo.quantita_y);
      NEW.quantita := NEW.quantita - NEW.promo_omaggi;
      NEW.promozione_id := v_promo.id;
    END IF;
  END IF;

  NEW.costo_unitario := CASE WHEN cardinality(p.componenti) > 0 THEN 0 ELSE fb_costo_prodotto(NEW.prodotto_id) END;
  IF NEW.uscita IS NULL THEN
    SELECT uscita INTO v_uscita FROM fb_categorie WHERE id = p.categoria_id;
    NEW.uscita := COALESCE(v_uscita, 1);
  END IF;

  IF cardinality(p.componenti) > 0 THEN
    -- Il menu porta il prezzo; si preparano i suoi piatti.
    NEW.stazione_id := NULL;
    NEW.stato := 'servita';
    NEW.servita_at := NOW();
  ELSE
    NEW.stazione_id := COALESCE(NEW.stazione_id, fb_stazione_per(c.locale_id, NEW.prodotto_id));
    IF NEW.stato NOT IN ('servita', 'pronta') THEN
      NEW.stato := CASE WHEN NEW.invio = 'differito' THEN 'in_attesa' ELSE 'da_preparare' END;
    END IF;
    IF NEW.stato <> 'in_attesa' THEN NEW.inviata_at := NOW(); END IF;
    IF NEW.stato = 'pronta' THEN NEW.pronta_at := NOW(); END IF;
    IF NEW.stato = 'servita' THEN NEW.servita_at := NOW(); END IF;
    IF NEW.stato IN ('pronta', 'servita') THEN
      PERFORM fb_riga_scarica(NEW);
      NEW.scaricata := true;
    END IF;
  END IF;

  -- Ogni riga pagante (o omaggio) è una riga del conto.
  IF NEW.padre_id IS NULL AND NEW.rifacimento_di IS NULL THEN
    v_conto := fb_conto_comanda(c.id);
    INSERT INTO conti_righe (conto_id, descrizione, articolo_id, distinta_id, quantita, prezzo_unitario, aliquota_iva,
                             riferimento_tipo, riferimento_id, created_by)
    VALUES (v_conto,
            NEW.descrizione || CASE WHEN NEW.omaggio THEN ' (omaggio)' ELSE '' END
              || COALESCE(' · ' || NEW.personalizzazioni, ''),
            p.articolo_id, p.distinta_id, NEW.quantita, NEW.prezzo_unitario, NEW.aliquota_iva,
            'fb_comande_righe', NEW.id, COALESCE(auth.uid(), NEW.created_by))
    RETURNING id INTO NEW.conti_riga_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_righe_prepara BEFORE INSERT ON fb_comande_righe
  FOR EACH ROW EXECUTE FUNCTION fb_riga_prepara();

-- Dopo l'inserimento: i piatti del menu e i pezzi in omaggio della promozione.
CREATE OR REPLACE FUNCTION fb_riga_dopo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_componenti UUID[];
BEGIN
  SELECT componenti INTO v_componenti FROM fb_prodotti WHERE id = NEW.prodotto_id;
  IF cardinality(v_componenti) > 0 AND NEW.padre_id IS NULL THEN
    INSERT INTO fb_comande_righe (comanda_id, prodotto_id, padre_id, quantita, invio, allergie, personalizzazioni, created_by)
    SELECT NEW.comanda_id, x, NEW.id, NEW.quantita, NEW.invio, NEW.allergie, NULL, NEW.created_by
      FROM unnest(v_componenti) WITH ORDINALITY AS u(x, n) ORDER BY n;
  END IF;
  IF NEW.promo_omaggi > 0 THEN
    INSERT INTO fb_comande_righe (comanda_id, prodotto_id, quantita, omaggio, promozione_id, prezzo_origine,
                                  personalizzazioni, note, allergie, uscita, invio, created_by)
    SELECT NEW.comanda_id, NEW.prodotto_id, NEW.promo_omaggi, true, NEW.promozione_id, 'promozione: ' || pr.nome,
           NEW.personalizzazioni, NEW.note, NEW.allergie, NEW.uscita, NEW.invio, NEW.created_by
      FROM fb_promozioni pr WHERE pr.id = NEW.promozione_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_righe_dopo AFTER INSERT ON fb_comande_righe
  FOR EACH ROW EXECUTE FUNCTION fb_riga_dopo();

-- Stati solo in avanti, con l'ora di ogni passaggio; quantità e prezzo si
-- cambiano finché la cucina non ha iniziato; l'annullamento storna la riga
-- del conto e annulla i piatti del menu.
CREATE OR REPLACE FUNCTION fb_riga_transizioni()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.comanda_id <> OLD.comanda_id OR NEW.prodotto_id <> OLD.prodotto_id
     OR NEW.padre_id IS DISTINCT FROM OLD.padre_id THEN
    RAISE EXCEPTION 'Comanda, prodotto e menu di una riga non cambiano' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.stato = 'annullata' AND NEW.stato <> 'annullata' THEN
    RAISE EXCEPTION 'Riga annullata' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.stato = 'annullata' AND OLD.stato = 'servita'
     AND (SELECT cardinality(componenti) FROM fb_prodotti WHERE id = OLD.prodotto_id) = 0 THEN
    RAISE EXCEPTION 'Un piatto servito non si annulla: si rifà o si offre' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.stato <> 'annullata' AND fb_riga_rango(NEW.stato) < fb_riga_rango(OLD.stato) THEN
    RAISE EXCEPTION 'Lo stato di una riga va solo avanti (% → %)', OLD.stato, NEW.stato USING ERRCODE = 'check_violation';
  END IF;
  IF (NEW.quantita, NEW.prezzo_unitario, NEW.omaggio) IS DISTINCT FROM (OLD.quantita, OLD.prezzo_unitario, OLD.omaggio)
     AND OLD.stato NOT IN ('in_attesa', 'da_preparare') AND NOT (NEW.omaggio AND NOT OLD.omaggio) THEN
    RAISE EXCEPTION 'La cucina ha già iniziato: quantità e prezzo non cambiano' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.stato <> OLD.stato THEN
    IF OLD.stato = 'in_attesa' AND NEW.stato <> 'annullata' THEN NEW.inviata_at := NOW(); END IF;
    CASE NEW.stato
      WHEN 'presa_in_carico' THEN NEW.presa_at := NOW(); NEW.preparata_da := COALESCE(NEW.preparata_da, auth.uid());
      WHEN 'in_preparazione' THEN NEW.preparazione_at := NOW(); NEW.preparata_da := COALESCE(NEW.preparata_da, auth.uid());
      WHEN 'pronta' THEN NEW.pronta_at := NOW();
      WHEN 'servita' THEN NEW.servita_at := NOW();
      WHEN 'annullata' THEN NEW.annullata_at := NOW();
      ELSE NULL;
    END CASE;
  END IF;
  IF NEW.stato IN ('pronta', 'servita') AND NOT NEW.scaricata THEN
    PERFORM fb_riga_scarica(NEW);
    NEW.scaricata := true;
  END IF;

  IF NEW.omaggio AND NOT OLD.omaggio THEN
    NEW.prezzo_unitario := 0;
    NEW.prezzo_origine := 'omaggio';
  END IF;
  IF NEW.conti_riga_id IS NOT NULL THEN
    IF NEW.stato = 'annullata' AND OLD.stato <> 'annullata' THEN
      UPDATE conti_righe SET stornata = true WHERE id = NEW.conti_riga_id;
    ELSIF (NEW.quantita, NEW.prezzo_unitario) IS DISTINCT FROM (OLD.quantita, OLD.prezzo_unitario) THEN
      UPDATE conti_righe SET quantita = NEW.quantita, prezzo_unitario = NEW.prezzo_unitario,
             descrizione = NEW.descrizione || CASE WHEN NEW.omaggio THEN ' (omaggio)' ELSE '' END
                           || COALESCE(' · ' || NEW.personalizzazioni, '')
       WHERE id = NEW.conti_riga_id;
    END IF;
  END IF;
  IF NEW.stato = 'annullata' AND OLD.stato <> 'annullata' THEN
    UPDATE fb_comande_righe SET stato = 'annullata' WHERE padre_id = NEW.id AND stato NOT IN ('annullata', 'servita');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_righe_transizioni BEFORE UPDATE ON fb_comande_righe
  FOR EACH ROW EXECUTE FUNCTION fb_riga_transizioni();

-- «Marcia»: parte l'uscita indicata (secondi, dessert…).
CREATE OR REPLACE FUNCTION fb_marcia_uscita(p_comanda UUID, p_uscita SMALLINT)
RETURNS INTEGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  n INTEGER;
BEGIN
  UPDATE fb_comande_righe SET stato = 'da_preparare'
   WHERE comanda_id = p_comanda AND uscita = p_uscita AND stato = 'in_attesa';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Uscite automatiche: quando un'uscita è tutta servita, dopo la pausa del
-- locale parte la successiva trattenuta.
CREATE OR REPLACE FUNCTION fb_marcia_automatica()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN
    SELECT c.id AS comanda_id, MIN(rg.uscita) AS prossima, l.pausa_uscite_min
      FROM fb_comande c
      JOIN fb_locali l ON l.id = c.locale_id
      JOIN fb_comande_righe rg ON rg.comanda_id = c.id AND rg.stato = 'in_attesa'
     WHERE c.stato = 'aperta' AND c.uscite_automatiche
     GROUP BY c.id, l.pausa_uscite_min
  LOOP
    IF EXISTS (SELECT 1 FROM fb_comande_righe WHERE comanda_id = r.comanda_id AND uscita < r.prossima
                AND stato <> 'annullata')
       AND NOT EXISTS (SELECT 1 FROM fb_comande_righe WHERE comanda_id = r.comanda_id AND uscita < r.prossima
                        AND stato NOT IN ('servita', 'annullata'))
       AND (SELECT MAX(servita_at) FROM fb_comande_righe WHERE comanda_id = r.comanda_id AND uscita < r.prossima
             AND stato = 'servita' AND stazione_id IS NOT NULL)
           + make_interval(mins => r.pausa_uscite_min) <= NOW() THEN
      n := n + fb_marcia_uscita(r.comanda_id, r.prossima);
    END IF;
  END LOOP;
  RETURN n;
END;
$$;

-- Rifacimento: la nuova riga non si paga, l'originale resta in conto e il
-- costo del piatto rifatto finisce tra gli sprechi.
CREATE OR REPLACE FUNCTION fb_rifai_riga(p_riga UUID, p_motivo TEXT)
RETURNS UUID
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  o fb_comande_righe%ROWTYPE;
  v_id UUID;
BEGIN
  SELECT * INTO o FROM fb_comande_righe WHERE id = p_riga;
  IF o.id IS NULL OR o.stato NOT IN ('pronta', 'servita') THEN
    RAISE EXCEPTION 'Si rifà solo un piatto già pronto o servito' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE fb_comande_righe SET motivo_rifacimento = p_motivo WHERE id = p_riga;
  INSERT INTO fb_comande_righe (comanda_id, prodotto_id, quantita, personalizzazioni, note, allergie, uscita,
                                priorita, rifacimento_di, created_by)
  VALUES (o.comanda_id, o.prodotto_id, o.quantita, o.personalizzazioni,
          'Rifacimento (' || p_motivo || ')' || COALESCE(' · ' || o.note, ''), o.allergie, o.uscita,
          'urgente', o.id, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Il conto chiuso chiude la comanda.
CREATE OR REPLACE FUNCTION fb_conto_chiuso()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE fb_comande SET stato = CASE WHEN NEW.stato = 'chiuso' THEN 'chiusa' ELSE 'annullata' END::fb_comanda_stato
   WHERE id = NEW.riferimento_id AND stato = 'aperta';
  RETURN NEW;
END;
$$;
CREATE TRIGGER conti_fb_chiude_comanda AFTER UPDATE OF stato ON conti
  FOR EACH ROW WHEN (NEW.riferimento_tipo = 'fb_comande' AND NEW.stato IN ('chiuso', 'annullato') AND OLD.stato = 'aperto')
  EXECUTE FUNCTION fb_conto_chiuso();

-- ═══ CONSEGNE A DOMICILIO ═══════════════════════════════════════════
CREATE TABLE fb_consegne (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id            UUID NOT NULL UNIQUE REFERENCES fb_comande(id) ON DELETE CASCADE,
  locale_id             UUID NOT NULL,
  modulo                TEXT NOT NULL,
  indirizzo             TEXT NOT NULL,
  citta                 TEXT,
  zona                  TEXT,
  fascia_dalle          TIMESTAMPTZ,
  fascia_alle           TIMESTAMPTZ,
  rider_id              UUID REFERENCES dipendenti(id) ON DELETE SET NULL,
  rider_esterno         TEXT,
  costo_consegna        NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (costo_consegna >= 0),
  stato                 TEXT NOT NULL DEFAULT 'da_assegnare' CHECK (stato IN ('da_assegnare', 'assegnata', 'in_consegna', 'consegnata', 'fallita')),
  partita_at            TIMESTAMPTZ,
  consegnata_at         TIMESTAMPTZ,
  piattaforma           TEXT,                 -- predisposto
  piattaforma_ordine_id TEXT,
  conti_riga_id         UUID REFERENCES conti_righe(id) ON DELETE SET NULL,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id),
  CHECK (fascia_alle IS NULL OR fascia_dalle IS NULL OR fascia_alle > fascia_dalle)
);
CREATE INDEX idx_fb_consegne ON fb_consegne (locale_id, stato, fascia_dalle);

CREATE OR REPLACE FUNCTION fb_consegna_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c fb_comande%ROWTYPE;
BEGIN
  SELECT * INTO c FROM fb_comande WHERE id = NEW.comanda_id;
  IF TG_OP = 'INSERT' THEN
    IF c.canale <> 'delivery' THEN
      RAISE EXCEPTION 'La consegna è solo per le comande delivery' USING ERRCODE = 'check_violation';
    END IF;
    NEW.locale_id := c.locale_id;
    NEW.modulo := c.modulo;
    IF NEW.costo_consegna > 0 THEN
      INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, riferimento_id, created_by)
      VALUES (fb_conto_comanda(c.id), 'Consegna a domicilio', 1, NEW.costo_consegna, 10, 'fb_consegne', NEW.id,
              COALESCE(auth.uid(), NEW.created_by))
      RETURNING id INTO NEW.conti_riga_id;
    END IF;
  ELSIF NEW.costo_consegna <> OLD.costo_consegna AND NEW.conti_riga_id IS NOT NULL THEN
    UPDATE conti_righe SET prezzo_unitario = NEW.costo_consegna WHERE id = NEW.conti_riga_id;
  END IF;
  IF NEW.stato = 'in_consegna' AND (TG_OP = 'INSERT' OR OLD.stato <> 'in_consegna') THEN NEW.partita_at := NOW(); END IF;
  IF NEW.stato = 'consegnata' AND (TG_OP = 'INSERT' OR OLD.stato <> 'consegnata') THEN NEW.consegnata_at := NOW(); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_consegne_prepara BEFORE INSERT OR UPDATE ON fb_consegne
  FOR EACH ROW EXECUTE FUNCTION fb_consegna_prepara();

-- ═══ CANTINA E CARTA VINI ═══════════════════════════════════════════
-- Il vino è un articolo di magazzino (giacenza, costo, lotti, ubicazione)
-- con la sua scheda e uno o due prodotti in vendita (bottiglia, calice).
CREATE TABLE fb_vini (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo               TEXT NOT NULL DEFAULT 'fb' CHECK (modulo = ANY (moduli_fb())),
  articolo_id          UUID NOT NULL UNIQUE REFERENCES mag_articoli(id) ON DELETE CASCADE,
  prodotto_bottiglia_id UUID REFERENCES fb_prodotti(id) ON DELETE SET NULL,
  prodotto_calice_id   UUID REFERENCES fb_prodotti(id) ON DELETE SET NULL,
  cantina              TEXT,
  produttore           TEXT,
  denominazione        TEXT,              -- DOC, DOCG, IGT…
  annata               INT CHECK (annata BETWEEN 1800 AND 2200),
  regione              TEXT,
  vitigno              TEXT,
  formato              TEXT NOT NULL DEFAULT '0,75 l',
  tipologia            TEXT CHECK (tipologia IN ('rosso', 'bianco', 'rosato', 'bollicine', 'dolce', 'passito', 'altro')),
  temperatura_servizio TEXT,
  descrizione          TEXT,
  abbinamenti          TEXT,
  in_carta             BOOLEAN NOT NULL DEFAULT true,
  ordine               INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES user_profiles(id),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES user_profiles(id)
);

-- Carta vini pubblica (QR al tavolo, predisposto): solo ciò che è in carta,
-- solo se il Ristorante è licenziato.
CREATE OR REPLACE FUNCTION fb_carta_vini()
RETURNS TABLE (nome TEXT, produttore TEXT, annata INT, denominazione TEXT, regione TEXT, vitigno TEXT,
               tipologia TEXT, formato TEXT, descrizione TEXT, abbinamenti TEXT,
               prezzo_bottiglia NUMERIC, prezzo_calice NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT a.descrizione, COALESCE(v.produttore, v.cantina), v.annata, v.denominazione, v.regione, v.vitigno,
         v.tipologia, v.formato, v.descrizione, v.abbinamenti, pb.prezzo, pc.prezzo
    FROM fb_vini v
    JOIN mag_articoli a ON a.id = v.articolo_id
    LEFT JOIN fb_prodotti pb ON pb.id = v.prodotto_bottiglia_id AND pb.stato = 'attivo'
    LEFT JOIN fb_prodotti pc ON pc.id = v.prodotto_calice_id AND pc.stato = 'attivo'
   WHERE v.in_carta AND modulo_licenziato('ristorante') AND (pb.id IS NOT NULL OR pc.id IS NOT NULL)
   ORDER BY v.tipologia, v.ordine, a.descrizione
$$;

-- ═══ CLIENTI: PREFERENZE E RICORRENZE ═══════════════════════════════
CREATE TABLE fb_clienti (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                TEXT NOT NULL DEFAULT 'fb' CHECK (modulo = ANY (moduli_fb())),
  contatto_id           UUID NOT NULL UNIQUE REFERENCES contatti(id) ON DELETE CASCADE,
  preferenze            TEXT,
  preferenze_alimentari TEXT,              -- vegetariano, vegano, senza glutine…
  allergie              TEXT[] NOT NULL DEFAULT '{}' CHECK (allergie <@ allergeni_ue()),
  intolleranze          TEXT,
  tavolo_preferito_id   UUID REFERENCES fb_tavoli(id) ON DELETE SET NULL,
  compleanno            DATE,
  anniversario          DATE,
  ricorrenze            JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(ricorrenze) = 'array'),  -- [{"nome":"Onomastico","data":"2000-06-29"}]
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id)
);

-- ═══ SPRECHI E SCARTI ═══════════════════════════════════════════════
-- Sprechi registrati a mano (scarti, deterioramenti, consumi del
-- personale…): scaricano il magazzino e ne fissano il costo. Piatti rifatti,
-- annullati dopo la preparazione e omaggi si leggono dalle comande.
CREATE TABLE fb_sprechi (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo        TEXT NOT NULL DEFAULT 'fb' CHECK (modulo = ANY (moduli_fb())),
  locale_id     UUID REFERENCES fb_locali(id) ON DELETE SET NULL,
  causale       TEXT NOT NULL CHECK (causale IN ('scarto_preparazione', 'deterioramento', 'scadenza', 'errore_produzione',
                                                  'reso', 'omaggio', 'consumo_personale')),
  articolo_id   UUID REFERENCES mag_articoli(id) ON DELETE RESTRICT,
  prodotto_id   UUID REFERENCES fb_prodotti(id) ON DELETE RESTRICT,
  lotto_id      UUID REFERENCES mag_lotti(id) ON DELETE SET NULL,
  quantita      NUMERIC(14,3) NOT NULL CHECK (quantita > 0),
  costo         NUMERIC(12,2),
  registrato_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  CHECK ((articolo_id IS NULL) <> (prodotto_id IS NULL))
);
CREATE INDEX idx_fb_sprechi ON fb_sprechi (modulo, registrato_at DESC);

CREATE OR REPLACE FUNCTION fb_spreco_registra()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_tipo mag_movimento_tipo := CASE NEW.causale
    WHEN 'deterioramento' THEN 'deterioramento' WHEN 'scadenza' THEN 'deterioramento'
    WHEN 'omaggio' THEN 'omaggio' WHEN 'consumo_personale' THEN 'consumo_interno'
    ELSE 'sfrido' END;
  p fb_prodotti%ROWTYPE;
BEGIN
  IF NEW.locale_id IS NOT NULL THEN SELECT modulo INTO NEW.modulo FROM fb_locali WHERE id = NEW.locale_id; END IF;
  IF NEW.articolo_id IS NOT NULL THEN
    NEW.costo := ROUND(NEW.quantita * (SELECT costo_unitario FROM mag_articoli WHERE id = NEW.articolo_id), 2);
    IF NEW.lotto_id IS NOT NULL THEN
      INSERT INTO mag_movimenti (articolo_id, lotto_id, tipo, quantita, riferimento_tipo, riferimento_id, note, created_by)
      VALUES (NEW.articolo_id, NEW.lotto_id, v_tipo, -NEW.quantita, 'fb_sprechi', NEW.id, NEW.note, NEW.created_by);
    ELSE
      PERFORM mag_scarica(NEW.articolo_id, NEW.quantita, v_tipo, 'fb_sprechi', NEW.id, NEW.note);
    END IF;
  ELSE
    SELECT * INTO p FROM fb_prodotti WHERE id = NEW.prodotto_id;
    NEW.costo := ROUND(NEW.quantita * fb_costo_prodotto(NEW.prodotto_id), 2);
    IF p.distinta_id IS NOT NULL THEN
      PERFORM scarica_distinta(p.distinta_id, NEW.quantita, v_tipo, 'fb_sprechi', NEW.id);
    ELSIF p.articolo_id IS NOT NULL THEN
      PERFORM mag_scarica(p.articolo_id, NEW.quantita * p.articolo_quantita, v_tipo, 'fb_sprechi', NEW.id, NEW.note);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_sprechi_registra BEFORE INSERT ON fb_sprechi
  FOR EACH ROW EXECUTE FUNCTION fb_spreco_registra();

-- ═══ STATO DEI TAVOLI, CUCINA, USCITE ═══════════════════════════════
-- Stato del tavolo calcolato, mai scritto a mano: chiuso (fuori servizio)
-- → conto richiesto → in servizio (piatti in lavorazione) → in attesa
-- (seduti, niente ordinato) → occupato → prenotato (entro l'anticipo del
-- locale) → libero.
CREATE VIEW fb_tavoli_stato WITH (security_invoker = true) AS
SELECT t.id AS tavolo_id, t.locale_id, t.sala_id, t.modulo, t.numero, t.posti, t.posti_max, t.forma,
       t.x, t.y, t.larghezza, t.altezza, t.rotazione, t.cameriere_id,
       c.id AS comanda_id, c.coperti, c.aperta_at, c.conto_richiesto_at, c.conto_id,
       p.id AS prenotazione_id, p.nome AS prenotazione_nome, p.inizio AS prenotazione_inizio,
       p.persone AS prenotazione_persone,
       CASE
         WHEN t.fuori_servizio THEN 'chiuso'
         WHEN c.id IS NOT NULL AND c.conto_richiesto_at IS NOT NULL THEN 'conto_richiesto'
         WHEN c.id IS NOT NULL AND EXISTS (SELECT 1 FROM fb_comande_righe r WHERE r.comanda_id = c.id
                AND r.stato IN ('da_preparare', 'presa_in_carico', 'in_preparazione', 'pronta')) THEN 'in_servizio'
         WHEN c.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM fb_comande_righe r WHERE r.comanda_id = c.id
                AND r.stato <> 'annullata') THEN 'in_attesa'
         WHEN c.id IS NOT NULL THEN 'occupato'
         WHEN p.id IS NOT NULL THEN 'prenotato'
         ELSE 'libero'
       END AS stato
  FROM fb_tavoli t
  JOIN fb_locali l ON l.id = t.locale_id
  LEFT JOIN fb_comande c ON c.tavolo_id = t.id AND c.stato = 'aperta'
  LEFT JOIN LATERAL (
    SELECT pr.id, pr.nome, pr.inizio, pr.persone
      FROM fb_prenotazioni_tavoli pt JOIN fb_prenotazioni pr ON pr.id = pt.prenotazione_id
     WHERE pt.tavolo_id = t.id AND pt.attiva AND pr.stato IN ('richiesta', 'confermata', 'arrivata')
       AND pt.periodo && tstzrange(NOW(), NOW() + make_interval(mins => l.anticipo_prenotato_min))
     ORDER BY pr.inizio LIMIT 1) p ON true
 WHERE t.attivo;

-- Lista d'attesa: chi può sedersi adesso (tavolo libero abbastanza grande,
-- nella zona preferita se indicata), in ordine di priorità e di arrivo.
CREATE OR REPLACE FUNCTION fb_attesa_candidati(p_locale UUID)
RETURNS TABLE (attesa_id UUID, nome TEXT, persone INT, minuti_attesa INT, tavolo_id UUID, tavolo TEXT)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT a.id, a.nome, a.persone, (EXTRACT(EPOCH FROM NOW() - a.ora_richiesta) / 60)::int, t.tavolo_id, t.numero
    FROM fb_attesa a
    CROSS JOIN LATERAL (
      SELECT s.tavolo_id, s.numero FROM fb_tavoli_stato s
       WHERE s.locale_id = a.locale_id AND s.stato = 'libero'
         AND COALESCE(s.posti_max, s.posti) >= a.persone
         AND (a.sala_id IS NULL OR s.sala_id = a.sala_id)
         AND (a.tavolo_id IS NULL OR s.tavolo_id = a.tavolo_id)
       ORDER BY s.posti, s.numero LIMIT 1) t
   WHERE a.locale_id = p_locale AND a.stato IN ('in_attesa', 'avvisato')
   ORDER BY a.priorita DESC, a.ora_richiesta
$$;

-- Schermo di cucina e banco: ogni postazione vede solo il suo, con i tempi
-- e lo stato degli altri piatti della stessa uscita (per farli uscire insieme).
CREATE VIEW fb_kds WITH (security_invoker = true) AS
SELECT r.id AS riga_id, r.stazione_id, r.locale_id, r.modulo, r.comanda_id, c.numero AS comanda_numero, c.canale,
       t.numero AS tavolo, c.coperti, c.ritiro_at, r.descrizione, r.quantita, r.personalizzazioni, r.note, r.allergie,
       r.uscita, r.stato, r.padre_id, r.rifacimento_di,
       CASE WHEN 'urgente' IN (r.priorita, c.priorita) THEN 'urgente'
            WHEN 'alta' IN (r.priorita, c.priorita) THEN 'alta' ELSE 'normale' END AS priorita,
       r.inviata_at, r.presa_at, r.preparazione_at, r.pronta_at,
       (EXTRACT(EPOCH FROM NOW() - r.inviata_at) / 60)::int AS minuti,
       p.tempo_preparazione_min,
       (p.tempo_preparazione_min IS NOT NULL AND r.stato <> 'pronta'
        AND NOW() - r.inviata_at > make_interval(mins => p.tempo_preparazione_min)) AS in_ritardo,
       u.piatti_uscita, u.pronti_uscita
  FROM fb_comande_righe r
  JOIN fb_comande c ON c.id = r.comanda_id
  JOIN fb_prodotti p ON p.id = r.prodotto_id
  LEFT JOIN fb_tavoli t ON t.id = c.tavolo_id
  CROSS JOIN LATERAL (
    SELECT count(*)::int AS piatti_uscita,
           count(*) FILTER (WHERE x.stato IN ('pronta', 'servita'))::int AS pronti_uscita
      FROM fb_comande_righe x
     WHERE x.comanda_id = r.comanda_id AND x.uscita = r.uscita AND x.stazione_id IS NOT NULL
       AND x.stato NOT IN ('annullata', 'in_attesa')) u
 WHERE r.stazione_id IS NOT NULL AND r.stato IN ('da_preparare', 'presa_in_carico', 'in_preparazione', 'pronta')
   AND c.stato = 'aperta';

-- ═══ TRIGGER DI EREDITÀ, COMUNI, RLS, PROTEZIONI ════════════════════
CREATE OR REPLACE FUNCTION fb_da_locale()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.locale_id IS NOT NULL THEN
    SELECT modulo INTO NEW.modulo FROM fb_locali WHERE id = NEW.locale_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION fb_tavolo_da_sala()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  SELECT locale_id, modulo INTO NEW.locale_id, NEW.modulo FROM fb_sale WHERE id = NEW.sala_id;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION fb_voce_da_menu()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  SELECT modulo INTO NEW.modulo FROM fb_menu WHERE id = NEW.menu_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_sale_modulo BEFORE INSERT OR UPDATE OF locale_id ON fb_sale FOR EACH ROW EXECUTE FUNCTION fb_da_locale();
CREATE TRIGGER fb_stazioni_modulo BEFORE INSERT OR UPDATE OF locale_id ON fb_stazioni FOR EACH ROW EXECUTE FUNCTION fb_da_locale();
CREATE TRIGGER fb_menu_modulo BEFORE INSERT OR UPDATE OF locale_id ON fb_menu FOR EACH ROW EXECUTE FUNCTION fb_da_locale();
CREATE TRIGGER fb_promozioni_modulo BEFORE INSERT OR UPDATE OF locale_id ON fb_promozioni FOR EACH ROW EXECUTE FUNCTION fb_da_locale();
CREATE TRIGGER fb_tavoli_modulo BEFORE INSERT OR UPDATE OF sala_id ON fb_tavoli FOR EACH ROW EXECUTE FUNCTION fb_tavolo_da_sala();
CREATE TRIGGER fb_menu_voci_modulo BEFORE INSERT OR UPDATE OF menu_id ON fb_menu_voci FOR EACH ROW EXECUTE FUNCTION fb_voce_da_menu();

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fb_locali','fb_sale','fb_tavoli','fb_stazioni','fb_categorie','fb_prodotti','fb_menu',
                           'fb_menu_voci','fb_promozioni','fb_prenotazioni','fb_attesa','fb_comande','fb_comande_righe',
                           'fb_consegne','fb_vini','fb_clienti'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
  END LOOP;
  -- Audit sulle anagrafiche e sulle prenotazioni; comande e righe hanno già
  -- tutte le ore nei loro campi e passano dal conto, che è sotto audit.
  FOREACH t IN ARRAY ARRAY['fb_locali','fb_sale','fb_tavoli','fb_stazioni','fb_categorie','fb_prodotti','fb_menu',
                           'fb_menu_voci','fb_promozioni','fb_prenotazioni','fb_vini','fb_clienti','fb_sprechi'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['fb_locali','fb_sale','fb_tavoli','fb_stazioni','fb_categorie','fb_prodotti','fb_menu',
                           'fb_menu_voci','fb_promozioni','fb_prenotazioni','fb_prenotazioni_tavoli','fb_attesa',
                           'fb_comande','fb_comande_righe','fb_consegne','fb_vini','fb_clienti','fb_sprechi'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
  END LOOP;

  -- Configurazione (listini, ricette, prezzi, sale): admin e manager.
  FOREACH t IN ARRAY ARRAY['fb_locali','fb_sale','fb_stazioni','fb_categorie','fb_prodotti','fb_menu','fb_menu_voci',
                           'fb_promozioni','fb_vini'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;

  -- Servizio: tutto il personale del modulo.
  FOREACH t IN ARRAY ARRAY['fb_prenotazioni','fb_attesa','fb_comande','fb_comande_righe','fb_consegne','fb_clienti','fb_sprechi'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['fb_prenotazioni','fb_attesa','fb_comande','fb_comande_righe','fb_consegne','fb_clienti'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['fb_prenotazioni','fb_attesa','fb_comande','fb_consegne','fb_clienti'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;
END $$;

-- Tavoli: la direzione li crea e li toglie; il personale li sposta sulla
-- mappa, li assegna e li segna fuori servizio.
CREATE POLICY "fb_tavoli_insert" ON fb_tavoli FOR INSERT TO authenticated
  WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid());
CREATE POLICY "fb_tavoli_update" ON fb_tavoli FOR UPDATE TO authenticated
  USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo));
CREATE POLICY "fb_tavoli_delete" ON fb_tavoli FOR DELETE TO authenticated
  USING (modulo_attivo(modulo) AND puo_amministrazione());

GRANT SELECT ON fb_tavoli_stato, fb_kds TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'fb_prodotto_controlla()','fb_prenotazione_prepara()','fb_prenotazione_sync_tavoli()','fb_attesa_prepara()',
    'fb_comanda_prepara()','fb_comanda_prenotazione()','fb_conto_comanda(uuid)','fb_riga_scarica(fb_comande_righe)',
    'fb_riga_prepara()','fb_riga_dopo()','fb_riga_transizioni()','fb_marcia_automatica()','fb_conto_chiuso()',
    'fb_consegna_prepara()','fb_spreco_registra()','fb_da_locale()','fb_tavolo_da_sala()','fb_voce_da_menu()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
    'moduli_fb()','fb_costo_prodotto(uuid)','fb_allergeni_prodotto(uuid)',
    'fb_in_fascia(timestamptz,smallint[],time,time,date,date)','fb_prezzo(uuid,uuid,text,timestamptz,text)',
    'fb_imposta_disponibilita(uuid,text)','fb_stazione_per(uuid,uuid)','fb_riga_rango(fb_riga_stato)',
    'fb_marcia_uscita(uuid,smallint)','fb_rifai_riga(uuid,text)','fb_attesa_candidati(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;
-- Carta vini al tavolo via QR: leggibile senza accesso (predisposta).
REVOKE ALL ON FUNCTION fb_carta_vini() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fb_carta_vini() TO anon, authenticated;

SELECT cron.unschedule('fb-marcia-uscite')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fb-marcia-uscite');
SELECT cron.schedule('fb-marcia-uscite', '* * * * *', $$SELECT fb_marcia_automatica()$$);

SELECT applica_protezioni_tabelle();
