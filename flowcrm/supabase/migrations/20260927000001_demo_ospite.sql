-- ═══════════════════════════════════════════════════════════════════
-- DEMO PUBBLICA «prova vera»: l'OSPITE lavora sui dati, ogni notte si
-- ripristina (flowcrm/provisioning/demo-dati-dimostrativi.sql).
--
-- Finora la sola lettura aveva due vie: il manutentore scrive, gli altri
-- no. Ora ce n'è una terza, l'ospite (`user_profiles.ospite_demo`):
--   - può INSERIRE e MODIFICARE, ma solo sulle tabelle che il ripristino
--     notturno riporta al seme: una modifica altrove resterebbe per sempre;
--   - non può CANCELLARE niente (eccetto i ruoli delle aziende, che l'app
--     riscrive a ogni salvataggio cancellandoli e reinserendoli);
--   - non carica né cancella FILE (porta aperta trovata il 27/09: le regole
--     dello storage ignoravano la sola lettura);
--   - non cambia metadati o telefono del proprio account (si aggiungono
--     ai campi già sorvegliati dal blocco credenziali, G-36).
--
-- Con le credenziali dell'ospite pubbliche nella pagina, ogni permesso
-- deve stare QUI: chiunque può parlare con l'API saltando l'interfaccia.
--
-- La decisione sta in funzioni pure con sessione e operazione come
-- argomenti, così il test pgTAP la verifica senza cambiare sessione.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS ospite_demo BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_profiles.ospite_demo IS
  'Account della demo pubblica: in sola lettura può inserire e modificare le tabelle '
  'ripristinate ogni notte, mai cancellare, mai caricare file.';

-- ── Tabelle che l'ospite può toccare, e come ─────────────────────────
-- Solo quelle che `demo-dati-dimostrativi.sql` riporta al seme.
CREATE OR REPLACE FUNCTION scrittura_demo_rifiutata(
  p_utente uuid, p_sessione text, p_operazione text, p_tabella text)
RETURNS TEXT          -- NULL = consentita, altrimenti il messaggio per l'utente
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_sola_lettura boolean := COALESCE((SELECT sola_lettura FROM impostazioni_istanza WHERE id), false);
  v_manutentore  boolean := false;
  v_ospite       boolean := false;
BEGIN
  -- Chi non passa da PostgREST (manutenzione da SQL, pgTAP, trigger di sistema)
  -- non è un utente finale: come in puo_scrivere().
  IF p_sessione IS DISTINCT FROM 'authenticator' OR NOT v_sola_lettura THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(manutentore, false), COALESCE(ospite_demo, false)
    INTO v_manutentore, v_ospite
    FROM user_profiles WHERE id = p_utente;
  IF COALESCE(v_manutentore, false) THEN RETURN NULL; END IF;

  IF NOT COALESCE(v_ospite, false) THEN
    RETURN 'Funzione disponibile solo nella versione completa. Contatta per attivarla.';
  END IF;

  IF p_operazione = 'DELETE' AND p_tabella <> 'organizzazioni_ruoli' THEN
    RETURN 'Nella demo non si cancella: ogni notte i dati tornano come nuovi.';
  END IF;
  IF p_tabella = 'cantieri' AND p_operazione = 'INSERT' THEN
    RETURN 'Nella demo si lavora sul cantiere di esempio: nuovi cantieri nella versione completa.';
  END IF;
  IF p_tabella = ANY (ARRAY[
      'organizzazioni', 'organizzazioni_ruoli', 'contatti', 'deals', 'attivita',
      'commesse', 'fatture', 'scadenze_pagamento', 'scadenze_tasse',
      'cantieri', 'cantiere_sal']) THEN
    RETURN NULL;
  END IF;
  RETURN 'In questa demo si prova il CRM: questa parte si guarda soltanto.';
END;
$$;

-- puo_scrivere() dice all'INTERFACCIA se attivare i controlli di scrittura.
-- Per l'ospite sì: poi è il trigger a decidere tabella per tabella.
CREATE OR REPLACE FUNCTION puo_scrivere()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF session_user <> 'authenticator' THEN
    RETURN true;
  END IF;
  RETURN NOT COALESCE((SELECT sola_lettura FROM impostazioni_istanza WHERE id), false)
      OR COALESCE((SELECT manutentore OR ospite_demo FROM user_profiles WHERE id = auth.uid()), false);
END;
$$;

CREATE OR REPLACE FUNCTION blocca_scrittura_demo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_messaggio text := scrittura_demo_rifiutata(auth.uid(), session_user, TG_OP, TG_TABLE_NAME);
BEGIN
  IF v_messaggio IS NOT NULL THEN
    RAISE EXCEPTION '%', v_messaggio USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- ── File: nessuna esenzione per sessione ─────────────────────────────
-- Lo storage si collega al database come `supabase_storage_admin`, non come
-- `authenticator`: con puo_scrivere() sarebbe passato sempre. Qui conta solo
-- chi è l'utente. L'ospite non carica e non cancella file.
CREATE OR REPLACE FUNCTION scrittura_file_consentita()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT NOT COALESCE((SELECT sola_lettura FROM impostazioni_istanza WHERE id), false)
      OR COALESCE((SELECT manutentore FROM user_profiles WHERE id = auth.uid()), false);
$$;

DROP POLICY IF EXISTS allegati_storage_insert ON storage.objects;
CREATE POLICY allegati_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'allegati'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.scrittura_file_consentita()
  );

DROP POLICY IF EXISTS allegati_storage_delete ON storage.objects;
CREATE POLICY allegati_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'allegati'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.get_user_role() = 'admin')
    AND public.scrittura_file_consentita()
  );

-- ── Credenziali: anche metadati e telefono (porta aperta trovata il 27/09) ──
CREATE OR REPLACE FUNCTION blocca_credenziali_demo_utenti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.encrypted_password IS NOT DISTINCT FROM OLD.encrypted_password
     AND NEW.email IS NOT DISTINCT FROM OLD.email
     AND NEW.email_change IS NOT DISTINCT FROM OLD.email_change
     AND NEW.raw_user_meta_data IS NOT DISTINCT FROM OLD.raw_user_meta_data
     AND NEW.phone IS NOT DISTINCT FROM OLD.phone
     AND NEW.phone_change IS NOT DISTINCT FROM OLD.phone_change THEN
    RETURN NEW;
  END IF;
  IF NOT credenziali_modificabili(NEW.id, session_user) THEN
    RAISE EXCEPTION 'Nella demo le credenziali non si possono modificare.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION scrittura_demo_rifiutata(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION scrittura_file_consentita() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION scrittura_file_consentita() TO authenticated;  -- la valuta la policy
