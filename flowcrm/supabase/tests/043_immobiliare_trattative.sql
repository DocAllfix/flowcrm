-- ═══════════════════════════════════════════════════════════════════
-- Gate IMMOBILIARE 2/2 — visite (conferma, un agente non in due posti,
-- esito, seconda visita, seguito automatico); proposta, controproposta e
-- accettazione con lo storico e la trattativa che avanza; antiriciclaggio
-- prima del rogito; rogito con immobile venduto, provvigioni dei due lati
-- e ripartizione (agente 40%), che si cambia solo a 100%; provvigioni
-- visibili alla direzione e all'agente, non agli altri; fattura dal
-- nucleo; locazione con provvigioni a mensilità e adeguamento ISTAT;
-- contratto da modello con approvazione; report al proprietario; giro
-- notturno; indicatori, cruscotto, agenda, segmenti, ricerca. ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(55);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'admin.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000c', 'operatore.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000d', 'operatore2.test@flowcrm.local')
on conflict (id) do nothing;
insert into user_profiles (id, nome, cognome, ruolo)
values
  ('00000000-0000-0000-0000-00000000000a', 'Anna', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-00000000000c', 'Carlo', 'Agente', 'operatore'),
  ('00000000-0000-0000-0000-00000000000d', 'Dora', 'Segreteria', 'operatore')
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

insert into moduli_licenze (slug, attivo) values ('immobiliare', true)
on conflict (slug) do update set attivo = excluded.attivo;
delete from imm_impostazioni;
insert into imm_impostazioni (agenzia, created_by) values ('Case Test', '00000000-0000-0000-0000-00000000000a');
insert into imm_agenti (id, user_id, quota_pct, created_by) values
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 40, '00000000-0000-0000-0000-00000000000a');
insert into contatti (id, nome, cognome, email) values
  ('d2000000-0000-0000-0000-000000000001', 'Mario', 'Proprietario', 'mario.prop@example.test'),
  ('d2000000-0000-0000-0000-000000000002', 'Luca', 'Acquirente', 'luca.acq@example.test'),
  ('d2000000-0000-0000-0000-000000000003', 'Paola', 'Conduttrice', 'paola.cond@example.test');
insert into imm_collaboratori (id, tipo, nome, created_by) values
  ('d7000000-0000-0000-0000-000000000001', 'notaio', 'Notaio Rossi', '00000000-0000-0000-0000-00000000000a'),
  ('d7000000-0000-0000-0000-000000000002', 'segnalatore', 'Gino Segnala', '00000000-0000-0000-0000-00000000000a');
insert into imm_immobili (id, tipologia, contratto, indirizzo, comune, superficie_commerciale, camere, prezzo, agente_id, created_by) values
  ('d3000000-0000-0000-0000-000000000001', 'appartamento', 'vendita', 'Via Roma 1', 'Milano', 80, 2, 250000, 'd1000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-00000000000a');
insert into imm_immobili (id, tipologia, contratto, indirizzo, comune, superficie_commerciale, camere, canone, agente_id, created_by) values
  ('d3000000-0000-0000-0000-000000000002', 'appartamento', 'affitto', 'Via Affitto 2', 'Milano', 60, 1, 900, 'd1000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-00000000000a');
insert into imm_proprietari (immobile_id, contatto_id, quota_pct, referente, created_by) values
  ('d3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 100, true, '00000000-0000-0000-0000-00000000000a'),
  ('d3000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000001', 100, true, '00000000-0000-0000-0000-00000000000a');
insert into imm_incarichi (id, immobile_id, tipo, esclusiva, created_by) values
  ('d4000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'vendita', true, '00000000-0000-0000-0000-00000000000a'),
  ('d4000000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000002', 'locazione', false, '00000000-0000-0000-0000-00000000000a');
insert into imm_richieste (contatto_id, tipo, comuni, created_by) values
  ('d2000000-0000-0000-0000-000000000002', 'acquisto', '{Milano}', '00000000-0000-0000-0000-00000000000a');

-- ═══ VISITE ═════════════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into imm_visite (id, immobile_id, contatto_id, inizio, created_by) values
  ('d5000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002',
   date_trunc('day', now()) + interval '1 day 10 hours', '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s', v.agente_id = 'd1000000-0000-0000-0000-000000000001', v.numero, (extract(epoch from v.fine - v.inizio) / 60)::int)
             from imm_visite v where v.id = 'd5000000-0000-0000-0000-000000000001'), 't|1|45', 'la visita va all''agente dell''immobile, prima visita, 45 minuti');
