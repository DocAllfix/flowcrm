-- ═══════════════════════════════════════════════════════════════════
-- RISTORANTE E BAR — completamento dopo la verifica parola per parola
--
-- 1. Prenotazione «Servita» quando esce il primo piatto (documento §8).
-- 2. Tempi di cucina per piatto e postazione: medi, previsti, anomali (§13).
-- 3. Food e beverage cost anche per tipo di bevanda (§26).
-- 4. Semilavorati prodotti in lotti e messi a magazzino (ragù, brodi,
--    impasti, §5 e §19): la produzione scarica gli ingredienti e carica il
--    semilavorato con il suo lotto; i piatti che lo usano scaricano il
--    semilavorato, non più gli ingredienti; il richiamo segue la catena
--    lotto ingrediente → lotto semilavorato → piatto → tavolo (§20).
-- 5. Listini e tempi di consegna dei fornitori (§21, Bar §21) — fondamenta.
-- 6. Punti spendibili alla cassa: cashback e sconti fedeltà (§18).
-- 7. Il cliente collegato alla comanda passa anche al conto (CRM, §16).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Prenotazione servita ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION fb_riga_prenotazione_servita()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE fb_prenotazioni SET stato = 'servita'
   WHERE id = (SELECT prenotazione_id FROM fb_comande WHERE id = NEW.comanda_id) AND stato = 'arrivata';
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_righe_prenotazione_servita AFTER INSERT OR UPDATE OF stato ON fb_comande_righe
  FOR EACH ROW WHEN (NEW.stato = 'servita' AND NEW.stazione_id IS NOT NULL)
  EXECUTE FUNCTION fb_riga_prenotazione_servita();

-- ── 2. Tempi di cucina ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fb_tempi_cucina(p_locale UUID, p_dal DATE, p_al DATE)
RETURNS TABLE (prodotto TEXT, stazione TEXT, piatti INT, tempo_medio_min NUMERIC, tempo_massimo_min NUMERIC,
               tempo_previsto_min INT, in_ritardo INT, attesa_servizio_min NUMERIC)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT p.nome, s.nome, count(*)::int,
         ROUND(AVG(EXTRACT(EPOCH FROM r.pronta_at - r.inviata_at) / 60)::numeric, 1),
         ROUND(MAX(EXTRACT(EPOCH FROM r.pronta_at - r.inviata_at) / 60)::numeric, 1),
         p.tempo_preparazione_min,
         count(*) FILTER (WHERE p.tempo_preparazione_min IS NOT NULL
                            AND r.pronta_at - r.inviata_at > make_interval(mins => p.tempo_preparazione_min))::int,
         ROUND(AVG(EXTRACT(EPOCH FROM r.servita_at - r.pronta_at) / 60)::numeric, 1)
    FROM fb_comande_righe r
    JOIN fb_prodotti p ON p.id = r.prodotto_id
    LEFT JOIN fb_stazioni s ON s.id = r.stazione_id
   WHERE r.locale_id = p_locale AND r.pronta_at IS NOT NULL AND r.inviata_at IS NOT NULL
     AND (r.pronta_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
   GROUP BY p.nome, s.nome, p.tempo_preparazione_min
   ORDER BY 7 DESC, 4 DESC
$$;

-- ── 3. Food cost per tipo di bevanda ─────────────────────────────────
CREATE OR REPLACE FUNCTION fb_food_cost(p_locale UUID, p_dal DATE, p_al DATE, p_dimensione TEXT DEFAULT 'piatto')
RETURNS TABLE (chiave TEXT, quantita NUMERIC, ricavo NUMERIC, costo NUMERIC, margine NUMERIC, food_cost_pct NUMERIC)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM fb_richiede_direzione();
  IF p_dimensione NOT IN ('piatto', 'categoria', 'menu', 'giorno', 'chef', 'canale', 'area', 'bevanda') THEN
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
      ELSE COALESCE((SELECT trim(u.nome || ' ' || COALESCE(u.cognome, '')) FROM user_profiles u WHERE u.id = v.chef_id), 'Non indicato')
    END AS k) d
   WHERE v.locale_id = p_locale AND v.giorno BETWEEN p_dal AND p_al
   GROUP BY k
   ORDER BY SUM(v.ricavo) DESC;
