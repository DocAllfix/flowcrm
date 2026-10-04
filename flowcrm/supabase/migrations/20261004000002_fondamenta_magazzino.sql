-- ═══════════════════════════════════════════════════════════════════
-- MODULI 2 · FONDAMENTA F0.1 — Magazzino, lotti, distinta base, acquisti
--
-- Usato da Ristorante e Bar (materie prime, semilavorati, vini, ricette),
-- Fioraio (fiori deperibili, composizioni), Palestra (prodotti in vendita,
-- materiali), Hotel (minibar). Ogni riga porta il suo `modulo` e la policy
-- controlla quella licenza (`modulo_attivo`, che per 'fb' accetta
-- Ristorante o Bar).
--
-- Scelte:
-- - la GIACENZA non è una colonna: è la somma dei movimenti (vista
--   `mag_giacenze`). Non può disallinearsi.
-- - i MOVIMENTI sono un registro: si aggiungono, non si modificano né si
--   cancellano. Una correzione è un movimento di rettifica (inventario).
-- - lo scarico manuale oltre la giacenza è rifiutato; lo scarico teorico
--   da VENDITA è ammesso anche sotto zero (non si blocca un servizio), e
--   la giacenza negativa compare tra le anomalie.
-- - scarico per lotto in ordine di scadenza (FEFO), poi di arrivo.
-- - distinta base ricorsiva (materia prima → semilavorato → prodotto), con
--   cicli rifiutati: costo, allergeni ed esplosione delle quantità.
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE mag_movimento_tipo AS ENUM (
  'carico', 'reso_cliente',                                   -- entrate
  'scarico', 'vendita', 'consumo', 'sfrido', 'deterioramento',
  'rottura', 'omaggio', 'consumo_interno', 'reso_fornitore',  -- uscite
  'inventario', 'trasferimento'                               -- rettifiche (segno libero)
);
CREATE TYPE mag_ordine_stato AS ENUM ('bozza', 'inviato', 'ricevuto_parziale', 'ricevuto', 'annullato');
CREATE TYPE mag_inventario_stato AS ENUM ('aperto', 'chiuso');

-- I 14 allergeni del Reg. UE 1169/2011, allegato II.
CREATE OR REPLACE FUNCTION allergeni_ue()
RETURNS TEXT[]
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT ARRAY['glutine','crostacei','uova','pesce','arachidi','soia','latte',
               'frutta_a_guscio','sedano','senape','sesamo','solfiti','lupini','molluschi']::text[]
$$;

-- ── ARTICOLI ─────────────────────────────────────────────────────────
CREATE TABLE mag_articoli (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  codice           TEXT,                      -- ART-AAAA-NNNN se vuoto
  descrizione      TEXT NOT NULL,
  categoria        TEXT,
  sottocategoria   TEXT,
  unita_misura     TEXT NOT NULL DEFAULT 'pz', -- pz, kg, g, l, ml, mazzo, bottiglia…
  fornitore_id     UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  costo_unitario   NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
  prezzo_vendita   NUMERIC(12,2) CHECK (prezzo_vendita >= 0),
  aliquota_iva     NUMERIC(5,2) NOT NULL DEFAULT 22,
  scorta_minima    NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (scorta_minima >= 0),
  deperibile       BOOLEAN NOT NULL DEFAULT false,
  durata_giorni    INT CHECK (durata_giorni > 0),   -- vita commerciale (fiori, freschi)
  allergeni        TEXT[] NOT NULL DEFAULT '{}' CHECK (allergeni <@ allergeni_ue()),
  stagionalita     TEXT,
  attributi        JSONB NOT NULL DEFAULT '{}'::jsonb, -- varietà, colore, dimensione, annata…
  vendibile        BOOLEAN NOT NULL DEFAULT false,
  attivo           BOOLEAN NOT NULL DEFAULT true,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id),
  UNIQUE (modulo, codice)
);
ALTER TABLE mag_articoli ADD COLUMN ricerca tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', coalesce(codice,'') || ' ' || coalesce(descrizione,'') || ' ' ||
    coalesce(categoria,'') || ' ' || coalesce(sottocategoria,''))) STORED;
CREATE INDEX idx_mag_articoli_ricerca ON mag_articoli USING GIN (ricerca);
CREATE INDEX idx_mag_articoli_modulo ON mag_articoli (modulo, attivo, categoria);

CREATE OR REPLACE FUNCTION mag_articolo_set_codice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.codice := genera_codice('ART');
  RETURN NEW;
END;
$$;
CREATE TRIGGER mag_articoli_set_codice BEFORE INSERT ON mag_articoli
  FOR EACH ROW WHEN (NEW.codice IS NULL) EXECUTE FUNCTION mag_articolo_set_codice();

