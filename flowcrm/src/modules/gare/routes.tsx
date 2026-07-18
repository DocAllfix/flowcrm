import { lazy, Suspense, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

const GarePage = lazy(() => import('@/modules/gare/pages/GarePage').then((m) => ({ default: m.GarePage })))
const GareKanbanPage = lazy(() => import('@/modules/gare/pages/GareKanbanPage').then((m) => ({ default: m.GareKanbanPage })))
const GaraDettaglioPage = lazy(() => import('@/modules/gare/pages/GaraDettaglioPage').then((m) => ({ default: m.GaraDettaglioPage })))
const GareDashboardPage = lazy(() => import('@/modules/gare/pages/GareDashboardPage').then((m) => ({ default: m.GareDashboardPage })))

function Caricamento({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      {children}
    </Suspense>
  )
}

export function gareRoutes() {
  return (
    <>
      <Route path="/gare" element={<Caricamento><GarePage /></Caricamento>} />
      <Route path="/gare/:id" element={<Caricamento><GaraDettaglioPage /></Caricamento>} />
      <Route path="/gare-kanban" element={<Caricamento><GareKanbanPage /></Caricamento>} />
      <Route path="/gare-dashboard" element={<Caricamento><GareDashboardPage /></Caricamento>} />
    </>
  )
}
