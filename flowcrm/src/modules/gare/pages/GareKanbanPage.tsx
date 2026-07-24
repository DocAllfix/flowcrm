/**
 * GareKanbanPage — board delle gare per stato (6 colonne fisse).
 * Stesso pattern DnD del Kanban deal: StrictModeDroppable + optimistic
 * override auto-pulente con rollback su errore. Il drag È il cambio stato.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Draggable, type DropResult } from '@hello-pangea/dnd'
import { toast } from 'sonner'
import { Plus, Loader2, Building2, CalendarClock } from 'lucide-react'
import { StrictModeDroppable } from '@/components/kanban/StrictModeDroppable'
import { PageHeader } from '@/components/ui/page-header'
import { GaraDialog } from '@/modules/gare/dialogs/GaraDialog'
import { GARA_STATI, fmtImporto, giorniAlTermine } from '@/modules/gare/stati'
import { useGare, useMoveGaraStato, type Gara, type GaraStato } from '@/modules/gare/queries/gare'
import { cn } from '@/lib/utils'
import { BottoneScrittura } from '@/components/BottoneScrittura'

export function GareKanbanPage() {
  const navigate = useNavigate()
  const { data: gare = [], isLoading } = useGare()
  const move = useMoveGaraStato()
  const [createOpen, setCreateOpen] = useState(false)
  const [statoOverrides, setStatoOverrides] = useState<Record<string, GaraStato>>({})

  const perStato = useMemo(() => {
    const map: Record<string, Gara[]> = {}
    for (const s of GARA_STATI) map[s.value] = []
    for (const g of gare) {
      const override = statoOverrides[g.id]
      const eff = override && override !== g.stato ? override : g.stato
      if (map[eff]) map[eff].push(g)
    }
    return map
  }, [gare, statoOverrides])

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination || destination.droppableId === source.droppableId) return
    const nuovoStato = destination.droppableId as GaraStato

    setStatoOverrides((prev) => ({ ...prev, [draggableId]: nuovoStato }))
    move.mutate(
      { id: draggableId, stato: nuovoStato },
      {
        onError: (err) => {
          setStatoOverrides((prev) => {
            const next = { ...prev }
            delete next[draggableId]
            return next
          })
          toast.error('Spostamento non riuscito', { description: (err as Error).message })
        },
        onSuccess: () => {
          setStatoOverrides((prev) => {
            const next = { ...prev }
            delete next[draggableId]
            return next
          })
        },
      },
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Kanban gare"
        description="Trascina una gara per cambiarne lo stato."
        actions={<BottoneScrittura onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuova gara</BottoneScrittura>}
      />

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4" data-tour="gare-kanban">
          {GARA_STATI.map((st) => {
            const colonna = perStato[st.value] ?? []
            const totale = colonna.reduce((s, g) => s + Number(g.importo_base), 0)
            return (
              <div key={st.value} className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/40">
                <div className="flex items-center gap-2 p-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.colore }} />
                  <span className="text-sm font-semibold text-foreground">{st.label}</span>
                  <span className="text-xs text-muted-foreground">({colonna.length})</span>
                  <span className="ml-auto text-xs font-medium text-muted-foreground">{fmtImporto(totale)}</span>
                </div>
                <StrictModeDroppable droppableId={st.value}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex-1 space-y-2 overflow-y-auto px-2 pb-2 transition-colors',
                        snapshot.isDraggingOver && 'rounded-lg bg-primary/5'
                      )}
                    >
                      {colonna.map((g, index) => {
                        const gg = ['in_analisi', 'in_preparazione'].includes(g.stato)
                          ? giorniAlTermine(g.termine_presentazione)
                          : null
                        return (
                          <Draggable key={g.id} draggableId={g.id} index={index}>
                            {(drag, dragSnapshot) => (
                              <div
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                {...drag.dragHandleProps}
                                onClick={() => navigate(`/gare/${g.id}`)}
                                className={cn(
                                  'cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow',
                                  dragSnapshot.isDragging && 'rotate-1 shadow-lg'
                                )}
                              >
                                <p className="font-mono text-[10px] font-semibold text-muted-foreground">{g.codice}</p>
                                <p className="mt-0.5 line-clamp-2 text-sm font-medium text-foreground">{g.titolo}</p>
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{g.ente?.ragione_sociale ?? g.ente_appaltante ?? '—'}</span>
                                </div>
                                <div className="mt-1.5 flex items-center justify-between">
                                  <span className="text-sm font-bold text-foreground">{fmtImporto(Number(g.importo_base))}</span>
                                  {gg !== null && (
                                    <span className={cn(
                                      'inline-flex items-center gap-1 text-xs',
                                      gg <= 3 ? 'font-semibold text-destructive'
                                        : gg <= 10 ? 'font-medium text-warning-foreground'
                                        : 'text-muted-foreground'
                                    )}>
                                      <CalendarClock className="h-3 w-3" />
                                      {gg < 0 ? 'scaduto' : gg === 0 ? 'oggi' : `${gg} gg`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </StrictModeDroppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      <GaraDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
