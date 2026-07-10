import { test, expect } from '@playwright/test'

/**
 * F6 — feed realtime: l'utente è sul canale team; un messaggio inserito da
 * "un altro" (via il client supabase esposto, simulando una seconda sessione)
 * compare nel feed SENZA reload.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

test('canale team: messaggio inviato compare, e uno esterno arriva realtime', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  await page.goto('/team')
  await expect(page.getByTestId('feed-input')).toBeVisible()

  // 1. Invio un messaggio dalla UI
  const mio = `Ciao team ${Date.now()}`
  await page.getByTestId('feed-input').fill(mio)
  await page.getByTestId('feed-invia').click()
  await expect(page.getByText(mio)).toBeVisible({ timeout: 10_000 })

  // 2. Attendo che il canale realtime del feed sia 'joined'
  await expect
    .poll(() =>
      page.evaluate(() => {
        // @ts-expect-error client esposto per test
        return window.__supabase.realtime.channels.some(
          (c: { topic: string; state: string }) => c.topic.includes('messaggi-team') && c.state === 'joined',
        )
      }), { timeout: 15_000 })
    .toBe(true)

  // 3. Un messaggio inserito "da un'altra sessione" (stesso utente via client) arriva live
  const esterno = `Messaggio esterno ${Date.now()}`
  await page.evaluate(async (testo) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: u } = await sb.auth.getUser()
    await sb.from('messaggi').insert({ entita: 'team', autore_id: u.user.id, testo })
  }, esterno)

  await expect(page.getByText(esterno)).toBeVisible({ timeout: 10_000 })
})
