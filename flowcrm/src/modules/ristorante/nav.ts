import {
  LayoutDashboard, LayoutGrid, CalendarClock, ClipboardList, ChefHat, Receipt, BookOpen, Wine,
  Package, ShieldCheck, Users, PartyPopper, HeartHandshake, ChartPie,
} from 'lucide-react'
import type { NavSection } from '@/config/nav.config'

export const RISTORANTE_NAV: NavSection[] = [
  {
    id: 'modulo-ristorante-servizio',
    title: 'Ristorante · servizio',
    items: [
      { label: 'Cruscotto', path: '/ristorante', icon: LayoutDashboard },
      { label: 'Sala', path: '/ristorante/sala', icon: LayoutGrid },
      { label: 'Prenotazioni', path: '/ristorante/prenotazioni', icon: CalendarClock },
      { label: 'Comande', path: '/ristorante/comande', icon: ClipboardList },
      { label: 'Cucina', path: '/ristorante/cucina', icon: ChefHat },
      { label: 'Cassa', path: '/ristorante/cassa', icon: Receipt },
    ],
  },
  {
    id: 'modulo-ristorante-gestione',
    title: 'Ristorante · gestione',
    items: [
      { label: 'Menu e ricette', path: '/ristorante/catalogo', icon: BookOpen },
      { label: 'Cantina', path: '/ristorante/cantina', icon: Wine },
      { label: 'Magazzino', path: '/ristorante/magazzino', icon: Package },
      { label: 'HACCP e attrezzature', path: '/ristorante/controlli', icon: ShieldCheck },
      { label: 'Personale e turni', path: '/ristorante/personale', icon: Users },
      { label: 'Eventi e banqueting', path: '/ristorante/eventi', icon: PartyPopper },
      { label: 'Clienti e fidelity', path: '/ristorante/clienti', icon: HeartHandshake },
      { label: 'Analisi', path: '/ristorante/analisi', icon: ChartPie },
    ],
  },
]
