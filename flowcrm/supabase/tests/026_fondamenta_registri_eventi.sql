-- ═══════════════════════════════════════════════════════════════════
-- Gate FONDAMENTA F0.7 + F0.8 — registri di controllo, segnalazioni di
-- sicurezza, eventi con economia riservata e personale nei turni.
-- ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(39);

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

insert into moduli_licenze (slug, attivo) values ('ristorante', true), ('bar', true)
on conflict (slug) do update set attivo = excluded.attivo;

-- ═══ REGISTRI DI CONTROLLO ═══════════════════════════════════════════
insert into controlli_punti (id, modulo, nome, tipo, ogni_ore, unita, soglia_min, soglia_max, responsabile_id) values
  ('e1000000-0000-0000-0000-000000000001', 'fb', 'Cella carni', 'temperatura', 4, '°C', 0, 4,
   '00000000-0000-0000-0000-00000000000a');
insert into controlli_punti (id, modulo, nome, tipo, checklist) values
  ('e1000000-0000-0000-0000-000000000002', 'bar', 'Pulizia bancone', 'pulizia', '["Bancone","Macchina caffè"]');
insert into controlli_punti (id, modulo, nome, tipo) values
  ('e1000000-0000-0000-0000-000000000003', 'ristorante', 'Infestanti', 'infestanti');
insert into controlli_punti (id, modulo, nome, tipo, ogni_ore, created_at) values
  ('e1000000-0000-0000-0000-000000000004', 'ristorante', 'Olio friggitrice', 'olio_frittura', 1, now() - interval '2 hours');

insert into controlli_registrazioni (id, punto_id, valore, eseguito_at) values
  ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 3.5, now() - interval '1 hour');
select is((select format('%s|%s', modulo, esito) from controlli_registrazioni where id = 'e2000000-0000-0000-0000-000000000001'),
  'fb|conforme', '3,5 °C tra 0 e 4: conforme (modulo dal punto)');
insert into controlli_registrazioni (id, punto_id, valore, esito) values
  ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 7.2, 'conforme');
select is((select esito::text from controlli_registrazioni where id = 'e2000000-0000-0000-0000-000000000002'),
  'non_conforme', '7,2 °C oltre la soglia: non conforme anche se dichiarato conforme');
select is((select count(*)::int from notifiche where destinatario_id = '00000000-0000-0000-0000-00000000000a'
            and tipo = 'critical' and titolo = 'Controllo non conforme: Cella carni'),
  1, 'la non conformità arriva subito al responsabile');
