import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'

const pagina = <K extends string>(carica: () => Promise<Record<K, ComponentType>>, nome: K) =>
  lazy(() => carica().then((m) => ({ default: m[nome] })))

const ReceptionPage = pagina(() => import('@/modules/palestra/pages/ReceptionPage'), 'ReceptionPage')
const SociPage = pagina(() => import('@/modules/palestra/pages/SociPage'), 'SociPage')
const SocioPage = pagina(() => import('@/modules/palestra/pages/SocioPage'), 'SocioPage')
const CorsiPage = pagina(() => import('@/modules/palestra/pages/CorsiPage'), 'CorsiPage')
const AgendaPage = pagina(() => import('@/modules/palestra/pages/AgendaPage'), 'AgendaPage')
const IncassiPage = pagina(() => import('@/modules/palestra/pages/IncassiPage'), 'IncassiPage')
const ProspectPage = pagina(() => import('@/modules/palestra/pages/ProspectPage'), 'ProspectPage')
const ListiniPage = pagina(() => import('@/modules/palestra/pages/ListiniPage'), 'ListiniPage')
const AnalisiPalestraPage = pagina(() => import('@/modules/palestra/pages/AnalisiPalestraPage'), 'AnalisiPalestraPage')
const gestione = () => import('@/modules/palestra/pages/GestionePalestraPages')
const PersonalePalestraPage = pagina(gestione, 'PersonalePalestraPage')
const SpogliatoiPage = pagina(gestione, 'SpogliatoiPage')
const MagazzinoPalestraPage = pagina(gestione, 'MagazzinoPalestraPage')
const AttrezzaturePalestraPage = pagina(gestione, 'AttrezzaturePalestraPage')
const EventiPalestraPage = pagina(gestione, 'EventiPalestraPage')
const ClientiPalestraPage = pagina(gestione, 'ClientiPalestraPage')

const PalestraRadice = lazy(() => import('@/modules/palestra/radice'))

function Palestra({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>}>
      <PalestraRadice>{children}</PalestraRadice>
    </Suspense>
  )
}

export function palestraRoutes() {
  return (
    <>
      <Route path="/palestra" element={<Palestra><ReceptionPage /></Palestra>} />
      <Route path="/palestra/soci" element={<Palestra><SociPage /></Palestra>} />
      <Route path="/palestra/soci/:id" element={<Palestra><SocioPage /></Palestra>} />
      <Route path="/palestra/corsi" element={<Palestra><CorsiPage /></Palestra>} />
      <Route path="/palestra/agenda" element={<Palestra><AgendaPage /></Palestra>} />
      <Route path="/palestra/incassi" element={<Palestra><IncassiPage /></Palestra>} />
      <Route path="/palestra/prospect" element={<Palestra><ProspectPage /></Palestra>} />
      <Route path="/palestra/listini" element={<Palestra><ListiniPage /></Palestra>} />
      <Route path="/palestra/personale" element={<Palestra><PersonalePalestraPage /></Palestra>} />
      <Route path="/palestra/spogliatoi" element={<Palestra><SpogliatoiPage /></Palestra>} />
      <Route path="/palestra/magazzino" element={<Palestra><MagazzinoPalestraPage /></Palestra>} />
      <Route path="/palestra/attrezzature" element={<Palestra><AttrezzaturePalestraPage /></Palestra>} />
      <Route path="/palestra/eventi" element={<Palestra><EventiPalestraPage /></Palestra>} />
      <Route path="/palestra/clienti" element={<Palestra><ClientiPalestraPage /></Palestra>} />
      <Route path="/palestra/analisi" element={<Palestra><AnalisiPalestraPage /></Palestra>} />
    </>
  )
}
