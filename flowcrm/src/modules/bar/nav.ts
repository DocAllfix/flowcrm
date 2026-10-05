import {
  LayoutDashboard, LayoutGrid, Coffee, ClipboardList, CalendarClock, Receipt, BookOpen, Martini, Building2,
  Package, ShieldCheck, Users, PartyPopper, HeartHandshake, ChartPie,
} from 'lucide-react'
import type { NavSection } from '@/config/nav.config'

export const BAR_NAV: NavSection[] = [
  {
    id: 'modulo-bar-servizio',
    title: 'Bar · servizio',
    items: [
      { label: 'Cruscotto', path: '/bar', icon: LayoutDashboard },
      { label: 'Banco', path: '/bar/banco', icon: Coffee },
      { label: 'Ordini', path: '/bar/comande', icon: ClipboardList },
      { label: 'Sala e tavoli', path: '/bar/sala', icon: LayoutGrid },
      { label: 'Prenotazioni', path: '/bar/prenotazioni', icon: CalendarClock },
      { label: 'Cassa', path: '/bar/cassa', icon: Receipt },
    ],
  },
  {
    id: 'modulo-bar-gestione',
    title: 'Bar · gestione',
    items: [
      { label: 'Listini e ricette', path: '/bar/catalogo', icon: BookOpen },
      { label: 'Mescita', path: '/bar/mescita', icon: Martini },
      { label: 'Convenzioni', path: '/bar/convenzioni', icon: Building2 },
      { label: 'Magazzino', path: '/bar/magazzino', icon: Package },
      { label: 'HACCP e attrezzature', path: '/bar/controlli', icon: ShieldCheck },
      { label: 'Personale e turni', path: '/bar/personale', icon: Users },
      { label: 'Eventi', path: '/bar/eventi', icon: PartyPopper },
      { label: 'Clienti e fidelity', path: '/bar/clienti', icon: HeartHandshake },
      { label: 'Analisi', path: '/bar/analisi', icon: ChartPie, managerOnly: true },
    ],
  },
]
