import { test, expect, type Page } from '@playwright/test'

/**
 * MODULO HOTEL — il soggiorno da capo a fondo: struttura configurata alla
 * prima visita → prenotazione con il preventivo notte per notte → ospite
 * con il documento → check-in sulla prima camera pronta → check-out che
 * mette notti e tassa sul conto → incasso in cassa → check-out completato
 * → pulizia della camera liberata. Poi l'operatore: ricevimento sì,
 * tariffe e analisi no, niente prezzi cambiati dal database.
 *
 * Gira sullo stack locale con la licenza `hotel` attiva (vedi CI).
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

test('soggiorno: prenotazione → ospite → check-in → conto saldato → check-out → pulizia', async ({ page }) => {
  test.setTimeout(150_000)
  await entra(page, EMAIL!, PASSWORD!)
  const suffisso = String(Date.now()).slice(-6)

  // Primo accesso: configurazione guidata della struttura.
  await page.goto('/hotel')
  const configura = page.getByRole('button', { name: 'Configura la struttura' })
  await expect(configura.or(page.getByRole('heading', { name: /^Oggi/ }))).toBeVisible({ timeout: 20_000 })
  if (await configura.isVisible()) {
    await configura.click()
    await page.locator('#cs-nome').fill(`Hotel E2E ${suffisso}`)
    await page.locator('#cs-comune').fill('Firenze')
    await page.getByRole('button', { name: 'Crea la struttura' }).click()
    await expect(page.getByRole('heading', { name: /^Oggi/ })).toBeVisible({ timeout: 20_000 })
  }

  // Prenotazione di una notte da oggi: il preventivo arriva dal piano tariffario.
  const ospite = `Giulia E2E${suffisso}`
  await page.getByRole('button', { name: 'Nuova prenotazione' }).click()
  await page.locator('#pr-ospite').fill(ospite)
  const preventivo = page.getByRole('complementary', { name: 'Preventivo' })
  await expect(preventivo.getByText('Totale')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Registra la prenotazione' }).click()
  await expect(page).toHaveURL(/\/hotel\/prenotazioni\/[0-9a-f-]{36}/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: ospite })).toBeVisible()

  // Ospite con il documento, poi check-in sulla camera proposta (la prima pronta).
  await page.getByRole('button', { name: 'Registra un ospite' }).click()
  // Il primo ospite riprende il nome della prenotazione.
  await expect(page.locator('#og-cognome')).toHaveValue(`E2E${suffisso}`)
  await page.locator('#og-doc').fill(`CA${suffisso}`)
  await page.locator('#og-nascita').fill('1990-03-15')
  await page.getByRole('button', { name: 'Registra', exact: true }).click()
  await expect(page.getByText(/Ospite registrato/)).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Check-in' }).first().click()
  const fatto = page.getByText(/Check-in fatto: camera \S+/)
  await expect(fatto).toBeVisible({ timeout: 10_000 })
  const camera = (await fatto.innerText()).match(/camera (\S+)/)![1]
  await expect(page.getByText('In casa', { exact: true })).toBeVisible()

  // Check-out: notti e tassa vanno sul conto, si salda in cassa e si riprova.
  await page.getByRole('button', { name: 'Check-out' }).click()
  await expect(page.getByText(/da saldare/).first()).toBeVisible({ timeout: 10_000 })
  await page.getByRole('link', { name: 'Vai alla cassa' }).click()
  const apri = page.getByRole('button', { name: 'Apri la cassa' })
  await expect(apri.or(page.getByRole('button', { name: 'Chiudi la cassa' }))).toBeVisible({ timeout: 10_000 })
  if (await apri.isVisible()) await apri.click()
  await scegli(page, 'Metodo di pagamento', 'Carta')
  await page.getByRole('button', { name: /^Registra .*€/ }).click()
  await expect(page.getByText(/Carta: .* registrati/)).toBeVisible({ timeout: 10_000 })
  await page.goBack()
  await page.getByRole('button', { name: 'Check-out' }).click()
  await expect(page.getByText('Check-out fatto: camera da pulire')).toBeVisible({ timeout: 10_000 })

  // La camera liberata entra tra le pulizie del giorno.
  await page.goto('/hotel/housekeeping')
  await expect(page.getByText(new RegExp(`\\b${camera}\\b`)).first()).toBeVisible({ timeout: 10_000 })
})

test('operatore: ricevimento sì, tariffe e analisi no', async ({ page }) => {
  const OPER_EMAIL = process.env.E2E_OPER_EMAIL
  const OPER_PW = process.env.E2E_OPER_PASSWORD
  test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')
  test.setTimeout(90_000)
  await entra(page, OPER_EMAIL!, OPER_PW!)

  await page.goto('/hotel/prenotazioni')
  await expect(page.getByRole('heading', { name: 'Prenotazioni' }).or(page.getByText('Nessuna struttura'))).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('link', { name: 'Analisi e revenue' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Camere e tariffe' })).toHaveCount(0)

  await page.goto('/hotel/analisi')
  await expect(page).not.toHaveURL(/\/hotel\/analisi/, { timeout: 30_000 })

  const esito = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: tariffe } = await sb.from('hotel_tariffe').select('id, prezzo').limit(1)
    const t = tariffe?.[0]
    if (!t) return { modificate: 0 }
    const { data } = await sb.from('hotel_tariffe').update({ prezzo: 1 }).eq('id', t.id).select('id')
    return { modificate: data?.length ?? 0 }
  })
  expect(esito.modificate).toBe(0)
})
