/**
 * Registro dei moduli verticali (Gare, Cantiere, Automezzi, Agenti,
 * Poliambulatori, Ristorante, Bar, Hotel, Palestra, Fioraio). Ogni modulo è un pacchetto in src/modules/<slug> che
 * dichiara qui la propria navigazione e le proprie route.
 *
 * Attivazione a due livelli:
 *  - UI: VITE_MODULES (CSV di slug) → APP_CONFIG.moduli
 *  - DB: moduli_licenze + RLS modulo_licenziato() → un modulo non licenziato
 *    non restituisce righe nemmeno via API diretta.
 *
 * Un modulo nuovo si registra aggiungendo la sua ModuloDef a MODULI:
 * nessun'altra modifica a App.tsx/Sidebar è necessaria.
 */
import type { ReactElement } from 'react'
import { Gavel, HardHat, Truck, BriefcaseBusiness, HeartPulse, UtensilsCrossed, Coffee, Hotel, Dumbbell, Flower2, Warehouse, Building, type LucideIcon } from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'
import type { NavSection } from '@/config/nav.config'
import { GARE_NAV } from '@/modules/gare/nav'
import { gareRoutes } from '@/modules/gare/routes'
import { CANTIERE_NAV } from '@/modules/cantiere/nav'
import { cantiereRoutes } from '@/modules/cantiere/routes'
import { AUTOMEZZI_NAV } from '@/modules/automezzi/nav'
import { automezziRoutes } from '@/modules/automezzi/routes'
import { AGENTI_NAV } from '@/modules/agenti/nav'
import { agentiRoutes } from '@/modules/agenti/routes'
import { POLIAMBULATORI_NAV } from '@/modules/poliambulatori/nav'
import { poliambulatoriRoutes } from '@/modules/poliambulatori/routes'
import { RISTORANTE_NAV } from '@/modules/ristorante/nav'
import { ristoranteRoutes } from '@/modules/ristorante/routes'
import { BAR_NAV } from '@/modules/bar/nav'
import { barRoutes } from '@/modules/bar/routes'
import { HOTEL_NAV } from '@/modules/hotel/nav'
import { hotelRoutes } from '@/modules/hotel/routes'
import { PALESTRA_NAV } from '@/modules/palestra/nav'
import { palestraRoutes } from '@/modules/palestra/routes'
import { FIORAIO_NAV } from '@/modules/fioraio/nav'
import { fioraioRoutes } from '@/modules/fioraio/routes'
import { GARAGE_NAV } from '@/modules/garage/nav'
import { garageRoutes } from '@/modules/garage/routes'
import { IMMOBILIARE_NAV } from '@/modules/immobiliare/nav'
import { immobiliareRoutes } from '@/modules/immobiliare/routes'

/** Le famiglie del selettore, in quest'ordine. */
export const FAMIGLIE = ['Edilizia e appalti', 'Ospitalità e ristorazione', 'Servizi e commercio', 'Sanità'] as const
export type Famiglia = (typeof FAMIGLIE)[number]

export interface ModuloDef {
  slug: string
  /** Nome commerciale mostrato nel selettore (es. "Gare d'appalto"). */
  label: string
  icon: LucideIcon
  /** Una riga per il selettore: per chi è il modulo. */
  descrizione: string
  /** Sezioni di navigazione del modulo (stesso formato del core). */
  nav: NavSection[]
  /** Route del modulo, montate dentro <AppLayout> (fragment di <Route>). */
  routes: () => ReactElement
  /** Famiglia nel selettore dei moduli: con dodici moduli l'elenco si raggruppa. */
  famiglia: Famiglia
}

