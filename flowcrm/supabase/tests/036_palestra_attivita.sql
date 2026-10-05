-- ═══════════════════════════════════════════════════════════════════
-- Gate PALESTRA 2/3 — corsi e lezioni dal calendario; capienza e lista
-- d'attesa che scorre alla disdetta; disdetta tardiva; no-show con
-- penale e blocco delle prenotazioni; lezione annullata con i crediti
-- restituiti; sala e istruttore mai doppi; personal training con il
-- carnet o l'addebito e il compenso; schede con lo storico; dati sulla
-- salute visibili solo al trainer assegnato e all'amministratore, con il
-- consenso; wellness senza doppioni di cabina. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'admin.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000c', 'operatore.test@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000d1', 'trainer1.test@flowcrm.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'trainer2.test@flowcrm.local')
on conflict (id) do nothing;
insert into user_profiles (id, nome, cognome, ruolo)
values
  ('00000000-0000-0000-0000-00000000000a', 'Anna', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-00000000000c', 'Olga', 'Operatore', 'operatore'),
  ('00000000-0000-0000-0000-0000000000d1', 'Tina', 'Trainer', 'operatore'),
  ('00000000-0000-0000-0000-0000000000d2', 'Ugo', 'Trainer', 'operatore')
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
-- Il prossimo lunedì (mai oggi).
create or replace function pg_temp.lun() returns date as $$
  select pg_temp.oggi() + (8 - extract(isodow from pg_temp.oggi()))::int
$$ language sql stable;

insert into moduli_licenze (slug, attivo) values ('palestra', true)
on conflict (slug) do update set attivo = excluded.attivo;

-- ═══ CONFIGURAZIONE ═════════════════════════════════════════════════
insert into pal_sedi (id, nome, richiede_certificato, noshow_penale, noshow_soglia, noshow_blocco_giorni, cancellazione_ore) values
  ('e1000000-0000-0000-0000-0000000000a1', 'Palestra Corsi', false, 5, 1, 7, 2);
insert into pal_sale (id, sede_id, nome, tipo, capienza) values
  ('e1000000-0000-0000-0000-0000000000b1', 'e1000000-0000-0000-0000-0000000000a1', 'Sala corsi', 'sala_corsi', 20);
insert into pal_trainer (id, nome, user_id, tariffa_sessione, compenso_sessione, compenso_lezione) values
  ('e2000000-0000-0000-0000-0000000000a1', 'Tina', '00000000-0000-0000-0000-0000000000d1', 45, 25, 20),
  ('e2000000-0000-0000-0000-0000000000a2', 'Ugo', '00000000-0000-0000-0000-0000000000d2', 40, 20, 18);
insert into pal_corsi (id, sede_id, nome, disciplina, sala_id, istruttore_id, durata_min, capienza, giorni, ora) values
  ('e3000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1', 'Pilates', 'pilates',
   'e1000000-0000-0000-0000-0000000000b1', 'e2000000-0000-0000-0000-0000000000a1', 50, 2, '{1,3}', '18:00');
insert into pal_formule (id, nome, prezzo, servizi) values
  ('e4000000-0000-0000-0000-0000000000a1', 'Corsi mensile', 60, '{corsi}');
insert into pal_pacchetti (id, nome, voci, prezzo) values
  ('e4000000-0000-0000-0000-0000000000b1', '10 corsi', '[{"servizio": "corsi", "quantita": 10}]', 80),
  ('e4000000-0000-0000-0000-0000000000b2', '5 PT', '[{"servizio": "lezioni_pt", "quantita": 5}]', 200),
  ('e4000000-0000-0000-0000-0000000000b3', '5 massaggi', '[{"servizio": "massaggi", "quantita": 5}]', 220);

insert into contatti (id, nome, cognome, email) values
  ('e7000000-0000-0000-0000-0000000000a1', 'Ada', 'Uno', 'ada.test@esempio.it'),
  ('e7000000-0000-0000-0000-0000000000a2', 'Bea', 'Due', 'bea.test@esempio.it'),
  ('e7000000-0000-0000-0000-0000000000a3', 'Cia', 'Tre', 'cia.test@esempio.it'),
  ('e7000000-0000-0000-0000-0000000000a4', 'Dino', 'Quattro', null);
insert into pal_soci (id, contatto_id, sede_id, condizioni_accettate, trainer_id, consenso_salute) values
  ('e5000000-0000-0000-0000-0000000000a1', 'e7000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1', true,
   'e2000000-0000-0000-0000-0000000000a1', true),
  ('e5000000-0000-0000-0000-0000000000a2', 'e7000000-0000-0000-0000-0000000000a2', 'e1000000-0000-0000-0000-0000000000a1', true, null, false),
  ('e5000000-0000-0000-0000-0000000000a3', 'e7000000-0000-0000-0000-0000000000a3', 'e1000000-0000-0000-0000-0000000000a1', true, null, false),
  ('e5000000-0000-0000-0000-0000000000a4', 'e7000000-0000-0000-0000-0000000000a4', 'e1000000-0000-0000-0000-0000000000a1', true, null, false);
insert into pal_abbonamenti (socio_id, formula_id, inizio, created_by) values
  ('e5000000-0000-0000-0000-0000000000a1', 'e4000000-0000-0000-0000-0000000000a1', pg_temp.oggi(), '00000000-0000-0000-0000-00000000000a'),
  ('e5000000-0000-0000-0000-0000000000a2', 'e4000000-0000-0000-0000-0000000000a1', pg_temp.oggi(), '00000000-0000-0000-0000-00000000000a');
select pal_vendi_pacchetto('e5000000-0000-0000-0000-0000000000a3', 'e4000000-0000-0000-0000-0000000000b1');

-- ═══ CALENDARIO ═════════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$select pal_genera_lezioni('e1000000-0000-0000-0000-0000000000a1', pg_temp.lun(), pg_temp.lun() + 13)$$,
  '42501', null, 'il calendario lo prepara la direzione');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select is(pal_genera_lezioni('e1000000-0000-0000-0000-0000000000a1', pg_temp.lun(), pg_temp.lun() + 13), 4,
  'lunedì e mercoledì per due settimane: quattro lezioni');
