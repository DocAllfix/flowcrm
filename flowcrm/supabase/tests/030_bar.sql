-- ═══════════════════════════════════════════════════════════════════
-- Gate BAR — il banco sul motore fb_: smistamento per postazione,
-- fedeltà a timbri per prodotto, convenzioni con limiti e fattura
-- periodica, mescita teorico contro reale, riordino previsionale,
-- margine per fascia, KPI e cruscotto. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

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

insert into moduli_licenze (slug, attivo) values ('bar', true), ('ristorante', true)
on conflict (slug) do update set attivo = excluded.attivo;

-- ═══ MAGAZZINO, LOCALE, POSTAZIONI, CATALOGO ═════════════════════════
insert into mag_articoli (id, modulo, descrizione, unita_misura, costo_unitario, scorta_minima) values
  ('e1000000-0000-0000-0000-000000000001', 'fb', 'Caffè in grani', 'kg', 20, 1),
  ('e1000000-0000-0000-0000-000000000002', 'fb', 'Latte intero', 'l', 1.20, 2),
  ('e1000000-0000-0000-0000-000000000003', 'fb', 'Gin', 'l', 30, 0),
  ('e1000000-0000-0000-0000-000000000004', 'fb', 'Acqua tonica', 'pz', 0.80, 20);
insert into mag_lotti (id, articolo_id, codice_lotto, data_scadenza) values
  ('e1100000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000003', 'GIN-24', current_date + 900);
insert into mag_movimenti (articolo_id, lotto_id, tipo, quantita) values
  ('e1000000-0000-0000-0000-000000000001', null, 'carico', 5),
  ('e1000000-0000-0000-0000-000000000002', null, 'carico', 10),
  ('e1000000-0000-0000-0000-000000000003', 'e1100000-0000-0000-0000-000000000003', 'carico', 2),
  ('e1000000-0000-0000-0000-000000000004', null, 'carico', 24);

insert into distinte_base (id, modulo, nome, tipo, resa, unita_resa) values
  ('e2000000-0000-0000-0000-000000000001', 'fb', 'Espresso', 'ricetta', 1, 'tazzina'),
  ('e2000000-0000-0000-0000-000000000002', 'fb', 'Cappuccino', 'ricetta', 1, 'tazza'),
  ('e2000000-0000-0000-0000-000000000003', 'fb', 'Gin tonic', 'ricetta', 1, 'bicchiere');
insert into distinte_base_righe (distinta_id, articolo_id, quantita) values
  ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 0.007),
  ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 0.007),
  ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 0.1),
  ('e2000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000003', 0.05),
  ('e2000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000004', 1);

insert into fb_locali (id, modulo, nome) values
  ('e3000000-0000-0000-0000-000000000001', 'bar', 'Bar Centrale'),
  ('e3000000-0000-0000-0000-000000000002', 'ristorante', 'Trattoria accanto');
insert into fb_categorie (id, nome, area, uscita) values
  ('e4000000-0000-0000-0000-000000000001', 'Caffetteria bar test', 'beverage', 0),
  ('e4000000-0000-0000-0000-000000000002', 'Cocktail bar test', 'beverage', 0);
insert into fb_stazioni (id, locale_id, nome, tipo, categorie, predefinita) values
  ('e5000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'Banco bar', 'banco',
   '{e4000000-0000-0000-0000-000000000002}', true),
  ('e5000000-0000-0000-0000-000000000002', 'e3000000-0000-0000-0000-000000000001', 'Macchina del caffè', 'bar',
   '{e4000000-0000-0000-0000-000000000001}', false);
insert into fb_prodotti (id, nome, categoria_id, prezzo, aliquota_iva, distinta_id, articolo_id, articolo_quantita, beverage_tipo) values
  ('e6000000-0000-0000-0000-000000000001', 'Espresso', 'e4000000-0000-0000-0000-000000000001', 1.20, 10, 'e2000000-0000-0000-0000-000000000001', null, 1, 'caffetteria'),
  ('e6000000-0000-0000-0000-000000000002', 'Cappuccino', 'e4000000-0000-0000-0000-000000000001', 1.50, 10, 'e2000000-0000-0000-0000-000000000002', null, 1, 'caffetteria'),
  ('e6000000-0000-0000-0000-000000000003', 'Gin tonic', 'e4000000-0000-0000-0000-000000000002', 8, 22, 'e2000000-0000-0000-0000-000000000003', null, 1, 'cocktail'),
  ('e6000000-0000-0000-0000-000000000004', 'Gin liscio', 'e4000000-0000-0000-0000-000000000002', 6, 22, null, 'e1000000-0000-0000-0000-000000000003', 0.04, 'distillato');

