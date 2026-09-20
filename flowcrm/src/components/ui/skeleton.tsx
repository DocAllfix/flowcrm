import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Segnaposto di caricamento, della forma del contenuto che sta arrivando.
 *
 * ── Perché esiste ───────────────────────────────────────────────────
 * 34 file mostravano uno spinner e 33 la parola «Caricamento». Zero
 * mostravano uno scheletro. Uno spinner al centro dice solo «aspetta»;
 * uno scheletro della forma giusta dice **cosa** sta per comparire, e
 * riserva lo spazio, quindi il contenuto non fa saltare la pagina quando
 * arriva.
 *
 * ── La regola della forma attesa ────────────────────────────────────
 * `DESIGN.md`: durante il caricamento si mostra la forma del dato, mai il
 * dato provvisorio. La dashboard rendeva `kpi?.organizzazioni ?? 0`, cioè
 * mostrava **0 organizzazioni** e poi saltava al numero vero: non è un
 * segnaposto, è un'informazione falsa, e l'utente la legge prima di
 * capire che lo era.
 *
 * ── Movimento ───────────────────────────────────────────────────────
 * `motion-safe:` e non `animate-pulse` secco: con il movimento ridotto il
 * segnaposto resta, smette solo di pulsare. `aria-hidden` perché è
 * decorativo — chi non vede lo schermo sente lo stato dalla regione viva
 * della pagina, non da una fila di rettangoli.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn('motion-safe:animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

/** Testata di pagina: titolo, sottotitolo, ed eventuale fascia di numeri. */
export function SkeletonTestata({ numeri = 0 }: { numeri?: number }) {
  return (
    <div className="mb-6">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      {numeri > 0 && (
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-4">
          {Array.from({ length: numeri }).map((_, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Elenco a righe dentro un riquadro (contatti, attività, allegati…). */
export function SkeletonElenco({
  righe = 5,
  altezza = 'h-14',
}: {
  righe?: number
  altezza?: string
}) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
      {Array.from({ length: righe }).map((_, i) => (
        <div key={i} className={cn('flex items-center gap-4 px-5', altezza)}>
          <Skeleton className="size-8 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-48 max-w-full" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </div>
          <Skeleton className="hidden h-5 w-20 shrink-0 rounded-full sm:block" />
        </div>
      ))}
    </div>
  )
}

/**
 * Tabella: intestazione più righe. `colonne` serve a riprodurre la stessa
 * griglia della tabella vera, altrimenti al momento del cambio le colonne
 * si spostano e si vede un salto.
 */
export function SkeletonTabella({
  righe = 6,
  colonne = 4,
}: {
  righe?: number
  colonne?: number
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex h-10 items-center gap-4 border-b border-border bg-muted/60 px-4">
        {Array.from({ length: colonne }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1 rounded-sm" />
        ))}
      </div>
      {Array.from({ length: righe }).map((_, r) => (
        <div
          key={r}
          className="flex h-11 items-center gap-4 border-b border-border px-4 last:border-0"
        >
          {Array.from({ length: colonne }).map((_, c) => (
            <Skeleton
              key={c}
              // Larghezze diverse per colonna: una griglia di rettangoli
              // tutti uguali si legge come un errore di rendering, non
              // come del contenuto in arrivo.
              className={cn('h-3 rounded-sm', c === 0 ? 'flex-[1.6]' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
