-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Bar (Sprint 2): il banco sul motore fb_ del Ristorante.
--
-- Il Bar usa le stesse tabelle fb_* (locale, sala, comande, postazioni,
-- listini, promozioni). Qui c'è solo ciò che il documento Bar aggiunge:
--   §15  fedeltà a timbri per prodotto («10 caffè → 1 omaggio»)
--   §20  clienti aziendali e convenzioni con limiti di spesa e fattura periodica
--   §22  riordino previsionale (vendite, stagionalità, eventi, ordini futuri)
--   §29  mescita: bottiglia e fusto aperti, consumo teorico contro reale
--   §30  margine per fascia oraria
--   §31–33 KPI operativi e cruscotto della direzione
-- Le tabelle bar_* stanno dietro la licenza del Bar (modulo = 'bar').
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. FEDELTÀ A TIMBRI PER PRODOTTO ═══════════════════════════════
-- Vuoto = un timbro per acquisto (com'era). Pieno = un timbro per ogni
-- pezzo dei prodotti o delle categorie indicati.
ALTER TABLE fid_programmi
  ADD COLUMN timbri_prodotti    UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN premio_prodotto_id UUID;   -- l'omaggio: se vuoto, uno qualsiasi dei prodotti a timbro

-- Pezzi che danno timbro su un conto del motore fb_.
CREATE OR REPLACE FUNCTION fid_timbri_conto(p_riferimenti UUID[], p_conto UUID)
RETURNS INT
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT COALESCE(floor(SUM(cr.quantita)), 0)::int
    FROM conti_righe cr
    JOIN fb_comande_righe r ON cr.riferimento_tipo = 'fb_comande_righe' AND r.id = cr.riferimento_id
    JOIN fb_prodotti p ON p.id = r.prodotto_id
   WHERE cr.conto_id = p_conto AND NOT cr.stornata AND cr.sconto_percentuale < 100 AND NOT r.omaggio
     AND (p.id = ANY (p_riferimenti) OR p.categoria_id = ANY (p_riferimenti))
$$;

CREATE OR REPLACE FUNCTION fid_registra_acquisto(p_tessera UUID, p_importo NUMERIC,
                                                 p_rif_tipo TEXT DEFAULT NULL, p_rif_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  p fid_programmi%ROWTYPE;
  v_punti INT;
  v_timbri INT;
BEGIN
  SELECT pr.* INTO p FROM fid_tessere t JOIN fid_programmi pr ON pr.id = t.programma_id WHERE t.id = p_tessera;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Tessera inesistente'; END IF;
  IF NOT p.attivo THEN RAISE EXCEPTION 'Programma non attivo' USING ERRCODE = 'check_violation'; END IF;
  v_punti := floor(GREATEST(p_importo, 0) * p.punti_per_euro);
  v_timbri := CASE
    WHEN p.timbri_soglia IS NULL THEN 0
    WHEN cardinality(p.timbri_prodotti) = 0 THEN 1
    WHEN p_rif_tipo = 'conto' THEN fid_timbri_conto(p.timbri_prodotti, p_rif_id)
    ELSE 0 END;
  IF v_punti > 0 OR v_timbri > 0 THEN
    INSERT INTO fid_movimenti (tessera_id, tipo, punti, timbri, importo, riferimento_tipo, riferimento_id, created_by)
    VALUES (p_tessera, 'accumulo', v_punti, v_timbri, p_importo, p_rif_tipo, p_rif_id, auth.uid());
  END IF;
  RETURN (SELECT jsonb_build_object('punti_aggiunti', v_punti, 'timbri_aggiunti', v_timbri,
                                    'punti', punti, 'timbri', timbri, 'premi_disponibili', premi_disponibili)
            FROM fid_saldi WHERE tessera_id = p_tessera);
END;
$$;

-- Premio a timbri ritirato alla cassa: il pezzo meno caro tra quelli che
-- valgono come premio diventa sconto del conto (come i punti).
CREATE OR REPLACE FUNCTION fid_omaggio_su_conto(p_tessera UUID, p_conto UUID)
RETURNS TEXT
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  p fid_programmi%ROWTYPE;
  v_timbri INT;
  v_rif UUID[];
  v_riga RECORD;
  v_residuo NUMERIC;
BEGIN
  SELECT pr.* INTO p FROM fid_tessere t JOIN fid_programmi pr ON pr.id = t.programma_id
   WHERE t.id = p_tessera AND t.attiva;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Tessera inesistente o non attiva'; END IF;
  IF p.timbri_soglia IS NULL THEN
    RAISE EXCEPTION 'Il programma non prevede premi a timbri' USING ERRCODE = 'check_violation';
  END IF;
  SELECT timbri INTO v_timbri FROM fid_saldi WHERE tessera_id = p_tessera;
  IF COALESCE(v_timbri, 0) < p.timbri_soglia THEN
    RAISE EXCEPTION 'Timbri insufficienti: % su %', COALESCE(v_timbri, 0), p.timbri_soglia USING ERRCODE = 'check_violation';
  END IF;
  PERFORM 1 FROM conti WHERE id = p_conto AND stato = 'aperto' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Il conto non è aperto' USING ERRCODE = 'check_violation'; END IF;

  v_rif := CASE WHEN p.premio_prodotto_id IS NOT NULL THEN ARRAY[p.premio_prodotto_id] ELSE p.timbri_prodotti END;
  IF cardinality(v_rif) = 0 THEN
    RAISE EXCEPTION 'Indica nel programma il prodotto in omaggio' USING ERRCODE = 'check_violation';
  END IF;
  SELECT cr.prezzo_unitario, fp.nome INTO v_riga
    FROM conti_righe cr
    JOIN fb_comande_righe r ON cr.riferimento_tipo = 'fb_comande_righe' AND r.id = cr.riferimento_id
    JOIN fb_prodotti fp ON fp.id = r.prodotto_id
   WHERE cr.conto_id = p_conto AND NOT cr.stornata AND cr.sconto_percentuale < 100 AND cr.prezzo_unitario > 0
     AND (fp.id = ANY (v_rif) OR fp.categoria_id = ANY (v_rif))
   ORDER BY cr.prezzo_unitario, cr.created_at
   LIMIT 1;
  IF v_riga IS NULL THEN
    RAISE EXCEPTION 'Sul conto non c''è il prodotto in omaggio: aggiungilo prima' USING ERRCODE = 'check_violation';
  END IF;
  SELECT residuo INTO v_residuo FROM conti_saldi WHERE conto_id = p_conto;
  IF v_riga.prezzo_unitario > v_residuo + 0.005 THEN
    RAISE EXCEPTION 'L''omaggio supera il residuo del conto' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO fid_movimenti (tessera_id, tipo, timbri, riferimento_tipo, riferimento_id, note, created_by)
  VALUES (p_tessera, 'premio', -p.timbri_soglia, 'conto', p_conto,
          'Omaggio: ' || v_riga.nome || ' (' || replace(to_char(v_riga.prezzo_unitario, 'FM999999990.00'), '.', ',') || ' €)', auth.uid());
  UPDATE conti SET sconto_importo = sconto_importo + v_riga.prezzo_unitario,
                   note = concat_ws(' · ', note, 'Omaggio fedeltà: ' || v_riga.nome)
   WHERE id = p_conto;
  RETURN v_riga.nome;
END;
$$;

-- ═══ 2. CONVENZIONI CON LE AZIENDE ══════════════════════════════════
CREATE TABLE bar_convenzioni (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale_id                     UUID NOT NULL REFERENCES fb_locali(id) ON DELETE CASCADE,
  modulo                        TEXT NOT NULL DEFAULT 'bar' CHECK (modulo = 'bar'),
  codice                        TEXT UNIQUE,                 -- CNV-AAAA-NNNN
  organizzazione_id             UUID NOT NULL REFERENCES organizzazioni(id) ON DELETE RESTRICT,
  referente_id                  UUID REFERENCES contatti(id) ON DELETE SET NULL,
  menu_id                       UUID REFERENCES fb_menu(id) ON DELETE SET NULL,   -- listino convenzionato
  limite_mensile_azienda        NUMERIC(12,2) CHECK (limite_mensile_azienda > 0),
  limite_mensile_dipendente     NUMERIC(12,2) CHECK (limite_mensile_dipendente > 0),
  limite_giornaliero_dipendente NUMERIC(12,2) CHECK (limite_giornaliero_dipendente > 0),
  fatturazione                  TEXT NOT NULL DEFAULT 'mensile'
                                  CHECK (fatturazione IN ('settimanale', 'quindicinale', 'mensile')),
  giorni_pagamento              INT NOT NULL DEFAULT 30 CHECK (giorni_pagamento BETWEEN 0 AND 180),
  valida_dal                    DATE NOT NULL DEFAULT CURRENT_DATE,
  valida_al                     DATE,
  attiva                        BOOLEAN NOT NULL DEFAULT true,
  note                          TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                    UUID REFERENCES user_profiles(id),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                    UUID REFERENCES user_profiles(id),
  UNIQUE (locale_id, organizzazione_id),
  CHECK (valida_al IS NULL OR valida_al >= valida_dal)
);

CREATE TABLE bar_convenzioni_dipendenti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convenzione_id  UUID NOT NULL REFERENCES bar_convenzioni(id) ON DELETE CASCADE,
  modulo          TEXT NOT NULL DEFAULT 'bar' CHECK (modulo = 'bar'),
  contatto_id     UUID REFERENCES contatti(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  codice_tessera  TEXT,                     -- badge aziendale o tessera
  limite_mensile  NUMERIC(12,2) CHECK (limite_mensile > 0),   -- se diverso da quello della convenzione
  attivo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id),
  UNIQUE (convenzione_id, codice_tessera)
);
CREATE INDEX idx_bar_conv_dip_convenzione ON bar_convenzioni_dipendenti (convenzione_id);

-- Ogni consumazione addebitata all'azienda: nasce da un pagamento
-- «conto aziendale» e finisce nella fattura periodica.
CREATE TABLE bar_convenzioni_addebiti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convenzione_id  UUID NOT NULL REFERENCES bar_convenzioni(id) ON DELETE RESTRICT,
  dipendente_id   UUID NOT NULL REFERENCES bar_convenzioni_dipendenti(id) ON DELETE RESTRICT,
  modulo          TEXT NOT NULL DEFAULT 'bar' CHECK (modulo = 'bar'),
  conto_id        UUID NOT NULL REFERENCES conti(id) ON DELETE RESTRICT,
  pagamento_id    UUID NOT NULL UNIQUE REFERENCES conti_pagamenti(id) ON DELETE CASCADE,
  importo         NUMERIC(12,2) NOT NULL CHECK (importo > 0),
  per_aliquota    JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{"aliquota":10,"importo":4.5}] per la fattura
  addebitato_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fattura_id      UUID REFERENCES fatture(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_bar_addebiti_convenzione ON bar_convenzioni_addebiti (convenzione_id, addebitato_at);
CREATE INDEX idx_bar_addebiti_dipendente ON bar_convenzioni_addebiti (dipendente_id, addebitato_at);

-- La comanda sa per quale dipendente convenzionato è: prezzi del listino
-- della convenzione e, alla cassa, l'addebito già pronto.
ALTER TABLE fb_comande
  ADD COLUMN convenzione_dipendente_id UUID REFERENCES bar_convenzioni_dipendenti(id) ON DELETE SET NULL;

-- Un listino «convenzionato» non vale mai per tutti: senza convenzione
-- collegata ha una tipologia che nessuna comanda porta.
CREATE OR REPLACE FUNCTION fb_menu_convenzionato()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.tipo = 'convenzionato' AND NEW.tipologia_cliente IS NULL THEN
    NEW.tipologia_cliente := 'convenzionato';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_menu_convenzionato BEFORE INSERT OR UPDATE OF tipo, tipologia_cliente ON fb_menu
  FOR EACH ROW EXECUTE FUNCTION fb_menu_convenzionato();
UPDATE fb_menu SET tipologia_cliente = 'convenzionato' WHERE tipo = 'convenzionato' AND tipologia_cliente IS NULL;

CREATE OR REPLACE FUNCTION bar_convenzione_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF (SELECT modulo FROM fb_locali WHERE id = NEW.locale_id) IS DISTINCT FROM 'bar' THEN
    RAISE EXCEPTION 'Le convenzioni sono del modulo Bar' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('CNV'); END IF;
  IF NEW.menu_id IS NOT NULL THEN
    IF (SELECT locale_id FROM fb_menu WHERE id = NEW.menu_id) IS DISTINCT FROM NEW.locale_id THEN
      RAISE EXCEPTION 'Il listino è di un altro locale' USING ERRCODE = 'check_violation';
    END IF;
    UPDATE fb_menu SET tipo = 'convenzionato', tipologia_cliente = 'convenzione:' || NEW.id WHERE id = NEW.menu_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER bar_convenzioni_prepara BEFORE INSERT OR UPDATE OF locale_id, menu_id ON bar_convenzioni
  FOR EACH ROW EXECUTE FUNCTION bar_convenzione_prepara();

CREATE OR REPLACE FUNCTION fb_comanda_convenzione()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  d bar_convenzioni_dipendenti%ROWTYPE;
  c bar_convenzioni%ROWTYPE;
BEGIN
  IF NEW.convenzione_dipendente_id IS NULL THEN
    IF TG_OP = 'UPDATE' AND OLD.convenzione_dipendente_id IS NOT NULL
       AND NEW.tipologia_cliente LIKE 'convenzione:%' THEN
      NEW.tipologia_cliente := NULL;
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO d FROM bar_convenzioni_dipendenti WHERE id = NEW.convenzione_dipendente_id;
  SELECT * INTO c FROM bar_convenzioni WHERE id = d.convenzione_id;
  IF c.locale_id IS DISTINCT FROM NEW.locale_id THEN
    RAISE EXCEPTION 'La convenzione è di un altro locale' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT d.attivo OR NOT c.attiva THEN
    RAISE EXCEPTION 'Convenzione o dipendente non attivi' USING ERRCODE = 'check_violation';
  END IF;
  NEW.tipologia_cliente := 'convenzione:' || c.id;
  NEW.contatto_id := COALESCE(NEW.contatto_id, d.contatto_id);
  NEW.cliente_nome := COALESCE(NEW.cliente_nome, d.nome);
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_comande_convenzione BEFORE INSERT OR UPDATE OF convenzione_dipendente_id ON fb_comande
  FOR EACH ROW EXECUTE FUNCTION fb_comanda_convenzione();

-- Importi e quantità nei messaggi, all'italiana (2,60 · 0,25 · 14,3).
CREATE OR REPLACE FUNCTION bar_euro(p NUMERIC)
RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT replace(to_char(p, 'FM999999990.00'), '.', ',')
$$;
CREATE OR REPLACE FUNCTION bar_numero(p NUMERIC)
RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT regexp_replace(replace(to_char(p, 'FM999999990.000'), '.', ','), ',?0+$', '')
$$;

-- Limiti di spesa: controllati sotto chiave della convenzione, così due
-- addebiti contemporanei non superano insieme il tetto.
CREATE OR REPLACE FUNCTION bar_addebito_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c bar_convenzioni%ROWTYPE;
  d bar_convenzioni_dipendenti%ROWTYPE;
  pg conti_pagamenti%ROWTYPE;
  v_oggi DATE := (NOW() AT TIME ZONE 'Europe/Rome')::date;
  v_mese DATE := date_trunc('month', NOW() AT TIME ZONE 'Europe/Rome')::date;
  v_azienda NUMERIC;
  v_dip_mese NUMERIC;
  v_dip_giorno NUMERIC;
  v_limite NUMERIC;
  v_totale NUMERIC;
  v_resto NUMERIC;
  v_quota NUMERIC;
  v_parti JSONB := '[]'::jsonb;
  a RECORD;
  n INT;
  i INT := 0;
BEGIN
  SELECT * INTO c FROM bar_convenzioni WHERE id = NEW.convenzione_id FOR UPDATE;
  SELECT * INTO d FROM bar_convenzioni_dipendenti WHERE id = NEW.dipendente_id;
  SELECT * INTO pg FROM conti_pagamenti WHERE id = NEW.pagamento_id;
  IF d.convenzione_id IS DISTINCT FROM c.id THEN
    RAISE EXCEPTION 'Il dipendente non è di questa convenzione' USING ERRCODE = 'check_violation';
  END IF;
  IF pg.conto_id IS DISTINCT FROM NEW.conto_id OR pg.metodo <> 'conto_aziendale'
     OR pg.organizzazione_id IS DISTINCT FROM c.organizzazione_id THEN
    RAISE EXCEPTION 'Il pagamento non è un addebito a questa azienda' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT c.attiva OR v_oggi < c.valida_dal OR (c.valida_al IS NOT NULL AND v_oggi > c.valida_al) THEN
    RAISE EXCEPTION 'Convenzione non attiva oggi' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT d.attivo THEN
    RAISE EXCEPTION '% non è più autorizzato dalla convenzione', d.nome USING ERRCODE = 'check_violation';
  END IF;

  SELECT COALESCE(SUM(importo), 0) INTO v_azienda FROM bar_convenzioni_addebiti
   WHERE convenzione_id = c.id AND (addebitato_at AT TIME ZONE 'Europe/Rome')::date >= v_mese;
  SELECT COALESCE(SUM(importo) FILTER (WHERE (addebitato_at AT TIME ZONE 'Europe/Rome')::date >= v_mese), 0),
         COALESCE(SUM(importo) FILTER (WHERE (addebitato_at AT TIME ZONE 'Europe/Rome')::date = v_oggi), 0)
    INTO v_dip_mese, v_dip_giorno
    FROM bar_convenzioni_addebiti WHERE dipendente_id = d.id;

  IF c.limite_mensile_azienda IS NOT NULL AND v_azienda + NEW.importo > c.limite_mensile_azienda + 0.005 THEN
    RAISE EXCEPTION 'Limite mensile dell''azienda superato: restano % €', bar_euro(GREATEST(c.limite_mensile_azienda - v_azienda, 0))
      USING ERRCODE = 'check_violation';
  END IF;
  v_limite := COALESCE(d.limite_mensile, c.limite_mensile_dipendente);
  IF v_limite IS NOT NULL AND v_dip_mese + NEW.importo > v_limite + 0.005 THEN
    RAISE EXCEPTION 'Limite mensile di % superato: restano % €', d.nome, bar_euro(GREATEST(v_limite - v_dip_mese, 0))
      USING ERRCODE = 'check_violation';
  END IF;
  IF c.limite_giornaliero_dipendente IS NOT NULL AND v_dip_giorno + NEW.importo > c.limite_giornaliero_dipendente + 0.005 THEN
    RAISE EXCEPTION 'Limite giornaliero di % superato: restano % €', d.nome, bar_euro(GREATEST(c.limite_giornaliero_dipendente - v_dip_giorno, 0))
      USING ERRCODE = 'check_violation';
  END IF;

  -- Quote per aliquota, in proporzione al conto (per la fattura).
  SELECT totale INTO v_totale FROM conti_saldi WHERE conto_id = NEW.conto_id;
  SELECT count(*) INTO n FROM conto_per_aliquota(NEW.conto_id);
  v_resto := NEW.importo;
  FOR a IN SELECT * FROM conto_per_aliquota(NEW.conto_id) ORDER BY aliquota_iva LOOP
    i := i + 1;
    v_quota := CASE WHEN i = n THEN v_resto ELSE ROUND(NEW.importo * a.importo / NULLIF(v_totale, 0), 2) END;
    v_resto := v_resto - v_quota;
    IF v_quota > 0 THEN
      v_parti := v_parti || jsonb_build_object('aliquota', a.aliquota_iva, 'importo', v_quota);
    END IF;
  END LOOP;
  IF jsonb_array_length(v_parti) = 0 THEN
    v_parti := jsonb_build_array(jsonb_build_object('aliquota', 10, 'importo', NEW.importo));
  END IF;
  NEW.per_aliquota := v_parti;
  NEW.addebitato_at := NOW();
  RETURN NEW;
END;
$$;
CREATE TRIGGER bar_addebiti_controlla BEFORE INSERT ON bar_convenzioni_addebiti
  FOR EACH ROW EXECUTE FUNCTION bar_addebito_controlla();

-- Già fatturato: non si storna più dalla cassa (serve una nota di credito).
CREATE OR REPLACE FUNCTION bar_addebito_fatturato()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.fattura_id IS NOT NULL THEN
    RAISE EXCEPTION 'Addebito già fatturato: si corregge con una nota di credito' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.importo, NEW.conto_id, NEW.pagamento_id, NEW.dipendente_id, NEW.convenzione_id)
                          IS DISTINCT FROM (OLD.importo, OLD.conto_id, OLD.pagamento_id, OLD.dipendente_id, OLD.convenzione_id) THEN
    RAISE EXCEPTION 'Un addebito non si modifica: si storna il pagamento' USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER bar_addebiti_fatturato BEFORE UPDATE OR DELETE ON bar_convenzioni_addebiti
  FOR EACH ROW EXECUTE FUNCTION bar_addebito_fatturato();

