import { HeartPulse, CalendarDays, Building, ChartColumn } from 'lucide-react'
import type { NavSection } from '@/config/nav.config'

export const POLIAMBULATORI_NAV: NavSection[] = [
  {
    id: 'modulo-poliambulatori',
    title: 'Poliambulatorio',
    items: [
      { label: 'Pazienti', path: '/pazienti', icon: HeartPulse },
      { label: 'Agenda', path: '/agenda-poliambulatorio', icon: CalendarDays },
      { label: 'Struttura', path: '/poliambulatorio-struttura', icon: Building },
      { label: 'Dashboard sanitaria', path: '/poliambulatorio-dashboard', icon: ChartColumn },
    ],
  },
]
