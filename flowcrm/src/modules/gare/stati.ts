import type { GaraStato } from '@/modules/gare/queries/gare'

/** Stati della gara: etichette, toni badge e colori colonna Kanban. */
export const GARA_STATI: {
  value: GaraStato
  label: string
  tone: 'neutral' | 'primary' | 'info' | 'success' | 'danger' | 'warning'
  colore: string
}[] = [
  { value: 'in_analisi', label: 'In analisi', tone: 'neutral', colore: '#94a3b8' },
  { value: 'in_preparazione', label: 'In preparazione', tone: 'primary', colore: '#f59e0b' },
  { value: 'presentata', label: 'Presentata', tone: 'info', colore: '#3b82f6' },
  { value: 'aggiudicata', label: 'Aggiudicata', tone: 'success', colore: '#10b981' },
  { value: 'non_aggiudicata', label: 'Non aggiudicata', tone: 'danger', colore: '#f2545b' },
  { value: 'annullata', label: 'Annullata', tone: 'neutral', colore: '#64748b' },
]

export const statoGara = (v: GaraStato) => GARA_STATI.find((s) => s.value === v) ?? GARA_STATI[0]

export const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export const fmtData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

/** Giorni al termine di presentazione (negativo = superato). */
export function giorniAlTermine(iso: string | null): number | null {
  if (!iso) return null
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  const t = new Date(iso); t.setHours(0, 0, 0, 0)
  return Math.round((t.getTime() - oggi.getTime()) / 86400000)
}
