import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'

const pagina = <K extends string>(carica: () => Promise<Record<K, ComponentType>>, nome: K) =>
  lazy(() => carica().then((m) => ({ default: m[nome] })))

const operativo = () => import('@/modules/fioraio/pages/OperativoPages')
const gestione = () => import('@/modules/fioraio/pages/GestioneFioraioPages')
const NegozioPage = pagina(operativo, 'NegozioPage')
const ProduzionePage = pagina(operativo, 'ProduzionePage')
const ConsegnePage = pagina(operativo, 'ConsegnePage')
const AgendaFioraioPage = pagina(operativo, 'AgendaFioraioPage')
const OrdiniPage = pagina(() => import('@/modules/fioraio/pages/OrdiniPage'), 'OrdiniPage')
const OrdinePage = pagina(() => import('@/modules/fioraio/pages/OrdinePage'), 'OrdinePage')
const BancoPage = pagina(() => import('@/modules/fioraio/pages/BancoPage'), 'BancoPage')
const AnalisiFioraioPage = pagina(() => import('@/modules/fioraio/pages/AnalisiFioraioPage'), 'AnalisiFioraioPage')
const CatalogoFioraioPage = pagina(gestione, 'CatalogoFioraioPage')
const MagazzinoFioraioPage = pagina(gestione, 'MagazzinoFioraioPage')
const EventiFioraioPage = pagina(gestione, 'EventiFioraioPage')
const AbbonamentiFioraioPage = pagina(gestione, 'AbbonamentiFioraioPage')
const ClientiFioraioPage = pagina(gestione, 'ClientiFioraioPage')
const ImpostazioniFioraioPage = pagina(gestione, 'ImpostazioniFioraioPage')
const PersonaleFioraioPage = pagina(gestione, 'PersonaleFioraioPage')

function Fioraio({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>}>{children}</Suspense>
}

export function fioraioRoutes() {
  return (
    <>
      <Route path="/fioraio" element={<Fioraio><NegozioPage /></Fioraio>} />
      <Route path="/fioraio/ordini" element={<Fioraio><OrdiniPage /></Fioraio>} />
      <Route path="/fioraio/ordini/:id" element={<Fioraio><OrdinePage /></Fioraio>} />
      <Route path="/fioraio/produzione" element={<Fioraio><ProduzionePage /></Fioraio>} />
      <Route path="/fioraio/consegne" element={<Fioraio><ConsegnePage /></Fioraio>} />
      <Route path="/fioraio/banco" element={<Fioraio><BancoPage /></Fioraio>} />
      <Route path="/fioraio/agenda" element={<Fioraio><AgendaFioraioPage /></Fioraio>} />
      <Route path="/fioraio/catalogo" element={<Fioraio><CatalogoFioraioPage /></Fioraio>} />
      <Route path="/fioraio/magazzino" element={<Fioraio><MagazzinoFioraioPage /></Fioraio>} />
      <Route path="/fioraio/eventi" element={<Fioraio><EventiFioraioPage /></Fioraio>} />
      <Route path="/fioraio/abbonamenti" element={<Fioraio><AbbonamentiFioraioPage /></Fioraio>} />
      <Route path="/fioraio/clienti" element={<Fioraio><ClientiFioraioPage /></Fioraio>} />
      <Route path="/fioraio/personale" element={<Fioraio><PersonaleFioraioPage /></Fioraio>} />
      <Route path="/fioraio/impostazioni" element={<Fioraio><ImpostazioniFioraioPage /></Fioraio>} />
      <Route path="/fioraio/analisi" element={<Fioraio><AnalisiFioraioPage /></Fioraio>} />
    </>
  )
}
