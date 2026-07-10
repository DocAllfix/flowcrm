/**
 * KanbanPage — board pipeline vendite con @hello-pangea/dnd.
 *
 * Pattern DnD replicato da CertDesk (funziona molto bene):
 *   DragDropContext + StrictModeDroppable + Draggable
 *   optimistic update auto-pulente via stageOverrides (rollback su errore)
 *   il drag È l'azione, nessun bottone "avanza"
 */
import { useState, useMemo } from 'react'
import { Plus, Search, Loader2 } from 'lucide-react'
import { DragDropContext, Draggable, type DropResult } from '@hello-pangea/dnd'
import { toast } from 'sonner'

import { StrictModeDroppable } from '@/components/kanban/StrictModeDroppable'
import { KanbanCard } from '@/components/kanban/KanbanCard'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DealDialog } from '@/features/deal/DealDialog'
import { usePipelineStages, useDeals, useMoveDeal, type DealWithOrg } from '@/lib/queries/deals'

const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export function KanbanPage() {
  const { data: stages = [], isLoading: loadingStages } = usePipelineStages()
  const { data: deals = [], isLoading: loadingDeals } = useDeals()
  const moveDeal = useMoveDeal()

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  // Override optimistic: dealId → stageId (auto-ignorato quando il server conferma)
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return deals
    return deals.filter(
      (d) =>
        d.nome.toLowerCase().includes(q) ||
        (d.organizzazione?.ragione_sociale ?? '').toLowerCase().includes(q),
    )
  }, [deals, search])

  // Raggruppa per stage applicando l'override optimistic
  const perStage = useMemo(() => {
    const map: Record<string, DealWithOrg[]> = {}
    for (const s of stages) map[s.id] = []
    for (const d of filtered) {
      const override = stageOverrides[d.id]
      const eff = override && override !== d.stage_id ? override : d.stage_id
      if (map[eff]) map[eff].push(d)
    }
    return map
  }, [filtered, stages, stageOverrides])

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination || destination.droppableId === source.droppableId) return

    const targetStage = destination.droppableId
    const deal = deals.find((d) => d.id === draggableId)
    if (!deal) return

    // Optimistic: la card si sposta subito
    setStageOverrides((prev) => ({ ...prev, [draggableId]: targetStage }))

    moveDeal.mutate(
      { dealId: draggableId, stageId: targetStage },
      {
        onError: (err) => {
          // Rollback: rimuovi l'override → la card torna indietro
          setStageOverrides((prev) => {
            const next = { ...prev }
            delete next[draggableId]
            return next
          })
          toast.error('Spostamento non riuscito', { description: (err as Error).message })
        },
        onSuccess: () => {
          setStageOverrides((prev) => {
            const next = { ...prev }
            delete next[draggableId]
            return next
          })
          const stageNome = stages.find((s) => s.id === targetStage)?.nome ?? ''
          toast.success(`"${deal.nome}" spostato in ${stageNome}`)
        },
      },
    )
  }

  if (loadingStages || loadingDeals) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Kanban offerte"
        description="Trascina le card tra le colonne per avanzare i deal di fase."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nuovo deal
          </Button>
        }
      />

      <div className="relative mb-4 max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cerca deal…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div data-tour="kanban-board" className="flex flex-1 gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const cards = perStage[stage.id] ?? []
            // Valore pesato della colonna: Σ importo × probabilità
            const pesato = cards.reduce(
              (sum, d) => sum + Number(d.importo) * (stage.probabilita / 100),
              0,
            )
            return (
              <div key={stage.id} className="flex w-72 shrink-0 flex-col">
                <div
                  className="flex items-center gap-2 rounded-t-xl px-4 py-2.5"
                  style={{ backgroundColor: stage.colore ?? 'var(--color-primary)' }}
                >
                  <h3 className="flex-1 truncate text-sm font-semibold text-white">{stage.nome}</h3>
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs font-bold text-white/90">
                    {cards.length}
                  </span>
                </div>
                <div className="border-x border-border bg-muted/30 px-4 py-1.5 text-[11px] font-medium text-muted-foreground">
                  Pesato: {fmtImporto(pesato)}
                </div>

                <StrictModeDroppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2.5 rounded-b-xl border border-t-0 border-border p-2.5 transition-colors ${
                        snapshot.isDraggingOver ? 'border-primary/30 bg-primary/5' : 'bg-muted/20'
                      }`}
                      style={{ minHeight: 200, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}
                    >
                      {cards.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(drag, dragSnapshot) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              style={drag.draggableProps.style}
                              className={dragSnapshot.isDragging ? 'rotate-1 scale-105 opacity-90' : ''}
                            >
                              <KanbanCard deal={deal} stage={stage} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {cards.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex h-24 items-center justify-center text-xs text-muted-foreground/60">
                          Nessun deal
                        </div>
                      )}
                    </div>
                  )}
                </StrictModeDroppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      <DealDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
