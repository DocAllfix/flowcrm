import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'

const pagina = <K extends string>(carica: () => Promise<Record<K, ComponentType>>, nome: K) =>
  lazy(() => carica().then((m) => ({ default: m[nome] })))

// Le pagine del servizio sono quelle del motore fb_, condiviso col Ristorante.
const CruscottoPage = pagina(() => import('@/modules/fb/pages/CruscottoPage'), 'CruscottoPage')
const SalaPage = pagina(() => import('@/modules/fb/pages/SalaPage'), 'SalaPage')
const PrenotazioniPage = pagina(() => import('@/modules/fb/pages/PrenotazioniPage'), 'PrenotazioniPage')
const ComandePage = pagina(() => import('@/modules/fb/pages/ComandePage'), 'ComandePage')
const ComandaPage = pagina(() => import('@/modules/fb/pages/ComandaPage'), 'ComandaPage')
const CucinaPage = pagina(() => import('@/modules/fb/pages/CucinaPage'), 'CucinaPage')
const CassaPage = pagina(() => import('@/modules/fb/pages/CassaPage'), 'CassaPage')
const CatalogoPage = pagina(() => import('@/modules/fb/pages/CatalogoPage'), 'CatalogoPage')
const ClientiPage = pagina(() => import('@/modules/fb/pages/ClientiPage'), 'ClientiPage')
const AnalisiPage = pagina(() => import('@/modules/fb/pages/AnalisiPage'), 'AnalisiPage')
const MagazzinoFbPage = pagina(() => import('@/modules/fb/pages/GestionePages'), 'MagazzinoFbPage')
const ControlliFbPage = pagina(() => import('@/modules/fb/pages/GestionePages'), 'ControlliFbPage')
const PersonaleFbPage = pagina(() => import('@/modules/fb/pages/GestionePages'), 'PersonaleFbPage')
const EventiFbPage = pagina(() => import('@/modules/fb/pages/GestionePages'), 'EventiFbPage')
// Solo del Bar.
const MescitaPage = pagina(() => import('@/modules/bar/pages/MescitaPage'), 'MescitaPage')
const ConvenzioniPage = pagina(() => import('@/modules/bar/pages/ConvenzioniPage'), 'ConvenzioniPage')

const FbRadice = lazy(() => import('@/modules/fb/radice'))

function Bar({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>}>
      <FbRadice modulo="bar">{children}</FbRadice>
    </Suspense>
  )
}

export function barRoutes() {
  return (
    <>
      <Route path="/bar" element={<Bar><CruscottoPage /></Bar>} />
      <Route path="/bar/banco" element={<Bar><CucinaPage /></Bar>} />
      <Route path="/bar/comande" element={<Bar><ComandePage /></Bar>} />
      <Route path="/bar/comande/:id" element={<Bar><ComandaPage /></Bar>} />
      <Route path="/bar/sala" element={<Bar><SalaPage /></Bar>} />
      <Route path="/bar/prenotazioni" element={<Bar><PrenotazioniPage /></Bar>} />
      <Route path="/bar/cassa" element={<Bar><CassaPage /></Bar>} />
      <Route path="/bar/catalogo" element={<Bar><CatalogoPage /></Bar>} />
      <Route path="/bar/mescita" element={<Bar><MescitaPage /></Bar>} />
      <Route path="/bar/convenzioni" element={<Bar><ConvenzioniPage /></Bar>} />
      <Route path="/bar/magazzino" element={<Bar><MagazzinoFbPage /></Bar>} />
      <Route path="/bar/controlli" element={<Bar><ControlliFbPage /></Bar>} />
      <Route path="/bar/personale" element={<Bar><PersonaleFbPage /></Bar>} />
      <Route path="/bar/eventi" element={<Bar><EventiFbPage /></Bar>} />
      <Route path="/bar/clienti" element={<Bar><ClientiPage /></Bar>} />
      <Route path="/bar/analisi" element={<Bar><AnalisiPage /></Bar>} />
    </>
  )
}
