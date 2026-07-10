import { test, expect } from '@playwright/test'

/**
 * Gate F0 — smoke: l'app builda, il router funziona, la pagina di
 * login renderizza con i suoi campi. Nessuna chiamata di rete reale.
 */
test('la pagina di login renderizza', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByTestId('login-email')).toBeVisible()
  await expect(page.getByTestId('login-password')).toBeVisible()
  await expect(page.getByTestId('login-submit')).toBeVisible()
})

test('rotta protetta senza sessione → redirect a /login', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByTestId('login-submit')).toBeVisible()
})
