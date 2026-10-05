/**
 * Etichette e toni del modulo Garage e autorimesse.
 */
export { fmtEuro, fmtNumero, fmtOra, fmtData, fmtGiornoOra, oggiIso, piuGiorni, giorniTra, isoLocale } from '@/lib/formato'

type Tono = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'serie'
type Voce = { label: string; tone: Tono }

/** Gli stati del posto del documento (§3). */
export const POSTO_STATO: Record<string, Voce> = {
  libero: { label: 'Libero', tone: 'success' },
  occupato: { label: 'Occupato', tone: 'danger' },
  prenotato: { label: 'Prenotato', tone: 'info' },
  riservato: { label: 'Riservato', tone: 'serie' },
  manutenzione: { label: 'In manutenzione', tone: 'warning' },
  non_disponibile: { label: 'Non disponibile', tone: 'neutral' },
}
export const POSTO_TIPO: Record<string, string> = {
  auto: 'Auto', moto: 'Moto', commerciale: 'Veicolo commerciale', elettrico: 'Elettrico (ricarica)', disabili: 'Disabili',
}
export const VEICOLO_TIPO: Record<string, string> = {
  auto: 'Auto', moto: 'Moto', suv: 'SUV', furgone: 'Furgone', camper: 'Camper', commerciale: 'Commerciale', altro: 'Altro',
}
export const ALIMENTAZIONE: Record<string, string> = {
  benzina: 'Benzina', diesel: 'Diesel', gpl: 'GPL', metano: 'Metano', ibrida: 'Ibrida', elettrica: 'Elettrica', altro: 'Altro',
}
export const STRUTTURA_TIPO: Record<string, string> = {
  autorimessa: 'Autorimessa', parcheggio_coperto: 'Parcheggio coperto', parcheggio_scoperto: 'Parcheggio scoperto', silos: 'Silos', box: 'Box', misto: 'Misto',
}
export const MODALITA_ACCESSO: Record<string, string> = {
  manuale: 'Operatore', targa: 'Lettura targa', badge: 'Badge', rfid: 'RFID', qr: 'QR code', telecomando: 'Telecomando', app: 'App',
}
export const AREA_TIPO: Record<string, string> = {
  corsia: 'Corsia', rampa: 'Rampa', ingresso: 'Ingresso', uscita: 'Uscita', riservata: 'Area riservata', servizio: 'Area di servizio', altro: 'Altro',
}

export const CONTRATTO_TIPO: Record<string, string> = {
  abbonamento_mensile: 'Abbonamento mensile', abbonamento_annuale: 'Abbonamento annuale', sosta_giornaliera: 'Sosta giornaliera', sosta_oraria: 'Sosta oraria',
  sosta_notturna: 'Sosta notturna', posto_riservato: 'Posto riservato', custodia: 'Custodia veicolo', noleggio_posto: 'Noleggio posto', convenzione: 'Convenzione aziendale',
}
export const CONTRATTO_STATO: Record<string, Voce> = {
  attivo: { label: 'Attivo', tone: 'success' },
  sospeso: { label: 'Sospeso', tone: 'warning' },
  scaduto: { label: 'Scaduto', tone: 'neutral' },
  disdetto: { label: 'Disdetto', tone: 'neutral' },
}
export const PERIODICITA: Record<string, string> = { una_tantum: 'Una tantum', mensile: 'Mensile', trimestrale: 'Trimestrale', annuale: 'Annuale' }
export const RATA_STATO: Record<string, Voce> = {
  da_pagare: { label: 'Da pagare', tone: 'warning' },
  pagata: { label: 'Pagata', tone: 'success' },
  insoluta: { label: 'Insoluta', tone: 'danger' },
  annullata: { label: 'Annullata', tone: 'neutral' },
}
export const SOSTA_STATO: Record<string, Voce> = {
  in_corso: { label: 'Dentro', tone: 'info' },
  da_pagare: { label: 'Da pagare', tone: 'warning' },
  chiusa: { label: 'Chiusa', tone: 'neutral' },
}
export const TITOLO: Record<string, Voce> = {
  contratto: { label: 'Abbonato', tone: 'success' },
  autorizzazione: { label: 'Autorizzato', tone: 'serie' },
  convenzione: { label: 'Convenzione', tone: 'info' },
  rotazione: { label: 'A tariffa', tone: 'neutral' },
}
export const PRENOTAZIONE_STATO: Record<string, Voce> = {
  richiesta: { label: 'Richiesta', tone: 'warning' },
  confermata: { label: 'Confermata', tone: 'info' },
  arrivata: { label: 'Arrivata', tone: 'success' },
  annullata: { label: 'Annullata', tone: 'neutral' },
  non_presentato: { label: 'Non presentato', tone: 'danger' },
}
export const CANALE: Record<string, string> = { banco: 'Al banco', telefono: 'Telefono', email: 'Email', online: 'Online', app: 'App' }
export const AUTORIZZAZIONE_TIPO: Record<string, string> = {
  titolare: 'Titolare', delegato: 'Delegato', dipendente: 'Dipendente', ospite: 'Ospite', temporaneo: 'Temporaneo',
}
export const LIVELLO: Record<string, string> = { accesso: 'Solo accesso', accesso_e_ritiro: 'Accesso e ritiro del veicolo', completo: 'Completo' }

