/**
 * Guardia sul tema derivato dai colori del cliente.
 *
 * ── Perché esiste ───────────────────────────────────────────────────
 * `PRODUCT.md` dice che il colore appartiene al cliente e che WCAG 2.2 AA
 * è vincolante. Le due cose insieme significano una sola cosa: **non
 * possiamo verificare una palette, dobbiamo verificare una funzione.**
 * Un contrasto controllato solo sull'arancio di default non dice niente
 * sul cliente che configura un giallo chiaro.
 *
 * Qui si prendono tinte scelte apposta per essere difficili — giallo
 * quasi bianco, ciano saturissimo, blu notte, un grigio senza tinta — e
 * si verifica che il foglio generato regga AA in entrambi i temi.
 */
import { describe, it, expect } from 'vitest'
import { derivaFoglio, coloreTestoLeggibile } from '@/lib/tema'
import { contrasto, tokenDelBlocco, oklchToRgb } from './_colore'

/** Tinte di prova: le ultime quattro esistono per rompere il calcolo. */
const TINTE: Array<[string, string]> = [
  ['arancio di ripiego', '#ff5c35'],
  ['blu aziendale', '#1d4ed8'],
  ['verde petrolio', '#0f766e'],
  ['viola', '#7c3aed'],
  ['rosso mattone', '#b91c1c'],
  ['magenta', '#db2777'],
  ['ciano saturo', '#06b6d4'],
  ['verde acido', '#65a30d'],
  // ── casi limite ──────────────────────────────────────────────────
  ['giallo quasi bianco', '#fde047'],
  ['giallo pieno', '#ffff00'],
  ['blu notte', '#0f172a'],
  ['quasi nero', '#111111'],
  ['grigio senza tinta', '#808080'],
  ['quasi bianco', '#f8fafc'],
]

/** Coppie che devono stare sopra AA per il testo, qualunque sia la tinta. */
const COPPIE_TESTO: Array<[string, string]> = [
  ['--foreground', '--background'],
  ['--card-foreground', '--card'],
  ['--muted-foreground', '--card'],
  ['--muted-foreground', '--background'],
  ['--primary-foreground', '--primary'],
  ['--accent-foreground', '--accent'],
  ['--primary-testo', '--card'],
  ['--primary-testo', '--background'],
  ['--secondary-foreground', '--secondary'],
  ['--sidebar-foreground', '--sidebar-background'],
  ['--sidebar-primary-foreground', '--sidebar-primary'],
  ['--sidebar-accent-foreground', '--sidebar-accent'],
]

/** Contorni di comando e indicatori di stato: WCAG 1.4.11 chiede 3:1. */
const COPPIE_COMANDO: Array<[string, string]> = [
  ['--input', '--background'],
  ['--input', '--card'],
  ['--ring', '--background'],
  ['--sidebar-ring', '--sidebar-background'],
]

describe.each(TINTE)('tinta cliente: %s (%s)', (_nome, hex) => {
  const foglio = derivaFoglio(hex, '#33475b')

  it('produce entrambi i blocchi, con .dark dopo :root', () => {
    expect(foglio).toContain(':root {')
    expect(foglio).toContain('.dark {')
    // L'ordine non è estetico: a parità di specificità vince l'ultimo, e
    // se `.dark` venisse prima il tema scuro resterebbe coi colori del
    // chiaro.
    expect(foglio.indexOf('.dark {')).toBeGreaterThan(foglio.indexOf(':root {'))
  })

  for (const tema of [':root', '.dark'] as const) {
    const etichetta = tema === ':root' ? 'chiaro' : 'scuro'

    for (const [testo, fondo] of COPPIE_TESTO) {
      it(`[${etichetta}] ${testo} su ${fondo} ≥ 4,5:1`, () => {
        const token = tokenDelBlocco(foglio, tema)
        const a = token.get(testo)
        const b = token.get(fondo)
        expect(a, `${testo} mancante`).toBeDefined()
        expect(b, `${fondo} mancante`).toBeDefined()
        expect(contrasto(a!, b!)).toBeGreaterThanOrEqual(4.5)
      })
    }

    for (const [linea, fondo] of COPPIE_COMANDO) {
      it(`[${etichetta}] ${linea} su ${fondo} ≥ 3:1`, () => {
        const token = tokenDelBlocco(foglio, tema)
        const a = token.get(linea)
        const b = token.get(fondo)
        expect(a, `${linea} mancante`).toBeDefined()
        expect(b, `${fondo} mancante`).toBeDefined()
        expect(contrasto(a!, b!)).toBeGreaterThanOrEqual(3)
      })
    }
  }
})

describe('coloreTestoLeggibile — il colore è un dato, il contrasto no', () => {
  /** Legge l'oklch restituito e lo converte, così si misura il vero. */
  const rgbDi = (valore: string) => {
    const m = valore.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/)!
    return oklchToRgb(Number(m[1]), Number(m[2]), Number(m[3]))
  }
  const esadecimaleARgb = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]

  // I primi due sono quelli che la scansione axe ha trovato nella lista dei
  // deal, con testo bianco: 3,67:1 e 2,53:1.
  for (const hex of ['#3b82f6', '#10b981', '#f59e0b', '#fde047', '#0f172a', '#ef4444', '#8b5cf6']) {
    it(`su ${hex} il testo sta sopra 4,5:1`, () => {
      const testo = coloreTestoLeggibile(hex)
      expect(contrasto(rgbDi(testo), esadecimaleARgb(hex))).toBeGreaterThanOrEqual(4.5)
    })
  }

  it('sul primario rimanda al token già calcolato', () => {
    expect(coloreTestoLeggibile('var(--color-primary)')).toBe('var(--primary-foreground)')
    expect(coloreTestoLeggibile(null)).toBe('var(--primary-foreground)')
  })

  it('un colore illeggibile ricade sull’inchiostro invece di inventare', () => {
    expect(coloreTestoLeggibile('non-un-colore')).toBe('var(--foreground)')
  })
})

describe('robustezza', () => {
  it('un colore non valido non ferma l\'istanza: nessun foglio, si resta sul ripiego', () => {
    for (const rotto of ['', 'rosso', '#12', 'oklch(0.5 0.1 30)', '#gggggg']) {
      expect(derivaFoglio(rotto, '#33475b')).toBe('')
    }
  })

  it('accetta la forma a tre cifre e senza cancelletto', () => {
    expect(derivaFoglio('#f53', '#33475b')).toContain(':root {')
    expect(derivaFoglio('ff5c35', '33475b')).toContain(':root {')
  })

  it('un accentColor non valido non impedisce il resto del tema', () => {
    const foglio = derivaFoglio('#1d4ed8', 'non-un-colore')
    expect(foglio).toContain('--primary:')
    // Senza secondario valido quei due token non si scrivono, e restano
    // quelli del foglio di stile: è meglio di un valore inventato.
    expect(foglio).not.toContain('--secondary:')
  })

  it('i neutri restano tintati verso la tinta del cliente', () => {
    const blu = tokenDelBlocco(derivaFoglio('#1d4ed8', '#33475b'), ':root')
    const arancio = tokenDelBlocco(derivaFoglio('#ff5c35', '#33475b'), ':root')
    // Lo stesso token con due tinte di marca diverse non può essere lo
    // stesso colore: se lo fosse, i neutri non starebbero seguendo nulla.
    expect(blu.get('--muted')).not.toEqual(arancio.get('--muted'))
  })
})
