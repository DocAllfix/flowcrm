-- ═══════════════════════════════════════════════════════════════════
-- Gate HOTEL 3/3 — analisi: KPI su dati noti (occupazione, ADR, RevPAR,
-- TRevPAR, GOPPAR stimato, LOS, cancellazioni, no-show, dirette, costo
-- OTA), front office, previsione dal pickup, suggerimenti di prezzo con
-- concorrenti e regole, applicazione del prezzo, profilo dell'ospite,
-- segmenti, produzione degli intermediari, fattura con più aliquote,
-- insoluti, ricerca, permessi. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

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

insert into moduli_licenze (slug, attivo) values ('hotel', true)
on conflict (slug) do update set attivo = excluded.attivo;

-- ═══ DATI NOTI ═══════════════════════════════════════════════════════
-- Due camere doppie; periodo di tre giorni (oggi−2 … oggi) = 6 camere-notte.
insert into hotel_strutture (id, nome) values ('f1000000-0000-0000-0000-0000000000b1', 'Hotel Analisi');
insert into hotel_tipologie (id, struttura_id, codice, nome, categoria, prezzo_base) values
  ('f2000000-0000-0000-0000-0000000000b1', 'f1000000-0000-0000-0000-0000000000b1', 'DBL', 'Doppia', 'doppia', 100);
insert into hotel_camere (id, struttura_id, tipologia_id, numero) values
  ('f3000000-0000-0000-0000-000000000101', 'f1000000-0000-0000-0000-0000000000b1', 'f2000000-0000-0000-0000-0000000000b1', '101'),
  ('f3000000-0000-0000-0000-000000000102', 'f1000000-0000-0000-0000-0000000000b1', 'f2000000-0000-0000-0000-0000000000b1', '102');
insert into hotel_piani_tariffari (id, struttura_id, codice, nome, tipo) values
  ('f4000000-0000-0000-0000-0000000000b1', 'f1000000-0000-0000-0000-0000000000b1', 'BAR', 'BAR', 'bar');
insert into organizzazioni (id, ragione_sociale) values
  ('f5000000-0000-0000-0000-0000000000b1', 'Portale Viaggi Spa'),
  ('f5000000-0000-0000-0000-0000000000b2', 'Azienda Cliente Srl');
insert into hotel_intermediari (id, struttura_id, organizzazione_id, tipo, commissione_pct) values
  ('f6000000-0000-0000-0000-0000000000b1', 'f1000000-0000-0000-0000-0000000000b1', 'f5000000-0000-0000-0000-0000000000b1', 'ota', 15);
insert into contatti (id, nome, cognome) values ('f7000000-0000-0000-0000-0000000000b1', 'Mario', 'Rossi');

-- Tre camere-notte vendute a 110 lordi (100 netti): P1 due notti nella 101, P2 una notte nella 102 via portale.
insert into hotel_prenotazioni (id, struttura_id, contatto_id, ospite_nome, arrivo, partenza, tipologia_id, camera_id, stato, check_in_at, check_out_at,
                                prezzo_manuale, prezzo_totale, canale, intermediario_id) values
  ('f8000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-0000000000b1', 'f7000000-0000-0000-0000-0000000000b1', 'Mario Rossi',
   pg_temp.oggi() - 2, pg_temp.oggi(), 'f2000000-0000-0000-0000-0000000000b1', 'f3000000-0000-0000-0000-000000000101', 'partita', now(), now(),
   true, 220, 'diretto', null),
  ('f8000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-0000000000b1', 'f7000000-0000-0000-0000-0000000000b1', 'Mario Rossi',
   pg_temp.oggi() - 2, pg_temp.oggi() - 1, 'f2000000-0000-0000-0000-0000000000b1', 'f3000000-0000-0000-0000-000000000102', 'partita', now(), now(),
   true, 110, 'ota', 'f6000000-0000-0000-0000-0000000000b1');
-- Un annullamento e un no-show nello stesso periodo.
insert into hotel_prenotazioni (id, struttura_id, ospite_nome, arrivo, partenza, tipologia_id, stato) values
  ('f8000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-0000000000b1', 'Annullata', pg_temp.oggi() - 1, pg_temp.oggi() + 1,
   'f2000000-0000-0000-0000-0000000000b1', 'annullata');
