-- ═══════════════════════════════════════════════════════════════════
-- MODULI 2 · FONDAMENTA F0.2 + F0.3 — Asset e manutenzioni, Cassa e conti
--
-- F0.2 ASSET: attrezzature fitness, forni e frigoriferi, macchine da caffè,
-- impianti dell'hotel, cancelli e colonnine del garage. Garanzie,
-- contratti di assistenza e piani di manutenzione finiscono nello
-- scadenzario comune (`scadenze_moduli`).
--
-- F0.3 CASSA: conti di tavolo, camera, sosta, ordine o cliente, con
-- righe, divisione, pagamenti misti e parziali, addebito su un altro conto
-- (la consumazione al bar che va in camera), sessioni di cassa con
-- quadratura dei contanti, fattura del nucleo dal conto.
--   ⚠️ Il conto NON è un documento fiscale: lo scontrino (documento
--   commerciale) passa da un registratore telematico. `rt_riferimento` è
--   pronto per collegarlo; finché non c'è, il conto è gestionale.
--   Totale, pagato e residuo si CALCOLANO (vista `conti_saldi`): non
--   possono disallinearsi. Un conto chiuso non si tocca più.
--
-- `modulo_licenziato('fb')` ora vale come `modulo_attivo('fb')`: lo
-- scadenzario, le approvazioni e le notifiche delle fondamenta vedono le
-- righe del motore food & beverage senza riscrivere le loro policy.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION modulo_licenziato(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM moduli_licenze
     WHERE attivo AND slug = ANY (CASE WHEN p_slug = 'fb' THEN ARRAY['ristorante','bar'] ELSE ARRAY[p_slug] END)
  )
$$;
CREATE OR REPLACE FUNCTION modulo_attivo(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT modulo_licenziato(p_slug)
$$;

-- ═══ F0.2 ASSET E MANUTENZIONI ══════════════════════════════════════
CREATE TYPE asset_stato AS ENUM ('in_uso', 'in_manutenzione', 'guasto', 'fuori_servizio', 'dismesso');
CREATE TYPE asset_intervento_tipo AS ENUM ('preventiva', 'ordinaria', 'straordinaria', 'guasto');
CREATE TYPE asset_intervento_stato AS ENUM ('segnalato', 'pianificato', 'in_corso', 'chiuso', 'annullato');
CREATE TYPE asset_priorita AS ENUM ('bassa', 'media', 'alta', 'urgente');

CREATE TABLE asset (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                      TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  codice                      TEXT UNIQUE,      -- AST-AAAA-NNNN
  categoria                   TEXT,             -- tapis roulant, forno, ascensore, colonnina…
  descrizione                 TEXT NOT NULL,
  marca                       TEXT,
  modello                     TEXT,
  matricola                   TEXT,
  data_acquisto               DATE,
  costo_acquisto              NUMERIC(12,2) CHECK (costo_acquisto >= 0),
  fornitore_id                UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  garanzia_scadenza           DATE,
  assistenza_fornitore_id     UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  assistenza_scadenza         DATE,
  ubicazione                  TEXT,
  ambito_tipo                 TEXT,             -- 'camera','sala','struttura'…
  ambito_id                   UUID,
  stato                       asset_stato NOT NULL DEFAULT 'in_uso',
  vita_utile_anni             INT CHECK (vita_utile_anni > 0),
  dismesso_il                 DATE,
  attributi                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  note                        TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                  UUID REFERENCES user_profiles(id),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                  UUID REFERENCES user_profiles(id)
);
ALTER TABLE asset ADD COLUMN ricerca tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', coalesce(codice,'') || ' ' || coalesce(descrizione,'') || ' ' ||
    coalesce(marca,'') || ' ' || coalesce(modello,'') || ' ' || coalesce(matricola,''))) STORED;
CREATE INDEX idx_asset_ricerca ON asset USING GIN (ricerca);
CREATE INDEX idx_asset_modulo ON asset (modulo, stato, categoria);
CREATE INDEX idx_asset_ambito ON asset (ambito_tipo, ambito_id);

CREATE OR REPLACE FUNCTION asset_set_codice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.codice := genera_codice('AST');
  RETURN NEW;
