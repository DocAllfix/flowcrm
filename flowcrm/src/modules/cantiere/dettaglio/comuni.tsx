import { Badge } from '@/components/ui/badge'
import { CANTIERE_CATEGORIE_DOC } from '@/modules/cantiere/stati'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { type Cantiere } from '@/modules/cantiere/queries/cantieri'
import { useAllegati } from '@/lib/queries/allegati'
import { useQuery } from '@tanstack/react-query'

/**
 * Pezzi condivisi dalle schede di questa scheda di dettaglio.
 *
 * Stavano in fondo a un file da oltre mille righe, insieme alle schede che
 * li usano: un file che nessuno apriva per intero, e in cui una modifica a
 * una scheda costringeva a scorrere tutte le altre.
 */
export const card = 'rounded-lg border border-border bg-card p-5'

export type CantiereMisura = {
  id: string; descrizione: string; quantita: number; unita: string | null
  prezzo_unitario: number; data: string
}

export /** Dipendenti HR (RLS: solo manager li vede; per gli altri lista vuota). */
function useDipendentiHr(abilitato: boolean) {
  return useQuery({
    queryKey: ['cantiere', 'dipendenti-hr'],
    enabled: abilitato,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dipendenti').select('id, nome, cognome').eq('attivo', true).order('cognome')
      if (error) throw error
      return data
    },
  })
}

export function Riga({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  )
}

export function BtnElimina({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Rimuovi"
      className="rounded-md p-1 text-muted-foreground hover:text-destructive">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

export // Indicatore "documentazione mancante" (§17): archivi senza nemmeno un file
function DocumentazioneMancante({ cantiere }: { cantiere: Cantiere }) {
  const { data: allegati = [] } = useAllegati('cantieri', cantiere.id)
  const presenti = new Set(allegati.map((a) => a.categoria).filter(Boolean))
  const mancanti = CANTIERE_CATEGORIE_DOC.filter((c) => !presenti.has(c))
  if (mancanti.length === 0) return null
  return (
    <div className={card + ' lg:col-span-2 border-warning/50'}>
      <h3 className="mb-2 text-sm font-semibold text-foreground">Documentazione mancante</h3>
      <p className="text-sm text-muted-foreground">
        Archivi ancora vuoti:{' '}
        {mancanti.map((m, i) => (
          <span key={m}>
            <Badge tone="warning">{m}</Badge>{i < mancanti.length - 1 ? ' ' : ''}
          </span>
        ))}
        {' '}— carica i documenti nella tab Documenti.
      </p>
    </div>
  )
}
