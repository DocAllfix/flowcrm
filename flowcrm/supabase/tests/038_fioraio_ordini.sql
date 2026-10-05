-- ═══════════════════════════════════════════════════════════════════
-- Gate FIORAIO 1/2 — ordini con committente diverso dal destinatario;
-- costo e prezzo della composizione su misura; totale con la consegna
-- della zona; stati in sequenza (mai indietro); conferma che genera
-- commessa di produzione, consegna e ricorrenza; produzione che scarica
-- fiori e materiali; consegna che fa avanzare l'ordine; conto di cassa
-- che lo chiude; abbonamento che genera gli ordini alle date giuste;
-- promemoria delle ricorrenze; annullamento; permessi e licenza. ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

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
insert into fior_impostazioni (ricarico_pct, costo_orario, promemoria_ricorrenze_giorni, abbonamenti_anticipo_giorni) values (150, 20, 7, 3);

-- ═══ CATALOGO, MAGAZZINO, COMPOSIZIONE STANDARD, ZONA ═══════════════
insert into mag_articoli (id, modulo, descrizione, unita_misura, costo_unitario, prezzo_vendita, aliquota_iva, vendibile, deperibile) values
  ('fa000000-0000-0000-0000-0000000000f1', 'fioraio', 'Rosa rossa', 'stelo', 1, 3, 10, true, true),
  ('fa000000-0000-0000-0000-0000000000f2', 'fioraio', 'Nastro raso', 'm', 0.5, null, 22, false, false),
  ('fa000000-0000-0000-0000-0000000000f3', 'fioraio', 'Vaso in vetro', 'pz', 4, 12, 22, true, false);
insert into mag_movimenti (articolo_id, tipo, quantita) values
  ('fa000000-0000-0000-0000-0000000000f1', 'carico', 100), ('fa000000-0000-0000-0000-0000000000f2', 'carico', 20),
  ('fa000000-0000-0000-0000-0000000000f3', 'carico', 10);
insert into distinte_base (id, modulo, nome, tipo, resa, unita_resa, tempo_preparazione_min, prezzo_vendita) values
  ('fd000000-0000-0000-0000-0000000000f1', 'fioraio', 'Bouquet 12 rose', 'ricetta', 1, 'pz', 15, 45);
insert into distinte_base_righe (distinta_id, articolo_id, quantita) values
  ('fd000000-0000-0000-0000-0000000000f1', 'fa000000-0000-0000-0000-0000000000f1', 12),
  ('fd000000-0000-0000-0000-0000000000f1', 'fa000000-0000-0000-0000-0000000000f2', 2);
insert into fior_zone (id, nome, cap, importo) values ('fe000000-0000-0000-0000-0000000000f1', 'Centro', '{40121,40122}', 5);
insert into contatti (id, nome, cognome) values ('f7000000-0000-0000-0000-0000000000f1', 'Mario', 'Rossi');

-- ═══ STIMA DELLA COMPOSIZIONE SU MISURA ═════════════════════════════
select is((select format('%s|%s|%s', v->>'materiali', v->>'manodopera', v->>'prezzo')
             from fior_stima('[{"articolo_id": "fa000000-0000-0000-0000-0000000000f1", "quantita": 10}]', 30) v),
  '10.00|10.00|50', 'su misura: 10 € di fiori, 10 € di manodopera, prezzo proposto 50 € (ricarico 150%)');

-- ═══ ORDINE: I QUATTRO RUOLI, LA ZONA, IL TOTALE ════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$insert into fior_ordini (committente_nome, modalita, created_by) values ('Mario Rossi', 'consegna', '00000000-0000-0000-0000-00000000000c')$$,
  '23514', null, 'la consegna vuole destinatario e indirizzo');
insert into fior_ordini (id, committente_id, committente_nome, destinatario_nome, destinatario_telefono, indirizzo, cap, citta, modalita,
                         data_richiesta, ora_richiesta, messaggio, firma, occasione, ricorda_ricorrenza, created_by) values
  ('f6000000-0000-0000-0000-0000000000f1', 'f7000000-0000-0000-0000-0000000000f1', 'Mario Rossi', 'Anna Bianchi', '333 1112223',
   'Via XX Settembre 4', '40121', 'Bologna', 'consegna', pg_temp.oggi() + 1, '10:00', 'Buon anniversario', 'Mario', 'anniversario', true,
   '00000000-0000-0000-0000-00000000000c');
