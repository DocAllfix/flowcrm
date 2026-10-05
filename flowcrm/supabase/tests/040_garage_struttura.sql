-- ═══════════════════════════════════════════════════════════════════
-- Gate GARAGE 1/2 — clienti collegati al CRM; targa normalizzata;
-- tariffa della sosta su orari noti (franchigia, frazioni, notte a
-- cavallo della mezzanotte pagata una volta, festivo, tetto giornaliero,
-- tipo di veicolo); contratto con le rate e il posto mai di due contratti;
-- accesso dell'abbonato, dell'autorizzato (dentro e fuori fascia), del
-- moroso; rotazione con posto assegnato, nessun posto libero, uscita con
-- il conto di cassa che chiude la sosta; prenotazioni senza doppioni;
-- convenzione con i posti acquistati; permessi e licenza. ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(49);

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

insert into moduli_licenze (slug, attivo) values ('garage', true)
on conflict (slug) do update set attivo = excluded.attivo;

-- ═══ STRUTTURE, POSTI, TARIFFARI ════════════════════════════════════
-- S1 serve solo ai conti della tariffa; S2 è l'autorimessa che lavora.
insert into gar_strutture (id, nome, created_by) values
  ('a1000000-0000-0000-0000-000000000001', 'Tariffe di prova', '00000000-0000-0000-0000-00000000000a'),
  ('a1000000-0000-0000-0000-000000000002', 'Autorimessa Centrale', '00000000-0000-0000-0000-00000000000a');
insert into gar_tariffari (id, struttura_id, nome, tipo_veicolo, franchigia_min, frazione_min, prezzo_frazione, notte_dalle, notte_alle, prezzo_notte, festivo_pct, tetto_giornaliero) values
  ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Auto', null, 10, 60, 2, '22:00', '06:00', 8, 50, 20),
  ('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Moto', 'moto', 10, 30, 1, '22:00', '06:00', 5, 0, null);