END;
$$;
CREATE TRIGGER asset_set_codice BEFORE INSERT ON asset
  FOR EACH ROW WHEN (NEW.codice IS NULL) EXECUTE FUNCTION asset_set_codice();

CREATE TABLE asset_piani (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id      UUID NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
  modulo        TEXT NOT NULL,
  descrizione   TEXT NOT NULL,            -- «Revisione semestrale», «Sanificazione cappa»
  ogni_giorni   INT NOT NULL CHECK (ogni_giorni > 0),
  prossima_data DATE NOT NULL,
  attivo        BOOLEAN NOT NULL DEFAULT true,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_asset_piani ON asset_piani (asset_id, attivo);

CREATE TABLE asset_interventi (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id          UUID NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
  modulo            TEXT NOT NULL,
  piano_id          UUID REFERENCES asset_piani(id) ON DELETE SET NULL,
  tipo              asset_intervento_tipo NOT NULL DEFAULT 'ordinaria',
  priorita          asset_priorita NOT NULL DEFAULT 'media',
  stato             asset_intervento_stato NOT NULL DEFAULT 'segnalato',
  descrizione       TEXT NOT NULL,
  segnalato_da      UUID REFERENCES user_profiles(id),
  segnalato_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_pianificata  DATE,
  data_intervento   DATE,
  tecnico           TEXT,
  fornitore_id      UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  ricambi           TEXT,
  costo_manodopera  NUMERIC(12,2) CHECK (costo_manodopera >= 0),
  costo_ricambi     NUMERIC(12,2) CHECK (costo_ricambi >= 0),
  ore_fermo         NUMERIC(8,1) CHECK (ore_fermo >= 0),
  esito             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_asset_interventi ON asset_interventi (asset_id, segnalato_at DESC);
CREATE INDEX idx_asset_interventi_aperti ON asset_interventi (modulo, stato) WHERE stato NOT IN ('chiuso', 'annullato');

CREATE OR REPLACE FUNCTION asset_figlio_modulo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  SELECT modulo INTO NEW.modulo FROM asset WHERE id = NEW.asset_id;
  IF NEW.modulo IS NULL THEN RAISE EXCEPTION 'Asset inesistente'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER asset_piani_modulo BEFORE INSERT OR UPDATE OF asset_id ON asset_piani
  FOR EACH ROW EXECUTE FUNCTION asset_figlio_modulo();
CREATE TRIGGER asset_interventi_modulo BEFORE INSERT OR UPDATE OF asset_id ON asset_interventi
  FOR EACH ROW EXECUTE FUNCTION asset_figlio_modulo();

-- Un guasto aperto mette l'asset in stato «guasto», un intervento in corso
-- in «in manutenzione»; la chiusura dell'ultimo lo rimette in uso e, se
-- l'intervento è di un piano, sposta la prossima data del piano.
CREATE OR REPLACE FUNCTION asset_intervento_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.tipo = 'guasto' AND NEW.stato IN ('segnalato', 'pianificato', 'in_corso')
     AND (TG_OP = 'INSERT' OR OLD.stato IS DISTINCT FROM NEW.stato) THEN
    UPDATE asset SET stato = 'guasto' WHERE id = NEW.asset_id AND stato IN ('in_uso', 'in_manutenzione');
  ELSIF NEW.stato = 'in_corso' AND (TG_OP = 'INSERT' OR OLD.stato IS DISTINCT FROM NEW.stato) THEN
    UPDATE asset SET stato = 'in_manutenzione' WHERE id = NEW.asset_id AND stato = 'in_uso';
  END IF;
  IF NEW.stato IN ('chiuso', 'annullato') AND (TG_OP = 'INSERT' OR OLD.stato IS DISTINCT FROM NEW.stato)
     AND NOT EXISTS (SELECT 1 FROM asset_interventi
                      WHERE asset_id = NEW.asset_id AND id <> NEW.id
                        AND stato IN ('segnalato', 'pianificato', 'in_corso')
                        AND (tipo = 'guasto' OR stato = 'in_corso')) THEN
    UPDATE asset SET stato = 'in_uso' WHERE id = NEW.asset_id AND stato IN ('guasto', 'in_manutenzione');
  END IF;
  IF NEW.stato = 'chiuso' AND (TG_OP = 'INSERT' OR OLD.stato IS DISTINCT FROM 'chiuso') THEN
    NEW.data_intervento := COALESCE(NEW.data_intervento, CURRENT_DATE);
    IF NEW.piano_id IS NOT NULL THEN
      UPDATE asset_piani SET prossima_data = NEW.data_intervento + ogni_giorni WHERE id = NEW.piano_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER asset_interventi_effetti BEFORE INSERT OR UPDATE OF stato ON asset_interventi
  FOR EACH ROW EXECUTE FUNCTION asset_intervento_effetti();

-- Scadenze dello scadenziario comune: garanzia, assistenza, piani.
CREATE OR REPLACE FUNCTION asset_sync_scadenze()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  DELETE FROM scadenze_moduli WHERE entita = 'asset' AND entita_id = NEW.id AND stato = 'aperta';
  IF NEW.stato = 'dismesso' THEN
    UPDATE asset_piani SET attivo = false WHERE asset_id = NEW.id AND attivo;
  ELSE
    IF NEW.garanzia_scadenza IS NOT NULL AND NEW.garanzia_scadenza >= CURRENT_DATE THEN
      INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
      VALUES (NEW.modulo, 'asset', NEW.id, 'Garanzia', NEW.descrizione || COALESCE(' · ' || NEW.codice, ''),
              NEW.garanzia_scadenza, '/' || NEW.modulo || '/attrezzature', NEW.created_by);
    END IF;
    IF NEW.assistenza_scadenza IS NOT NULL AND NEW.assistenza_scadenza >= CURRENT_DATE THEN
      INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
      VALUES (NEW.modulo, 'asset', NEW.id, 'Contratto di assistenza', NEW.descrizione || COALESCE(' · ' || NEW.codice, ''),
              NEW.assistenza_scadenza, '/' || NEW.modulo || '/attrezzature', NEW.created_by);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER asset_sync_scadenze AFTER INSERT OR UPDATE OF garanzia_scadenza, assistenza_scadenza, stato ON asset
  FOR EACH ROW EXECUTE FUNCTION asset_sync_scadenze();

CREATE OR REPLACE FUNCTION asset_piano_sync_scadenza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_asset TEXT;
BEGIN
  DELETE FROM scadenze_moduli WHERE entita = 'asset_piani' AND entita_id = NEW.id AND stato = 'aperta';
  IF NEW.attivo THEN
    SELECT descrizione INTO v_asset FROM asset WHERE id = NEW.asset_id;
    INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
    VALUES (NEW.modulo, 'asset_piani', NEW.id, 'Manutenzione programmata',
            NEW.descrizione || ' · ' || COALESCE(v_asset, ''), NEW.prossima_data,
            '/' || NEW.modulo || '/attrezzature', NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER asset_piani_sync_scadenza AFTER INSERT OR UPDATE OF prossima_data, attivo ON asset_piani
  FOR EACH ROW EXECUTE FUNCTION asset_piano_sync_scadenza();

-- Un asset o un piano cancellato non lascia scadenze orfane.
CREATE OR REPLACE FUNCTION asset_pulisci_scadenze()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  DELETE FROM scadenze_moduli WHERE entita = TG_TABLE_NAME AND entita_id = OLD.id;
  RETURN OLD;
END;
$$;
CREATE TRIGGER asset_pulisci_scadenze AFTER DELETE ON asset
  FOR EACH ROW EXECUTE FUNCTION asset_pulisci_scadenze();
CREATE TRIGGER asset_piani_pulisci_scadenze AFTER DELETE ON asset_piani
  FOR EACH ROW EXECUTE FUNCTION asset_pulisci_scadenze();

-- MTBF e costi per asset (indicatori di affidabilità).
CREATE VIEW asset_indicatori WITH (security_invoker = true) AS
SELECT a.id AS asset_id, a.modulo,
       COUNT(i.id) FILTER (WHERE i.tipo = 'guasto')::int AS guasti,
       COALESCE(SUM(i.ore_fermo), 0)::numeric(10,1) AS ore_fermo,
       COALESCE(SUM(COALESCE(i.costo_manodopera, 0) + COALESCE(i.costo_ricambi, 0)), 0)::numeric(12,2) AS costo_interventi,
       COUNT(i.id) FILTER (WHERE i.stato NOT IN ('chiuso', 'annullato'))::int AS interventi_aperti,
       CASE WHEN COUNT(i.id) FILTER (WHERE i.tipo = 'guasto') > 0 AND a.data_acquisto IS NOT NULL
            THEN ROUND((CURRENT_DATE - a.data_acquisto)::numeric
                       / COUNT(i.id) FILTER (WHERE i.tipo = 'guasto'), 1) END AS mtbf_giorni
  FROM asset a LEFT JOIN asset_interventi i ON i.asset_id = a.id
 GROUP BY a.id;

-- ═══ F0.3 CASSA E CONTI ═════════════════════════════════════════════
CREATE TYPE cassa_sessione_stato AS ENUM ('aperta', 'chiusa');
CREATE TYPE conto_stato AS ENUM ('aperto', 'chiuso', 'annullato');
CREATE TYPE pagamento_metodo AS ENUM (
  'contanti', 'pos', 'carta', 'bonifico', 'online', 'buono', 'gift_card', 'coupon',
  'addebito_conto', 'conto_aziendale', 'altro'
);

CREATE TABLE cassa_sessioni (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  postazione       TEXT NOT NULL DEFAULT 'Cassa',
  stato            cassa_sessione_stato NOT NULL DEFAULT 'aperta',
  aperta_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fondo_iniziale   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fondo_iniziale >= 0),
  chiusa_at        TIMESTAMPTZ,
  chiusa_da        UUID REFERENCES user_profiles(id),
  contanti_contati NUMERIC(12,2),
  contanti_attesi  NUMERIC(12,2),
  differenza       NUMERIC(12,2),
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);
-- Una sola sessione aperta per postazione.
CREATE UNIQUE INDEX idx_cassa_sessioni_aperta ON cassa_sessioni (modulo, postazione) WHERE stato = 'aperta';

CREATE TABLE conti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  codice            TEXT UNIQUE,            -- CNT-AAAA-NNNN
  stato             conto_stato NOT NULL DEFAULT 'aperto',
  descrizione       TEXT,                   -- «Tavolo 12», «Camera 104», «Sosta AB123CD»
  riferimento_tipo  TEXT,                   -- tavolo, prenotazione, soggiorno, sosta, ordine, socio…
  riferimento_id    UUID,
  contatto_id       UUID REFERENCES contatti(id) ON DELETE SET NULL,
  organizzazione_id UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  coperti           INT CHECK (coperti >= 0),
  sessione_id       UUID REFERENCES cassa_sessioni(id) ON DELETE SET NULL,
  conto_padre_id    UUID REFERENCES conti(id) ON DELETE SET NULL,  -- conti separati
  sconto_importo    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sconto_importo >= 0),
  aperto_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chiuso_at         TIMESTAMPTZ,
  fattura_id        UUID REFERENCES fatture(id) ON DELETE SET NULL,
  rt_riferimento    TEXT,                   -- documento commerciale del registratore telematico (predisposto)
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_conti_modulo ON conti (modulo, stato, aperto_at DESC);
CREATE INDEX idx_conti_riferimento ON conti (riferimento_tipo, riferimento_id);
CREATE OR REPLACE FUNCTION conto_set_codice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.codice := genera_codice('CNT');
  RETURN NEW;
END;
$$;
CREATE TRIGGER conti_set_codice BEFORE INSERT ON conti
  FOR EACH ROW WHEN (NEW.codice IS NULL) EXECUTE FUNCTION conto_set_codice();

CREATE TABLE conti_righe (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conto_id           UUID NOT NULL REFERENCES conti(id) ON DELETE CASCADE,
  modulo             TEXT NOT NULL,
  descrizione        TEXT NOT NULL,
  articolo_id        UUID REFERENCES mag_articoli(id) ON DELETE SET NULL,
  distinta_id        UUID REFERENCES distinte_base(id) ON DELETE SET NULL,
  quantita           NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (quantita > 0),
  prezzo_unitario    NUMERIC(12,2) NOT NULL CHECK (prezzo_unitario >= 0),
  sconto_percentuale NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (sconto_percentuale BETWEEN 0 AND 100),
  aliquota_iva       NUMERIC(5,2) NOT NULL DEFAULT 22 CHECK (aliquota_iva >= 0),  -- il modulo propone la sua
  importo            NUMERIC(12,2) GENERATED ALWAYS AS
                       (ROUND(quantita * prezzo_unitario * (1 - sconto_percentuale / 100), 2)) STORED,
  persona            SMALLINT,              -- per dividere per persona
  stornata           BOOLEAN NOT NULL DEFAULT false,
  riferimento_tipo   TEXT,                  -- comanda_riga, conto (addebito), servizio…
  riferimento_id     UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_conti_righe_conto ON conti_righe (conto_id);

CREATE TABLE conti_pagamenti (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conto_id              UUID NOT NULL REFERENCES conti(id) ON DELETE CASCADE,
  modulo                TEXT NOT NULL,
  metodo                pagamento_metodo NOT NULL,
  importo               NUMERIC(12,2) NOT NULL CHECK (importo > 0),
  conto_destinazione_id UUID REFERENCES conti(id) ON DELETE RESTRICT,  -- addebito_conto
  organizzazione_id     UUID REFERENCES organizzazioni(id) ON DELETE SET NULL, -- conto_aziendale
  riferimento           TEXT,               -- codice gift card, coupon, transazione POS
  sessione_id           UUID REFERENCES cassa_sessioni(id) ON DELETE SET NULL,
  pagato_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  CONSTRAINT conti_pagamenti_addebito CHECK ((metodo = 'addebito_conto') = (conto_destinazione_id IS NOT NULL))
);
CREATE INDEX idx_conti_pagamenti_conto ON conti_pagamenti (conto_id);
CREATE INDEX idx_conti_pagamenti_sessione ON conti_pagamenti (sessione_id, metodo);

-- Righe e pagamenti: ereditano il modulo dal conto e si toccano solo a
-- conto aperto. Se il conto sparisce (cancellazione a cascata) passano.
CREATE OR REPLACE FUNCTION conto_figlio_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_stato conto_stato;
  v_modulo TEXT;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT stato INTO v_stato FROM conti WHERE id = OLD.conto_id;
    IF NOT FOUND AND TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF v_stato IS DISTINCT FROM 'aperto' THEN
      RAISE EXCEPTION 'Il conto è %: non si modifica', COALESCE(v_stato::text, 'inesistente')
        USING ERRCODE = 'check_violation';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  END IF;
  SELECT stato, modulo INTO v_stato, v_modulo FROM conti WHERE id = NEW.conto_id;
  IF v_stato IS DISTINCT FROM 'aperto' THEN
    RAISE EXCEPTION 'Il conto è %: non si modifica', COALESCE(v_stato::text, 'inesistente')
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'UPDATE' AND v_modulo <> OLD.modulo THEN
    RAISE EXCEPTION 'Le righe si spostano solo tra conti dello stesso modulo (tra moduli si addebita)'
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.modulo := v_modulo;
  RETURN NEW;
END;
$$;
CREATE TRIGGER conti_righe_controlla BEFORE INSERT OR UPDATE OR DELETE ON conti_righe
  FOR EACH ROW EXECUTE FUNCTION conto_figlio_controlla();
CREATE TRIGGER conti_pagamenti_controlla BEFORE INSERT OR DELETE ON conti_pagamenti
  FOR EACH ROW EXECUTE FUNCTION conto_figlio_controlla();

-- Saldi calcolati.
CREATE VIEW conti_saldi WITH (security_invoker = true) AS
SELECT c.id AS conto_id, c.modulo, c.codice, c.stato, c.descrizione,
       GREATEST(COALESCE(r.lordo, 0) - c.sconto_importo, 0)::numeric(12,2) AS totale,
       COALESCE(p.pagato, 0)::numeric(12,2) AS pagato,
       (GREATEST(COALESCE(r.lordo, 0) - c.sconto_importo, 0) - COALESCE(p.pagato, 0))::numeric(12,2) AS residuo
  FROM conti c
  LEFT JOIN (SELECT conto_id, SUM(importo) AS lordo FROM conti_righe WHERE NOT stornata GROUP BY conto_id) r ON r.conto_id = c.id
  LEFT JOIN (SELECT conto_id, SUM(importo) AS pagato FROM conti_pagamenti GROUP BY conto_id) p ON p.conto_id = c.id;

-- Ripartizione per aliquota del totale (sconto di testata distribuito in
-- proporzione): serve all'addebito e alla fattura con più aliquote.
CREATE OR REPLACE FUNCTION conto_per_aliquota(p_conto UUID)
RETURNS TABLE (aliquota_iva NUMERIC, importo NUMERIC)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH r AS (
    SELECT cr.aliquota_iva, SUM(cr.importo) AS lordo
      FROM conti_righe cr WHERE cr.conto_id = p_conto AND NOT cr.stornata
     GROUP BY cr.aliquota_iva
  ), t AS (SELECT SUM(lordo) AS lordo FROM r)
  SELECT r.aliquota_iva,
         ROUND(r.lordo * s.totale / NULLIF(t.lordo, 0), 2)
    FROM r, t, conti_saldi s
   WHERE s.conto_id = p_conto
$$;

-- Non si paga più del dovuto. L'addebito va su un altro conto aperto (e di
-- un modulo attivo) e vi crea le righe corrispondenti, una per aliquota:
-- la consumazione al bar arriva in camera con la sua IVA.
CREATE OR REPLACE FUNCTION conto_pagamento_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_residuo NUMERIC;
  v_totale NUMERIC;
  v_codice TEXT;
  v_dest conti%ROWTYPE;
  v_resto NUMERIC;
  v_quota NUMERIC;
  a RECORD;
  n INT;
  i INT := 0;
BEGIN
  PERFORM 1 FROM conti WHERE id = NEW.conto_id FOR UPDATE;
  SELECT residuo, totale, codice INTO v_residuo, v_totale, v_codice FROM conti_saldi WHERE conto_id = NEW.conto_id;
  IF NEW.importo > v_residuo + 0.005 THEN
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
CREATE TRIGGER conti_pagamenti_controlla_importo BEFORE INSERT ON conti_pagamenti
  FOR EACH ROW EXECUTE FUNCTION conto_pagamento_controlla();

-- Pagamento cancellato (storno, solo admin): l'addebito sparisce anche dal
-- conto di destinazione, che deve essere ancora aperto.
CREATE OR REPLACE FUNCTION conto_pagamento_storno()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.metodo = 'addebito_conto' THEN
    DELETE FROM conti_righe WHERE riferimento_tipo = 'addebito' AND riferimento_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER conti_pagamenti_storno BEFORE DELETE ON conti_pagamenti
  FOR EACH ROW EXECUTE FUNCTION conto_pagamento_storno();

-- Stato del conto: si chiude solo a saldo zero (anche con un UPDATE
-- diretto), non si annulla con pagamenti registrati, e chiuso o annullato
-- non cambia più (restano scrivibili solo fattura, documento commerciale
-- e note).
CREATE OR REPLACE FUNCTION conto_transizioni()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_residuo NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.stato <> 'aperto' THEN
      RAISE EXCEPTION 'Un conto % non si cancella', OLD.stato USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.stato <> 'aperto' THEN
    IF (to_jsonb(NEW) - ARRAY['fattura_id','rt_riferimento','note','updated_at','updated_by'])
       IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['fattura_id','rt_riferimento','note','updated_at','updated_by']) THEN
      RAISE EXCEPTION 'Il conto è %: non si modifica', OLD.stato USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.stato = 'chiuso' THEN
    SELECT residuo INTO v_residuo FROM conti_saldi WHERE conto_id = NEW.id;
    -- lo sconto della testata può cambiare insieme alla chiusura
    v_residuo := v_residuo + (OLD.sconto_importo - NEW.sconto_importo);
    IF abs(v_residuo) > 0.005 THEN
      RAISE EXCEPTION 'Il conto non è saldato: residuo %', v_residuo USING ERRCODE = 'check_violation';
    END IF;
    NEW.chiuso_at := COALESCE(NEW.chiuso_at, NOW());
  ELSIF NEW.stato = 'annullato' AND EXISTS (SELECT 1 FROM conti_pagamenti WHERE conto_id = NEW.id) THEN
    RAISE EXCEPTION 'Il conto ha pagamenti registrati: stornali prima di annullarlo'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER conti_transizioni BEFORE UPDATE OR DELETE ON conti
  FOR EACH ROW EXECUTE FUNCTION conto_transizioni();