-- Alla cassa: addebito all'azienda per il dipendente, entro i limiti.
CREATE OR REPLACE FUNCTION bar_addebita_convenzione(p_conto UUID, p_dipendente UUID, p_importo NUMERIC)
RETURNS UUID
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  d bar_convenzioni_dipendenti%ROWTYPE;
  c bar_convenzioni%ROWTYPE;
  v_pagamento UUID;
BEGIN
  SELECT * INTO d FROM bar_convenzioni_dipendenti WHERE id = p_dipendente;
  SELECT * INTO c FROM bar_convenzioni WHERE id = d.convenzione_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Dipendente convenzionato inesistente'; END IF;
  INSERT INTO conti_pagamenti (conto_id, metodo, importo, organizzazione_id, riferimento, created_by)
  VALUES (p_conto, 'conto_aziendale', p_importo, c.organizzazione_id, c.codice || ' · ' || d.nome, auth.uid())
  RETURNING id INTO v_pagamento;
  INSERT INTO bar_convenzioni_addebiti (convenzione_id, dipendente_id, conto_id, pagamento_id, importo, created_by)
  VALUES (c.id, d.id, p_conto, v_pagamento, p_importo, auth.uid());
  RETURN v_pagamento;
END;
$$;

-- Fattura periodica (differita) delle consumazioni non ancora fatturate
-- fino al giorno indicato. Più aliquote: imponibile complessivo, totale
-- esatto e dettaglio per aliquota nelle note.
CREATE OR REPLACE FUNCTION bar_fattura_convenzione(p_convenzione UUID, p_al DATE, p_numero TEXT)
RETURNS UUID
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  c bar_convenzioni%ROWTYPE;
  v_ids UUID[];
  v_dal DATE;
  v_imponibile NUMERIC := 0;
  v_totale NUMERIC := 0;
  v_aliquota NUMERIC;
  v_dettaglio TEXT;
  v_fattura UUID;
