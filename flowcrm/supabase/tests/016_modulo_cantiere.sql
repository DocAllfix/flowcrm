-- ═══════════════════════════════════════════════════════════════════
-- Gate MODULO CANTIERE — codice auto, SAL riservati con numerazione
-- progressiva, economia invisibile all'operatore, notifica incidenti,
-- presenze uniche, derivati di stato, licenza. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'admin.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000b', 'manager.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000c', 'operatore.test@flowcrm.local')
on conflict (id) do nothing;

insert into user_profiles (id, nome, cognome, ruolo)
values
  ('00000000-0000-0000-0000-00000000000a', 'Anna', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', 'Marco', 'Manager', 'manager'),
  ('00000000-0000-0000-0000-00000000000c', 'Olga', 'Operatore', 'operatore')
on conflict (id) do update
  set nome = excluded.nome, cognome = excluded.cognome, ruolo = excluded.ruolo;

create or replace function pg_temp.impersona(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

create or replace function pg_temp.torna_postgres() returns void as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', null, true);
end;
$$ language plpgsql;

insert into moduli_licenze (slug, attivo) values ('cantiere', true)
on conflict (slug) do update set attivo = true;

-- ═══ 1. CREAZIONE + CODICE (operatore) ═══════════════════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');

select lives_ok(
  $$insert into cantieri (id, denominazione, importo_contrattuale, created_by)
    values ('b0000000-0000-0000-0000-000000000001', 'Cantiere pgTAP via Roma',
            800000, '00000000-0000-0000-0000-00000000000c')$$,
  'operatore: crea un cantiere'
);
select matches(
  (select codice from cantieri where id = 'b0000000-0000-0000-0000-000000000001'),
  '^CANT-\d{4}-\d{4}$',
  'codice cantiere CANT-AAAA-NNNN'
);

-- Fase con avanzamento fuori range → CHECK
select throws_ok(
  $$insert into cantiere_fasi (cantiere_id, nome, avanzamento, created_by)
    values ('b0000000-0000-0000-0000-000000000001', 'Scavi', 150,
            '00000000-0000-0000-0000-00000000000c')$$,
  '23514',
  null,
  'avanzamento fase oltre 100 rifiutato (CHECK)'
);

-- ═══ 2. SAL RISERVATI + NUMERAZIONE ══════════════════════════════

select throws_ok(
  $$insert into cantiere_sal (cantiere_id, importo, created_by)
    values ('b0000000-0000-0000-0000-000000000001', 50000,
            '00000000-0000-0000-0000-00000000000c')$$,
  '42501',
  null,
  'operatore: INSERT SAL negato'
);

select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select lives_ok(
  $$insert into cantiere_sal (cantiere_id, importo, stato, created_by)
    values ('b0000000-0000-0000-0000-000000000001', 50000, 'emesso',
            '00000000-0000-0000-0000-00000000000b')$$,
  'manager: crea SAL 1'
);
select lives_ok(
  $$insert into cantiere_sal (cantiere_id, importo, stato, created_by)
    values ('b0000000-0000-0000-0000-000000000001', 30000, 'emesso',
            '00000000-0000-0000-0000-00000000000b')$$,
  'manager: crea SAL 2'
);
select results_eq(
  $$select array_agg(numero order by numero) from cantiere_sal
    where cantiere_id = 'b0000000-0000-0000-0000-000000000001'$$,
  $$values (array[1,2])$$,
  'numerazione SAL progressiva per cantiere (1, 2)'
);

-- Costo riservato
select lives_ok(
  $$insert into cantiere_costi (cantiere_id, tipo, descrizione, importo, created_by)
    values ('b0000000-0000-0000-0000-000000000001', 'materiali', 'Cemento', 12000,
            '00000000-0000-0000-0000-00000000000b')$$,
  'manager: registra un costo'
);

-- Economia: il manager vede SAL emessi e utile maturato
select results_eq(
  $$select sal_emessi::numeric, utile_maturato::numeric from vw_cantiere_economia
    where cantiere_id = 'b0000000-0000-0000-0000-000000000001'$$,
  $$values (80000::numeric, 68000::numeric)$$,
  'manager: vw_cantiere_economia calcola SAL 80k e utile maturato 68k'
);

-- L'operatore: zero SAL, zero costi, zero righe dalla vista economia
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select results_eq(
  $$select count(*)::int from cantiere_sal$$,
  array[0],
  'operatore: SELECT SAL = 0 righe'
);
select results_eq(
  $$select count(*)::int from cantiere_costi$$,
  array[0],
  'operatore: SELECT costi = 0 righe'
);
select results_eq(
  $$select count(*)::int from vw_cantiere_economia$$,
  array[0],
  'operatore: vista economia = 0 righe'
);

-- ═══ 3. PRESENZE: una per persona per giorno ═════════════════════

select lives_ok(
  $$insert into cantiere_personale (id, cantiere_id, nominativo, ruolo, created_by)
    values ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
            'Mario Muratore', 'Operaio', '00000000-0000-0000-0000-00000000000c')$$,
  'operatore: aggiunge personale al cantiere'
);

select lives_ok(
  $$insert into cantiere_presenze (cantiere_id, personale_id, data, ore, created_by)
    values ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
            current_date, 8, '00000000-0000-0000-0000-00000000000c')$$,
  'operatore: registra la presenza di oggi'
);
select throws_ok(
  $$insert into cantiere_presenze (cantiere_id, personale_id, data, ore, created_by)
    values ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
            current_date, 4, '00000000-0000-0000-0000-00000000000c')$$,
  '23505',
  null,
  'doppia presenza stesso giorno rifiutata (UNIQUE)'
);

-- ═══ 4. SICUREZZA: incidente → notifica critical ai manager ══════

select lives_ok(
  $$insert into cantiere_eventi_sicurezza (cantiere_id, tipo, descrizione, gravita, created_by)
    values ('b0000000-0000-0000-0000-000000000001', 'infortunio',
            'Caduta da ponteggio - test pgTAP', 'critica',
            '00000000-0000-0000-0000-00000000000c')$$,
  'operatore: registra un infortunio'
);

select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select is(
  (select count(*)::int from notifiche
   where destinatario_id = '00000000-0000-0000-0000-00000000000b'
     and tipo = 'critical' and titolo like '%infortunio%'),
  1,
  'manager: notifica critical per infortunio ricevuta'
);

-- ═══ 5. STATO CHIUSO → data_chiusura ═════════════════════════════

select lives_ok(
  $$update cantieri set stato = 'chiuso' where id = 'b0000000-0000-0000-0000-000000000001'$$,
  'manager: chiude il cantiere'
);
select results_eq(
  $$select (data_chiusura is not null) from cantieri
    where id = 'b0000000-0000-0000-0000-000000000001'$$,
  array[true],
  'data_chiusura valorizzata dal trigger'
);

-- ═══ 6. LICENZA SPENTA = zero accesso ════════════════════════════

select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'cantiere';

select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select results_eq(
  $$select count(*)::int from cantieri$$,
  array[0],
  'licenza cantiere disattivata: anche l''admin vede 0 cantieri'
);

select * from finish();
rollback;