select is((select count(*)::int from mail_outbox where destinatario = 'luca.acq@example.test' and oggetto = 'Visita confermata'), 1, 'il cliente riceve la conferma');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$insert into imm_visite (immobile_id, contatto_id, inizio, created_by) values ('d3000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000003', date_trunc('day', now()) + interval '1 day 10 hours 30 minutes', '00000000-0000-0000-0000-00000000000c')$$,
  '23P01', null, 'un agente non è in due visite alla stessa ora');
select throws_ok($$update imm_visite set stato = 'svolta' where id = 'd5000000-0000-0000-0000-000000000001'$$, '23514', 'Indica com''è andata la visita',
  'la visita svolta vuole l''esito');
update imm_visite set stato = 'svolta', esito = 'interessato', gradimento = 4, feedback = 'Bella luce, cucina piccola' where id = 'd5000000-0000-0000-0000-000000000001';
select pg_temp.torna_postgres();
select is((select s.nome from deals d join pipeline_stages s on s.id = d.stage_id where d.immobile_id = 'd3000000-0000-0000-0000-000000000001'
             and d.contatto_id = 'd2000000-0000-0000-0000-000000000002' and d.pipeline_id = imm_pipeline('Trattative')), 'Visita', 'la trattativa del cliente arriva a «Visita»');
select is((select format('%s|%s', tipo, assegnato_a = '00000000-0000-0000-0000-00000000000c') from attivita where immobile_id = 'd3000000-0000-0000-0000-000000000001'
             and contatto_id = 'd2000000-0000-0000-0000-000000000002'), 'chiamata|t', 'e all''agente resta da sentirlo fra due giorni');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into imm_visite (id, immobile_id, contatto_id, inizio, stato, esito, created_by) values
  ('d5000000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002',
   date_trunc('day', now()) + interval '2 days 10 hours', 'svolta', 'vuole_offrire', '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s', v.numero, s.nome) from imm_visite v, deals d join pipeline_stages s on s.id = d.stage_id
            where v.id = 'd5000000-0000-0000-0000-000000000002' and d.immobile_id = v.immobile_id and d.contatto_id = v.contatto_id and d.pipeline_id = imm_pipeline('Trattative')),
  '2|Seconda visita', 'la seconda visita è contata e la trattativa avanza');

-- ═══ PROPOSTE, CONTROPROPOSTE, ACCETTAZIONE ═════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into imm_proposte (id, immobile_id, contatto_id, prezzo_offerto, caparra, mutuo, scadenza, created_by) values
  ('d6000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002', 230000, 10000, true,
   pg_temp.oggi() + 7, '00000000-0000-0000-0000-00000000000c');
insert into imm_proposte (id, immobile_id, contatto_id, prezzo_offerto, created_by) values
  ('d6000000-0000-0000-0000-000000000009', 'd3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000003', 220000, '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s', left(p.codice, 4), p.prezzo_richiesto, (select s.nome from deals d join pipeline_stages s on s.id = d.stage_id
             where d.immobile_id = p.immobile_id and d.contatto_id = p.contatto_id and d.pipeline_id = imm_pipeline('Trattative')))
             from imm_proposte p where p.id = 'd6000000-0000-0000-0000-000000000001'), 'PRI-|250000.00|Offerta', 'la proposta ha codice, prezzo richiesto e porta a «Offerta»');
select is((select count(*)::int from scadenze_moduli where entita = 'imm_proposte' and entita_id = 'd6000000-0000-0000-0000-000000000001' and stato = 'aperta'), 1,
  'la scadenza della proposta è tra le scadenze');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$update imm_proposte set stato = 'controproposta' where id = 'd6000000-0000-0000-0000-000000000001'$$, '23514', null,
  'la controproposta non si segna a mano');
