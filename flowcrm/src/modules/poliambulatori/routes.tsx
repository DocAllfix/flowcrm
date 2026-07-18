import { lazy, Suspense, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

const PazientiPage = lazy(() => import('@/modules/poliambulatori/pages/PazientiPage').then((m) => ({ default: m.PazientiPage })))
const PazienteDettaglioPage = lazy(() => import('@/modules/poliambulatori/pages/PazienteDettaglioPage').then((m) => ({ default: m.PazienteDettaglioPage })))
const AgendaPoliPage = lazy(() => import('@/modules/poliambulatori/pages/AgendaPoliPage').then((m) => ({ default: m.AgendaPoliPage })))
const StrutturaPage = lazy(() => import('@/modules/poliambulatori/pages/StrutturaPage').then((m) => ({ default: m.StrutturaPage })))
const PoliambulatorioDashboardPage = lazy(() => import('@/modules/poliambulatori/pages/PoliambulatorioDashboardPage').then((m) => ({ default: m.PoliambulatorioDashboardPage })))

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

export function poliambulatoriRoutes() {
  return (
    <>
      <Route path="/pazienti" element={<Caricamento><PazientiPage /></Caricamento>} />
      <Route path="/pazienti/:id" element={<Caricamento><PazienteDettaglioPage /></Caricamento>} />
      <Route path="/agenda-poliambulatorio" element={<Caricamento><AgendaPoliPage /></Caricamento>} />
      <Route path="/poliambulatorio-struttura" element={<Caricamento><StrutturaPage /></Caricamento>} />
      <Route path="/poliambulatorio-dashboard" element={<Caricamento><PoliambulatorioDashboardPage /></Caricamento>} />
    </>
  )
}
