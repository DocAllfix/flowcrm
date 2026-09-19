import { lazy, Suspense, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { ManagerOnly } from '@/components/ManagerOnly'
import { Spinner } from '@/components/ui/spinner'

const AgentiPage = lazy(() => import('@/modules/agenti/pages/AgentiPage').then((m) => ({ default: m.AgentiPage })))
const AgenteDettaglioPage = lazy(() => import('@/modules/agenti/pages/AgenteDettaglioPage').then((m) => ({ default: m.AgenteDettaglioPage })))
const DirezioneCommercialePage = lazy(() => import('@/modules/agenti/pages/DirezioneCommercialePage').then((m) => ({ default: m.DirezioneCommercialePage })))

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

export function agentiRoutes() {
  return (
    <>
      <Route path="/agenti" element={<Caricamento><AgentiPage /></Caricamento>} />
      <Route path="/agenti/:id" element={<Caricamento><AgenteDettaglioPage /></Caricamento>} />
      <Route path="/direzione-commerciale"
        element={<ManagerOnly><Caricamento><DirezioneCommercialePage /></Caricamento></ManagerOnly>} />
    </>
  )
}
