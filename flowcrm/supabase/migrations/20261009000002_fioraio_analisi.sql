-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Fioraio (Sprint 5) · 2/2: vendita al banco e resi, fabbisogno per
-- gli acquisti, sprechi, indicatori, cruscotto, agenda, profilo del cliente,
-- segmenti delle campagne, catalogo per i canali online, ricerca.
--
-- Documento Fioraio §15, §17–21, §23–27.
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. VENDITA AL BANCO E RESI (§18) ═══════════════════════════════
-- Dal banco: articoli e composizioni già pronte; nasce un ordine «banco»
-- già consegnato, la merce esce dal magazzino e si incassa dalla cassa.
CREATE OR REPLACE FUNCTION fior_vendi_banco(p_righe JSONB, p_contatto UUID DEFAULT NULL)
RETURNS UUID                                      -- il conto da incassare
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_ordine UUID;
  v_nome TEXT := 'Cliente al banco';
  r JSONB;
BEGIN
  IF NOT modulo_attivo('fioraio') THEN RAISE EXCEPTION 'Modulo Fioraio non attivo' USING ERRCODE = '42501'; END IF;
  IF p_righe IS NULL OR jsonb_typeof(p_righe) <> 'array' OR jsonb_array_length(p_righe) = 0 THEN
    RAISE EXCEPTION 'Aggiungi almeno un prodotto' USING ERRCODE = 'check_violation';
  END IF;
  IF p_contatto IS NOT NULL THEN
    SELECT trim(nome || ' ' || COALESCE(cognome, '')) INTO v_nome FROM contatti WHERE id = p_contatto;
  END IF;
  INSERT INTO fior_ordini (canale, committente_id, committente_nome, modalita, created_by)
  VALUES ('negozio', p_contatto, v_nome, 'banco', auth.uid()) RETURNING id INTO v_ordine;
  FOR r IN SELECT * FROM jsonb_array_elements(p_righe) LOOP
    IF r ? 'distinta_id' THEN
      INSERT INTO fior_ordini_righe (ordine_id, tipo, distinta_id, quantita, created_by)
      VALUES (v_ordine, 'composizione', (r->>'distinta_id')::uuid, COALESCE((r->>'quantita')::numeric, 1), auth.uid());
    ELSE
      IF NOT EXISTS (SELECT 1 FROM mag_articoli WHERE id = (r->>'articolo_id')::uuid AND modulo = 'fioraio' AND attivo AND vendibile) THEN
        RAISE EXCEPTION 'Prodotto non in vendita' USING ERRCODE = 'check_violation';
      END IF;
      INSERT INTO fior_ordini_righe (ordine_id, tipo, articolo_id, quantita, created_by)
      VALUES (v_ordine, 'articolo', (r->>'articolo_id')::uuid, COALESCE((r->>'quantita')::numeric, 1), auth.uid());
    END IF;
  END LOOP;
  UPDATE fior_ordini SET stato = 'consegnato' WHERE id = v_ordine;
  RETURN fior_conto_ordine(v_ordine);
END;
$$;

CREATE TABLE fior_resi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo      TEXT NOT NULL DEFAULT 'fioraio' CHECK (modulo = 'fioraio'),
  ordine_id   UUID NOT NULL REFERENCES fior_ordini(id) ON DELETE CASCADE,
  riga_id     UUID NOT NULL REFERENCES fior_ordini_righe(id) ON DELETE CASCADE,
  quantita    NUMERIC(10,2) NOT NULL CHECK (quantita > 0),
  importo     NUMERIC(10,2) NOT NULL DEFAULT 0,          -- da restituire al cliente (dalla cassa)
  motivo      TEXT NOT NULL,
  rivendibile BOOLEAN NOT NULL DEFAULT false,            -- torna in magazzino; altrimenti è una perdita
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id)
);

CREATE OR REPLACE FUNCTION fior_reso_effetti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r fior_ordini_righe%ROWTYPE;
  v_resi NUMERIC;
BEGIN
  SELECT * INTO r FROM fior_ordini_righe WHERE id = NEW.riga_id AND ordine_id = NEW.ordine_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Riga di un altro ordine' USING ERRCODE = 'check_violation'; END IF;
  SELECT COALESCE(sum(quantita), 0) INTO v_resi FROM fior_resi WHERE riga_id = NEW.riga_id;
  IF v_resi + NEW.quantita > r.quantita THEN
    RAISE EXCEPTION 'Reso oltre il venduto: restano % da rendere', r.quantita - v_resi USING ERRCODE = 'check_violation';
  END IF;
  NEW.importo := round(NEW.quantita * r.prezzo_unitario * (1 - r.sconto_pct / 100), 2);
  -- Solo un articolo integro torna in vendita; fiori e composizioni resi sono una perdita.
  IF NEW.rivendibile AND r.tipo = 'articolo' THEN
    INSERT INTO mag_movimenti (articolo_id, tipo, quantita, riferimento_tipo, riferimento_id, note, created_by)
    VALUES (r.articolo_id, 'reso_cliente', NEW.quantita, 'fior_resi', NEW.id, NEW.motivo, NEW.created_by);
  ELSE
    NEW.rivendibile := false;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fior_resi_effetti BEFORE INSERT ON fior_resi FOR EACH ROW EXECUTE FUNCTION fior_reso_effetti();

