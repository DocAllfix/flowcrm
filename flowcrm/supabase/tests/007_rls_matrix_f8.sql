-- ═══════════════════════════════════════════════════════════════════
-- Gate F8 — Amministrazione: IL GATE RLS PIÙ IMPORTANTE
-- Operatore ZERO accesso; manager sì ma niente DELETE; trigger e unicità.
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a8', 'admin8@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000b8', 'manager8@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000c8', 'oper8@flowcrm.local');
insert into user_profiles (id, nome, ruolo) values
  ('00000000-0000-0000-0000-0000000000a8', 'Admin8', 'admin'),
  ('00000000-0000-0000-0000-0000000000b8', 'Manager8', 'manager'),
  ('00000000-0000-0000-0000-0000000000c8', 'Oper8', 'operatore')
on conflict (id) do update set nome=excluded.nome, ruolo=excluded.ruolo;

create or replace function pg_temp.impersona(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

-- Setup (come admin): un'organizzazione + una fattura attiva
select pg_temp.impersona('00000000-0000-0000-0000-0000000000a8');
insert into organizzazioni (id, ragione_sociale, created_by)
  values ('00000000-0000-0000-0000-0000000000f8', 'Cliente Fisco', '00000000-0000-0000-0000-0000000000a8');

insert into fatture (id, numero, organizzazione_id, imponibile, aliquota_iva, scadenza, created_by)
  values ('00000000-0000-0000-0000-0000000000f9', '2026/001', '00000000-0000-0000-0000-0000000000f8',
          1000, 22, current_date + 30, '00000000-0000-0000-0000-0000000000a8');

-- 1. totale default calcolato (1000 + 22% = 1220)
select results_eq(
  $$select totale from fatture where id='00000000-0000-0000-0000-0000000000f9'$$,
  $$values (1220.00::numeric)$$, 'fattura: totale default = imponibile + IVA');

-- 2. Il trigger ha generato l'incasso previsto
select results_eq(
  $$select count(*)::int from scadenze_pagamento where fattura_id='00000000-0000-0000-0000-0000000000f9'$$,
  array[1], 'fattura attiva: incasso previsto generato automaticamente');

-- 3. totale sovrascrivibile (bollo/ritenuta): NON è generated
select lives_ok(
  $$insert into fatture (numero, organizzazione_id, imponibile, aliquota_iva, totale, scadenza, created_by)
    values ('2026/002', '00000000-0000-0000-0000-0000000000f8', 1000, 22, 1250.50, current_date+30,
            '00000000-0000-0000-0000-0000000000a8')$$,
  'fattura: totale esplicito accettato (sovrascrivibile)');

-- ═══ IL CUORE DEL GATE: OPERATORE ZERO ACCESSO ═══════════════════
select pg_temp.impersona('00000000-0000-0000-0000-0000000000c8');

-- 4. Operatore: SELECT fatture → 0 righe (non un errore, proprio invisibili)
select results_eq(
  $$select count(*)::int from fatture$$, array[0],
  'OPERATORE: SELECT fatture = 0 righe');
-- 5. Operatore: SELECT scadenze_pagamento → 0 righe
select results_eq(
  $$select count(*)::int from scadenze_pagamento$$, array[0],
  'OPERATORE: SELECT scadenze_pagamento = 0 righe');
-- 6. Operatore: SELECT scadenze_tasse → 0 righe
select results_eq(
  $$select count(*)::int from scadenze_tasse$$, array[0],
  'OPERATORE: SELECT scadenze_tasse = 0 righe');
-- 7. Operatore: INSERT fattura negato
select throws_ok(
  $$insert into fatture (numero, organizzazione_id, scadenza, created_by)
    values ('HACK', '00000000-0000-0000-0000-0000000000f8', current_date, '00000000-0000-0000-0000-0000000000c8')$$,
  '42501', null, 'OPERATORE: INSERT fattura negato');
-- 8. Operatore: UPDATE fattura → 0 righe (non vede nulla da aggiornare)
select results_eq(
  $$with u as (update fatture set note='x' returning 1) select count(*)::int from u$$,
  array[0], 'OPERATORE: UPDATE fatture = 0 righe');

-- ═══ MANAGER: accesso completo tranne cancellazioni ══════════════
select pg_temp.impersona('00000000-0000-0000-0000-0000000000b8');

-- 9. Manager vede le fatture
select cmp_ok(
  (select count(*)::int from fatture), '>=', 2,
  'MANAGER: vede le fatture');
-- 10. Manager può creare fatture
select lives_ok(
  $$insert into fatture (numero, organizzazione_id, imponibile, scadenza, created_by)
    values ('2026/003', '00000000-0000-0000-0000-0000000000f8', 500, current_date+15,
            '00000000-0000-0000-0000-0000000000b8')$$,
  'MANAGER: crea fattura');
-- 11. Manager NON può cancellare (solo admin) → 0 righe
select results_eq(
  $$with d as (delete from fatture where numero='2026/003' returning 1) select count(*)::int from d$$,
  array[0], 'MANAGER: DELETE fattura = 0 righe');

-- ═══ UNICITÀ DIFFERENZIATA attive/passive ════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-0000000000a8');

-- 12. Due fatture ATTIVE stesso numero/anno → rifiutato
select throws_ok(
  $$insert into fatture (numero, organizzazione_id, scadenza, created_by)
    values ('2026/001', '00000000-0000-0000-0000-0000000000f8', current_date, '00000000-0000-0000-0000-0000000000a8')$$,
  '23505', null, 'fatture attive: numero duplicato nello stesso anno BLOCCATO');

-- 13. Due fatture PASSIVE di fornitori diversi con stesso numero → consentito
insert into organizzazioni (id, ragione_sociale, created_by) values
  ('00000000-0000-0000-0000-00000000fa01', 'Fornitore A', '00000000-0000-0000-0000-0000000000a8'),
  ('00000000-0000-0000-0000-00000000fa02', 'Fornitore B', '00000000-0000-0000-0000-0000000000a8');
insert into fatture (direzione, numero, organizzazione_id, scadenza, created_by)
  values ('passiva', 'FT-1', '00000000-0000-0000-0000-00000000fa01', current_date, '00000000-0000-0000-0000-0000000000a8');
select lives_ok(
  $$insert into fatture (direzione, numero, organizzazione_id, scadenza, created_by)
    values ('passiva', 'FT-1', '00000000-0000-0000-0000-00000000fa02', current_date, '00000000-0000-0000-0000-0000000000a8')$$,
  'fatture passive: stesso numero da fornitori diversi CONSENTITO');

-- 14. Due passive stesso fornitore/numero/anno → rifiutato
select throws_ok(
  $$insert into fatture (direzione, numero, organizzazione_id, scadenza, created_by)
    values ('passiva', 'FT-1', '00000000-0000-0000-0000-00000000fa01', current_date, '00000000-0000-0000-0000-0000000000a8')$$,
  '23505', null, 'fatture passive: duplicato stesso fornitore BLOCCATO');

-- ═══ Protezione delete fattura con incasso registrato ════════════
-- 15. Segno incassato l'incasso della fattura f9, poi provo a cancellarla
update scadenze_pagamento set stato='incassato', incassato_at=current_date
  where fattura_id='00000000-0000-0000-0000-0000000000f9';
select throws_like(
  $$delete from fatture where id='00000000-0000-0000-0000-0000000000f9'$$,
  '%incasso già registrato%', 'fattura con incasso registrato NON eliminabile');

-- 16. audit_log ha registrato le fatture
select cmp_ok(
  (select count(*)::int from audit_log where entita='fatture' and azione='insert'),
  '>=', 2, 'audit_log: insert fatture registrate');

select * from finish();
rollback;
