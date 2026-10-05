import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'

const pagina = <K extends string>(carica: () => Promise<Record<K, ComponentType>>, nome: K) =>
  lazy(() => carica().then((m) => ({ default: m[nome] })))

const operativo = () => import('@/modules/garage/pages/OperativoPages')
const clienti = () => import('@/modules/garage/pages/ClientiPages')
const contratti = () => import('@/modules/garage/pages/ContrattiPages')
const servizi = () => import('@/modules/garage/pages/ServiziPages')
const gestione = () => import('@/modules/garage/pages/GestioneGaragePages')
const CruscottoGaragePage = pagina(operativo, 'CruscottoGaragePage')
const MovimentiPage = pagina(operativo, 'MovimentiPage')
const MappaPostiPage = pagina(operativo, 'MappaPostiPage')
const PrenotazioniGaragePage = pagina(operativo, 'PrenotazioniGaragePage')
const ClientiGaragePage = pagina(clienti, 'ClientiGaragePage')
const ClienteGaragePage = pagina(clienti, 'ClienteGaragePage')
const ContrattiGaragePage = pagina(contratti, 'ContrattiGaragePage')
const ConvenzioniGaragePage = pagina(contratti, 'ConvenzioniGaragePage')
const IncassiGaragePage = pagina(contratti, 'IncassiGaragePage')
const ChiaviPage = pagina(servizi, 'ChiaviPage')
const DanniPage = pagina(servizi, 'DanniPage')
const RicarichePage = pagina(servizi, 'RicarichePage')
const ServiziGaragePage = lazy(() => servizi().then((m) => ({ default: m.ServiziGaragePage })))
const ImpostazioniGaragePage = pagina(gestione, 'ImpostazioniGaragePage')
const ImpiantiGaragePage = pagina(gestione, 'ImpiantiGaragePage')
const PersonaleGaragePage = pagina(gestione, 'PersonaleGaragePage')
const CampagneGaragePage = pagina(gestione, 'CampagneGaragePage')
const AnalisiGaragePage = pagina(() => import('@/modules/garage/pages/AnalisiGaragePage'), 'AnalisiGaragePage')

const GarageRadice = lazy(() => import('@/modules/garage/radice'))

function Garage({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>}>
      <GarageRadice>{children}</GarageRadice>
    </Suspense>
  )
}

export function garageRoutes() {
  return (
    <>
      <Route path="/garage" element={<Garage><CruscottoGaragePage /></Garage>} />
      <Route path="/garage/movimenti" element={<Garage><MovimentiPage /></Garage>} />
      <Route path="/garage/posti" element={<Garage><MappaPostiPage /></Garage>} />
      <Route path="/garage/prenotazioni" element={<Garage><PrenotazioniGaragePage /></Garage>} />
      <Route path="/garage/incassi" element={<Garage><IncassiGaragePage /></Garage>} />
      <Route path="/garage/chiavi" element={<Garage><ChiaviPage /></Garage>} />
      <Route path="/garage/danni" element={<Garage><DanniPage /></Garage>} />
      <Route path="/garage/ricariche" element={<Garage><RicarichePage /></Garage>} />
      <Route path="/garage/servizi" element={<Garage><ServiziGaragePage /></Garage>} />
      <Route path="/garage/pneumatici" element={<Garage><ServiziGaragePage scheda="pneumatici" /></Garage>} />
      <Route path="/garage/clienti" element={<Garage><ClientiGaragePage /></Garage>} />
      <Route path="/garage/clienti/:id" element={<Garage><ClienteGaragePage /></Garage>} />
      <Route path="/garage/contratti" element={<Garage><ContrattiGaragePage /></Garage>} />
      <Route path="/garage/convenzioni" element={<Garage><ConvenzioniGaragePage /></Garage>} />
      <Route path="/garage/impianti" element={<Garage><ImpiantiGaragePage /></Garage>} />
      <Route path="/garage/personale" element={<Garage><PersonaleGaragePage /></Garage>} />
      <Route path="/garage/campagne" element={<Garage><CampagneGaragePage /></Garage>} />
      <Route path="/garage/impostazioni" element={<Garage><ImpostazioniGaragePage /></Garage>} />
      <Route path="/garage/analisi" element={<Garage><AnalisiGaragePage /></Garage>} />
    </>
  )
}
