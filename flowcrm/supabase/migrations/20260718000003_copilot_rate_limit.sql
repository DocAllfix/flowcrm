-- ═══════════════════════════════════════════════════════════════════
-- HARDENING — Rate-limit del Copilot (backstop applicativo anti-abuso/costi)
-- Traccia le chiamate per utente e nega oltre le soglie (al minuto e al
-- giorno). La funzione è SECURITY DEFINER: registra e valuta usando
-- auth.uid() dal JWT → l'utente non può falsare il proprio conteggio.
-- La tabella non è accessibile direttamente (RLS attiva, nessuna policy).
-- ═══════════════════════════════════════════════════════════════════

create table if not exists copilot_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  creato_at  timestamptz not null default now()
);
create index if not exists copilot_usage_user_time_idx
  on copilot_usage (user_id, creato_at);

alter table copilot_usage enable row level security;
-- Nessuna policy: la tabella si tocca SOLO tramite copilot_rate_check().

-- Registra la chiamata corrente e dice se è consentita.
create or replace function copilot_rate_check(
  per_minuto integer default 15,
  per_giorno integer default 150
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid   uuid := auth.uid();
  n_min integer;
  n_day integer;
begin
  if uid is null then
    return jsonb_build_object('allowed', false, 'motivo', 'non autenticato');
  end if;

  select count(*) into n_min from copilot_usage
    where user_id = uid and creato_at > now() - interval '1 minute';
  if n_min >= per_minuto then
    return jsonb_build_object('allowed', false, 'motivo', 'troppe richieste, riprova tra un minuto');
  end if;

  select count(*) into n_day from copilot_usage
    where user_id = uid and creato_at > now() - interval '1 day';
  if n_day >= per_giorno then
    return jsonb_build_object('allowed', false, 'motivo', 'limite giornaliero raggiunto');
  end if;

  insert into copilot_usage (user_id) values (uid);
  return jsonb_build_object('allowed', true);
end;
$$;

-- Coerente con la blindatura funzioni: nessuno tranne l'utente autenticato.
revoke execute on function copilot_rate_check(integer, integer) from public;
revoke execute on function copilot_rate_check(integer, integer) from anon;
grant  execute on function copilot_rate_check(integer, integer) to authenticated;
