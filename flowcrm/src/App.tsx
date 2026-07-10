import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DashboardEconomicaPage } from '@/pages/DashboardEconomicaPage'
import { ProfiloPage } from '@/pages/ProfiloPage'
import { UtentiPage } from '@/pages/admin/UtentiPage'
import { OrganizzazioniPage } from '@/pages/OrganizzazioniPage'
import { OrganizzazioneDettaglioPage } from '@/pages/OrganizzazioneDettaglioPage'
import { ContattiPage } from '@/pages/ContattiPage'
import { ContattoDettaglioPage } from '@/pages/ContattoDettaglioPage'
import { ImportaPage } from '@/pages/ImportaPage'
import { KanbanPage } from '@/pages/KanbanPage'
import { DealListPage } from '@/pages/DealListPage'
import { DealDettaglioPage } from '@/pages/DealDettaglioPage'
import { AttivitaPage } from '@/pages/AttivitaPage'
import { RiunioniPage } from '@/pages/RiunioniPage'
import { TeamPage } from '@/pages/TeamPage'
import { ProgettiPage } from '@/pages/ProgettiPage'
import { ProgettoDettaglioPage } from '@/pages/ProgettoDettaglioPage'
import { CommessePage } from '@/pages/CommessePage'
import { CommessaDettaglioPage } from '@/pages/CommessaDettaglioPage'
import { FatturePage } from '@/pages/FatturePage'
import { FatturaDettaglioPage } from '@/pages/FatturaDettaglioPage'
import { IncassiPage } from '@/pages/IncassiPage'
import { TassePage } from '@/pages/TassePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ManagerOnly } from '@/components/ManagerOnly'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard-economica" element={<ManagerOnly><DashboardEconomicaPage /></ManagerOnly>} />
          <Route path="/organizzazioni" element={<OrganizzazioniPage />} />
          <Route path="/organizzazioni/:id" element={<OrganizzazioneDettaglioPage />} />
          <Route path="/contatti" element={<ContattiPage />} />
          <Route path="/contatti/:id" element={<ContattoDettaglioPage />} />
          <Route path="/importa" element={<ImportaPage />} />
          <Route path="/deal" element={<DealListPage />} />
          <Route path="/deal/:id" element={<DealDettaglioPage />} />
          <Route path="/kanban" element={<KanbanPage />} />
          <Route path="/attivita" element={<AttivitaPage />} />
          <Route path="/riunioni" element={<RiunioniPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/progetti" element={<ProgettiPage />} />
          <Route path="/progetti/:id" element={<ProgettoDettaglioPage />} />
          <Route path="/commesse" element={<CommessePage />} />
          <Route path="/commesse/:id" element={<CommessaDettaglioPage />} />
          <Route path="/fatture" element={<ManagerOnly><FatturePage /></ManagerOnly>} />
          <Route path="/fatture/:id" element={<ManagerOnly><FatturaDettaglioPage /></ManagerOnly>} />
          <Route path="/incassi" element={<ManagerOnly><IncassiPage /></ManagerOnly>} />
          <Route path="/tasse" element={<ManagerOnly><TassePage /></ManagerOnly>} />
          <Route path="/profilo" element={<ProfiloPage />} />
          <Route path="/utenti" element={<UtentiPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
