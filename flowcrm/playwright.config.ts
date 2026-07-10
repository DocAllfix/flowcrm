import { defineConfig } from '@playwright/test'

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
