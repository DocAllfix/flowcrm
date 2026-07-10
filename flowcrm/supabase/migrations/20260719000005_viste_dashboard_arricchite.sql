-- ═══════════════════════════════════════════════════════════════════
-- FASE 9 — Viste per fatturato-per-cliente e dashboard economica arricchita.
-- Tutte security_invoker=true: la RLS del chiamante si applica → l'operatore
-- (che non vede fatture/scadenze) ottiene risultati vuoti.
-- ═══════════════════════════════════════════════════════════════════

-- Fatturato annuale per organizzazione (grafico nel 360° cliente)
CREATE OR REPLACE VIEW vw_fatturato_organizzazione
WITH (security_invoker = true) AS
SELECT
  organizzazione_id,
  EXTRACT(YEAR FROM data)::int AS anno,
  SUM(totale)::numeric(14,2) AS totale
FROM fatture
WHERE direzione = 'attiva'
GROUP BY organizzazione_id, EXTRACT(YEAR FROM data);

-- KPI economici (una riga) per la dashboard economica
CREATE OR REPLACE VIEW vw_kpi_economici
WITH (security_invoker = true) AS
SELECT
  COALESCE((SELECT SUM(totale) FROM fatture
    WHERE direzione='attiva' AND EXTRACT(YEAR FROM data)=EXTRACT(YEAR FROM CURRENT_DATE)), 0)::numeric(14,2) AS fatturato_ytd,
  COALESCE((SELECT SUM(importo) FROM scadenze_pagamento WHERE stato <> 'incassato'), 0)::numeric(14,2) AS da_incassare,
  COALESCE((SELECT SUM(importo) FROM scadenze_pagamento WHERE stato = 'in_ritardo'), 0)::numeric(14,2) AS scaduto,
  COALESCE((SELECT SUM(importo) FROM scadenze_pagamento
    WHERE stato = 'incassato' AND date_trunc('month', incassato_at) = date_trunc('month', CURRENT_DATE)), 0)::numeric(14,2) AS incassato_mese,
  COALESCE((SELECT SUM(importo) FROM scadenze_tasse
    WHERE stato <> 'pagata' AND scadenza <= CURRENT_DATE + 30), 0)::numeric(14,2) AS tasse_30gg;

-- Top clienti per fatturato (attivo)
CREATE OR REPLACE VIEW vw_top_clienti
WITH (security_invoker = true) AS
SELECT
  f.organizzazione_id,
  o.ragione_sociale,
  SUM(f.totale)::numeric(14,2) AS totale
FROM fatture f
JOIN organizzazioni o ON o.id = f.organizzazione_id
WHERE f.direzione = 'attiva'
GROUP BY f.organizzazione_id, o.ragione_sociale
ORDER BY SUM(f.totale) DESC;

-- Fatture per stato (attivo) — per il grafico a torta
CREATE OR REPLACE VIEW vw_fatture_per_stato
WITH (security_invoker = true) AS
SELECT stato::text AS stato, COUNT(*)::int AS numero, SUM(totale)::numeric(14,2) AS totale
FROM fatture
WHERE direzione = 'attiva'
GROUP BY stato;
