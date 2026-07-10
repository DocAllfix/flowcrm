-- ═══════════════════════════════════════════════════════════════════
-- Gate F2 — RLS e trigger: organizzazioni, ruoli n:n, contatti, referente
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

-- Seed utenti
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin2@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'oper2@flowcrm.local');
insert into user_profiles (id, nome, ruolo) values
  ('00000000-0000-0000-0000-0000000000a1', 'Admin2', 'admin'),
  ('00000000-0000-0000-0000-0000000000c1', 'Oper2', 'operatore')
on conflict (id) do update
  set nome = excluded.nome, ruolo = excluded.ruolo;

create or replace function pg_temp.impersona(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

-- ═══ ORGANIZZAZIONI + RUOLI MULTIPLI ═════════════════════════════

-- 1. Operatore crea un'organizzazione a proprio nome
select pg_temp.impersona('00000000-0000-0000-0000-0000000000c1');
select lives_ok(
  $$insert into organizzazioni (id, ragione_sociale, citta, created_by)
    values ('00000000-0000-0000-0000-0000000000f1', 'Rossi SRL', 'Zxqcittapgtap',
            '00000000-0000-0000-0000-0000000000c1')$$,
  'operatore: crea organizzazione'
);

-- 2. NON può spacciarla come creata da un altro
select throws_ok(
  $$insert into organizzazioni (ragione_sociale, created_by)
    values ('Fake', '00000000-0000-0000-0000-0000000000a1')$$,
  '42501', null,
  'operatore: spoofing created_by negato'
);

-- 3. Stessa org con DUE ruoli (cliente + partner) — cuore della fase
select lives_ok(
  $$insert into organizzazioni_ruoli (organizzazione_id, ruolo) values
    ('00000000-0000-0000-0000-0000000000f1', 'cliente'),
    ('00000000-0000-0000-0000-0000000000f1', 'partner')$$,
  'org: doppio ruolo cliente+partner'
);

-- 4. Compare in entrambi i filtri per ruolo
select results_eq(
  $$select count(distinct organizzazione_id)::int from organizzazioni_ruoli
    where organizzazione_id='00000000-0000-0000-0000-0000000000f1'
      and ruolo in ('cliente','partner')$$,
  array[1],
  'org: raggiungibile da filtro cliente E partner'
);

-- 5. Ruolo duplicato rifiutato dalla PK
select throws_ok(
  $$insert into organizzazioni_ruoli (organizzazione_id, ruolo)
    values ('00000000-0000-0000-0000-0000000000f1', 'cliente')$$,
  '23505', null,
  'org: ruolo duplicato bloccato dalla PK'
);

-- 6. CHECK valutazione fornitore fuori range
select throws_ok(
  $$insert into organizzazioni (ragione_sociale, valutazione_fornitore, created_by)
    values ('X', 9, '00000000-0000-0000-0000-0000000000c1')$$,
  '23514', null,
  'org: valutazione fornitore fuori 1..5 bloccata'
);

-- 7. Operatore NON cancella (solo admin)
select results_eq(
  $$with d as (delete from organizzazioni where id='00000000-0000-0000-0000-0000000000f1' returning 1) select count(*)::int from d$$,
  array[0],
  'operatore: DELETE organizzazione = 0 righe'
);

-- ═══ CONTATTI + REFERENTE ════════════════════════════════════════

-- 8. Contatto legato all'organizzazione
select lives_ok(
  $$insert into contatti (id, nome, cognome, organizzazione_id, created_by)
    values ('00000000-0000-0000-0000-0000000000e1', 'Mario', 'Rossi',
            '00000000-0000-0000-0000-0000000000f1',
            '00000000-0000-0000-0000-0000000000c1')$$,
  'contatti: creazione legata a org'
);

-- 9. Referente principale valido (contatto della stessa org)
select lives_ok(
  $$update organizzazioni set referente_principale_id='00000000-0000-0000-0000-0000000000e1'
    where id='00000000-0000-0000-0000-0000000000f1'$$,
  'org: referente principale coerente accettato'
);

-- 10. Referente di un'ALTRA org rifiutato dal trigger
insert into organizzazioni (id, ragione_sociale, created_by) values
  ('00000000-0000-0000-0000-0000000000f2', 'Altra SPA', '00000000-0000-0000-0000-0000000000c1');
insert into contatti (id, nome, organizzazione_id, created_by) values
  ('00000000-0000-0000-0000-0000000000e2', 'Estraneo',
   '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1');
select throws_like(
  $$update organizzazioni set referente_principale_id='00000000-0000-0000-0000-0000000000e2'
    where id='00000000-0000-0000-0000-0000000000f1'$$,
  '%referente principale deve essere un contatto di questa organizzazione%',
  'org: referente di altra org BLOCCATO'
);

-- ═══ RICERCA GLOBALE + AUDIT ═════════════════════════════════════

-- 11. cmd+K trova l'organizzazione per città
select results_eq(
  $$select count(*)::int from ricerca_globale('Zxqcittapgtap') where tipo='organizzazione'$$,
  array[1],
  'ricerca_globale: trova org per città'
);

-- 12. L'audit ha registrato le insert delle organizzazioni
select pg_temp.impersona('00000000-0000-0000-0000-0000000000a1');
select cmp_ok(
  (select count(*)::int from audit_log where entita='organizzazioni' and azione='insert'),
  '>=', 2,
  'audit_log: registrate le insert organizzazioni'
);

select * from finish();
rollback;