-- ═══ 2. FABBISOGNO PER GLI ACQUISTI (§17) ═══════════════════════════
-- Quanto serve nei prossimi giorni: ordini ricevuti non ancora prodotti,
-- eventi in programma, consumo medio e scorta minima, meno la giacenza.
CREATE OR REPLACE FUNCTION fior_fabbisogno(p_giorni INT DEFAULT 7)
RETURNS TABLE (articolo_id UUID, descrizione TEXT, categoria TEXT, fornitore_id UUID, unita_misura TEXT, giacenza NUMERIC, scorta_minima NUMERIC,
               per_ordini NUMERIC, per_eventi NUMERIC, consumo_medio_giorno NUMERIC, quantita_proposta NUMERIC, stagionalita TEXT)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH ordini AS (
    -- composizioni standard non ancora prodotte
    SELECT e.articolo_id, sum(e.quantita) AS q
      FROM fior_ordini o JOIN fior_ordini_righe r ON r.ordine_id = o.id
      LEFT JOIN fior_produzione p ON p.riga_id = r.id
      CROSS JOIN LATERAL esplodi_distinta(r.distinta_id, r.quantita) e
     WHERE o.stato IN ('ricevuto', 'confermato', 'in_preparazione') AND o.data_richiesta <= fior_oggi() + p_giorni
       AND r.tipo = 'composizione' AND COALESCE(p.stato, 'da_fare') IN ('da_fare', 'in_corso')
     GROUP BY e.articolo_id
    UNION ALL
    -- composizioni su misura
    SELECT m.articolo_id, sum(m.quantita * r.quantita)
      FROM fior_ordini o JOIN fior_ordini_righe r ON r.ordine_id = o.id JOIN fior_righe_materiali m ON m.riga_id = r.id
      LEFT JOIN fior_produzione p ON p.riga_id = r.id
     WHERE o.stato IN ('ricevuto', 'confermato', 'in_preparazione') AND o.data_richiesta <= fior_oggi() + p_giorni
       AND COALESCE(p.stato, 'da_fare') IN ('da_fare', 'in_corso')
     GROUP BY m.articolo_id
    UNION ALL
    -- articoli venduti così come sono, non ancora usciti
    SELECT r.articolo_id, sum(r.quantita)
      FROM fior_ordini o JOIN fior_ordini_righe r ON r.ordine_id = o.id
     WHERE o.stato IN ('ricevuto', 'confermato', 'in_preparazione') AND NOT o.materiali_scaricati
       AND o.data_richiesta <= fior_oggi() + p_giorni AND r.tipo = 'articolo'
     GROUP BY r.articolo_id
  ), eventi_f AS (
    SELECT e.articolo_id, sum(e.quantita) AS q
      FROM eventi ev JOIN eventi_voci v ON v.evento_id = ev.id
      CROSS JOIN LATERAL esplodi_distinta(v.distinta_id, v.quantita) e
     WHERE ev.modulo = 'fioraio' AND ev.stato::text NOT IN ('annullato', 'concluso', 'chiuso')
       AND (ev.inizio AT TIME ZONE 'Europe/Rome')::date BETWEEN fior_oggi() AND fior_oggi() + p_giorni
       AND v.distinta_id IS NOT NULL
     GROUP BY e.articolo_id
  ), consumo AS (
    SELECT m.articolo_id, -sum(m.quantita) / 30.0 AS giorno
      FROM mag_movimenti m
     WHERE m.modulo = 'fioraio' AND m.quantita < 0 AND m.tipo IN ('vendita', 'consumo') AND m.eseguito_at > NOW() - INTERVAL '30 days'
     GROUP BY m.articolo_id
  ), somma AS (
    SELECT g.articolo_id, g.descrizione, g.categoria, a.fornitore_id, g.unita_misura, g.giacenza, g.scorta_minima,
           COALESCE((SELECT sum(q) FROM ordini x WHERE x.articolo_id = g.articolo_id), 0) AS per_ordini,
           COALESCE((SELECT sum(q) FROM eventi_f x WHERE x.articolo_id = g.articolo_id), 0) AS per_eventi,
           COALESCE(c.giorno, 0) AS medio, a.stagionalita
      FROM mag_giacenze g JOIN mag_articoli a ON a.id = g.articolo_id
      LEFT JOIN consumo c ON c.articolo_id = g.articolo_id
     WHERE g.modulo = 'fioraio' AND a.attivo
  )
  SELECT articolo_id, descrizione, categoria, fornitore_id, unita_misura, giacenza, scorta_minima, round(per_ordini, 2), round(per_eventi, 2),
         round(medio, 2), ceil(GREATEST(per_ordini + per_eventi + scorta_minima + medio * p_giorni - giacenza, 0)), stagionalita
    FROM somma
   WHERE per_ordini + per_eventi + scorta_minima + medio * p_giorni > giacenza
   ORDER BY (per_ordini + per_eventi > giacenza) DESC, descrizione
