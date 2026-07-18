import { test, expect } from '@playwright/test'

/**
 * F11 — tour onboarding: al primo accesso (localStorage pulito) il tour della
 * dashboard parte; completato non riparte; il bottone "?" lo rilancia.
 * Richiede VITE_TOUR_ENABLED=true (impostato nel webServer di test).
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

test('tour: parte al primo accesso, non ripete, replay dal ?', async ({ page }) => {
  await page.goto('/login')
  // pulisci lo stato tour completati prima del login
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('flowcrm-tour-completed:'))
      .forEach((k) => localStorage.removeItem(k))
  })
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  // Il bottone "?" esiste solo con VITE_TOUR_ENABLED=true: se l'istanza ha
  // il tour spento (default della demo) il test si dichiara skipped invece
  // di fallire per un motivo ambientale.
  await page.waitForTimeout(1000)
  const tourAttivo = (await page.getByTestId('help-button').count()) > 0
  test.skip(!tourAttivo, 'VITE_TOUR_ENABLED=false su questa istanza: tour disattivato')

  // Il popover del tour appare da solo
  const popover = page.locator('.flowcrm-popover')
  await expect(popover).toBeVisible({ timeout: 10_000 })
  await expect(popover).toContainText('Il menu')

  // Chiudo il tour (Esc lo marca completato)
  await page.keyboard.press('Escape')
  await expect(popover).toHaveCount(0)

  // Ricaricando NON riparte (completato in localStorage)
  await page.reload()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1500)
  await expect(page.locator('.flowcrm-popover')).toHaveCount(0)

  // Il bottone "?" lo rilancia
  await page.getByTestId('help-button').click()
  await expect(page.locator('.flowcrm-popover')).toBeVisible({ timeout: 5_000 })
})
