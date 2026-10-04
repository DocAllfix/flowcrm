-- ═══════════════════════════════════════════════════════════════════
-- Gate FONDAMENTA F0.1 — magazzino, lotti, distinta base, acquisti.
-- Valori attesi calcolati a mano (vedi commenti). ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(33);

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

insert into moduli_licenze (slug, attivo) values ('ristorante', true), ('bar', false), ('hotel', false)
on conflict (slug) do update set attivo = excluded.attivo;

insert into organizzazioni (id, ragione_sociale) values
  ('f0000000-0000-0000-0000-000000000001', 'Fornitore Test Srl');

-- ── Articoli (modulo fb: Ristorante e Bar) ──
insert into mag_articoli (id, modulo, descrizione, unita_misura, costo_unitario, allergeni, scorta_minima) values
  ('a0000000-0000-0000-0000-000000000001', 'fb', 'Riso', 'kg', 2, '{}', 0),
  ('a0000000-0000-0000-0000-000000000002', 'fb', 'Funghi', 'kg', 10, '{}', 2),
  ('a0000000-0000-0000-0000-000000000003', 'fb', 'Burro', 'kg', 8, '{latte}', 0),
  ('a0000000-0000-0000-0000-000000000004', 'fb', 'Ossa', 'kg', 3, '{}', 0),
  ('a0000000-0000-0000-0000-000000000005', 'fb', 'Sedano', 'kg', 2, '{sedano}', 0),
  ('a0000000-0000-0000-0000-000000000006', 'fb', 'Latte', 'l', 1, '{latte}', 0),
  ('a0000000-0000-0000-0000-000000000007', 'hotel', 'Acqua minibar', 'pz', 0.3, '{}', 0);

select matches((select codice from mag_articoli where id = 'a0000000-0000-0000-0000-000000000001'),
  '^ART-\d{4}-\d{4}$', 'codice articolo ART-AAAA-NNNN');
select throws_ok($$insert into mag_articoli (modulo, descrizione, allergeni) values ('fb', 'X', '{pomodoro}')$$,
  '23514', null, 'allergene fuori dalla lista UE rifiutato');

-- ── FEFO: due lotti di latte, scade prima il secondo ──
insert into mag_lotti (id, articolo_id, codice_lotto, data_scadenza) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'L1', current_date + 60),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000006', 'L2', current_date + 20);
insert into mag_movimenti (articolo_id, lotto_id, tipo, quantita) values
  ('a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'carico', 5),
  ('a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'carico', 5);

select is((select modulo from mag_lotti where id = 'b0000000-0000-0000-0000-000000000001'), 'fb',
  'il lotto eredita il modulo dall''articolo');
select is(mag_scarica('a0000000-0000-0000-0000-000000000006', 7, 'consumo'), 7::numeric,
  'scarico di 7 coperto interamente dai lotti');
select is((select residuo from mag_lotti_stato where lotto_id = 'b0000000-0000-0000-0000-000000000002'), 0::numeric(14,3),
  'FEFO: il lotto che scade prima si svuota per primo');
select is((select residuo from mag_lotti_stato where lotto_id = 'b0000000-0000-0000-0000-000000000001'), 3::numeric(14,3),
  'FEFO: dal lotto successivo solo il resto (5 - 2)');

-- Scarico manuale oltre la giacenza: rifiutato, e nulla cambia.
select throws_ok($$select mag_scarica('a0000000-0000-0000-0000-000000000006', 5, 'consumo')$$,
  '23514', null, 'consumo oltre la giacenza rifiutato');
select is((select giacenza from mag_giacenze where articolo_id = 'a0000000-0000-0000-0000-000000000006'), 3::numeric(14,3),
  'dopo il rifiuto la giacenza è invariata (3)');
-- Vendita oltre la giacenza: il servizio non si blocca, l'anomalia si vede.
select lives_ok($$select mag_scarica('a0000000-0000-0000-0000-000000000006', 5, 'vendita')$$,
  'vendita oltre la giacenza ammessa');
select ok((select anomalia_negativa from mag_giacenze where articolo_id = 'a0000000-0000-0000-0000-000000000006'),
  'giacenza negativa segnalata come anomalia (-2)');
select throws_ok($$insert into mag_movimenti (articolo_id, tipo, quantita) values ('a0000000-0000-0000-0000-000000000001', 'carico', -3)$$,
  '23514', null, 'un carico con segno negativo è rifiutato');

-- ── Distinta base a tre livelli ──
-- Fondo (resa 1 kg): ossa 1 kg → 3,00 al kg
-- Brodo (resa 2 l): fondo 0,5 kg (1,50) + sedano 0,1 kg (0,20) = 1,70 → 0,85 al litro
-- Risotto (resa 1): riso 0,09 (0,18) + funghi 0,08 con scarto 20% → 0,1 kg (1,00)
--                  + burro 0,015 (0,12) + brodo 0,2 l (0,17) = 1,47
insert into distinte_base (id, modulo, nome, tipo, resa, unita_resa) values
  ('d0000000-0000-0000-0000-000000000001', 'fb', 'Fondo', 'semilavorato', 1, 'kg'),
  ('d0000000-0000-0000-0000-000000000002', 'fb', 'Brodo', 'semilavorato', 2, 'l'),
  ('d0000000-0000-0000-0000-000000000003', 'fb', 'Risotto ai funghi', 'ricetta', 1, 'porzione');
insert into distinte_base_righe (distinta_id, articolo_id, sotto_distinta_id, quantita, scarto_percentuale) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', null, 1, 0),
  ('d0000000-0000-0000-0000-000000000002', null, 'd0000000-0000-0000-0000-000000000001', 0.5, 0),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', null, 0.1, 0),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', null, 0.09, 0),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', null, 0.08, 20),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', null, 0.015, 0),
  ('d0000000-0000-0000-0000-000000000003', null, 'd0000000-0000-0000-0000-000000000002', 0.2, 0);

