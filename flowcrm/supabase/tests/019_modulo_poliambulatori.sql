-- ═══════════════════════════════════════════════════════════════════
-- Gate MODULO POLIAMBULATORI — RLS clinica GDPR (segreteria e manager
-- NON leggono fascicolo/visite/referti; i medici sì), anti doppia
-- prenotazione, referto congelato dopo validazione, lotto → scadenza,
-- licenza. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'admin.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000b', 'manager.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000c', 'operatore.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000e', 'medico.test@flowcrm.local')
on conflict (id) do nothing;

insert into user_profiles (id, nome, cognome, ruolo)
values
  ('00000000-0000-0000-0000-00000000000a', 'Anna', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', 'Marco', 'Manager', 'manager'),
  ('00000000-0000-0000-0000-00000000000c', 'Olga', 'Operatore', 'operatore'),
  ('00000000-0000-0000-0000-00000000000e', 'Dora', 'Medico', 'operatore')
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

insert into moduli_licenze (slug, attivo) values ('poliambulatori', true)
on conflict (slug) do update set attivo = true;

-- Seed: medico collegato all'utente e, paziente, prestazione
insert into professionisti (id, nome, cognome, specializzazione, user_id, created_by) values
  ('f1000000-0000-0000-0000-000000000001', 'Dora', 'Medico', 'Cardiologia',
   '00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000a');

-- ═══ 1. PAZIENTE: la segreteria gestisce l'anagrafica ════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select lives_ok(
  $$insert into pazienti (id, nome, cognome, codice_fiscale, created_by)
    values ('f2000000-0000-0000-0000-000000000001', 'Paola', 'Paziente',
            'PZNPLA80A41H501X', '00000000-0000-0000-0000-00000000000c')$$,
  'segreteria: crea il paziente (anagrafica)'
);
select matches(
  (select codice from pazienti where id = 'f2000000-0000-0000-0000-000000000001'),
  '^PAZ-\d{4}-\d{4}$',
  'codice paziente PAZ-AAAA-NNNN'
);
select lives_ok(
  $$insert into pazienti_consensi (paziente_id, tipo, created_by)
    values ('f2000000-0000-0000-0000-000000000001', 'privacy',
            '00000000-0000-0000-0000-00000000000c')$$,
  'segreteria: registra il consenso privacy'
);

-- ═══ 2. RLS CLINICA: segreteria e manager fuori ══════════════════

select throws_ok(
  $$insert into pazienti_condizioni (paziente_id, tipo, descrizione, created_by)
    values ('f2000000-0000-0000-0000-000000000001', 'allergia', 'Penicillina',
            '00000000-0000-0000-0000-00000000000c')$$,
  '42501',
  null,
  'segreteria: INSERT nel fascicolo clinico NEGATO'
);

-- Il medico scrive nel fascicolo
select pg_temp.impersona('00000000-0000-0000-0000-00000000000e');
select lives_ok(
  $$insert into pazienti_condizioni (paziente_id, tipo, descrizione, created_by)
    values ('f2000000-0000-0000-0000-000000000001', 'allergia', 'Penicillina',
            '00000000-0000-0000-0000-00000000000e')$$,
  'medico: scrive nel fascicolo sanitario'
);
select lives_ok(
  $$insert into visite (id, paziente_id, professionista_id, motivo, diagnosi, created_by)
    values ('f3000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001',
            'f1000000-0000-0000-0000-000000000001', 'Controllo', 'Nulla da rilevare',
            '00000000-0000-0000-0000-00000000000e')$$,
  'medico: registra la visita in cartella'
);

-- Segreteria E manager: zero righe cliniche
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select results_eq(
  $$select count(*)::int from pazienti_condizioni$$,
  array[0],
  'segreteria: fascicolo clinico = 0 righe'
);
select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select results_eq(
  $$select count(*)::int from visite$$,
  array[0],
  'manager: cartelle cliniche = 0 righe (GDPR: nemmeno la direzione)'
);
-- Ma il manager vede l'anagrafica e l'agenda
select results_eq(
  $$select count(*)::int from pazienti where id = 'f2000000-0000-0000-0000-000000000001'$$,
  array[1],
  'manager: anagrafica paziente visibile'
);

-- ═══ 3. AGENDA: anti doppia prenotazione ═════════════════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select lives_ok(
  $$insert into appuntamenti (paziente_id, professionista_id, inizio, durata_minuti, created_by)
    values ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
            date_trunc('day', now()) + interval '10 hours', 30,
            '00000000-0000-0000-0000-00000000000c')$$,
  'segreteria: prenota alle 10:00'
);
select throws_like(
  $$insert into appuntamenti (paziente_id, professionista_id, inizio, durata_minuti, created_by)
    values ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
            date_trunc('day', now()) + interval '10 hours 15 minutes', 30,
            '00000000-0000-0000-0000-00000000000c')$$,
  '%già un appuntamento%',
  'doppia prenotazione sovrapposta BLOCCATA'
);
select lives_ok(
  $$insert into appuntamenti (paziente_id, professionista_id, inizio, durata_minuti, created_by)
    values ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
            date_trunc('day', now()) + interval '10 hours 30 minutes', 30,
            '00000000-0000-0000-0000-00000000000c')$$,
  'slot adiacente alle 10:30 consentito'
);

-- ═══ 4. REFERTI: validazione e contenuto congelato ═══════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000e');
select lives_ok(
  $$insert into referti (id, visita_id, paziente_id, professionista_id, titolo, contenuto, stato, created_by)
    values ('f4000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001',
            'f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
            'Referto ECG', 'Tracciato nella norma.', 'da_validare',
            '00000000-0000-0000-0000-00000000000e')$$,
  'medico: crea il referto da validare'
);
-- Non si invia senza validazione
select throws_like(
  $$update referti set stato = 'inviato' where id = 'f4000000-0000-0000-0000-000000000001'$$,
  '%solo un referto validato%',
  'invio senza validazione BLOCCATO'
);
select lives_ok(
  $$update referti set stato = 'validato' where id = 'f4000000-0000-0000-0000-000000000001'$$,
  'medico: valida il referto'
);
select results_eq(
  $$select (validato_at is not null) from referti where id = 'f4000000-0000-0000-0000-000000000001'$$,
  array[true],
  'validato_at valorizzato dal trigger'
);
-- Contenuto congelato
select throws_like(
  $$update referti set contenuto = 'Manomesso' where id = 'f4000000-0000-0000-0000-000000000001'$$,
  '%non è modificabile%',
  'referto validato: contenuto CONGELATO'
);

-- ═══ 5. MAGAZZINO: lotto in scadenza → scadenzario ═══════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select lives_ok(
  $$insert into magazzino_sanitario (id, descrizione, tipo, lotto, scadenza, quantita, created_by)
    values ('f5000000-0000-0000-0000-000000000001', 'Guanti nitrile M', 'consumo',
            'L2026-07', current_date + 25, 40, '00000000-0000-0000-0000-00000000000c')$$,
  'segreteria: carica un lotto con scadenza'
);
select results_eq(
  $$select count(*)::int from scadenze_moduli
    where entita = 'magazzino_sanitario'
      and entita_id = 'f5000000-0000-0000-0000-000000000001' and stato = 'aperta'$$,
  array[1],
  'lotto → scadenza automatica sul scadenzario'
);

-- ═══ 6. LICENZA SPENTA ═══════════════════════════════════════════

select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'poliambulatori';

select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select results_eq(
  $$select count(*)::int from pazienti$$,
  array[0],
  'licenza poliambulatori disattivata: anche l''admin vede 0 pazienti'
);

select * from finish();
rollback;