select throws_like($$update fior_ordini set stato = 'confermato' where id = 'f6000000-0000-0000-0000-0000000000f1'$$,
  'L''ordine è vuoto%', 'un ordine vuoto non si conferma');
insert into fior_ordini_righe (id, ordine_id, tipo, distinta_id, created_by) values
  ('f5000000-0000-0000-0000-0000000000f1', 'f6000000-0000-0000-0000-0000000000f1', 'composizione', 'fd000000-0000-0000-0000-0000000000f1',
   '00000000-0000-0000-0000-00000000000c');
insert into fior_ordini_righe (ordine_id, tipo, articolo_id, created_by) values
  ('f6000000-0000-0000-0000-0000000000f1', 'articolo', 'fa000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();

select is((select format('%s|%s|%s', z.nome, o.importo_consegna, o.totale) from fior_ordini o join fior_zone z on z.id = o.zona_id
            where o.id = 'f6000000-0000-0000-0000-0000000000f1'),
  'Centro|5.00|62.00', 'zona dal CAP, consegna 5 €, totale 45 + 12 + 5');
select is((select format('%s|%s', descrizione, costo_unitario) from fior_ordini_righe where id = 'f5000000-0000-0000-0000-0000000000f1'),
  'Bouquet 12 rose|18.00', 'la composizione porta nome, prezzo e costo dalla distinta (13 € di materiali + 5 € di manodopera)');
select is((select format('%s|%s|%s', committente_nome, destinatario_nome, firma) from fior_ordini where id = 'f6000000-0000-0000-0000-0000000000f1'),
  'Mario Rossi|Anna Bianchi|Mario', 'committente, destinatario e mittente del biglietto restano distinti');

-- ═══ CONFERMA: PRODUZIONE, CONSEGNA, RICORRENZA ═════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
update fior_ordini set stato = 'confermato' where id = 'f6000000-0000-0000-0000-0000000000f1';
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s', count(*), min(minuti_previsti), min(stato)) from fior_produzione where ordine_id = 'f6000000-0000-0000-0000-0000000000f1'),
  '1|15|da_fare', 'alla conferma nasce la commessa di produzione della composizione');
select is((select format('%s|%s', stato, data = pg_temp.oggi() + 1) from fior_consegne where ordine_id = 'f6000000-0000-0000-0000-0000000000f1'),
  'da_assegnare|t', 'e la consegna del giorno richiesto');
select is((select format('%s|%s', tipo, per_chi) from fior_ricorrenze where contatto_id = 'f7000000-0000-0000-0000-0000000000f1'),
  'anniversario|Anna Bianchi', 'la ricorrenza entra da sola nel profilo del cliente');
select throws_like($$update fior_consegne set stato = 'in_consegna' where ordine_id = 'f6000000-0000-0000-0000-0000000000f1'$$,
  'L''ordine non è pronto%', 'non si parte con un ordine non ancora pronto');

-- ═══ PRODUZIONE E MAGAZZINO ═════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
update fior_produzione set stato = 'in_corso' where ordine_id = 'f6000000-0000-0000-0000-0000000000f1';
select is((select stato::text from fior_ordini where id = 'f6000000-0000-0000-0000-0000000000f1'), 'in_preparazione', 'commessa iniziata: ordine in preparazione');
update fior_produzione set stato = 'pronta' where ordine_id = 'f6000000-0000-0000-0000-0000000000f1';
select pg_temp.torna_postgres();
select is((select stato::text from fior_ordini where id = 'f6000000-0000-0000-0000-0000000000f1'), 'pronto', 'tutte le commesse pronte: ordine pronto');
select is((select string_agg(format('%s:%s', descrizione, giacenza), ',' order by descrizione) from mag_giacenze
            where articolo_id in ('fa000000-0000-0000-0000-0000000000f1', 'fa000000-0000-0000-0000-0000000000f2', 'fa000000-0000-0000-0000-0000000000f3')),
  'Nastro raso:18.000,Rosa rossa:88.000,Vaso in vetro:9.000', 'dal magazzino escono 12 rose, 2 metri di nastro e il vaso');