insert into hotel_prenotazioni (id, struttura_id, ospite_nome, arrivo, partenza, tipologia_id) values
  ('f8000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-0000000000b1', 'Assente', pg_temp.oggi() - 1, pg_temp.oggi(),
   'f2000000-0000-0000-0000-0000000000b1');
select hotel_no_show('f8000000-0000-0000-0000-000000000004');

-- Altri reparti sul conto di P1: ristorante (22 € al 10%) e parcheggio (12,20 € al 22%); la tassa non è un ricavo.
select hotel_conto_prenotazione('f8000000-0000-0000-0000-000000000001');
insert into conti_righe (conto_id, descrizione, quantita, prezzo_unitario, aliquota_iva, riferimento_tipo)
select conto_id, d, 1, p, a, r from hotel_prenotazioni,
  (values ('Cena', 22.00, 10, 'addebito'), ('Parcheggio', 12.20, 22, 'hotel_parcheggio'), ('Tassa di soggiorno', 8.00, 0, 'hotel_tassa')) v(d, p, a, r)
 where id = 'f8000000-0000-0000-0000-000000000001';
insert into hotel_manutenzioni (struttura_id, descrizione, stato, costo) values
  ('f1000000-0000-0000-0000-0000000000b1', 'Caldaia', 'risolta', 30);

-- ═══ KPI ═════════════════════════════════════════════════════════════
select is((select format('%s|%s|%s', k->'occupazione'->>'camere_disponibili', k->'occupazione'->>'camere_vendute', k->'occupazione'->>'occupazione_pct')
             from hotel_kpi('f1000000-0000-0000-0000-0000000000b1', pg_temp.oggi() - 2, pg_temp.oggi()) k),
  '6|3|50.0', 'occupazione: 3 camere-notte vendute su 6');
select is((select format('%s|%s', k->'redditivita'->>'adr', k->'redditivita'->>'revpar')
             from hotel_kpi('f1000000-0000-0000-0000-0000000000b1', pg_temp.oggi() - 2, pg_temp.oggi()) k),
  '100.00|50.00', 'ADR 100 netti, RevPAR 50');
select is((select format('%s|%s|%s', k->'redditivita'->>'ricavi_totali', k->'redditivita'->>'trevpar', k->'vendite'->'per_reparto')
             from hotel_kpi('f1000000-0000-0000-0000-0000000000b1', pg_temp.oggi() - 2, pg_temp.oggi()) k),
  '430.00|71.67|{"altro": 100.00, "camere": 300.00, "servizi": 10.00, "ristorazione": 20.00}',
  'TRevPAR con ristorazione, parcheggio e la penale del no-show; la tassa non è un ricavo');
select is((select format('%s|%s', k->'redditivita'->>'gop_stimato', k->'redditivita'->>'goppar_stimato')
             from hotel_kpi('f1000000-0000-0000-0000-0000000000b1', pg_temp.oggi() - 2, pg_temp.oggi()) k),
  '385.00|64.17', 'GOP stimato: meno manutenzione (30) e commissioni del portale (15)');
select is((select format('%s|%s|%s|%s|%s', k->'occupazione'->>'los', k->'vendite'->>'cancellation_rate_pct', k->'vendite'->>'no_show_rate_pct',
                         k->'vendite'->>'dirette_pct', k->'vendite'->>'costo_ota_pct')
             from hotel_kpi('f1000000-0000-0000-0000-0000000000b1', pg_temp.oggi() - 2, pg_temp.oggi()) k),
  '1.50|25.0|33.3|66.7|5.0', 'LOS, cancellazioni, no-show, dirette e costo dei portali');

-- ═══ FRONT OFFICE ════════════════════════════════════════════════════
insert into hotel_prenotazioni (struttura_id, ospite_nome, arrivo, partenza, tipologia_id, early_check_in, richieste) values
  ('f1000000-0000-0000-0000-0000000000b1', 'In arrivo', pg_temp.oggi(), pg_temp.oggi() + 2, 'f2000000-0000-0000-0000-0000000000b1', true, 'Culla');
select is((select format('%s|%s|%s|%s', f->'arrivi'->>'previsti', f->'arrivi'->>'early_check_in', f->'arrivi'->>'richieste_speciali',
                         f->'arrivi'->>'senza_camera')
             from hotel_front_office('f1000000-0000-0000-0000-0000000000b1') f),
  '1|1|1|1', 'arrivi di oggi: anticipo, richieste, camera da assegnare');
