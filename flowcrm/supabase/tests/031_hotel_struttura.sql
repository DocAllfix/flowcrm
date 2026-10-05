-- ═══════════════════════════════════════════════════════════════════
-- Gate HOTEL 1/3 — struttura, tariffe, prenotazioni, soggiorno:
-- camera mai assegnata due volte, overbooking segnalato, prezzo notte
-- per notte (stagione, weekend, persone, piano derivato), regole del
-- piano, check-in con documento e camera pronta, chiusura notturna,
-- check-out con tassa di soggiorno (età, riduzioni), partenza
-- anticipata, annullamento con penale e rimborso, no-show, opzioni
-- scadute, caparra in scadenza, permessi e licenza. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(40);

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
-- Il prossimo lunedì (mai oggi): settimane con giorni noti.
create or replace function pg_temp.lun() returns date as $$
  select pg_temp.oggi() + (8 - extract(isodow from pg_temp.oggi()))::int
$$ language sql stable;

insert into moduli_licenze (slug, attivo) values ('hotel', true)
on conflict (slug) do update set attivo = excluded.attivo;

-- ═══ STRUTTURA, TIPOLOGIE, CAMERE, TRATTAMENTI, PIANI, TARIFFE ═══════
insert into hotel_strutture (id, nome, comune) values ('d1000000-0000-0000-0000-000000000001', 'Hotel Test', 'Roma');
insert into hotel_tipologie (id, struttura_id, codice, nome, categoria, occupazione_base, occupazione_max, prezzo_base) values
  ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'DBL', 'Doppia', 'doppia', 2, 3, 100),
  ('d2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'SGL', 'Singola', 'singola', 1, 1, 70);
insert into hotel_camere (id, struttura_id, tipologia_id, numero, piano) values
  ('d3000000-0000-0000-0000-000000000101', 'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', '101', 1),
  ('d3000000-0000-0000-0000-000000000102', 'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', '102', 1),
  ('d3000000-0000-0000-0000-000000000201', 'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002', '201', 2);
insert into hotel_trattamenti (id, struttura_id, codice, nome, colazione, supplemento_adulto, supplemento_bambino) values
  ('d4000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'BB', 'Bed & Breakfast', true, 10, 5);
insert into hotel_piani_tariffari (id, struttura_id, codice, nome, tipo, cancellazione_giorni, penale_pct) values
  ('d5000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'BAR', 'Miglior tariffa', 'bar', 30, 50);
insert into hotel_piani_tariffari (id, struttura_id, codice, nome, tipo, base_piano_id, variazione_pct, rimborsabile) values
  ('d5000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'NR', 'Non rimborsabile', 'non_rimborsabile',
   'd5000000-0000-0000-0000-000000000001', -10, false);
insert into hotel_piani_tariffari (id, struttura_id, codice, nome, tipo, base_piano_id, variazione_pct, anticipo_min_giorni) values
  ('d5000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'EB', 'Prenota prima', 'early_booking',
   'd5000000-0000-0000-0000-000000000001', -15, 30);
insert into hotel_tariffe (struttura_id, piano_id, tipologia_id, dal, al, giorni, prezzo, supplemento_persona, riduzione_singola, priorita)
select 'd1000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001',
       pg_temp.lun(), pg_temp.lun() + 60, g, p, 25, 20, pr
  from (values ('{1,2,3,4,5,6,7}'::smallint[], 120, 0), ('{5,6}'::smallint[], 150, 1)) v(g, p, pr);
insert into hotel_tariffe (struttura_id, piano_id, tipologia_id, dal, al, prezzo, soggiorno_min, chiuso_arrivo, priorita) values
  ('d1000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001',
   pg_temp.lun() + 14, pg_temp.lun() + 14, 120, 3, true, 2);

-- ═══ PREZZI NOTTE PER NOTTE ══════════════════════════════════════════
select is((select (hotel_quota('d1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', pg_temp.lun(), pg_temp.lun() + 7,
                               2, 0, 'd5000000-0000-0000-0000-000000000001')->>'totale')::numeric),
  900.00, 'settimana in doppia: 5 notti a 120 e venerdì e sabato a 150');
select is((select (hotel_quota('d1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', pg_temp.lun(), pg_temp.lun() + 7,
                               2, 1, 'd5000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001')->>'totale')::numeric),
  1250.00, 'terza persona (+25 a notte) e B&B per due adulti e un bambino (+25 a notte)');
select is((select (hotel_quota('d1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', pg_temp.lun(), pg_temp.lun() + 7,
                               1, 0, 'd5000000-0000-0000-0000-000000000001')->>'totale')::numeric),
  760.00, 'doppia uso singola: −20 a notte');
select is((select (hotel_quota('d1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', pg_temp.lun(), pg_temp.lun() + 7,
                               2, 0, 'd5000000-0000-0000-0000-000000000002')->>'totale')::numeric),
  810.00, 'non rimborsabile: la tariffa del BAR −10%');
select is((select q->>'valida' || '|' || (q->'motivi'->>0)
             from hotel_quota('d1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', pg_temp.lun(), pg_temp.lun() + 2,
                              2, 0, 'd5000000-0000-0000-0000-000000000003') q),
  'false|Prenotazione anticipata: almeno 30 giorni prima', 'prenota prima: serve l''anticipo');
select is((select q->>'motivi'
             from hotel_quota('d1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', pg_temp.lun() + 14, pg_temp.lun() + 16,
                              2, 0, 'd5000000-0000-0000-0000-000000000001') q),
  '["Chiuso all''arrivo in questa data", "Soggiorno minimo di 3 notti per questo arrivo"]', 'restrizioni del giorno di arrivo');

-- ═══ CAMERA MAI ASSEGNATA DUE VOLTE ══════════════════════════════════
insert into hotel_prenotazioni (id, struttura_id, ospite_nome, arrivo, partenza, tipologia_id, camera_id, piano_id) values
  ('d6000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Rossi', pg_temp.lun(), pg_temp.lun() + 3,
   'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000101', 'd5000000-0000-0000-0000-000000000001');
select is((select format('%s|%s|%s', p.codice ~ '^PRN-\d{4}-\d{4}$', p.prezzo_totale, (select count(*) || '/' || sum(prezzo_camera + prezzo_trattamento)
             from hotel_notti n where n.prenotazione_id = p.id)) from hotel_prenotazioni p where p.id = 'd6000000-0000-0000-0000-000000000001'),
  't|360.00|3/360.00', 'prenotazione con codice, prezzo dal piano e notti bloccate una per una');
select lives_ok($$insert into hotel_prenotazioni (struttura_id, ospite_nome, arrivo, partenza, tipologia_id, camera_id) values
  ('d1000000-0000-0000-0000-000000000001', 'Bianchi', pg_temp.lun() + 3, pg_temp.lun() + 5, 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000101')$$,
  'chi arriva il giorno in cui l''altro parte prende la stessa camera');
select throws_ok($$insert into hotel_prenotazioni (struttura_id, ospite_nome, arrivo, partenza, tipologia_id, camera_id) values
  ('d1000000-0000-0000-0000-000000000001', 'Verdi', pg_temp.lun() + 2, pg_temp.lun() + 4, 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000101')$$,
  '23P01', null, 'la stessa camera non si assegna due volte nella stessa notte');
select lives_ok($$insert into hotel_prenotazioni (struttura_id, ospite_nome, arrivo, partenza, tipologia_id, camera_id, stato) values
  ('d1000000-0000-0000-0000-000000000001', 'Richiesta', pg_temp.lun() + 1, pg_temp.lun() + 2, 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000101', 'richiesta')$$,
  'una semplice richiesta non occupa la camera');
select throws_ok($$insert into hotel_prenotazioni (struttura_id, ospite_nome, adulti, bambini, arrivo, partenza, tipologia_id) values
  ('d1000000-0000-0000-0000-000000000001', 'Troppi', 3, 1, pg_temp.lun(), pg_temp.lun() + 1, 'd2000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'la doppia ospita al massimo tre persone');

-- ═══ OVERBOOKING SEGNALATO ═══════════════════════════════════════════
insert into hotel_prenotazioni (struttura_id, ospite_nome, arrivo, partenza, tipologia_id) values
  ('d1000000-0000-0000-0000-000000000001', 'Senza camera 1', pg_temp.lun() + 1, pg_temp.lun() + 2, 'd2000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000001', 'Senza camera 2', pg_temp.lun() + 1, pg_temp.lun() + 2, 'd2000000-0000-0000-0000-000000000001');
select is((select format('%s|%s|%s', vendute, disponibili, overbooking) from hotel_disponibilita('d1000000-0000-0000-0000-000000000001', pg_temp.lun() + 1, pg_temp.lun() + 1)
            where tipologia_id = 'd2000000-0000-0000-0000-000000000001'),
  '3|-1|t', 'tre doppie vendute su due: overbooking visibile');
select ok((select count(*) >= 1 from notifiche where destinatario_id = '00000000-0000-0000-0000-00000000000a' and titolo = 'Overbooking: Doppia'),
  'la direzione è avvisata dell''overbooking');

select throws_ok($$update hotel_prenotazioni set stato = 'partita' where id = 'd6000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'non si salta il soggiorno: la partenza viene dal check-out');

-- ═══ CHECK-IN, CHIUSURA NOTTURNA, CHECK-OUT CON TASSA ════════════════
insert into hotel_tassa_regole (struttura_id, comune, importo_notte, notti_max, eta_esenzione_sotto, riduzioni) values
  ('d1000000-0000-0000-0000-000000000001', 'Roma', 6, 10, 10, '[{"eta_da": 10, "eta_a": 17, "pct": 50}]');
insert into contatti (id, nome, cognome) values
  ('d7000000-0000-0000-0000-000000000001', 'Mario', 'Rossi'),
  ('d7000000-0000-0000-0000-000000000002', 'Luca', 'Rossi'),
  ('d7000000-0000-0000-0000-000000000003', 'Sara', 'Rossi');
insert into hotel_ospiti (id, contatto_id, sesso, data_nascita, documento_tipo, documento_numero) values
  ('d8000000-0000-0000-0000-000000000001', 'd7000000-0000-0000-0000-000000000001', 'M', '1980-05-01', 'IDENT', 'CA1234567');
insert into hotel_ospiti (id, contatto_id, data_nascita) values
  ('d8000000-0000-0000-0000-000000000002', 'd7000000-0000-0000-0000-000000000002', pg_temp.oggi() - interval '15 years'),
  ('d8000000-0000-0000-0000-000000000003', 'd7000000-0000-0000-0000-000000000003', pg_temp.oggi() - interval '5 years');

-- In casa: tre notti, partenza oggi, B&B per due (fuori dal listino: prezzo base 100 + 20).
insert into hotel_prenotazioni (id, struttura_id, ospite_nome, adulti, bambini, arrivo, partenza, tipologia_id, camera_id, piano_id, trattamento_id) values
  ('d6000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000001', 'Famiglia Rossi', 2, 1, pg_temp.oggi() - 3, pg_temp.oggi(),
   'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000102', 'd5000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001');
update hotel_camere set stato_pulizia = 'da_pulire' where id = 'd3000000-0000-0000-0000-000000000102';
select throws_like($$select hotel_check_in('d6000000-0000-0000-0000-000000000010')$$,
  'Registra almeno un ospite con il documento', 'senza un documento non si entra');
insert into hotel_soggiorno_ospiti (prenotazione_id, ospite_id, tipo_alloggiato) values
  ('d6000000-0000-0000-0000-000000000010', 'd8000000-0000-0000-0000-000000000001', '17'),
  ('d6000000-0000-0000-0000-000000000010', 'd8000000-0000-0000-0000-000000000002', '19'),
  ('d6000000-0000-0000-0000-000000000010', 'd8000000-0000-0000-0000-000000000003', '19');
select throws_like($$select hotel_check_in('d6000000-0000-0000-0000-000000000010')$$,
  'La camera 102 non è pronta (da pulire)', 'la camera da pulire non si consegna');
update hotel_camere set stato_pulizia = 'verificata' where id = 'd3000000-0000-0000-0000-000000000102';
select isnt(hotel_check_in('d6000000-0000-0000-0000-000000000010'), null, 'check-in: soggiorno attivo e conto camera aperto');
select is((select stato from hotel_camere_stato where camera_id = 'd3000000-0000-0000-0000-000000000102'), 'occupata', 'la camera risulta occupata');

select is(hotel_audit_notturno() >= 3, true, 'la chiusura notturna addebita le notti passate');
select is((select format('%s|%s', count(*), sum(importo)) from conti_righe r join hotel_prenotazioni p on p.conto_id = r.conto_id
            where p.id = 'd6000000-0000-0000-0000-000000000010' and r.riferimento_tipo = 'hotel_notti'),
  '3|375.00', 'tre notti sul conto: 100 di camera, 10+10+5 di colazione');
select is((select format('%s|%s|%s', string_agg(coalesce(esenzione, '-'), ',' order by nome), sum(importo), sum(notti_tassabili))
             from hotel_tassa_calcola('d6000000-0000-0000-0000-000000000010')),
  '-,-,minore di 10 anni|27.00|6', 'tassa: adulto pieno, ragazzo a metà, bambino esente');

select is((select format('%s|%s', r->>'completato', r->>'residuo') from hotel_check_out('d6000000-0000-0000-0000-000000000010') r),
  'false|402.00', 'primo passaggio del check-out: notti e tassa sul conto, 402 € da saldare');
insert into conti_pagamenti (conto_id, metodo, importo)
select conto_id, 'pos', 402 from hotel_prenotazioni where id = 'd6000000-0000-0000-0000-000000000010';
select throws_ok($$insert into conti_rimborsi (conto_id, modulo, importo, metodo, motivo)
  select conto_id, 'hotel', 1, 'contanti', 'prova' from hotel_prenotazioni where id = 'd6000000-0000-0000-0000-000000000010'$$,
  '23514', null, 'non si rimborsa più del versato in eccesso');
select is((select (hotel_check_out('d6000000-0000-0000-0000-000000000010')->>'tassa')::numeric), 27.00, 'check-out con la tassa di soggiorno');
select is((select format('%s|%s|%s', p.stato, c.stato, k.stato_pulizia) from hotel_prenotazioni p join conti c on c.id = p.conto_id
             join hotel_camere k on k.id = p.camera_id where p.id = 'd6000000-0000-0000-0000-000000000010'),
  'partita|chiuso|da_pulire', 'partita, conto chiuso, camera da pulire');

-- Partenza anticipata: le notti non godute spariscono dal prezzo.
insert into hotel_prenotazioni (id, struttura_id, ospite_nome, adulti, arrivo, partenza, tipologia_id, camera_id) values
  ('d6000000-0000-0000-0000-000000000011', 'd1000000-0000-0000-0000-000000000001', 'Mario Rossi', 1, pg_temp.oggi() - 1, pg_temp.oggi() + 2,
   'd2000000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000201');
insert into hotel_soggiorno_ospiti (prenotazione_id, ospite_id) values ('d6000000-0000-0000-0000-000000000011', 'd8000000-0000-0000-0000-000000000001');
select hotel_check_in('d6000000-0000-0000-0000-000000000011');
select is((select hotel_check_out('d6000000-0000-0000-0000-000000000011')->>'residuo'), '76.00',
  'partenza anticipata: una notte e la tassa da saldare');
insert into conti_pagamenti (conto_id, metodo, importo)
select conto_id, 'contanti', 76 from hotel_prenotazioni where id = 'd6000000-0000-0000-0000-000000000011';
select is((select hotel_check_out('d6000000-0000-0000-0000-000000000011')->>'completato'), 'true', 'saldato, il soggiorno si chiude');
select is((select format('%s|%s|%s', partenza = pg_temp.oggi(), prezzo_totale, (select count(*) from hotel_notti where prenotazione_id = p.id))
             from hotel_prenotazioni p where id = 'd6000000-0000-0000-0000-000000000011'),
  't|70.00|1', 'si paga solo la notte goduta (più 6 € di tassa)');

-- ═══ ANNULLAMENTO, NO-SHOW, OPZIONI, CAPARRA ═════════════════════════
insert into hotel_prenotazioni (id, struttura_id, ospite_nome, arrivo, partenza, tipologia_id, piano_id, caparra_richiesta, caparra_scadenza) values
  ('d6000000-0000-0000-0000-000000000020', 'd1000000-0000-0000-0000-000000000001', 'Neri', pg_temp.lun(), pg_temp.lun() + 2,
   'd2000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 200, pg_temp.oggi() + 3);
select is((select count(*) from scadenze_moduli where entita_id = 'd6000000-0000-0000-0000-000000000020' and tipo = 'Caparra' and stato = 'aperta'),
  1::bigint, 'la caparra da ricevere va nello scadenzario');
select hotel_conto_prenotazione('d6000000-0000-0000-0000-000000000020');
insert into conti_pagamenti (conto_id, metodo, importo)
select conto_id, 'bonifico', 200 from hotel_prenotazioni where id = 'd6000000-0000-0000-0000-000000000020';
select is((select count(*) from scadenze_moduli where entita_id = 'd6000000-0000-0000-0000-000000000020' and tipo = 'Caparra' and stato = 'aperta'),
  0::bigint, 'caparra ricevuta: la scadenza sparisce');
select is((select format('%s|%s', r->>'penale', r->>'rimborso')
             from hotel_annulla_prenotazione('d6000000-0000-0000-0000-000000000020', 'Cambio programma', 'bonifico') r),
  '120.00|80.00', 'annullamento sotto data: penale del 50%, rimborso del resto');
select is((select format('%s|%s', c.stato, s.pagato) from conti c join conti_saldi s on s.conto_id = c.id
             join hotel_prenotazioni p on p.conto_id = c.id where p.id = 'd6000000-0000-0000-0000-000000000020'),
  'chiuso|120.00', 'il conto si chiude: trattenuta la penale, il resto restituito');

insert into hotel_prenotazioni (id, struttura_id, ospite_nome, adulti, arrivo, partenza, tipologia_id) values
  ('d6000000-0000-0000-0000-000000000030', 'd1000000-0000-0000-0000-000000000001', 'Assente', 1, pg_temp.oggi() - 1, pg_temp.oggi() + 1,
   'd2000000-0000-0000-0000-000000000002');
select is(hotel_no_show('d6000000-0000-0000-0000-000000000030'), 70.00, 'no-show: la prima notte va sul conto');
select throws_ok($$select hotel_no_show('d6000000-0000-0000-0000-000000000001')$$, '23514', null, 'no-show solo ad arrivo passato');

insert into hotel_prenotazioni (id, struttura_id, ospite_nome, arrivo, partenza, tipologia_id, stato, opzione_scadenza) values
  ('d6000000-0000-0000-0000-000000000040', 'd1000000-0000-0000-0000-000000000001', 'Opzione', pg_temp.lun() + 20, pg_temp.lun() + 22,
   'd2000000-0000-0000-0000-000000000001', 'opzionata', pg_temp.oggi() - 1);
select is(hotel_opzioni_scadute() >= 1, true, 'le opzioni scadute si liberano');
select is((select stato::text from hotel_prenotazioni where id = 'd6000000-0000-0000-0000-000000000040'), 'annullata', 'opzione scaduta annullata');

insert into hotel_prenotazioni (id, struttura_id, ospite_nome, arrivo, partenza, tipologia_id, prezzo_manuale, prezzo_totale) values
  ('d6000000-0000-0000-0000-000000000050', 'd1000000-0000-0000-0000-000000000001', 'Prezzo a mano', pg_temp.lun() + 30, pg_temp.lun() + 33,
   'd2000000-0000-0000-0000-000000000001', true, 500);
select is((select string_agg(prezzo_camera::text, ',' order by data) from hotel_notti where prenotazione_id = 'd6000000-0000-0000-0000-000000000050'),
  '166.67,166.67,166.66', 'prezzo concordato distribuito sulle notti al centesimo');

-- ═══ PERMESSI E LICENZA ══════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select lives_ok($$insert into hotel_prenotazioni (struttura_id, ospite_nome, adulti, arrivo, partenza, tipologia_id, created_by) values
  ('d1000000-0000-0000-0000-000000000001', 'Al telefono', 1, pg_temp.lun() + 40, pg_temp.lun() + 41, 'd2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c')$$,
  'il ricevimento prende le prenotazioni');
select throws_ok($$insert into hotel_tariffe (struttura_id, piano_id, tipologia_id, dal, al, prezzo, created_by) values
  ('d1000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002', current_date, current_date, 1, '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'le tariffe le decide la direzione');
select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'hotel';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select count(*) from hotel_prenotazioni where struttura_id = 'd1000000-0000-0000-0000-000000000001'), 0::bigint,
  'senza licenza dell''Hotel le prenotazioni spariscono');
select pg_temp.torna_postgres();

select * from finish();
rollback;