BEGIN
  IF NOT puo_amministrazione() THEN
    RAISE EXCEPTION 'La fattura la emette la direzione' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO c FROM bar_convenzioni WHERE id = p_convenzione FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Convenzione inesistente'; END IF;
  SELECT array_agg(id), min((addebitato_at AT TIME ZONE 'Europe/Rome')::date) INTO v_ids, v_dal
    FROM bar_convenzioni_addebiti
   WHERE convenzione_id = c.id AND fattura_id IS NULL
     AND (addebitato_at AT TIME ZONE 'Europe/Rome')::date <= p_al;
  IF v_ids IS NULL THEN
    RAISE EXCEPTION 'Nessuna consumazione da fatturare fino al %', to_char(p_al, 'DD/MM/YYYY') USING ERRCODE = 'check_violation';
  END IF;

  WITH parti AS (
    SELECT (x->>'aliquota')::numeric AS aliquota, SUM((x->>'importo')::numeric) AS importo
      FROM bar_convenzioni_addebiti a, jsonb_array_elements(a.per_aliquota) x
     WHERE a.id = ANY (v_ids) GROUP BY 1
  )
  SELECT SUM(ROUND(importo / (1 + aliquota / 100), 2)), SUM(importo),
         (array_agg(aliquota ORDER BY importo DESC))[1],
         string_agg('IVA ' || aliquota || '%: imponibile ' || ROUND(importo / (1 + aliquota / 100), 2)
                    || ', totale ' || importo, '; ' ORDER BY aliquota)
    INTO v_imponibile, v_totale, v_aliquota, v_dettaglio FROM parti;

  INSERT INTO fatture (direzione, numero, data, organizzazione_id, imponibile, aliquota_iva, totale, scadenza, note, created_by)
  VALUES ('attiva', p_numero, CURRENT_DATE, c.organizzazione_id, v_imponibile, v_aliquota, v_totale,
          CURRENT_DATE + c.giorni_pagamento,
          'Convenzione ' || c.codice || ', consumazioni dal ' || to_char(v_dal, 'DD/MM/YYYY') || ' al '
            || to_char(p_al, 'DD/MM/YYYY') || ' (' || cardinality(v_ids) || '). ' || v_dettaglio,
          auth.uid())
  RETURNING id INTO v_fattura;
  UPDATE bar_convenzioni_addebiti SET fattura_id = v_fattura WHERE id = ANY (v_ids);
  RETURN v_fattura;
