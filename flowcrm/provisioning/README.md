# Provisioning istanza cliente

Ogni cliente riceve un'istanza privata: **stesso codebase, configurazione diversa**.
I moduli acquistati si attivano in due punti (entrambi obbligatori):

1. **DB** — riga in `moduli_licenze` (enforcement RLS: senza licenza l'API non
   restituisce righe, qualunque cosa faccia il frontend);
2. **UI** — env `VITE_MODULES` (CSV di slug) nel build del frontend.

Slug disponibili: `gare`, `cantiere`, `automezzi`, `agenti`, `poliambulatori`.

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
   `deal-a-rischio-*` (pg_cron è nel compose).
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
11. **Seed demo** (solo istanze dimostrative): `seed_demo_moduli.sql`.

## Checklist di consegna (da eseguire a ogni installazione)

- [ ] login admin funziona; signup pubblico disabilitato
- [ ] operatore: 0 righe su fatture/incassi/tasse/HR via API
- [ ] moduli NON acquistati: 0 righe via API anche per l'admin
- [ ] (se agenti) utente-agente: vede solo i propri dati
- [ ] (se poliambulatori) segreteria: 0 righe su fascicolo/visite/referti
- [ ] scadenzari attivi (riga in cron.job) e notifiche in-app funzionanti
- [ ] backup notturno verificato con un restore di prova
- [ ] headers di sicurezza attivi sul dominio (CSP con l'URL dell'istanza)
- [ ] suite pgTAP verde contro l'istanza: `supabase test db`

## Upsell di un modulo

1 riga in `moduli_licenze` + rebuild del frontend con `VITE_MODULES`
aggiornata. Minuti, non giorni.
