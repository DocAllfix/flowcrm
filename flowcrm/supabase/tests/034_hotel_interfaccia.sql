-- ═══════════════════════════════════════════════════════════════════
-- Gate HOTEL 4/4 — interfaccia: tabelle dal vivo, addebito in camera dal
-- ristorante con l'origine sulla riga, rendiconto della tassa di
-- soggiorno per il Comune, tariffe tolte solo dalla direzione.
-- ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

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

insert into moduli_licenze (slug, attivo) values ('hotel', true), ('ristorante', true)
on conflict (slug) do update set attivo = excluded.attivo;

select is((select count(*)::int from pg_publication_tables where pubname = 'supabase_realtime'
            and tablename in ('hotel_prenotazioni', 'hotel_camere', 'hotel_pulizie', 'hotel_manutenzioni')), 4,
  'planning, camere, pulizie e manutenzioni arrivano dal vivo');

-- ═══ SOGGIORNO IN CASA ═══════════════════════════════════════════════
insert into hotel_strutture (id, nome, comune) values ('e1000000-0000-0000-0000-000000000001', 'Hotel Rendiconto', 'Firenze');
insert into hotel_tipologie (id, struttura_id, codice, nome, categoria, occupazione_base, occupazione_max, prezzo_base) values
  ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'DBL', 'Doppia', 'doppia', 2, 3, 100);
insert into hotel_camere (id, struttura_id, tipologia_id, numero, piano) values
  ('e3000000-0000-0000-0000-000000000101', 'e1000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', '101', 1);
insert into hotel_tassa_regole (struttura_id, comune, importo_notte, notti_max, eta_esenzione_sotto) values
  ('e1000000-0000-0000-0000-000000000001', 'Firenze', 5, 7, 12);
insert into contatti (id, nome, cognome) values
  ('e7000000-0000-0000-0000-000000000001', 'Paolo', 'Verdi'),
  ('e7000000-0000-0000-0000-000000000002', 'Lia', 'Verdi');
insert into hotel_ospiti (id, contatto_id, data_nascita, documento_tipo, documento_numero) values
  ('e8000000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-000000000001', '1975-02-01', 'IDENT', 'AX0000001'),
  ('e8000000-0000-0000-0000-000000000002', 'e7000000-0000-0000-0000-000000000002', pg_temp.oggi() - interval '6 years', null, null);
insert into hotel_prenotazioni (id, struttura_id, ospite_nome, adulti, bambini, arrivo, partenza, tipologia_id, camera_id) values
  ('e6000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Famiglia Verdi', 1, 1, pg_temp.oggi() - 2, pg_temp.oggi(),
   'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000101');
insert into hotel_soggiorno_ospiti (prenotazione_id, ospite_id, tipo_alloggiato) values
  ('e6000000-0000-0000-0000-000000000001', 'e8000000-0000-0000-0000-000000000001', '17'),
  ('e6000000-0000-0000-0000-000000000001', 'e8000000-0000-0000-0000-000000000002', '19');
select hotel_check_in('e6000000-0000-0000-0000-000000000001');
select hotel_audit_notturno();

-- ═══ ADDEBITO IN CAMERA DAL RISTORANTE ═══════════════════════════════
insert into conti (id, modulo, descrizione) values ('e9000000-0000-0000-0000-000000000001', 'ristorante', 'Tavolo 4');
insert into conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva) values
  ('e9000000-0000-0000-0000-000000000001', 'Tagliata', 2, 22, 10),
  ('e9000000-0000-0000-0000-000000000001', 'Chianti', 1, 28, 22);
select is((select count(*)::int from hotel_conti_in_casa where prenotazione_id = 'e6000000-0000-0000-0000-000000000001'), 1,
  'l''ospite in casa compare tra i conti su cui addebitare');
insert into conti_pagamenti (conto_id, modulo, metodo, importo, conto_destinazione_id)
select 'e9000000-0000-0000-0000-000000000001', 'ristorante', 'addebito_conto', 72, conto_id
  from hotel_prenotazioni where id = 'e6000000-0000-0000-0000-000000000001';
select is((select string_agg(format('%s|%s|%s', r.descrizione ~ '^Ristorante · Tavolo 4 \(', r.importo, r.aliquota_iva), ',' order by r.aliquota_iva)
             from conti_righe r join hotel_prenotazioni p on p.conto_id = r.conto_id
            where p.id = 'e6000000-0000-0000-0000-000000000001' and r.riferimento_tipo = 'addebito'),
  't|44.00|10.00,t|28.00|22.00', 'in camera arriva il conto del tavolo, con l''origine e le sue aliquote');
