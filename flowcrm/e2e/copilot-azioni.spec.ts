import { test, expect } from '@playwright/test'

/**
 * F12b — azioni con conferma. Chiedere di creare un task fa apparire una card
 * di PROPOSTA (nessuna scrittura). Solo dopo "Conferma" il task viene creato.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'credenziali E2E non impostate')
// Il copilot richiede le credenziali Azure OpenAI nelle Edge Functions:
// senza, la funzione risponde errore e il test fallirebbe per un motivo
// che non riguarda il codice. Si salta in modo esplicito invece di
// lasciare un rosso che si impara a ignorare.
test.skip(!process.env.E2E_COPILOT, 'copilot non configurato (E2E_COPILOT assente)')

test('copilot propone un task e lo crea SOLO dopo conferma', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  const titolo = `E2E Copilot ${Date.now()}`
  await page.getByTestId('copilot-open').click()
  await page.getByTestId('copilot-input').fill(`creami un task intitolato "${titolo}" per domani`)
  await page.getByTestId('copilot-send').click()

  // Appare la proposta, NON è ancora creato nulla
  const card = page.getByTestId('copilot-proposta')
  await expect(card).toBeVisible({ timeout: 25_000 })
  await expect(card).toContainText(titolo)

  // Confermo → il task viene creato e compare "Le mie attività"
  await page.getByTestId('copilot-conferma').click()
  await expect(page.getByText('Attività creata')).toBeVisible({ timeout: 10_000 })

  await page.goto('/attivita')
  await expect(page.getByText(titolo)).toBeVisible({ timeout: 10_000 })
})
