-- ═══════════════════════════════════════════════════════════════════
-- SOLA LETTURA (demo distribuibile) — l'istanza dimostrativa si naviga
-- per intero ma NON accetta scritture dagli utenti finali. La barriera
-- è qui nel database (non nei bottoni): un unico trigger su tutte le
-- tabelle di dominio nega INSERT/UPDATE/DELETE quando l'istanza è in
-- sola lettura e l'utente non è un manutentore.
--
-- Coerente con "la UI nasconde, la RLS nega": bloccare solo il frontend
-- lascerebbe passare chi chiama l'API direttamente dalla console.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Interruttore d'istanza (riga singola) ─────────────────────────
CREATE TABLE IF NOT EXISTS impostazioni_istanza (
  id           BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),      -- singleton
  sola_lettura BOOLEAN NOT NULL DEFAULT false,
  messaggio    TEXT NOT NULL DEFAULT
    'Funzione disponibile solo nella versione completa. Contatta per attivarla.',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO impostazioni_istanza (id, sola_lettura) VALUES (true, false)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE impostazioni_istanza ENABLE ROW LEVEL SECURITY;
-- Nessuna policy di scrittura: la si cambia solo come postgres/service_role
-- (installer o manutenzione). Lettura consentita agli autenticati per il
-- banner (il testo non è sensibile).
DROP POLICY IF EXISTS "impostazioni_istanza_select" ON impostazioni_istanza;
CREATE POLICY "impostazioni_istanza_select" ON impostazioni_istanza
  FOR SELECT TO authenticated USING (true);

-- ── 2. Whitelist manutentori (possono scrivere anche in sola lettura) ─
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS manutentore BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_profiles.manutentore IS
  'Se true, l''utente può scrivere anche quando l''istanza è in sola lettura '
  '(account di manutenzione e account di test automatici).';

-- ── 3. Helper: l'utente corrente può scrivere? ───────────────────────
-- I test pgTAP e le operazioni di manutenzione (psql / SQL editor / db
-- query) girano come 'postgres', NON come 'authenticator': non sono
-- utenti finali e non vanno mai bloccati. Le richieste reali via API
-- (PostgREST) arrivano come 'authenticator' e sono soggette al blocco.
CREATE OR REPLACE FUNCTION puo_scrivere()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF session_user <> 'authenticator' THEN
    RETURN true;
  END IF;
  RETURN NOT COALESCE((SELECT sola_lettura FROM impostazioni_istanza WHERE id), false)
      OR COALESCE((SELECT manutentore FROM user_profiles WHERE id = auth.uid()), false);
END;
$$;

-- ── 4. Trigger di blocco (uno solo, agganciato ovunque) ──────────────
CREATE OR REPLACE FUNCTION blocca_scrittura_demo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NOT puo_scrivere() THEN
    RAISE EXCEPTION 'Funzione disponibile solo nella versione completa. Contatta per attivarla.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Aggancio a tutte le tabelle di dominio in public, ESCLUSE quelle di
-- solo servizio scritte dalle funzioni SECURITY DEFINER / dal cron / dal
-- copilot (non scrivibili direttamente dagli utenti, e necessarie ai
-- flussi di sistema anche in sola lettura — es. la telemetria copilot,
-- che è una lettura, resta funzionante in demo).
DO $$
DECLARE
  t TEXT;
  escluse TEXT[] := ARRAY[
    'impostazioni_istanza',
    'audit_log',
    'notifiche',
    'notifiche_scadenza_inviate',
    'codici_progressivi',
    'deal_stage_history',
    'copilot_usage',
    'moduli_licenze'
  ];
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relname = ANY(escluse)
  LOOP
    -- prefisso 'aa_' → il trigger scatta per primo (prima di genera_codice ecc.)
    EXECUTE format('DROP TRIGGER IF EXISTS aa_blocca_scrittura_demo ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER aa_blocca_scrittura_demo '
      'BEFORE INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION blocca_scrittura_demo()', t);
  END LOOP;
END $$;

-- ── 5. Hardening (pattern del progetto) ──────────────────────────────
REVOKE ALL ON FUNCTION blocca_scrittura_demo() FROM PUBLIC;
REVOKE ALL ON FUNCTION blocca_scrittura_demo() FROM anon;
REVOKE ALL ON FUNCTION blocca_scrittura_demo() FROM authenticated;
REVOKE ALL ON FUNCTION puo_scrivere() FROM PUBLIC;
REVOKE ALL ON FUNCTION puo_scrivere() FROM anon;
GRANT EXECUTE ON FUNCTION puo_scrivere() TO authenticated;  -- il client la chiama per il banner
