-- ═══════════════════════════════════════════════════════════════════
-- Gate MODULO GARE — codice auto, RLS con licenza, offerta economica
-- riservata, scadenze automatiche, derivati di stato. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- Seed utenti (pattern condiviso)
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

-- Garantisce la licenza 'gare' attiva per il test (in demo c'è già)
insert into moduli_licenze (slug, attivo) values ('gare', true)
on conflict (slug) do update set attivo = true;

-- ═══ 1. CODICE AUTOMATICO + CREAZIONE (operatore) ════════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');

select lives_ok(
  $$insert into gare (id, titolo, importo_base, termine_presentazione, created_by)
    values ('a0000000-0000-0000-0000-000000000001', 'Riqualificazione piazza pgTAP',
            500000, now() + interval '10 days', '00000000-0000-0000-0000-00000000000c')$$,
  'operatore: crea una gara (modulo licenziato)'
);

select matches(
  (select codice from gare where id = 'a0000000-0000-0000-0000-000000000001'),
  '^GARA-\d{4}-\d{4}$',
  'codice gara auto-generato GARA-AAAA-NNNN'
);

select results_eq(
  $$select stato::text from gare where id = 'a0000000-0000-0000-0000-000000000001'$$,
  array['in_analisi'],
  'stato iniziale = in_analisi'
);

-- ═══ 2. SCADENZE AUTOMATICHE dal termine di presentazione ════════

select results_eq(
  $$select count(*)::int from scadenze_moduli
    where entita = 'gare' and entita_id = 'a0000000-0000-0000-0000-000000000001'
      and tipo = 'Termine presentazione offerta' and stato = 'aperta'$$,
  array[1],
  'termine presentazione → scadenza automatica creata'
);

-- Lo spostamento del termine NON duplica: resta UNA scadenza aperta
select lives_ok(
  $$update gare set termine_presentazione = now() + interval '20 days'
    where id = 'a0000000-0000-0000-0000-000000000001'$$,
  'operatore: sposta il termine di presentazione'
);
select results_eq(
  $$select count(*)::int from scadenze_moduli
    where entita = 'gare' and entita_id = 'a0000000-0000-0000-0000-000000000001'
      and tipo = 'Termine presentazione offerta' and stato = 'aperta'$$,
  array[1],
  'termine spostato → ancora una sola scadenza aperta (sync, no duplicati)'
);

-- ═══ 3. OFFERTA ECONOMICA riservata ══════════════════════════════

-- L'operatore non può inserire l'offerta economica
select throws_ok(
  $$insert into gare_offerte_economiche (gara_id, ribasso_percentuale, marginalita_percentuale, created_by)
    values ('a0000000-0000-0000-0000-000000000001', 12.5, 18, '00000000-0000-0000-0000-00000000000c')$$,
  '42501',
  null,
  'operatore: INSERT offerta economica negato'
);

-- Il manager sì
select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select lives_ok(
  $$insert into gare_offerte_economiche (gara_id, ribasso_percentuale, marginalita_percentuale, created_by)
    values ('a0000000-0000-0000-0000-000000000001', 12.5, 18, '00000000-0000-0000-0000-00000000000b')$$,
  'manager: INSERT offerta economica consentito'
);

-- L'operatore non la legge (0 righe)
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select results_eq(
  $$select count(*)::int from gare_offerte_economiche
    where gara_id = 'a0000000-0000-0000-0000-000000000001'$$,
  array[0],
  'operatore: SELECT offerta economica = 0 righe'
);

-- ═══ 4. CAUZIONE → scadenza riservata automatica ═════════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select lives_ok(
  $$insert into gare_cauzioni (id, gara_id, tipo, importo, data_scadenza, created_by)
    values ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
            'provvisoria', 10000, current_date + 60, '00000000-0000-0000-0000-00000000000b')$$,
  'manager: registra una cauzione'
);
select results_eq(
  $$select solo_manager from scadenze_moduli
    where entita = 'gare_cauzioni' and entita_id = 'c0000000-0000-0000-0000-000000000001'
      and stato = 'aperta'$$,
  array[true],
  'cauzione → scadenza automatica creata e riservata ai manager'
);

-- L'operatore non vede la scadenza della cauzione (solo_manager)
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select results_eq(
  $$select count(*)::int from scadenze_moduli
    where entita = 'gare_cauzioni' and entita_id = 'c0000000-0000-0000-0000-000000000001'$$,
  array[0],
  'operatore: scadenza cauzione invisibile'
);

-- ═══ 5. DERIVATI DI STATO ════════════════════════════════════════

select lives_ok(
  $$update gare set stato = 'presentata' where id = 'a0000000-0000-0000-0000-000000000001'$$,
  'operatore: gara → presentata'
);
select results_eq(
  $$select (presentata_at is not null) from gare where id = 'a0000000-0000-0000-0000-000000000001'$$,
  array[true],
  'presentata_at valorizzato dal trigger'
);

select lives_ok(
  $$update gare set stato = 'aggiudicata' where id = 'a0000000-0000-0000-0000-000000000001'$$,
  'operatore: gara → aggiudicata'
);
select results_eq(
  $$select (esito_at is not null) from gare where id = 'a0000000-0000-0000-0000-000000000001'$$,
  array[true],
  'esito_at valorizzato dal trigger'
);

-- ═══ 6. DELETE solo admin ════════════════════════════════════════

select results_eq(
  $$with d as (delete from gare where id = 'a0000000-0000-0000-0000-000000000001' returning 1)
    select count(*)::int from d$$,
  array[0],
  'operatore: DELETE gara = 0 righe'
);

-- ═══ 7. LICENZA SPENTA = zero accesso anche per admin ════════════

select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'gare';

select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select results_eq(
  $$select count(*)::int from gare$$,
  array[0],
  'licenza gare disattivata: anche l''admin vede 0 gare (enforcement DB)'
);

select * from finish();
rollback;
