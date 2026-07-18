import { HardHat } from 'lucide-react'
import type { NavSection } from '@/config/nav.config'

export const CANTIERE_NAV: NavSection[] = [
  {
    id: 'modulo-cantiere',
    title: 'Cantieri',
    items: [
      { label: 'Cantieri', path: '/cantieri', icon: HardHat },
    ],
  },
]
