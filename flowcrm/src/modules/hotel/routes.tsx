import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'

const pagina = <K extends string>(carica: () => Promise<Record<K, ComponentType>>, nome: K) =>
  lazy(() => carica().then((m) => ({ default: m[nome] })))

const FrontOfficePage = pagina(() => import('@/modules/hotel/pages/FrontOfficePage'), 'FrontOfficePage')
const PlanningPage = pagina(() => import('@/modules/hotel/pages/PlanningPage'), 'PlanningPage')
const PrenotazioniPage = pagina(() => import('@/modules/hotel/pages/PrenotazioniPage'), 'PrenotazioniPage')
const PrenotazionePage = pagina(() => import('@/modules/hotel/pages/PrenotazionePage'), 'PrenotazionePage')
const CamerePage = pagina(() => import('@/modules/hotel/pages/CamerePage'), 'CamerePage')
const HousekeepingPage = pagina(() => import('@/modules/hotel/pages/HousekeepingPage'), 'HousekeepingPage')
const ServiziPage = pagina(() => import('@/modules/hotel/pages/ServiziPage'), 'ServiziPage')
const CassaHotelPage = pagina(() => import('@/modules/hotel/pages/CassaHotelPage'), 'CassaHotelPage')
const TariffePage = pagina(() => import('@/modules/hotel/pages/TariffePage'), 'TariffePage')
const GruppiPage = pagina(() => import('@/modules/hotel/pages/GruppiPage'), 'GruppiPage')
const OspitiPage = pagina(() => import('@/modules/hotel/pages/OspitiPage'), 'OspitiPage')
const AdempimentiPage = pagina(() => import('@/modules/hotel/pages/AdempimentiPage'), 'AdempimentiPage')
const AnalisiHotelPage = pagina(() => import('@/modules/hotel/pages/AnalisiHotelPage'), 'AnalisiHotelPage')
const MagazzinoHotelPage = pagina(() => import('@/modules/hotel/pages/GestioneHotelPages'), 'MagazzinoHotelPage')
const ControlliHotelPage = pagina(() => import('@/modules/hotel/pages/GestioneHotelPages'), 'ControlliHotelPage')
const PersonaleHotelPage = pagina(() => import('@/modules/hotel/pages/GestioneHotelPages'), 'PersonaleHotelPage')

const HotelRadice = lazy(() => import('@/modules/hotel/radice'))

function Hotel({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>}>
      <HotelRadice>{children}</HotelRadice>
    </Suspense>
  )
}

export function hotelRoutes() {
  return (
    <>
      <Route path="/hotel" element={<Hotel><FrontOfficePage /></Hotel>} />
      <Route path="/hotel/planning" element={<Hotel><PlanningPage /></Hotel>} />
      <Route path="/hotel/prenotazioni" element={<Hotel><PrenotazioniPage /></Hotel>} />
      <Route path="/hotel/prenotazioni/:id" element={<Hotel><PrenotazionePage /></Hotel>} />
      <Route path="/hotel/camere" element={<Hotel><CamerePage /></Hotel>} />
      <Route path="/hotel/housekeeping" element={<Hotel><HousekeepingPage /></Hotel>} />
      <Route path="/hotel/smarriti" element={<Hotel><HousekeepingPage /></Hotel>} />
      <Route path="/hotel/servizi" element={<Hotel><ServiziPage /></Hotel>} />
      <Route path="/hotel/cassa" element={<Hotel><CassaHotelPage /></Hotel>} />
      <Route path="/hotel/tariffe" element={<Hotel><TariffePage /></Hotel>} />
      <Route path="/hotel/gruppi" element={<Hotel><GruppiPage /></Hotel>} />
      <Route path="/hotel/ospiti" element={<Hotel><OspitiPage /></Hotel>} />
      <Route path="/hotel/adempimenti" element={<Hotel><AdempimentiPage /></Hotel>} />
      <Route path="/hotel/analisi" element={<Hotel><AnalisiHotelPage /></Hotel>} />
      <Route path="/hotel/magazzino" element={<Hotel><MagazzinoHotelPage /></Hotel>} />
      <Route path="/hotel/controlli" element={<Hotel><ControlliHotelPage /></Hotel>} />
      <Route path="/hotel/personale" element={<Hotel><PersonaleHotelPage /></Hotel>} />
    </>
  )
}
