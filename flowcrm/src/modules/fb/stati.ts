/**
 * Etichette, toni e formati del motore food & beverage (Ristorante e Bar).
 */
type Tono = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'serie'

export const TAVOLO_STATO: Record<string, { label: string; tone: Tono; riempimento: string; bordo: string }> = {
  libero: { label: 'Libero', tone: 'success', riempimento: 'bg-success-tenue', bordo: 'border-success' },
  prenotato: { label: 'Prenotato', tone: 'info', riempimento: 'bg-info-tenue', bordo: 'border-info' },
  in_attesa: { label: 'In attesa', tone: 'warning', riempimento: 'bg-warning-tenue', bordo: 'border-warning' },
  occupato: { label: 'Occupato', tone: 'primary', riempimento: 'bg-accent', bordo: 'border-primary' },
  in_servizio: { label: 'In servizio', tone: 'serie', riempimento: 'bg-serie-tenue', bordo: 'border-primary' },
  conto_richiesto: { label: 'Conto richiesto', tone: 'danger', riempimento: 'bg-destructive-tenue', bordo: 'border-destructive' },
  chiuso: { label: 'Chiuso', tone: 'neutral', riempimento: 'bg-muted', bordo: 'border-border' },
}

export const PRENOTAZIONE_STATO: Record<string, { label: string; tone: Tono }> = {
  richiesta: { label: 'Richiesta', tone: 'warning' },
  confermata: { label: 'Confermata', tone: 'info' },
  arrivata: { label: 'Arrivata', tone: 'primary' },
  servita: { label: 'Servita', tone: 'serie' },
  conclusa: { label: 'Conclusa', tone: 'success' },
  no_show: { label: 'No-show', tone: 'danger' },
  annullata: { label: 'Annullata', tone: 'neutral' },
}

export const RIGA_STATO: Record<string, { label: string; tone: Tono }> = {
  in_attesa: { label: 'Trattenuta', tone: 'neutral' },
  da_preparare: { label: 'Da preparare', tone: 'warning' },
  presa_in_carico: { label: 'Presa in carico', tone: 'info' },
  in_preparazione: { label: 'In preparazione', tone: 'primary' },
  pronta: { label: 'Pronta', tone: 'success' },
  servita: { label: 'Servita', tone: 'serie' },
  annullata: { label: 'Annullata', tone: 'neutral' },
}

/** Il passo successivo di una riga in cucina (un tocco sullo schermo). */
export const RIGA_PROSSIMO: Record<string, { stato: string; azione: string } | undefined> = {
  da_preparare: { stato: 'presa_in_carico', azione: 'Prendi' },
  presa_in_carico: { stato: 'in_preparazione', azione: 'Inizia' },
  in_preparazione: { stato: 'pronta', azione: 'Pronto' },
  pronta: { stato: 'servita', azione: 'Servito' },
}

export const CANALE_LABEL: Record<string, string> = {
  sala: 'Sala', banco: 'Banco', asporto: 'Asporto', delivery: 'Consegna', online: 'Online',
  telefono: 'Telefono', app: 'App',
}

export const CANALE_PRENOTAZIONE_LABEL: Record<string, string> = {
  telefono: 'Telefono', sito: 'Sito web', app: 'App', email: 'Email', walk_in: 'Di passaggio', piattaforma: 'Piattaforma',
}

export const ATTESA_STATO: Record<string, { label: string; tone: Tono }> = {
  in_attesa: { label: 'In attesa', tone: 'warning' },
  avvisato: { label: 'Avvisato', tone: 'info' },
  seduto: { label: 'Seduto', tone: 'success' },
  rinunciato: { label: 'Ha rinunciato', tone: 'neutral' },
}

export const CONSEGNA_STATO: Record<string, { label: string; tone: Tono }> = {
  da_assegnare: { label: 'Da assegnare', tone: 'warning' },
  assegnata: { label: 'Assegnata', tone: 'info' },
  in_consegna: { label: 'In consegna', tone: 'primary' },
  consegnata: { label: 'Consegnata', tone: 'success' },
  fallita: { label: 'Non riuscita', tone: 'danger' },
}