export const CHIAVE_STATO: Record<string, Voce> = {
  in_custodia: { label: 'In custodia', tone: 'success' },
  consegnata: { label: 'Fuori', tone: 'warning' },
  restituita: { label: 'Restituita al cliente', tone: 'neutral' },
}
export const CHIAVE_MOVIMENTO: Record<string, string> = { deposito: 'Presa in custodia', consegna: 'Consegnata', rientro: 'Rientrata', restituzione: 'Restituita al cliente' }

export const DANNO_TIPO: Record<string, Voce> = {
  danno_ingresso: { label: "Danno all'ingresso", tone: 'warning' },
  danno_uscita: { label: "Danno all'uscita", tone: 'warning' },
  incidente: { label: 'Incidente', tone: 'danger' },
  urto: { label: 'Urto', tone: 'warning' },
  furto: { label: 'Furto', tone: 'danger' },
  smarrimento: { label: 'Smarrimento', tone: 'info' },
  anomalia: { label: 'Anomalia', tone: 'info' },
  contestazione: { label: 'Contestazione', tone: 'serie' },
}
export const DANNO_STATO: Record<string, Voce> = {
  aperto: { label: 'Aperto', tone: 'warning' },
  in_gestione: { label: 'In gestione', tone: 'info' },
  chiuso: { label: 'Chiuso', tone: 'neutral' },
}
export const RESPONSABILITA: Record<string, string> = {
  da_accertare: 'Da accertare', garage: "Dell'autorimessa", cliente: 'Del cliente', terzi: 'Di terzi', preesistente: 'Preesistente',
}

export const COLONNINA_STATO: Record<string, Voce> = {
  disponibile: { label: 'Disponibile', tone: 'success' },
  in_uso: { label: 'In uso', tone: 'info' },
  guasta: { label: 'Guasta', tone: 'danger' },
  fuori_servizio: { label: 'Fuori servizio', tone: 'neutral' },
}
export const RICARICA_STATO: Record<string, Voce> = {
  in_corso: { label: 'In corso', tone: 'info' },
  da_pagare: { label: 'Da pagare', tone: 'warning' },
  pagata: { label: 'Pagata', tone: 'success' },
  in_convenzione: { label: "Sul conto dell'azienda", tone: 'serie' },
}

export const SERVIZIO_CATEGORIA: Record<string, string> = {
  lavaggio: 'Lavaggio auto', pulizia_interna: 'Pulizia interna', sanificazione: 'Sanificazione', cambio_pneumatici: 'Cambio pneumatici',
  deposito_pneumatici: 'Deposito pneumatici', ricarica: 'Ricarica elettrica', piccola_manutenzione: 'Piccola manutenzione', revisione: 'Revisione',
  recupero_consegna: 'Recupero e consegna veicolo', custodia_chiavi: 'Custodia chiavi', altro: 'Altro',
}
export const SERVIZIO_STATO: Record<string, Voce> = {
  richiesto: { label: 'Da fare', tone: 'warning' },
  in_corso: { label: 'In corso', tone: 'info' },
  pronto: { label: 'Pronto', tone: 'primary' },
  consegnato: { label: 'Consegnato', tone: 'success' },
  annullato: { label: 'Annullato', tone: 'neutral' },
}
export const PNEUMATICI_STATO: Record<string, Voce> = {
  in_deposito: { label: 'In deposito', tone: 'info' },
  montati: { label: 'Montati', tone: 'success' },
  restituiti: { label: 'Restituiti', tone: 'neutral' },
  da_sostituire: { label: 'Da sostituire', tone: 'warning' },
}
export const STAGIONE: Record<string, string> = { estivi: 'Estivi', invernali: 'Invernali', quattro_stagioni: 'Quattro stagioni' }
export const ATTESA_STATO: Record<string, Voce> = {
  in_attesa: { label: 'In attesa', tone: 'warning' },
  avvisato: { label: 'Avvisato', tone: 'info' },
  soddisfatta: { label: 'Posto assegnato', tone: 'success' },
  annullata: { label: 'Annullata', tone: 'neutral' },
}

/** «2 h 15 min» da minuti. */
export const durata = (min: number | null | undefined) => {
  if (min == null) return '—'
  const g = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60
  return [g ? `${g} g` : '', h ? `${h} h` : '', !g && m ? `${m} min` : ''].filter(Boolean).join(' ') || '0 min'
}
/** Minuti trascorsi da un istante. */
export const minutiDa = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
/** Targa come la scrive il database: maiuscola, senza spazi né trattini. */
export const normalizzaTarga = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]/g, '')
/** Numero scritto all'italiana («2,50») letto come numero. */
export const numero = (s: string | number) => Number(String(s).replace(',', '.')) || 0
export const numeroONull = (s: string) => (s.trim() === '' ? null : numero(s))
/** Numero mostrato all'italiana in un campo («2,5»). */
export const campoNumero = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','))
