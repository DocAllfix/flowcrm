import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { Route } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'

const pagina = <K extends string>(carica: () => Promise<Record<K, ComponentType>>, nome: K) =>
  lazy(() => carica().then((m) => ({ default: m[nome] })))

const immobili = () => import('@/modules/immobiliare/pages/ImmobiliPages')
const clienti = () => import('@/modules/immobiliare/pages/ClientiPages')
const commerciale = () => import('@/modules/immobiliare/pages/CommercialePages')
const gestione = () => import('@/modules/immobiliare/pages/GestionePages')
const CruscottoImmobiliarePage = pagina(commerciale, 'CruscottoImmobiliarePage')
const ImmobiliPage = pagina(immobili, 'ImmobiliPage')
const ImmobilePage = pagina(immobili, 'ImmobilePage')
const RichiestePage = pagina(clienti, 'RichiestePage')
const RichiestaPage = pagina(clienti, 'RichiestaPage')
const LeadPage = pagina(clienti, 'LeadPage')
const ProprietariPage = pagina(clienti, 'ProprietariPage')
const VisitePage = pagina(commerciale, 'VisitePage')
const TrattativePage = pagina(commerciale, 'TrattativePage')
const LocazioniPage = pagina(commerciale, 'LocazioniPage')
const AgendaImmobiliarePage = pagina(commerciale, 'AgendaImmobiliarePage')
const ProvvigioniPage = pagina(gestione, 'ProvvigioniPage')
const ContrattiImmobiliarePage = pagina(gestione, 'ContrattiImmobiliarePage')
const AgentiPage = pagina(gestione, 'AgentiPage')
const MarketingPage = pagina(gestione, 'MarketingPage')
const CompliancePage = pagina(gestione, 'CompliancePage')
const ImpostazioniImmobiliarePage = pagina(gestione, 'ImpostazioniImmobiliarePage')
const AnalisiImmobiliarePage = pagina(gestione, 'AnalisiImmobiliarePage')

function Immobiliare({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>}>{children}</Suspense>
}

export function immobiliareRoutes() {
  return (
    <>
      <Route path="/immobiliare" element={<Immobiliare><CruscottoImmobiliarePage /></Immobiliare>} />
      <Route path="/immobiliare/immobili" element={<Immobiliare><ImmobiliPage /></Immobiliare>} />
      <Route path="/immobiliare/immobili/:id" element={<Immobiliare><ImmobilePage /></Immobiliare>} />
      <Route path="/immobiliare/richieste" element={<Immobiliare><RichiestePage /></Immobiliare>} />
      <Route path="/immobiliare/richieste/:id" element={<Immobiliare><RichiestaPage /></Immobiliare>} />
      <Route path="/immobiliare/lead" element={<Immobiliare><LeadPage /></Immobiliare>} />
      <Route path="/immobiliare/visite" element={<Immobiliare><VisitePage /></Immobiliare>} />
      <Route path="/immobiliare/trattative" element={<Immobiliare><TrattativePage /></Immobiliare>} />
      <Route path="/immobiliare/locazioni" element={<Immobiliare><LocazioniPage /></Immobiliare>} />
      <Route path="/immobiliare/agenda" element={<Immobiliare><AgendaImmobiliarePage /></Immobiliare>} />
      <Route path="/immobiliare/proprietari" element={<Immobiliare><ProprietariPage /></Immobiliare>} />
      <Route path="/immobiliare/contratti" element={<Immobiliare><ContrattiImmobiliarePage /></Immobiliare>} />
      <Route path="/immobiliare/provvigioni" element={<Immobiliare><ProvvigioniPage /></Immobiliare>} />
      <Route path="/immobiliare/agenti" element={<Immobiliare><AgentiPage /></Immobiliare>} />
      <Route path="/immobiliare/marketing" element={<Immobiliare><MarketingPage /></Immobiliare>} />
      <Route path="/immobiliare/compliance" element={<Immobiliare><CompliancePage /></Immobiliare>} />
      <Route path="/immobiliare/impostazioni" element={<Immobiliare><ImpostazioniImmobiliarePage /></Immobiliare>} />
      <Route path="/immobiliare/analisi" element={<Immobiliare><AnalisiImmobiliarePage /></Immobiliare>} />
    </>
  )
}
