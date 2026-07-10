-- ═══════════════════════════════════════════════════════════════════
-- Gate F1 — Matrice RLS: user_profiles, notifiche, audit_log, allegati
-- Esegue in transazione con ROLLBACK finale: zero tracce sul DB.
-- Pattern: seed utenti test → impersonificazione via jwt.claims →
-- assert pgTAP per ogni combinazione ruolo × operazione critica.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

-- ── Seed utenti di test ──────────────────────────────────────────
insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'admin.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000b', 'manager.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000c', 'operatore.test@flowcrm.local');

-- Il trigger handle_new_user può aver già creato i profili come 'operatore':
-- ON CONFLICT garantisce il ruolo corretto in entrambi i casi.
insert into user_profiles (id, nome, cognome, ruolo)
values
  ('00000000-0000-0000-0000-00000000000a', 'Anna', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', 'Marco', 'Manager', 'manager'),
  ('00000000-0000-0000-0000-00000000000c', 'Olga', 'Operatore', 'operatore')
on conflict (id) do update
  set nome = excluded.nome, cognome = excluded.cognome, ruolo = excluded.ruolo;

-- Helper impersonificazione
create or replace function pg_temp.impersona(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

-- ═══ USER_PROFILES ═══════════════════════════════════════════════

-- 1. L'operatore vede i profili del team (serve per assegnazioni/chat).
-- Conta solo i 3 seed del test: il DB può contenere utenti reali.
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select results_eq(
  $$select count(*)::int from user_profiles where id in (
      '00000000-0000-0000-0000-00000000000a',
      '00000000-0000-0000-0000-00000000000b',
      '00000000-0000-0000-0000-00000000000c')$$,
  array[3],
  'operatore: SELECT sui profili del team'
);

-- 2. L'operatore NON può auto-promuoversi (anti privilege-escalation)
select throws_like(
  $$update user_profiles set ruolo = 'admin' where id = '00000000-0000-0000-0000-00000000000c'$$,
  '%Solo un admin può modificare il ruolo%',
  'operatore: auto-promozione a admin BLOCCATA'
);

-- 3. L'operatore NON può riattivarsi/disattivarsi da solo
select throws_like(
  $$update user_profiles set attivo = false where id = '00000000-0000-0000-0000-00000000000c'$$,
  '%Solo un admin può attivare/disattivare%',
  'operatore: modifica flag attivo BLOCCATA'
);

-- 4. L'operatore può aggiornare i propri dati anagrafici
select lives_ok(
  $$update user_profiles set nome = 'Olga Aggiornata' where id = '00000000-0000-0000-0000-00000000000c'$$,
  'operatore: update del proprio nome consentito'
);

-- 5. L'operatore NON tocca i profili altrui (0 righe aggiornate)
select results_eq(
  $$with u as (update user_profiles set nome = 'Hack' where id = '00000000-0000-0000-0000-00000000000a' returning 1) select count(*)::int from u$$,
  array[0],
  'operatore: update profilo altrui = 0 righe'
);

-- 6. L'operatore NON può creare profili
select throws_ok(
  $$insert into user_profiles (id, nome, ruolo) values ('00000000-0000-0000-0000-00000000000c', 'X', 'operatore')$$,
  '42501',
  null,
  'operatore: INSERT profili negato dalla RLS'
);

-- 7. L'admin può cambiare il ruolo altrui
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$update user_profiles set ruolo = 'manager' where id = '00000000-0000-0000-0000-00000000000c'$$,
  'admin: cambio ruolo altrui consentito'
);
-- ripristino per i test successivi
update user_profiles set ruolo = 'operatore' where id = '00000000-0000-0000-0000-00000000000c';

-- ═══ NOTIFICHE ═══════════════════════════════════════════════════

-- 8. INSERT diretto negato a chiunque (si passa SOLO da crea_notifica)
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$insert into notifiche (destinatario_id, titolo, messaggio) values ('00000000-0000-0000-0000-00000000000a', 'x', 'y')$$,
  '42501',
  null,
  'notifiche: INSERT diretto negato anche ad admin'
);

