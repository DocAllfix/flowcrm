-- ═══════════════════════════════════════════════════════════════════
-- MODULI 2 · FONDAMENTA F0.4 + F0.5 + F0.6
--   F0.4 Fidelizzazione (punti, timbri «10 caffè → 1 omaggio», livelli,
--        presentazioni), gift card e coupon agganciati alla cassa,
--        feedback con NPS e reclami.
--   F0.5 Turni del personale sopra `dipendenti` e `assenze` del nucleo:
--        nessuna persona in due turni sovrapposti, nessun turno in ferie,
--        carenze rispetto al fabbisogno.
--   F0.6 Campagne: email accodate su `mail_outbox` SOLO a chi ha il
--        consenso marketing, con link di disiscrizione; SMS, WhatsApp e
--        push predisposti. Ogni modulo registra i suoi segmenti.
--
-- I registri a movimenti (punti, gift card, utilizzi dei coupon) sono
-- append-only e fanno da storico: niente audit riga per riga.
-- ═══════════════════════════════════════════════════════════════════

-- ═══ F0.4 FIDELIZZAZIONE ════════════════════════════════════════════
CREATE TYPE fid_movimento_tipo AS ENUM (
  'accumulo', 'bonus', 'referral',      -- entrate
  'riscatto', 'premio', 'scadenza',     -- uscite
  'rettifica'                           -- in entrambi i sensi
);

CREATE TABLE fid_programmi (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo              TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  nome                TEXT NOT NULL,
  punti_per_euro      NUMERIC(8,3) NOT NULL DEFAULT 0 CHECK (punti_per_euro >= 0),
  timbri_soglia       INT CHECK (timbri_soglia > 0),   -- «10 caffè → 1 omaggio»
  premio_timbri       TEXT,
  benvenuto_punti     INT NOT NULL DEFAULT 0 CHECK (benvenuto_punti >= 0),
  referral_punti      INT NOT NULL DEFAULT 0 CHECK (referral_punti >= 0),
  -- [{"nome":"Argento","soglia":500},{"nome":"Oro","soglia":1500}] sui punti accumulati in tutto
  livelli             JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(livelli) = 'array'),
  punti_validita_mesi INT CHECK (punti_validita_mesi > 0),
  regolamento         TEXT,
  attivo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES user_profiles(id),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by          UUID REFERENCES user_profiles(id)
);

