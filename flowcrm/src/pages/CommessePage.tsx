import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Briefcase, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { RowActions } from '@/components/RowActions'
import { CommessaDialog } from '@/features/commesse/CommessaDialog'
import {
  useCommesse, useArchiveCommessa, useDeleteCommessa, type CommessaStato, type Commessa,
} from '@/lib/queries/commesse'

const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const STATO_TONE: Record<CommessaStato, 'success' | 'warning' | 'info' | 'neutral'> = {
  attiva: 'success', in_pausa: 'warning', completata: 'info', annullata: 'neutral',
}
const STATO_LABEL: Record<CommessaStato, string> = {
  attiva: 'Attiva', in_pausa: 'In pausa', completata: 'Completata', annullata: 'Annullata',
}

export function CommessePage() {
  const { data: commesse = [], isLoading } = useCommesse()
  const [createOpen, setCreateOpen] = useState(false)
  const [editCommessa, setEditCommessa] = useState<Commessa | null>(null)
  const archive = useArchiveCommessa()
  const del = useDeleteCommessa()

  return (
    <div>
      <PageHeader
        title="Commesse"
        description="Le commesse acquisite, con codice progressivo automatico."
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuova commessa</Button>}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : commesse.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nessuna commessa"
          description="Le commesse nascono da un deal vinto o si creano manualmente." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Codice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organizzazione</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrizione</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stato</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {commesse.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{c.codice}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.organizzazione?.ragione_sociale ?? '—'}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{c.descrizione}</td>
                  <td className="px-4 py-3"><Badge tone={STATO_TONE[c.stato]}>{STATO_LABEL[c.stato]}</Badge></td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">{fmtImporto(Number(c.importo))}</td>
                  <td className="px-4 py-3 text-right">
                    <RowActions
                      nome={c.codice ?? undefined}
                      onEdit={() => setEditCommessa(c)}
                      onArchive={() => archive.mutate(c.id, {
                        onSuccess: () => toast.success('Commessa archiviata'),
                        onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                      })}
                      onDelete={() => del.mutate(c.id, {
                        onSuccess: () => toast.success('Commessa eliminata'),
                        onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                      })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CommessaDialog
        open={createOpen || !!editCommessa}
        commessa={editCommessa ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditCommessa(null) } }}
      />
    </div>
  )
}