-- ── LOTTI ────────────────────────────────────────────────────────────
CREATE TABLE mag_lotti (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo              TEXT NOT NULL,          -- copiato dall'articolo (trigger)
  articolo_id         UUID NOT NULL REFERENCES mag_articoli(id) ON DELETE CASCADE,
  codice_lotto        TEXT,
  fornitore_id        UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  provenienza         TEXT,
  data_ricevimento    DATE NOT NULL DEFAULT CURRENT_DATE,
  data_inserimento    DATE,                   -- messo in vendita (fiori)
  data_apertura       DATE,
  data_scadenza       DATE,                   -- scadenza o TMC
  data_smaltimento    DATE,                   -- prevista
  temperatura_ricevimento NUMERIC(5,1),
  ubicazione          TEXT,
  stato_conservazione TEXT,
  ordine_riga_id      UUID,                   -- FK aggiunta dopo mag_ordini_righe
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES user_profiles(id),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by          UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_mag_lotti_articolo ON mag_lotti (articolo_id, data_scadenza NULLS LAST, data_ricevimento);
CREATE INDEX idx_mag_lotti_scadenza ON mag_lotti (modulo, data_scadenza);

-- ── MOVIMENTI (registro) ─────────────────────────────────────────────
CREATE TABLE mag_movimenti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL,             -- copiato dall'articolo (trigger)
  articolo_id      UUID NOT NULL REFERENCES mag_articoli(id) ON DELETE CASCADE,
  lotto_id         UUID REFERENCES mag_lotti(id) ON DELETE SET NULL,
  tipo             mag_movimento_tipo NOT NULL,
  quantita         NUMERIC(14,3) NOT NULL CHECK (quantita <> 0),  -- con segno
  costo_unitario   NUMERIC(12,4),
  eseguito_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  riferimento_tipo TEXT,                      -- 'comanda_riga','ordine','conto_riga','produzione'…
  riferimento_id   UUID,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  CONSTRAINT mag_movimenti_segno CHECK (
       (tipo IN ('carico','reso_cliente') AND quantita > 0)
    OR (tipo IN ('scarico','vendita','consumo','sfrido','deterioramento','rottura',
                 'omaggio','consumo_interno','reso_fornitore') AND quantita < 0)
    OR (tipo IN ('inventario','trasferimento'))
  )
);
CREATE INDEX idx_mag_movimenti_articolo ON mag_movimenti (articolo_id, eseguito_at DESC);
CREATE INDEX idx_mag_movimenti_lotto ON mag_movimenti (lotto_id) WHERE lotto_id IS NOT NULL;
CREATE INDEX idx_mag_movimenti_riferimento ON mag_movimenti (riferimento_tipo, riferimento_id);
CREATE INDEX idx_mag_movimenti_modulo ON mag_movimenti (modulo, tipo, eseguito_at DESC);

-- modulo dei figli = modulo dell'articolo (le policy restano semplici)
CREATE OR REPLACE FUNCTION mag_eredita_modulo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  SELECT modulo INTO NEW.modulo FROM mag_articoli WHERE id = NEW.articolo_id;
  IF NEW.modulo IS NULL THEN
    RAISE EXCEPTION 'Articolo di magazzino inesistente';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER mag_lotti_modulo BEFORE INSERT OR UPDATE OF articolo_id ON mag_lotti
  FOR EACH ROW EXECUTE FUNCTION mag_eredita_modulo();
CREATE TRIGGER mag_movimenti_modulo BEFORE INSERT ON mag_movimenti
  FOR EACH ROW EXECUTE FUNCTION mag_eredita_modulo();

-- Giacenza mai negativa per gli scarichi manuali. Il lock sull'articolo
-- serializza due scarichi simultanei dello stesso articolo.
CREATE OR REPLACE FUNCTION mag_movimento_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_disponibile NUMERIC;
BEGIN
  IF NEW.lotto_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM mag_lotti WHERE id = NEW.lotto_id AND articolo_id = NEW.articolo_id) THEN
    RAISE EXCEPTION 'Il lotto non appartiene all''articolo';
  END IF;
  IF NEW.quantita < 0 AND NEW.tipo NOT IN ('vendita', 'inventario') THEN
    PERFORM 1 FROM mag_articoli WHERE id = NEW.articolo_id FOR UPDATE;
    IF NEW.lotto_id IS NOT NULL THEN
      SELECT COALESCE(SUM(quantita), 0) INTO v_disponibile FROM mag_movimenti WHERE lotto_id = NEW.lotto_id;
    ELSE
      SELECT COALESCE(SUM(quantita), 0) INTO v_disponibile FROM mag_movimenti WHERE articolo_id = NEW.articolo_id;
    END IF;
    IF v_disponibile + NEW.quantita < 0 THEN
      RAISE EXCEPTION 'Giacenza insufficiente: disponibili %, richiesti %', v_disponibile, -NEW.quantita
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  NEW.costo_unitario := COALESCE(NEW.costo_unitario,
    (SELECT costo_unitario FROM mag_articoli WHERE id = NEW.articolo_id));
  RETURN NEW;
