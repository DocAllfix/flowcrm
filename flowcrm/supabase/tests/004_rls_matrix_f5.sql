-- ═══════════════════════════════════════════════════════════════════
-- Gate F5 — Attività: CHECK partecipanti, cascade FK, completata_at, RLS
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a5', 'admin5@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000c5', 'oper5@flowcrm.local');
insert into user_profiles (id, nome, ruolo) values
  ('00000000-0000-0000-0000-0000000000a5', 'Admin5', 'admin'),
  ('00000000-0000-0000-0000-0000000000c5', 'Oper5', 'operatore')
on conflict (id) do update set nome=excluded.nome, ruolo=excluded.ruolo;

create or replace function pg_temp.impersona(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

-- Setup: un'organizzazione + un deal a cui agganciare le attività
select pg_temp.impersona('00000000-0000-0000-0000-0000000000c5');
insert into organizzazioni (id, ragione_sociale, created_by)
  values ('00000000-0000-0000-0000-0000000000f5', 'Org F5', '00000000-0000-0000-0000-0000000000c5');
insert into deals (id, nome, pipeline_id, stage_id, created_by)
  select '00000000-0000-0000-0000-0000000000d5', 'Deal F5', p.id,
         (select id from pipeline_stages where pipeline_id=p.id order by ordine limit 1),
         '00000000-0000-0000-0000-0000000000c5'
  from pipelines p where p.is_default;

-- 1. Crea un task collegato al deal E all'organizzazione
select lives_ok(
  $$insert into attivita (id, tipo, titolo, deal_id, organizzazione_id, assegnato_a, created_by)
    values ('00000000-0000-0000-0000-0000000000e5', 'task', 'Follow-up offerta',
            '00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000f5',
            '00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c5')$$,
  'task collegato a deal e organizzazione'
);

-- 2. Compare nella timeline del deal
select results_eq(
  $$select count(*)::int from attivita where deal_id='00000000-0000-0000-0000-0000000000d5'$$,
  array[1], 'timeline deal: contiene il task');

-- 3. Compare anche nella timeline dell'organizzazione
select results_eq(
  $$select count(*)::int from attivita where organizzazione_id='00000000-0000-0000-0000-0000000000f5'$$,
  array[1], 'timeline organizzazione: contiene lo stesso task');

-- 4. completata_at si valorizza passando a completata
select lives_ok(
  $$update attivita set stato='completata' where id='00000000-0000-0000-0000-0000000000e5'$$,
  'task: passaggio a completata');
select isnt(
  (select completata_at from attivita where id='00000000-0000-0000-0000-0000000000e5'),
  null, 'completata_at valorizzato quando stato=completata');

-- 5. Riaprendo il task completata_at si azzera
select lives_ok(
  $$update attivita set stato='in_corso' where id='00000000-0000-0000-0000-0000000000e5'$$,
  'task: riapertura');
select is(
  (select completata_at from attivita where id='00000000-0000-0000-0000-0000000000e5'),
  null, 'completata_at azzerato quando non più completata');

-- 6. Riunione con partecipante misto (contatto + utente)
insert into contatti (id, nome, organizzazione_id, created_by)
  values ('00000000-0000-0000-0000-0000000000b5', 'Referente', '00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000c5');
insert into attivita (id, tipo, titolo, inizio, durata_minuti, created_by)
  values ('00000000-0000-0000-0000-0000000000a6', 'riunione', 'Kick-off', now(), 60, '00000000-0000-0000-0000-0000000000c5');
select lives_ok(
  $$insert into riunioni_partecipanti (attivita_id, contatto_id) values ('00000000-0000-0000-0000-0000000000a6','00000000-0000-0000-0000-0000000000b5');
    insert into riunioni_partecipanti (attivita_id, user_id) values ('00000000-0000-0000-0000-0000000000a6','00000000-0000-0000-0000-0000000000c5')$$,
  'riunione: partecipanti misti contatto+utente');

-- 7. CHECK: partecipante vuoto (né contatto né utente) rifiutato
select throws_ok(
  $$insert into riunioni_partecipanti (attivita_id) values ('00000000-0000-0000-0000-0000000000a6')$$,
  '23514', null, 'partecipante senza contatto né utente BLOCCATO dal CHECK');

-- 8. Cascade: cancellando il deal spariscono le sue attività collegate
select pg_temp.impersona('00000000-0000-0000-0000-0000000000a5');
delete from deals where id='00000000-0000-0000-0000-0000000000d5';
select results_eq(
  $$select count(*)::int from attivita where deal_id='00000000-0000-0000-0000-0000000000d5'$$,
  array[0], 'cascade: attività del deal eliminate col deal');

select * from finish();
rollback;
