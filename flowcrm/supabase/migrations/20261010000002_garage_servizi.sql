-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Garage e autorimesse (Sprint 6) · 2/2: chiavi in custodia, danni
-- e anomalie, colonnine e ricariche, servizi aggiuntivi, deposito gomme,
-- lista d'attesa, convenzioni in fattura, giro notturno, indicatori,
-- cruscotto, segmenti delle campagne, ricerca.
--
-- Documento Garage §12–13, §15–25.
--
-- Impianti e manutenzioni (§18) sono gli asset delle fondamenta con modulo
-- `garage`; allarmi e sicurezza (§17) sono le segnalazioni di sicurezza
-- delle fondamenta: videosorveglianza, antincendio e rilevatori sono
-- predisposti e vi scrivono come fa l'operatore.
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. CHIAVI IN CUSTODIA (§15) ════════════════════════════════════
CREATE TABLE gar_chiavi (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  struttura_id UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  numero       TEXT NOT NULL,
  veicolo_id   UUID REFERENCES gar_veicoli(id) ON DELETE SET NULL,
  targa        TEXT,
  cliente_id   UUID REFERENCES gar_clienti(id) ON DELETE SET NULL,
  armadietto   TEXT,
  posizione    TEXT,
  stato        TEXT NOT NULL DEFAULT 'in_custodia' CHECK (stato IN ('in_custodia', 'consegnata', 'restituita')),
  in_mano_a    TEXT,                                      -- chi ce l'ha quando è fuori
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id)
);
CREATE UNIQUE INDEX idx_gar_chiavi_numero ON gar_chiavi (struttura_id, numero) WHERE stato <> 'restituita';

