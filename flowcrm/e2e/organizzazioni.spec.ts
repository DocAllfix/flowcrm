import { test, expect } from '@playwright/test'

/**
 * F2 — flusso anagrafiche end-to-end contro l'istanza live.
 * Crea un'organizzazione con doppio ruolo, verifica i filtri, la scheda
 * 360° e la ricerca cmd+K. Salta se mancano le credenziali.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByText(/Ciao/)).toBeVisible({ timeout: 15_000 })
}

test('organizzazione con doppio ruolo: crea, filtra, scheda 360°, cmd+K', async ({ page }) => {
  await login(page)

  const nome = `E2E Rossi ${Date.now()}`

  await page.getByRole('link', { name: 'Organizzazioni' }).click()
  await page.getByRole('button', { name: 'Nuova' }).click()

  await page.getByLabel('Ragione sociale *').fill(nome)
  await page.getByLabel('Città').fill('Bologna')
  // Doppio ruolo: cliente + partner
  await page.getByRole('button', { name: 'Cliente', exact: true }).click()
  await page.getByRole('button', { name: 'Partner', exact: true }).click()
  await page.getByRole('button', { name: 'Salva' }).click()

  // Compare in tabella
  await expect(page.getByRole('cell', { name: nome })).toBeVisible({ timeout: 10_000 })

  // Filtro "Partner" → ancora presente
  await page.getByRole('button', { name: 'Partner', exact: true }).click()
  await expect(page.getByRole('cell', { name: nome })).toBeVisible()
  // Filtro "Fornitore" → assente
  await page.getByRole('button', { name: 'Fornitore', exact: true }).click()
  await expect(page.getByRole('cell', { name: nome })).toHaveCount(0)

  // Torna a "Tutte" e apri la scheda 360°
  await page.getByRole('button', { name: 'Tutte' }).click()
  await page.getByRole('cell', { name: nome }).click()
  await expect(page.getByRole('heading', { name: nome })).toBeVisible()
  await expect(page.getByText('Cliente')).toBeVisible()
  await expect(page.getByText('Partner')).toBeVisible()

  // cmd+K trova l'organizzazione
  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Cerca organizzazioni e contatti…').fill('Bologna')
  await expect(page.getByText(nome)).toBeVisible({ timeout: 10_000 })
})
