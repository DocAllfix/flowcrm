import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Download } from 'lucide-react'
import { toCsv, scaricaCsv } from '@/lib/csv'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { CircleDollarSign } from 'lucide-react'
import { DealDialog } from '@/features/deal/DealDialog'
import { RowActions } from '@/components/RowActions'
import { useDeals, usePipelineStages, useArchiveDeal, useDeleteDeal, type Deal } from '@/lib/queries/deals'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, CollegamentoRiga } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const rows = deals.map((d) => [d.nome, d.organizzazione?.ragione_sociale, stageById.get(d.stage_id)?.nome, d.importo])
              scaricaCsv('deal', toCsv(['Deal', 'Organizzazione', 'Fase', 'Importo'], rows))
            }}>
              <Download className="h-4 w-4" /> Esporta CSV
            </Button>
            <BottoneScrittura onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Nuovo deal
            </BottoneScrittura>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner etichetta="Caricamento in corso" dimensione="lg" />
        </div>
      ) : deals.length === 0 ? (
        <EmptyState icon={CircleDollarSign} title="Nessun deal"
          description="Crea la tua prima offerta commerciale." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Organizzazione</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead numerica>Importo</TableHead>
                <TableHead><span className="sr-only">Azioni</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((d) => {
                const stage = stageById.get(d.stage_id)
                return (
                  <TableRow key={d.id} onActivate={() => navigate(`/deal/${d.id}`)}>
                    <TableCell><CollegamentoRiga to={`/deal/${d.id}`}>{d.nome}</CollegamentoRiga></TableCell>
                    <TableCell className="text-muted-foreground">{d.organizzazione?.ragione_sociale ?? '—'}</TableCell>
                    <TableCell>
                      {stage && (
                        <Badge className="text-white" style={{ backgroundColor: stage.colore ?? undefined }}>
                          {stage.nome}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell numerica className="font-bold text-foreground">{fmtImporto(Number(d.importo))}</TableCell>
                    <TableCell numerica>
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
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <DealDialog
        open={createOpen || !!editDeal}
        deal={editDeal ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditDeal(null) } }}
      />
    </div>
  )
}