-- Ogni passaggio di mano: il registro non si modifica.
CREATE TABLE gar_chiavi_movimenti (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  chiave_id    UUID NOT NULL REFERENCES gar_chiavi(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL CHECK (tipo IN ('deposito', 'consegna', 'rientro', 'restituzione')),
  persona      TEXT,                                      -- a chi (consegna, restituzione) o da chi (rientro)
  motivo       TEXT,
  operatore_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  avvenuto_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_gar_chiavi_movimenti ON gar_chiavi_movimenti (chiave_id, avvenuto_at DESC);

CREATE OR REPLACE FUNCTION gar_chiave_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.targa IS NOT NULL THEN NEW.targa := NULLIF(gar_targa(NEW.targa), ''); END IF;
  IF NEW.veicolo_id IS NOT NULL THEN
    SELECT v.targa, COALESCE(NEW.cliente_id, v.cliente_id) INTO NEW.targa, NEW.cliente_id FROM gar_veicoli v WHERE v.id = NEW.veicolo_id;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.stato := 'in_custodia'; NEW.in_mano_a := NULL;
  ELSIF (NEW.stato, NEW.in_mano_a) IS DISTINCT FROM (OLD.stato, OLD.in_mano_a) AND auth.uid() IS NOT NULL
        AND current_setting('gar.interno', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Lo stato della chiave cambia registrando la consegna o il rientro' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_chiavi_prepara BEFORE INSERT OR UPDATE ON gar_chiavi FOR EACH ROW EXECUTE FUNCTION gar_chiave_prepara();

CREATE OR REPLACE FUNCTION gar_chiave_depositata()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO gar_chiavi_movimenti (chiave_id, tipo, motivo, created_by) VALUES (NEW.id, 'deposito', 'Presa in custodia', NEW.created_by);
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_chiavi_depositata AFTER INSERT ON gar_chiavi FOR EACH ROW EXECUTE FUNCTION gar_chiave_depositata();

CREATE OR REPLACE FUNCTION gar_chiave_movimento()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  k gar_chiavi%ROWTYPE;
  v_nuovo TEXT;
BEGIN
  SELECT * INTO k FROM gar_chiavi WHERE id = NEW.chiave_id FOR UPDATE;
  NEW.operatore_id := COALESCE(auth.uid(), NEW.operatore_id, NEW.created_by);
  NEW.avvenuto_at := NOW();
  IF NEW.tipo = 'deposito' THEN RETURN NEW; END IF;      -- lo scrive la presa in custodia
  IF k.stato = 'restituita' THEN RAISE EXCEPTION 'La chiave è già stata restituita al cliente' USING ERRCODE = 'check_violation'; END IF;
  IF NEW.tipo = 'consegna' AND k.stato <> 'in_custodia' THEN
    RAISE EXCEPTION 'La chiave è già fuori: ce l''ha %', COALESCE(k.in_mano_a, 'qualcuno') USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.tipo = 'rientro' AND k.stato <> 'consegnata' THEN RAISE EXCEPTION 'La chiave è già in custodia' USING ERRCODE = 'check_violation'; END IF;
  IF NEW.tipo IN ('consegna', 'restituzione') AND COALESCE(trim(NEW.persona), '') = '' THEN
    RAISE EXCEPTION 'Indica a chi va la chiave' USING ERRCODE = 'check_violation';
  END IF;
  v_nuovo := CASE NEW.tipo WHEN 'consegna' THEN 'consegnata' WHEN 'rientro' THEN 'in_custodia' ELSE 'restituita' END;
  PERFORM set_config('gar.interno', '1', true);
  UPDATE gar_chiavi SET stato = v_nuovo, in_mano_a = CASE WHEN v_nuovo = 'consegnata' THEN NEW.persona END WHERE id = k.id;
  PERFORM set_config('gar.interno', '0', true);
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_chiavi_movimenti_effetti BEFORE INSERT ON gar_chiavi_movimenti FOR EACH ROW EXECUTE FUNCTION gar_chiave_movimento();

-- ═══ 2. DANNI E ANOMALIE (§16–17) ═══════════════════════════════════
-- Foto, video, verbali e documenti dell'assicurazione sono allegati del danno.
CREATE TABLE gar_danni (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  codice           TEXT UNIQUE,
  struttura_id     UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  sosta_id         UUID REFERENCES gar_soste(id) ON DELETE SET NULL,
  veicolo_id       UUID REFERENCES gar_veicoli(id) ON DELETE SET NULL,
  targa            TEXT,
  cliente_id       UUID REFERENCES gar_clienti(id) ON DELETE SET NULL,
  tipo             TEXT NOT NULL CHECK (tipo IN ('danno_ingresso', 'danno_uscita', 'incidente', 'urto', 'furto', 'smarrimento', 'anomalia', 'contestazione')),
  rilevato_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  descrizione      TEXT NOT NULL,
  testimoni        TEXT,
  relazione        TEXT,
  operatore_id     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  responsabilita   TEXT NOT NULL DEFAULT 'da_accertare' CHECK (responsabilita IN ('da_accertare', 'garage', 'cliente', 'terzi', 'preesistente')),
  assicurazione    TEXT,                                  -- compagnia e numero del sinistro
  importo_stimato  NUMERIC(10,2) CHECK (importo_stimato >= 0),
  segnalazione_id  UUID REFERENCES segnalazioni_sicurezza(id) ON DELETE SET NULL,
  riferimento_video TEXT,                                 -- telecamera e orario della registrazione (predisposto)
  stato            TEXT NOT NULL DEFAULT 'aperto' CHECK (stato IN ('aperto', 'in_gestione', 'chiuso')),
  esito            TEXT,
  chiuso_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_gar_danni_struttura ON gar_danni (struttura_id, rilevato_at DESC);
CREATE INDEX idx_gar_danni_veicolo ON gar_danni (veicolo_id);

CREATE OR REPLACE FUNCTION gar_danno_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE s gar_soste%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.codice IS NULL THEN NEW.codice := genera_codice('DAN'); END IF;
    NEW.operatore_id := COALESCE(NEW.operatore_id, auth.uid());
    IF NEW.sosta_id IS NOT NULL THEN
      SELECT * INTO s FROM gar_soste WHERE id = NEW.sosta_id;
      NEW.targa := COALESCE(NEW.targa, s.targa);
      NEW.veicolo_id := COALESCE(NEW.veicolo_id, s.veicolo_id);
      NEW.cliente_id := COALESCE(NEW.cliente_id, s.cliente_id);
    END IF;
  END IF;
  IF NEW.targa IS NOT NULL THEN NEW.targa := NULLIF(gar_targa(NEW.targa), ''); END IF;
  IF NEW.veicolo_id IS NULL AND NEW.targa IS NOT NULL THEN
    SELECT v.id, COALESCE(NEW.cliente_id, v.cliente_id) INTO NEW.veicolo_id, NEW.cliente_id FROM gar_veicoli v WHERE v.targa = NEW.targa;
  END IF;
  IF NEW.stato = 'chiuso' AND (TG_OP = 'INSERT' OR OLD.stato <> 'chiuso') THEN NEW.chiuso_at := NOW();
  ELSIF NEW.stato <> 'chiuso' THEN NEW.chiuso_at := NULL; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_danni_prepara BEFORE INSERT OR UPDATE ON gar_danni FOR EACH ROW EXECUTE FUNCTION gar_danno_prepara();

CREATE OR REPLACE FUNCTION gar_danno_avvisa()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM gar_notifica_direzione(CASE NEW.tipo WHEN 'danno_ingresso' THEN 'Danno all''ingresso' WHEN 'danno_uscita' THEN 'Danno all''uscita'
                                   ELSE initcap(NEW.tipo) END || COALESCE(' · ' || NEW.targa, ''), left(NEW.descrizione, 200), '/garage/danni',
                                 (CASE WHEN NEW.tipo IN ('furto', 'incidente') THEN 'critical' ELSE 'warning' END)::notifica_tipo);
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_danni_avvisa AFTER INSERT ON gar_danni FOR EACH ROW EXECUTE FUNCTION gar_danno_avvisa();

-- ═══ 3. COLONNINE E RICARICHE (§19) ═════════════════════════════════
CREATE TABLE gar_colonnine (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  struttura_id UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  codice       TEXT NOT NULL,
  posto_id     UUID REFERENCES gar_posti(id) ON DELETE SET NULL,
  asset_id     UUID REFERENCES asset(id) ON DELETE SET NULL,   -- l'impianto, con le sue manutenzioni
  prese        INT NOT NULL DEFAULT 1 CHECK (prese BETWEEN 1 AND 8),
  potenza_kw   NUMERIC(6,1) CHECK (potenza_kw > 0),
  connettore   TEXT,                                      -- Tipo 2, CCS, CHAdeMO…
  tariffa_kwh  NUMERIC(6,3) NOT NULL DEFAULT 0 CHECK (tariffa_kwh >= 0),
  fermo        TEXT CHECK (fermo IN ('guasta', 'fuori_servizio')),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id),
  UNIQUE (struttura_id, codice)
);

CREATE TABLE gar_ricariche (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo         TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  colonnina_id   UUID NOT NULL REFERENCES gar_colonnine(id) ON DELETE CASCADE,
  presa          INT NOT NULL DEFAULT 1 CHECK (presa > 0),
  sosta_id       UUID REFERENCES gar_soste(id) ON DELETE SET NULL,
  veicolo_id     UUID REFERENCES gar_veicoli(id) ON DELETE SET NULL,
  targa          TEXT NOT NULL,
  cliente_id     UUID REFERENCES gar_clienti(id) ON DELETE SET NULL,
  convenzione_id UUID REFERENCES gar_convenzioni(id) ON DELETE SET NULL,
  inizio_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fine_at        TIMESTAMPTZ,
  kwh            NUMERIC(8,3) CHECK (kwh >= 0),
  tariffa_kwh    NUMERIC(6,3) NOT NULL,
  costo          NUMERIC(10,2),
  stato          TEXT NOT NULL DEFAULT 'in_corso' CHECK (stato IN ('in_corso', 'da_pagare', 'pagata', 'in_convenzione')),
  conto_id       UUID REFERENCES conti(id) ON DELETE SET NULL,
  fatturata      BOOLEAN NOT NULL DEFAULT false,
  operatore_id   UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES user_profiles(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID REFERENCES user_profiles(id)
);
-- Una presa ricarica un veicolo alla volta.
CREATE UNIQUE INDEX idx_gar_ricariche_presa ON gar_ricariche (colonnina_id, presa) WHERE fine_at IS NULL;
CREATE INDEX idx_gar_ricariche_inizio ON gar_ricariche (colonnina_id, inizio_at DESC);

CREATE VIEW gar_colonnine_stato WITH (security_invoker = true) AS
SELECT c.id AS colonnina_id, c.struttura_id, c.modulo, c.codice, c.posto_id, p.codice AS posto, c.asset_id, c.prese, c.potenza_kw, c.connettore, c.tariffa_kwh,
       c.fermo, c.note, COALESCE(r.in_uso, 0)::int AS prese_in_uso, (c.prese - COALESCE(r.in_uso, 0))::int AS prese_libere,
       CASE WHEN c.fermo IS NOT NULL THEN c.fermo WHEN COALESCE(r.in_uso, 0) >= c.prese THEN 'in_uso' ELSE 'disponibile' END AS stato
  FROM gar_colonnine c
  LEFT JOIN gar_posti p ON p.id = c.posto_id
  LEFT JOIN (SELECT colonnina_id, count(*) AS in_uso FROM gar_ricariche WHERE fine_at IS NULL GROUP BY colonnina_id) r ON r.colonnina_id = c.id;

-- Conto di cassa per ciò che il garage vende oltre la sosta: da incassare.
CREATE OR REPLACE FUNCTION gar_apri_conto(p_tipo TEXT, p_id UUID, p_descrizione TEXT, p_riga TEXT, p_importo NUMERIC, p_cliente UUID, p_iva NUMERIC DEFAULT 22)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  k gar_clienti%ROWTYPE;
  v_conto UUID;
BEGIN
  SELECT * INTO k FROM gar_clienti WHERE id = p_cliente;
  INSERT INTO conti (modulo, descrizione, riferimento_tipo, riferimento_id, contatto_id, organizzazione_id, created_by)
  VALUES ('garage', p_descrizione, p_tipo, p_id, k.contatto_id, k.organizzazione_id, auth.uid())
  RETURNING id INTO v_conto;
  INSERT INTO conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, riferimento_id, created_by)
  VALUES (v_conto, p_riga, 1, p_importo, p_iva, p_tipo, p_id, auth.uid());
  RETURN v_conto;
END;
$$;

CREATE OR REPLACE FUNCTION gar_ricarica_avvia(p_colonnina UUID, p_targa TEXT, p_presa INT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c gar_colonnine%ROWTYPE;
  v_targa TEXT := gar_targa(p_targa);
  v_presa INT := p_presa;
  s gar_soste%ROWTYPE;
  ve gar_veicoli%ROWTYPE;
  v_id UUID;
BEGIN
  IF NOT modulo_attivo('garage') THEN RAISE EXCEPTION 'Modulo Garage non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO c FROM gar_colonnine WHERE id = p_colonnina FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Colonnina inesistente'; END IF;
  IF c.fermo IS NOT NULL THEN RAISE EXCEPTION 'La colonnina è %', replace(c.fermo, '_', ' ') USING ERRCODE = 'check_violation'; END IF;
  IF v_targa = '' THEN RAISE EXCEPTION 'La targa è obbligatoria' USING ERRCODE = 'check_violation'; END IF;
  IF v_presa IS NULL THEN
    SELECT n INTO v_presa FROM generate_series(1, c.prese) n
     WHERE NOT EXISTS (SELECT 1 FROM gar_ricariche r WHERE r.colonnina_id = c.id AND r.presa = n AND r.fine_at IS NULL) ORDER BY n LIMIT 1;
  END IF;
  IF v_presa IS NULL OR v_presa > c.prese OR EXISTS (SELECT 1 FROM gar_ricariche r WHERE r.colonnina_id = c.id AND r.presa = v_presa AND r.fine_at IS NULL) THEN
    RAISE EXCEPTION 'Nessuna presa libera sulla colonnina %', c.codice USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO s FROM gar_soste WHERE struttura_id = c.struttura_id AND targa = v_targa AND uscita_at IS NULL;
  SELECT * INTO ve FROM gar_veicoli WHERE targa = v_targa;
  INSERT INTO gar_ricariche (colonnina_id, presa, sosta_id, veicolo_id, targa, cliente_id, convenzione_id, tariffa_kwh, operatore_id, created_by)
  VALUES (c.id, v_presa, s.id, COALESCE(s.veicolo_id, ve.id), v_targa, COALESCE(s.cliente_id, ve.cliente_id), s.convenzione_id, c.tariffa_kwh, auth.uid(), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Fine ricarica: costo = energia erogata × tariffa della colonnina al momento dell'avvio.
CREATE OR REPLACE FUNCTION gar_ricarica_chiudi(p_ricarica UUID, p_kwh NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r gar_ricariche%ROWTYPE;
  v_costo NUMERIC;
  v_conto UUID;
  v_stato TEXT;
BEGIN
  IF NOT modulo_attivo('garage') THEN RAISE EXCEPTION 'Modulo Garage non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM gar_ricariche WHERE id = p_ricarica FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Ricarica inesistente'; END IF;
  IF r.fine_at IS NOT NULL THEN RAISE EXCEPTION 'Ricarica già conclusa' USING ERRCODE = 'check_violation'; END IF;
  IF p_kwh IS NULL OR p_kwh < 0 THEN RAISE EXCEPTION 'Indica l''energia erogata' USING ERRCODE = 'check_violation'; END IF;
  v_costo := round(p_kwh * r.tariffa_kwh, 2);
  IF v_costo = 0 THEN v_stato := 'pagata';
  ELSIF r.convenzione_id IS NOT NULL THEN v_stato := 'in_convenzione';
  ELSE
    v_stato := 'da_pagare';
    v_conto := gar_apri_conto('gar_ricariche', r.id, 'Ricarica ' || r.targa, 'Ricarica elettrica · ' || replace(trim(to_char(p_kwh, 'FM999990.0##')), '.', ',') || ' kWh',
                              v_costo, r.cliente_id);
  END IF;
  UPDATE gar_ricariche SET fine_at = NOW(), kwh = p_kwh, costo = v_costo, stato = v_stato, conto_id = v_conto WHERE id = r.id;
  RETURN jsonb_build_object('ricarica_id', r.id, 'kwh', p_kwh, 'costo', v_costo, 'conto_id', v_conto, 'stato', v_stato);
END;
$$;

-- ═══ 4. SERVIZI AGGIUNTIVI (§20) ════════════════════════════════════
CREATE TABLE gar_servizi_listino (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  nome         TEXT NOT NULL,
  categoria    TEXT NOT NULL DEFAULT 'altro' CHECK (categoria IN ('lavaggio', 'pulizia_interna', 'sanificazione', 'cambio_pneumatici', 'deposito_pneumatici',
                 'ricarica', 'piccola_manutenzione', 'revisione', 'recupero_consegna', 'custodia_chiavi', 'altro')),
  prezzo       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (prezzo >= 0),
  aliquota_iva NUMERIC(5,2) NOT NULL DEFAULT 22 CHECK (aliquota_iva >= 0),
  durata_min   INT CHECK (durata_min > 0),
  attivo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id)
);

CREATE TABLE gar_servizi (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo         TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  codice         TEXT UNIQUE,
  struttura_id   UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  listino_id     UUID REFERENCES gar_servizi_listino(id) ON DELETE SET NULL,
  descrizione    TEXT,
  categoria      TEXT,
  veicolo_id     UUID REFERENCES gar_veicoli(id) ON DELETE SET NULL,
  targa          TEXT,
  cliente_id     UUID REFERENCES gar_clienti(id) ON DELETE SET NULL,
  sosta_id       UUID REFERENCES gar_soste(id) ON DELETE SET NULL,
  programmato_at TIMESTAMPTZ,
  prezzo         NUMERIC(10,2) CHECK (prezzo >= 0),
  aliquota_iva   NUMERIC(5,2) NOT NULL DEFAULT 22,
  stato          TEXT NOT NULL DEFAULT 'richiesto' CHECK (stato IN ('richiesto', 'in_corso', 'pronto', 'consegnato', 'annullato')),
  operatore_id   UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  iniziato_at    TIMESTAMPTZ,
  pronto_at      TIMESTAMPTZ,
  consegnato_at  TIMESTAMPTZ,
  conto_id       UUID REFERENCES conti(id) ON DELETE SET NULL,
  pagato         BOOLEAN NOT NULL DEFAULT false,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES user_profiles(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_gar_servizi_stato ON gar_servizi (struttura_id, stato, programmato_at);

CREATE OR REPLACE FUNCTION gar_servizio_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  l gar_servizi_listino%ROWTYPE;
  v_conto UUID;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('SRV'); END IF;
  IF NEW.targa IS NOT NULL THEN NEW.targa := NULLIF(gar_targa(NEW.targa), ''); END IF;
  IF NEW.veicolo_id IS NOT NULL THEN
    SELECT v.targa, COALESCE(NEW.cliente_id, v.cliente_id) INTO NEW.targa, NEW.cliente_id FROM gar_veicoli v WHERE v.id = NEW.veicolo_id;
  ELSIF NEW.targa IS NOT NULL THEN
    SELECT v.id, COALESCE(NEW.cliente_id, v.cliente_id) INTO NEW.veicolo_id, NEW.cliente_id FROM gar_veicoli v WHERE v.targa = NEW.targa;
  END IF;
  IF NEW.listino_id IS NOT NULL THEN
    SELECT * INTO l FROM gar_servizi_listino WHERE id = NEW.listino_id;
    NEW.descrizione := COALESCE(NULLIF(trim(NEW.descrizione), ''), l.nome);
    NEW.categoria := l.categoria;
    NEW.aliquota_iva := l.aliquota_iva;
    -- Il prezzo di listino lo cambia solo la direzione.
    IF NEW.prezzo IS NULL OR (auth.uid() IS NOT NULL AND NOT puo_amministrazione() AND (TG_OP = 'INSERT' OR NEW.prezzo IS DISTINCT FROM OLD.prezzo)) THEN
      NEW.prezzo := l.prezzo;
    END IF;
  END IF;
  IF COALESCE(trim(NEW.descrizione), '') = '' THEN RAISE EXCEPTION 'Indica il servizio' USING ERRCODE = 'check_violation'; END IF;
  NEW.prezzo := COALESCE(NEW.prezzo, 0);
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.conto_id, NEW.pagato) IS DISTINCT FROM (OLD.conto_id, OLD.pagato) AND auth.uid() IS NOT NULL
       AND current_setting('gar.interno', true) IS DISTINCT FROM '1' THEN
      RAISE EXCEPTION 'Il servizio si incassa dalla cassa' USING ERRCODE = '42501';
    END IF;
    IF OLD.stato IN ('consegnato', 'annullato') AND NEW.stato <> OLD.stato THEN
      RAISE EXCEPTION 'Il servizio è già %', OLD.stato USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.stato = 'annullato' AND OLD.pagato THEN RAISE EXCEPTION 'Il servizio è già stato pagato' USING ERRCODE = 'check_violation'; END IF;
    IF NEW.stato <> OLD.stato THEN
      IF NEW.stato = 'in_corso' THEN NEW.iniziato_at := COALESCE(NEW.iniziato_at, NOW()); NEW.operatore_id := COALESCE(NEW.operatore_id, auth.uid()); END IF;
      IF NEW.stato IN ('pronto', 'consegnato') THEN NEW.pronto_at := COALESCE(NEW.pronto_at, NOW()); END IF;
      IF NEW.stato = 'consegnato' THEN NEW.consegnato_at := NOW(); END IF;
      -- A lavoro finito nasce il conto da incassare, una volta sola.
      IF NEW.stato IN ('pronto', 'consegnato') AND NEW.conto_id IS NULL AND NEW.prezzo > 0 THEN
        v_conto := gar_apri_conto('gar_servizi', NEW.id, NEW.descrizione || COALESCE(' · ' || NEW.targa, ''), NEW.descrizione, NEW.prezzo, NEW.cliente_id, NEW.aliquota_iva);
        NEW.conto_id := v_conto;
      ELSIF NEW.stato IN ('pronto', 'consegnato') AND NEW.prezzo = 0 THEN
        NEW.pagato := true;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_servizi_prepara BEFORE INSERT OR UPDATE ON gar_servizi FOR EACH ROW EXECUTE FUNCTION gar_servizio_prepara();

-- «Veicolo pronto»: l'avviso al cliente quando il servizio è finito.
CREATE OR REPLACE FUNCTION gar_servizio_pronto()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato = 'pronto' AND OLD.stato IS DISTINCT FROM 'pronto' AND NEW.cliente_id IS NOT NULL THEN
    PERFORM gar_avvisa(NEW.cliente_id, 'Il suo veicolo è pronto', 'il servizio «' || NEW.descrizione || '»' || COALESCE(' sul veicolo ' || NEW.targa, '') || ' è stato completato.');
  END IF;
  -- Il conto del servizio annullato non resta aperto.
  IF NEW.stato = 'annullato' AND OLD.stato <> 'annullato' AND NEW.conto_id IS NOT NULL THEN
    UPDATE conti SET stato = 'annullato' WHERE id = NEW.conto_id AND stato = 'aperto';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_servizi_pronto AFTER UPDATE OF stato ON gar_servizi FOR EACH ROW EXECUTE FUNCTION gar_servizio_pronto();

-- Il conto saldato e chiuso segna pagato ciò a cui si riferisce (ridefinita: ora anche servizi e ricariche).
CREATE OR REPLACE FUNCTION gar_conto_chiuso()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato = 'chiuso' AND OLD.stato <> 'chiuso' AND NEW.riferimento_tipo IN ('gar_soste', 'gar_servizi', 'gar_ricariche') THEN
    PERFORM set_config('gar.interno', '1', true);
    IF NEW.riferimento_tipo = 'gar_soste' THEN
      UPDATE gar_soste SET stato = 'chiusa' WHERE id = NEW.riferimento_id AND stato = 'da_pagare';
    ELSIF NEW.riferimento_tipo = 'gar_servizi' THEN
      UPDATE gar_servizi SET pagato = true WHERE id = NEW.riferimento_id;
    ELSE
      UPDATE gar_ricariche SET stato = 'pagata' WHERE id = NEW.riferimento_id AND stato = 'da_pagare';
    END IF;
    PERFORM set_config('gar.interno', '0', true);
  END IF;
  RETURN NEW;
END;
$$;

-- ═══ 5. DEPOSITO PNEUMATICI (§21) ═══════════════════════════════════
CREATE TABLE gar_pneumatici (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  codice                TEXT UNIQUE,
  struttura_id          UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  cliente_id            UUID NOT NULL REFERENCES gar_clienti(id) ON DELETE RESTRICT,
  veicolo_id            UUID REFERENCES gar_veicoli(id) ON DELETE SET NULL,
  descrizione           TEXT,                              -- «4 invernali con cerchi in lega»
  marca                 TEXT,
  misura                TEXT,                              -- 205/55 R16 91V
  stagione              TEXT NOT NULL DEFAULT 'invernali' CHECK (stagione IN ('estivi', 'invernali', 'quattro_stagioni')),
  quantita              INT NOT NULL DEFAULT 4 CHECK (quantita BETWEEN 1 AND 12),
  con_cerchi            BOOLEAN NOT NULL DEFAULT false,
  numeri_serie          TEXT,                              -- DOT o numeri di serie
  battistrada_mm        NUMERIC(3,1) CHECK (battistrada_mm >= 0),
  data_deposito         DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  posizione             TEXT,                              -- scaffale e ripiano
  stato                 TEXT NOT NULL DEFAULT 'in_deposito' CHECK (stato IN ('in_deposito', 'montati', 'restituiti', 'da_sostituire')),
  restituzione_prevista DATE,
  restituiti_il         DATE,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_gar_pneumatici_cliente ON gar_pneumatici (cliente_id);

CREATE OR REPLACE FUNCTION gar_pneumatici_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('PNE'); END IF;
  IF NEW.stato IN ('restituiti', 'montati') AND (TG_OP = 'INSERT' OR OLD.stato NOT IN ('restituiti', 'montati')) THEN
    NEW.restituiti_il := COALESCE(NEW.restituiti_il, gar_oggi());
  ELSIF NEW.stato IN ('in_deposito', 'da_sostituire') THEN
    NEW.restituiti_il := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_pneumatici_prepara BEFORE INSERT OR UPDATE ON gar_pneumatici FOR EACH ROW EXECUTE FUNCTION gar_pneumatici_prepara();

-- La restituzione prevista (il cambio di stagione) è una scadenza del modulo.
CREATE OR REPLACE FUNCTION gar_pneumatici_scadenza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  DELETE FROM scadenze_moduli WHERE entita = 'gar_pneumatici' AND entita_id = NEW.id AND stato = 'aperta';
  IF NEW.stato = 'in_deposito' AND NEW.restituzione_prevista IS NOT NULL THEN
    INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
    VALUES ('garage', 'gar_pneumatici', NEW.id, 'Cambio gomme', (SELECT nome FROM gar_clienti WHERE id = NEW.cliente_id) || ' · ' || NEW.codice
              || COALESCE(' · ' || NEW.misura, ''), NEW.restituzione_prevista, '/garage/pneumatici', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_pneumatici_scadenza AFTER INSERT OR UPDATE OF stato, restituzione_prevista ON gar_pneumatici FOR EACH ROW EXECUTE FUNCTION gar_pneumatici_scadenza();

-- ═══ 6. LISTA D'ATTESA: «DISPONIBILITÀ POSTO» (§23) ═════════════════
CREATE TABLE gar_attese (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL DEFAULT 'garage' CHECK (modulo = 'garage'),
  struttura_id UUID NOT NULL REFERENCES gar_strutture(id) ON DELETE CASCADE,
  cliente_id   UUID NOT NULL REFERENCES gar_clienti(id) ON DELETE CASCADE,
  tipo_posto   TEXT NOT NULL DEFAULT 'auto' CHECK (tipo_posto IN ('auto', 'moto', 'commerciale', 'elettrico', 'disabili')),
  solo_coperto BOOLEAN NOT NULL DEFAULT false,
  stato        TEXT NOT NULL DEFAULT 'in_attesa' CHECK (stato IN ('in_attesa', 'avvisato', 'soddisfatta', 'annullata')),
  avvisato_il  DATE,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_gar_attese ON gar_attese (struttura_id, stato, created_at);

-- I posti che si possono dare in abbonamento: non fermi e senza un contratto in corso.
CREATE VIEW gar_posti_assegnabili WITH (security_invoker = true) AS
SELECT p.id AS posto_id, p.struttura_id, p.modulo, p.codice, p.piano, p.zona, p.numero, p.tipo, p.coperto, p.canone
  FROM gar_posti p
 WHERE p.fermo IS NULL
   AND NOT EXISTS (SELECT 1 FROM gar_contratti c WHERE c.posto_id = p.id AND c.stato IN ('attivo', 'sospeso') AND (upper_inf(c.periodo) OR upper(c.periodo) > gar_oggi()));

-- Chi aspetta un posto viene avvisato, in ordine di arrivo, quando se ne libera uno adatto.
CREATE OR REPLACE FUNCTION gar_attese_avvisa()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  a RECORD;
  v_liberi INT;
  v_gia INT;
  n INT := 0;
BEGIN
  FOR a IN SELECT * FROM gar_attese WHERE stato = 'in_attesa' ORDER BY created_at LOOP
    SELECT count(*) INTO v_liberi FROM gar_posti_assegnabili p
     WHERE p.struttura_id = a.struttura_id AND p.tipo = a.tipo_posto AND (NOT a.solo_coperto OR p.coperto);
    -- Un posto libero non si promette a due persone.
    SELECT count(*) INTO v_gia FROM gar_attese x
     WHERE x.struttura_id = a.struttura_id AND x.tipo_posto = a.tipo_posto AND x.stato = 'avvisato' AND x.avvisato_il > gar_oggi() - 7;
    IF v_liberi > v_gia THEN
      UPDATE gar_attese SET stato = 'avvisato', avvisato_il = gar_oggi() WHERE id = a.id;
      PERFORM gar_avvisa(a.cliente_id, 'Si è liberato un posto', 'si è liberato un posto ' || a.tipo_posto || ' nella nostra autorimessa. Ci contatti entro una settimana per riservarlo.');
      PERFORM gar_notifica_direzione('Posto per la lista d''attesa', (SELECT nome FROM gar_clienti WHERE id = a.cliente_id) || ' aspettava un posto ' || a.tipo_posto
                                       || ': è stato avvisato.', '/garage/contratti', 'info');
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END;
$$;

-- ═══ 7. PRENOTAZIONI: CONFERMA AL CLIENTE (§23) ═════════════════════
CREATE OR REPLACE FUNCTION gar_prenotazione_avvisa()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato = 'confermata' AND NEW.cliente_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.stato <> 'confermata') THEN
    PERFORM gar_avvisa(NEW.cliente_id, 'Prenotazione confermata', 'la prenotazione ' || NEW.codice || ' è confermata: ingresso '
      || to_char(NEW.ingresso AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY "alle" HH24:MI') || ', uscita ' || to_char(NEW.uscita AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY "alle" HH24:MI')
      || COALESCE(', posto ' || (SELECT codice FROM gar_posti WHERE id = NEW.posto_id), '') || '.');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_prenotazioni_avvisa AFTER INSERT OR UPDATE OF stato ON gar_prenotazioni FOR EACH ROW EXECUTE FUNCTION gar_prenotazione_avvisa();

-- L'anticipo della prenotazione è un conto da incassare subito; all'uscita si scala dalla tariffa.
CREATE OR REPLACE FUNCTION gar_prenotazione_anticipo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM gar_apri_conto('gar_prenotazioni', NEW.id, 'Anticipo ' || NEW.codice || ' · ' || NEW.cliente_nome, 'Anticipo della prenotazione ' || NEW.codice,
                         NEW.anticipo, NEW.cliente_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_prenotazioni_anticipo AFTER INSERT ON gar_prenotazioni FOR EACH ROW WHEN (NEW.anticipo > 0) EXECUTE FUNCTION gar_prenotazione_anticipo();

-- ═══ 8. CONVENZIONI AZIENDALI: CONSUNTIVO E FATTURA (§13) ═══════════
CREATE OR REPLACE FUNCTION gar_convenzione_consuntivo(p_convenzione UUID, p_dal DATE, p_al DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  c gar_convenzioni%ROWTYPE;
  v_da TIMESTAMPTZ := (p_dal::timestamp) AT TIME ZONE 'Europe/Rome';
  v_a TIMESTAMPTZ := ((p_al + 1)::timestamp) AT TIME ZONE 'Europe/Rome';
BEGIN
  IF NOT modulo_attivo('garage') THEN RAISE EXCEPTION 'Modulo Garage non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO c FROM gar_convenzioni WHERE id = p_convenzione;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Convenzione inesistente'; END IF;
  RETURN jsonb_build_object(
    'posti_acquistati', c.posti_acquistati,
    'dentro_adesso', (SELECT count(*) FROM gar_soste WHERE convenzione_id = c.id AND uscita_at IS NULL),
    'autorizzati', (SELECT count(*) FROM gar_autorizzazioni WHERE convenzione_id = c.id AND attiva AND (al IS NULL OR al >= gar_oggi())),
    'accessi', (SELECT count(*) FROM gar_soste WHERE convenzione_id = c.id AND ingresso_at >= v_da AND ingresso_at < v_a),
    'ore', (SELECT COALESCE(round(sum(EXTRACT(EPOCH FROM (COALESCE(uscita_at, NOW()) - ingresso_at))) / 3600, 1), 0)
              FROM gar_soste WHERE convenzione_id = c.id AND ingresso_at >= v_da AND ingresso_at < v_a),
    'oltre_i_posti', (SELECT count(*) FROM gar_soste WHERE convenzione_id = c.id AND ingresso_at >= v_da AND ingresso_at < v_a AND tariffario_id IS NOT NULL),
    'a_consumo', (SELECT COALESCE(sum(importo), 0) FROM gar_soste WHERE convenzione_id = c.id AND uscita_at >= v_da AND uscita_at < v_a),
    'ricariche', (SELECT COALESCE(sum(costo), 0) FROM gar_ricariche WHERE convenzione_id = c.id AND fine_at >= v_da AND fine_at < v_a),
    'da_fatturare', (SELECT COALESCE(sum(importo), 0) FROM gar_soste WHERE convenzione_id = c.id AND uscita_at IS NOT NULL AND NOT fatturata)
                  + (SELECT COALESCE(sum(costo), 0) FROM gar_ricariche WHERE convenzione_id = c.id AND stato = 'in_convenzione' AND NOT fatturata),
    'fatturato_fino', c.fatturato_fino,
    'veicoli', COALESCE((SELECT jsonb_agg(jsonb_build_object('targa', x.targa, 'accessi', x.n, 'ore', x.ore, 'importo', x.importo) ORDER BY x.n DESC)
                 FROM (SELECT targa, count(*) AS n, round(sum(EXTRACT(EPOCH FROM (COALESCE(uscita_at, NOW()) - ingresso_at))) / 3600, 1) AS ore,
                              COALESCE(sum(importo), 0) AS importo
                         FROM gar_soste WHERE convenzione_id = c.id AND ingresso_at >= v_da AND ingresso_at < v_a GROUP BY targa) x), '[]')
  );
END;
$$;

-- Fattura periodica: i mesi di canone non ancora fatturati più le soste oltre
-- i posti acquistati e le ricariche, fino alla data.
CREATE OR REPLACE FUNCTION gar_fattura_convenzione(p_convenzione UUID, p_al DATE, p_numero TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c gar_convenzioni%ROWTYPE;
  k gar_clienti%ROWTYPE;
  v_a TIMESTAMPTZ := ((p_al + 1)::timestamp) AT TIME ZONE 'Europe/Rome';
  v_dal DATE;
  v_fine DATE;
  v_mesi INT := 0;
  v_canoni NUMERIC := 0;
  v_soste NUMERIC := 0;
  v_ricariche NUMERIC := 0;
  v_n_soste INT := 0;
  v_totale NUMERIC;
  v_fattura UUID;
BEGIN
  IF NOT modulo_attivo('garage') OR NOT puo_amministrazione() THEN
    RAISE EXCEPTION 'La fattura la emette la direzione' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO c FROM gar_convenzioni WHERE id = p_convenzione FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Convenzione inesistente'; END IF;
  SELECT * INTO k FROM gar_clienti WHERE id = c.cliente_id;
  IF k.organizzazione_id IS NULL THEN RAISE EXCEPTION 'Il cliente della convenzione non è un''azienda' USING ERRCODE = 'check_violation'; END IF;
  -- Mesi di canone cominciati entro la data e non ancora fatturati.
  v_dal := COALESCE(c.fatturato_fino + 1, c.dal);
  v_fine := v_dal;
  WHILE v_fine <= p_al AND (c.al IS NULL OR v_fine <= c.al) LOOP
    v_mesi := v_mesi + 1;
    v_fine := (v_dal + (v_mesi || ' months')::interval)::date;
  END LOOP;
  v_canoni := v_mesi * c.canone_mensile;
  SELECT COALESCE(sum(importo), 0), count(*) INTO v_soste, v_n_soste FROM gar_soste
   WHERE convenzione_id = c.id AND uscita_at IS NOT NULL AND uscita_at < v_a AND NOT fatturata AND COALESCE(importo, 0) > 0;
  SELECT COALESCE(sum(costo), 0) INTO v_ricariche FROM gar_ricariche
   WHERE convenzione_id = c.id AND stato = 'in_convenzione' AND fine_at < v_a AND NOT fatturata;
  v_totale := v_canoni + v_soste + v_ricariche;
  IF v_totale <= 0 THEN
    RAISE EXCEPTION 'Niente da fatturare fino al %', to_char(p_al, 'DD/MM/YYYY') USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO fatture (direzione, numero, data, organizzazione_id, imponibile, aliquota_iva, totale, scadenza, note, created_by)
  VALUES ('attiva', p_numero, gar_oggi(), k.organizzazione_id, round(v_totale / 1.22, 2), 22, v_totale, gar_oggi() + 30,
          'Convenzione parcheggio ' || COALESCE(c.codice, '') || ' fino al ' || to_char(p_al, 'DD/MM/YYYY') || ': '
            || v_mesi || ' mesi di canone per ' || c.posti_acquistati || ' posti (' || gar_euro(v_canoni) || '), ' || v_n_soste || ' soste oltre i posti ('
            || gar_euro(v_soste) || '), ricariche (' || gar_euro(v_ricariche) || ').', auth.uid())
  RETURNING id INTO v_fattura;
  PERFORM set_config('gar.interno', '1', true);
  UPDATE gar_soste SET fatturata = true WHERE convenzione_id = c.id AND uscita_at IS NOT NULL AND uscita_at < v_a AND NOT fatturata;
  UPDATE gar_ricariche SET fatturata = true WHERE convenzione_id = c.id AND stato = 'in_convenzione' AND fine_at < v_a AND NOT fatturata;
  PERFORM set_config('gar.interno', '0', true);
  IF v_mesi > 0 THEN UPDATE gar_convenzioni SET fatturato_fino = v_fine - 1 WHERE id = c.id; END IF;
  RETURN v_fattura;
END;
$$;

-- ═══ 9. GIRO NOTTURNO ═══════════════════════════════════════════════
-- Rate dei periodi nuovi, rinnovi automatici, contratti scaduti, insoluti
-- dopo 10 giorni con l'avviso, prenotazioni non onorate, lista d'attesa.
CREATE OR REPLACE FUNCTION gar_giro_notturno()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c RECORD;
  r RECORD;
  n_rate INT := 0; n_rinnovi INT := 0; n_scaduti INT := 0; n_insoluti INT := 0; n_avvisi INT := 0; n_attese INT := 0;
BEGIN
  -- Rinnovo automatico: il contratto a termine prosegue di un periodo uguale.
  FOR c IN SELECT * FROM gar_contratti WHERE stato = 'attivo' AND rinnovo_automatico AND recesso_il IS NULL AND fine IS NOT NULL AND fine <= gar_oggi() LOOP
    UPDATE gar_contratti SET fine = (fine + (fine - inizio + 1))::date WHERE id = c.id;
    n_rinnovi := n_rinnovi + 1;
  END LOOP;
  UPDATE gar_contratti SET stato = CASE WHEN recesso_il IS NOT NULL THEN 'disdetto' ELSE 'scaduto' END
   WHERE stato IN ('attivo', 'sospeso') AND COALESCE(recesso_il, fine) < gar_oggi();
  GET DIAGNOSTICS n_scaduti = ROW_COUNT;
  -- Sospensione finita: il contratto torna attivo.
  UPDATE gar_contratti SET stato = 'attivo' WHERE stato = 'sospeso' AND sospeso_al IS NOT NULL AND sospeso_al < gar_oggi();
  FOR c IN SELECT id FROM gar_contratti WHERE stato = 'attivo' AND canone > 0 AND periodicita <> 'una_tantum' LOOP
    n_rate := n_rate + gar_emetti_rate(c.id, gar_oggi() + 5);
  END LOOP;
  -- Scadenza vicina senza rinnovo automatico: avviso al cliente, una volta, 15 giorni prima.
  FOR c IN SELECT * FROM gar_contratti WHERE stato = 'attivo' AND COALESCE(recesso_il, fine) = gar_oggi() + 15 AND (NOT rinnovo_automatico OR recesso_il IS NOT NULL) LOOP
    IF gar_avvisa(c.cliente_id, 'Il suo contratto di parcheggio scade tra 15 giorni',
         'il contratto ' || c.codice || ' scade il ' || to_char(COALESCE(c.recesso_il, c.fine), 'DD/MM/YYYY') || '. Ci contatti per il rinnovo.') THEN
      n_avvisi := n_avvisi + 1;
    END IF;
  END LOOP;
  FOR r IN SELECT * FROM gar_rate WHERE stato = 'da_pagare' AND scadenza < gar_oggi() - 10 FOR UPDATE LOOP
    UPDATE gar_rate SET stato = 'insoluta', avviso_il = gar_oggi() WHERE id = r.id;
    PERFORM gar_avvisa(r.cliente_id, 'Pagamento scaduto', 'risulta da pagare ' || gar_euro(r.importo) || ' (' || r.descrizione || ', scadenza '
      || to_char(r.scadenza, 'DD/MM/YYYY') || '). La preghiamo di regolarizzare.');
    n_insoluti := n_insoluti + 1;
  END LOOP;
  IF n_insoluti > 0 THEN PERFORM gar_notifica_direzione('Nuovi insoluti', n_insoluti || ' canoni sono diventati insoluti.', '/garage/incassi'); END IF;
  UPDATE gar_prenotazioni SET stato = 'non_presentato' WHERE stato IN ('richiesta', 'confermata') AND uscita < NOW();
  n_attese := gar_attese_avvisa();
  RETURN jsonb_build_object('rate', n_rate, 'rinnovi', n_rinnovi, 'scaduti', n_scaduti, 'insoluti', n_insoluti, 'avvisi', n_avvisi, 'attese', n_attese);
END;
$$;

-- ═══ 10. RIEPILOGHI ═════════════════════════════════════════════════
-- I numeri dell'anagrafica (§1): posti in tutto, coperti, scoperti, per tipo.
CREATE VIEW gar_strutture_riepilogo WITH (security_invoker = true) AS
SELECT s.id AS struttura_id, s.modulo, s.nome,
       count(p.id)::int AS posti, (count(p.id) FILTER (WHERE p.coperto))::int AS coperti, (count(p.id) FILTER (WHERE NOT p.coperto))::int AS scoperti,
       (count(p.id) FILTER (WHERE p.tipo = 'auto'))::int AS auto, (count(p.id) FILTER (WHERE p.tipo = 'moto'))::int AS moto,
       (count(p.id) FILTER (WHERE p.tipo = 'commerciale'))::int AS commerciali, (count(p.id) FILTER (WHERE p.tipo = 'elettrico'))::int AS elettrici,
       (count(p.id) FILTER (WHERE p.tipo = 'disabili'))::int AS disabili, (count(p.id) FILTER (WHERE p.fermo IS NOT NULL))::int AS fermi
  FROM gar_strutture s LEFT JOIN gar_posti p ON p.struttura_id = s.id
 GROUP BY s.id;

-- La scheda del cliente in una riga (§4): veicoli, posti, contratti, insoluti, ultimo accesso.
CREATE VIEW gar_clienti_riepilogo WITH (security_invoker = true) AS
SELECT k.id AS cliente_id, k.modulo, k.codice, k.tipo, k.nome, k.telefono, k.email, k.attivo, k.contatto_id, k.organizzazione_id,
       (SELECT count(*) FROM gar_veicoli v WHERE v.cliente_id = k.id)::int AS veicoli,
       (SELECT string_agg(v.targa, ', ' ORDER BY v.targa) FROM gar_veicoli v WHERE v.cliente_id = k.id) AS targhe,
       (SELECT count(*) FROM gar_contratti c WHERE c.cliente_id = k.id AND c.stato IN ('attivo', 'sospeso'))::int AS contratti_attivi,
       (SELECT string_agg(p.codice, ', ' ORDER BY p.codice) FROM gar_contratti c JOIN gar_posti p ON p.id = c.posto_id
         WHERE c.cliente_id = k.id AND c.stato IN ('attivo', 'sospeso')) AS posti,
       (SELECT min(COALESCE(c.recesso_il, c.fine)) FROM gar_contratti c WHERE c.cliente_id = k.id AND c.stato IN ('attivo', 'sospeso')) AS prossima_scadenza,
       (SELECT COALESCE(sum(r.importo), 0) FROM gar_rate r WHERE r.cliente_id = k.id AND r.stato = 'insoluta')::numeric(12,2) AS insoluto,
       (SELECT COALESCE(sum(r.importo), 0) FROM gar_rate r WHERE r.cliente_id = k.id AND r.stato = 'da_pagare')::numeric(12,2) AS da_pagare,
       (SELECT max(s.ingresso_at) FROM gar_soste s WHERE s.cliente_id = k.id) AS ultimo_accesso,
       (SELECT count(*) FROM gar_soste s WHERE s.cliente_id = k.id AND s.uscita_at IS NULL)::int AS dentro
  FROM gar_clienti k;

-- ═══ 11. INDICATORI (§24) ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION gar_kpi(p_struttura UUID, p_dal DATE, p_al DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_da TIMESTAMPTZ := (p_dal::timestamp) AT TIME ZONE 'Europe/Rome';
  v_a TIMESTAMPTZ := ((p_al + 1)::timestamp) AT TIME ZONE 'Europe/Rome';
  v_dir BOOLEAN := puo_amministrazione();
  v_posti INT;
  v_utili INT;
  v_occupati INT;
  v_ore NUMERIC;
  v_ore_occupate NUMERIC;
  v_parcheggio NUMERIC;
  v_abbonamenti NUMERIC;
  v_servizi NUMERIC;
  v_paganti INT;
BEGIN
  IF NOT modulo_attivo('garage') THEN RAISE EXCEPTION 'Modulo Garage non attivo' USING ERRCODE = '42501'; END IF;
  SELECT count(*), count(*) FILTER (WHERE fermo IS NULL) INTO v_posti, v_utili FROM gar_posti WHERE struttura_id = p_struttura;
  SELECT count(*) INTO v_occupati FROM gar_soste WHERE struttura_id = p_struttura AND uscita_at IS NULL;
  v_ore := GREATEST(EXTRACT(EPOCH FROM (LEAST(v_a, NOW()) - v_da)) / 3600, 0);   -- il periodo trascorso finora
  SELECT COALESCE(sum(EXTRACT(EPOCH FROM (LEAST(COALESCE(uscita_at, NOW()), v_a) - GREATEST(ingresso_at, v_da)))) / 3600, 0) INTO v_ore_occupate
    FROM gar_soste WHERE struttura_id = p_struttura AND ingresso_at < v_a AND COALESCE(uscita_at, NOW()) > v_da;
  SELECT COALESCE(sum(importo), 0), count(*) FILTER (WHERE importo > 0) INTO v_parcheggio, v_paganti
    FROM gar_soste WHERE struttura_id = p_struttura AND uscita_at >= v_da AND uscita_at < v_a;
  SELECT COALESCE(sum(r.importo), 0) INTO v_abbonamenti FROM gar_rate r JOIN gar_contratti c ON c.id = r.contratto_id
   WHERE c.struttura_id = p_struttura AND r.stato = 'pagata' AND r.pagata_il BETWEEN p_dal AND p_al;
  SELECT COALESCE((SELECT sum(prezzo) FROM gar_servizi WHERE struttura_id = p_struttura AND stato IN ('pronto', 'consegnato') AND pronto_at >= v_da AND pronto_at < v_a), 0)
       + COALESCE((SELECT sum(r.costo) FROM gar_ricariche r JOIN gar_colonnine k ON k.id = r.colonnina_id
                    WHERE k.struttura_id = p_struttura AND r.fine_at >= v_da AND r.fine_at < v_a), 0) INTO v_servizi;
  RETURN jsonb_build_object(
    'occupazione', jsonb_build_object(
      'posti_totali', v_posti, 'posti_occupati', v_occupati, 'posti_liberi', GREATEST(v_utili - v_occupati, 0),
      'tasso', CASE WHEN v_utili > 0 THEN round(100.0 * v_occupati / v_utili, 1) ELSE 0 END,
      'per_piano', COALESCE((SELECT jsonb_agg(jsonb_build_object('piano', x.piano, 'posti', x.posti, 'occupati', x.occupati) ORDER BY x.piano)
                     FROM (SELECT p.piano, count(*) AS posti, count(s.id) AS occupati FROM gar_posti p
                             LEFT JOIN gar_soste s ON s.posto_id = p.id AND s.uscita_at IS NULL
                            WHERE p.struttura_id = p_struttura GROUP BY p.piano) x), '[]'),
      'per_fascia', COALESCE((SELECT jsonb_agg(jsonb_build_object('ora', y.h, 'media', round(y.m, 1)) ORDER BY y.h)
                     FROM (SELECT x.h, avg(x.n) AS m FROM (
                             SELECT h, (SELECT count(*) FROM gar_soste s WHERE s.struttura_id = p_struttura
                                           AND s.ingresso_at < ((d + (h + 1) * INTERVAL '1 hour') AT TIME ZONE 'Europe/Rome')
                                           AND COALESCE(s.uscita_at, NOW()) > ((d + h * INTERVAL '1 hour') AT TIME ZONE 'Europe/Rome')) AS n
                               FROM generate_series(p_dal::timestamp, LEAST(p_al, gar_oggi())::timestamp, INTERVAL '1 day') d, generate_series(0, 23) h
                              WHERE ((d + h * INTERVAL '1 hour') AT TIME ZONE 'Europe/Rome') < NOW()) x GROUP BY x.h) y), '[]')),
    'economici', CASE WHEN v_dir THEN jsonb_build_object(
      'ricavi_parcheggio', v_parcheggio, 'ricavi_abbonamenti', v_abbonamenti, 'ricavi_servizi', v_servizi,
      'ricavo_medio_posto', CASE WHEN v_posti > 0 THEN round((v_parcheggio + v_abbonamenti) / v_posti, 2) ELSE 0 END,
      'ricavo_medio_veicolo', CASE WHEN v_paganti > 0 THEN round(v_parcheggio / v_paganti, 2) ELSE 0 END,
      'insoluti', (SELECT COALESCE(sum(r.importo), 0) FROM gar_rate r JOIN gar_contratti c ON c.id = r.contratto_id
                    WHERE c.struttura_id = p_struttura AND r.stato = 'insoluta'),
      'da_incassare', (SELECT COALESCE(sum(importo), 0) FROM gar_soste WHERE struttura_id = p_struttura AND stato = 'da_pagare')) END,
    'operativi', jsonb_build_object(
      'ingressi', (SELECT count(*) FROM gar_soste WHERE struttura_id = p_struttura AND ingresso_at >= v_da AND ingresso_at < v_a),
      'uscite', (SELECT count(*) FROM gar_soste WHERE struttura_id = p_struttura AND uscita_at >= v_da AND uscita_at < v_a),
      'permanenza_media_min', (SELECT COALESCE(round(avg(minuti)), 0) FROM gar_soste WHERE struttura_id = p_struttura AND uscita_at >= v_da AND uscita_at < v_a),
      'prenotazioni', (SELECT count(*) FROM gar_prenotazioni WHERE struttura_id = p_struttura AND ingresso >= v_da AND ingresso < v_a
                         AND stato <> 'annullata'),
      'non_presentati', (SELECT count(*) FROM gar_prenotazioni WHERE struttura_id = p_struttura AND ingresso >= v_da AND ingresso < v_a AND stato = 'non_presentato'),
      'tasso_utilizzo', CASE WHEN v_utili > 0 AND v_ore > 0 THEN round(100.0 * v_ore_occupate / (v_utili * v_ore), 1) ELSE 0 END,
      'anomalie', (SELECT count(*) FROM gar_danni WHERE struttura_id = p_struttura AND rilevato_at >= v_da AND rilevato_at < v_a AND tipo IN ('anomalia', 'contestazione', 'smarrimento')),
      'danni', (SELECT count(*) FROM gar_danni WHERE struttura_id = p_struttura AND rilevato_at >= v_da AND rilevato_at < v_a AND tipo NOT IN ('anomalia', 'contestazione', 'smarrimento')),
      'ricariche', (SELECT count(*) FROM gar_ricariche r JOIN gar_colonnine k ON k.id = r.colonnina_id WHERE k.struttura_id = p_struttura AND r.inizio_at >= v_da AND r.inizio_at < v_a),
      'kwh', (SELECT COALESCE(sum(r.kwh), 0) FROM gar_ricariche r JOIN gar_colonnine k ON k.id = r.colonnina_id WHERE k.struttura_id = p_struttura AND r.fine_at >= v_da AND r.fine_at < v_a))
  );
END;
$$;

-- ═══ 12. CRUSCOTTO (§25) ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION gar_cruscotto(p_struttura UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_oggi DATE := gar_oggi();
  v_da TIMESTAMPTZ := (gar_oggi()::timestamp) AT TIME ZONE 'Europe/Rome';
BEGIN
  IF NOT modulo_attivo('garage') THEN RAISE EXCEPTION 'Modulo Garage non attivo' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'posti', (SELECT jsonb_build_object('totali', count(*), 'liberi', count(*) FILTER (WHERE stato = 'libero'), 'occupati', count(*) FILTER (WHERE stato = 'occupato'),
                       'prenotati', count(*) FILTER (WHERE stato = 'prenotato'), 'riservati', count(*) FILTER (WHERE stato = 'riservato'),
                       'fermi', count(*) FILTER (WHERE stato IN ('manutenzione', 'non_disponibile')))
                FROM gar_posti_stato WHERE struttura_id = p_struttura),
    'veicoli_presenti', (SELECT count(*) FROM gar_soste WHERE struttura_id = p_struttura AND uscita_at IS NULL),
    'ingressi_oggi', (SELECT count(*) FROM gar_soste WHERE struttura_id = p_struttura AND ingresso_at >= v_da),
    'uscite_oggi', (SELECT count(*) FROM gar_soste WHERE struttura_id = p_struttura AND uscita_at >= v_da),
    'prenotazioni_oggi', (SELECT count(*) FROM gar_prenotazioni WHERE struttura_id = p_struttura AND stato IN ('richiesta', 'confermata')
                            AND (ingresso AT TIME ZONE 'Europe/Rome')::date = v_oggi),
    'movimenti', COALESCE((SELECT jsonb_agg(m ORDER BY (m->>'quando') DESC) FROM (
                    SELECT jsonb_build_object('sosta_id', x.id, 'verso', x.verso, 'quando', x.quando, 'targa', x.targa, 'posto', p.codice, 'cliente', k.nome, 'ticket', x.ticket) AS m
                      FROM (SELECT id, 'ingresso' AS verso, ingresso_at AS quando, targa, posto_id, cliente_id, ticket FROM gar_soste WHERE struttura_id = p_struttura
                            UNION ALL
                            SELECT id, 'uscita', uscita_at, targa, posto_id, cliente_id, ticket FROM gar_soste WHERE struttura_id = p_struttura AND uscita_at IS NOT NULL) x
                      LEFT JOIN gar_posti p ON p.id = x.posto_id LEFT JOIN gar_clienti k ON k.id = x.cliente_id
                     ORDER BY x.quando DESC LIMIT 12) y), '[]'),
    -- Soste, servizi, ricariche e anticipi con il conto ancora aperto.
    'da_incassare', (SELECT jsonb_build_object('numero', count(*), 'importo', COALESCE(sum(residuo), 0)) FROM conti_saldi
                      WHERE modulo = 'garage' AND stato = 'aperto' AND residuo > 0),
    'abbonamenti_in_scadenza', (SELECT count(*) FROM gar_contratti WHERE struttura_id = p_struttura AND stato IN ('attivo', 'sospeso')
                                  AND COALESCE(recesso_il, fine) BETWEEN v_oggi AND v_oggi + 30),
    'incassi_oggi', (SELECT COALESCE(sum(p.importo), 0) FROM conti_pagamenti p WHERE p.modulo = 'garage' AND p.pagato_at >= v_da),
    'insoluti', (SELECT jsonb_build_object('numero', count(*), 'importo', CASE WHEN puo_amministrazione() THEN COALESCE(sum(r.importo), 0) END)
                   FROM gar_rate r JOIN gar_contratti c ON c.id = r.contratto_id WHERE c.struttura_id = p_struttura AND r.stato = 'insoluta'),
    'allarmi', (SELECT count(*) FROM segnalazioni_sicurezza WHERE modulo = 'garage' AND stato <> 'chiusa')
             + (SELECT count(*) FROM gar_danni WHERE struttura_id = p_struttura AND stato <> 'chiuso'),
    'manutenzioni_aperte', (SELECT count(*) FROM asset_interventi WHERE modulo = 'garage' AND stato NOT IN ('chiuso', 'annullato')),
    'colonnine', (SELECT jsonb_build_object('totali', count(*), 'disponibili', count(*) FILTER (WHERE stato = 'disponibile'), 'in_uso', count(*) FILTER (WHERE stato = 'in_uso'),
                           'ferme', count(*) FILTER (WHERE stato IN ('guasta', 'fuori_servizio')))
                    FROM gar_colonnine_stato WHERE struttura_id = p_struttura),
    'servizi_aperti', (SELECT count(*) FROM gar_servizi WHERE struttura_id = p_struttura AND stato IN ('richiesto', 'in_corso')),
    'chiavi_fuori', (SELECT count(*) FROM gar_chiavi WHERE struttura_id = p_struttura AND stato = 'consegnata'),
    'in_attesa', (SELECT count(*) FROM gar_attese WHERE struttura_id = p_struttura AND stato = 'in_attesa')
  );
END;
$$;

-- ═══ 13. SEGMENTI DELLE CAMPAGNE (§23: promozioni) ══════════════════
CREATE OR REPLACE FUNCTION seg_gar_abbonati(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT k.contatto_id FROM gar_clienti k JOIN gar_contratti c ON c.cliente_id = k.id
   WHERE k.contatto_id IS NOT NULL AND c.stato = 'attivo'
$$;
CREATE OR REPLACE FUNCTION seg_gar_in_scadenza(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT k.contatto_id FROM gar_clienti k JOIN gar_contratti c ON c.cliente_id = k.id
   WHERE k.contatto_id IS NOT NULL AND c.stato = 'attivo'
     AND COALESCE(c.recesso_il, c.fine) BETWEEN gar_oggi() AND gar_oggi() + COALESCE((p_parametri->>'giorni')::int, 30)
$$;
CREATE OR REPLACE FUNCTION seg_gar_occasionali(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT k.contatto_id FROM gar_clienti k JOIN gar_soste s ON s.cliente_id = k.id
   WHERE k.contatto_id IS NOT NULL AND s.contratto_id IS NULL AND s.ingresso_at >= NOW() - (COALESCE((p_parametri->>'mesi')::int, 6) || ' months')::interval
     AND NOT EXISTS (SELECT 1 FROM gar_contratti c WHERE c.cliente_id = k.id AND c.stato IN ('attivo', 'sospeso'))
   GROUP BY k.contatto_id HAVING count(*) >= COALESCE((p_parametri->>'soste')::int, 3)
$$;
CREATE OR REPLACE FUNCTION seg_gar_ex(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT k.contatto_id FROM gar_clienti k JOIN gar_contratti c ON c.cliente_id = k.id
   WHERE k.contatto_id IS NOT NULL AND c.stato IN ('scaduto', 'disdetto')
     AND COALESCE(c.recesso_il, c.fine) >= gar_oggi() - (COALESCE((p_parametri->>'mesi')::int, 12) || ' months')::interval
     AND NOT EXISTS (SELECT 1 FROM gar_contratti x WHERE x.cliente_id = k.id AND x.stato IN ('attivo', 'sospeso'))
$$;
INSERT INTO campagne_segmenti (slug, modulo, etichetta, descrizione, funzione, parametri) VALUES
  ('garage_abbonati', 'garage', 'Abbonati', 'Clienti con un contratto in corso.', 'seg_gar_abbonati', '{}'),
  ('garage_in_scadenza', 'garage', 'Contratti in scadenza', 'Clienti con il contratto che scade nei prossimi giorni.',
     'seg_gar_in_scadenza', '{"giorni": {"etichetta": "Entro (giorni)", "default": 30}}'),
  ('garage_occasionali', 'garage', 'Clienti abituali della sosta breve', 'Chi parcheggia spesso a tariffa e non ha un abbonamento.',
     'seg_gar_occasionali', '{"soste": {"etichetta": "Soste almeno", "default": 3}, "mesi": {"etichetta": "Negli ultimi (mesi)", "default": 6}}'),
  ('garage_ex', 'garage', 'Ex abbonati', 'Contratto finito negli ultimi mesi e nessuno in corso.',
     'seg_gar_ex', '{"mesi": {"etichetta": "Finito da non più di (mesi)", "default": 12}}')
ON CONFLICT (slug) DO NOTHING;

-- ═══ 14. RICERCA ════════════════════════════════════════════════════
-- Il veicolo porta alla scheda del suo cliente (i veicoli senza cliente non hanno una scheda).
CREATE OR REPLACE FUNCTION ricerca_globale(q TEXT)
RETURNS TABLE (
  tipo         TEXT,
  id           UUID,
  titolo       TEXT,
  sottotitolo  TEXT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT * FROM (
    SELECT 'organizzazione' AS tipo, o.id,
           o.ragione_sociale AS titolo,
           COALESCE(o.citta, o.settore, '') AS sottotitolo
    FROM organizzazioni o
    WHERE o.attivo AND o.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'contatto', c.id,
           trim(c.nome || ' ' || COALESCE(c.cognome, '')),
           COALESCE(c.email, c.ruolo_aziendale, '')
    FROM contatti c
    WHERE c.attivo AND c.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'gara', g.id,
           g.codice || ' · ' || g.titolo,
           COALESCE(g.ente_appaltante, g.settore, '')
    FROM gare g
    WHERE g.attivo AND g.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'cantiere', ca.id,
           ca.codice || ' · ' || ca.denominazione,
           COALESCE(ca.citta, ca.categoria_lavori, '')
    FROM cantieri ca
    WHERE ca.attivo AND ca.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'automezzo', au.id,
           COALESCE(au.targa, au.codice) || ' · ' || au.marca || ' ' || au.modello,
           COALESCE(au.centro_costo, au.sede, '')
    FROM automezzi au
    WHERE au.attivo AND au.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'agente', ag.id,
           ag.codice || ' · ' || trim(ag.nome || ' ' || COALESCE(ag.cognome, '')),
           COALESCE(ag.zone, ag.area_geografica, '')
    FROM agenti ag
    WHERE ag.attivo AND ag.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'paziente', pz.id,
           pz.codice || ' · ' || trim(pz.nome || ' ' || COALESCE(pz.cognome, '')),
           COALESCE(pz.codice_fiscale, '')
    FROM pazienti pz
    WHERE pz.attivo AND pz.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'prodotto_fb', pr.id,
           pr.codice || ' · ' || pr.nome,
           COALESCE(pr.descrizione, '')
    FROM fb_prodotti pr
    WHERE pr.stato <> 'sospeso' AND pr.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'prenotazione_fb', pn.id,
           pn.nome || ' · ' || pn.persone || ' persone',
           to_char(pn.inizio AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY HH24:MI')
    FROM fb_prenotazioni pn
    WHERE pn.stato NOT IN ('annullata') AND pn.inizio >= NOW() - INTERVAL '30 days'
      AND pn.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'evento', ev.id,
           ev.codice || ' · ' || ev.titolo,
           ev.modulo || ' · ' || to_char(ev.inizio AT TIME ZONE 'Europe/Rome', 'DD/MM/YYYY')
    FROM eventi ev
    WHERE ev.stato <> 'annullato' AND ev.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'prenotazione_hotel', hp.id,
           hp.codice || ' · ' || hp.ospite_nome,
           to_char(hp.arrivo, 'DD/MM/YYYY') || ' → ' || to_char(hp.partenza, 'DD/MM/YYYY')
    FROM hotel_prenotazioni hp
    WHERE hp.stato NOT IN ('annullata') AND hp.partenza >= (NOW() AT TIME ZONE 'Europe/Rome')::date - 180
      AND hp.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'socio_palestra', so.id,
           so.codice || ' · ' || trim(k.nome || ' ' || COALESCE(k.cognome, '')),
           COALESCE(k.email, k.telefono, '')
    FROM pal_soci so JOIN contatti k ON k.id = so.contatto_id
    WHERE so.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'ordine_fiorista', fo.id,
           fo.codice || ' · ' || fo.committente_nome,
           COALESCE('per ' || fo.destinatario_nome || ' · ', '') || to_char(fo.data_richiesta, 'DD/MM/YYYY')
    FROM fior_ordini fo
    WHERE fo.stato <> 'annullato' AND fo.data_richiesta >= (NOW() AT TIME ZONE 'Europe/Rome')::date - 365
      AND fo.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'veicolo_garage', gv.cliente_id,
           gv.targa || COALESCE(' · ' || NULLIF(trim(COALESCE(gv.marca, '') || ' ' || COALESCE(gv.modello, '')), ''), ''),
           COALESCE((SELECT gk.nome FROM gar_clienti gk WHERE gk.id = gv.cliente_id), '')
    FROM gar_veicoli gv
    WHERE gv.cliente_id IS NOT NULL AND gv.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'cliente_garage', gc.id,
           gc.codice || ' · ' || gc.nome,
           COALESCE(gc.telefono, gc.email, '')
    FROM gar_clienti gc
    WHERE gc.attivo AND gc.ricerca @@ websearch_to_tsquery('simple', q)
  ) t
  LIMIT 20
$$;

-- ═══ 15. RLS, PERMESSI, TEMPO REALE ═════════════════════════════════
-- Chi non è della direzione cambia solo i campi elencati (il fermo di un posto o di una colonnina, le note).
CREATE OR REPLACE FUNCTION gar_solo_campi()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_liberi TEXT[] := ARRAY['updated_at', 'updated_by'];
  i INT;
BEGIN
  IF auth.uid() IS NULL OR puo_amministrazione() THEN RETURN NEW; END IF;
  FOR i IN 0 .. TG_NARGS - 1 LOOP v_liberi := v_liberi || TG_ARGV[i]; END LOOP;
  IF (to_jsonb(NEW) - v_liberi) IS DISTINCT FROM (to_jsonb(OLD) - v_liberi) THEN
    RAISE EXCEPTION 'Questi dati li cambia la direzione' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gar_posti_solo_campi BEFORE UPDATE ON gar_posti FOR EACH ROW EXECUTE FUNCTION gar_solo_campi('fermo', 'note');
CREATE TRIGGER gar_colonnine_solo_campi BEFORE UPDATE ON gar_colonnine FOR EACH ROW EXECUTE FUNCTION gar_solo_campi('fermo', 'note');

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gar_chiavi','gar_danni','gar_colonnine','gar_ricariche','gar_servizi_listino','gar_servizi','gar_pneumatici','gar_attese'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['gar_chiavi','gar_chiavi_movimenti','gar_danni','gar_colonnine','gar_ricariche','gar_servizi_listino','gar_servizi','gar_pneumatici','gar_attese'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
  END LOOP;
  -- Il registro delle chiavi non si cancella; il resto lo cancella l'amministratore.
  FOREACH t IN ARRAY ARRAY['gar_chiavi','gar_danni','gar_colonnine','gar_ricariche','gar_servizi_listino','gar_servizi','gar_pneumatici','gar_attese'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;

  -- Chiavi, danni, servizi, gomme e lista d'attesa: tutto il personale.
  FOREACH t IN ARRAY ARRAY['gar_chiavi','gar_danni','gar_servizi','gar_pneumatici','gar_attese'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;
  EXECUTE $f$CREATE POLICY "gar_chiavi_movimenti_insert" ON gar_chiavi_movimenti FOR INSERT TO authenticated
    WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid() AND tipo <> 'deposito')$f$;

  -- Colonnine e listino dei servizi: la direzione (il personale segna il fermo di una colonnina).
  FOREACH t IN ARRAY ARRAY['gar_colonnine','gar_servizi_listino'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
  END LOOP;
  EXECUTE $f$CREATE POLICY "gar_colonnine_update" ON gar_colonnine FOR UPDATE TO authenticated USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$;
  EXECUTE $f$CREATE POLICY "gar_servizi_listino_update" ON gar_servizi_listino FOR UPDATE TO authenticated
    USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione())$f$;
  -- Le ricariche le scrivono l'avvio e la chiusura.
END $$;

GRANT SELECT ON gar_colonnine_stato, gar_posti_assegnabili, gar_strutture_riepilogo, gar_clienti_riepilogo TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['gar_chiave_prepara()', 'gar_chiave_depositata()', 'gar_chiave_movimento()', 'gar_danno_prepara()', 'gar_danno_avvisa()',
                           'gar_apri_conto(text,uuid,text,text,numeric,uuid,numeric)', 'gar_servizio_prepara()', 'gar_servizio_pronto()', 'gar_conto_chiuso()',
                           'gar_pneumatici_prepara()', 'gar_pneumatici_scadenza()', 'gar_attese_avvisa()', 'gar_prenotazione_avvisa()', 'gar_prenotazione_anticipo()', 'gar_giro_notturno()',
                           'gar_solo_campi()', 'seg_gar_abbonati(text,jsonb)', 'seg_gar_in_scadenza(text,jsonb)', 'seg_gar_occasionali(text,jsonb)',
                           'seg_gar_ex(text,jsonb)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY['gar_ricarica_avvia(uuid,text,integer)', 'gar_ricarica_chiudi(uuid,numeric)', 'gar_convenzione_consuntivo(uuid,date,date)',
                           'gar_fattura_convenzione(uuid,date,text)', 'gar_kpi(uuid,date,date)', 'gar_cruscotto(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('garage-giro-notturno');
SELECT cron.schedule('garage-giro-notturno', '40 2 * * *', $$SELECT gar_giro_notturno()$$);

ALTER PUBLICATION supabase_realtime ADD TABLE gar_soste, gar_posti, gar_prenotazioni, gar_ricariche, gar_servizi;

SELECT applica_protezioni_tabelle();
