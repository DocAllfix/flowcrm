-- ═══════════════════════════════════════════════════════════════════
-- Gate RISTORANTE E BAR — motore fb: prezzi per fascia, prenotazioni,
-- comande, cucina, cassa, magazzino, consegne, sprechi, licenze.
-- Importi e quantità calcolati a mano. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(64);

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

insert into moduli_licenze (slug, attivo) values ('ristorante', true), ('bar', false)
on conflict (slug) do update set attivo = excluded.attivo;

-- ═══ MAGAZZINO E RICETTE ═════════════════════════════════════════════
insert into mag_articoli (id, modulo, descrizione, unita_misura, costo_unitario, allergeni) values
  ('a1000000-0000-0000-0000-000000000001', 'fb', 'Riso Carnaroli', 'kg', 2, '{}'),
  ('a1000000-0000-0000-0000-000000000002', 'fb', 'Funghi porcini', 'kg', 10, '{}'),
  ('a1000000-0000-0000-0000-000000000003', 'fb', 'Burro', 'kg', 8, '{latte}'),
  ('a1000000-0000-0000-0000-000000000004', 'fb', 'Sedano', 'kg', 2, '{sedano}'),
  ('a1000000-0000-0000-0000-000000000005', 'fb', 'Acqua minerale', 'pz', 0.30, '{}'),
  ('a1000000-0000-0000-0000-000000000006', 'fb', 'Birra artigianale', 'pz', 1.20, '{glutine}'),
  ('a1000000-0000-0000-0000-000000000007', 'fb', 'Barolo 2019', 'bottiglia', 22, '{solfiti}');
