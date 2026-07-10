import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { CircleDollarSign } from 'lucide-react'
import { DealDialog } from '@/features/deal/DealDialog'
import { RowActions } from '@/components/RowActions'
import { useDeals, usePipelineStages, useArchiveDeal, useDeleteDeal, type Deal } from '@/lib/queries/deals'

const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export function DealListPage() {
  const navigate = useNavigate()
  const { data: deals = [], isLoading } = useDeals()
  const { data: stages = [] } = usePipelineStages()
  const [createOpen, setCreateOpen] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const archive = useArchiveDeal()
  const del = useDeleteDeal()

  const stageById = new Map(stages.map((s) => [s.id, s]))

  return (
    <div>
      <PageHeader
        title="Deal"
        description="Tutte le offerte commerciali."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nuovo deal
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : deals.length === 0 ? (
        <EmptyState icon={CircleDollarSign} title="Nessun deal"
          description="Crea la tua prima offerta commerciale." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organizzazione</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fase</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const stage = stageById.get(d.stage_id)
                return (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/deal/${d.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{d.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.organizzazione?.ragione_sociale ?? '—'}</td>
                    <td className="px-4 py-3">
                      {stage && (
                        <Badge className="text-white" style={{ backgroundColor: stage.colore ?? undefined }}>
                          {stage.nome}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">{fmtImporto(Number(d.importo))}</td>
                    <td className="px-4 py-3 text-right">
                      <RowActions
                        nome={d.nome}
                        onEdit={() => setEditDeal(d)}
                        onArchive={() => archive.mutate(d.id, {
                          onSuccess: () => toast.success('Deal archiviato'),
                          onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                        })}
                        onDelete={() => del.mutate(d.id, {
                          onSuccess: () => toast.success('Deal eliminato'),
                          onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                        })}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <DealDialog
        open={createOpen || !!editDeal}
        deal={editDeal ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditDeal(null) } }}
      />
    </div>
  )
}
