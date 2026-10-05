-- ═══════════════════════════════════════════════════════════════════
-- Gate GARAGE 2/2 — chiavi con ogni passaggio di mano tracciato; danni
-- legati alla sosta con l'avviso alla direzione; ricarica = energia ×
-- tariffa, una presa un veicolo; servizi a prezzo di listino con il conto
-- a lavoro finito e l'avviso «veicolo pronto»; deposito gomme tra le
-- scadenze; lista d'attesa senza promettere un posto a due; convenzione:
-- consuntivo e fattura di canoni, soste oltre i posti e ricariche; giro
-- notturno (rinnovi, scaduti, insoluti); indicatori e cruscotto con i
-- dati economici solo alla direzione; ricerca; permessi; licenza. ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(52);

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
-- Il conto si salda e si chiude come fa la cassa.
create or replace function pg_temp.salda(p_conto uuid, p_importo numeric) returns void as $$
begin
  insert into conti_pagamenti (conto_id, modulo, metodo, importo) values (p_conto, 'garage', 'pos', p_importo);
  update conti set stato = 'chiuso', chiuso_at = now() where id = p_conto;
end;
$$ language plpgsql;

insert into moduli_licenze (slug, attivo) values ('garage', true)
on conflict (slug) do update set attivo = excluded.attivo;

-- ═══ L'AUTORIMESSA ══════════════════════════════════════════════════
insert into gar_strutture (id, nome, created_by) values ('b1000000-0000-0000-0000-000000000001', 'Autorimessa Centrale', '00000000-0000-0000-0000-00000000000a');
insert into gar_tariffari (id, struttura_id, nome, convenzionato, franchigia_min, frazione_min, prezzo_frazione) values
  ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Oraria', false, 10, 60, 2),
  ('b2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Convenzionata', true, 10, 60, 1);
