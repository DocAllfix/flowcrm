-- ═══════════════════════════════════════════════════════════════════
-- Gate MODULO AUTOMEZZI — codice auto, km aggiornati dai rifornimenti,
-- costi riservati, costo/km manager-only, patente → scadenza automatica,
-- dismissione derivata, licenza. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'admin.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000b', 'manager.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000c', 'operatore.test@flowcrm.local')
on conflict (id) do nothing;

insert into user_profiles (id, nome, cognome, ruolo)
values
  ('00000000-0000-0000-0000-00000000000a', 'Anna', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', 'Marco', 'Manager', 'manager'),
  ('00000000-0000-0000-0000-00000000000c', 'Olga', 'Operatore', 'operatore')
on conflict (id) do update
  set nome = excluded.nome, cognome = excluded.cognome, ruolo = excluded.ruolo;

create or replace function pg_temp.impersona(uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$ language plpgsql;

create or replace function pg_temp.torna_postgres() returns void as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', null, true);
end;
$$ language plpgsql;

insert into moduli_licenze (slug, attivo) values ('automezzi', true)
on conflict (slug) do update set attivo = true;

-- ═══ 1. CREAZIONE + CODICE ═══════════════════════════════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');

select lives_ok(
  $$insert into automezzi (id, targa, marca, modello, km_attuali, created_by)
    values ('d0000000-0000-0000-0000-000000000001', 'ZZ999TP', 'Iveco', 'Daily',
            50000, '00000000-0000-0000-0000-00000000000c')$$,
  'operatore: registra un automezzo'
);
select matches(
  (select codice from automezzi where id = 'd0000000-0000-0000-0000-000000000001'),
  '^AUTO-\d{4}-\d{4}$',
  'codice automezzo AUTO-AAAA-NNNN'
);

-- Targa duplicata rifiutata
select throws_ok(
  $$insert into automezzi (targa, marca, modello, created_by)
    values ('ZZ999TP', 'Fiat', 'Ducato', '00000000-0000-0000-0000-00000000000c')$$,
  '23505',
  null,
  'targa duplicata rifiutata (UNIQUE)'
);

-- ═══ 2. RIFORNIMENTO aggiorna i km del mezzo ═════════════════════

select lives_ok(
  $$insert into automezzi_rifornimenti (automezzo_id, litri, costo, km, created_by)
    values ('d0000000-0000-0000-0000-000000000001', 60, 105.50, 50600,
            '00000000-0000-0000-0000-00000000000c')$$,
  'operatore: registra un rifornimento con km'
);
select results_eq(
  $$select km_attuali from automezzi where id = 'd0000000-0000-0000-0000-000000000001'$$,
  array[50600],
  'km del mezzo aggiornati dal rifornimento'
);

-- Un secondo rifornimento (per il consumo medio in vista)
select lives_ok(
  $$insert into automezzi_rifornimenti (automezzo_id, litri, costo, km, created_by)
    values ('d0000000-0000-0000-0000-000000000001', 55, 96.00, 51100,
            '00000000-0000-0000-0000-00000000000c')$$,
  'operatore: secondo rifornimento'
);
select results_eq(
  $$select consumo_medio_100km::numeric from vw_automezzo_consumi
    where automezzo_id = 'd0000000-0000-0000-0000-000000000001'$$,
  $$values (23.0::numeric)$$,
  'vista consumi: 115 litri / 500 km = 23 l/100km'
);

-- ═══ 3. COSTI RISERVATI + COSTO/KM manager-only ══════════════════

select throws_ok(
  $$insert into automezzi_costi (automezzo_id, voce, descrizione, importo, created_by)
    values ('d0000000-0000-0000-0000-000000000001', 'assicurazione', 'RCA 2026', 1200,
            '00000000-0000-0000-0000-00000000000c')$$,
  '42501',
  null,
  'operatore: INSERT costo negato'
);

select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select lives_ok(
  $$insert into automezzi_costi (automezzo_id, voce, descrizione, importo, created_by)
    values ('d0000000-0000-0000-0000-000000000001', 'assicurazione', 'RCA 2026', 1200,
            '00000000-0000-0000-0000-00000000000b')$$,
  'manager: registra il costo assicurazione'
);
select results_eq(
  $$select costo_totale::numeric from vw_automezzo_costo_km
    where automezzo_id = 'd0000000-0000-0000-0000-000000000001'$$,
  $$values (1401.50::numeric)$$,
  'manager: costo totale = fissi 1200 + carburante 201.50'
);

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select results_eq(
  $$select count(*)::int from vw_automezzo_costo_km$$,
  array[0],
  'operatore: vista costo/km = 0 righe'
);

-- ═══ 4. PATENTE → scadenza automatica riservata ══════════════════

select pg_temp.torna_postgres();
insert into dipendenti (id, nome, cognome, created_by)
values ('d0000000-0000-0000-0000-00000000d001', 'Piero', 'Autista',
        '00000000-0000-0000-0000-00000000000a')
on conflict (id) do nothing;

select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select lives_ok(
  $$insert into dipendenti_patenti (id, dipendente_id, tipo, numero, scadenza, created_by)
    values ('d0000000-0000-0000-0000-00000000d002', 'd0000000-0000-0000-0000-00000000d001',
            'cqc', 'CQC123', current_date + 45, '00000000-0000-0000-0000-00000000000b')$$,
  'manager: registra la CQC del conducente'
);
select results_eq(
  $$select count(*)::int from scadenze_moduli
    where entita = 'dipendenti_patenti'
      and entita_id = 'd0000000-0000-0000-0000-00000000d002' and stato = 'aperta'$$,
  array[1],
  'CQC → scadenza automatica creata'
);

-- L'operatore non vede né patenti né la loro scadenza (solo_manager)
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select results_eq(
  $$select count(*)::int from dipendenti_patenti$$,
  array[0],
  'operatore: patenti conducenti invisibili'
);

-- ═══ 5. DISMISSIONE derivata ═════════════════════════════════════

select lives_ok(
  $$update automezzi set stato = 'dismesso', dismissione_tipo = 'rottamazione'
    where id = 'd0000000-0000-0000-0000-000000000001'$$,
  'operatore: dismette il mezzo'
);
select results_eq(
  $$select (dismesso_il is not null) from automezzi
    where id = 'd0000000-0000-0000-0000-000000000001'$$,
  array[true],
  'dismesso_il valorizzato dal trigger'
);

-- ═══ 6. LICENZA SPENTA ═══════════════════════════════════════════

select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'automezzi';

select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select results_eq(
  $$select count(*)::int from automezzi$$,
  array[0],
  'licenza automezzi disattivata: anche l''admin vede 0 mezzi'
);

select * from finish();
rollback;
