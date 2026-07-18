import { test, expect } from '@playwright/test'

/**
 * MODULO CANTIERE — flusso core: creo un cantiere (codice CANT auto),
 * aggiungo una fase al cronoprogramma e registro il rapportino del
 * giorno. Gate operatore: zero SAL via API. Richiede modulo attivo.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

test('cantiere: crea → fase → rapportino', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  const nome = `E2E Cantiere ${Date.now()}`
  await page.goto('/cantieri')
  await page.getByRole('button', { name: 'Nuovo cantiere' }).first().click()
  await page.locator('#c-den').fill(nome)
  await page.locator('#c-impc').fill('300000')
  await page.getByRole('button', { name: 'Crea cantiere' }).click()

  const riga = page.locator('tbody tr', { hasText: nome })
  await expect(riga).toBeVisible({ timeout: 10_000 })
  await expect(riga.locator('td').first()).toHaveText(/^CANT-\d{4}-\d{4}$/)

  await riga.click()
  await expect(page).toHaveURL(/\/cantieri\/[0-9a-f-]+$/, { timeout: 10_000 })

  // Fase del cronoprogramma
  await page.getByRole('tab', { name: 'Cronoprogramma' }).click()
  await page.getByPlaceholder('Es. Scavi e fondazioni').fill('Fase E2E scavi')
  await page.getByRole('button', { name: 'Aggiungi fase' }).click()
  await expect(page.getByText('Fase E2E scavi').first()).toBeVisible({ timeout: 10_000 })

  // Rapportino giornaliero
  await page.getByRole('tab', { name: 'Rapportini' }).click()
  await page.getByRole('button', { name: 'Rapportino di oggi' }).click()
  await page.locator('#r-lav').fill('Lavorazioni E2E: scavo fondazioni')
  await page.getByRole('button', { name: 'Registra' }).click()
  await expect(page.getByText('Lavorazioni E2E: scavo fondazioni')).toBeVisible({ timeout: 10_000 })

  // Pulizia
  await page.evaluate(async (n) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    await sb.from('cantieri').delete().eq('denominazione', n)
  }, nome)
})

test('operatore: contabilità di cantiere invisibile', async ({ page }) => {
  const OPER_EMAIL = process.env.E2E_OPER_EMAIL
  const OPER_PW = process.env.E2E_OPER_PASSWORD
  test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')

  await page.goto('/login')
  await page.getByTestId('login-email').fill(OPER_EMAIL!)
  await page.getByTestId('login-password').fill(OPER_PW!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  await page.goto('/cantieri')
  const conteggi = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const sal = await sb.from('cantiere_sal').select('id', { count: 'exact', head: true })
    const costi = await sb.from('cantiere_costi').select('id', { count: 'exact', head: true })
    return { sal: sal.count ?? 0, costi: costi.count ?? 0 }
  })
  expect(conteggi.sal).toBe(0)
  expect(conteggi.costi).toBe(0)
})
