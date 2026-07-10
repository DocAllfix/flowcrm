import { test, expect } from '@playwright/test'

/**
 * F5 — attività: creo un deal, aggiungo un task dalla sua timeline,
 * verifico che compaia nella timeline del deal.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

test('task creato dalla timeline del deal vi compare', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  // Crea un deal dal Kanban
  await page.goto('/kanban')
  const nomeDeal = `E2E Att ${Date.now()}`
  await page.getByRole('button', { name: 'Nuovo deal' }).click()
  await page.getByTestId('deal-nome').fill(nomeDeal)
  await page.getByTestId('deal-salva').click()

  // Apri il dettaglio del deal
  await expect(page.getByText(nomeDeal)).toBeVisible({ timeout: 10_000 })
  await page.getByText(nomeDeal).click()
  await expect(page).toHaveURL(/\/deal\/[0-9a-f-]+$/, { timeout: 10_000 })

  // Tab Attività → aggiungi un task
  const titoloTask = `Follow-up ${Date.now()}`
  await page.getByTestId('timeline-aggiungi').click()
  await page.getByTestId('attivita-titolo').fill(titoloTask)
  await page.getByTestId('attivita-salva').click()

  // Il task compare nella timeline
  await expect(page.getByText(titoloTask)).toBeVisible({ timeout: 10_000 })
})