select is((select format('%s|%s', f->'partenze'->>'previste', f->'partenze'->>'partite') from hotel_front_office('f1000000-0000-0000-0000-0000000000b1') f),
  '1|1', 'partenze di oggi');

-- ═══ PREVISIONE, SUGGERIMENTI, PREZZO APPLICATO ══════════════════════
-- Storico: una notte passata venduta 1 a tre giorni dall'arrivo e 2 alla fine (+100%).
insert into hotel_pickup (struttura_id, rilevato_il, data, camere_vendute, ricavo) values
  ('f1000000-0000-0000-0000-0000000000b1', pg_temp.oggi() - 13, pg_temp.oggi() - 10, 1, 100),
  ('f1000000-0000-0000-0000-0000000000b1', pg_temp.oggi() - 10, pg_temp.oggi() - 10, 2, 200);
insert into hotel_prenotazioni (struttura_id, ospite_nome, arrivo, partenza, tipologia_id, camera_id) values
  ('f1000000-0000-0000-0000-0000000000b1', 'Futuro', pg_temp.oggi() + 3, pg_temp.oggi() + 4, 'f2000000-0000-0000-0000-0000000000b1',
   'f3000000-0000-0000-0000-000000000101');
select is((select format('%s|%s|%s', vendute, previste, prevista_pct) from hotel_forecast('f1000000-0000-0000-0000-0000000000b1', pg_temp.oggi() + 3, pg_temp.oggi() + 3)),
  '1|2|100.0', 'previsione: una venduta, il pickup storico ne porta due');
select ok(hotel_rileva_pickup() > 0, 'la fotografia del venduto si registra');

insert into hotel_tariffe (struttura_id, piano_id, tipologia_id, dal, al, prezzo) values
  ('f1000000-0000-0000-0000-0000000000b1', 'f4000000-0000-0000-0000-0000000000b1', 'f2000000-0000-0000-0000-0000000000b1', pg_temp.oggi(), pg_temp.oggi() + 30, 120);
insert into hotel_revenue_regole (struttura_id, nome, occupazione_da, occupazione_a, variazione_pct) values
  ('f1000000-0000-0000-0000-0000000000b1', 'Alta domanda', 80, 100, 20);
insert into hotel_competitor_prezzi (struttura_id, competitor, data, tipologia, prezzo) values
  ('f1000000-0000-0000-0000-0000000000b1', 'Hotel Vicino', pg_temp.oggi() + 3, 'doppia', 130);
select is((select format('%s|%s|%s|%s', prezzo_attuale, prezzo_concorrenti, regola, prezzo_suggerito)
             from hotel_suggerimenti_tariffe('f1000000-0000-0000-0000-0000000000b1', pg_temp.oggi() + 3, pg_temp.oggi() + 3)),
  '120.00|130.00|Alta domanda|144', 'domanda prevista al 100%: suggerito +20%, accanto al prezzo dei concorrenti');
select isnt(hotel_applica_prezzo('f1000000-0000-0000-0000-0000000000b1', 'f2000000-0000-0000-0000-0000000000b1', pg_temp.oggi() + 3, 144), null,
  'la direzione applica il prezzo suggerito');
select is((select prezzo from hotel_prezzo_notte('f4000000-0000-0000-0000-0000000000b1', 'f2000000-0000-0000-0000-0000000000b1', pg_temp.oggi() + 3, 2)),
  144.00, 'da quella notte il BAR vale 144');
select is((select prezzo from hotel_prezzo_notte('f4000000-0000-0000-0000-0000000000b1', 'f2000000-0000-0000-0000-0000000000b1', pg_temp.oggi() + 4, 2)),
  120.00, 'le altre notti restano a 120');

-- ═══ CRM, SEGMENTI, INTERMEDIARI ═════════════════════════════════════
select is((select format('%s|%s|%s|%s', p->>'soggiorni', p->>'notti', p->>'tipologia_preferita', p->>'canale_preferito')
             from hotel_ospite_profilo('f7000000-0000-0000-0000-0000000000b1') p),
  '2|3|Doppia|diretto', 'profilo dell''ospite: soggiorni, notti, camera e canale preferiti');
select is((select soggiorni from hotel_ospiti_riepilogo where contatto_id = 'f7000000-0000-0000-0000-0000000000b1'), 2::bigint,
  'elenco degli ospiti con i soggiorni');
