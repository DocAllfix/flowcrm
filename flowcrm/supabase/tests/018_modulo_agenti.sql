-- ═══════════════════════════════════════════════════════════════════
-- Gate MODULO AGENTI — isolamento portale agente (un agente vede SOLO
-- sé stesso), provvigioni riservate e calcolate dal venduto, righe
-- ordine che ricalcolano il valore, mandato → scadenza, note spese
-- con transizioni blindate, licenza. ROLLBACK finale.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'admin.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000b', 'manager.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000c', 'operatore.test@flowcrm.local'),
  ('00000000-0000-0000-0000-00000000000d', 'agente.test@flowcrm.local')
on conflict (id) do nothing;

insert into user_profiles (id, nome, cognome, ruolo)
values
  ('00000000-0000-0000-0000-00000000000a', 'Anna', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', 'Marco', 'Manager', 'manager'),
  ('00000000-0000-0000-0000-00000000000c', 'Olga', 'Operatore', 'operatore'),
  ('00000000-0000-0000-0000-00000000000d', 'Aldo', 'Agente', 'operatore')
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

insert into moduli_licenze (slug, attivo) values ('agenti', true)
on conflict (slug) do update set attivo = true;

-- Seed: agente A (collegato all'utente d), agente B (senza utente),
-- un'organizzazione cliente.
insert into agenti (id, nome, cognome, user_id, created_by) values
  ('a1000000-0000-0000-0000-000000000001', 'Aldo', 'Agente',
   '00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000a'),
  ('a1000000-0000-0000-0000-000000000002', 'Bruna', 'Venditrice',
   null, '00000000-0000-0000-0000-00000000000a');

insert into organizzazioni (id, ragione_sociale, created_by) values
  ('a1000000-0000-0000-0000-00000000c001', 'Cliente Provv Srl',
   '00000000-0000-0000-0000-00000000000a')
on conflict (id) do nothing;

-- ═══ 1. CODICE + visibilità staff ════════════════════════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select matches(
  (select codice from agenti where id = 'a1000000-0000-0000-0000-000000000001'),
  '^AGEN-\d{4}-\d{4}$',
  'codice agente AGEN-AAAA-NNNN'
);
select results_eq(
  $$select count(*)::int from agenti where id in
    ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002')$$,
  array[2],
  'staff operatore: vede tutti gli agenti'
);

-- Ma lo staff operatore NON vede le provvigioni (economiche)
select results_eq(
  $$select count(*)::int from agenti_piani_provvigionali$$,
  array[0],
  'staff operatore: piani provvigionali invisibili'
);

-- ═══ 2. PORTALE AGENTE: isolamento totale ════════════════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000d');
select results_eq(
  $$select count(*)::int from agenti where id in
    ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002')$$,
  array[1],
  'agente collegato: vede SOLO il proprio fascicolo'
);

-- L'agente registra una visita per sé
select lives_ok(
  $$insert into agenti_visite (agente_id, organizzazione_id, esito, argomenti, created_by)
    values ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-00000000c001',
            'positivo', 'Presentato catalogo primavera', '00000000-0000-0000-0000-00000000000d')$$,
  'agente: registra un rapporto visita proprio'
);

-- Ma NON può registrarne una a nome di un altro agente
select throws_ok(
  $$insert into agenti_visite (agente_id, esito, argomenti, created_by)
    values ('a1000000-0000-0000-0000-000000000002', 'positivo', 'Spoofing',
            '00000000-0000-0000-0000-00000000000d')$$,
  '42501',
  null,
  'agente: visita a nome di un altro agente BLOCCATA'
);

-- ═══ 3. ORDINI: righe → valore ricalcolato ═══════════════════════

select lives_ok(
  $$insert into agenti_ordini (id, agente_id, organizzazione_id, stato, created_by)
    values ('a1000000-0000-0000-0000-0000000000b1', 'a1000000-0000-0000-0000-000000000001',
            'a1000000-0000-0000-0000-00000000c001', 'confermato',
            '00000000-0000-0000-0000-00000000000d')$$,
  'agente: crea un ordine'
);
select lives_ok(
  $$insert into agenti_ordini_righe (ordine_id, prodotto, quantita, prezzo_unitario, created_by)
    values ('a1000000-0000-0000-0000-0000000000b1', 'Prodotto X', 10, 500,
            '00000000-0000-0000-0000-00000000000d'),
           ('a1000000-0000-0000-0000-0000000000b1', 'Prodotto Y', 20, 250,
            '00000000-0000-0000-0000-00000000000d')$$,
  'agente: aggiunge le righe ordine'
);
select results_eq(
  $$select valore::numeric from agenti_ordini
    where id = 'a1000000-0000-0000-0000-0000000000b1'$$,
  $$values (10000::numeric)$$,
  'valore ordine ricalcolato dalle righe (10.000)'
);

-- ═══ 4. PROVVIGIONI: piano + regola cliente + calcolo ════════════

-- L'agente NON crea piani (riservato ai manager)
select throws_ok(
  $$insert into agenti_piani_provvigionali (agente_id, percentuale_base, created_by)
    values ('a1000000-0000-0000-0000-000000000001', 50, '00000000-0000-0000-0000-00000000000d')$$,
  '42501',
  null,
  'agente: creazione piano provvigionale negata'
);

select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select lives_ok(
  $$insert into agenti_piani_provvigionali (agente_id, percentuale_base, created_by)
    values ('a1000000-0000-0000-0000-000000000001', 5, '00000000-0000-0000-0000-00000000000b')$$,
  'manager: piano base 5%'
);
select lives_ok(
  $$insert into agenti_provvigioni_regole (agente_id, ambito, riferimento, percentuale, created_by)
    values ('a1000000-0000-0000-0000-000000000001', 'cliente', 'Cliente Provv Srl', 8,
            '00000000-0000-0000-0000-00000000000b')$$,
  'manager: regola cliente 8%'
);

-- L'ordine va a "consegnato" e si calcola il periodo corrente
select pg_temp.torna_postgres();
update agenti_ordini set stato = 'consegnato'
  where id = 'a1000000-0000-0000-0000-0000000000b1';

select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select results_eq(
  $$select calcola_provvigioni('a1000000-0000-0000-0000-000000000001',
                               to_char(current_date, 'YYYY-MM'))::numeric$$,
  $$values (800::numeric)$$,
  'calcolo provvigioni: 10.000 × 8% (regola cliente batte la base) = 800'
);

-- L'operatore staff non può calcolare
select pg_temp.impersona('00000000-0000-0000-0000-00000000000c');
select throws_like(
  $$select calcola_provvigioni('a1000000-0000-0000-0000-000000000001',
                               to_char(current_date, 'YYYY-MM'))$$,
  '%riservato ad admin e manager%',
  'operatore: calcolo provvigioni negato'
);

-- L'agente vede le PROPRIE provvigioni; Bruna non ne ha e Aldo non vede altrui
select pg_temp.impersona('00000000-0000-0000-0000-00000000000d');
select results_eq(
  $$select importo_maturato::numeric from agenti_provvigioni
    where agente_id = 'a1000000-0000-0000-0000-000000000001'$$,
  $$values (800::numeric)$$,
  'agente: vede le proprie provvigioni maturate (800)'
);

-- ═══ 5. MANDATO → scadenza automatica riservata ══════════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select lives_ok(
  $$insert into agenti_mandati (id, agente_id, descrizione, data_fine, created_by)
    values ('a1000000-0000-0000-0000-0000000000d1', 'a1000000-0000-0000-0000-000000000001',
            'Mandato Nord-Ovest', current_date + 90, '00000000-0000-0000-0000-00000000000b')$$,
  'manager: mandato con fine tra 90 giorni'
);
select results_eq(
  $$select count(*)::int from scadenze_moduli
    where entita = 'agenti_mandati' and entita_id = 'a1000000-0000-0000-0000-0000000000d1'
      and stato = 'aperta' and solo_manager$$,
  array[1],
  'fine mandato → scadenza automatica riservata'
);

-- ═══ 6. NOTE SPESE: transizioni blindate ═════════════════════════

select pg_temp.impersona('00000000-0000-0000-0000-00000000000d');
select lives_ok(
  $$insert into agenti_note_spese (id, agente_id, tipo, descrizione, importo, created_by)
    values ('a1000000-0000-0000-0000-0000000000e1', 'a1000000-0000-0000-0000-000000000001',
            'carburante', 'Rifornimento trasferta Torino', 85.50,
            '00000000-0000-0000-0000-00000000000d')$$,
  'agente: presenta una nota spese'
);
select throws_like(
  $$update agenti_note_spese set stato = 'approvata'
    where id = 'a1000000-0000-0000-0000-0000000000e1'$$,
  '%Solo admin o manager%',
  'agente: auto-approvazione nota spese BLOCCATA'
);

select pg_temp.impersona('00000000-0000-0000-0000-00000000000b');
select lives_ok(
  $$update agenti_note_spese set stato = 'approvata'
    where id = 'a1000000-0000-0000-0000-0000000000e1'$$,
  'manager: approva la nota spese'
);

-- ═══ 7. LICENZA SPENTA ═══════════════════════════════════════════

select pg_temp.torna_postgres();
update moduli_licenze set attivo = false where slug = 'agenti';

select pg_temp.impersona('00000000-0000-0000-0000-00000000000a');
select results_eq(
  $$select count(*)::int from agenti$$,
  array[0],
  'licenza agenti disattivata: anche l''admin vede 0 agenti'
);

select * from finish();
rollback;
