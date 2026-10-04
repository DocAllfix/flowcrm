-- ═══════════════════════════════════════════════════════════════════
-- MODULI 2 · FONDAMENTA — protezioni automatiche e configurazione demo
--
-- Secondo programma di moduli verticali (Ristorante, Bar, Hotel, Palestra,
-- Fioraio, Garage, Agenzia immobiliare). Prima di aggiungere ~130 tabelle,
-- si chiudono tre fragilità trovate nell'analisi del 04/10/2026:
--
-- 1. La sola lettura della demo (`aa_blocca_scrittura_demo`, mig. 20260726)
--    e la RLS forzata (mig. 20260918000002) sono state applicate UNA volta,
--    alle tabelle di allora. Una tabella creata dopo sarebbe rimasta
--    scrivibile dall'esterno in demo, e senza FORCE nelle istanze clienti.
--    → `applica_protezioni_tabelle()`: si richiama in fondo a OGNI
--      migrazione che crea tabelle. Idempotente. Fallisce se una tabella di
--      `public` non ha la RLS attiva: meglio una migrazione rossa che una
--      tabella aperta in produzione.
-- 2. Le tabelle che l'ospite della demo pubblica può toccare erano un
--    elenco scritto dentro `scrittura_demo_rifiutata()`. Ogni modulo nuovo
--    avrebbe dovuto riscrivere una funzione di sicurezza.
--    → tabella `demo_tabelle_ospite`, letta dalla funzione. Messaggi e
--      comportamento identici a prima (test 021 invariato).
-- 3. Il motore food & beverage (`fb_*`) è condiviso da Ristorante e Bar.
--    → `modulo_attivo(slug)`: come `modulo_licenziato`, ma lo pseudo-modulo
--      'fb' è attivo se lo è almeno uno dei due.
--
-- In più: `btree_gist` (vincoli di esclusione su intervalli: camere, posti,
-- turni) e il consenso marketing dei contatti (le campagne lo richiedono).
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ── 1. Protezioni applicate a ogni tabella nuova ─────────────────────
-- Tabelle di solo servizio, scritte da funzioni di sistema o dal cron anche
-- in sola lettura: niente trigger di blocco (stesso elenco della mig.
-- 20260726, più `mail_outbox`, che è coda di sistema dal 18/09).
CREATE OR REPLACE FUNCTION tabelle_di_servizio()
RETURNS TEXT[]
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT ARRAY[
    'impostazioni_istanza', 'audit_log', 'notifiche', 'notifiche_scadenza_inviate',
    'codici_progressivi', 'deal_stage_history', 'copilot_usage', 'moduli_licenze',
    'mail_outbox'
  ]::text[]
$$;

CREATE OR REPLACE FUNCTION applica_protezioni_tabelle()
RETURNS INTEGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  t TEXT;
  n INTEGER := 0;
  scoperte TEXT;
BEGIN
  -- Rete di sicurezza: nessuna tabella di dominio senza RLS.
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO scoperte
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;
  IF scoperte IS NOT NULL THEN
    RAISE EXCEPTION 'Tabelle in public senza RLS: %', scoperte;
  END IF;

  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'public' AND c.relkind = 'r' AND NOT c.relforcerowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    n := n + 1;
  END LOOP;

  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'public' AND c.relkind = 'r'
       AND NOT c.relname = ANY (tabelle_di_servizio())
       AND NOT EXISTS (SELECT 1 FROM pg_trigger tg
                        WHERE tg.tgrelid = c.oid AND tg.tgname = 'aa_blocca_scrittura_demo')
  LOOP
    EXECUTE format(
      'CREATE TRIGGER aa_blocca_scrittura_demo '
      'BEFORE INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION blocca_scrittura_demo()', t);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION applica_protezioni_tabelle() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION tabelle_di_servizio() FROM PUBLIC, anon, authenticated;

-- ── 2. Tabelle che l'ospite della demo pubblica può toccare ───────────
-- Solo quelle che il ripristino notturno riporta al seme
-- (provisioning/demo-dati-dimostrativi.sql). Ogni modulo, quando entra
-- nella demo pubblica, aggiunge qui le sue righe e il suo ripristino.
CREATE TABLE demo_tabelle_ospite (
  tabella            TEXT PRIMARY KEY,
  inserisce          BOOLEAN NOT NULL DEFAULT true,
  modifica           BOOLEAN NOT NULL DEFAULT true,
  cancella           BOOLEAN NOT NULL DEFAULT false,
  messaggio_rifiuto  TEXT,          -- se inserisce = false: perché
  nota               TEXT
);
ALTER TABLE demo_tabelle_ospite ENABLE ROW LEVEL SECURITY;
-- Nessuna policy: si legge solo da scrittura_demo_rifiutata (SECURITY
-- DEFINER) e si scrive solo dall'installer o da una migrazione.

