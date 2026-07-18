import { lazy, Suspense, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

const CantieriPage = lazy(() => import('@/modules/cantiere/pages/CantieriPage').then((m) => ({ default: m.CantieriPage })))
const CantiereDettaglioPage = lazy(() => import('@/modules/cantiere/pages/CantiereDettaglioPage').then((m) => ({ default: m.CantiereDettaglioPage })))

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

export function cantiereRoutes() {
  return (
    <>
      <Route path="/cantieri" element={<Caricamento><CantieriPage /></Caricamento>} />
      <Route path="/cantieri/:id" element={<Caricamento><CantiereDettaglioPage /></Caricamento>} />
    </>
  )
}
