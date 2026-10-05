-- ═══════════════════════════════════════════════════════════════════
-- Gate IMMOBILIARE 1/2 — fascicolo dell'immobile (codice, documenti da
-- raccogliere, storico dei prezzi); quote dei proprietari mai oltre il
-- 100%; valutazione automatica su comparabili noti con i correttivi;
-- incarico (scadenza, provvigione, immobile sul mercato, acquisizione
-- vinta, uno solo in corso, solo l'agente o la direzione); annuncio solo
-- se disponibile; matching con punteggi e motivi su dati noti, selezione
-- inviata al cliente; lead assegnato all'agente e convertito; feed per i
-- portali; permessi e licenza. ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(43);

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
  ('c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 40, '00000000-0000-0000-0000-00000000000a');
insert into contatti (id, nome, cognome, email) values
  ('c2000000-0000-0000-0000-000000000001', 'Mario', 'Proprietario', 'mario.prop@example.test'),
  ('c2000000-0000-0000-0000-000000000002', 'Laura', 'Proprietaria', null),
  ('c2000000-0000-0000-0000-000000000003', 'Luca', 'Acquirente', 'luca.acq@example.test');

-- ═══ FASCICOLO DELL'IMMOBILE ════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into imm_immobili (id, tipologia, contratto, titolo, indirizzo, comune, zona, superficie_commerciale, camere, bagni, terrazzi, ascensore, prezzo, agente_id, created_by) values
  ('c3000000-0000-0000-0000-000000000001', 'appartamento', 'vendita', 'Trilocale con terrazzo', 'Via Roma 1', 'Milano', 'Centro', 80, 2, 1, 1, true, 250000,
   'c1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s|%s', left(codice, 4), stato, prezzo_iniziale, prezzo_mq) from imm_immobili where id = 'c3000000-0000-0000-0000-000000000001'),
  'IMM-|in_acquisizione|250000.00|3125.00', 'l''immobile nasce con il codice, il prezzo iniziale e il prezzo al metro quadro');
select is((select count(*)::int from imm_documenti where immobile_id = 'c3000000-0000-0000-0000-000000000001' and obbligatorio and stato = 'mancante'), 7,
  'i sette documenti che servono sempre sono da raccogliere');
select is((select count(*)::int from imm_prezzi where immobile_id = 'c3000000-0000-0000-0000-000000000001'), 1, 'il primo prezzo è nello storico');

-- ═══ PROPRIETARI ════════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into imm_proprietari (immobile_id, contatto_id, quota_pct, referente, created_by) values
  ('c3000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 60, true, '00000000-0000-0000-0000-00000000000c'),
  ('c3000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000002', 40, false, '00000000-0000-0000-0000-00000000000c');
select throws_ok($$insert into imm_proprietari (immobile_id, contatto_id, quota_pct, created_by) values ('c3000000-0000-0000-0000-000000000001',
  'c2000000-0000-0000-0000-000000000003', 10, '00000000-0000-0000-0000-00000000000c')$$, '23514', null, 'le quote di proprietà non superano il 100%');
select pg_temp.torna_postgres();

-- ═══ VALUTAZIONE AUTOMATICA ═════════════════════════════════════════
-- Comparabili: B venduto 100 m² a 300.000 (3.000 €/m²), C in vendita 50 m² a 175.000 (3.500 €/m²);
-- D è una villa e E è a Roma: non contano.
insert into imm_immobili (id, tipologia, contratto, indirizzo, comune, zona, superficie_commerciale, camere, prezzo, prezzo_vendita, stato, created_by) values
  ('c3000000-0000-0000-0000-000000000002', 'appartamento', 'vendita', 'Via B 2', 'Milano', 'Navigli', 100, 3, 320000, 300000, 'venduto', '00000000-0000-0000-0000-00000000000a'),
  ('c3000000-0000-0000-0000-000000000003', 'appartamento', 'vendita', 'Via C 3', 'Milano', 'Centro', 50, 1, 175000, null, 'disponibile', '00000000-0000-0000-0000-00000000000a'),
  ('c3000000-0000-0000-0000-000000000004', 'villa', 'vendita', 'Via D 4', 'Milano', 'Centro', 100, 3, 300000, null, 'disponibile', '00000000-0000-0000-0000-00000000000a'),
  ('c3000000-0000-0000-0000-000000000005', 'appartamento', 'vendita', 'Via E 5', 'Roma', 'Prati', 80, 2, 240000, null, 'disponibile', '00000000-0000-0000-0000-00000000000a');
insert into imm_immobili (id, tipologia, contratto, indirizzo, comune, superficie_commerciale, camere, prezzo, canone, stato, created_by) values
  ('c3000000-0000-0000-0000-000000000006', 'appartamento', 'affitto', 'Via F 6', 'Milano', 60, 2, null, 900, 'disponibile', '00000000-0000-0000-0000-00000000000a');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s|%s', jsonb_array_length(v->'comparabili'), v->>'valore_mq', v->>'valore') from imm_stima('c3000000-0000-0000-0000-000000000001') v),
  '2|3250.00|260000', 'stima: due comparabili, 3.250 €/m² di media, 80 m² → 260.000 €');
