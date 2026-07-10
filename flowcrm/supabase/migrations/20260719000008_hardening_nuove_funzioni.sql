-- ═══════════════════════════════════════════════════════════════════
-- HARDENING — blinda le funzioni introdotte nelle fasi bug-fix, come da
-- pattern già applicato: search_path fisso + revoca esecuzione diretta
-- delle funzioni-trigger (girano solo dentro i trigger, come owner).
-- ═══════════════════════════════════════════════════════════════════

-- processa_scadenze: ripristina il search_path fisso (perso nel CREATE OR
-- REPLACE della fase coerenza). Resta eseguibile solo da service_role/cron.
ALTER FUNCTION public.processa_scadenze() SET search_path = pg_catalog, public;

-- I due trigger di sincronizzazione fatture ↔ scadenze sono SECURITY DEFINER
-- ma vanno chiamati SOLO dai trigger: niente esecuzione diretta da nessuno.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('fattura_risincronizza_scadenza', 'sync_fattura_da_scadenza',
                        'freeze_created_by', 'genera_codice_commessa')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;
