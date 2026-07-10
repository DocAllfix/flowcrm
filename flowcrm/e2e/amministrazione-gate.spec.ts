import { test, expect } from '@playwright/test'

/**
 * F8 — GATE RLS: un operatore non deve avere ALCUN accesso ai dati economici.
 * Verifica su tre livelli: menu nascosto, URL diretto → redirect, e — la prova
 * decisiva — il client Supabase dell'operatore riceve ZERO righe (RLS lato DB),
 * non solo un DOM nascosto.
 */
const OPER_EMAIL = process.env.E2E_OPER_EMAIL
const OPER_PW = process.env.E2E_OPER_PASSWORD

test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')

test('operatore: nessun accesso al modulo amministrazione', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(OPER_EMAIL!)
  await page.getByTestId('login-password').fill(OPER_PW!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  // 1. Le voci di menu amministrazione NON esistono
  await expect(page.getByRole('link', { name: 'Registro fatture' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Incassi previsti' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Scadenze tasse' })).toHaveCount(0)
  // (e nemmeno "Gestione utenti", che è admin-only)
  await expect(page.getByRole('link', { name: 'Gestione utenti' })).toHaveCount(0)

  // 2. Accesso diretto via URL → redirect alla home
  await page.goto('/fatture')
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
  await page.goto('/incassi')
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })

  // 3. LA PROVA DECISIVA: il client Supabase dell'operatore riceve 0 righe
  //    dalle tabelle economiche — la RLS, non la UI, è la barriera.
  const risultati = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const fatture = await sb.from('fatture').select('id')
    const incassi = await sb.from('scadenze_pagamento').select('id')
    const tasse = await sb.from('scadenze_tasse').select('id')
    return {
      fatture: fatture.data?.length ?? -1,
      incassi: incassi.data?.length ?? -1,
      tasse: tasse.data?.length ?? -1,
    }
  })
  expect(risultati.fatture).toBe(0)
  expect(risultati.incassi).toBe(0)
  expect(risultati.tasse).toBe(0)
})
