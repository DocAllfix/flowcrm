-- ═══════════════════════════════════════════════════════════════════
-- Gate PALESTRA 1/3 — soci, abbonamenti, carnet, sospensioni, incassi,
-- controllo accessi: prezzo con la convenzione e rate; ogni motivo di
-- accesso negato (firma, certificato, insoluto, scaduto, sospeso, fuori
-- fascia, ingressi finiti, blocco); il carnet che scala; la sospensione
-- autorizzata dalla direzione che sposta la scadenza; incasso in cassa;
-- addebito ricorrente fino all'insoluto; rinnovi; armadietti e
-- certificazioni in scadenza; pipeline dei prospect; licenza. ROLLBACK.
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
-- Un istante di oggi a un'ora data (ora di Roma).
create or replace function pg_temp.alle(h text) returns timestamptz as $$
  select (pg_temp.oggi()::text || ' ' || h)::timestamp at time zone 'Europe/Rome'
$$ language sql stable;

insert into moduli_licenze (slug, attivo) values ('palestra', true)
on conflict (slug) do update set attivo = excluded.attivo;

-- ═══ CONFIGURAZIONE ═════════════════════════════════════════════════
insert into pal_sedi (id, nome, tentativi_max, retry_giorni, tolleranza_insoluto_giorni) values
  ('f1000000-0000-0000-0000-000000000001', 'Palestra Test', 2, 3, 5);
insert into organizzazioni (id, ragione_sociale) values ('f9000000-0000-0000-0000-000000000001', 'Uffici Test SRL');
insert into pal_convenzioni (id, organizzazione_id, sconto_pct, quota_azienda_pct) values
  ('f8000000-0000-0000-0000-000000000001', 'f9000000-0000-0000-0000-000000000001', 20, 50);
insert into pal_formule (id, nome, tipo, durata_mesi, prezzo, quota_iscrizione, rate, servizi) values
  ('f2000000-0000-0000-0000-000000000001', 'Trimestrale open', 'trimestrale', 3, 150, 30, 3, '{sala_pesi,corsi}');
insert into pal_formule (id, nome, tipo, durata_mesi, prezzo, accessi, fasce, servizi, rinnovo_automatico) values
  ('f2000000-0000-0000-0000-000000000002', 'Mattina 8 ingressi', 'fasce_orarie', 1, 40, 8,
   '[{"giorni": [1,2,3,4,5,6,7], "dalle": "06:00", "alle": "13:00"}]', '{sala_pesi}', true);
insert into pal_pacchetti (id, nome, voci, prezzo, validita_giorni) values
  ('f3000000-0000-0000-0000-000000000001', 'Combinato 10+5', '[{"servizio": "ingressi", "quantita": 10}, {"servizio": "lezioni_pt", "quantita": 5}]', 300, 90);

insert into contatti (id, nome, cognome, email) values
  ('f7000000-0000-0000-0000-000000000001', 'Marco', 'Bianchi', 'marco.test@esempio.it'),
  ('f7000000-0000-0000-0000-000000000002', 'Lucia', 'Neri', 'lucia.test@esempio.it'),
  ('f7000000-0000-0000-0000-000000000003', 'Paolo', 'Gialli', null);

-- Prospect in pipeline, poi iscritto.
insert into deals (id, nome, contatto_id, pipeline_id, stage_id, created_by)
select 'f6000000-0000-0000-0000-000000000001', 'Marco Bianchi · prova', 'f7000000-0000-0000-0000-000000000001', pal_pipeline(), s.id,
       '00000000-0000-0000-0000-00000000000a'
  from pipeline_stages s where s.pipeline_id = pal_pipeline() and s.nome = 'Prova';
select is((select string_agg(nome, '→' order by ordine) from pipeline_stages where pipeline_id = pal_pipeline()),
  'Lead→Contatto→Visita→Prova→Offerta→Iscrizione→Persa', 'pipeline dei prospect come nel documento');

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into pal_soci (id, contatto_id, sede_id, convenzione_id, created_by) values
  ('f4000000-0000-0000-0000-000000000001', 'f7000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
   'f8000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c');
