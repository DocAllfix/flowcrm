-- ═══════════════════════════════════════════════════════════════════
-- Gate FONDAMENTA F0.2 + F0.3 — asset e manutenzioni, cassa e conti.
-- Importi attesi calcolati a mano (vedi commenti). ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(54);

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

insert into moduli_licenze (slug, attivo) values
  ('ristorante', true), ('bar', false), ('hotel', true), ('palestra', false)
on conflict (slug) do update set attivo = excluded.attivo;

-- ═══ ASSET ═══════════════════════════════════════════════════════════
insert into asset (id, modulo, descrizione, categoria, data_acquisto, garanzia_scadenza, assistenza_scadenza) values
  ('a5000000-0000-0000-0000-000000000001', 'fb', 'Forno combinato', 'forno',
   current_date - 400, current_date + 30, current_date + 90);

select matches((select codice from asset where id = 'a5000000-0000-0000-0000-000000000001'),
  '^AST-\d{4}-\d{4}$', 'codice asset AST-AAAA-NNNN');
select is((select count(*)::int from scadenze_moduli
            where entita = 'asset' and entita_id = 'a5000000-0000-0000-0000-000000000001' and stato = 'aperta'),
  2, 'garanzia e contratto di assistenza entrano nello scadenzario');

insert into asset_piani (id, asset_id, descrizione, ogni_giorni, prossima_data) values
  ('a5100000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001',
   'Pulizia bruciatori', 180, current_date + 10);

select is((select modulo from asset_piani where id = 'a5100000-0000-0000-0000-000000000001'), 'fb',
  'il piano eredita il modulo dall''asset');
select is((select data_scadenza from scadenze_moduli
            where entita = 'asset_piani' and entita_id = 'a5100000-0000-0000-0000-000000000001' and stato = 'aperta'),
  current_date + 10, 'il piano di manutenzione entra nello scadenzario alla prossima data');

-- Guasto aperto: costo 80 + 45,50 = 125,50; 6 ore di fermo.
insert into asset_interventi (id, asset_id, tipo, descrizione, costo_manodopera, costo_ricambi, ore_fermo) values
  ('a5200000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001',
   'guasto', 'Non scalda', 80, 45.50, 6);
select is((select stato::text from asset where id = 'a5000000-0000-0000-0000-000000000001'), 'guasto',
  'un guasto aperto mette l''asset in stato guasto');

-- Manutenzione del piano, chiusa due giorni fa: prossima = oggi - 2 + 180.
insert into asset_interventi (asset_id, piano_id, tipo, stato, descrizione, data_intervento) values
  ('a5000000-0000-0000-0000-000000000001', 'a5100000-0000-0000-0000-000000000001',
   'preventiva', 'chiuso', 'Pulizia eseguita', current_date - 2);
select is((select stato::text from asset where id = 'a5000000-0000-0000-0000-000000000001'), 'guasto',
  'chiudere un''altra manutenzione non annulla il guasto ancora aperto');
select is((select prossima_data from asset_piani where id = 'a5100000-0000-0000-0000-000000000001'),
  current_date + 178, 'la manutenzione chiusa sposta il piano alla data dell''intervento + periodicità');
select is((select string_agg(data_scadenza::text, ',') from scadenze_moduli
            where entita = 'asset_piani' and entita_id = 'a5100000-0000-0000-0000-000000000001' and stato = 'aperta'),
  (current_date + 178)::text, 'nello scadenzario resta una sola scadenza del piano, alla data nuova');

update asset_interventi set stato = 'chiuso' where id = 'a5200000-0000-0000-0000-000000000001';
select is((select stato::text from asset where id = 'a5000000-0000-0000-0000-000000000001'), 'in_uso',
  'chiuso l''ultimo guasto l''asset torna in uso');
select is((select data_intervento from asset_interventi where id = 'a5200000-0000-0000-0000-000000000001'),
  current_date, 'la chiusura senza data prende la data di oggi');
