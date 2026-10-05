-- ═══════════════════════════════════════════════════════════════════
-- Gate FIORAIO 2/2 — vendita al banco con le composizioni che escono
-- subito dal magazzino; resi (rivendibili e no); fabbisogno dagli ordini
-- da produrre e dalla scorta minima; sprechi per prodotto e fornitore;
-- indicatori su dati noti; cruscotto; agenda; profilo del cliente;
-- segmenti; composizioni realizzabili; ricerca. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

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

insert into moduli_licenze (slug, attivo) values ('fioraio', true)
on conflict (slug) do update set attivo = excluded.attivo;
delete from fior_impostazioni;
insert into fior_impostazioni (ricarico_pct, costo_orario) values (150, 20);

insert into organizzazioni (id, ragione_sociale) values ('c9000000-0000-0000-0000-0000000000f1', 'Vivai Test');
insert into mag_articoli (id, modulo, descrizione, unita_misura, costo_unitario, prezzo_vendita, aliquota_iva, vendibile, deperibile, scorta_minima, fornitore_id) values
  ('ca000000-0000-0000-0000-0000000000f1', 'fioraio', 'Tulipano test', 'stelo', 1, 2.5, 10, true, true, 20, 'c9000000-0000-0000-0000-0000000000f1'),
  ('ca000000-0000-0000-0000-0000000000f2', 'fioraio', 'Cachepot test', 'pz', 5, 15, 22, true, false, 0, null);
insert into mag_movimenti (articolo_id, tipo, quantita, costo_unitario) values
  ('ca000000-0000-0000-0000-0000000000f1', 'carico', 60, 1), ('ca000000-0000-0000-0000-0000000000f2', 'carico', 5, 5);
insert into distinte_base (id, modulo, nome, tipo, resa, unita_resa, tempo_preparazione_min, prezzo_vendita) values
  ('cd000000-0000-0000-0000-0000000000f1', 'fioraio', 'Mazzo 10 tulipani test', 'ricetta', 1, 'pz', 12, 30);
insert into distinte_base_righe (distinta_id, articolo_id, quantita) values ('cd000000-0000-0000-0000-0000000000f1', 'ca000000-0000-0000-0000-0000000000f1', 10);
insert into contatti (id, nome, cognome, consenso_marketing) values ('c7000000-0000-0000-0000-0000000000f1', 'Carla', 'Banco', true);

select is((select realizzabili from fior_composizioni_disponibili() where distinta_id = 'cd000000-0000-0000-0000-0000000000f1'), 6,
  'con 60 tulipani si fanno 6 mazzi: è la disponibilità per i canali online');

-- ═══ VENDITA AL BANCO ═══════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
create temp table banco as select fior_vendi_banco(
  '[{"distinta_id": "cd000000-0000-0000-0000-0000000000f1", "quantita": 1}, {"articolo_id": "ca000000-0000-0000-0000-0000000000f2", "quantita": 1}]',
  'c7000000-0000-0000-0000-0000000000f1') as conto;
grant select on banco to authenticated;
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s', o.stato, o.modalita, s.totale) from fior_ordini o join conti_saldi s on s.conto_id = o.conto_id
            where o.conto_id = (select conto from banco)), 'consegnato|banco|45.00', 'al banco: ordine già consegnato e conto da 45 € pronto da incassare');
select is((select string_agg(format('%s:%s', descrizione, giacenza), ',' order by descrizione) from mag_giacenze
            where articolo_id in ('ca000000-0000-0000-0000-0000000000f1', 'ca000000-0000-0000-0000-0000000000f2')),
  'Cachepot test:4.000,Tulipano test:50.000', 'il mazzo e il cachepot escono subito dal magazzino');
select is((select count(*)::int from fior_produzione p join fior_ordini o on o.id = p.ordine_id where o.conto_id = (select conto from banco)), 0,
  'al banco non nascono commesse di produzione');
insert into conti_pagamenti (conto_id, modulo, metodo, importo) select conto, 'fioraio', 'contanti', 45 from banco;
select chiudi_conto((select conto from banco));
select is((select stato::text from fior_ordini where conto_id = (select conto from banco)), 'chiuso', 'incassato: ordine chiuso');

-- ═══ RESI ═══════════════════════════════════════════════════════════
insert into fior_resi (ordine_id, riga_id, quantita, motivo, rivendibile)
select o.id, r.id, 1, 'Misura sbagliata', true from fior_ordini o join fior_ordini_righe r on r.ordine_id = o.id
 where o.conto_id = (select conto from banco) and r.tipo = 'articolo';
select is((select format('%s|%s', (select importo from fior_resi where motivo = 'Misura sbagliata'),
                         (select giacenza from mag_giacenze where articolo_id = 'ca000000-0000-0000-0000-0000000000f2'))),
  '15.00|5.000', 'il cachepot reso torna in magazzino e vale 15 € da restituire');
