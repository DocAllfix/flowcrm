-- ═══════════════════════════════════════════════════════════════════
-- Gate RISTORANTE — completamento: semilavorati a magazzino e richiamo
-- lungo la catena, prenotazione servita, tempi di cucina, listini dei
-- fornitori, punti spendibili, cliente della comanda. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

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

insert into moduli_licenze (slug, attivo) values ('ristorante', true)
on conflict (slug) do update set attivo = excluded.attivo;

-- ═══ SEMILAVORATI A MAGAZZINO ════════════════════════════════════════
insert into mag_articoli (id, modulo, descrizione, unita_misura, costo_unitario, durata_giorni) values
  ('a9000000-0000-0000-0000-000000000001', 'fb', 'Macinato', 'kg', 12, null),
  ('a9000000-0000-0000-0000-000000000002', 'fb', 'Passata', 'kg', 2, null),
  ('a9000000-0000-0000-0000-000000000003', 'fb', 'Tagliatelle fresche', 'kg', 1.5, null),
  ('a9000000-0000-0000-0000-000000000004', 'fb', 'Ragù della casa', 'kg', 0, 3);
insert into mag_lotti (id, articolo_id, codice_lotto, data_scadenza) values
  ('a9100000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-000000000001', 'MAC-7', current_date + 4),
  ('a9100000-0000-0000-0000-000000000002', 'a9000000-0000-0000-0000-000000000002', 'PAS-1', current_date + 200),
  ('a9100000-0000-0000-0000-000000000003', 'a9000000-0000-0000-0000-000000000003', 'TAG-1', current_date + 3);
insert into mag_movimenti (articolo_id, lotto_id, tipo, quantita) values
  ('a9000000-0000-0000-0000-000000000001', 'a9100000-0000-0000-0000-000000000001', 'carico', 2),
  ('a9000000-0000-0000-0000-000000000002', 'a9100000-0000-0000-0000-000000000002', 'carico', 3),
  ('a9000000-0000-0000-0000-000000000003', 'a9100000-0000-0000-0000-000000000003', 'carico', 5);

-- Ragù: 0,5 kg di macinato + 1 kg di passata → 2 kg (4 €/kg). Piatto:
-- 0,1 kg di tagliatelle + 0,15 kg di ragù.
insert into distinte_base (id, modulo, nome, tipo, resa, unita_resa, articolo_prodotto_id) values
  ('a9200000-0000-0000-0000-000000000001', 'fb', 'Ragù', 'semilavorato', 2, 'kg', 'a9000000-0000-0000-0000-000000000004');
insert into distinte_base (id, modulo, nome, tipo, resa, unita_resa) values
  ('a9200000-0000-0000-0000-000000000002', 'fb', 'Tagliatelle al ragù', 'ricetta', 1, 'porzione');
insert into distinte_base_righe (distinta_id, articolo_id, sotto_distinta_id, quantita) values
  ('a9200000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-000000000001', null, 0.5),
  ('a9200000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-000000000002', null, 1),
  ('a9200000-0000-0000-0000-000000000002', 'a9000000-0000-0000-0000-000000000003', null, 0.1),
  ('a9200000-0000-0000-0000-000000000002', null, 'a9200000-0000-0000-0000-000000000001', 0.15);

select is((select string_agg(a.descrizione || ':' || e.quantita, ',' order by a.descrizione)
             from esplodi_distinta('a9200000-0000-0000-0000-000000000002', 2) e join mag_articoli a on a.id = e.articolo_id),
  'Ragù della casa:0.3000,Tagliatelle fresche:0.2000', 'il piatto scarica il ragù di magazzino, non più macinato e passata');

select isnt(mag_produci_distinta('a9200000-0000-0000-0000-000000000001', 2, 'RAGU-01'), null, 'produzione di 2 kg di ragù');
select is((select format('%s|%s|%s', g.giacenza, (select giacenza from mag_giacenze where articolo_id = 'a9000000-0000-0000-0000-000000000001'),
                         (select giacenza from mag_giacenze where articolo_id = 'a9000000-0000-0000-0000-000000000002'))
             from mag_giacenze g where g.articolo_id = 'a9000000-0000-0000-0000-000000000004'),
  '2.000|1.500|2.000', 'ragù caricato, macinato e passata scaricati');
select is((select format('%s|%s', l.data_scadenza = current_date + 3, a.costo_unitario) from mag_lotti l join mag_articoli a on a.id = l.articolo_id
            where l.codice_lotto = 'RAGU-01'),
  't|4.0000', 'il lotto di ragù scade con la vita commerciale e porta il suo costo (4 €/kg)');
