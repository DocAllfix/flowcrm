/**
 * Test unitari degli helper Zod italiani (kernel CertDesk).
 * Primo test del gate F0: la CI deve eseguire vitest con successo.
 */
import { describe, it, expect } from 'vitest'
import { optEmail, optPiva, optCap } from './schemas'

describe('optPiva — partita IVA italiana', () => {
  it('accetta 11 cifre valide', () => {
    expect(optPiva.safeParse('12345678901').success).toBe(true)
  })
  it('rifiuta lunghezza errata', () => {
    expect(optPiva.safeParse('1234567890').success).toBe(false)
    expect(optPiva.safeParse('123456789012').success).toBe(false)
  })
  it('rifiuta caratteri non numerici', () => {
    expect(optPiva.safeParse('1234567890A').success).toBe(false)
  })
  it('accetta vuoto/assente (campo opzionale)', () => {
    expect(optPiva.safeParse('').success).toBe(true)
    expect(optPiva.safeParse(undefined).success).toBe(true)
  })
})

describe('optCap — CAP italiano', () => {
  it('accetta 5 cifre', () => {
    expect(optCap.safeParse('00100').success).toBe(true)
  })
  it('rifiuta formati errati', () => {
    expect(optCap.safeParse('123').success).toBe(false)
    expect(optCap.safeParse('ABCDE').success).toBe(false)
  })
})

describe('optEmail', () => {
  it('accetta email valida', () => {
    expect(optEmail.safeParse('mario.rossi@azienda.it').success).toBe(true)
  })
  it('rifiuta email non valida', () => {
    expect(optEmail.safeParse('non-una-email').success).toBe(false)
  })
})