insert into gar_tariffari (id, struttura_id, nome, convenzionato, franchigia_min, frazione_min, prezzo_frazione) values
  ('a2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'Oraria', false, 10, 60, 2),
  ('a2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'Convenzionata', true, 10, 60, 1);
insert into gar_posti (id, struttura_id, codice, numero, tipo, riservato, fermo, canone) values
  ('a3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'P1', 1, 'auto', false, null, null),
  ('a3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'P2', 2, 'auto', true, null, 120),
  ('a3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'P3', 3, 'moto', false, null, null),
  ('a3000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'P4', 4, 'auto', false, 'manutenzione', null),
  ('a3000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'P5', 5, 'elettrico', false, null, null);

-- ═══ CLIENTI E VEICOLI ══════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into gar_clienti (id, tipo, nome, email, created_by) values
  ('a4000000-0000-0000-0000-000000000001', 'privato', 'Mario Rossi', 'mario.rossi@example.test', '00000000-0000-0000-0000-00000000000c'),
  ('a4000000-0000-0000-0000-000000000002', 'azienda', 'ACME Srl', 'amministrazione@acme.example.test', '00000000-0000-0000-0000-00000000000c');
insert into gar_veicoli (id, cliente_id, targa, marca, modello, created_by) values
  ('a5000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', 'ab 123-cd', 'Fiat', 'Panda', '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s', k.nome, k.cognome) from gar_clienti g join contatti k on k.id = g.contatto_id where g.id = 'a4000000-0000-0000-0000-000000000001'),
  'Mario|Rossi', 'il cliente privato nasce anche come contatto del CRM');
select is((select format('%s|%s', o.ragione_sociale, (select count(*) from organizzazioni_ruoli r where r.organizzazione_id = o.id and r.ruolo = 'cliente'))
             from gar_clienti g join organizzazioni o on o.id = g.organizzazione_id where g.id = 'a4000000-0000-0000-0000-000000000002'),
  'ACME Srl|1', 'l''azienda nasce come organizzazione cliente');
select is((select targa from gar_veicoli where id = 'a5000000-0000-0000-0000-000000000001'), 'AB123CD', 'la targa si scrive maiuscola e senza spazi');
select matches((select codice from gar_clienti where id = 'a4000000-0000-0000-0000-000000000001'), '^CLG-', 'il cliente ha il suo codice');

-- ═══ TARIFFA DELLA SOSTA SU ORARI NOTI ══════════════════════════════
-- 11/03/2026 è un mercoledì, il 15/03/2026 una domenica.
select is((select format('%s|%s', v->>'importo', v->>'franchigia') from gar_calcola_tariffa('a2000000-0000-0000-0000-000000000001', '2026-03-11 10:00+01', '2026-03-11 10:08+01') v),
  '0|true', 'otto minuti: dentro la franchigia non si paga');
select is((select (v->>'importo')::numeric from gar_calcola_tariffa('a2000000-0000-0000-0000-000000000001', '2026-03-11 10:00+01', '2026-03-11 12:30+01') v),
  6::numeric, 'due ore e mezza: tre frazioni da 2 €');
select is((select (v->>'importo')::numeric from gar_calcola_tariffa('a2000000-0000-0000-0000-000000000001', '2026-03-11 20:00+01', '2026-03-12 08:00+01') v),
  16::numeric, 'dalle 20 alle 8: quattro ore di giorno (8 €) più la notte a prezzo fisso (8 €)');
select is((select (v->>'importo')::numeric from gar_calcola_tariffa('a2000000-0000-0000-0000-000000000001', '2026-03-11 08:00+01', '2026-03-11 20:00+01') v),
  20::numeric, 'dodici ore di giorno farebbero 24 €: vale il tetto giornaliero di 20 €');
select is((select (v->>'importo')::numeric from gar_calcola_tariffa('a2000000-0000-0000-0000-000000000001', '2026-03-15 10:00+01', '2026-03-15 12:00+01') v),
  6::numeric, 'di domenica due ore costano il 50% in più');
select is((select (v->>'importo')::numeric from gar_calcola_tariffa('a2000000-0000-0000-0000-000000000001', '2026-03-11 08:00+01', '2026-03-13 09:00+01') v),
  42::numeric, 'due giorni e un''ora: due tetti giornalieri più una frazione');
select is((select format('%s|%s', v->>'importo', jsonb_array_length(v->'blocchi')) from gar_calcola_tariffa('a2000000-0000-0000-0000-000000000002', '2026-03-11 23:00+01', '2026-03-12 23:30+01') v),
  '42.00|2', 'moto, 24 ore e mezza: 32 mezz''ore di giorno e due notti, la seconda notte non si paga due volte');
select is(gar_tariffario_per('a1000000-0000-0000-0000-000000000001', 'moto'), 'a2000000-0000-0000-0000-000000000002'::uuid, 'la moto ha la sua tariffa');
select is(gar_tariffario_per('a1000000-0000-0000-0000-000000000001', 'suv'), 'a2000000-0000-0000-0000-000000000001'::uuid, 'chi non ha una tariffa sua prende quella generale');
select is(gar_festivo('2026-12-25'), true, 'Natale è festivo anche di venerdì');

-- ═══ CONTRATTO: CANONE DEL POSTO, RATE, UN POSTO UN CONTRATTO ═══════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$insert into gar_contratti (struttura_id, cliente_id, created_by) values ('a1000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'il contratto lo stipula la direzione');
select throws_ok($$insert into gar_tariffari (struttura_id, nome, prezzo_frazione, created_by) values ('a1000000-0000-0000-0000-000000000002', 'Abusiva', 0, '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'le tariffe le decide la direzione');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
insert into gar_contratti (id, struttura_id, cliente_id, veicolo_id, posto_id, tipo, fine, rinnovo_automatico, created_by) values
  ('a6000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001',
   'a3000000-0000-0000-0000-000000000002', 'abbonamento_mensile', pg_temp.oggi() + 364, false, '00000000-0000-0000-0000-00000000000a');
select pg_temp.torna_postgres();
select is((select canone from gar_contratti where id = 'a6000000-0000-0000-0000-000000000001'), 120.00::numeric, 'il canone è quello di listino del posto');
select is((select format('%s|%s|%s', count(*), min(importo), min(periodo_dal) = pg_temp.oggi()) from gar_rate where contratto_id = 'a6000000-0000-0000-0000-000000000001'),
  '1|120.00|t', 'alla firma nasce la rata del primo mese');
select is((select count(*)::int from scadenze_moduli where entita = 'gar_contratti' and entita_id = 'a6000000-0000-0000-0000-000000000001' and data_scadenza = pg_temp.oggi() + 364),
  1, 'la fine del contratto è tra le scadenze');
select throws_ok($$insert into gar_contratti (struttura_id, cliente_id, posto_id, inizio, created_by) values ('a1000000-0000-0000-0000-000000000002',
  'a4000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000002', (now() at time zone 'Europe/Rome')::date + 30, '00000000-0000-0000-0000-00000000000a')$$,
  '23P01', null, 'un posto non è di due contratti nello stesso periodo');
select is((select format('%s|%s', stato, cliente) from gar_posti_stato where posto_id = 'a3000000-0000-0000-0000-000000000002'), 'riservato|Mario Rossi',
  'il posto a contratto risulta riservato al suo cliente');

-- ═══ L'ABBONATO ENTRA ED ESCE SENZA PAGARE ══════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s', v->>'titolo', v->>'posto_id') from gar_verifica_accesso('a1000000-0000-0000-0000-000000000002', 'AB 123 CD') v),
  'contratto|a3000000-0000-0000-0000-000000000002', 'l''abbonato è riconosciuto dalla targa, con il suo posto');
create temp table gar_esiti (chiave text primary key, v jsonb);
grant all on gar_esiti to authenticated;
insert into gar_esiti select 'abbonato', gar_ingresso('a1000000-0000-0000-0000-000000000002', 'AB123CD');
select is((select format('%s|%s', v->>'posto', v->>'titolo') from gar_esiti where chiave = 'abbonato'), 'P2|contratto', 'entra nel suo posto');
select matches((select v->>'ticket' from gar_esiti where chiave = 'abbonato'), '^TKT-', 'ogni ingresso ha il suo ticket');
select throws_ok($$select gar_ingresso('a1000000-0000-0000-0000-000000000002', 'AB123CD')$$, '23514', 'Il veicolo risulta già dentro', 'una targa non entra due volte');
select is((select stato from gar_posti_stato where posto_id = 'a3000000-0000-0000-0000-000000000002'), 'occupato', 'il posto risulta occupato');
select is((select format('%s|%s|%s', v->>'importo', v->>'titolo', v->>'conto_id') from gar_uscita((select (v->>'sosta_id')::uuid from gar_esiti where chiave = 'abbonato')) v),
  '0|contratto|', 'l''abbonato esce senza conto');

-- ═══ ROTAZIONE: POSTO ASSEGNATO, PIENO, USCITA CON IL CONTO ═════════
insert into gar_esiti select 'rot1', gar_ingresso('a1000000-0000-0000-0000-000000000002', 'ZZ999ZZ');
insert into gar_esiti select 'rot2', gar_ingresso('a1000000-0000-0000-0000-000000000002', 'YY888YY');
insert into gar_esiti select 'moto', gar_ingresso('a1000000-0000-0000-0000-000000000002', 'MO111TO', null, 'targa', 'moto');
select is((select string_agg(v->>'posto', ',' order by chiave) from gar_esiti where chiave in ('rot1', 'rot2', 'moto')), 'P3,P1,P5',
  'la rotazione prende il primo posto libero adatto: la moto il suo, la seconda auto quello elettrico; mai il riservato né quello in manutenzione');
select throws_ok($$select gar_ingresso('a1000000-0000-0000-0000-000000000002', 'XX777XX')$$, '23514', 'Nessun posto libero per questo veicolo', 'a posti finiti non si entra');
select throws_ok($$update gar_soste set importo = 0, uscita_at = now() where targa = 'ZZ999ZZ'$$, '42501', null, 'orari e importi della sosta non si scrivono a mano');
select pg_temp.torna_postgres();
update gar_soste set ingresso_at = now() - interval '3 hours' where targa = 'ZZ999ZZ';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into gar_esiti select 'esce1', gar_uscita((select (v->>'sosta_id')::uuid from gar_esiti where chiave = 'rot1'));
select is((select format('%s|%s|%s', v->>'importo', v->>'minuti', v->>'conto_id' is not null) from gar_esiti where chiave = 'esce1'), '6.00|180|t',
  'tre ore a rotazione: 6 € e il conto di cassa');
select is((select format('%s|%s', s.stato, c.stato) from gar_soste s join conti c on c.id = s.conto_id where s.targa = 'ZZ999ZZ'), 'da_pagare|aperto',
  'la sosta resta da pagare finché il conto è aperto');
select pg_temp.torna_postgres();
insert into conti_pagamenti (conto_id, modulo, metodo, importo)
select conto_id, 'garage', 'contanti', 6 from gar_soste where targa = 'ZZ999ZZ';
update conti set stato = 'chiuso', chiuso_at = now() where id = (select conto_id from gar_soste where targa = 'ZZ999ZZ');
select is((select stato from gar_soste where targa = 'ZZ999ZZ'), 'chiusa', 'incassato il conto, la sosta si chiude');
select is((select stato from gar_posti_stato where posto_id = 'a3000000-0000-0000-0000-000000000001'), 'libero', 'e il posto torna libero');

-- ═══ PRENOTAZIONI ═══════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into gar_prenotazioni (id, struttura_id, cliente_nome, targa, posto_id, ingresso, uscita, created_by) values
  ('a7000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Paola Verdi', 'pr 111 en', 'a3000000-0000-0000-0000-000000000001',
   now() + interval '30 minutes', now() + interval '150 minutes', '00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s', targa, importo_previsto) from gar_prenotazioni where id = 'a7000000-0000-0000-0000-000000000001'), 'PR111EN|4.00',
  'la prenotazione calcola da sé l''importo previsto');
select throws_ok($$insert into gar_prenotazioni (struttura_id, cliente_nome, posto_id, ingresso, uscita, created_by) values ('a1000000-0000-0000-0000-000000000002', 'Altro',
  'a3000000-0000-0000-0000-000000000001', now() + interval '60 minutes', now() + interval '90 minutes', '00000000-0000-0000-0000-00000000000c')$$,
  '23P01', null, 'un posto non si prenota due volte nella stessa fascia');
select throws_ok($$insert into gar_prenotazioni (struttura_id, cliente_nome, posto_id, ingresso, uscita, created_by) values ('a1000000-0000-0000-0000-000000000002', 'Altro',
  'a3000000-0000-0000-0000-000000000004', now() + interval '60 minutes', now() + interval '90 minutes', '00000000-0000-0000-0000-00000000000c')$$,
  '23514', null, 'un posto in manutenzione non si prenota');
select is((select stato from gar_posti_stato where posto_id = 'a3000000-0000-0000-0000-000000000001'), 'prenotato', 'il posto risulta prenotato a ridosso dell''arrivo');
insert into gar_esiti select 'prenotato', gar_ingresso('a1000000-0000-0000-0000-000000000002', 'PR111EN');
select is((select format('%s|%s', (select v->>'posto' from gar_esiti where chiave = 'prenotato'), stato) from gar_prenotazioni where id = 'a7000000-0000-0000-0000-000000000001'),
  'P1|arrivata', 'chi ha prenotato entra nel posto prenotato e la prenotazione risulta arrivata');

-- ═══ ACCESSI AUTORIZZATI: DELEGATO, FASCIA ORARIA, MOROSO ═══════════
insert into gar_autorizzazioni (cliente_id, tipo, persona, targa, fasce, dal, created_by) values
  ('a4000000-0000-0000-0000-000000000001', 'delegato', 'Luca Rossi', 'de 222 le', '[{"giorni": [1, 2, 3, 4, 5], "dalle": "08:00", "alle": "20:00"}]', '2026-01-01',
   '00000000-0000-0000-0000-00000000000c');
select is((select v->>'titolo' from gar_verifica_accesso('a1000000-0000-0000-0000-000000000002', 'DE222LE', '2026-03-11 10:00+01') v), 'autorizzazione',
  'il delegato entra nella sua fascia oraria');
select is((select format('%s|%s', v->>'titolo', v->>'avviso') from gar_verifica_accesso('a1000000-0000-0000-0000-000000000002', 'DE222LE', '2026-03-11 03:00+01') v),
  'rotazione|Fuori dalla fascia oraria autorizzata', 'fuori fascia l''autorizzazione non vale: entra a tariffa, e si vede perché');
select pg_temp.torna_postgres();
update gar_rate set stato = 'insoluta' where contratto_id = 'a6000000-0000-0000-0000-000000000001';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select matches((select format('%s|%s', v->>'titolo', v->>'avviso') from gar_verifica_accesso('a1000000-0000-0000-0000-000000000002', 'AB123CD') v), '^rotazione\|Canone insoluto',
  'con un canone insoluto l''abbonamento non vale');
select isnt(gar_incassa_rata((select id from gar_rate where contratto_id = 'a6000000-0000-0000-0000-000000000001'), 'pos'), null, 'la rata si incassa alla cassa');
select is((select format('%s|%s|%s', r.stato, c.stato, (select v->>'titolo' from gar_verifica_accesso('a1000000-0000-0000-0000-000000000002', 'AB123CD') v))
             from gar_rate r join conti c on c.id = r.conto_id where r.contratto_id = 'a6000000-0000-0000-0000-000000000001'),
  'pagata|chiuso|contratto', 'pagata la rata, il conto è chiuso e l''abbonamento torna valido');

-- ═══ CONVENZIONE: DENTRO I POSTI ACQUISTATI, POI A TARIFFA ══════════
select pg_temp.torna_postgres();
insert into gar_posti (struttura_id, codice, numero, tipo) values
  ('a1000000-0000-0000-0000-000000000002', 'P6', 6, 'auto'), ('a1000000-0000-0000-0000-000000000002', 'P7', 7, 'auto');
insert into gar_convenzioni (id, struttura_id, cliente_id, posti_acquistati, tariffario_id, canone_mensile, created_by) values
  ('a8000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000002', 1, 'a2000000-0000-0000-0000-000000000004', 90,
   '00000000-0000-0000-0000-00000000000a');
insert into gar_autorizzazioni (cliente_id, convenzione_id, tipo, persona, targa, created_by) values
  ('a4000000-0000-0000-0000-000000000002', 'a8000000-0000-0000-0000-000000000001', 'dipendente', 'Dip. Uno', 'AC001ME', '00000000-0000-0000-0000-00000000000a'),
  ('a4000000-0000-0000-0000-000000000002', 'a8000000-0000-0000-0000-000000000001', 'dipendente', 'Dip. Due', 'AC002ME', '00000000-0000-0000-0000-00000000000a');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into gar_esiti select 'conv1', gar_ingresso('a1000000-0000-0000-0000-000000000002', 'AC001ME');
insert into gar_esiti select 'conv2', gar_ingresso('a1000000-0000-0000-0000-000000000002', 'AC002ME');
select is((select string_agg(format('%s:%s', targa, tariffario_id is null), ',' order by targa) from gar_soste where convenzione_id = 'a8000000-0000-0000-0000-000000000001'),
  'AC001ME:t,AC002ME:f', 'il primo dipendente sta nel posto acquistato; il secondo, oltre i posti, entra a tariffa convenzionata');
select pg_temp.torna_postgres();
update gar_soste set ingresso_at = now() - interval '2 hours' where targa = 'AC002ME';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s|%s', v->>'importo', v->>'titolo', v->>'conto_id') from gar_uscita((select (v->>'sosta_id')::uuid from gar_esiti where chiave = 'conv2')) v),
  '2.00|convenzione|', 'la sosta in convenzione non si paga in cassa: va sul conto dell''azienda');

-- ═══ PERMESSI E LICENZA ═════════════════════════════════════════════
update gar_soste set note = 'Specchietto già rigato' where targa = 'AC001ME';
select is((select note from gar_soste where targa = 'AC001ME'), 'Specchietto già rigato', 'il personale annota la sosta');
select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'garage';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from gar_soste) + (select count(*)::int from gar_clienti) + (select count(*)::int from gar_posti_stato), 0, 'senza licenza non si vede niente');
select throws_ok($$select gar_ingresso('a1000000-0000-0000-0000-000000000002', 'NO000NO')$$, '42501', null, 'e non si registra nessun ingresso');
select pg_temp.torna_postgres();

select * from finish();
rollback;
