import { test, expect } from '@playwright/test'

/**
 * F8 — flusso admin: registro una fattura attiva e verifico che compaia nel
 * registro e che generi automaticamente l'incasso previsto.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

test('admin: fattura attiva → registro + incasso generato', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  // Serve un'organizzazione
  const org = `Cliente Fatt ${Date.now()}`
  await page.evaluate(async (nome) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: u } = await sb.auth.getUser()
    await sb.from('organizzazioni').insert({ ragione_sociale: nome, created_by: u.user.id })
  }, org)

  // Registro fatture → nuova fattura
  await page.goto('/fatture')
  const numero = `E2E-${Date.now()}`
  await page.getByRole('button', { name: 'Nuova fattura' }).click()
  await page.getByTestId('fattura-numero').fill(numero)
  await page.locator('#scadenza').fill('2026-12-31')
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: org }).click()
  await page.locator('#imponibile').fill('1000')
  await page.getByTestId('fattura-salva').click()

  // La fattura compare nel registro
  await expect(page.getByText(numero)).toBeVisible({ timeout: 10_000 })

  // L'incasso previsto è stato generato automaticamente
  await page.goto('/incassi')
  await expect(page.getByText(`Incasso fattura ${numero}`)).toBeVisible({ timeout: 10_000 })
})