CREATE TABLE fid_tessere (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programma_id   UUID NOT NULL REFERENCES fid_programmi(id) ON DELETE RESTRICT,
  modulo         TEXT NOT NULL,
  codice         TEXT UNIQUE,                 -- FID-AAAA-NNNN (anche nel QR, predisposto)
  contatto_id    UUID NOT NULL REFERENCES contatti(id) ON DELETE CASCADE,
  presentata_da  UUID REFERENCES fid_tessere(id) ON DELETE SET NULL,
  attiva         BOOLEAN NOT NULL DEFAULT true,
  emessa_il      DATE NOT NULL DEFAULT CURRENT_DATE,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES user_profiles(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID REFERENCES user_profiles(id),
  UNIQUE (programma_id, contatto_id)
);
CREATE INDEX idx_fid_tessere_contatto ON fid_tessere (contatto_id);

CREATE TABLE fid_movimenti (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tessera_id       UUID NOT NULL REFERENCES fid_tessere(id) ON DELETE CASCADE,
  modulo           TEXT NOT NULL,
  tipo             fid_movimento_tipo NOT NULL,
  punti            INT NOT NULL DEFAULT 0,
  timbri           INT NOT NULL DEFAULT 0,
  importo          NUMERIC(12,2),             -- spesa che ha generato i punti
  riferimento_tipo TEXT,                      -- conto, comanda, ordine…
  riferimento_id   UUID,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  CONSTRAINT fid_movimenti_segno CHECK (
    CASE
      WHEN tipo IN ('accumulo', 'bonus', 'referral') THEN punti >= 0 AND timbri >= 0
      WHEN tipo IN ('riscatto', 'premio', 'scadenza') THEN punti <= 0 AND timbri <= 0
      ELSE true
    END AND (punti <> 0 OR timbri <> 0))
);
CREATE INDEX idx_fid_movimenti_tessera ON fid_movimenti (tessera_id, created_at DESC);
-- Lo stesso acquisto non accumula due volte.
CREATE UNIQUE INDEX idx_fid_movimenti_acquisto ON fid_movimenti (tessera_id, riferimento_tipo, riferimento_id)
  WHERE tipo = 'accumulo' AND riferimento_id IS NOT NULL;

CREATE VIEW fid_saldi WITH (security_invoker = true) AS
SELECT t.id AS tessera_id, t.modulo, t.programma_id, t.contatto_id, t.codice, t.attiva,
       COALESCE(m.punti, 0)::int AS punti,
       COALESCE(m.timbri, 0)::int AS timbri,
       COALESCE(m.accumulati, 0)::int AS punti_accumulati,
       CASE WHEN p.timbri_soglia IS NOT NULL THEN (COALESCE(m.timbri, 0) / p.timbri_soglia)::int ELSE 0 END AS premi_disponibili,
       (SELECT l->>'nome' FROM jsonb_array_elements(p.livelli) l
         WHERE (l->>'soglia')::int <= COALESCE(m.accumulati, 0)
         ORDER BY (l->>'soglia')::int DESC LIMIT 1) AS livello,
       m.ultimo_movimento
  FROM fid_tessere t
  JOIN fid_programmi p ON p.id = t.programma_id
  LEFT JOIN (SELECT tessera_id, SUM(punti) AS punti, SUM(timbri) AS timbri,
                    SUM(punti) FILTER (WHERE punti > 0 AND tipo <> 'rettifica') AS accumulati,
                    MAX(created_at) AS ultimo_movimento
               FROM fid_movimenti GROUP BY tessera_id) m ON m.tessera_id = t.id;

CREATE OR REPLACE FUNCTION fid_tessera_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  SELECT modulo INTO NEW.modulo FROM fid_programmi WHERE id = NEW.programma_id;
  IF NEW.codice IS NULL THEN NEW.codice := genera_codice('FID'); END IF;
  IF NEW.presentata_da IS NOT NULL
     AND (SELECT programma_id FROM fid_tessere WHERE id = NEW.presentata_da) IS DISTINCT FROM NEW.programma_id THEN
    RAISE EXCEPTION 'La presentazione vale solo nello stesso programma' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fid_tessere_prepara BEFORE INSERT ON fid_tessere
  FOR EACH ROW EXECUTE FUNCTION fid_tessera_prepara();

-- Benvenuto al nuovo iscritto, punti a chi lo ha presentato.
CREATE OR REPLACE FUNCTION fid_tessera_benvenuto()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p fid_programmi%ROWTYPE;
BEGIN
  SELECT * INTO p FROM fid_programmi WHERE id = NEW.programma_id;
  IF p.benvenuto_punti > 0 THEN
    INSERT INTO fid_movimenti (tessera_id, tipo, punti, note, created_by)
    VALUES (NEW.id, 'bonus', p.benvenuto_punti, 'Benvenuto', NEW.created_by);
  END IF;
  IF NEW.presentata_da IS NOT NULL AND p.referral_punti > 0 THEN
    INSERT INTO fid_movimenti (tessera_id, tipo, punti, riferimento_tipo, riferimento_id, note, created_by)
    VALUES (NEW.presentata_da, 'referral', p.referral_punti, 'fid_tessere', NEW.id, 'Presentazione', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fid_tessere_benvenuto AFTER INSERT ON fid_tessere
  FOR EACH ROW EXECUTE FUNCTION fid_tessera_benvenuto();

-- Saldo mai negativo, tessera attiva per accumulare; un movimento alla
-- volta per tessera.
CREATE OR REPLACE FUNCTION fid_movimento_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  t fid_tessere%ROWTYPE;
  v_punti INT;
  v_timbri INT;
BEGIN
  SELECT * INTO t FROM fid_tessere WHERE id = NEW.tessera_id FOR UPDATE;
  NEW.modulo := t.modulo;
  IF NOT t.attiva AND NEW.tipo IN ('accumulo', 'bonus', 'referral') THEN
    RAISE EXCEPTION 'Tessera non attiva' USING ERRCODE = 'check_violation';
  END IF;
  SELECT COALESCE(SUM(punti), 0), COALESCE(SUM(timbri), 0) INTO v_punti, v_timbri
    FROM fid_movimenti WHERE tessera_id = NEW.tessera_id;
  IF v_punti + NEW.punti < 0 OR v_timbri + NEW.timbri < 0 THEN
    RAISE EXCEPTION 'Saldo insufficiente: % punti, % timbri', v_punti, v_timbri USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fid_movimenti_controlla BEFORE INSERT ON fid_movimenti
  FOR EACH ROW EXECUTE FUNCTION fid_movimento_controlla();

-- Acquisto: punti dalla spesa e un timbro (se il programma li prevede).
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
  v_timbri := CASE WHEN p.timbri_soglia IS NOT NULL THEN 1 ELSE 0 END;
  IF v_punti > 0 OR v_timbri > 0 THEN
    INSERT INTO fid_movimenti (tessera_id, tipo, punti, timbri, importo, riferimento_tipo, riferimento_id, created_by)
    VALUES (p_tessera, 'accumulo', v_punti, v_timbri, p_importo, p_rif_tipo, p_rif_id, auth.uid());
  END IF;
  RETURN (SELECT jsonb_build_object('punti_aggiunti', v_punti, 'timbri_aggiunti', v_timbri,
                                    'punti', punti, 'timbri', timbri, 'premi_disponibili', premi_disponibili)
            FROM fid_saldi WHERE tessera_id = p_tessera);
END;
$$;

-- Premio a timbri: scala la soglia.
CREATE OR REPLACE FUNCTION fid_riscatta_premio(p_tessera UUID, p_rif_tipo TEXT DEFAULT NULL, p_rif_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  p fid_programmi%ROWTYPE;
BEGIN
  SELECT pr.* INTO p FROM fid_tessere t JOIN fid_programmi pr ON pr.id = t.programma_id WHERE t.id = p_tessera;
  IF p.timbri_soglia IS NULL THEN RAISE EXCEPTION 'Il programma non prevede premi a timbri'; END IF;
  INSERT INTO fid_movimenti (tessera_id, tipo, timbri, riferimento_tipo, riferimento_id, note, created_by)
  VALUES (p_tessera, 'premio', -p.timbri_soglia, p_rif_tipo, p_rif_id, p.premio_timbri, auth.uid());
  RETURN p.premio_timbri;
END;
$$;

-- ── Gift card ────────────────────────────────────────────────────────
CREATE TYPE gift_card_stato AS ENUM ('attiva', 'annullata');

-- 48 bit casuali (XXXX-XXXX-XXXX): chi conosce il codice spende il credito.
CREATE OR REPLACE FUNCTION genera_codice_gift_card()
RETURNS TEXT
LANGUAGE sql VOLATILE SET search_path = pg_catalog AS $$
  SELECT substr(h, 1, 4) || '-' || substr(h, 5, 4) || '-' || substr(h, 9, 4)
    FROM (SELECT upper(left(replace(gen_random_uuid()::text, '-', ''), 12)) AS h) x
$$;

CREATE TABLE gift_card (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  codice                TEXT NOT NULL UNIQUE DEFAULT genera_codice_gift_card(),
  importo_iniziale      NUMERIC(12,2) NOT NULL CHECK (importo_iniziale > 0),
  scadenza              DATE,
  acquirente_id         UUID REFERENCES contatti(id) ON DELETE SET NULL,
  beneficiario          TEXT,
  messaggio             TEXT,
  stato                 gift_card_stato NOT NULL DEFAULT 'attiva',
  conto_vendita_id      UUID REFERENCES conti(id) ON DELETE SET NULL,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id)
);

CREATE TABLE gift_card_movimenti (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id        UUID NOT NULL REFERENCES gift_card(id) ON DELETE CASCADE,
  modulo              TEXT NOT NULL,
  importo             NUMERIC(12,2) NOT NULL CHECK (importo <> 0),   -- negativo = utilizzo
  conti_pagamento_id  UUID REFERENCES conti_pagamenti(id) ON DELETE CASCADE,  -- storno = credito restituito
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_gift_card_movimenti ON gift_card_movimenti (gift_card_id);

CREATE VIEW gift_card_saldi WITH (security_invoker = true) AS
SELECT g.id AS gift_card_id, g.modulo, g.codice, g.importo_iniziale, g.scadenza,
       (g.importo_iniziale + COALESCE(m.mosso, 0))::numeric(12,2) AS residuo,
       CASE WHEN g.stato = 'annullata' THEN 'annullata'
            WHEN g.scadenza < CURRENT_DATE THEN 'scaduta'
            WHEN g.importo_iniziale + COALESCE(m.mosso, 0) <= 0 THEN 'esaurita'
            ELSE 'attiva' END AS stato
  FROM gift_card g
  LEFT JOIN (SELECT gift_card_id, SUM(importo) AS mosso FROM gift_card_movimenti GROUP BY gift_card_id) m
    ON m.gift_card_id = g.id;

-- Pagamento con gift card: il codice va in `riferimento`; il credito si
-- scala nella stessa transazione e torna se il pagamento viene stornato.
CREATE OR REPLACE FUNCTION conto_pagamento_gift_card()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  g gift_card%ROWTYPE;
  s gift_card_saldi%ROWTYPE;
BEGIN
  SELECT * INTO g FROM gift_card WHERE codice = upper(trim(NEW.riferimento)) FOR UPDATE;
  IF g.id IS NULL THEN
    RAISE EXCEPTION 'Gift card inesistente' USING ERRCODE = 'check_violation';
  END IF;
  IF g.modulo <> NEW.modulo THEN
    RAISE EXCEPTION 'Gift card di un''altra attività' USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO s FROM gift_card_saldi WHERE gift_card_id = g.id;
  IF s.stato <> 'attiva' THEN
    RAISE EXCEPTION 'Gift card %', s.stato USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.importo > s.residuo THEN
    RAISE EXCEPTION 'Credito insufficiente: residuo %', s.residuo USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO gift_card_movimenti (gift_card_id, modulo, importo, conti_pagamento_id, created_by)
  VALUES (g.id, g.modulo, -NEW.importo, NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;
CREATE TRIGGER conti_pagamenti_gift_card AFTER INSERT ON conti_pagamenti
  FOR EACH ROW WHEN (NEW.metodo = 'gift_card') EXECUTE FUNCTION conto_pagamento_gift_card();

-- ── Coupon ───────────────────────────────────────────────────────────
CREATE TYPE coupon_tipo AS ENUM ('percentuale', 'importo');

CREATE TABLE coupon (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  codice           TEXT NOT NULL,
  descrizione      TEXT,
  tipo             coupon_tipo NOT NULL,
  valore           NUMERIC(12,2) NOT NULL CHECK (valore > 0),
  spesa_minima     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (spesa_minima >= 0),
  valido_dal       DATE,
  valido_al        DATE,
  usi_massimi      INT CHECK (usi_massimi > 0),
  usi_per_cliente  INT CHECK (usi_per_cliente > 0),
  attivo           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id),
  CHECK (tipo <> 'percentuale' OR valore <= 100),
  CHECK (valido_al IS NULL OR valido_dal IS NULL OR valido_al >= valido_dal)
);
CREATE UNIQUE INDEX idx_coupon_codice ON coupon (modulo, upper(codice));

CREATE TABLE coupon_utilizzi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupon(id) ON DELETE CASCADE,
  modulo      TEXT NOT NULL,
  conto_id    UUID NOT NULL REFERENCES conti(id) ON DELETE CASCADE,
  contatto_id UUID REFERENCES contatti(id) ON DELETE SET NULL,
  sconto      NUMERIC(12,2) NOT NULL CHECK (sconto >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  UNIQUE (coupon_id, conto_id)
);

-- Il coupon diventa sconto di testata del conto (aperto).
CREATE OR REPLACE FUNCTION applica_coupon(p_conto UUID, p_codice TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c conti%ROWTYPE;
  k coupon%ROWTYPE;
  v_lordo NUMERIC;
  v_totale NUMERIC;
  v_sconto NUMERIC;
BEGIN
  SELECT * INTO c FROM conti WHERE id = p_conto FOR UPDATE;
  IF c.id IS NULL OR NOT modulo_attivo(c.modulo) THEN RAISE EXCEPTION 'Conto inesistente'; END IF;
  IF c.stato <> 'aperto' THEN RAISE EXCEPTION 'Il conto è %', c.stato USING ERRCODE = 'check_violation'; END IF;
  SELECT * INTO k FROM coupon WHERE modulo = c.modulo AND upper(codice) = upper(trim(p_codice)) FOR UPDATE;
  IF k.id IS NULL OR NOT k.attivo THEN
    RAISE EXCEPTION 'Coupon non valido' USING ERRCODE = 'check_violation';
  END IF;
  IF (k.valido_dal IS NOT NULL AND CURRENT_DATE < k.valido_dal) OR (k.valido_al IS NOT NULL AND CURRENT_DATE > k.valido_al) THEN
    RAISE EXCEPTION 'Coupon fuori dal periodo di validità' USING ERRCODE = 'check_violation';
  END IF;
  IF k.usi_massimi IS NOT NULL AND (SELECT count(*) FROM coupon_utilizzi WHERE coupon_id = k.id) >= k.usi_massimi THEN
    RAISE EXCEPTION 'Coupon esaurito' USING ERRCODE = 'check_violation';
  END IF;
  IF k.usi_per_cliente IS NOT NULL AND c.contatto_id IS NOT NULL
     AND (SELECT count(*) FROM coupon_utilizzi WHERE coupon_id = k.id AND contatto_id = c.contatto_id) >= k.usi_per_cliente THEN
    RAISE EXCEPTION 'Coupon già usato da questo cliente' USING ERRCODE = 'check_violation';
  END IF;
  SELECT COALESCE(SUM(importo), 0) INTO v_lordo FROM conti_righe WHERE conto_id = p_conto AND NOT stornata;
  IF v_lordo < k.spesa_minima THEN
    RAISE EXCEPTION 'Spesa minima % non raggiunta', k.spesa_minima USING ERRCODE = 'check_violation';
  END IF;
  SELECT totale INTO v_totale FROM conti_saldi WHERE conto_id = p_conto;
  v_sconto := LEAST(CASE k.tipo WHEN 'percentuale' THEN ROUND(v_lordo * k.valore / 100, 2) ELSE k.valore END, v_totale);
  INSERT INTO coupon_utilizzi (coupon_id, modulo, conto_id, contatto_id, sconto, created_by)
  VALUES (k.id, c.modulo, p_conto, c.contatto_id, v_sconto, auth.uid());
  UPDATE conti SET sconto_importo = sconto_importo + v_sconto WHERE id = p_conto;
  RETURN v_sconto;
END;
$$;

-- Utilizzo stornato (admin): lo sconto torna fuori dal conto aperto.
CREATE OR REPLACE FUNCTION coupon_utilizzo_storno()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE conti SET sconto_importo = GREATEST(sconto_importo - OLD.sconto, 0) WHERE id = OLD.conto_id;
  RETURN OLD;
END;
$$;
CREATE TRIGGER coupon_utilizzi_storno AFTER DELETE ON coupon_utilizzi
  FOR EACH ROW EXECUTE FUNCTION coupon_utilizzo_storno();

-- ── Feedback, NPS, reclami ───────────────────────────────────────────
CREATE TYPE feedback_tipo AS ENUM ('nps', 'questionario', 'recensione', 'reclamo', 'suggerimento');
CREATE TYPE feedback_stato AS ENUM ('ricevuto', 'in_gestione', 'risolto', 'chiuso');

CREATE TABLE feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  tipo         feedback_tipo NOT NULL,
  contatto_id  UUID REFERENCES contatti(id) ON DELETE SET NULL,
  canale       TEXT,                    -- banco, email, QR, telefono, portale…
  nps          SMALLINT CHECK (nps BETWEEN 0 AND 10),
  valutazione  SMALLINT CHECK (valutazione BETWEEN 1 AND 5),
  risposte     JSONB NOT NULL DEFAULT '{}'::jsonb,
  testo        TEXT,
  entita_tipo  TEXT,                    -- soggiorno, conto, visita, ordine, lezione…
  entita_id    UUID,
  stato        feedback_stato NOT NULL DEFAULT 'ricevuto',
  assegnato_a  UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  risposta     TEXT,
  risolto_at   TIMESTAMPTZ,
  ricevuto_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id),
  CHECK (tipo <> 'nps' OR nps IS NOT NULL)
);
CREATE INDEX idx_feedback_modulo ON feedback (modulo, ricevuto_at DESC);
CREATE INDEX idx_feedback_aperti ON feedback (modulo, stato) WHERE stato IN ('ricevuto', 'in_gestione');
CREATE INDEX idx_feedback_entita ON feedback (entita_tipo, entita_id);

CREATE OR REPLACE FUNCTION feedback_risolto_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato IN ('risolto', 'chiuso') AND (TG_OP = 'INSERT' OR OLD.stato NOT IN ('risolto', 'chiuso')) THEN
    NEW.risolto_at := COALESCE(NEW.risolto_at, NOW());
  ELSIF NEW.stato IN ('ricevuto', 'in_gestione') THEN
    NEW.risolto_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER feedback_risolto_at BEFORE INSERT OR UPDATE OF stato ON feedback
  FOR EACH ROW EXECUTE FUNCTION feedback_risolto_at();

-- Reclami e detrattori arrivano subito ad admin e manager.
CREATE OR REPLACE FUNCTION feedback_avvisa()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  dest UUID;
BEGIN
  IF NEW.tipo = 'reclamo' OR NEW.nps <= 6 THEN
    FOR dest IN SELECT id FROM user_profiles WHERE ruolo IN ('admin', 'manager') AND attivo LOOP
      PERFORM crea_notifica(dest, 'warning',
        CASE WHEN NEW.tipo = 'reclamo' THEN 'Nuovo reclamo' ELSE 'Cliente insoddisfatto (NPS ' || NEW.nps || ')' END,
        COALESCE(left(NEW.testo, 200), 'Senza testo'),
        '/' || NEW.modulo || '/feedback');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER feedback_avvisa AFTER INSERT ON feedback
  FOR EACH ROW EXECUTE FUNCTION feedback_avvisa();

-- NPS = % promotori (9–10) − % detrattori (0–6), per mese.
CREATE VIEW feedback_nps WITH (security_invoker = true) AS
SELECT modulo,
       date_trunc('month', ricevuto_at AT TIME ZONE 'Europe/Rome')::date AS mese,
       COUNT(*)::int AS risposte,
       COUNT(*) FILTER (WHERE nps >= 9)::int AS promotori,
       COUNT(*) FILTER (WHERE nps BETWEEN 7 AND 8)::int AS passivi,
       COUNT(*) FILTER (WHERE nps <= 6)::int AS detrattori,
       ROUND(100.0 * (COUNT(*) FILTER (WHERE nps >= 9) - COUNT(*) FILTER (WHERE nps <= 6)) / COUNT(*))::int AS nps,
       ROUND(AVG(valutazione), 2) AS valutazione_media
  FROM feedback
 WHERE nps IS NOT NULL
 GROUP BY modulo, 2;

-- ═══ F0.5 TURNI ═════════════════════════════════════════════════════
CREATE TYPE turno_stato AS ENUM ('pianificato', 'confermato', 'svolto', 'assente', 'annullato');

CREATE TABLE turni_modelli (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  nome         TEXT NOT NULL,          -- Mattina, Spezzato, Notte…
  reparto      TEXT,                   -- sala, cucina, bar, reception, piani…
  ora_inizio   TIME NOT NULL,
  ora_fine     TIME NOT NULL,          -- se <= inizio, finisce il giorno dopo
  pausa_minuti INT NOT NULL DEFAULT 0 CHECK (pausa_minuti >= 0),
  colore       TEXT,
  attivo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id)
);

CREATE TABLE turni (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  dipendente_id    UUID NOT NULL REFERENCES dipendenti(id) ON DELETE CASCADE,
  modello_id       UUID REFERENCES turni_modelli(id) ON DELETE SET NULL,
  reparto          TEXT,
  mansione         TEXT,
  inizio           TIMESTAMPTZ NOT NULL,
  fine             TIMESTAMPTZ NOT NULL,
  pausa_minuti     INT NOT NULL DEFAULT 0 CHECK (pausa_minuti >= 0),
  ore_previste     NUMERIC(5,2) GENERATED ALWAYS AS
                     (ROUND((EXTRACT(EPOCH FROM (fine - inizio)) / 3600 - pausa_minuti / 60.0)::numeric, 2)) STORED,
  inizio_effettivo TIMESTAMPTZ,
  fine_effettivo   TIMESTAMPTZ,
  ore_effettive    NUMERIC(5,2),
  stato            turno_stato NOT NULL DEFAULT 'pianificato',
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id),
  CHECK (fine > inizio AND fine - inizio <= INTERVAL '16 hours'),
  CHECK (fine_effettivo IS NULL OR inizio_effettivo IS NULL OR fine_effettivo > inizio_effettivo),
  -- Una persona non sta in due turni sovrapposti, nemmeno in due moduli.
  CONSTRAINT turni_niente_sovrapposizioni EXCLUDE USING gist (
    dipendente_id WITH =, tstzrange(inizio, fine) WITH &&) WHERE (stato <> 'annullato')
);
CREATE INDEX idx_turni_periodo ON turni (modulo, inizio);

