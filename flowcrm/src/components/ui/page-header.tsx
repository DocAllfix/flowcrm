import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Intestazione di pagina: dove sono, cosa c'è qui, cosa posso farci.
 *
 * ── Cosa è cambiato, e cosa no ──────────────────────────────────────
 * Le proprietà `title`, `description` e `actions` restano **identiche**:
 * i 31 file che già la usano non vanno toccati. Tutto ciò che è stato
 * aggiunto è facoltativo.
 *
 * ── Perché le briciole ──────────────────────────────────────────────
 * L'applicazione non aveva nessun senso del luogo: la barra in alto porta
 * solo comandi, e dentro una scheda di dettaglio a tredici schede non
 * c'era modo di sapere da dove si era arrivati se non dal tasto indietro.
 *
 * ── Perché i numeri stanno qui e non in una fila di riquadri ────────
 * `DESIGN.md` vieta le griglie di card identiche. Tre o quattro numeri
 * che descrivono la pagina stanno meglio in una fascia sotto il titolo:
 * si leggono in una riga, non rubano la schermata all'elenco, e non
 * fingono di essere altrettanti pulsanti. Il `data-slot="kpi"` è quello
 * che la regola globale in `index.css` usa per i numeri tabellari.
 */

export interface Briciola {
  label: string
  /** Assente = voce corrente, non cliccabile. */
  to?: string
}

export interface NumeroTestata {
  etichetta: string
  valore: ReactNode
  /** Mostra uno scheletro al posto del numero finché il dato non c'è. */
  inCaricamento?: boolean
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  /** Percorso fino a questa pagina, l'ultima voce è quella corrente. */
  briciole?: Briciola[]
  /** Fascia di numeri che descrivono la pagina. Da 2 a 5, non di più. */
  numeri?: NumeroTestata[]
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  briciole,
  numeri,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {briciole && briciole.length > 0 && (
        <nav aria-label="Percorso" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {briciole.map((b, i) => (
              <li key={`${b.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight className="size-3.5 shrink-0" aria-hidden />
                )}
                {b.to ? (
                  <Link
                    to={b.to}
                    className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-foreground">
                    {b.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {/* Semibold e non bold: a 24px il peso 700 grida. */}
          <h1 className="text-headline text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      {numeri && numeri.length > 0 && (
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-4">
          {numeri.map((n) => (
            <div key={n.etichetta} className="flex items-baseline gap-2">
              <dd
                data-slot="kpi"
                className="text-title text-foreground tabular-nums"
              >
                {n.inCaricamento ? (
                  // Mai uno zero provvisorio al posto del numero vero.
                  <span
                    aria-hidden
                    className="inline-block h-4 w-10 rounded-sm bg-muted align-middle motion-safe:animate-pulse"
                  />
                ) : (
                  n.valore
                )}
              </dd>
              <dt className="text-sm text-muted-foreground">{n.etichetta}</dt>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
