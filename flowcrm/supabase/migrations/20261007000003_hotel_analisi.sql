-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Hotel (Sprint 3) · 3/3: analisi, revenue, CRM, fatturazione.
--
-- Documento Hotel §6 CRM alberghiero, §11 e §46 revenue management e KPI
-- (Occupancy, ADR, RevPAR, TRevPAR, GOPPAR, LOS, booking pace, pickup,
-- cancellazioni, no-show, prenotazioni dirette, costo OTA), §30 produzione
-- degli intermediari, §32 fatturazione (aziende, gruppi, tour operator,
-- più aliquote), §37 segmenti di marketing, §44 front office, §45
-- direzione, §47 confronto tra strutture.
-- I suggerimenti di prezzo restano suggerimenti: li applica la direzione.
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. PICKUP: FOTOGRAFIA GIORNALIERA DEL VENDUTO ═══════════════════
CREATE TABLE hotel_pickup (
  struttura_id    UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo          TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  rilevato_il     DATE NOT NULL,
  data            DATE NOT NULL,          -- la notte
  camere_vendute  INT NOT NULL,
  ricavo          NUMERIC(12,2) NOT NULL,
  PRIMARY KEY (struttura_id, rilevato_il, data)
);

CREATE OR REPLACE FUNCTION hotel_rileva_pickup(p_giorno DATE DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  n INT;
BEGIN
  INSERT INTO hotel_pickup (struttura_id, rilevato_il, data, camere_vendute, ricavo)
  SELECT p.struttura_id, p_giorno, nt.data, count(*), COALESCE(SUM(nt.prezzo_camera), 0)
    FROM hotel_notti nt JOIN hotel_prenotazioni p ON p.id = nt.prenotazione_id
   WHERE p.stato IN ('confermata', 'in_soggiorno', 'partita') AND nt.data >= p_giorno AND nt.data < p_giorno + 365
   GROUP BY p.struttura_id, nt.data
  ON CONFLICT (struttura_id, rilevato_il, data) DO UPDATE
    SET camere_vendute = EXCLUDED.camere_vendute, ricavo = EXCLUDED.ricavo;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ═══ 2. KPI ═════════════════════════════════════════════════════════
-- Ricavi del conto camera per reparto, al netto dell'IVA (la tassa di
-- soggiorno non è un ricavo).
CREATE OR REPLACE FUNCTION hotel_reparto_riga(p_rif TEXT, p_rif_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT CASE
    WHEN p_rif = 'hotel_notti' THEN 'camere'
    WHEN p_rif IN ('addebito', 'hotel_minibar_consumi') THEN 'ristorazione'
    WHEN p_rif = 'hotel_servizi_prenotazioni' THEN
      CASE WHEN (SELECT s.tipo FROM hotel_servizi_prenotazioni x JOIN hotel_servizi s ON s.id = x.servizio_id WHERE x.id = p_rif_id)
                IN ('spa', 'massaggio', 'trattamento_benessere', 'sauna', 'piscina', 'percorso_benessere') THEN 'spa' ELSE 'servizi' END
    WHEN p_rif IN ('hotel_parcheggio', 'hotel_transfer') THEN 'servizi'
    WHEN p_rif = 'hotel_tassa' THEN 'tassa'
    ELSE 'altro' END
$$;

CREATE OR REPLACE FUNCTION hotel_kpi(p_struttura UUID, p_dal DATE, p_al DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  s hotel_strutture%ROWTYPE;
  v_disponibili NUMERIC;
  v JSONB;
BEGIN
  IF NOT puo_amministrazione() AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Dati riservati alla direzione' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO s FROM hotel_strutture WHERE id = p_struttura;
  -- Camere-notte vendibili: camere attive meno quelle fuori servizio, giorno per giorno.
  SELECT COALESCE(SUM(camere - fuori_servizio), 0) INTO v_disponibili
    FROM (SELECT data, SUM(camere) AS camere, SUM(fuori_servizio) AS fuori_servizio
            FROM hotel_disponibilita(p_struttura, p_dal, p_al) GROUP BY data) d;

  WITH notti AS (
    SELECT nt.data, nt.prezzo_camera / 1.10 AS ricavo_netto, p.id AS prenotazione_id, p.canale, p.intermediario_id
      FROM hotel_notti nt JOIN hotel_prenotazioni p ON p.id = nt.prenotazione_id
     WHERE p.struttura_id = p_struttura AND p.stato IN ('confermata', 'in_soggiorno', 'partita')
       AND nt.data BETWEEN p_dal AND p_al
  ), righe AS (
    SELECT hotel_reparto_riga(r.riferimento_tipo, r.riferimento_id) AS reparto,
           r.importo / (1 + r.aliquota_iva / 100) AS netto
      FROM conti_righe r JOIN conti c ON c.id = r.conto_id
     WHERE c.modulo = 'hotel' AND NOT r.stornata AND r.riferimento_tipo IS DISTINCT FROM 'hotel_notti'
       AND (r.created_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
       AND (c.riferimento_tipo <> 'hotel_prenotazioni'
            OR EXISTS (SELECT 1 FROM hotel_prenotazioni p WHERE p.id = c.riferimento_id AND p.struttura_id = p_struttura))
  ), reparti AS (
    SELECT 'camere' AS reparto, COALESCE(SUM(ricavo_netto), 0) AS netto FROM notti
    UNION ALL
    SELECT reparto, SUM(netto) FROM righe WHERE reparto <> 'tassa' GROUP BY reparto
  ), arrivi AS (
    SELECT * FROM hotel_prenotazioni WHERE struttura_id = p_struttura AND arrivo BETWEEN p_dal AND p_al
  ), commissioni AS (
    SELECT COALESCE(SUM(n.ricavo_netto * i.commissione_pct / 100), 0) AS tutte,
           COALESCE(SUM(n.ricavo_netto * i.commissione_pct / 100) FILTER (WHERE i.tipo = 'ota'), 0) AS ota
      FROM notti n JOIN hotel_intermediari i ON i.id = n.intermediario_id
  ), costi AS (
    SELECT
      COALESCE((SELECT SUM(COALESCE(ore_effettive, ore_previste)) FROM turni WHERE modulo = 'hotel' AND stato NOT IN ('annullato', 'assente')
                  AND (inizio AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al), 0) * COALESCE(s.costo_orario_medio, 0) AS personale,
      COALESCE((SELECT SUM(costo) FROM hotel_manutenzioni WHERE struttura_id = p_struttura
                  AND (COALESCE(risolta_at, created_at) AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al), 0) AS manutenzioni,
      COALESCE((SELECT SUM(m.costo) FROM hotel_biancheria_movimenti m JOIN hotel_biancheria b ON b.id = m.biancheria_id
                 WHERE b.struttura_id = p_struttura AND m.data BETWEEN p_dal AND p_al), 0) AS biancheria,
      COALESCE((SELECT SUM(costo) FROM hotel_transfer WHERE struttura_id = p_struttura AND stato = 'svolto'
                  AND (data_ora AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al), 0) AS transfer,
      COALESCE((SELECT SUM(-mv.quantita * a.costo_unitario) FROM hotel_minibar_consumi x JOIN mag_movimenti mv
                  ON mv.riferimento_tipo = 'hotel_minibar_consumi' AND mv.riferimento_id = x.id
                  JOIN mag_articoli a ON a.id = mv.articolo_id
                 WHERE x.struttura_id = p_struttura AND (x.rilevato_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al), 0) AS minibar
  ), ospiti_periodo AS (
    SELECT DISTINCT p.contatto_id FROM hotel_prenotazioni p
     WHERE p.struttura_id = p_struttura AND p.contatto_id IS NOT NULL AND p.stato IN ('in_soggiorno', 'partita')
       AND p.arrivo <= p_al AND p.partenza > p_dal
  )
  SELECT jsonb_build_object(
    'occupazione', jsonb_build_object(
      'camere_disponibili', v_disponibili,
      'camere_vendute', (SELECT count(*) FROM notti),
      'occupazione_pct', ROUND(100.0 * (SELECT count(*) FROM notti) / NULLIF(v_disponibili, 0), 1),
      'ospiti', (SELECT COALESCE(SUM(adulti + bambini), 0) FROM arrivi WHERE stato IN ('in_soggiorno', 'partita', 'confermata')),
      'los', (SELECT ROUND(AVG(notti), 2) FROM arrivi WHERE stato IN ('confermata', 'in_soggiorno', 'partita')),
      'lead_time_giorni', (SELECT ROUND(AVG(arrivo - (created_at AT TIME ZONE 'Europe/Rome')::date), 1) FROM arrivi
                            WHERE stato <> 'richiesta'),
      'per_tipologia', (SELECT COALESCE(jsonb_object_agg(t.nome, x.vendute), '{}'::jsonb) FROM (
                          SELECT p.tipologia_id, count(*) AS vendute FROM notti n JOIN hotel_prenotazioni p ON p.id = n.prenotazione_id
                           GROUP BY p.tipologia_id) x JOIN hotel_tipologie t ON t.id = x.tipologia_id)
    ),
    'redditivita', jsonb_build_object(
      'ricavo_camere', ROUND((SELECT netto FROM reparti WHERE reparto = 'camere'), 2),
      'adr', ROUND((SELECT SUM(ricavo_netto) FROM notti) / NULLIF((SELECT count(*) FROM notti), 0), 2),
      'revpar', ROUND((SELECT SUM(ricavo_netto) FROM notti) / NULLIF(v_disponibili, 0), 2),
      'ricavi_totali', ROUND((SELECT SUM(netto) FROM reparti), 2),
      'trevpar', ROUND((SELECT SUM(netto) FROM reparti) / NULLIF(v_disponibili, 0), 2),
      'ricavo_per_ospite', ROUND((SELECT SUM(netto) FROM reparti)
                                 / NULLIF((SELECT SUM(adulti + bambini) FROM arrivi WHERE stato IN ('in_soggiorno', 'partita')), 0), 2),
      'costi_stimati', (SELECT jsonb_build_object('personale', ROUND(personale, 2), 'manutenzioni', manutenzioni, 'biancheria', biancheria,
                                                  'transfer', transfer, 'minibar', ROUND(minibar, 2),
                                                  'commissioni', ROUND((SELECT tutte FROM commissioni), 2)) FROM costi),
      'gop_stimato', ROUND((SELECT SUM(netto) FROM reparti) - (SELECT personale + manutenzioni + biancheria + transfer + minibar FROM costi)
                           - (SELECT tutte FROM commissioni), 2),
      'goppar_stimato', ROUND(((SELECT SUM(netto) FROM reparti) - (SELECT personale + manutenzioni + biancheria + transfer + minibar FROM costi)
                               - (SELECT tutte FROM commissioni)) / NULLIF(v_disponibili, 0), 2)
    ),
    'vendite', jsonb_build_object(
      'per_reparto', (SELECT COALESCE(jsonb_object_agg(reparto, ROUND(netto, 2)), '{}'::jsonb) FROM (
                        SELECT reparto, SUM(netto) AS netto FROM reparti GROUP BY reparto) r),
      'per_canale', (SELECT COALESCE(jsonb_object_agg(canale, n), '{}'::jsonb) FROM (
                       SELECT canale, count(*) AS n FROM arrivi WHERE stato NOT IN ('richiesta') GROUP BY canale) c),
      'prenotazioni', (SELECT count(*) FROM arrivi WHERE stato <> 'richiesta'),
      'annullate', (SELECT count(*) FROM arrivi WHERE stato = 'annullata'),
      'cancellation_rate_pct', (SELECT ROUND(100.0 * count(*) FILTER (WHERE stato = 'annullata') / NULLIF(count(*) FILTER (WHERE stato <> 'richiesta'), 0), 1) FROM arrivi),
      'no_show', (SELECT count(*) FROM arrivi WHERE stato = 'no_show'),
      'no_show_rate_pct', (SELECT ROUND(100.0 * count(*) FILTER (WHERE stato = 'no_show')
                                        / NULLIF(count(*) FILTER (WHERE stato IN ('confermata', 'in_soggiorno', 'partita', 'no_show')), 0), 1) FROM arrivi),
      'dirette_pct', (SELECT ROUND(100.0 * count(*) FILTER (WHERE canale IN ('diretto', 'telefono', 'email', 'walk_in', 'sito', 'booking_engine'))
                                   / NULLIF(count(*) FILTER (WHERE stato NOT IN ('richiesta', 'annullata')), 0), 1)
                        FROM arrivi WHERE stato NOT IN ('richiesta', 'annullata')),
      'costo_ota_pct', ROUND(100.0 * (SELECT ota FROM commissioni) / NULLIF((SELECT SUM(ricavo_netto) FROM notti), 0), 1),
      'pickup_7_giorni', (SELECT count(*) FROM notti) - COALESCE((SELECT SUM(camere_vendute) FROM hotel_pickup
                            WHERE struttura_id = p_struttura AND rilevato_il = (NOW() AT TIME ZONE 'Europe/Rome')::date - 7
                              AND data BETWEEN p_dal AND p_al), (SELECT count(*) FROM notti)),
      -- prenotazioni prese per settimana (ultime 8) per soggiorni nel periodo
      'booking_pace', (SELECT COALESCE(jsonb_object_agg(settimana, n ORDER BY settimana), '{}'::jsonb) FROM (
                         SELECT to_char(date_trunc('week', created_at AT TIME ZONE 'Europe/Rome'), 'YYYY-MM-DD') AS settimana, count(*) AS n
                           FROM hotel_prenotazioni WHERE struttura_id = p_struttura AND stato <> 'richiesta'
                            AND arrivo <= p_al AND partenza > p_dal AND created_at >= NOW() - INTERVAL '56 days'
                          GROUP BY 1) b)
    ),
    'clienti', jsonb_build_object(
      'ospiti_identificati', (SELECT count(*) FROM ospiti_periodo),
      'nuovi', (SELECT count(*) FROM ospiti_periodo o WHERE NOT EXISTS (
                  SELECT 1 FROM hotel_prenotazioni p WHERE p.contatto_id = o.contatto_id AND p.stato IN ('in_soggiorno', 'partita')
                     AND p.arrivo < p_dal)),
      'abituali', (SELECT count(*) FROM ospiti_periodo o WHERE (
                  SELECT count(*) FROM hotel_prenotazioni p WHERE p.contatto_id = o.contatto_id AND p.stato IN ('in_soggiorno', 'partita')) >= 2),
      'nps', (SELECT ROUND(100.0 * (count(*) FILTER (WHERE nps >= 9) - count(*) FILTER (WHERE nps <= 6)) / NULLIF(count(*), 0))
                FROM feedback WHERE modulo = 'hotel' AND nps IS NOT NULL AND (ricevuto_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
      'recensioni', (SELECT count(*) FROM feedback WHERE modulo = 'hotel' AND tipo = 'recensione'
                       AND (ricevuto_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
      'reclami', (SELECT count(*) FROM feedback WHERE modulo = 'hotel' AND tipo = 'reclamo'
                    AND (ricevuto_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
      'valutazione_media', (SELECT ROUND(AVG(valutazione), 2) FROM feedback WHERE modulo = 'hotel' AND valutazione IS NOT NULL
                              AND (ricevuto_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al)
    )
  ) INTO v;
  RETURN jsonb_build_object('struttura', s.nome, 'dal', p_dal, 'al', p_al) || v;
END;
$$;

-- Previsione per notte: venduto oggi (on the books) più il pickup medio
-- osservato alla stessa distanza dall'arrivo nelle fotografie passate.
CREATE OR REPLACE FUNCTION hotel_forecast(p_struttura UUID, p_dal DATE, p_al DATE)
RETURNS TABLE (data DATE, camere INT, vendute INT, previste INT, occupazione_pct NUMERIC, prevista_pct NUMERIC)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH oggi AS (SELECT (NOW() AT TIME ZONE 'Europe/Rome')::date AS d),
  disp AS (
    SELECT x.data, SUM(x.camere - x.fuori_servizio)::int AS camere, SUM(x.vendute)::int AS vendute
      FROM hotel_disponibilita(p_struttura, p_dal, p_al) x GROUP BY x.data
  ),
  -- incremento medio per fascia di anticipo: (venduto finale − venduto a N giorni) / venduto a N giorni
  storico AS (
    SELECT CASE WHEN f.data - a.rilevato_il <= 7 THEN 1 WHEN f.data - a.rilevato_il <= 30 THEN 2 ELSE 3 END AS fascia,
           AVG((f.camere_vendute - a.camere_vendute)::numeric / NULLIF(a.camere_vendute, 0)) AS incremento
      FROM hotel_pickup a
      JOIN hotel_pickup f ON f.struttura_id = a.struttura_id AND f.data = a.data AND f.rilevato_il = a.data
     WHERE a.struttura_id = p_struttura AND a.rilevato_il < a.data AND a.camere_vendute > 0
       AND a.data >= (SELECT d FROM oggi) - 120
     GROUP BY 1
  )
  SELECT d.data, d.camere, d.vendute,
         LEAST(d.camere, ROUND(d.vendute * (1 + GREATEST(COALESCE((SELECT incremento FROM storico s WHERE s.fascia =
           CASE WHEN d.data - (SELECT d FROM oggi) <= 7 THEN 1 WHEN d.data - (SELECT d FROM oggi) <= 30 THEN 2 ELSE 3 END), 0), 0)))::int),
         ROUND(100.0 * d.vendute / NULLIF(d.camere, 0), 1),
         ROUND(100.0 * LEAST(d.camere, ROUND(d.vendute * (1 + GREATEST(COALESCE((SELECT incremento FROM storico s WHERE s.fascia =
           CASE WHEN d.data - (SELECT d FROM oggi) <= 7 THEN 1 WHEN d.data - (SELECT d FROM oggi) <= 30 THEN 2 ELSE 3 END), 0), 0))))
           / NULLIF(d.camere, 0), 1)
    FROM disp d
   ORDER BY d.data
$$;

-- ═══ 3. REVENUE: REGOLE, CONCORRENTI, SUGGERIMENTI ═══════════════════
CREATE TABLE hotel_revenue_regole (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id       UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo             TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  nome               TEXT NOT NULL,
  occupazione_da     NUMERIC(5,1) NOT NULL DEFAULT 0 CHECK (occupazione_da BETWEEN 0 AND 100),
  occupazione_a      NUMERIC(5,1) NOT NULL DEFAULT 100 CHECK (occupazione_a BETWEEN 0 AND 100),
  anticipo_max_giorni INT CHECK (anticipo_max_giorni >= 0),       -- vale solo a ridosso dell'arrivo
  variazione_pct     NUMERIC(6,2) NOT NULL CHECK (variazione_pct > -100),
  priorita           INT NOT NULL DEFAULT 0,
  attiva             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id),
  CHECK (occupazione_a >= occupazione_da)
);

CREATE TABLE hotel_competitor_prezzi (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  struttura_id  UUID NOT NULL REFERENCES hotel_strutture(id) ON DELETE CASCADE,
  modulo        TEXT NOT NULL DEFAULT 'hotel' CHECK (modulo = 'hotel'),
  competitor    TEXT NOT NULL,
  data          DATE NOT NULL,
  tipologia     TEXT NOT NULL DEFAULT 'doppia',
  prezzo        NUMERIC(10,2) NOT NULL CHECK (prezzo >= 0),
  fonte         TEXT,                    -- rilevazione manuale; rate shopper predisposto
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  UNIQUE (struttura_id, competitor, data, tipologia)
);

-- Per notte e tipologia: occupazione prevista, prezzo del BAR, media dei
-- concorrenti, regola che scatta e prezzo suggerito. Nessuna modifica automatica.
CREATE OR REPLACE FUNCTION hotel_suggerimenti_tariffe(p_struttura UUID, p_dal DATE, p_al DATE)
RETURNS TABLE (data DATE, tipologia_id UUID, tipologia TEXT, occupazione_pct NUMERIC, prevista_pct NUMERIC,
               prezzo_attuale NUMERIC, prezzo_concorrenti NUMERIC, regola TEXT, variazione_pct NUMERIC, prezzo_suggerito NUMERIC)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  v_bar UUID;
BEGIN
  IF NOT puo_amministrazione() AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Dati riservati alla direzione' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT id INTO v_bar FROM hotel_piani_tariffari WHERE struttura_id = p_struttura AND tipo = 'bar' AND attivo ORDER BY ordine LIMIT 1;
  RETURN QUERY
  WITH f AS (SELECT * FROM hotel_forecast(p_struttura, p_dal, p_al)),
  d AS (SELECT x.data, x.tipologia_id, x.tipologia, x.camere - x.fuori_servizio AS camere, x.vendute
          FROM hotel_disponibilita(p_struttura, p_dal, p_al) x)
  SELECT d.data, d.tipologia_id, d.tipologia,
         ROUND(100.0 * d.vendute / NULLIF(d.camere, 0), 1),
         f.prevista_pct,
         n.prezzo,
         (SELECT ROUND(AVG(c.prezzo), 2) FROM hotel_competitor_prezzi c JOIN hotel_tipologie t ON t.id = d.tipologia_id
           WHERE c.struttura_id = p_struttura AND c.data = d.data AND c.tipologia = t.categoria),
         r.nome, r.variazione_pct,
         CASE WHEN r.id IS NULL THEN n.prezzo ELSE ROUND(n.prezzo * (1 + r.variazione_pct / 100)) END
    FROM d
    JOIN f ON f.data = d.data
    CROSS JOIN LATERAL hotel_prezzo_notte(v_bar, d.tipologia_id, d.data,
                                          (SELECT occupazione_base FROM hotel_tipologie WHERE id = d.tipologia_id)) n
    LEFT JOIN LATERAL (
      SELECT rr.* FROM hotel_revenue_regole rr
       WHERE rr.struttura_id = p_struttura AND rr.attiva
         AND COALESCE(f.prevista_pct, 0) BETWEEN rr.occupazione_da AND rr.occupazione_a
         AND (rr.anticipo_max_giorni IS NULL OR d.data - (NOW() AT TIME ZONE 'Europe/Rome')::date <= rr.anticipo_max_giorni)
       ORDER BY rr.priorita DESC, abs(rr.variazione_pct) DESC LIMIT 1
    ) r ON true
   ORDER BY d.data, d.tipologia;
END;
$$;

-- Applicare un suggerimento = una tariffa del BAR per quel giorno (direzione).
CREATE OR REPLACE FUNCTION hotel_applica_prezzo(p_struttura UUID, p_tipologia UUID, p_data DATE, p_prezzo NUMERIC)
RETURNS UUID
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  v_bar UUID;
  v_id UUID;
BEGIN
  SELECT id INTO v_bar FROM hotel_piani_tariffari WHERE struttura_id = p_struttura AND tipo = 'bar' AND attivo ORDER BY ordine LIMIT 1;
  IF v_bar IS NULL THEN RAISE EXCEPTION 'Manca il piano BAR della struttura'; END IF;
  DELETE FROM hotel_tariffe WHERE piano_id = v_bar AND tipologia_id = p_tipologia AND dal = p_data AND al = p_data AND priorita = 50;
  INSERT INTO hotel_tariffe (struttura_id, piano_id, tipologia_id, dal, al, prezzo, priorita, created_by)
  VALUES (p_struttura, v_bar, p_tipologia, p_data, p_data, p_prezzo, 50, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ═══ 4. FRONT OFFICE ════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION hotel_front_office(p_struttura UUID, p_giorno DATE DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date)
RETURNS JSONB
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH p AS (SELECT * FROM hotel_prenotazioni WHERE struttura_id = p_struttura),
  cam AS (SELECT * FROM hotel_camere_stato WHERE struttura_id = p_struttura)
  SELECT jsonb_build_object(
    'giorno', p_giorno,
    'arrivi', jsonb_build_object(
      'previsti', (SELECT count(*) FROM p WHERE arrivo = p_giorno AND stato IN ('opzionata', 'confermata', 'in_soggiorno')),
      'arrivati', (SELECT count(*) FROM p WHERE arrivo = p_giorno AND stato = 'in_soggiorno'),
      'da_arrivare', (SELECT count(*) FROM p WHERE arrivo = p_giorno AND stato IN ('opzionata', 'confermata')),
      'vip', (SELECT count(*) FROM p JOIN hotel_ospiti o ON o.contatto_id = p.contatto_id
               WHERE p.arrivo = p_giorno AND p.stato IN ('opzionata', 'confermata', 'in_soggiorno') AND o.vip),
      'early_check_in', (SELECT count(*) FROM p WHERE arrivo = p_giorno AND early_check_in AND stato IN ('opzionata', 'confermata')),
      'richieste_speciali', (SELECT count(*) FROM p WHERE arrivo = p_giorno AND NULLIF(trim(richieste), '') IS NOT NULL
                               AND stato IN ('opzionata', 'confermata', 'in_soggiorno')),
      'senza_camera', (SELECT count(*) FROM p WHERE arrivo = p_giorno AND camera_id IS NULL AND stato IN ('opzionata', 'confermata')),
      'mancati_ieri', (SELECT count(*) FROM p WHERE arrivo < p_giorno AND stato = 'confermata')
    ),
    'partenze', jsonb_build_object(
      'previste', (SELECT count(*) FROM p WHERE partenza = p_giorno AND stato IN ('in_soggiorno', 'partita')),
      'partite', (SELECT count(*) FROM p WHERE partenza = p_giorno AND stato = 'partita'),
      'late_check_out', (SELECT count(*) FROM p WHERE partenza = p_giorno AND late_check_out AND stato = 'in_soggiorno'),
      'conti_aperti', (SELECT count(*) FROM p JOIN conti_saldi s ON s.conto_id = p.conto_id
                        WHERE p.partenza = p_giorno AND p.stato = 'in_soggiorno' AND s.residuo > 0)
    ),
    'camere', jsonb_build_object(
      'disponibili', (SELECT count(*) FROM cam WHERE stato = 'disponibile'),
      'occupate', (SELECT count(*) FROM cam WHERE stato = 'occupata'),
      'da_pulire', (SELECT count(*) FROM cam WHERE stato = 'da_pulire'),
      'in_pulizia', (SELECT count(*) FROM cam WHERE stato = 'in_pulizia'),
      'pronte', (SELECT count(*) FROM cam WHERE stato IN ('pulita', 'disponibile')),
      'fuori_servizio', (SELECT count(*) FROM cam WHERE stato = 'fuori_servizio')
    ),
    'prenotazioni', jsonb_build_object(
      'nuove', (SELECT count(*) FROM p WHERE (created_at AT TIME ZONE 'Europe/Rome')::date = p_giorno),
      'modificate', (SELECT count(*) FROM p WHERE (updated_at AT TIME ZONE 'Europe/Rome')::date = p_giorno
                       AND (created_at AT TIME ZONE 'Europe/Rome')::date < p_giorno AND stato NOT IN ('annullata', 'no_show')),
      'cancellate', (SELECT count(*) FROM p WHERE (annullata_at AT TIME ZONE 'Europe/Rome')::date = p_giorno),
      'no_show', (SELECT count(*) FROM p WHERE stato = 'no_show' AND (updated_at AT TIME ZONE 'Europe/Rome')::date = p_giorno),
      'in_casa', (SELECT count(*) FROM p WHERE stato = 'in_soggiorno'),
      'ospiti_in_casa', (SELECT COALESCE(SUM(adulti + bambini), 0) FROM p WHERE stato = 'in_soggiorno')
    )
  )
$$;

-- ═══ 5. CRM ALBERGHIERO ═════════════════════════════════════════════
CREATE OR REPLACE VIEW hotel_ospiti_riepilogo WITH (security_invoker = true) AS
SELECT p.contatto_id, 'hotel'::text AS modulo, trim(k.nome || ' ' || COALESCE(k.cognome, '')) AS nome, k.email, k.telefono,
       count(*) FILTER (WHERE p.stato IN ('in_soggiorno', 'partita')) AS soggiorni,
       COALESCE(SUM(p.notti) FILTER (WHERE p.stato IN ('in_soggiorno', 'partita')), 0) AS notti,
       max(p.arrivo) FILTER (WHERE p.stato IN ('in_soggiorno', 'partita')) AS ultimo_soggiorno,
       min(p.arrivo) FILTER (WHERE p.stato IN ('opzionata', 'confermata') AND p.arrivo >= (NOW() AT TIME ZONE 'Europe/Rome')::date) AS prossimo_arrivo,
       COALESCE(SUM(s.totale) FILTER (WHERE p.stato IN ('in_soggiorno', 'partita')), 0) AS spesa,
       bool_or(o.vip) AS vip
  FROM hotel_prenotazioni p
  JOIN contatti k ON k.id = p.contatto_id
  LEFT JOIN conti_saldi s ON s.conto_id = p.conto_id
  LEFT JOIN hotel_ospiti o ON o.contatto_id = p.contatto_id
 WHERE p.stato NOT IN ('richiesta', 'annullata')
 GROUP BY p.contatto_id, k.nome, k.cognome, k.email, k.telefono;

CREATE OR REPLACE FUNCTION hotel_ospite_profilo(p_contatto UUID)
RETURNS JSONB
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH sog AS (
    SELECT p.*, s.totale FROM hotel_prenotazioni p LEFT JOIN conti_saldi s ON s.conto_id = p.conto_id
     WHERE p.contatto_id = p_contatto AND p.stato IN ('in_soggiorno', 'partita')
  )
  SELECT jsonb_build_object(
    'soggiorni', (SELECT count(*) FROM sog),
    'notti', (SELECT COALESCE(SUM(notti), 0) FROM sog),
    'ultimo_soggiorno', (SELECT max(arrivo) FROM sog),
    'spesa_totale', (SELECT COALESCE(SUM(totale), 0) FROM sog),
    'spesa_media', (SELECT ROUND(AVG(totale), 2) FROM sog),
    'durata_media', (SELECT ROUND(AVG(notti), 1) FROM sog),
    'tipologia_preferita', (SELECT t.nome FROM sog JOIN hotel_tipologie t ON t.id = sog.tipologia_id
                             GROUP BY t.nome ORDER BY count(*) DESC, t.nome LIMIT 1),
    'canale_preferito', (SELECT canale FROM sog GROUP BY canale ORDER BY count(*) DESC, canale LIMIT 1),
    'servizi', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'volte' DESC), '[]'::jsonb) FROM (
                 SELECT jsonb_build_object('servizio', sv.nome, 'volte', count(*)) AS x
                   FROM hotel_servizi_prenotazioni sp JOIN hotel_servizi sv ON sv.id = sp.servizio_id
                  WHERE sp.prenotazione_id IN (SELECT id FROM sog) AND sp.stato = 'erogato'
                  GROUP BY sv.nome ORDER BY count(*) DESC LIMIT 5) t),
    'reclami', (SELECT count(*) FROM feedback WHERE contatto_id = p_contatto AND modulo = 'hotel' AND tipo = 'reclamo'),
    'nps_medio', (SELECT ROUND(AVG(nps), 1) FROM feedback WHERE contatto_id = p_contatto AND modulo = 'hotel' AND nps IS NOT NULL),
    'compleanno', (SELECT to_char(data_nascita, 'DD/MM') FROM hotel_ospiti WHERE contatto_id = p_contatto),
    'preferenze', (SELECT preferenze FROM hotel_ospiti WHERE contatto_id = p_contatto),
    'allergie', (SELECT allergie FROM hotel_ospiti WHERE contatto_id = p_contatto),
    'vip', (SELECT vip FROM hotel_ospiti WHERE contatto_id = p_contatto),
    'prossime', (SELECT COALESCE(jsonb_agg(jsonb_build_object('codice', codice, 'arrivo', arrivo, 'partenza', partenza) ORDER BY arrivo), '[]'::jsonb)
                   FROM hotel_prenotazioni WHERE contatto_id = p_contatto AND stato IN ('opzionata', 'confermata')
                    AND arrivo >= (NOW() AT TIME ZONE 'Europe/Rome')::date)
  )
$$;

-- Segmenti per le campagne (§37).
CREATE OR REPLACE FUNCTION seg_hotel_inattivi(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT contatto_id FROM hotel_prenotazioni
   WHERE contatto_id IS NOT NULL AND stato IN ('in_soggiorno', 'partita')
   GROUP BY contatto_id
  HAVING max(partenza) < (NOW() AT TIME ZONE 'Europe/Rome')::date - make_interval(months => COALESCE((p_parametri->>'mesi')::int, 12))
$$;
CREATE OR REPLACE FUNCTION seg_hotel_abituali(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT contatto_id FROM hotel_prenotazioni
   WHERE contatto_id IS NOT NULL AND stato IN ('in_soggiorno', 'partita')
   GROUP BY contatto_id
  HAVING count(*) >= COALESCE((p_parametri->>'soggiorni')::int, 3)
$$;
CREATE OR REPLACE FUNCTION seg_hotel_compleanni(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT o.contatto_id FROM hotel_ospiti o
   WHERE o.data_nascita IS NOT NULL
     AND (make_date(EXTRACT(YEAR FROM NOW())::int, EXTRACT(MONTH FROM o.data_nascita)::int,
                    LEAST(EXTRACT(DAY FROM o.data_nascita)::int, 28))
          - (NOW() AT TIME ZONE 'Europe/Rome')::date + 365) % 365 <= COALESCE((p_parametri->>'giorni')::int, 30)
$$;
CREATE OR REPLACE FUNCTION seg_hotel_anniversari(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT contatto_id FROM (
    SELECT contatto_id, min(arrivo) AS primo FROM hotel_prenotazioni
     WHERE contatto_id IS NOT NULL AND stato IN ('in_soggiorno', 'partita') GROUP BY contatto_id) x
   WHERE x.primo < (NOW() AT TIME ZONE 'Europe/Rome')::date - 300
     AND (make_date(EXTRACT(YEAR FROM NOW())::int, EXTRACT(MONTH FROM x.primo)::int, LEAST(EXTRACT(DAY FROM x.primo)::int, 28))
          - (NOW() AT TIME ZONE 'Europe/Rome')::date + 365) % 365 <= COALESCE((p_parametri->>'giorni')::int, 30)
$$;
INSERT INTO campagne_segmenti (slug, modulo, etichetta, descrizione, funzione, parametri) VALUES
  ('hotel_inattivi', 'hotel', 'Ospiti che non tornano', 'Nessun soggiorno da N mesi: un''offerta per riportarli.',
     'seg_hotel_inattivi', '{"mesi": {"etichetta": "Senza soggiorni da (mesi)", "default": 12}}'),
  ('hotel_abituali', 'hotel', 'Ospiti abituali', 'Almeno N soggiorni: la proposta del weekend con la SPA.',
     'seg_hotel_abituali', '{"soggiorni": {"etichetta": "Soggiorni almeno", "default": 3}}'),
  ('hotel_compleanni', 'hotel', 'Compleanni in arrivo', 'Ospiti che compiono gli anni nei prossimi giorni.',
     'seg_hotel_compleanni', '{"giorni": {"etichetta": "Entro (giorni)", "default": 30}}'),
  ('hotel_anniversari', 'hotel', 'Anniversario del primo soggiorno', 'Un anno (o più) dal primo soggiorno.',
     'seg_hotel_anniversari', '{"giorni": {"etichetta": "Entro (giorni)", "default": 30}}')
ON CONFLICT (slug) DO NOTHING;

-- ═══ 6. INTERMEDIARI, STRUTTURE, INSOLUTI ═══════════════════════════
CREATE OR REPLACE FUNCTION hotel_produzione_intermediari(p_struttura UUID, p_dal DATE, p_al DATE)
RETURNS TABLE (intermediario_id UUID, nome TEXT, tipo TEXT, prenotazioni INT, notti INT, ricavo NUMERIC,
               commissione_pct NUMERIC, commissione NUMERIC, annullate INT)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT puo_amministrazione() AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Dati riservati alla direzione' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT i.id, o.ragione_sociale, i.tipo,
         count(p.id) FILTER (WHERE p.stato IN ('confermata', 'in_soggiorno', 'partita'))::int,
         COALESCE(SUM(p.notti) FILTER (WHERE p.stato IN ('confermata', 'in_soggiorno', 'partita')), 0)::int,
         COALESCE(SUM(p.prezzo_totale) FILTER (WHERE p.stato IN ('confermata', 'in_soggiorno', 'partita')), 0),
         i.commissione_pct,
         ROUND(COALESCE(SUM(p.prezzo_totale) FILTER (WHERE p.stato IN ('confermata', 'in_soggiorno', 'partita')), 0) * i.commissione_pct / 100, 2),
         count(p.id) FILTER (WHERE p.stato = 'annullata')::int
    FROM hotel_intermediari i
    JOIN organizzazioni o ON o.id = i.organizzazione_id
    LEFT JOIN hotel_prenotazioni p ON p.intermediario_id = i.id AND p.struttura_id = p_struttura AND p.arrivo BETWEEN p_dal AND p_al
   WHERE i.struttura_id IS NULL OR i.struttura_id = p_struttura
   GROUP BY i.id, o.ragione_sociale, i.tipo, i.commissione_pct
   ORDER BY 6 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION hotel_confronto_strutture(p_dal DATE, p_al DATE)
RETURNS TABLE (struttura_id UUID, struttura TEXT, camere_disponibili NUMERIC, camere_vendute NUMERIC, occupazione_pct NUMERIC,
               adr NUMERIC, revpar NUMERIC, trevpar NUMERIC, ricavi_totali NUMERIC)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  s RECORD;
  k JSONB;
BEGIN
  IF NOT puo_amministrazione() AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Dati riservati alla direzione' USING ERRCODE = 'insufficient_privilege';
  END IF;
  FOR s IN SELECT id, nome FROM hotel_strutture WHERE attiva ORDER BY nome LOOP
    k := hotel_kpi(s.id, p_dal, p_al);
    struttura_id := s.id; struttura := s.nome;
    camere_disponibili := (k->'occupazione'->>'camere_disponibili')::numeric;
    camere_vendute := (k->'occupazione'->>'camere_vendute')::numeric;
    occupazione_pct := (k->'occupazione'->>'occupazione_pct')::numeric;
    adr := (k->'redditivita'->>'adr')::numeric;
    revpar := (k->'redditivita'->>'revpar')::numeric;
    trevpar := (k->'redditivita'->>'trevpar')::numeric;
    ricavi_totali := (k->'redditivita'->>'ricavi_totali')::numeric;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Conti ancora da incassare di soggiorni chiusi, no-show, penali, clienti esterni.
CREATE OR REPLACE VIEW hotel_insoluti WITH (security_invoker = true) AS
SELECT c.id AS conto_id, c.modulo, c.codice, c.descrizione, s.totale, s.pagato, s.residuo, c.aperto_at,
       p.id AS prenotazione_id, p.struttura_id, p.stato AS stato_prenotazione, p.partenza,
       (NOW() AT TIME ZONE 'Europe/Rome')::date - COALESCE(p.partenza, (c.aperto_at AT TIME ZONE 'Europe/Rome')::date) AS giorni
  FROM conti c
  JOIN conti_saldi s ON s.conto_id = c.id
  LEFT JOIN hotel_prenotazioni p ON c.riferimento_tipo = 'hotel_prenotazioni' AND p.id = c.riferimento_id
 WHERE c.modulo = 'hotel' AND c.stato = 'aperto' AND s.residuo > 0.005
   AND (p.stato IN ('partita', 'no_show', 'annullata')
        OR (p.id IS NULL AND c.aperto_at < NOW() - INTERVAL '7 days'));

-- ═══ 7. FATTURAZIONE: AZIENDE, GRUPPI, TOUR OPERATOR, PIÙ ALIQUOTE ══
-- Una fattura per uno o più conti chiusi (camera 10%, extra 22%, tassa
-- fuori campo): imponibile per aliquota, totale esatto, dettaglio in nota.
CREATE OR REPLACE FUNCTION hotel_fattura_conti(p_conti UUID[], p_organizzazione UUID, p_numero TEXT, p_scadenza DATE DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  v_imponibile NUMERIC := 0;
  v_totale NUMERIC := 0;
  v_aliquota NUMERIC;
  v_dettaglio TEXT;
  v_codici TEXT;
  v_fattura UUID;
BEGIN
  IF NOT puo_amministrazione() THEN
    RAISE EXCEPTION 'La fattura la emette la direzione' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF cardinality(p_conti) = 0 THEN RAISE EXCEPTION 'Scegli almeno un conto'; END IF;
  IF EXISTS (SELECT 1 FROM conti WHERE id = ANY (p_conti) AND (stato <> 'chiuso' OR fattura_id IS NOT NULL OR modulo <> 'hotel')) THEN
    RAISE EXCEPTION 'Si fatturano solo conti dell''hotel chiusi e non ancora fatturati' USING ERRCODE = 'check_violation';
  END IF;
  WITH parti AS (
    SELECT a.aliquota_iva, SUM(a.importo) AS importo FROM unnest(p_conti) x(id), conto_per_aliquota(x.id) a GROUP BY a.aliquota_iva
  )
  SELECT SUM(ROUND(importo / (1 + aliquota_iva / 100), 2)), SUM(importo),
         (array_agg(aliquota_iva ORDER BY importo DESC))[1],
         string_agg(CASE WHEN aliquota_iva = 0 THEN 'fuori campo IVA (tassa di soggiorno, penali): ' || importo
                         ELSE 'IVA ' || aliquota_iva || '%: imponibile ' || ROUND(importo / (1 + aliquota_iva / 100), 2) || ', totale ' || importo END,
                    '; ' ORDER BY aliquota_iva)
    INTO v_imponibile, v_totale, v_aliquota, v_dettaglio
    FROM parti;
  SELECT string_agg(codice, ', ' ORDER BY codice) INTO v_codici FROM conti WHERE id = ANY (p_conti);
  INSERT INTO fatture (direzione, numero, data, organizzazione_id, imponibile, aliquota_iva, totale, scadenza, note, created_by)
  VALUES ('attiva', p_numero, CURRENT_DATE, p_organizzazione, v_imponibile, v_aliquota, v_totale,
          COALESCE(p_scadenza, CURRENT_DATE + 30), 'Conti ' || v_codici || '. ' || v_dettaglio, auth.uid())
  RETURNING id INTO v_fattura;
  UPDATE conti SET fattura_id = v_fattura WHERE id = ANY (p_conti);
  RETURN v_fattura;
END;
$$;

-- ═══ 8. RICERCA ═════════════════════════════════════════════════════
ALTER TABLE hotel_prenotazioni ADD COLUMN ricerca TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('simple', COALESCE(codice, '') || ' ' || ospite_nome || ' ' || COALESCE(canale_riferimento, ''))) STORED;
CREATE INDEX idx_hotel_prenotazioni_ricerca ON hotel_prenotazioni USING gin (ricerca);

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
  ) t
  LIMIT 20
$$;

-- ═══ 9. RLS, PROTEZIONI ═════════════════════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['hotel_pickup', 'hotel_revenue_regole', 'hotel_competitor_prezzi'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Revenue: solo la direzione legge e scrive.
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['hotel_revenue_regole', 'hotel_competitor_prezzi'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;
  CREATE POLICY "hotel_revenue_regole_update" ON hotel_revenue_regole FOR UPDATE TO authenticated
    USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione());
  EXECUTE 'CREATE TRIGGER hotel_revenue_regole_updated_at BEFORE UPDATE ON hotel_revenue_regole FOR EACH ROW EXECUTE FUNCTION update_updated_at()';
  EXECUTE 'CREATE TRIGGER hotel_revenue_regole_audit AFTER INSERT OR UPDATE OR DELETE ON hotel_revenue_regole FOR EACH ROW EXECUTE FUNCTION log_audit()';
END $$;

GRANT SELECT ON hotel_ospiti_riepilogo, hotel_insoluti TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['hotel_rileva_pickup(date)', 'seg_hotel_inattivi(text,jsonb)', 'seg_hotel_abituali(text,jsonb)',
                           'seg_hotel_compleanni(text,jsonb)', 'seg_hotel_anniversari(text,jsonb)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
    'hotel_reparto_riga(text,uuid)', 'hotel_kpi(uuid,date,date)', 'hotel_forecast(uuid,date,date)',
    'hotel_suggerimenti_tariffe(uuid,date,date)', 'hotel_applica_prezzo(uuid,uuid,date,numeric)',
    'hotel_front_office(uuid,date)', 'hotel_ospite_profilo(uuid)', 'hotel_produzione_intermediari(uuid,date,date)',
    'hotel_confronto_strutture(date,date)', 'hotel_fattura_conti(uuid[],uuid,text,date)', 'ricerca_globale(text)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'hotel-pickup';
SELECT cron.schedule('hotel-pickup', '30 2 * * *', $$SELECT hotel_rileva_pickup()$$);

SELECT applica_protezioni_tabelle();
