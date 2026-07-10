-- ═══════════════════════════════════════════════════════════════════
-- Gate F4 — Vendite: deal, stage, storico immutabile, chiuso_at, RLS
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a4', 'admin4@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000b4', 'manager4@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000c4', 'oper4@flowcrm.local');
insert into user_profiles (id, nome, ruolo) values
  ('00000000-0000-0000-0000-0000000000a4', 'Admin4', 'admin'),
  ('00000000-0000-0000-0000-0000000000b4', 'Manager4', 'manager'),
  ('00000000-0000-0000-0000-0000000000c4', 'Oper4', 'operatore')
on conflict (id) do update set nome=excluded.nome, ruolo=excluded.ruolo;

create or replace function pg_temp.impersona(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

-- Riferimenti pipeline default (seed della migration)
create or replace function pg_temp.stage(nome_stage text) returns uuid as $$
  select s.id from pipeline_stages s join pipelines p on p.id=s.pipeline_id
  where p.is_default and s.nome = nome_stage limit 1;
$$ language sql stable;
create or replace function pg_temp.pipe() returns uuid as $$
  select id from pipelines where is_default limit 1;
$$ language sql stable;

-- ═══ CREAZIONE + STORICO ═════════════════════════════════════════

-- 1. Operatore crea un deal in "Proposta"
select pg_temp.impersona('00000000-0000-0000-0000-0000000000c4');
select lives_ok(
  format($$insert into deals (id, nome, pipeline_id, stage_id, importo, created_by)
    values ('00000000-0000-0000-0000-0000000000d4', 'Deal Test', %L, %L, 5000,
            '00000000-0000-0000-0000-0000000000c4')$$, pg_temp.pipe(), pg_temp.stage('Proposta')),
  'operatore: crea deal in Proposta'
);

-- 2. L'insert ha generato la prima riga di storico
select results_eq(
  $$select count(*)::int from deal_stage_history where deal_id='00000000-0000-0000-0000-0000000000d4'$$,
  array[1],
  'storico: riga iniziale creata alla insert'
);

-- 3. Spostando in Negoziazione si aggiunge storico
select lives_ok(
  format($$update deals set stage_id=%L where id='00000000-0000-0000-0000-0000000000d4'$$, pg_temp.stage('Negoziazione')),
  'deal: spostamento a Negoziazione'
);
select results_eq(
  $$select count(*)::int from deal_stage_history where deal_id='00000000-0000-0000-0000-0000000000d4'$$,
  array[2],
  'storico: seconda riga dopo spostamento'
);

-- ═══ chiuso_at DERIVATO ══════════════════════════════════════════

-- 4. Entrando in "Vinto" (is_won) chiuso_at viene valorizzato dal trigger
select lives_ok(
  format($$update deals set stage_id=%L where id='00000000-0000-0000-0000-0000000000d4'$$, pg_temp.stage('Vinto')),
  'deal: spostamento a Vinto'
);
select isnt(
  (select chiuso_at from deals where id='00000000-0000-0000-0000-0000000000d4'),
  null,
  'chiuso_at valorizzato entrando in stage vinto'
);

-- 5. Tornando in Proposta chiuso_at si azzera
select lives_ok(
  format($$update deals set stage_id=%L where id='00000000-0000-0000-0000-0000000000d4'$$, pg_temp.stage('Proposta')),
  'deal: ritorno a Proposta'
);
select is(
  (select chiuso_at from deals where id='00000000-0000-0000-0000-0000000000d4'),
  null,
  'chiuso_at azzerato uscendo da stage vinto/perso'
);

-- ═══ INTEGRITÀ ═══════════════════════════════════════════════════

-- 6. Storico immutabile: UPDATE = 0 righe
select results_eq(
  $$with u as (update deal_stage_history set cambiato_da=null returning 1) select count(*)::int from u$$,
  array[0],
  'deal_stage_history: UPDATE = 0 righe (immutabile)'
);

-- 7. Stage con deal dentro NON eliminabile (admin ci prova)
select pg_temp.impersona('00000000-0000-0000-0000-0000000000a4');
select throws_like(
  format($$delete from pipeline_stages where id=%L$$, pg_temp.stage('Proposta')),
  '%contiene deal%',
  'stage: non eliminabile se contiene deal'
);

-- 8. Operatore NON può configurare gli stage (solo admin/manager)
select pg_temp.impersona('00000000-0000-0000-0000-0000000000c4');
select throws_ok(
  format($$insert into pipeline_stages (pipeline_id, nome, ordine) values (%L, 'Hack', 99)$$, pg_temp.pipe()),
  '42501', null,
  'operatore: INSERT stage negato dalla RLS'
);

-- 9. Il manager PUÒ configurare gli stage
select pg_temp.impersona('00000000-0000-0000-0000-0000000000b4');
select lives_ok(
  format($$insert into pipeline_stages (pipeline_id, nome, ordine, probabilita) values (%L, 'Qualifica', 5, 10)$$, pg_temp.pipe()),
  'manager: INSERT stage consentito'
);

-- 10. Operatore NON cancella deal (solo admin)
select pg_temp.impersona('00000000-0000-0000-0000-0000000000c4');
select results_eq(
  $$with d as (delete from deals where id='00000000-0000-0000-0000-0000000000d4' returning 1) select count(*)::int from d$$,
  array[0],
  'operatore: DELETE deal = 0 righe'
);

select * from finish();
rollback;
