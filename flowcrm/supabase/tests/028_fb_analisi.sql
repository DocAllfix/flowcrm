-- ═══════════════════════════════════════════════════════════════════
-- Gate RISTORANTE E BAR — analisi: menu engineering, food e beverage
-- cost, consumo teorico/effettivo, richiamo lotto, sprechi, cruscotto,
-- KPI, profilo cliente, segmenti, ricerca. Valori calcolati a mano.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

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
-- Le analisi lavorano sul giorno di calendario italiano, non su quello UTC
-- del server (dopo mezzanotte i due differiscono).
create or replace function pg_temp.oggi() returns date as $$
  select (now() at time zone 'Europe/Rome')::date
$$ language sql stable;
create or replace function pg_temp.torna_postgres() returns void as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', null, true);
end;
$$ language plpgsql;

insert into moduli_licenze (slug, attivo) values ('ristorante', true)
on conflict (slug) do update set attivo = excluded.attivo;

insert into contatti (id, nome, cognome, telefono) values
  ('c0000000-0000-0000-0000-0000000000f1', 'Mario', 'Rossi', '333 1111111');
insert into mag_articoli (id, modulo, descrizione, unita_misura, costo_unitario, allergeni) values
  ('a1000000-0000-0000-0000-0000000000b1', 'fb', 'Birra alla spina', 'pz', 1.20, '{glutine}');
insert into mag_lotti (id, articolo_id, codice_lotto, data_scadenza) values
  ('a2000000-0000-0000-0000-0000000000b1', 'a1000000-0000-0000-0000-0000000000b1', 'FUSTO-7', current_date + 60);
insert into mag_movimenti (articolo_id, lotto_id, tipo, quantita) values
  ('a1000000-0000-0000-0000-0000000000b1', 'a2000000-0000-0000-0000-0000000000b1', 'carico', 24);

insert into fb_locali (id, modulo, nome, costo_orario_medio) values
  ('b1000000-0000-0000-0000-0000000000a1', 'ristorante', 'Osteria Analisi', 15);
insert into fb_sale (id, locale_id, nome) values
  ('b2000000-0000-0000-0000-0000000000a1', 'b1000000-0000-0000-0000-0000000000a1', 'Sala');
insert into fb_tavoli (id, sala_id, numero, posti) values
  ('b3000000-0000-0000-0000-0000000000a1', 'b2000000-0000-0000-0000-0000000000a1', '1', 4),
  ('b3000000-0000-0000-0000-0000000000a2', 'b2000000-0000-0000-0000-0000000000a1', '2', 2);
insert into fb_categorie (id, nome, area, uscita) values
  ('b4000000-0000-0000-0000-0000000000a1', 'Primi', 'food', 2),
  ('b4000000-0000-0000-0000-0000000000a2', 'Birre', 'beverage', 0);
insert into fb_stazioni (locale_id, nome, predefinita) values ('b1000000-0000-0000-0000-0000000000a1', 'Cucina', true);
-- IVA a zero per leggere i margini a occhio.
insert into fb_prodotti (id, nome, categoria_id, prezzo, aliquota_iva, costo_manuale, articolo_id, beverage_tipo) values
  ('b6000000-0000-0000-0000-0000000000a1', 'A', 'b4000000-0000-0000-0000-0000000000a1', 10, 0, 3, null, null),
  ('b6000000-0000-0000-0000-0000000000a2', 'B', 'b4000000-0000-0000-0000-0000000000a1', 8, 0, 6, null, null),
  ('b6000000-0000-0000-0000-0000000000a3', 'C', 'b4000000-0000-0000-0000-0000000000a1', 15, 0, 4, null, null),
  ('b6000000-0000-0000-0000-0000000000a4', 'D', 'b4000000-0000-0000-0000-0000000000a1', 6, 0, 5, null, null),
  ('b6000000-0000-0000-0000-0000000000a5', 'Birra', 'b4000000-0000-0000-0000-0000000000a2', 5, 0, null,
   'a1000000-0000-0000-0000-0000000000b1', 'birra');

