import {
  ConciergeBell, CalendarRange, BedDouble, LayoutGrid, Sparkles, Bell, Receipt, Tags, Users, HeartHandshake, Landmark,
  Package, ShieldCheck, UserCog, ChartPie,
} from 'lucide-react'
import type { NavSection } from '@/config/nav.config'

export const HOTEL_NAV: NavSection[] = [
  {
    id: 'modulo-hotel-ricevimento',
    title: 'Hotel · ricevimento',
    items: [
      { label: 'Front office', path: '/hotel', icon: ConciergeBell },
      { label: 'Planning', path: '/hotel/planning', icon: CalendarRange },
      { label: 'Prenotazioni', path: '/hotel/prenotazioni', icon: BedDouble },
      { label: 'Camere', path: '/hotel/camere', icon: LayoutGrid },
      { label: 'Housekeeping', path: '/hotel/housekeeping', icon: Sparkles },
      { label: 'Servizi e SPA', path: '/hotel/servizi', icon: Bell },
      { label: 'Cassa', path: '/hotel/cassa', icon: Receipt },
    ],
  },
  {
    id: 'modulo-hotel-gestione',
    title: 'Hotel · gestione',
    items: [
      { label: 'Camere e tariffe', path: '/hotel/tariffe', icon: Tags, managerOnly: true },
      { label: 'Gruppi, sale ed eventi', path: '/hotel/gruppi', icon: Users },
      { label: 'Ospiti', path: '/hotel/ospiti', icon: HeartHandshake },
      { label: 'Adempimenti', path: '/hotel/adempimenti', icon: Landmark },
      { label: 'Magazzino e minibar', path: '/hotel/magazzino', icon: Package },
      { label: 'Impianti e sicurezza', path: '/hotel/controlli', icon: ShieldCheck },
      { label: 'Personale e turni', path: '/hotel/personale', icon: UserCog },
      { label: 'Analisi e revenue', path: '/hotel/analisi', icon: ChartPie, managerOnly: true },
    ],
  },
]