END;
$$;
CREATE TRIGGER mag_movimenti_controlla BEFORE INSERT ON mag_movimenti
  FOR EACH ROW EXECUTE FUNCTION mag_movimento_controlla();

-- ── GIACENZE (viste: si calcolano, non si salvano) ───────────────────
CREATE VIEW mag_giacenze WITH (security_invoker = true) AS
SELECT a.id AS articolo_id, a.modulo, a.codice, a.descrizione, a.categoria, a.unita_misura,
       a.scorta_minima, a.costo_unitario,
       COALESCE(SUM(m.quantita), 0)::numeric(14,3) AS giacenza,
       (COALESCE(SUM(m.quantita), 0) * a.costo_unitario)::numeric(14,2) AS valore,
       COALESCE(SUM(m.quantita), 0) < a.scorta_minima AS sotto_scorta,
       COALESCE(SUM(m.quantita), 0) < 0 AS anomalia_negativa
  FROM mag_articoli a
  LEFT JOIN mag_movimenti m ON m.articolo_id = a.id
 WHERE a.attivo
 GROUP BY a.id;

-- Giorni di vita residua: scadenza, oppure arrivo + durata commerciale.
CREATE VIEW mag_lotti_stato WITH (security_invoker = true) AS
SELECT l.id AS lotto_id, l.modulo, l.articolo_id, a.descrizione, l.codice_lotto, l.ubicazione,
       l.data_ricevimento, l.data_scadenza,
       COALESCE(l.data_scadenza,
                COALESCE(l.data_inserimento, l.data_ricevimento) + a.durata_giorni) AS fine_vita,
       COALESCE(l.data_scadenza,
                COALESCE(l.data_inserimento, l.data_ricevimento) + a.durata_giorni) - CURRENT_DATE AS giorni_residui,
       COALESCE(SUM(m.quantita), 0)::numeric(14,3) AS residuo
  FROM mag_lotti l
  JOIN mag_articoli a ON a.id = l.articolo_id
  LEFT JOIN mag_movimenti m ON m.lotto_id = l.id
 GROUP BY l.id, a.id;

-- ── SCARICO PER LOTTO (FEFO) ─────────────────────────────────────────
-- Scarica `p_quantita` (positiva) dai lotti in ordine di scadenza; il resto
-- senza lotto. Fuori dalla vendita, se manca merce, fallisce tutto.
CREATE OR REPLACE FUNCTION mag_scarica(
  p_articolo UUID, p_quantita NUMERIC, p_tipo mag_movimento_tipo,
  p_riferimento_tipo TEXT DEFAULT NULL, p_riferimento_id UUID DEFAULT NULL, p_note TEXT DEFAULT NULL)
RETURNS NUMERIC            -- quantità coperta dai lotti
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  v_resto NUMERIC := p_quantita;
  v_coperta NUMERIC := 0;
  l RECORD;
  v_q NUMERIC;
BEGIN
  IF p_quantita <= 0 THEN
    RAISE EXCEPTION 'La quantità da scaricare deve essere positiva';
  END IF;
  IF p_tipo IN ('carico', 'reso_cliente', 'inventario', 'trasferimento') THEN
    RAISE EXCEPTION 'mag_scarica serve solo per le uscite';
  END IF;
  FOR l IN
    SELECT s.lotto_id, s.residuo FROM mag_lotti_stato s
     WHERE s.articolo_id = p_articolo AND s.residuo > 0
     ORDER BY s.data_scadenza NULLS LAST, s.data_ricevimento, s.lotto_id
  LOOP
    EXIT WHEN v_resto <= 0;
    v_q := LEAST(v_resto, l.residuo);
    INSERT INTO mag_movimenti (articolo_id, lotto_id, tipo, quantita, riferimento_tipo, riferimento_id, note, created_by)
    VALUES (p_articolo, l.lotto_id, p_tipo, -v_q, p_riferimento_tipo, p_riferimento_id, p_note, auth.uid());
    v_resto := v_resto - v_q;
    v_coperta := v_coperta + v_q;
  END LOOP;
  IF v_resto > 0 THEN
    -- senza lotto: per la vendita è ammesso (anomalia visibile), per il
    -- resto il controllo del trigger rifiuta se la giacenza non basta.
    INSERT INTO mag_movimenti (articolo_id, tipo, quantita, riferimento_tipo, riferimento_id, note, created_by)
    VALUES (p_articolo, p_tipo, -v_resto, p_riferimento_tipo, p_riferimento_id, p_note, auth.uid());
  END IF;
  RETURN v_coperta;
