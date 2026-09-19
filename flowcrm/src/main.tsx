import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { APP_CONFIG, caricaConfigurazione } from '@/config/app.config'
import { applicaTemaCliente, applicaIdentitaCliente } from '@/lib/tema'
import { inizializzaTelemetria } from '@/lib/telemetria'
// Import STATICO e volutamente in cima: è ciò che rende `window.__supabase`
// disponibile appena la pagina carica, invece che dopo gli `await` qui sotto.
// I test end-to-end lo usano subito dopo una navigazione, e con l'esposizione
// tardiva lo trovavano `undefined`. Non crea nulla: il client dentro è pigro.
import '@/lib/supabase'
import './index.css'
import './lib/onboarding/driver-overrides.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

/**
 * Schermata di errore per i guasti che avvengono PRIMA che React esista
 * (configurazione mancante o malformata). L'ErrorBoundary non può coprirli:
 * a quel punto non c'è ancora un albero da proteggere. Senza questa, una
 * configurazione sbagliata darebbe una pagina bianca muta proprio nel
 * momento in cui si sta installando l'istanza di un cliente nuovo.
 */
function mostraErroreAvvio(messaggio: string): void {
  const root = document.getElementById('root')
  if (!root) return
  const pre = document.createElement('pre')
  pre.style.cssText =
    'margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'padding:24px;font-family:ui-monospace,monospace;font-size:14px;line-height:1.6;' +
    'white-space:pre-wrap;background:#fef2f2;color:#7f1d1d;text-align:left'
  pre.textContent = `Avvio interrotto\n\n${messaggio}`
  root.replaceChildren(pre)
}

async function avvia(): Promise<void> {
  // 1. Configurazione dell'istanza: deve arrivare prima di tutto il resto.
  await caricaConfigurazione()

  // 2. Aspetto dell'istanza: colori derivati dai due del cliente, titolo
  //    della scheda e favicon. Va qui e non dentro React: applicato dopo il
  //    primo render si vedrebbe un lampo con i colori del prodotto al posto
  //    di quelli del cliente, proprio nella schermata di accesso.
  applicaTemaCliente(APP_CONFIG)
  applicaIdentitaCliente(APP_CONFIG)

  // 3. Telemetria (spenta se il DSN è vuoto), che legge la configurazione.
  inizializzaTelemetria()

  // 4. L'applicazione. Il client Supabase si crea al primo uso (proxy pigro
  //    in src/lib/supabase.ts), quindi l'ordine di import non è più critico:
  //    conta solo che la configurazione sia caricata prima delle query.
  const { default: App } = await import('./App')

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TooltipProvider delayDuration={200}>
              <App />
            </TooltipProvider>
            <Toaster />
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
}

avvia().catch((errore: unknown) => {
  mostraErroreAvvio(errore instanceof Error ? errore.message : String(errore))
})
