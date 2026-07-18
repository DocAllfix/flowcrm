-- ═══════════════════════════════════════════════════════════════════
-- Gate MODULI Fase 0 — Fondamenta: licenze, codici, scadenzario generico,
-- workflow approvazioni. Transazione con ROLLBACK finale: zero tracce.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

-- ── Seed utenti test (pattern F1) ────────────────────────────────
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

-- ── Seed licenze (come farebbe l'installer, via ruolo privilegiato) ─
insert into moduli_licenze (slug, attivo) values
  ('test_mod', true),
  ('test_mod_off', false);

-- ═══ 1. LICENZE ══════════════════════════════════════════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');

select ok(modulo_licenziato('test_mod'),
  'modulo licenziato attivo → true');
select ok(not modulo_licenziato('test_mod_off'),
  'modulo con licenza disattivata → false');
select ok(not modulo_licenziato('inesistente'),
  'modulo mai licenziato → false');

-- L'operatore vede l'elenco licenze (serve al frontend) ma non lo scrive.
select lives_ok(
  $$select count(*) from moduli_licenze$$,
  'operatore: SELECT su moduli_licenze consentito'
);
select results_eq(
  $$with u as (update moduli_licenze set attivo = false where slug = 'test_mod' returning 1)
    select count(*)::int from u$$,
  array[0],
  'operatore: UPDATE licenze = 0 righe (solo service_role)'
);
select throws_ok(
  $$insert into moduli_licenze (slug) values ('hack')$$,
  '42501',
  null,
  'operatore: INSERT licenza negato'
);

-- ═══ 2. CODICI PROGRESSIVI ═══════════════════════════════════════

select pg_temp.torna_postgres();

select matches(
  genera_codice('TSTX'),
  '^TSTX-\d{4}-0001$',
  'genera_codice: primo codice = PREFISSO-AAAA-0001'
);
select matches(
  genera_codice('TSTX'),
  '^TSTX-\d{4}-0002$',
  'genera_codice: secondo codice progressivo contiguo'
);

-- ═══ 3. SCADENZARIO GENERICO ═════════════════════════════════════

-- Operatore crea una scadenza su modulo licenziato
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select lives_ok(
  $$insert into scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, created_by)
    values ('test_mod', 'entita_test', '00000000-0000-0000-0000-0000000000e1',
            'DURC', 'Scadenza test pgTAP', current_date, '00000000-0000-0000-0000-00000000000c')$$,
  'operatore: INSERT scadenza su modulo licenziato'
);

-- Su modulo NON licenziato la WITH CHECK blocca
select throws_ok(
  $$insert into scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, created_by)
    values ('test_mod_off', 'entita_test', '00000000-0000-0000-0000-0000000000e2',
            'DURC', 'Non deve entrare', current_date, '00000000-0000-0000-0000-00000000000c')$$,
  '42501',
  null,
  'operatore: INSERT scadenza su modulo NON licenziato bloccato'
);

-- Scadenza riservata (solo_manager) creata dall'admin
select pg_temp.torna_postgres();
insert into scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, solo_manager, created_by)
values ('test_mod', 'entita_test', '00000000-0000-0000-0000-0000000000e3',
        'cauzione', 'Scadenza economica riservata', current_date + 5, true,
        '00000000-0000-0000-0000-00000000000a');

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select results_eq(
  $$select count(*)::int from scadenze_moduli where solo_manager$$,
  array[0],
  'operatore: le scadenze solo_manager sono invisibili'
);

select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select results_eq(
  $$select count(*)::int from scadenze_moduli where solo_manager
      and entita_id = '00000000-0000-0000-0000-0000000000e3'$$,
  array[1],
  'manager: vede la scadenza riservata'
);

-- completata_at derivato
select lives_ok(
  $$update scadenze_moduli set stato = 'completata'
    where entita_id = '00000000-0000-0000-0000-0000000000e1'$$,
  'manager: segna completata una scadenza'
);
select results_eq(
  $$select (completata_at is not null) from scadenze_moduli
    where entita_id = '00000000-0000-0000-0000-0000000000e1'$$,
  array[true],
  'completata_at valorizzato dal trigger'
);

-- ═══ 4. NOTIFICHE SCADENZE (idempotenza) ═════════════════════════

select pg_temp.torna_postgres();

-- La scadenza e3 (tra 5 giorni) non matcha soglie; ne creo una che scade oggi
insert into scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, created_by)
values ('test_mod', 'entita_test', '00000000-0000-0000-0000-0000000000e4',
        'revisione', 'Scade oggi test pgTAP', current_date,
        '00000000-0000-0000-0000-00000000000a');

select ok(
  processa_scadenze_moduli() >= 2,
  'processa_scadenze_moduli: crea notifiche (admin+manager) per la scadenza di oggi'
);
select is(
  (select count(*)::int from notifiche
   where destinatario_id = '00000000-0000-0000-0000-00000000000b'
     and titolo like '%revisione%'),
  1,
  'manager: ricevuta 1 notifica per la scadenza revisione'
);
select is(
  processa_scadenze_moduli(),
  0,
  'processa_scadenze_moduli: rieseguita → 0 nuove notifiche (idempotente)'
);

-- ═══ 5. APPROVAZIONI ═════════════════════════════════════════════

-- L'operatore chiede un'approvazione
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select lives_ok(
  $$insert into approvazioni (modulo, entita, entita_id, tipo_richiesta, descrizione, richiedente_id)
    values ('test_mod', 'entita_test', '00000000-0000-0000-0000-0000000000f1',
            'sconto', 'Sconto 20% oltre soglia', '00000000-0000-0000-0000-00000000000c')$$,
  'operatore: crea una richiesta di approvazione'
);

-- L'operatore NON può auto-approvarsi
select throws_like(
  $$update approvazioni set stato = 'approvata'
    where entita_id = '00000000-0000-0000-0000-0000000000f1'$$,
  '%Solo admin o manager%',
  'operatore: auto-approvazione bloccata'
);

-- Il manager approva; approvatore_id/decisa_at derivati dal trigger
select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select lives_ok(
  $$update approvazioni set stato = 'approvata', motivazione = 'ok'
    where entita_id = '00000000-0000-0000-0000-0000000000f1'$$,
  'manager: approva la richiesta'
);
select results_eq(
  $$select approvatore_id from approvazioni
    where entita_id = '00000000-0000-0000-0000-0000000000f1'$$,
  array['00000000-0000-0000-0000-00000000000b'::uuid],
  'approvatore_id = chi ha deciso (non falsificabile)'
);

-- Una richiesta decisa è immutabile
select throws_like(
  $$update approvazioni set stato = 'rifiutata'
    where entita_id = '00000000-0000-0000-0000-0000000000f1'$$,
  '%già decisa%',
  'richiesta già decisa non modificabile'
);

-- Il richiedente ha ricevuto la notifica di esito
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is(
  (select count(*)::int from notifiche
   where destinatario_id = '00000000-0000-0000-0000-00000000000c'
     and titolo = 'Richiesta approvata'),
  1,
  'richiedente: notifica di approvazione ricevuta'
);

select * from finish();
rollback;
