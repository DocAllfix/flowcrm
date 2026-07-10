import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Building2, Calendar, Loader2, Briefcase } from 'lucide-react'
import { useDeal } from '@/lib/queries/deals'
import { useCommessePerDeal } from '@/lib/queries/commesse'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { StoricoSection } from '@/components/StoricoSection'
import { TimelineSection } from '@/components/TimelineSection'
import { FeedSection } from '@/components/FeedSection'
import { CommessaDialog } from '@/features/commesse/CommessaDialog'

const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export function DealDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: deal, isLoading } = useDeal(id)
  const { data: commesse = [] } = useCommessePerDeal(id)
  const [commessaOpen, setCommessaOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!deal) {
    return <p className="text-sm text-muted-foreground">Deal non trovato.</p>
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Indietro
      </button>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{deal.nome}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {deal.organizzazione && (
                <Link
                  to={`/organizzazioni/${deal.organizzazione.id}`}
                  className="flex items-center gap-1.5 hover:text-primary"
                >
                  <Building2 className="h-4 w-4" />
                  {deal.organizzazione.ragione_sociale}
                </Link>
              )}
              {deal.data_chiusura_prevista && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(deal.data_chiusura_prevista).toLocaleDateString('it-IT')}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{fmtImporto(Number(deal.importo))}</p>
            <Badge
              className="mt-1 text-white"
              style={{ backgroundColor: deal.stage.colore ?? undefined }}
            >
              {deal.stage.nome} · {deal.stage.probabilita}%
            </Badge>
          </div>
        </div>

        {/* Commesse collegate + crea da deal (bottone se lo stage è vinto) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            {commesse.length === 0 ? (
              <span className="text-muted-foreground">Nessuna commessa collegata</span>
            ) : (
              commesse.map((c) => (
                <span key={c.id} className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
                  {c.codice}
                </span>
              ))
            )}
          </div>
          {deal.stage.is_won && (
            <Button size="sm" variant="outline" onClick={() => setCommessaOpen(true)}
              data-testid="crea-commessa-da-deal">
              <Briefcase className="h-4 w-4" /> Crea commessa da deal
            </Button>
          )}
        </div>
      </div>

      <CommessaDialog
        open={commessaOpen}
        onOpenChange={setCommessaOpen}
        preset={{
          organizzazione_id: deal.organizzazione?.id ?? null,
          deal_id: deal.id,
          descrizione: deal.nome,
          importo: Number(deal.importo),
        }}
      />

      <Tabs defaultValue="attivita">
        <TabsList>
          <TabsTrigger value="attivita">Attività</TabsTrigger>
          <TabsTrigger value="commenti">Commenti</TabsTrigger>
          <TabsTrigger value="allegati">Allegati</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>
        <TabsContent value="attivita" className="mt-4">
          <TimelineSection scope={{ deal_id: deal.id }} />
        </TabsContent>
        <TabsContent value="commenti" className="mt-4">
          <FeedSection target={{ entita: 'deals', entitaId: deal.id }} />
        </TabsContent>
        <TabsContent value="allegati" className="mt-4">
          <AllegatiSection entita="deals" entitaId={deal.id} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="deals" entitaId={deal.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
