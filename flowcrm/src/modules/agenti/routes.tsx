import { lazy, Suspense, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { ManagerOnly } from '@/components/ManagerOnly'

const AgentiPage = lazy(() => import('@/modules/agenti/pages/AgentiPage').then((m) => ({ default: m.AgentiPage })))
const AgenteDettaglioPage = lazy(() => import('@/modules/agenti/pages/AgenteDettaglioPage').then((m) => ({ default: m.AgenteDettaglioPage })))
const DirezioneCommercialePage = lazy(() => import('@/modules/agenti/pages/DirezioneCommercialePage').then((m) => ({ default: m.DirezioneCommercialePage })))

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