-- Venduti: A 40, B 30, C 10, D 10 (+1 omaggio), birre 10 servite.
insert into fb_comande (id, locale_id, tavolo_id, coperti, contatto_id) values
  ('b9000000-0000-0000-0000-0000000000a1', 'b1000000-0000-0000-0000-0000000000a1',
   'b3000000-0000-0000-0000-0000000000a1', 4, 'c0000000-0000-0000-0000-0000000000f1');
insert into fb_comande_righe (comanda_id, prodotto_id, quantita, stato, omaggio) values
  ('b9000000-0000-0000-0000-0000000000a1', 'b6000000-0000-0000-0000-0000000000a1', 40, 'servita', false),
  ('b9000000-0000-0000-0000-0000000000a1', 'b6000000-0000-0000-0000-0000000000a2', 30, 'servita', false),
  ('b9000000-0000-0000-0000-0000000000a1', 'b6000000-0000-0000-0000-0000000000a3', 10, 'servita', false),
  ('b9000000-0000-0000-0000-0000000000a1', 'b6000000-0000-0000-0000-0000000000a4', 10, 'servita', false),
  ('b9000000-0000-0000-0000-0000000000a1', 'b6000000-0000-0000-0000-0000000000a4', 1, 'servita', true),
  ('b9000000-0000-0000-0000-0000000000a1', 'b6000000-0000-0000-0000-0000000000a5', 10, 'servita', false);

-- Menu engineering: quota soglia 0,7/4 = 17,5%; margine medio
-- (40×7 + 30×2 + 10×11 + 10×1) / 90 = 5,11.
select is((select string_agg(prodotto || ':' || classe, ',' order by prodotto)
             from fb_menu_engineering('b1000000-0000-0000-0000-0000000000a1', pg_temp.oggi(), pg_temp.oggi(),
                                      'b4000000-0000-0000-0000-0000000000a1')),
  'A:star,B:plow_horse,C:puzzle,D:dog', 'menu engineering: Star, Plow Horse, Puzzle, Dog sui dati noti');
select is((select format('%s|%s|%s', quota_pct, margine_unitario, food_cost_pct)
             from fb_menu_engineering('b1000000-0000-0000-0000-0000000000a1', pg_temp.oggi(), pg_temp.oggi(),
                                      'b4000000-0000-0000-0000-0000000000a1') where prodotto = 'A'),
  '44.4|7.00|30.0', 'A: 44,4% delle vendite, margine 7, food cost 30%');
select is((select format('%s|%s|%s', quantita, ricavo, costo) from fb_food_cost('b1000000-0000-0000-0000-0000000000a1',
             pg_temp.oggi(), pg_temp.oggi(), 'piatto') where chiave = 'D'),
  '11.00|60.00|55.00', 'food cost per piatto: l''omaggio pesa sul costo, non sul ricavo');
-- Food: ricavi 400 + 240 + 150 + 60 = 850; costi 120 + 180 + 40 + 50 + 5 = 395 → 46,5%.
-- Bevande: 50 di ricavo, 12 di costo → 24%.
select is((select string_agg(chiave || ':' || food_cost_pct, ',' order by chiave) from fb_food_cost(
             'b1000000-0000-0000-0000-0000000000a1', pg_temp.oggi(), pg_temp.oggi(), 'area')),
  'beverage:24.0,food:46.5', 'food cost e beverage cost per area');
select throws_ok($$select * from fb_food_cost('b1000000-0000-0000-0000-0000000000a1', pg_temp.oggi(), pg_temp.oggi(), 'colore')$$,
  'P0001', null, 'dimensione di analisi non prevista');

-- Bevande: 10 vendute, 1 bevuta dal personale, inventario ne conta 11
-- invece di 13 → 2 mancano. Effettivo 13, scostamento 30%.
insert into fb_sprechi (causale, articolo_id, quantita) values ('consumo_personale', 'a1000000-0000-0000-0000-0000000000b1', 1);
insert into mag_inventari (id, modulo) values ('a4000000-0000-0000-0000-0000000000b1', 'fb');
insert into mag_inventari_righe (inventario_id, articolo_id, quantita_contata) values
  ('a4000000-0000-0000-0000-0000000000b1', 'a1000000-0000-0000-0000-0000000000b1', 11);
