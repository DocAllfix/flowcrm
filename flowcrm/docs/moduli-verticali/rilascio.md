# Rilascio dei moduli verticali sulla demo (Sprint 9)

Piano per portare sulla demo pubblica (`demo.pmiflow.eu`, progetto Supabase
`ozwqvriqhkckzxcumelr`) le migrazioni del secondo programma: fondamenta e sette moduli.
Si esegue **solo con il via libera esplicito del committente**.

## Cosa cambia e cosa no

- **Database**: 25 migrazioni nuove, dalla `20261004000001_fondamenta_protezioni.sql` alla
  `20261011000002_immobiliare_trattative.sql`. Sono **solo aggiuntive**: creano tabelle, viste,
  funzioni e job; aggiungono due colonne facoltative (`deals.immobile_id`,
  `attivita.immobile_id`) e ridefiniscono alcune funzioni condivise (ricerca globale, protezioni
  della demo, permessi dell'ospite). Non cancellano e non riscrivono dati esistenti.
- **Licenze**: nessuna riga nuova in `moduli_licenze`. Senza licenza ogni tabella nuova
  restituisce zero righe (RLS) e ogni funzione si rifiuta: i moduli restano **spenti**.
- **Frontend**: `VITE_MODULES` su Vercel resta quello di oggi (i cinque moduli vecchi). Il
  codice dei moduli nuovi è già in produzione da quando è stato unito in `main`, ma senza la
  voce in `VITE_MODULES` non compare nessun menu né rotta.
- **Sola lettura della demo**: ogni migrazione termina con `applica_protezioni_tabelle()`, quindi
  le tabelle nuove nascono con il blocco di scrittura della demo (test globale `022`).

## Passi

1. **Fotografia prima**: backup del database dalla dashboard Supabase (o `pg_dump` dello schema
   `public`), annotando l'ora. È il punto di ritorno.
2. **Prova a secco**: `supabase db push --linked --dry-run` con il token di
   `~/.config/flotta/supabase.env` (oggi scaduto: va rinnovato). L'elenco deve essere esattamente
   le 25 migrazioni sopra.
3. **Applicazione**: `supabase db push --linked`.
4. **Controlli subito dopo**, via Management API (`POST /v1/projects/<ref>/database/query`):
   - `select count(*) from supabase_migrations.schema_migrations` = numero dei file in `supabase/migrations` (oggi 70);
   - nessuna tabella di `public` senza il trigger di sola lettura (la query del test `022`);
   - `select slug from moduli_licenze where attivo` = i cinque moduli vecchi;
   - `select jobname from cron.job` contiene i giri notturni nuovi;
   - `ripristina_demo()` gira senza errori.
5. **Controlli sul sito vero**: login ospite su `demo.pmiflow.eu/demo`, giro delle pagine dei
   cinque moduli e del CRM, nessun «Avvio interrotto», nessun errore in console; la ricerca
   Ctrl+K funziona.
6. **Accensione di un modulo nuovo in demo** (Sprint 10, dopo i dati dimostrativi): riga in
   `moduli_licenze`, slug in `VITE_MODULES` su Vercel e redeploy, seme dei dati e ripristino
   notturno aggiornati.

## Ritorno indietro

- **Spegnere un modulo**: togliere lo slug da `VITE_MODULES` e la riga da `moduli_licenze`.
  Effetto immediato; i dati restano.
- **Migrazione problematica**: le migrazioni sono solo aggiuntive, quindi il ritorno indietro
  di norma non serve; in caso estremo si ripristina il backup del passo 1.
