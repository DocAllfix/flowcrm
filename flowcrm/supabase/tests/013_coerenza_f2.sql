-- ═══════════════════════════════════════════════════════════════════
-- FASE 2 — Coerenza amministrazione: fattura↔scadenza, incasso→stato,
-- processa_scadenze non marca scaduta una fattura incassata.
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f2a01', 'adminF2@flowcrm.local')
on conflict do nothing;
insert into user_profiles (id, nome, ruolo, attivo) values
  ('00000000-0000-0000-0000-0000000f2a01', 'AdminF2', 'admin', true)
on conflict (id) do update set ruolo='admin', attivo=true;

insert into organizzazioni (id, ragione_sociale, created_by)
  values ('00000000-0000-0000-0000-0000000f2e01', 'Org F2', '00000000-0000-0000-0000-0000000f2a01');

-- Fattura attiva → genera la scadenza collegata (trigger esistente)
insert into fatture (id, numero, direzione, organizzazione_id, imponibile, totale, data, scadenza, created_by)
  values ('00000000-0000-0000-0000-0000000f2f01', 'F2-1', 'attiva', '00000000-0000-0000-0000-0000000f2e01',
          1000, 1220, current_date, current_date + 30, '00000000-0000-0000-0000-0000000f2a01');

-- 1+2. Modifico la fattura (totale + scadenza) → la scadenza si riallinea
update fatture set totale = 2000, scadenza = current_date + 60
  where id = '00000000-0000-0000-0000-0000000f2f01';
select is(
  (select importo from scadenze_pagamento where fattura_id='00000000-0000-0000-0000-0000000f2f01'),
  2000::numeric, 'fattura update: importo scadenza riallineato');
select is(
  (select data_prevista from scadenze_pagamento where fattura_id='00000000-0000-0000-0000-0000000f2f01'),
  (current_date + 60), 'fattura update: data scadenza riallineata');

-- 3. Segno incassata la scadenza → la fattura diventa 'pagata'
update scadenze_pagamento set stato='incassato', incassato_at=current_date
  where fattura_id='00000000-0000-0000-0000-0000000f2f01';
select is(
  (select stato::text from fatture where id='00000000-0000-0000-0000-0000000f2f01'),
  'pagata', 'incasso → fattura pagata');

-- 4. Annullo l'incasso → la fattura torna da_pagare
update scadenze_pagamento set stato='da_incassare', incassato_at=null
  where fattura_id='00000000-0000-0000-0000-0000000f2f01';
select is(
  (select stato::text from fatture where id='00000000-0000-0000-0000-0000000f2f01'),
  'da_pagare', 'annullo incasso → fattura torna da_pagare');

-- 5. Fattura incassata con scadenza PASSATA: processa_scadenze non la marca 'scaduta'
insert into fatture (id, numero, direzione, organizzazione_id, imponibile, totale, data, scadenza, created_by)
  values ('00000000-0000-0000-0000-0000000f2f02', 'F2-2', 'attiva', '00000000-0000-0000-0000-0000000f2e01',
          500, 610, current_date - 10, current_date - 5, '00000000-0000-0000-0000-0000000f2a01');
update scadenze_pagamento set stato='incassato', incassato_at=current_date
  where fattura_id='00000000-0000-0000-0000-0000000f2f02';
select processa_scadenze();
select is(
  (select stato::text from fatture where id='00000000-0000-0000-0000-0000000f2f02'),
  'pagata', 'processa_scadenze non marca scaduta una fattura incassata');

select * from finish();
rollback;
