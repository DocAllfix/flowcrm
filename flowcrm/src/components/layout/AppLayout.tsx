import { useCallback, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotificheSubscription } from '@/hooks/useNotifiche'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { BannerDemo } from '@/components/layout/BannerDemo'
import { VistaModuloProvider } from '@/components/layout/VistaModuloContext'
import { CommandPalette } from '@/components/CommandPalette'
import { Spinner } from '@/components/ui/spinner'
import { CopilotWidget } from '@/components/CopilotWidget'
import { TourAutoStarter } from '@/lib/onboarding/TourAutoStarter'

/**
 * Shell autenticata: sidebar + header + contenuto (Outlet).
 * Redirect a /login se non autenticato (pattern ProtectedLayout CertDesk).
 */
export function AppLayout() {
  const { user, isLoading, errorAccount } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // La preferenza sulla barra compressa resta fra una sessione e l'altra:
  // chi lavora su un portatile la chiude una volta, non a ogni accesso.
  const [compressa, setCompressa] = useState(() => {
    try {
      return localStorage.getItem('flowcrm-sidebar-compressa') === 'si'
    } catch {
      return false
    }
  })
  const alternaCompressa = useCallback(() => {
    setCompressa((c) => {
      try {
        localStorage.setItem('flowcrm-sidebar-compressa', c ? 'no' : 'si')
      } catch {
        // La scelta vale comunque per questa sessione.
      }
      return !c
    })
  }, [])

  // Canale Realtime notifiche — UNA sola subscription per l'intera app.
  // No-op finché l'utente non è autenticato (guard interna sull'userId).
  useNotificheSubscription()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner etichetta="Caricamento della sessione" dimensione="lg" className="text-primary-testo" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ errorAccount }} />
  }

  return (
    <VistaModuloProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Salto alla pagina: chi naviga da tastiera non deve attraversare
            trenta voci di menu a ogni cambio di schermata. Invisibile finché
            non riceve il focus. */}
        <a
          href="#contenuto"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:outline-2 focus:outline-offset-2 focus:outline-ring"
        >
          Vai al contenuto
        </a>
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          compressa={compressa}
          onToggleCompressa={alternaCompressa}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          <BannerDemo />
          <main id="contenuto" tabIndex={-1} className="flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
        <CommandPalette />
        <CopilotWidget />
        <TourAutoStarter />
      </div>
    </VistaModuloProvider>
  )
}
