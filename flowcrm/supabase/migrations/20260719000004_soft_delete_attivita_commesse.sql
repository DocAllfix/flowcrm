-- ═══════════════════════════════════════════════════════════════════
-- FASE 4 — Soft-delete: colonna `attivo` su attivita e commesse
-- (le altre entità CRM ce l'hanno già). "Archivia" = attivo=false.
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE attivita ADD COLUMN IF NOT EXISTS attivo boolean NOT NULL DEFAULT true;
ALTER TABLE commesse ADD COLUMN IF NOT EXISTS attivo boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_attivita_attivo ON attivita(attivo);
CREATE INDEX IF NOT EXISTS idx_commesse_attivo ON commesse(attivo);