insert into imm_proposte (id, immobile_id, contatto_id, padre_id, prezzo_offerto, scadenza, created_by) values
  ('d6000000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002', 'd6000000-0000-0000-0000-000000000001',
   245000, pg_temp.oggi() + 5, '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s', (select stato from imm_proposte where id = 'd6000000-0000-0000-0000-000000000001'), da) from imm_proposte where id = 'd6000000-0000-0000-0000-000000000002'),
  'controproposta|proprietario', 'la risposta del proprietario chiude la proposta come «controproposta»: lo storico resta');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
update imm_proposte set stato = 'accettata' where id = 'd6000000-0000-0000-0000-000000000002';
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s', (select stato from imm_immobili where id = 'd3000000-0000-0000-0000-000000000001'),
                         (select stato from imm_proposte where id = 'd6000000-0000-0000-0000-000000000009'),
                         (select s.nome from deals d join pipeline_stages s on s.id = d.stage_id where d.immobile_id = 'd3000000-0000-0000-0000-000000000001'
                            and d.contatto_id = 'd2000000-0000-0000-0000-000000000002' and d.pipeline_id = imm_pipeline('Trattative')))),
  'sotto_offerta|rifiutata|Accettazione', 'accettata: immobile sotto offerta, le altre proposte decadono, trattativa ad «Accettazione»');
select is((select count(*)::int from mail_outbox where destinatario = 'luca.acq@example.test' and oggetto = 'Proposta accettata'), 1, 'il cliente lo sa');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$update imm_proposte set stato = 'rifiutata' where id = 'd6000000-0000-0000-0000-000000000002'$$, '23514', null,
  'una proposta accettata non torna indietro');

-- ═══ PRELIMINARE E ANTIRICICLAGGIO ══════════════════════════════════
insert into imm_chiusure (id, immobile_id, proposta_id, contatto_id, prezzo, preliminare_il, caparra_versata, rogito_previsto, notaio_id, created_by) values
  ('d8000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd6000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000002',
   245000, pg_temp.oggi(), 20000, pg_temp.oggi() + 30, 'd7000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s', s.nome, (select count(*) from scadenze_moduli where entita = 'imm_chiusure' and entita_id = 'd8000000-0000-0000-0000-000000000001' and tipo = 'Rogito'))
             from deals d join pipeline_stages s on s.id = d.stage_id where d.immobile_id = 'd3000000-0000-0000-0000-000000000001'
             and d.contatto_id = 'd2000000-0000-0000-0000-000000000002' and d.pipeline_id = imm_pipeline('Trattative')),
  'Preliminare|1', 'preliminare: la trattativa avanza e il rogito è tra le scadenze');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$update imm_chiusure set stato = 'rogitato' where id = 'd8000000-0000-0000-0000-000000000001'$$, '23514',
  'Manca l''adeguata verifica antiriciclaggio dell''acquirente', 'senza adeguata verifica dell''acquirente non si rogita');
select throws_ok($$insert into imm_aml_verifiche (contatto_id, documento_numero, rischio, created_by) values ('d2000000-0000-0000-0000-000000000002', 'CA123', 'alto',
  '00000000-0000-0000-0000-00000000000c')$$, '23514', null, 'a rischio alto serve l''origine dei fondi');
insert into imm_aml_verifiche (id, contatto_id, immobile_id, documento_numero, documento_scadenza, pep, origine_fondi, scopo_natura, created_by) values
  ('d9000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000001', 'CA1234567', pg_temp.oggi() + 400,
   true, 'Mutuo bancario e risparmi', 'Prima casa', '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s', adeguata_verifica, conservare_fino = (pg_temp.oggi() + interval '10 years')::date, operatore_id = '00000000-0000-0000-0000-00000000000c')
             from imm_aml_verifiche where id = 'd9000000-0000-0000-0000-000000000001'), 'rafforzata|t|t',
  'persona politicamente esposta: verifica rafforzata, conservazione per 10 anni, operatore registrato');
select is((select solo_manager from scadenze_moduli where entita = 'imm_aml_verifiche' and entita_id = 'd9000000-0000-0000-0000-000000000001'), true,
  'la scadenza del documento è riservata alla direzione');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000d');
select is((select count(*)::int from imm_aml_verifiche where id = 'd9000000-0000-0000-0000-000000000001'), 0, 'i dati antiriciclaggio non li vede chiunque');

