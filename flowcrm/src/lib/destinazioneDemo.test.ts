import { describe, expect, it } from 'vitest'
import { destinazioneSicura } from './destinazioneDemo'

const AMMESSI = ['/', '/cantieri', '/gare-kanban']

describe('destinazioneSicura', () => {
  it('porta a una voce del menu', () => {
    expect(destinazioneSicura('/cantieri', AMMESSI)).toBe('/cantieri')
    expect(destinazioneSicura('/gare-kanban', AMMESSI)).toBe('/gare-kanban')
  })

  it('senza parametro porta al cruscotto', () => {
    expect(destinazioneSicura(null, AMMESSI)).toBe('/')
    expect(destinazioneSicura('', AMMESSI)).toBe('/')
  })

  it('rifiuta indirizzi esterni o costruiti', () => {
    for (const v of ['https://evil.example', '//evil.example', '/\\evil.example', 'cantieri', '/cantieri?x=1', '/cantieri/../utenti', '/utenti']) {
      expect(destinazioneSicura(v, AMMESSI)).toBe('/')
    }
  })
})