INSERT INTO demo_tabelle_ospite (tabella, inserisce, modifica, cancella, messaggio_rifiuto, nota) VALUES
  ('organizzazioni',       true,  true, false, NULL, NULL),
  ('organizzazioni_ruoli', true,  true, true,  NULL, 'l''app riscrive i ruoli a ogni salvataggio cancellandoli e reinserendoli'),
  ('contatti',             true,  true, false, NULL, NULL),
  ('deals',                true,  true, false, NULL, NULL),
  ('attivita',             true,  true, false, NULL, NULL),
  ('commesse',             true,  true, false, NULL, NULL),
  ('fatture',              true,  true, false, NULL, NULL),
  ('scadenze_pagamento',   true,  true, false, NULL, NULL),
  ('scadenze_tasse',       true,  true, false, NULL, NULL),
  ('cantieri',             false, true, false,
     'Nella demo si lavora sul cantiere di esempio: nuovi cantieri nella versione completa.', NULL),
  ('cantiere_sal',         true,  true, false, NULL, NULL);

CREATE OR REPLACE FUNCTION scrittura_demo_rifiutata(
  p_utente uuid, p_sessione text, p_operazione text, p_tabella text)
RETURNS TEXT          -- NULL = consentita, altrimenti il messaggio per l'utente
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_sola_lettura boolean := COALESCE((SELECT sola_lettura FROM impostazioni_istanza WHERE id), false);
  v_manutentore  boolean := false;
  v_ospite       boolean := false;
  r              demo_tabelle_ospite%ROWTYPE;
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

  SELECT * INTO r FROM demo_tabelle_ospite WHERE tabella = p_tabella;

  IF p_operazione = 'DELETE' AND NOT COALESCE(r.cancella, false) THEN
    RETURN 'Nella demo non si cancella: ogni notte i dati tornano come nuovi.';
  END IF;
  IF r.tabella IS NULL THEN
    RETURN 'In questa demo si prova il CRM: questa parte si guarda soltanto.';
  END IF;
  IF p_operazione = 'INSERT' AND NOT r.inserisce THEN
    RETURN COALESCE(r.messaggio_rifiuto, 'In questa demo si prova il CRM: questa parte si guarda soltanto.');
  END IF;
  IF p_operazione = 'UPDATE' AND NOT r.modifica THEN
    RETURN 'In questa demo si prova il CRM: questa parte si guarda soltanto.';
  END IF;
  RETURN NULL;
END;
$$;

-- ── 3. Licenza del motore condiviso food & beverage ──────────────────
CREATE OR REPLACE FUNCTION modulo_attivo(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT CASE p_slug
    WHEN 'fb' THEN modulo_licenziato('ristorante') OR modulo_licenziato('bar')
    ELSE modulo_licenziato(p_slug)
  END
$$;
REVOKE ALL ON FUNCTION modulo_attivo(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION modulo_attivo(TEXT) TO authenticated;

-- I moduli che usano le fondamenta: ogni riga delle fondamenta porta il
-- suo `modulo`, e la policy controlla quella licenza.
CREATE OR REPLACE FUNCTION moduli_fondamenta()
RETURNS TEXT[]
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT ARRAY['fb', 'ristorante', 'bar', 'hotel', 'palestra', 'fioraio', 'garage', 'immobiliare']::text[]
$$;

-- ── 4. Consenso marketing dei contatti ───────────────────────────────
-- Le campagne (fondamenta F0.6) scrivono solo a chi ha dato il consenso:
-- l'invio promozionale senza consenso non è ammesso (GDPR, Codice privacy
-- art. 130). Default false: nessun contatto esistente riceve campagne
-- finché il consenso non viene registrato.
ALTER TABLE contatti
  ADD COLUMN IF NOT EXISTS consenso_marketing     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consenso_marketing_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consenso_marketing_fonte TEXT;

CREATE OR REPLACE FUNCTION contatto_consenso_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.consenso_marketing AND (TG_OP = 'INSERT' OR NOT OLD.consenso_marketing) THEN
    NEW.consenso_marketing_at := COALESCE(NEW.consenso_marketing_at, NOW());
  ELSIF NOT NEW.consenso_marketing THEN
    NEW.consenso_marketing_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER contatti_consenso_at
  BEFORE INSERT OR UPDATE OF consenso_marketing ON contatti
  FOR EACH ROW EXECUTE FUNCTION contatto_consenso_at();

SELECT applica_protezioni_tabelle();
