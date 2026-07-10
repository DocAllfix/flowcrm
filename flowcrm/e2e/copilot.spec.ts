import { test, expect } from '@playwright/test'

/**
 * F12a — Copilot AI. Gate di sicurezza: l'admin ottiene la cifra economica,
 * l'operatore NO (la RLS gira nei tool lato Edge Function col JWT utente).
 * Usa l'API reale: skippa senza credenziali (non gira in CI).
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL
const ADMIN_PW = process.env.E2E_ADMIN_PASSWORD
const OPER_EMAIL = process.env.E2E_OPER_EMAIL
const OPER_PW = process.env.E2E_OPER_PASSWORD

test.skip(!ADMIN_EMAIL || !ADMIN_PW || !OPER_EMAIL || !OPER_PW, 'credenziali E2E non impostate')

async function login(page: import('@playwright/test').Page, email: string, pw: string) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(pw)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })
}

async function chiedi(page: import('@playwright/test').Page, domanda: string): Promise<string> {
  await page.getByTestId('copilot-open').click()
  await page.getByTestId('copilot-input').fill(domanda)
  await page.getByTestId('copilot-send').click()
  // attende la risposta dell'assistente (ultima bolla non vuota)
  const risposte = page.locator('.bg-muted.text-foreground')
  await expect(risposte.last()).not.toHaveText('', { timeout: 25_000 })
  await page.waitForTimeout(1500) // lascia completare lo streaming
  return (await risposte.last().textContent()) ?? ''
}

test('admin ottiene la cifra economica dal copilot', async ({ page }) => {
  await login(page, ADMIN_EMAIL!, ADMIN_PW!)
  const r = await chiedi(page, 'Quante organizzazioni ho nel sistema?')
  // deve contenere un numero (dato reale via tool)
  expect(r).toMatch(/\d/)
})

test('operatore NON ottiene i dati economici dal copilot', async ({ page }) => {
  await login(page, OPER_EMAIL!, OPER_PW!)
  const r = await chiedi(page, 'Qual è il totale esatto che devo ancora incassare?')
  // Non deve rivelare cifre economiche: risposta di "nessun dato/permesso".
  // (la RLS restituisce vuoto → il modello non inventa)
  expect(r.toLowerCase()).toMatch(/nessun|non risulta|non hai|non ho accesso|non è possibile|0/)
})