END;
$$;

-- ── 4. Semilavorati a magazzino ──────────────────────────────────────
-- Un semilavorato con un articolo di magazzino collegato non si esplode
-- più: si scarica il suo articolo (in unità di resa), prodotto prima.
CREATE OR REPLACE FUNCTION esplodi_distinta(p_distinta UUID, p_unita NUMERIC DEFAULT 1)
RETURNS TABLE (articolo_id UUID, quantita NUMERIC)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH RECURSIVE esplosione(distinta_id, fattore, livello) AS (
    SELECT p_distinta, p_unita / (SELECT resa FROM distinte_base WHERE id = p_distinta), 0
    UNION ALL
    SELECT r.sotto_distinta_id,
           e.fattore * r.quantita / (1 - r.scarto_percentuale / 100.0) / sd.resa,
           e.livello + 1
      FROM esplosione e
      JOIN distinte_base_righe r ON r.distinta_id = e.distinta_id
      JOIN distinte_base sd ON sd.id = r.sotto_distinta_id
     WHERE sd.articolo_prodotto_id IS NULL AND e.livello < 20
  )
  SELECT x.articolo_id, ROUND(SUM(x.q), 4) FROM (
    SELECT r.articolo_id, e.fattore * r.quantita / (1 - r.scarto_percentuale / 100.0) AS q
      FROM esplosione e JOIN distinte_base_righe r ON r.distinta_id = e.distinta_id
     WHERE r.articolo_id IS NOT NULL
    UNION ALL
    SELECT sd.articolo_prodotto_id, e.fattore * r.quantita / (1 - r.scarto_percentuale / 100.0)
      FROM esplosione e
      JOIN distinte_base_righe r ON r.distinta_id = e.distinta_id
      JOIN distinte_base sd ON sd.id = r.sotto_distinta_id
     WHERE sd.articolo_prodotto_id IS NOT NULL
  ) x
  GROUP BY x.articolo_id
$$;

