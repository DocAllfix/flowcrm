import { test, expect } from '@playwright/test'

/**
 * F1 — login end-to-end reale contro l'istanza Supabase live.
 * Credenziali passate via env (mai hardcoded). Salta se assenti.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

test('admin: login → dashboard → menu admin visibile', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()

  // Redirect alla dashboard dopo login
  await expect(page).toHaveURL(/\/$|\/$/, { timeout: 15_000 })
  await expect(page.getByText(/Ciao/)).toBeVisible({ timeout: 15_000 })

  // Un admin vede la voce "Gestione utenti"
  await expect(page.getByRole('link', { name: 'Gestione utenti' })).toBeVisible()
})
