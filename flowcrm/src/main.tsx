import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import { APP_CONFIG } from '@/config/app.config'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import App from './App'
import './index.css'
import './lib/onboarding/driver-overrides.css'

// ── Sentry — opzionale per istanza, con redazione dati sensibili ──
// (pattern CertDesk: privacy-by-design, mai header auth né password)
if (APP_CONFIG.sentryDsn) {
  Sentry.init({
    dsn: APP_CONFIG.sentryDsn,
    environment: import.meta.env.MODE,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['Cookie']
      }
      return event
    },
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider delayDuration={200}>
          <App />
        </TooltipProvider>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
