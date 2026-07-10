-- ═══════════════════════════════════════════════════════════════════
-- Gate F12c — Deal a rischio: notifica i deal fermi, idempotente settimanale
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000012c1', 'resp12@flowcrm.local');
insert into user_profiles (id, nome, ruolo) values
  ('00000000-0000-0000-0000-0000000012c1', 'Resp12', 'manager')
on conflict (id) do update set nome=excluded.nome, ruolo=excluded.ruolo;

insert into organizzazioni (id, ragione_sociale, created_by)
  values ('00000000-0000-0000-0000-0000000012f0', 'Org 12c', '00000000-0000-0000-0000-0000000012c1');

-- Deal FERMO: creato 30 giorni fa, nessuna attività, responsabile assegnato
insert into deals (id, nome, pipeline_id, stage_id, responsabile_id, created_by, created_at, updated_at)
  select '00000000-0000-0000-0000-0000000012d1', 'Deal Fermo', p.id,
         (select id from pipeline_stages where pipeline_id=p.id and nome='Proposta'),
         '00000000-0000-0000-0000-0000000012c1', '00000000-0000-0000-0000-0000000012c1',
         now() - interval '30 days', now() - interval '30 days'
  from pipelines p where p.is_default;

-- Deal ATTIVO: aggiornato oggi (non a rischio)
insert into deals (id, nome, pipeline_id, stage_id, responsabile_id, created_by)
  select '00000000-0000-0000-0000-0000000012d2', 'Deal Attivo', p.id,
         (select id from pipeline_stages where pipeline_id=p.id and nome='Proposta'),
         '00000000-0000-0000-0000-0000000012c1', '00000000-0000-0000-0000-0000000012c1'
  from pipelines p where p.is_default;

-- Deal VINTO fermo: non deve essere segnalato (chiuso)
insert into deals (id, nome, pipeline_id, stage_id, responsabile_id, created_by, created_at, updated_at)
  select '00000000-0000-0000-0000-0000000012d3', 'Deal Vinto', p.id,
         (select id from pipeline_stages where pipeline_id=p.id and is_won),
         '00000000-0000-0000-0000-0000000012c1', '00000000-0000-0000-0000-0000000012c1',
         now() - interval '30 days', now() - interval '30 days'
  from pipelines p where p.is_default;

-- ── Prima esecuzione ───────────────────────────────────────────
select lives_ok($$select notifica_deal_a_rischio(7)$$, 'notifica_deal_a_rischio: esecuzione ok');

-- 1. Il responsabile ha ricevuto la notifica del deal fermo
select results_eq(
  $$select count(*)::int from notifiche
    where destinatario_id='00000000-0000-0000-0000-0000000012c1'
      and titolo='Deal fermo da rivedere' and azione_url like '%0000000012d1'$$,
  array[1], 'notifica creata per il deal fermo');

-- 2. Nessuna notifica per il deal attivo o quello vinto
select results_eq(
  $$select count(*)::int from notifiche
    where destinatario_id='00000000-0000-0000-0000-0000000012c1'
      and (azione_url like '%0000000012d2' or azione_url like '%0000000012d3')$$,
  array[0], 'nessuna notifica per deal attivo o vinto');

-- ── Idempotenza settimanale ────────────────────────────────────
create temp table _base as
  select count(*)::int c from notifiche where destinatario_id='00000000-0000-0000-0000-0000000012c1';
select lives_ok($$select notifica_deal_a_rischio(7)$$, 'seconda esecuzione ok');
select results_eq(
  $$select count(*)::int from notifiche where destinatario_id='00000000-0000-0000-0000-0000000012c1'$$,
  $$select c from _base$$,
  'IDEMPOTENZA: seconda esecuzione nella stessa settimana non duplica');

select * from finish();
rollback;