END;
$$;

-- ── INVENTARI ────────────────────────────────────────────────────────
CREATE TABLE mag_inventari (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo      TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  descrizione TEXT,
  stato       mag_inventario_stato NOT NULL DEFAULT 'aperto',
  chiuso_at   TIMESTAMPTZ,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);
CREATE TABLE mag_inventari_righe (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id    UUID NOT NULL REFERENCES mag_inventari(id) ON DELETE CASCADE,
  modulo           TEXT NOT NULL,
  articolo_id      UUID NOT NULL REFERENCES mag_articoli(id) ON DELETE CASCADE,
  lotto_id         UUID REFERENCES mag_lotti(id) ON DELETE SET NULL,
  quantita_contata NUMERIC(14,3) NOT NULL CHECK (quantita_contata >= 0),
  giacenza_teorica NUMERIC(14,3),             -- fissata alla chiusura
  differenza       NUMERIC(14,3),
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id),
  UNIQUE (inventario_id, articolo_id, lotto_id)
);
CREATE TRIGGER mag_inventari_righe_modulo BEFORE INSERT OR UPDATE OF articolo_id ON mag_inventari_righe
  FOR EACH ROW EXECUTE FUNCTION mag_eredita_modulo();

-- Chiude l'inventario: le differenze diventano movimenti di rettifica.
CREATE OR REPLACE FUNCTION chiudi_inventario(p_inventario UUID)
RETURNS INTEGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  r RECORD;
  v_teorica NUMERIC;
  n INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM mag_inventari WHERE id = p_inventario AND stato = 'aperto') THEN
    RAISE EXCEPTION 'Inventario inesistente o già chiuso';
  END IF;
  FOR r IN SELECT * FROM mag_inventari_righe WHERE inventario_id = p_inventario LOOP
    IF r.lotto_id IS NOT NULL THEN
      SELECT COALESCE(SUM(quantita), 0) INTO v_teorica FROM mag_movimenti WHERE lotto_id = r.lotto_id;
    ELSE
      SELECT COALESCE(SUM(quantita), 0) INTO v_teorica FROM mag_movimenti WHERE articolo_id = r.articolo_id;
    END IF;
    UPDATE mag_inventari_righe SET giacenza_teorica = v_teorica,
           differenza = r.quantita_contata - v_teorica WHERE id = r.id;
    IF r.quantita_contata <> v_teorica THEN
      INSERT INTO mag_movimenti (articolo_id, lotto_id, tipo, quantita, riferimento_tipo, riferimento_id, note, created_by)
      VALUES (r.articolo_id, r.lotto_id, 'inventario', r.quantita_contata - v_teorica,
              'inventario', p_inventario, 'Rettifica da inventario', auth.uid());
      n := n + 1;
    END IF;
  END LOOP;
  UPDATE mag_inventari SET stato = 'chiuso', chiuso_at = NOW() WHERE id = p_inventario;
  RETURN n;
END;
$$;

