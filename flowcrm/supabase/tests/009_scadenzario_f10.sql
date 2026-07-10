-- ═══════════════════════════════════════════════════════════════════
-- Gate F10 — Scadenzario: soglie, idempotenza, aggiornamento stati scaduti
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000a10', 'admin10@flowcrm.local');
insert into user_profiles (id, nome, ruolo) values
  ('00000000-0000-0000-0000-000000000a10', 'Admin10', 'admin')
on conflict (id) do update set nome=excluded.nome, ruolo=excluded.ruolo;

insert into organizzazioni (id, ragione_sociale, created_by)
  values ('00000000-0000-0000-0000-0000000010f0', 'Org F10', '00000000-0000-0000-0000-000000000a10');

-- Incasso in scadenza tra ESATTAMENTE 7 giorni (soglia)
insert into scadenze_pagamento (id, descrizione, organizzazione_id, importo, data_prevista, stato, created_by)
  values ('00000000-0000-0000-0000-0000000010a7', 'Incasso 7gg', '00000000-0000-0000-0000-0000000010f0',
          1000, current_date + 7, 'da_incassare', '00000000-0000-0000-0000-000000000a10');
-- Incasso già scaduto (ieri)
insert into scadenze_pagamento (id, descrizione, organizzazione_id, importo, data_prevista, stato, created_by)
  values ('00000000-0000-0000-0000-0000000010b0', 'Incasso scaduto', '00000000-0000-0000-0000-0000000010f0',
          500, current_date - 1, 'da_incassare', '00000000-0000-0000-0000-000000000a10');
-- Tassa scaduta ieri
insert into scadenze_tasse (id, tipo_tassa, importo, scadenza, stato, created_by)
  values ('00000000-0000-0000-0000-0000000010c1', 'IVA', 800, current_date - 1, 'da_pagare',
          '00000000-0000-0000-0000-000000000a10');

-- Baseline notifiche dell'admin
create temp table _base as
  select count(*)::int c from notifiche where destinatario_id='00000000-0000-0000-0000-000000000a10';

-- ── Prima esecuzione ───────────────────────────────────────────
select lives_ok($$select processa_scadenze()$$, 'processa_scadenze: prima esecuzione ok');

-- 1. Stato incasso scaduto → in_ritardo
select results_eq(
  $$select stato::text from scadenze_pagamento where id='00000000-0000-0000-0000-0000000010b0'$$,
  $$values ('in_ritardo')$$, 'incasso scaduto → stato in_ritardo');

-- 2. Stato tassa scaduta → scaduta
select results_eq(
  $$select stato::text from scadenze_tasse where id='00000000-0000-0000-0000-0000000010c1'$$,
  $$values ('scaduta')$$, 'tassa scaduta → stato scaduta');

-- 3. Sono state create notifiche (soglia 7 incasso + soglia 0 incasso scaduto + tassa)
select cmp_ok(
  (select count(*)::int from notifiche where destinatario_id='00000000-0000-0000-0000-000000000a10') - (select c from _base),
  '>=', 3, 'notifiche create per le scadenze in soglia');

-- 4. Tracking popolato (idempotenza registrata)
select cmp_ok(
  (select count(*)::int from notifiche_scadenza_inviate),
  '>=', 3, 'tracking notifiche popolato');

-- ── Seconda esecuzione: IDEMPOTENTE (nessuna nuova notifica) ────
create temp table _dopo1 as
  select count(*)::int c from notifiche where destinatario_id='00000000-0000-0000-0000-000000000a10';
select lives_ok($$select processa_scadenze()$$, 'processa_scadenze: seconda esecuzione ok');
select results_eq(
  $$select count(*)::int from notifiche where destinatario_id='00000000-0000-0000-0000-000000000a10'$$,
  $$select c from _dopo1$$,
  'IDEMPOTENZA: seconda esecuzione NON duplica le notifiche');

select * from finish();
rollback;