-- Produzione di un lotto di semilavorato: scarica gli ingredienti (per
-- lotto, in ordine di scadenza) e carica il semilavorato con il suo lotto e
-- il costo calcolato. I movimenti degli ingredienti puntano al lotto
-- prodotto: è la catena che usa il richiamo.
CREATE OR REPLACE FUNCTION mag_produci_distinta(p_distinta UUID, p_quantita NUMERIC,
                                                p_codice_lotto TEXT DEFAULT NULL, p_scadenza DATE DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  d distinte_base%ROWTYPE;
  a mag_articoli%ROWTYPE;
  v_lotto UUID;
  e RECORD;
BEGIN
  IF p_quantita <= 0 THEN RAISE EXCEPTION 'Quantità da produrre non valida'; END IF;
  SELECT * INTO d FROM distinte_base WHERE id = p_distinta;
  IF d.articolo_prodotto_id IS NULL THEN
    RAISE EXCEPTION 'La preparazione «%» non è collegata a un articolo di magazzino', d.nome USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO a FROM mag_articoli WHERE id = d.articolo_prodotto_id;
  INSERT INTO mag_lotti (articolo_id, codice_lotto, data_ricevimento, data_scadenza, created_by)
  VALUES (a.id, COALESCE(p_codice_lotto, 'PROD-' || to_char(NOW() AT TIME ZONE 'Europe/Rome', 'YYYYMMDD-HH24MI')), CURRENT_DATE,
          COALESCE(p_scadenza, CASE WHEN a.durata_giorni IS NOT NULL THEN CURRENT_DATE + a.durata_giorni END), auth.uid())
  RETURNING id INTO v_lotto;
  FOR e IN SELECT * FROM esplodi_distinta(p_distinta, p_quantita) LOOP
    PERFORM mag_scarica(e.articolo_id, e.quantita, 'consumo', 'mag_lotti', v_lotto, 'Produzione di ' || d.nome);
  END LOOP;
  INSERT INTO mag_movimenti (articolo_id, lotto_id, tipo, quantita, costo_unitario, riferimento_tipo, riferimento_id, note, created_by)
  VALUES (a.id, v_lotto, 'carico', p_quantita, costo_distinta(p_distinta), 'distinte_base', p_distinta, 'Prodotto in casa', auth.uid());
  UPDATE mag_articoli SET costo_unitario = COALESCE(costo_distinta(p_distinta), costo_unitario) WHERE id = a.id;
  RETURN v_lotto;
END;
$$;

-- Richiamo lungo la catena delle produzioni.
CREATE OR REPLACE FUNCTION fb_richiamo_lotto(p_lotto UUID)
RETURNS TABLE (servito_at TIMESTAMPTZ, locale TEXT, comanda_numero INT, canale TEXT, tavolo TEXT, prodotto TEXT,
               quantita_lotto NUMERIC, cliente TEXT, recapito TEXT, comanda_id UUID, riga_id UUID)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH RECURSIVE catena(lotto_id, profondita) AS (
    SELECT p_lotto, 0
    UNION
    SELECT m.riferimento_id, c.profondita + 1
      FROM catena c JOIN mag_movimenti m ON m.lotto_id = c.lotto_id
     WHERE m.riferimento_tipo = 'mag_lotti' AND m.riferimento_id IS NOT NULL AND c.profondita < 10
  )
  SELECT COALESCE(r.servita_at, r.pronta_at, m.eseguito_at), l.nome, c.numero, c.canale, t.numero, r.descrizione,
         -m.quantita,
         COALESCE(trim(k.nome || ' ' || COALESCE(k.cognome, '')), c.cliente_nome, pr.nome),
         COALESCE(k.telefono, k.email, c.cliente_telefono, pr.telefono, pr.email),
         c.id, r.id
    FROM mag_movimenti m
    JOIN fb_comande_righe r ON m.riferimento_tipo = 'fb_comande_righe' AND r.id = m.riferimento_id
    JOIN fb_comande c ON c.id = r.comanda_id
    JOIN fb_locali l ON l.id = c.locale_id
    LEFT JOIN fb_tavoli t ON t.id = c.tavolo_id
    LEFT JOIN contatti k ON k.id = c.contatto_id
    LEFT JOIN fb_prenotazioni pr ON pr.id = c.prenotazione_id
   WHERE m.lotto_id IN (SELECT lotto_id FROM catena)
   ORDER BY 1
$$;

-- ── 5. Listini dei fornitori ─────────────────────────────────────────
CREATE TABLE fornitori_listini (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  fornitore_id     UUID NOT NULL REFERENCES organizzazioni(id) ON DELETE CASCADE,
  articolo_id      UUID NOT NULL REFERENCES mag_articoli(id) ON DELETE CASCADE,
  codice_fornitore TEXT,
  prezzo           NUMERIC(12,4) NOT NULL CHECK (prezzo >= 0),
  unita            TEXT,
  minimo_ordine    NUMERIC(14,3) CHECK (minimo_ordine > 0),
  giorni_consegna  INT CHECK (giorni_consegna >= 0),
  valido_dal       DATE NOT NULL DEFAULT CURRENT_DATE,
  valido_al        DATE,
  condizioni       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id),
  UNIQUE (fornitore_id, articolo_id, valido_dal),
  CHECK (valido_al IS NULL OR valido_al >= valido_dal)
);
CREATE INDEX idx_fornitori_listini_articolo ON fornitori_listini (articolo_id, prezzo);
CREATE TRIGGER fornitori_listini_modulo BEFORE INSERT OR UPDATE OF articolo_id ON fornitori_listini
  FOR EACH ROW EXECUTE FUNCTION mag_eredita_modulo();
CREATE TRIGGER fornitori_listini_updated_at BEFORE UPDATE ON fornitori_listini FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER fornitori_listini_freeze_autore BEFORE UPDATE ON fornitori_listini FOR EACH ROW EXECUTE FUNCTION freeze_created_by();
CREATE TRIGGER fornitori_listini_audit AFTER INSERT OR UPDATE OR DELETE ON fornitori_listini FOR EACH ROW EXECUTE FUNCTION log_audit();
ALTER TABLE fornitori_listini ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fornitori_listini_select" ON fornitori_listini FOR SELECT TO authenticated USING (modulo_attivo(modulo));
CREATE POLICY "fornitori_listini_insert" ON fornitori_listini FOR INSERT TO authenticated
  WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid());
