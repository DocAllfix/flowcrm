import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { X, User, Users } from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'
import { MarchioCliente } from '@/components/layout/MarchioCliente'
import { navForRole, filterSectionsForRole } from '@/config/nav.config'
import { moduliAttivi, moduloBySlug } from '@/config/moduli.config'
import { useVistaModulo } from '@/components/layout/VistaModuloContext'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface SidebarProps {
  /** Stato off-canvas su mobile */
  open: boolean
  onClose: () => void
}

/**
 * Barra laterale: marchio del cliente, sezioni con etichetta in maiuscoletto,
 * voce corrente evidenziata. Le voci managerOnly sono filtrate da navForRole
 * (la RLS resta la barriera vera).
 */
export function Sidebar({ open, onClose }: SidebarProps) {
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

  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        data-tour="sidebar"
        className={cn(
          'fixed z-40 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 md:relative md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-sidebar-border p-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <MarchioCliente />
            <span className="truncate text-title font-semibold text-foreground">
              {APP_CONFIG.appName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Chiudi menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigazione */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {sections.map((section, i) => (
            <div key={section.title ?? i}>
              {section.title && (
                <p className="mb-2 px-3 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Impostazioni account */}
        <div className="space-y-1 border-t border-sidebar-border p-3">
          <NavLink
            to="/profilo"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              )
            }
          >
            <User className="h-4 w-4 shrink-0" />
            <span>Il mio profilo</span>
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/utenti"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                )
              }
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>Gestione utenti</span>
            </NavLink>
          )}
        </div>

        {/* Utente */}
        {userProfile && (
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10"><AvatarFallback>{initials}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {userProfile.nome} {userProfile.cognome ?? ''}
                </p>
                <p className="truncate text-xs capitalize text-muted-foreground">
                  {userProfile.ruolo}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
