import { test, expect } from '@playwright/test'

/**
 * MODULO GARE — flusso core: creo una gara (codice GARA-AAAA-NNNN
 * automatico), aggiungo un requisito, la porto ad Aggiudicata dal
 * dettaglio e verifico la sezione "Avvio commessa" e la card nel Kanban.
 * Richiede VITE_MODULES con 'gare' e licenza attiva sull'istanza.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

test('gara: crea → requisito → aggiudicata → kanban', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  // Crea la gara
  const titolo = `E2E Gara ${Date.now()}`
  await page.goto('/gare')
  await page.getByRole('button', { name: 'Nuova gara' }).first().click()
  await page.locator('#g-titolo').fill(titolo)
  await page.locator('#g-importo').fill('120000')
  const termine = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 16)
  await page.locator('#g-term').fill(termine)
  await page.getByRole('button', { name: 'Crea gara' }).click()

  // In lista con codice GARA-AAAA-NNNN
  const riga = page.locator('tbody tr', { hasText: titolo })
  await expect(riga).toBeVisible({ timeout: 10_000 })
  await expect(riga.locator('td').first()).toHaveText(/^GARA-\d{4}-\d{4}$/)

  // Dettaglio: requisito
  await riga.click()
  await expect(page).toHaveURL(/\/gare\/[0-9a-f-]+$/, { timeout: 10_000 })
  await page.getByRole('tab', { name: 'Requisiti' }).click()
  await page.getByPlaceholder('Es. Fatturato minimo triennio € 1M').fill('Requisito E2E SOA')
  await page.getByRole('button', { name: 'Aggiungi' }).last().click()
  await expect(page.getByText('Requisito E2E SOA')).toBeVisible({ timeout: 10_000 })

  // Stato → Aggiudicata dal selettore nell'header della scheda
  await page.locator('div.mb-6 button[role="combobox"]').first().click()
  await page.getByRole('option', { name: 'Aggiudicata', exact: true }).click()
  await page.getByRole('tab', { name: 'Panoramica' }).click()
  await expect(page.getByText('Avvio commessa')).toBeVisible({ timeout: 10_000 })

  // La card sta nella colonna Aggiudicata del Kanban
  await page.goto('/gare-kanban')
  await expect(page.locator('[data-tour="gare-kanban"] > div')).toHaveCount(6)
  await expect(page.getByText(titolo)).toBeVisible({ timeout: 10_000 })

  // Pulizia: elimina la gara di test via client (admin)
  await page.evaluate(async (t) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    await sb.from('gare').delete().eq('titolo', t)
  }, titolo)
})

test('operatore non vede l\'offerta economica', async ({ page }) => {
  const OPER_EMAIL = process.env.E2E_OPER_EMAIL
  const OPER_PW = process.env.E2E_OPER_PASSWORD
  test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')

  await page.goto('/login')
  await page.getByTestId('login-email').fill(OPER_EMAIL!)
  await page.getByTestId('login-password').fill(OPER_PW!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  // L'API diretta non restituisce righe di gare_offerte_economiche
  await page.goto('/gare')
  const nOfferte = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { count } = await sb.from('gare_offerte_economiche')
      .select('id', { count: 'exact', head: true })
    return count ?? 0
  })
  expect(nOfferte).toBe(0)
})