select throws_ok($$select mag_produci_distinta('a9200000-0000-0000-0000-000000000002', 1)$$,
  '23514', null, 'una ricetta senza articolo di magazzino non si produce in lotti');
select throws_ok($$select mag_produci_distinta('a9200000-0000-0000-0000-000000000001', 10)$$,
  '23514', null, 'non si produce più di quanto permettono gli ingredienti');

-- ═══ SERVIZIO: PRENOTAZIONE SERVITA, RICHIAMO A CATENA, TEMPI ═══════
insert into fb_locali (id, modulo, nome) values ('b1000000-0000-0000-0000-0000000000c1', 'ristorante', 'Osteria Completa');
insert into fb_sale (id, locale_id, nome) values ('b2000000-0000-0000-0000-0000000000c1', 'b1000000-0000-0000-0000-0000000000c1', 'Sala');
insert into fb_tavoli (id, sala_id, numero, posti) values ('b3000000-0000-0000-0000-0000000000c1', 'b2000000-0000-0000-0000-0000000000c1', '7', 4);
insert into fb_categorie (id, nome, uscita) values ('b4000000-0000-0000-0000-0000000000c1', 'Primi', 2);
insert into fb_stazioni (locale_id, nome, predefinita) values ('b1000000-0000-0000-0000-0000000000c1', 'Cucina', true);
insert into fb_prodotti (id, nome, categoria_id, prezzo, distinta_id, tempo_preparazione_min) values
  ('b6000000-0000-0000-0000-0000000000c1', 'Tagliatelle al ragù', 'b4000000-0000-0000-0000-0000000000c1', 12,
   'a9200000-0000-0000-0000-000000000002', 15);
insert into contatti (id, nome, cognome, telefono) values ('c0000000-0000-0000-0000-0000000000c1', 'Lucia', 'Verdi', '340 2222222');
insert into fb_prenotazioni (id, locale_id, nome, inizio, persone, tavoli, stato) values
  ('b8000000-0000-0000-0000-0000000000c1', 'b1000000-0000-0000-0000-0000000000c1', 'Verdi', now(), 2,
   '{b3000000-0000-0000-0000-0000000000c1}', 'confermata');
insert into fb_comande (id, locale_id, tavolo_id, prenotazione_id, coperti) values
  ('b9000000-0000-0000-0000-0000000000c1', 'b1000000-0000-0000-0000-0000000000c1', 'b3000000-0000-0000-0000-0000000000c1',
   'b8000000-0000-0000-0000-0000000000c1', 2);
insert into fb_comande_righe (id, comanda_id, prodotto_id, quantita) values
  ('ba000000-0000-0000-0000-0000000000c1', 'b9000000-0000-0000-0000-0000000000c1', 'b6000000-0000-0000-0000-0000000000c1', 2);
-- La cucina ci mette 20 minuti (previsti 15).
update fb_comande_righe set inviata_at = now() - interval '20 minutes' where id = 'ba000000-0000-0000-0000-0000000000c1';
update fb_comande_righe set stato = 'pronta' where id = 'ba000000-0000-0000-0000-0000000000c1';
select is((select stato::text from fb_prenotazioni where id = 'b8000000-0000-0000-0000-0000000000c1'), 'arrivata',
  'piatto pronto ma non ancora servito: prenotazione arrivata');
update fb_comande_righe set stato = 'servita' where id = 'ba000000-0000-0000-0000-0000000000c1';
select is((select stato::text from fb_prenotazioni where id = 'b8000000-0000-0000-0000-0000000000c1'), 'servita',
  'esce il primo piatto: prenotazione servita');
select is((select string_agg(l.codice_lotto || ':' || (-m.quantita), ',' order by l.codice_lotto) from mag_movimenti m join mag_lotti l on l.id = m.lotto_id
            where m.riferimento_id = 'ba000000-0000-0000-0000-0000000000c1'),
  'RAGU-01:0.300,TAG-1:0.200', 'il piatto scarica il lotto di ragù e il lotto di tagliatelle');
select is((select format('%s|%s', count(*), max(prodotto)) from fb_richiamo_lotto('a9100000-0000-0000-0000-000000000001')),
  '1|Tagliatelle al ragù', 'richiamo del macinato: si risale al piatto attraverso il lotto di ragù');
select is((select format('%s|%s|%s', piatti, tempo_medio_min, in_ritardo) from fb_tempi_cucina('b1000000-0000-0000-0000-0000000000c1', pg_temp.oggi(), pg_temp.oggi())),
  '1|20.0|1', 'tempi di cucina: 20 minuti contro 15 previsti, in ritardo');
