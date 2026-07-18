import { Truck, ChartColumn } from 'lucide-react'
import type { NavSection } from '@/config/nav.config'

export const AUTOMEZZI_NAV: NavSection[] = [
  {
    id: 'modulo-automezzi',
    title: 'Parco automezzi',
    items: [
      { label: 'Automezzi', path: '/automezzi', icon: Truck },
      { label: 'Dashboard parco', path: '/automezzi-dashboard', icon: ChartColumn },
    ],
  },
]
