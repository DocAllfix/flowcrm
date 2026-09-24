import { defineConfig } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'

/**
 * ⛔ Mai contro il database della DEMO (GUASTI G-35). Le suite creano record
 * («E2E Kanban 1784…») e gli account di test sono manutentori, quindi la sola
 * lettura non le ferma: sono finiti davanti ai potenziali clienti.
 *
 * Il percorso era sottile: il webServer qui sotto ripiega su localhost, ma con
 * `reuseExistingServer` Playwright RIUSA un `npm run dev` già acceso, che legge
 * `.env.local`, e `.env.local` di sviluppo punta alla demo. Per questo si
 * controllano entrambe le fonti. Chi deve davvero girare sulla demo lo dichiara
 * con E2E_CONSENTI_DEMO=1.
 */
const RIF_DEMO = 'ozwqvriqhkckzxcumelr'
const urlDaEnvLocale = existsSync('.env.local')
  ? (readFileSync('.env.local', 'utf8').match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1] ?? '')
  : ''
if (
  process.env.E2E_CONSENTI_DEMO !== '1' &&
  [process.env.VITE_SUPABASE_URL ?? '', urlDaEnvLocale].some((u) => u.includes(RIF_DEMO))
) {
  throw new Error(
    'e2e rifiutati: il bersaglio è il database della DEMO (vedi GUASTI G-35). ' +
      'Usa lo stack locale (supabase start) oppure imposta E2E_CONSENTI_DEMO=1 sapendo cosa fai.',
  )
}

/**
 * Smoke E2E per modulo (piramide test centrata su pgTAP: qui solo
 * percorsi felici e guard di ruolo, non logica di business).
 *
 * Il webServer usa credenziali Supabase fittizie: i test F0 verificano
 * solo il render della UI senza rete. I test con login reale (da F1)
 * leggeranno le env da .env.local.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  // 1 retry assorbe i flake ambientali dei test realtime/drag sotto carico
  // parallelo (un fallimento reale fallisce due volte).
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL:
        process.env.VITE_SUPABASE_URL ?? 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY:
        process.env.VITE_SUPABASE_ANON_KEY ?? 'test-anon-key-placeholder',
      VITE_TOUR_ENABLED: process.env.VITE_TOUR_ENABLED ?? 'false',
    },
  },
})
