import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Barra di avanzamento.
 *
 * ── Perché scritta a mano e non presa da Radix ──────────────────────
 * `@radix-ui/react-progress` non è fra le dipendenze, e questo componente
 * è dodici righe: aggiungere un pacchetto per averlo costerebbe più di
 * quanto renda. Gli attributi ARIA sono gli stessi che metterebbe Radix.
 *
 * ── Il movimento è funzionale, quindi resta ─────────────────────────
 * La transizione sulla larghezza è avvolta in `motion-safe:`: con il
 * movimento ridotto il valore salta al punto giusto invece di scorrerci.
 * La barra però **non sparisce** — `DESIGN.md` dice che con il movimento
 * ridotto restano gli indicatori di stato, spariscono le traslazioni.
 *
 * Qui si anima `transform` e non `width`: la larghezza è una proprietà di
 * disposizione, e animarla obbliga il browser a ricalcolare il layout a
 * ogni fotogramma.
 */

interface ProgressProps extends React.ComponentProps<'div'> {
  /** Da 0 a `max`. Valori fuori scala vengono riportati dentro. */
  value: number
  max?: number
  /** Cosa misura la barra, per chi non la vede. */
  etichetta: string
  /** Colore del riempimento; per difetto l'accento dell'istanza. */
  tono?: 'primary' | 'success' | 'warning' | 'destructive'
}

const TONI = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
} as const

export function Progress({
  value,
  max = 100,
  etichetta,
  tono = 'primary',
  className,
  ...props
}: ProgressProps) {
  const quota = Math.min(1, Math.max(0, max === 0 ? 0 : value / max))

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={etichetta}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-muted',
        className,
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn(
          'size-full origin-left motion-safe:transition-transform',
          TONI[tono],
        )}
        style={{ transform: `scaleX(${quota})` }}
      />
    </div>
  )
}
