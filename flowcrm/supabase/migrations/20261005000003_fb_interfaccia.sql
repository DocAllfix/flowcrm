-- ═══════════════════════════════════════════════════════════════════
-- RISTORANTE E BAR — supporto all'interfaccia
--
-- 1. Aggiornamenti in tempo reale: mappa della sala, schermo di cucina e
--    banco, prenotazioni e lista d'attesa si aggiornano da soli quando un
--    collega cambia qualcosa. Il canale rispetta la RLS.
-- 2. Listino del momento in una sola chiamata (presa della comanda).
-- ═══════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE fb_comande, fb_comande_righe, fb_prenotazioni, fb_attesa, fb_tavoli;

CREATE OR REPLACE FUNCTION fb_listino_attuale(p_locale UUID, p_canale TEXT DEFAULT 'sala', p_tipologia TEXT DEFAULT NULL)
RETURNS TABLE (prodotto_id UUID, prezzo NUMERIC, origine TEXT, promozione_id UUID)
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT p.id, x.prezzo, x.origine, x.promozione_id
    FROM fb_prodotti p
    CROSS JOIN LATERAL fb_prezzo(p.id, p_locale, p_canale, NOW(), p_tipologia) x
   WHERE p.stato <> 'sospeso'
$$;
REVOKE ALL ON FUNCTION fb_listino_attuale(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fb_listino_attuale(uuid, text, text) TO authenticated;
