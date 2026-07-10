-- ═══════════════════════════════════════════════════════════════════
-- Gate F9 — Viste dashboard: numeri corretti + operatore NON vede le
-- viste economiche (security_invoker rispetta la RLS).
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a9', 'admin9@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000c9', 'oper9@flowcrm.local');
insert into user_profiles (id, nome, ruolo) values
  ('00000000-0000-0000-0000-0000000000a9', 'Admin9', 'admin'),
  ('00000000-0000-0000-0000-0000000000c9', 'Oper9', 'operatore')
on conflict (id) do update set nome=excluded.nome, ruolo=excluded.ruolo;

create or replace function pg_temp.impersona(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

-- Seed noto (come admin). Uso un MESE LONTANO (2099) per isolare le
-- assertion di aggregato dal dato committato sul DB condiviso.
select pg_temp.impersona('00000000-0000-0000-0000-0000000000a9');
insert into organizzazioni (id, ragione_sociale, created_by)
  values ('00000000-0000-0000-0000-000000000f90', 'Org F9', '00000000-0000-0000-0000-0000000000a9');
insert into fatture (numero, organizzazione_id, imponibile, aliquota_iva, totale, data, scadenza, created_by) values
  ('F9-1', '00000000-0000-0000-0000-000000000f90', 1000, 22, 1220, date '2099-01-15', date '2099-02-15', '00000000-0000-0000-0000-0000000000a9'),
  ('F9-2', '00000000-0000-0000-0000-000000000f90', 1000, 22, 1220, date '2099-01-20', date '2099-02-15', '00000000-0000-0000-0000-0000000000a9');

-- 1. Fatturato di gennaio 2099 = 2440 (admin)
select results_eq(
  $$select totale from vw_fatturato_mensile where mese = date '2099-01-01'$$,
  $$values (2440.00::numeric)$$, 'vw_fatturato_mensile: 1220+1220 = 2440 (mese isolato)');

-- 2. Le 2 fatture hanno generato 2 incassi → cash flow entrate feb 2099 = 2440
select results_eq(
  $$select entrate from vw_cash_flow_previsto where mese = date '2099-02-01'$$,
  $$values (2440.00::numeric)$$, 'vw_cash_flow_previsto: entrate attese = 2440 (mese isolato)');

-- 3. Pipeline pesato: verifico il DELTA introdotto da un deal 10000 @ 20% = +2000
--    (robusto rispetto ai deal eventualmente già presenti sul DB)
create temp table _base as
  select coalesce(valore_pesato, 0) v from vw_pipeline_valore_pesato where nome='Proposta';
insert into deals (id, nome, pipeline_id, stage_id, importo, created_by)
  select '00000000-0000-0000-0000-000000000d90', 'Deal F9', p.id,
         (select id from pipeline_stages where pipeline_id=p.id and nome='Proposta'),
         10000, '00000000-0000-0000-0000-0000000000a9'
  from pipelines p where p.is_default;
select results_eq(
  $$select (v.valore_pesato - b.v) from vw_pipeline_valore_pesato v, _base b where v.nome='Proposta'$$,
  $$values (2000.00::numeric)$$, 'vw_pipeline_valore_pesato: delta 10000 × 20% = 2000');

-- ═══ OPERATORE: le viste ECONOMICHE sono vuote (security_invoker+RLS) ═══
select pg_temp.impersona('00000000-0000-0000-0000-0000000000c9');

-- 4. Fatturato mensile → vuoto per l'operatore
select is_empty(
  $$select * from vw_fatturato_mensile$$,
  'OPERATORE: vw_fatturato_mensile VUOTA');

-- 5. Cash flow previsto → vuoto per l'operatore
select is_empty(
  $$select * from vw_cash_flow_previsto$$,
  'OPERATORE: vw_cash_flow_previsto VUOTA');

-- 6. Pipeline pesato → l'operatore lo vede (è operativo, non economico)
select isnt_empty(
  $$select * from vw_pipeline_valore_pesato where n_deal > 0$$,
  'OPERATORE: vw_pipeline_valore_pesato visibile (dato operativo)');

-- 7. Ordinato mensile è operativo → visibile all'operatore (deal, non fatture)
select lives_ok(
  $$select * from vw_ordinato_mensile$$,
  'OPERATORE: vw_ordinato_mensile interrogabile');

select * from finish();
rollback;
