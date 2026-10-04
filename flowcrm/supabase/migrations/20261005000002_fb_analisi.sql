-- ═══════════════════════════════════════════════════════════════════
-- MODULI 2 · RISTORANTE E BAR — ANALISI, CRUSCOTTI, CRM
--
-- Tutto calcolato dalle comande, dal conto e dal magazzino, nessun dato
-- scritto due volte:
--   - food cost e beverage cost per piatto, categoria, menu, giorno, chef,
--     canale; menu engineering (Star, Plow Horse, Puzzle, Dog);
--   - consumo teorico contro effettivo delle bevande (inventari);
--   - richiamo di un lotto: piatti, comande, tavoli e clienti coinvolti;
--   - sprechi con il loro costo; fabbisogno di personale dai coperti;
--   - cruscotto della giornata e KPI di periodo;
--   - profilo del cliente (visite, spesa, preferiti) e segmenti per le
--     campagne; registro allergeni stampabile (Reg. UE 1169/2011).
-- Le funzioni con dati economici rispondono solo ad admin e manager.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE fb_locali ADD COLUMN costo_orario_medio NUMERIC(8,2) CHECK (costo_orario_medio >= 0);

CREATE OR REPLACE FUNCTION fb_richiede_direzione()
RETURNS VOID
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT puo_amministrazione() THEN
    RAISE EXCEPTION 'Dati riservati alla direzione' USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

-- ═══ VENDITE ════════════════════════════════════════════════════════
-- Una riga per ciò che si è venduto: niente righe annullate, niente piatti
-- dentro un menu (il menu porta prezzo e, sommato, il costo dei suoi piatti),
-- niente rifacimenti (sono sprechi). Ricavo al netto dell'IVA.
CREATE VIEW fb_vendite WITH (security_invoker = true) AS
SELECT r.id AS riga_id, r.comanda_id, r.locale_id, r.modulo, r.prodotto_id, p.nome AS prodotto,
       p.categoria_id, cat.nome AS categoria, cat.area, p.beverage_tipo,
       c.canale, r.cameriere_id, r.preparata_da AS chef_id,
       COALESCE(substring(r.prezzo_origine FROM '^listino: (.*)$'), 'Carta') AS menu,
       r.ordinata_at, (r.ordinata_at AT TIME ZONE 'Europe/Rome')::date AS giorno,
       EXTRACT(HOUR FROM r.ordinata_at AT TIME ZONE 'Europe/Rome')::int AS ora,
       r.quantita, r.omaggio, r.promozione_id,
       ROUND(r.quantita * r.prezzo_unitario, 2) AS ricavo_lordo,
       ROUND(r.quantita * r.prezzo_unitario / (1 + COALESCE(r.aliquota_iva, 0) / 100), 2) AS ricavo,
       ROUND(CASE WHEN cardinality(p.componenti) > 0
                  THEN (SELECT COALESCE(SUM(x.quantita * x.costo_unitario), 0) FROM fb_comande_righe x
                         WHERE x.padre_id = r.id AND x.stato <> 'annullata')
                  ELSE r.quantita * COALESCE(r.costo_unitario, 0) END, 2) AS costo
  FROM fb_comande_righe r
  JOIN fb_comande c ON c.id = r.comanda_id
  JOIN fb_prodotti p ON p.id = r.prodotto_id
  JOIN fb_categorie cat ON cat.id = p.categoria_id
 WHERE r.stato <> 'annullata' AND r.padre_id IS NULL AND r.rifacimento_di IS NULL
   AND c.stato <> 'annullata';

-- Food cost per dimensione: piatto, categoria, menu, giorno, chef, canale, area.
CREATE OR REPLACE FUNCTION fb_food_cost(p_locale UUID, p_dal DATE, p_al DATE, p_dimensione TEXT DEFAULT 'piatto')
RETURNS TABLE (chiave TEXT, quantita NUMERIC, ricavo NUMERIC, costo NUMERIC, margine NUMERIC, food_cost_pct NUMERIC)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM fb_richiede_direzione();
  IF p_dimensione NOT IN ('piatto', 'categoria', 'menu', 'giorno', 'chef', 'canale', 'area') THEN
    RAISE EXCEPTION 'Dimensione non prevista: %', p_dimensione;
  END IF;
  RETURN QUERY
  SELECT k, SUM(v.quantita), SUM(v.ricavo), SUM(v.costo), SUM(v.ricavo) - SUM(v.costo),
         ROUND(100 * SUM(v.costo) / NULLIF(SUM(v.ricavo), 0), 1)
    FROM fb_vendite v
    CROSS JOIN LATERAL (SELECT CASE p_dimensione
      WHEN 'piatto' THEN v.prodotto WHEN 'categoria' THEN v.categoria WHEN 'menu' THEN v.menu
      WHEN 'giorno' THEN v.giorno::text WHEN 'canale' THEN v.canale WHEN 'area' THEN v.area
      ELSE COALESCE((SELECT trim(u.nome || ' ' || COALESCE(u.cognome, '')) FROM user_profiles u WHERE u.id = v.chef_id), 'Non indicato')
    END AS k) d
   WHERE v.locale_id = p_locale AND v.giorno BETWEEN p_dal AND p_al
   GROUP BY k
   ORDER BY SUM(v.ricavo) DESC;