select throws_like($$update fior_ordini set stato = 'confermato' where id = 'f6000000-0000-0000-0000-0000000000f1'$$,
  'Un ordine pronto non torna a confermato', 'gli stati vanno solo in avanti');

-- ═══ CONSEGNA E CONTO ═══════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
update fior_consegne set stato = 'in_consegna' where ordine_id = 'f6000000-0000-0000-0000-0000000000f1';
select is((select format('%s|%s', o.stato, o.addetto_consegna = '00000000-0000-0000-0000-00000000000c') from fior_ordini o where id = 'f6000000-0000-0000-0000-0000000000f1'),
  'in_consegna|t', 'partita la consegna: ordine in consegna con il suo autista');
select throws_like($$update fior_consegne set stato = 'fallita' where ordine_id = 'f6000000-0000-0000-0000-0000000000f1'$$,
  'Scrivi perché%', 'la consegna non riuscita vuole il motivo');
update fior_consegne set stato = 'consegnata', ricevuta_da = 'Anna Bianchi' where ordine_id = 'f6000000-0000-0000-0000-0000000000f1';
select is((select stato::text from fior_ordini where id = 'f6000000-0000-0000-0000-0000000000f1'), 'consegnato', 'consegnata: ordine consegnato');
create temp table conto as select fior_conto_ordine('f6000000-0000-0000-0000-0000000000f1') as id;
grant select on conto to authenticated;
select pg_temp.torna_postgres();
select is((select format('%s|%s', s.totale, c.contatto_id = 'f7000000-0000-0000-0000-0000000000f1') from conti c join conti_saldi s on s.conto_id = c.id
            where c.id = (select id from conto)), '62.00|t', 'il conto di cassa: 62 € intestati al committente');
insert into conti_pagamenti (conto_id, modulo, metodo, importo) select id, 'fioraio', 'pos', 62 from conto;
select chiudi_conto((select id from conto));
select is((select stato::text from fior_ordini where id = 'f6000000-0000-0000-0000-0000000000f1'), 'chiuso', 'conto saldato e chiuso: ordine chiuso');
select throws_like($$insert into fior_ordini_righe (ordine_id, tipo, articolo_id) values
  ('f6000000-0000-0000-0000-0000000000f1', 'articolo', 'fa000000-0000-0000-0000-0000000000f3')$$,
  'L''ordine è chiuso%', 'un ordine chiuso non si tocca più');

-- ═══ SU MISURA: COSTO DAI MATERIALI E SCARICO ═══════════════════════
insert into fior_ordini (id, committente_nome, modalita, data_richiesta) values ('f6000000-0000-0000-0000-0000000000f2', 'Cliente al banco', 'ritiro', pg_temp.oggi());
insert into fior_ordini_righe (id, ordine_id, tipo, descrizione, prezzo_unitario, minuti, richiesta) values
  ('f5000000-0000-0000-0000-0000000000f2', 'f6000000-0000-0000-0000-0000000000f2', 'su_misura', 'Mazzo campestre', 50, 30,
   '{"colori": "bianco e verde", "stile": "campestre", "budget": 50}');
insert into fior_righe_materiali (riga_id, articolo_id, quantita) values ('f5000000-0000-0000-0000-0000000000f2', 'fa000000-0000-0000-0000-0000000000f1', 10);
select is((select format('%s|%s', r.costo_unitario, o.costo_stimato) from fior_ordini_righe r join fior_ordini o on o.id = r.ordine_id
            where r.id = 'f5000000-0000-0000-0000-0000000000f2'), '20.00|20.00', 'il costo della composizione su misura segue i suoi materiali');
update fior_ordini set stato = 'confermato' where id = 'f6000000-0000-0000-0000-0000000000f2';
update fior_produzione set stato = 'pronta' where ordine_id = 'f6000000-0000-0000-0000-0000000000f2';
select is((select giacenza from mag_giacenze where articolo_id = 'fa000000-0000-0000-0000-0000000000f1'), 78::numeric, 'la produzione su misura scarica i suoi 10 steli');
select is((select count(*)::int from fior_consegne where ordine_id = 'f6000000-0000-0000-0000-0000000000f2'), 0, 'il ritiro in negozio non genera consegne');

