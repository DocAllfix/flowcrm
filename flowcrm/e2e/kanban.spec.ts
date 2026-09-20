import { test, expect } from '@playwright/test'

/**
 * F4 — Kanban: crea un deal, lo trascina alla colonna successiva (drag da
 * tastiera, l'unico affidabile con @hello-pangea/dnd), verifica che si sposti
 * e che la modifica PERSISTA dopo un reload.
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(EMAIL!)
  await page.getByTestId('login-password').fill(PASSWORD!)
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('notifiche-badge')).toBeVisible({ timeout: 15_000 })
}

test('deal: creazione, drag alla colonna successiva, persistenza al reload', async ({ page }) => {
  await login(page)
  await page.goto('/kanban')

  const nome = `E2E Kanban ${Date.now()}`

  // Crea deal (entra in "Proposta", prima colonna)
  await page.getByRole('button', { name: 'Nuovo deal' }).click()
  await page.getByTestId('deal-nome').fill(nome)
  await page.locator('#importo').fill('10000')
  await page.getByTestId('deal-salva').click()

  const card = page.locator(`[data-rfd-drag-handle-draggable-id]`, { hasText: nome })
  await expect(card).toBeVisible({ timeout: 10_000 })

  // Drag da tastiera: Space (solleva) → ArrowRight (colonna succ.) → Space (rilascia)
  // Le pressioni NON possono essere consecutive: il trascinamento da
  // tastiera di @hello-pangea/dnd elabora il sollevamento, lo spostamento e
  // il rilascio in fotogrammi successivi, e premendo tutto nello stesso
  // istante lo spostamento non avviene. Con il vecchio selettore il test
  // passava lo stesso, perche' cercava la card in un contenitore che include
  // TUTTE le colonne: verificava di fatto che la card esistesse, non dove
  // fosse finita.
  await card.focus()
  await page.keyboard.press(' ')
  await page.waitForTimeout(300)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(300)
  await page.keyboard.press(' ')

  // La colonna "Negoziazione" ora contiene la card
  // La colonna per nome, non `locator('div').first()`: quello risaliva a un
  // contenitore che include anche l'area delle notifiche, e la notifica
  // «"<nome>" spostato in Negoziazione» contiene lo stesso testo della card.
  // L'asserzione falliva quindi per ambiguita' quando la notifica era ancora
  // a schermo — cioe' in CI, dove tutto e' piu' lento.
  const negoziazione = page.locator('[data-colonna="Negoziazione"]')
  await expect(negoziazione.getByText(nome)).toBeVisible({ timeout: 10_000 })

  // Prima di ricaricare si aspetta la CONFERMA DEL SERVER. Lo spostamento
  // e' ottimistico: la card si muove subito in locale, mentre la scrittura
  // viaggia. Ricaricare senza aspettare annulla la richiesta in volo, e il
  // controllo di persistenza qui sotto fallisce per una ragione che non
  // c'entra col prodotto. La notifica di riuscita e' emessa in `onSuccess`,
  // quindi e' il segnale che la riga sul database e' stata aggiornata.
  await expect(page.getByText(`"${nome}" spostato in Negoziazione`)).toBeVisible({
    timeout: 10_000,
  })

  // Persistenza: dopo reload la card è ancora in Negoziazione
  await page.reload()
  await expect(page.getByText(nome)).toBeVisible({ timeout: 15_000 })
  const negoziazione2 = page.locator('[data-colonna="Negoziazione"]')
  await expect(negoziazione2.getByText(nome)).toBeVisible({ timeout: 10_000 })
})