select is((select format('%s|%s|%s', v->>'valore', v->>'valore_min', v->>'valore_max') from imm_stima('c3000000-0000-0000-0000-000000000001', '[{"voce": "piano basso", "pct": -5}]') v),
  '247000|235000|259000', 'con un correttivo del −5%: 247.000 €, forbice ±5%');
select is((select (v->'comparabili'->0->>'fonte') from imm_stima('c3000000-0000-0000-0000-000000000001') v), 'venduto', 'prima i venduti, poi quelli in vendita');
insert into imm_valutazioni (immobile_id, superficie, valore_automatico, valore_agente, created_by) values
  ('c3000000-0000-0000-0000-000000000001', 80, 260000, 255000, '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s', i.stato, s.nome) from imm_immobili i, deals d join pipeline_stages s on s.id = d.stage_id
            where i.id = 'c3000000-0000-0000-0000-000000000001' and d.immobile_id = i.id and d.pipeline_id = imm_pipeline('Acquisizione')),
  'in_valutazione|Valutazione', 'con la valutazione l''immobile è in valutazione e l''acquisizione del proprietario referente arriva a «Valutazione»');
select is((select format('%s|%s', v.agente_id = 'c1000000-0000-0000-0000-000000000001', left(v.codice, 4)) from imm_valutazioni v where v.immobile_id = 'c3000000-0000-0000-0000-000000000001'),
  't|VAL-', 'la valutazione ha il codice e l''agente');

-- ═══ INCARICO ═══════════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000d');
select throws_ok($$insert into imm_incarichi (immobile_id, created_by) values ('c3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d')$$,
  '42501', null, 'l''incarico non lo firma chi non è l''agente dell''immobile né la direzione');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into imm_incarichi (id, immobile_id, esclusiva, prezzo_minimo, created_by) values
  ('c4000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', true, 235000, '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s|%s', scadenza = (pg_temp.oggi() + interval '6 months')::date, provvigione_pct, prezzo_richiesto, left(codice, 4))
             from imm_incarichi where id = 'c4000000-0000-0000-0000-000000000001'), 't|3.00|250000.00|INC-',
  'incarico di sei mesi con la provvigione dell''agenzia e il prezzo dell''immobile');
select is((select format('%s|%s', stato, pubblicato_il = pg_temp.oggi()) from imm_immobili where id = 'c3000000-0000-0000-0000-000000000001'), 'disponibile|t',
  'con l''incarico l''immobile va sul mercato da oggi');
select is((select format('%s|%s', s.nome, d.chiuso_at is not null) from deals d join pipeline_stages s on s.id = d.stage_id
            where d.immobile_id = 'c3000000-0000-0000-0000-000000000001' and d.pipeline_id = imm_pipeline('Acquisizione')),
  'Incarico acquisito|t', 'e l''acquisizione è vinta');
select is((select count(*)::int from scadenze_moduli where entita = 'imm_incarichi' and entita_id = 'c4000000-0000-0000-0000-000000000001' and tipo = 'Incarico in esclusiva'), 1,
  'la scadenza dell''incarico è tra le scadenze');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$insert into imm_incarichi (immobile_id, created_by) values ('c3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c')$$,
  '23505', null, 'un solo incarico di vendita in corso per immobile');
update imm_immobili set prezzo = 240000 where id = 'c3000000-0000-0000-0000-000000000001';
select pg_temp.torna_postgres();
select is((select string_agg(prezzo::text, ',' order by dal) from imm_prezzi where immobile_id = 'c3000000-0000-0000-0000-000000000001'), '250000.00,240000.00',
  'il ribasso resta nello storico dei prezzi');

