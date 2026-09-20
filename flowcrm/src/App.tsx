import { Fragment, Suspense, lazy } from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { moduliAttivi } from '@/config/moduli.config'
import { AppLayout } from '@/components/layout/AppLayout'
import { ManagerOnly } from '@/components/ManagerOnly'
import { AttesaCentrata } from '@/components/ui/spinner'

// Le pagine di accesso restano STATICHE: sono le prime che si aprono, e
// caricarle in un secondo momento aggiungerebbe un'attesa proprio dove
// l'utente non ha ancora visto niente.
import { LoginPage } from '@/pages/auth/LoginPage'
import { RecuperoPasswordPage } from '@/pages/auth/RecuperoPasswordPage'
import { NuovaPasswordPage } from '@/pages/auth/NuovaPasswordPage'

/**
 * ── Perché le pagine interne sono pigre ─────────────────────────────
 * Erano tutte e 26 importate staticamente. Conseguenza misurata in
 * browser sulla build di produzione: per mostrare la sola **schermata di
 * accesso** il browser scaricava **1.829 kB di JavaScript in 49 file**,
 * perché da quelle pagine entrano recharts (i grafici), react-big-calendar
 * (il calendario) e @hello-pangea/dnd (il Kanban). Cioè chi deve solo
 * digitare la password scaricava l'intero prodotto.
 *
 * I cinque moduli verticali erano già pigri; queste no. Ora lo sono, e
 * ogni pagina arriva quando la si apre.
 *
 * Il ripiego di `Suspense` è l'attesa centrata e non una pagina bianca:
 * fra il clic e la pagina deve succedere qualcosa, altrimenti il prodotto
 * si legge come lento anche quando la richiesta è veloce.
 */
const pagina = <T extends Record<string, React.ComponentType>>(
  carica: () => Promise<T>,
  nome: keyof T,
) => lazy(() => carica().then((m) => ({ default: m[nome] })))

const DashboardPage = pagina(() => import('@/pages/DashboardPage'), 'DashboardPage')
const DashboardEconomicaPage = pagina(() => import('@/pages/DashboardEconomicaPage'), 'DashboardEconomicaPage')
const ProfiloPage = pagina(() => import('@/pages/ProfiloPage'), 'ProfiloPage')
const UtentiPage = pagina(() => import('@/pages/admin/UtentiPage'), 'UtentiPage')
const OrganizzazioniPage = pagina(() => import('@/pages/OrganizzazioniPage'), 'OrganizzazioniPage')
const OrganizzazioneDettaglioPage = pagina(() => import('@/pages/OrganizzazioneDettaglioPage'), 'OrganizzazioneDettaglioPage')
const ContattiPage = pagina(() => import('@/pages/ContattiPage'), 'ContattiPage')
const ContattoDettaglioPage = pagina(() => import('@/pages/ContattoDettaglioPage'), 'ContattoDettaglioPage')
const ImportaPage = pagina(() => import('@/pages/ImportaPage'), 'ImportaPage')
const KanbanPage = pagina(() => import('@/pages/KanbanPage'), 'KanbanPage')
const DealListPage = pagina(() => import('@/pages/DealListPage'), 'DealListPage')
const DealDettaglioPage = pagina(() => import('@/pages/DealDettaglioPage'), 'DealDettaglioPage')
const AttivitaPage = pagina(() => import('@/pages/AttivitaPage'), 'AttivitaPage')
const RiunioniPage = pagina(() => import('@/pages/RiunioniPage'), 'RiunioniPage')
const CalendarioPage = pagina(() => import('@/pages/CalendarioPage'), 'CalendarioPage')
const TeamPage = pagina(() => import('@/pages/TeamPage'), 'TeamPage')
const ProgettiPage = pagina(() => import('@/pages/ProgettiPage'), 'ProgettiPage')
const ProgettoDettaglioPage = pagina(() => import('@/pages/ProgettoDettaglioPage'), 'ProgettoDettaglioPage')
const CommessePage = pagina(() => import('@/pages/CommessePage'), 'CommessePage')
const CommessaDettaglioPage = pagina(() => import('@/pages/CommessaDettaglioPage'), 'CommessaDettaglioPage')
const FatturePage = pagina(() => import('@/pages/FatturePage'), 'FatturePage')
const FatturaDettaglioPage = pagina(() => import('@/pages/FatturaDettaglioPage'), 'FatturaDettaglioPage')
const IncassiPage = pagina(() => import('@/pages/IncassiPage'), 'IncassiPage')
const TassePage = pagina(() => import('@/pages/TassePage'), 'TassePage')
const HRPage = pagina(() => import('@/pages/HRPage'), 'HRPage')
const DipendenteDettaglioPage = pagina(() => import('@/pages/DipendenteDettaglioPage'), 'DipendenteDettaglioPage')
const NotFoundPage = pagina(() => import('@/pages/NotFoundPage'), 'NotFoundPage')

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Pubbliche: chi ha dimenticato la password non ha una sessione.
            /auth/recupero è l'indirizzo su cui GoTrue rimanda dopo aver
            verificato il token del messaggio (MAILER_URLPATHS_RECOVERY). */}
        <Route path="/recupero" element={<RecuperoPasswordPage />} />
        <Route path="/auth/recupero" element={<NuovaPasswordPage />} />
        <Route element={<AppLayout />}>
          {/* Un solo Suspense attorno a tutte le rotte interne: la shell
              (barra laterale e intestazione) resta in piedi mentre la
              pagina arriva, quindi non si vede lampeggiare l'impalcatura. */}
          <Route
            element={
              <Suspense fallback={<AttesaCentrata className="py-24" />}>
                <Outlet />
              </Suspense>
            }
          >
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
            <Route path="/calendario" element={<CalendarioPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/progetti" element={<ProgettiPage />} />
            <Route path="/progetti/:id" element={<ProgettoDettaglioPage />} />
            <Route path="/commesse" element={<CommessePage />} />
            <Route path="/commesse/:id" element={<CommessaDettaglioPage />} />
            <Route path="/fatture" element={<ManagerOnly><FatturePage /></ManagerOnly>} />
            <Route path="/fatture/:id" element={<ManagerOnly><FatturaDettaglioPage /></ManagerOnly>} />
            <Route path="/incassi" element={<ManagerOnly><IncassiPage /></ManagerOnly>} />
            <Route path="/tasse" element={<ManagerOnly><TassePage /></ManagerOnly>} />
            <Route path="/personale" element={<ManagerOnly><HRPage /></ManagerOnly>} />
            <Route path="/personale/:id" element={<ManagerOnly><DipendenteDettaglioPage /></ManagerOnly>} />
            <Route path="/profilo" element={<ProfiloPage />} />
            <Route path="/utenti" element={<UtentiPage />} />
            {/* Route dei moduli verticali attivi (VITE_MODULES); un modulo
                spento non monta nulla → i suoi percorsi cadono nel 404. */}
            {moduliAttivi().map((m) => (
              <Fragment key={m.slug}>{m.routes()}</Fragment>
            ))}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