insert into gar_posti (id, struttura_id, codice, numero, tipo) values
  ('b3000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'A1', 1, 'auto'),
  ('b3000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'A2', 2, 'auto'),
  ('b3000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'A3', 3, 'auto'),
  ('b3000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'A4', 4, 'auto'),
  ('b3000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'A5', 5, 'auto'),
  ('b3000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', 'M1', 6, 'moto');
insert into gar_clienti (id, tipo, nome, email, created_by) values
  ('b4000000-0000-0000-0000-000000000001', 'privato', 'Mario Rossi', 'mario.rossi@example.test', '00000000-0000-0000-0000-00000000000a'),
  ('b4000000-0000-0000-0000-000000000002', 'azienda', 'ACME Srl', 'amministrazione@acme.example.test', '00000000-0000-0000-0000-00000000000a');
insert into gar_veicoli (id, cliente_id, targa, marca, modello, alimentazione, created_by) values
  ('b5000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', 'AB123CD', 'Fiat', '500e', 'elettrica', '00000000-0000-0000-0000-00000000000a');
insert into gar_colonnine (id, struttura_id, codice, posto_id, prese, potenza_kw, tariffa_kwh, created_by) values
  ('b6000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'C1', 'b3000000-0000-0000-0000-000000000002', 1, 22, 0.60, '00000000-0000-0000-0000-00000000000a');
insert into gar_servizi_listino (id, nome, categoria, prezzo, created_by) values
  ('b7000000-0000-0000-0000-000000000001', 'Lavaggio esterno', 'lavaggio', 15, '00000000-0000-0000-0000-00000000000a');
select is((select format('%s|%s|%s', posti, auto, moto) from gar_strutture_riepilogo where struttura_id = 'b1000000-0000-0000-0000-000000000001'), '6|5|1',
  'l''anagrafica conta da sé i posti per tipo');

create temp table gar_esiti (chiave text primary key, v jsonb);
grant all on gar_esiti to authenticated;

-- ═══ CHIAVI IN CUSTODIA ═════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into gar_chiavi (id, struttura_id, numero, veicolo_id, armadietto, created_by) values
  ('b8000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '12', 'b5000000-0000-0000-0000-000000000001', 'Bacheca A', '00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s|%s|%s', k.stato, k.targa, k.cliente_id = 'b4000000-0000-0000-0000-000000000001',
                         (select string_agg(tipo, ',') from gar_chiavi_movimenti m where m.chiave_id = k.id)) from gar_chiavi k where k.id = 'b8000000-0000-0000-0000-000000000001'),
  'in_custodia|AB123CD|t|deposito', 'la chiave presa in custodia ha veicolo, cliente e il primo movimento');
select throws_ok($$insert into gar_chiavi_movimenti (chiave_id, tipo, created_by) values ('b8000000-0000-0000-0000-000000000001', 'consegna', '00000000-0000-0000-0000-00000000000c')$$,
  '23514', 'Indica a chi va la chiave', 'la consegna vuole il nome di chi la prende');
insert into gar_chiavi_movimenti (chiave_id, tipo, persona, motivo, created_by) values
  ('b8000000-0000-0000-0000-000000000001', 'consegna', 'Luca (lavaggio)', 'Lavaggio', '00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s', stato, in_mano_a) from gar_chiavi where id = 'b8000000-0000-0000-0000-000000000001'), 'consegnata|Luca (lavaggio)',
  'consegnata: si sa chi ce l''ha');
select throws_ok($$insert into gar_chiavi_movimenti (chiave_id, tipo, persona, created_by) values ('b8000000-0000-0000-0000-000000000001', 'consegna', 'Altro', '00000000-0000-0000-0000-00000000000c')$$,
  '23514', null, 'una chiave fuori non si consegna di nuovo');
select throws_ok($$update gar_chiavi set stato = 'in_custodia' where id = 'b8000000-0000-0000-0000-000000000001'$$, '42501', null,
  'lo stato della chiave non si cambia a mano');
insert into gar_chiavi_movimenti (chiave_id, tipo, persona, created_by) values
  ('b8000000-0000-0000-0000-000000000001', 'rientro', 'Luca (lavaggio)', '00000000-0000-0000-0000-00000000000c');
insert into gar_chiavi_movimenti (chiave_id, tipo, persona, created_by) values
  ('b8000000-0000-0000-0000-000000000001', 'restituzione', 'Mario Rossi', '00000000-0000-0000-0000-00000000000c');
update gar_chiavi_movimenti set persona = 'Manomesso' where chiave_id = 'b8000000-0000-0000-0000-000000000001';
select is((select format('%s|%s|%s|%s', (select stato from gar_chiavi where id = 'b8000000-0000-0000-0000-000000000001'), count(*),
                         count(*) filter (where operatore_id = '00000000-0000-0000-0000-00000000000c'), count(*) filter (where persona = 'Manomesso'))
             from gar_chiavi_movimenti where chiave_id = 'b8000000-0000-0000-0000-000000000001'),
  'restituita|4|4|0', 'rientro e restituzione: quattro movimenti con l''operatore, e il registro non si riscrive');
select throws_ok($$insert into gar_chiavi_movimenti (chiave_id, tipo, persona, created_by) values ('b8000000-0000-0000-0000-000000000001', 'consegna', 'Altro', '00000000-0000-0000-0000-00000000000c')$$,
  '23514', 'La chiave è già stata restituita al cliente', 'restituita al cliente, la chiave non si muove più');

-- ═══ DANNI E ANOMALIE ═══════════════════════════════════════════════
insert into gar_esiti select 'mario', gar_ingresso('b1000000-0000-0000-0000-000000000001', 'AB123CD');
insert into gar_danni (id, struttura_id, sosta_id, tipo, descrizione, testimoni, created_by) values
  ('b9000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', (select (v->>'sosta_id')::uuid from gar_esiti where chiave = 'mario'),
   'danno_ingresso', 'Paraurti posteriore rigato, lato sinistro', 'Olga', '00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s|%s|%s', targa, veicolo_id = 'b5000000-0000-0000-0000-000000000001', cliente_id = 'b4000000-0000-0000-0000-000000000001',
                         operatore_id = '00000000-0000-0000-0000-00000000000c') from gar_danni where id = 'b9000000-0000-0000-0000-000000000001'),
  'AB123CD|t|t|t', 'il danno rilevato sulla sosta prende veicolo, cliente e operatore');
