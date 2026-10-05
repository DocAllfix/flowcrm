/**
 * Etichette e toni del modulo Fioraio.
 */
export { fmtEuro, fmtNumero, fmtOra, fmtData, fmtGiornoOra, oggiIso, piuGiorni, giorniTra, isoLocale } from '@/lib/formato'

type Tono = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'serie'

export const ORDINE_STATO: Record<string, { label: string; tone: Tono }> = {
  ricevuto: { label: 'Ricevuto', tone: 'warning' },
  confermato: { label: 'Confermato', tone: 'info' },
  in_preparazione: { label: 'In preparazione', tone: 'serie' },
  pronto: { label: 'Pronto', tone: 'primary' },
  in_consegna: { label: 'In consegna', tone: 'info' },
  consegnato: { label: 'Consegnato', tone: 'success' },
  chiuso: { label: 'Chiuso', tone: 'neutral' },
  annullato: { label: 'Annullato', tone: 'neutral' },
}
/** La sequenza del documento: Ricevuto → … → Chiuso. */
export const ORDINE_SEQUENZA = ['ricevuto', 'confermato', 'in_preparazione', 'pronto', 'in_consegna', 'consegnato', 'chiuso'] as const

export const PRODUZIONE_STATO: Record<string, { label: string; tone: Tono }> = {
  da_fare: { label: 'Da fare', tone: 'warning' },
  in_corso: { label: 'In corso', tone: 'info' },
  pronta: { label: 'Pronta', tone: 'success' },
  annullata: { label: 'Annullata', tone: 'neutral' },
}
export const CONSEGNA_STATO: Record<string, { label: string; tone: Tono }> = {
  da_assegnare: { label: 'Da assegnare', tone: 'warning' },
  assegnata: { label: 'Assegnata', tone: 'info' },
  in_consegna: { label: 'In consegna', tone: 'serie' },
  consegnata: { label: 'Consegnata', tone: 'success' },
  fallita: { label: 'Non riuscita', tone: 'danger' },
}

export const MODALITA: Record<string, string> = { ritiro: 'Ritiro in negozio', consegna: 'Consegna a domicilio', banco: 'Vendita al banco' }
export const CANALE: Record<string, string> = {
  negozio: 'Negozio', telefono: 'Telefono', email: 'Email', sito: 'Sito', whatsapp: 'WhatsApp', marketplace: 'Marketplace', social: 'Social',
  abbonamento: 'Abbonamento',
}
export const OCCASIONE: Record<string, string> = {
  compleanno: 'Compleanno', anniversario: 'Anniversario', san_valentino: 'San Valentino', festa_mamma: 'Festa della Mamma',
  festa_donna: 'Festa della Donna', laurea: 'Laurea', nascita: 'Nascita', battesimo: 'Battesimo', comunione: 'Comunione', cresima: 'Cresima',
  matrimonio: 'Matrimonio', aziendale: 'Ricorrenza aziendale', commemorativa: 'Ricorrenza commemorativa', altro: 'Altro',
}
export const ABBONAMENTO_TIPO: Record<string, string> = {
  bouquet: 'Bouquet', fiori_ufficio: 'Fiori per uffici', fiori_hotel: 'Fiori per hotel', fiori_ristorante: 'Fiori per ristoranti',
  piante_ufficio: 'Piante per uffici', manutenzione_verde: 'Manutenzione del verde', altro: 'Altro',
}
export const FREQUENZA: Record<string, string> = { settimanale: 'Ogni settimana', quindicinale: 'Ogni due settimane', mensile: 'Ogni mese' }
export const CERIMONIA_TIPO: Record<string, string> = {
  matrimonio: 'Matrimonio', cerimonia: 'Cerimonia', funerale: 'Funerale o commemorazione', aziendale: 'Evento aziendale', altro: 'Altro',
}
export const AGENDA_TIPO: Record<string, { label: string; tone: Tono }> = {
  preparazione: { label: 'Da preparare', tone: 'serie' }, consegna: { label: 'Consegna', tone: 'info' }, ritiro: { label: 'Ritiro', tone: 'primary' },
  matrimonio: { label: 'Matrimonio', tone: 'success' }, cerimonia: { label: 'Cerimonia', tone: 'success' }, funerale: { label: 'Funerale', tone: 'neutral' },
  aziendale: { label: 'Evento aziendale', tone: 'success' }, evento: { label: 'Evento', tone: 'success' }, altro: { label: 'Evento', tone: 'success' },
  montaggio: { label: 'Montaggio', tone: 'warning' }, smontaggio: { label: 'Smontaggio', tone: 'warning' },
  abbonamento: { label: 'Abbonamento', tone: 'neutral' }, fornitore: { label: 'Arrivo merce', tone: 'neutral' },
}

/** Categorie del catalogo del fiorista (§1). */
export const CATEGORIE_ARTICOLO = ['Fiori recisi', 'Piante da interno', 'Piante da esterno', 'Piante ornamentali', 'Semi e bulbi', 'Vasi', 'Cachepot',
  'Nastri', 'Carta e confezioni', 'Biglietti', 'Accessori', 'Materiali per composizioni', 'Articoli regalo', 'Prodotti stagionali']
export const CATEGORIE_COMPOSIZIONE = [
  { valore: 'bouquet', label: 'Bouquet' }, { valore: 'centrotavola', label: 'Centrotavola' }, { valore: 'cesto', label: 'Cesto' },
  { valore: 'composizione', label: 'Composizione' }, { valore: 'corona', label: 'Corona' }, { valore: 'addobbo', label: 'Addobbo' },
  { valore: 'omaggio', label: 'Omaggio floreale' },
]
/** Voci tipiche degli allestimenti per tipo di cerimonia (§11–13). */
export const ALLESTIMENTI: Record<string, string[]> = {
  matrimonio: ['Bouquet sposa', 'Bouquet damigelle', 'Bottoniere', 'Centrotavola', 'Addobbi chiesa', 'Addobbi location', 'Arco floreale', 'Decorazioni'],
  cerimonia: ['Centrotavola', 'Addobbi chiesa', 'Addobbi location', 'Decorazioni'],
  funerale: ['Corona', 'Cuscino floreale', 'Composizioni', 'Addobbi', 'Nastri con dedica'],
  aziendale: ['Allestimento ingresso', 'Centrotavola', 'Composizioni per il palco', 'Omaggi floreali'],
  altro: ['Composizioni', 'Decorazioni'],
}
