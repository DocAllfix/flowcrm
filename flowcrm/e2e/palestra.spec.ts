import { test, expect, type Page } from '@playwright/test'

/**
 * MODULO PALESTRA — dall'iscrizione all'ingresso: sede configurata alla prima
 * visita → nuovo socio con l'abbonamento → senza certificato l'ingresso è
 * negato con il motivo → certificato registrato → ingresso consentito dalla
 * reception → rata incassata. Poi l'operatore: reception sì, listini e
 * analisi no, niente sconti a mano e niente misure dei soci.
 *
 * Gira sullo stack locale con la licenza `palestra` attiva (vedi CI).
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

test('iscrizione → accesso negato senza certificato → ingresso consentito → rata incassata', async ({ page }) => {
  test.setTimeout(150_000)
  await entra(page, EMAIL!, PASSWORD!)
  const suffisso = String(Date.now()).slice(-6)

  // Primo accesso: configurazione guidata della palestra.
  await page.goto('/palestra')
  const configura = page.getByRole('button', { name: 'Configura la palestra' })
  await expect(configura.or(page.getByRole('heading', { name: /^Reception/ }))).toBeVisible({ timeout: 20_000 })
  if (await configura.isVisible()) {
    await configura.click()
    await page.locator('#ps-nome').fill(`Palestra E2E ${suffisso}`)
    await page.getByRole('button', { name: 'Crea la palestra' }).click()
    await expect(page.getByRole('heading', { name: /^Reception/ })).toBeVisible({ timeout: 20_000 })
  }

  // Nuovo socio con il mensile, condizioni firmate ma senza certificato medico.
  const socio = `Marta E2E${suffisso}`
  await page.getByRole('button', { name: 'Nuovo socio' }).click()
  await page.locator('#ns-nome').fill(socio)
  await page.getByText('Ha firmato le condizioni').click()
  await scegli(page, 'Formula', /Mensile open/)
  await page.getByRole('button', { name: 'Iscrivi', exact: true }).click()
  await expect(page).toHaveURL(/\/palestra\/soci\/[0-9a-f-]{36}/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: socio })).toBeVisible()
  await expect(page.getByText('Certificato medico mancante')).toBeVisible()

  // Senza certificato non si entra, e la reception legge perché.
  await page.getByRole('button', { name: 'Registra ingresso' }).click()
  await expect(page.getByText('Ingresso negato: Manca il certificato medico')).toBeVisible({ timeout: 10_000 })

  // Certificato registrato: ora l'abbonamento apre la porta.
  await page.locator('#pf-cert').fill('2030-12-31')
  await page.getByRole('button', { name: 'Salva il profilo' }).click()
  await expect(page.getByText('Profilo aggiornato')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Registra ingresso' }).click()
  await expect(page.getByText(/Ingresso registrato: Abbonamento ABB-/)).toBeVisible({ timeout: 10_000 })

  // La rata (con la quota d'iscrizione) si incassa dalla scheda.
  await page.getByRole('tab', { name: 'Pagamenti' }).click()
  await page.getByRole('button', { name: 'Incassa' }).first().click()
  await expect(page.getByText(/incassati con POS/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Nessun pagamento scaduto.')).toBeVisible()

  // Dalla reception, cercandola per nome, risulta in sala.
  await page.goto('/palestra')
  await expect(page.getByRole('heading', { name: 'In sala adesso' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('link', { name: socio })).toBeVisible({ timeout: 10_000 })
})

test('operatore: reception sì, listini e analisi no, niente sconti né misure', async ({ page }) => {
  const OPER_EMAIL = process.env.E2E_OPER_EMAIL
  const OPER_PW = process.env.E2E_OPER_PASSWORD
  test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')
  test.setTimeout(90_000)
  await entra(page, OPER_EMAIL!, OPER_PW!)

  await page.goto('/palestra/soci')
  await expect(page.getByRole('heading', { name: 'Soci', exact: true }).or(page.getByText('Nessuna sede configurata'))).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: 'Listini e regole' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Analisi', exact: true })).toHaveCount(0)

  await page.goto('/palestra/listini')
  await expect(page).not.toHaveURL(/\/palestra\/listini/, { timeout: 30_000 })

  const esito = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: auth } = await sb.auth.getUser()
    const { data: soci } = await sb.from('pal_soci').select('id').limit(1)
    const { data: formule } = await sb.from('pal_formule').select('id').limit(1)
    if (!soci?.[0] || !formule?.[0]) return { sconto: '42501', misure: 0, formula: '42501' }
    const { error: sconto } = await sb.from('pal_abbonamenti').insert({ socio_id: soci[0].id, formula_id: formule[0].id, prezzo: 1, created_by: auth.user.id })
    const { data: misure } = await sb.from('pal_misurazioni').select('id')
    const { error: formula } = await sb.from('pal_formule').insert({ nome: 'Gratis', prezzo: 0, created_by: auth.user.id })
    return { sconto: sconto?.code ?? null, misure: misure?.length ?? 0, formula: formula?.code ?? null }
  })
  expect(esito.sconto).toBe('42501')
  expect(esito.misure).toBe(0)
  expect(esito.formula).toBe('42501')
})