$$;

-- ═══ 3. SPRECHI (§23) ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fior_sprechi(p_dal DATE, p_al DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v JSONB;
BEGIN
  IF NOT modulo_attivo('fioraio') THEN RAISE EXCEPTION 'Modulo Fioraio non attivo' USING ERRCODE = '42501'; END IF;
  WITH persi AS (
    SELECT m.articolo_id, a.descrizione, a.categoria, m.tipo::text AS tipo, -m.quantita AS quantita,
           -m.quantita * COALESCE(m.costo_unitario, a.costo_unitario, 0) AS costo,
           COALESCE(l.fornitore_id, a.fornitore_id) AS fornitore_id, date_trunc('month', m.eseguito_at AT TIME ZONE 'Europe/Rome')::date AS mese
      FROM mag_movimenti m JOIN mag_articoli a ON a.id = m.articolo_id LEFT JOIN mag_lotti l ON l.id = m.lotto_id
     WHERE m.modulo = 'fioraio' AND m.quantita < 0 AND m.tipo IN ('deterioramento', 'sfrido', 'rottura')
       AND (m.eseguito_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
  )
  SELECT jsonb_build_object(
    'costo', COALESCE((SELECT round(sum(costo), 2) FROM persi), 0),
    'resi_persi', COALESCE((SELECT round(sum(x.importo), 2) FROM fior_resi x WHERE NOT x.rivendibile
                              AND (x.created_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al), 0),
    'per_tipo', COALESCE((SELECT jsonb_object_agg(tipo, c) FROM (SELECT tipo, round(sum(costo), 2) AS c FROM persi GROUP BY tipo) t), '{}'),
    'per_prodotto', COALESCE((SELECT jsonb_agg(jsonb_build_object('descrizione', descrizione, 'categoria', categoria, 'quantita', q, 'costo', c) ORDER BY c DESC)
                                FROM (SELECT descrizione, categoria, sum(quantita) AS q, round(sum(costo), 2) AS c FROM persi GROUP BY 1, 2 ORDER BY 4 DESC LIMIT 20) t), '[]'),
    'per_fornitore', COALESCE((SELECT jsonb_agg(jsonb_build_object('fornitore', COALESCE(o.ragione_sociale, 'Senza fornitore'), 'costo', t.c) ORDER BY t.c DESC)
                                 FROM (SELECT fornitore_id, round(sum(costo), 2) AS c FROM persi GROUP BY 1) t
                                 LEFT JOIN organizzazioni o ON o.id = t.fornitore_id), '[]'),
    'per_mese', COALESCE((SELECT jsonb_agg(jsonb_build_object('mese', mese, 'costo', c) ORDER BY mese)
                            FROM (SELECT mese, round(sum(costo), 2) AS c FROM persi GROUP BY 1) t), '[]')
  ) INTO v;
  RETURN v;
END;
$$;

-- ═══ 4. INDICATORI (§26) ════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fior_kpi(p_dal DATE, p_al DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_comm JSONB; v_prod JSONB; v_oper JSONB; v_mag JSONB; v_ev JSONB;
BEGIN
  IF NOT modulo_attivo('fioraio') THEN RAISE EXCEPTION 'Modulo Fioraio non attivo' USING ERRCODE = '42501'; END IF;

  WITH o AS (
    SELECT * FROM fior_ordini WHERE stato IN ('consegnato', 'chiuso') AND (consegnato_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
  )
  SELECT jsonb_build_object(
    'fatturato', COALESCE(sum(totale), 0),
    'ordini', count(*),
    'valore_medio', CASE WHEN count(*) > 0 THEN round(sum(totale) / count(*), 2) END,
    'margine', COALESCE(sum(totale - importo_consegna - costo_stimato), 0),
    'online', count(*) FILTER (WHERE canale IN ('sito', 'marketplace', 'social', 'whatsapp')),
    'clienti_attivi', count(DISTINCT committente_id),
    'clienti_nuovi', (SELECT count(*) FROM (SELECT committente_id, min(consegnato_at) AS primo FROM fior_ordini
                        WHERE committente_id IS NOT NULL AND stato IN ('consegnato', 'chiuso') GROUP BY 1) p
                       WHERE (p.primo AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
    'clienti_ricorrenti', (SELECT count(*) FROM (SELECT committente_id FROM fior_ordini
                             WHERE committente_id IS NOT NULL AND stato IN ('consegnato', 'chiuso') GROUP BY 1 HAVING count(*) > 1) p
                            WHERE p.committente_id IN (SELECT committente_id FROM o)))
    INTO v_comm FROM o;

  WITH r AS (
    SELECT x.*, o.id AS oid FROM fior_ordini_righe x JOIN fior_ordini o ON o.id = x.ordine_id
     WHERE o.stato IN ('consegnato', 'chiuso') AND (o.consegnato_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
  )
  SELECT jsonb_build_object(
    'articoli', COALESCE((SELECT jsonb_agg(jsonb_build_object('descrizione', descrizione, 'quantita', q, 'ricavo', ric) ORDER BY ric DESC)
                            FROM (SELECT descrizione, sum(quantita) AS q, sum(importo) AS ric FROM r WHERE tipo = 'articolo' GROUP BY 1 ORDER BY 3 DESC LIMIT 10) t), '[]'),
    'composizioni', COALESCE((SELECT jsonb_agg(jsonb_build_object('descrizione', descrizione, 'quantita', q, 'ricavo', ric, 'margine', mar,
                                'margine_pct', CASE WHEN ric > 0 THEN round(100 * mar / ric, 1) END) ORDER BY ric DESC)
                            FROM (SELECT descrizione, sum(quantita) AS q, sum(importo) AS ric, sum(importo - quantita * costo_unitario) AS mar
                                    FROM r WHERE tipo IN ('composizione', 'su_misura') GROUP BY 1 ORDER BY 3 DESC LIMIT 10) t), '[]'),
    'bassa_rotazione', COALESCE((SELECT jsonb_agg(jsonb_build_object('descrizione', g.descrizione, 'giacenza', g.giacenza, 'valore', g.valore) ORDER BY g.valore DESC)
                            FROM mag_giacenze g
                           WHERE g.modulo = 'fioraio' AND g.giacenza > 0
                             AND NOT EXISTS (SELECT 1 FROM mag_movimenti m WHERE m.articolo_id = g.articolo_id AND m.quantita < 0
                                               AND m.tipo IN ('vendita', 'consumo') AND m.eseguito_at > NOW() - INTERVAL '30 days')), '[]'))
    INTO v_prod;

  SELECT jsonb_build_object(
    'evasi', (SELECT count(*) FROM fior_ordini WHERE stato IN ('consegnato', 'chiuso') AND (consegnato_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
    'annullati', (SELECT count(*) FROM fior_ordini WHERE stato = 'annullato' AND data_richiesta BETWEEN p_dal AND p_al),
    'minuti_preparazione', (SELECT round(avg(minuti_effettivi)) FROM fior_produzione WHERE stato = 'pronta'
                              AND (fine_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
    'pronte_in_tempo_pct', (SELECT CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE fine_at <= pronta_entro) / count(*), 1) END
                              FROM fior_produzione WHERE stato = 'pronta' AND pronta_entro IS NOT NULL
                               AND (fine_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
    'consegne', (SELECT count(*) FROM fior_consegne WHERE stato = 'consegnata' AND data BETWEEN p_dal AND p_al),
    'consegne_puntuali_pct', (SELECT CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE (consegnata_at AT TIME ZONE 'Europe/Rome')::date <= data) / count(*), 1) END
                                FROM fior_consegne WHERE stato = 'consegnata' AND data BETWEEN p_dal AND p_al),
    'consegne_fallite', (SELECT count(*) FROM fior_consegne WHERE stato = 'fallita' AND data BETWEEN p_dal AND p_al),
    'resi', (SELECT count(*) FROM fior_resi WHERE (created_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
    'resi_importo', (SELECT COALESCE(sum(importo), 0) FROM fior_resi WHERE (created_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al))
    INTO v_oper;

  SELECT jsonb_build_object(
    'valore_stock', (SELECT COALESCE(round(sum(valore), 2), 0) FROM mag_giacenze WHERE modulo = 'fioraio'),
    'sprechi', (fior_sprechi(p_dal, p_al)->>'costo')::numeric,
    'deterioramento', COALESCE((fior_sprechi(p_dal, p_al)->'per_tipo'->>'deterioramento')::numeric, 0),
    'rotazione', (SELECT CASE WHEN COALESCE(sum(g.valore), 0) > 0 THEN round(
                    (SELECT COALESCE(sum(-m.quantita * COALESCE(m.costo_unitario, 0)), 0) FROM mag_movimenti m
                      WHERE m.modulo = 'fioraio' AND m.quantita < 0 AND m.tipo IN ('vendita', 'consumo')
                        AND (m.eseguito_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al) / sum(g.valore), 2) END
                    FROM mag_giacenze g WHERE g.modulo = 'fioraio'),
    'sotto_scorta', (SELECT count(*) FROM mag_giacenze WHERE modulo = 'fioraio' AND sotto_scorta))
    INTO v_mag;

  SELECT jsonb_build_object(
    'matrimoni', count(*) FILTER (WHERE c.tipo = 'matrimonio'),
    'funerali', count(*) FILTER (WHERE c.tipo = 'funerale'),
    'aziendali', count(*) FILTER (WHERE c.tipo = 'aziendale'),
    'ricavi', COALESCE(sum((SELECT sum(v.ricavo) FROM eventi_voci v WHERE v.evento_id = e.id)), 0),
    'margine', COALESCE(sum((SELECT sum(v.ricavo - v.costo) FROM eventi_voci v WHERE v.evento_id = e.id)), 0))
    INTO v_ev
    FROM eventi e LEFT JOIN fior_cerimonie c ON c.evento_id = e.id
   WHERE e.modulo = 'fioraio' AND e.stato::text <> 'annullato' AND (e.inizio AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al;

  RETURN jsonb_build_object('commerciali', v_comm, 'prodotti', v_prod, 'operativi', v_oper, 'magazzino', v_mag, 'eventi', v_ev);
END;
$$;

-- ═══ 5. CRUSCOTTO (§27) ═════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fior_cruscotto()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_oggi DATE := fior_oggi();
  v_mese DATE := date_trunc('month', fior_oggi())::date;
BEGIN
  IF NOT modulo_attivo('fioraio') THEN RAISE EXCEPTION 'Modulo Fioraio non attivo' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'ordini_oggi', (SELECT count(*) FROM fior_ordini WHERE data_richiesta = v_oggi AND stato <> 'annullato'),
    'da_confermare', (SELECT count(*) FROM fior_ordini WHERE stato = 'ricevuto'),
    'da_preparare', (SELECT count(*) FROM fior_produzione WHERE stato IN ('da_fare', 'in_corso')),
    'in_ritardo', (SELECT count(*) FROM fior_produzione WHERE stato IN ('da_fare', 'in_corso') AND pronta_entro < NOW()),
    'consegne_oggi', (SELECT count(*) FROM fior_consegne WHERE data = v_oggi AND stato <> 'consegnata'),
    'consegne_fatte_oggi', (SELECT count(*) FROM fior_consegne WHERE data = v_oggi AND stato = 'consegnata'),
    'ritiri_oggi', (SELECT count(*) FROM fior_ordini WHERE modalita = 'ritiro' AND data_richiesta = v_oggi AND stato IN ('confermato', 'in_preparazione', 'pronto')),
    'ordini_online', (SELECT count(*) FROM fior_ordini WHERE stato = 'ricevuto' AND canale IN ('sito', 'marketplace', 'social', 'whatsapp')),
    'eventi', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'titolo', e.titolo, 'inizio', e.inizio, 'tipo', c.tipo) ORDER BY e.inizio)
                 FROM eventi e LEFT JOIN fior_cerimonie c ON c.evento_id = e.id
                WHERE e.modulo = 'fioraio' AND e.stato::text <> 'annullato' AND e.inizio BETWEEN NOW() AND NOW() + INTERVAL '14 days'), '[]'),
    'fatturato_oggi', (SELECT COALESCE(sum(totale), 0) FROM fior_ordini WHERE stato IN ('consegnato', 'chiuso') AND (consegnato_at AT TIME ZONE 'Europe/Rome')::date = v_oggi),
    'fatturato_mese', (SELECT COALESCE(sum(totale), 0) FROM fior_ordini WHERE stato IN ('consegnato', 'chiuso') AND (consegnato_at AT TIME ZONE 'Europe/Rome')::date >= v_mese),
    'margine_mese', CASE WHEN puo_amministrazione() THEN (SELECT COALESCE(sum(totale - importo_consegna - costo_stimato), 0) FROM fior_ordini
                       WHERE stato IN ('consegnato', 'chiuso') AND (consegnato_at AT TIME ZONE 'Europe/Rome')::date >= v_mese) END,
    'incassi_oggi', (SELECT COALESCE(sum(p.importo), 0) FROM conti_pagamenti p WHERE p.modulo = 'fioraio' AND (p.pagato_at AT TIME ZONE 'Europe/Rome')::date = v_oggi),
    'sotto_scorta', (SELECT count(*) FROM mag_giacenze WHERE modulo = 'fioraio' AND sotto_scorta),
    'in_scadenza', (SELECT count(*) FROM mag_lotti_stato WHERE modulo = 'fioraio' AND residuo > 0 AND giorni_residui IS NOT NULL AND giorni_residui <= 2),
    'sprechi_mese', (fior_sprechi(v_mese, v_oggi)->>'costo')::numeric,
    'personale', COALESCE((SELECT jsonb_agg(jsonb_build_object('nome', trim(u.nome || ' ' || COALESCE(u.cognome, '')), 'composizioni', x.composizioni, 'consegne', x.consegne)
                                            ORDER BY x.composizioni + x.consegne DESC)
                 FROM (SELECT uid, sum(c) AS composizioni, sum(d) AS consegne FROM (
                         SELECT operatore_id AS uid, count(*) AS c, 0 AS d FROM fior_produzione
                          WHERE stato = 'pronta' AND (fine_at AT TIME ZONE 'Europe/Rome')::date >= v_mese AND operatore_id IS NOT NULL GROUP BY 1
                         UNION ALL
                         SELECT autista_id, 0, count(*) FROM fior_consegne
                          WHERE stato = 'consegnata' AND data >= v_mese AND autista_id IS NOT NULL GROUP BY 1) y GROUP BY uid) x
                 JOIN user_profiles u ON u.id = x.uid), '[]')
  );
END;
$$;

-- ═══ 6. AGENDA (§21) ════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fior_agenda(p_dal DATE, p_al DATE)
RETURNS TABLE (tipo TEXT, quando TIMESTAMPTZ, titolo TEXT, dettaglio TEXT, riferimento UUID, percorso TEXT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT * FROM (
    -- composizioni da preparare
    SELECT 'preparazione', p.pronta_entro, p.descrizione || ' × ' || trim(to_char(p.quantita, 'FM999990.##')), o.codice || ' · ' || o.committente_nome,
           o.id, '/fioraio/ordini/' || o.id
      FROM fior_produzione p JOIN fior_ordini o ON o.id = p.ordine_id
     WHERE p.stato IN ('da_fare', 'in_corso') AND p.pronta_entro IS NOT NULL
    UNION ALL
    SELECT 'consegna', (c.data + TIME '09:00') AT TIME ZONE 'Europe/Rome', 'Consegna a ' || o.destinatario_nome,
           concat_ws(' · ', o.indirizzo, o.citta, c.fascia), o.id, '/fioraio/ordini/' || o.id
      FROM fior_consegne c JOIN fior_ordini o ON o.id = c.ordine_id WHERE c.stato NOT IN ('consegnata', 'fallita')
    UNION ALL
    SELECT 'ritiro', (o.data_richiesta + COALESCE(o.ora_richiesta, TIME '09:00')) AT TIME ZONE 'Europe/Rome', 'Ritiro di ' || o.committente_nome, o.codice,
           o.id, '/fioraio/ordini/' || o.id
      FROM fior_ordini o WHERE o.modalita = 'ritiro' AND o.stato IN ('confermato', 'in_preparazione', 'pronto')
    UNION ALL
    SELECT COALESCE(c.tipo, 'evento'), e.inizio, e.titolo, COALESCE(e.luogo, ''), e.id, '/fioraio/eventi'
      FROM eventi e LEFT JOIN fior_cerimonie c ON c.evento_id = e.id WHERE e.modulo = 'fioraio' AND e.stato::text <> 'annullato'
    UNION ALL
    SELECT 'montaggio', c.montaggio_at, 'Montaggio: ' || e.titolo, COALESCE(c.luogo_cerimonia, e.luogo, ''), e.id, '/fioraio/eventi'
      FROM fior_cerimonie c JOIN eventi e ON e.id = c.evento_id WHERE c.montaggio_at IS NOT NULL AND e.stato::text <> 'annullato'
    UNION ALL
    SELECT 'smontaggio', c.smontaggio_at, 'Smontaggio: ' || e.titolo, COALESCE(c.luogo_cerimonia, e.luogo, ''), e.id, '/fioraio/eventi'
      FROM fior_cerimonie c JOIN eventi e ON e.id = c.evento_id WHERE c.smontaggio_at IS NOT NULL AND e.stato::text <> 'annullato'
    UNION ALL
    SELECT 'abbonamento', (a.prossima_consegna + TIME '09:00') AT TIME ZONE 'Europe/Rome', a.piano, a.destinatario_nome, a.id, '/fioraio/abbonamenti'
      FROM fior_abbonamenti a WHERE a.stato = 'attivo'
    UNION ALL
    SELECT 'fornitore', (m.data_consegna_prevista + TIME '08:00') AT TIME ZONE 'Europe/Rome', 'Arrivo merce ' || m.codice, COALESCE(g.ragione_sociale, ''),
           m.id, '/fioraio/magazzino'
      FROM mag_ordini m LEFT JOIN organizzazioni g ON g.id = m.fornitore_id
     WHERE m.modulo = 'fioraio' AND m.data_consegna_prevista IS NOT NULL AND m.stato::text IN ('inviato', 'ricevuto_parziale')
  ) x(tipo, quando, titolo, dettaglio, riferimento, percorso)
  WHERE (x.quando AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
  ORDER BY x.quando
$$;

-- ═══ 7. CLIENTI (§15) ═══════════════════════════════════════════════
CREATE VIEW fior_clienti_riepilogo WITH (security_invoker = true) AS
SELECT k.id AS contatto_id, trim(k.nome || ' ' || COALESCE(k.cognome, '')) AS nome, k.email, k.telefono, k.organizzazione_id, k.consenso_marketing,
       count(o.id)::int AS ordini, COALESCE(sum(o.totale), 0) AS spesa, max(o.data_richiesta) AS ultimo_ordine, min(o.data_richiesta) AS primo_ordine,
       CASE WHEN count(o.id) > 1 THEN round((max(o.data_richiesta) - min(o.data_richiesta))::numeric / (count(o.id) - 1)) END AS giorni_tra_ordini,
       (SELECT count(*) FROM fior_ricorrenze r WHERE r.contatto_id = k.id AND r.attiva)::int AS ricorrenze
  FROM contatti k JOIN fior_ordini o ON o.committente_id = k.id AND o.stato <> 'annullato'
 GROUP BY k.id;

CREATE OR REPLACE FUNCTION fior_cliente_profilo(p_contatto UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT jsonb_build_object(
    'riepilogo', (SELECT to_jsonb(r) FROM fior_clienti_riepilogo r WHERE r.contatto_id = p_contatto),
    'preferiti', COALESCE((SELECT jsonb_agg(jsonb_build_object('descrizione', descrizione, 'volte', n) ORDER BY n DESC)
                   FROM (SELECT x.descrizione, count(*) AS n FROM fior_ordini_righe x JOIN fior_ordini o ON o.id = x.ordine_id
                          WHERE o.committente_id = p_contatto AND o.stato <> 'annullato' GROUP BY 1 ORDER BY 2 DESC LIMIT 5) t), '[]'),
    'destinatari', COALESCE((SELECT jsonb_agg(DISTINCT jsonb_build_object('nome', destinatario_nome, 'indirizzo', indirizzo, 'cap', cap, 'citta', citta, 'telefono', destinatario_telefono))
                   FROM fior_ordini WHERE committente_id = p_contatto AND destinatario_nome IS NOT NULL AND indirizzo IS NOT NULL), '[]'),
    'ricorrenze', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'tipo', tipo, 'per_chi', per_chi, 'giorno', giorno, 'mese', mese,
                     'prossima', fior_prossima(giorno, mese), 'attiva', attiva) ORDER BY fior_prossima(giorno, mese))
                   FROM fior_ricorrenze WHERE contatto_id = p_contatto), '[]'),
    'ordini', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'codice', codice, 'data', data_richiesta, 'stato', stato, 'totale', totale,
                     'destinatario', destinatario_nome, 'occasione', occasione) ORDER BY data_richiesta DESC)
                   FROM (SELECT * FROM fior_ordini WHERE committente_id = p_contatto ORDER BY data_richiesta DESC LIMIT 30) o), '[]')
  )
$$;

-- ═══ 8. SEGMENTI DELLE CAMPAGNE (§25) ═══════════════════════════════
CREATE OR REPLACE FUNCTION seg_fior_ricorrenze(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT contatto_id FROM fior_ricorrenze
   WHERE attiva AND fior_prossima(giorno, mese) <= fior_oggi() + COALESCE((p_parametri->>'giorni')::int, 14)
     AND (COALESCE(p_parametri->>'tipo', '') = '' OR tipo = p_parametri->>'tipo')
$$;
CREATE OR REPLACE FUNCTION seg_fior_inattivi(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT committente_id FROM fior_ordini WHERE committente_id IS NOT NULL AND stato <> 'annullato'
   GROUP BY 1 HAVING max(data_richiesta) < fior_oggi() - make_interval(months => COALESCE((p_parametri->>'mesi')::int, 6))
$$;
CREATE OR REPLACE FUNCTION seg_fior_abituali(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT committente_id FROM fior_ordini WHERE committente_id IS NOT NULL AND stato <> 'annullato'
   GROUP BY 1 HAVING count(*) >= COALESCE((p_parametri->>'ordini')::int, 3)
$$;
-- Chi ha ordinato l'anno scorso per la stessa festa (San Valentino, Festa della Donna, Festa della Mamma, Natale).
CREATE OR REPLACE FUNCTION seg_fior_festa(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  WITH f AS (
    SELECT CASE COALESCE(p_parametri->>'festa', 'san_valentino')
             WHEN 'festa_donna' THEN make_date(a, 3, 8)
             WHEN 'festa_mamma' THEN (make_date(a, 5, 1) + ((7 - EXTRACT(DOW FROM make_date(a, 5, 1))::int) % 7) + 7)   -- seconda domenica di maggio
             WHEN 'natale' THEN make_date(a, 12, 25)
             ELSE make_date(a, 2, 14) END AS giorno
      FROM generate_series(EXTRACT(YEAR FROM fior_oggi())::int - 2, EXTRACT(YEAR FROM fior_oggi())::int - 1) a
  )
  SELECT DISTINCT o.committente_id FROM fior_ordini o JOIN f ON o.data_richiesta BETWEEN f.giorno - 7 AND f.giorno + 1
   WHERE o.committente_id IS NOT NULL AND o.stato <> 'annullato'
$$;
INSERT INTO campagne_segmenti (slug, modulo, etichetta, descrizione, funzione, parametri) VALUES
  ('fioraio_ricorrenze', 'fioraio', 'Ricorrenze in arrivo', 'Compleanni, anniversari e altre date dei clienti nei prossimi giorni.',
     'seg_fior_ricorrenze', '{"giorni": {"etichetta": "Entro (giorni)", "default": 14}, "tipo": {"etichetta": "Tipo (vuoto = tutte)", "default": ""}}'),
  ('fioraio_festa', 'fioraio', 'Chi ha ordinato per la festa', 'San Valentino, Festa della Donna, Festa della Mamma, Natale: chi ha ordinato negli ultimi due anni.',
     'seg_fior_festa', '{"festa": {"etichetta": "Festa (san_valentino, festa_donna, festa_mamma, natale)", "default": "san_valentino"}}'),
  ('fioraio_inattivi', 'fioraio', 'Clienti che non ordinano', 'Nessun ordine da N mesi.',
     'seg_fior_inattivi', '{"mesi": {"etichetta": "Senza ordini da (mesi)", "default": 6}}'),
  ('fioraio_abituali', 'fioraio', 'Clienti abituali', 'Almeno N ordini.',
     'seg_fior_abituali', '{"ordini": {"etichetta": "Ordini almeno", "default": 3}}')
ON CONFLICT (slug) DO NOTHING;

-- ═══ 9. CATALOGO PER I CANALI ONLINE (§19–20, predisposto) ══════════
-- Composizioni in vendita con prezzo e disponibilità calcolata dai fiori in
-- magazzino: è ciò che un sito, un marketplace o WhatsApp Business leggono.
CREATE OR REPLACE FUNCTION fior_composizioni_disponibili()
RETURNS TABLE (distinta_id UUID, codice TEXT, nome TEXT, categoria TEXT, prezzo NUMERIC, costo NUMERIC, minuti INT, realizzabili INT, attributi JSONB)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT d.id, d.codice, d.nome, d.categoria, d.prezzo_vendita, costo_distinta(d.id), d.tempo_preparazione_min,
         COALESCE((SELECT floor(min(COALESCE(g.giacenza, 0) / NULLIF(e.quantita, 0)))::int
                     FROM esplodi_distinta(d.id, 1) e LEFT JOIN mag_giacenze g ON g.articolo_id = e.articolo_id), 0),
         d.attributi
    FROM distinte_base d
   WHERE d.modulo = 'fioraio' AND d.attivo
   ORDER BY d.categoria, d.nome
$$;

-- ═══ 10. RICERCA ════════════════════════════════════════════════════
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
  ) t
  LIMIT 20
$$;

-- ═══ 11. RLS, PERMESSI, TEMPO REALE ═════════════════════════════════
ALTER TABLE fior_resi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fior_resi_select" ON fior_resi FOR SELECT TO authenticated USING (modulo_attivo(modulo));
CREATE POLICY "fior_resi_insert" ON fior_resi FOR INSERT TO authenticated WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid());
CREATE TRIGGER fior_resi_audit AFTER INSERT OR UPDATE OR DELETE ON fior_resi FOR EACH ROW EXECUTE FUNCTION log_audit();

GRANT SELECT ON fior_clienti_riepilogo TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['fior_reso_effetti()', 'seg_fior_ricorrenze(text,jsonb)', 'seg_fior_inattivi(text,jsonb)', 'seg_fior_abituali(text,jsonb)',
                           'seg_fior_festa(text,jsonb)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY['fior_vendi_banco(jsonb,uuid)', 'fior_fabbisogno(integer)', 'fior_sprechi(date,date)', 'fior_kpi(date,date)', 'fior_cruscotto()',
                           'fior_agenda(date,date)', 'fior_cliente_profilo(uuid)', 'fior_composizioni_disponibili()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE fior_ordini, fior_produzione, fior_consegne;

SELECT applica_protezioni_tabelle();