END;
$$;

-- Spesa del mese e residui, per la cassa e per la direzione.
CREATE VIEW bar_convenzioni_riepilogo WITH (security_invoker = true) AS
SELECT c.id AS convenzione_id, c.locale_id, c.modulo, c.codice, c.organizzazione_id, o.ragione_sociale AS azienda,
       c.attiva, c.limite_mensile_azienda,
       COALESCE(SUM(a.importo) FILTER (WHERE (a.addebitato_at AT TIME ZONE 'Europe/Rome')::date
                                              >= date_trunc('month', NOW() AT TIME ZONE 'Europe/Rome')::date), 0) AS speso_mese,
       c.limite_mensile_azienda - COALESCE(SUM(a.importo) FILTER (WHERE (a.addebitato_at AT TIME ZONE 'Europe/Rome')::date
                                              >= date_trunc('month', NOW() AT TIME ZONE 'Europe/Rome')::date), 0) AS residuo_mese,
       COALESCE(SUM(a.importo) FILTER (WHERE a.fattura_id IS NULL), 0) AS da_fatturare,
       count(a.id) FILTER (WHERE a.fattura_id IS NULL) AS consumazioni_da_fatturare,
       (SELECT count(*) FROM bar_convenzioni_dipendenti d WHERE d.convenzione_id = c.id AND d.attivo) AS dipendenti_attivi,
       max(a.addebitato_at) AS ultima_consumazione
  FROM bar_convenzioni c
  JOIN organizzazioni o ON o.id = c.organizzazione_id
  LEFT JOIN bar_convenzioni_addebiti a ON a.convenzione_id = c.id
 GROUP BY c.id, o.ragione_sociale;

CREATE VIEW bar_convenzioni_dipendenti_saldi WITH (security_invoker = true) AS
SELECT d.id AS dipendente_id, d.convenzione_id, d.modulo, d.nome, d.codice_tessera, d.attivo,
       COALESCE(d.limite_mensile, c.limite_mensile_dipendente) AS limite_mensile,
       c.limite_giornaliero_dipendente AS limite_giornaliero,
       COALESCE(SUM(a.importo) FILTER (WHERE (a.addebitato_at AT TIME ZONE 'Europe/Rome')::date
                                              >= date_trunc('month', NOW() AT TIME ZONE 'Europe/Rome')::date), 0) AS speso_mese,
       COALESCE(SUM(a.importo) FILTER (WHERE (a.addebitato_at AT TIME ZONE 'Europe/Rome')::date
                                              = (NOW() AT TIME ZONE 'Europe/Rome')::date), 0) AS speso_oggi
  FROM bar_convenzioni_dipendenti d
  JOIN bar_convenzioni c ON c.id = d.convenzione_id
  LEFT JOIN bar_convenzioni_addebiti a ON a.dipendente_id = d.id
 GROUP BY d.id, c.limite_mensile_dipendente, c.limite_giornaliero_dipendente;

