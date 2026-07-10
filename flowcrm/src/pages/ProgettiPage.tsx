import { useState } from 'react'
import { Plus, FolderKanban, Loader2, Building2, Cog } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ProgettoDialog } from '@/features/progetti/ProgettoDialog'
import { useProgetti, type ProgettoStato } from '@/lib/queries/progetti'

const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const STATO_TONE: Record<ProgettoStato, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  pianificazione: 'neutral', in_corso: 'info', in_revisione: 'warning',
  completato: 'success', sospeso: 'danger',
}
const STATO_LABEL: Record<ProgettoStato, string> = {
  pianificazione: 'Pianificazione', in_corso: 'In corso', in_revisione: 'In revisione',
  completato: 'Completato', sospeso: 'Sospeso',
}

export function ProgettiPage() {
  const { data: progetti = [], isLoading } = useProgetti()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div>
      <PageHeader
        title="Progetti"
        description="Progetti cliente e interni."
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuovo progetto</Button>}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : progetti.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Nessun progetto"
          description="Crea un progetto cliente o interno." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {progetti.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {p.tipo === 'cliente' ? <Building2 className="h-3.5 w-3.5" /> : <Cog className="h-3.5 w-3.5" />}
                  {p.tipo === 'cliente' ? 'Cliente' : 'Interno'}
                </span>
                <Badge tone={STATO_TONE[p.stato]}>{STATO_LABEL[p.stato]}</Badge>
              </div>
              <h3 className="font-semibold text-foreground">{p.nome}</h3>
              {p.organizzazione && (
                <p className="mt-0.5 text-xs text-muted-foreground">{p.organizzazione.ragione_sociale}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-sm">
                {p.budget != null && <span className="font-bold text-foreground">{fmtImporto(Number(p.budget))}</span>}
                {p.scadenza && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.scadenza).toLocaleDateString('it-IT')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ProgettoDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
