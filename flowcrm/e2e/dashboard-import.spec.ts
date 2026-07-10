import { test, expect } from '@playwright/test'

/**
 * F9 — dashboard operativa renderizza + import CSV organizzazioni con scarti.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })
}

test('dashboard operativa mostra i KPI', async ({ page }) => {
  await login(page)
  // Testi univoci della dashboard (non presenti nel menu)
  await expect(page.getByText('Deal aperti')).toBeVisible()
  await expect(page.getByText('Commesse attive')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pipeline pesata' })).toBeVisible()
})

test('import CSV: righe valide importate, riga senza ragione scartata', async ({ page }) => {
  await login(page)
  await page.goto('/importa')

  const marker = Date.now()
  const csv = `ragione_sociale,piva,citta
Alfa ${marker} SRL,11111111111,Milano
,22222222222,Roma
Beta ${marker} SPA,33333333333,Torino`

  // Carica il file CSV da buffer
  await page.getByTestId('import-file').setInputFiles({
    name: 'org.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf-8'),
  })

  // Il mapping auto ha riconosciuto ragione_sociale → conferma import
  await page.getByTestId('import-conferma').click()

  // Esito: 2 importate (la riga senza ragione sociale è scartata)
  await expect(page.getByTestId('import-esito')).toHaveText(/2 importate/, { timeout: 10_000 })
  await expect(page.getByText(/1 scarti/)).toBeVisible()
})
