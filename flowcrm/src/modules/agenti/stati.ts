import type { AgenteTipologia } from '@/modules/agenti/queries/agenti'

export const TIPOLOGIA_LABEL: Record<AgenteTipologia, string> = {
  monomandatario: 'Monomandatario',
  plurimandatario: 'Plurimandatario',
  procacciatore: 'Procacciatore',
  dipendente: 'Dipendente',
}

export const AGENTE_STATO: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  attivo: { label: 'Attivo', tone: 'success' },
  sospeso: { label: 'Sospeso', tone: 'warning' },
  cessato: { label: 'Cessato', tone: 'neutral' },
}

export const VISITA_ESITO: Record<string, { label: string; tone: 'success' | 'neutral' | 'danger' | 'warning' }> = {
  positivo: { label: 'Positivo', tone: 'success' },
  neutro: { label: 'Neutro', tone: 'neutral' },
  negativo: { label: 'Negativo', tone: 'danger' },
  da_ricontattare: { label: 'Da ricontattare', tone: 'warning' },
}

export const OFFERTA_STATO: Record<string, { label: string; tone: 'neutral' | 'primary' | 'success' | 'danger' | 'warning' }> = {
  bozza: { label: 'Bozza', tone: 'neutral' },
  inviata: { label: 'Inviata', tone: 'primary' },
  accettata: { label: 'Accettata', tone: 'success' },
  rifiutata: { label: 'Rifiutata', tone: 'danger' },
  scaduta: { label: 'Scaduta', tone: 'warning' },
}

export const ORDINE_STATO: Record<string, { label: string; tone: 'neutral' | 'primary' | 'info' | 'success' | 'danger' }> = {
  bozza: { label: 'Bozza', tone: 'neutral' },
  confermato: { label: 'Confermato', tone: 'primary' },
  in_consegna: { label: 'In consegna', tone: 'info' },
  consegnato: { label: 'Consegnato', tone: 'success' },
  fatturato: { label: 'Fatturato', tone: 'success' },
  annullato: { label: 'Annullato', tone: 'danger' },
}

export const NOTA_SPESE_TIPO: Record<string, string> = {
  carburante: 'Carburante', pedaggi: 'Pedaggi', vitto: 'Vitto',
  alloggio: 'Alloggio', trasferta: 'Trasferta', parcheggi: 'Parcheggi', altro: 'Altro',
}

export const NOTA_SPESE_STATO: Record<string, { label: string; tone: 'primary' | 'success' | 'danger' | 'info' }> = {
  presentata: { label: 'Presentata', tone: 'primary' },
  approvata: { label: 'Approvata', tone: 'success' },
  rifiutata: { label: 'Rifiutata', tone: 'danger' },
  rimborsata: { label: 'Rimborsata', tone: 'info' },
}

export const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export const fmtData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export const periodoCorrente = () => new Date().toISOString().slice(0, 7)