insert into mag_lotti (id, articolo_id, codice_lotto, data_scadenza) values
  ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'R1', current_date + 300),
  ('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'F-TARDI', current_date + 5),
  ('a2000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'F-PRESTO', current_date + 2),
  ('a2000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003', 'B1', current_date + 20),
  ('a2000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000004', 'S1', current_date + 10),
  ('a2000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000005', 'A1', current_date + 200),
  ('a2000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000006', 'BI1', current_date + 90);
insert into mag_movimenti (articolo_id, lotto_id, tipo, quantita) values
  ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'carico', 2),
  ('a1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', 'carico', 1),
  ('a1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000003', 'carico', 1),
  ('a1000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000004', 'carico', 1),
  ('a1000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000005', 'carico', 1),
  ('a1000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000006', 'carico', 24),
  ('a1000000-0000-0000-0000-000000000006', 'a2000000-0000-0000-0000-000000000007', 'carico', 24);

-- Brodo: 0,5 kg di sedano per 2 litri → 0,50 €/l. Risotto (1 porzione):
-- riso 0,09 (0,18) + funghi 0,08 (0,80) + burro 0,015 (0,12) + brodo 0,2 l (0,10) = 1,20.
insert into distinte_base (id, modulo, nome, tipo, resa, unita_resa) values
  ('a3000000-0000-0000-0000-000000000001', 'fb', 'Brodo vegetale', 'semilavorato', 2, 'l'),
  ('a3000000-0000-0000-0000-000000000002', 'fb', 'Risotto ai funghi', 'ricetta', 1, 'porzione');
insert into distinte_base_righe (distinta_id, articolo_id, sotto_distinta_id, quantita) values
  ('a3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', null, 0.5),
  ('a3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', null, 0.09),
  ('a3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', null, 0.08),
  ('a3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', null, 0.015),
  ('a3000000-0000-0000-0000-000000000002', null, 'a3000000-0000-0000-0000-000000000001', 0.2);

-- ═══ LOCALE, SALA, STAZIONI, CATALOGO ════════════════════════════════
insert into fb_locali (id, modulo, nome, pausa_uscite_min) values
  ('b1000000-0000-0000-0000-000000000001', 'ristorante', 'Trattoria Test', 0);
insert into fb_sale (id, locale_id, nome) values
  ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Sala grande');
insert into fb_tavoli (id, sala_id, numero, posti) values
  ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', '1', 4),
  ('b3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', '2', 2),
  ('b3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', '3', 6);
insert into fb_categorie (id, nome, area, uscita) values
  ('b4000000-0000-0000-0000-000000000001', 'Antipasti', 'food', 1),
  ('b4000000-0000-0000-0000-000000000002', 'Primi', 'food', 2),
  ('b4000000-0000-0000-0000-000000000003', 'Dessert', 'food', 4),
  ('b4000000-0000-0000-0000-000000000004', 'Bevande', 'beverage', 0),
  ('b4000000-0000-0000-0000-000000000005', 'Menu', 'food', 1);
insert into fb_stazioni (id, locale_id, nome, tipo, categorie, predefinita) values
  ('b5000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Cucina', 'cucina',
   '{b4000000-0000-0000-0000-000000000001,b4000000-0000-0000-0000-000000000002,b4000000-0000-0000-0000-000000000003}', true),
  ('b5000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Bar', 'bar',
   '{b4000000-0000-0000-0000-000000000004}', false);
insert into fb_prodotti (id, nome, categoria_id, prezzo, distinta_id, articolo_id, costo_manuale, beverage_tipo) values
  ('b6000000-0000-0000-0000-000000000001', 'Risotto ai funghi', 'b4000000-0000-0000-0000-000000000002', 14, 'a3000000-0000-0000-0000-000000000002', null, null, null),
  ('b6000000-0000-0000-0000-000000000002', 'Acqua', 'b4000000-0000-0000-0000-000000000004', 2.50, null, 'a1000000-0000-0000-0000-000000000005', null, 'acqua'),
  ('b6000000-0000-0000-0000-000000000003', 'Birra', 'b4000000-0000-0000-0000-000000000004', 5, null, 'a1000000-0000-0000-0000-000000000006', null, 'birra'),
  ('b6000000-0000-0000-0000-000000000004', 'Tiramisù', 'b4000000-0000-0000-0000-000000000003', 6, null, null, 1.50, null),
  ('b6000000-0000-0000-0000-000000000005', 'Bruschetta', 'b4000000-0000-0000-0000-000000000001', 5, null, null, 1.00, null);
insert into fb_prodotti (id, nome, categoria_id, prezzo, componenti) values
  ('b6000000-0000-0000-0000-000000000006', 'Menu pranzo', 'b4000000-0000-0000-0000-000000000005', 20,
   '{b6000000-0000-0000-0000-000000000005,b6000000-0000-0000-0000-000000000001,b6000000-0000-0000-0000-000000000002}');

select matches((select codice from fb_prodotti where id = 'b6000000-0000-0000-0000-000000000001'),
  '^PRD-\d{4}-\d{4}$', 'codice prodotto PRD-AAAA-NNNN');
select is(fb_costo_prodotto('b6000000-0000-0000-0000-000000000001'), 1.2000::numeric,
  'costo del risotto lungo la catena materie prime → brodo → piatto: 1,20');
select is(fb_costo_prodotto('b6000000-0000-0000-0000-000000000006'), 2.5000::numeric,
  'costo del menu = somma dei suoi piatti (1,00 + 1,20 + 0,30)');
select is(fb_allergeni_prodotto('b6000000-0000-0000-0000-000000000006'), '{latte,sedano}'::text[],
  'allergeni ereditati fino al semilavorato, anche dentro il menu');
select throws_ok($$insert into fb_prodotti (nome, categoria_id, componenti) values ('Menu di menu', 'b4000000-0000-0000-0000-000000000005', '{b6000000-0000-0000-0000-000000000006}')$$,
  '23514', null, 'un menu non contiene altri menu');

-- ═══ PREZZI PER FASCIA, LISTINI, PROMOZIONI (date del 2030) ══════════
insert into fb_menu (id, locale_id, nome, tipo, ora_inizio, ora_fine, valido_dal, valido_al) values
  ('b7000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Pranzo', 'pranzo',
   '12:00', '15:00', '2030-01-01', '2030-12-31');
insert into fb_menu_voci (menu_id, prodotto_id, prezzo) values
  ('b7000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001', 12);
insert into fb_promozioni (locale_id, nome, tipo, categorie, prezzo, ora_inizio, ora_fine, valido_dal, valido_al) values
  ('b1000000-0000-0000-0000-000000000001', 'Happy hour', 'prezzo_speciale', '{b4000000-0000-0000-0000-000000000004}', 3.50,
   '18:00', '21:00', '2030-01-01', '2030-12-31');
insert into fb_promozioni (locale_id, nome, tipo, prodotti, quantita_x, quantita_y) values
  ('b1000000-0000-0000-0000-000000000001', '2×1 birre', 'x_per_y', '{b6000000-0000-0000-0000-000000000003}', 2, 1);

select is((select format('%s|%s', prezzo, origine) from fb_prezzo('b6000000-0000-0000-0000-000000000001',
            'b1000000-0000-0000-0000-000000000001', 'sala', '2030-05-07 13:00 Europe/Rome')),
  '12.00|listino: Pranzo', 'a pranzo vale il listino del pranzo');
select is((select prezzo from fb_prezzo('b6000000-0000-0000-0000-000000000001',
            'b1000000-0000-0000-0000-000000000001', 'sala', '2030-05-07 20:00 Europe/Rome')),
  14::numeric, 'a cena il prezzo del prodotto');
select is((select format('%s|%s', prezzo, origine) from fb_prezzo('b6000000-0000-0000-0000-000000000003',
            'b1000000-0000-0000-0000-000000000001', 'sala', '2030-05-07 19:00 Europe/Rome')),
  '3.50|promozione: Happy hour', 'happy hour: prezzo speciale solo nella fascia');
select is((select prezzo from fb_prezzo('b6000000-0000-0000-0000-000000000003',
            'b1000000-0000-0000-0000-000000000001', 'sala', '2030-05-07 21:00 Europe/Rome')),
  5::numeric, 'alle 21 l''happy hour è finito');
-- Fascia a cavallo della mezzanotte, solo il venerdì (2030-05-10 è venerdì).
select is((select format('%s|%s|%s|%s',
            fb_in_fascia('2030-05-10 23:00 Europe/Rome', '{5}', '18:00', '02:00', null, null),
            fb_in_fascia('2030-05-11 01:30 Europe/Rome', '{5}', '18:00', '02:00', null, null),
            fb_in_fascia('2030-05-11 03:00 Europe/Rome', '{5}', '18:00', '02:00', null, null),
            fb_in_fascia('2030-05-09 23:00 Europe/Rome', '{5}', '18:00', '02:00', null, null))),
  't|t|f|f', 'fascia 18–02 del venerdì: vale fino alle 2 di sabato, non il giovedì');

-- ═══ PRENOTAZIONI ════════════════════════════════════════════════════
insert into fb_prenotazioni (id, locale_id, nome, inizio, persone, tavoli) values
  ('b8000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Rossi',
   '2030-05-10 20:00 Europe/Rome', 4, '{b3000000-0000-0000-0000-000000000001}');
select is((select fine from fb_prenotazioni where id = 'b8000000-0000-0000-0000-000000000001'),
  '2030-05-10 22:00 Europe/Rome'::timestamptz, 'durata del tavolo dal locale: due ore');
select throws_ok($$insert into fb_prenotazioni (locale_id, nome, inizio, persone, tavoli) values ('b1000000-0000-0000-0000-000000000001', 'Bianchi', '2030-05-10 21:00 Europe/Rome', 2, '{b3000000-0000-0000-0000-000000000001}')$$,
  '23P01', null, 'lo stesso tavolo non si prenota due volte nella stessa fascia');
select lives_ok($$insert into fb_prenotazioni (locale_id, nome, inizio, persone, tavoli) values ('b1000000-0000-0000-0000-000000000001', 'Verdi', '2030-05-10 22:00 Europe/Rome', 2, '{b3000000-0000-0000-0000-000000000001}')$$,
  'il turno successivo che inizia quando finisce il primo è ammesso');
select throws_ok($$insert into fb_prenotazioni (locale_id, nome, inizio, persone, tavoli) values ('b1000000-0000-0000-0000-000000000001', 'Neri', '2030-05-10 13:00 Europe/Rome', 4, '{b3000000-0000-0000-0000-000000000002}')$$,
  '23514', null, 'quattro persone non stanno al tavolo da due');
update fb_prenotazioni set stato = 'annullata' where id = 'b8000000-0000-0000-0000-000000000001';
select lives_ok($$insert into fb_prenotazioni (locale_id, nome, inizio, durata_min, persone, tavoli) values ('b1000000-0000-0000-0000-000000000001', 'Gialli', '2030-05-10 20:00 Europe/Rome', 90, 3, '{b3000000-0000-0000-0000-000000000001}')$$,
  'una prenotazione annullata libera il tavolo');

-- ═══ STATO DEI TAVOLI E LISTA D'ATTESA ═══════════════════════════════
insert into fb_prenotazioni (id, locale_id, nome, inizio, persone, tavoli, stato) values
  ('b8000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Esposito',
   now() + interval '30 minutes', 4, '{b3000000-0000-0000-0000-000000000003}', 'confermata');
update fb_tavoli set fuori_servizio = true where id = 'b3000000-0000-0000-0000-000000000002';
select is((select string_agg(numero || ':' || stato, ',' order by numero) from fb_tavoli_stato
            where locale_id = 'b1000000-0000-0000-0000-000000000001'),
  '1:libero,2:chiuso,3:prenotato', 'mappa: libero, fuori servizio, prenotato entro l''ora');
update fb_tavoli set fuori_servizio = false where id = 'b3000000-0000-0000-0000-000000000002';

-- ═══ COMANDA AL TAVOLO 3 ═════════════════════════════════════════════
insert into fb_comande (id, locale_id, tavolo_id, prenotazione_id, coperti) values
  ('b9000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'b3000000-0000-0000-0000-000000000003', 'b8000000-0000-0000-0000-000000000002', 4);
select is((select stato::text from fb_prenotazioni where id = 'b8000000-0000-0000-0000-000000000002'), 'arrivata',
  'aprire la comanda segna l''arrivo della prenotazione');
select is((select stato from fb_tavoli_stato where tavolo_id = 'b3000000-0000-0000-0000-000000000003'), 'in_attesa',
  'seduti senza ordinare: tavolo in attesa');
select throws_ok($$insert into fb_comande (locale_id, tavolo_id) values ('b1000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000003')$$,
  '23505', null, 'un tavolo ha una sola comanda aperta');

-- Acqua 2 × 2,50; risotto 2 × 14 (dopo); bruschetta 2 × 5; tiramisù 2 × 6
-- (dopo); birra 4 con 2×1 → 2 × 5 + 2 omaggio; menu pranzo 20.
insert into fb_comande_righe (id, comanda_id, prodotto_id, quantita, invio, personalizzazioni) values
  ('ba000000-0000-0000-0000-000000000001', 'b9000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000002', 2, 'immediato', null),
  ('ba000000-0000-0000-0000-000000000002', 'b9000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001', 2, 'differito', 'uno senza burro'),
  ('ba000000-0000-0000-0000-000000000003', 'b9000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000005', 2, 'immediato', null),
  ('ba000000-0000-0000-0000-000000000004', 'b9000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000004', 2, 'differito', null),
  ('ba000000-0000-0000-0000-000000000005', 'b9000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000003', 4, 'immediato', null),
  ('ba000000-0000-0000-0000-000000000006', 'b9000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000006', 1, 'immediato', null);

select is((select format('%s|%s', s.totale, c.modulo) from fb_comande k join conti_saldi s on s.conto_id = k.conto_id
            join conti c on c.id = k.conto_id where k.id = 'b9000000-0000-0000-0000-000000000001'),
  '85.00|ristorante', 'il conto nasce con la comanda: 5 + 28 + 10 + 12 + 10 + 20 = 85');
select is((select format('%s|%s|%s', quantita, prezzo_unitario, uscita) from fb_comande_righe where id = 'ba000000-0000-0000-0000-000000000005'),
  '2.00|5.00|0', '2×1: quattro birre ordinate, due pagate, bevande in uscita subito');
select is((select format('%s|%s|%s', quantita, prezzo_unitario, prezzo_origine) from fb_comande_righe
            where comanda_id = 'b9000000-0000-0000-0000-000000000001' and omaggio and prodotto_id = 'b6000000-0000-0000-0000-000000000003'),
  '2.00|0.00|promozione: 2×1 birre', 'le due birre gratuite sono una riga omaggio della promozione');
select is((select string_agg(p.nome || ':' || s.nome || ':' || r.stato, ',' order by p.nome) from fb_comande_righe r
            join fb_prodotti p on p.id = r.prodotto_id join fb_stazioni s on s.id = r.stazione_id
            where r.padre_id = 'ba000000-0000-0000-0000-000000000006'),
  'Acqua:Bar:da_preparare,Bruschetta:Cucina:da_preparare,Risotto ai funghi:Cucina:da_preparare',
  'il menu si scompone nei suoi piatti, ognuno alla sua postazione');
select is((select format('%s|%s', stato, uscita) from fb_comande_righe where id = 'ba000000-0000-0000-0000-000000000002'),
  'in_attesa|2', 'il risotto aspetta la marcia dei primi');
select is((select count(*)::int from fb_kds where stazione_id = 'b5000000-0000-0000-0000-000000000001'
            and comanda_id = 'b9000000-0000-0000-0000-000000000001'),
  3, 'la cucina vede solo i suoi piatti partiti (le due bruschette e il risotto del menu)');
select is((select stato from fb_tavoli_stato where tavolo_id = 'b3000000-0000-0000-0000-000000000003'), 'in_servizio',
  'piatti in lavorazione: tavolo in servizio');

-- Cucina: presa in carico, pronta; si torna indietro? No.
update fb_comande_righe set stato = 'presa_in_carico' where id = 'ba000000-0000-0000-0000-000000000003';
select ok((select presa_at is not null and preparata_da is null from fb_comande_righe where id = 'ba000000-0000-0000-0000-000000000003'),
  'presa in carico con l''ora');
update fb_comande_righe set stato = 'pronta' where id = 'ba000000-0000-0000-0000-000000000003';
select throws_ok($$update fb_comande_righe set stato = 'in_preparazione' where id = 'ba000000-0000-0000-0000-000000000003'$$,
  '23514', null, 'lo stato della cucina va solo avanti');
select throws_ok($$update fb_comande_righe set quantita = 3 where id = 'ba000000-0000-0000-0000-000000000003'$$,
  '23514', null, 'piatto già preparato: la quantità non cambia');

-- Marcia dei primi e scarico del risotto per lotto (FEFO).
select is(fb_marcia_uscita('b9000000-0000-0000-0000-000000000001', 2::smallint), 1, 'marcia dei primi: parte il risotto');
update fb_comande_righe set stato = 'pronta' where id = 'ba000000-0000-0000-0000-000000000002';
-- 2 porzioni: riso 0,18, funghi 0,16 (dal lotto che scade prima), burro 0,03, sedano 0,1 (0,4 l di brodo).
select is((select string_agg(a.descrizione || ':' || (-m.quantita) || ':' || coalesce(l.codice_lotto, '-'), ',' order by a.descrizione)
             from mag_movimenti m join mag_articoli a on a.id = m.articolo_id left join mag_lotti l on l.id = m.lotto_id
            where m.riferimento_id = 'ba000000-0000-0000-0000-000000000002'),
  'Burro:0.030:B1,Funghi porcini:0.160:F-PRESTO,Riso Carnaroli:0.180:R1,Sedano:0.100:S1',
  'piatto pronto: ricetta scaricata per lotto, dal lotto al tavolo');
select ok((select scaricata from fb_comande_righe where id = 'ba000000-0000-0000-0000-000000000002'), 'riga segnata come scaricata');

-- Annullamenti, rifacimenti, omaggi: il conto segue.
update fb_comande_righe set stato = 'annullata' where id = 'ba000000-0000-0000-0000-000000000004';
select is((select s.totale from fb_comande k join conti_saldi s on s.conto_id = k.conto_id where k.id = 'b9000000-0000-0000-0000-000000000001'),
  73.00::numeric(12,2), 'tiramisù annullato prima della preparazione: esce dal conto (85 − 12)');
update fb_comande_righe set stato = 'servita' where id = 'ba000000-0000-0000-0000-000000000001';
select throws_ok($$update fb_comande_righe set stato = 'annullata' where id = 'ba000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'un piatto servito non si annulla');
select isnt(fb_rifai_riga('ba000000-0000-0000-0000-000000000002', 'restituito'), null, 'risotto restituito: si rifà');
select is((select format('%s|%s|%s', prezzo_unitario, priorita, conti_riga_id is null) from fb_comande_righe
            where rifacimento_di = 'ba000000-0000-0000-0000-000000000002'),
  '0.00|urgente|t', 'il rifacimento è urgente, gratuito e non va sul conto');
update fb_comande_righe set omaggio = true where id = 'ba000000-0000-0000-0000-000000000003';
select is((select s.totale from fb_comande k join conti_saldi s on s.conto_id = k.conto_id where k.id = 'b9000000-0000-0000-0000-000000000001'),
  63.00::numeric(12,2), 'bruschette offerte dalla casa: il conto scende a 63');

-- Disponibilità, stagionalità, canali.
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select lives_ok($$select fb_imposta_disponibilita('b6000000-0000-0000-0000-000000000004', 'esaurito')$$,
  'il personale segna un piatto come finito');
select throws_ok($$insert into fb_comande_righe (comanda_id, prodotto_id, created_by) values ('b9000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000c')$$,
  '23514', null, 'un piatto finito non si ordina');
select throws_ok($$insert into fb_prodotti (nome, categoria_id, created_by) values ('Nuovo', 'b4000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'il personale non crea prodotti');
update fb_prodotti set prezzo = 1 where id = 'b6000000-0000-0000-0000-000000000001';
select pg_temp.torna_postgres();
select is((select prezzo from fb_prodotti where id = 'b6000000-0000-0000-0000-000000000001'), 14.00::numeric(10,2),
  'il personale non cambia i prezzi');
update fb_prodotti set mesi_disponibili = array[(extract(month from now() at time zone 'Europe/Rome')::int % 12) + 1]::smallint[]
 where id = 'b6000000-0000-0000-0000-000000000005';
select throws_ok($$insert into fb_comande_righe (comanda_id, prodotto_id) values ('b9000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000005')$$,
  '23514', null, 'un piatto fuori stagione non si ordina');
update fb_prodotti set mesi_disponibili = '{}' where id = 'b6000000-0000-0000-0000-000000000005';

-- Conto pagato → comanda chiusa, prenotazione conclusa, tavolo libero.
update fb_comande set conto_richiesto_at = now() where id = 'b9000000-0000-0000-0000-000000000001';
select is((select stato from fb_tavoli_stato where tavolo_id = 'b3000000-0000-0000-0000-000000000003'), 'conto_richiesto',
  'conto richiesto dal tavolo');
insert into conti_pagamenti (conto_id, metodo, importo)
select conto_id, 'pos', 63 from fb_comande where id = 'b9000000-0000-0000-0000-000000000001';
select chiudi_conto(conto_id) from fb_comande where id = 'b9000000-0000-0000-0000-000000000001';
select is((select format('%s|%s', k.stato, p.stato) from fb_comande k join fb_prenotazioni p on p.id = k.prenotazione_id
            where k.id = 'b9000000-0000-0000-0000-000000000001'),
  'chiusa|conclusa', 'conto chiuso: comanda chiusa e prenotazione conclusa');
select is((select stato from fb_tavoli_stato where tavolo_id = 'b3000000-0000-0000-0000-000000000003'), 'libero',
  'tavolo di nuovo libero');
select throws_ok($$insert into fb_comande_righe (comanda_id, prodotto_id) values ('b9000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000002')$$,
  '23514', null, 'comanda chiusa: niente righe nuove');

-- ═══ USCITE AUTOMATICHE ══════════════════════════════════════════════
insert into fb_comande (id, locale_id, tavolo_id, uscite_automatiche) values
  ('b9000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000002', true);
insert into fb_comande_righe (id, comanda_id, prodotto_id, stato) values
  ('ba000000-0000-0000-0000-000000000011', 'b9000000-0000-0000-0000-000000000002', 'b6000000-0000-0000-0000-000000000005', 'servita');
insert into fb_comande_righe (id, comanda_id, prodotto_id, invio) values
  ('ba000000-0000-0000-0000-000000000012', 'b9000000-0000-0000-0000-000000000002', 'b6000000-0000-0000-0000-000000000001', 'differito');
select ok(fb_marcia_automatica() >= 1, 'antipasto servito: i primi partono da soli');
select is((select stato::text from fb_comande_righe where id = 'ba000000-0000-0000-0000-000000000012'), 'da_preparare',
  'il risotto è in cucina');

-- ═══ LISTA D'ATTESA ══════════════════════════════════════════════════
insert into fb_attesa (locale_id, nome, persone) values ('b1000000-0000-0000-0000-000000000001', 'Coppia Ferri', 2);
select is((select tavolo from fb_attesa_candidati('b1000000-0000-0000-0000-000000000001') where nome = 'Coppia Ferri'),
  '1', 'in lista d''attesa: il tavolo libero più piccolo che basta (il 2 è occupato)');

-- ═══ ASPORTO E DELIVERY ══════════════════════════════════════════════
update fb_prodotti set canali = '{sala,banco}' where id = 'b6000000-0000-0000-0000-000000000004';
update fb_prodotti set stato = 'attivo' where id = 'b6000000-0000-0000-0000-000000000004';
insert into fb_comande (id, locale_id, canale, cliente_nome, cliente_telefono) values
  ('b9000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'delivery', 'Sig. Russo', '333 0000000');
select throws_ok($$insert into fb_comande_righe (comanda_id, prodotto_id) values ('b9000000-0000-0000-0000-000000000003', 'b6000000-0000-0000-0000-000000000004')$$,
  '23514', null, 'un prodotto non previsto per la consegna non si ordina in delivery');
insert into fb_consegne (comanda_id, indirizzo, costo_consegna) values
  ('b9000000-0000-0000-0000-000000000003', 'Via Roma 1', 3);
select is((select s.totale from fb_comande k join conti_saldi s on s.conto_id = k.conto_id where k.id = 'b9000000-0000-0000-0000-000000000003'),
  3.00::numeric(12,2), 'il costo di consegna va sul conto');
select throws_ok($$insert into fb_consegne (comanda_id, indirizzo) values ('b9000000-0000-0000-0000-000000000002', 'Via Roma 2')$$,
  '23514', null, 'la consegna è solo per le comande delivery');
update fb_consegne set stato = 'consegnata' where comanda_id = 'b9000000-0000-0000-0000-000000000003';
select ok((select consegnata_at is not null from fb_consegne where comanda_id = 'b9000000-0000-0000-0000-000000000003'),
  'consegna registrata con l''ora');

-- ═══ SPRECHI ═════════════════════════════════════════════════════════
insert into fb_sprechi (id, causale, articolo_id, quantita) values
  ('bb000000-0000-0000-0000-000000000001', 'deterioramento', 'a1000000-0000-0000-0000-000000000002', 0.2);
select is((select format('%s|%s', s.costo, m.tipo) from fb_sprechi s join mag_movimenti m on m.riferimento_id = s.id
            where s.id = 'bb000000-0000-0000-0000-000000000001' limit 1),
  '2.00|deterioramento', 'funghi deteriorati: 0,2 kg = 2 €, scaricati come deterioramento');
insert into fb_sprechi (id, causale, prodotto_id, quantita) values
  ('bb000000-0000-0000-0000-000000000002', 'errore_produzione', 'b6000000-0000-0000-0000-000000000001', 1);
select is((select format('%s|%s', s.costo, (select count(*) from mag_movimenti m where m.riferimento_id = s.id and m.tipo = 'sfrido'))
             from fb_sprechi s where s.id = 'bb000000-0000-0000-0000-000000000002'),
  '1.20|4', 'risotto sbagliato: costo 1,20 e ricetta scaricata come sfrido');
select throws_ok($$insert into fb_sprechi (causale, articolo_id, quantita) values ('scadenza', 'a1000000-0000-0000-0000-000000000003', 50)$$,
  '23514', null, 'non si butta più di quanto c''è in magazzino');

-- ═══ CARTA VINI PUBBLICA ═════════════════════════════════════════════
insert into fb_prodotti (id, nome, categoria_id, prezzo, articolo_id, beverage_tipo) values
  ('b6000000-0000-0000-0000-000000000009', 'Barolo 2019', 'b4000000-0000-0000-0000-000000000004', 60,
   'a1000000-0000-0000-0000-000000000007', 'vino');
insert into fb_vini (articolo_id, prodotto_bottiglia_id, produttore, annata, denominazione, regione, tipologia) values
  ('a1000000-0000-0000-0000-000000000007', 'b6000000-0000-0000-0000-000000000009', 'Cantina Test', 2019, 'DOCG', 'Piemonte', 'rosso');
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;
select is((select format('%s|%s|%s', nome, annata, prezzo_bottiglia) from fb_carta_vini()),
  'Barolo 2019|2019|60.00', 'carta vini leggibile dal QR senza accesso');
select pg_temp.torna_postgres();

-- ═══ RLS E LICENZE ═══════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s', (select count(*) from fb_comande where locale_id = 'b1000000-0000-0000-0000-000000000001'), (select count(*) from fb_prodotti) > 0)),
  '3|t', 'operatore del ristorante: comande e catalogo');
delete from fb_comande_righe where comanda_id = 'b9000000-0000-0000-0000-000000000002';
select is((select count(*)::int from fb_comande_righe where comanda_id = 'b9000000-0000-0000-0000-000000000002'), 2,
  'le righe di una comanda non si cancellano: si annullano');
select pg_temp.torna_postgres();

update moduli_licenze set attivo = (slug = 'bar') where slug in ('ristorante', 'bar');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select throws_ok($$insert into fb_locali (modulo, nome, created_by) values ('ristorante', 'Abusivo', '00000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'con la sola licenza del Bar non si apre un ristorante');
select lives_ok($$insert into fb_locali (modulo, nome, created_by) values ('bar', 'Bar della piscina', '00000000-0000-0000-0000-00000000000a')$$,
  'con la licenza del Bar si apre un bar');
select pg_temp.torna_postgres();
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s|%s', (select count(*) from fb_comande), (select count(*) from fb_tavoli),
                         (select count(*) from fb_prodotti) > 0)),
  '0|0|t', 'solo Bar: tavoli e comande del ristorante spariscono, il catalogo condiviso resta');
select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug in ('ristorante', 'bar');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from fb_prodotti), 0, 'nessuna licenza: niente catalogo');
select pg_temp.torna_postgres();
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;
select is((select count(*)::int from fb_carta_vini()), 0, 'ristorante spento: la carta vini pubblica è vuota');
select pg_temp.torna_postgres();

select * from finish();
rollback;