insert into gar_danni (id, struttura_id, tipo, descrizione, stato, created_by) values
  ('b9000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'anomalia', 'Sbarra d''uscita rimasta aperta', 'chiuso', '00000000-0000-0000-0000-00000000000c');
select isnt((select chiuso_at from gar_danni where id = 'b9000000-0000-0000-0000-000000000002'), null, 'l''anomalia chiusa ha la sua data di chiusura');
select pg_temp.torna_postgres();
select is((select count(*)::int from notifiche where destinatario_id = '00000000-0000-0000-0000-00000000000a' and titolo = 'Danno all''ingresso · AB123CD'), 1,
  'la direzione è avvisata del danno');

-- ═══ COLONNINE E RICARICHE ══════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into gar_esiti select 'ric1', jsonb_build_object('id', gar_ricarica_avvia('b6000000-0000-0000-0000-000000000001', 'ab 123 cd'));
select is((select format('%s|%s|%s|%s', r.presa, r.sosta_id is not null, r.cliente_id = 'b4000000-0000-0000-0000-000000000001',
                         (select stato from gar_colonnine_stato where colonnina_id = r.colonnina_id))
             from gar_ricariche r where r.id = (select (v->>'id')::uuid from gar_esiti where chiave = 'ric1')),
  '1|t|t|in_uso', 'la ricarica si lega alla sosta e al cliente, e la colonnina risulta in uso');
select throws_ok($$select gar_ricarica_avvia('b6000000-0000-0000-0000-000000000001', 'ZZ999ZZ')$$, '23514', 'Nessuna presa libera sulla colonnina C1',
  'una presa ricarica un veicolo alla volta');
select is((select format('%s|%s|%s', v->>'costo', v->>'stato', v->>'conto_id' is not null)
             from gar_ricarica_chiudi((select (v->>'id')::uuid from gar_esiti where chiave = 'ric1'), 12.5) v),
  '7.50|da_pagare|t', '12,5 kWh a 0,60 €: 7,50 € sul conto di cassa');
select pg_temp.torna_postgres();
select pg_temp.salda((select conto_id from gar_ricariche where id = (select (v->>'id')::uuid from gar_esiti where chiave = 'ric1')), 7.50);
select is((select format('%s|%s', r.stato, (select stato from gar_colonnine_stato where colonnina_id = r.colonnina_id))
             from gar_ricariche r where r.id = (select (v->>'id')::uuid from gar_esiti where chiave = 'ric1')),
  'pagata|disponibile', 'incassata, la ricarica è pagata e la colonnina torna disponibile');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
update gar_colonnine set fermo = 'guasta' where id = 'b6000000-0000-0000-0000-000000000001';
select throws_ok($$select gar_ricarica_avvia('b6000000-0000-0000-0000-000000000001', 'AB123CD')$$, '23514', 'La colonnina è guasta',
  'il personale segna il guasto e la colonnina non ricarica');
select throws_ok($$update gar_colonnine set tariffa_kwh = 0.01 where id = 'b6000000-0000-0000-0000-000000000001'$$, '42501', null,
  'la tariffa della ricarica la cambia la direzione');
update gar_colonnine set fermo = null where id = 'b6000000-0000-0000-0000-000000000001';

-- ═══ SERVIZI AGGIUNTIVI ═════════════════════════════════════════════
insert into gar_servizi (id, struttura_id, listino_id, veicolo_id, prezzo, created_by) values
  ('ba000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'b7000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 1,
   '00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s|%s|%s', descrizione, prezzo, targa, categoria) from gar_servizi where id = 'ba000000-0000-0000-0000-000000000001'),
  'Lavaggio esterno|15.00|AB123CD|lavaggio', 'il servizio prende nome e prezzo dal listino: lo sconto non lo fa l''operatore');
update gar_servizi set stato = 'in_corso' where id = 'ba000000-0000-0000-0000-000000000001';
update gar_servizi set stato = 'pronto' where id = 'ba000000-0000-0000-0000-000000000001';
select is((select format('%s|%s|%s|%s', s.operatore_id = '00000000-0000-0000-0000-00000000000c', s.pronto_at is not null, c.stato, s.pagato)
             from gar_servizi s join conti c on c.id = s.conto_id where s.id = 'ba000000-0000-0000-0000-000000000001'),
  't|t|aperto|f', 'a lavoro finito nasce il conto da incassare');
select throws_ok($$update gar_servizi set pagato = true where id = 'ba000000-0000-0000-0000-000000000001'$$, '42501', null, 'il servizio non si segna pagato a mano');
select pg_temp.torna_postgres();
select is((select count(*)::int from mail_outbox where destinatario = 'mario.rossi@example.test' and oggetto = 'Il suo veicolo è pronto'), 1, 'il cliente riceve «veicolo pronto»');
select is((select importo from conti_righe where conto_id = (select conto_id from gar_servizi where id = 'ba000000-0000-0000-0000-000000000001')), 15.00::numeric,
  'sul conto c''è il prezzo del servizio');
