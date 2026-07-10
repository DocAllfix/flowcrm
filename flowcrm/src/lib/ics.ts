/**
 * Genera un file ICS (RFC 5545) per una riunione e ne avvia il download.
 * Minimale: singolo VEVENT, nessuna ricorrenza.
 */
interface IcsEvent {
  uid: string
  titolo: string
  descrizione?: string | null
  inizio: string // ISO
  durataMinuti?: number | null
  luogo?: string | null
}

function toIcsDate(iso: string): string {
  // 2026-07-10T14:30:00Z → 20260710T143000Z
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcs(text: string): string {
  return text.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
}

export function scaricaIcs(ev: IcsEvent): void {
  const start = new Date(ev.inizio)
  const end = new Date(start.getTime() + (ev.durataMinuti ?? 60) * 60_000)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FlowCRM//IT',
    'BEGIN:VEVENT',
    `UID:${ev.uid}@flowcrm`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(start.toISOString())}`,
    `DTEND:${toIcsDate(end.toISOString())}`,
    `SUMMARY:${escapeIcs(ev.titolo)}`,
    ...(ev.descrizione ? [`DESCRIPTION:${escapeIcs(ev.descrizione)}`] : []),
    ...(ev.luogo ? [`LOCATION:${escapeIcs(ev.luogo)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${ev.titolo.replace(/[^\w]+/g, '_').slice(0, 40)}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
