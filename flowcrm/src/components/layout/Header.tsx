import { useState } from 'react'
import { Menu, LogOut, Search } from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'
import { useAuth } from '@/hooks/useAuth'
import { ConnectionIndicator } from '@/components/layout/ConnectionIndicator'
import { NotificheBadge } from '@/components/notifiche/NotificheBadge'
import { NotifichePanel } from '@/components/notifiche/NotifichePanel'
import { HelpButton } from '@/lib/onboarding/HelpButton'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  onOpenSidebar: () => void
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { logout } = useAuth()
  const [notificheOpen, setNotificheOpen] = useState(false)

  return (
    <header className="border-b border-border bg-card px-4 py-3 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenSidebar}
            className="text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Apri menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          {APP_CONFIG.demoMode && (
            <span className="rounded-md bg-warning px-2 py-0.5 text-xs font-bold uppercase text-warning-foreground">
              Demo
            </span>
          )}
          <button
            data-tour="global-search"
            onClick={() =>
              window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
              )
            }
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Cerca…</span>
            <kbd className="hidden rounded border border-border px-1.5 text-[10px] md:inline">Ctrl K</kbd>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionIndicator collapsed={false} />
          <HelpButton />
          <span data-tour="notifiche" className="inline-flex">
            <NotificheBadge onClick={() => setNotificheOpen(true)} />
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void logout()}
            className="gap-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Esci</span>
          </Button>
        </div>
      </div>
      <NotifichePanel open={notificheOpen} onClose={() => setNotificheOpen(false)} />
    </header>
  )
}