select pg_temp.salda((select conto_id from gar_servizi where id = 'ba000000-0000-0000-0000-000000000001'), 15);
select is((select pagato from gar_servizi where id = 'ba000000-0000-0000-0000-000000000001'), true, 'incassato il conto, il servizio è pagato');
select throws_ok($$update gar_servizi set stato = 'annullato' where id = 'ba000000-0000-0000-0000-000000000001'$$, '23514', null, 'un servizio pagato non si annulla');

-- ═══ DEPOSITO PNEUMATICI ════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into gar_pneumatici (id, struttura_id, cliente_id, veicolo_id, marca, misura, stagione, posizione, restituzione_prevista, created_by) values
  ('bb000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001',
   'Michelin', '185/65 R15', 'invernali', 'Scaffale 3, ripiano B', pg_temp.oggi() + 30, '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s', tipo, data_scadenza = pg_temp.oggi() + 30) from scadenze_moduli where entita = 'gar_pneumatici' and entita_id = 'bb000000-0000-0000-0000-000000000001'
              and stato = 'aperta'), 'Cambio gomme|t', 'la restituzione prevista delle gomme è tra le scadenze');
update gar_pneumatici set stato = 'restituiti' where id = 'bb000000-0000-0000-0000-000000000001';
select is((select format('%s|%s', restituiti_il = pg_temp.oggi(), (select count(*) from scadenze_moduli where entita = 'gar_pneumatici'
              and entita_id = 'bb000000-0000-0000-0000-000000000001' and stato = 'aperta')) from gar_pneumatici where id = 'bb000000-0000-0000-0000-000000000001'),
  't|0', 'restituite le gomme, la scadenza si toglie');