END;
$$;

-- Menu engineering (Kasavana-Smith): popolare se la quota di vendite
-- supera il 70% della quota media (1/N); redditizio se il margine unitario
-- supera il margine medio ponderato. Omaggi esclusi.
CREATE OR REPLACE FUNCTION fb_menu_engineering(p_locale UUID, p_dal DATE, p_al DATE, p_categoria UUID DEFAULT NULL)
RETURNS TABLE (prodotto_id UUID, prodotto TEXT, categoria TEXT, venduti NUMERIC, quota_pct NUMERIC,
               prezzo_medio NUMERIC, costo_unitario NUMERIC, margine_unitario NUMERIC, margine_totale NUMERIC,
               food_cost_pct NUMERIC, popolare BOOLEAN, redditizio BOOLEAN, classe TEXT)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM fb_richiede_direzione();
  RETURN QUERY
  WITH base AS (
    SELECT v.prodotto_id, v.prodotto, v.categoria, SUM(v.quantita) AS q, SUM(v.ricavo) AS ric, SUM(v.costo) AS cos
      FROM fb_vendite v
     WHERE v.locale_id = p_locale AND v.giorno BETWEEN p_dal AND p_al AND NOT v.omaggio
       AND (p_categoria IS NULL OR v.categoria_id = p_categoria)
     GROUP BY v.prodotto_id, v.prodotto, v.categoria
  ), tot AS (
    SELECT SUM(q) AS q, count(*) AS n, SUM(ric - cos) / NULLIF(SUM(q), 0) AS margine_medio FROM base
  )
  SELECT b.prodotto_id, b.prodotto, b.categoria, b.q,
         ROUND(100 * b.q / t.q, 1),
         ROUND(b.ric / b.q, 2), ROUND(b.cos / b.q, 2), ROUND((b.ric - b.cos) / b.q, 2), ROUND(b.ric - b.cos, 2),
         ROUND(100 * b.cos / NULLIF(b.ric, 0), 1),
         b.q / t.q >= 0.7 / t.n,
         (b.ric - b.cos) / b.q >= t.margine_medio,
         CASE WHEN b.q / t.q >= 0.7 / t.n THEN
                CASE WHEN (b.ric - b.cos) / b.q >= t.margine_medio THEN 'star' ELSE 'plow_horse' END
              ELSE
                CASE WHEN (b.ric - b.cos) / b.q >= t.margine_medio THEN 'puzzle' ELSE 'dog' END
         END
    FROM base b CROSS JOIN tot t
   ORDER BY b.q DESC;
END;
$$;

