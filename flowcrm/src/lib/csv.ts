/**
 * Serializza righe in CSV (RFC 4180): virgolette raddoppiate, campi con
 * virgola/virgolette/newline quotati. BOM UTF-8 per Excel italiano.
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const linee = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))]
  return '﻿' + linee.join('\r\n')
}

/** Avvia il download di un contenuto CSV come file. */
export function scaricaCsv(nomeFile: string, contenuto: string): void {
  const blob = new Blob([contenuto], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeFile.endsWith('.csv') ? nomeFile : `${nomeFile}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Parser CSV minimale ma corretto: gestisce virgolette, virgole nei campi
 * quotati, e newline CRLF/LF. Restituisce header + righe come oggetti.
 */
export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCsv(text: string, separatore: ',' | ';' = ','): ParsedCsv {
  const records: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  const pushField = () => { row.push(field); field = '' }
  const pushRow = () => { records.push(row); row = [] }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === separatore) pushField()
      else if (ch === '\r') { /* ignora */ }
      else if (ch === '\n') { pushField(); pushRow() }
      else field += ch
    }
  }
  // ultimo campo/riga se il file non termina con newline
  if (field.length > 0 || row.length > 0) { pushField(); pushRow() }

  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ''))
  if (nonEmpty.length === 0) return { headers: [], rows: [] }

  const headers = nonEmpty[0].map((h) => h.trim())
  const rows = nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim() })
    return obj
  })
  return { headers, rows }
}