select is(pal_genera_lezioni('e1000000-0000-0000-0000-0000000000a1', pg_temp.lun(), pg_temp.lun() + 13), 0, 'rigenerare non duplica');
select pg_temp.torna_postgres();
select throws_ok($$insert into pal_lezioni (corso_id, sede_id, sala_id, inizio, fine, capienza)
  select corso_id, sede_id, sala_id, inizio + interval '10 minutes', fine + interval '10 minutes', 5 from pal_lezioni
   where corso_id = 'e3000000-0000-0000-0000-0000000000a1' order by inizio limit 1$$,
  '23P01', null, 'la sala non ospita due lezioni insieme');

create temp table l1 as select id from pal_lezioni where corso_id = 'e3000000-0000-0000-0000-0000000000a1' order by inizio limit 1;
grant select on l1 to authenticated;

-- ═══ CAPIENZA E LISTA D'ATTESA ══════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into pal_prenotazioni (lezione_id, socio_id, created_by)
select id, 'e5000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000c' from l1;
insert into pal_prenotazioni (lezione_id, socio_id, created_by)
select id, 'e5000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000000c' from l1;
insert into pal_prenotazioni (lezione_id, socio_id, created_by)
select id, 'e5000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000c' from l1;
select throws_like($$insert into pal_prenotazioni (lezione_id, socio_id, created_by)
  select id, 'e5000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-00000000000c' from l1$$,
  'Non prenotabile: Nessun abbonamento o carnet valido', 'senza titolo valido non si prenota');
select pg_temp.torna_postgres();

select is((select string_agg(format('%s:%s:%s', k.nome, p.stato, coalesce(p.posizione::text, '-')), ',' order by p.stato, k.nome)
             from pal_prenotazioni p join pal_soci s on s.id = p.socio_id join contatti k on k.id = s.contatto_id
            where p.lezione_id = (select id from l1)),
  'Bea:attesa:1,Ada:prenotata:-,Cia:prenotata:-', 'due posti: il terzo va in lista d''attesa, posizione 1');
select is((select usati from pal_carnet where socio_id = 'e5000000-0000-0000-0000-0000000000a3'), 1, 'il carnet dei corsi scala alla prenotazione');
select is((select in_attesa from pal_lezioni_posti where lezione_id = (select id from l1)), 1, 'il calendario mostra iscritti e attesa');