select matches((select codice from distinte_base where id = 'd0000000-0000-0000-0000-000000000003'),
  '^DB-\d{4}-\d{4}$', 'codice distinta DB-AAAA-NNNN');
select is(costo_distinta('d0000000-0000-0000-0000-000000000002'), 0.8500::numeric, 'costo brodo: 0,85 al litro (fondo + sedano)');
select is(costo_distinta('d0000000-0000-0000-0000-000000000003'), 1.4700::numeric, 'costo risotto su tre livelli, con lo scarto: 1,47');
select is(allergeni_distinta('d0000000-0000-0000-0000-000000000003'), array['latte','sedano']::text[],
  'allergeni ereditati anche dal semilavorato (sedano dal brodo)');
select results_eq(
  $$select articolo_id::text, quantita from esplodi_distinta('d0000000-0000-0000-0000-000000000003', 10) order by 1$$,
  $$values ('a0000000-0000-0000-0000-000000000001', 0.9000::numeric),
           ('a0000000-0000-0000-0000-000000000002', 1.0000),
           ('a0000000-0000-0000-0000-000000000003', 0.1500),
           ('a0000000-0000-0000-0000-000000000004', 0.5000),
           ('a0000000-0000-0000-0000-000000000005', 0.1000)$$,
  'esplosione di 10 risotti: quantità di ogni materia prima, anche dentro i semilavorati');
select throws_ok($$insert into distinte_base_righe (distinta_id, sotto_distinta_id, quantita)
                   values ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 1)$$,
  '23514', null, 'ciclo rifiutato: il fondo non può contenere il risotto che lo contiene');
select throws_ok($$insert into distinte_base_righe (distinta_id, quantita) values ('d0000000-0000-0000-0000-000000000003', 1)$$,
  '23514', null, 'una riga deve avere un articolo oppure una sotto-distinta');

-- ── Inventario: contati 8 su 10 → rettifica di -2 ──
insert into mag_movimenti (articolo_id, tipo, quantita) values ('a0000000-0000-0000-0000-000000000001', 'carico', 10);
insert into mag_inventari (id, modulo) values ('e0000000-0000-0000-0000-000000000001', 'fb');
insert into mag_inventari_righe (inventario_id, articolo_id, quantita_contata)
values ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 8);
select is(chiudi_inventario('e0000000-0000-0000-0000-000000000001'), 1, 'chiusura inventario: una rettifica');
select is((select giacenza from mag_giacenze where articolo_id = 'a0000000-0000-0000-0000-000000000001'), 8::numeric(14,3),
  'dopo l''inventario la giacenza è quella contata');
select throws_ok($$select chiudi_inventario('e0000000-0000-0000-0000-000000000001')$$,
  'P0001', null, 'un inventario chiuso non si richiude');

-- ── Ordine al fornitore e ricevimento in due consegne ──
insert into mag_ordini (id, modulo, fornitore_id, stato) values
  ('c0000000-0000-0000-0000-000000000001', 'fb', 'f0000000-0000-0000-0000-000000000001', 'inviato');
insert into mag_ordini_righe (id, ordine_id, articolo_id, quantita_ordinata, prezzo_unitario) values
  ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 5, 9.5);
select isnt(ricevi_riga_ordine('c1000000-0000-0000-0000-000000000001', 3, 'B-77', current_date + 30, 3.5), null,
  'ricevimento parziale: lotto creato');
select is((select stato from mag_ordini where id = 'c0000000-0000-0000-0000-000000000001'), 'ricevuto_parziale'::mag_ordine_stato,
  'ordine ricevuto in parte');
select lives_ok($$select ricevi_riga_ordine('c1000000-0000-0000-0000-000000000001', 2)$$, 'seconda consegna');
select is((select stato from mag_ordini where id = 'c0000000-0000-0000-0000-000000000001'), 'ricevuto'::mag_ordine_stato,
  'ordine ricevuto per intero');
select is((select giacenza from mag_giacenze where articolo_id = 'a0000000-0000-0000-0000-000000000003'), 5::numeric(14,3),
  'il burro ricevuto entra in magazzino');
select is((select costo_unitario from mag_articoli where id = 'a0000000-0000-0000-0000-000000000003'), 9.5::numeric(12,4),
  'il costo dell''articolo segue l''ultimo acquisto');

-- ── Proposta di riordino: funghi sotto scorta (0 su 2) → 2 ──
select is((select quantita_proposta from mag_proposta_riordino('fb') where articolo_id = 'a0000000-0000-0000-0000-000000000002'),
  2::numeric, 'riordino proposto per i funghi sotto scorta');

-- ── Licenze e permessi ──
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from mag_articoli where modulo = 'hotel'), 0, 'operatore: gli articoli dell''hotel (non licenziato) non si vedono');
update mag_movimenti set note = 'manomesso';
delete from mag_movimenti;
select is((select count(*)::int from mag_movimenti where note = 'manomesso'), 0,
  'operatore: il registro dei movimenti non si modifica');
select ok((select count(*) from mag_movimenti) > 0, 'operatore: il registro dei movimenti non si cancella');
select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'ristorante';
update moduli_licenze set attivo = true where slug = 'bar';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from mag_articoli where modulo = 'fb'), 6, 'con la sola licenza Bar il motore fb resta visibile');
select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'bar';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from mag_articoli), 0, 'senza licenze: zero righe');
select pg_temp.torna_postgres();

select * from finish();
rollback;
