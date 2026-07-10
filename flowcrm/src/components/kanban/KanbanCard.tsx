import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import type { DealWithOrg, PipelineStage } from '@/lib/queries/deals'

interface Props {
  deal: DealWithOrg
  stage: PipelineStage
}

const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

/**
 * KanbanCard — card deal. Il wrapper drag (ref/handle/animazioni) è nel
 * Draggable della board; qui solo il contenuto visivo e il click→dettaglio.
 */
export function KanbanCard({ deal, stage }: Props) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/deal/${deal.id}`)}
      className="group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-colors duration-200 hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-snug text-foreground">{deal.nome}</h4>
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
          style={{ backgroundColor: stage.colore ?? 'var(--color-primary)' }}
          title={`Probabilità ${stage.probabilita}%`}
        >
          {stage.probabilita}%
        </span>
      </div>

      {deal.organizzazione && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{deal.organizzazione.ragione_sociale}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-foreground">{fmtImporto(Number(deal.importo))}</span>
        {deal.data_chiusura_prevista && (
          <span className="text-[11px] text-muted-foreground">
            {new Date(deal.data_chiusura_prevista).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>
    </div>
  )
}