-- ═══ ANNULLAMENTO ═══════════════════════════════════════════════════
insert into fior_ordini (id, committente_nome, destinatario_nome, indirizzo, modalita, data_richiesta) values
  ('f6000000-0000-0000-0000-0000000000f3', 'Da annullare', 'Qualcuno', 'Via Roma 1', 'consegna', pg_temp.oggi() + 2);
insert into fior_ordini_righe (ordine_id, tipo, distinta_id) values ('f6000000-0000-0000-0000-0000000000f3', 'composizione', 'fd000000-0000-0000-0000-0000000000f1');
update fior_ordini set stato = 'confermato' where id = 'f6000000-0000-0000-0000-0000000000f3';
update fior_ordini set stato = 'annullato', annullato_motivo = 'Il cliente ha cambiato idea' where id = 'f6000000-0000-0000-0000-0000000000f3';
select is((select format('%s|%s', (select stato from fior_produzione where ordine_id = 'f6000000-0000-0000-0000-0000000000f3'),
                         (select count(*) from fior_consegne where ordine_id = 'f6000000-0000-0000-0000-0000000000f3'))),
  'annullata|0', 'ordine annullato: commessa annullata e consegna tolta');
select is((select giacenza from mag_giacenze where articolo_id = 'fa000000-0000-0000-0000-0000000000f1'), 78::numeric, 'e il magazzino non si è mosso');

-- ═══ ABBONAMENTO FLOREALE ═══════════════════════════════════════════
insert into organizzazioni (id, ragione_sociale) values ('f9000000-0000-0000-0000-0000000000f1', 'Studio Legale Test');
insert into fior_abbonamenti (id, organizzazione_id, piano, tipo, frequenza, prezzo, distinta_id, destinatario_nome, indirizzo, cap, prossima_consegna, created_by) values
  ('fb000000-0000-0000-0000-0000000000f1', 'f9000000-0000-0000-0000-0000000000f1', 'Fiori per la reception', 'fiori_ufficio', 'settimanale', 35,
   'fd000000-0000-0000-0000-0000000000f1', 'Reception', 'Via Indipendenza 8', '40121', pg_temp.oggi() + 2, '00000000-0000-0000-0000-00000000000a');
select is(fior_genera_ordini_abbonamenti(), 1, 'l''abbonamento genera l''ordine tre giorni prima');
select is((select format('%s|%s|%s|%s', o.stato, o.committente_nome, o.totale, o.data_richiesta = pg_temp.oggi() + 2) from fior_ordini o
            where o.abbonamento_id = 'fb000000-0000-0000-0000-0000000000f1'),
  'confermato|Studio Legale Test|40.00|t', 'ordine confermato a nome dell''azienda: 35 € più 5 di consegna, nel giorno previsto');
select is((select prossima_consegna - pg_temp.oggi() from fior_abbonamenti where id = 'fb000000-0000-0000-0000-0000000000f1'), 9,
  'la prossima consegna è fra una settimana');
select is(fior_genera_ordini_abbonamenti(), 0, 'e non si genera due volte');

-- ═══ RICORRENZE ═════════════════════════════════════════════════════
insert into fior_ricorrenze (contatto_id, tipo, per_chi, giorno, mese) values
  ('f7000000-0000-0000-0000-0000000000f1', 'compleanno', 'la mamma', extract(day from pg_temp.oggi() + 7)::int, extract(month from pg_temp.oggi() + 7)::int);
select is(fior_promemoria_ricorrenze(), 1, 'sette giorni prima parte il promemoria');
select ok(exists (select 1 from notifiche where destinatario_id = '00000000-0000-0000-0000-00000000000c' and titolo = 'Ricorrenza in arrivo: Mario Rossi'),
  'il negozio riceve l''avviso');
select is(fior_promemoria_ricorrenze(), 0, 'una volta sola');

-- ═══ PERMESSI E LICENZA ═════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
update fior_impostazioni set ricarico_pct = 10 where id = 1;
select pg_temp.torna_postgres();
select is((select ricarico_pct from fior_impostazioni where id = 1), 150.00::numeric, 'il ricarico lo cambia solo la direzione');
update moduli_licenze set attivo = false where slug = 'fioraio';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from fior_ordini), 0, 'senza licenza nessun ordine visibile');
select pg_temp.torna_postgres();

select * from finish();
rollback;