CREATE OR REPLACE FUNCTION chiudi_conto(p_conto UUID)
RETURNS VOID
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE conti SET stato = 'chiuso' WHERE id = p_conto AND stato = 'aperto';
  IF NOT FOUND THEN RAISE EXCEPTION 'Conto inesistente o non aperto'; END IF;
END;
$$;

-- Righe spostate su un altro conto (conti separati, cambio tavolo): il
-- totale complessivo non cambia, e il conto di partenza non resta pagato
-- più del dovuto.
CREATE OR REPLACE FUNCTION sposta_righe_conto(p_righe UUID[], p_destinazione UUID)
RETURNS INTEGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  v_partenze UUID[];
  n INTEGER;
BEGIN
  SELECT array_agg(DISTINCT conto_id) INTO v_partenze
    FROM conti_righe WHERE id = ANY (p_righe) AND conto_id <> p_destinazione;
  UPDATE conti_righe SET conto_id = p_destinazione WHERE id = ANY (p_righe) AND conto_id <> p_destinazione;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF EXISTS (SELECT 1 FROM conti_saldi WHERE conto_id = ANY (v_partenze) AND residuo < -0.005) THEN
    RAISE EXCEPTION 'Il conto di partenza resterebbe pagato più del dovuto' USING ERRCODE = 'check_violation';
  END IF;
  RETURN n;
