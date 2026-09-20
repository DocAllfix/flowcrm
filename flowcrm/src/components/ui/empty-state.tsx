import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Stato vuoto.
 *
 * ── Cosa è cambiato, e cosa no ──────────────────────────────────────
 * `icon`, `title`, `description` e `action` restano identiche: i 30 file
 * che la usano non vanno toccati.
 *
 * ── Perché insiste sull'azione ──────────────────────────────────────
 * `DESIGN.md`: mai un vuoto grigio, sempre un invito al passo successivo.
 * Uno stato vuoto senza azione lascia l'utente fermo proprio nel momento
 * in cui non sa cosa fare — che è l'unico momento in cui lo stato vuoto
 * viene letto. In sviluppo, chi ne scrive uno senza `action` riceve un
 * avviso in console: non blocca (per un filtro senza risultati l'azione a
 * volte non esiste davvero), ma lo fa notare.
 *
 * ── Perché `filtrato` ───────────────────────────────────────────────
 * «Nessun contatto» e «nessun contatto con questo filtro» sono due stati
 * diversi e chiedono due risposte diverse: nel primo caso si crea, nel
 * secondo si allarga la ricerca. Confonderli fa credere all'utente che i
 * suoi dati non ci siano.
 */

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  /** Vuoto perché un filtro non trova nulla, non perché manchino i dati. */
  filtrato?: boolean
  /** Più compatto, per i vuoti dentro una scheda o una colonna. */
  compatto?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  filtrato,
  compatto,
  className,
}: EmptyStateProps) {
  if (import.meta.env.DEV && !action && !filtrato) {
    console.warn(
      `[EmptyState] «${title}» non propone nessuna azione. Uno stato vuoto ` +
        `si legge proprio quando l'utente non sa cosa fare: se qui davvero ` +
        `non c'è un passo successivo, marcalo con \`filtrato\`.`,
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card text-center',
        compatto ? 'p-8' : 'p-12',
        className,
      )}
    >
      <div
        className={cn(
          'mb-4 flex items-center justify-center rounded-full bg-muted',
          compatto ? 'size-11' : 'size-14',
        )}
      >
        <Icon
          className={cn('text-muted-foreground', compatto ? 'size-5' : 'size-7')}
          aria-hidden
        />
      </div>
      <p className="text-title text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
