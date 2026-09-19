import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibilità: WCAG 2.2 AA, che `PRODUCT.md` dichiara **vincolante** —
 * cioè un criterio che fa fallire, non un obiettivo.
 *
 * ── Perché in due temi ──────────────────────────────────────────────
 * Un contrasto che passa sulla carta chiara può fallire su fondo notte,
 * e viceversa. Prima di questa revisione il tema scuro non era mai stato
 * verificato da nessuno: si accendeva da solo seguendo il sistema
 * operativo, e 79 classi di colore fisse non avevano nemmeno una variante
 * scura.
 *
 * ── Perché le pagine interne sono in un blocco separato ─────────────
 * Richiedono una sessione. Se `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD`
 * non sono impostate, quella parte si salta, esattamente come le altre 25
 * spec di questo progetto. Non è un modo di nascondere il problema: è il
 * motivo per cui la scansione su tutte le pagine va rifatta su uno stack
 * locale con utenti di prova.
 */

const EMAIL = process.env.E2E_ADMIN_EMAIL
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

const REGOLE = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function scansiona(page: Page, tema: 'chiaro' | 'scuro') {
  if (tema === 'scuro') {
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(200)
  }
  const esito = await new AxeBuilder({ page }).withTags(REGOLE).analyze()
  const gravi = esito.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  )
  // Il messaggio dice QUALE regola e su quanti elementi: un fallimento che
  // costringe a riaprire il browser per capirlo non serve a nessuno.
  const dettaglio = gravi
    .map((v) => `${v.id} (${v.impact}, ${v.nodes.length} nodi): ${v.help}`)
    .join('\n')
  expect(gravi, `Violazioni in tema ${tema}:\n${dettaglio}`).toHaveLength(0)
}

const PUBBLICHE = [
  { percorso: '/login', attesa: 'button[type="submit"]' },
  { percorso: '/recupero', attesa: 'form' },
]

for (const { percorso, attesa } of PUBBLICHE) {
  for (const tema of ['chiaro', 'scuro'] as const) {
    test(`${percorso} rispetta WCAG 2.2 AA in tema ${tema}`, async ({ page }) => {
      await page.goto(percorso)
      await page.waitForSelector(attesa)
      await scansiona(page, tema)
    })
  }
}

test('nessuno scorrimento orizzontale alle larghezze di riferimento', async ({ page }) => {
  for (const larghezza of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width: larghezza, height: 800 })
    await page.goto('/login')
    await page.waitForSelector('button[type="submit"]')
    const misura = await page.evaluate(() => ({
      scorrimento: document.documentElement.scrollWidth,
      visibile: document.documentElement.clientWidth,
    }))
    expect(
      misura.scorrimento,
      `A ${larghezza}px la pagina scorre in orizzontale (${misura.scorrimento} > ${misura.visibile}).`,
    ).toBeLessThanOrEqual(misura.visibile)
  }
})

test.describe('pagine interne', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_EMAIL/PASSWORD non impostate')

  const INTERNE = [
    '/',
    '/organizzazioni',
    '/contatti',
    '/deal',
    '/attivita',
    '/commesse',
    '/fatture',
    '/profilo',
  ]

  test('le pagine principali rispettano WCAG 2.2 AA nei due temi', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-email').fill(EMAIL!)
    await page.getByTestId('login-password').fill(PASSWORD!)
    await page.getByTestId('login-submit').click()
    await page.waitForURL('**/')

    for (const percorso of INTERNE) {
      await page.goto(percorso)
      // Le pagine sono pigre: si aspetta che il contenuto sia arrivato,
      // altrimenti si scansionerebbe l'indicatore di attesa.
      await page.waitForSelector('h1', { timeout: 15_000 })
      for (const tema of ['chiaro', 'scuro'] as const) {
        await page.evaluate(() => document.documentElement.classList.remove('dark'))
        await scansiona(page, tema)
      }
    }
  })
})
