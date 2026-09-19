import { test, expect } from '@playwright/test'

/**
 * F7 — deal vinto → commessa: creo un deal, lo sposto nella colonna "Vinto",
 * apro il dettaglio, uso "Crea commessa da deal" e verifico che la commessa
 * compaia con un codice COMM-YYYY-NNNN.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

test('deal vinto genera una commessa con codice', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })

  // Serve un'organizzazione: la creo via client
  const orgNome = `Org F7 ${Date.now()}`
  await page.goto('/kanban')
  await page.evaluate(async (nome) => {
    // @ts-expect-error client esposto per test
    const sb = window.__supabase
    const { data: u } = await sb.auth.getUser()
    await sb.from('organizzazioni').insert({ ragione_sociale: nome, created_by: u.user.id })
  }, orgNome)

  // Crea un deal
  const nomeDeal = `E2E Comm ${Date.now()}`
  await page.getByRole('button', { name: 'Nuovo deal' }).click()
  await page.getByTestId('deal-nome').fill(nomeDeal)
  await page.locator('#importo').fill('9000')
  await page.getByTestId('deal-salva').click()

  // Trascina il deal fino a "Vinto" (2 colonne a destra da Proposta)
  const card = page.locator('[data-rfd-drag-handle-draggable-id]', { hasText: nomeDeal })
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.focus()
  await page.keyboard.press(' ')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press(' ')

  // Attendere che lo spostamento sia PERSISTITO, non solo disegnato.
  // Il trascinamento aggiorna subito la colonna a schermo e scrive sul
  // database in modo asincrono: navigando subito, il dettaglio legge lo
  // stage VECCHIO e il bottone "Crea commessa" non compare. Il deal risulta
  // poi correttamente "Vinto" nel database, il che rende il guasto
  // particolarmente ingannevole — sembra un difetto dell'applicazione.
  await expect
    .poll(async () => page.evaluate(async (nome) => {
      // @ts-expect-error client esposto per test
      const sb = window.__supabase
      const { data } = await sb.from('deals')
        .select('stage:pipeline_stages(is_won)').eq('nome', nome).single()
      return data?.stage?.is_won ?? false
    }, nomeDeal), { timeout: 10_000 })
    .toBe(true)

  // Aprire il dettaglio cliccando la SCHEDA, non un testo qualsiasi: dopo lo
  // spostamento compare anche un avviso «"…" spostato in Vinto», quindi
  // `getByText(nomeDeal)` trova due elementi e Playwright rifiuta di scegliere.
  await card.click()
  await expect(page).toHaveURL(/\/deal\/[0-9a-f-]+$/, { timeout: 10_000 })

  // Il bottone "Crea commessa da deal" è visibile perché lo stage è vinto
  await page.getByTestId('crea-commessa-da-deal').click()

  // Seleziona l'organizzazione e salva
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: orgNome }).click()
  await page.getByTestId('commessa-salva').click()

  // La commessa collegata compare con il suo codice COMM- (chip nell'header;
  // .first() perché il pattern appare anche nel toast di conferma)
  await expect(page.getByText(/COMM-\d{4}-\d{4}/).first()).toBeVisible({ timeout: 10_000 })
})