-- ═══ DOCUMENTI E SCADENZE ═══════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
update imm_documenti set stato = 'presente', scadenza = pg_temp.oggi() + 3650 where immobile_id = 'c3000000-0000-0000-0000-000000000001' and tipo = 'ape';
select pg_temp.torna_postgres();
select is((select format('%s|%s', d.ricevuto_il = pg_temp.oggi(), (select tipo from scadenze_moduli where entita_id = d.id and stato = 'aperta'))
             from imm_documenti d where d.immobile_id = 'c3000000-0000-0000-0000-000000000001' and d.tipo = 'ape'), 't|APE',
  'l''APE ricevuto ha la data e la sua scadenza');

-- ═══ ANNUNCIO E FEED ════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into imm_immobili (id, indirizzo, comune, prezzo, created_by) values
  ('c3000000-0000-0000-0000-000000000009', 'Via Nuova 9', 'Milano', 100000, '00000000-0000-0000-0000-00000000000c');
select throws_ok($$insert into imm_annunci (immobile_id, titolo, descrizione, stato, created_by) values ('c3000000-0000-0000-0000-000000000009', 'X', 'Y', 'pubblicato',
  '00000000-0000-0000-0000-00000000000c')$$, '23514', 'Si pubblica solo un immobile disponibile', 'non si pubblica un immobile ancora da acquisire');
insert into imm_annunci (immobile_id, titolo, descrizione, stato, portali, created_by) values
  ('c3000000-0000-0000-0000-000000000001', 'Trilocale con terrazzo in centro', 'Luminoso, ascensore, terrazzo.', 'pubblicato', '{immobiliare,idealista}',
   '00000000-0000-0000-0000-00000000000c');
select matches(imm_feed_annunci(), '<annuncio codice="IMM-[0-9-]+"><titolo>Trilocale con terrazzo in centro</titolo>', 'il feed per i portali contiene l''annuncio');
select is((select pubblicato_il = pg_temp.oggi() from imm_annunci where immobile_id = 'c3000000-0000-0000-0000-000000000001'), true, 'con la data di pubblicazione');

-- ═══ MATCHING DOMANDA/OFFERTA ═══════════════════════════════════════
insert into imm_richieste (id, contatto_id, tipo, comuni, budget_max, camere_min, requisiti, created_by) values
  ('c5000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000003', 'acquisto', '{milano}', 250000, 2, '{ascensore,terrazzo}', '00000000-0000-0000-0000-00000000000c');
select is((select string_agg(format('%s:%s', i.indirizzo, m.punteggio), ',' order by m.punteggio desc) from imm_match('c5000000-0000-0000-0000-000000000001') m
             join imm_immobili i on i.id = m.immobile_id where i.id::text like 'c3000000%'),
  'Via Roma 1:100,Via C 3:68', 'il trilocale con ascensore e terrazzo fa 100; il monolocale senza, con una camera in meno, 68');
select is((select array_to_string(motivi, ', ') from imm_match('c5000000-0000-0000-0000-000000000001') where immobile_id = 'c3000000-0000-0000-0000-000000000003'),
  'una camera in meno, senza ascensore, senza terrazzo', 'il punteggio dice cosa manca');
select is((select count(*)::int from imm_match('c5000000-0000-0000-0000-000000000001') where immobile_id in ('c3000000-0000-0000-0000-000000000004',
  'c3000000-0000-0000-0000-000000000005', 'c3000000-0000-0000-0000-000000000006', 'c3000000-0000-0000-0000-000000000002')), 0,
  'esclusi: oltre il budget, a Roma, in affitto, già venduto');
update imm_richieste set budget_max = 230000 where id = 'c5000000-0000-0000-0000-000000000001';
select is((select format('%s|%s', punteggio, motivi[1]) from imm_match('c5000000-0000-0000-0000-000000000001') where immobile_id = 'c3000000-0000-0000-0000-000000000001'),
  '85|sopra il budget del 4%', 'entro il 10% sopra il budget resta, con metà dei punti del prezzo');
update imm_richieste set budget_max = 250000 where id = 'c5000000-0000-0000-0000-000000000001';
select is(imm_proponi('c5000000-0000-0000-0000-000000000001', 60), 2, 'le due proposte compatibili vanno nella selezione');
select is(imm_invia_selezione('c5000000-0000-0000-0000-000000000001'), 2, 'e si inviano al cliente');
select pg_temp.torna_postgres();
select is((select count(*)::int from mail_outbox where destinatario = 'luca.acq@example.test' and oggetto = 'Immobili selezionati per lei' and corpo_testo like '%Via Roma 1%'), 1,
  'il cliente riceve l''elenco');
