import {
  Warehouse, ArrowDownUp, LayoutGrid, CalendarClock, Wallet, KeyRound, ShieldAlert, Plug, Sparkles, Users, FileSignature, Building2, Settings2, Wrench, UserCog,
  Megaphone, ChartPie,
} from 'lucide-react'
import type { NavSection } from '@/config/nav.config'

export const GARAGE_NAV: NavSection[] = [
  {
    id: 'modulo-garage-operativo',
    title: 'Garage · operativo',
    items: [
      { label: 'Cruscotto', path: '/garage', icon: Warehouse },
      { label: 'Ingressi e uscite', path: '/garage/movimenti', icon: ArrowDownUp },
      { label: 'Mappa dei posti', path: '/garage/posti', icon: LayoutGrid },
      { label: 'Prenotazioni', path: '/garage/prenotazioni', icon: CalendarClock },
      { label: 'Incassi', path: '/garage/incassi', icon: Wallet },
      { label: 'Chiavi', path: '/garage/chiavi', icon: KeyRound },
      { label: 'Danni e anomalie', path: '/garage/danni', icon: ShieldAlert },
      { label: 'Ricarica elettrica', path: '/garage/ricariche', icon: Plug },
      { label: 'Servizi e gomme', path: '/garage/servizi', icon: Sparkles },
    ],
  },
  {
    id: 'modulo-garage-gestione',
    title: 'Garage · gestione',
    items: [
      { label: 'Clienti e veicoli', path: '/garage/clienti', icon: Users },
      { label: 'Contratti e abbonamenti', path: '/garage/contratti', icon: FileSignature },
      { label: 'Convenzioni aziendali', path: '/garage/convenzioni', icon: Building2 },
      { label: 'Impianti e sicurezza', path: '/garage/impianti', icon: Wrench },
      { label: 'Personale e turni', path: '/garage/personale', icon: UserCog },
      { label: 'Comunicazioni', path: '/garage/campagne', icon: Megaphone },
      { label: 'Struttura e tariffe', path: '/garage/impostazioni', icon: Settings2, managerOnly: true },
      { label: 'Analisi', path: '/garage/analisi', icon: ChartPie, managerOnly: true },
    ],
  },
]
