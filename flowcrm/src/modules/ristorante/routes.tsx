import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'
import { FbProvider } from '@/modules/fb/contesto'

const pagina = <K extends string>(carica: () => Promise<Record<K, ComponentType>>, nome: K) =>
  lazy(() => carica().then((m) => ({ default: m[nome] })))

const CruscottoPage = pagina(() => import('@/modules/fb/pages/CruscottoPage'), 'CruscottoPage')
const SalaPage = pagina(() => import('@/modules/fb/pages/SalaPage'), 'SalaPage')
const PrenotazioniPage = pagina(() => import('@/modules/fb/pages/PrenotazioniPage'), 'PrenotazioniPage')
const ComandePage = pagina(() => import('@/modules/fb/pages/ComandePage'), 'ComandePage')
const ComandaPage = pagina(() => import('@/modules/fb/pages/ComandaPage'), 'ComandaPage')
const CucinaPage = pagina(() => import('@/modules/fb/pages/CucinaPage'), 'CucinaPage')
const CassaPage = pagina(() => import('@/modules/fb/pages/CassaPage'), 'CassaPage')
const CatalogoPage = pagina(() => import('@/modules/fb/pages/CatalogoPage'), 'CatalogoPage')

function Ristorante({ children }: { children: ReactNode }) {
  return (
    <FbProvider modulo="ristorante">
      <Suspense fallback={
        <div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>
      }>
        {children}
      </Suspense>
    </FbProvider>
  )
}

export function ristoranteRoutes() {
  return (
    <>
      <Route path="/ristorante" element={<Ristorante><CruscottoPage /></Ristorante>} />
      <Route path="/ristorante/sala" element={<Ristorante><SalaPage /></Ristorante>} />
      <Route path="/ristorante/prenotazioni" element={<Ristorante><PrenotazioniPage /></Ristorante>} />
      <Route path="/ristorante/comande" element={<Ristorante><ComandePage /></Ristorante>} />
      <Route path="/ristorante/comande/:id" element={<Ristorante><ComandaPage /></Ristorante>} />
      <Route path="/ristorante/cucina" element={<Ristorante><CucinaPage /></Ristorante>} />
      <Route path="/ristorante/cassa" element={<Ristorante><CassaPage /></Ristorante>} />
      <Route path="/ristorante/catalogo" element={<Ristorante><CatalogoPage /></Ristorante>} />
    </>
  )
}
