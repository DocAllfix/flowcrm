-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Palestra (Sprint 4) · 3/3: indicatori, cruscotto del giorno,
-- prospect e conversioni, segmenti delle campagne, convenzioni aziendali
-- (utilizzo e fattura), «porta un amico», ricerca.
--
-- Documento Palestra §2 (KPI di conversione), §6 (rinnovi effettuati e
-- persi), §29 (report e fatturazione corporate), §31 (fatturazione e
-- insoluti), §33 (campagne), §34 (referral), §35 (dati per l'app).
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. INDICATORI DEL PERIODO ══════════════════════════════════════
CREATE OR REPLACE FUNCTION pal_kpi(p_sede UUID, p_dal DATE, p_al DATE)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_soci JSONB;
  v_rinnovi JSONB;
  v_accessi JSONB;
  v_corsi JSONB;
  v_economia JSONB;
  v_prospect JSONB;
  v_attivi INT;
BEGIN
  IF NOT modulo_attivo('palestra') THEN RAISE EXCEPTION 'Modulo Palestra non attivo' USING ERRCODE = '42501'; END IF;

  SELECT count(*) FILTER (WHERE stato = 'attivo') INTO v_attivi FROM pal_soci_stato WHERE p_sede IS NULL OR sede_id = p_sede;
  SELECT jsonb_build_object(
           'attivi', v_attivi,
           'sospesi', count(*) FILTER (WHERE stato = 'sospeso'),
           'morosi', count(*) FILTER (WHERE stato = 'moroso'),
           'scaduti', count(*) FILTER (WHERE stato = 'scaduto'),
           'nuovi', (SELECT count(*) FROM pal_soci s WHERE (p_sede IS NULL OR s.sede_id = p_sede) AND s.data_iscrizione BETWEEN p_dal AND p_al),
           'usciti', (SELECT count(*) FROM pal_soci s WHERE (p_sede IS NULL OR s.sede_id = p_sede) AND s.ex_socio_at BETWEEN p_dal AND p_al),
           'inattivi_30', count(*) FILTER (WHERE stato = 'attivo' AND (ultimo_accesso IS NULL OR ultimo_accesso < NOW() - INTERVAL '30 days')))
    INTO v_soci FROM pal_soci_stato WHERE p_sede IS NULL OR sede_id = p_sede;

  -- Rinnovi: degli abbonamenti finiti nel periodo, quanti hanno un seguito.
  WITH finiti AS (
    SELECT a.id, EXISTS (SELECT 1 FROM pal_abbonamenti x WHERE x.rinnovo_di = a.id OR
                          (x.socio_id = a.socio_id AND x.inizio BETWEEN a.fine - 30 AND a.fine + 30 AND x.id <> a.id)) AS rinnovato,
           a.rinnovo_automatico
      FROM pal_abbonamenti a JOIN pal_soci s ON s.id = a.socio_id
     WHERE (p_sede IS NULL OR s.sede_id = p_sede) AND a.fine BETWEEN p_dal AND p_al AND a.stato <> 'disdetto'
  )
  SELECT jsonb_build_object(
           'in_scadenza_30', (SELECT count(*) FROM pal_abbonamenti a JOIN pal_soci s ON s.id = a.socio_id
                               WHERE (p_sede IS NULL OR s.sede_id = p_sede) AND a.stato IN ('attivo', 'sospeso')
                                 AND a.fine BETWEEN pal_oggi() AND pal_oggi() + 30
                                 AND NOT EXISTS (SELECT 1 FROM pal_abbonamenti x WHERE x.rinnovo_di = a.id)),
           'scaduti', count(*),
           'rinnovati', count(*) FILTER (WHERE rinnovato),
           'persi', count(*) FILTER (WHERE NOT rinnovato),
           'automatici', count(*) FILTER (WHERE rinnovato AND rinnovo_automatico),
           'tasso_rinnovo', CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE rinnovato) / count(*), 1) END)
    INTO v_rinnovi FROM finiti;

  SELECT jsonb_build_object(
           'ingressi', count(*) FILTER (WHERE consentito),
           'negati', count(*) FILTER (WHERE NOT consentito),
           'per_socio', CASE WHEN count(DISTINCT socio_id) FILTER (WHERE consentito) > 0
                             THEN round(count(*) FILTER (WHERE consentito)::numeric / count(DISTINCT socio_id) FILTER (WHERE consentito), 1) END,
           'per_ora', COALESCE((SELECT jsonb_object_agg(h, n ORDER BY h) FROM (
                         SELECT EXTRACT(HOUR FROM ingresso_at AT TIME ZONE 'Europe/Rome')::int AS h, count(*) AS n
                           FROM pal_accessi WHERE consentito AND (p_sede IS NULL OR sede_id = p_sede)
                            AND (ingresso_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al GROUP BY 1) o), '{}'),
           'motivi_negati', COALESCE((SELECT jsonb_object_agg(motivo, n) FROM (
                         SELECT split_part(motivo, ':', 1) AS motivo, count(*) AS n FROM pal_accessi
                          WHERE NOT consentito AND (p_sede IS NULL OR sede_id = p_sede)
                            AND (ingresso_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al GROUP BY 1) m), '{}'))
    INTO v_accessi FROM pal_accessi
   WHERE (p_sede IS NULL OR sede_id = p_sede) AND (ingresso_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al;

  SELECT jsonb_build_object(
           'lezioni', count(*),
           'riempimento', CASE WHEN sum(capienza) > 0 THEN round(100.0 * sum(iscritti) / sum(capienza), 1) END,
           'presenze', sum(presenti),
           'no_show', (SELECT count(*) FROM pal_prenotazioni p JOIN pal_lezioni l ON l.id = p.lezione_id
                        WHERE p.stato = 'assente' AND (p_sede IS NULL OR l.sede_id = p_sede)
                          AND (l.inizio AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
           'tasso_no_show', CASE WHEN sum(presenti) > 0 THEN round(100.0 * (SELECT count(*) FROM pal_prenotazioni p JOIN pal_lezioni l ON l.id = p.lezione_id
                        WHERE p.stato = 'assente' AND (p_sede IS NULL OR l.sede_id = p_sede)
                          AND (l.inizio AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al)
                        / (sum(presenti) + (SELECT count(*) FROM pal_prenotazioni p JOIN pal_lezioni l ON l.id = p.lezione_id
                        WHERE p.stato = 'assente' AND (p_sede IS NULL OR l.sede_id = p_sede)
                          AND (l.inizio AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al)), 1) END,
           'per_corso', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'corso') FROM (
                         SELECT jsonb_build_object('corso', corso, 'lezioni', count(*), 'presenze', sum(presenti),
                                                   'riempimento', round(100.0 * sum(iscritti) / NULLIF(sum(capienza), 0), 1)) AS x
                           FROM pal_lezioni_posti WHERE stato <> 'annullata' AND (p_sede IS NULL OR sede_id = p_sede)
                            AND (inizio AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al GROUP BY corso) c), '[]'))
    INTO v_corsi FROM pal_lezioni_posti
   WHERE stato <> 'annullata' AND (p_sede IS NULL OR sede_id = p_sede) AND (inizio AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al;

  -- Economia: solo per la direzione.
  IF puo_amministrazione() THEN
    SELECT jsonb_build_object(
             'incassato', COALESCE(sum(r.importo) FILTER (WHERE r.stato = 'pagata' AND r.pagata_il BETWEEN p_dal AND p_al), 0),
             'fatturato_aziende', COALESCE(sum(r.importo) FILTER (WHERE r.stato = 'fatturata' AND r.scadenza BETWEEN p_dal AND p_al), 0),
             'da_incassare', COALESCE(sum(r.importo) FILTER (WHERE r.stato IN ('da_pagare', 'fallita') AND r.pagatore = 'socio'), 0),
             'insoluti', COALESCE(sum(r.importo) FILTER (WHERE r.stato = 'insoluta'), 0),
             'per_voce', jsonb_build_object(
               'abbonamenti', COALESCE(sum(r.importo) FILTER (WHERE r.stato = 'pagata' AND r.pagata_il BETWEEN p_dal AND p_al AND r.abbonamento_id IS NOT NULL), 0),
               'carnet', COALESCE(sum(r.importo) FILTER (WHERE r.stato = 'pagata' AND r.pagata_il BETWEEN p_dal AND p_al AND r.carnet_acquisto IS NOT NULL), 0),
               'personal_training', COALESCE(sum(r.importo) FILTER (WHERE r.stato = 'pagata' AND r.pagata_il BETWEEN p_dal AND p_al
                                      AND r.descrizione LIKE 'Personal training%'), 0),
               'penali', COALESCE(sum(r.importo) FILTER (WHERE r.stato = 'pagata' AND r.pagata_il BETWEEN p_dal AND p_al AND r.descrizione LIKE 'Penale%'), 0)),
             'prodotti', (SELECT COALESCE(sum(p.importo), 0) FROM conti_pagamenti p JOIN conti c ON c.id = p.conto_id
                           WHERE c.modulo = 'palestra' AND c.riferimento_tipo IS DISTINCT FROM 'pal_rate'
                             AND (p.pagato_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
             'ricavo_medio_socio', CASE WHEN v_attivi > 0 THEN round(COALESCE(sum(r.importo) FILTER (WHERE r.stato = 'pagata'
                                        AND r.pagata_il BETWEEN p_dal AND p_al), 0) / v_attivi, 2) END)
      INTO v_economia FROM pal_rate r JOIN pal_soci s ON s.id = r.socio_id WHERE p_sede IS NULL OR s.sede_id = p_sede;
  END IF;

  -- Prospect (§2): trattative della pipeline aperte nel periodo e conversione.
  SELECT jsonb_build_object(
           'lead', count(*),
           'iscritti', count(*) FILTER (WHERE st.is_won),
           'persi', count(*) FILTER (WHERE st.is_lost),
           'aperti', count(*) FILTER (WHERE NOT st.is_won AND NOT st.is_lost),
           'conversione', CASE WHEN count(*) > 0 THEN round(100.0 * count(*) FILTER (WHERE st.is_won) / count(*), 1) END,
           'per_fase', COALESCE((SELECT jsonb_object_agg(nome, n) FROM (
                          SELECT s2.nome, count(*) AS n FROM deals d2 JOIN pipeline_stages s2 ON s2.id = d2.stage_id
                           WHERE d2.pipeline_id = pal_pipeline() AND d2.attivo AND (d2.created_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
                           GROUP BY s2.nome) f), '{}'),
           'motivi_persi', COALESCE((SELECT jsonb_object_agg(motivo, n) FROM (
                          SELECT COALESCE(d2.motivo_perdita, 'non indicato') AS motivo, count(*) AS n FROM deals d2
                            JOIN pipeline_stages s2 ON s2.id = d2.stage_id
                           WHERE d2.pipeline_id = pal_pipeline() AND s2.is_lost AND (d2.created_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al
                           GROUP BY 1) m), '{}'),
           'prove_svolte', (SELECT count(*) FROM pal_prove pv WHERE pv.stato = 'svolta' AND (p_sede IS NULL OR pv.sede_id = p_sede)
                              AND (pv.quando AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al),
           'prove_iscritti', (SELECT count(DISTINCT pv.contatto_id) FROM pal_prove pv JOIN pal_soci so ON so.contatto_id = pv.contatto_id
                              WHERE pv.stato = 'svolta' AND (p_sede IS NULL OR pv.sede_id = p_sede)
                                AND (pv.quando AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al))
    INTO v_prospect
    FROM deals d JOIN pipeline_stages st ON st.id = d.stage_id
   WHERE d.pipeline_id = pal_pipeline() AND d.attivo AND (d.created_at AT TIME ZONE 'Europe/Rome')::date BETWEEN p_dal AND p_al;

  RETURN jsonb_build_object('soci', v_soci, 'rinnovi', v_rinnovi, 'accessi', v_accessi, 'corsi', v_corsi,
                            'economia', v_economia, 'prospect', v_prospect);
END;
$$;

-- ═══ 2. CRUSCOTTO DEL GIORNO (reception e direzione) ════════════════
CREATE OR REPLACE FUNCTION pal_cruscotto(p_sede UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT modulo_attivo('palestra') THEN RAISE EXCEPTION 'Modulo Palestra non attivo' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'presenti', (SELECT count(*) FROM pal_presenti WHERE sede_id = p_sede),
    'ingressi_oggi', (SELECT count(*) FROM pal_accessi WHERE sede_id = p_sede AND consentito AND (ingresso_at AT TIME ZONE 'Europe/Rome')::date = pal_oggi()),
    'negati_oggi', (SELECT count(*) FROM pal_accessi WHERE sede_id = p_sede AND NOT consentito AND (ingresso_at AT TIME ZONE 'Europe/Rome')::date = pal_oggi()),
    'lezioni_oggi', COALESCE((SELECT jsonb_agg(jsonb_build_object('lezione_id', lezione_id, 'corso', corso, 'inizio', inizio,
                               'iscritti', iscritti, 'capienza', capienza, 'in_attesa', in_attesa, 'presenti', presenti, 'stato', stato) ORDER BY inizio)
                       FROM pal_lezioni_posti WHERE sede_id = p_sede AND stato <> 'annullata'
                        AND (inizio AT TIME ZONE 'Europe/Rome')::date = pal_oggi()), '[]'),
    'pt_oggi', (SELECT count(*) FROM pal_sessioni_pt WHERE sede_id = p_sede AND stato = 'prenotata' AND (inizio AT TIME ZONE 'Europe/Rome')::date = pal_oggi()),
    'wellness_oggi', (SELECT count(*) FROM pal_appuntamenti WHERE sede_id = p_sede AND stato = 'prenotato' AND (inizio AT TIME ZONE 'Europe/Rome')::date = pal_oggi()),
    'scadenze_7', (SELECT count(*) FROM pal_abbonamenti a JOIN pal_soci s ON s.id = a.socio_id
                    WHERE s.sede_id = p_sede AND a.stato IN ('attivo', 'sospeso') AND a.fine BETWEEN pal_oggi() AND pal_oggi() + 7
                      AND NOT EXISTS (SELECT 1 FROM pal_abbonamenti x WHERE x.rinnovo_di = a.id)),
    'certificati_30', (SELECT count(*) FROM pal_soci_stato WHERE sede_id = p_sede AND stato IN ('attivo', 'sospeso')
                        AND certificato_scadenza BETWEEN pal_oggi() AND pal_oggi() + 30),
    'morosi', (SELECT count(*) FROM pal_soci_stato WHERE sede_id = p_sede AND stato = 'moroso'),
    'rate_oggi', (SELECT count(*) FROM pal_rate r JOIN pal_soci s ON s.id = r.socio_id
                   WHERE s.sede_id = p_sede AND r.pagatore = 'socio' AND r.stato IN ('da_pagare', 'fallita') AND r.scadenza <= pal_oggi()),
    'sospensioni_da_autorizzare', (SELECT count(*) FROM pal_sospensioni z JOIN pal_abbonamenti a ON a.id = z.abbonamento_id
                                    JOIN pal_soci s ON s.id = a.socio_id WHERE s.sede_id = p_sede AND z.stato = 'richiesta'),
    'prove_oggi', (SELECT count(*) FROM pal_prove WHERE sede_id = p_sede AND stato = 'prenotata' AND (quando AT TIME ZONE 'Europe/Rome')::date = pal_oggi())
  );
END;
$$;

-- ═══ 3. CONVENZIONI AZIENDALI: UTILIZZO E FATTURA (§29) ═════════════
CREATE VIEW pal_convenzioni_utilizzo WITH (security_invoker = true) AS
SELECT c.id AS convenzione_id, c.codice, c.organizzazione_id, o.ragione_sociale AS azienda, c.sconto_pct, c.quota_azienda_pct,
       c.budget_annuo, c.attiva,
       (SELECT count(*) FROM pal_soci s WHERE s.convenzione_id = c.id AND s.ex_socio_at IS NULL)::int AS iscritti,
       (SELECT count(*) FROM pal_soci_stato s WHERE s.convenzione_id = c.id AND s.stato = 'attivo')::int AS attivi,
       (SELECT count(*) FROM pal_accessi a JOIN pal_soci s ON s.id = a.socio_id
         WHERE s.convenzione_id = c.id AND a.consentito
           AND date_trunc('month', a.ingresso_at AT TIME ZONE 'Europe/Rome') = date_trunc('month', NOW() AT TIME ZONE 'Europe/Rome'))::int AS accessi_mese,
       (SELECT COALESCE(sum(r.importo), 0) FROM pal_rate r WHERE r.pagatore = 'azienda' AND r.organizzazione_id = c.organizzazione_id
           AND r.stato IN ('da_pagare', 'fatturata') AND EXTRACT(YEAR FROM r.scadenza) = EXTRACT(YEAR FROM NOW()))
         AS quota_anno,
       (SELECT COALESCE(sum(r.importo), 0) FROM pal_rate r WHERE r.pagatore = 'azienda' AND r.organizzazione_id = c.organizzazione_id
           AND r.stato = 'da_pagare') AS da_fatturare
  FROM pal_convenzioni c JOIN organizzazioni o ON o.id = c.organizzazione_id;

CREATE OR REPLACE FUNCTION pal_fattura_convenzione(p_convenzione UUID, p_al DATE, p_numero TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c pal_convenzioni%ROWTYPE;
  v_ids UUID[];
  v_totale NUMERIC;
  v_dal DATE;
  v_fattura UUID;
BEGIN
  IF NOT modulo_attivo('palestra') OR NOT puo_amministrazione() THEN
    RAISE EXCEPTION 'La fattura la emette la direzione' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO c FROM pal_convenzioni WHERE id = p_convenzione FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Convenzione inesistente'; END IF;
  SELECT array_agg(r.id), sum(r.importo), min(r.scadenza) INTO v_ids, v_totale, v_dal
    FROM pal_rate r JOIN pal_soci s ON s.id = r.socio_id
   WHERE r.pagatore = 'azienda' AND r.organizzazione_id = c.organizzazione_id AND s.convenzione_id = c.id
     AND r.stato = 'da_pagare' AND r.scadenza <= p_al;
  IF v_ids IS NULL THEN
    RAISE EXCEPTION 'Nessuna quota da fatturare fino al %', to_char(p_al, 'DD/MM/YYYY') USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO fatture (direzione, numero, data, organizzazione_id, imponibile, aliquota_iva, totale, scadenza, note, created_by)
  VALUES ('attiva', p_numero, pal_oggi(), c.organizzazione_id, round(v_totale / 1.22, 2), 22, v_totale, pal_oggi() + 30,
          'Corporate wellness ' || COALESCE(c.codice, '') || ': quote dei dipendenti dal ' || to_char(v_dal, 'DD/MM/YYYY') || ' al '
            || to_char(p_al, 'DD/MM/YYYY') || ' (' || cardinality(v_ids) || ').', auth.uid())
  RETURNING id INTO v_fattura;
  UPDATE pal_rate SET stato = 'fatturata', fattura_id = v_fattura WHERE id = ANY (v_ids);
  RETURN v_fattura;
END;
$$;

CREATE OR REPLACE FUNCTION pal_convenzione_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.codice IS NULL THEN NEW.codice := genera_codice('CRP'); END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_convenzioni_prepara BEFORE INSERT ON pal_convenzioni FOR EACH ROW EXECUTE FUNCTION pal_convenzione_prepara();

-- ═══ 4. «PORTA UN AMICO» (§34) ══════════════════════════════════════
-- Al primo abbonamento del socio presentato, chi l'ha presentato riceve i
-- giorni in regalo sul suo abbonamento in corso (una proroga, nello storico).
CREATE OR REPLACE FUNCTION pal_referral_premio()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_presentatore UUID;
  v_giorni INT;
  v_abb UUID;
  v_nome TEXT;
BEGIN
  SELECT s.presentato_da, se.referral_giorni, trim(k.nome || ' ' || COALESCE(k.cognome, ''))
    INTO v_presentatore, v_giorni, v_nome
    FROM pal_soci s JOIN pal_sedi se ON se.id = s.sede_id JOIN contatti k ON k.id = s.contatto_id WHERE s.id = NEW.socio_id;
  IF v_presentatore IS NULL OR v_giorni = 0 OR NEW.rinnovo_di IS NOT NULL
     OR EXISTS (SELECT 1 FROM pal_abbonamenti WHERE socio_id = NEW.socio_id AND id <> NEW.id) THEN
    RETURN NEW;
  END IF;
  SELECT id INTO v_abb FROM pal_abbonamenti WHERE socio_id = v_presentatore AND stato IN ('attivo', 'sospeso') AND fine >= pal_oggi()
   ORDER BY fine DESC LIMIT 1;
  IF v_abb IS NULL THEN RETURN NEW; END IF;
  PERFORM set_config('pal.interno', '1', true);
  INSERT INTO pal_sospensioni (abbonamento_id, tipo, giorni, motivo, stato, created_by)
  VALUES (v_abb, 'proroga', v_giorni, 'Porta un amico: ' || v_nome, 'approvata', NEW.created_by);
  PERFORM set_config('pal.interno', '0', true);
  PERFORM pal_avvisa(v_presentatore, 'Grazie per averci presentato ' || v_nome,
    'il tuo abbonamento si allunga di ' || v_giorni || ' giorni in regalo.');
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_abbonamenti_referral AFTER INSERT ON pal_abbonamenti FOR EACH ROW EXECUTE FUNCTION pal_referral_premio();

-- ═══ 5. SEGMENTI DELLE CAMPAGNE (§33) ═══════════════════════════════
CREATE OR REPLACE FUNCTION seg_pal_nuovi(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT contatto_id FROM pal_soci WHERE ex_socio_at IS NULL
     AND data_iscrizione >= pal_oggi() - COALESCE((p_parametri->>'giorni')::int, 30)
$$;
CREATE OR REPLACE FUNCTION seg_pal_inattivi(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT contatto_id FROM pal_soci_stato WHERE stato = 'attivo'
     AND (ultimo_accesso IS NULL OR ultimo_accesso < NOW() - make_interval(days => COALESCE((p_parametri->>'giorni')::int, 30)))
$$;
CREATE OR REPLACE FUNCTION seg_pal_in_scadenza(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT s.contatto_id FROM pal_abbonamenti a JOIN pal_soci s ON s.id = a.socio_id
   WHERE a.stato IN ('attivo', 'sospeso') AND a.fine BETWEEN pal_oggi() AND pal_oggi() + COALESCE((p_parametri->>'giorni')::int, 15)
     AND NOT EXISTS (SELECT 1 FROM pal_abbonamenti x WHERE x.rinnovo_di = a.id)
$$;
CREATE OR REPLACE FUNCTION seg_pal_ex(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT contatto_id FROM pal_soci_stato WHERE stato IN ('ex', 'scaduto')
     AND COALESCE(scadenza, pal_oggi()) >= pal_oggi() - make_interval(months => COALESCE((p_parametri->>'mesi')::int, 12))::interval
$$;
CREATE OR REPLACE FUNCTION seg_pal_assidui(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT s.contatto_id FROM pal_accessi a JOIN pal_soci s ON s.id = a.socio_id
   WHERE a.consentito AND a.ingresso_at > NOW() - INTERVAL '30 days'
   GROUP BY s.contatto_id HAVING count(*) >= COALESCE((p_parametri->>'ingressi')::int, 12)
$$;
CREATE OR REPLACE FUNCTION seg_pal_corsi(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT s.contatto_id FROM pal_prenotazioni p JOIN pal_soci s ON s.id = p.socio_id
    JOIN pal_lezioni l ON l.id = p.lezione_id JOIN pal_corsi c ON c.id = l.corso_id
   WHERE p.stato IN ('prenotata', 'presente') AND l.inizio > NOW() - INTERVAL '90 days'
     AND (p_parametri->>'disciplina' IS NULL OR p_parametri->>'disciplina' = '' OR c.disciplina = p_parametri->>'disciplina')
$$;
CREATE OR REPLACE FUNCTION seg_pal_pt(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT s.contatto_id FROM pal_sessioni_pt x JOIN pal_soci s ON s.id = x.socio_id
   WHERE x.stato IN ('prenotata', 'svolta') AND x.inizio > NOW() - INTERVAL '180 days'
$$;
INSERT INTO campagne_segmenti (slug, modulo, etichetta, descrizione, funzione, parametri) VALUES
  ('palestra_nuovi', 'palestra', 'Nuovi iscritti', 'Iscritti negli ultimi giorni: il benvenuto.',
     'seg_pal_nuovi', '{"giorni": {"etichetta": "Iscritti da (giorni)", "default": 30}}'),
  ('palestra_inattivi', 'palestra', 'Soci che non vengono', '«Non ti vediamo da 30 giorni.»',
     'seg_pal_inattivi', '{"giorni": {"etichetta": "Senza ingressi da (giorni)", "default": 30}}'),
  ('palestra_in_scadenza', 'palestra', 'Abbonamenti in scadenza', '«Il tuo abbonamento scade tra 15 giorni.»',
     'seg_pal_in_scadenza', '{"giorni": {"etichetta": "Scadono entro (giorni)", "default": 15}}'),
  ('palestra_ex', 'palestra', 'Ex soci', 'Abbonamento scaduto o usciti negli ultimi mesi: un''offerta per tornare.',
     'seg_pal_ex', '{"mesi": {"etichetta": "Negli ultimi (mesi)", "default": 12}}'),
  ('palestra_assidui', 'palestra', 'Frequentatori assidui', 'Almeno N ingressi negli ultimi 30 giorni.',
     'seg_pal_assidui', '{"ingressi": {"etichetta": "Ingressi almeno", "default": 12}}'),
  ('palestra_corsi', 'palestra', 'Utenti dei corsi', '«Nuovo corso Pilates disponibile»: chi frequenta i corsi (anche di una disciplina).',
     'seg_pal_corsi', '{"disciplina": {"etichetta": "Disciplina (vuoto = tutte)", "default": ""}}'),
  ('palestra_pt', 'palestra', 'Clienti del personal training', 'Chi ha fatto personal training negli ultimi sei mesi.',
     'seg_pal_pt', '{}')
ON CONFLICT (slug) DO NOTHING;

-- ═══ 6. DATI PER L'APP DEL SOCIO (§35, predisposto) ═════════════════
-- Tutto ciò che l'app mostra al socio, in una chiamata: abbonamento, QR,
-- carnet, prossime prenotazioni, scheda, rate da pagare. L'app vera e la
-- sua autenticazione del socio sono predisposte; oggi la usa la reception.
CREATE OR REPLACE FUNCTION pal_socio_riepilogo(p_socio UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  s pal_soci_stato%ROWTYPE;
BEGIN
  IF NOT modulo_attivo('palestra') THEN RAISE EXCEPTION 'Modulo Palestra non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO s FROM pal_soci_stato WHERE socio_id = p_socio;
  IF s.socio_id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'socio', to_jsonb(s),
    'qr', (SELECT qr_token FROM pal_soci WHERE id = p_socio),
    'accesso', pal_verifica_accesso(p_socio),
    'abbonamenti', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'codice', a.codice, 'formula', f.nome, 'inizio', a.inizio,
                       'fine', a.fine, 'stato', a.stato, 'accessi_totali', a.accessi_totali, 'accessi_usati', a.accessi_usati,
                       'rinnovo_automatico', a.rinnovo_automatico) ORDER BY a.fine DESC)
                     FROM pal_abbonamenti a JOIN pal_formule f ON f.id = a.formula_id WHERE a.socio_id = p_socio), '[]'),
    'carnet', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.scadenza) FROM pal_carnet_stato c WHERE c.socio_id = p_socio AND c.stato = 'attivo'), '[]'),
    'prenotazioni', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'corso', l.corso, 'inizio', l.inizio, 'stato', p.stato,
                       'posizione', p.posizione) ORDER BY l.inizio)
                     FROM pal_prenotazioni p JOIN pal_lezioni_posti l ON l.lezione_id = p.lezione_id
                    WHERE p.socio_id = p_socio AND p.stato IN ('prenotata', 'attesa') AND l.inizio > NOW()), '[]'),
    'sessioni_pt', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', x.id, 'trainer', t.nome, 'inizio', x.inizio, 'stato', x.stato) ORDER BY x.inizio)
                     FROM pal_sessioni_pt x JOIN pal_trainer t ON t.id = x.trainer_id
                    WHERE x.socio_id = p_socio AND x.stato = 'prenotata' AND x.inizio > NOW()), '[]'),
    'scheda', (SELECT jsonb_build_object('id', sc.id, 'titolo', sc.titolo, 'obiettivi', sc.obiettivi, 'versione', sc.versione,
                 'esercizi', COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.giorno, e.ordine) FROM pal_schede_esercizi e WHERE e.scheda_id = sc.id), '[]'))
                 FROM pal_schede sc WHERE sc.socio_id = p_socio AND sc.attiva),
    'rate_aperte', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'descrizione', r.descrizione, 'scadenza', r.scadenza,
                       'importo', r.importo, 'stato', r.stato) ORDER BY r.scadenza)
                     FROM pal_rate r WHERE r.socio_id = p_socio AND r.pagatore = 'socio' AND r.stato IN ('da_pagare', 'fallita', 'insoluta')), '[]'),
    'armadietto', (SELECT jsonb_build_object('numero', numero, 'zona', zona, 'fino', assegnato_fino) FROM pal_armadietti WHERE socio_id = p_socio LIMIT 1)
  );
END;
$$;

-- ═══ 7. RICERCA ═════════════════════════════════════════════════════
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
  ) t
  LIMIT 20
$$;

-- ═══ 8. PERMESSI ════════════════════════════════════════════════════
GRANT SELECT ON pal_convenzioni_utilizzo TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['pal_convenzione_prepara()', 'pal_referral_premio()',
    'seg_pal_nuovi(text,jsonb)', 'seg_pal_inattivi(text,jsonb)', 'seg_pal_in_scadenza(text,jsonb)', 'seg_pal_ex(text,jsonb)',
    'seg_pal_assidui(text,jsonb)', 'seg_pal_corsi(text,jsonb)', 'seg_pal_pt(text,jsonb)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY['pal_kpi(uuid,date,date)', 'pal_cruscotto(uuid)', 'pal_fattura_convenzione(uuid,date,text)',
    'pal_socio_riepilogo(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

-- Tabelle in tempo reale per la reception (ingressi, prenotazioni, lezioni).
ALTER PUBLICATION supabase_realtime ADD TABLE pal_accessi, pal_prenotazioni, pal_lezioni;

SELECT applica_protezioni_tabelle();