-- ═══ ROGITO: VENDUTO, PROVVIGIONI, POST-VENDITA ═════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
update imm_chiusure set stato = 'rogitato' where id = 'd8000000-0000-0000-0000-000000000001';
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s', stato, prezzo_vendita, concluso_il = pg_temp.oggi()) from imm_immobili where id = 'd3000000-0000-0000-0000-000000000001'),
  'venduto|245000.00|t', 'rogito: l''immobile è venduto al prezzo finale');
select is((select format('%s|%s', s.nome, d.chiuso_at is not null) from deals d join pipeline_stages s on s.id = d.stage_id where d.immobile_id = 'd3000000-0000-0000-0000-000000000001'
             and d.contatto_id = 'd2000000-0000-0000-0000-000000000002' and d.pipeline_id = imm_pipeline('Trattative')), 'Rogito|t', 'la trattativa è vinta');
select is((select s.nome from deals d join pipeline_stages s on s.id = d.stage_id where d.immobile_id = 'd3000000-0000-0000-0000-000000000001'
             and d.contatto_id = 'd2000000-0000-0000-0000-000000000003' and d.pipeline_id = imm_pipeline('Trattative')), 'Persa', 'quella dell''altro cliente è persa');
select is((select string_agg(format('%s:%s', lato, importo), ',' order by lato) from imm_provvigioni where immobile_id = 'd3000000-0000-0000-0000-000000000001'),
  'acquirente:7350.00,venditore:7350.00', 'provvigioni: 3% per lato su 245.000 €');
select is((select string_agg(format('%s:%s:%s', r.beneficiario, r.pct, r.importo), ',' order by r.beneficiario) from imm_ripartizioni r join imm_provvigioni p on p.id = r.provvigione_id
             where p.immobile_id = 'd3000000-0000-0000-0000-000000000001' and p.lato = 'venditore'), 'agente:40.00:2940.00,agenzia:60.00:4410.00',
  'la ripartizione di partenza: 40% all''agente, il resto all''agenzia');
select is((select format('%s|%s', (select stato from imm_incarichi where id = 'd4000000-0000-0000-0000-000000000001'),
                         (select stato from imm_richieste where contatto_id = 'd2000000-0000-0000-0000-000000000002'))), 'concluso|soddisfatta',
  'l''incarico è concluso e la richiesta del cliente soddisfatta');
select is((select count(*)::int from attivita where contatto_id = 'd2000000-0000-0000-0000-000000000002' and titolo like 'Seguito post-vendita%'
             and (scadenza at time zone 'Europe/Rome')::date = pg_temp.oggi() + 182), 1, 'il seguito post-vendita è in agenda fra sei mesi');

-- ═══ PROVVIGIONI: CHI LE VEDE, RIPARTIZIONE, FATTURA ════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000d');
select is((select count(*)::int from imm_provvigioni where immobile_id = 'd3000000-0000-0000-0000-000000000001'), 0, 'le provvigioni non le vede chi non è dell''affare');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from imm_provvigioni where immobile_id = 'd3000000-0000-0000-0000-000000000001'), 2, 'l''agente vede le sue');
select is((select count(*)::int from imm_ripartizioni r join imm_provvigioni p on p.id = r.provvigione_id where p.immobile_id = 'd3000000-0000-0000-0000-000000000001'), 2,
  'ma delle ripartizioni solo le sue quote');
select throws_ok($$select imm_ripartisci((select id from imm_provvigioni where immobile_id = 'd3000000-0000-0000-0000-000000000001' and lato = 'venditore'),
  '[{"beneficiario": "agente", "agente_id": "d1000000-0000-0000-0000-000000000001", "pct": 100}]')$$, '42501', null, 'la ripartizione la decide la direzione');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select throws_ok($$select imm_ripartisci((select id from imm_provvigioni where immobile_id = 'd3000000-0000-0000-0000-000000000001' and lato = 'venditore'),
  '[{"beneficiario": "agenzia", "pct": 60}, {"beneficiario": "agente", "agente_id": "d1000000-0000-0000-0000-000000000001", "pct": 30}]')$$, '23514', null,
  'una ripartizione che non fa 100% è rifiutata');