select chiudi_inventario('a4000000-0000-0000-0000-0000000000b1');
select is((select format('%s|%s|%s|%s|%s|%s', teorico, sprechi, ammanchi, effettivo, scostamento_pct, anomalia)
             from fb_beverage_controllo('ristorante', pg_temp.oggi(), pg_temp.oggi()) where articolo_id = 'a1000000-0000-0000-0000-0000000000b1'),
  '10.000|1.000|2.000|13.000|30.0|t', 'birra: teorico 10, effettivo 13, anomalia segnalata');
select is((select valore_scostamento from fb_beverage_controllo('ristorante', pg_temp.oggi(), pg_temp.oggi()) where articolo_id = 'a1000000-0000-0000-0000-0000000000b1'),
  3.60::numeric, 'valore delle perdite: 3 birre × 1,20');

-- Richiamo del fusto: si risale a comanda, tavolo e cliente.
select is((select format('%s|%s|%s|%s|%s', tavolo, prodotto, quantita_lotto, cliente, recapito)
             from fb_richiamo_lotto('a2000000-0000-0000-0000-0000000000b1')),
  '1|Birra|10.000|Mario Rossi|333 1111111', 'richiamo del lotto: piatti, tavolo e cliente da avvisare');

select is((select string_agg(causale || ':' || costo, ',' order by causale)
             from fb_sprechi_analisi('b1000000-0000-0000-0000-0000000000a1', pg_temp.oggi(), pg_temp.oggi())),
  'consumo_personale:1.20,omaggio:5.00', 'sprechi con il loro costo, omaggi compresi');

-- Chiusura del conto: 400 + 240 + 150 + 60 + 0 + 50 = 900.
insert into conti_pagamenti (conto_id, metodo, importo)
select conto_id, 'pos', 900 from fb_comande where id = 'b9000000-0000-0000-0000-0000000000a1';
select chiudi_conto(conto_id) from fb_comande where id = 'b9000000-0000-0000-0000-0000000000a1';

-- ═══ CRUSCOTTO E FABBISOGNO ══════════════════════════════════════════
insert into fb_prenotazioni (locale_id, nome, inizio, persone) values
  ('b1000000-0000-0000-0000-0000000000a1', 'Neri', now(), 3);
insert into dipendenti (id, nome, cognome) values ('d0000000-0000-0000-0000-0000000000a1', 'Luca', 'Sala');
insert into turni (modulo, dipendente_id, reparto, inizio, fine) values
  ('ristorante', 'd0000000-0000-0000-0000-0000000000a1', 'sala',
   ((now() at time zone 'Europe/Rome')::date + time '00:00') at time zone 'Europe/Rome',
   ((now() at time zone 'Europe/Rome')::date + time '08:00') at time zone 'Europe/Rome');

select is((select format('%s|%s|%s', c->'sala'->>'prenotazioni', c->'sala'->>'coperti_previsti', c->'sala'->>'tavoli_liberi')
             from fb_cruscotto('b1000000-0000-0000-0000-0000000000a1') c),
  '1|3|2', 'cruscotto: prenotazioni e coperti previsti del giorno, tavoli liberi');
select is((select format('%s|%s|%s', c->'vendite'->>'incasso', c->'vendite'->>'conti_chiusi', c->'vendite'->>'spesa_per_coperto')
             from fb_cruscotto('b1000000-0000-0000-0000-0000000000a1') c),
  '900.00|1|225.00', 'cruscotto della direzione: incasso, conti, spesa per coperto');
select is((select string_agg(reparto || ':' || persone_suggerite || ':' || persone_pianificate || ':' || differenza, ',' order by reparto)
             from fb_fabbisogno_personale('b1000000-0000-0000-0000-0000000000a1', (now() at time zone 'Europe/Rome')::date)),
  'cucina:1:0:-1,sala:1:1:0', 'fabbisogno dai coperti: in cucina manca una persona');

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select ok((select c->'vendite' = 'null'::jsonb from fb_cruscotto('b1000000-0000-0000-0000-0000000000a1') c),
  'operatore: il cruscotto non mostra le vendite');
