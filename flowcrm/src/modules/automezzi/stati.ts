import type { AutomezzoStato, AutomezzoCategoria } from '@/modules/automezzi/queries/automezzi'

export const AUTOMEZZO_STATI: {
  value: AutomezzoStato
  label: string
  tone: 'neutral' | 'primary' | 'info' | 'success' | 'danger' | 'warning'
}[] = [
  { value: 'disponibile', label: 'Disponibile', tone: 'success' },
  { value: 'assegnato', label: 'Assegnato', tone: 'info' },
  { value: 'in_manutenzione', label: 'In manutenzione', tone: 'warning' },
  { value: 'fuori_servizio', label: 'Fuori servizio', tone: 'danger' },
  { value: 'dismesso', label: 'Dismesso', tone: 'neutral' },
]

export const statoAutomezzo = (v: AutomezzoStato) =>
  AUTOMEZZO_STATI.find((s) => s.value === v) ?? AUTOMEZZO_STATI[0]

export const CATEGORIA_LABEL: Record<AutomezzoCategoria, string> = {
  autovettura: 'Autovettura', furgone: 'Furgone', camion: 'Camion',
  escavatore: 'Escavatore', pala: 'Pala', piattaforma: 'Piattaforma',
  rimorchio: 'Rimorchio', altro: 'Altro',
}

export const ALIMENTAZIONE_LABEL: Record<string, string> = {
  benzina: 'Benzina', diesel: 'Diesel', gpl: 'GPL', metano: 'Metano',
  ibrida: 'Ibrida', elettrica: 'Elettrica',
}

export const ACQUISIZIONE_LABEL: Record<string, string> = {
  acquisto: 'Acquisto', leasing: 'Leasing', noleggio: 'Noleggio',
}

export const COSTO_VOCE_LABEL: Record<string, string> = {
  assicurazione: 'Assicurazione', bollo: 'Bollo', leasing: 'Leasing',
  noleggio: 'Noleggio', pedaggi: 'Pedaggi', parcheggi: 'Parcheggi',
  lavaggi: 'Lavaggi', accessori: 'Accessori', altro: 'Altro',
}

export const SINISTRO_STATO_LABEL: Record<string, { label: string; tone: 'danger' | 'warning' | 'success' | 'neutral' }> = {
  aperto: { label: 'Aperto', tone: 'danger' },
  in_lavorazione: { label: 'In lavorazione', tone: 'warning' },
  liquidato: { label: 'Liquidato', tone: 'success' },
  chiuso: { label: 'Chiuso', tone: 'neutral' },
}

export const PATENTE_LABEL: Record<string, string> = {
  patente_b: 'Patente B', patente_c: 'Patente C', patente_ce: 'Patente CE',
  patente_d: 'Patente D', cqc: 'CQC', adr: 'ADR',
  carta_conducente: 'Carta conducente', abilitazione: 'Abilitazione', altro: 'Altro',
}

/** Tipi di scadenza tipici del mezzo (documento §4). */
export const AUTOMEZZO_TIPI_SCADENZA = [
  'Revisione', 'Bollo', 'Assicurazione', 'Collaudo', 'Verifica periodica',
  'Garanzia', 'Leasing', 'Noleggio', 'Pneumatici', 'Estintore',
  'Tachigrafo', 'Altro',
]

export const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export const fmtData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
