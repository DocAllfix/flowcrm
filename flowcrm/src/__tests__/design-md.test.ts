/**
 * Guardia: DESIGN.md dice la verità su index.css.
 *
 * ── Perché esiste ───────────────────────────────────────────────────
 * DESIGN.md è la carta che leggono gli agenti prima di disegnare una
 * schermata nuova. Dopo la Fase 1 i suoi colori erano rimasti quelli di
 * prima: dichiarava per esempio un testo QUASI BIANCO sul primario,
 * mentre il valore vero — calcolato proprio perché il bianco stava a
 * 3,08:1 — è scuro. Un agente che si fosse fidato della carta avrebbe
 * rimesso il difetto appena corretto.
 *
 * Qui ogni colore dichiarato nel frontmatter si confronta col token che
 * dice di rappresentare. Se uno dei due cambia senza l'altro, fallisce.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CSS = readFileSync(path.join(SRC, 'index.css'), 'utf8')
const DESIGN = readFileSync(path.join(SRC, '..', 'DESIGN.md'), 'utf8')

/** Nome nel frontmatter → [blocco di index.css, token]. */
const CORRISPONDENZE: Record<string, [':root' | '.dark', string]> = {
  primary: [':root', '--primary'],
  'primary-foreground': [':root', '--primary-foreground'],
  'accent-brand': [':root', '--secondary'],
  'surface-base': [':root', '--background'],
  'surface-raised': [':root', '--card'],
  'surface-sunken': [':root', '--muted'],
  ink: [':root', '--foreground'],
  'ink-muted': [':root', '--muted-foreground'],
  hairline: [':root', '--border'],
  'control-edge': [':root', '--input'],
  'state-danger': [':root', '--destructive'],
  'state-success': [':root', '--success'],
  'state-warning': [':root', '--warning'],
  'night-base': ['.dark', '--background'],
  'night-raised': ['.dark', '--card'],
  'night-ink': ['.dark', '--foreground'],
}

/** oklch(l c h) → terna numerica, così 0.9770 e 0.977 sono uguali. */
function numeri(valore: string): number[] {
  const m = valore.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/)
  if (!m) throw new Error(`non è un oklch: ${valore}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function tokenCss(blocco: string, token: string): string {
  const inizio = CSS.indexOf(blocco + ' {')
  const corpo = CSS.slice(inizio, CSS.indexOf('\n  }', inizio))
  const m = corpo.match(new RegExp(`${token}:\\s*(oklch\\([^)]*\\))`))
  if (!m) throw new Error(`${token} non trovato in ${blocco}`)
  return m[1]
}

const frontmatter = DESIGN.slice(0, DESIGN.indexOf('\n---', 4))
const dichiarati = new Map<string, string>()
for (const m of frontmatter.matchAll(/^ {2}([a-z-]+): "(oklch\([^"]*\))"/gm)) {
  dichiarati.set(m[1], m[2])
}

describe('DESIGN.md e index.css dicono la stessa cosa', () => {
  it('il frontmatter dichiara i colori che ci si aspetta', () => {
    expect([...dichiarati.keys()].sort()).toEqual(Object.keys(CORRISPONDENZE).sort())
  })

  for (const [nome, [blocco, token]] of Object.entries(CORRISPONDENZE)) {
    it(`${nome} coincide con ${token} in ${blocco}`, () => {
      expect(numeri(dichiarati.get(nome)!)).toEqual(numeri(tokenCss(blocco, token)))
    })
  }

  it('la famiglia del carattere è quella che il pacchetto registra davvero', () => {
    // Il pacchetto dichiara 'Inter Variable'. Scrivere InterVariable, come
    // faceva la prima versione, indicherebbe un carattere che non esiste.
    expect(DESIGN).not.toMatch(/InterVariable/)
    expect(CSS).toContain('"Inter Variable"')
  })
})
