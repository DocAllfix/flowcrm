-- ═══════════════════════════════════════════════════════════════════
-- Gate CREDENZIALI DEMO (GUASTI G-36) — con l'istanza in sola lettura,
-- GoTrue non può cambiare password/email né aggiungere un secondo
-- fattore a chi non è manutentore. La manutenzione da SQL resta libera,
-- e un normale accesso (last_sign_in_at) passa sempre. ROLLBACK finale.
--
-- Il ramo «GoTrue» si verifica sulla funzione pura, passando la sessione
-- come argomento: cambiare utente di sessione dentro il test richiederebbe
-- privilegi che l'ambiente di test non garantisce.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-0000000000d1', 'demo.test@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'manutenzione.test@flowcrm.local')
on conflict (id) do nothing;

insert into user_profiles (id, nome, cognome, ruolo, manutentore)
values
  ('00000000-0000-0000-0000-0000000000d1', 'Dora', 'Demo', 'admin', false),
  ('00000000-0000-0000-0000-0000000000d2', 'Mario', 'Manutentore', 'admin', true)
on conflict (id) do update
  set nome = excluded.nome, cognome = excluded.cognome,
      ruolo = excluded.ruolo, manutentore = excluded.manutentore;

select has_trigger('auth', 'users', 'aa_blocca_credenziali_demo',
  'auth.users ha il trigger che blocca il cambio credenziali in demo');
select has_trigger('auth', 'mfa_factors', 'aa_blocca_credenziali_demo',
  'auth.mfa_factors ha il trigger che blocca il secondo fattore in demo');

update impostazioni_istanza set sola_lettura = true where id;

select ok(
  not credenziali_modificabili('00000000-0000-0000-0000-0000000000d1', 'supabase_auth_admin'),
  'sola lettura: GoTrue NON cambia le credenziali di un account demo');
select ok(
  credenziali_modificabili('00000000-0000-0000-0000-0000000000d2', 'supabase_auth_admin'),
  'sola lettura: il manutentore può cambiare le proprie credenziali');
select ok(
  credenziali_modificabili('00000000-0000-0000-0000-0000000000d1', 'postgres'),
  'sola lettura: la manutenzione da SQL non è bloccata');

select lives_ok(
  $$ update auth.users set encrypted_password = 'ripristinata-dal-manutentore'
     where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'sola lettura: il manutentore ripristina da SQL la password di un account demo');
select lives_ok(
  $$ update auth.users set last_sign_in_at = now()
     where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'un accesso normale (last_sign_in_at) passa sempre');

update impostazioni_istanza set sola_lettura = false where id;

select ok(
  credenziali_modificabili('00000000-0000-0000-0000-0000000000d1', 'supabase_auth_admin'),
  'istanza normale: ognuno cambia le proprie credenziali');
select ok(
  credenziali_modificabili(null, 'supabase_auth_admin'),
  'istanza normale: anche un utente senza profilo non è bloccato');

select * from finish();
rollback;
