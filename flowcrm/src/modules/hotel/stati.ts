/**
 * Etichette, toni e colori del modulo Hotel.
 */
export { fmtEuro, fmtNumero, fmtOra, fmtData, fmtGiornoOra, oggiIso, piuGiorni, giorniTra, isoLocale } from '@/lib/formato'

type Tono = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'serie'

export const PRENOTAZIONE_STATO: Record<string, { label: string; tone: Tono; barra: string }> = {
  richiesta: { label: 'Richiesta', tone: 'neutral', barra: 'border-border bg-muted text-muted-foreground' },
  opzionata: { label: 'Opzionata', tone: 'warning', barra: 'border-warning bg-warning-tenue text-foreground' },
  confermata: { label: 'Confermata', tone: 'info', barra: 'border-info bg-info-tenue text-foreground' },
  in_soggiorno: { label: 'In casa', tone: 'success', barra: 'border-success bg-success-tenue text-foreground' },
  partita: { label: 'Partita', tone: 'neutral', barra: 'border-border bg-muted text-muted-foreground' },
  annullata: { label: 'Annullata', tone: 'neutral', barra: 'border-border bg-muted text-muted-foreground line-through' },
  no_show: { label: 'No-show', tone: 'danger', barra: 'border-destructive bg-destructive-tenue text-foreground' },
}

export const CAMERA_STATO: Record<string, { label: string; tone: Tono; riempimento: string; bordo: string }> = {
  disponibile: { label: 'Disponibile', tone: 'success', riempimento: 'bg-success-tenue', bordo: 'border-success' },
  occupata: { label: 'Occupata', tone: 'primary', riempimento: 'bg-accent', bordo: 'border-primary' },
  da_pulire: { label: 'Da pulire', tone: 'warning', riempimento: 'bg-warning-tenue', bordo: 'border-warning' },
  in_pulizia: { label: 'In pulizia', tone: 'info', riempimento: 'bg-info-tenue', bordo: 'border-info' },
  pulita: { label: 'Pulita', tone: 'serie', riempimento: 'bg-serie-tenue', bordo: 'border-primary' },
  verificata: { label: 'Verificata', tone: 'success', riempimento: 'bg-success-tenue', bordo: 'border-success' },
  fuori_servizio: { label: 'Fuori servizio', tone: 'danger', riempimento: 'bg-destructive-tenue', bordo: 'border-destructive' },
}

export const CANALE: Record<string, string> = {
  diretto: 'Diretto', telefono: 'Telefono', email: 'Email', walk_in: 'Al banco', sito: 'Sito', booking_engine: 'Booking engine',
  ota: 'Portale (OTA)', agenzia: 'Agenzia', tour_operator: 'Tour operator', gds: 'GDS', corporate: 'Azienda', gruppo: 'Gruppo',
}
export const CANALI_DIRETTI = ['diretto', 'telefono', 'email', 'walk_in', 'sito', 'booking_engine']

export const PIANO_TIPO: Record<string, string> = {
  bar: 'BAR (miglior tariffa)', non_rimborsabile: 'Non rimborsabile', flex: 'Flessibile', corporate: 'Corporate', gruppi: 'Gruppi',
  long_stay: 'Lunghe permanenze', weekend: 'Weekend', stagionale: 'Stagionale', early_booking: 'Prenota prima',
  last_minute: 'Ultimo minuto', pacchetto: 'Pacchetto',
}

export const TIPOLOGIA_CATEGORIA: Record<string, string> = {
  singola: 'Singola', doppia: 'Doppia', matrimoniale: 'Matrimoniale', twin: 'Twin', tripla: 'Tripla', quadrupla: 'Quadrupla',
  familiare: 'Familiare', suite: 'Suite', junior_suite: 'Junior suite', executive: 'Executive', deluxe: 'Deluxe',
  apartment: 'Appartamento', altro: 'Altro',
}

export const PULIZIA_TIPO: Record<string, string> = {
  partenza: 'Partenza', soggiorno: 'Riassetto', ordinaria: 'Ordinaria', straordinaria: 'Straordinaria',
  cambio_biancheria: 'Cambio biancheria', cambio_asciugamani: 'Cambio asciugamani', profonda: 'Profonda',
}
export const PULIZIA_STATO: Record<string, { label: string; tone: Tono }> = {
  da_fare: { label: 'Da fare', tone: 'warning' },
  in_corso: { label: 'In corso', tone: 'info' },
  fatta: { label: 'Fatta', tone: 'serie' },
  verificata: { label: 'Verificata', tone: 'success' },
  da_rifare: { label: 'Da rifare', tone: 'danger' },
}