select is(imm_ripartisci((select id from imm_provvigioni where immobile_id = 'd3000000-0000-0000-0000-000000000001' and lato = 'venditore'),
  '[{"beneficiario": "agenzia", "pct": 33.33}, {"beneficiario": "agente", "agente_id": "d1000000-0000-0000-0000-000000000001", "pct": 33.33},
    {"beneficiario": "collaboratore", "collaboratore_id": "d7000000-0000-0000-0000-000000000002", "pct": 33.34}]'), 3, 'co-mediazione in tre parti');
select is((select format('%s|%s', sum(r.importo), p.importo) from imm_ripartizioni r join imm_provvigioni p on p.id = r.provvigione_id
             where p.immobile_id = 'd3000000-0000-0000-0000-000000000001' and p.lato = 'venditore' group by p.importo), '7350.00|7350.00',
  'le quote sommano esattamente la provvigione, centesimi compresi');
select throws_ok($$update imm_provvigioni set importo = 1 where immobile_id = 'd3000000-0000-0000-0000-000000000001' and lato = 'venditore'$$, '42501', null,
  'l''importo della provvigione non si cambia a mano');
create temp table imm_esiti (chiave text primary key, v uuid);
grant all on imm_esiti to authenticated;
insert into imm_esiti select 'fattura', imm_fattura_provvigione((select id from imm_provvigioni where immobile_id = 'd3000000-0000-0000-0000-000000000001' and lato = 'venditore'), 'IMM-TEST-1');
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s', f.imponibile, f.totale, o.ragione_sociale) from imm_esiti e join fatture f on f.id = e.v join organizzazioni o on o.id = f.organizzazione_id
            where e.chiave = 'fattura'), '7350.00|8967.00|Mario Proprietario', 'fattura al proprietario (persona fisica): imponibile, IVA 22%');
select is((select stato from imm_provvigioni where immobile_id = 'd3000000-0000-0000-0000-000000000001' and lato = 'venditore'), 'fatturata', 'la provvigione risulta fatturata');

-- ═══ LOCAZIONE E ISTAT ══════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into imm_locazioni (id, immobile_id, conduttore_id, tipo_contratto, canone_iniziale, deposito, inizio, created_by) values
  ('da000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000003', '4+4', 850, 1700, pg_temp.oggi(),
   '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s|%s', l.fine = (pg_temp.oggi() + interval '48 months' - interval '1 day')::date, l.prossimo_adeguamento = (pg_temp.oggi() + interval '1 year')::date,
                         l.canone, i.stato) from imm_locazioni l join imm_immobili i on i.id = l.immobile_id where l.id = 'da000000-0000-0000-0000-000000000001'),
  't|t|850.00|affittato', 'locazione 4+4: fine dopo quattro anni, adeguamento fra un anno, immobile affittato');
select is((select string_agg(format('%s:%s', lato, importo), ',' order by lato) from imm_provvigioni where locazione_id = 'da000000-0000-0000-0000-000000000001'),
  'conduttore:850.00,locatore:850.00', 'provvigioni di locazione: una mensilità per lato');
select is(imm_adegua_istat('da000000-0000-0000-0000-000000000001', 2.0), 862.75::numeric, 'ISTAT +2% al 75%: 850 € diventano 862,75 €');
select is((select format('%s|%s', count(*), max(variazione_istat)) from imm_canoni where locazione_id = 'da000000-0000-0000-0000-000000000001'), '2|2.00',
  'lo storico dei canoni registra l''adeguamento');

-- ═══ CONTRATTI DA MODELLO E APPROVAZIONE ════════════════════════════
select matches(imm_compila((select id from imm_modelli where tipo = 'incarico' limit 1), 'd3000000-0000-0000-0000-000000000001', null,
                           'd4000000-0000-0000-0000-000000000001'),
  'Mario Proprietario.*in esclusiva.*3% del prezzo', 'il modello si compila con proprietari, esclusiva e provvigione');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into imm_contratti (id, tipo, titolo, immobile_id, testo, created_by) values
  ('db000000-0000-0000-0000-000000000001', 'incarico', 'Incarico Via Roma 1', 'd3000000-0000-0000-0000-000000000001', 'Testo', '00000000-0000-0000-0000-00000000000c');
