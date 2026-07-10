-- ═══════════════════════════════════════════════════════════════════
-- Gate F6 — Messaggi: feed per record, canale team, menzioni→notifica, RLS
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a6', 'admin6@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000c6', 'oper6@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000d6', 'oper6b@flowcrm.local');
insert into user_profiles (id, nome, ruolo) values
  ('00000000-0000-0000-0000-0000000000a6', 'Admin6', 'admin'),
  ('00000000-0000-0000-0000-0000000000c6', 'Oper6', 'operatore'),
  ('00000000-0000-0000-0000-0000000000d6', 'Oper6b', 'operatore')
on conflict (id) do update set nome=excluded.nome, ruolo=excluded.ruolo;

create or replace function pg_temp.impersona(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

select pg_temp.impersona('00000000-0000-0000-0000-0000000000c6');
insert into organizzazioni (id, ragione_sociale, created_by)
  values ('00000000-0000-0000-0000-0000000000f6', 'Org F6', '00000000-0000-0000-0000-0000000000c6');

-- 1. Commento su un record (feed organizzazione)
select lives_ok(
  $$insert into messaggi (entita, entita_id, autore_id, testo)
    values ('organizzazioni', '00000000-0000-0000-0000-0000000000f6',
            '00000000-0000-0000-0000-0000000000c6', 'Primo commento')$$,
  'feed record: commento inserito');

-- 2. Messaggio nel canale team (entita_id NULL)
select lives_ok(
  $$insert into messaggi (entita, autore_id, testo)
    values ('team', '00000000-0000-0000-0000-0000000000c6', 'Ciao team')$$,
  'canale team: messaggio senza entita_id');

-- 3. CHECK: record non-team senza entita_id rifiutato
select throws_ok(
  $$insert into messaggi (entita, autore_id, testo)
    values ('deals', '00000000-0000-0000-0000-0000000000c6', 'orfano')$$,
  '23514', null, 'record non-team senza entita_id BLOCCATO');

-- 4. CHECK: team CON entita_id rifiutato
select throws_ok(
  $$insert into messaggi (entita, entita_id, autore_id, testo)
    values ('team', gen_random_uuid(), '00000000-0000-0000-0000-0000000000c6', 'x')$$,
  '23514', null, 'canale team con entita_id BLOCCATO');

-- 5. Spoofing autore_id negato dalla RLS
select throws_ok(
  $$insert into messaggi (entita, autore_id, testo)
    values ('team', '00000000-0000-0000-0000-0000000000a6', 'finto')$$,
  '42501', null, 'spoofing autore_id negato');

-- 6. CHECK lunghezza testo (vuoto rifiutato)
select throws_ok(
  $$insert into messaggi (entita, autore_id, testo)
    values ('team', '00000000-0000-0000-0000-0000000000c6', '')$$,
  '23514', null, 'messaggio vuoto BLOCCATO dal CHECK');

-- 7. Menzione → notifica per l'utente menzionato
select lives_ok(
  $$insert into messaggi (entita, autore_id, testo, menzioni)
    values ('team', '00000000-0000-0000-0000-0000000000c6', 'ciao @oper6b',
            array['00000000-0000-0000-0000-0000000000d6']::uuid[])$$,
  'menzione: messaggio con menzione inserito');

-- La notifica del menzionato è visibile SOLO a lui (RLS notifiche): impersono d6
select pg_temp.impersona('00000000-0000-0000-0000-0000000000d6');
select results_eq(
  $$select count(*)::int from notifiche
    where destinatario_id='00000000-0000-0000-0000-0000000000d6' and titolo like '%ti ha menzionato%'$$,
  array[1], 'menzione: notifica creata e visibile al menzionato');

-- 8. Un altro utente NON può cancellare il commento altrui (0 righe)
select results_eq(
  $$with d as (delete from messaggi where entita='organizzazioni' returning 1) select count(*)::int from d$$,
  array[0], 'delete messaggio altrui = 0 righe (solo autore o admin)');

select * from finish();
rollback;
