import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Superficie sollevata.
 *
 * ── Perché esiste ───────────────────────────────────────────────────
 * Lo stesso markup (`rounded-xl border border-border bg-card shadow-sm`)
 * era ripetuto **95 volte in 59 file**. Ogni ripetizione è un punto in
 * cui il raggio, il bordo o l'ombra possono divergere per una svista di
 * copia, e nessun compilatore se ne accorge.
 *
 * ── Piatta a riposo ─────────────────────────────────────────────────
 * `DESIGN.md` — *La regola del piatto a riposo*: una card che nessuno ha
 * toccato non ha ombra. A separarla dal fondo basta il filo da 1px più il
 * gradino di chiarezza fra `background` e `card`, che funziona allo
 * stesso modo nei due temi. L'ombra compare solo come **risposta**: con
 * `interattiva`, e solo al passaggio del puntatore.
 */

interface CardProps extends React.ComponentProps<'div'> {
  /** La card è cliccabile: acquista l'ombra di risposta al passaggio. */
  interattiva?: boolean
}

function Card({ className, interattiva, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground',
        interattiva &&
          'cursor-pointer transition-[box-shadow,border-color] hover:border-input hover:shadow-risposta',
        className,
      )}
      {...props}
    />
  )
}

/** Intestazione: titolo a sinistra, azioni a destra. */
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex items-start justify-between gap-4 px-5 pt-5 pb-3',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="card-title"
      className={cn('text-title text-foreground', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn('mt-1 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-5 pb-5', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center gap-2 border-t border-border px-5 py-3',
        className,
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