-- ═══ 3. MESCITA: BOTTIGLIE E FUSTI APERTI ═══════════════════════════
-- Le vendite scaricano già il teorico (dose × pezzi). Qui si registra la
-- bottiglia aperta e, alla chiusura, quanto è rimasto davvero: la
-- differenza è lo sfrido, che va a magazzino e sopra soglia è un'anomalia.
ALTER TABLE fb_locali
  ADD COLUMN soglia_sfrido_pct NUMERIC(5,2) NOT NULL DEFAULT 5 CHECK (soglia_sfrido_pct BETWEEN 0 AND 100);

CREATE TABLE bar_mescite (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale_id          UUID NOT NULL REFERENCES fb_locali(id) ON DELETE CASCADE,
  modulo             TEXT NOT NULL DEFAULT 'bar' CHECK (modulo = 'bar'),
  articolo_id        UUID NOT NULL REFERENCES mag_articoli(id) ON DELETE RESTRICT,
  lotto_id           UUID REFERENCES mag_lotti(id) ON DELETE SET NULL,
  contenitore        TEXT NOT NULL DEFAULT 'bottiglia' CHECK (contenitore IN ('bottiglia', 'fusto', 'brick', 'altro')),
  quantita_iniziale  NUMERIC(10,3) NOT NULL CHECK (quantita_iniziale > 0),   -- nell'unità dell'articolo
  aperta_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aperta_da          UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  chiusa_at          TIMESTAMPTZ,
  chiusa_da          UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  quantita_residua   NUMERIC(10,3) CHECK (quantita_residua >= 0),
  erogato_teorico    NUMERIC(10,3),
  sfrido             NUMERIC(10,3),        -- effettivo − teorico: > 0 perdita, < 0 dosi scarse o vendite non battute
  sfrido_pct         NUMERIC(7,2),
  anomalia           BOOLEAN NOT NULL DEFAULT false,
  sfrido_registrato  BOOLEAN NOT NULL DEFAULT false,
  note               TEXT,
  periodo            TSTZRANGE GENERATED ALWAYS AS
                       (tstzrange(aperta_at, COALESCE(chiusa_at, 'infinity'::timestamptz), '[)')) STORED,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id),
  CHECK ((chiusa_at IS NULL) = (quantita_residua IS NULL)),
  CHECK (chiusa_at IS NULL OR chiusa_at >= aperta_at),
  CHECK (quantita_residua IS NULL OR quantita_residua <= quantita_iniziale),
  -- una sola bottiglia in uso per articolo e locale: le vendite le si attribuiscono senza ambiguità
  CONSTRAINT bar_mescite_una_aperta EXCLUDE USING gist (locale_id WITH =, articolo_id WITH =, periodo WITH &&)
);
CREATE INDEX idx_bar_mescite_locale ON bar_mescite (locale_id, aperta_at DESC);

CREATE OR REPLACE FUNCTION bar_mescita_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF (SELECT modulo FROM fb_locali WHERE id = NEW.locale_id) IS DISTINCT FROM 'bar' THEN
    RAISE EXCEPTION 'La mescita è del modulo Bar' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.lotto_id IS NOT NULL AND (SELECT articolo_id FROM mag_lotti WHERE id = NEW.lotto_id) IS DISTINCT FROM NEW.articolo_id THEN
    RAISE EXCEPTION 'Il lotto è di un altro articolo' USING ERRCODE = 'check_violation';
  END IF;
  NEW.aperta_da := COALESCE(NEW.aperta_da, auth.uid());
  RETURN NEW;
END;
$$;
CREATE TRIGGER bar_mescite_prepara BEFORE INSERT ON bar_mescite FOR EACH ROW EXECUTE FUNCTION bar_mescita_prepara();