-- Bevande: consumo teorico (dalle vendite) contro effettivo (con sprechi
-- registrati e ammanchi rilevati dagli inventari). Scostamento oltre la
-- soglia = anomalia da verificare.
CREATE OR REPLACE FUNCTION fb_beverage_controllo(p_modulo TEXT, p_dal DATE, p_al DATE, p_soglia_pct NUMERIC DEFAULT 5)
RETURNS TABLE (articolo_id UUID, articolo TEXT, unita TEXT, teorico NUMERIC, sprechi NUMERIC, ammanchi NUMERIC,
               effettivo NUMERIC, scostamento_pct NUMERIC, valore_scostamento NUMERIC, anomalia BOOLEAN)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM fb_richiede_direzione();
  RETURN QUERY
  WITH bev AS (
    SELECT DISTINCT p.articolo_id AS id FROM fb_prodotti p
     WHERE p.beverage_tipo IS NOT NULL AND p.articolo_id IS NOT NULL
    UNION
    SELECT DISTINCT e.articolo_id FROM fb_prodotti p, esplodi_distinta(p.distinta_id, 1) e
     WHERE p.beverage_tipo IS NOT NULL AND p.distinta_id IS NOT NULL
  ), mov AS (
    SELECT m.articolo_id,
           -SUM(m.quantita) FILTER (WHERE m.tipo = 'vendita') AS teorico,
           -SUM(m.quantita) FILTER (WHERE m.tipo IN ('sfrido', 'rottura', 'deterioramento', 'omaggio', 'consumo_interno')) AS sprechi,
           -SUM(m.quantita) FILTER (WHERE m.tipo = 'inventario' AND m.quantita < 0) AS ammanchi
      FROM mag_movimenti m
     WHERE m.articolo_id IN (SELECT id FROM bev)
       AND (m.eseguito_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
     GROUP BY m.articolo_id
  )
  SELECT a.id, a.descrizione, a.unita_misura,
         COALESCE(mv.teorico, 0), COALESCE(mv.sprechi, 0), COALESCE(mv.ammanchi, 0),
         COALESCE(mv.teorico, 0) + COALESCE(mv.sprechi, 0) + COALESCE(mv.ammanchi, 0),
         ROUND(100 * (COALESCE(mv.sprechi, 0) + COALESCE(mv.ammanchi, 0)) / NULLIF(mv.teorico, 0), 1),
         ROUND((COALESCE(mv.sprechi, 0) + COALESCE(mv.ammanchi, 0)) * a.costo_unitario, 2),
         COALESCE(100 * (COALESCE(mv.sprechi, 0) + COALESCE(mv.ammanchi, 0)) / NULLIF(mv.teorico, 0) > p_soglia_pct,
                  COALESCE(mv.ammanchi, 0) > 0)
    FROM mag_articoli a JOIN mov mv ON mv.articolo_id = a.id
   WHERE a.modulo IN ('fb', p_modulo)
   ORDER BY 9 DESC NULLS LAST;
END;
$$;

-- ═══ RICHIAMO DI UN LOTTO ═══════════════════════════════════════════
-- Dal lotto ai piatti, alle comande, ai tavoli e ai clienti (con recapito,
-- per avvisarli). Anche attraverso i semilavorati: lo scarico teorico
-- esplode sempre fino alle materie prime.
CREATE OR REPLACE FUNCTION fb_richiamo_lotto(p_lotto UUID)
RETURNS TABLE (servito_at TIMESTAMPTZ, locale TEXT, comanda_numero INT, canale TEXT, tavolo TEXT, prodotto TEXT,
               quantita_lotto NUMERIC, cliente TEXT, recapito TEXT, comanda_id UUID, riga_id UUID)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
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
   WHERE m.lotto_id = p_lotto
   ORDER BY 1
$$;

-- ═══ SPRECHI ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fb_sprechi_analisi(p_locale UUID, p_dal DATE, p_al DATE)
RETURNS TABLE (causale TEXT, eventi INT, costo NUMERIC)
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM fb_richiede_direzione();
  RETURN QUERY
  SELECT x.causale, count(*)::int, ROUND(SUM(x.costo), 2) FROM (
    SELECT s.causale, s.costo FROM fb_sprechi s
     WHERE (s.locale_id = p_locale OR s.locale_id IS NULL)
       AND (s.registrato_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
    UNION ALL
    SELECT 'piatto_rifatto', r.quantita * COALESCE(r.costo_unitario, 0) FROM fb_comande_righe r
     WHERE r.locale_id = p_locale AND r.rifacimento_di IS NOT NULL AND r.stato <> 'annullata'
       AND (r.ordinata_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
    UNION ALL
    SELECT 'annullato_dopo_preparazione', r.quantita * COALESCE(r.costo_unitario, 0) FROM fb_comande_righe r
     WHERE r.locale_id = p_locale AND r.stato = 'annullata' AND r.scaricata
       AND (r.ordinata_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
    UNION ALL
    SELECT CASE WHEN r.promozione_id IS NOT NULL THEN 'omaggio_promozione' ELSE 'omaggio' END,
           r.quantita * COALESCE(r.costo_unitario, 0) FROM fb_comande_righe r
     WHERE r.locale_id = p_locale AND r.omaggio AND r.stato <> 'annullata' AND r.padre_id IS NULL
       AND (r.ordinata_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
  ) x
  GROUP BY x.causale
  ORDER BY 3 DESC;
END;
$$;

-- ═══ PERSONALE E COPERTI ════════════════════════════════════════════
-- Fabbisogno dai coperti previsti (prenotazioni del giorno) e confronto
-- con i turni pianificati in sala e in cucina.
CREATE OR REPLACE FUNCTION fb_fabbisogno_personale(p_locale UUID, p_giorno DATE)
RETURNS TABLE (reparto TEXT, coperti_previsti INT, persone_suggerite INT, persone_pianificate INT, differenza INT)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH l AS (SELECT * FROM fb_locali WHERE id = p_locale),
  cop AS (
    SELECT COALESCE(SUM(persone), 0)::int AS n FROM fb_prenotazioni
     WHERE locale_id = p_locale AND stato NOT IN ('annullata', 'no_show')
       AND (inizio AT TIME ZONE 'Europe/Rome')::date = p_giorno
  ),
  rep AS (
    SELECT 'sala' AS reparto, ceil(cop.n::numeric / l.coperti_per_cameriere)::int AS sugg FROM l, cop
    UNION ALL
    SELECT 'cucina', ceil(cop.n::numeric / l.coperti_per_cuoco)::int FROM l, cop
  )
  SELECT rep.reparto, cop.n, rep.sugg,
         (SELECT count(DISTINCT t.dipendente_id)::int FROM turni t, l
           WHERE t.modulo = l.modulo AND t.reparto = rep.reparto AND t.stato NOT IN ('annullato', 'assente')
             AND (t.inizio AT TIME ZONE 'Europe/Rome')::date = p_giorno),
         (SELECT count(DISTINCT t.dipendente_id)::int FROM turni t, l
           WHERE t.modulo = l.modulo AND t.reparto = rep.reparto AND t.stato NOT IN ('annullato', 'assente')
             AND (t.inizio AT TIME ZONE 'Europe/Rome')::date = p_giorno) - rep.sugg
    FROM rep, cop
$$;

-- ═══ CRUSCOTTO DELLA GIORNATA ═══════════════════════════════════════
-- Sala, cucina, magazzino per tutti; vendite solo per la direzione.
CREATE OR REPLACE FUNCTION fb_cruscotto(p_locale UUID, p_giorno DATE DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date)
RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  l fb_locali%ROWTYPE;
  v_sala JSONB;
  v_cucina JSONB;
  v_vendite JSONB;
  v_magazzino JSONB;
BEGIN
  SELECT * INTO l FROM fb_locali WHERE id = p_locale;
  IF l.id IS NULL THEN RAISE EXCEPTION 'Locale inesistente'; END IF;

  SELECT jsonb_build_object(
    'prenotazioni', (SELECT count(*) FROM fb_prenotazioni WHERE locale_id = p_locale
                      AND stato NOT IN ('annullata') AND (inizio AT TIME ZONE 'Europe/Rome')::date = p_giorno),
    'coperti_previsti', (SELECT COALESCE(SUM(persone), 0) FROM fb_prenotazioni WHERE locale_id = p_locale
                      AND stato NOT IN ('annullata', 'no_show') AND (inizio AT TIME ZONE 'Europe/Rome')::date = p_giorno),
    'coperti_presenti', (SELECT COALESCE(SUM(coperti), 0) FROM fb_comande WHERE locale_id = p_locale AND stato = 'aperta'),
    'tavoli_liberi', (SELECT count(*) FROM fb_tavoli_stato WHERE locale_id = p_locale AND stato = 'libero'),
    'tavoli_prenotati', (SELECT count(*) FROM fb_tavoli_stato WHERE locale_id = p_locale AND stato = 'prenotato'),
    'tavoli_occupati', (SELECT count(*) FROM fb_tavoli_stato WHERE locale_id = p_locale
                      AND stato IN ('occupato', 'in_servizio', 'conto_richiesto')),
    'tavoli_in_attesa', (SELECT count(*) FROM fb_tavoli_stato WHERE locale_id = p_locale AND stato = 'in_attesa'),
    'lista_attesa', (SELECT count(*) FROM fb_attesa WHERE locale_id = p_locale AND stato IN ('in_attesa', 'avvisato'))
  ) INTO v_sala;

  SELECT jsonb_build_object(
    'comande_aperte', (SELECT count(*) FROM fb_comande WHERE locale_id = p_locale AND stato = 'aperta'),
    'piatti_da_preparare', (SELECT count(*) FROM fb_comande_righe WHERE locale_id = p_locale AND stato = 'da_preparare'),
    'piatti_in_preparazione', (SELECT count(*) FROM fb_comande_righe WHERE locale_id = p_locale
                                AND stato IN ('presa_in_carico', 'in_preparazione')),
    'piatti_pronti', (SELECT count(*) FROM fb_kds WHERE locale_id = p_locale AND stato = 'pronta'),
    'ritardi', (SELECT count(*) FROM fb_kds WHERE locale_id = p_locale AND in_ritardo),
    'tempo_medio_preparazione_min', (SELECT ROUND(AVG(EXTRACT(EPOCH FROM pronta_at - inviata_at) / 60)::numeric, 1)
                                      FROM fb_comande_righe WHERE locale_id = p_locale AND pronta_at IS NOT NULL
                                       AND (pronta_at AT TIME ZONE 'Europe/Rome')::date = p_giorno)
  ) INTO v_cucina;

  SELECT jsonb_build_object(
    'sotto_scorta', (SELECT count(*) FROM mag_giacenze WHERE modulo IN ('fb', l.modulo) AND sotto_scorta),
    'in_scadenza', (SELECT count(*) FROM mag_lotti_stato WHERE modulo IN ('fb', l.modulo) AND residuo > 0
                     AND giorni_residui BETWEEN 0 AND 3),
    'scaduti', (SELECT count(*) FROM mag_lotti_stato WHERE modulo IN ('fb', l.modulo) AND residuo > 0 AND giorni_residui < 0),
    'ordini_in_arrivo', (SELECT count(*) FROM mag_ordini WHERE modulo IN ('fb', l.modulo)
                          AND stato IN ('inviato', 'ricevuto_parziale'))
  ) INTO v_magazzino;

  IF auth.uid() IS NULL OR puo_amministrazione() THEN
    WITH conti_giorno AS (
      SELECT k.conto_id, k.coperti, s.totale FROM fb_comande k JOIN conti_saldi s ON s.conto_id = k.conto_id
       WHERE k.locale_id = p_locale AND k.stato = 'chiusa' AND (k.chiusa_at AT TIME ZONE 'Europe/Rome')::date = p_giorno
    ), incassi AS (
      SELECT COALESCE(SUM(cp.importo) FILTER (WHERE cp.metodo <> 'addebito_conto'), 0) AS incasso
        FROM conti_pagamenti cp JOIN fb_comande k ON k.conto_id = cp.conto_id
       WHERE k.locale_id = p_locale AND (cp.pagato_at AT TIME ZONE 'Europe/Rome')::date = p_giorno
    )
    SELECT jsonb_build_object(
      'incasso', (SELECT incasso FROM incassi),
      'conti_chiusi', (SELECT count(*) FROM conti_giorno),
      'coperti', (SELECT COALESCE(SUM(coperti), 0) FROM conti_giorno),
      'ticket_medio', (SELECT ROUND(AVG(totale), 2) FROM conti_giorno),
      'spesa_per_coperto', (SELECT ROUND(SUM(totale) / NULLIF(SUM(coperti), 0), 2) FROM conti_giorno),
      'per_fascia_oraria', (SELECT COALESCE(jsonb_object_agg(ora, lordo ORDER BY ora), '{}'::jsonb) FROM (
                              SELECT ora, SUM(ricavo_lordo) AS lordo FROM fb_vendite
                               WHERE locale_id = p_locale AND giorno = p_giorno GROUP BY ora) f)
    ) INTO v_vendite;
  END IF;

  RETURN jsonb_build_object('giorno', p_giorno, 'locale', l.nome, 'sala', v_sala, 'cucina', v_cucina,
                            'magazzino', v_magazzino, 'vendite', v_vendite);
END;
$$;

-- ═══ KPI DI PERIODO (direzione) ═════════════════════════════════════
CREATE OR REPLACE FUNCTION fb_kpi(p_locale UUID, p_dal DATE, p_al DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public AS $$
DECLARE
  l fb_locali%ROWTYPE;
  v_giorni INT := p_al - p_dal + 1;
  v_posti INT;
  v_tavoli INT;
  v JSONB;
BEGIN
  PERFORM fb_richiede_direzione();
  SELECT * INTO l FROM fb_locali WHERE id = p_locale;
  SELECT COALESCE(SUM(posti), 0), count(*) INTO v_posti, v_tavoli FROM fb_tavoli WHERE locale_id = p_locale AND attivo;

  WITH conti_p AS (
    SELECT k.id, k.canale, k.coperti, k.contatto_id, k.tavolo_id, s.totale,
           (k.chiusa_at AT TIME ZONE 'Europe/Rome')::date AS giorno
      FROM fb_comande k JOIN conti_saldi s ON s.conto_id = k.conto_id
     WHERE k.locale_id = p_locale AND k.stato = 'chiusa'
       AND (k.chiusa_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
  ), vend AS (
    SELECT * FROM fb_vendite WHERE locale_id = p_locale AND giorno BETWEEN p_dal AND p_al
  ), righe AS (
    SELECT * FROM fb_comande_righe WHERE locale_id = p_locale
       AND (ordinata_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
  ), pren AS (
    SELECT * FROM fb_prenotazioni WHERE locale_id = p_locale
       AND (inizio AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
  ), ore AS (
    SELECT COALESCE(SUM(COALESCE(ore_effettive, ore_previste)), 0) AS ore FROM turni
     WHERE modulo = l.modulo AND stato NOT IN ('annullato', 'assente')
       AND (inizio AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
  ), clienti AS (
    SELECT contatto_id, count(*) AS visite, SUM(totale) AS spesa,
           NOT EXISTS (SELECT 1 FROM fb_comande k2 WHERE k2.contatto_id = cp.contatto_id AND k2.stato = 'chiusa'
                        AND (k2.chiusa_at AT TIME ZONE 'Europe/Rome')::date < p_dal) AS nuovo
      FROM conti_p cp WHERE contatto_id IS NOT NULL GROUP BY contatto_id
  )
  SELECT jsonb_build_object(
    'commerciali', jsonb_build_object(
      'fatturato', (SELECT COALESCE(SUM(totale), 0) FROM conti_p),
      'fatturato_netto', (SELECT COALESCE(SUM(ricavo), 0) FROM vend),
      'conti', (SELECT count(*) FROM conti_p),
      'coperti', (SELECT COALESCE(SUM(coperti), 0) FROM conti_p),
      'ticket_medio', (SELECT ROUND(AVG(totale), 2) FROM conti_p),
      'ricavo_per_coperto', (SELECT ROUND(SUM(totale) / NULLIF(SUM(coperti), 0), 2) FROM conti_p),
      'tasso_occupazione_pct', (SELECT ROUND(100.0 * SUM(coperti) / NULLIF(v_posti * v_giorni, 0), 1) FROM conti_p),
      'rotazione_tavoli', (SELECT ROUND(count(*)::numeric / NULLIF(v_tavoli * v_giorni, 0), 2) FROM conti_p WHERE tavolo_id IS NOT NULL),
      'per_fascia_oraria', (SELECT COALESCE(jsonb_object_agg(ora, lordo ORDER BY ora), '{}'::jsonb)
                              FROM (SELECT ora, SUM(ricavo_lordo) AS lordo FROM vend GROUP BY ora) f),
      'per_canale', (SELECT COALESCE(jsonb_object_agg(canale, lordo), '{}'::jsonb)
                       FROM (SELECT canale, SUM(ricavo_lordo) AS lordo FROM vend GROUP BY canale) f)
    ),
    'cucina', jsonb_build_object(
      'tempo_medio_preparazione_min', (SELECT ROUND(AVG(EXTRACT(EPOCH FROM pronta_at - inviata_at) / 60)::numeric, 1)
                                         FROM righe WHERE pronta_at IS NOT NULL AND inviata_at IS NOT NULL),
      'tempo_medio_servizio_min', (SELECT ROUND(AVG(EXTRACT(EPOCH FROM servita_at - pronta_at) / 60)::numeric, 1)
                                     FROM righe WHERE servita_at IS NOT NULL AND pronta_at IS NOT NULL),
      'piatti_venduti', (SELECT COALESCE(SUM(quantita), 0) FROM vend WHERE area = 'food'),
      'bevande_vendute', (SELECT COALESCE(SUM(quantita), 0) FROM vend WHERE area = 'beverage'),
      'piatti_restituiti', (SELECT count(*) FROM righe WHERE motivo_rifacimento = 'restituito'),
      'rifacimenti', (SELECT count(*) FROM righe WHERE rifacimento_di IS NOT NULL),
      'righe_annullate', (SELECT count(*) FROM righe WHERE stato = 'annullata')
    ),
    'economici', jsonb_build_object(
      'costo_materie_prime', (SELECT COALESCE(SUM(costo), 0) FROM vend),
      'food_cost_pct', (SELECT ROUND(100 * SUM(costo) / NULLIF(SUM(ricavo), 0), 1) FROM vend WHERE area = 'food'),
      'beverage_cost_pct', (SELECT ROUND(100 * SUM(costo) / NULLIF(SUM(ricavo), 0), 1) FROM vend WHERE area = 'beverage'),
      'margine_lordo', (SELECT COALESCE(SUM(ricavo) - SUM(costo), 0) FROM vend),
      'ore_lavorate', (SELECT ore FROM ore),
      'costo_personale', (SELECT ROUND(ore * l.costo_orario_medio, 2) FROM ore),
      'sprechi', (SELECT COALESCE(SUM(costo), 0) FROM fb_sprechi_analisi(p_locale, p_dal, p_al))
    ),
    'clienti', jsonb_build_object(
      'clienti_identificati', (SELECT count(*) FROM clienti),
      'nuovi_clienti', (SELECT count(*) FROM clienti WHERE nuovo),
      'clienti_ricorrenti', (SELECT count(*) FROM clienti WHERE NOT nuovo OR visite > 1),
      'frequenza_media', (SELECT ROUND(AVG(visite), 2) FROM clienti),
      'spesa_media', (SELECT ROUND(AVG(spesa / visite), 2) FROM clienti),
      'prenotazioni', (SELECT count(*) FROM pren),
      'no_show', (SELECT count(*) FROM pren WHERE stato = 'no_show'),
      'no_show_pct', (SELECT ROUND(100.0 * count(*) FILTER (WHERE stato = 'no_show')
                                   / NULLIF(count(*) FILTER (WHERE stato <> 'annullata'), 0), 1) FROM pren),
      'nps', (SELECT ROUND(100.0 * (count(*) FILTER (WHERE nps >= 9) - count(*) FILTER (WHERE nps <= 6))
                           / NULLIF(count(*), 0)) FROM feedback
               WHERE modulo = l.modulo AND nps IS NOT NULL
                 AND (ricevuto_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
      'valutazione_media', (SELECT ROUND(AVG(valutazione), 2) FROM feedback
               WHERE modulo = l.modulo AND (ricevuto_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al)
    )
  ) INTO v;
  RETURN jsonb_build_object('locale', l.nome, 'dal', p_dal, 'al', p_al) || v;
END;
$$;

-- ═══ CRM: PROFILO DEL CLIENTE ═══════════════════════════════════════
-- Al ritorno del cliente: visite, spesa, preferiti, allergie, ricorrenze.
CREATE OR REPLACE FUNCTION fb_cliente_profilo(p_contatto UUID)
RETURNS JSONB
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH visite AS (
    SELECT k.id, k.chiusa_at, s.totale FROM fb_comande k JOIN conti_saldi s ON s.conto_id = k.conto_id
     WHERE k.contatto_id = p_contatto AND k.stato = 'chiusa'
  ), vend AS (
    SELECT v.* FROM fb_vendite v JOIN fb_comande k ON k.id = v.comanda_id
     WHERE k.contatto_id = p_contatto AND k.stato = 'chiusa'
  )
  SELECT jsonb_build_object(
    'visite', (SELECT count(*) FROM visite),
    'prima_visita', (SELECT MIN(chiusa_at) FROM visite),
    'ultima_visita', (SELECT MAX(chiusa_at) FROM visite),
    'spesa_totale', (SELECT COALESCE(SUM(totale), 0) FROM visite),
    'ticket_medio', (SELECT ROUND(AVG(totale), 2) FROM visite),
    'visite_al_mese', (SELECT ROUND(count(*) / GREATEST(EXTRACT(EPOCH FROM NOW() - MIN(chiusa_at)) / 2592000, 1)::numeric, 2) FROM visite),
    'prenotazioni', (SELECT count(*) FROM fb_prenotazioni WHERE contatto_id = p_contatto),
    'no_show', (SELECT count(*) FROM fb_prenotazioni WHERE contatto_id = p_contatto AND stato = 'no_show'),
    'piatti_preferiti', (SELECT COALESCE(jsonb_agg(x ORDER BY q DESC), '[]'::jsonb) FROM (
                           SELECT prodotto AS x, SUM(quantita) AS q FROM vend WHERE area = 'food'
                            GROUP BY prodotto ORDER BY q DESC LIMIT 3) f),
    'vini_preferiti', (SELECT COALESCE(jsonb_agg(x ORDER BY q DESC), '[]'::jsonb) FROM (
                         SELECT prodotto AS x, SUM(quantita) AS q FROM vend WHERE beverage_tipo = 'vino'
                          GROUP BY prodotto ORDER BY q DESC LIMIT 3) f),
    'preferenze', (SELECT to_jsonb(c) - ARRAY['id','modulo','contatto_id','created_at','created_by','updated_at','updated_by']
                     FROM fb_clienti c WHERE c.contatto_id = p_contatto),
    'feedback', (SELECT COALESCE(jsonb_agg(jsonb_build_object('tipo', tipo, 'nps', nps, 'testo', testo, 'stato', stato,
                                                              'ricevuto_at', ricevuto_at) ORDER BY ricevuto_at DESC), '[]'::jsonb)
                   FROM feedback WHERE contatto_id = p_contatto AND modulo IN ('fb', 'ristorante', 'bar'))
  )
$$;

-- Elenco clienti con visite e spesa (scheda CRM del modulo).
CREATE VIEW fb_clienti_riepilogo WITH (security_invoker = true) AS
SELECT k.contatto_id, count(*)::int AS visite, MAX(k.chiusa_at) AS ultima_visita,
       SUM(s.totale) AS spesa_totale, ROUND(AVG(s.totale), 2) AS ticket_medio,
       (array_agg(k.modulo ORDER BY k.chiusa_at DESC))[1] AS modulo
  FROM fb_comande k JOIN conti_saldi s ON s.conto_id = k.conto_id
 WHERE k.stato = 'chiusa' AND k.contatto_id IS NOT NULL
 GROUP BY k.contatto_id;

-- ═══ REGISTRO ALLERGENI (Reg. UE 1169/2011) ═════════════════════════
CREATE OR REPLACE FUNCTION fb_registro_allergeni(p_locale UUID)
RETURNS TABLE (categoria TEXT, prodotto TEXT, allergeni TEXT[], possibili_tracce TEXT[],
               ingredienti_sostituibili TEXT, contaminazioni TEXT, note_operative TEXT)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT c.nome, p.nome, fb_allergeni_prodotto(p.id), p.allergeni_potenziali,
         p.ingredienti_sostituibili, p.contaminazioni, p.note_operative
    FROM fb_prodotti p JOIN fb_categorie c ON c.id = p.categoria_id
   WHERE p.stato <> 'sospeso' AND modulo_attivo(p.modulo)
     AND (NOT EXISTS (SELECT 1 FROM fb_menu m WHERE m.locale_id = p_locale AND m.attivo)
          OR EXISTS (SELECT 1 FROM fb_menu_voci v JOIN fb_menu m ON m.id = v.menu_id
                      WHERE v.prodotto_id = p.id AND m.locale_id = p_locale AND m.attivo))
   ORDER BY c.ordine, c.nome, p.nome
$$;

-- ═══ SEGMENTI PER LE CAMPAGNE ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION seg_fb_inattivi(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT contatto_id FROM fb_comande
   WHERE modulo = p_modulo AND stato = 'chiusa' AND contatto_id IS NOT NULL
   GROUP BY contatto_id
  HAVING MAX(chiusa_at) < NOW() - make_interval(days => COALESCE((p_parametri->>'giorni')::int, 60))
$$;
CREATE OR REPLACE FUNCTION seg_fb_abituali(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT contatto_id FROM fb_comande
   WHERE modulo = p_modulo AND stato = 'chiusa' AND contatto_id IS NOT NULL
     AND chiusa_at >= NOW() - INTERVAL '6 months'
   GROUP BY contatto_id
  HAVING count(*) >= COALESCE((p_parametri->>'visite')::int, 4)
$$;
-- Compleanni e anniversari nei prossimi N giorni (anno ignorato).
CREATE OR REPLACE FUNCTION seg_fb_ricorrenze(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT c.contatto_id FROM fb_clienti c
    CROSS JOIN LATERAL (SELECT d FROM unnest(ARRAY[c.compleanno, c.anniversario]) d WHERE d IS NOT NULL
                        UNION ALL
                        SELECT (r->>'data')::date FROM jsonb_array_elements(c.ricorrenze) r WHERE r ? 'data') x
   WHERE EXISTS (
     SELECT 1 FROM generate_series(0, COALESCE((p_parametri->>'giorni')::int, 14)) g
      WHERE to_char(CURRENT_DATE + g, 'MM-DD') = to_char(x.d, 'MM-DD'))
$$;

INSERT INTO campagne_segmenti (slug, modulo, etichetta, descrizione, funzione, parametri) VALUES
  ('fb_inattivi', 'fb', 'Clienti che non tornano', 'Clienti del locale senza visite da un certo numero di giorni',
     'seg_fb_inattivi', '{"giorni": {"etichetta": "Senza visite da (giorni)", "default": 60}}'),
  ('fb_abituali', 'fb', 'Clienti abituali', 'Almeno N visite negli ultimi sei mesi',
     'seg_fb_abituali', '{"visite": {"etichetta": "Visite minime", "default": 4}}'),
  ('fb_ricorrenze', 'fb', 'Compleanni e ricorrenze', 'Compleanno, anniversario o ricorrenza nei prossimi giorni',
     'seg_fb_ricorrenze', '{"giorni": {"etichetta": "Entro (giorni)", "default": 14}}');

-- ═══ RICERCA GLOBALE: + prodotti, prenotazioni, eventi ══════════════
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
  ) t
  LIMIT 20
$$;

-- ═══ PERMESSI ═══════════════════════════════════════════════════════
GRANT SELECT ON fb_vendite, fb_clienti_riepilogo TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['seg_fb_inattivi(text,jsonb)','seg_fb_abituali(text,jsonb)','seg_fb_ricorrenze(text,jsonb)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
    'fb_richiede_direzione()','fb_food_cost(uuid,date,date,text)','fb_menu_engineering(uuid,date,date,uuid)',
    'fb_beverage_controllo(text,date,date,numeric)','fb_richiamo_lotto(uuid)','fb_sprechi_analisi(uuid,date,date)',
    'fb_fabbisogno_personale(uuid,date)','fb_cruscotto(uuid,date)','fb_kpi(uuid,date,date)',
    'fb_cliente_profilo(uuid)','fb_registro_allergeni(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT applica_protezioni_tabelle();
