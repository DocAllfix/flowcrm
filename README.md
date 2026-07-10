# FlowCRM

CRM e controllo di gestione per micro e piccole imprese di servizi italiane (1–15 utenti), distribuito come **istanza privata per cliente** (un progetto Supabase dedicato per ciascun cliente).

## Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security, Storage, Realtime, Edge Functions)
- **Test**: Vitest (unit), Playwright (end-to-end), pgTAP (RLS e trigger sul database)

## Struttura

L'applicazione è nella cartella [`flowcrm/`](flowcrm/).

```
flowcrm/
├── src/                 # applicazione React
├── supabase/
│   ├── migrations/      # schema, RLS, funzioni, trigger
│   ├── functions/       # Edge Functions
│   └── tests/           # test pgTAP
└── tests/               # end-to-end Playwright
```

## Sviluppo

```bash
cd flowcrm
cp .env.example .env.local   # inserire URL e anon key dell'istanza Supabase
npm install
npm run dev
```

## Test

```bash
cd flowcrm
npx tsc -b            # typecheck
npx vitest run        # unit
npx playwright test   # end-to-end
npx supabase test db  # pgTAP (RLS/trigger)
```

## Moduli

Anagrafiche (organizzazioni, contatti) · vendite (pipeline configurabili e Kanban) · attività e timeline · progetti e commesse · amministrazione (fatture attive e passive, incassi, scadenze fiscali) · dashboard · notifiche realtime · allegati · assistente conversazionale.

## Ruoli

| Ruolo | Accesso |
|---|---|
| admin | tutto, inclusi utenti e impostazioni |
| manager | tutto tranne gestione utenti/impostazioni e cancellazioni definitive |
| operatore | CRM, vendite, attività, progetti — nessun accesso al modulo amministrazione |

L'enforcement dei permessi è nel database (RLS Postgres), non nel frontend.
