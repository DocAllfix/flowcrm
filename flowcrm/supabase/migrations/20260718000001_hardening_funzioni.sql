-- ═══════════════════════════════════════════════════════════════════
-- HARDENING — Blindatura funzioni: search_path fisso + revoca esecuzione
-- da anon/public. Chiude le vulnerabilità trovate dal Security Advisor:
--   • search_path mutabile (injection su SECURITY DEFINER)
--   • funzioni eseguibili da anon/authenticated non autorizzati
-- Solo le funzioni DELL'APP (non pgvector). I trigger restano funzionanti:
-- l'EXECUTE privilege governa solo le chiamate dirette, non i trigger.
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'attivita_completata_at','check_referente_coerenza','crea_notifica',
        'deal_before_write','fattura_crea_scadenza','fattura_default_totale',
        'genera_codice_commessa','get_user_role','handle_new_user','log_audit',
        'log_deal_stage_change','match_kb_guida','notifica_deal_a_rischio',
        'notifica_menzioni','processa_scadenze','protect_fattura_delete',
        'protect_notifica_update','protect_ruolo_attivo','protect_stage_delete',
        'puo_amministrazione','ricerca_globale','update_updated_at'
      )
  LOOP
    -- search_path deterministico (niente pg_temp → no hijack su SECURITY DEFINER)
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public', r.sig);
    -- toglie l'esecuzione a tutti; poi si concede solo a chi serve
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

-- ── GRANT mirati ─────────────────────────────────────────────────
-- Helper usati dalle policy RLS (valutate come ruolo authenticated):
GRANT EXECUTE ON FUNCTION public.get_user_role()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.puo_amministrazione()  TO authenticated;
-- Chiamate dal frontend / copilot (via JWT utente = authenticated):
GRANT EXECUTE ON FUNCTION public.ricerca_globale(text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_kb_guida(vector, integer, double precision) TO authenticated;
-- Solo cron/backend (service_role); pg_cron gira come superuser e non ne ha bisogno:
GRANT EXECUTE ON FUNCTION public.processa_scadenze()          TO service_role;
GRANT EXECUTE ON FUNCTION public.notifica_deal_a_rischio(integer) TO service_role;

-- NB: crea_notifica NON viene concessa a nessun ruolo esterno: è chiamata
-- solo dai trigger SECURITY DEFINER (notifica_menzioni) e dalle funzioni
-- cron, che girano come owner e hanno comunque i privilegi.