-- Erogato teorico: quanto dell'articolo hanno scaricato vendite e sprechi
-- dichiarati del locale mentre la bottiglia era aperta (anche dentro i cocktail).
CREATE OR REPLACE FUNCTION bar_erogato(p_mescita UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT COALESCE(-SUM(m.quantita), 0)
    FROM bar_mescite x
    JOIN mag_movimenti m ON m.articolo_id = x.articolo_id
                        AND m.eseguito_at >= x.aperta_at AND m.eseguito_at <= COALESCE(x.chiusa_at, NOW())
                        AND m.quantita < 0
   WHERE x.id = p_mescita
     AND ((m.riferimento_tipo = 'fb_comande_righe'
           AND EXISTS (SELECT 1 FROM fb_comande_righe r WHERE r.id = m.riferimento_id AND r.locale_id = x.locale_id))
       OR (m.riferimento_tipo = 'fb_sprechi'
           AND EXISTS (SELECT 1 FROM fb_sprechi s WHERE s.id = m.riferimento_id AND s.locale_id = x.locale_id)))
$$;

CREATE OR REPLACE FUNCTION bar_chiudi_mescita(p_mescita UUID, p_residuo NUMERIC, p_note TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  x bar_mescite%ROWTYPE;
  v_erogato NUMERIC;
  v_sfrido NUMERIC;
  v_pct NUMERIC;
  v_soglia NUMERIC;
  v_anomalia BOOLEAN;
  v_registrato BOOLEAN := false;
  v_articolo TEXT;
  v_unita TEXT;
  dest UUID;
BEGIN
  SELECT * INTO x FROM bar_mescite WHERE id = p_mescita FOR UPDATE;
  IF x.id IS NULL OR NOT modulo_attivo(x.modulo) THEN RAISE EXCEPTION 'Mescita inesistente'; END IF;
  IF x.chiusa_at IS NOT NULL THEN RAISE EXCEPTION 'Questa mescita è già chiusa' USING ERRCODE = 'check_violation'; END IF;
  IF p_residuo IS NULL OR p_residuo < 0 OR p_residuo > x.quantita_iniziale THEN
    RAISE EXCEPTION 'Il residuo va da 0 a %', x.quantita_iniziale USING ERRCODE = 'check_violation';
  END IF;
  v_erogato := bar_erogato(x.id);
  v_sfrido := ROUND((x.quantita_iniziale - p_residuo) - v_erogato, 3);
  v_pct := ROUND(100 * v_sfrido / x.quantita_iniziale, 2);
  SELECT soglia_sfrido_pct INTO v_soglia FROM fb_locali WHERE id = x.locale_id;
  v_anomalia := abs(v_pct) > v_soglia;

  -- La perdita reale va a magazzino; se la giacenza non basta lo dirà l'inventario.
  IF v_sfrido > 0.0005 THEN
    BEGIN
      PERFORM mag_scarica(x.articolo_id, v_sfrido, 'sfrido', 'bar_mescite', x.id, 'Sfrido di mescita');
      v_registrato := true;
    EXCEPTION WHEN check_violation THEN
      v_registrato := false;
    END;
  END IF;

  UPDATE bar_mescite
     SET chiusa_at = NOW(), chiusa_da = auth.uid(), quantita_residua = p_residuo, erogato_teorico = v_erogato,
         sfrido = v_sfrido, sfrido_pct = v_pct, anomalia = v_anomalia, sfrido_registrato = v_registrato,
         note = COALESCE(p_note, note), updated_by = auth.uid()
   WHERE id = x.id;

  IF v_anomalia THEN
    SELECT descrizione, unita_misura INTO v_articolo, v_unita FROM mag_articoli WHERE id = x.articolo_id;
    FOR dest IN SELECT id FROM user_profiles WHERE attivo AND ruolo IN ('admin', 'manager') LOOP
      PERFORM crea_notifica(dest, 'warning', 'Consumo anomalo: ' || v_articolo,
        'Teorico ' || bar_numero(v_erogato) || ' ' || v_unita || ', reale ' || bar_numero(x.quantita_iniziale - p_residuo)
          || ' ' || v_unita || ' (' || bar_numero(ROUND(v_pct, 1)) || '%).', '/bar/mescita');
    END LOOP;
  END IF;

  RETURN jsonb_build_object('erogato_teorico', v_erogato, 'consumo_reale', x.quantita_iniziale - p_residuo,
                            'sfrido', v_sfrido, 'sfrido_pct', v_pct, 'anomalia', v_anomalia,
                            'sfrido_registrato', v_registrato);
END;
$$;

CREATE VIEW bar_mescite_stato WITH (security_invoker = true) AS
SELECT x.id, x.locale_id, x.modulo, x.articolo_id, a.descrizione AS articolo, a.unita_misura, a.costo_unitario,
       x.lotto_id, l.codice_lotto, x.contenitore, x.quantita_iniziale, x.aperta_at, x.chiusa_at,
       x.chiusa_at IS NULL AS aperta,
       COALESCE(x.erogato_teorico, bar_erogato(x.id)) AS erogato,
       GREATEST(x.quantita_iniziale - COALESCE(x.erogato_teorico, bar_erogato(x.id)), 0) AS residuo_teorico,
       x.quantita_residua, x.sfrido, x.sfrido_pct, x.anomalia, x.sfrido_registrato,
       ROUND(GREATEST(x.sfrido, 0) * a.costo_unitario, 2) AS costo_sfrido, x.note
  FROM bar_mescite x
  JOIN mag_articoli a ON a.id = x.articolo_id
  LEFT JOIN mag_lotti l ON l.id = x.lotto_id;

-- Teorico contro reale per articolo nel periodo (direzione).
CREATE OR REPLACE FUNCTION bar_mescita_analisi(p_locale UUID, p_dal DATE, p_al DATE)
RETURNS TABLE (articolo_id UUID, articolo TEXT, unita_misura TEXT, contenitori INT, quantita_iniziale NUMERIC,
               erogato_teorico NUMERIC, consumo_reale NUMERIC, sfrido NUMERIC, sfrido_pct NUMERIC,
               anomalie INT, costo_sfrido NUMERIC)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM fb_richiede_direzione();
  RETURN QUERY
  SELECT s.articolo_id, s.articolo, s.unita_misura, count(*)::int, SUM(s.quantita_iniziale), SUM(s.erogato),
         SUM(s.quantita_iniziale - s.quantita_residua), SUM(s.sfrido),
         ROUND(100 * SUM(s.sfrido) / NULLIF(SUM(s.quantita_iniziale), 0), 2),
         count(*) FILTER (WHERE s.anomalia)::int, SUM(s.costo_sfrido)
    FROM bar_mescite_stato s
   WHERE s.locale_id = p_locale AND NOT s.aperta
     AND (s.chiusa_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
   GROUP BY s.articolo_id, s.articolo, s.unita_misura
   ORDER BY SUM(s.sfrido) DESC NULLS LAST;
END;
$$;

-- ═══ 4. RIORDINO PREVISIONALE ═══════════════════════════════════════
-- Fabbisogno dei prossimi giorni = consumo medio (28 gg) × fattore
-- stagionale (stesso periodo dell'anno prima) + eventi confermati
-- (partecipanti × consumo per coperto) + ordini già presi e non ancora
-- preparati (asporto prenotati). Si propone ciò che manca per restare
-- sopra la scorta minima, tolti gli ordini già in arrivo.
CREATE OR REPLACE FUNCTION fb_proposta_riordino(p_locale UUID, p_giorni INT DEFAULT 7)
RETURNS TABLE (articolo_id UUID, descrizione TEXT, fornitore_id UUID, unita_misura TEXT,
               giacenza NUMERIC, scorta_minima NUMERIC, in_arrivo NUMERIC, consumo_medio_giorno NUMERIC,
               fattore_stagionale NUMERIC, fabbisogno_periodo NUMERIC, fabbisogno_eventi NUMERIC,
               fabbisogno_ordini NUMERIC, quantita_proposta NUMERIC)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH l AS (
    SELECT * FROM fb_locali WHERE id = p_locale
  ), uscite AS (
    SELECT m.articolo_id,
           -SUM(m.quantita) FILTER (WHERE m.eseguito_at > NOW() - INTERVAL '28 days') AS recenti,
           -SUM(m.quantita) FILTER (WHERE m.eseguito_at > NOW() - INTERVAL '393 days'
                                     AND m.eseguito_at <= NOW() - INTERVAL '365 days') AS anno_prima_base,
           -SUM(m.quantita) FILTER (WHERE m.eseguito_at > NOW() - INTERVAL '365 days'
                                     AND m.eseguito_at <= NOW() - INTERVAL '365 days' + make_interval(days => p_giorni)) AS anno_prima_periodo
      FROM mag_movimenti m
     WHERE m.quantita < 0 AND m.tipo IN ('vendita', 'consumo', 'scarico', 'omaggio', 'consumo_interno')
       AND m.eseguito_at > NOW() - INTERVAL '393 days'
     GROUP BY m.articolo_id
  ), coperti AS (
    SELECT GREATEST(COALESCE(SUM(k.coperti), 0), count(*)) AS n
      FROM fb_comande k
     WHERE k.locale_id = p_locale AND k.stato = 'chiusa' AND k.chiusa_at > NOW() - INTERVAL '28 days'
  ), eventi_p AS (
    SELECT COALESCE(SUM(COALESCE(e.partecipanti_confermati, e.partecipanti_previsti, 0)), 0) AS persone
      FROM eventi e, l
     WHERE e.modulo = l.modulo AND e.stato IN ('confermato', 'in_corso')
       AND e.inizio >= NOW() AND e.inizio < NOW() + make_interval(days => p_giorni)
  ), futuri AS (
    SELECT x.articolo_id, SUM(x.quantita) AS quantita
      FROM fb_comande_righe r
      JOIN fb_comande k ON k.id = r.comanda_id
      JOIN fb_prodotti p ON p.id = r.prodotto_id
      CROSS JOIN LATERAL (
        SELECT e.articolo_id, e.quantita FROM esplodi_distinta(p.distinta_id, r.quantita) e WHERE p.distinta_id IS NOT NULL
        UNION ALL
        SELECT p.articolo_id, r.quantita * p.articolo_quantita WHERE p.articolo_id IS NOT NULL
      ) x
     WHERE r.locale_id = p_locale AND NOT r.scaricata AND r.stato <> 'annullata' AND k.stato = 'aperta'
       AND (k.ritiro_at IS NULL OR k.ritiro_at < NOW() + make_interval(days => p_giorni))
     GROUP BY x.articolo_id
  ), arrivi AS (
    SELECT orr.articolo_id, SUM(GREATEST(orr.quantita_ordinata - orr.quantita_ricevuta, 0)) AS quantita
      FROM mag_ordini_righe orr JOIN mag_ordini o ON o.id = orr.ordine_id
     WHERE o.stato IN ('inviato', 'ricevuto_parziale')
     GROUP BY orr.articolo_id
  ), calcolo AS (
    SELECT g.articolo_id, g.descrizione, a.fornitore_id, g.unita_misura, g.giacenza, g.scorta_minima,
           COALESCE(ar.quantita, 0) AS in_arrivo,
           ROUND(COALESCE(u.recenti, 0) / 28.0, 3) AS consumo_medio_giorno,
           CASE WHEN COALESCE(u.anno_prima_base, 0) > 0 AND u.anno_prima_periodo IS NOT NULL
                THEN ROUND(LEAST(GREATEST((u.anno_prima_periodo / p_giorni) / (u.anno_prima_base / 28.0), 0.5), 2.0), 2)
                ELSE 1 END AS fattore_stagionale,
           COALESCE(u.recenti, 0) / NULLIF((SELECT n FROM coperti), 0) * (SELECT persone FROM eventi_p) AS fab_eventi,
           COALESCE(f.quantita, 0) AS fab_ordini
      FROM mag_giacenze g
      JOIN mag_articoli a ON a.id = g.articolo_id AND a.attivo
      LEFT JOIN uscite u ON u.articolo_id = g.articolo_id
      LEFT JOIN futuri f ON f.articolo_id = g.articolo_id
      LEFT JOIN arrivi ar ON ar.articolo_id = g.articolo_id
     WHERE g.modulo IN ('fb', (SELECT modulo FROM l))
  )
  SELECT articolo_id, descrizione, fornitore_id, unita_misura, giacenza, scorta_minima, in_arrivo,
         consumo_medio_giorno, fattore_stagionale,
         ROUND(consumo_medio_giorno * p_giorni * fattore_stagionale, 3),
         ROUND(COALESCE(fab_eventi, 0), 3), ROUND(fab_ordini, 3),
         CEIL(scorta_minima + consumo_medio_giorno * p_giorni * fattore_stagionale + COALESCE(fab_eventi, 0)
              + fab_ordini - giacenza - in_arrivo)
    FROM calcolo
   WHERE scorta_minima + consumo_medio_giorno * p_giorni * fattore_stagionale + COALESCE(fab_eventi, 0)
         + fab_ordini - giacenza - in_arrivo > 0
   ORDER BY descrizione
$$;

-- ═══ 5. ANALISI: FASCIA ORARIA, KPI OPERATIVI, CRUSCOTTO ════════════
CREATE OR REPLACE FUNCTION fb_food_cost(p_locale UUID, p_dal DATE, p_al DATE, p_dimensione TEXT DEFAULT 'piatto')
RETURNS TABLE (chiave TEXT, quantita NUMERIC, ricavo NUMERIC, costo NUMERIC, margine NUMERIC, food_cost_pct NUMERIC)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM fb_richiede_direzione();
  IF p_dimensione NOT IN ('piatto', 'categoria', 'menu', 'giorno', 'chef', 'canale', 'area', 'bevanda', 'fascia') THEN
    RAISE EXCEPTION 'Dimensione non prevista: %', p_dimensione;
  END IF;
  RETURN QUERY
  SELECT k, SUM(v.quantita), SUM(v.ricavo), SUM(v.costo), SUM(v.ricavo) - SUM(v.costo),
         ROUND(100 * SUM(v.costo) / NULLIF(SUM(v.ricavo), 0), 1)
    FROM fb_vendite v
    CROSS JOIN LATERAL (SELECT CASE p_dimensione
      WHEN 'piatto' THEN v.prodotto WHEN 'categoria' THEN v.categoria WHEN 'menu' THEN v.menu
      WHEN 'giorno' THEN v.giorno::text WHEN 'canale' THEN v.canale WHEN 'area' THEN v.area
      WHEN 'bevanda' THEN COALESCE(v.beverage_tipo, 'cucina')
      WHEN 'fascia' THEN lpad(v.ora::text, 2, '0') || ':00'
      ELSE COALESCE((SELECT trim(u.nome || ' ' || COALESCE(u.cognome, '')) FROM user_profiles u WHERE u.id = v.chef_id), 'Non indicato')
    END AS k) d
   WHERE v.locale_id = p_locale AND v.giorno BETWEEN p_dal AND p_al
   GROUP BY k
   ORDER BY CASE WHEN p_dimensione IN ('fascia', 'giorno') THEN k END, SUM(v.ricavo) DESC;
END;
$$;

-- KPI: quelli del Ristorante più gli operativi e commerciali del banco.
ALTER FUNCTION fb_kpi(UUID, DATE, DATE) RENAME TO fb_kpi_base;

CREATE OR REPLACE FUNCTION fb_kpi(p_locale UUID, p_dal DATE, p_al DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  v JSONB;
  v_com JSONB;
  v_cuc JSONB;
  v_eco JSONB;
  v_cli JSONB;
BEGIN
  v := fb_kpi_base(p_locale, p_dal, p_al);   -- controlla anche che sia la direzione

  WITH comande_p AS (
    SELECT * FROM fb_comande WHERE locale_id = p_locale
       AND (aperta_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
  ), vend AS (
    SELECT * FROM fb_vendite WHERE locale_id = p_locale AND giorno BETWEEN p_dal AND p_al AND NOT omaggio
  ), per_prodotto AS (
    SELECT prodotto, SUM(quantita) AS quantita, SUM(ricavo) - SUM(costo) AS margine FROM vend GROUP BY prodotto
  )
  SELECT jsonb_build_object(
    'ordini', (SELECT count(*) FROM comande_p WHERE stato = 'chiusa'),
    'ordini_annullati', (SELECT count(*) FROM comande_p WHERE stato = 'annullata'),
    'per_giorno', (SELECT COALESCE(jsonb_object_agg(giorno, lordo ORDER BY giorno), '{}'::jsonb)
                     FROM (SELECT giorno, SUM(ricavo_lordo) AS lordo FROM vend GROUP BY giorno) f),
    'piu_venduti', (SELECT COALESCE(jsonb_agg(jsonb_build_object('prodotto', prodotto, 'quantita', quantita, 'margine', ROUND(margine, 2))
                                              ORDER BY quantita DESC), '[]'::jsonb)
                      FROM (SELECT * FROM per_prodotto ORDER BY quantita DESC LIMIT 5) t),
    'meno_venduti', (SELECT COALESCE(jsonb_agg(jsonb_build_object('prodotto', prodotto, 'quantita', quantita, 'margine', ROUND(margine, 2))
                                               ORDER BY quantita), '[]'::jsonb)
                       FROM (SELECT * FROM per_prodotto ORDER BY quantita LIMIT 5) t)
  ) INTO v_com;

  WITH righe AS (
    SELECT * FROM fb_comande_righe WHERE locale_id = p_locale
       AND (ordinata_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
  )
  SELECT jsonb_build_object(
    'righe_evase', (SELECT count(*) FROM righe WHERE stato = 'servita'),
    'errori_comande', (SELECT count(*) FROM righe WHERE motivo_rifacimento = 'errore'),
    'tempo_attesa_banco_min', (SELECT ROUND(AVG(EXTRACT(EPOCH FROM r.servita_at - r.inviata_at) / 60)::numeric, 1)
                                 FROM righe r JOIN fb_comande k ON k.id = r.comanda_id
                                WHERE k.canale = 'banco' AND r.servita_at IS NOT NULL AND r.inviata_at IS NOT NULL),
    'tempo_attesa_tavolo_min', (SELECT ROUND(AVG(EXTRACT(EPOCH FROM seduto_at - created_at) / 60)::numeric, 1)
                                  FROM fb_attesa WHERE locale_id = p_locale AND seduto_at IS NOT NULL
                                   AND (created_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al)
  ) INTO v_cuc;

  SELECT jsonb_build_object(
    'sfrido_mescita', (SELECT COALESCE(SUM(costo_sfrido), 0) FROM bar_mescite_stato
                        WHERE locale_id = p_locale AND NOT aperta
                          AND (chiusa_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
    'mescite_anomale', (SELECT count(*) FROM bar_mescite WHERE locale_id = p_locale AND anomalia
                          AND (chiusa_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al)
  ) INTO v_eco;

  SELECT jsonb_build_object(
    'clienti_attivi', (SELECT count(DISTINCT contatto_id) FROM fb_comande WHERE locale_id = p_locale
                         AND contatto_id IS NOT NULL AND stato = 'chiusa'
                         AND (chiusa_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al)
  ) INTO v_cli;

  v := jsonb_set(v, '{commerciali}', (v->'commerciali') || v_com);
  v := jsonb_set(v, '{cucina}', (v->'cucina') || v_cuc);
  v := jsonb_set(v, '{economici}', (v->'economici') || v_eco);
  v := jsonb_set(v, '{clienti}', (v->'clienti') || v_cli);
  RETURN v;
END;
$$;

-- Cruscotto: quello della sala e della cucina, più personale, consumi
-- anomali e margini del giorno per la direzione.
ALTER FUNCTION fb_cruscotto(UUID, DATE) RENAME TO fb_cruscotto_base;

CREATE OR REPLACE FUNCTION fb_cruscotto(p_locale UUID, p_giorno DATE DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date)
RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  v JSONB;
  l fb_locali%ROWTYPE;
  v_personale JSONB;
BEGIN
  v := fb_cruscotto_base(p_locale, p_giorno);
  SELECT * INTO l FROM fb_locali WHERE id = p_locale;

  SELECT jsonb_build_object(
    'turni_oggi', count(*),
    'in_turno_ora', count(*) FILTER (WHERE inizio <= NOW() AND fine > NOW()),
    'ore_previste', COALESCE(SUM(ore_previste), 0),
    'ore_lavorate', COALESCE(SUM(ore_effettive) FILTER (WHERE stato = 'svolto'), 0),
    'assenti', count(*) FILTER (WHERE stato = 'assente')
  ) INTO v_personale
    FROM turni
   WHERE modulo = l.modulo AND stato <> 'annullato' AND (inizio AT TIME ZONE 'Europe/Rome')::date = p_giorno;

  v := jsonb_set(v, '{magazzino}', (v->'magazzino') || jsonb_build_object(
    'mescite_aperte', (SELECT count(*) FROM bar_mescite WHERE locale_id = p_locale AND chiusa_at IS NULL),
    'consumi_anomali', (SELECT count(*) FROM bar_mescite WHERE locale_id = p_locale AND anomalia
                          AND chiusa_at > NOW() - INTERVAL '7 days')));
  v := v || jsonb_build_object('personale', v_personale);

  IF v->'vendite' IS NOT NULL AND jsonb_typeof(v->'vendite') = 'object' THEN
    v := jsonb_set(v, '{vendite}', (v->'vendite') || (
      SELECT jsonb_build_object(
        'margine', COALESCE(SUM(ricavo) - SUM(costo), 0),
        'food_cost_pct', ROUND(100 * SUM(costo) FILTER (WHERE area = 'food') / NULLIF(SUM(ricavo) FILTER (WHERE area = 'food'), 0), 1),
        'beverage_cost_pct', ROUND(100 * SUM(costo) FILTER (WHERE area = 'beverage') / NULLIF(SUM(ricavo) FILTER (WHERE area = 'beverage'), 0), 1))
        FROM fb_vendite WHERE locale_id = p_locale AND giorno = p_giorno));
  END IF;
  RETURN v;
END;
$$;

-- ═══ 6. TRIGGER COMUNI, RLS, PROTEZIONI ═════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['bar_convenzioni', 'bar_convenzioni_dipendenti', 'bar_mescite'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['bar_convenzioni', 'bar_convenzioni_dipendenti', 'bar_convenzioni_addebiti', 'bar_mescite'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;
  -- Convenzioni (accordi, limiti, listini): la direzione.
  FOREACH t IN ARRAY ARRAY['bar_convenzioni', 'bar_convenzioni_dipendenti'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;
END $$;

-- Addebiti: li crea chi è alla cassa; la fattura li aggiorna (direzione).
CREATE POLICY "bar_convenzioni_addebiti_insert" ON bar_convenzioni_addebiti FOR INSERT TO authenticated
  WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid());
CREATE POLICY "bar_convenzioni_addebiti_update" ON bar_convenzioni_addebiti FOR UPDATE TO authenticated
  USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione());
-- Mescita: il banco apre la bottiglia; la chiude la funzione; correzioni alla direzione.
CREATE POLICY "bar_mescite_insert" ON bar_mescite FOR INSERT TO authenticated
  WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid() AND chiusa_at IS NULL);
CREATE POLICY "bar_mescite_update" ON bar_mescite FOR UPDATE TO authenticated
  USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione());

GRANT SELECT ON bar_convenzioni_riepilogo, bar_convenzioni_dipendenti_saldi, bar_mescite_stato TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'bar_convenzione_prepara()', 'fb_comanda_convenzione()', 'bar_addebito_controlla()', 'bar_addebito_fatturato()',
    'bar_mescita_prepara()', 'fb_menu_convenzionato()', 'bar_euro(numeric)', 'bar_numero(numeric)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
    'fid_omaggio_su_conto(uuid,uuid)', 'bar_addebita_convenzione(uuid,uuid,numeric)',
    'bar_fattura_convenzione(uuid,date,text)', 'bar_erogato(uuid)', 'bar_chiudi_mescita(uuid,numeric,text)',
    'bar_mescita_analisi(uuid,date,date)', 'fb_proposta_riordino(uuid,integer)', 'fb_kpi(uuid,date,date)',
    'fb_cruscotto(uuid,date)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;
-- fid_registra_acquisto (con i diritti di chi chiude il conto) conta i timbri qui.
REVOKE ALL ON FUNCTION fid_timbri_conto(uuid[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fid_timbri_conto(uuid[], uuid) TO authenticated;

SELECT applica_protezioni_tabelle();