CREATE POLICY "fornitori_listini_update" ON fornitori_listini FOR UPDATE TO authenticated
  USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione());
CREATE POLICY "fornitori_listini_delete" ON fornitori_listini FOR DELETE TO authenticated
  USING (modulo_attivo(modulo) AND puo_amministrazione());

-- Il prezzo migliore in vigore per ogni articolo (proposta d'ordine).
CREATE VIEW fornitori_miglior_prezzo WITH (security_invoker = true) AS
SELECT DISTINCT ON (l.articolo_id) l.articolo_id, l.modulo, l.fornitore_id, l.prezzo, l.giorni_consegna, l.minimo_ordine
  FROM fornitori_listini l
 WHERE l.valido_dal <= CURRENT_DATE AND (l.valido_al IS NULL OR l.valido_al >= CURRENT_DATE)
 ORDER BY l.articolo_id, l.prezzo, l.giorni_consegna NULLS LAST;
GRANT SELECT ON fornitori_miglior_prezzo TO authenticated;

-- ── 6. Punti spendibili (cashback) ───────────────────────────────────
-- valore_punto = euro per punto. Con 2 punti per euro e 0,01 € a punto il
-- cliente riceve il 2% della spesa da usare alla visita successiva.
ALTER TABLE fid_programmi ADD COLUMN valore_punto NUMERIC(8,4) CHECK (valore_punto > 0);

CREATE OR REPLACE FUNCTION fid_usa_punti_su_conto(p_tessera UUID, p_conto UUID, p_punti INT)
RETURNS NUMERIC
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  v_valore NUMERIC;
  v_sconto NUMERIC;
  v_totale NUMERIC;
BEGIN
  IF p_punti <= 0 THEN RAISE EXCEPTION 'Punti non validi'; END IF;
  SELECT pr.valore_punto INTO v_valore FROM fid_tessere t JOIN fid_programmi pr ON pr.id = t.programma_id WHERE t.id = p_tessera;
  IF v_valore IS NULL THEN
    RAISE EXCEPTION 'Il programma non prevede punti spendibili alla cassa' USING ERRCODE = 'check_violation';
  END IF;
  v_sconto := ROUND(p_punti * v_valore, 2);
  SELECT totale INTO v_totale FROM conti_saldi WHERE conto_id = p_conto AND stato = 'aperto';
  IF v_totale IS NULL THEN RAISE EXCEPTION 'Conto inesistente o non aperto'; END IF;
  IF v_sconto > v_totale THEN
    RAISE EXCEPTION 'Lo sconto supera il conto (% su %)', v_sconto, v_totale USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO fid_movimenti (tessera_id, tipo, punti, riferimento_tipo, riferimento_id, note, created_by)
  VALUES (p_tessera, 'riscatto', -p_punti, 'conto', p_conto, 'Usati alla cassa: ' || v_sconto || ' €', auth.uid());
  UPDATE conti SET sconto_importo = sconto_importo + v_sconto WHERE id = p_conto;
  RETURN v_sconto;
END;
$$;

-- ── 7. Cliente della comanda → conto ─────────────────────────────────
CREATE OR REPLACE FUNCTION fb_comanda_cliente_conto()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE conti SET contatto_id = NEW.contatto_id WHERE id = NEW.conto_id AND stato = 'aperto';
  RETURN NEW;
END;
$$;
CREATE TRIGGER fb_comande_cliente_conto AFTER UPDATE OF contatto_id ON fb_comande
  FOR EACH ROW WHEN (NEW.conto_id IS NOT NULL) EXECUTE FUNCTION fb_comanda_cliente_conto();

-- ── Permessi ─────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION fb_riga_prenotazione_servita() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION fb_comanda_cliente_conto() FROM PUBLIC, anon, authenticated;
DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['fb_tempi_cucina(uuid,date,date)', 'mag_produci_distinta(uuid,numeric,text,date)',
                           'fid_usa_punti_su_conto(uuid,uuid,integer)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT applica_protezioni_tabelle();
