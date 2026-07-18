export const APPUNTAMENTO_STATO: Record<string, { label: string; tone: 'primary' | 'info' | 'warning' | 'success' | 'neutral' | 'danger'; colore: string }> = {
  prenotato: { label: 'Prenotato', tone: 'primary', colore: '#f59e0b' },
  confermato: { label: 'Confermato', tone: 'info', colore: '#3b82f6' },
  in_sala: { label: 'In sala', tone: 'warning', colore: '#8b5cf6' },
  eseguito: { label: 'Eseguito', tone: 'success', colore: '#10b981' },
  annullato: { label: 'Annullato', tone: 'neutral', colore: '#94a3b8' },
  no_show: { label: 'No show', tone: 'danger', colore: '#f2545b' },
}

export const CONDIZIONE_LABEL: Record<string, string> = {
  patologia: 'Patologia', allergia: 'Allergia', terapia: 'Terapia',
  intervento: 'Intervento', farmaco: 'Farmaco', vaccinazione: 'Vaccinazione',
}

export const CONSENSO_LABEL: Record<string, string> = {
  privacy: 'Privacy (GDPR)', informato: 'Consenso informato', marketing: 'Marketing',
}

export const PRESTAZIONE_TIPO_LABEL: Record<string, string> = {
  visita: 'Visita specialistica', esame: 'Esame diagnostico',
  infermieristica: 'Prestazione infermieristica', terapia: 'Terapia', pacchetto: 'Pacchetto',
}

export const REFERTO_STATO: Record<string, { label: string; tone: 'neutral' | 'warning' | 'success' | 'info' }> = {
  bozza: { label: 'Bozza', tone: 'neutral' },
  da_validare: { label: 'Da validare', tone: 'warning' },
  validato: { label: 'Validato', tone: 'success' },
  inviato: { label: 'Inviato', tone: 'info' },
}

export const CANALE_LABEL: Record<string, string> = {
  email: 'Email', sms: 'SMS', pec: 'PEC', telefono: 'Telefono',
  whatsapp: 'WhatsApp', notifica: 'Notifica',
}

export const ARTICOLO_TIPO_LABEL: Record<string, string> = {
  farmaco: 'Farmaco', dispositivo: 'Dispositivo medico', consumo: 'Materiale di consumo',
}

export const QUALITA_TIPO_LABEL: Record<string, string> = {
  reclamo: 'Reclamo', non_conformita: 'Non conformità',
  evento_avverso: 'Evento avverso', audit: 'Audit interno',
}

export const APPARECCHIATURA_STATO: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  operativa: { label: 'Operativa', tone: 'success' },
  in_manutenzione: { label: 'In manutenzione', tone: 'warning' },
  fuori_servizio: { label: 'Fuori servizio', tone: 'danger' },
}

export const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export const fmtData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export const fmtDataOra = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—'

export const nomePaziente = (p: { nome: string; cognome: string | null } | null) =>
  p ? `${p.nome} ${p.cognome ?? ''}`.trim() : '—'
