-- ═══════════════════════════════════════════════════════════════════
-- FASE 1 — Sicurezza: allegati economici invisibili all'operatore,
-- created_by immutabile, protect_fattura_delete senza incassi fantasma.
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f1a01', 'adminF1@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000f1b01', 'operF1@flowcrm.local')
on conflict do nothing;
insert into user_profiles (id, nome, ruolo) values
  ('00000000-0000-0000-0000-0000000f1a01', 'AdminF1', 'admin'),
  ('00000000-0000-0000-0000-0000000f1b01', 'OperF1', 'operatore')
on conflict (id) do update set nome=excluded.nome, ruolo=excluded.ruolo;

-- Come ADMIN: crea un'org, una fattura (→ scadenza via trigger) e due allegati
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000f1a01','role','authenticated')::text, true);
set local role authenticated;

insert into organizzazioni (id, ragione_sociale, created_by)
  values ('00000000-0000-0000-0000-0000000f1e01', 'Org F1', '00000000-0000-0000-0000-0000000f1a01');
insert into fatture (numero, direzione, organizzazione_id, imponibile, totale, data, scadenza, created_by)
  values ('F1-1', 'attiva', '00000000-0000-0000-0000-0000000f1e01', 1000, 1220, current_date, current_date+30, '00000000-0000-0000-0000-0000000f1a01');
insert into allegati (entita, entita_id, nome_file, nome_originale, storage_path, caricato_da) values
  ('organizzazioni', '00000000-0000-0000-0000-0000000f1e01', 'org.pdf', 'org.pdf', '00000000-0000-0000-0000-0000000f1a01/org.pdf', '00000000-0000-0000-0000-0000000f1a01'),
  ('fatture',        '00000000-0000-0000-0000-0000000f1e01', 'fat.pdf', 'fat.pdf', '00000000-0000-0000-0000-0000000f1a01/fat.pdf', '00000000-0000-0000-0000-0000000f1a01');

-- 1. Admin vede l'allegato della fattura
select cmp_ok(
  (select count(*)::int from allegati where entita='fatture' and nome_file='fat.pdf'),
  '>=', 1, 'admin: vede allegato di fattura');

-- 2. created_by immutabile: provo a riscriverlo, resta l'originale
update organizzazioni set created_by='00000000-0000-0000-0000-0000000f1b01', ragione_sociale='Org F1 mod'
  where id='00000000-0000-0000-0000-0000000f1e01';
select is(
  (select created_by from organizzazioni where id='00000000-0000-0000-0000-0000000f1e01'),
  '00000000-0000-0000-0000-0000000f1a01'::uuid,
  'created_by NON modificabile in update (anti-spoofing)');

-- ── OPERATORE ──
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000f1b01','role','authenticated')::text, true);
set local role authenticated;

-- 3. Operatore NON vede l'allegato della fattura
select results_eq(
  $$select count(*)::int from allegati where entita='fatture'$$,
  array[0], 'operatore: allegati di fatture = 0 (niente leak)');

-- 4. Operatore vede comunque l'allegato dell'organizzazione
select cmp_ok(
  (select count(*)::int from allegati where entita='organizzazioni' and nome_file='org.pdf'),
  '>=', 1, 'operatore: allegati non economici restano visibili');

-- ── protect_fattura_delete (come admin/owner) ──
reset role;
-- 5. Elimino la fattura NON incassata → sparisce anche la scadenza collegata
delete from fatture where numero='F1-1';
select results_eq(
  $$select count(*)::int from scadenze_pagamento where descrizione like 'Incasso fattura F1-1'$$,
  array[0], 'delete fattura non incassata: scadenza collegata rimossa (no fantasma)');

-- 6. Fattura con incasso registrato → delete bloccato
insert into fatture (id, numero, direzione, organizzazione_id, imponibile, totale, data, scadenza, created_by)
  values ('00000000-0000-0000-0000-0000000f1f02', 'F1-2', 'attiva', '00000000-0000-0000-0000-0000000f1e01', 500, 610, current_date, current_date+30, '00000000-0000-0000-0000-0000000f1a01');
update scadenze_pagamento set stato='incassato' where fattura_id='00000000-0000-0000-0000-0000000f1f02';
select throws_ok(
  $$delete from fatture where id='00000000-0000-0000-0000-0000000f1f02'$$,
  null, 'Impossibile eliminare una fattura con un incasso già registrato',
  'delete fattura incassata: bloccato');

select * from finish();
rollback;