END;
$$;

-- Divisione «alla romana»: il residuo in N quote, i centesimi alle prime.
CREATE OR REPLACE FUNCTION dividi_conto_in_parti(p_conto UUID, p_parti INT)
RETURNS NUMERIC[]
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  v_centesimi BIGINT;
  v_base BIGINT;
  v_resto BIGINT;
  quote NUMERIC[] := '{}';
BEGIN
  IF p_parti < 1 THEN RAISE EXCEPTION 'Numero di parti non valido'; END IF;
  SELECT ROUND(residuo * 100)::bigint INTO v_centesimi FROM conti_saldi WHERE conto_id = p_conto;
  IF v_centesimi IS NULL THEN RAISE EXCEPTION 'Conto inesistente'; END IF;
  v_base := v_centesimi / p_parti;
  v_resto := v_centesimi - v_base * p_parti;
  FOR i IN 1..p_parti LOOP
    quote := quote || ((v_base + CASE WHEN i <= v_resto THEN 1 ELSE 0 END) / 100.0)::numeric(12,2);
  END LOOP;
  RETURN quote;
END;
$$;

-- Quadratura dei contanti alla chiusura della sessione; una sessione
-- chiusa non cambia più.
CREATE OR REPLACE FUNCTION cassa_sessione_chiusa()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.stato = 'chiusa' THEN
    RAISE EXCEPTION 'La sessione di cassa è chiusa: non si modifica' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER cassa_sessioni_chiusa BEFORE UPDATE ON cassa_sessioni
  FOR EACH ROW EXECUTE FUNCTION cassa_sessione_chiusa();

