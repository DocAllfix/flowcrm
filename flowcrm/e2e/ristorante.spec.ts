import { test, expect, type Page } from '@playwright/test'

/**
 * MODULO RISTORANTE — il servizio da capo a fondo, come lo fa la sala:
 * prodotto nel catalogo → tavolo aperto dalla mappa → ordine con il primo
 * trattenuto → cucina che prepara → marcia dei primi → cassa → conto chiuso
 * e tavolo di nuovo libero. Poi l'operatore: vede la cucina, non l'analisi
 * economica, non crea prodotti.
 *
 * Gira sullo stack locale con la licenza `ristorante` attiva (vedi CI).
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

async function entra(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })
}

test('servizio completo: tavolo → comanda → cucina → cassa', async ({ page }) => {
  test.setTimeout(120_000)
  await entra(page, EMAIL!, PASSWORD!)
  const suffisso = String(Date.now()).slice(-6)

  // Primo accesso: configurazione guidata del locale.
  await page.goto('/ristorante/sala')
  // Si aspetta la pagina pronta: o la configurazione guidata o il titolo (isVisible non attende).
  const configura = page.getByRole('button', { name: 'Configura il locale' })
  await expect(configura.or(page.getByRole('heading', { name: 'Sala', exact: true }))).toBeVisible({ timeout: 20_000 })
  if (await configura.isVisible()) {
    await configura.click()
    await page.locator('#cl-nome').fill(`Trattoria E2E ${suffisso}`)
    await page.locator('#cl-sale').fill('Sala')
    await page.locator('#cl-tavoli').fill('4')
    await page.getByRole('button', { name: 'Crea il locale' }).click()
    await expect(page.getByRole('heading', { name: 'Sala' })).toBeVisible({ timeout: 15_000 })
  }

  // Un piatto nuovo, con costo a mano.
  const piatto = `Spaghetti E2E ${suffisso}`
  await page.goto('/ristorante/catalogo')
  await page.getByRole('button', { name: 'Nuovo prodotto' }).click()
  await page.locator('#pd-nome').fill(piatto)
  await page.getByRole('combobox', { name: 'Categoria' }).click()
  await page.getByRole('option', { name: 'Primi', exact: true }).first().click()
  await page.locator('#pd-prezzo').fill('12')
  await page.locator('#pd-costo').fill('3')
  await page.getByRole('button', { name: 'Crea', exact: true }).click()
  await expect(page.getByRole('row', { name: new RegExp(piatto) })).toBeVisible({ timeout: 10_000 })

  // Tavolo libero dalla mappa → comanda.
  await page.goto('/ristorante/sala')
  const libero = page.getByRole('button', { name: /^Tavolo .*, libero,/ }).first()
  await expect(libero).toBeVisible({ timeout: 10_000 })
  await libero.click()
  await page.locator('#pt-coperti').fill('2')
  await page.getByRole('button', { name: 'Apri la comanda' }).click()
  await expect(page).toHaveURL(/\/ristorante\/comande\/[0-9a-f-]+$/, { timeout: 10_000 })
  const urlComanda = page.url()

  await page.getByRole('textbox', { name: 'Cerca prodotto' }).fill(piatto)
  await page.locator('section[aria-label="Prodotti"] button', { hasText: piatto }).click()
  await page.locator('section[aria-label="Prodotti"] button', { hasText: piatto }).click()
  await page.getByRole('button', { name: /^Invia 2 piatti/ }).click()
  await expect(page.getByText('Da preparare').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('24,00 €').first()).toBeVisible()

  // Cucina: presa in carico → preparazione → pronto.
  await page.goto('/ristorante/cucina')
  const scheda = page.locator('section li button', { hasText: piatto }).first()
  await expect(scheda).toBeVisible({ timeout: 10_000 })
  for (const azione of ['Prendi', 'Inizia', 'Pronto']) {
    await expect(page.locator('section li button', { hasText: piatto }).filter({ hasText: azione }).first()).toBeVisible({ timeout: 10_000 })
    await page.locator('section li button', { hasText: piatto }).filter({ hasText: azione }).first().click()
  }
  await expect(page.locator('section[aria-label="Pronti"] li button', { hasText: piatto })).toBeVisible({ timeout: 10_000 })

  // Cassa: pagamento del residuo e chiusura.
  await page.goto(urlComanda)
  await page.getByRole('link', { name: 'Conto e pagamento' }).click()
  await expect(page).toHaveURL(/\/ristorante\/cassa\?conto=/)
  await page.getByRole('button', { name: /^Registra/ }).click()
  await expect(page.getByText('Conto saldato.')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Chiudi il conto' }).click()
  await expect(page.getByText('Conto chiuso')).toBeVisible({ timeout: 10_000 })

  // La comanda è chiusa.
  await page.goto(urlComanda)
  await expect(page.getByText(/Comanda chiusa/)).toBeVisible({ timeout: 10_000 })
})

test('operatore: cucina sì, analisi economica e catalogo in scrittura no', async ({ page }) => {
  const OPER_EMAIL = process.env.E2E_OPER_EMAIL
  const OPER_PW = process.env.E2E_OPER_PASSWORD
  test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')
  await entra(page, OPER_EMAIL!, OPER_PW!)

  await page.goto('/ristorante/cucina')
  await expect(page.getByRole('heading', { name: /Cucina/ })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('link', { name: 'Analisi' })).toHaveCount(0)

  await page.goto('/ristorante/analisi')
  await expect(page).not.toHaveURL(/\/ristorante\/analisi/, { timeout: 10_000 })

  const esito = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: auth } = await sb.auth.getUser()
    const { data: cat } = await sb.from('fb_categorie').select('id').limit(1)
    const { error } = await sb.from('fb_prodotti').insert({ nome: 'Abusivo', categoria_id: cat?.[0]?.id, created_by: auth.user.id })
    const { error: kpi } = await sb.rpc('fb_kpi', { p_locale: '00000000-0000-0000-0000-000000000000', p_dal: '2026-01-01', p_al: '2026-01-31' })
    return { prodotto: error?.code ?? null, kpi: kpi?.code ?? null }
  })
  expect(esito.prodotto).toBe('42501')
  expect(esito.kpi).toBe('42501')
})
