-- ═══════════════════════════════════════════════════════════════════
-- Gate HOTEL 2/3 — operatività: pulizie generate da partenze e fermate
-- (cambio biancheria, priorità all'arrivo), avanzamento con lo stato
-- della camera, assegnazione bilanciata, anomalie in manutenzione,
-- camera fuori servizio, biancheria, minibar sul conto e in magazzino,
-- servizi e SPA senza doppioni di cabina e operatore, cliente esterno,
-- parcheggio, transfer, sale meeting, oggetti smarriti, pasti previsti,
-- conti in casa, Alloggiati Web e ISTAT, check-out che riapre la
-- pulizia, permessi. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(40);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'admin.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000b', 'manager.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000c', 'operatore.test@flowcrm.local')
on conflict (id) do nothing;
insert into user_profiles (id, nome, cognome, ruolo)
values
  ('00000000-0000-0000-0000-00000000000a', 'Anna', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', 'Marco', 'Manager', 'manager'),
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

insert into moduli_licenze (slug, attivo) values ('hotel', true)
on conflict (slug) do update set attivo = excluded.attivo;

-- ═══ STRUTTURA E OSPITI IN CASA ══════════════════════════════════════
insert into hotel_strutture (id, nome, comune, posti_auto) values ('e1000000-0000-0000-0000-0000000000a1', 'Hotel Operativo', 'Firenze', 2);
insert into hotel_tipologie (id, struttura_id, codice, nome, prezzo_base, occupazione_max) values
  ('e2000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1', 'DBL', 'Doppia', 100, 3);
insert into hotel_camere (id, struttura_id, tipologia_id, numero, piano) values
  ('e3000000-0000-0000-0000-000000000101', 'e1000000-0000-0000-0000-0000000000a1', 'e2000000-0000-0000-0000-0000000000a1', '101', 1),
  ('e3000000-0000-0000-0000-000000000102', 'e1000000-0000-0000-0000-0000000000a1', 'e2000000-0000-0000-0000-0000000000a1', '102', 1),
  ('e3000000-0000-0000-0000-000000000103', 'e1000000-0000-0000-0000-0000000000a1', 'e2000000-0000-0000-0000-0000000000a1', '103', 1);
update hotel_camere set stato_pulizia = 'da_pulire' where id = 'e3000000-0000-0000-0000-000000000103';
insert into hotel_trattamenti (id, struttura_id, codice, nome, colazione, cena, supplemento_adulto) values
  ('e4000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1', 'HB', 'Mezza pensione', true, true, 30);

-- A parte oggi dalla 101; B è in casa nella 102 da tre notti; C arriva oggi nella 101.
insert into hotel_prenotazioni (id, struttura_id, ospite_nome, arrivo, partenza, tipologia_id, camera_id, trattamento_id, stato, check_in_at) values
  ('e5000000-0000-0000-0000-00000000000a', 'e1000000-0000-0000-0000-0000000000a1', 'Ospite A', pg_temp.oggi() - 2, pg_temp.oggi(),
   'e2000000-0000-0000-0000-0000000000a1', 'e3000000-0000-0000-0000-000000000101', 'e4000000-0000-0000-0000-0000000000a1', 'in_soggiorno', now()),
  ('e5000000-0000-0000-0000-00000000000b', 'e1000000-0000-0000-0000-0000000000a1', 'Ospite B', pg_temp.oggi() - 3, pg_temp.oggi() + 2,
   'e2000000-0000-0000-0000-0000000000a1', 'e3000000-0000-0000-0000-000000000102', 'e4000000-0000-0000-0000-0000000000a1', 'in_soggiorno', now());
insert into hotel_prenotazioni (id, struttura_id, ospite_nome, arrivo, partenza, tipologia_id, camera_id, trattamento_id) values
  ('e5000000-0000-0000-0000-00000000000c', 'e1000000-0000-0000-0000-0000000000a1', 'Ospite C', pg_temp.oggi(), pg_temp.oggi() + 1,
   'e2000000-0000-0000-0000-0000000000a1', 'e3000000-0000-0000-0000-000000000101', 'e4000000-0000-0000-0000-0000000000a1');
select hotel_conto_prenotazione('e5000000-0000-0000-0000-00000000000a');
select hotel_conto_prenotazione('e5000000-0000-0000-0000-00000000000b');

-- ═══ PULIZIE ═════════════════════════════════════════════════════════
select is(hotel_genera_pulizie('e1000000-0000-0000-0000-0000000000a1', pg_temp.oggi()), 3, 'tre pulizie generate per oggi');
select is((select string_agg(c.numero || ':' || p.tipo || ':' || p.priorita, ', ' order by c.numero)
             from hotel_pulizie p join hotel_camere c on c.id = p.camera_id where p.struttura_id = 'e1000000-0000-0000-0000-0000000000a1'),
  '101:partenza:alta, 102:cambio_biancheria:normale, 103:partenza:normale',
  'partenza con arrivo in giornata in testa, cambio biancheria alla terza notte, camera lasciata sporca');
select is(hotel_genera_pulizie('e1000000-0000-0000-0000-0000000000a1', pg_temp.oggi()), 0, 'rigenerare non crea doppioni');

update hotel_pulizie set stato = 'in_corso' where camera_id = 'e3000000-0000-0000-0000-000000000101' and data = pg_temp.oggi();
select is((select stato_pulizia::text from hotel_camere where id = 'e3000000-0000-0000-0000-000000000101'), 'in_pulizia', 'pulizia iniziata: camera in pulizia');
update hotel_pulizie set stato = 'fatta' where camera_id = 'e3000000-0000-0000-0000-000000000101' and data = pg_temp.oggi();
select is((select stato_pulizia::text from hotel_camere where id = 'e3000000-0000-0000-0000-000000000101'), 'pulita', 'pulizia finita: camera pulita');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
update hotel_pulizie set stato = 'verificata' where camera_id = 'e3000000-0000-0000-0000-000000000101' and data = pg_temp.oggi();
select pg_temp.torna_postgres();
select is((select format('%s|%s', k.stato_pulizia, p.verificata_da = '00000000-0000-0000-0000-00000000000b') from hotel_pulizie p
             join hotel_camere k on k.id = p.camera_id where p.camera_id = 'e3000000-0000-0000-0000-000000000101' and p.data = pg_temp.oggi()),
  'verificata|t', 'controllo della governante: camera verificata, con chi l''ha controllata');
select throws_ok($$update hotel_pulizie set stato = 'in_corso' where camera_id = 'e3000000-0000-0000-0000-000000000101' and data = pg_temp.oggi()$$,
  '23514', null, 'una pulizia verificata non torna in corso');

select is(hotel_assegna_pulizie('e1000000-0000-0000-0000-0000000000a1', pg_temp.oggi(),
            array['00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c']::uuid[]), 2,
  'le due pulizie ancora da fare vengono assegnate');
select is((select count(distinct assegnata_a) from hotel_pulizie where struttura_id = 'e1000000-0000-0000-0000-0000000000a1'
             and stato = 'da_fare'), 2::bigint, 'una a testa: il carico è bilanciato');

update hotel_pulizie set anomalie = 'Rubinetto che gocciola' where camera_id = 'e3000000-0000-0000-0000-000000000102' and data = pg_temp.oggi();
select is((select format('%s|%s', m.codice ~ '^MAN-\d{4}-\d{4}$', m.descrizione) from hotel_manutenzioni m
             join hotel_pulizie p on p.id = m.pulizia_id where p.camera_id = 'e3000000-0000-0000-0000-000000000102'),
  't|Rubinetto che gocciola', 'l''anomalia trovata in pulizia diventa una segnalazione');

-- ═══ MANUTENZIONE E FUORI SERVIZIO ═══════════════════════════════════
insert into hotel_manutenzioni (id, struttura_id, camera_id, categoria, descrizione, priorita, mette_fuori_servizio) values
  ('e6000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1', 'e3000000-0000-0000-0000-000000000103',
   'climatizzazione', 'Condizionatore guasto', 'alta', true);
select is((select fuori_servizio from hotel_camere where id = 'e3000000-0000-0000-0000-000000000103'), true, 'guasto bloccante: camera fuori servizio');
select is((select stato from hotel_camere_stato where camera_id = 'e3000000-0000-0000-0000-000000000103'), 'fuori_servizio', 'e così risulta in mappa');
update hotel_manutenzioni set stato = 'risolta', costo = 180 where id = 'e6000000-0000-0000-0000-0000000000a1';
select is((select fuori_servizio from hotel_camere where id = 'e3000000-0000-0000-0000-000000000103'), false, 'riparato: la camera torna in servizio');

-- ═══ BIANCHERIA ══════════════════════════════════════════════════════
insert into hotel_biancheria (id, struttura_id, tipo, descrizione, costo_unitario, costo_lavaggio, cicli_vita) values
  ('e7000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1', 'lenzuola', 'Lenzuolo matrimoniale', 18, 1.20, 150);
insert into hotel_biancheria_movimenti (biancheria_id, tipo, quantita) values ('e7000000-0000-0000-0000-0000000000a1', 'acquisto', 100);
insert into hotel_biancheria_movimenti (biancheria_id, tipo, quantita) values ('e7000000-0000-0000-0000-0000000000a1', 'invio_lavanderia', 30);
select is((select format('%s|%s|%s', dotazione, in_lavanderia, (select costo from hotel_biancheria_movimenti where biancheria_id = b.id and tipo = 'invio_lavanderia'))
             from hotel_biancheria b where id = 'e7000000-0000-0000-0000-0000000000a1'),
  '100|30|36.00', 'trenta lenzuola in lavanderia, a 1,20 € l''una');
select throws_ok($$insert into hotel_biancheria_movimenti (biancheria_id, tipo, quantita) values ('e7000000-0000-0000-0000-0000000000a1', 'rientro_lavanderia', 40)$$,
  '23514', null, 'non rientra più di quanto è uscito');
insert into hotel_biancheria_movimenti (biancheria_id, tipo, quantita) values
  ('e7000000-0000-0000-0000-0000000000a1', 'rientro_lavanderia', 30),
  ('e7000000-0000-0000-0000-0000000000a1', 'perdita', 5);
select is((select format('%s|%s|%s', dotazione, disponibili, lavaggi_medi) from hotel_biancheria_stato where biancheria_id = 'e7000000-0000-0000-0000-0000000000a1'),
  '95|95|0.3', 'rientro, una perdita, lavaggi medi per pezzo');

-- ═══ MINIBAR ═════════════════════════════════════════════════════════
insert into mag_articoli (id, modulo, descrizione, unita_misura, costo_unitario, aliquota_iva) values
  ('e8000000-0000-0000-0000-0000000000a1', 'hotel', 'Acqua 50 cl', 'pz', 0.30, 22),
  ('e8000000-0000-0000-0000-0000000000a2', 'hotel', 'Champagne', 'pz', 40, 22);
insert into mag_movimenti (articolo_id, tipo, quantita) values ('e8000000-0000-0000-0000-0000000000a1', 'carico', 10);
insert into hotel_minibar_dotazioni (struttura_id, articolo_id, quantita, prezzo) values
  ('e1000000-0000-0000-0000-0000000000a1', 'e8000000-0000-0000-0000-0000000000a1', 2, 3);
insert into hotel_minibar_consumi (struttura_id, camera_id, articolo_id, quantita) values
  ('e1000000-0000-0000-0000-0000000000a1', 'e3000000-0000-0000-0000-000000000102', 'e8000000-0000-0000-0000-0000000000a1', 2);
select is((select format('%s|%s', r.descrizione, r.importo) from conti_righe r join hotel_prenotazioni p on p.conto_id = r.conto_id
             where p.id = 'e5000000-0000-0000-0000-00000000000b' and r.riferimento_tipo = 'hotel_minibar_consumi'),
  'Minibar · Acqua 50 cl|6.00', 'due bottiglie dal minibar sul conto della 102');
select is((select giacenza from mag_giacenze where articolo_id = 'e8000000-0000-0000-0000-0000000000a1'), 8.000, 'e scaricate dal magazzino');
select throws_like($$insert into hotel_minibar_consumi (struttura_id, camera_id, articolo_id, quantita) values
  ('e1000000-0000-0000-0000-0000000000a1', 'e3000000-0000-0000-0000-000000000102', 'e8000000-0000-0000-0000-0000000000a2', 1)$$,
  'Champagne non è nella dotazione del minibar', 'solo ciò che sta nella dotazione');

-- ═══ SERVIZI E SPA ═══════════════════════════════════════════════════
insert into hotel_servizi (id, struttura_id, nome, tipo, prezzo, durata_min, richiede_operatore, risorse) values
  ('e9000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1', 'Massaggio rilassante', 'massaggio', 70, 50, true, '{Cabina 1,Cabina 2}');
insert into hotel_servizi_prenotazioni (id, servizio_id, prenotazione_id, ospite_nome, inizio, operatore_id, risorsa) values
  ('ea000000-0000-0000-0000-0000000000a1', 'e9000000-0000-0000-0000-0000000000a1', 'e5000000-0000-0000-0000-00000000000b', 'Ospite B',
   (pg_temp.oggi() + 1) + time '10:00', '00000000-0000-0000-0000-00000000000a', 'Cabina 1');
select is((select format('%s|%s', fine - inizio, prezzo_unitario) from hotel_servizi_prenotazioni where id = 'ea000000-0000-0000-0000-0000000000a1'),
  '00:50:00|70.00', 'durata e prezzo dal catalogo');
select throws_ok($$insert into hotel_servizi_prenotazioni (servizio_id, ospite_nome, inizio, operatore_id, risorsa) values
  ('e9000000-0000-0000-0000-0000000000a1', 'Altro', (pg_temp.oggi() + 1) + time '10:30', '00000000-0000-0000-0000-00000000000c', 'Cabina 1')$$,
  '23P01', null, 'la stessa cabina non si prenota due volte');
select throws_ok($$insert into hotel_servizi_prenotazioni (servizio_id, ospite_nome, inizio, operatore_id, risorsa) values
  ('e9000000-0000-0000-0000-0000000000a1', 'Altro', (pg_temp.oggi() + 1) + time '10:30', '00000000-0000-0000-0000-00000000000a', 'Cabina 2')$$,
  '23P01', null, 'lo stesso operatore non massaggia due persone insieme');
update hotel_servizi_prenotazioni set stato = 'erogato' where id = 'ea000000-0000-0000-0000-0000000000a1';
select is((select r.importo from conti_righe r join hotel_servizi_prenotazioni s on s.conto_riga_id = r.id
             where s.id = 'ea000000-0000-0000-0000-0000000000a1'), 70.00, 'massaggio erogato: sul conto della camera');
insert into hotel_servizi_prenotazioni (id, servizio_id, ospite_nome, inizio, operatore_id, risorsa, stato) values
  ('ea000000-0000-0000-0000-0000000000a2', 'e9000000-0000-0000-0000-0000000000a1', 'Cliente della SPA', (pg_temp.oggi() + 2) + time '15:00',
   '00000000-0000-0000-0000-00000000000c', 'Cabina 2', 'erogato');
select is((select format('%s|%s', c.descrizione, s.totale) from hotel_servizi_prenotazioni x join conti c on c.id = x.conto_id
             join conti_saldi s on s.conto_id = c.id where x.id = 'ea000000-0000-0000-0000-0000000000a2'),
  'Massaggio rilassante · Cliente della SPA|70.00', 'cliente esterno: un conto suo da incassare');

-- ═══ PARCHEGGIO, TRANSFER, SALE, OGGETTI SMARRITI ════════════════════
insert into hotel_parcheggio (id, struttura_id, prenotazione_id, targa, posto, ingresso_at, tariffa_giorno) values
  ('eb000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1', 'e5000000-0000-0000-0000-00000000000b', 'ab 123 cd', 'P1',
   now() - interval '2 days 3 hours', 15);
select throws_like($$insert into hotel_parcheggio (struttura_id, targa) values ('e1000000-0000-0000-0000-0000000000a1', 'AB123CD')$$,
  'Il veicolo AB123CD risulta già nel parcheggio', 'targa normalizzata, niente doppio ingresso');
update hotel_parcheggio set uscita_at = now() where id = 'eb000000-0000-0000-0000-0000000000a1';
select is((select format('%s|%s', p.giorni, r.importo) from hotel_parcheggio p join conti_righe r on r.id = p.conto_riga_id
             where p.id = 'eb000000-0000-0000-0000-0000000000a1'), '3|45.00', 'due giorni e tre ore: tre giornate sul conto');

insert into hotel_transfer (id, struttura_id, prenotazione_id, ospite_nome, tipo, direzione, data_ora, luogo, passeggeri, costo, prezzo) values
  ('ec000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1', 'e5000000-0000-0000-0000-00000000000b', 'Ospite B',
   'aeroporto', 'partenza', now() + interval '2 days', 'Aeroporto di Firenze', 2, 25, 40);
update hotel_transfer set stato = 'svolto' where id = 'ec000000-0000-0000-0000-0000000000a1';
select is((select format('%s|%s', r.importo, r.aliquota_iva) from hotel_transfer t join conti_righe r on r.id = t.conto_riga_id
             where t.id = 'ec000000-0000-0000-0000-0000000000a1'), '40.00|10.00', 'transfer svolto: prezzo all''ospite con IVA al 10%');

insert into hotel_sale (id, struttura_id, nome, capienze, prezzo_giornata) values
  ('ed000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1', 'Sala Arno', '{"teatro": 50, "banchi": 24}', 600);
select throws_like($$insert into hotel_sale_prenotazioni (sala_id, titolo, inizio, fine, allestimento, partecipanti) values
  ('ed000000-0000-0000-0000-0000000000a1', 'Convegno', (pg_temp.oggi() + 10) + time '09:00', (pg_temp.oggi() + 10) + time '18:00', 'teatro', 60)$$,
  'La sala Sala Arno allestita a teatro ospita al massimo 50 persone', 'capienza dell''allestimento');
insert into hotel_sale_prenotazioni (sala_id, titolo, inizio, fine, allestimento, partecipanti, stato) values
  ('ed000000-0000-0000-0000-0000000000a1', 'Convegno', (pg_temp.oggi() + 10) + time '09:00', (pg_temp.oggi() + 10) + time '18:00', 'teatro', 45, 'confermata');
select throws_ok($$insert into hotel_sale_prenotazioni (sala_id, titolo, inizio, fine) values
  ('ed000000-0000-0000-0000-0000000000a1', 'Riunione', (pg_temp.oggi() + 10) + time '14:00', (pg_temp.oggi() + 10) + time '16:00')$$,
  '23P01', null, 'la sala non si prenota due volte');

insert into hotel_oggetti_smarriti (id, struttura_id, descrizione, camera_id, ubicazione) values
  ('ee000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1', 'Caricabatterie', 'e3000000-0000-0000-0000-000000000101', 'Cassaforte reception');
select is((select format('%s|%s|%s', o.codice ~ '^OGG-\d{4}-\d{4}$', o.custodia_fino - o.trovato_il,
                         (select count(*) from scadenze_moduli s where s.entita_id = o.id and s.stato = 'aperta'))
             from hotel_oggetti_smarriti o where o.id = 'ee000000-0000-0000-0000-0000000000a1'),
  't|365|1', 'oggetto custodito con codice e scadenza della custodia');

-- ═══ PASTI, CONTI IN CASA, ADEMPIMENTI ═══════════════════════════════
select is((select string_agg(pasto || ':' || ospite, ', ' order by pasto, ospite) from hotel_pasti_previsti('e1000000-0000-0000-0000-0000000000a1', pg_temp.oggi())),
  'cena:Ospite B, cena:Ospite C, colazione:Ospite A, colazione:Ospite B',
  'colazione per chi ha dormito, cena per chi dorme stanotte');
select is((select string_agg(camera, ',' order by camera) from hotel_conti_in_casa where struttura_id = 'e1000000-0000-0000-0000-0000000000a1'),
  '101,102', 'conti camera su cui ristorante e bar possono addebitare');

insert into contatti (id, nome, cognome) values ('ef000000-0000-0000-0000-0000000000a1', 'Giulia', 'Bianchi');
insert into hotel_ospiti (id, contatto_id, sesso, data_nascita, codice_comune_nascita, provincia_nascita, codice_stato_nascita,
                          codice_cittadinanza, documento_tipo, documento_numero, codice_luogo_documento, residenza_provincia) values
  ('ef100000-0000-0000-0000-0000000000a1', 'ef000000-0000-0000-0000-0000000000a1', 'F', '1990-03-15', '403015146', 'MI', '100000100',
   '100000100', 'IDENT', 'ca1234567', '403015146', 'MI');
insert into contatti (id, nome) values ('ef000000-0000-0000-0000-0000000000a2', 'Tom');
insert into hotel_ospiti (id, contatto_id) values ('ef100000-0000-0000-0000-0000000000a2', 'ef000000-0000-0000-0000-0000000000a2');
insert into hotel_soggiorno_ospiti (prenotazione_id, ospite_id, tipo_alloggiato) values
  ('e5000000-0000-0000-0000-00000000000b', 'ef100000-0000-0000-0000-0000000000a1', '17'),
  ('e5000000-0000-0000-0000-00000000000b', 'ef100000-0000-0000-0000-0000000000a2', '19');
select is((select length(split_part(hotel_alloggiati_file('e1000000-0000-0000-0000-0000000000a1', pg_temp.oggi() - 3), E'\r\n', 1))), 168,
  'schedina di Alloggiati Web: 168 caratteri');
select is((select substr(split_part(hotel_alloggiati_file('e1000000-0000-0000-0000-0000000000a1', pg_temp.oggi() - 3), E'\r\n', 1), 1, 14)
             || '|' || substr(split_part(hotel_alloggiati_file('e1000000-0000-0000-0000-0000000000a1', pg_temp.oggi() - 3), E'\r\n', 1), 15, 7)),
  '17' || to_char(pg_temp.oggi() - 3, 'DD/MM/YYYY') || '05|BIANCHI', 'capofamiglia, arrivo, cinque notti, cognome');
select is((select array_to_string(mancanti, ', ') from hotel_alloggiati_controllo('e1000000-0000-0000-0000-0000000000a1', pg_temp.oggi() - 3)
            where ospite = 'Tom'), 'cognome, sesso, data di nascita, stato di nascita, cittadinanza', 'i dati che mancano al familiare');
select is((select format('%s|%s', arrivi, presenze) from hotel_istat_movimento('e1000000-0000-0000-0000-0000000000a1', pg_temp.oggi() - 3)
            where provenienza = 'MI'), '1|1', 'movimento ISTAT per provenienza');

-- ═══ CHECK-OUT CHE RIAPRE LA PULIZIA ═════════════════════════════════
select hotel_check_out('e5000000-0000-0000-0000-00000000000a');
insert into conti_pagamenti (conto_id, metodo, importo)
select p.conto_id, 'pos', s.residuo from hotel_prenotazioni p join conti_saldi s on s.conto_id = p.conto_id where p.id = 'e5000000-0000-0000-0000-00000000000a';
select is((select hotel_check_out('e5000000-0000-0000-0000-00000000000a')->>'completato'), 'true', 'A parte');
select is((select format('%s|%s', p.stato, k.stato_pulizia) from hotel_pulizie p join hotel_camere k on k.id = p.camera_id
             where p.camera_id = 'e3000000-0000-0000-0000-000000000101' and p.data = pg_temp.oggi() and p.tipo = 'partenza'),
  'da_fare|da_pulire', 'il check-out riapre la pulizia della camera già controllata');

-- ═══ PERMESSI ════════════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select lives_ok($$insert into hotel_minibar_consumi (struttura_id, camera_id, articolo_id, quantita, created_by) values
  ('e1000000-0000-0000-0000-0000000000a1', 'e3000000-0000-0000-0000-000000000102', 'e8000000-0000-0000-0000-0000000000a1', 1, '00000000-0000-0000-0000-00000000000c')$$,
  'il personale ai piani registra il minibar');
select throws_ok($$insert into hotel_servizi (struttura_id, nome, prezzo, created_by) values
  ('e1000000-0000-0000-0000-0000000000a1', 'Abusivo', 1, '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'il listino dei servizi è della direzione');
select pg_temp.torna_postgres();

select * from finish();
rollback;