select is((select format('%s|%s|%s', guasti, costo_interventi, mtbf_giorni) from asset_indicatori
            where asset_id = 'a5000000-0000-0000-0000-000000000001'),
  '1|125.50|400.0', 'indicatori: 1 guasto, costo 125,50, MTBF 400 giorni');

update asset set stato = 'dismesso' where id = 'a5000000-0000-0000-0000-000000000001';
select is((select count(*)::int from scadenze_moduli
            where entita_id in ('a5000000-0000-0000-0000-000000000001', 'a5100000-0000-0000-0000-000000000001')
              and stato = 'aperta'),
  0, 'asset dismesso: nessuna scadenza aperta, né sua né dei suoi piani');
select is((select attivo from asset_piani where id = 'a5100000-0000-0000-0000-000000000001'), false,
  'asset dismesso: i piani si fermano');

select throws_ok($$insert into asset (modulo, descrizione) values ('cantiere', 'Gru')$$,
  '23514', null, 'asset di un modulo fuori dalle fondamenta rifiutato');

insert into asset (id, modulo, descrizione, garanzia_scadenza) values
  ('a5000000-0000-0000-0000-000000000002', 'hotel', 'Caldaia', current_date + 200);
delete from asset where id = 'a5000000-0000-0000-0000-000000000002';
select is((select count(*)::int from scadenze_moduli where entita_id = 'a5000000-0000-0000-0000-000000000002'),
  0, 'asset cancellato: nessuna scadenza orfana');

-- Per la prova delle licenze in fondo: un asset fb con garanzia aperta.
insert into asset (id, modulo, descrizione, garanzia_scadenza) values
  ('a5000000-0000-0000-0000-000000000003', 'fb', 'Macchina del caffè', current_date + 60);

-- ═══ CASSA ═══════════════════════════════════════════════════════════
insert into organizzazioni (id, ragione_sociale) values
  ('f0000000-0000-0000-0000-000000000002', 'Azienda Convenzionata Srl');

insert into cassa_sessioni (id, modulo, postazione, fondo_iniziale) values
  ('c5000000-0000-0000-0000-000000000001', 'ristorante', 'Cassa sala', 100);
select throws_ok($$insert into cassa_sessioni (modulo, postazione) values ('ristorante', 'Cassa sala')$$,
  '23505', null, 'una sola sessione aperta per postazione');

insert into conti (id, modulo, descrizione, coperti) values
  ('c1000000-0000-0000-0000-00000000000a', 'ristorante', 'Tavolo 4', 4),
  ('c1000000-0000-0000-0000-00000000000b', 'ristorante', 'Tavolo 4 bis', 2),
  ('c1000000-0000-0000-0000-00000000000c', 'ristorante', 'Tavolo 7', 2),
  ('c1000000-0000-0000-0000-00000000000d', 'ristorante', 'Tavolo 9', 1),
  ('c1000000-0000-0000-0000-0000000000a1', 'hotel', 'Camera 104', null);
insert into conti (id, modulo, descrizione) values
  ('c1000000-0000-0000-0000-0000000000f1', 'palestra', 'Socio');
insert into conti (id, modulo, descrizione, organizzazione_id) values
  ('c1000000-0000-0000-0000-00000000000e', 'ristorante', 'Pranzo aziendale', 'f0000000-0000-0000-0000-000000000002');

-- Conto A: 24,00 + 8,50 + 20,00 + 5,00 (10 € scontato del 50%) = 57,50.
insert into conti_righe (id, conto_id, descrizione, quantita, prezzo_unitario, sconto_percentuale, aliquota_iva) values
  ('c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-00000000000a', 'Risotto', 2, 12, 0, 10),
  ('c2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-00000000000a', 'Tiramisù', 1, 8.5, 0, 10),
  ('c2000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-00000000000a', 'Vino rosso', 1, 20, 0, 22),
  ('c2000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-00000000000a', 'Antipasto', 1, 10, 50, 10);

