import { test, expect, type Page } from '@playwright/test'

/**
 * MODULO AGENZIA IMMOBILIARE — dall'acquisizione al rogito: agenzia
 * configurata alla prima visita → immobile con il proprietario → incarico
 * (l'immobile va sul mercato) → richiesta di un cliente e matching → visita
 * con l'esito → proposta, controproposta, accettazione → preliminare →
 * adeguata verifica antiriciclaggio → rogito con le provvigioni. Poi
 * l'operatore: agenzia sì, regole, analisi, agenti e dati riservati no.
 *
 * Gira sullo stack locale con la licenza `immobiliare` attiva (vedi CI).
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

test('immobile → incarico → matching → visita → proposta → rogito con le provvigioni', async ({ page }) => {
  test.setTimeout(180_000)
  await entra(page, EMAIL!, PASSWORD!)
  const s = String(Date.now()).slice(-6)
  const via = `Via E2E ${s}`
  const acquirente = `Acquirente E2E${s}`

  // Primo accesso: configurazione guidata dell'agenzia.
  await page.goto('/immobiliare')
  const configura = page.getByRole('button', { name: "Configura l'agenzia" })
  await expect(configura.or(page.getByRole('heading', { name: "Cruscotto dell'agenzia" }))).toBeVisible({ timeout: 20_000 })
  if (await configura.isVisible()) {
    await configura.click()
    await page.locator('#ia-nome').fill(`Agenzia E2E ${s}`)
    await page.getByRole('button', { name: "Crea l'agenzia" }).click()
    await expect(page.getByRole('heading', { name: "Cruscotto dell'agenzia" })).toBeVisible({ timeout: 20_000 })
  }

  // L'immobile con il suo proprietario.
  await page.goto('/immobiliare/immobili')
  await page.getByRole('button', { name: 'Nuovo immobile' }).first().click()
  await page.locator('#ni-ind').fill(via)
  await page.locator('#ni-com').fill(`Comune${s}`)
  await page.locator('#ni-mq').fill('80')
  await page.locator('#ni-cam').fill('2')
  await page.locator('#ni-pr').fill('250.000')
  await page.locator('#ni-prop').fill(`Proprietario E2E${s}`)
  await page.getByRole('button', { name: 'Crea il fascicolo' }).click()
  await expect(page).toHaveURL(/\/immobiliare\/immobili\/[0-9a-f-]{36}/, { timeout: 15_000 })
  const fascicolo = page.url()

  // L'incarico porta l'immobile sul mercato.
  await page.getByRole('tab', { name: 'Incarico' }).click()
  await page.getByRole('button', { name: 'Nuovo incarico' }).first().click()
  await page.getByRole('button', { name: "Registra l'incarico" }).click()
  await expect(page.getByText(/l'immobile è sul mercato/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Disponibile', { exact: true }).first()).toBeVisible({ timeout: 10_000 })

  // Il cliente che cerca: l'immobile è tra i compatibili.
  await page.goto('/immobiliare/richieste')
  await page.getByRole('button', { name: 'Nuova richiesta' }).first().click()
  await page.locator('#rq-cli').fill(acquirente)
  await page.locator('#rq-com').fill(`Comune${s}`)
  await page.locator('#rq-max').fill('260000')
  await page.locator('#rq-cam').fill('2')
  await page.getByRole('button', { name: 'Registra la richiesta' }).click()
  await expect(page).toHaveURL(/\/immobiliare\/richieste\/[0-9a-f-]{36}/, { timeout: 15_000 })
  await expect(page.getByLabel('Punteggio 100 su 100')).toBeVisible({ timeout: 10_000 })

  // La visita, con l'esito.
  await page.getByRole('link', { name: 'Visita', exact: true }).first().click()
  await page.getByRole('button', { name: 'Fissa la visita' }).click()
  await expect(page.getByText(/Visita fissata/)).toBeVisible({ timeout: 10_000 })
  await page.locator('input[type=date]').first().fill(new Date(Date.now() + 86_400_000).toLocaleDateString('sv'))
  const visita = page.locator('div').filter({ hasText: acquirente }).getByRole('button', { name: "Com'è andata" }).first()
  await visita.click()
  await page.locator('#es-fb').fill('Bella luce')
  await page.getByRole('button', { name: 'Registra', exact: true }).click()
  await expect(page.getByText(/Visita registrata/)).toBeVisible({ timeout: 10_000 })

  // Proposta, controproposta, accettazione, preliminare.
  await page.goto(fascicolo)
  await page.getByRole('link', { name: 'Proposte' }).click()
  await page.locator('#pp-cli').fill(`E2E${s}`)
  await page.getByRole('option', { name: new RegExp(acquirente) }).first().click()
  await page.locator('#pp-pr').fill('240000')
  await page.getByRole('button', { name: 'Registra la proposta' }).click()
  await expect(page.getByText(/Proposta registrata/)).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Controproposta' }).first().click()
  await page.locator('#pp-pr').fill('248000')
  await page.getByRole('button', { name: 'Registra la risposta' }).click()
  await expect(page.getByText('Proprietario: 248.000 €')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Accettata', exact: true }).first().click()
  await expect(page.getByText(/l'immobile è sotto offerta/)).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Registra il preliminare' }).first().click()
  await page.getByRole('button', { name: 'Registra il preliminare' }).last().click()
  await expect(page.getByText(/Preliminare registrato/)).toBeVisible({ timeout: 10_000 })

  // Senza adeguata verifica il rogito non passa; con la verifica sì.
  await page.goto('/immobiliare/trattative?scheda=chiusure')
  const riga = page.getByRole('row').filter({ hasText: via })
  await riga.getByRole('button', { name: 'Rogito fatto' }).click()
  await expect(page.getByText(/adeguata verifica antiriciclaggio/)).toBeVisible({ timeout: 10_000 })
  await page.goto('/immobiliare/compliance')
  await page.getByRole('button', { name: 'Nuova verifica' }).first().click()
  await page.locator('#am-cli').fill(`E2E${s}`)
  await page.getByRole('option', { name: new RegExp(acquirente) }).first().click()
  await page.locator('#am-num').fill(`CA${s}`)
  await page.getByRole('button', { name: 'Registra', exact: true }).click()
  await expect(page.getByText('Verifica registrata')).toBeVisible({ timeout: 10_000 })
  await page.goto('/immobiliare/trattative?scheda=chiusure')
  await page.getByRole('row').filter({ hasText: via }).getByRole('button', { name: 'Rogito fatto' }).click()
  await expect(page.getByText(/immobile venduto, provvigioni maturate/)).toBeVisible({ timeout: 10_000 })

  // Le provvigioni: 3% per lato su 248.000 €.
  await page.goto('/immobiliare/provvigioni')
  await expect(page.getByRole('row').filter({ hasText: via })).toHaveCount(2, { timeout: 10_000 })
  await expect(page.getByRole('row').filter({ hasText: via }).first()).toContainText('7440,00')
})

test('operatore: agenzia sì, regole, analisi, agenti e dati riservati no', async ({ page }) => {
  const OPER_EMAIL = process.env.E2E_OPER_EMAIL
  const OPER_PW = process.env.E2E_OPER_PASSWORD
  test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')
  test.setTimeout(90_000)
  await entra(page, OPER_EMAIL!, OPER_PW!)

  await page.goto('/immobiliare/immobili')
  await expect(page.getByRole('heading', { name: 'Immobili', exact: true }).or(page.getByText('Agenzia da configurare'))).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: "Regole dell'agenzia" })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Analisi', exact: true })).toHaveCount(0)

  await page.goto('/immobiliare/analisi')
  await expect(page).not.toHaveURL(/\/immobiliare\/analisi/, { timeout: 30_000 })

  const esito = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: auth } = await sb.auth.getUser()
    const io = auth.user.id
    const { error: campagna } = await sb.from('imm_marketing').insert({ nome: 'Abusiva', costo: 1, created_by: io })
    const { error: agente } = await sb.from('imm_agenti').insert({ user_id: io, created_by: io })
    const { data: provvigioni } = await sb.from('imm_provvigioni').select('id')
    const { data: aml } = await sb.from('imm_aml_verifiche').select('id').neq('operatore_id', io)
    const oggi = new Date().toISOString().slice(0, 10)
    const economici = (await sb.rpc('imm_kpi', { p_dal: oggi, p_al: oggi })).data?.economici ?? null
    return { campagna: campagna?.code ?? null, agente: agente?.code ?? null, provvigioni: provvigioni?.length ?? 0, aml: aml?.length ?? 0, economici }
  })
  expect(esito.campagna).toBe('42501')
  expect(esito.agente).toBe('42501')
  expect(esito.provvigioni).toBe(0)
  expect(esito.aml).toBe(0)
  expect(esito.economici).toBeNull()
})
