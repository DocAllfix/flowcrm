-- ═══════════════════════════════════════════════════════════════════
-- Gate PALESTRA 3/3 — indicatori su dati noti (soci, rinnovi fatti e
-- persi, conversione dei prospect, economia solo alla direzione),
-- cruscotto del giorno, convenzione aziendale fatturata, «porta un
-- amico», segmenti delle campagne, dati per l'app, ricerca. ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'admin.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000c', 'operatore.test@flowcrm.local')
on conflict (id) do nothing;
insert into user_profiles (id, nome, cognome, ruolo)
values
  ('00000000-0000-0000-0000-00000000000a', 'Anna', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-00000000000c', 'Olga', 'Operatore', 'operatore')
on conflict (id) do update set ruolo = excluded.ruolo;

create or replace function pg_temp.impersona(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;
create or replace function pg_temp.torna_postgres() returns void as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', null, true);
end;
$$ language plpgsql;
create or replace function pg_temp.oggi() returns date as $$
  select (now() at time zone 'Europe/Rome')::date
$$ language sql stable;

insert into moduli_licenze (slug, attivo) values ('palestra', true)
on conflict (slug) do update set attivo = excluded.attivo;

insert into pal_sedi (id, nome, richiede_certificato, referral_giorni) values ('d1000000-0000-0000-0000-0000000000c1', 'Palestra KPI', false, 7);
insert into organizzazioni (id, ragione_sociale) values ('d9000000-0000-0000-0000-0000000000c1', 'Azienda KPI SRL');
insert into pal_convenzioni (id, organizzazione_id, quota_azienda_pct) values
  ('d8000000-0000-0000-0000-0000000000c1', 'd9000000-0000-0000-0000-0000000000c1', 100);
insert into pal_formule (id, nome, prezzo, servizi) values ('d2000000-0000-0000-0000-0000000000c1', 'Mensile KPI', 50, '{sala_pesi}');
insert into contatti (id, nome, cognome, email, consenso_marketing) values
  ('d7000000-0000-0000-0000-0000000000c1', 'Rino', 'Rinnova', 'rino.test@esempio.it', true),
  ('d7000000-0000-0000-0000-0000000000c2', 'Pia', 'Persa', 'pia.test@esempio.it', true),
  ('d7000000-0000-0000-0000-0000000000c3', 'Dora', 'Dipendente', null, true),
  ('d7000000-0000-0000-0000-0000000000c4', 'Ugo', 'Amico', null, true),
  ('d7000000-0000-0000-0000-0000000000c5', 'Leo', 'Lead', null, true),
  ('d7000000-0000-0000-0000-0000000000c6', 'Mia', 'Lead', null, true);
insert into pal_soci (id, contatto_id, sede_id, condizioni_accettate, data_iscrizione) values
  ('d5000000-0000-0000-0000-0000000000c1', 'd7000000-0000-0000-0000-0000000000c1', 'd1000000-0000-0000-0000-0000000000c1', true, pg_temp.oggi() - 100),
  ('d5000000-0000-0000-0000-0000000000c2', 'd7000000-0000-0000-0000-0000000000c2', 'd1000000-0000-0000-0000-0000000000c1', true, pg_temp.oggi() - 100);
insert into pal_soci (id, contatto_id, sede_id, condizioni_accettate, convenzione_id) values
  ('d5000000-0000-0000-0000-0000000000c3', 'd7000000-0000-0000-0000-0000000000c3', 'd1000000-0000-0000-0000-0000000000c1', true,
   'd8000000-0000-0000-0000-0000000000c1');

-- Due abbonamenti finiti ieri: uno rinnovato, uno perso.
insert into pal_abbonamenti (id, socio_id, formula_id, inizio, created_by) values
  ('d6000000-0000-0000-0000-0000000000c1', 'd5000000-0000-0000-0000-0000000000c1', 'd2000000-0000-0000-0000-0000000000c1',
   pg_temp.oggi() - 31, '00000000-0000-0000-0000-00000000000a'),
  ('d6000000-0000-0000-0000-0000000000c2', 'd5000000-0000-0000-0000-0000000000c2', 'd2000000-0000-0000-0000-0000000000c1',
   pg_temp.oggi() - 31, '00000000-0000-0000-0000-00000000000a');
update pal_abbonamenti set fine = pg_temp.oggi() - 1 where id in ('d6000000-0000-0000-0000-0000000000c1', 'd6000000-0000-0000-0000-0000000000c2');
select pal_rinnova('d6000000-0000-0000-0000-0000000000c1');
-- Il dipendente convenzionato: la quota la paga tutta l'azienda.
insert into pal_abbonamenti (socio_id, formula_id, inizio, created_by) values
  ('d5000000-0000-0000-0000-0000000000c3', 'd2000000-0000-0000-0000-0000000000c1', pg_temp.oggi(), '00000000-0000-0000-0000-00000000000a');

-- Prospect: tre lead, uno iscritto, uno perso per il prezzo.
insert into deals (nome, contatto_id, pipeline_id, stage_id, motivo_perdita, created_by)
select 'Lead ' || n, c::uuid, pal_pipeline(), (select id from pipeline_stages where pipeline_id = pal_pipeline() and nome = st), mp,
       '00000000-0000-0000-0000-00000000000a'
  from (values (1, 'd7000000-0000-0000-0000-0000000000c4', 'Prova', null),
               (2, 'd7000000-0000-0000-0000-0000000000c5', 'Persa', 'prezzo'),
               (3, 'd7000000-0000-0000-0000-0000000000c6', 'Visita', null)) v(n, c, st, mp);

-- «Porta un amico»: Ugo, presentato da Rino, si iscrive e si abbona.
create temp table fine_rino as select fine from pal_abbonamenti where rinnovo_di = 'd6000000-0000-0000-0000-0000000000c1';
insert into pal_soci (id, contatto_id, sede_id, condizioni_accettate, presentato_da) values
  ('d5000000-0000-0000-0000-0000000000c4', 'd7000000-0000-0000-0000-0000000000c4', 'd1000000-0000-0000-0000-0000000000c1', true,
   'd5000000-0000-0000-0000-0000000000c1');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into pal_abbonamenti (socio_id, formula_id, created_by) values
  ('d5000000-0000-0000-0000-0000000000c4', 'd2000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select a.fine - f.fine from pal_abbonamenti a, fine_rino f where a.rinnovo_di = 'd6000000-0000-0000-0000-0000000000c1'), 7,
  'porta un amico: chi ha presentato riceve sette giorni');
select is((select format('%s|%s', tipo, motivo) from pal_sospensioni where abbonamento_id = (select id from pal_abbonamenti where rinnovo_di = 'd6000000-0000-0000-0000-0000000000c1')),
  'proroga|Porta un amico: Ugo Amico', 'il regalo resta nello storico come proroga');
select is((select s.is_won from deals d join pipeline_stages s on s.id = d.stage_id where d.contatto_id = 'd7000000-0000-0000-0000-0000000000c4'),
  true, 'il lead iscritto passa a «Iscrizione»');

-- ═══ INDICATORI ═════════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
create temp table k as select pal_kpi('d1000000-0000-0000-0000-0000000000c1', pg_temp.oggi() - 30, pg_temp.oggi()) as v;
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s', v->'rinnovi'->>'scaduti', v->'rinnovi'->>'rinnovati', v->'rinnovi'->>'tasso_rinnovo') from k),
  '2|1|50.0', 'rinnovi: due scaduti, uno rinnovato, 50%');
select is((select format('%s|%s|%s|%s', v->'prospect'->>'lead', v->'prospect'->>'iscritti', v->'prospect'->>'persi', v->'prospect'->>'conversione') from k),
  '3|1|1|33.3', 'prospect: tre lead, un iscritto, uno perso; conversione 33,3%');
select is((select v->'prospect'->'motivi_persi'->>'prezzo' from k), '1', 'il motivo della mancata iscrizione è contato');
select is((select format('%s|%s', v->'soci'->>'attivi', v->'soci'->>'scaduti') from k), '3|1',
  'soci: tre attivi (rinnovato, convenzionato, amico), uno scaduto');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is(pal_kpi('d1000000-0000-0000-0000-0000000000c1', pg_temp.oggi() - 30, pg_temp.oggi())->'economia', 'null'::jsonb,
  'la reception vede gli indicatori, non l''economia');
select is((pal_cruscotto('d1000000-0000-0000-0000-0000000000c1')->>'rate_oggi')::int >= 1, true, 'il cruscotto conta le rate da incassare oggi');
select pg_temp.torna_postgres();

-- ═══ CONVENZIONE: UTILIZZO E FATTURA ════════════════════════════════
select is((select format('%s|%s', iscritti, da_fatturare) from pal_convenzioni_utilizzo where convenzione_id = 'd8000000-0000-0000-0000-0000000000c1'),
  '1|50.00', 'convenzione: un dipendente, 50 € da fatturare all''azienda');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$select pal_fattura_convenzione('d8000000-0000-0000-0000-0000000000c1', pg_temp.oggi(), 'F-1')$$, '42501', null,
  'la fattura alla convenzione la emette la direzione');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select isnt(pal_fattura_convenzione('d8000000-0000-0000-0000-0000000000c1', pg_temp.oggi(), 'F-PAL-1'), null, 'la direzione la emette');
