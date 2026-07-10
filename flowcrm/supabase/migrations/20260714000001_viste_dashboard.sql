-- ═══════════════════════════════════════════════════════════════════
-- F9.1 — Viste derivate per le dashboard.
-- ⚠️ TUTTE con security_invoker=true: la RLS delle tabelle sottostanti
-- si applica al chiamante → l'operatore NON vede i dati economici nemmeno
-- attraverso le viste (altrimenti le viste li scavalcherebbero).
-- ═══════════════════════════════════════════════════════════════════

-- Fatturato mensile (da fatture attive) — economico, operatore vede vuoto
CREATE VIEW vw_fatturato_mensile WITH (security_invoker = true) AS
SELECT date_trunc('month', data)::date AS mese,
       SUM(totale)::numeric(14,2) AS totale
FROM fatture
WHERE direzione = 'attiva'
GROUP BY 1
ORDER BY 1;

-- Ordinato mensile (deal vinti per mese di chiusura) — operativo
CREATE VIEW vw_ordinato_mensile WITH (security_invoker = true) AS
SELECT date_trunc('month', d.chiuso_at)::date AS mese,
       SUM(d.importo)::numeric(14,2) AS totale
FROM deals d
JOIN pipeline_stages s ON s.id = d.stage_id
WHERE s.is_won AND d.chiuso_at IS NOT NULL AND d.attivo
GROUP BY 1
ORDER BY 1;

-- Valore pipeline pesato per stage (Σ importo × probabilità) — operativo
CREATE VIEW vw_pipeline_valore_pesato WITH (security_invoker = true) AS
SELECT s.id AS stage_id, s.nome, s.ordine, s.colore,
       COUNT(d.id)::int AS n_deal,
       COALESCE(SUM(d.importo), 0)::numeric(14,2) AS valore,
       COALESCE(SUM(d.importo * s.probabilita / 100.0), 0)::numeric(14,2) AS valore_pesato
FROM pipeline_stages s
JOIN pipelines p ON p.id = s.pipeline_id AND p.is_default
LEFT JOIN deals d ON d.stage_id = s.id AND d.attivo
WHERE s.attivo AND NOT s.is_lost
GROUP BY s.id, s.nome, s.ordine, s.colore
ORDER BY s.ordine;

-- Cash flow previsto (incassi attesi − uscite fiscali) per mese — economico
CREATE VIEW vw_cash_flow_previsto WITH (security_invoker = true) AS
SELECT mese,
       SUM(entrate)::numeric(14,2) AS entrate,
       SUM(uscite)::numeric(14,2) AS uscite,
       SUM(entrate - uscite)::numeric(14,2) AS netto
FROM (
  SELECT date_trunc('month', data_prevista)::date AS mese, importo AS entrate, 0 AS uscite
  FROM scadenze_pagamento WHERE stato <> 'incassato'
  UNION ALL
  SELECT date_trunc('month', scadenza)::date, 0, importo
  FROM scadenze_tasse WHERE stato <> 'pagata'
) t
GROUP BY mese
ORDER BY mese;

-- Le viste ereditano l'accesso via GRANT esplicito (authenticated).
GRANT SELECT ON vw_fatturato_mensile, vw_ordinato_mensile,
               vw_pipeline_valore_pesato, vw_cash_flow_previsto
  TO authenticated;
