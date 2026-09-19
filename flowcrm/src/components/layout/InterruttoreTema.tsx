import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * Interruttore del tema.
 *
 * Il tema scuro era interamente scritto — una cinquantina di token in
 * `index.css` — e **irraggiungibile**: nessun comando lo attivava, e si
 * accendeva da solo seguendo il sistema operativo senza che si potesse
 * spegnerlo. Questo bottone è la metà mancante.
 *
 * L'icona mostra **dove si va**, non dove si è: una luna significa «passa
 * allo scuro». È la convenzione che gli utenti si aspettano, e l'etichetta
 * lo dice comunque a parole per chi non vede l'icona.
 */
export function InterruttoreTema() {
  const { isDark, alterna } = useTheme()
  const etichetta = isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={alterna}
          aria-label={etichetta}
          className="tocco-comodo text-muted-foreground"
        >
          {isDark ? (
            <Sun className="size-4" aria-hidden />
          ) : (
            <Moon className="size-4" aria-hidden />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{etichetta}</TooltipContent>
    </Tooltip>
  )
}
