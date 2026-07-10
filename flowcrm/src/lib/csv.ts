/**
 * Parser CSV minimale ma corretto: gestisce virgolette, virgole nei campi
 * quotati, e newline CRLF/LF. Restituisce header + righe come oggetti.
 */
export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCsv(text: string): ParsedCsv {
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
      else if (ch === ',') pushField()
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
