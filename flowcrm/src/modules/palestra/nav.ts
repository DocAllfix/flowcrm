import {
  DoorOpen, Users, CalendarDays, Dumbbell, Wallet, Target, Tags, UserCog, KeyRound, Package, ShieldCheck, PartyPopper, Megaphone, ChartPie,
} from 'lucide-react'
import type { NavSection } from '@/config/nav.config'

export const PALESTRA_NAV: NavSection[] = [
  {
    id: 'modulo-palestra-reception',
    title: 'Palestra · reception',
    items: [
      { label: 'Reception', path: '/palestra', icon: DoorOpen },
      { label: 'Soci', path: '/palestra/soci', icon: Users },
      { label: 'Corsi', path: '/palestra/corsi', icon: CalendarDays },
      { label: 'PT e wellness', path: '/palestra/agenda', icon: Dumbbell },
      { label: 'Incassi', path: '/palestra/incassi', icon: Wallet },
      { label: 'Prospect', path: '/palestra/prospect', icon: Target },
    ],
  },
  {
    id: 'modulo-palestra-gestione',
    title: 'Palestra · gestione',
    items: [
      { label: 'Listini e regole', path: '/palestra/listini', icon: Tags, managerOnly: true },
      { label: 'Trainer e personale', path: '/palestra/personale', icon: UserCog },
      { label: 'Spogliatoi', path: '/palestra/spogliatoi', icon: KeyRound },
      { label: 'Magazzino e prodotti', path: '/palestra/magazzino', icon: Package },
      { label: 'Attrezzature e pulizie', path: '/palestra/attrezzature', icon: ShieldCheck },
      { label: 'Eventi', path: '/palestra/eventi', icon: PartyPopper },
      { label: 'Fidelizzazione e campagne', path: '/palestra/clienti', icon: Megaphone },
      { label: 'Analisi', path: '/palestra/analisi', icon: ChartPie, managerOnly: true },
    ],
  },
]