CREATE OR REPLACE FUNCTION turno_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_assenza TEXT;
BEGIN
  IF NOT COALESCE((SELECT attivo FROM dipendenti WHERE id = NEW.dipendente_id), false) THEN
    RAISE EXCEPTION 'Dipendente non attivo' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.stato NOT IN ('annullato', 'assente') THEN
    SELECT tipo::text INTO v_assenza FROM assenze
     WHERE dipendente_id = NEW.dipendente_id AND stato = 'approvata'
       AND daterange(data_inizio, data_fine, '[]')
           && daterange((NEW.inizio AT TIME ZONE 'Europe/Rome')::date, (NEW.fine AT TIME ZONE 'Europe/Rome')::date, '[]')
     LIMIT 1;
    IF v_assenza IS NOT NULL THEN
      RAISE EXCEPTION 'Il dipendente è assente (%) in quei giorni', v_assenza USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.inizio_effettivo IS NOT NULL AND NEW.fine_effettivo IS NOT NULL THEN
    NEW.ore_effettive := ROUND((EXTRACT(EPOCH FROM (NEW.fine_effettivo - NEW.inizio_effettivo)) / 3600
                                - NEW.pausa_minuti / 60.0)::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER turni_controlla BEFORE INSERT OR UPDATE ON turni
  FOR EACH ROW EXECUTE FUNCTION turno_controlla();

-- Fabbisogno: quante persone servono, per reparto, giorno e fascia.
CREATE TABLE turni_fabbisogno (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  reparto          TEXT,                 -- NULL = qualunque reparto
  giorno_settimana SMALLINT NOT NULL CHECK (giorno_settimana BETWEEN 1 AND 7),  -- 1 = lunedì
  ora_inizio       TIME NOT NULL,
  ora_fine         TIME NOT NULL,        -- se <= inizio, finisce il giorno dopo
  persone_minime   INT NOT NULL CHECK (persone_minime > 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);

-- Carenze: fasce in cui le persone in turno (che coprono l'intera fascia)
-- sono meno del fabbisogno. Orari in Europe/Rome.
CREATE OR REPLACE FUNCTION turni_carenze(p_modulo TEXT, p_dal DATE, p_al DATE)
RETURNS TABLE (data DATE, reparto TEXT, ora_inizio TIME, ora_fine TIME, richieste INT, coperte INT)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH fasce AS (
    SELECT g::date AS data, f.reparto, f.ora_inizio, f.ora_fine, f.persone_minime,
           (g::date + f.ora_inizio) AT TIME ZONE 'Europe/Rome' AS da,
           (g::date + CASE WHEN f.ora_fine <= f.ora_inizio THEN 1 ELSE 0 END + f.ora_fine) AT TIME ZONE 'Europe/Rome' AS a
      FROM generate_series(p_dal, p_al, INTERVAL '1 day') g
      JOIN turni_fabbisogno f ON f.modulo = p_modulo AND f.giorno_settimana = EXTRACT(ISODOW FROM g::date)
  )
  SELECT fa.data, fa.reparto, fa.ora_inizio, fa.ora_fine, fa.persone_minime,
         (SELECT count(DISTINCT t.dipendente_id)::int FROM turni t
           WHERE t.modulo = p_modulo AND t.stato NOT IN ('annullato', 'assente')
             AND (fa.reparto IS NULL OR t.reparto = fa.reparto)
             AND t.inizio <= fa.da AND t.fine >= fa.a) AS coperte
    FROM fasce fa
   WHERE (SELECT count(DISTINCT t.dipendente_id) FROM turni t
           WHERE t.modulo = p_modulo AND t.stato NOT IN ('annullato', 'assente')
             AND (fa.reparto IS NULL OR t.reparto = fa.reparto)
             AND t.inizio <= fa.da AND t.fine >= fa.a) < fa.persone_minime
   ORDER BY fa.data, fa.ora_inizio
$$;

-- Ore per persona e settimana (per paghe e controllo straordinari).
CREATE VIEW turni_ore_settimana WITH (security_invoker = true) AS
SELECT modulo, dipendente_id,
       date_trunc('week', inizio AT TIME ZONE 'Europe/Rome')::date AS settimana,
       SUM(ore_previste) FILTER (WHERE stato <> 'annullato') AS ore_previste,
       SUM(ore_effettive) AS ore_effettive,
       COUNT(*) FILTER (WHERE stato = 'assente')::int AS assenze
  FROM turni
 GROUP BY modulo, dipendente_id, 3;

-- `dipendenti` resta riservata ad admin e manager: per il calendario dei
-- turni chiunque nel modulo vede solo nome, cognome e qualifica.
CREATE OR REPLACE FUNCTION turni_persone(p_modulo TEXT)
RETURNS TABLE (id UUID, nome TEXT, cognome TEXT, qualifica TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT d.id, d.nome, d.cognome, d.qualifica
    FROM dipendenti d
   WHERE d.attivo AND modulo_attivo(p_modulo) AND auth.uid() IS NOT NULL
   ORDER BY d.cognome, d.nome
$$;

-- ═══ F0.6 CAMPAGNE ══════════════════════════════════════════════════
CREATE TYPE campagna_canale AS ENUM ('email', 'sms', 'whatsapp', 'push');
CREATE TYPE campagna_stato AS ENUM ('bozza', 'programmata', 'inviata', 'annullata');
CREATE TYPE campagna_destinatario_stato AS ENUM ('in_coda', 'inviato', 'escluso');

-- Registro dei segmenti: ogni modulo aggiunge i suoi con una migrazione.
-- `funzione` è una funzione (p_modulo text, p_parametri jsonb) RETURNS
-- SETOF uuid che restituisce id di contatti.
CREATE TABLE campagne_segmenti (
  slug        TEXT PRIMARY KEY,
  modulo      TEXT,                     -- NULL = vale per ogni modulo
  etichetta   TEXT NOT NULL,
  descrizione TEXT,
  funzione    TEXT NOT NULL,
  parametri   JSONB NOT NULL DEFAULT '{}'::jsonb   -- {"giorni": {"etichetta": "Inattivi da giorni", "default": 60}}
);

CREATE TABLE campagne (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  codice            TEXT UNIQUE,              -- CMP-AAAA-NNNN
  nome              TEXT NOT NULL,
  canale            campagna_canale NOT NULL DEFAULT 'email',
  segmento          TEXT NOT NULL REFERENCES campagne_segmenti(slug),
  parametri         JSONB NOT NULL DEFAULT '{}'::jsonb,
  oggetto           TEXT,
  corpo             TEXT NOT NULL,            -- testo semplice; {{nome}} viene sostituito
  stato             campagna_stato NOT NULL DEFAULT 'bozza',
  programmata_at    TIMESTAMPTZ,
  url_base          TEXT,                     -- indirizzo dell'app, per il link di disiscrizione
  inviata_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  CHECK (canale <> 'email' OR oggetto IS NOT NULL),
  CHECK (stato <> 'programmata' OR (programmata_at IS NOT NULL AND url_base IS NOT NULL))
);

CREATE TABLE campagne_destinatari (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campagna_id       UUID NOT NULL REFERENCES campagne(id) ON DELETE CASCADE,
  modulo            TEXT NOT NULL,
  contatto_id       UUID NOT NULL REFERENCES contatti(id) ON DELETE CASCADE,
  indirizzo         TEXT,
  stato             campagna_destinatario_stato NOT NULL DEFAULT 'in_coda',
  motivo_esclusione TEXT,
  token             UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),   -- disiscrizione
  mail_id           UUID REFERENCES mail_outbox(id) ON DELETE SET NULL,
  inviato_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campagna_id, contatto_id)
);

CREATE OR REPLACE FUNCTION campagna_set_codice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.codice := genera_codice('CMP');
  RETURN NEW;
END;
$$;
CREATE TRIGGER campagne_set_codice BEFORE INSERT ON campagne
  FOR EACH ROW WHEN (NEW.codice IS NULL) EXECUTE FUNCTION campagna_set_codice();

-- Una campagna inviata non si modifica più.
CREATE OR REPLACE FUNCTION campagna_inviata_bloccata()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.stato = 'inviata' THEN
    RAISE EXCEPTION 'Campagna già inviata: non si modifica' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER campagne_inviata_bloccata BEFORE UPDATE ON campagne
  FOR EACH ROW EXECUTE FUNCTION campagna_inviata_bloccata();

-- Segmenti di base.
CREATE OR REPLACE FUNCTION seg_tutti_i_contatti(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT id FROM contatti WHERE attivo
$$;
CREATE OR REPLACE FUNCTION seg_tesserati(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT contatto_id FROM fid_tessere WHERE modulo = p_modulo AND attiva
$$;
CREATE OR REPLACE FUNCTION seg_tesserati_inattivi(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT t.contatto_id FROM fid_tessere t
   WHERE t.modulo = p_modulo AND t.attiva
     AND NOT EXISTS (SELECT 1 FROM fid_movimenti m
                      WHERE m.tessera_id = t.id AND m.tipo = 'accumulo'
                        AND m.created_at >= NOW() - make_interval(days => COALESCE((p_parametri->>'giorni')::int, 60)))
$$;
CREATE OR REPLACE FUNCTION seg_promotori(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT contatto_id FROM feedback
   WHERE modulo = p_modulo AND contatto_id IS NOT NULL AND nps >= 9
     AND ricevuto_at >= NOW() - INTERVAL '1 year'
$$;
CREATE OR REPLACE FUNCTION seg_detrattori(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT contatto_id FROM feedback
   WHERE modulo = p_modulo AND contatto_id IS NOT NULL AND nps <= 6
     AND ricevuto_at >= NOW() - INTERVAL '1 year'
$$;

INSERT INTO campagne_segmenti (slug, modulo, etichetta, descrizione, funzione, parametri) VALUES
  ('tutti', NULL, 'Tutti i contatti', 'Ogni contatto attivo con il consenso marketing', 'seg_tutti_i_contatti', '{}'),
  ('tesserati', NULL, 'Tesserati', 'Chi ha la tessera fedeltà del modulo', 'seg_tesserati', '{}'),
  ('tesserati_inattivi', NULL, 'Tesserati inattivi', 'Tesserati senza acquisti da un certo numero di giorni',
     'seg_tesserati_inattivi', '{"giorni": {"etichetta": "Senza acquisti da (giorni)", "default": 60}}'),
  ('promotori', NULL, 'Clienti entusiasti', 'NPS 9–10 nell''ultimo anno: ideali per chiedere una recensione', 'seg_promotori', '{}'),
  ('detrattori', NULL, 'Clienti da recuperare', 'NPS 0–6 nell''ultimo anno', 'seg_detrattori', '{}');

-- Destinatari: il segmento, filtrato per consenso e indirizzo. Chi non ha
-- il consenso resta in elenco come «escluso», così si vede perché.
CREATE OR REPLACE FUNCTION campagna_prepara_interna(p_campagna UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c campagne%ROWTYPE;
  v_fn TEXT;
  n INTEGER;
BEGIN
  SELECT * INTO c FROM campagne WHERE id = p_campagna FOR UPDATE;
  IF c.stato NOT IN ('bozza', 'programmata') THEN
    RAISE EXCEPTION 'Campagna %: non si prepara', c.stato USING ERRCODE = 'check_violation';
  END IF;
  SELECT funzione INTO v_fn FROM campagne_segmenti WHERE slug = c.segmento;
  IF to_regprocedure(v_fn || '(text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Segmento non valido: %', c.segmento;
  END IF;
  -- Tocca la campagna PRIMA dei destinatari: nella demo la sola lettura
  -- ferma qui l'intera operazione.
  UPDATE campagne SET updated_at = NOW() WHERE id = p_campagna;
  DELETE FROM campagne_destinatari WHERE campagna_id = p_campagna;
  EXECUTE format(
    $q$INSERT INTO campagne_destinatari (campagna_id, modulo, contatto_id, indirizzo, stato, motivo_esclusione)
       SELECT $1, $2, k.id, a.indirizzo,
              CASE WHEN NOT k.consenso_marketing OR a.indirizzo IS NULL THEN 'escluso' ELSE 'in_coda' END::campagna_destinatario_stato,
              CASE WHEN NOT k.consenso_marketing THEN 'Senza consenso marketing'
                   WHEN a.indirizzo IS NULL THEN 'Senza indirizzo per il canale' END
         FROM (SELECT DISTINCT x AS id FROM %s($2, $3) AS x) s
         JOIN contatti k ON k.id = s.id
         CROSS JOIN LATERAL (SELECT CASE WHEN $4 = 'email'
                                         THEN NULLIF(CASE WHEN k.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN lower(trim(k.email)) END, '')
                                         ELSE NULLIF(regexp_replace(COALESCE(k.telefono, ''), '[^0-9+]', '', 'g'), '') END AS indirizzo) a$q$,
    v_fn)
  USING p_campagna, c.modulo, c.parametri, c.canale::text;
  SELECT count(*) INTO n FROM campagne_destinatari WHERE campagna_id = p_campagna AND stato = 'in_coda';
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION html_escape(p TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT replace(replace(replace(replace(p, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

-- Invio: solo email (gli altri canali sono predisposti). Il consenso si
-- ricontrolla al momento dell'invio: chi l'ha revocato nel frattempo esce.
CREATE OR REPLACE FUNCTION campagna_invia_interna(p_campagna UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c campagne%ROWTYPE;
  r RECORD;
  v_testo TEXT;
  v_link TEXT;
  v_mail UUID;
  n INTEGER := 0;
BEGIN
  SELECT * INTO c FROM campagne WHERE id = p_campagna FOR UPDATE;
  IF c.stato NOT IN ('bozza', 'programmata') THEN
    RAISE EXCEPTION 'Campagna %: non si invia', c.stato USING ERRCODE = 'check_violation';
  END IF;
  IF c.canale <> 'email' THEN
    RAISE EXCEPTION 'Canale % predisposto: il collegamento al fornitore si attiva su richiesta', c.canale;
  END IF;
  IF c.url_base IS NULL THEN RAISE EXCEPTION 'Manca l''indirizzo dell''app per il link di disiscrizione'; END IF;
  IF NOT EXISTS (SELECT 1 FROM campagne_destinatari WHERE campagna_id = p_campagna) THEN
    PERFORM campagna_prepara_interna(p_campagna);
  END IF;
  -- Prima la campagna (sola lettura della demo), poi la posta.
  UPDATE campagne SET stato = 'inviata', inviata_at = NOW() WHERE id = p_campagna;

  UPDATE campagne_destinatari cd SET stato = 'escluso', motivo_esclusione = 'Consenso revocato prima dell''invio'
    FROM contatti k
   WHERE cd.campagna_id = p_campagna AND cd.stato = 'in_coda' AND k.id = cd.contatto_id AND NOT k.consenso_marketing;

  FOR r IN SELECT cd.id, cd.indirizzo, cd.token, k.nome
             FROM campagne_destinatari cd JOIN contatti k ON k.id = cd.contatto_id
            WHERE cd.campagna_id = p_campagna AND cd.stato = 'in_coda' LOOP
    v_testo := replace(c.corpo, '{{nome}}', COALESCE(r.nome, ''));
    v_link := rtrim(c.url_base, '/') || '/disiscrizione?t=' || r.token;
    INSERT INTO mail_outbox (destinatario, oggetto, corpo_testo, corpo_html)
    VALUES (r.indirizzo, c.oggetto,
            v_testo || E'\n\n—\nNon vuoi più ricevere queste comunicazioni? ' || v_link,
            '<div style="font-family:system-ui,sans-serif;line-height:1.5">'
              || replace(html_escape(v_testo), E'\n', '<br>')
              || '</div><p style="color:#64748b;font-size:12px;margin-top:24px">Non vuoi più ricevere queste comunicazioni? '
              || '<a href="' || html_escape(v_link) || '">Disiscriviti</a></p>')
    RETURNING id INTO v_mail;
    UPDATE campagne_destinatari SET stato = 'inviato', mail_id = v_mail, inviato_at = NOW() WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Ingressi per l'app: solo admin e manager del modulo.
CREATE OR REPLACE FUNCTION prepara_campagna(p_campagna UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT puo_amministrazione()
     OR NOT EXISTS (SELECT 1 FROM campagne WHERE id = p_campagna AND modulo_attivo(modulo)) THEN
    RAISE EXCEPTION 'Operazione non consentita' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN campagna_prepara_interna(p_campagna);
END;
$$;
CREATE OR REPLACE FUNCTION invia_campagna(p_campagna UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT puo_amministrazione()
     OR NOT EXISTS (SELECT 1 FROM campagne WHERE id = p_campagna AND modulo_attivo(modulo)) THEN
    RAISE EXCEPTION 'Operazione non consentita' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN campagna_invia_interna(p_campagna);
END;
$$;

-- Riepilogo con l'esito della posta (mail_outbox non è leggibile dagli utenti).
CREATE OR REPLACE FUNCTION campagna_riepilogo(p_campagna UUID)
RETURNS TABLE (in_coda INT, inviati INT, consegnati_al_relay INT, falliti INT, esclusi INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT count(*) FILTER (WHERE d.stato = 'in_coda')::int,
         count(*) FILTER (WHERE d.stato = 'inviato')::int,
         count(*) FILTER (WHERE m.inviata_at IS NOT NULL)::int,
         count(*) FILTER (WHERE m.inviata_at IS NULL AND m.tentativi >= 5)::int,
         count(*) FILTER (WHERE d.stato = 'escluso')::int
    FROM campagne_destinatari d
    JOIN campagne c ON c.id = d.campagna_id
    LEFT JOIN mail_outbox m ON m.id = d.mail_id
   WHERE d.campagna_id = p_campagna AND modulo_attivo(c.modulo) AND puo_amministrazione()
$$;

-- Link di disiscrizione: pubblico, il token è casuale e vale per una
-- persona. Restituisce sempre true per non rivelare quali token esistono.
CREATE OR REPLACE FUNCTION revoca_consenso_marketing(p_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_contatto UUID;
  v_codice TEXT;
BEGIN
  SELECT d.contatto_id, c.codice INTO v_contatto, v_codice
    FROM campagne_destinatari d JOIN campagne c ON c.id = d.campagna_id
   WHERE d.token = p_token;
  IF v_contatto IS NOT NULL THEN
    UPDATE contatti SET consenso_marketing = false,
                        consenso_marketing_fonte = 'Disiscrizione dalla campagna ' || v_codice
     WHERE id = v_contatto AND consenso_marketing;
  END IF;
  RETURN true;
END;
$$;

-- Programmazione: il cron invia le campagne arrivate all'ora.
CREATE OR REPLACE FUNCTION invia_campagne_programmate()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN SELECT id FROM campagne
            WHERE stato = 'programmata' AND programmata_at <= NOW() AND modulo_attivo(modulo)
            ORDER BY programmata_at LOOP
    BEGIN
      PERFORM campagna_invia_interna(r.id);
      n := n + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Campagna % non inviata: %', r.id, SQLERRM;
    END;
  END LOOP;
  RETURN n;
END;
$$;

SELECT cron.unschedule('invia-campagne-programmate')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invia-campagne-programmate');
SELECT cron.schedule('invia-campagne-programmate', '*/10 * * * *', $$SELECT invia_campagne_programmate()$$);

-- ═══ TRIGGER COMUNI, RLS, PROTEZIONI ═════════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  -- Anagrafiche con updated_at e audit.
  FOREACH t IN ARRAY ARRAY['fid_programmi','fid_tessere','gift_card','coupon','feedback',
                           'turni_modelli','turni','turni_fabbisogno','campagne'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['fid_programmi','fid_tessere','fid_movimenti','gift_card','gift_card_movimenti',
                           'coupon','coupon_utilizzi','feedback','turni_modelli','turni','turni_fabbisogno',
                           'campagne','campagne_destinatari','campagne_segmenti'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  -- Lettura: chi ha il modulo.
  FOREACH t IN ARRAY ARRAY['fid_programmi','fid_tessere','fid_movimenti','gift_card','gift_card_movimenti',
                           'coupon','coupon_utilizzi','feedback','turni_modelli','turni','turni_fabbisogno','campagne'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
  END LOOP;

  -- Operatività di cassa e sala: chiunque nel modulo.
  FOREACH t IN ARRAY ARRAY['fid_tessere','fid_movimenti','gift_card','feedback'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['fid_tessere','gift_card','feedback'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;

  -- Regole, turni e campagne: admin e manager.
  FOREACH t IN ARRAY ARRAY['fid_programmi','coupon','turni_modelli','turni','turni_fabbisogno','campagne'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;

  -- Cancellazione: solo admin; i registri a movimenti non si cancellano
  -- (gli utilizzi dei coupon sì: è lo storno, e restituisce lo sconto).
  FOREACH t IN ARRAY ARRAY['fid_programmi','fid_tessere','gift_card','coupon','coupon_utilizzi','feedback',
                           'turni_modelli','turni','turni_fabbisogno','campagne'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;
END $$;

-- Destinatari (indirizzi personali): solo admin e manager, sola lettura.
CREATE POLICY "campagne_destinatari_select" ON campagne_destinatari FOR SELECT TO authenticated
  USING (modulo_attivo(modulo) AND puo_amministrazione());
CREATE POLICY "campagne_segmenti_select" ON campagne_segmenti FOR SELECT TO authenticated
  USING (modulo IS NULL OR modulo_attivo(modulo));

GRANT SELECT ON fid_saldi, gift_card_saldi, feedback_nps, turni_ore_settimana TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  -- Interne: solo trigger, cron e funzioni di sistema.
  FOREACH f IN ARRAY ARRAY[
    'fid_tessera_prepara()','fid_tessera_benvenuto()','fid_movimento_controlla()','conto_pagamento_gift_card()',
    'coupon_utilizzo_storno()','feedback_risolto_at()','feedback_avvisa()','turno_controlla()',
    'campagna_set_codice()','campagna_inviata_bloccata()','campagna_prepara_interna(uuid)','campagna_invia_interna(uuid)',
    'invia_campagne_programmate()','seg_tutti_i_contatti(text,jsonb)','seg_tesserati(text,jsonb)',
    'seg_tesserati_inattivi(text,jsonb)','seg_promotori(text,jsonb)','seg_detrattori(text,jsonb)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
    'fid_registra_acquisto(uuid,numeric,text,uuid)','fid_riscatta_premio(uuid,text,uuid)','applica_coupon(uuid,text)',
    'turni_carenze(text,date,date)','turni_persone(text)','prepara_campagna(uuid)','invia_campagna(uuid)',
    'genera_codice_gift_card()',
    'campagna_riepilogo(uuid)','html_escape(text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;
-- La disiscrizione arriva da chi non ha un accesso.
REVOKE ALL ON FUNCTION revoca_consenso_marketing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION revoca_consenso_marketing(uuid) TO anon, authenticated;

SELECT applica_protezioni_tabelle();
