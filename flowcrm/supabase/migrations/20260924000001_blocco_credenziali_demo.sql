-- ═══════════════════════════════════════════════════════════════════
-- SOLA LETTURA anche per le CREDENZIALI (GUASTI G-36).
--
-- Il blocco della demo (20260726000001_sola_lettura_demo.sql) copre le
-- tabelle di `public`. Password, email e secondo fattore stanno in `auth`
-- e li cambia GoTrue: il trigger non li vedeva. Un visitatore con le
-- credenziali di un account dimostrativo condiviso poteva cambiarne la
-- password e chiudere fuori tutti gli altri. È già successo una volta.
--
-- Regola: con l'istanza in sola lettura, un utente che NON è manutentore
-- non può cambiare password o email, né aggiungere un secondo fattore.
-- Il blocco vale solo per ciò che passa da GoTrue (sessione
-- `supabase_auth_admin`): la manutenzione da SQL (postgres, dashboard)
-- resta libera, ed è da lì che il manutentore ripristina una password.
--
-- La decisione sta in una funzione pura con la sessione come argomento:
-- così il test pgTAP la verifica senza dover cambiare utente di sessione.
--
-- Due funzioni trigger e non una: in PL/pgSQL un'espressione che nomina
-- NEW.encrypted_password fallisce su mfa_factors anche quando un'altra
-- condizione la renderebbe irrilevante, perché si prepara sul tipo di riga.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION credenziali_modificabili(p_utente uuid, p_sessione text)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF p_sessione IS DISTINCT FROM 'supabase_auth_admin' THEN
    RETURN true;
  END IF;
  RETURN NOT COALESCE((SELECT sola_lettura FROM impostazioni_istanza WHERE id), false)
      OR COALESCE((SELECT manutentore FROM user_profiles WHERE id = p_utente), false);
END;
$$;

-- Utenti: conta solo il cambio di password o email. GoTrue aggiorna
-- auth.users anche a ogni accesso (last_sign_in_at), e quello deve passare.
CREATE OR REPLACE FUNCTION blocca_credenziali_demo_utenti()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.encrypted_password IS NOT DISTINCT FROM OLD.encrypted_password
     AND NEW.email IS NOT DISTINCT FROM OLD.email
     AND NEW.email_change IS NOT DISTINCT FROM OLD.email_change THEN
    RETURN NEW;
  END IF;
  IF NOT credenziali_modificabili(NEW.id, session_user) THEN
    RAISE EXCEPTION 'Nella demo le credenziali non si possono modificare.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

-- Secondo fattore: vietato aggiungerne uno. Un fattore messo su un account
-- condiviso chiuderebbe fuori tutti gli altri come una password cambiata.
CREATE OR REPLACE FUNCTION blocca_credenziali_demo_mfa()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT credenziali_modificabili(NEW.user_id, session_user) THEN
    RAISE EXCEPTION 'Nella demo le credenziali non si possono modificare.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aa_blocca_credenziali_demo ON auth.users;
CREATE TRIGGER aa_blocca_credenziali_demo
  BEFORE UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION blocca_credenziali_demo_utenti();

DROP TRIGGER IF EXISTS aa_blocca_credenziali_demo ON auth.mfa_factors;
CREATE TRIGGER aa_blocca_credenziali_demo
  BEFORE INSERT ON auth.mfa_factors
  FOR EACH ROW EXECUTE FUNCTION blocca_credenziali_demo_mfa();

-- Hardening (pattern del progetto): nessuno le chiama dall'API.
REVOKE ALL ON FUNCTION blocca_credenziali_demo_utenti() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION blocca_credenziali_demo_mfa() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION credenziali_modificabili(uuid, text) FROM PUBLIC, anon, authenticated;