/** Registro completo: i moduli si aggiungono qui, fase per fase. */
export const MODULI: ModuloDef[] = [
  {
    slug: 'gare',
    famiglia: 'Edilizia e appalti',
    label: "Gare d'appalto",
    icon: Gavel,
    descrizione: 'Per chi partecipa ad appalti: dal bando all\'aggiudicazione',
    nav: GARE_NAV,
    routes: gareRoutes,
  },
  {
    slug: 'cantiere',
    famiglia: 'Edilizia e appalti',
    label: 'Cantieri',
    icon: HardHat,
    descrizione: 'Per imprese edili: avanzamento, sicurezza, SAL e contabilità lavori',
    nav: CANTIERE_NAV,
    routes: cantiereRoutes,
  },
  {
    slug: 'automezzi',
    famiglia: 'Edilizia e appalti',
    label: 'Parco automezzi',
    icon: Truck,
    descrizione: 'Per chi gestisce flotte: scadenze, manutenzioni, consumi, costo/km',
    nav: AUTOMEZZI_NAV,
    routes: automezziRoutes,
  },
  {
    slug: 'agenti',
    famiglia: 'Servizi e commercio',
    label: 'Agenti di commercio',
    icon: BriefcaseBusiness,
    descrizione: 'Per reti vendita: mandati, visite, ordini, provvigioni, portale agente',
    nav: AGENTI_NAV,
    routes: agentiRoutes,
  },
  {
    slug: 'poliambulatori',
    famiglia: 'Sanità',
    label: 'Poliambulatori',
    icon: HeartPulse,
    descrizione: 'Per centri medici: pazienti, agenda, referti, con dati clinici solo ai medici',
    nav: POLIAMBULATORI_NAV,
    routes: poliambulatoriRoutes,
  },
  {
    slug: 'ristorante',
    famiglia: 'Ospitalità e ristorazione',
    label: 'Ristorante',
    icon: UtensilsCrossed,
    descrizione: 'Per ristoranti e trattorie: sala, comande, cucina, ricette e food cost',
    nav: RISTORANTE_NAV,
    routes: ristoranteRoutes,
  },
  {
    slug: 'bar',
    famiglia: 'Ospitalità e ristorazione',
    label: 'Bar',
    icon: Coffee,
    descrizione: 'Per bar e caffetterie: banco, mescita, convenzioni con le aziende, happy hour',
    nav: BAR_NAV,
    routes: barRoutes,
  },
  {
    slug: 'hotel',
    famiglia: 'Ospitalità e ristorazione',
    label: 'Hotel',
    icon: Hotel,
    descrizione: 'Per hotel e strutture ricettive: planning, ricevimento, housekeeping, tariffe e revenue, adempimenti',
    nav: HOTEL_NAV,
    routes: hotelRoutes,
  },
  {
    slug: 'palestra',
    famiglia: 'Servizi e commercio',
    label: 'Palestra',
    icon: Dumbbell,
    descrizione: 'Per palestre e centri fitness: soci, abbonamenti e accessi, corsi, personal trainer, incassi ricorrenti',
    nav: PALESTRA_NAV,
    routes: palestraRoutes,
  },
  {
    slug: 'fioraio',
    famiglia: 'Servizi e commercio',
    label: 'Fioraio',
    icon: Flower2,
    descrizione: 'Per fioristi: ordini con destinatario e biglietto, composizioni, laboratorio, consegne, deperibilità',
    nav: FIORAIO_NAV,
    routes: fioraioRoutes,
  },
  {
    slug: 'garage',
    famiglia: 'Servizi e commercio',
    label: 'Garage e autorimesse',
    icon: Warehouse,
    descrizione: 'Per autorimesse e parcheggi: posti dal vivo, ingressi e uscite con tariffa, abbonamenti, chiavi, danni, ricarica',
    nav: GARAGE_NAV,
    routes: garageRoutes,
  },
  {
    slug: 'immobiliare',
    famiglia: 'Servizi e commercio',
    label: 'Agenzia immobiliare',
    icon: Building,
    descrizione: "Per agenzie immobiliari: fascicolo dell'immobile, incarichi, matching con i clienti, visite, proposte, rogiti, locazioni, provvigioni",
    nav: IMMOBILIARE_NAV,
    routes: immobiliareRoutes,
  },
]

/** Moduli attivi in QUESTA istanza (intersezione registro × VITE_MODULES). */
export function moduliAttivi(): ModuloDef[] {
  return MODULI.filter((m) => APP_CONFIG.moduli.includes(m.slug))
}

export function moduloBySlug(slug: string): ModuloDef | undefined {
  return moduliAttivi().find((m) => m.slug === slug)
}
