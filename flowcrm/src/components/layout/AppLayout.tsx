import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotificheSubscription } from '@/hooks/useNotifiche'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { VistaModuloProvider } from '@/components/layout/VistaModuloContext'
import { CommandPalette } from '@/components/CommandPalette'
import { CopilotWidget } from '@/components/CopilotWidget'
import { TourAutoStarter } from '@/lib/onboarding/TourAutoStarter'

/**
 * Shell autenticata: sidebar + header + contenuto (Outlet).
 * Redirect a /login se non autenticato (pattern ProtectedLayout CertDesk).
 */
export function AppLayout() {
  const { user, isLoading, errorAccount } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Canale Realtime notifiche — UNA sola subscription per l'intera app.
  // No-op finché l'utente non è autenticato (guard interna sull'userId).
  useNotificheSubscription()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ errorAccount }} />
  }

  return (
    <VistaModuloProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
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
