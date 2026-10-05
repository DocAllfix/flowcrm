/**
 * Etichette e toni del modulo Palestra.
 */
export { fmtEuro, fmtNumero, fmtOra, fmtData, fmtGiornoOra, oggiIso, piuGiorni, giorniTra, isoLocale } from '@/lib/formato'

type Tono = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'serie'

export const SOCIO_STATO: Record<string, { label: string; tone: Tono }> = {
  attivo: { label: 'Attivo', tone: 'success' },
  sospeso: { label: 'Sospeso', tone: 'info' },
  moroso: { label: 'Moroso', tone: 'danger' },
  scaduto: { label: 'Scaduto', tone: 'warning' },
  senza_titolo: { label: 'Senza abbonamento', tone: 'neutral' },
  ex: { label: 'Ex socio', tone: 'neutral' },
}

export const ABBONAMENTO_STATO: Record<string, { label: string; tone: Tono }> = {
  attivo: { label: 'Attivo', tone: 'success' },
  sospeso: { label: 'Sospeso', tone: 'info' },
  scaduto: { label: 'Scaduto', tone: 'neutral' },
  disdetto: { label: 'Disdetto', tone: 'neutral' },
}

export const RATA_STATO: Record<string, { label: string; tone: Tono }> = {
  da_pagare: { label: 'Da pagare', tone: 'warning' },
  pagata: { label: 'Pagata', tone: 'success' },
  fallita: { label: 'Addebito fallito', tone: 'danger' },
  insoluta: { label: 'Insoluta', tone: 'danger' },
  fatturata: { label: 'Fatturata all\'azienda', tone: 'info' },
  annullata: { label: 'Annullata', tone: 'neutral' },
}

export const PRENOTAZIONE_STATO: Record<string, { label: string; tone: Tono }> = {
  prenotata: { label: 'Prenotata', tone: 'info' },
  attesa: { label: 'In attesa', tone: 'warning' },
  presente: { label: 'Presente', tone: 'success' },
  assente: { label: 'Assente', tone: 'danger' },
  annullata: { label: 'Disdetta', tone: 'neutral' },
}

export const SESSIONE_STATO: Record<string, { label: string; tone: Tono }> = {
  prenotata: { label: 'Prenotata', tone: 'info' },
  svolta: { label: 'Svolta', tone: 'success' },
  annullata: { label: 'Annullata', tone: 'neutral' },
  no_show: { label: 'Non presentato', tone: 'danger' },
}
export const APPUNTAMENTO_STATO: Record<string, { label: string; tone: Tono }> = {
  prenotato: { label: 'Prenotato', tone: 'info' },
  svolto: { label: 'Svolto', tone: 'success' },
  annullato: { label: 'Annullato', tone: 'neutral' },
  no_show: { label: 'Non presentato', tone: 'danger' },
}

export const FORMULA_TIPO: Record<string, string> = {
  mensile: 'Mensile', trimestrale: 'Trimestrale', semestrale: 'Semestrale', annuale: 'Annuale', open: 'Open', fasce_orarie: 'Fasce orarie',
  sala_pesi: 'Solo sala pesi', corsi: 'Corsi', piscina: 'Piscina', wellness: 'Wellness', personal_training: 'Personal training',
  corporate: 'Corporate', studenti: 'Studenti', famiglie: 'Famiglie', altro: 'Altro',
}
export const SERVIZIO: Record<string, string> = {
  sala_pesi: 'Sala pesi', corsi: 'Corsi', piscina: 'Piscina', wellness: 'Wellness', pt: 'Personal training',
}
export const CARNET_SERVIZIO: Record<string, string> = {
  ingressi: 'Ingressi', corsi: 'Corsi', lezioni_pt: 'Lezioni PT', massaggi: 'Massaggi', wellness: 'Wellness', piscina: 'Piscina',
}
export const DISCIPLINA: Record<string, string> = {
  yoga: 'Yoga', pilates: 'Pilates', spinning: 'Spinning', functional: 'Functional training', cross_training: 'Cross training',
  ginnastica: 'Ginnastica', zumba: 'Zumba', body_pump: 'Body pump', arti_marziali: 'Arti marziali', acqua: 'In acqua',
  personalizzato: 'Personalizzato', altro: 'Altro',
}
export const LIVELLO: Record<string, string> = { base: 'Base', intermedio: 'Intermedio', avanzato: 'Avanzato', tutti: 'Tutti i livelli' }
export const SALA_TIPO: Record<string, string> = {
  sala_pesi: 'Sala pesi', sala_corsi: 'Sala corsi', spinning: 'Sala spinning', pt: 'Sala PT', piscina: 'Piscina', wellness: 'Area wellness',
  spogliatoio: 'Spogliatoio', multifunzione: 'Multifunzione', altro: 'Altro',
}
export const WELLNESS_TIPO: Record<string, string> = {
  sauna: 'Sauna', bagno_turco: 'Bagno turco', massaggio: 'Massaggio', estetica: 'Estetica', solarium: 'Solarium', spa: 'SPA',
  fisioterapia: 'Fisioterapia', nutrizione: 'Nutrizione', recovery: 'Recovery', altro: 'Altro',
}
export const SOSPENSIONE_TIPO: Record<string, string> = {
  sospensione: 'Sospensione', congelamento: 'Congelamento', proroga: 'Proroga', recupero: 'Recupero giorni',
}
export const METODO: Record<string, string> = {
  contanti: 'Contanti', pos: 'POS', carta: 'Carta', bonifico: 'Bonifico', online: 'Pagamento online', addebito_ricorrente: 'Addebito ricorrente',
  fattura: 'In fattura', buono: 'Voucher',
}
export const CERTIFICAZIONE_TIPO: Record<string, string> = {
  abilitazione: 'Abilitazione', brevetto: 'Brevetto', primo_soccorso: 'Primo soccorso', blsd: 'BLSD', antincendio: 'Antincendio',
  specializzazione: 'Specializzazione', altro: 'Altro',
}
export const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
