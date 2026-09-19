import * as React from 'react'
import { Link } from 'react-router-dom'
import { useAutoAnimate } from '@formkit/auto-animate/react'
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
 * `tabIndex`, nessun `onKeyDown`. Metà interfaccia.
 *
 * ⚠️ La prima soluzione qui era `<tr tabIndex={0} aria-label="Apri X">`
 * con Invio e Spazio. **È sbagliata**, e l'ho capito applicandola: su un
 * elemento di riga `aria-label` SOSTITUISCE l'annuncio delle celle,
 * quindi chi usa uno screen reader smetterebbe di sentire «Mario Rossi,
 * Acme Srl, commerciale» per sentire «Apri scheda» su ogni riga uguale.
 * Peggiorava ciò che doveva migliorare.
 *
 * La via da tastiera è invece `CollegamentoRiga`: un `<a>` vero nella
 * prima cella, che è già il nome della riga. Si raggiunge con Tab, si
 * apre con Invio, viene annunciato col nome dell'entità, e la riga
 * continua ad annunciare le proprie celle. `onActivate` su `TableRow`
 * resta, ma per quello che è: una comodità per il puntatore.
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
  // AutoAnimate sta QUI e non nelle pagine: così tutte le tabelle del
  // prodotto guadagnano la transizione su creazione, filtro ed
  // eliminazione senza che nessuna pagina debba ricordarsene. Anima solo
  // `transform` e `opacity`, e rispetta `prefers-reduced-motion` da sé
  // (l'opzione per ignorarlo esiste e non la usiamo).
  const [corpo] = useAutoAnimate<HTMLTableSectionElement>({
    duration: 200,
    easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  })
  return (
    <tbody
      ref={corpo}
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
  /**
   * Comodità per il puntatore: cliccando ovunque sulla riga si apre la
   * scheda. NON è la via da tastiera — quella è `CollegamentoRiga` nella
   * prima cella, che è anche l'unica che uno screen reader può annunciare
   * con un nome sensato.
   */
  onActivate?: () => void
}

function TableRow({ className, onActivate, onClick, ...props }: TableRowProps) {
  return (
    <tr
      data-slot="table-row"
      // Niente tabIndex e niente aria-label: la riga resta una riga, e chi
      // la legge continua a sentire il contenuto delle celle.
      onClick={
        onActivate
          ? (e) => {
              onClick?.(e)
              if (!e.defaultPrevented) onActivate()
            }
          : onClick
      }
      className={cn(
        'border-b border-border transition-colors',
        onActivate &&
          // `focus-within` e non `focus`: a prendere il focus è il
          // collegamento dentro la prima cella, ma a illuminarsi deve
          // essere la riga intera, altrimenti si perde il segno.
          'cursor-pointer hover:bg-muted/50 focus-within:bg-muted/50 data-[state=selected]:bg-muted',
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

/**
 * Il collegamento principale di una riga: va nella cella che porta il
 * nome dell'entità, ed è la via da tastiera all'apertura della scheda.
 *
 * Perché non un `<a>` steso sopra tutta la riga: su `<tr>` il
 * posizionamento assoluto non è affidabile in tutti i motori, e un
 * collegamento che copre la riga intercetterebbe anche i clic destinati
 * al menu delle azioni nell'ultima cella.
 */
function CollegamentoRiga({
  className,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      data-slot="table-row-link"
      className={cn(
        'rounded-sm font-medium text-foreground transition-colors',
        'hover:text-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
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
  CollegamentoRiga,
}
