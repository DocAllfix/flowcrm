import type { GaraStato } from '@/modules/gare/queries/gare'

/**
 * Stati della gara: etichette, toni badge e colori della colonna Kanban.
 *
 * I colori sono token della scala dati (`--serie-*`), non esadecimali: gli
 * esadecimali che c'erano qui non avevano una versione per il tema scuro e
 * non erano mai stati verificati per contrasto. I token sì, e cambiano da
 * soli col tema. Funzionano dentro `style` perché il browser risolve `var()`
 * nelle proprietà in linea — è già il modo in cui KanbanCard usa
 * `var(--color-primary)` come ripiego.
 */
export const GARA_STATI: {
  value: GaraStato
  label: string
  tone: 'neutral' | 'primary' | 'info' | 'success' | 'danger' | 'warning'
  colore: string
}[] = [
  { value: 'in_analisi', label: 'In analisi', tone: 'neutral', colore: 'var(--serie-neutra)' },
  { value: 'in_preparazione', label: 'In preparazione', tone: 'primary', colore: 'var(--serie-3)' },
  { value: 'presentata', label: 'Presentata', tone: 'info', colore: 'var(--serie-1)' },
  { value: 'aggiudicata', label: 'Aggiudicata', tone: 'success', colore: 'var(--serie-2)' },
  { value: 'non_aggiudicata', label: 'Non aggiudicata', tone: 'danger', colore: 'var(--destructive)' },
  { value: 'annullata', label: 'Annullata', tone: 'neutral', colore: 'var(--serie-neutra)' },
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
