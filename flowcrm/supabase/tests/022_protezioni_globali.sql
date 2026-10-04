-- ═══════════════════════════════════════════════════════════════════
-- Gate PROTEZIONI GLOBALI — vale per OGNI tabella, presente e futura.
--
-- Una tabella nuova senza RLS forzata o senza il blocco della demo è un
-- buco: in demo sarebbe scrivibile da chiunque con le credenziali
-- pubbliche dell'ospite, nelle istanze clienti leggibile da un processo
-- proprietario. Questo test fallisce appena una migrazione dimentica
-- `SELECT applica_protezioni_tabelle();` in fondo.
-- ═══════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

select is(
  (select string_agg(c.relname, ', ' order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  null,
  'ogni tabella di public ha la RLS attiva'
);

select is(
  (select string_agg(c.relname, ', ' order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relforcerowsecurity),
  null,
  'ogni tabella di public ha la RLS forzata (anche contro il proprietario)'
);

select is(
  (select string_agg(c.relname, ', ' order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not c.relname = any (tabelle_di_servizio())
      and not exists (select 1 from pg_trigger t
                       where t.tgrelid = c.oid and t.tgname = 'aa_blocca_scrittura_demo')),
  null,
  'ogni tabella di dominio ha il blocco di sola lettura della demo'
);

select is(
  (select string_agg(tabella, ', ' order by tabella) from demo_tabelle_ospite
    where not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                       where n.nspname = 'public' and c.relname = tabella)),
  null,
  'le tabelle dell''ospite della demo esistono tutte'
);

select is(applica_protezioni_tabelle(), 0, 'applica_protezioni_tabelle è idempotente (niente da fare)');

select * from finish();
rollback;
