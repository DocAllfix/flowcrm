import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Tabella densa: il componente più importante di questo prodotto, perché
 * quindici pagine ne vivono.
 *
 * ── Perché esiste ───────────────────────────────────────────────────
 * Quelle quindici tabelle erano scritte a mano, con la stessa stringa di
 * classi ricopiata su ogni `<th>` di ogni colonna. Bastava una copia
 * distratta perché una colonna avesse un padding diverso dalle altre.
 *
 * ── Le righe navigabili da tastiera ─────────────────────────────────
 * 28 file avevano righe che il mouse apriva e la tastiera no: nessun
 * `tabIndex`, nessun `onKeyDown`. Metà interfaccia. `TableRow` con
 * `onActivate` aggiunge Tab, Invio e Spazio, e pretende un'etichetta.
 *
 * Nota onesta sul compromesso: la soluzione perfetta sarebbe un vero
 * `<a>` dentro la prima cella, esteso sulla riga. Su `<tr>` il
 * posizionamento assoluto non è affidabile in tutti i motori, quindi qui
 * si tiene la semantica di riga e si aggiunge l'attivazione da tastiera —
 * che è ciò che fanno quasi tutte le tabelle di prodotto, ed è comunque
 * una riga intera in più rispetto a oggi, dove non se ne raggiungeva
 * nessuna.
 */

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    // Il contenitore che scorre sta QUI e non nelle pagine: una tabella
    // larga dentro una pagina senza `overflow-x` allarga l'intero corpo e
    // fa comparire lo scorrimento orizzontale su tutto il sito.
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-data', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('bg-muted/60 [&_tr]:border-b [&_tr]:border-border', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-t border-border bg-muted/60 font-medium [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  )
}

interface TableRowProps extends React.ComponentProps<'tr'> {
  /** Rende la riga attivabile col puntatore E con la tastiera. */
  onActivate?: () => void
  /**
   * Cosa succede attivando la riga, per chi non vede la tabella.
   * Obbligatoria con `onActivate`: «riga 4 di 30» non dice dove si va.
   */
  etichettaAzione?: string
}

function TableRow({
  className,
  onActivate,
  etichettaAzione,
  onClick,
  onKeyDown,
  ...props
}: TableRowProps) {
  return (
    <tr
      data-slot="table-row"
      // La semantica di riga NON si sostituisce con role="link": un `tr`
      // con un altro ruolo smette di essere una riga e la tabella perde
      // la struttura per chi la legge con uno screen reader.
      tabIndex={onActivate ? 0 : undefined}
      aria-label={onActivate ? etichettaAzione : undefined}
      onClick={
        onActivate
          ? (e) => {
              onClick?.(e)
              if (!e.defaultPrevented) onActivate()
            }
          : onClick
      }
      onKeyDown={
        onActivate
          ? (e) => {
              onKeyDown?.(e)
              if (e.defaultPrevented) return
              // Lo Spazio fa scorrere la pagina se non lo si ferma, e un
              // elenco che scorre mentre si sta attivando una riga è il
              // modo più rapido per far perdere il segno.
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onActivate()
              }
            }
          : onKeyDown
      }
      className={cn(
        'border-b border-border transition-colors',
        onActivate &&
          'cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-[state=selected]:bg-muted',
        className,
      )}
      {...props}
    />
  )
}

interface TableHeadProps extends React.ComponentProps<'th'> {
  /** Colonna numerica: allinea a destra, testata compresa. */
  numerica?: boolean
}

function TableHead({ className, numerica, ...props }: TableHeadProps) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn(
        'h-10 px-4 align-middle text-label whitespace-nowrap text-muted-foreground uppercase',
        numerica ? 'text-right' : 'text-left',
        className,
      )}
      {...props}
    />
  )
}

interface TableCellProps extends React.ComponentProps<'td'> {
  /**
   * Cella numerica: allineata a destra. Una colonna di importi allineata
   * a sinistra non si confronta a colpo d'occhio, per quanti numeri
   * tabellari si mettano.
   */
  numerica?: boolean
}

function TableCell({ className, numerica, ...props }: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'px-4 py-2.5 align-middle',
        numerica && 'text-right',
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-3 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
