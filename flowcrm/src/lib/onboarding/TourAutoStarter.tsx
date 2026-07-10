import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { APP_CONFIG } from '@/config/app.config'
import { maybeStartTour } from './tour-registry'

/**
 * Avvia automaticamente il tour della pagina al primo accesso (se non già
 * completato). Gated da VITE_TOUR_ENABLED. Va montato dentro l'AppLayout.
 */
export function TourAutoStarter() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (APP_CONFIG.tourEnabled) maybeStartTour(pathname)
  }, [pathname])
  return null
}
