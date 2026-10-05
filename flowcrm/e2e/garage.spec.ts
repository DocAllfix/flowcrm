import { test, expect, type Page } from '@playwright/test'

/**
 * MODULO GARAGE — dall'anagrafica all'incasso: autorimessa configurata alla
 * prima visita → cliente con il suo veicolo → abbonamento su un posto →
 * l'abbonato entra riconosciuto dalla targa ed esce senza pagare → un
 * occasionale entra a tariffa → un lavaggio a listino, pronto, incassato in
 * cassa. Poi l'operatore: ingressi sì, tariffe, contratti e analisi no.
 *
 * Gira sullo stack locale con la licenza `garage` attiva (vedi CI).
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

test('cliente → abbonamento → ingresso e uscita → servizio incassato', async ({ page }) => {
  test.setTimeout(150_000)
  await entra(page, EMAIL!, PASSWORD!)
  const suffisso = String(Date.now()).slice(-5)
  const targa = `GA${suffisso}`
  const cliente = `Cliente E2E ${suffisso}`

  // Primo accesso: configurazione guidata dell'autorimessa.
  await page.goto('/garage')
  const configura = page.getByRole('button', { name: "Configura l'autorimessa" })
  await expect(configura.or(page.getByRole('link', { name: 'Mappa', exact: true }))).toBeVisible({ timeout: 20_000 })
  if (await configura.isVisible()) {
    await configura.click()
    await page.locator('#gs-nome').fill(`Autorimessa E2E ${suffisso}`)
    await page.getByRole('button', { name: "Crea l'autorimessa" }).click()
    await expect(page.getByRole('link', { name: 'Mappa', exact: true })).toBeVisible({ timeout: 20_000 })
  }

  // Il cliente con il suo veicolo; la targa si normalizza.
  await page.goto('/garage/clienti')
  await page.getByRole('button', { name: 'Nuovo cliente' }).first().click()
  await page.locator('#cl-nome').fill(cliente)
  await page.locator('#cl-targa').fill(`ga ${suffisso}`)
  await page.getByRole('button', { name: 'Crea il cliente' }).click()
  await expect(page).toHaveURL(/\/garage\/clienti\/[0-9a-f-]{36}/, { timeout: 15_000 })
  await expect(page.getByText(targa, { exact: true })).toBeVisible({ timeout: 10_000 })

  // L'abbonamento su un posto libero: nasce la prima rata.
  await page.getByRole('tab', { name: 'Contratti' }).click()
  await page.getByRole('button', { name: 'Nuovo contratto' }).first().click()
  await scegli(page, 'Posto', /^[PS]\d+-\d+/)
  await page.getByRole('button', { name: 'Stipula il contratto' }).click()
  await expect(page.getByText(/prima rata emessa/)).toBeVisible({ timeout: 10_000 })

  // L'abbonato entra riconosciuto dalla targa ed esce senza pagare.
  await page.goto('/garage/movimenti')
  await page.locator('#mv-targa').fill(targa)
  await expect(page.getByText('Abbonato', { exact: true }).first()).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: "Registra l'ingresso" }).click()
  await expect(page.getByText(new RegExp(`${targa} dentro: ticket TKT-`))).toBeVisible({ timeout: 10_000 })
  const riga = page.getByRole('row').filter({ hasText: targa })
  await expect(riga.getByText('Abbonato')).toBeVisible()
  await riga.getByRole('button', { name: 'Uscita' }).click()
  await expect(page.getByText('Niente: abbonato')).toBeVisible()
  await page.getByRole('button', { name: "Registra l'uscita" }).click()
  await expect(page.getByText(`${targa} uscito`)).toBeVisible({ timeout: 10_000 })

  // Un lavaggio a listino: pronto, il conto è in cassa; incassato, è pagato.
  const servizio = `Lavaggio E2E ${suffisso}`
  const voce = await page.evaluate(async (servizio) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: auth } = await sb.auth.getUser()
    const { error } = await sb.from('gar_servizi_listino').insert({ nome: servizio, categoria: 'lavaggio', prezzo: 12, created_by: auth.user.id })
    return error?.message ?? 'ok'
  }, servizio)
  expect(voce).toBe('ok')
  await page.goto('/garage/servizi')
  await page.getByRole('button', { name: 'Nuovo servizio' }).first().click()
  await scegli(page, 'Servizio', new RegExp(servizio))
  await scegli(page, 'Veicolo in anagrafica', new RegExp(targa))
  await page.getByRole('button', { name: 'Crea il servizio' }).click()
  const scheda = page.getByRole('listitem').filter({ hasText: servizio })
  await scheda.getByRole('button', { name: 'Inizia' }).click()
  await scheda.getByRole('button', { name: 'Pronto', exact: true }).click()
  await expect(page.getByText(/il conto è in cassa/)).toBeVisible({ timeout: 10_000 })
  await scheda.getByRole('link', { name: 'Incassa' }).click()
  await expect(page).toHaveURL(/\/garage\/incassi\?conto=/, { timeout: 15_000 })
  const apri = page.getByRole('button', { name: 'Apri la cassa' })
  await expect(apri.or(page.getByRole('button', { name: 'Chiudi la cassa' }))).toBeVisible({ timeout: 10_000 })
  if (await apri.isVisible()) await apri.click()
  await page.getByRole('button', { name: /^Registra .*€/ }).click()
  await expect(page.getByText(/registrati/)).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Chiudi il conto' }).click()
  await expect(page.getByText('Conto chiuso')).toBeVisible({ timeout: 10_000 })
  await page.goto('/garage/servizi')
  await expect(page.getByRole('listitem').filter({ hasText: servizio }).getByText('Pagato')).toBeVisible({ timeout: 10_000 })
})

test('operatore: ingressi sì, tariffe, contratti e analisi no', async ({ page }) => {
  const OPER_EMAIL = process.env.E2E_OPER_EMAIL
  const OPER_PW = process.env.E2E_OPER_PASSWORD
  test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')
  test.setTimeout(90_000)
  await entra(page, OPER_EMAIL!, OPER_PW!)

  await page.goto('/garage/movimenti')
  await expect(page.getByRole('heading', { name: 'Ingressi e uscite' }).or(page.getByText('Autorimessa da configurare'))).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: 'Struttura e tariffe' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Analisi', exact: true })).toHaveCount(0)

  await page.goto('/garage/analisi')
  await expect(page).not.toHaveURL(/\/garage\/analisi/, { timeout: 30_000 })

  const esito = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: auth } = await sb.auth.getUser()
    const io = auth.user.id
    const { data: s } = await sb.from('gar_strutture').select('id').limit(1).single()
    const { data: c } = await sb.from('gar_clienti').select('id').limit(1).single()
    const { error: tariffa } = await sb.from('gar_tariffari').insert({ struttura_id: s.id, nome: 'Abusiva', prezzo_frazione: 0, created_by: io })
    const { error: contratto } = await sb.from('gar_contratti').insert({ struttura_id: s.id, cliente_id: c?.id, created_by: io })
    const { data: posto } = await sb.from('gar_posti').select('id').eq('struttura_id', s.id).limit(1).single()
    const { error: canone } = await sb.from('gar_posti').update({ canone: 1 }).eq('id', posto.id)
    const oggi = new Date().toISOString().slice(0, 10)
    const economici = (await sb.rpc('gar_kpi', { p_struttura: s.id, p_dal: oggi, p_al: oggi })).data?.economici ?? null
    return { tariffa: tariffa?.code ?? null, contratto: contratto?.code ?? null, canone: canone?.code ?? null, economici }
  })
  expect(esito.tariffa).toBe('42501')
  expect(esito.contratto).toBe('42501')
  expect(esito.canone).toBe('42501')
  expect(esito.economici).toBeNull()
})
