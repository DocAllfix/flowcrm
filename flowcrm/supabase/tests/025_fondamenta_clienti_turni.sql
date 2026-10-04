-- ═══════════════════════════════════════════════════════════════════
-- Gate FONDAMENTA F0.4 + F0.5 + F0.6 — fidelizzazione, gift card,
-- coupon, feedback; turni; campagne con consenso. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(61);

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

insert into moduli_licenze (slug, attivo) values ('ristorante', true), ('bar', true), ('hotel', false)
on conflict (slug) do update set attivo = excluded.attivo;

insert into contatti (id, nome, email, telefono, consenso_marketing) values
  ('c0000000-0000-0000-0000-000000000001', 'Mario', 'mario@example.com', null, true),
  ('c0000000-0000-0000-0000-000000000002', 'Lucia', 'lucia@example.com', null, false),
  ('c0000000-0000-0000-0000-000000000003', 'Paolo', null, '+39 333 1234567', true),
  ('c0000000-0000-0000-0000-000000000004', 'Gianna', 'gianna@', null, true);

-- ═══ FIDELIZZAZIONE ══════════════════════════════════════════════════
insert into fid_programmi (id, modulo, nome, punti_per_euro, timbri_soglia, premio_timbri,
                           benvenuto_punti, referral_punti, livelli) values
  ('f1000000-0000-0000-0000-000000000001', 'bar', 'Caffè fedeltà', 1, 10, 'Caffè omaggio', 5, 20,
   '[{"nome":"Argento","soglia":50},{"nome":"Oro","soglia":200}]'),
  ('f1000000-0000-0000-0000-000000000002', 'ristorante', 'Amici del ristorante', 0.5, null, null, 0, 0, '[]');

insert into fid_tessere (id, programma_id, contatto_id) values
  ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001');
select matches((select codice from fid_tessere where id = 'f2000000-0000-0000-0000-000000000001'),
  '^FID-\d{4}-\d{4}$', 'codice tessera FID-AAAA-NNNN');
select is((select punti from fid_saldi where tessera_id = 'f2000000-0000-0000-0000-000000000001'), 5,
  'punti di benvenuto alla nuova tessera');

insert into fid_tessere (id, programma_id, contatto_id, presentata_da) values
  ('f2000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
   'f2000000-0000-0000-0000-000000000001');
select is((select punti from fid_saldi where tessera_id = 'f2000000-0000-0000-0000-000000000001'), 25,
  'chi presenta un amico riceve i punti della presentazione (5 + 20)');

-- Nove caffè da 1,20: 1 punto e 1 timbro ciascuno.
select fid_registra_acquisto('f2000000-0000-0000-0000-000000000001', 1.20) from generate_series(1, 9);
select is((select format('%s|%s|%s', punti, timbri, premi_disponibili) from fid_saldi
            where tessera_id = 'f2000000-0000-0000-0000-000000000001'),
  '34|9|0', 'nove acquisti: 34 punti, 9 timbri, ancora nessun premio');
select is((fid_registra_acquisto('f2000000-0000-0000-0000-000000000001', 49.90, 'conto',
                                 'cc000000-0000-0000-0000-000000000001')->>'premi_disponibili')::int,
  1, 'al decimo timbro il premio è maturato');
select is((select format('%s|%s', punti, livello) from fid_saldi where tessera_id = 'f2000000-0000-0000-0000-000000000001'),
  '83|Argento', '5 + 20 + 9 + 49 = 83 punti: livello Argento');
select throws_ok($$select fid_registra_acquisto('f2000000-0000-0000-0000-000000000001', 10, 'conto', 'cc000000-0000-0000-0000-000000000001')$$,
  '23505', null, 'lo stesso conto non accumula due volte');
select is(fid_riscatta_premio('f2000000-0000-0000-0000-000000000001'), 'Caffè omaggio', 'premio riscattato');
select is((select timbri from fid_saldi where tessera_id = 'f2000000-0000-0000-0000-000000000001'), 0,
  'il premio scala dieci timbri');
