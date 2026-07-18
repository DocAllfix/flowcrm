import { test, expect } from '@playwright/test'

/**
 * F3 — notifica realtime: l'admin è loggato; una notifica generata dal
 * trigger delle approvazioni (richiesta → approvata notifica il richiedente)
 * deve comparire nel badge/pannello SENZA reload, via Supabase Realtime.
 *
 * Non si chiama crea_notifica() direttamente: l'hardening la revoca ai
 * client (le notifiche nascono solo dai trigger SECURITY DEFINER). Il
 * percorso legittimo più corto è il workflow approvazioni dei moduli.
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

  // Workflow approvazioni: richiesta creata e approvata da se stesso.
  // Il trigger notifica il richiedente ("Richiesta approvata") → realtime.
  const descrizione = `Verifica realtime ${Date.now()}`
  const approvazioneId = await page.evaluate(async (desc) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: u } = await sb.auth.getUser()
    const { data: riga, error: e1 } = await sb.from('approvazioni').insert({
      modulo: 'gare', entita: 'gare',
      entita_id: crypto.randomUUID(),
      tipo_richiesta: 'verifica_e2e', descrizione: desc,
      richiedente_id: u.user.id,
    }).select('id').single()
    if (e1) throw new Error(e1.message)
    const { error: e2 } = await sb.from('approvazioni')
      .update({ stato: 'approvata' }).eq('id', riga.id)
    if (e2) throw new Error(e2.message)
    return riga.id
  }, descrizione)

  // Il badge contatore deve comparire senza reload (entro pochi secondi).
  const badge = page.getByTestId('notifiche-badge').locator('span')
  await expect(badge).toBeVisible({ timeout: 10_000 })

  // Aprendo il pannello si vede la notifica di approvazione.
  await page.getByTestId('notifiche-badge').click()
  await expect(page.getByText(descrizione).first()).toBeVisible({ timeout: 10_000 })

  // Pulizia: la richiesta di verifica non resta nel DB demo.
  await page.evaluate(async (id) => {
    // @ts-expect-error client esposto per test
    await window.__supabase.from('approvazioni').delete().eq('id', id)
  }, approvazioneId)
})
