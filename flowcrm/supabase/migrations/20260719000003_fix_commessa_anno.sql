-- ═══════════════════════════════════════════════════════════════════
-- FASE 3 — Il codice commessa deve usare l'anno in fuso Europe/Rome.
-- Con EXTRACT(YEAR FROM NOW()) (UTC) una commessa creata l'1 gennaio a
-- mezzanotte-01:00 ora italiana riceverebbe l'anno precedente.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION genera_codice_commessa()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  anno INT := EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Europe/Rome'));
  progressivo INT;
BEGIN
  PERFORM pg_advisory_xact_lock(3000 + anno);
  SELECT COALESCE(MAX(CAST(SPLIT_PART(codice, '-', 3) AS INT)), 0) + 1
  INTO progressivo
  FROM commesse
  WHERE codice LIKE 'COMM-' || anno || '-%';
  NEW.codice := 'COMM-' || anno || '-' || LPAD(progressivo::TEXT, 4, '0');
  RETURN NEW;
END;
$$;
