/**
 * Registro dei moduli verticali (Gare, Cantiere, Automezzi, Agenti,
 * Poliambulatori). Ogni modulo è un pacchetto in src/modules/<slug> che
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
import { Gavel, HardHat, type LucideIcon } from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'
import type { NavSection } from '@/config/nav.config'
import { GARE_NAV } from '@/modules/gare/nav'
import { gareRoutes } from '@/modules/gare/routes'
import { CANTIERE_NAV } from '@/modules/cantiere/nav'
import { cantiereRoutes } from '@/modules/cantiere/routes'

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
}

/** Registro completo: i moduli si aggiungono qui, fase per fase. */
export const MODULI: ModuloDef[] = [
  {
    slug: 'gare',
    label: "Gare d'appalto",
    icon: Gavel,
    descrizione: 'Per chi partecipa ad appalti: dal bando all\'aggiudicazione',
    nav: GARE_NAV,
    routes: gareRoutes,
  },
  {
    slug: 'cantiere',
    label: 'Cantieri',
    icon: HardHat,
    descrizione: 'Per imprese edili: avanzamento, sicurezza, SAL e contabilità lavori',
    nav: CANTIERE_NAV,
    routes: cantiereRoutes,
  },
  // FASE 3: automezzi · FASE 4: agenti · FASE 5: poliambulatori
]

/** Moduli attivi in QUESTA istanza (intersezione registro × VITE_MODULES). */
export function moduliAttivi(): ModuloDef[] {
  return MODULI.filter((m) => APP_CONFIG.moduli.includes(m.slug))
}

export function moduloBySlug(slug: string): ModuloDef | undefined {
  return moduliAttivi().find((m) => m.slug === slug)
}
