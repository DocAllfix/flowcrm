import { BriefcaseBusiness, ChartColumn } from 'lucide-react'
import type { NavSection } from '@/config/nav.config'

export const AGENTI_NAV: NavSection[] = [
  {
    id: 'modulo-agenti',
    title: 'Rete vendita',
    items: [
      { label: 'Agenti', path: '/agenti', icon: BriefcaseBusiness },
      { label: 'Direzione commerciale', path: '/direzione-commerciale', icon: ChartColumn, managerOnly: true },
    ],
  },
]