CREATE OR REPLACE FUNCTION chiudi_sessione_cassa(p_sessione UUID, p_contanti_contati NUMERIC)
RETURNS NUMERIC            -- differenza (contati - attesi)
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  v_attesi NUMERIC;
BEGIN
  SELECT s.fondo_iniziale + COALESCE((SELECT SUM(importo) FROM conti_pagamenti
                                       WHERE sessione_id = s.id AND metodo = 'contanti'), 0)
    INTO v_attesi FROM cassa_sessioni s WHERE s.id = p_sessione AND s.stato = 'aperta';
  IF v_attesi IS NULL THEN RAISE EXCEPTION 'Sessione inesistente o già chiusa'; END IF;
  UPDATE cassa_sessioni SET stato = 'chiusa', chiusa_at = NOW(), chiusa_da = auth.uid(),
         contanti_contati = p_contanti_contati, contanti_attesi = v_attesi,
         differenza = p_contanti_contati - v_attesi
   WHERE id = p_sessione;
  RETURN p_contanti_contati - v_attesi;
END;
$$;

-- Fattura del nucleo da un conto chiuso e intestato a un'azienda. Il nucleo
-- gestisce una sola aliquota per fattura: con aliquote miste la fattura si
-- emette dal programma di fatturazione (lo dice l'errore).
CREATE OR REPLACE FUNCTION genera_fattura_da_conto(p_conto UUID, p_numero TEXT, p_scadenza DATE DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  c conti%ROWTYPE;
  v_totale NUMERIC;
  v_aliquote NUMERIC[];
  v_fattura UUID;
BEGIN
  SELECT * INTO c FROM conti WHERE id = p_conto;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Conto inesistente'; END IF;
  IF c.stato <> 'chiuso' THEN RAISE EXCEPTION 'La fattura si emette dal conto chiuso'; END IF;
  IF c.fattura_id IS NOT NULL THEN RAISE EXCEPTION 'Il conto ha già una fattura'; END IF;
  IF c.organizzazione_id IS NULL THEN
    RAISE EXCEPTION 'Per la fattura il conto deve essere intestato a un''azienda';
  END IF;
  SELECT totale INTO v_totale FROM conti_saldi WHERE conto_id = p_conto;
  SELECT array_agg(DISTINCT aliquota_iva) INTO v_aliquote FROM conti_righe WHERE conto_id = p_conto AND NOT stornata;
  IF array_length(v_aliquote, 1) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Aliquote IVA diverse sullo stesso conto: emetti la fattura dal programma di fatturazione';
  END IF;
  INSERT INTO fatture (direzione, numero, data, organizzazione_id, imponibile, aliquota_iva, totale,
                       scadenza, note, created_by)
  VALUES ('attiva', p_numero, CURRENT_DATE, c.organizzazione_id,
          ROUND(v_totale / (1 + v_aliquote[1] / 100), 2), v_aliquote[1], v_totale,
          COALESCE(p_scadenza, CURRENT_DATE), 'Da conto ' || c.codice, auth.uid())
  RETURNING id INTO v_fattura;
  UPDATE conti SET fattura_id = v_fattura WHERE id = p_conto;
  RETURN v_fattura;
END;
$$;

-- ═══ TRIGGER COMUNI, RLS, PROTEZIONI ═════════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['asset','asset_piani','asset_interventi','cassa_sessioni','conti','conti_righe'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['asset','asset_piani','asset_interventi','cassa_sessioni','conti','conti_righe','conti_pagamenti'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_attivo(modulo))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
  END LOOP;
  -- I pagamenti non si modificano: si stornano (si cancellano, admin, a conto aperto).
  FOREACH t IN ARRAY ARRAY['asset','asset_piani','asset_interventi','cassa_sessioni','conti','conti_righe'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['asset','asset_piani','asset_interventi','cassa_sessioni','conti','conti_righe','conti_pagamenti'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;
END $$;

GRANT SELECT ON asset_indicatori, conti_saldi TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['asset_set_codice()','asset_figlio_modulo()','asset_intervento_effetti()',
                           'asset_sync_scadenze()','asset_piano_sync_scadenza()','asset_pulisci_scadenze()',
                           'conto_set_codice()','conto_figlio_controlla()','conto_pagamento_controlla()',
                           'conto_pagamento_storno()','conto_transizioni()','cassa_sessione_chiusa()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY['chiudi_conto(uuid)','sposta_righe_conto(uuid[],uuid)','dividi_conto_in_parti(uuid,integer)',
                           'conto_per_aliquota(uuid)',
                           'chiudi_sessione_cassa(uuid,numeric)','genera_fattura_da_conto(uuid,text,date)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT applica_protezioni_tabelle();
