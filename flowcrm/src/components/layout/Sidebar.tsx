import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { X, User, Users, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'
import { MarchioCliente } from '@/components/layout/MarchioCliente'
import { navForRole, filterSectionsForRole } from '@/config/nav.config'
import { moduliAttivi, moduloBySlug } from '@/config/moduli.config'
import { useVistaModulo } from '@/components/layout/VistaModuloContext'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarProps {
  /** Stato off-canvas su mobile */
  open: boolean
  onClose: () => void
  /** Ridotta alle sole icone su desktop */
  compressa: boolean
  onToggleCompressa: () => void
}

/**
 * Classi di una voce di navigazione.
 *
 * ── Perché una funzione e non tre copie ─────────────────────────────
 * Lo stesso blocco era ricopiato tre volte nello stesso file (voci di
 * sezione, «Il mio profilo», «Gestione utenti»): tre punti che potevano
 * divergere per una svista, e infatti già divergevano.
 *
 * ── Perché la voce corrente non ha più la barra laterale ────────────
 * Era `border-l-[3px] border-sidebar-primary`, e ha due problemi. È il
 * divieto assoluto numero uno di `DESIGN.md` (una striscia colorata come
 * bordo laterale), e soprattutto **sposta il testo di 3px** ogni volta
 * che una voce si attiva: navigando, l'intero menu trema. Al suo posto
 * fondo, colore e peso — che non toccano la scatola — più un indicatore
 * disegnato con uno pseudo-elemento, che sta FUORI dal flusso.
 */
function classiVoceNav(attiva: boolean, compressa: boolean): string {
  return cn(
    'relative flex items-center gap-3 rounded-md py-2 text-sm transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring',
    compressa ? 'justify-center px-2' : 'px-3',
    attiva
      ? [
          'bg-sidebar-accent font-semibold text-sidebar-accent-foreground',
          // L'indicatore è un pseudo-elemento posizionato: non occupa
          // spazio, quindi il testo resta esattamente dov'era.
          'before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5',
          'before:-translate-y-1/2 before:rounded-full before:bg-sidebar-primary',
          'before:content-[""]',
        ]
      : 'font-medium text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
  )
}

/**
 * Barra laterale: marchio del cliente, sezioni con etichetta in
 * maiuscoletto, voce corrente evidenziata. Le voci managerOnly sono
 * filtrate da navForRole (la RLS resta la barriera vera).
 */
export function Sidebar({
  open,
  onClose,
  compressa,
  onToggleCompressa,
}: SidebarProps) {
  const { isManager, isAdmin, userProfile } = useAuth()
  const { vista } = useVistaModulo()

  // Navigazione per vista: 'tutti' = core + tutti i moduli attivi;
  // vista modulo = sezioni del modulo sopra la base (Dashboard + CRM).
  const sections = useMemo(() => {
    const core = navForRole(isManager)
    if (vista === 'tutti') {
      const mods = moduliAttivi().flatMap((m) => filterSectionsForRole(m.nav, isManager))
      return [...core, ...mods]
    }
    const mod = moduloBySlug(vista)
    if (!mod) return core
    const basi = core.filter((s) => s.id === 'dashboard' || s.id === 'crm')
    return [...filterSectionsForRole(mod.nav, isManager), ...basi]
  }, [vista, isManager])

  const initials = userProfile
    ? `${userProfile.nome[0] ?? ''}${userProfile.cognome?.[0] ?? ''}`.toUpperCase()
    : ''

  /** Una voce: con l'etichetta, o sola icona più suggerimento se compressa. */
  const voce = (
    path: string,
    label: string,
    Icona: React.ElementType,
    end = false,
  ) => {
    const link = (
      <NavLink
        key={path}
        to={path}
        end={end}
        onClick={onClose}
        className={({ isActive }) => classiVoceNav(isActive, compressa)}
      >
        <Icona className="size-4 shrink-0" aria-hidden />
        {compressa ? <span className="sr-only">{label}</span> : <span>{label}</span>}
      </NavLink>
    )
    if (!compressa) return link
    return (
      <Tooltip key={path}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <>
      {/* Velo su mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        data-tour="sidebar"
        aria-label="Navigazione principale"
        className={cn(
          'fixed z-40 flex h-full flex-col border-r border-sidebar-border bg-sidebar md:relative md:translate-x-0',
          // La larghezza è una proprietà di disposizione: animarla fa
          // ricalcolare il layout a ogni fotogramma. Cambia di scatto, e
          // l'unica cosa animata è lo scorrimento fuori schermo su mobile.
          compressa ? 'w-[4.25rem]' : 'w-64',
          'motion-safe:transition-transform',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Marchio */}
        <div
          className={cn(
            'flex items-center gap-2 border-b border-sidebar-border',
            compressa ? 'justify-center p-3' : 'justify-between p-5',
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <MarchioCliente />
            {!compressa && (
              <span className="truncate text-title font-semibold text-foreground">
                {APP_CONFIG.appName}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="tocco-comodo rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring md:hidden"
            aria-label="Chiudi il menu"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {/* Navigazione */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {sections.map((section, i) => (
            <div key={section.title ?? i}>
              {section.title &&
                (compressa ? (
                  // Compressa, l'etichetta di sezione diventa un filo: il
                  // raggruppamento resta visibile senza il testo.
                  <hr className="my-3 border-sidebar-border" />
                ) : (
                  <p className="mb-2 px-3 pt-4 text-label uppercase text-muted-foreground">
                    {section.title}
                  </p>
                ))}
              {section.items.map((item) =>
                voce(item.path, item.label, item.icon, item.path === '/'),
              )}
            </div>
          ))}
        </nav>

        {/* Account */}
        <div className="space-y-1 border-t border-sidebar-border p-3">
          {voce('/profilo', 'Il mio profilo', User)}
          {isAdmin && voce('/utenti', 'Gestione utenti', Users)}
        </div>

        {/* Utente */}
        {userProfile && (
          <div
            className={cn(
              'border-t border-sidebar-border',
              compressa ? 'flex justify-center p-3' : 'p-4',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-10 shrink-0">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              {!compressa && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {userProfile.nome} {userProfile.cognome ?? ''}
                  </p>
                  <p className="truncate text-xs capitalize text-muted-foreground">
                    {userProfile.ruolo}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Comprimi — solo su desktop, dove c'è un puntatore preciso */}
        <div className="hidden border-t border-sidebar-border p-2 md:block">
          <button
            onClick={onToggleCompressa}
            aria-label={
              compressa ? 'Espandi la barra laterale' : 'Comprimi la barra laterale'
            }
            aria-pressed={compressa}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors',
              'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring',
              compressa && 'justify-center px-2',
            )}
          >
            {compressa ? (
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="size-4 shrink-0" aria-hidden />
                <span>Comprimi</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