select is((select (c->'cucina'->>'comande_aperte')::int from fb_cruscotto('b1000000-0000-0000-0000-0000000000a1') c),
  0, 'operatore: vede sala e cucina');
select throws_ok($$select fb_kpi('b1000000-0000-0000-0000-0000000000a1', pg_temp.oggi(), pg_temp.oggi())$$,
  '42501', null, 'operatore: i KPI economici sono della direzione');
select throws_ok($$select * from fb_menu_engineering('b1000000-0000-0000-0000-0000000000a1', pg_temp.oggi(), pg_temp.oggi())$$,
  '42501', null, 'operatore: niente menu engineering');
select is((select count(*)::int from ricerca_globale('Neri') where tipo = 'prenotazione_fb'), 1,
  'la ricerca globale trova le prenotazioni');
select pg_temp.torna_postgres();

-- ═══ KPI DI PERIODO ══════════════════════════════════════════════════
select is((select format('%s|%s|%s|%s', k->'commerciali'->>'fatturato', k->'commerciali'->>'ticket_medio',
                         k->'commerciali'->>'ricavo_per_coperto', k->'commerciali'->>'tasso_occupazione_pct')
             from fb_kpi('b1000000-0000-0000-0000-0000000000a1', pg_temp.oggi(), pg_temp.oggi()) k),
  '900.00|900.00|225.00|66.7', 'KPI commerciali: fatturato, ticket, ricavo per coperto, occupazione 4 su 6 posti');
select is((select format('%s|%s|%s|%s', k->'economici'->>'food_cost_pct', k->'economici'->>'beverage_cost_pct',
                         k->'economici'->>'margine_lordo', k->'economici'->>'costo_personale')
             from fb_kpi('b1000000-0000-0000-0000-0000000000a1', pg_temp.oggi(), pg_temp.oggi()) k),
  '46.5|24.0|493.00|120.00', 'KPI economici: food 46,5%, beverage 24%, margine 493, personale 8 h × 15');
select is((select format('%s|%s|%s', k->'cucina'->>'piatti_venduti', k->'cucina'->>'bevande_vendute', k->'clienti'->>'nuovi_clienti')
             from fb_kpi('b1000000-0000-0000-0000-0000000000a1', pg_temp.oggi(), pg_temp.oggi()) k),
  '91.00|10.00|1', 'piatti e bevande vendute, nuovo cliente');

-- ═══ CRM, SEGMENTI, ALLERGENI ════════════════════════════════════════
insert into fb_clienti (contatto_id, compleanno, allergie, tavolo_preferito_id) values
  ('c0000000-0000-0000-0000-0000000000f1', make_date(1990, extract(month from current_date + 3)::int,
                                                     extract(day from current_date + 3)::int), '{crostacei}',
   'b3000000-0000-0000-0000-0000000000a1');
select is((select format('%s|%s|%s', p->>'visite', p->>'spesa_totale', p->'piatti_preferiti')
             from fb_cliente_profilo('c0000000-0000-0000-0000-0000000000f1') p),
  '1|900.00|["A", "B", "D"]', 'profilo cliente: visite, spesa e piatti preferiti');
select is((select p->'preferenze'->'allergie' from fb_cliente_profilo('c0000000-0000-0000-0000-0000000000f1') p),
  '["crostacei"]'::jsonb, 'al ritorno il personale vede le allergie dichiarate');
select ok('c0000000-0000-0000-0000-0000000000f1'::uuid in (select seg_fb_ricorrenze('ristorante', '{}')),
  'segmento ricorrenze: compleanno tra tre giorni');
select ok('c0000000-0000-0000-0000-0000000000f1'::uuid in (select seg_fb_abituali('ristorante', '{"visite": 1}')),
  'segmento clienti abituali con soglia configurabile');
select is((select allergeni from fb_registro_allergeni('b1000000-0000-0000-0000-0000000000a1') where prodotto = 'Birra'),
  '{glutine}'::text[], 'registro allergeni: la birra dichiara il glutine');
select is((select count(*)::int from campagne_segmenti where slug like 'fb\_%'), 3, 'tre segmenti del motore registrati');

select * from finish();
rollback;