select throws_ok($$insert into controlli_registrazioni (punto_id) values ('e1000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'con le soglie il valore è obbligatorio');
select throws_ok($$insert into controlli_registrazioni (punto_id, checklist) values ('e1000000-0000-0000-0000-000000000002', '{"Bancone": true}')$$,
  '23514', null, 'ogni voce della checklist va compilata');
insert into controlli_registrazioni (id, punto_id, checklist) values
  ('e2000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000002', '{"Bancone": true, "Macchina caffè": false}');
select is((select esito::text from controlli_registrazioni where id = 'e2000000-0000-0000-0000-000000000003'),
  'non_conforme', 'una voce non fatta rende il controllo non conforme');
insert into controlli_registrazioni (id, punto_id, esito, note) values
  ('e2000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000003', 'non_conforme', 'Tracce di roditori');
insert into controlli_registrazioni (id, punto_id) values
  ('e2000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000003');
select is((select string_agg(esito::text, ',' order by id) from controlli_registrazioni
            where id in ('e2000000-0000-0000-0000-000000000004', 'e2000000-0000-0000-0000-000000000005')),
  'non_conforme,conforme', 'senza soglie decide chi controlla (conforme se non indicato)');
select throws_ok($$update controlli_registrazioni set valore = 3.9 where id = 'e2000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'una registrazione non si ritocca');

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
delete from controlli_registrazioni where id = 'e2000000-0000-0000-0000-000000000002';
select is((select count(*)::int from controlli_registrazioni where id = 'e2000000-0000-0000-0000-000000000002'), 1,
  'una registrazione non si cancella');
update controlli_registrazioni set azione_correttiva = 'Merce spostata in cella 2, tecnico chiamato'
 where id = 'e2000000-0000-0000-0000-000000000002';
select ok((select azione_registrata_at is not null from controlli_registrazioni where id = 'e2000000-0000-0000-0000-000000000002'),
  'l''operatore aggiunge l''azione correttiva');
select throws_ok($$update controlli_registrazioni set azione_verificata_at = now() where id = 'e2000000-0000-0000-0000-000000000002'$$,
  '42501', null, 'la verifica dell''azione spetta ad admin o manager');
select throws_ok($$update controlli_registrazioni set azione_correttiva = 'Altro' where id = 'e2000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'l''azione correttiva registrata non si riscrive');
select pg_temp.torna_postgres();

select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
update controlli_registrazioni set azione_verificata_at = now() where id = 'e2000000-0000-0000-0000-000000000002';
select is((select azione_verificata_da from controlli_registrazioni where id = 'e2000000-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-00000000000a'::uuid, 'l''admin verifica e la firma resta registrata');
select pg_temp.torna_postgres();

select is((select format('%s|%s|%s', ultimo_esito, in_ritardo, non_conformita_aperte) from controlli_stato
            where punto_id = 'e1000000-0000-0000-0000-000000000001'),
  'non_conforme|f|0', 'stato del punto: ultimo esito, in orario, nessuna non conformità aperta');
select is((select in_ritardo from controlli_stato where punto_id = 'e1000000-0000-0000-0000-000000000004'), true,
  'un controllo orario mai eseguito da due ore è in ritardo');

-- ═══ SEGNALAZIONI DI SICUREZZA ═══════════════════════════════════════
insert into dipendenti (id, nome, cognome, attivo) values
  ('d0000000-0000-0000-0000-000000000001', 'Marco', 'Rossi', true),
  ('d0000000-0000-0000-0000-000000000002', 'Sara', 'Bianchi', true);

insert into segnalazioni_sicurezza (id, modulo, tipo, gravita, descrizione, created_by) values
  ('e3000000-0000-0000-0000-000000000002', 'bar', 'pericolo', 'bassa', 'Gradino scivoloso', '00000000-0000-0000-0000-00000000000a');

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into segnalazioni_sicurezza (id, modulo, tipo, gravita, descrizione, dipendente_id, avvenuta_at, primo_soccorso, created_by) values
  ('e3000000-0000-0000-0000-000000000001', 'bar', 'infortunio', 'media', 'Ustione alla mano con la lancia vapore',
   'd0000000-0000-0000-0000-000000000001', '2026-10-05 09:30 Europe/Rome', true, '00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from segnalazioni_sicurezza), 1,
  'operatore: vede solo le segnalazioni che ha scritto (possono contenere dati di salute)');
update segnalazioni_sicurezza set stato = 'chiusa' where id = 'e3000000-0000-0000-0000-000000000001';
select pg_temp.torna_postgres();

select matches((select codice from segnalazioni_sicurezza where id = 'e3000000-0000-0000-0000-000000000001'),
  '^SIC-\d{4}-\d{4}$', 'codice segnalazione SIC-AAAA-NNNN');
select is((select stato::text from segnalazioni_sicurezza where id = 'e3000000-0000-0000-0000-000000000001'), 'aperta',
  'operatore: non chiude le segnalazioni');
select is((select count(*)::int from notifiche where destinatario_id = '00000000-0000-0000-0000-00000000000a'
            and tipo = 'critical' and titolo = 'Infortunio (media)'),
  1, 'l''infortunio arriva subito ad admin e manager');
select is((select format('%s|%s', data_scadenza, solo_manager) from scadenze_moduli
            where entita = 'segnalazioni_sicurezza' and entita_id = 'e3000000-0000-0000-0000-000000000001'),
  '2026-10-07|t', 'promemoria riservato per la denuncia INAIL a due giorni');
update segnalazioni_sicurezza set stato = 'chiusa' where id = 'e3000000-0000-0000-0000-000000000001';
select ok((select chiusa_at is not null from segnalazioni_sicurezza where id = 'e3000000-0000-0000-0000-000000000001'),
  'segnalazione chiusa con la data');

-- ═══ EVENTI ══════════════════════════════════════════════════════════
insert into eventi (id, modulo, titolo, tipo, inizio, fine, partecipanti_previsti, programma) values
  ('e4000000-0000-0000-0000-000000000001', 'ristorante', 'Matrimonio Rossi', 'matrimonio',
   '2026-11-14 12:00 Europe/Rome', '2026-11-14 23:00 Europe/Rome', 80, 'Aperitivo in giardino, pranzo in sala grande'),
  ('e4000000-0000-0000-0000-000000000002', 'ristorante', 'Cena aziendale', 'aziendale',
   '2026-11-14 19:00 Europe/Rome', '2026-11-14 23:00 Europe/Rome', 30, null);
select matches((select codice from eventi where id = 'e4000000-0000-0000-0000-000000000001'),
  '^EVT-\d{4}-\d{4}$', 'codice evento EVT-AAAA-NNNN');

insert into eventi_preventivi (evento_id, prezzo_persona, sconto, acconto, acconto_scadenza) values
  ('e4000000-0000-0000-0000-000000000001', 95, 200, 2000, current_date + 20);
select is((select format('%s|%s', modulo, solo_manager) from scadenze_moduli
            where entita = 'eventi_preventivi' and entita_id = 'e4000000-0000-0000-0000-000000000001' and stato = 'aperta'),
  'ristorante|t', 'l''acconto entra nello scadenzario, riservato');

-- Ricavi 95 × 80 − 200 = 7.400; costi 80 × 32 + 450 + 800 = 3.810.
insert into eventi_voci (evento_id, categoria, descrizione, quantita, costo_unitario) values
  ('e4000000-0000-0000-0000-000000000001', 'menu', 'Menu nozze', 80, 32),
  ('e4000000-0000-0000-0000-000000000001', 'fiori', 'Centrotavola', 1, 450),
  ('e4000000-0000-0000-0000-000000000001', 'musica', 'Duo acustico', 1, 800);
select is((select format('%s|%s|%s', ricavi, costi, margine) from eventi_margini
            where evento_id = 'e4000000-0000-0000-0000-000000000001'),
  '7400.00|3810.00|3590.00', 'margine dell''evento sui previsti');
update eventi set partecipanti_confermati = 78 where id = 'e4000000-0000-0000-0000-000000000001';
select is((select margine from eventi_margini where evento_id = 'e4000000-0000-0000-0000-000000000001'),
  3400.00::numeric, 'con 78 confermati il margine scende a 3.400');

insert into eventi_personale (id, evento_id, dipendente_id, ruolo, inizio, fine) values
  ('e5000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   'Capo sala', '2026-11-14 11:00 Europe/Rome', '2026-11-14 23:30 Europe/Rome'),
  ('e5000000-0000-0000-0000-000000000002', 'e4000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
   'Cameriera', '2026-11-14 11:30 Europe/Rome', '2026-11-14 18:00 Europe/Rome');
select is((select format('%s|%s|%s', t.modulo, t.reparto, t.note) from eventi_personale p join turni t on t.id = p.turno_id
            where p.id = 'e5000000-0000-0000-0000-000000000001'),
  'ristorante|eventi|Evento: Matrimonio Rossi', 'la presenza all''evento diventa un turno');
select throws_ok($$insert into eventi_personale (evento_id, dipendente_id, inizio, fine) values ('e4000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', '2026-11-14 19:00 Europe/Rome', '2026-11-14 23:00 Europe/Rome')$$,
  '23P01', null, 'la stessa persona non lavora a due eventi sovrapposti');
update eventi_personale set fine = '2026-11-14 19:00 Europe/Rome' where id = 'e5000000-0000-0000-0000-000000000002';
select is((select t.fine from eventi_personale p join turni t on t.id = p.turno_id where p.id = 'e5000000-0000-0000-0000-000000000002'),
  '2026-11-14 19:00 Europe/Rome'::timestamptz, 'l''orario cambiato si riporta sul turno');
delete from eventi_personale where id = 'e5000000-0000-0000-0000-000000000002';
select is((select stato::text from turni where dipendente_id = 'd0000000-0000-0000-0000-000000000002'
            and inizio = '2026-11-14 11:30 Europe/Rome'), 'annullato', 'presenza tolta: turno annullato');

insert into eventi_partecipanti (evento_id, nome, gruppo, allergeni, esigenze_alimentari) values
  ('e4000000-0000-0000-0000-000000000001', 'Giulia', 'Tavolo 1', '{glutine}', null),
  ('e4000000-0000-0000-0000-000000000001', 'Piero', 'Tavolo 1', '{glutine,latte}', null),
  ('e4000000-0000-0000-0000-000000000001', 'Elena', 'Tavolo 2', '{}', 'vegana');
select is((select string_agg(allergene || ':' || persone, ',' order by allergene) from eventi_allergeni
            where evento_id = 'e4000000-0000-0000-0000-000000000001'),
  'glutine:2,latte:1', 'per la cucina: persone per allergene');
select throws_ok($$insert into eventi_partecipanti (evento_id, nome, allergeni) values ('e4000000-0000-0000-0000-000000000001', 'X', '{fragole}')$$,
  '23514', null, 'allergene fuori dalla lista UE rifiutato');

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s|%s|%s|%s', (select count(*) from eventi), (select count(*) from eventi_personale),
                         (select count(*) from eventi_preventivi), (select count(*) from eventi_voci),
                         (select count(*) from eventi_margini))),
  '2|1|0|0|0', 'operatore: vede eventi e personale, non preventivi, costi e margini');
select throws_ok($$insert into eventi_voci (evento_id, descrizione, created_by) values ('e4000000-0000-0000-0000-000000000001', 'Torta', '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'operatore: non scrive le voci economiche');
select throws_ok($$insert into eventi_personale (evento_id, dipendente_id, inizio, fine, created_by) values ('e4000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', '2026-11-14 19:00 Europe/Rome', '2026-11-14 23:00 Europe/Rome', '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'operatore: non assegna il personale');
select lives_ok($$insert into eventi_partecipanti (evento_id, nome, created_by) values ('e4000000-0000-0000-0000-000000000001', 'Ospite in più', '00000000-0000-0000-0000-00000000000c')$$,
  'operatore: aggiorna la lista degli invitati');
select pg_temp.torna_postgres();

update eventi_preventivi set acconto_pagato_at = current_date where evento_id = 'e4000000-0000-0000-0000-000000000001';
select is((select count(*)::int from scadenze_moduli
            where entita = 'eventi_preventivi' and entita_id = 'e4000000-0000-0000-0000-000000000001' and stato = 'aperta'),
  0, 'acconto pagato: scadenza tolta');

update eventi set stato = 'annullato' where id = 'e4000000-0000-0000-0000-000000000001';
select is((select t.stato::text from eventi_personale p join turni t on t.id = p.turno_id
            where p.id = 'e5000000-0000-0000-0000-000000000001'), 'annullato', 'evento annullato: turni annullati');

-- ═══ LICENZE ═════════════════════════════════════════════════════════
update moduli_licenze set attivo = false where slug = 'ristorante';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select format('%s|%s', (select count(*) from eventi), (select count(*) from controlli_punti))),
  '0|2', 'senza Ristorante: niente eventi del ristorante; restano i punti del bar e del motore fb');
select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'bar';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from controlli_registrazioni), 0, 'senza licenze: nessuna registrazione visibile');
select pg_temp.torna_postgres();

select * from finish();
rollback;
