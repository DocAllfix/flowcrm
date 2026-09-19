import { lazy, Suspense, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'

const CantieriPage = lazy(() => import('@/modules/cantiere/pages/CantieriPage').then((m) => ({ default: m.CantieriPage })))
const CantiereDettaglioPage = lazy(() => import('@/modules/cantiere/pages/CantiereDettaglioPage').then((m) => ({ default: m.CantiereDettaglioPage })))

function Caricamento({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <Spinner etichetta="Caricamento in corso" dimensione="lg" />
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
