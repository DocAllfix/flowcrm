import { lazy, Suspense, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

const AutomezziPage = lazy(() => import('@/modules/automezzi/pages/AutomezziPage').then((m) => ({ default: m.AutomezziPage })))
const AutomezzoDettaglioPage = lazy(() => import('@/modules/automezzi/pages/AutomezzoDettaglioPage').then((m) => ({ default: m.AutomezzoDettaglioPage })))
const ParcoDashboardPage = lazy(() => import('@/modules/automezzi/pages/ParcoDashboardPage').then((m) => ({ default: m.ParcoDashboardPage })))

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

export function automezziRoutes() {
  return (
    <>
      <Route path="/automezzi" element={<Caricamento><AutomezziPage /></Caricamento>} />
      <Route path="/automezzi/:id" element={<Caricamento><AutomezzoDettaglioPage /></Caricamento>} />
      <Route path="/automezzi-dashboard" element={<Caricamento><ParcoDashboardPage /></Caricamento>} />
    </>
  )
}
