-- Modulo Hotel · interfaccia: planning, camere e pulizie si aggiornano dal
-- vivo su tutti i dispositivi (reception, governante, cameriere ai piani).
ALTER PUBLICATION supabase_realtime ADD TABLE hotel_prenotazioni, hotel_camere, hotel_pulizie, hotel_manutenzioni;

-- Rendiconto della tassa di soggiorno per il Comune: per soggiorno partito
-- nel periodo, presenze, notti tassabili, dovuto, riscosso ed esenzioni.
CREATE OR REPLACE FUNCTION hotel_tassa_rendiconto(p_struttura UUID, p_dal DATE, p_al DATE)
RETURNS TABLE (prenotazione_id UUID, codice TEXT, ospite TEXT, arrivo DATE, partenza DATE, ospiti INT, notti INT,
               notti_tassabili INT, dovuto NUMERIC, riscosso NUMERIC, esenzioni TEXT)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT p.id, p.codice, p.ospite_nome, p.arrivo, p.partenza,
         GREATEST((SELECT count(*) FROM hotel_soggiorno_ospiti so WHERE so.prenotazione_id = p.id), p.adulti + p.bambini)::int,
         p.notti,
         (SELECT COALESCE(SUM(t.notti_tassabili), 0) FROM hotel_tassa_calcola(p.id) t)::int,
         (SELECT COALESCE(SUM(t.importo), 0) FROM hotel_tassa_calcola(p.id) t),
         (SELECT COALESCE(SUM(r.importo), 0) FROM conti_righe r
           WHERE r.conto_id = p.conto_id AND r.riferimento_tipo = 'hotel_tassa' AND NOT r.stornata),
         (SELECT string_agg(t.nome || ': ' || t.esenzione, '; ') FROM hotel_tassa_calcola(p.id) t WHERE t.esenzione IS NOT NULL)
    FROM hotel_prenotazioni p
   WHERE p.struttura_id = p_struttura AND p.stato = 'partita' AND p.partenza BETWEEN p_dal AND p_al
   ORDER BY p.partenza, p.codice
$$;
REVOKE ALL ON FUNCTION hotel_tassa_rendiconto(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION hotel_tassa_rendiconto(uuid, date, date) TO authenticated;

-- Le tariffe le cambia la direzione: anche toglierle (il prezzo applicato da
-- un suggerimento sostituisce quello precedente dello stesso giorno).
CREATE POLICY "hotel_tariffe_delete_direzione" ON hotel_tariffe FOR DELETE TO authenticated
  USING (modulo_attivo(modulo) AND puo_amministrazione());

-- Addebito da un altro conto (ristorante o bar in camera): la riga dice da
-- dove arriva, «Ristorante · Tavolo 4 (CNT-…)», non solo il codice.
CREATE OR REPLACE FUNCTION conto_pagamento_controlla()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_residuo NUMERIC;
  v_acconti BOOLEAN;
  v_totale NUMERIC;
  v_codice TEXT;
  v_origine TEXT;
  v_dest conti%ROWTYPE;
  v_resto NUMERIC;
  v_quota NUMERIC;
  a RECORD;
  n INT;
  i INT := 0;
BEGIN
  SELECT accetta_acconti, initcap(modulo) || COALESCE(' · ' || descrizione, '') INTO v_acconti, v_origine
    FROM conti WHERE id = NEW.conto_id FOR UPDATE;
  SELECT residuo, totale, codice INTO v_residuo, v_totale, v_codice FROM conti_saldi WHERE conto_id = NEW.conto_id;
  IF NOT COALESCE(v_acconti, false) AND NEW.importo > v_residuo + 0.005 THEN
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
        VALUES (v_dest.id, v_origine || COALESCE(' (' || v_codice || ')', ''), 1, v_quota, a.aliquota_iva,
                'addebito', NEW.id, NEW.created_by);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Invio del questionario dopo la partenza (§15, §39): chi è partito negli
-- ultimi giorni, per la campagna email con il link al questionario.
CREATE OR REPLACE FUNCTION seg_hotel_partiti(p_modulo TEXT, p_parametri JSONB)
RETURNS SETOF UUID LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT DISTINCT contatto_id FROM hotel_prenotazioni
   WHERE contatto_id IS NOT NULL AND stato = 'partita'
     AND partenza >= (NOW() AT TIME ZONE 'Europe/Rome')::date - COALESCE((p_parametri->>'giorni')::int, 3)
$$;
REVOKE ALL ON FUNCTION seg_hotel_partiti(text, jsonb) FROM PUBLIC, anon, authenticated;
INSERT INTO campagne_segmenti (slug, modulo, etichetta, descrizione, funzione, parametri) VALUES
  ('hotel_partiti', 'hotel', 'Appena partiti', 'Partiti negli ultimi giorni: il questionario sul soggiorno.',
     'seg_hotel_partiti', '{"giorni": {"etichetta": "Partiti negli ultimi (giorni)", "default": 3}}')
ON CONFLICT (slug) DO NOTHING;

-- Oggetti smarriti (§41): chi lo reclama e come rintracciarlo, anche se non
-- è in anagrafica (l'ospite del soggiorno resta in contatto_id).
ALTER TABLE hotel_oggetti_smarriti ADD COLUMN IF NOT EXISTS proprietario TEXT;

-- Disponibilità, prezzi e restrizioni per i canali (§9, §12, §13): la
-- tabella che un channel manager o il booking engine leggono, giorno per
-- giorno, per tipologia e piano attivo vendibile su quel canale. Il
-- collegamento al fornitore è predisposto; oggi si esporta in CSV.
CREATE OR REPLACE FUNCTION hotel_ari(p_struttura UUID, p_dal DATE, p_al DATE, p_canale TEXT DEFAULT NULL)
RETURNS TABLE (data DATE, tipologia_codice TEXT, tipologia TEXT, piano_codice TEXT, piano TEXT, disponibili INT,
               prezzo NUMERIC, soggiorno_min INT, chiuso_arrivo BOOLEAN, chiuso_partenza BOOLEAN, stop_vendita BOOLEAN)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT d.data, t.codice, t.nome, pt.codice, pt.nome, GREATEST(d.disponibili, 0),
         n.prezzo, COALESCE(n.soggiorno_min, pt.soggiorno_min), COALESCE(n.chiuso_arrivo, false), COALESCE(n.chiuso_partenza, false),
         COALESCE(n.stop_vendita, false) OR d.disponibili <= 0
    FROM hotel_disponibilita(p_struttura, p_dal, p_al) d
    JOIN hotel_tipologie t ON t.id = d.tipologia_id
    JOIN hotel_piani_tariffari pt ON pt.struttura_id = p_struttura AND pt.attivo
         AND (pt.valido_dal IS NULL OR d.data >= pt.valido_dal) AND (pt.valido_al IS NULL OR d.data <= pt.valido_al)
         AND (p_canale IS NULL OR pt.canali IS NULL OR cardinality(pt.canali) = 0 OR p_canale = ANY (pt.canali))
    CROSS JOIN LATERAL hotel_prezzo_notte(pt.id, t.id, d.data, t.occupazione_base) n
   ORDER BY d.data, t.ordine, t.nome, pt.ordine, pt.codice
$$;
REVOKE ALL ON FUNCTION hotel_ari(uuid, date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION hotel_ari(uuid, date, date, text) TO authenticated;