select matches((select codice from conti where id = 'c1000000-0000-0000-0000-00000000000a'),
  '^CNT-\d{4}-\d{4}$', 'codice conto CNT-AAAA-NNNN');
select is((select string_agg(distinct modulo, ',') from conti_righe where conto_id = 'c1000000-0000-0000-0000-00000000000a'),
  'ristorante', 'le righe ereditano il modulo dal conto');
select is((select totale from conti_saldi where conto_id = 'c1000000-0000-0000-0000-00000000000a'), 57.50::numeric(12,2),
  'totale calcolato con lo sconto di riga');
-- 5750 centesimi / 3 = 1916 resto 2 → 19,17 + 19,17 + 19,16.
select is(dividi_conto_in_parti('c1000000-0000-0000-0000-00000000000a', 3), '{19.17,19.17,19.16}'::numeric[],
  'alla romana: tre quote che sommano esattamente al totale');
select throws_ok($$insert into conti_pagamenti (conto_id, metodo, importo) values ('c1000000-0000-0000-0000-00000000000a', 'pos', 60)$$,
  '23514', null, 'pagamento oltre il dovuto rifiutato');

insert into conti_pagamenti (conto_id, metodo, importo, sessione_id) values
  ('c1000000-0000-0000-0000-00000000000a', 'contanti', 20, 'c5000000-0000-0000-0000-000000000001');
select is((select residuo from conti_saldi where conto_id = 'c1000000-0000-0000-0000-00000000000a'), 37.50::numeric(12,2),
  'pagamento parziale: residuo 37,50');
select throws_ok($$select chiudi_conto('c1000000-0000-0000-0000-00000000000a')$$,
  '23514', null, 'un conto non saldato non si chiude');
select throws_ok($$update conti set stato = 'chiuso' where id = 'c1000000-0000-0000-0000-00000000000a'$$,
  '23514', null, 'nemmeno con un aggiornamento diretto');

-- Conti separati: il vino passa al conto B, il totale complessivo resta 57,50.
select is(sposta_righe_conto(array['c2000000-0000-0000-0000-000000000003']::uuid[], 'c1000000-0000-0000-0000-00000000000b'),
  1, 'una riga spostata');
select is((select format('%s|%s', sum(totale) filter (where conto_id = 'c1000000-0000-0000-0000-00000000000a'),
                                    sum(totale)) from conti_saldi
            where conto_id in ('c1000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-00000000000b')),
  '37.50|57.50', 'righe spostate senza perdite: 37,50 + 20,00 = 57,50');
-- Spostare il risotto (24) lascerebbe A a 13,50 con 20 già pagati.
select throws_ok($$select sposta_righe_conto(array['c2000000-0000-0000-0000-000000000001']::uuid[], 'c1000000-0000-0000-0000-00000000000b')$$,
  '23514', null, 'non si sposta una riga se il conto di partenza resta pagato più del dovuto');
