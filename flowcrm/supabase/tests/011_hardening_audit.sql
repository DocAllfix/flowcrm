-- ═══════════════════════════════════════════════════════════════════
-- HARDENING — l'audit_log NON deve rivelare i dati economici all'operatore
-- (canale indiretto: i diff delle fatture contengono gli importi).
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000ad0001', 'adminH@flowcrm.local'),
  ('00000000-0000-0000-0000-000000009001', 'operH@flowcrm.local')
on conflict do nothing;
insert into user_profiles (id, nome, ruolo) values
  ('00000000-0000-0000-0000-000000ad0001', 'AdminH', 'admin'),
  ('00000000-0000-0000-0000-000000009001', 'OperH', 'operatore')
on conflict (id) do update set nome=excluded.nome, ruolo=excluded.ruolo;

-- Come admin: crea un'organizzazione e una fattura → generano audit_log
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-000000ad0001','role','authenticated')::text, true);
set local role authenticated;
insert into organizzazioni (id, ragione_sociale, created_by)
  values ('00000000-0000-0000-0000-00000000f001', 'Org Hard', '00000000-0000-0000-0000-000000ad0001');
insert into fatture (numero, organizzazione_id, imponibile, totale, scadenza, created_by)
  values ('HARD-1', '00000000-0000-0000-0000-00000000f001', 5000, 6100, current_date+30, '00000000-0000-0000-0000-000000ad0001');

-- 1. Admin vede l'audit delle fatture
select cmp_ok(
  (select count(*)::int from audit_log where entita='fatture' and entita_id in (select id from fatture where numero='HARD-1')),
  '>=', 1, 'admin: vede audit_log delle fatture');

-- 2. OPERATORE: audit_log delle fatture = 0 righe (niente leak importi)
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-000000009001','role','authenticated')::text, true);
set local role authenticated;
select results_eq(
  $$select count(*)::int from audit_log where entita='fatture'$$,
  array[0], 'OPERATORE: audit_log fatture = 0 (nessun leak economico)');

-- 3. OPERATORE: audit_log organizzazioni resta visibile (feature Storico ok)
select cmp_ok(
  (select count(*)::int from audit_log where entita='organizzazioni'),
  '>=', 1, 'operatore: audit_log organizzazioni visibile (Storico funziona)');

select * from finish();
rollback;
