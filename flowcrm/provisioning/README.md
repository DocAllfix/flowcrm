# Provisioning istanza cliente

Ogni cliente riceve un'istanza privata: **stesso codebase, configurazione diversa**.
I moduli acquistati si attivano in due punti (entrambi obbligatori):

1. **DB** — riga in `moduli_licenze` (enforcement RLS: senza licenza l'API non
   restituisce righe, qualunque cosa faccia il frontend);
2. **UI** — env `VITE_MODULES` (CSV di slug) nel build del frontend.

Slug disponibili: `gare`, `cantiere`, `automezzi`, `agenti`, `poliambulatori`,
`ristorante`, `bar`, `hotel`, `palestra`, `fioraio`, `garage`, `immobiliare`.

Ristorante e Bar condividono il motore di sala e cucina: basta una delle due
licenze per accenderlo, le funzioni proprie di ciascuno restano dietro la sua.
Gli slug ammessi sono controllati anche dall'avvio del container e da
`deploy/preflight.sh` (un test tiene gli elenchi allineati al registro).

## Installazione (Supabase self-hosted su server del cliente)

1. **Server**: VPS con Docker (4 vCPU / 8 GB consigliati). Hardening: firewall,
   SSH solo con chiave, fail2ban.
2. **Supabase self-hosted**: `docker compose` ufficiale. Generare JWT secret,
   anon key e service key **unici per il cliente**. Configurare SMTP (recovery
   password). Disabilitare il signup pubblico (`GOTRUE_DISABLE_SIGNUP=true`).
3. **Migrazioni**: `supabase db push` verso l'istanza (tutte le migrazioni:
   lo schema è unico, sono le licenze a spegnere i moduli non acquistati).
4. **Licenze**: `INSERT INTO moduli_licenze (slug) VALUES ('<modulo>');`
   per ogni modulo acquistato (con service_role/psql).
5. **Admin del cliente**: creare l'utente admin (dashboard o SQL con
   `crypt(pw, gen_salt('bf'))` e i campi token a stringa vuota).
6. **Cron**: verificare in `cron.job` gli schedule `processa-scadenze-*` e
   `deal-a-rischio-*` (pg_cron è nel compose). I moduli nuovi aggiungono i loro
   giri notturni, presenti in tutte le istanze e innocui senza licenza:
   `invia-campagne-programmate`, `fb-marcia-uscite`, `hotel-*`, `palestra-*`,
   `fioraio-*`, `garage-giro-notturno`, `immobiliare-giro-notturno`.
7. **Secrets Edge Functions** (se si vuole il copilot): AZURE_OPENAI_*,
   AZURE_EMBED_*, COPILOT_ALLOWED_ORIGINS=`https://<cliente>.flowcrm.com`,
   CRON_SECRET. Poi `supabase functions deploy copilot crea-utente cron-scadenze`.
8. **Frontend**: build con l'`.env` del cliente
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MODULES`,
   white-label `VITE_APP_NAME/LOGO/COLORI`) e servito da **Caddy** sullo
   stesso dominio, con reverse-proxy verso Supabase per `/rest`, `/auth`,
   `/storage`, `/realtime`, `/functions` (TLS automatico).
   ⚠️ La CSP (oggi in `vercel.json` per la demo) va rigenerata con il
   dominio dell'istanza.
9. **DNS**: `<cliente>.flowcrm.com` → A/CNAME verso il server (wildcard
   `*.flowcrm.com` sul dominio principale).
10. **Backup**: `pg_dump` notturno + copia off-site; test di restore documentato.
11. **Seed demo** (solo istanze dimostrative): `seed_demo_moduli.sql` per i moduli, poi `demo-dati-dimostrativi.sql` per CRM, amministrazione e cantiere. Il secondo INSTALLA la demo pubblica: fotografia delle anagrafiche in `demo_seme`, funzione `ripristina_demo()` e job pg_cron notturno (2:00 UTC). Ripristino immediato a mano: `SELECT public.ripristina_demo();`. Prerequisito: l'account ospite, descritto in testa al file.

## Checklist di consegna (da eseguire a ogni installazione)

- [ ] login admin funziona; signup pubblico disabilitato
- [ ] operatore: 0 righe su fatture/incassi/tasse/HR via API
- [ ] moduli NON acquistati: 0 righe via API anche per l'admin
- [ ] (se agenti) utente-agente: vede solo i propri dati
- [ ] (se poliambulatori) segreteria: 0 righe su fascicolo/visite/referti
- [ ] (se palestra) misure, progressi e valutazioni: solo trainer assegnato e admin, con il consenso
- [ ] (se immobiliare) un agente vede le sue provvigioni e non quelle degli altri; antiriciclaggio riservato
- [ ] (moduli verticali nuovi) operatore: 0 dati economici negli indicatori (`*_kpi` → `economici: null`)
- [ ] configurazione guidata del modulo alla prima apertura (ristorante/bar: sala; hotel: struttura; palestra: sede; fioraio: negozio; garage: autorimessa; immobiliare: agenzia)
- [ ] scadenzari attivi (riga in cron.job) e notifiche in-app funzionanti
- [ ] backup notturno verificato con un restore di prova
- [ ] headers di sicurezza attivi sul dominio (CSP con l'URL dell'istanza)
- [ ] suite pgTAP verde contro l'istanza: `supabase test db`

## Upsell di un modulo

1 riga in `moduli_licenze` + rebuild del frontend con `VITE_MODULES`
aggiornata. Minuti, non giorni.