select ok(exists (select 1 from fb_food_cost('b1000000-0000-0000-0000-0000000000c1', pg_temp.oggi(), pg_temp.oggi(), 'bevanda') where chiave = 'cucina'),
  'food cost anche per tipo di bevanda (i piatti come «cucina»)');

-- Cliente collegato dopo: passa anche al conto.
update fb_comande set contatto_id = 'c0000000-0000-0000-0000-0000000000c1' where id = 'b9000000-0000-0000-0000-0000000000c1';
select is((select c.contatto_id from conti c join fb_comande k on k.conto_id = c.id where k.id = 'b9000000-0000-0000-0000-0000000000c1'),
  'c0000000-0000-0000-0000-0000000000c1'::uuid, 'il cliente collegato alla comanda passa al conto');

-- ═══ PUNTI SPENDIBILI ════════════════════════════════════════════════
insert into fid_programmi (id, modulo, nome, punti_per_euro, valore_punto) values
  ('f1000000-0000-0000-0000-0000000000c1', 'ristorante', 'Cashback 2%', 2, 0.01),
  ('f1000000-0000-0000-0000-0000000000c2', 'ristorante', 'Solo livelli', 1, null);
insert into fid_tessere (id, programma_id, contatto_id) values
  ('f2000000-0000-0000-0000-0000000000c1', 'f1000000-0000-0000-0000-0000000000c1', 'c0000000-0000-0000-0000-0000000000c1'),
  ('f2000000-0000-0000-0000-0000000000c2', 'f1000000-0000-0000-0000-0000000000c2', 'c0000000-0000-0000-0000-0000000000c1');
insert into fid_movimenti (tessera_id, tipo, punti) values
  ('f2000000-0000-0000-0000-0000000000c1', 'bonus', 1000), ('f2000000-0000-0000-0000-0000000000c2', 'bonus', 1000);
-- Conto: 2 × 12 = 24; 500 punti × 0,01 = 5 €.
select is((select fid_usa_punti_su_conto('f2000000-0000-0000-0000-0000000000c1', conto_id, 500) from fb_comande where id = 'b9000000-0000-0000-0000-0000000000c1'),
  5.00::numeric, '500 punti valgono 5 € di sconto');
select is((select format('%s|%s', s.totale, f.punti) from fb_comande k join conti_saldi s on s.conto_id = k.conto_id,
                  fid_saldi f where k.id = 'b9000000-0000-0000-0000-0000000000c1' and f.tessera_id = 'f2000000-0000-0000-0000-0000000000c1'),
  '19.00|500', 'conto a 19 €, restano 500 punti');
select throws_ok($$select fid_usa_punti_su_conto('f2000000-0000-0000-0000-0000000000c1', (select conto_id from fb_comande where id = 'b9000000-0000-0000-0000-0000000000c1'), 2500)$$,
  '23514', null, 'non si usano più punti del conto (né di quelli disponibili)');
select throws_ok($$select fid_usa_punti_su_conto('f2000000-0000-0000-0000-0000000000c2', (select conto_id from fb_comande where id = 'b9000000-0000-0000-0000-0000000000c1'), 100)$$,
  '23514', null, 'un programma senza valore del punto non dà sconti in cassa');

-- ═══ LISTINI DEI FORNITORI ═══════════════════════════════════════════
insert into organizzazioni (id, ragione_sociale) values
  ('f0000000-0000-0000-0000-0000000000c1', 'Macelleria Alfa'), ('f0000000-0000-0000-0000-0000000000c2', 'Carni Beta');
insert into fornitori_listini (fornitore_id, articolo_id, prezzo, giorni_consegna) values
  ('f0000000-0000-0000-0000-0000000000c1', 'a9000000-0000-0000-0000-000000000001', 12.50, 1),
  ('f0000000-0000-0000-0000-0000000000c2', 'a9000000-0000-0000-0000-000000000001', 11.50, 2);
select is((select format('%s|%s|%s', fornitore_id, prezzo, modulo) from fornitori_miglior_prezzo where articolo_id = 'a9000000-0000-0000-0000-000000000001'),
  'f0000000-0000-0000-0000-0000000000c2|11.5000|fb', 'il miglior prezzo in vigore per il macinato');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$insert into fornitori_listini (fornitore_id, articolo_id, prezzo, modulo, created_by) values ('f0000000-0000-0000-0000-0000000000c1', 'a9000000-0000-0000-0000-000000000002', 1, 'fb', '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'i listini li scrive la direzione');
select pg_temp.torna_postgres();

select * from finish();
rollback;
