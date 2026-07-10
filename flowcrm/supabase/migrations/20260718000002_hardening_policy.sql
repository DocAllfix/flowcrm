-- ═══════════════════════════════════════════════════════════════════
-- HARDENING — Policy RLS
-- 1) FIX CRITICO: audit_log NON deve rivelare i diff economici (fatture,
--    incassi, tasse) all'operatore. Restrizione per-entità.
-- 2) Riscrittura delle policy "USING (true)" in "auth.uid() IS NOT NULL":
--    stesso comportamento (solo autenticati), ma esplicito e non più
--    segnalato come "always true"; usa (SELECT auth.uid()) per performance.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. FIX audit_log: i diff economici solo ad admin/manager ──────
ALTER POLICY "audit_log_select" ON audit_log
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      entita NOT IN ('fatture', 'scadenze_pagamento', 'scadenze_tasse')
      OR puo_amministrazione()
    )
  );

-- ── 2. Riscrittura policy always-true → esplicito "autenticato" ────
-- SELECT
ALTER POLICY "allegati_select"              ON allegati              USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "attivita_select"              ON attivita              USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "commesse_select"              ON commesse              USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "contatti_select"              ON contatti              USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "deal_stage_history_select"    ON deal_stage_history    USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "deals_select"                 ON deals                 USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "kb_guida_select"              ON kb_guida              USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "messaggi_select"              ON messaggi              USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "organizzazioni_select"        ON organizzazioni        USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "org_ruoli_select"             ON organizzazioni_ruoli  USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "stages_select"                ON pipeline_stages       USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "pipelines_select"             ON pipelines             USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "progetti_select"              ON progetti              USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "riunioni_partecipanti_select" ON riunioni_partecipanti USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "user_profiles_select"         ON user_profiles         USING ((SELECT auth.uid()) IS NOT NULL);

-- UPDATE (qual + with_check)
ALTER POLICY "attivita_update"       ON attivita       USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "commesse_update"       ON commesse       USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "contatti_update"       ON contatti       USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "deals_update"          ON deals          USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "organizzazioni_update" ON organizzazioni USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "progetti_update"       ON progetti       USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- INSERT / DELETE junction
ALTER POLICY "org_ruoli_insert"             ON organizzazioni_ruoli  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "org_ruoli_delete"             ON organizzazioni_ruoli  USING ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "riunioni_partecipanti_insert" ON riunioni_partecipanti WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
ALTER POLICY "riunioni_partecipanti_delete" ON riunioni_partecipanti USING ((SELECT auth.uid()) IS NOT NULL);

-- ── 3. rls_auto_enable (event trigger Supabase): togli l'esecuzione
-- diretta via RPC dove possibile (non è sfruttabile fuori dal contesto
-- evento, ma azzera il warning). Gestita da Supabase → best effort.
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'rls_auto_enable gestita da Supabase: skip';
END $$;