select is((select residuo from conti_saldi where conto_id = 'e9000000-0000-0000-0000-000000000001'), 0.00::numeric,
  'il conto del tavolo è saldato e si può chiudere');

-- ═══ RENDICONTO DELLA TASSA ══════════════════════════════════════════
select is((select hotel_check_out('e6000000-0000-0000-0000-000000000001')->>'tassa'), '10.00', 'tassa: due notti per l''adulto, bambino esente');
insert into conti_pagamenti (conto_id, metodo, importo)
select p.conto_id, 'pos', s.residuo from hotel_prenotazioni p join conti_saldi s on s.conto_id = p.conto_id
 where p.id = 'e6000000-0000-0000-0000-000000000001';
select is((select hotel_check_out('e6000000-0000-0000-0000-000000000001')->>'completato'), 'true', 'saldato, l''ospite parte');

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s|%s|%s|%s|%s', codice is not null, ospiti, notti, notti_tassabili, dovuto, riscosso)
             from hotel_tassa_rendiconto('e1000000-0000-0000-0000-000000000001', pg_temp.oggi() - 30, pg_temp.oggi())),
  't|2|2|2|10.00|10.00', 'rendiconto per il Comune: presenze, notti tassabili, dovuto e riscosso');
select is((select esenzioni from hotel_tassa_rendiconto('e1000000-0000-0000-0000-000000000001', pg_temp.oggi() - 30, pg_temp.oggi())),
  'Lia Verdi: minore di 12 anni', 'l''esenzione è nel rendiconto con il motivo');

-- ═══ TARIFFE: LE TOGLIE LA DIREZIONE ═════════════════════════════════
select pg_temp.torna_postgres();
insert into hotel_piani_tariffari (id, struttura_id, codice, nome, tipo) values
  ('e5000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'BAR', 'Miglior tariffa', 'bar');
insert into hotel_tariffe (id, struttura_id, piano_id, tipologia_id, dal, al, prezzo) values
  ('e4000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001',
   'e2000000-0000-0000-0000-000000000001', pg_temp.oggi(), pg_temp.oggi() + 30, 130);
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
delete from hotel_tariffe where id = 'e4000000-0000-0000-0000-000000000001';
select is((select count(*)::int from hotel_tariffe where id = 'e4000000-0000-0000-0000-000000000001'), 1, 'l''operatore non toglie tariffe');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
delete from hotel_tariffe where id = 'e4000000-0000-0000-0000-000000000001';
select pg_temp.torna_postgres();
select is((select count(*)::int from hotel_tariffe where id = 'e4000000-0000-0000-0000-000000000001'), 0,
  'la direzione toglie la tariffa');

-- ═══ CANALI E QUESTIONARIO ══════════════════════════════════════════
insert into hotel_tariffe (struttura_id, piano_id, tipologia_id, dal, al, prezzo, soggiorno_min, chiuso_arrivo) values
  ('e1000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001',
   pg_temp.oggi() + 1, pg_temp.oggi() + 1, 150, 2, true);
select is((select format('%s|%s|%s|%s|%s', disponibili, prezzo, soggiorno_min, chiuso_arrivo, stop_vendita)
             from hotel_ari('e1000000-0000-0000-0000-000000000001', pg_temp.oggi() + 1, pg_temp.oggi() + 1)),
  '1|150.00|2|t|f', 'per i canali: disponibili, prezzo e restrizioni del giorno');
insert into hotel_prenotazioni (struttura_id, ospite_nome, arrivo, partenza, tipologia_id, camera_id) values
  ('e1000000-0000-0000-0000-000000000001', 'Pieno', pg_temp.oggi() + 1, pg_temp.oggi() + 2, 'e2000000-0000-0000-0000-000000000001',
   'e3000000-0000-0000-0000-000000000101');
select is((select format('%s|%s', disponibili, stop_vendita) from hotel_ari('e1000000-0000-0000-0000-000000000001', pg_temp.oggi() + 1, pg_temp.oggi() + 1)),
  '0|t', 'senza camere libere il canale riceve lo stop vendita');
update hotel_prenotazioni set contatto_id = 'e7000000-0000-0000-0000-000000000001' where id = 'e6000000-0000-0000-0000-000000000001';
select ok('e7000000-0000-0000-0000-000000000001' in (select seg_hotel_partiti('hotel', '{"giorni": 3}')), 'chi è appena partito riceve il questionario');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$select seg_hotel_partiti('hotel', '{}')$$, '42501', null, 'i segmenti li calcola solo il motore delle campagne');
select pg_temp.torna_postgres();

select * from finish();
rollback;