select throws_ok($$update conti_righe set conto_id = 'c1000000-0000-0000-0000-0000000000a1' where id = 'c2000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'tra moduli diversi le righe non si spostano: si addebita');

-- Addebito in camera, con IVA ripartita: C = 10 al 10% + 30 al 22% = 40;
-- addebito di 20 → 5 al 10% e 15 al 22% sul conto della camera.
insert into conti_righe (conto_id, descrizione, prezzo_unitario, aliquota_iva) values
  ('c1000000-0000-0000-0000-00000000000c', 'Menu del giorno', 10, 10),
  ('c1000000-0000-0000-0000-00000000000c', 'Bottiglia', 30, 22);
insert into conti_pagamenti (conto_id, metodo, importo, conto_destinazione_id) values
  ('c1000000-0000-0000-0000-00000000000c', 'addebito_conto', 20, 'c1000000-0000-0000-0000-0000000000a1');
select is((select string_agg(aliquota_iva || ':' || importo, ',' order by aliquota_iva) from conti_righe
            where conto_id = 'c1000000-0000-0000-0000-0000000000a1'),
  '10.00:5.00,22.00:15.00', 'l''addebito arriva in camera diviso per aliquota');
select is((select format('%s|%s', modulo, riferimento_tipo) from conti_righe
            where conto_id = 'c1000000-0000-0000-0000-0000000000a1' limit 1),
  'hotel|addebito', 'le righe di addebito appartengono al conto di destinazione');
select is((select residuo from conti_saldi where conto_id = 'c1000000-0000-0000-0000-00000000000c'), 20.00::numeric(12,2),
  'il conto di partenza scende del solo addebito');

insert into conti_pagamenti (conto_id, metodo, importo, sessione_id) values
  ('c1000000-0000-0000-0000-00000000000c', 'contanti', 20, 'c5000000-0000-0000-0000-000000000001');
select lives_ok($$select chiudi_conto('c1000000-0000-0000-0000-00000000000c')$$, 'conto saldato: si chiude');
select ok((select stato = 'chiuso' and chiuso_at is not null from conti where id = 'c1000000-0000-0000-0000-00000000000c'),
  'il conto chiuso ha la data di chiusura');
select throws_ok($$insert into conti_righe (conto_id, descrizione, prezzo_unitario) values ('c1000000-0000-0000-0000-00000000000c', 'Amaro', 4)$$,
  '23514', null, 'conto chiuso: nessuna riga nuova');
select throws_ok($$update conti set sconto_importo = 1 where id = 'c1000000-0000-0000-0000-00000000000c'$$,
  '23514', null, 'conto chiuso: lo sconto non cambia');
select lives_ok($$update conti set note = 'Cliente abituale', rt_riferimento = 'DC-0001' where id = 'c1000000-0000-0000-0000-00000000000c'$$,
  'conto chiuso: note e documento commerciale restano scrivibili');
select throws_ok($$delete from conti_pagamenti where conto_id = 'c1000000-0000-0000-0000-00000000000c'$$,
  '23514', null, 'conto chiuso: i pagamenti non si stornano');
select throws_ok($$delete from conti where id = 'c1000000-0000-0000-0000-00000000000c'$$,
  '23514', null, 'conto chiuso: non si cancella');

-- Storno di un addebito: sparisce anche dal conto della camera.
insert into conti_righe (conto_id, descrizione, prezzo_unitario, aliquota_iva) values
  ('c1000000-0000-0000-0000-00000000000d', 'Pizza', 15, 10);
insert into conti_pagamenti (id, conto_id, metodo, importo, conto_destinazione_id) values
  ('c3000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-00000000000d', 'addebito_conto', 15,
   'c1000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from conti_righe where conto_id = 'c1000000-0000-0000-0000-0000000000a1'), 3,
  'secondo addebito in camera');
delete from conti_pagamenti where id = 'c3000000-0000-0000-0000-000000000001';
select is((select count(*)::int from conti_righe where conto_id = 'c1000000-0000-0000-0000-0000000000a1'), 2,
  'pagamento stornato: l''addebito sparisce dalla camera');
select throws_ok($$insert into conti_pagamenti (conto_id, metodo, importo, conto_destinazione_id) values ('c1000000-0000-0000-0000-00000000000d', 'addebito_conto', 5, 'c1000000-0000-0000-0000-00000000000c')$$,
  '23514', null, 'non si addebita su un conto chiuso');
select throws_ok($$insert into conti_pagamenti (conto_id, metodo, importo, conto_destinazione_id) values ('c1000000-0000-0000-0000-00000000000d', 'addebito_conto', 5, 'c1000000-0000-0000-0000-0000000000f1')$$,
  '23514', null, 'non si addebita sul conto di un modulo senza licenza');
insert into conti_pagamenti (conto_id, metodo, importo, sessione_id) values
  ('c1000000-0000-0000-0000-00000000000d', 'contanti', 5, 'c5000000-0000-0000-0000-000000000001');
select throws_ok($$update conti set stato = 'annullato' where id = 'c1000000-0000-0000-0000-00000000000d'$$,
  '23514', null, 'un conto con pagamenti non si annulla');

-- Fattura dal conto aziendale: 110 al 10% → imponibile 100,00.
insert into conti_righe (conto_id, descrizione, prezzo_unitario, aliquota_iva) values
  ('c1000000-0000-0000-0000-00000000000e', 'Pranzo di lavoro', 110, 10);
select throws_ok($$select genera_fattura_da_conto('c1000000-0000-0000-0000-00000000000e', 'T-CONTO-1')$$,
  'P0001', 'La fattura si emette dal conto chiuso', 'la fattura si emette solo dal conto chiuso');
insert into conti_pagamenti (conto_id, metodo, importo, organizzazione_id) values
  ('c1000000-0000-0000-0000-00000000000e', 'conto_aziendale', 110, 'f0000000-0000-0000-0000-000000000002');
select chiudi_conto('c1000000-0000-0000-0000-00000000000e');
select genera_fattura_da_conto('c1000000-0000-0000-0000-00000000000e', 'T-CONTO-1');
select is((select format('%s|%s|%s|%s', f.imponibile, f.aliquota_iva, f.totale, f.organizzazione_id)
             from conti c join fatture f on f.id = c.fattura_id where c.id = 'c1000000-0000-0000-0000-00000000000e'),
  '100.00|10.00|110.00|f0000000-0000-0000-0000-000000000002', 'fattura del nucleo generata dal conto');
select is((select s.importo from conti c join scadenze_pagamento s on s.fattura_id = c.fattura_id
            where c.id = 'c1000000-0000-0000-0000-00000000000e'), 110.00::numeric(12,2),
  'la fattura porta con sé l''incasso previsto');
select throws_ok($$select genera_fattura_da_conto('c1000000-0000-0000-0000-00000000000e', 'T-CONTO-2')$$,
  'P0001', 'Il conto ha già una fattura', 'una sola fattura per conto');

-- Quadratura: fondo 100 + contanti 20 + 20 + 5 = 145 attesi; contati 143.
select is(chiudi_sessione_cassa('c5000000-0000-0000-0000-000000000001', 143), -2::numeric,
  'chiusura di cassa: differenza di -2,00');
select throws_ok($$update cassa_sessioni set note = 'ritocco' where id = 'c5000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'una sessione chiusa non cambia');

-- ═══ RLS E LICENZE ═══════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from conti), 6, 'operatore: conti di ristorante e hotel, non della palestra spenta');
delete from conti where id = 'c1000000-0000-0000-0000-00000000000b';
update conti_pagamenti set importo = 1;
select is((select format('%s|%s', (select count(*) from conti), (select sum(importo) from conti_pagamenti))),
  '6|175.00', 'operatore: non cancella conti e non ritocca pagamenti');
select pg_temp.torna_postgres();

update moduli_licenze set attivo = (slug = 'bar') where slug in ('ristorante', 'bar', 'hotel', 'palestra');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s', (select count(*) from asset), (select count(*) from conti))), '2|0',
  'solo Bar: vede gli asset del motore fb, non i conti del ristorante');
select is((select count(*)::int from scadenze_moduli
            where entita = 'asset' and entita_id = 'a5000000-0000-0000-0000-000000000003'),
  1, 'solo Bar: lo scadenzario mostra le scadenze del motore fb');
select pg_temp.torna_postgres();

update moduli_licenze set attivo = false where slug in ('ristorante', 'bar', 'hotel', 'palestra');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s|%s', modulo_attivo('fb'), modulo_licenziato('fb'), (select count(*) from asset))),
  'f|f|0', 'nessuna licenza: motore fb spento, zero asset');
select pg_temp.torna_postgres();

select * from finish();
rollback;
