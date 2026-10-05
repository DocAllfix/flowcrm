-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Palestra (Sprint 4) · interfaccia: vendita dei prodotti al banco
-- (documento Palestra §21): abbigliamento, integratori, accessori. Il conto
-- nasce dagli articoli vendibili del magazzino al loro prezzo e con la loro
-- IVA, la merce esce dal magazzino, e si incassa dalla cassa delle fondamenta.
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION pal_vendi_prodotti(p_righe JSONB, p_socio UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_conto UUID;
  v_contatto UUID;
  v_nome TEXT;
  v_sessione UUID;
  r JSONB;
  a mag_articoli%ROWTYPE;
  v_q NUMERIC;
  v_riga UUID;
BEGIN
  IF NOT modulo_attivo('palestra') THEN RAISE EXCEPTION 'Modulo Palestra non attivo' USING ERRCODE = '42501'; END IF;
  IF p_righe IS NULL OR jsonb_typeof(p_righe) <> 'array' OR jsonb_array_length(p_righe) = 0 THEN
    RAISE EXCEPTION 'Aggiungi almeno un prodotto' USING ERRCODE = 'check_violation';
  END IF;
  IF p_socio IS NOT NULL THEN
    SELECT s.contatto_id, trim(k.nome || ' ' || COALESCE(k.cognome, '')) INTO v_contatto, v_nome
      FROM pal_soci s JOIN contatti k ON k.id = s.contatto_id WHERE s.id = p_socio;
  END IF;
  SELECT id INTO v_sessione FROM cassa_sessioni WHERE modulo = 'palestra' AND stato = 'aperta' ORDER BY aperta_at DESC LIMIT 1;
  INSERT INTO conti (modulo, descrizione, riferimento_tipo, riferimento_id, contatto_id, sessione_id, created_by)
  VALUES ('palestra', 'Prodotti' || COALESCE(' · ' || v_nome, ' · banco'), 'pal_vendita', p_socio, v_contatto, v_sessione, auth.uid())
  RETURNING id INTO v_conto;
  FOR r IN SELECT * FROM jsonb_array_elements(p_righe) LOOP
    v_q := (r->>'quantita')::numeric;
    SELECT * INTO a FROM mag_articoli WHERE id = (r->>'articolo_id')::uuid AND modulo = 'palestra' AND attivo AND vendibile;
    IF a.id IS NULL THEN RAISE EXCEPTION 'Prodotto non in vendita' USING ERRCODE = 'check_violation'; END IF;
    IF v_q IS NULL OR v_q <= 0 THEN RAISE EXCEPTION 'Quantità non valida per %', a.descrizione USING ERRCODE = 'check_violation'; END IF;
    IF a.prezzo_vendita IS NULL THEN RAISE EXCEPTION '% non ha un prezzo di vendita', a.descrizione USING ERRCODE = 'check_violation'; END IF;
    INSERT INTO conti_righe (conto_id, descrizione, articolo_id, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo, created_by)
    VALUES (v_conto, a.descrizione, a.id, v_q, a.prezzo_vendita, COALESCE(a.aliquota_iva, 22), 'pal_vendita', auth.uid())
    RETURNING id INTO v_riga;
    PERFORM mag_scarica(a.id, v_q, 'vendita', 'conti_righe', v_riga, 'Vendita al banco');
  END LOOP;
  RETURN v_conto;
END;
$$;
REVOKE ALL ON FUNCTION pal_vendi_prodotti(jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION pal_vendi_prodotti(jsonb, uuid) TO authenticated;