select is((select string_agg(stato, ',') from imm_selezioni where richiesta_id = 'c5000000-0000-0000-0000-000000000001'), 'inviato,inviato', 'le proposte risultano inviate');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select punteggio from imm_match_immobile('c3000000-0000-0000-0000-000000000001') where richiesta_id = 'c5000000-0000-0000-0000-000000000001'), 100,
  'dall''immobile si vede chi lo cerca');

-- ═══ LEAD ═══════════════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000d');
insert into imm_lead (id, tipo, nome, email, telefono, origine, fonte, immobile_id, messaggio, created_by) values
  ('c6000000-0000-0000-0000-000000000001', 'acquirente', 'Giulia Bianchi', 'giulia@example.test', '333 1234567', 'portale', 'Immobiliare.it',
   'c3000000-0000-0000-0000-000000000001', 'È ancora disponibile?', '00000000-0000-0000-0000-00000000000d');
select pg_temp.torna_postgres();
select is((select format('%s|%s', l.agente_id = 'c1000000-0000-0000-0000-000000000001', left(l.codice, 4)) from imm_lead l where l.id = 'c6000000-0000-0000-0000-000000000001'),
  't|LDI-', 'il lead va all''agente dell''immobile');
select is((select count(*)::int from notifiche where destinatario_id = '00000000-0000-0000-0000-00000000000c' and titolo = 'Nuovo lead: Giulia Bianchi'), 1,
  'e l''agente è avvisato');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000d');
select throws_ok($$update imm_lead set stato = 'perso' where id = 'c6000000-0000-0000-0000-000000000001'$$, '23514', 'Indica perché il lead è perso',
  'un lead perso vuole il motivo');
create temp table imm_esiti (chiave text primary key, v jsonb);
grant all on imm_esiti to authenticated;
insert into imm_esiti select 'conv', imm_converti_lead('c6000000-0000-0000-0000-000000000001');
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s|%s', k.nome, k.cognome, r.comuni[1], r.budget_max) from imm_esiti e join contatti k on k.id = (e.v->>'contatto_id')::uuid
             join imm_richieste r on r.id = (e.v->>'richiesta_id')::uuid where e.chiave = 'conv'),
  'Giulia|Bianchi|Milano|264000.00', 'convertito: il contatto nel CRM e la richiesta costruita sull''immobile (budget +10%)');
select is((select format('%s|%s', s.nome, d.immobile_id = 'c3000000-0000-0000-0000-000000000001') from imm_esiti e join deals d on d.id = (e.v->>'deal_id')::uuid
             join pipeline_stages s on s.id = d.stage_id where e.chiave = 'conv'), 'Interesse|t', 'e la trattativa sull''immobile, a «Interesse»');
select is((select stato from imm_lead where id = 'c6000000-0000-0000-0000-000000000001'), 'convertito', 'il lead è convertito');

-- ═══ PERMESSI E LICENZA ═════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$insert into imm_marketing (nome, costo, created_by) values ('Abusiva', 100, '00000000-0000-0000-0000-00000000000c')$$, '42501', null,
  'le campagne a pagamento le decide la direzione');
select throws_ok($$insert into imm_agenti (user_id, created_by) values ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000c')$$, '42501', null,
  'gli agenti li nomina la direzione');
update imm_impostazioni set provvigione_venditore_pct = 10 where id = 1;
select pg_temp.torna_postgres();
select is((select provvigione_venditore_pct from imm_impostazioni where id = 1), 3.00::numeric, 'le regole dell''agenzia le cambia solo la direzione');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
update imm_incarichi set provvigione_pct = 1 where id = 'c4000000-0000-0000-0000-000000000001';
select is((select provvigione_pct from imm_incarichi where id = 'c4000000-0000-0000-0000-000000000001'), 1.00::numeric, 'l''agente dell''immobile cura il suo incarico');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000d');
select throws_ok($$update imm_incarichi set provvigione_pct = 5 where id = 'c4000000-0000-0000-0000-000000000001'$$, '42501', null,
  'gli altri no');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
update imm_incarichi set provvigione_pct = 3 where id = 'c4000000-0000-0000-0000-000000000001';
select is((select provvigione_pct from imm_incarichi where id = 'c4000000-0000-0000-0000-000000000001'), 3.00::numeric, 'la direzione sì');
select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'immobiliare';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from imm_immobili) + (select count(*)::int from imm_richieste) + (select count(*)::int from imm_lead), 0, 'senza licenza non si vede niente');
select matches(imm_feed_annunci(), '<annunci/>$', 'e il feed è vuoto');
select pg_temp.torna_postgres();

select * from finish();
rollback;
