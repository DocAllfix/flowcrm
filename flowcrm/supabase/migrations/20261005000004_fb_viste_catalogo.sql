-- ═══════════════════════════════════════════════════════════════════
-- RISTORANTE E BAR — viste del catalogo
--
-- Costo, prezzo netto, margine, food cost e allergeni di ogni prodotto, e
-- costo e allergeni di ogni ricetta, in una sola lettura per l'elenco.
-- Sono viste con i permessi di chi legge: la RLS delle tabelle vale.
-- ═══════════════════════════════════════════════════════════════════

CREATE VIEW fb_prodotti_economia WITH (security_invoker = true) AS
SELECT p.id AS prodotto_id, p.modulo, c.costo,
       ROUND(p.prezzo / (1 + p.aliquota_iva / 100), 2) AS prezzo_netto,
       ROUND(p.prezzo / (1 + p.aliquota_iva / 100) - c.costo, 2) AS margine,
       ROUND(100 * c.costo / NULLIF(p.prezzo / (1 + p.aliquota_iva / 100), 0), 1) AS food_cost_pct,
       fb_allergeni_prodotto(p.id) AS allergeni
  FROM fb_prodotti p
  CROSS JOIN LATERAL (SELECT fb_costo_prodotto(p.id) AS costo) c;

CREATE VIEW distinte_base_riepilogo WITH (security_invoker = true) AS
SELECT d.id AS distinta_id, d.modulo, d.codice, d.nome, d.tipo, d.resa, d.unita_resa,
       costo_distinta(d.id) AS costo_unitario,
       ROUND(costo_distinta(d.id) * d.resa, 2) AS costo_totale,
       allergeni_distinta(d.id) AS allergeni,
       (SELECT count(*)::int FROM distinte_base_righe r WHERE r.distinta_id = d.id) AS componenti,
       (SELECT count(DISTINCT r.distinta_id)::int FROM distinte_base_righe r WHERE r.sotto_distinta_id = d.id) AS usata_in
  FROM distinte_base d;

GRANT SELECT ON fb_prodotti_economia, distinte_base_riepilogo TO authenticated;