select throws_ok($$update imm_contratti set stato = 'approvato' where id = 'db000000-0000-0000-0000-000000000001'$$, '23514', null,
  'il contratto non si approva da sé');
update imm_contratti set stato = 'in_approvazione' where id = 'db000000-0000-0000-0000-000000000001';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
update approvazioni set stato = 'approvata' where entita = 'imm_contratti' and entita_id = 'db000000-0000-0000-0000-000000000001';
select pg_temp.torna_postgres();
select is((select stato from imm_contratti where id = 'db000000-0000-0000-0000-000000000001'), 'approvato', 'la direzione approva e il contratto è approvato');

-- ═══ REPORT AL PROPRIETARIO, GIRO NOTTURNO ══════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s|%s', v->>'visite', v->>'offerte', v->>'offerta_migliore') from imm_report('d3000000-0000-0000-0000-000000000001') v), '2|2|230000.00',
  'report: due visite, due proposte, la migliore del cliente');
select is(imm_invia_report('d3000000-0000-0000-0000-000000000001'), 1, 'il report parte al proprietario');
select pg_temp.torna_postgres();
insert into imm_immobili (id, indirizzo, comune, prezzo, agente_id, created_by) values
  ('d3000000-0000-0000-0000-000000000003', 'Via Scade 3', 'Milano', 100000, 'd1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a');
insert into imm_incarichi (id, immobile_id, conferito_il, durata_mesi, created_by) values
  ('d4000000-0000-0000-0000-000000000003', 'd3000000-0000-0000-0000-000000000003', pg_temp.oggi() - 100, 3, '00000000-0000-0000-0000-00000000000a');
insert into imm_lead (tipo, nome, telefono, agente_id, ricevuto_at, created_by) values
  ('acquirente', 'Lento Lead', '333', 'd1000000-0000-0000-0000-000000000001', now() - interval '2 days', '00000000-0000-0000-0000-00000000000a');
select is((select format('%s|%s', v->>'incarichi_scaduti', v->>'lead_solleciti') from imm_giro_notturno() v), '1|1', 'giro notturno: un incarico scaduto, un lead senza risposta');
select is((select format('%s|%s', (select stato from imm_incarichi where id = 'd4000000-0000-0000-0000-000000000003'),
                         (select stato from imm_immobili where id = 'd3000000-0000-0000-0000-000000000003'))), 'scaduto|ritirato',
  'scaduto l''incarico, l''immobile esce dal mercato');

-- ═══ INDICATORI, CRUSCOTTO, AGENDA, SEGMENTI, RICERCA ═══════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select is((select format('%s|%s|%s|%s', v#>>'{vendita,venduti}', v#>>'{vendita,visite}', v#>>'{vendita,proposte}', v#>>'{economici,provvigioni}')
             from imm_kpi(pg_temp.oggi() - 1, pg_temp.oggi() + 3) v), '1|2|2|16400.00', 'indicatori: una vendita, due visite, due proposte, 16.400 € di provvigioni');
select is((select format('%s|%s', v->>'vendite_mese', v->>'locazioni_mese') from imm_cruscotto() v), '1|1', 'cruscotto: la vendita e la locazione del mese');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000d');
select is((select v->'economici' from imm_kpi(pg_temp.oggi() - 1, pg_temp.oggi() + 3) v), 'null'::jsonb, 'i dati economici solo alla direzione');
select is((select count(*)::int from imm_agenda(pg_temp.oggi(), pg_temp.oggi() + 3) where tipo = 'visita'), 2, 'le visite sono in agenda');
select pg_temp.torna_postgres();
select is((select count(*)::int from seg_imm_clienti_conclusi('immobiliare', '{}') x where x in ('d2000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000003')), 2,
  'campagne: chi ha comprato e chi ha affittato è nel segmento del post-vendita');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000d');
select is((select count(*)::int from ricerca_globale('Affitto') where tipo = 'immobile'), 1, 'gli immobili sono nella ricerca');
select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'immobiliare';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from imm_visite) + (select count(*)::int from imm_proposte) + (select count(*)::int from imm_provvigioni), 0, 'senza licenza non si vede niente');
select pg_temp.torna_postgres();

select * from finish();
rollback;
