import { test, expect, type Page } from '@playwright/test'

/**
 * MODULO BAR — il banco da capo a fondo: un caffè nel catalogo → convenzione
 * con un'azienda e un dipendente autorizzato → ordine al banco per il
 * dipendente → postazione del caffè che lo prepara e lo consegna → addebito
 * all'azienda alla cassa → fattura periodica. Poi l'operatore: vede il banco,
 * non l'analisi, non crea convenzioni e non emette fatture.
 *
 * Gira sullo stack locale con la licenza `bar` attiva (vedi CI).
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

async function scegli(page: Page, etichetta: string, voce: string | RegExp) {
  await page.getByRole('combobox', { name: etichetta }).click()
  await page.getByRole('option', { name: voce }).first().click()
}

test('banco: convenzione → ordine → postazione → addebito all\'azienda → fattura', async ({ page }) => {
  test.setTimeout(150_000)
  await entra(page, EMAIL!, PASSWORD!)
  const suffisso = String(Date.now()).slice(-6)

  // Primo accesso: configurazione guidata del bar.
  await page.goto('/bar/banco')
  const configura = page.getByRole('button', { name: 'Configura il locale' })
  if (await configura.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await configura.click()
    await page.locator('#cl-nome').fill(`Bar E2E ${suffisso}`)
    await page.locator('#cl-sale').fill('Sala, Banco')
    await page.locator('#cl-tavoli').fill('3')
    await page.getByRole('button', { name: 'Crea il locale' }).click()
    await expect(page.getByRole('heading', { name: 'Banco' })).toBeVisible({ timeout: 15_000 })
  }

  // Un caffè nel catalogo: va alla macchina del caffè.
  const caffe = `Caffè E2E ${suffisso}`
  await page.goto('/bar/catalogo')
  await page.getByRole('button', { name: 'Nuovo prodotto' }).click()
  await page.locator('#pd-nome').fill(caffe)
  await scegli(page, 'Categoria', 'Caffetteria')
  await page.locator('#pd-prezzo').fill('1,50')
  await page.locator('#pd-costo').fill('0,20')
  await page.getByRole('button', { name: 'Crea', exact: true }).click()
  await expect(page.getByRole('row', { name: new RegExp(caffe) })).toBeVisible({ timeout: 10_000 })

  // L'azienda vicina, in anagrafica.
  const azienda = `Uffici E2E ${suffisso} SRL`
  const creata = await page.evaluate(async (nome) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: auth } = await sb.auth.getUser()
    const { error } = await sb.from('organizzazioni').insert({ ragione_sociale: nome, created_by: auth.user.id })
    return error?.message ?? null
  }, azienda)
  expect(creata).toBeNull()

  // Convenzione con limite giornaliero e un dipendente autorizzato.
  await page.goto('/bar/convenzioni')
  await page.getByRole('button', { name: /Nuova convenzione|Crea la prima/ }).first().click()
  await scegli(page, 'Azienda', azienda)
  await page.locator('#cv-dg').fill('10')
  await page.getByRole('button', { name: 'Crea la convenzione' }).click()
  await expect(page.getByRole('heading', { name: azienda })).toBeVisible({ timeout: 10_000 })
  const dipendente = `Marta E2E ${suffisso}`
  await page.locator('#cd-nome').fill(dipendente)
  await page.locator('#cd-tessera').fill(`T-${suffisso}`)
  await page.getByRole('button', { name: 'Autorizza' }).click()
  await expect(page.getByRole('cell', { name: dipendente, exact: true })).toBeVisible({ timeout: 10_000 })

  // Ordine al banco per il dipendente: due caffè.
  await page.goto('/bar/comande')
  await page.getByRole('button', { name: 'Nuova comanda' }).click()
  await page.getByRole('menuitem', { name: 'Al banco' }).click()
  await page.getByRole('dialog').locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/bar\/comande\/[0-9a-f-]+$/, { timeout: 10_000 })
  const urlOrdine = page.url()
  await scegli(page, 'Convenzione aziendale', new RegExp(dipendente))
  await expect(page.getByText(/Ordine in convenzione/)).toBeVisible({ timeout: 10_000 })
  await page.getByRole('textbox', { name: 'Cerca prodotto' }).fill(caffe)
  await page.locator('section[aria-label="Prodotti"] button', { hasText: caffe }).click()
  await page.locator('section[aria-label="Prodotti"] button', { hasText: caffe }).click()
  await page.getByRole('button', { name: /^Invia 2 voci/ }).first().click()
  await expect(page.getByText('Inviato alle postazioni')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('3,00 €').first()).toBeVisible()

  // La postazione del caffè: tutto pronto, poi consegnato.
  await page.goto('/bar/banco')
  await page.getByRole('tab', { name: 'Macchina del caffè' }).click()
  await page.getByRole('tab', { name: 'Per ordine' }).click()
  const ordine = page.locator('section[aria-label="Da preparare"] li', { hasText: caffe }).first()
  await expect(ordine).toBeVisible({ timeout: 10_000 })
  await ordine.getByRole('button', { name: 'Tutto pronto' }).click()
  const pronto = page.locator('section[aria-label="Pronti da consegnare"] li', { hasText: caffe }).first()
  await expect(pronto).toBeVisible({ timeout: 10_000 })
  await pronto.getByRole('button', { name: 'Consegnato' }).click()
  await expect(page.locator('section[aria-label="Completati"] li', { hasText: caffe }).first()).toBeVisible({ timeout: 10_000 })

  // Cassa: il dipendente è già scelto, si addebita all'azienda e si chiude.
  await page.goto(urlOrdine)
  await page.getByRole('link', { name: 'Conto e pagamento' }).click()
  await expect(page).toHaveURL(/\/bar\/cassa\?conto=/)
  const apriCassa = page.getByRole('button', { name: 'Apri la cassa' })
  if (await apriCassa.isVisible({ timeout: 3_000 }).catch(() => false)) await apriCassa.click()
  await expect(page.getByRole('combobox', { name: 'Dipendente convenzionato' })).toContainText(dipendente, { timeout: 10_000 })
  await page.getByRole('button', { name: /Addebita .* all'azienda/ }).click()
  await expect(page.getByText('Conto saldato.')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Chiudi il conto' }).click()
  await expect(page.getByText('Conto chiuso')).toBeVisible({ timeout: 10_000 })

  // Fattura periodica della convenzione.
  await page.goto('/bar/convenzioni')
  await page.getByRole('button', { name: new RegExp(azienda) }).click()
  await expect(page.getByText('3,00 €').first()).toBeVisible({ timeout: 10_000 })
  await page.locator('#cf-numero').fill(`CONV-${suffisso}`)
  await page.getByRole('button', { name: 'Emetti la fattura' }).click()
  await expect(page.getByText('Fattura emessa nel modulo amministrativo')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Fatturata').first()).toBeVisible()
})

test('operatore: banco sì, analisi, convenzioni e fatture no', async ({ page }) => {
  const OPER_EMAIL = process.env.E2E_OPER_EMAIL
  const OPER_PW = process.env.E2E_OPER_PASSWORD
  test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')
  await entra(page, OPER_EMAIL!, OPER_PW!)

  await page.goto('/bar/banco')
  await expect(page.getByRole('heading', { name: 'Banco' }).or(page.getByText('Nessun bar configurato'))).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('link', { name: 'Analisi' })).toHaveCount(0)

  await page.goto('/bar/analisi')
  await expect(page).not.toHaveURL(/\/bar\/analisi/, { timeout: 10_000 })

  const esito = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: auth } = await sb.auth.getUser()
    const { data: locali } = await sb.from('fb_locali').select('id').eq('modulo', 'bar').limit(1)
    const { data: org } = await sb.from('organizzazioni').select('id').limit(1)
    const { error } = await sb.from('bar_convenzioni').insert({ locale_id: locali?.[0]?.id, organizzazione_id: org?.[0]?.id, created_by: auth.user.id })
    const { error: fattura } = await sb.rpc('bar_fattura_convenzione', { p_convenzione: '00000000-0000-0000-0000-000000000000', p_al: '2026-12-31', p_numero: 'X' })
    return { convenzione: error?.code ?? null, fattura: fattura?.code ?? null }
  })
  expect(esito.convenzione).toBe('42501')
  expect(esito.fattura).toBe('42501')
})