-- 9. crea_notifica NON è chiamabile direttamente da authenticated (blindatura:
--    la usano solo i trigger SECURITY DEFINER e il cron, come owner/service_role).
select throws_ok(
  $$select crea_notifica('00000000-0000-0000-0000-00000000000c', 'info', 'x', 'y')$$,
  '42501',
  null,
  'notifiche: crea_notifica NEGATA a authenticated (solo trigger/cron)'
);

-- La notifica di test la creiamo come fa il sistema: da owner (come i trigger).
reset role;
select crea_notifica('00000000-0000-0000-0000-00000000000c', 'info', 'Benvenuta', 'Notifica di test');

-- 10. Il destinatario vede la propria notifica
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select results_eq(
  'select count(*)::int from notifiche',
  array[1],
  'notifiche: il destinatario la vede'
);

-- 11. Un altro utente NON la vede (nemmeno il manager)
select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select results_eq(
  'select count(*)::int from notifiche',
  array[0],
  'notifiche: invisibile a chi non è destinatario'
);

-- 12. Il destinatario può marcarla come letta
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select lives_ok(
  $$update notifiche set letta = true, letta_at = now() where destinatario_id = '00000000-0000-0000-0000-00000000000c'$$,
  'notifiche: marcatura lettura consentita'
);

-- 13. Il destinatario NON può alterare il contenuto
select throws_like(
  $$update notifiche set messaggio = 'alterato' where destinatario_id = '00000000-0000-0000-0000-00000000000c'$$,
  '%può solo essere marcata come letta%',
  'notifiche: alterazione contenuto BLOCCATA'
);

-- ═══ AUDIT_LOG ═══════════════════════════════════════════════════

-- 14. INSERT diretto negato (scrive solo il trigger SECURITY DEFINER)
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$insert into audit_log (entita, entita_id, azione) values ('x', gen_random_uuid(), 'insert')$$,
  '42501',
  null,
  'audit_log: INSERT diretto negato anche ad admin'
);

-- 15. UPDATE: nessuna policy → 0 righe toccabili (log immutabile)
select results_eq(
  $$with u as (update audit_log set azione = 'x' returning 1) select count(*)::int from u$$,
  array[0],
  'audit_log: UPDATE = 0 righe (immutabile)'
);

-- ═══ ALLEGATI ════════════════════════════════════════════════════

-- 16. L'operatore carica un allegato a proprio nome
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select lives_ok(
  $$insert into allegati (entita, entita_id, nome_file, nome_originale, storage_path, caricato_da)
    values ('organizzazione', gen_random_uuid(), 'doc.pdf', 'doc.pdf',
            '00000000-0000-0000-0000-00000000000c/doc.pdf',
            '00000000-0000-0000-0000-00000000000c')$$,
  'allegati: upload a proprio nome consentito'
);

-- 17. NON può attribuire l'upload a qualcun altro
select throws_ok(
  $$insert into allegati (entita, entita_id, nome_file, nome_originale, storage_path, caricato_da)
    values ('organizzazione', gen_random_uuid(), 'x.pdf', 'x.pdf', 'fake/x.pdf',
            '00000000-0000-0000-0000-00000000000a')$$,
  '42501',
  null,
  'allegati: spoofing caricato_da negato'
);

-- 18. Il manager NON cancella l'allegato dell'operatore (0 righe)
select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select results_eq(
  $$with d as (delete from allegati where nome_file = 'doc.pdf' returning 1) select count(*)::int from d$$,
  array[0],
  'allegati: delete altrui da manager = 0 righe'
);

-- 19. L'admin invece può cancellarlo
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select results_eq(
  $$with d as (delete from allegati where nome_file = 'doc.pdf' returning 1) select count(*)::int from d$$,
  array[1],
  'allegati: delete da admin consentito'
);

select * from finish();

rollback;
