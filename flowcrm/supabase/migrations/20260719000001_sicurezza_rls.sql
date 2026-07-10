-- ═══════════════════════════════════════════════════════════════════
-- FASE 1 — Sicurezza & RLS
-- 1) Gli allegati economici (fatture/scadenze) NON sono leggibili/scaricabili
--    dall'operatore: né i metadati (tabella allegati) né i file (storage).
-- 2) created_by IMMUTABILE in UPDATE (blocca lo spoofing dell'autore, pur
--    mantenendo la modifica di team).
-- 3) protect_fattura_delete: eliminando una fattura non incassata rimuove
--    anche la scadenza collegata (niente "incassi fantasma" con fattura_id NULL).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1a. Helper: l'allegato è di un'entità economica? (SECURITY DEFINER →
--        bypassa la RLS di allegati, evitando ricorsione nella storage policy)
CREATE OR REPLACE FUNCTION public.allegato_riservato(p_path text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allegati
    WHERE storage_path = p_path
      AND entita IN ('fatture', 'scadenze_pagamento', 'scadenze_tasse')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.allegato_riservato(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.allegato_riservato(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.allegato_riservato(text) TO authenticated;

-- ── 1b. Metadati allegati: quelli economici solo ad admin/manager
ALTER POLICY "allegati_select" ON allegati
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      puo_amministrazione()
      OR entita NOT IN ('fatture', 'scadenze_pagamento', 'scadenze_tasse')
    )
  );

-- ── 1c. File su storage: idem (il path non contiene l'entità → si passa dall'helper)
-- In blocco protetto: in alcuni ambienti di test la policy storage potrebbe
-- non esistere; non deve far fallire il resto della migrazione.
DO $$ BEGIN
  ALTER POLICY "allegati_storage_select" ON storage.objects
    USING (
      bucket_id = 'allegati'
      AND (puo_amministrazione() OR NOT public.allegato_riservato(name))
    );
EXCEPTION WHEN undefined_object OR insufficient_privilege THEN
  RAISE NOTICE 'policy storage allegati_storage_select non alterabile qui: skip';
END $$;

-- ── 2. created_by immutabile in UPDATE (anti-spoofing autore/audit)
CREATE OR REPLACE FUNCTION public.freeze_created_by()
RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.created_by := OLD.created_by;   -- l'autore non si può riscrivere
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.freeze_created_by() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.freeze_created_by() FROM anon;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['organizzazioni','contatti','deals','attivita','progetti','commesse']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_freeze_autore ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_freeze_autore BEFORE UPDATE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.freeze_created_by()', t, t);
  END LOOP;
END $$;

-- ── 3. protect_fattura_delete: niente incassi fantasma
CREATE OR REPLACE FUNCTION protect_fattura_delete()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM scadenze_pagamento
    WHERE fattura_id = OLD.id AND stato = 'incassato'
  ) THEN
    RAISE EXCEPTION 'Impossibile eliminare una fattura con un incasso già registrato';
  END IF;
  -- rimuove le scadenze collegate NON incassate (altrimenti resterebbero
  -- orfane con fattura_id = NULL e falserebbero il cash-flow)
  DELETE FROM scadenze_pagamento WHERE fattura_id = OLD.id;
  RETURN OLD;
END;
$$;