insert into fior_resi (ordine_id, riga_id, quantita, motivo, rivendibile)
select o.id, r.id, 1, 'Fiori appassiti', true from fior_ordini o join fior_ordini_righe r on r.ordine_id = o.id
 where o.conto_id = (select conto from banco) and r.tipo = 'composizione';
select is((select rivendibile from fior_resi where motivo = 'Fiori appassiti'), false, 'una composizione resa non torna in vendita: è una perdita');
select throws_like($$insert into fior_resi (ordine_id, riga_id, quantita, motivo)
  select o.id, r.id, 1, 'Ancora' from fior_ordini o join fior_ordini_righe r on r.ordine_id = o.id
   where o.conto_id = (select conto from banco) and r.tipo = 'articolo'$$, 'Reso oltre il venduto%', 'non si rende più del venduto');

-- ═══ FABBISOGNO ═════════════════════════════════════════════════════
insert into fior_ordini (id, committente_id, committente_nome, modalita, data_richiesta) values
  ('c6000000-0000-0000-0000-0000000000f1', 'c7000000-0000-0000-0000-0000000000f1', 'Carla Banco', 'ritiro', pg_temp.oggi() + 2);
insert into fior_ordini_righe (ordine_id, tipo, distinta_id, quantita) values
  ('c6000000-0000-0000-0000-0000000000f1', 'composizione', 'cd000000-0000-0000-0000-0000000000f1', 6);
update fior_ordini set stato = 'confermato' where id = 'c6000000-0000-0000-0000-0000000000f1';
select is((select format('%s|%s|%s', per_ordini, giacenza, quantita_proposta >= 30) from fior_fabbisogno(7) where articolo_id = 'ca000000-0000-0000-0000-0000000000f1'),
  '60.00|50.000|t', 'servono 60 tulipani per gli ordini, in casa 50: si propone l''acquisto (con la scorta minima)');
select is((select count(*)::int from fior_fabbisogno(7) where articolo_id = 'ca000000-0000-0000-0000-0000000000f2'), 0,
  'ciò che basta non entra nella proposta');

-- ═══ SPRECHI ════════════════════════════════════════════════════════
insert into mag_movimenti (articolo_id, tipo, quantita, costo_unitario) values ('ca000000-0000-0000-0000-0000000000f1', 'deterioramento', -8, 1);
select is((select format('%s|%s|%s', v->>'costo', v->'per_tipo'->>'deterioramento', v->'per_fornitore'->0->>'fornitore')
             from fior_sprechi(pg_temp.oggi() - 1, pg_temp.oggi()) v
            where (v->'per_prodotto') @> '[{"descrizione": "Tulipano test"}]'),
  '8.00|8.00|Vivai Test', 'otto tulipani appassiti: 8 € di spreco, per prodotto e per fornitore');

-- ═══ INDICATORI, CRUSCOTTO, AGENDA ══════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
create temp table k as select fior_kpi(pg_temp.oggi() - 1, pg_temp.oggi()) as v;
select pg_temp.torna_postgres();
select ok((select (v->'commerciali'->>'ordini')::int >= 1 and (v->'commerciali'->>'fatturato')::numeric >= 45 from k), 'indicatori: la vendita al banco è nel fatturato');
select ok((select (v->'prodotti'->'composizioni') @> '[{"descrizione": "Mazzo 10 tulipani test"}]' from k), 'la composizione venduta è tra le più vendute, con il suo margine');
select ok((select (v->'operativi'->>'resi')::int >= 2 and (v->'magazzino'->>'sprechi')::numeric >= 8 from k), 'resi e sprechi sono negli indicatori');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is(fior_cruscotto()->'margine_mese', 'null'::jsonb, 'il margine non è per la reception');
select ok((fior_cruscotto()->>'da_preparare')::int >= 1, 'il cruscotto conta le composizioni da preparare');
select ok(exists (select 1 from fior_agenda(pg_temp.oggi(), pg_temp.oggi() + 7) where tipo = 'ritiro' and riferimento = 'c6000000-0000-0000-0000-0000000000f1'),
  'l''agenda mostra il ritiro prenotato');
select pg_temp.torna_postgres();

-- ═══ CLIENTI, SEGMENTI, RICERCA ═════════════════════════════════════
select is((select format('%s|%s', ordini, spesa) from fior_clienti_riepilogo where contatto_id = 'c7000000-0000-0000-0000-0000000000f1'),
  '2|225.00', 'profilo del cliente: due ordini, 225 € di spesa');
select ok('c7000000-0000-0000-0000-0000000000f1' not in (select seg_fior_inattivi('fioraio', '{"mesi": 6}')), 'chi ha appena ordinato non è tra gli inattivi');
select is((select tipo from ricerca_globale('Carla') where tipo = 'ordine_fiorista' limit 1), 'ordine_fiorista', 'gli ordini si trovano dalla ricerca');

select * from finish();
rollback;
