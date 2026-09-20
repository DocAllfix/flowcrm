-- ═══════════════════════════════════════════════════════════════════
-- SICUREZZA — FORCE ROW LEVEL SECURITY su tutte le tabelle di dominio.
--
-- Perché ora e non prima: su Supabase gestito la RLS bastava, perché
-- nessun processo applicativo si collega come PROPRIETARIO delle tabelle
-- (PostgREST entra come `authenticator` e fa SET ROLE a anon/authenticated,
-- che sono soggetti a RLS in ogni caso).
--
-- Nel modello self-hosted per cliente lo scenario cambia: sulla stessa
-- macchina girano pg_cron, estensioni e script di manutenzione che si
-- collegano con ruoli privilegiati. `ENABLE ROW LEVEL SECURITY` da sola
-- NON si applica al proprietario della tabella: una query fatta da un
-- processo che possiede le tabelle vedrebbe TUTTE le righe, in silenzio e
-- senza errori. FORCE chiude questa strada.
--
-- Nota di comportamento (verificata con la suite pgTAP): i ruoli con
-- attributo BYPASSRLS continuano a scavalcare la RLS anche con FORCE
-- attivo. È ciò che tiene funzionanti la manutenzione via psql, i job
-- pg_cron e la suite di test, che girano come `postgres`. FORCE protegge
-- dal proprietario NON privilegiato, che è esattamente il caso nuovo
-- introdotto dal self-hosting.
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  t TEXT;
  n INTEGER := 0;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true      -- solo dove la RLS è già attiva
      AND c.relforcerowsecurity = false -- idempotente: salta il già fatto
  LOOP
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'FORCE ROW LEVEL SECURITY applicata a % tabelle', n;
END $$;

-- Rete di sicurezza: se una tabella di dominio fosse rimasta senza RLS
-- attiva, FORCE non la coprirebbe. Meglio fallire la migrazione che
-- scoprirlo in produzione.
DO $$
DECLARE
  scoperte TEXT;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO scoperte
  FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = false
    AND c.relname NOT LIKE 'pg_%';

  IF scoperte IS NOT NULL THEN
    RAISE EXCEPTION 'Tabelle in public SENZA row level security: %', scoperte;
  END IF;
END $$;
