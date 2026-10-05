/**
 * Etichette e toni del modulo Agenzia immobiliare.
 */
export { fmtEuro, fmtNumero, fmtOra, fmtData, fmtGiornoOra, oggiIso, piuGiorni, giorniTra, isoLocale } from '@/lib/formato'

type Tono = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'serie'
type Voce = { label: string; tone: Tono }

export const TIPOLOGIA: Record<string, string> = {
  appartamento: 'Appartamento', villa: 'Villa', villetta: 'Villetta', ufficio: 'Ufficio', negozio: 'Negozio', capannone: 'Capannone', terreno: 'Terreno',
  industriale: 'Immobile industriale', commerciale: 'Immobile commerciale', albergo: 'Albergo', ricettivo: 'Struttura ricettiva', box: 'Box e garage',
  agricolo: 'Immobile agricolo', nuova_costruzione: 'Nuova costruzione', fabbricato: 'Intero fabbricato', altro: 'Altro',
}
export const CONTRATTO: Record<string, string> = { vendita: 'Vendita', affitto: 'Affitto', entrambi: 'Vendita e affitto' }
export const IMMOBILE_STATO: Record<string, Voce> = {
  in_acquisizione: { label: 'In acquisizione', tone: 'neutral' },
  in_valutazione: { label: 'In valutazione', tone: 'info' },
  disponibile: { label: 'Disponibile', tone: 'success' },
  sotto_offerta: { label: 'Sotto offerta', tone: 'warning' },
  venduto: { label: 'Venduto', tone: 'serie' },
  affittato: { label: 'Affittato', tone: 'serie' },
  ritirato: { label: 'Ritirato', tone: 'neutral' },
}
export const CONSERVAZIONE: Record<string, string> = {
  nuovo: 'Nuovo', ristrutturato: 'Ristrutturato', ottimo: 'Ottimo', buono: 'Buono', da_ristrutturare: 'Da ristrutturare', grezzo: 'Al grezzo',
}
export const CLASSI = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G', 'esente', 'in_attesa'] as const
export const classeLabel = (c: string | null) => (c === 'esente' ? 'Esente' : c === 'in_attesa' ? 'In attesa di APE' : c ?? '—')
export const TITOLO_PROPRIETA: Record<string, string> = {
  piena_proprieta: 'Piena proprietà', nuda_proprieta: 'Nuda proprietà', usufrutto: 'Usufrutto', comproprieta: 'Comproprietà', superficie: 'Diritto di superficie', altro: 'Altro',
}
export const DOCUMENTO: Record<string, string> = {
  atto_provenienza: 'Atto di provenienza', visura_catastale: 'Visura catastale', planimetria_catastale: 'Planimetria catastale', visura_ipotecaria: 'Visura ipotecaria',
  ape: 'APE', conformita_urbanistica: 'Conformità urbanistica', conformita_catastale: 'Conformità catastale', certificazioni_impianti: 'Certificazioni degli impianti',
  regolamento_condominiale: 'Regolamento condominiale', verbali_condominiali: 'Verbali condominiali', tabelle_millesimali: 'Tabelle millesimali',
  documentazione_edilizia: 'Documentazione edilizia', permessi: 'Permessi', autorizzazioni: 'Autorizzazioni', relazione_tecnica: 'Relazione tecnica', altro: 'Altro',
}
export const DOCUMENTO_STATO: Record<string, Voce> = {
  mancante: { label: 'Mancante', tone: 'danger' },
  richiesto: { label: 'Richiesto', tone: 'warning' },
  presente: { label: 'Presente', tone: 'success' },
  non_necessario: { label: 'Non necessario', tone: 'neutral' },
}
export const INCARICO_STATO: Record<string, Voce> = {
  attivo: { label: 'Attivo', tone: 'success' },
  scaduto: { label: 'Scaduto', tone: 'warning' },
  revocato: { label: 'Revocato', tone: 'neutral' },
  concluso: { label: 'Concluso', tone: 'serie' },
}
export const ANNUNCIO_STATO: Record<string, Voce> = {
  bozza: { label: 'Bozza', tone: 'neutral' },
  pubblicato: { label: 'Pubblicato', tone: 'success' },
  sospeso: { label: 'Sospeso', tone: 'warning' },
  ritirato: { label: 'Ritirato', tone: 'neutral' },
}
export const PORTALI = ['immobiliare.it', 'idealista', 'casa.it', 'subito', 'wikicasa', 'sito', 'facebook', 'instagram'] as const
export const REQUISITI: Record<string, string> = {
  ascensore: 'Ascensore', terrazzo: 'Terrazzo', balcone: 'Balcone', giardino: 'Giardino', garage: 'Garage', posto_auto: 'Posto auto', cantina: 'Cantina',
  arredato: 'Arredato', condizionamento: 'Aria condizionata',
}
export const RICHIESTA_STATO: Record<string, Voce> = {
  attiva: { label: 'Attiva', tone: 'success' },
  sospesa: { label: 'Sospesa', tone: 'warning' },
  soddisfatta: { label: 'Soddisfatta', tone: 'serie' },
  persa: { label: 'Persa', tone: 'neutral' },
}
export const TIPO_CLIENTE: Record<string, string> = { privato: 'Privato', famiglia: 'Famiglia', investitore: 'Investitore', azienda: 'Azienda', studente: 'Studente', altro: 'Altro' }
export const SELEZIONE_STATO: Record<string, Voce> = {
  proposto: { label: 'Da inviare', tone: 'neutral' },
  inviato: { label: 'Inviato', tone: 'info' },
  preferito: { label: 'Preferito', tone: 'success' },
  scartato: { label: 'Scartato', tone: 'neutral' },
  visitato: { label: 'Visitato', tone: 'serie' },
}
export const LEAD_TIPO: Record<string, string> = { acquirente: 'Acquirente', conduttore: 'Cerca in affitto', proprietario: 'Proprietario che vende', locatore: 'Proprietario che affitta' }
export const LEAD_STATO: Record<string, Voce> = {
  nuovo: { label: 'Nuovo', tone: 'warning' },
  contattato: { label: 'Contattato', tone: 'info' },
  qualificato: { label: 'Qualificato', tone: 'primary' },
  appuntamento: { label: 'Appuntamento', tone: 'serie' },
  convertito: { label: 'Convertito', tone: 'success' },
  perso: { label: 'Perso', tone: 'neutral' },
}
export const ORIGINE: Record<string, string> = {
  portale: 'Portale', sito: 'Sito', social: 'Social', telefono: 'Telefono', insegna: 'Vetrina o cartello', passaparola: 'Passaparola', campagna: 'Campagna',
  segnalatore: 'Segnalatore', altro: 'Altro',
}
export const PRIORITA: Record<string, Voce> = { bassa: { label: 'Bassa', tone: 'neutral' }, media: { label: 'Media', tone: 'info' }, alta: { label: 'Alta', tone: 'danger' } }
export const VISITA_STATO: Record<string, Voce> = {
  proposta: { label: 'Da confermare', tone: 'warning' },
  confermata: { label: 'Confermata', tone: 'info' },
  svolta: { label: 'Svolta', tone: 'success' },
  annullata: { label: 'Annullata', tone: 'neutral' },
  non_presentato: { label: 'Non presentato', tone: 'danger' },
}
export const ESITO: Record<string, string> = {
  non_interessato: 'Non interessato', interessato: 'Interessato', molto_interessato: 'Molto interessato', vuole_offrire: 'Vuole fare una proposta',
}
export const PROPOSTA_STATO: Record<string, Voce> = {
  in_attesa: { label: 'In attesa', tone: 'warning' },
  controproposta: { label: 'Controproposta', tone: 'info' },
  accettata: { label: 'Accettata', tone: 'success' },
  rifiutata: { label: 'Rifiutata', tone: 'neutral' },
  scaduta: { label: 'Scaduta', tone: 'neutral' },
  ritirata: { label: 'Ritirata', tone: 'neutral' },
}
export const CHIUSURA_STATO: Record<string, Voce> = {
  preliminare: { label: 'Preliminare', tone: 'warning' },
  rogitato: { label: 'Rogito fatto', tone: 'success' },
  saltato: { label: 'Saltato', tone: 'neutral' },
}
export const TIPO_LOCAZIONE: Record<string, string> = {
  '4+4': 'Libero 4+4', '3+2': 'Concordato 3+2', transitorio: 'Transitorio', studenti: 'Studenti', 'commerciale_6+6': 'Commerciale 6+6', altro: 'Altro',
}
export const LOCAZIONE_STATO: Record<string, Voce> = {
  attiva: { label: 'In corso', tone: 'success' },
  disdetta: { label: 'Disdetta', tone: 'warning' },
  cessata: { label: 'Cessata', tone: 'neutral' },
}
export const LATO: Record<string, string> = { venditore: 'Venditore', acquirente: 'Acquirente', locatore: 'Locatore', conduttore: 'Conduttore' }
export const PROVVIGIONE_STATO: Record<string, Voce> = {
  maturata: { label: 'Maturata', tone: 'warning' },
  fatturata: { label: 'Fatturata', tone: 'info' },
  incassata: { label: 'Incassata', tone: 'success' },
  annullata: { label: 'Annullata', tone: 'neutral' },
}
export const COLLABORATORE: Record<string, string> = {
  agenzia: 'Agenzia partner', segnalatore: 'Segnalatore', geometra: 'Geometra', architetto: 'Architetto', notaio: 'Notaio',
  consulente_finanziario: 'Consulente finanziario', mediatore_creditizio: 'Mediatore creditizio', altro: 'Altro',
}
export const MODELLO_TIPO: Record<string, string> = {
  incarico: 'Incarico di mediazione', proposta_acquisto: 'Proposta di acquisto', proposta_locazione: 'Proposta di locazione', contratto_locazione: 'Contratto di locazione',
  preliminare: 'Preliminare', contratto_vendita: 'Contratto di vendita', mandato: 'Mandato', accordo: 'Accordo con il cliente', informativa_privacy: 'Informativa privacy',
}
export const CONTRATTO_STATO: Record<string, Voce> = {
  bozza: { label: 'Bozza', tone: 'neutral' },
  in_approvazione: { label: 'In approvazione', tone: 'warning' },
  approvato: { label: 'Approvato', tone: 'info' },
  inviato_firma: { label: 'Alla firma', tone: 'serie' },
  firmato: { label: 'Firmato', tone: 'success' },
  annullato: { label: 'Annullato', tone: 'neutral' },
}
export const CANALE_MKT: Record<string, string> = {
  portale: 'Portale', social: 'Social', google: 'Google', cartellone: 'Cartellone', volantino: 'Volantino', open_house: 'Open house', email: 'Email', sms: 'SMS',
  newsletter: 'Newsletter', evento: 'Evento', altro: 'Altro',
}
export const OBIETTIVO_MKT: Record<string, string> = { acquisizione: 'Acquisire immobili', vendita: 'Vendere', locazione: 'Affittare', immagine: 'Immagine' }
export const DOCUMENTO_ID: Record<string, string> = {
  carta_identita: "Carta d'identità", passaporto: 'Passaporto', patente: 'Patente', permesso_soggiorno: 'Permesso di soggiorno', visura_camerale: 'Visura camerale', altro: 'Altro',
}
export const RISCHIO: Record<string, Voce> = { basso: { label: 'Basso', tone: 'success' }, medio: { label: 'Medio', tone: 'warning' }, alto: { label: 'Alto', tone: 'danger' } }
export const AGENDA_TIPO: Record<string, Voce> = {
  visita: { label: 'Visita', tone: 'info' },
  telefonata: { label: 'Telefonata', tone: 'neutral' },
  appuntamento: { label: 'Appuntamento', tone: 'primary' },
  attivita: { label: 'Attività', tone: 'neutral' },
  rogito: { label: 'Rogito', tone: 'success' },
  scadenza: { label: 'Scadenza', tone: 'warning' },
}

/** Numero scritto all'italiana («2,50») letto come numero. */
export const numero = (s: string | number) => Number(String(s).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0
export const numeroONull = (s: string) => (s.trim() === '' ? null : numero(s))
export const intONull = (s: string) => (s.trim() === '' ? null : Math.round(numero(s)))
/** Numero mostrato all'italiana in un campo. */
export const campoNumero = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','))
/** Elenco scritto con le virgole → array. */
export const elenco = (s: string) => s.split(/[,;]+/).map((x) => x.trim()).filter(Boolean)
export const nomeContatto = (k: { nome: string; cognome: string | null } | null | undefined) => (k ? `${k.nome} ${k.cognome ?? ''}`.trim() : '')
