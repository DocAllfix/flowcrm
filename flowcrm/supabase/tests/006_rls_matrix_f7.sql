-- ═══════════════════════════════════════════════════════════════════
-- Gate F7 — Progetti/Commesse: codice race-safe, CHECK cliente, RLS, tracciabilità
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'admin7@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000c7', 'oper7@flowcrm.local');
insert into user_profiles (id, nome, ruolo) values
  ('00000000-0000-0000-0000-0000000000a7', 'Admin7', 'admin'),
  ('00000000-0000-0000-0000-0000000000c7', 'Oper7', 'operatore')
on conflict (id) do update set nome=excluded.nome, ruolo=excluded.ruolo;

create or replace function pg_temp.impersona(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

select pg_temp.impersona('00000000-0000-0000-0000-0000000000c7');
insert into organizzazioni (id, ragione_sociale, created_by)
  values ('00000000-0000-0000-0000-0000000000f7', 'Org F7', '00000000-0000-0000-0000-0000000000c7');

-- ═══ PROGETTI ════════════════════════════════════════════════════

-- 1. Progetto cliente SENZA organizzazione → CHECK lo blocca
select throws_ok(
  $$insert into progetti (tipo, nome, created_by)
    values ('cliente', 'Senza cliente', '00000000-0000-0000-0000-0000000000c7')$$,
  '23514', null, 'progetto cliente senza organizzazione BLOCCATO');

-- 2. Progetto interno SENZA organizzazione → consentito
select lives_ok(
  $$insert into progetti (tipo, nome, created_by)
    values ('interno', 'Refactor CRM', '00000000-0000-0000-0000-0000000000c7')$$,
  'progetto interno senza organizzazione consentito');

-- 3. Progetto cliente CON organizzazione → consentito
select lives_ok(
  $$insert into progetti (id, tipo, nome, organizzazione_id, created_by)
    values ('00000000-0000-0000-0000-0000000000e7', 'cliente', 'Sito web',
            '00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000c7')$$,
  'progetto cliente con organizzazione consentito');

-- ═══ COMMESSE: numerazione race-safe ═════════════════════════════

-- 4. 20 commesse consecutive → codici sequenziali senza buchi né duplicati
do $$
declare i int;
begin
  for i in 1..20 loop
    insert into commesse (organizzazione_id, descrizione, created_by)
    values ('00000000-0000-0000-0000-0000000000f7', 'Commessa '||i, '00000000-0000-0000-0000-0000000000c7');
  end loop;
end $$;
select results_eq(
  $$select count(*)::int from commesse where organizzazione_id='00000000-0000-0000-0000-0000000000f7'$$,
  array[20], 'commesse: 20 create');
select results_eq(
  $$select count(distinct codice)::int from commesse where organizzazione_id='00000000-0000-0000-0000-0000000000f7'$$,
  array[20], 'commesse: 20 codici DISTINTI (nessun duplicato)');
select results_eq(
  $$select (max(cast(split_part(codice,'-',3) as int)) - min(cast(split_part(codice,'-',3) as int)) + 1)::int
    from commesse where organizzazione_id='00000000-0000-0000-0000-0000000000f7'$$,
  array[20], 'commesse: progressivi contigui senza buchi');

-- 5. Formato codice COMM-YYYY-NNNN
select matches(
  (select codice from commesse where organizzazione_id='00000000-0000-0000-0000-0000000000f7' order by codice limit 1),
  '^COMM-\d{4}-\d{4}$', 'commesse: formato codice COMM-YYYY-NNNN');

-- ═══ TRACCIABILITÀ deal→commessa + RLS ═══════════════════════════

-- 6. Commessa collegata a un deal (tracciabilità offerta→commessa)
insert into deals (id, nome, pipeline_id, stage_id, importo, created_by)
  select '00000000-0000-0000-0000-0000000000d7', 'Deal vinto', p.id,
         (select id from pipeline_stages where pipeline_id=p.id and is_won limit 1),
         8000, '00000000-0000-0000-0000-0000000000c7'
  from pipelines p where p.is_default;
select lives_ok(
  $$insert into commesse (organizzazione_id, deal_id, descrizione, importo, created_by)
    values ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000d7',
            'Da deal vinto', 8000, '00000000-0000-0000-0000-0000000000c7')$$,
  'commessa: creata da deal (tracciabilità)');

-- 7. Operatore NON cancella una commessa (solo admin)
select results_eq(
  $$with d as (delete from commesse where deal_id='00000000-0000-0000-0000-0000000000d7' returning 1) select count(*)::int from d$$,
  array[0], 'operatore: DELETE commessa = 0 righe');

select * from finish();
rollback;
