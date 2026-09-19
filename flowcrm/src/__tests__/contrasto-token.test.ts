/**
 * Guardia sui contrasti dei token di design.
 *
 * ── Perché esiste ───────────────────────────────────────────────────
 * `PRODUCT.md` dichiara WCAG 2.2 AA **vincolante**, non best-effort. Un
 * contrasto è un numero: o lo si calcola, o si sta indovinando. Prima che
 * questo test esistesse, sei coppie di token fallivano senza che nessuno
 * se ne accorgesse — fra cui i badge «riuscita», bianco su verde acqua a
 * **2,39:1**, cioè praticamente illeggibili, e i bordi dei campi a 1,48:1.
 *
 * Il test legge `src/index.css`: non una copia dei valori, il file vero.
 * Se qualcuno cambia un token e rompe una coppia, questo fallisce prima
 * che il cliente lo veda.
 *
 * ── Cosa NON copre ──────────────────────────────────────────────────
 * Le tinte che arrivano da `/config.json` a runtime: quelle non stanno in
 * questo file. Le verifica la derivazione del tema (Fase 2), che calcola
 * `--primary-foreground` dalla lightness invece di assumerla.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Si legge il file VERO, non una copia dei valori: una guardia che si porta
// dietro i numeri che deve controllare non sta controllando niente.
// (`import '../index.css?raw'` non funziona: vitest neutralizza gli import di
// CSS e restituisce una stringa vuota. I tipi di Node arrivano da
// tsconfig.test.json, che esiste per non esporli al codice dell'interfaccia.)
const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CSS = readFileSync(path.join(RADICE, 'index.css'), 'utf8')

type Rgb = [number, number, number]

/** OKLCH → sRGB (0–1), senza dipendenze: è l'unica conversione che serve. */
function oklchToRgb(L: number, C: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lineare = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return lineare.map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
    return Math.min(1, Math.max(0, v))
  }) as Rgb
}

const luminanza = ([r, g, b]: Rgb): number => {
  const f = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const contrasto = (a: Rgb, b: Rgb): number => {
  const la = luminanza(a)
  const lb = luminanza(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Estrae i token di un blocco (`:root` oppure `.dark`) da index.css. */
function tokenDelBlocco(selettore: string): Map<string, Rgb> {
  const inizio = CSS.indexOf(selettore + ' {')
  if (inizio === -1) throw new Error(`blocco ${selettore} non trovato in index.css`)
  // Il blocco finisce alla prima riga che chiude con due spazi di rientro.
  const fine = CSS.indexOf('\n  }', inizio)
  const corpo = CSS.slice(inizio, fine === -1 ? undefined : fine)

  const mappa = new Map<string, Rgb>()
  const re = /(--[a-z0-9-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(corpo))) {
    mappa.set(m[1], oklchToRgb(Number(m[2]), Number(m[3]), Number(m[4])))
  }
  return mappa
}

/** Coppie testo/fondo che devono stare sopra AA per il testo (4,5:1). */
const COPPIE_TESTO: Array<[string, string]> = [
  ['--foreground', '--background'],
  ['--card-foreground', '--card'],
  ['--popover-foreground', '--popover'],
  ['--muted-foreground', '--card'],
  ['--muted-foreground', '--background'],
  ['--muted-foreground', '--muted'],
  ['--primary-foreground', '--primary'],
  ['--secondary-foreground', '--secondary'],
  ['--destructive-foreground', '--destructive'],
  ['--success-foreground', '--success'],
  ['--warning-foreground', '--warning'],
  ['--accent-foreground', '--accent'],
  ['--sidebar-foreground', '--sidebar-background'],
  ['--sidebar-accent-foreground', '--sidebar-accent'],
  ['--sidebar-primary-foreground', '--sidebar-primary'],
  // `--destructive` non è solo un fondo: è anche il colore del testo di
  // errore sopra le superfici. Deve reggere in entrambi i ruoli.
  ['--destructive', '--background'],
  ['--destructive', '--card'],
]

/**
 * Contorni di COMANDI e indicatori di stato: WCAG 1.4.11 chiede 3:1.
 * `--border` non è in elenco di proposito: separa, non delimita un
 * comando, e per un divisore il criterio non si applica.
 */
const COPPIE_COMANDO: Array<[string, string]> = [
  ['--input', '--card'],
  ['--input', '--background'],
  ['--ring', '--background'],
  ['--ring', '--card'],
]

for (const tema of [':root', '.dark'] as const) {
  describe(`contrasto dei token — tema ${tema === ':root' ? 'chiaro' : 'scuro'}`, () => {
    const token = tokenDelBlocco(tema)

    it('il blocco definisce i token attesi', () => {
      expect(token.size).toBeGreaterThan(30)
    })

    for (const [testo, fondo] of COPPIE_TESTO) {
      it(`${testo} su ${fondo} sta sopra AA per il testo (4,5:1)`, () => {
        const a = token.get(testo)
        const b = token.get(fondo)
        expect(a, `${testo} non definito in ${tema}`).toBeDefined()
        expect(b, `${fondo} non definito in ${tema}`).toBeDefined()
        expect(contrasto(a!, b!)).toBeGreaterThanOrEqual(4.5)
      })
    }

    for (const [linea, fondo] of COPPIE_COMANDO) {
      it(`${linea} su ${fondo} sta sopra 3:1 (contorno di comando)`, () => {
        const a = token.get(linea)
        const b = token.get(fondo)
        expect(a, `${linea} non definito in ${tema}`).toBeDefined()
        expect(b, `${fondo} non definito in ${tema}`).toBeDefined()
        expect(contrasto(a!, b!)).toBeGreaterThanOrEqual(3)
      })
    }

    it('nessun neutro è un grigio a chroma zero', () => {
      // Un grigio a chroma 0 accanto a una tinta di marca sembra spento.
      // Il bianco puro della carta è l'unica eccezione ammessa, e qui non
      // c'è: le superfici sono tintate verso la tinta corrente.
      const re = /(--[a-z0-9-]+):\s*oklch\(([\d.]+)\s+0\s+/g
      const corpo = CSS.slice(CSS.indexOf(tema + ' {'))
      const trovati: string[] = []
      let m: RegExpExecArray | null
      while ((m = re.exec(corpo.slice(0, corpo.indexOf('\n  }'))))) trovati.push(m[1])
      expect(trovati).toEqual([])
    })
  })
}

describe('scelte di sistema che non devono regredire', () => {
  it('i token sono in OKLCH, non più in triplette HSL', () => {
    expect(CSS).not.toMatch(/--[a-z-]+:\s*\d+\s+\d+%\s+\d+%/)
    expect(CSS).toContain('oklch(')
  })

  it('Inter è auto-ospitata e non arriva da un CDN', () => {
    // La CSP di produzione dichiara `font-src 'self' data:`: un @import da
    // fonts.googleapis.com funzionerebbe in sviluppo e verrebbe bloccato
    // dal cliente, cioè il difetto si scoprirebbe in produzione.
    expect(CSS).toContain('@fontsource-variable/inter')
    expect(CSS).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/)
  })

  it('i numeri sono tabellari in tabelle e KPI', () => {
    expect(CSS).toMatch(/table,\s*\n?\s*\[data-slot="kpi"\]\s*\{\s*\n?\s*font-variant-numeric:\s*tabular-nums/)
  })

  it('il movimento ridotto è rispettato', () => {
    expect(CSS).toContain('prefers-reduced-motion: reduce')
  })
})