select pg_temp.torna_postgres();
select is((select format('%s|%s', f.totale, r.stato) from pal_rate r join fatture f on f.id = r.fattura_id
            where r.socio_id = 'd5000000-0000-0000-0000-0000000000c3' and r.pagatore = 'azienda'),
  '50.00|fatturata', 'fattura del nucleo all''azienda; la quota risulta fatturata');

-- ═══ SEGMENTI, APP, RICERCA ═════════════════════════════════════════
select ok('d7000000-0000-0000-0000-0000000000c2' in (select seg_pal_ex('palestra', '{}')), 'ex soci: chi non ha rinnovato');
select ok('d7000000-0000-0000-0000-0000000000c1' in (select seg_pal_inattivi('palestra', '{"giorni": 30}')),
  '«non ti vediamo da 30 giorni»: attivo senza ingressi');
select is((select jsonb_array_length(pal_socio_riepilogo('d5000000-0000-0000-0000-0000000000c1')->'abbonamenti')), 2,
  'i dati per l''app: storico abbonamenti, QR, accesso, carnet, prenotazioni');
select is((select tipo from ricerca_globale('Rinnova') where tipo = 'socio_palestra' limit 1), 'socio_palestra', 'il socio si trova dalla ricerca');

select * from finish();
rollback;