-- §9 smistamento: il caffè alla macchina, il cocktail al banco.
insert into fb_comande (id, locale_id, canale) values
  ('e7000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'banco');
insert into fb_comande_righe (id, comanda_id, prodotto_id, quantita) values
  ('e8000000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001', 2),
  ('e8000000-0000-0000-0000-000000000002', 'e7000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000002', 1),
  ('e8000000-0000-0000-0000-000000000003', 'e7000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000003', 1);
select is((select string_agg(p.nome || '→' || s.nome, ', ' order by p.nome)
             from fb_comande_righe r join fb_prodotti p on p.id = r.prodotto_id join fb_stazioni s on s.id = r.stazione_id
            where r.comanda_id = 'e7000000-0000-0000-0000-000000000001'),
  'Cappuccino→Macchina del caffè, Espresso→Macchina del caffè, Gin tonic→Banco bar',
  'ogni prodotto va alla sua postazione');

-- ═══ §15 FEDELTÀ A TIMBRI PER PRODOTTO ═══════════════════════════════
insert into contatti (id, nome, email) values
  ('e9000000-0000-0000-0000-000000000001', 'Carla', 'carla@example.com'),
  ('e9000000-0000-0000-0000-000000000002', 'Mario', 'mario.alfa@example.com');
insert into fid_programmi (id, modulo, nome, timbri_soglia, premio_timbri, timbri_prodotti, premio_prodotto_id) values
  ('ea000000-0000-0000-0000-000000000001', 'bar', 'Caffè sospeso', 3, 'Un caffè omaggio',
   '{e4000000-0000-0000-0000-000000000001}', 'e6000000-0000-0000-0000-000000000001');
insert into fid_tessere (id, programma_id, contatto_id) values
  ('eb000000-0000-0000-0000-000000000001', 'ea000000-0000-0000-0000-000000000001', 'e9000000-0000-0000-0000-000000000001');

update fb_comande_righe set stato = 'servita' where comanda_id = 'e7000000-0000-0000-0000-000000000001';
insert into conti_pagamenti (conto_id, metodo, importo)
select conto_id, 'contanti', 11.90 from fb_comande where id = 'e7000000-0000-0000-0000-000000000001';
select chiudi_conto(conto_id) from fb_comande where id = 'e7000000-0000-0000-0000-000000000001';
select is((select (fid_registra_acquisto('eb000000-0000-0000-0000-000000000001', 11.90, 'conto', conto_id)->>'timbri_aggiunti')::int
             from fb_comande where id = 'e7000000-0000-0000-0000-000000000001'),
  3, 'un timbro per ogni caffè (2 espressi + 1 cappuccino), non per il gin tonic');

insert into fb_comande (id, locale_id, canale, contatto_id) values
  ('e7000000-0000-0000-0000-000000000002', 'e3000000-0000-0000-0000-000000000001', 'banco', 'e9000000-0000-0000-0000-000000000001');
insert into fb_comande_righe (comanda_id, prodotto_id, quantita) values
  ('e7000000-0000-0000-0000-000000000002', 'e6000000-0000-0000-0000-000000000002', 1),
  ('e7000000-0000-0000-0000-000000000002', 'e6000000-0000-0000-0000-000000000003', 1);
select throws_ok($$select fid_omaggio_su_conto('eb000000-0000-0000-0000-000000000001', conto_id) from fb_comande where id = 'e7000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'senza un espresso sul conto il premio non si applica');
insert into fb_comande_righe (comanda_id, prodotto_id, quantita) values
  ('e7000000-0000-0000-0000-000000000002', 'e6000000-0000-0000-0000-000000000001', 1);
select is((select fid_omaggio_su_conto('eb000000-0000-0000-0000-000000000001', conto_id) from fb_comande where id = 'e7000000-0000-0000-0000-000000000002'),
  'Espresso', 'premio ritirato: l''espresso è in omaggio');
select is((select format('%s|%s', c.sconto_importo, s.residuo) from fb_comande k join conti c on c.id = k.conto_id
             join conti_saldi s on s.conto_id = c.id where k.id = 'e7000000-0000-0000-0000-000000000002'),
  '1.20|9.50', 'lo sconto è il prezzo dell''espresso: restano cappuccino e gin tonic');
select is((select timbri::int from fid_saldi where tessera_id = 'eb000000-0000-0000-0000-000000000001'), 0,
  'la soglia di timbri è stata scalata');
select throws_ok($$select fid_omaggio_su_conto('eb000000-0000-0000-0000-000000000001', conto_id) from fb_comande where id = 'e7000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'senza timbri sufficienti niente secondo omaggio');
insert into conti_pagamenti (conto_id, metodo, importo)
select conto_id, 'pos', 9.50 from fb_comande where id = 'e7000000-0000-0000-0000-000000000002';
select chiudi_conto(conto_id) from fb_comande where id = 'e7000000-0000-0000-0000-000000000002';

-- ═══ §20 CONVENZIONI ═════════════════════════════════════════════════
insert into organizzazioni (id, ragione_sociale) values
  ('ec000000-0000-0000-0000-000000000001', 'Uffici Alfa Srl');
insert into fb_menu (id, locale_id, nome, tipo) values
  ('ed000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'Listino Alfa', 'convenzionato');
insert into fb_menu_voci (menu_id, prodotto_id, prezzo) values
  ('ed000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001', 1.00);
select is((select prezzo from fb_prezzo('e6000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'banco')),
  1.20::numeric, 'un listino convenzionato non collegato non vale per i clienti normali');

insert into bar_convenzioni (id, locale_id, organizzazione_id, menu_id, limite_mensile_azienda, limite_giornaliero_dipendente) values
  ('ee000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'ec000000-0000-0000-0000-000000000001',
   'ed000000-0000-0000-0000-000000000001', 100, 5);
select is((select format('%s|%s', c.codice ~ '^CNV-\d{4}-\d{4}$', m.tipologia_cliente = 'convenzione:' || c.id)
             from bar_convenzioni c join fb_menu m on m.id = c.menu_id where c.id = 'ee000000-0000-0000-0000-000000000001'),
  't|t', 'convenzione con codice e listino riservato');
select throws_ok($$insert into bar_convenzioni (locale_id, organizzazione_id) values ('e3000000-0000-0000-0000-000000000002', 'ec000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'le convenzioni sono del Bar, non del Ristorante');

insert into bar_convenzioni_dipendenti (id, convenzione_id, contatto_id, nome, codice_tessera) values
  ('ef000000-0000-0000-0000-000000000001', 'ee000000-0000-0000-0000-000000000001', 'e9000000-0000-0000-0000-000000000002', 'Mario Alfa', 'ALFA-01'),
  ('ef000000-0000-0000-0000-000000000002', 'ee000000-0000-0000-0000-000000000001', null, 'Ex dipendente', 'ALFA-99');
update bar_convenzioni_dipendenti set attivo = false where id = 'ef000000-0000-0000-0000-000000000002';

insert into fb_comande (id, locale_id, canale, convenzione_dipendente_id) values
  ('e7000000-0000-0000-0000-000000000003', 'e3000000-0000-0000-0000-000000000001', 'banco', 'ef000000-0000-0000-0000-000000000001');
insert into fb_comande_righe (comanda_id, prodotto_id, quantita) values
  ('e7000000-0000-0000-0000-000000000003', 'e6000000-0000-0000-0000-000000000001', 2);
select is((select format('%s|%s|%s', k.cliente_nome, k.contatto_id = 'e9000000-0000-0000-0000-000000000002', r.prezzo_unitario)
             from fb_comande k join fb_comande_righe r on r.comanda_id = k.id where k.id = 'e7000000-0000-0000-0000-000000000003'),
  'Mario Alfa|t|1.00', 'il dipendente convenzionato paga il prezzo del listino dell''azienda');
select throws_ok($$insert into fb_comande (locale_id, canale, convenzione_dipendente_id) values ('e3000000-0000-0000-0000-000000000001', 'banco', 'ef000000-0000-0000-0000-000000000002')$$,
  '23514', null, 'un dipendente non più autorizzato non apre comande convenzionate');

-- Alla cassa l'operatore addebita all'azienda.
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select isnt((select bar_addebita_convenzione(conto_id, 'ef000000-0000-0000-0000-000000000001', 2.00)
               from fb_comande where id = 'e7000000-0000-0000-0000-000000000003'), null,
  'l''operatore addebita 2 € all''azienda');
select throws_ok($$insert into bar_convenzioni (locale_id, organizzazione_id, created_by) values ('e3000000-0000-0000-0000-000000000001', 'ec000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'l''operatore non crea convenzioni');
select pg_temp.torna_postgres();
select is((select format('%s|%s', a.per_aliquota, s.residuo) from bar_convenzioni_addebiti a join conti_saldi s on s.conto_id = a.conto_id
            where a.dipendente_id = 'ef000000-0000-0000-0000-000000000001'),
  '[{"importo": 2.00, "aliquota": 10.00}]|0.00', 'addebito con la sua aliquota, conto saldato');
select chiudi_conto(conto_id) from fb_comande where id = 'e7000000-0000-0000-0000-000000000003';

-- Limite giornaliero di 5 €: 2 già spesi, un gin tonic da 8 non passa.
insert into fb_comande (id, locale_id, canale, convenzione_dipendente_id) values
  ('e7000000-0000-0000-0000-000000000004', 'e3000000-0000-0000-0000-000000000001', 'banco', 'ef000000-0000-0000-0000-000000000001');
insert into fb_comande_righe (comanda_id, prodotto_id, quantita) values
  ('e7000000-0000-0000-0000-000000000004', 'e6000000-0000-0000-0000-000000000003', 1);
select throws_like($$select bar_addebita_convenzione(conto_id, 'ef000000-0000-0000-0000-000000000001', 8) from fb_comande where id = 'e7000000-0000-0000-0000-000000000004'$$,
  'Limite giornaliero di Mario Alfa superato: restano 3.00 €', 'limite giornaliero del dipendente');
update bar_convenzioni set limite_giornaliero_dipendente = null, limite_mensile_azienda = 6
 where id = 'ee000000-0000-0000-0000-000000000001';
select throws_like($$select bar_addebita_convenzione(conto_id, 'ef000000-0000-0000-0000-000000000001', 8) from fb_comande where id = 'e7000000-0000-0000-0000-000000000004'$$,
  'Limite mensile dell''azienda superato: restano 4.00 €', 'tetto mensile dell''azienda');
update bar_convenzioni set limite_mensile_azienda = 100 where id = 'ee000000-0000-0000-0000-000000000001';
select bar_addebita_convenzione(conto_id, 'ef000000-0000-0000-0000-000000000001', 8) from fb_comande where id = 'e7000000-0000-0000-0000-000000000004';
select chiudi_conto(conto_id) from fb_comande where id = 'e7000000-0000-0000-0000-000000000004';
select is((select format('%s|%s|%s', speso_mese, residuo_mese, da_fatturare) from bar_convenzioni_riepilogo
            where convenzione_id = 'ee000000-0000-0000-0000-000000000001'),
  '10.00|90.00|10.00', 'speso nel mese, residuo e da fatturare');

-- Fattura periodica: la direzione sì, l'operatore no.
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$select bar_fattura_convenzione('ee000000-0000-0000-0000-000000000001', current_date, 'CONV-1')$$,
  '42501', null, 'l''operatore non emette fatture');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select isnt(bar_fattura_convenzione('ee000000-0000-0000-0000-000000000001', pg_temp.oggi(), 'CONV-1'), null,
  'fattura periodica emessa dalla direzione');
select throws_ok($$select bar_fattura_convenzione('ee000000-0000-0000-0000-000000000001', current_date, 'CONV-2')$$,
  '23514', null, 'nulla di nuovo da fatturare');
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s|%s', f.imponibile, f.totale, f.aliquota_iva, f.scadenza = current_date + 30)
             from fatture f where f.numero = 'CONV-1'),
  '8.38|10.00|22.00|t', 'imponibile per aliquota (1,82 + 6,56), totale esatto, scadenza a 30 giorni');
select is((select count(*) from bar_convenzioni_addebiti where convenzione_id = 'ee000000-0000-0000-0000-000000000001' and fattura_id is null),
  0::bigint, 'tutte le consumazioni sono in fattura');
select throws_ok($$delete from bar_convenzioni_addebiti where convenzione_id = 'ee000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'una consumazione fatturata non si cancella');

-- ═══ §29 MESCITA ═════════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into bar_mescite (id, locale_id, articolo_id, lotto_id, quantita_iniziale, aperta_at, created_by) values
  ('f3000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000003',
   'e1100000-0000-0000-0000-000000000003', 0.7, now() - interval '1 minute', '00000000-0000-0000-0000-00000000000c');
select throws_ok($$insert into bar_mescite (locale_id, articolo_id, quantita_iniziale, created_by) values ('e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000003', 0.7, '00000000-0000-0000-0000-00000000000c')$$,
  '23P01', null, 'una sola bottiglia dello stesso gin aperta alla volta');
select pg_temp.torna_postgres();

-- Nel test now() è fermo: anche il gin tonic della prima comanda cade nella
-- bottiglia aperta. Quattro gin tonic (0,05 l) e due gin lisci (0,04 l): 0,28 l teorici.
insert into fb_comande (id, locale_id, canale) values
  ('e7000000-0000-0000-0000-000000000005', 'e3000000-0000-0000-0000-000000000001', 'banco');
insert into fb_comande_righe (comanda_id, prodotto_id, quantita, stato) values
  ('e7000000-0000-0000-0000-000000000005', 'e6000000-0000-0000-0000-000000000003', 3, 'servita'),
  ('e7000000-0000-0000-0000-000000000005', 'e6000000-0000-0000-0000-000000000004', 2, 'servita');
select is((select erogato from bar_mescite_stato where id = 'f3000000-0000-0000-0000-000000000001'),
  0.280::numeric, 'erogato teorico: anche il gin dentro i cocktail');

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s|%s', r->>'sfrido', r->>'sfrido_pct', r->>'anomalia')
             from bar_chiudi_mescita('f3000000-0000-0000-0000-000000000001', 0.35) r),
  '0.070|10.00|true', 'bottiglia chiusa con 0,35 l: 0,35 reali contro 0,28 teorici, sfrido 10% sopra soglia');
select is((select count(*) from bar_mescite where id = 'f3000000-0000-0000-0000-000000000001'), 1::bigint,
  'il banco vede la sua mescita');
update bar_mescite set note = 'ritocco' where id = 'f3000000-0000-0000-0000-000000000001';
select pg_temp.torna_postgres();
select is((select note from bar_mescite where id = 'f3000000-0000-0000-0000-000000000001'), null,
  'il banco non corregge a mano una mescita chiusa');
select is((select format('%s|%s', m.quantita, m.tipo) from mag_movimenti m
            where m.riferimento_tipo = 'bar_mescite' and m.riferimento_id = 'f3000000-0000-0000-0000-000000000001'),
  '-0.070|sfrido', 'lo sfrido è uscito dal magazzino');
select is((select count(*) from notifiche where destinatario_id = '00000000-0000-0000-0000-00000000000a'
             and titolo = 'Consumo anomalo: Gin'), 1::bigint, 'la direzione è avvisata del consumo anomalo');
select throws_ok($$select bar_chiudi_mescita('f3000000-0000-0000-0000-000000000001', 0)$$,
  '23514', null, 'una mescita chiusa non si richiude');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select is((select format('%s|%s|%s', contenitori, sfrido, anomalie) from bar_mescita_analisi('e3000000-0000-0000-0000-000000000001', pg_temp.oggi(), pg_temp.oggi())
            where articolo = 'Gin'),
  '1|0.070|1', 'analisi della mescita per articolo');
select pg_temp.torna_postgres();

-- ═══ §22 RIORDINO PREVISIONALE ═══════════════════════════════════════
-- Asporto prenotato per domani con 2 gin tonic non ancora preparati; un
-- evento confermato tra tre giorni; 6 toniche già ordinate.
insert into fb_comande (id, locale_id, canale, cliente_nome, ritiro_at) values
  ('e7000000-0000-0000-0000-000000000006', 'e3000000-0000-0000-0000-000000000001', 'asporto', 'Festa ufficio', now() + interval '1 day');
insert into fb_comande_righe (comanda_id, prodotto_id, quantita, invio) values
  ('e7000000-0000-0000-0000-000000000006', 'e6000000-0000-0000-0000-000000000003', 2, 'differito');
insert into eventi (modulo, titolo, stato, inizio, fine, partecipanti_previsti) values
  ('bar', 'Aperitivo aziendale', 'confermato', now() + interval '3 days', now() + interval '3 days 3 hours', 40);
insert into mag_ordini (id, modulo, fornitore_id, stato) values
  ('f4000000-0000-0000-0000-000000000001', 'fb', 'ec000000-0000-0000-0000-000000000001', 'inviato');
insert into mag_ordini_righe (ordine_id, modulo, articolo_id, quantita_ordinata) values
  ('f4000000-0000-0000-0000-000000000001', 'fb', 'e1000000-0000-0000-0000-000000000004', 6);
select is((select format('%s|%s|%s', fabbisogno_ordini, in_arrivo, fabbisogno_eventi > 0)
             from fb_proposta_riordino('e3000000-0000-0000-0000-000000000001', 7) where descrizione = 'Acqua tonica'),
  '2.000|6.000|t', 'la tonica conta ordini futuri, arrivi ed evento');
select is((select bool_and(quantita_proposta = ceil(scorta_minima + fabbisogno_periodo + fabbisogno_eventi + fabbisogno_ordini - giacenza - in_arrivo)
                           and quantita_proposta > 0)
             from fb_proposta_riordino('e3000000-0000-0000-0000-000000000001', 7)),
  true, 'ogni proposta copre scorta e fabbisogno, tolti giacenza e arrivi');

-- ═══ §30–33 ANALISI E CRUSCOTTO ══════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select ok((select bool_and(chiave ~ '^\d{2}:00$') from fb_food_cost('e3000000-0000-0000-0000-000000000001', pg_temp.oggi(), pg_temp.oggi(), 'fascia')),
  'margine per fascia oraria');
select is((select format('%s|%s|%s|%s', k->'commerciali' ? 'ordini', k->'commerciali' ? 'piu_venduti',
                         k->'cucina' ? 'errori_comande', (k->'economici'->>'sfrido_mescita')::numeric)
             from fb_kpi('e3000000-0000-0000-0000-000000000001', pg_temp.oggi(), pg_temp.oggi()) k),
  't|t|t|2.10', 'KPI del banco: ordini, più venduti, errori, sfrido di mescita in euro');
select is((select format('%s|%s|%s', c->'magazzino'->>'consumi_anomali', c ? 'personale', c->'vendite' ? 'margine')
             from fb_cruscotto('e3000000-0000-0000-0000-000000000001') c),
  '1|t|t', 'cruscotto della direzione: consumi anomali, personale, margine');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s', jsonb_typeof(c->'vendite'), c ? 'personale') from fb_cruscotto('e3000000-0000-0000-0000-000000000001') c),
  'null|t', 'l''operatore vede sala, banco e turni, non gli incassi');
select throws_ok($$select fb_kpi('e3000000-0000-0000-0000-000000000001', current_date, current_date)$$,
  '42501', null, 'i KPI sono della direzione');
select pg_temp.torna_postgres();

-- ═══ LICENZA ═════════════════════════════════════════════════════════
update moduli_licenze set attivo = false where slug = 'bar';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select count(*) from bar_convenzioni where id = 'ee000000-0000-0000-0000-000000000001')
          + (select count(*) from bar_mescite where id = 'f3000000-0000-0000-0000-000000000001'),
  0::bigint, 'senza licenza del Bar convenzioni e mescite spariscono');
select pg_temp.torna_postgres();

select * from finish();
rollback;
