import { describe, it, expect } from 'vitest'
import { parseCsv } from './csv'

describe('parseCsv', () => {
  it('estrae header e righe', () => {
    const { headers, rows } = parseCsv('nome,piva\nRossi SRL,12345678901')
    expect(headers).toEqual(['nome', 'piva'])
    expect(rows).toEqual([{ nome: 'Rossi SRL', piva: '12345678901' }])
  })

  it('gestisce campi quotati con virgole', () => {
    const { rows } = parseCsv('nome,indirizzo\n"ACME, Inc","Via Roma, 1"')
    expect(rows[0]).toEqual({ nome: 'ACME, Inc', indirizzo: 'Via Roma, 1' })
  })

  it('gestisce virgolette escape ("")', () => {
    const { rows } = parseCsv('nome\n"Dan ""il grande"" SRL"')
    expect(rows[0].nome).toBe('Dan "il grande" SRL')
  })

  it('ignora righe completamente vuote e CRLF', () => {
    const { rows } = parseCsv('nome\r\nRossi\r\n\r\nBianchi\r\n')
    expect(rows.map((r) => r.nome)).toEqual(['Rossi', 'Bianchi'])
  })

  it('ritorna vuoto su input vuoto', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [] })
  })
})
