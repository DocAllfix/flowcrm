import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Indicatore di attesa.
 *
 * ── Perché un componente e non `<Loader2 className="animate-spin" />` ─
 * Quella riga era ripetuta in una trentina di file, ogni volta con una
 * dimensione diversa, mai con un ruolo ARIA e mai con un'etichetta: chi
 * non vede lo schermo non riceveva nessuna notizia del fatto che stesse
 * succedendo qualcosa.
 *
 * ── Perché `data-movimento="funzionale"` ────────────────────────────
 * Il blocco globale `prefers-reduced-motion` in `index.css` azzera le
 * animazioni. Per uno spinner sarebbe sbagliato: un indicatore di attesa
 * immobile non dice «meno movimento», dice «si è piantato». Questo
 * attributo lo esclude dall'azzeramento e lo rallenta soltanto.
 *
 * ── Dove NON usarlo ─────────────────────────────────────────────────
 * Al posto del contenuto di una pagina o di un elenco. Lì va uno
 * scheletro, che dice anche **cosa** sta arrivando e ne riserva lo
 * spazio. Questo serve ai comandi in corso e alle attese brevi.
 */

interface SpinnerProps {
  /** Cosa si sta aspettando. Se omessa, l'indicatore resta decorativo. */
  etichetta?: string
  dimensione?: 'sm' | 'md' | 'lg'
  className?: string
}

const DIMENSIONI = { sm: 'size-4', md: 'size-5', lg: 'size-6' } as const

export function Spinner({ etichetta, dimensione = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      data-movimento="funzionale"
      role={etichetta ? 'status' : undefined}
      aria-label={etichetta}
      aria-hidden={etichetta ? undefined : true}
      className={cn('animate-spin text-muted-foreground', DIMENSIONI[dimensione], className)}
    />
  )
}

/** Attesa che occupa un'area: usato per i riquadri, non per le pagine. */
export function AttesaCentrata({
  etichetta = 'Caricamento in corso',
  className,
}: {
  etichetta?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <Spinner etichetta={etichetta} dimensione="lg" />
    </div>
  )
}
