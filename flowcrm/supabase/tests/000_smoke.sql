-- Gate F0: test pgTAP fittizio — verifica solo che il runner funzioni.
-- Da F1 questa cartella conterrà la matrice RLS (4 operazioni × 3 ruoli)
-- e i test dei trigger, eseguiti in CI con `supabase test db`.
begin;

create extension if not exists pgtap with schema extensions;

select plan(1);

select pass('pgTAP runner operativo — pronto per la matrice RLS di F1');

select * from finish();

rollback;
