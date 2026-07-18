import { Gavel, Columns3, ChartColumn } from 'lucide-react'
import type { NavSection } from '@/config/nav.config'

export const GARE_NAV: NavSection[] = [
  {
    id: 'modulo-gare',
    title: "Gare d'appalto",
    items: [
      { label: 'Gare', path: '/gare', icon: Gavel },
      { label: 'Kanban gare', path: '/gare-kanban', icon: Columns3 },
      { label: 'Dashboard gare', path: '/gare-dashboard', icon: ChartColumn },
    ],
  },
]
