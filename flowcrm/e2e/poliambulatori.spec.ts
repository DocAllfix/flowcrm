import { test, expect } from '@playwright/test'

/**
 * MODULO POLIAMBULATORI — flusso core: creo un paziente (codice PAZ
 * auto) e registro un consenso. Gate GDPR: la segreteria (operatore)
 * riceve 0 righe da fascicolo/visite/referti via API.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

test('paziente: crea → consenso privacy', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  const cognome = `E2EPaz${String(Date.now()).slice(-6)}`
  await page.goto('/pazienti')
  await page.getByRole('button', { name: 'Nuovo paziente' }).first().click()
  await page.locator('#p-nome').fill('Piero')
  await page.locator('#p-cognome').fill(cognome)
  await page.getByRole('button', { name: 'Registra' }).click()

  const riga = page.locator('tbody tr', { hasText: cognome })
  await expect(riga).toBeVisible({ timeout: 10_000 })
  await expect(riga.locator('td').first()).toHaveText(/^PAZ-\d{4}-\d{4}$/)

  await riga.click()
  await expect(page).toHaveURL(/\/pazienti\/[0-9a-f-]+$/, { timeout: 10_000 })
  await page.getByRole('tab', { name: 'Consensi' }).click()
  await page.getByRole('button', { name: 'Registra firma' }).click()
  await expect(page.getByText('Privacy (GDPR)').first()).toBeVisible({ timeout: 10_000 })

  // Pulizia
  await page.evaluate(async (c) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    await sb.from('pazienti').delete().eq('cognome', c)
  }, cognome)
})

test('segreteria: contenuti clinici invisibili (GDPR)', async ({ page }) => {
  const OPER_EMAIL = process.env.E2E_OPER_EMAIL
  const OPER_PW = process.env.E2E_OPER_PASSWORD
  test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')

  await page.goto('/login')
  await page.getByTestId('login-email').fill(OPER_EMAIL!)
  await page.getByTestId('login-password').fill(OPER_PW!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  await page.goto('/pazienti')
  const clinica = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const cond = await sb.from('pazienti_condizioni').select('id', { count: 'exact', head: true })
    const vis = await sb.from('visite').select('id', { count: 'exact', head: true })
    const ref = await sb.from('referti').select('id', { count: 'exact', head: true })
    return { c: cond.count ?? 0, v: vis.count ?? 0, r: ref.count ?? 0 }
  })
  expect(clinica.c).toBe(0)
  expect(clinica.v).toBe(0)
  expect(clinica.r).toBe(0)
})
