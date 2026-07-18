import { test, expect } from '@playwright/test'

/**
 * MODULO AGENTI — flusso core: creo un agente (codice AGEN auto),
 * un'offerta che converto in ordine, e verifico il gate: lo staff
 * operatore non legge piani/provvigioni (0 righe via API).
 * L'isolamento del portale agente è coperto dalla matrice pgTAP 018.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

test('agente: crea → offerta → ordine', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  // Serve un'organizzazione cliente
  const orgNome = `Org Agenti E2E ${Date.now()}`
  await page.goto('/agenti')
  await page.evaluate(async (nome) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: u } = await sb.auth.getUser()
    await sb.from('organizzazioni').insert({ ragione_sociale: nome, created_by: u.user.id })
  }, orgNome)

  const cognome = `E2E${String(Date.now()).slice(-6)}`
  await page.getByRole('button', { name: 'Nuovo agente' }).first().click()
  await page.locator('#ag-nome').fill('Anna')
  await page.locator('#ag-cognome').fill(cognome)
  await page.getByRole('button', { name: 'Registra' }).click()

  const riga = page.locator('tbody tr', { hasText: cognome })
  await expect(riga).toBeVisible({ timeout: 10_000 })
  await expect(riga.locator('td').first()).toHaveText(/^AGEN-\d{4}-\d{4}$/)

  await riga.click()
  await expect(page).toHaveURL(/\/agenti\/[0-9a-f-]+$/, { timeout: 10_000 })

  // Offerta → invia → converti in ordine
  await page.getByRole('tab', { name: 'Offerte e ordini' }).click()
  const formOff = page.locator('form').filter({ hasText: 'Descrizione' }).first()
  await formOff.getByRole('combobox').click()
  await page.getByRole('option', { name: orgNome }).click()
  await formOff.locator('input').nth(0).fill('Offerta E2E')
  await formOff.locator('input').nth(1).fill('5000')
  await formOff.getByRole('button').click()
  await expect(page.getByText('Offerta E2E')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Invia' }).first().click()
  await page.getByRole('button', { name: 'Converti' }).first().click()
  await expect(page.getByText('Da offerta: Offerta E2E')).toBeVisible({ timeout: 10_000 })

  // Pulizia
  await page.evaluate(async ({ c, o }) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    await sb.from('agenti').delete().eq('cognome', c)
    await sb.from('organizzazioni').delete().eq('ragione_sociale', o)
  }, { c: cognome, o: orgNome })
})

test('staff operatore: piani e provvigioni invisibili', async ({ page }) => {
  const OPER_EMAIL = process.env.E2E_OPER_EMAIL
  const OPER_PW = process.env.E2E_OPER_PASSWORD
  test.skip(!OPER_EMAIL || !OPER_PW, 'E2E_OPER_EMAIL/PASSWORD non impostate')

  await page.goto('/login')
  await page.getByTestId('login-email').fill(OPER_EMAIL!)
  await page.getByTestId('login-password').fill(OPER_PW!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  await page.goto('/agenti')
  const conteggi = await page.evaluate(async () => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const piani = await sb.from('agenti_piani_provvigionali').select('id', { count: 'exact', head: true })
    const provv = await sb.from('agenti_provvigioni').select('id', { count: 'exact', head: true })
    return { piani: piani.count ?? 0, provv: provv.count ?? 0 }
  })
  expect(conteggi.piani).toBe(0)
  expect(conteggi.provv).toBe(0)
})