select throws_ok($$select fid_riscatta_premio('f2000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'senza timbri sufficienti il premio non si riscatta');
select throws_ok($$insert into fid_movimenti (tessera_id, tipo, punti) values ('f2000000-0000-0000-0000-000000000001', 'riscatto', -100)$$,
  '23514', null, 'non si riscattano più punti di quelli disponibili');
update fid_tessere set attiva = false where id = 'f2000000-0000-0000-0000-000000000002';
select throws_ok($$select fid_registra_acquisto('f2000000-0000-0000-0000-000000000002', 5)$$,
  '23514', null, 'una tessera disattivata non accumula');
update fid_tessere set attiva = true where id = 'f2000000-0000-0000-0000-000000000002';
select throws_ok($$insert into fid_tessere (programma_id, contatto_id, presentata_da) values ('f1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'f2000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'la presentazione vale solo nello stesso programma');

insert into fid_tessere (programma_id, contatto_id) values
  ('f1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003'),
  ('f1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004');

-- ═══ GIFT CARD ═══════════════════════════════════════════════════════
insert into gift_card (id, modulo, importo_iniziale) values
  ('f3000000-0000-0000-0000-000000000001', 'ristorante', 50);
insert into gift_card (id, modulo, importo_iniziale, scadenza) values
  ('f3000000-0000-0000-0000-000000000002', 'ristorante', 50, current_date - 1),
  ('f3000000-0000-0000-0000-000000000003', 'bar', 20, null);
select matches((select codice from gift_card where id = 'f3000000-0000-0000-0000-000000000001'),
  '^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$', 'codice gift card casuale XXXX-XXXX-XXXX');

insert into conti (id, modulo, descrizione, contatto_id) values
  ('cc000000-0000-0000-0000-0000000000a1', 'ristorante', 'Tavolo 1', null),
  ('cc000000-0000-0000-0000-0000000000a2', 'ristorante', 'Tavolo 2', 'c0000000-0000-0000-0000-000000000001'),
  ('cc000000-0000-0000-0000-0000000000a3', 'ristorante', 'Tavolo 3', 'c0000000-0000-0000-0000-000000000002');
insert into conti_righe (conto_id, descrizione, prezzo_unitario, aliquota_iva) values
  ('cc000000-0000-0000-0000-0000000000a1', 'Cena', 80, 10),
  ('cc000000-0000-0000-0000-0000000000a2', 'Pranzo', 60, 10),
  ('cc000000-0000-0000-0000-0000000000a3', 'Pranzo', 30, 10);

insert into conti_pagamenti (id, conto_id, metodo, importo, riferimento)
select 'f4000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-0000000000a1', 'gift_card', 30, lower(codice)
  from gift_card where id = 'f3000000-0000-0000-0000-000000000001';
select is((select format('%s|%s', residuo, stato) from gift_card_saldi where gift_card_id = 'f3000000-0000-0000-0000-000000000001'),
  '20.00|attiva', 'pagamento con gift card: il credito scende a 20');
select throws_ok(format($$insert into conti_pagamenti (conto_id, metodo, importo, riferimento) values ('cc000000-0000-0000-0000-0000000000a1', 'gift_card', 30, %L)$$,
                        (select codice from gift_card where id = 'f3000000-0000-0000-0000-000000000001')),
  '23514', null, 'credito insufficiente: pagamento rifiutato');
delete from conti_pagamenti where id = 'f4000000-0000-0000-0000-000000000001';
select is((select residuo from gift_card_saldi where gift_card_id = 'f3000000-0000-0000-0000-000000000001'), 50.00::numeric(12,2),
  'pagamento stornato: il credito torna sulla gift card');
select throws_ok(format($$insert into conti_pagamenti (conto_id, metodo, importo, riferimento) values ('cc000000-0000-0000-0000-0000000000a1', 'gift_card', 10, %L)$$,
                        (select codice from gift_card where id = 'f3000000-0000-0000-0000-000000000002')),
  '23514', null, 'gift card scaduta rifiutata');
select throws_ok(format($$insert into conti_pagamenti (conto_id, metodo, importo, riferimento) values ('cc000000-0000-0000-0000-0000000000a1', 'gift_card', 10, %L)$$,
                        (select codice from gift_card where id = 'f3000000-0000-0000-0000-000000000003')),
  '23514', null, 'gift card di un''altra attività rifiutata');
select throws_ok($$insert into conti_pagamenti (conto_id, metodo, importo, riferimento) values ('cc000000-0000-0000-0000-0000000000a1', 'gift_card', 10, 'AAAA-BBBB-CCCC')$$,
  '23514', null, 'codice inesistente rifiutato');

-- ═══ COUPON ══════════════════════════════════════════════════════════
insert into coupon (modulo, codice, tipo, valore, spesa_minima, usi_per_cliente) values
  ('ristorante', 'BENVENUTO10', 'percentuale', 10, 50, 1);
insert into coupon (id, modulo, codice, tipo, valore) values
  ('f5000000-0000-0000-0000-000000000002', 'ristorante', 'MENO5', 'importo', 5);
select is(applica_coupon('cc000000-0000-0000-0000-0000000000a2', ' benvenuto10 '), 6.00::numeric,
  'coupon del 10% su 60: sconto 6');
select is((select totale from conti_saldi where conto_id = 'cc000000-0000-0000-0000-0000000000a2'), 54.00::numeric(12,2),
  'lo sconto entra nel totale del conto');
select throws_ok($$select applica_coupon('cc000000-0000-0000-0000-0000000000a2', 'BENVENUTO10')$$,
  '23514', null, 'un uso per cliente');
select throws_ok($$select applica_coupon('cc000000-0000-0000-0000-0000000000a3', 'BENVENUTO10')$$,
  '23514', null, 'spesa minima non raggiunta');
select is(applica_coupon('cc000000-0000-0000-0000-0000000000a3', 'meno5'), 5.00::numeric, 'coupon a importo fisso');
delete from coupon_utilizzi where coupon_id = 'f5000000-0000-0000-0000-000000000002';
select is((select totale from conti_saldi where conto_id = 'cc000000-0000-0000-0000-0000000000a3'), 30.00::numeric(12,2),
  'utilizzo stornato: lo sconto esce dal conto');

-- ═══ FEEDBACK ════════════════════════════════════════════════════════
insert into feedback (modulo, tipo, nps, valutazione, contatto_id, ricevuto_at) values
  ('bar', 'nps', 10, 5, 'c0000000-0000-0000-0000-000000000001', now()),
  ('bar', 'nps', 9, 5, null, now()),
  ('bar', 'nps', 8, 4, null, now()),
  ('bar', 'nps', 3, 2, 'c0000000-0000-0000-0000-000000000002', now());
-- (2 promotori − 1 detrattore) / 4 = 25.
select is((select format('%s|%s|%s', risposte, nps, valutazione_media) from feedback_nps
            where modulo = 'bar' and mese = date_trunc('month', now() at time zone 'Europe/Rome')::date),
  '4|25|4.00', 'NPS del mese: 25 su 4 risposte');
select ok((select count(*) from notifiche where destinatario_id = '00000000-0000-0000-0000-00000000000a'
            and titolo = 'Cliente insoddisfatto (NPS 3)') = 1, 'il detrattore arriva in notifica all''admin');
insert into feedback (id, modulo, tipo, testo) values
  ('f6000000-0000-0000-0000-000000000001', 'bar', 'reclamo', 'Caffè freddo');
select ok((select count(*) from notifiche where destinatario_id = '00000000-0000-0000-0000-00000000000a'
            and titolo = 'Nuovo reclamo') = 1, 'il reclamo arriva in notifica all''admin');
update feedback set stato = 'risolto' where id = 'f6000000-0000-0000-0000-000000000001';
select ok((select risolto_at is not null from feedback where id = 'f6000000-0000-0000-0000-000000000001'),
  'reclamo risolto: data di risoluzione registrata');
select throws_ok($$insert into feedback (modulo, tipo) values ('bar', 'nps')$$,
  '23514', null, 'un NPS senza punteggio è rifiutato');

-- ═══ TURNI ═══════════════════════════════════════════════════════════
insert into dipendenti (id, nome, cognome, attivo) values
  ('d0000000-0000-0000-0000-000000000001', 'Marco', 'Rossi', true),
  ('d0000000-0000-0000-0000-000000000002', 'Sara', 'Bianchi', true),
  ('d0000000-0000-0000-0000-000000000003', 'Ugo', 'Cessato', false);

-- Lunedì 12/10/2026, 10–15 con 30 minuti di pausa = 4,50 ore.
insert into turni (id, modulo, dipendente_id, reparto, inizio, fine, pausa_minuti) values
  ('d1000000-0000-0000-0000-000000000001', 'ristorante', 'd0000000-0000-0000-0000-000000000001', 'sala',
   '2026-10-12 10:00 Europe/Rome', '2026-10-12 15:00 Europe/Rome', 30);
select is((select ore_previste from turni where id = 'd1000000-0000-0000-0000-000000000001'), 4.50::numeric(5,2),
  'ore previste al netto della pausa');
select throws_ok($$insert into turni (modulo, dipendente_id, inizio, fine) values ('bar', 'd0000000-0000-0000-0000-000000000001', '2026-10-12 14:00 Europe/Rome', '2026-10-12 18:00 Europe/Rome')$$,
  '23P01', null, 'la stessa persona non sta in due turni sovrapposti, nemmeno in due moduli');
select lives_ok($$insert into turni (modulo, dipendente_id, inizio, fine) values ('bar', 'd0000000-0000-0000-0000-000000000001', '2026-10-12 15:00 Europe/Rome', '2026-10-12 19:00 Europe/Rome')$$,
  'un turno che comincia quando finisce l''altro è ammesso');
select lives_ok($$insert into turni (modulo, dipendente_id, inizio, fine, stato) values ('ristorante', 'd0000000-0000-0000-0000-000000000001', '2026-10-12 11:00 Europe/Rome', '2026-10-12 12:00 Europe/Rome', 'annullato')$$,
  'un turno annullato non occupa la persona');
insert into assenze (dipendente_id, tipo, data_inizio, data_fine, stato) values
  ('d0000000-0000-0000-0000-000000000002', 'ferie', '2026-10-13', '2026-10-13', 'approvata');
select throws_ok($$insert into turni (modulo, dipendente_id, inizio, fine) values ('ristorante', 'd0000000-0000-0000-0000-000000000002', '2026-10-13 18:00 Europe/Rome', '2026-10-13 23:00 Europe/Rome')$$,
  '23514', null, 'nessun turno in un giorno di ferie approvate');
select throws_ok($$insert into turni (modulo, dipendente_id, inizio, fine) values ('ristorante', 'd0000000-0000-0000-0000-000000000003', '2026-10-12 18:00 Europe/Rome', '2026-10-12 23:00 Europe/Rome')$$,
  '23514', null, 'nessun turno a un dipendente cessato');

-- Fabbisogno del lunedì in sala, 11–14: due persone.
insert into turni_fabbisogno (modulo, reparto, giorno_settimana, ora_inizio, ora_fine, persone_minime) values
  ('ristorante', 'sala', 1, '11:00', '14:00', 2);
select is((select format('%s|%s|%s', data, richieste, coperte) from turni_carenze('ristorante', '2026-10-12', '2026-10-12')),
  '2026-10-12|2|1', 'carenza segnalata: in sala una persona su due');
insert into turni (modulo, dipendente_id, reparto, inizio, fine) values
  ('ristorante', 'd0000000-0000-0000-0000-000000000002', 'sala', '2026-10-12 10:30 Europe/Rome', '2026-10-12 14:30 Europe/Rome');
select is((select count(*)::int from turni_carenze('ristorante', '2026-10-12', '2026-10-18')), 0,
  'fabbisogno coperto: nessuna carenza nella settimana');

update turni set inizio_effettivo = '2026-10-12 10:05 Europe/Rome', fine_effettivo = '2026-10-12 15:20 Europe/Rome'
 where id = 'd1000000-0000-0000-0000-000000000001';
select is((select ore_effettive from turni where id = 'd1000000-0000-0000-0000-000000000001'), 4.75::numeric(5,2),
  'ore effettive: 5,25 meno la pausa');

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from turni_persone('ristorante')
            where id in ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
                         'd0000000-0000-0000-0000-000000000003')),
  2, 'operatore: per il calendario vede i nomi dei dipendenti attivi');
