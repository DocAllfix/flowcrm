import type { CantiereStato } from '@/modules/cantiere/queries/cantieri'

export const CANTIERE_STATI: {
  value: CantiereStato
  label: string
  tone: 'neutral' | 'primary' | 'info' | 'success' | 'danger' | 'warning'
}[] = [
  { value: 'pianificato', label: 'Pianificato', tone: 'neutral' },
  { value: 'in_apertura', label: 'In apertura', tone: 'info' },
  { value: 'attivo', label: 'Attivo', tone: 'success' },
  { value: 'sospeso', label: 'Sospeso', tone: 'warning' },
  { value: 'chiuso', label: 'Chiuso', tone: 'neutral' },
]

export const statoCantiere = (v: CantiereStato) =>
  CANTIERE_STATI.find((s) => s.value === v) ?? CANTIERE_STATI[0]

export const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export const fmtData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export const METEO_LABEL: Record<string, string> = {
  sereno: 'Sereno', nuvoloso: 'Nuvoloso', pioggia: 'Pioggia',
  neve: 'Neve', vento_forte: 'Vento forte',
}

export const SICUREZZA_LABEL: Record<string, string> = {
  sopralluogo: 'Sopralluogo', checklist: 'Checklist', non_conformita: 'Non conformità',
  near_miss: 'Near miss', incidente: 'Incidente', infortunio: 'Infortunio',
  prescrizione: 'Prescrizione', verbale: 'Verbale', consegna_dpi: 'Consegna DPI',
  riunione_coordinamento: 'Riunione di coordinamento', controllo_giornaliero: 'Controllo giornaliero',
}

export const QUALITA_TIPO_LABEL: Record<string, string> = {
  accettazione: 'Controllo in accettazione', corso_opera: "Controllo in corso d'opera",
  collaudo: 'Collaudo', prova: 'Prova',
}

export const AMBIENTE_LABEL: Record<string, string> = {
  rifiuti: 'Rifiuti', emissioni: 'Emissioni', scarichi: 'Scarichi',
  terre_rocce: 'Terre e rocce', rumore: 'Rumore',
}

export const MEZZO_TIPO_LABEL: Record<string, string> = {
  macchina_operatrice: 'Macchina operatrice', automezzo: 'Automezzo',
  ponteggio: 'Ponteggio', gru: 'Gru', ple: 'PLE', utensile: 'Utensile', altro: 'Altro',
}

export const MOVIMENTO_LABEL: Record<string, string> = {
  ordine: 'Ordine', consegna: 'Consegna', consumo: 'Consumo', reso: 'Reso',
}

export const SAL_STATO_LABEL: Record<string, { label: string; tone: 'neutral' | 'primary' | 'info' | 'success' }> = {
  bozza: { label: 'Bozza', tone: 'neutral' },
  emesso: { label: 'Emesso', tone: 'primary' },
  fatturato: { label: 'Fatturato', tone: 'info' },
  pagato: { label: 'Pagato', tone: 'success' },
}

/** Categorie documentali del cantiere (documento §3). */
export const CANTIERE_CATEGORIE_DOC = [
  'Contrattuale', 'Tecnica', 'Sicurezza', 'Qualità', 'Ambiente',
]

/** Tipi di scadenza tipici del cantiere (documento §15). */
export const CANTIERE_TIPI_SCADENZA = [
  'DURC', 'SOA', 'Assicurazione', 'Visita medica', 'Formazione',
  'Verifica attrezzatura', 'Autorizzazione', 'SAL', 'Collaudo', 'Consegna', 'Altro',
]