-- Disdetta in tempo: credito restituito e il primo in attesa prende il posto.
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
update pal_prenotazioni set stato = 'annullata' where lezione_id = (select id from l1) and socio_id = 'e5000000-0000-0000-0000-0000000000a3';
select pg_temp.torna_postgres();
select is((select usati from pal_carnet where socio_id = 'e5000000-0000-0000-0000-0000000000a3'), 0, 'disdetta in tempo: il credito torna');
select is((select stato from pal_prenotazioni where lezione_id = (select id from l1) and socio_id = 'e5000000-0000-0000-0000-0000000000a2'),
  'prenotata', 'la lista d''attesa scorre da sola');
select ok(exists (select 1 from mail_outbox where destinatario = 'bea.test@esempio.it' and oggetto like 'Si è liberato un posto%'),
  'chi era in attesa è avvisato');

-- Disdetta tardiva: il credito non torna.
insert into pal_lezioni (id, corso_id, sede_id, inizio, fine, capienza) values
  ('e6000000-0000-0000-0000-0000000000a1', 'e3000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1',
   now() + interval '1 hour', now() + interval '2 hours', 10);
insert into pal_prenotazioni (lezione_id, socio_id) values ('e6000000-0000-0000-0000-0000000000a1', 'e5000000-0000-0000-0000-0000000000a3');
update pal_prenotazioni set stato = 'annullata' where lezione_id = 'e6000000-0000-0000-0000-0000000000a1';
select is((select format('%s|%s', p.tardiva, c.usati) from pal_prenotazioni p join pal_carnet c on c.id = p.carnet_id
            where p.lezione_id = 'e6000000-0000-0000-0000-0000000000a1'), 't|1', 'disdetta a un''ora: tardiva, il credito resta usato');

-- ═══ NO-SHOW ════════════════════════════════════════════════════════
insert into pal_lezioni (id, corso_id, sede_id, inizio, fine, capienza) values
  ('e6000000-0000-0000-0000-0000000000a2', 'e3000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1',
   now() + interval '3 hours', now() + interval '4 hours', 10);
insert into pal_prenotazioni (lezione_id, socio_id) values
  ('e6000000-0000-0000-0000-0000000000a2', 'e5000000-0000-0000-0000-0000000000a1'),
  ('e6000000-0000-0000-0000-0000000000a2', 'e5000000-0000-0000-0000-0000000000a2');
update pal_prenotazioni set stato = 'presente' where lezione_id = 'e6000000-0000-0000-0000-0000000000a2' and socio_id = 'e5000000-0000-0000-0000-0000000000a2';
update pal_lezioni set inizio = now() - interval '2 hours', fine = now() - interval '1 hour' where id = 'e6000000-0000-0000-0000-0000000000a2';
select is(pal_chiudi_lezione('e6000000-0000-0000-0000-0000000000a2'), 1, 'fine lezione: un assente');
select is((select format('%s|%s', p.stato, r.importo) from pal_prenotazioni p join pal_rate r on r.id = p.penale_rata_id
            where p.lezione_id = 'e6000000-0000-0000-0000-0000000000a2' and p.socio_id = 'e5000000-0000-0000-0000-0000000000a1'),
  'assente|5.00', 'l''assenza costa la penale');
select is((select prenotazioni_bloccate_fino - pg_temp.oggi() from pal_soci where id = 'e5000000-0000-0000-0000-0000000000a1'), 7,
  'oltre la soglia: prenotazioni sospese per sette giorni');
select throws_like($$insert into pal_prenotazioni (lezione_id, socio_id)
  select id, 'e5000000-0000-0000-0000-0000000000a1' from pal_lezioni where corso_id = 'e3000000-0000-0000-0000-0000000000a1'
   and stato = 'programmata' and inizio > now() + interval '1 day' order by inizio desc limit 1$$,
  'Prenotazioni sospese fino al %', 'chi è sospeso non prenota');
select is((select stato from pal_lezioni where id = 'e6000000-0000-0000-0000-0000000000a2'), 'svolta', 'la lezione risulta svolta');

-- ═══ LEZIONE ANNULLATA ══════════════════════════════════════════════
select pal_vendi_pacchetto('e5000000-0000-0000-0000-0000000000a4', 'e4000000-0000-0000-0000-0000000000b1');
create temp table l4 as select id from pal_lezioni where corso_id = 'e3000000-0000-0000-0000-0000000000a1' and stato = 'programmata'
  and inizio > now() + interval '1 day' order by inizio desc limit 1;