select ok('f7000000-0000-0000-0000-0000000000b1' in (select seg_hotel_abituali('hotel', '{"soggiorni": 2}')), 'segmento degli abituali');
select ok('f7000000-0000-0000-0000-0000000000b1' not in (select seg_hotel_inattivi('hotel', '{"mesi": 12}')), 'chi è appena stato non è inattivo');
select is((select format('%s|%s|%s|%s', prenotazioni, notti, ricavo, commissione)
             from hotel_produzione_intermediari('f1000000-0000-0000-0000-0000000000b1', pg_temp.oggi() - 30, pg_temp.oggi() + 30)
            where intermediario_id = 'f6000000-0000-0000-0000-0000000000b1'),
  '1|1|110.00|16.50', 'produzione del portale e commissione dovuta');

-- ═══ FATTURA CON PIÙ ALIQUOTE, INSOLUTI, RICERCA ═════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$select hotel_fattura_conti(array[(select conto_id from hotel_prenotazioni where id = 'f8000000-0000-0000-0000-000000000001')],
  'f5000000-0000-0000-0000-0000000000b2', 'H-1')$$, '42501', null, 'il ricevimento non emette fatture');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select throws_ok($$select hotel_fattura_conti(array[(select conto_id from hotel_prenotazioni where id = 'f8000000-0000-0000-0000-000000000001')],
  'f5000000-0000-0000-0000-0000000000b2', 'H-1')$$, '23514', null, 'si fattura solo un conto chiuso');
select pg_temp.torna_postgres();
insert into conti_pagamenti (conto_id, metodo, importo)
select conto_id, 'conto_aziendale', 42.20 from hotel_prenotazioni where id = 'f8000000-0000-0000-0000-000000000001';
select chiudi_conto(conto_id) from hotel_prenotazioni where id = 'f8000000-0000-0000-0000-000000000001';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select isnt(hotel_fattura_conti(array[(select conto_id from hotel_prenotazioni where id = 'f8000000-0000-0000-0000-000000000001')],
  'f5000000-0000-0000-0000-0000000000b2', 'H-1'), null, 'fattura all''azienda dal conto chiuso');
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s', imponibile, totale, aliquota_iva) from fatture where numero = 'H-1'),
  '38.00|42.20|10.00', 'imponibile per aliquota (20 + 10 + 8 fuori campo), totale esatto');
select ok((select note like '%fuori campo IVA (tassa di soggiorno, penali): 8.00%' from fatture where numero = 'H-1'), 'la tassa fuori campo è indicata');
select is((select fattura_id is not null from conti c join hotel_prenotazioni p on p.conto_id = c.id where p.id = 'f8000000-0000-0000-0000-000000000001'),
  true, 'il conto risulta fatturato');

select ok(exists (select 1 from hotel_insoluti where prenotazione_id = 'f8000000-0000-0000-0000-000000000004'),
  'il no-show non pagato è tra gli insoluti');
select is((select count(*) from ricerca_globale('Rossi') where tipo = 'prenotazione_hotel'), 2::bigint, 'le prenotazioni si trovano dalla ricerca');

-- ═══ PERMESSI ════════════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$select hotel_kpi('f1000000-0000-0000-0000-0000000000b1', current_date - 7, current_date)$$, '42501', null, 'i KPI sono della direzione');
select throws_ok($$select * from hotel_suggerimenti_tariffe('f1000000-0000-0000-0000-0000000000b1', current_date, current_date)$$, '42501', null,
  'i suggerimenti di prezzo sono della direzione');
select is((select count(*) from hotel_revenue_regole where struttura_id = 'f1000000-0000-0000-0000-0000000000b1'), 0::bigint,
  'le regole di revenue non sono visibili al ricevimento');
select is((select f->'arrivi'->>'previsti' from hotel_front_office('f1000000-0000-0000-0000-0000000000b1') f), '1',
  'il ricevimento vede il front office');
select throws_ok($$select hotel_applica_prezzo('f1000000-0000-0000-0000-0000000000b1', 'f2000000-0000-0000-0000-0000000000b1', current_date + 5, 1)$$,
  '42501', null, 'il ricevimento non cambia i prezzi');
select pg_temp.torna_postgres();

select * from finish();
rollback;
