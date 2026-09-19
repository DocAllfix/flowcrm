-- ═══════════════════════════════════════════════════════════════════
-- SICUREZZA — Il rate-limit del Copilot non deve essere parametrizzabile
-- dal chiamante.
--
-- Difetto corretto: copilot_rate_check(per_minuto, per_giorno) era
-- SECURITY DEFINER con GRANT a `authenticated` e le soglie esposte come
-- ARGOMENTI. PostgREST espone ogni funzione eseguibile come endpoint RPC,
-- quindi un utente autenticato poteva chiamare direttamente
--   POST /rest/v1/rpc/copilot_rate_check {"per_minuto": 999999, ...}
-- e alzarsi da solo il tetto, annullando il backstop anti-abuso. Dietro
-- c'è un endpoint Azure OpenAI a consumo: era un buco che costa denaro.
--
-- Correzione: le soglie diventano costanti nel corpo della funzione e la
-- firma parametrica viene ELIMINATA (non solo revocata), così non resta
-- alcun overload abusabile. L'Edge Function chiama già `rpc('copilot_rate_check')`
-- senza argomenti: nessuna modifica applicativa necessaria.
-- ═══════════════════════════════════════════════════════════════════

-- Via la firma abusabile: nessun overload residuo da poter invocare.
DROP FUNCTION IF EXISTS copilot_rate_check(integer, integer);

CREATE OR REPLACE FUNCTION copilot_rate_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  -- Soglie fissate lato server: non sono influenzabili dal chiamante.
  per_minuto CONSTANT integer := 15;
  per_giorno CONSTANT integer := 150;
  uid   uuid := auth.uid();
  n_min integer;
  n_day integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'motivo', 'non autenticato');
  END IF;

  SELECT count(*) INTO n_min FROM copilot_usage
    WHERE user_id = uid AND creato_at > now() - interval '1 minute';
  IF n_min >= per_minuto THEN
    RETURN jsonb_build_object('allowed', false, 'motivo', 'troppe richieste, riprova tra un minuto');
  END IF;

  SELECT count(*) INTO n_day FROM copilot_usage
    WHERE user_id = uid AND creato_at > now() - interval '1 day';
  IF n_day >= per_giorno THEN
    RETURN jsonb_build_object('allowed', false, 'motivo', 'limite giornaliero raggiunto');
  END IF;

  INSERT INTO copilot_usage (user_id) VALUES (uid);
  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Hardening coerente col progetto: solo l'utente autenticato.
REVOKE EXECUTE ON FUNCTION copilot_rate_check() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION copilot_rate_check() FROM anon;
GRANT  EXECUTE ON FUNCTION copilot_rate_check() TO authenticated;
