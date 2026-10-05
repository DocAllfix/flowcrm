import {
  Gauge, Building, Search, Inbox, CalendarClock, Handshake, KeyRound, CalendarDays, UserRound, FileSignature, Wallet, Users, Megaphone, ShieldCheck, Settings2, ChartPie,
} from 'lucide-react'
import type { NavSection } from '@/config/nav.config'

export const IMMOBILIARE_NAV: NavSection[] = [
  {
    id: 'modulo-immobiliare-agenzia',
    title: 'Agenzia immobiliare',
    items: [
      { label: 'Cruscotto', path: '/immobiliare', icon: Gauge },
      { label: 'Immobili', path: '/immobiliare/immobili', icon: Building },
      { label: 'Richieste e matching', path: '/immobiliare/richieste', icon: Search },
      { label: 'Lead', path: '/immobiliare/lead', icon: Inbox },
      { label: 'Visite', path: '/immobiliare/visite', icon: CalendarClock },
      { label: 'Trattative', path: '/immobiliare/trattative', icon: Handshake },
      { label: 'Locazioni', path: '/immobiliare/locazioni', icon: KeyRound },
      { label: 'Agenda', path: '/immobiliare/agenda', icon: CalendarDays },
    ],
  },
  {
    id: 'modulo-immobiliare-gestione',
    title: 'Agenzia · gestione',
    items: [
      { label: 'Proprietari', path: '/immobiliare/proprietari', icon: UserRound },
      { label: 'Contratti', path: '/immobiliare/contratti', icon: FileSignature },
      { label: 'Provvigioni', path: '/immobiliare/provvigioni', icon: Wallet },
      { label: 'Agenti e rete', path: '/immobiliare/agenti', icon: Users },
      { label: 'Marketing', path: '/immobiliare/marketing', icon: Megaphone },
      { label: 'Compliance', path: '/immobiliare/compliance', icon: ShieldCheck },
      { label: "Regole dell'agenzia", path: '/immobiliare/impostazioni', icon: Settings2, managerOnly: true },
      { label: 'Analisi', path: '/immobiliare/analisi', icon: ChartPie, managerOnly: true },
    ],
  },
]
