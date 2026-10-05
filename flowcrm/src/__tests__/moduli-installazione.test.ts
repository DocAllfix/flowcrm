/**
 * Guardia sugli elenchi dei moduli dell'installazione.
 *
 * L'avvio del container (`deploy/docker-entrypoint.sh`) e il controllo
 * preliminare (`deploy/preflight.sh`) rifiutano uno slug sconosciuto: è
 * voluto, uno slug sbagliato darebbe un menu senza il modulo pagato. Ma
 * l'elenco è scritto a mano negli script: quando i sette moduli nuovi sono
 * entrati nel registro, gli script conoscevano ancora solo i cinque vecchi e
 * un'istanza Docker con il Ristorante non sarebbe partita. Questo test
 * tiene allineati registro, script ed esempio di configurazione.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const leggi = (f: string) => readFileSync(path.join(RADICE, f), 'utf8')

const registro = [...leggi('src/config/moduli.config.ts').matchAll(/slug: '([a-z]+)'/g)].map((m) => m[1]).sort()
const elencoScript = (file: string, variabile: string) => {
  const m = leggi(file).match(new RegExp(`^${variabile}="([^"]*)"`, 'm'))
  return (m?.[1] ?? '').split(/\s+/).filter(Boolean).sort()
}

describe('moduli ammessi dall\'installazione', () => {
  it('il registro ha i dodici moduli', () => {
    expect(registro).toHaveLength(12)
  })
  it('l\'avvio del container conosce tutti i moduli del registro', () => {
    expect(elencoScript('deploy/docker-entrypoint.sh', 'MODULI_NOTI')).toEqual(registro)
  })
  it('il controllo preliminare conosce tutti i moduli del registro', () => {
    expect(elencoScript('deploy/preflight.sh', 'NOTI')).toEqual(registro)
  })
  it('l\'esempio di configurazione li elenca tutti', () => {
    const testo = leggi('deploy/.env.prod.example')
    for (const s of registro) expect(testo).toMatch(new RegExp(`\\b${s}\\b`))
  })
})