-- ═══ ANTICIPO DELLA PRENOTAZIONE ════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into gar_prenotazioni (id, struttura_id, cliente_id, cliente_nome, targa, ingresso, uscita, anticipo, created_by) values
  ('bf000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', 'Mario Rossi', 'AB123CD',
   now() + interval '3 days', now() + interval '3 days 2 hours', 5, '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();
select is((select format('%s|%s', c.stato, s.residuo) from conti c join conti_saldi s on s.conto_id = c.id
            where c.riferimento_tipo = 'gar_prenotazioni' and c.riferimento_id = 'bf000000-0000-0000-0000-000000000001'),
  'aperto|5.00', 'l''anticipo della prenotazione è un conto da incassare');

-- ═══ LISTA D'ATTESA ═════════════════════════════════════════════════
insert into gar_attese (id, struttura_id, cliente_id, tipo_posto, created_at, created_by) values
  ('bc000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', 'moto', now() - interval '2 days', '00000000-0000-0000-0000-00000000000a'),
  ('bc000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000002', 'moto', now() - interval '1 day', '00000000-0000-0000-0000-00000000000a');
select is(gar_attese_avvisa(), 1, 'un solo posto moto libero: si avvisa una persona sola');
select is((select string_agg(stato, ',' order by created_at) from gar_attese where struttura_id = 'b1000000-0000-0000-0000-000000000001'), 'avvisato,in_attesa',
  'il primo in lista è avvisato, il secondo aspetta');
select is((select count(*)::int from mail_outbox where destinatario = 'mario.rossi@example.test' and oggetto = 'Si è liberato un posto'), 1, 'e riceve l''avviso');

-- ═══ CONVENZIONE: CONSUNTIVO E FATTURA ══════════════════════════════
insert into gar_convenzioni (id, struttura_id, cliente_id, posti_acquistati, tariffario_id, canone_mensile, dal, created_by) values
  ('bd000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000002', 1, 'b2000000-0000-0000-0000-000000000002', 90,
   pg_temp.oggi() - 40, '00000000-0000-0000-0000-00000000000a');
insert into gar_autorizzazioni (cliente_id, convenzione_id, tipo, persona, targa, dal, created_by) values
  ('b4000000-0000-0000-0000-000000000002', 'bd000000-0000-0000-0000-000000000001', 'dipendente', 'Dip. Uno', 'AC001ME', pg_temp.oggi() - 40, '00000000-0000-0000-0000-00000000000a'),
  ('b4000000-0000-0000-0000-000000000002', 'bd000000-0000-0000-0000-000000000001', 'dipendente', 'Dip. Due', 'AC002ME', pg_temp.oggi() - 40, '00000000-0000-0000-0000-00000000000a');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into gar_esiti select 'conv1', gar_ingresso('b1000000-0000-0000-0000-000000000001', 'AC001ME');
insert into gar_esiti select 'conv2', gar_ingresso('b1000000-0000-0000-0000-000000000001', 'AC002ME');
select pg_temp.torna_postgres();
update gar_soste set ingresso_at = now() - interval '2 hours' where targa = 'AC002ME';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into gar_esiti select 'esce2', gar_uscita((select (v->>'sosta_id')::uuid from gar_esiti where chiave = 'conv2'));
insert into gar_esiti select 'ric2', jsonb_build_object('id', gar_ricarica_avvia('b6000000-0000-0000-0000-000000000001', 'AC001ME'));
select is((select format('%s|%s|%s', v->>'costo', v->>'stato', v->>'conto_id') from gar_ricarica_chiudi((select (v->>'id')::uuid from gar_esiti where chiave = 'ric2'), 10) v),
  '6.00|in_convenzione|', 'la ricarica del dipendente va sul conto dell''azienda, non in cassa');
select is((select format('%s|%s|%s|%s', v->>'accessi', v->>'oltre_i_posti', v->>'dentro_adesso', v->>'da_fatturare')
             from gar_convenzione_consuntivo('bd000000-0000-0000-0000-000000000001', pg_temp.oggi() - 1, pg_temp.oggi()) v),
  '2|1|1|8.00', 'consuntivo: due accessi, uno oltre i posti acquistati, 8 € da fatturare');
select throws_ok($$select gar_fattura_convenzione('bd000000-0000-0000-0000-000000000001', (now() at time zone 'Europe/Rome')::date, 'G-TEST-001')$$, '42501', null,
  'la fattura la emette la direzione');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
insert into gar_esiti select 'fattura', jsonb_build_object('id', gar_fattura_convenzione('bd000000-0000-0000-0000-000000000001', pg_temp.oggi(), 'G-TEST-001'));
select pg_temp.torna_postgres();
select is((select format('%s|%s', f.totale, o.ragione_sociale) from fatture f join organizzazioni o on o.id = f.organizzazione_id
            where f.id = (select (v->>'id')::uuid from gar_esiti where chiave = 'fattura')),
  '188.00|ACME Srl', 'fattura: due mesi di canone (180 €), la sosta oltre i posti (2 €), la ricarica (6 €)');
select is((select format('%s|%s|%s', (select bool_and(fatturata) from gar_soste where convenzione_id = c.id and uscita_at is not null),
                         (select bool_and(fatturata) from gar_ricariche where convenzione_id = c.id),
                         c.fatturato_fino = (c.dal + interval '2 months' - interval '1 day')::date) from gar_convenzioni c where c.id = 'bd000000-0000-0000-0000-000000000001'),
  't|t|t', 'soste e ricariche risultano fatturate, il canone fino alla fine del secondo mese');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select throws_ok($$select gar_fattura_convenzione('bd000000-0000-0000-0000-000000000001', (now() at time zone 'Europe/Rome')::date, 'G-TEST-002')$$, '23514', null,
  'la stessa cosa non si fattura due volte');

-- ═══ INDICATORI E CRUSCOTTO ═════════════════════════════════════════
insert into gar_esiti select 'kpi', gar_kpi('b1000000-0000-0000-0000-000000000001', pg_temp.oggi() - 1, pg_temp.oggi());
select is((select format('%s|%s|%s|%s', v#>>'{occupazione,posti_totali}', v#>>'{occupazione,posti_occupati}', v#>>'{occupazione,posti_liberi}', v#>>'{occupazione,tasso}')
             from gar_esiti where chiave = 'kpi'), '6|2|4|33.3', 'occupazione: sei posti, due occupati, un terzo');
select is((select format('%s|%s', v#>>'{economici,ricavi_parcheggio}', v#>>'{economici,ricavi_servizi}') from gar_esiti where chiave = 'kpi'), '2.00|28.50',
  'ricavi: 2 € di sosta, 28,50 € tra lavaggio e ricariche');
select is((select format('%s|%s|%s|%s|%s', v#>>'{operativi,ingressi}', v#>>'{operativi,uscite}', v#>>'{operativi,danni}', v#>>'{operativi,anomalie}', v#>>'{operativi,kwh}')
             from gar_esiti where chiave = 'kpi'), '3|1|1|1|22.500', 'operativi: tre ingressi, un''uscita, un danno, un''anomalia, 22,5 kWh');
select is((select format('%s|%s|%s|%s|%s|%s', v->>'veicoli_presenti', v#>>'{posti,liberi}', v->>'allarmi', v#>>'{colonnine,disponibili}', v->>'chiavi_fuori', v->>'incassi_oggi')
             from gar_cruscotto('b1000000-0000-0000-0000-000000000001') v), '2|4|1|1|0|22.50',
  'cruscotto: veicoli presenti, posti liberi, un danno aperto, colonnina disponibile, incassi del giorno');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select v->'economici' from gar_kpi('b1000000-0000-0000-0000-000000000001', pg_temp.oggi() - 1, pg_temp.oggi()) v), 'null'::jsonb,
  'i dati economici li vede solo la direzione');

-- ═══ GIRO NOTTURNO: RINNOVI, SCADUTI, INSOLUTI ══════════════════════
select pg_temp.torna_postgres();
insert into gar_contratti (id, struttura_id, cliente_id, posto_id, inizio, fine, canone, rinnovo_automatico, created_by) values
  ('be000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001',
   pg_temp.oggi() - 40, pg_temp.oggi() - 1, 0, false, '00000000-0000-0000-0000-00000000000a'),
  ('be000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000002',
   pg_temp.oggi() - 30, pg_temp.oggi(), 0, true, '00000000-0000-0000-0000-00000000000a'),
  ('be000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000003',
   pg_temp.oggi() - 45, null, 100, true, '00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from gar_rate where contratto_id = 'be000000-0000-0000-0000-000000000003'), 2, 'un contratto cominciato 45 giorni fa ha due rate');
select is((select format('%s|%s|%s', v->>'rinnovi', v->>'scaduti', v->>'insoluti') from gar_giro_notturno() v), '1|1|2',
  'il giro notturno rinnova, fa scadere e segna gli insoluti');
select is((select string_agg(format('%s:%s', stato, fine - pg_temp.oggi()), ',' order by id) from gar_contratti where id in ('be000000-0000-0000-0000-000000000001', 'be000000-0000-0000-0000-000000000002')),
  'scaduto:-1,attivo:31', 'senza rinnovo il contratto scade; con il rinnovo automatico prosegue di un periodo uguale');
select is((select format('%s|%s', (select count(*) from mail_outbox where destinatario = 'mario.rossi@example.test' and oggetto = 'Pagamento scaduto'),
                         (select count(*) from notifiche where destinatario_id = '00000000-0000-0000-0000-00000000000a' and titolo = 'Nuovi insoluti'))),
  '2|1', 'il cliente riceve il sollecito e la direzione l''avviso');
select is((select format('%s|%s|%s|%s', veicoli, targhe, contratti_attivi, insoluto) from gar_clienti_riepilogo where cliente_id = 'b4000000-0000-0000-0000-000000000001'),
  '1|AB123CD|1|200.00', 'la scheda del cliente riassume veicoli, contratti e insoluto');
select is((select format('%s|%s', (select count(*) from seg_gar_abbonati('garage', '{}')), (select count(*) from seg_gar_ex('garage', '{}')))), '1|0',
  'campagne: l''abbonato è nel suo segmento e non tra gli ex');

-- ═══ RICERCA, PERMESSI, LICENZA ═════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s', (select count(*) from ricerca_globale('AB123CD') where tipo = 'veicolo_garage'),
                         (select count(*) from ricerca_globale('ACME') where tipo = 'cliente_garage'))), '1|1', 'veicoli e clienti del garage sono nella ricerca');
update gar_posti set fermo = 'manutenzione' where id = 'b3000000-0000-0000-0000-000000000005';
select is((select stato from gar_posti_stato where posto_id = 'b3000000-0000-0000-0000-000000000005'), 'manutenzione', 'il personale mette un posto in manutenzione');
select throws_ok($$update gar_posti set canone = 1 where id = 'b3000000-0000-0000-0000-000000000005'$$, '42501', null, 'ma il canone del posto lo cambia la direzione');
select throws_ok($$insert into gar_colonnine (struttura_id, codice, created_by) values ('b1000000-0000-0000-0000-000000000001', 'C9', '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'le colonnine le installa la direzione');
select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'garage';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from gar_chiavi) + (select count(*)::int from gar_danni) + (select count(*)::int from gar_servizi) + (select count(*)::int from gar_ricariche)
        + (select count(*)::int from gar_colonnine_stato), 0, 'senza licenza non si vede niente');
select pg_temp.torna_postgres();

select * from finish();
rollback;
