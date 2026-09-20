import { Trash2 } from 'lucide-react'

/**
 * Pezzi condivisi dalle schede di questa scheda di dettaglio.
 *
 * Stavano in fondo a un file da oltre mille righe, insieme alle schede che
 * li usano: un file che nessuno apriva per intero, e in cui una modifica a
 * una scheda costringeva a scorrere tutte le altre.
 */
export const card = 'rounded-lg border border-border bg-card p-5'

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


export const fmtKm = (n: number | null) => (n != null ? new Intl.NumberFormat('it-IT').format(n) + ' km' : '—')