export const TIPO_ALLOGGIATO: Record<string, string> = {
  '16': 'Ospite singolo', '17': 'Capofamiglia', '18': 'Capogruppo', '19': 'Familiare', '20': 'Membro del gruppo',
}
export const DOCUMENTO_TIPO: Record<string, string> = {
  IDENT: 'Carta d\'identità', IDELE: 'Carta d\'identità elettronica', PASOR: 'Passaporto', PATEN: 'Patente di guida',
}

export const MANUTENZIONE_CATEGORIA: Record<string, string> = {
  climatizzazione: 'Climatizzazione', tv: 'TV', frigorifero: 'Frigorifero', illuminazione: 'Illuminazione', bagno: 'Bagno',
  serrature: 'Serrature', impianti: 'Impianti', arredi: 'Arredi', ascensore: 'Ascensore', caldaia: 'Caldaia', piscina: 'Piscina',
  elettrico: 'Impianto elettrico', antincendio: 'Antincendio', cucina: 'Cucina', spa: 'SPA', aree_comuni: 'Aree comuni', altro: 'Altro',
}
export const MANUTENZIONE_STATO: Record<string, { label: string; tone: Tono }> = {
  aperta: { label: 'Aperta', tone: 'warning' }, assegnata: { label: 'Assegnata', tone: 'info' },
  in_corso: { label: 'In corso', tone: 'primary' }, risolta: { label: 'Risolta', tone: 'success' },
  annullata: { label: 'Annullata', tone: 'neutral' },
}
export const PRIORITA: Record<string, { label: string; tone: Tono }> = {
  bassa: { label: 'Bassa', tone: 'neutral' }, media: { label: 'Media', tone: 'info' },
  alta: { label: 'Alta', tone: 'warning' }, urgente: { label: 'Urgente', tone: 'danger' },
}

export const SERVIZIO_TIPO: Record<string, string> = {
  colazione: 'Colazione', room_service: 'Room service', lavanderia: 'Lavanderia', spa: 'SPA', massaggio: 'Massaggio',
  trattamento_benessere: 'Trattamento benessere', sauna: 'Sauna', piscina: 'Piscina', percorso_benessere: 'Percorso benessere',
  noleggio_bici: 'Noleggio biciclette', escursione: 'Escursione', late_check_out: 'Late check-out', early_check_in: 'Early check-in',
  altro: 'Altro',
}
export const SERVIZIO_STATO: Record<string, { label: string; tone: Tono }> = {
  prenotato: { label: 'Prenotato', tone: 'info' }, confermato: { label: 'Confermato', tone: 'primary' },
  erogato: { label: 'Erogato', tone: 'success' }, annullato: { label: 'Annullato', tone: 'neutral' },
  no_show: { label: 'Non presentato', tone: 'danger' },
}
export const TRANSFER_TIPO: Record<string, string> = {
  aeroporto: 'Aeroporto', stazione: 'Stazione', porto: 'Porto', escursione: 'Escursione', navetta: 'Navetta', altro: 'Altro',
}
export const TRANSFER_STATO: Record<string, { label: string; tone: Tono }> = {
  richiesto: { label: 'Richiesto', tone: 'warning' }, confermato: { label: 'Confermato', tone: 'info' },
  svolto: { label: 'Svolto', tone: 'success' }, annullato: { label: 'Annullato', tone: 'neutral' },
}
export const ALLESTIMENTO: Record<string, string> = {
  teatro: 'Teatro', banchi: 'Banchi di scuola', ferro_di_cavallo: 'Ferro di cavallo', cabaret: 'Cabaret', banchetto: 'Banchetto',
  cocktail: 'Cocktail', riunione: 'Tavolo riunione',
}
export const BIANCHERIA_TIPO: Record<string, string> = {
  lenzuola: 'Lenzuola', federe: 'Federe', asciugamani: 'Asciugamani', accappatoi: 'Accappatoi', tovaglie: 'Tovaglie',
  tovaglioli: 'Tovaglioli', divise: 'Divise', altro: 'Altro',
}
export const OGGETTO_STATO: Record<string, { label: string; tone: Tono }> = {
  custodito: { label: 'Custodito', tone: 'info' }, restituito: { label: 'Restituito', tone: 'success' },
  spedito: { label: 'Spedito', tone: 'success' }, smaltito: { label: 'Smaltito', tone: 'neutral' },
  consegnato_comune: { label: 'Consegnato al Comune', tone: 'neutral' },
}
export const REPARTO: Record<string, string> = {
  camere: 'Camere', ristorazione: 'Ristorazione', spa: 'SPA e benessere', servizi: 'Servizi', altro: 'Altro',
}

/** «1 notte», «3 notti». */
export const notti = (n: number | null | undefined) => `${n ?? 0} ${n === 1 ? 'notte' : 'notti'}`
