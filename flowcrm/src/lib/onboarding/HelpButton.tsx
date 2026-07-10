import { HelpCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { APP_CONFIG } from '@/config/app.config'
import { findTour, restartTour } from './tour-registry'

/**
 * HelpButton — "?" nell'header per riavviare il tour della pagina corrente.
 * Appare solo dove esiste un tour registrato (niente rumore su /login ecc.).
 * Gated da VITE_TOUR_ENABLED.
 */
export function HelpButton() {
  const { pathname } = useLocation()
  const entry = findTour(pathname)
  if (!APP_CONFIG.tourEnabled || !entry) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => restartTour(pathname)}
          aria-label="Riavvia il tour di questa pagina"
          data-testid="help-button"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Rivedi il tour: {entry.label}</TooltipContent>
    </Tooltip>
  )
}
