import { test, expect } from '@playwright/test'

/**
 * F3 — notifica realtime: l'admin è loggato; una notifica creata via RPC
 * (crea_notifica) deve comparire nel badge/pannello SENZA reload, grazie
 * al canale Supabase Realtime.
 *
 * Non servono due browser: la seconda "sessione" è la RPC lato server che
 * inserisce la notifica per l'utente loggato (via anon key + service? no:
 * usiamo la sessione dell'utente stesso chiamando la RPC dal client).
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

test('notifica realtime: appare nel badge senza reload', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  // Svuota le notifiche preesistenti: così il badge-count segnala DAVVERO
  // l'arrivo della nuova (evita flake da notifiche residue di altri test).
  await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: u } = await sb.auth.getUser()
    await sb.from('notifiche').delete().eq('destinatario_id', u.user.id)
  })

  // Attende che il canale realtime sia 'joined' PRIMA di creare la notifica,
  // altrimenti l'INSERT arriverebbe prima della subscription e andrebbe perso.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          // @ts-expect-error client esposto per test
          const sb = window.__supabase
          return sb.realtime.channels.some(
            (c: { topic: string; state: string }) =>
              c.topic.includes('notifiche-user') && c.state === 'joined',
          )
        }),
      { timeout: 15_000 },
    )
    .toBe(true)

  // Crea una notifica per SE STESSO via RPC, usando il client supabase della pagina.
  const titolo = `Realtime ${Date.now()}`
  await page.evaluate(async (t) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: u } = await sb.auth.getUser()
    await sb.rpc('crea_notifica', {
      p_destinatario_id: u.user.id,
      p_tipo: 'success',
      p_titolo: t,
      p_messaggio: 'Consegnata in tempo reale',
    })
  }, titolo)

  // Il badge contatore deve comparire senza reload (entro pochi secondi).
  const badge = page.getByTestId('notifiche-badge').locator('span')
  await expect(badge).toBeVisible({ timeout: 10_000 })

  // Aprendo il pannello si vede la notifica.
  await page.getByTestId('notifiche-badge').click()
  await expect(page.getByText(titolo)).toBeVisible({ timeout: 10_000 })
})
