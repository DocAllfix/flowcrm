import { test, expect, type Page } from '@playwright/test'

/**
 * MODULO FIORAIO — l'ordine da capo a fondo: negozio configurato alla prima
 * visita → ordine con chi ordina diverso da chi riceve e il biglietto → una
 * composizione dal catalogo → conferma → laboratorio che la prepara e scarica
 * i fiori → ritiro → incasso → ordine chiuso. Poi l'operatore: negozio sì,
 * analisi e regole del negozio no.
 *
 * Gira sullo stack locale con la licenza `fioraio` attiva (vedi CI).
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

test('ordine: destinatario e biglietto → composizione → laboratorio → ritiro → incasso', async ({ page }) => {
  test.setTimeout(150_000)
  await entra(page, EMAIL!, PASSWORD!)
  const suffisso = String(Date.now()).slice(-6)

  // Primo accesso: configurazione guidata del negozio.
  await page.goto('/fioraio')
  const configura = page.getByRole('button', { name: 'Configura il negozio' })
  await expect(configura.or(page.getByRole('heading', { name: /^Oggi/ }))).toBeVisible({ timeout: 20_000 })
  if (await configura.isVisible()) {
    await configura.click()
    await page.locator('#fn-nome').fill(`Fiori E2E ${suffisso}`)
    await page.getByRole('button', { name: 'Crea il negozio' }).click()
    await expect(page.getByRole('heading', { name: /^Oggi/ })).toBeVisible({ timeout: 20_000 })
  }

  // Catalogo: un fiore in magazzino e una composizione che lo usa.
  const composizione = `Bouquet E2E ${suffisso}`
  const pronto = await page.evaluate(async ({ composizione, suffisso }) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: auth } = await sb.auth.getUser()
    const io = auth.user.id
    const { data: fiore, error: e1 } = await sb.from('mag_articoli').insert({ modulo: 'fioraio', descrizione: `Rosa E2E ${suffisso}`, unita_misura: 'stelo',
      costo_unitario: 1, prezzo_vendita: 3, aliquota_iva: 10, vendibile: true, deperibile: true, created_by: io }).select('id').single()
    if (e1) return e1.message
    const { error: e2 } = await sb.from('mag_movimenti').insert({ articolo_id: fiore.id, modulo: 'fioraio', tipo: 'carico', quantita: 50, created_by: io })
    if (e2) return e2.message
    const { data: d, error: e3 } = await sb.from('distinte_base').insert({ modulo: 'fioraio', nome: composizione, tipo: 'bouquet', resa: 1, unita_resa: 'pz',
      tempo_preparazione_min: 15, prezzo_vendita: 45, created_by: io }).select('id').single()
    if (e3) return e3.message
    const { error: e4 } = await sb.from('distinte_base_righe').insert({ distinta_id: d.id, articolo_id: fiore.id, quantita: 12, created_by: io })
    return e4?.message ?? fiore.id
  }, { composizione, suffisso })
  expect(pronto).toMatch(/^[0-9a-f-]{36}$/)

  // L'ordine: Mario ordina per Anna, con il biglietto firmato.
  const cliente = `Mario E2E${suffisso}`
  await page.goto('/fioraio/ordini')
  await page.getByRole('button', { name: 'Nuovo ordine' }).click()
  await page.locator('#no-nome').fill(cliente)
  await page.locator('#no-dest').fill('Anna Bianchi')
  await page.locator('#no-msg').fill('Buon anniversario')
  await page.locator('#no-firma').fill('Mario')
  await page.getByRole('button', { name: "Apri l'ordine" }).click()
  await expect(page).toHaveURL(/\/fioraio\/ordini\/[0-9a-f-]{36}/, { timeout: 15_000 })
  const ordine = page.url()
  await expect(page.getByRole('heading', { name: cliente })).toBeVisible()

  // La composizione dal catalogo: prezzo e totale arrivano da soli.
  await scegli(page, 'Prodotto o composizione', new RegExp(composizione))
  await expect(page.getByText(composizione, { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('45,00 €').first()).toBeVisible()
  await page.getByRole('button', { name: 'Conferma', exact: true }).click()
  await expect(page.getByText(/Ordine confermato/)).toBeVisible({ timeout: 10_000 })

  // In laboratorio la commessa c'è, con il biglietto da stampare; finita, scarica i fiori.
  await page.goto('/fioraio/produzione')
  const commessa = page.getByRole('listitem').filter({ hasText: composizione })
  await expect(commessa).toBeVisible({ timeout: 10_000 })
  await expect(commessa.getByText(/Buon anniversario/)).toBeVisible()
  await commessa.getByRole('button', { name: 'Inizia' }).click()
  await commessa.getByRole('button', { name: 'Pronta' }).click()
  await expect(page.getByText(/pronta, materiali scaricati/)).toBeVisible({ timeout: 10_000 })
  const giacenza = await page.evaluate(async (id) => {
    // @ts-expect-error client esposto per test
    const { data } = await window.__supabase.from('mag_giacenze').select('giacenza').eq('articolo_id', id).single()
    return Number(data.giacenza)
  }, pronto)
  expect(giacenza).toBe(38)

  // Ritiro e incasso: l'ordine si chiude.
  await page.goto(ordine)
  await page.getByRole('button', { name: 'Ritirato dal cliente' }).click()
  await expect(page.getByText('Consegnato al cliente')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Incassa' }).click()
  await expect(page).toHaveURL(/\/fioraio\/banco\?conto=/, { timeout: 15_000 })
  const apri = page.getByRole('button', { name: 'Apri la cassa' })
  await expect(apri.or(page.getByRole('button', { name: 'Chiudi la cassa' }))).toBeVisible({ timeout: 10_000 })
  if (await apri.isVisible()) await apri.click()
  await page.getByRole('button', { name: /^Registra .*€/ }).click()
  await expect(page.getByText(/registrati/)).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Chiudi il conto' }).click()
  await expect(page.getByText('Conto chiuso')).toBeVisible({ timeout: 10_000 })
  await page.goto(ordine)
  await expect(page.getByRole('listitem').filter({ hasText: /^Chiuso$/ })).toHaveAttribute('aria-current', 'step', { timeout: 10_000 })
})

test('operatore: negozio sì, analisi e regole no', async ({ page }) => {
  const OPER_EMAIL = process.env.E2E_OPER_EMAIL
  const OPER_PW = process.env.E2E_OPER_PASSWORD
  test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')
  test.setTimeout(90_000)
  await entra(page, OPER_EMAIL!, OPER_PW!)

  await page.goto('/fioraio/ordini')
  await expect(page.getByRole('heading', { name: 'Ordini', exact: true }).or(page.getByText('Negozio da configurare'))).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: 'Negozio e zone' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Analisi', exact: true })).toHaveCount(0)

  await page.goto('/fioraio/analisi')
  await expect(page).not.toHaveURL(/\/fioraio\/analisi/, { timeout: 30_000 })

  const esito = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: auth } = await sb.auth.getUser()
    const { data: regole } = await sb.from('fior_impostazioni').update({ ricarico_pct: 1 }).eq('id', 1).select('id')
    const { error: zona } = await sb.from('fior_zone').insert({ nome: 'Zona abusiva', created_by: auth.user.id })
    const margine = (await sb.rpc('fior_cruscotto')).data?.margine_mese ?? null
    return { regole: regole?.length ?? 0, zona: zona?.code ?? null, margine }
  })
  expect(esito.regole).toBe(0)
  expect(esito.zona).toBe('42501')
  expect(esito.margine).toBeNull()
})
