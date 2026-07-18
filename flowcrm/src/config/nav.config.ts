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
  UsersRound,
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
  /** Identificatore stabile della sezione (usato dalla vista-modulo per
   *  scegliere quali sezioni core mostrare accanto a un modulo). */
  id?: string
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
    id: 'dashboard',
    title: null,
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Dashboard economica', path: '/dashboard-economica', icon: ChartColumn, managerOnly: true },
    ],
  },
  {
    id: 'crm',
    title: 'CRM',
    items: [
      { label: 'Organizzazioni', path: '/organizzazioni', icon: Building2 },
      { label: 'Contatti', path: '/contatti', icon: BookUser },
    ],
  },
  {
    id: 'vendite',
    title: 'Vendite',
    items: [
      { label: 'Deal', path: '/deal', icon: CircleDollarSign },
      { label: 'Kanban offerte', path: '/kanban', icon: Columns3 },
    ],
  },
  {
    id: 'operazioni',
    title: 'Operazioni',
    items: [
      { label: 'Attività', path: '/attivita', icon: ListChecks },
      { label: 'Calendario', path: '/calendario', icon: CalendarDays },
      { label: 'Riunioni', path: '/riunioni', icon: CalendarDays },
      { label: 'Progetti', path: '/progetti', icon: FolderKanban },
      { label: 'Commesse', path: '/commesse', icon: Briefcase },
      { label: 'Canale team', path: '/team', icon: MessagesSquare },
    ],
  },
  {
    id: 'amministrazione',
    title: 'Amministrazione',
    items: [
      { label: 'Registro fatture', path: '/fatture', icon: FileText, managerOnly: true },
      { label: 'Incassi previsti', path: '/incassi', icon: Banknote, managerOnly: true },
      { label: 'Scadenze tasse', path: '/tasse', icon: Receipt, managerOnly: true },
    ],
  },
  {
    id: 'hr',
    title: 'HR',
    items: [
      { label: 'Personale', path: '/personale', icon: UsersRound, managerOnly: true },
    ],
  },
]

/** Filtra un elenco di sezioni in base al ruolo: le voci managerOnly
 *  spariscono per l'operatore, le sezioni rimaste vuote non si renderizzano. */
export function filterSectionsForRole(sections: NavSection[], isManager: boolean): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.managerOnly || isManager),
    }))
    .filter((section) => section.items.length > 0)
}

/** Sezioni core filtrate per ruolo (senza i moduli verticali). */
export function navForRole(isManager: boolean): NavSection[] {
  return filterSectionsForRole(NAV_SECTIONS, isManager)
}
