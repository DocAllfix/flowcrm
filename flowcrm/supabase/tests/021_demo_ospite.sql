-- ═══════════════════════════════════════════════════════════════════
-- Gate DEMO PUBBLICA — l'ospite prova davvero (inserisce e modifica le
-- tabelle ripristinate ogni notte), ma non cancella, non tocca il resto,
-- non carica file. Manutentore, istanza normale e sessioni non-API
-- restano come prima. ROLLBACK finale.
--
-- Come per le credenziali (020), la decisione si verifica sulla funzione
-- pura, passando sessione e operazione come argomenti.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-0000000000e1', 'ospite.test@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'utente.test@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000e3', 'manutentore.test@flowcrm.local')
on conflict (id) do nothing;

insert into user_profiles (id, nome, cognome, ruolo, manutentore, ospite_demo)
values
  ('00000000-0000-0000-0000-0000000000e1', 'Ospite', 'Demo', 'admin', false, true),
  ('00000000-0000-0000-0000-0000000000e2', 'Ugo', 'Utente', 'admin', false, false),
  ('00000000-0000-0000-0000-0000000000e3', 'Mara', 'Manutentrice', 'admin', true, false)
on conflict (id) do update
  set nome = excluded.nome, cognome = excluded.cognome, ruolo = excluded.ruolo,
      manutentore = excluded.manutentore, ospite_demo = excluded.ospite_demo;

select has_column('public', 'user_profiles', 'ospite_demo', 'user_profiles ha il flag ospite_demo');

update impostazioni_istanza set sola_lettura = true where id;

-- ── L'ospite prova il CRM ──
select is(scrittura_demo_rifiutata('00000000-0000-0000-0000-0000000000e1', 'authenticator', 'UPDATE', 'deals'),
  null, 'ospite: sposta e modifica le trattative');
select is(scrittura_demo_rifiutata('00000000-0000-0000-0000-0000000000e1', 'authenticator', 'INSERT', 'fatture'),
  null, 'ospite: emette fatture');
select is(scrittura_demo_rifiutata('00000000-0000-0000-0000-0000000000e1', 'authenticator', 'DELETE', 'organizzazioni_ruoli'),
  null, 'ospite: i ruoli delle aziende si riscrivono a ogni salvataggio');

-- ── …ma non cancella e non esce dal perimetro ripristinato ──
select is(scrittura_demo_rifiutata('00000000-0000-0000-0000-0000000000e1', 'authenticator', 'DELETE', 'deals'),
  'Nella demo non si cancella: ogni notte i dati tornano come nuovi.', 'ospite: non cancella');
select is(scrittura_demo_rifiutata('00000000-0000-0000-0000-0000000000e1', 'authenticator', 'INSERT', 'cantieri'),
  'Nella demo si lavora sul cantiere di esempio: nuovi cantieri nella versione completa.', 'ospite: non crea cantieri');
select is(scrittura_demo_rifiutata('00000000-0000-0000-0000-0000000000e1', 'authenticator', 'UPDATE', 'gare'),
  'In questa demo si prova il CRM: questa parte si guarda soltanto.', 'ospite: i moduli non ripristinati restano in sola lettura');
select is(scrittura_demo_rifiutata('00000000-0000-0000-0000-0000000000e1', 'authenticator', 'UPDATE', 'user_profiles'),
  'In questa demo si prova il CRM: questa parte si guarda soltanto.', 'ospite: non tocca i profili utente');
select is(scrittura_demo_rifiutata('00000000-0000-0000-0000-0000000000e1', 'authenticator', 'UPDATE', 'pipeline_stages'),
  'In questa demo si prova il CRM: questa parte si guarda soltanto.', 'ospite: non cambia le fasi della pipeline');

-- ── Gli altri, come prima ──
select is(scrittura_demo_rifiutata('00000000-0000-0000-0000-0000000000e2', 'authenticator', 'UPDATE', 'deals'),
  'Funzione disponibile solo nella versione completa. Contatta per attivarla.', 'utente normale: sola lettura invariata');
select is(scrittura_demo_rifiutata('00000000-0000-0000-0000-0000000000e3', 'authenticator', 'DELETE', 'deals'),
  null, 'manutentore: scrive e cancella');
select is(scrittura_demo_rifiutata('00000000-0000-0000-0000-0000000000e1', 'postgres', 'DELETE', 'deals'),
  null, 'manutenzione da SQL: mai bloccata');

-- ── File: l'ospite non carica, il manutentore sì ──
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select ok(not scrittura_file_consentita(), 'sola lettura: l''ospite non carica né cancella file');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select ok(scrittura_file_consentita(), 'sola lettura: il manutentore carica file');

-- ── Credenziali: sorvegliati anche metadati e telefono ──
select ok(pg_get_functiondef('blocca_credenziali_demo_utenti()'::regprocedure) like '%raw_user_meta_data%'
          and pg_get_functiondef('blocca_credenziali_demo_utenti()'::regprocedure) like '%phone%',
  'blocco credenziali: sorveglia anche metadati e telefono');

-- ── Istanza normale: nessun blocco ──
update impostazioni_istanza set sola_lettura = false where id;
select is(scrittura_demo_rifiutata('00000000-0000-0000-0000-0000000000e1', 'authenticator', 'DELETE', 'deals'),
  null, 'istanza normale: nessuno è bloccato');

select * from finish();
rollback;