export function etichettaUscita(u: number | null | undefined): string {
  switch (u) {
    case 0: return 'Subito'
    case 1: return 'Antipasti'
    case 2: return 'Primi'
    case 3: return 'Secondi'
    case 4: return 'Dessert'
    case 5: return 'Caffè e digestivi'
    default: return `Uscita ${u ?? '—'}`
  }
}

export const MENU_TIPO_LABEL: Record<string, string> = {
  carta: 'Alla carta', standard: 'Standard', colazione: 'Colazione', pranzo: 'Pranzo', aperitivo: 'Aperitivo',
  cena: 'Cena', serale: 'Serale', degustazione: 'Degustazione', turistico: 'Turistico', business: 'Business',
  bambini: 'Bambini', stagionale: 'Stagionale', eventi: 'Eventi', asporto: 'Asporto', delivery: 'Delivery',
  convenzionato: 'Convenzionato',
}

export const PROMO_TIPO_LABEL: Record<string, string> = {
  prezzo_speciale: 'Prezzo speciale', sconto_percentuale: 'Sconto %', x_per_y: 'Prendi X paghi Y',
}

export const BEVERAGE_LABEL: Record<string, string> = {
  vino: 'Vino', birra: 'Birra', cocktail: 'Cocktail', distillato: 'Distillato', analcolico: 'Analcolico',
  caffetteria: 'Caffetteria', acqua: 'Acqua',
}

export const SPRECO_CAUSALE: Record<string, string> = {
  scarto_preparazione: 'Scarto di preparazione', deterioramento: 'Deterioramento', scadenza: 'Scadenza',
  errore_produzione: 'Errore di produzione', reso: 'Reso', omaggio: 'Omaggio', consumo_personale: 'Consumo del personale',
  piatto_rifatto: 'Piatto rifatto', annullato_dopo_preparazione: 'Annullato dopo la preparazione',
  omaggio_promozione: 'Omaggio da promozione',
}

export const CLASSE_MENU: Record<string, { label: string; tone: Tono; consiglio: string }> = {
  star: { label: 'Star', tone: 'success', consiglio: 'Molto venduto e redditizio: tenerlo in evidenza.' },
  plow_horse: { label: 'Plow Horse', tone: 'warning', consiglio: 'Venduto ma poco redditizio: rivedere costo o prezzo.' },
  puzzle: { label: 'Puzzle', tone: 'info', consiglio: 'Redditizio ma poco venduto: promuoverlo o riposizionarlo.' },
  dog: { label: 'Dog', tone: 'danger', consiglio: 'Poco venduto e poco redditizio: modificarlo o toglierlo.' },
}

export const ALLERGENI: { valore: string; label: string }[] = [
  { valore: 'glutine', label: 'Glutine' }, { valore: 'crostacei', label: 'Crostacei' }, { valore: 'uova', label: 'Uova' },
  { valore: 'pesce', label: 'Pesce' }, { valore: 'arachidi', label: 'Arachidi' }, { valore: 'soia', label: 'Soia' },
  { valore: 'latte', label: 'Latte' }, { valore: 'frutta_a_guscio', label: 'Frutta a guscio' },
  { valore: 'sedano', label: 'Sedano' }, { valore: 'senape', label: 'Senape' }, { valore: 'sesamo', label: 'Sesamo' },
  { valore: 'solfiti', label: 'Solfiti' }, { valore: 'lupini', label: 'Lupini' }, { valore: 'molluschi', label: 'Molluschi' },
]
export const etichettaAllergene = (v: string) => ALLERGENI.find((a) => a.valore === v)?.label ?? v

export const fmtEuro = (n: number | string | null | undefined, decimali = 2) =>
  n === null || n === undefined || n === '' ? '—'
    : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimali,
        maximumFractionDigits: decimali }).format(Number(n))

export const fmtNumero = (n: number | string | null | undefined, decimali = 0) =>
  n === null || n === undefined || n === '' ? '—'
    : new Intl.NumberFormat('it-IT', { maximumFractionDigits: decimali }).format(Number(n))

export const fmtOra = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—'

export const fmtData = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export const fmtGiornoOra = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

/** Minuti trascorsi da un istante. */
export const minutiDa = (iso: string | null | undefined, ora = Date.now()) =>
  iso ? Math.max(0, Math.floor((ora - new Date(iso).getTime()) / 60000)) : 0

/** Data locale AAAA-MM-GG (fuso del browser, che in sala è quello del locale). */
export const oggiIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
