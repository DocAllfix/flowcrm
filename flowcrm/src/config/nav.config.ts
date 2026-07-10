import {
  LayoutDashboard,
  ChartColumn,
  BookUser,
  Building2,
  CircleDollarSign,
  Columns3,
  Banknote,
  ListChecks,
  CalendarDays,
  FolderKanban,
  Briefcase,
  FileText,
  Receipt,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  /** Voce visibile solo ad admin+manager (es. modulo Amministrazione).
   *  La UI nasconde, la RLS nega: doppia barriera. */
  managerOnly?: boolean
}

export interface NavSection {
  title: string | null
  items: NavItem[]
}

/**
 * Navigazione config-driven (pattern CertDesk).
 * Le sezioni ricalcano i moduli del prototipo; le pagine vengono
 * attivate fase per fase — un item senza route implementata non va
 * aggiunto qui finché la pagina non esiste.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: null,
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Dashboard economica', path: '/dashboard-economica', icon: ChartColumn, managerOnly: true },
    ],
  },
  {
    title: 'CRM',
    items: [
      { label: 'Organizzazioni', path: '/organizzazioni', icon: Building2 },
      { label: 'Contatti', path: '/contatti', icon: BookUser },
    ],
  },
  {
    title: 'Vendite',
    items: [
      { label: 'Deal', path: '/deal', icon: CircleDollarSign },
      { label: 'Kanban offerte', path: '/kanban', icon: Columns3 },
    ],
  },
  {
    title: 'Operazioni',
    items: [
      { label: 'Attività', path: '/attivita', icon: ListChecks },
      { label: 'Riunioni', path: '/riunioni', icon: CalendarDays },
      { label: 'Progetti', path: '/progetti', icon: FolderKanban },
      { label: 'Commesse', path: '/commesse', icon: Briefcase },
      { label: 'Canale team', path: '/team', icon: MessagesSquare },
    ],
  },
  {
    title: 'Amministrazione',
    items: [
      { label: 'Registro fatture', path: '/fatture', icon: FileText, managerOnly: true },
      { label: 'Incassi previsti', path: '/incassi', icon: Banknote, managerOnly: true },
      { label: 'Scadenze tasse', path: '/tasse', icon: Receipt, managerOnly: true },
    ],
  },
]

/** Filtra le sezioni in base al ruolo: le voci managerOnly spariscono
 *  per l'operatore, e le sezioni rimaste vuote non vengono renderizzate. */
export function navForRole(isManager: boolean): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.managerOnly || isManager),
  })).filter((section) => section.items.length > 0)
}