insert into pal_prenotazioni (lezione_id, socio_id) select id, 'e5000000-0000-0000-0000-0000000000a4' from l4;
update pal_lezioni set stato = 'annullata', note = 'istruttrice malata' where id = (select id from l4);
select is((select format('%s|%s', p.stato, c.usati) from pal_prenotazioni p join pal_carnet c on c.id = p.carnet_id
            where p.lezione_id = (select id from l4)), 'annullata|0', 'lezione annullata: prenotazioni chiuse e credito restituito una volta');

-- ═══ PERSONAL TRAINING ══════════════════════════════════════════════
select pal_vendi_pacchetto('e5000000-0000-0000-0000-0000000000a1', 'e4000000-0000-0000-0000-0000000000b2');
insert into pal_sessioni_pt (id, trainer_id, socio_id, sede_id, inizio, fine) values
  ('e8000000-0000-0000-0000-0000000000a1', 'e2000000-0000-0000-0000-0000000000a1', 'e5000000-0000-0000-0000-0000000000a1',
   'e1000000-0000-0000-0000-0000000000a1', pg_temp.lun() + time '10:00', pg_temp.lun() + time '11:00');
select is((select format('%s|%s', s.prezzo, c.usati) from pal_sessioni_pt s join pal_carnet c on c.id = s.carnet_id
            where s.id = 'e8000000-0000-0000-0000-0000000000a1'), '0.00|1', 'sessione dal carnet PT: niente da pagare, una in meno');
insert into pal_sessioni_pt (id, trainer_id, socio_id, sede_id, inizio, fine) values
  ('e8000000-0000-0000-0000-0000000000a2', 'e2000000-0000-0000-0000-0000000000a2', 'e5000000-0000-0000-0000-0000000000a2',
   'e1000000-0000-0000-0000-0000000000a1', pg_temp.lun() + time '10:00', pg_temp.lun() + time '11:00');
select is((select r.importo from pal_sessioni_pt s join pal_rate r on r.id = s.rata_id where s.id = 'e8000000-0000-0000-0000-0000000000a2'),
  40.00, 'senza carnet: la sessione si paga alla tariffa del trainer');
select throws_ok($$insert into pal_sessioni_pt (trainer_id, socio_id, sede_id, inizio, fine) values
  ('e2000000-0000-0000-0000-0000000000a1', 'e5000000-0000-0000-0000-0000000000a3', 'e1000000-0000-0000-0000-0000000000a1',
   pg_temp.lun() + time '10:30', pg_temp.lun() + time '11:30')$$, '23P01', null, 'il trainer non ha due clienti insieme');
update pal_sessioni_pt set stato = 'svolta' where id = 'e8000000-0000-0000-0000-0000000000a1';
update pal_sessioni_pt set stato = 'annullata' where id = 'e8000000-0000-0000-0000-0000000000a2';
select is((select format('%s|%s', (select compenso from pal_sessioni_pt where id = 'e8000000-0000-0000-0000-0000000000a1'),
                         (select r.stato from pal_sessioni_pt s join pal_rate r on r.id = s.rata_id where s.id = 'e8000000-0000-0000-0000-0000000000a2'))),
  '25.00|annullata', 'svolta: compenso al trainer; annullata: addebito annullato');

-- ═══ DATI SULLA SALUTE ══════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-0000000000d1');
insert into pal_misurazioni (socio_id, trainer_id, peso, altezza, misure, created_by) values
  ('e5000000-0000-0000-0000-0000000000a1', 'e2000000-0000-0000-0000-0000000000a1', 68.5, 170, '{"vita": 74}', '00000000-0000-0000-0000-0000000000d1');
select is((select count(*)::int from pal_misurazioni where socio_id = 'e5000000-0000-0000-0000-0000000000a1'), 1,
  'il trainer assegnato registra e vede le misure');
select throws_ok($$insert into pal_misurazioni (socio_id, peso, created_by) values
  ('e5000000-0000-0000-0000-0000000000a2', 60, '00000000-0000-0000-0000-0000000000d1')$$,
  '42501', null, 'senza consenso (e senza assegnazione) niente misure');
