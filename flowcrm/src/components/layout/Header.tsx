import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, LogOut, Search, ChevronRight } from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'
import { useAuth } from '@/hooks/useAuth'
import { ConnectionIndicator } from '@/components/layout/ConnectionIndicator'
import { NotificheBadge } from '@/components/notifiche/NotificheBadge'
import { NotifichePanel } from '@/components/notifiche/NotifichePanel'
import { HelpButton } from '@/lib/onboarding/HelpButton'
import { ModuleSwitcher } from '@/components/ModuleSwitcher'
import { InterruttoreTema } from '@/components/layout/InterruttoreTema'
import { apriPalette } from '@/components/CommandPalette'
import { Button } from '@/components/ui/button'
import { navForRole, filterSectionsForRole, posizioneCorrente } from '@/config/nav.config'
import { moduliAttivi } from '@/config/moduli.config'

interface HeaderProps {
  onOpenSidebar: () => void
}

/**
 * Su macOS la scorciatoia è ⌘K, altrove Ctrl+K. Mostrare «Ctrl K» a chi
 * usa un Mac significa mostrargli un tasto che non preme.
 */
function scorciatoiaRicerca(): { visibile: string; ariaKeyShortcuts: string } {
  const mac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  return mac
    ? { visibile: '⌘K', ariaKeyShortcuts: 'Meta+K' }
    : { visibile: 'Ctrl K', ariaKeyShortcuts: 'Control+K' }
}

/**
 * Dove sono. L'intestazione portava solo comandi: aperta una scheda di
 * dettaglio non c'era modo di sapere in che sezione si fosse né come
 * tornare all'elenco, se non col tasto indietro del browser.
 */
function PosizioneCorrente() {
  const { pathname } = useLocation()
  const { isManager } = useAuth()

  const posizione = useMemo(() => {
    const sezioni = [
      ...navForRole(isManager),
      ...moduliAttivi().flatMap((m) => filterSectionsForRole(m.nav, isManager)),
    ]
    return posizioneCorrente(pathname, sezioni)
  }, [pathname, isManager])

  if (!posizione) return null

  return (
    <nav aria-label="Posizione" className="hidden min-w-0 lg:block">
      <ol className="flex items-center gap-1.5 text-sm">
        {posizione.sezione && (
          <>
            <li className="text-muted-foreground">{posizione.sezione}</li>
            <li aria-hidden className="text-muted-foreground">
              <ChevronRight className="size-3.5" />
            </li>
          </>
        )}
        <li className="min-w-0">
          {posizione.dettaglio ? (
            // In dettaglio la voce torna a essere un collegamento: è la via
            // di uscita che prima non c'era.
            <Link
              to={posizione.path}
              className="truncate rounded-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {posizione.voce}
            </Link>
          ) : (
            <span aria-current="page" className="truncate font-medium text-foreground">
              {posizione.voce}
            </span>
          )}
        </li>
      </ol>
    </nav>
  )
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { logout } = useAuth()
  const [notificheOpen, setNotificheOpen] = useState(false)
  const scorciatoia = useMemo(scorciatoiaRicerca, [])

  return (
    <header className="border-b border-border bg-card px-4 py-2.5 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="tocco-comodo rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
            aria-label="Apri il menu"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          {APP_CONFIG.demoMode && (
            <span className="rounded-md bg-warning/20 px-2 py-0.5 text-label uppercase text-foreground">
              Demo
            </span>
          )}
          <ModuleSwitcher />
          <PosizioneCorrente />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            data-tour="global-search"
            // Chiamata diretta: prima questo bottone fabbricava un
            // KeyboardEvent finto Ctrl+K e lo lanciava su window.
            onClick={apriPalette}
            aria-haspopup="dialog"
            aria-keyshortcuts={scorciatoia.ariaKeyShortcuts}
            className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Search className="size-4" aria-hidden />
            <span className="hidden md:inline">Cerca…</span>
            <kbd className="hidden rounded border border-border px-1.5 font-sans text-[10px] md:inline">
              {scorciatoia.visibile}
            </kbd>
          </button>
          <ConnectionIndicator collapsed={false} />
          <InterruttoreTema />
          <HelpButton />
          <span data-tour="notifiche" className="inline-flex">
            <NotificheBadge onClick={() => setNotificheOpen(true)} />
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void logout()}
            className="tocco-comodo gap-2 text-muted-foreground"
          >
            <LogOut className="size-4" aria-hidden />
            <span className="hidden sm:inline">Esci</span>
          </Button>
        </div>
      </div>
      <NotifichePanel open={notificheOpen} onClose={() => setNotificheOpen(false)} />
    </header>
  )
}
