import { test, expect } from '@playwright/test'

/**
 * MODULO AUTOMEZZI — flusso core: registro un mezzo (codice AUTO auto),
 * un rifornimento con km che aggiorna il contachilometri, e verifico
 * il gate operatore su costi e patenti (0 righe via API).
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

test('automezzo: crea → rifornimento aggiorna km', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  const targa = `E2E${String(Date.now()).slice(-6)}`
  await page.goto('/automezzi')
  await page.getByRole('button', { name: 'Nuovo mezzo' }).first().click()
  await page.locator('#a-targa').fill(targa)
  await page.locator('#a-marca').fill('Fiat')
  await page.locator('#a-modello').fill('Ducato E2E')
  await page.locator('#a-km').fill('10000')
  await page.getByRole('button', { name: 'Registra' }).click()

  const riga = page.locator('tbody tr', { hasText: targa })
  await expect(riga).toBeVisible({ timeout: 10_000 })

  await riga.click()
  await expect(page).toHaveURL(/\/automezzi\/[0-9a-f-]+$/, { timeout: 10_000 })

  // Rifornimento con km superiore → contachilometri aggiornato
  await page.getByRole('tab', { name: 'Rifornimenti' }).click()
  const form = page.locator('form').filter({ hasText: 'Litri' })
  await form.locator('input').nth(0).fill('50')
  await form.locator('input').nth(1).fill('90')
  await form.locator('input').nth(2).fill('10350')
  await page.getByRole('button', { name: 'Registra' }).click()
  await page.getByRole('tab', { name: 'Panoramica' }).click()
  await expect(page.getByText('10.350 km').first()).toBeVisible({ timeout: 10_000 })

  // Pulizia
  await page.evaluate(async (t) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    await sb.from('automezzi').delete().eq('targa', t)
  }, targa)
})

test('operatore: costi mezzo e patenti invisibili', async ({ page }) => {
  const OPER_EMAIL = process.env.E2E_OPER_EMAIL
  const OPER_PW = process.env.E2E_OPER_PASSWORD
  test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')

  await page.goto('/login')
  await page.getByTestId('login-email').fill(OPER_EMAIL!)
  await page.getByTestId('login-password').fill(OPER_PW!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  await page.goto('/automezzi')
  const conteggi = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const costi = await sb.from('automezzi_costi').select('id', { count: 'exact', head: true })
    const patenti = await sb.from('dipendenti_patenti').select('id', { count: 'exact', head: true })
    return { costi: costi.count ?? 0, patenti: patenti.count ?? 0 }
  })
  expect(conteggi.costi).toBe(0)
  expect(conteggi.patenti).toBe(0)
})