select pg_temp.impersona('00000000-0000-0000-0000-0000000000d2');
select is((select count(*)::int from pal_misurazioni where socio_id = 'e5000000-0000-0000-0000-0000000000a1'), 0,
  'un altro trainer non le vede');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from pal_misurazioni where socio_id = 'e5000000-0000-0000-0000-0000000000a1'), 0,
  'la reception non le vede');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from pal_misurazioni where socio_id = 'e5000000-0000-0000-0000-0000000000a1'), 1,
  'l''amministratore le vede');
select pg_temp.torna_postgres();
select is((select count(*)::int from audit_log where entita = 'pal_misurazioni'), 0, 'le misure non finiscono nel registro delle modifiche');
update pal_soci set consenso_salute = false where id = 'e5000000-0000-0000-0000-0000000000a1';
select is((select count(*)::int from pal_misurazioni where socio_id = 'e5000000-0000-0000-0000-0000000000a1'), 0,
  'revocato il consenso, le misure si cancellano');

-- ═══ SCHEDE CON LO STORICO ══════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-0000000000d1');
insert into pal_schede (id, socio_id, trainer_id, obiettivi, created_by) values
  ('e9000000-0000-0000-0000-0000000000a1', 'e5000000-0000-0000-0000-0000000000a1', 'e2000000-0000-0000-0000-0000000000a1', 'Tonificazione',
   '00000000-0000-0000-0000-0000000000d1');
insert into pal_schede_esercizi (scheda_id, esercizio, serie, ripetizioni, carico, recupero, created_by) values
  ('e9000000-0000-0000-0000-0000000000a1', 'Squat', 3, '12', '20 kg', '90 s', '00000000-0000-0000-0000-0000000000d1'),
  ('e9000000-0000-0000-0000-0000000000a1', 'Plank', 3, '30 s', 'corpo libero', '60 s', '00000000-0000-0000-0000-0000000000d1');
select isnt(pal_nuova_versione_scheda('e9000000-0000-0000-0000-0000000000a1'), null, 'il trainer crea una nuova versione');
select pg_temp.torna_postgres();
select is((select format('%s|%s|%s', s.versione, (select count(*) from pal_schede_esercizi e where e.scheda_id = s.id),
                         (select attiva from pal_schede where id = 'e9000000-0000-0000-0000-0000000000a1'))
             from pal_schede s where s.precedente_id = 'e9000000-0000-0000-0000-0000000000a1'),
  '2|2|f', 'versione 2 con gli esercizi copiati; la precedente resta nello storico');

-- ═══ WELLNESS ═══════════════════════════════════════════════════════
insert into pal_servizi (id, sede_id, nome, tipo, durata_min, prezzo, carnet, richiede_operatore, risorse) values
  ('ea000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-0000000000a1', 'Massaggio sportivo', 'massaggio', 50, 50, 'massaggi',
   false, '{Cabina 1,Cabina 2}');
select pal_vendi_pacchetto('e5000000-0000-0000-0000-0000000000a2', 'e4000000-0000-0000-0000-0000000000b3');
insert into pal_appuntamenti (servizio_id, socio_id, risorsa, inizio) values
  ('ea000000-0000-0000-0000-0000000000a1', 'e5000000-0000-0000-0000-0000000000a2', 'Cabina 1', pg_temp.lun() + time '15:00');
select is((select format('%s|%s', a.prezzo, c.usati) from pal_appuntamenti a join pal_carnet c on c.id = a.carnet_id
            where a.socio_id = 'e5000000-0000-0000-0000-0000000000a2'), '0.00|1', 'massaggio dal carnet');
select throws_ok($$insert into pal_appuntamenti (servizio_id, cliente_nome, risorsa, inizio) values
  ('ea000000-0000-0000-0000-0000000000a1', 'Cliente esterno', 'Cabina 1', pg_temp.lun() + time '15:30')$$,
  '23P01', null, 'la cabina non si prenota due volte');
insert into pal_appuntamenti (servizio_id, cliente_nome, risorsa, inizio) values
  ('ea000000-0000-0000-0000-0000000000a1', 'Cliente esterno', 'Cabina 2', pg_temp.lun() + time '15:30');
select is((select prezzo from pal_appuntamenti where cliente_nome = 'Cliente esterno'), 50.00, 'anche per i clienti esterni, al listino');

select * from finish();
rollback;
