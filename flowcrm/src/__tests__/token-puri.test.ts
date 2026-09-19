/**
 * Guardia sulla purezza dei token.
 *
 * ── Perché esiste ───────────────────────────────────────────────────
 * In questo prodotto un colore scritto a mano non è un errore estetico:
 * è **una funzione che il cliente ha pagato e non riceve**. `/config.json`
 * porta la tinta di ogni istanza, `src/lib/tema.ts` ne deriva la palette,
 * e ogni `bg-blue-50` o `#3b82f6` rimasto nel sorgente è un punto che
 * resterà del colore di FlowCRM qualunque cosa il cliente configuri.
 *
 * Il compilatore non lo vede (una stringa di classi è valida), Tailwind
 * non protesta (per un token inesistente semplicemente non genera nulla),
 * i collaudi funzionali non lo vedono (la pagina si apre). Lo vede il
 * cliente. Questo test lo vede prima.
 *
 * Alla sua introduzione trovava 79 classi di palette in 16 file e circa
 * 50 esadecimali in 11.
 *
 * ── E gli hsl() morti ───────────────────────────────────────────────
 * Un secondo controllo che nasce da un difetto vero, introdotto da me
 * nella Fase 1: quando i token sono passati da triplette HSL a OKLCH,
 * sono rimaste 30 scritture `hsl(var(--x))` sparse fra un foglio di stile
 * e cinque pagine. `hsl(oklch(...))` non è un colore valido, quindi
 * quelle regole erano **silenziosamente morte** — il popover del tour
 * guidato aveva perso tutto lo stile e nessun test se ne era accorto.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * File in cui un colore letterale è legittimo, con la ragione.
 * L'elenco è corto di proposito: ogni voce in più è una deroga.
 */
const DEROGHE = new Map<string, string>([
  [
    'index.css',
    'è il posto dove i token si definiscono: qui i valori letterali sono il punto',
  ],
  [
    path.join('config', 'app.config.ts'),
    'valori di ripiego di primaryColor e accentColor, usati solo se il cliente non configura nulla',
  ],
  [
    'main.tsx',
    'schermata di errore mostrata PRIMA che React esista: se la configurazione non si carica, i token nemmeno',
  ],
  [
    path.join('components', 'ErrorBoundary.tsx'),
    "ripiego per quando è il tema stesso a rompersi: deve funzionare senza dipendere da ciò che si è rotto",
  ],
])

const ESTENSIONI = ['.ts', '.tsx', '.css']

function file(dir: string, acc: string[] = []): string[] {
  for (const voce of readdirSync(dir)) {
    const p = path.join(dir, voce)
    if (statSync(p).isDirectory()) {
      if (voce === '__tests__' || voce === 'assets') continue
      file(p, acc)
    } else if (ESTENSIONI.includes(path.extname(voce))) {
      acc.push(p)
    }
  }
  return acc
}

/**
 * Toglie i commenti prima di cercare: le note che SPIEGANO perché una
 * classe è stata rimossa citano quella classe, e senza questo passaggio
 * il test si accuserebbe della propria documentazione.
 */
function senzaCommenti(sorgente: string): string {
  return sorgente
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const CLASSE_PALETTE = new RegExp(
  String.raw`\b(?:bg|text|border|from|to|via|ring|fill|stroke|decoration|outline|shadow|accent|caret|divide)-(?:${PALETTE})-\d{2,3}\b`,
  'g',
)
const ESADECIMALE = /#[0-9a-fA-F]{6}\b/g

const sorgenti = file(SRC).map((p) => ({
  relativo: path.relative(SRC, p),
  testo: senzaCommenti(readFileSync(p, 'utf8')),
}))

const derogato = (relativo: string) => DEROGHE.has(relativo)

describe('purezza dei token — il colore appartiene al cliente', () => {
  it('trova effettivamente i sorgenti da controllare', () => {
    // Se il percorso cambiasse, un test che non legge nulla passerebbe
    // sempre: è il modo più comune in cui una guardia smette di guardare.
    expect(sorgenti.length).toBeGreaterThan(100)
  })

  it('nessuna classe di palette Tailwind scritta a mano', () => {
    const colpevoli: string[] = []
    for (const { relativo, testo } of sorgenti) {
      if (derogato(relativo)) continue
      const trovate = testo.match(CLASSE_PALETTE)
      if (trovate) colpevoli.push(`${relativo}: ${[...new Set(trovate)].join(', ')}`)
    }
    expect(colpevoli).toEqual([])
  })

  it('nessun colore esadecimale fuori dalle deroghe', () => {
    const colpevoli: string[] = []
    for (const { relativo, testo } of sorgenti) {
      if (derogato(relativo)) continue
      const trovati = testo.match(ESADECIMALE)
      if (trovati) colpevoli.push(`${relativo}: ${[...new Set(trovati)].join(', ')}`)
    }
    expect(colpevoli).toEqual([])
  })

  it('nessun hsl(var(--token)): dalla Fase 1 i token sono in OKLCH', () => {
    // `hsl(oklch(...))` non è un colore valido: la dichiarazione viene
    // scartata in silenzio e l'elemento resta senza stile.
    const colpevoli = sorgenti
      .filter(({ testo }) => testo.includes('hsl(var('))
      .map(({ relativo }) => relativo)
    expect(colpevoli).toEqual([])
  })

  it('nessuna striscia colorata come bordo laterale', () => {
    // Divieto assoluto n.1 di DESIGN.md. Qui non è solo estetica: la voce
    // di menu corrente lo usava, e un bordo che compare allarga la scatola
    // — il testo si spostava di 3px a ogni cambio di pagina, e navigando
    // l'intero menu tremava.
    const strisce = /\bborder-[lr]-(?:\[\d+px\]|[2-9]|\d\d+)\b/g
    const colpevoli: string[] = []
    for (const { relativo, testo } of sorgenti) {
      const trovate = testo.match(strisce)
      if (trovate) colpevoli.push(`${relativo}: ${[...new Set(trovate)].join(', ')}`)
    }
    expect(colpevoli).toEqual([])
  })

  it('nessun gradient text', () => {
    // Divieto assoluto di DESIGN.md: decorativo, mai significante.
    const colpevoli = sorgenti
      .filter(({ testo }) => /bg-clip-text|background-clip:\s*text/.test(testo))
      .map(({ relativo }) => relativo)
    expect(colpevoli).toEqual([])
  })

  it('nessuna emoji nell’interfaccia', () => {
    // Anti-reference dichiarata in PRODUCT.md: «l'app consumer allegra».
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu
    const colpevoli: string[] = []
    for (const { relativo, testo } of sorgenti) {
      const trovate = testo.match(emoji)
      if (trovate) colpevoli.push(`${relativo}: ${[...new Set(trovate)].join(' ')}`)
    }
    expect(colpevoli).toEqual([])
  })

  it('le deroghe esistono davvero e sono motivate', () => {
    // Una deroga verso un file cancellato nasconderebbe che la ragione non
    // vale più.
    for (const [relativo, motivo] of DEROGHE) {
      expect(
        sorgenti.some((s) => s.relativo === relativo),
        `la deroga per ${relativo} punta a un file che non esiste più`,
      ).toBe(true)
      expect(motivo.length).toBeGreaterThan(30)
    }
  })
})
