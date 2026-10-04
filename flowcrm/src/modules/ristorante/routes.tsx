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
const CantinaPage = pagina(() => import('@/modules/fb/pages/CantinaPage'), 'CantinaPage')
const ClientiPage = pagina(() => import('@/modules/fb/pages/ClientiPage'), 'ClientiPage')
const AnalisiPage = pagina(() => import('@/modules/fb/pages/AnalisiPage'), 'AnalisiPage')
const MagazzinoFbPage = pagina(() => import('@/modules/fb/pages/GestionePages'), 'MagazzinoFbPage')
const ControlliFbPage = pagina(() => import('@/modules/fb/pages/GestionePages'), 'ControlliFbPage')
const PersonaleFbPage = pagina(() => import('@/modules/fb/pages/GestionePages'), 'PersonaleFbPage')
const EventiFbPage = pagina(() => import('@/modules/fb/pages/GestionePages'), 'EventiFbPage')

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
      <Route path="/ristorante/cantina" element={<Ristorante><CantinaPage /></Ristorante>} />
      <Route path="/ristorante/magazzino" element={<Ristorante><MagazzinoFbPage /></Ristorante>} />
      <Route path="/ristorante/controlli" element={<Ristorante><ControlliFbPage /></Ristorante>} />
      <Route path="/ristorante/personale" element={<Ristorante><PersonaleFbPage /></Ristorante>} />
      <Route path="/ristorante/eventi" element={<Ristorante><EventiFbPage /></Ristorante>} />
      <Route path="/ristorante/clienti" element={<Ristorante><ClientiPage /></Ristorante>} />
      <Route path="/ristorante/analisi" element={<Ristorante><AnalisiPage /></Ristorante>} />
    </>
  )
}