insert into pal_soci (id, contatto_id, sede_id, condizioni_accettate, certificato_scadenza, created_by) values
  ('f4000000-0000-0000-0000-000000000002', 'f7000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001',
   true, pg_temp.oggi() + 200, '00000000-0000-0000-0000-00000000000c'),
  ('f4000000-0000-0000-0000-000000000003', 'f7000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001',
   true, pg_temp.oggi() + 200, '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();

select ok((select codice like 'SOC-%' from pal_soci where id = 'f4000000-0000-0000-0000-000000000001'), 'l''iscritto riceve il codice socio');
select is((select s.is_won from deals d join pipeline_stages s on s.id = d.stage_id where d.id = 'f6000000-0000-0000-0000-000000000001'),
  true, 'l''iscrizione chiude la trattativa come vinta');

-- ═══ ABBONAMENTI, PREZZO E RATE ═════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_ok($$insert into pal_abbonamenti (socio_id, formula_id, prezzo, created_by) values
  ('f4000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 10, '00000000-0000-0000-0000-00000000000c')$$,
  '42501', null, 'lo sconto a mano lo fa solo la direzione');
insert into pal_abbonamenti (id, socio_id, formula_id, inizio, created_by) values
  ('f5000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001',
   pg_temp.oggi(), '00000000-0000-0000-0000-00000000000c');
select pg_temp.torna_postgres();

select is((select format('%s|%s|%s', fine - inizio + 1 between 89 and 92, prezzo, quota_azienda) from pal_abbonamenti
            where id = 'f5000000-0000-0000-0000-000000000001'),
  't|120.00|60.00', 'tre mesi; 150 € meno il 20% della convenzione, metà all''azienda');
select is((select string_agg(format('%s:%s:%s', pagatore, importo, scadenza - pg_temp.oggi() > 25), ',' order by pagatore desc, numero)
             from pal_rate where abbonamento_id = 'f5000000-0000-0000-0000-000000000001'),
  'socio:50.00:f,socio:20.00:t,socio:20.00:t,azienda:60.00:f',
  'tre rate del socio (la prima con l''iscrizione) e la quota dell''azienda a parte');
select ok(exists (select 1 from scadenze_moduli where entita = 'pal_abbonamenti' and entita_id = 'f5000000-0000-0000-0000-000000000001'),
  'la scadenza dell''abbonamento entra tra le scadenze');

-- ═══ CONTROLLO ACCESSI ══════════════════════════════════════════════
select is(pal_verifica_accesso('f4000000-0000-0000-0000-000000000001')->>'motivo', 'Manca la firma delle condizioni di iscrizione',
  'senza la firma delle condizioni non si entra');
update pal_soci set condizioni_accettate = true where id = 'f4000000-0000-0000-0000-000000000001';
select is(pal_verifica_accesso('f4000000-0000-0000-0000-000000000001')->>'motivo', 'Manca il certificato medico',
  'senza certificato medico non si entra');
update pal_soci set certificato_scadenza = pg_temp.oggi() - 1 where id = 'f4000000-0000-0000-0000-000000000001';
select ok((pal_verifica_accesso('f4000000-0000-0000-0000-000000000001')->>'motivo') like 'Certificato medico scaduto il %', 'certificato scaduto');
update pal_soci set certificato_scadenza = pg_temp.oggi() + 300 where id = 'f4000000-0000-0000-0000-000000000001';
select is(pal_verifica_accesso('f4000000-0000-0000-0000-000000000001')->>'consentito', 'true', 'abbonamento valido: si entra');
select is(pal_verifica_accesso('f4000000-0000-0000-0000-000000000001', now(), 'piscina')->>'motivo',
  'L''abbonamento non comprende questo servizio', 'la piscina non è nella formula');

update pal_soci set bloccato = true, blocco_motivo = 'Comportamento scorretto' where id = 'f4000000-0000-0000-0000-000000000001';
select is(pal_verifica_accesso('f4000000-0000-0000-0000-000000000001')->>'motivo', 'Bloccato: Comportamento scorretto', 'socio bloccato');
update pal_soci set bloccato = false where id = 'f4000000-0000-0000-0000-000000000001';

-- Fascia oraria e ingressi contati.
insert into pal_abbonamenti (id, socio_id, formula_id, inizio, created_by) values
  ('f5000000-0000-0000-0000-000000000002', 'f4000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000002',
   pg_temp.oggi(), '00000000-0000-0000-0000-00000000000a');
select is(pal_verifica_accesso('f4000000-0000-0000-0000-000000000002', pg_temp.alle('09:00'))->>'residui', '8', 'mattina: si entra, 8 ingressi');
select is(pal_verifica_accesso('f4000000-0000-0000-0000-000000000002', pg_temp.alle('19:00'))->>'motivo',
  'Fuori dalla fascia oraria dell''abbonamento', 'la sera no: fuori fascia');
update pal_abbonamenti set accessi_usati = 8 where id = 'f5000000-0000-0000-0000-000000000002';
select is(pal_verifica_accesso('f4000000-0000-0000-0000-000000000002', pg_temp.alle('09:00'))->>'motivo',
  'Ingressi dell''abbonamento esauriti', 'ingressi finiti');
update pal_abbonamenti set accessi_usati = 2 where id = 'f5000000-0000-0000-0000-000000000002';

-- L'ingresso registrato scala dall'abbonamento a ingressi.
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select is((select (r->>'consentito') || '|' || (r->>'socio') from pal_registra_ingresso(
            (select codice from pal_soci where id = 'f4000000-0000-0000-0000-000000000002')) r),
  case when (now() at time zone 'Europe/Rome')::time between '06:00' and '13:00' then 'true' else 'false' end || '|Lucia Neri',
  'ingresso dal codice della tessera, con l''esito della fascia di adesso');
select pg_temp.torna_postgres();
select is((select format('%s|%s', count(*), bool_and(consentito = (motivo not like 'Fuori%'))) from pal_accessi
            where socio_id = 'f4000000-0000-0000-0000-000000000002'), '1|t', 'ogni tentativo è registrato con il suo esito');

-- Carnet combinato: due voci, scala l'ingresso quando non c'è abbonamento.
select pal_vendi_pacchetto('f4000000-0000-0000-0000-000000000003', 'f3000000-0000-0000-0000-000000000001');
select is((select string_agg(format('%s:%s', servizio, totale), ',' order by servizio) from pal_carnet
            where socio_id = 'f4000000-0000-0000-0000-000000000003'), 'ingressi:10,lezioni_pt:5', 'il pacchetto combinato diventa due carnet');
select is((select pal_registra_ingresso((select qr_token from pal_soci where id = 'f4000000-0000-0000-0000-000000000003'), null, 'qr')->>'residui'),
  '10', 'ingresso con il QR: il carnet aveva 10 ingressi…');
select is((select usati from pal_carnet where socio_id = 'f4000000-0000-0000-0000-000000000003' and servizio = 'ingressi'), 1,
  '…e ne scala uno');

-- ═══ SOSPENSIONE ════════════════════════════════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
insert into pal_sospensioni (id, abbonamento_id, dal, al, motivo, created_by) values
  ('fa000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', pg_temp.oggi(), pg_temp.oggi() + 13, 'Infortunio',
   '00000000-0000-0000-0000-00000000000c');
select throws_ok($$update pal_sospensioni set stato = 'approvata' where id = 'fa000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'la reception chiede, l''autorizzazione è della direzione');
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
create temp table fine_prima as select fine from pal_abbonamenti where id = 'f5000000-0000-0000-0000-000000000001';
update pal_sospensioni set stato = 'approvata' where id = 'fa000000-0000-0000-0000-000000000001';
select pg_temp.torna_postgres();
select is((select a.fine - p.fine from pal_abbonamenti a, fine_prima p where a.id = 'f5000000-0000-0000-0000-000000000001'), 14,
  'quattordici giorni di sospensione: la scadenza si sposta di quattordici giorni');
select is(pal_verifica_accesso('f4000000-0000-0000-0000-000000000001')->>'motivo', 'Abbonamento sospeso oggi', 'in sospensione non si entra');
select is((select stato from pal_soci_stato where socio_id = 'f4000000-0000-0000-0000-000000000001'), 'sospeso', 'e il socio risulta sospeso');

-- ═══ INCASSI, ADDEBITO RICORRENTE, INSOLUTI ═════════════════════════
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select isnt(pal_incassa_rata((select id from pal_rate where abbonamento_id = 'f5000000-0000-0000-0000-000000000002')), null,
  'la reception incassa la rata');
select pg_temp.torna_postgres();
select is((select format('%s|%s', r.stato, c.stato) from pal_rate r join conti c on c.id = r.conto_id
            where r.abbonamento_id = 'f5000000-0000-0000-0000-000000000002'), 'pagata|chiuso', 'rata pagata, conto di cassa chiuso');
select throws_like($$select pal_incassa_rata((select id from pal_rate where abbonamento_id = 'f5000000-0000-0000-0000-000000000001' and pagatore = 'azienda'))$$,
  '%si fattura alla convenzione%', 'la quota dell''azienda non si incassa in reception');

select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select is(pal_esito_addebito((select id from pal_rate where abbonamento_id = 'f5000000-0000-0000-0000-000000000001' and numero = 1 and pagatore = 'socio'),
  false, 'Fondi insufficienti'), 'fallita', 'primo addebito fallito: si ritenta');
select is((select prossimo_tentativo - pg_temp.oggi() from pal_rate where abbonamento_id = 'f5000000-0000-0000-0000-000000000001' and numero = 1 and pagatore = 'socio'),
  3, 'il nuovo tentativo è fra tre giorni');
select is(pal_esito_addebito((select id from pal_rate where abbonamento_id = 'f5000000-0000-0000-0000-000000000001' and numero = 1 and pagatore = 'socio'),
  false, 'Fondi insufficienti'), 'insoluta', 'tentativi esauriti: insoluta');
select pg_temp.torna_postgres();
delete from pal_sospensioni where id = 'fa000000-0000-0000-0000-000000000001';
select is(pal_verifica_accesso('f4000000-0000-0000-0000-000000000001')->>'motivo', 'Pagamento insoluto: regolarizzare in reception',
  'con un insoluto l''accesso è bloccato');
select ok(exists (select 1 from mail_outbox where destinatario = 'marco.test@esempio.it' and oggetto = 'Pagamento non riuscito'),
  'il socio è avvisato per email');

-- Rata scaduta oltre la tolleranza: insoluta dal giro del mattino.
update pal_rate set scadenza = pg_temp.oggi() - 10 where socio_id = 'f4000000-0000-0000-0000-000000000003';
select ok(pal_rate_scadute() >= 1, 'il giro del mattino trova le rate scadute');
select is((select stato from pal_rate where socio_id = 'f4000000-0000-0000-0000-000000000003'), 'insoluta', 'la rata del carnet è insoluta');

-- ═══ RINNOVI ════════════════════════════════════════════════════════
update pal_abbonamenti set fine = pg_temp.oggi() where id = 'f5000000-0000-0000-0000-000000000002';
select pal_rinnovi_notturni();
select is((select format('%s|%s', inizio = pg_temp.oggi() + 1, stato) from pal_abbonamenti where rinnovo_di = 'f5000000-0000-0000-0000-000000000002'),
  't|attivo', 'rinnovo automatico dal giorno dopo la fine');
select is((select count(*)::int from pal_rate where abbonamento_id = (select id from pal_abbonamenti where rinnovo_di = 'f5000000-0000-0000-0000-000000000002')),
  1, 'il rinnovo genera la sua rata (senza quota d''iscrizione)');

-- ═══ ARMADIETTI E CERTIFICAZIONI ════════════════════════════════════
insert into pal_armadietti (id, sede_id, numero, socio_id, assegnato_fino) values
  ('fb000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'U-12', 'f4000000-0000-0000-0000-000000000002', pg_temp.oggi() + 30);
select is((select format('%s|%s', a.stato, s.data_scadenza = pg_temp.oggi() + 30) from pal_armadietti a
            join scadenze_moduli s on s.entita = 'pal_armadietti' and s.entita_id = a.id where a.id = 'fb000000-0000-0000-0000-000000000001'),
  'assegnato|t', 'armadietto assegnato con la scadenza dell''assegnazione');
insert into dipendenti (id, nome, cognome) values ('fc000000-0000-0000-0000-000000000001', 'Sara', 'Trainer');
insert into pal_certificazioni (dipendente_id, certificazione, tipo, ente, scadenza) values
  ('fc000000-0000-0000-0000-000000000001', 'BLSD', 'blsd', 'IRC', pg_temp.oggi() + 20);
select ok(exists (select 1 from scadenze_moduli where entita = 'pal_certificazioni' and descrizione = 'Sara Trainer · BLSD'),
  'la certificazione in scadenza avvisa');

-- ═══ LICENZA ════════════════════════════════════════════════════════
update moduli_licenze set attivo = false where slug = 'palestra';
select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from pal_soci), 0, 'senza licenza nessun socio visibile');
select throws_ok($$select pal_verifica_accesso('f4000000-0000-0000-0000-000000000002')$$, '42501', null, 'e nessuna verifica d''accesso');
select pg_temp.torna_postgres();

select * from finish();
rollback;
