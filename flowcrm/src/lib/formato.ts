/**
 * Formati italiani condivisi dai moduli: euro, numeri, date e ore.
 * Le date «AAAA-MM-GG» sono sempre del calendario locale, mai di UTC.
 */
export const fmtEuro = (n: number | string | null | undefined, decimali = 2) =>
  n === null || n === undefined || n === '' ? '—'
    : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimali,
        maximumFractionDigits: decimali }).format(Number(n))

export const fmtNumero = (n: number | string | null | undefined, decimali = 0) =>
  n === null || n === undefined || n === '' ? '—'
    : new Intl.NumberFormat('it-IT', { maximumFractionDigits: decimali }).format(Number(n))

export const fmtOra = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—'

export const fmtData = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00` : iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export const fmtGiornoOra = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

/** Data locale AAAA-MM-GG. */
export const isoLocale = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const oggiIso = () => isoLocale(new Date())

/** AAAA-MM-GG spostata di n giorni (a mezzogiorno: niente sorprese con l'ora legale). */
export const piuGiorni = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00`)
  d.setDate(d.getDate() + n)
  return isoLocale(d)
}

/** Giorni tra due date AAAA-MM-GG. */
export const giorniTra = (da: string, a: string) =>
  Math.round((new Date(`${a}T12:00`).getTime() - new Date(`${da}T12:00`).getTime()) / 86_400_000)