-- ── ORDINI AI FORNITORI E RICEVIMENTO MERCI ──────────────────────────
CREATE TABLE mag_ordini (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                 TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  codice                 TEXT UNIQUE,         -- ODF-AAAA-NNNN
  fornitore_id           UUID NOT NULL REFERENCES organizzazioni(id),
  stato                  mag_ordine_stato NOT NULL DEFAULT 'bozza',
  data_ordine            DATE NOT NULL DEFAULT CURRENT_DATE,
  data_consegna_prevista DATE,
  ddt_numero             TEXT,
  ddt_data               DATE,
  condizioni             TEXT,
  note                   TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES user_profiles(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_mag_ordini_modulo ON mag_ordini (modulo, stato, data_ordine DESC);
CREATE OR REPLACE FUNCTION mag_ordine_set_codice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.codice := genera_codice('ODF');
  RETURN NEW;
END;
$$;
CREATE TRIGGER mag_ordini_set_codice BEFORE INSERT ON mag_ordini
  FOR EACH ROW WHEN (NEW.codice IS NULL) EXECUTE FUNCTION mag_ordine_set_codice();

CREATE TABLE mag_ordini_righe (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordine_id          UUID NOT NULL REFERENCES mag_ordini(id) ON DELETE CASCADE,
  modulo             TEXT NOT NULL,
  articolo_id        UUID NOT NULL REFERENCES mag_articoli(id),
  quantita_ordinata  NUMERIC(14,3) NOT NULL CHECK (quantita_ordinata > 0),
  quantita_ricevuta  NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantita_ricevuta >= 0),
  prezzo_unitario    NUMERIC(12,4),
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_mag_ordini_righe_ordine ON mag_ordini_righe (ordine_id);
CREATE TRIGGER mag_ordini_righe_modulo BEFORE INSERT OR UPDATE OF articolo_id ON mag_ordini_righe
  FOR EACH ROW EXECUTE FUNCTION mag_eredita_modulo();
ALTER TABLE mag_lotti ADD CONSTRAINT mag_lotti_ordine_riga_fk
  FOREIGN KEY (ordine_riga_id) REFERENCES mag_ordini_righe(id) ON DELETE SET NULL;

-- Ricevimento di una riga: crea il lotto, carica il magazzino al prezzo
-- d'acquisto, aggiorna la riga e lo stato dell'ordine.
CREATE OR REPLACE FUNCTION ricevi_riga_ordine(
  p_riga UUID, p_quantita NUMERIC, p_codice_lotto TEXT DEFAULT NULL,
  p_scadenza DATE DEFAULT NULL, p_temperatura NUMERIC DEFAULT NULL, p_ubicazione TEXT DEFAULT NULL)
RETURNS UUID               -- il lotto creato
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  r mag_ordini_righe%ROWTYPE;
  o mag_ordini%ROWTYPE;
  v_lotto UUID;
BEGIN
  IF p_quantita <= 0 THEN RAISE EXCEPTION 'Quantità ricevuta non valida'; END IF;
  SELECT * INTO r FROM mag_ordini_righe WHERE id = p_riga FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Riga d''ordine inesistente'; END IF;
  SELECT * INTO o FROM mag_ordini WHERE id = r.ordine_id;
  IF o.stato IN ('bozza', 'annullato', 'ricevuto') THEN
    RAISE EXCEPTION 'L''ordine non è in attesa di merce (stato %)', o.stato;
  END IF;

  INSERT INTO mag_lotti (articolo_id, codice_lotto, fornitore_id, data_ricevimento, data_scadenza,
                         temperatura_ricevimento, ubicazione, ordine_riga_id, created_by)
  VALUES (r.articolo_id, p_codice_lotto, o.fornitore_id, CURRENT_DATE, p_scadenza,
          p_temperatura, p_ubicazione, r.id, auth.uid())
  RETURNING id INTO v_lotto;

  INSERT INTO mag_movimenti (articolo_id, lotto_id, tipo, quantita, costo_unitario,
                             riferimento_tipo, riferimento_id, note, created_by)
  VALUES (r.articolo_id, v_lotto, 'carico', p_quantita, r.prezzo_unitario,
          'ordine', o.id, 'Ricevimento ' || COALESCE(o.codice, ''), auth.uid());

  UPDATE mag_ordini_righe SET quantita_ricevuta = quantita_ricevuta + p_quantita WHERE id = r.id;
  -- il costo dell'articolo segue l'ultimo acquisto
  IF r.prezzo_unitario IS NOT NULL THEN
    UPDATE mag_articoli SET costo_unitario = r.prezzo_unitario WHERE id = r.articolo_id;
  END IF;

  UPDATE mag_ordini SET stato = CASE
      WHEN NOT EXISTS (SELECT 1 FROM mag_ordini_righe
                        WHERE ordine_id = o.id AND quantita_ricevuta < quantita_ordinata)
        THEN 'ricevuto'::mag_ordine_stato
      ELSE 'ricevuto_parziale'::mag_ordine_stato END
   WHERE id = o.id;
  RETURN v_lotto;
END;
$$;

-- ── VALUTAZIONE DEI FORNITORI (vendor rating) ────────────────────────
CREATE TABLE fornitori_valutazioni (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  fornitore_id     UUID NOT NULL REFERENCES organizzazioni(id) ON DELETE CASCADE,
  ordine_id        UUID REFERENCES mag_ordini(id) ON DELETE SET NULL,
  data             DATE NOT NULL DEFAULT CURRENT_DATE,
  prezzo           SMALLINT CHECK (prezzo BETWEEN 1 AND 5),
  qualita          SMALLINT CHECK (qualita BETWEEN 1 AND 5),
  puntualita       SMALLINT CHECK (puntualita BETWEEN 1 AND 5),
  completezza      SMALLINT CHECK (completezza BETWEEN 1 AND 5),
  continuita       SMALLINT CHECK (continuita BETWEEN 1 AND 5),
  non_conformita   TEXT,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_fornitori_valutazioni ON fornitori_valutazioni (modulo, fornitore_id, data DESC);

CREATE VIEW fornitori_rating WITH (security_invoker = true) AS
SELECT modulo, fornitore_id,
       COUNT(*)::int AS valutazioni,
       ROUND(AVG(prezzo), 2) AS prezzo, ROUND(AVG(qualita), 2) AS qualita,
       ROUND(AVG(puntualita), 2) AS puntualita, ROUND(AVG(completezza), 2) AS completezza,
       ROUND(AVG(continuita), 2) AS continuita,
       COUNT(*) FILTER (WHERE non_conformita IS NOT NULL)::int AS non_conformita,
       ROUND((COALESCE(AVG(prezzo),0) + COALESCE(AVG(qualita),0) + COALESCE(AVG(puntualita),0)
              + COALESCE(AVG(completezza),0) + COALESCE(AVG(continuita),0))
             / NULLIF((AVG(prezzo) IS NOT NULL)::int + (AVG(qualita) IS NOT NULL)::int
                      + (AVG(puntualita) IS NOT NULL)::int + (AVG(completezza) IS NOT NULL)::int
                      + (AVG(continuita) IS NOT NULL)::int, 0), 2) AS punteggio
  FROM fornitori_valutazioni
 GROUP BY modulo, fornitore_id;

-- ── DISTINTA BASE (ricette, semilavorati, composizioni) ──────────────
CREATE TABLE distinte_base (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                 TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  codice                 TEXT,                -- DB-AAAA-NNNN se vuoto
  nome                   TEXT NOT NULL,
  tipo                   TEXT NOT NULL DEFAULT 'prodotto', -- ricetta, semilavorato, composizione, cocktail, pacchetto…
  categoria              TEXT,
  resa                   NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (resa > 0),  -- porzioni o pezzi prodotti
  unita_resa             TEXT NOT NULL DEFAULT 'porzione',
  articolo_prodotto_id   UUID REFERENCES mag_articoli(id) ON DELETE SET NULL, -- se il prodotto si stocca
  procedimento           TEXT,
  tempo_preparazione_min INT CHECK (tempo_preparazione_min >= 0),
  prezzo_vendita         NUMERIC(12,2) CHECK (prezzo_vendita >= 0),
  attributi              JSONB NOT NULL DEFAULT '{}'::jsonb, -- stile, colori, foto, varianti…
  attivo                 BOOLEAN NOT NULL DEFAULT true,
  note                   TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES user_profiles(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES user_profiles(id),
  UNIQUE (modulo, codice)
);
CREATE INDEX idx_distinte_base_modulo ON distinte_base (modulo, tipo, attivo);
CREATE OR REPLACE FUNCTION distinta_set_codice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.codice := genera_codice('DB');
  RETURN NEW;
END;
$$;
CREATE TRIGGER distinte_base_set_codice BEFORE INSERT ON distinte_base
  FOR EACH ROW WHEN (NEW.codice IS NULL) EXECUTE FUNCTION distinta_set_codice();

CREATE TABLE distinte_base_righe (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distinta_id        UUID NOT NULL REFERENCES distinte_base(id) ON DELETE CASCADE,
  modulo             TEXT NOT NULL,
  articolo_id        UUID REFERENCES mag_articoli(id) ON DELETE RESTRICT,
  sotto_distinta_id  UUID REFERENCES distinte_base(id) ON DELETE RESTRICT,
  quantita           NUMERIC(14,4) NOT NULL CHECK (quantita > 0),  -- in unità dell'articolo o di resa
  scarto_percentuale NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (scarto_percentuale >= 0 AND scarto_percentuale < 100),
  sostituibile       BOOLEAN NOT NULL DEFAULT false,
  ordine             INT NOT NULL DEFAULT 0,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id),
  CONSTRAINT distinte_base_righe_un_componente CHECK ((articolo_id IS NULL) <> (sotto_distinta_id IS NULL))
);
CREATE INDEX idx_distinte_base_righe ON distinte_base_righe (distinta_id, ordine);
CREATE INDEX idx_distinte_base_righe_sotto ON distinte_base_righe (sotto_distinta_id) WHERE sotto_distinta_id IS NOT NULL;

-- modulo della riga = modulo della distinta; ciclo rifiutato.
CREATE OR REPLACE FUNCTION distinta_riga_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  SELECT modulo INTO NEW.modulo FROM distinte_base WHERE id = NEW.distinta_id;
  IF NEW.sotto_distinta_id IS NOT NULL THEN
    IF NEW.sotto_distinta_id = NEW.distinta_id OR EXISTS (
      WITH RECURSIVE sotto(id) AS (
        SELECT NEW.sotto_distinta_id
        UNION
        SELECT r.sotto_distinta_id FROM distinte_base_righe r JOIN sotto s ON r.distinta_id = s.id
         WHERE r.sotto_distinta_id IS NOT NULL
      )
      SELECT 1 FROM sotto WHERE id = NEW.distinta_id
    ) THEN
      RAISE EXCEPTION 'Una distinta non può contenere sé stessa (ciclo)' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER distinte_base_righe_controlla BEFORE INSERT OR UPDATE ON distinte_base_righe
  FOR EACH ROW EXECUTE FUNCTION distinta_riga_controlla();

-- Costo per UNITÀ DI RESA (una porzione, un bouquet): somma dei componenti
-- con lo scarto, diviso la resa. Ricorsivo sui semilavorati.
CREATE OR REPLACE FUNCTION costo_distinta(p_distinta UUID, p_profondita INT DEFAULT 0)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  v_totale NUMERIC := 0;
  v_resa NUMERIC;
  r RECORD;
BEGIN
  IF p_profondita > 20 THEN RAISE EXCEPTION 'Distinta troppo profonda'; END IF;
  SELECT resa INTO v_resa FROM distinte_base WHERE id = p_distinta;
  IF v_resa IS NULL THEN RETURN NULL; END IF;
  FOR r IN
    SELECT dr.quantita, dr.scarto_percentuale, dr.sotto_distinta_id, a.costo_unitario
      FROM distinte_base_righe dr LEFT JOIN mag_articoli a ON a.id = dr.articolo_id
     WHERE dr.distinta_id = p_distinta
  LOOP
    v_totale := v_totale + r.quantita / (1 - r.scarto_percentuale / 100.0) *
      CASE WHEN r.sotto_distinta_id IS NOT NULL
           THEN COALESCE(costo_distinta(r.sotto_distinta_id, p_profondita + 1), 0)
           ELSE COALESCE(r.costo_unitario, 0) END;
  END LOOP;
  RETURN ROUND(v_totale / v_resa, 4);
END;
$$;

-- Allergeni ereditati da tutti i componenti, anche nei semilavorati.
CREATE OR REPLACE FUNCTION allergeni_distinta(p_distinta UUID)
RETURNS TEXT[]
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH RECURSIVE albero(distinta_id) AS (
    SELECT p_distinta
    UNION
    SELECT r.sotto_distinta_id FROM distinte_base_righe r JOIN albero t ON r.distinta_id = t.distinta_id
     WHERE r.sotto_distinta_id IS NOT NULL
  )
  SELECT COALESCE(array_agg(DISTINCT x ORDER BY x), '{}')
    FROM albero t
    JOIN distinte_base_righe r ON r.distinta_id = t.distinta_id
    JOIN mag_articoli a ON a.id = r.articolo_id
    CROSS JOIN LATERAL unnest(a.allergeni) AS x
$$;

-- Quantità di ogni materia prima per produrre `p_unita` unità di resa.
CREATE OR REPLACE FUNCTION esplodi_distinta(p_distinta UUID, p_unita NUMERIC DEFAULT 1)
RETURNS TABLE (articolo_id UUID, quantita NUMERIC)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH RECURSIVE esplosione(distinta_id, fattore, livello) AS (
    SELECT p_distinta, p_unita / (SELECT resa FROM distinte_base WHERE id = p_distinta), 0
    UNION ALL
    SELECT r.sotto_distinta_id,
           e.fattore * r.quantita / (1 - r.scarto_percentuale / 100.0)
             / (SELECT resa FROM distinte_base WHERE id = r.sotto_distinta_id),
           e.livello + 1
      FROM esplosione e JOIN distinte_base_righe r ON r.distinta_id = e.distinta_id
     WHERE r.sotto_distinta_id IS NOT NULL AND e.livello < 20
  )
  SELECT r.articolo_id, ROUND(SUM(e.fattore * r.quantita / (1 - r.scarto_percentuale / 100.0)), 4)
    FROM esplosione e JOIN distinte_base_righe r ON r.distinta_id = e.distinta_id
   WHERE r.articolo_id IS NOT NULL
   GROUP BY r.articolo_id
$$;

-- Scarico teorico di una distinta (vendita di un piatto, produzione di una
-- composizione): esplode e scarica ogni materia prima per lotto.
CREATE OR REPLACE FUNCTION scarica_distinta(
  p_distinta UUID, p_unita NUMERIC, p_tipo mag_movimento_tipo DEFAULT 'vendita',
  p_riferimento_tipo TEXT DEFAULT NULL, p_riferimento_id UUID DEFAULT NULL)
RETURNS INTEGER            -- materie prime scaricate
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  e RECORD;
  n INTEGER := 0;
BEGIN
  FOR e IN SELECT * FROM esplodi_distinta(p_distinta, p_unita) LOOP
    PERFORM mag_scarica(e.articolo_id, e.quantita, p_tipo, p_riferimento_tipo, p_riferimento_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ── PROPOSTA DI RIORDINO ─────────────────────────────────────────────
-- Articoli sotto scorta: si propone di tornare alla scorta minima più una
-- settimana di consumo medio (ultimi 30 giorni). I moduli possono
-- aggiungere i loro fattori (eventi, ordini futuri, stagionalità).
CREATE OR REPLACE FUNCTION mag_proposta_riordino(p_modulo TEXT)
RETURNS TABLE (articolo_id UUID, descrizione TEXT, fornitore_id UUID, unita_misura TEXT,
               giacenza NUMERIC, scorta_minima NUMERIC, consumo_medio_giorno NUMERIC,
               quantita_proposta NUMERIC)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT g.articolo_id, g.descrizione, a.fornitore_id, g.unita_misura, g.giacenza, g.scorta_minima,
         ROUND(COALESCE(c.uscite, 0) / 30.0, 3) AS consumo_medio_giorno,
         CEIL(g.scorta_minima + COALESCE(c.uscite, 0) / 30.0 * 7 - g.giacenza) AS quantita_proposta
    FROM mag_giacenze g
    JOIN mag_articoli a ON a.id = g.articolo_id
    LEFT JOIN (
      SELECT m.articolo_id, -SUM(m.quantita) AS uscite
        FROM mag_movimenti m
       WHERE m.quantita < 0 AND m.tipo NOT IN ('inventario', 'trasferimento')
         AND m.eseguito_at > NOW() - INTERVAL '30 days'
       GROUP BY m.articolo_id
    ) c ON c.articolo_id = g.articolo_id
   WHERE g.modulo = p_modulo AND g.giacenza < g.scorta_minima
   ORDER BY g.descrizione
$$;

-- ═══ TRIGGER COMUNI, RLS, PROTEZIONI ═════════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  -- updated_at, autore congelato, audit (i movimenti hanno solo l'audit:
  -- non si modificano)
  FOREACH t IN ARRAY ARRAY['mag_articoli','mag_lotti','mag_inventari','mag_inventari_righe',
                           'mag_ordini','mag_ordini_righe','fornitori_valutazioni',
                           'distinte_base','distinte_base_righe'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;
  EXECUTE 'CREATE TRIGGER mag_movimenti_audit AFTER INSERT ON mag_movimenti FOR EACH ROW EXECUTE FUNCTION log_audit()';

  -- Tabelle di lavoro: chi ha la licenza del modulo legge e scrive;
  -- cancella solo l'admin.
  FOREACH t IN ARRAY ARRAY['mag_articoli','mag_lotti','mag_inventari','mag_inventari_righe',
                           'mag_ordini','mag_ordini_righe','fornitori_valutazioni',
                           'distinte_base','distinte_base_righe'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_attivo(modulo))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;

  -- Registro dei movimenti: si legge e si aggiunge, mai modificato o
  -- cancellato (nessuna policy UPDATE/DELETE).
  ALTER TABLE mag_movimenti ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "mag_movimenti_select" ON mag_movimenti FOR SELECT TO authenticated
    USING (modulo_attivo(modulo));
  CREATE POLICY "mag_movimenti_insert" ON mag_movimenti FOR INSERT TO authenticated
    WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid());
END $$;

-- Il modulo dell'insert arriva dal trigger: la policy INSERT vede già il
-- valore corretto (i BEFORE trigger girano prima del WITH CHECK).

GRANT SELECT ON mag_giacenze, mag_lotti_stato, fornitori_rating TO authenticated;

-- Funzioni interne dei trigger: nessuno le chiama a mano.
DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['mag_articolo_set_codice()','mag_eredita_modulo()','mag_movimento_controlla()',
                           'mag_ordine_set_codice()','distinta_set_codice()','distinta_riga_controlla()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  -- Funzioni di lavoro: girano con i permessi dell'utente (RLS valida).
  FOREACH f IN ARRAY ARRAY['mag_scarica(uuid,numeric,mag_movimento_tipo,text,uuid,text)',
                           'chiudi_inventario(uuid)',
                           'ricevi_riga_ordine(uuid,numeric,text,date,numeric,text)',
                           'costo_distinta(uuid,integer)','allergeni_distinta(uuid)',
                           'esplodi_distinta(uuid,numeric)',
                           'scarica_distinta(uuid,numeric,mag_movimento_tipo,text,uuid)',
                           'mag_proposta_riordino(text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT applica_protezioni_tabelle();
