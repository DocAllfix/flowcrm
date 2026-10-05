import {
  Flower2, ClipboardList, Scissors, Truck, ShoppingBag, CalendarDays, BookImage, Package, CalendarHeart, Repeat, HeartHandshake, Store, UserCog, ChartPie,
} from 'lucide-react'
import type { NavSection } from '@/config/nav.config'

export const FIORAIO_NAV: NavSection[] = [
  {
    id: 'modulo-fioraio-negozio',
    title: 'Fioraio · negozio',
    items: [
      { label: 'Oggi in negozio', path: '/fioraio', icon: Flower2 },
      { label: 'Ordini', path: '/fioraio/ordini', icon: ClipboardList },
      { label: 'Laboratorio', path: '/fioraio/produzione', icon: Scissors },
      { label: 'Consegne', path: '/fioraio/consegne', icon: Truck },
      { label: 'Banco e cassa', path: '/fioraio/banco', icon: ShoppingBag },
      { label: 'Agenda', path: '/fioraio/agenda', icon: CalendarDays },
    ],
  },
  {
    id: 'modulo-fioraio-gestione',
    title: 'Fioraio · gestione',
    items: [
      { label: 'Catalogo e composizioni', path: '/fioraio/catalogo', icon: BookImage },
      { label: 'Magazzino floreale', path: '/fioraio/magazzino', icon: Package },
      { label: 'Eventi e cerimonie', path: '/fioraio/eventi', icon: CalendarHeart },
      { label: 'Abbonamenti floreali', path: '/fioraio/abbonamenti', icon: Repeat },
      { label: 'Clienti e ricorrenze', path: '/fioraio/clienti', icon: HeartHandshake },
      { label: 'Personale e turni', path: '/fioraio/personale', icon: UserCog },
      { label: 'Negozio e zone', path: '/fioraio/impostazioni', icon: Store, managerOnly: true },
      { label: 'Analisi', path: '/fioraio/analisi', icon: ChartPie, managerOnly: true },
    ],
  },
]
