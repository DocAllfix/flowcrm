-- ═══════════════════════════════════════════════════════════════════
-- F1.1 — Enums e funzioni fondamenta
-- Convenzioni (da REPORT_ANALISI_CRM.md §3 + docs/ROADMAP.md):
--   UUID PK · created_at/updated_at · soft delete `attivo` · RLS ovunque
--   Naming italiano · validazioni di business nei trigger
-- ═══════════════════════════════════════════════════════════════════

-- ── Enums trasversali ────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'operatore');

CREATE TYPE notifica_tipo AS ENUM (
  'info', 'warning', 'critical', 'success', 'sistema'
);

-- ── updated_at automatico (pattern CertDesk) ─────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