select is((select count(*)::int from dipendenti), 0, 'operatore: l''anagrafica dei dipendenti resta riservata');
select throws_ok($$insert into turni (modulo, dipendente_id, inizio, fine, created_by) values ('ristorante', 'd0000000-0000-0000-0000-000000000002', '2026-10-14 10:00 Europe/Rome', '2026-10-14 12:00 Europe/Rome', '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'operatore: i turni li pianificano admin e manager');
select pg_temp.torna_postgres();

-- ═══ CAMPAGNE ════════════════════════════════════════════════════════
insert into campagne (id, modulo, nome, segmento, oggetto, corpo, url_base) values
  ('f7000000-0000-0000-0000-000000000001', 'bar', 'Novità d''autunno', 'tesserati', 'Novità al bar',
   'Ciao {{nome}}, da lunedì cioccolata calda.', 'https://app.example/'),
  ('f7000000-0000-0000-0000-000000000002', 'bar', 'Seconda', 'tesserati', 'Ancora novità', 'Ciao {{nome}}.', 'https://app.example');
insert into campagne (id, modulo, nome, canale, segmento, corpo, url_base) values
  ('f7000000-0000-0000-0000-000000000003', 'bar', 'Per SMS', 'sms', 'tesserati', 'Ciao {{nome}}.', 'https://app.example');

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$select prepara_campagna('f7000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'operatore: non prepara campagne');
select is((select count(*)::int from campagne_destinatari), 0, 'operatore: non vede gli indirizzi dei destinatari');
select pg_temp.torna_postgres();

select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
-- Tesserati del bar: Mario (consenso, email), Lucia (senza consenso),
-- Paolo (senza email), Gianna (email non valida).
select is(prepara_campagna('f7000000-0000-0000-0000-000000000001'), 1, 'un solo destinatario valido su quattro');
select is((select string_agg(motivo_esclusione, ' / ' order by motivo_esclusione) from campagne_destinatari
            where campagna_id = 'f7000000-0000-0000-0000-000000000001' and stato = 'escluso'),
  'Senza consenso marketing / Senza indirizzo per il canale / Senza indirizzo per il canale',
  'gli esclusi restano in elenco con il motivo');
select is(prepara_campagna('f7000000-0000-0000-0000-000000000002'), 1, 'seconda campagna preparata');
select is(invia_campagna('f7000000-0000-0000-0000-000000000001'), 1, 'campagna inviata a una persona');
select pg_temp.torna_postgres();

select ok((select corpo_testo like 'Ciao Mario, da lunedì cioccolata calda.%https://app.example/disiscrizione?t=%'
             from mail_outbox where destinatario = 'mario@example.com' and oggetto = 'Novità al bar'),
  'la mail è personalizzata e porta il link di disiscrizione');
select throws_ok($$update campagne set nome = 'ritocco' where id = 'f7000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'una campagna inviata non si modifica');
select throws_ok($$select campagna_invia_interna('f7000000-0000-0000-0000-000000000003')$$,
  'P0001', null, 'SMS predisposto: nessun invio senza il collegamento al fornitore');

-- Disiscrizione dal link, senza accesso (il token arriva dalla mail).
select set_config('test.token', (select token::text from campagne_destinatari
                                  where campagna_id = 'f7000000-0000-0000-0000-000000000001' and stato = 'inviato'), true);
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;
select is(revoca_consenso_marketing(current_setting('test.token')::uuid), true, 'disiscrizione dal link');
select is(revoca_consenso_marketing(gen_random_uuid()), true, 'un token qualsiasi non rivela nulla');
select pg_temp.torna_postgres();
select ok((select not consenso_marketing and consenso_marketing_fonte like 'Disiscrizione dalla campagna CMP-%'
             from contatti where id = 'c0000000-0000-0000-0000-000000000001'),
  'il consenso è revocato e se ne registra la fonte');

-- La seconda campagna era pronta prima della revoca: all'invio Mario esce.
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select is(invia_campagna('f7000000-0000-0000-0000-000000000002'), 0, 'consenso revocato: nessun invio');
select is((select format('%s|%s', inviati, esclusi) from campagna_riepilogo('f7000000-0000-0000-0000-000000000002')),
  '0|4', 'riepilogo: zero inviati, quattro esclusi');
select pg_temp.torna_postgres();
select is((select motivo_esclusione from campagne_destinatari
            where campagna_id = 'f7000000-0000-0000-0000-000000000002' and contatto_id = 'c0000000-0000-0000-0000-000000000001'),
  'Consenso revocato prima dell''invio', 'il motivo dell''esclusione è registrato');

-- Programmata: parte dal cron all'ora indicata.
insert into campagne (id, modulo, nome, segmento, oggetto, corpo, url_base, stato, programmata_at) values
  ('f7000000-0000-0000-0000-000000000004', 'bar', 'Programmata', 'tutti', 'Promemoria', 'Ciao.', 'https://app.example',
   'programmata', now() - interval '1 minute');
select ok(invia_campagne_programmate() >= 1, 'il cron invia le campagne programmate');
select is((select stato::text from campagne where id = 'f7000000-0000-0000-0000-000000000004'), 'inviata',
  'la campagna programmata risulta inviata');

-- ═══ LICENZE ═════════════════════════════════════════════════════════
update moduli_licenze set attivo = false where slug in ('ristorante', 'bar');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s|%s', (select count(*) from fid_tessere), (select count(*) from gift_card),
                         (select count(*) from turni))), '0|0|0', 'modulo spento: niente tessere, gift card, turni');
select pg_temp.torna_postgres();

select * from finish();
rollback;
