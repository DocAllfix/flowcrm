import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Building2, Cog, Pencil } from 'lucide-react'
import { useProgetto, type ProgettoStato } from '@/lib/queries/progetti'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { StoricoSection } from '@/components/StoricoSection'
import { MilestoneSection } from '@/components/MilestoneSection'
import { ProgettoDialog } from '@/features/progetti/ProgettoDialog'

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const STATO_TONE: Record<ProgettoStato, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  pianificazione: 'neutral', in_corso: 'info', in_revisione: 'warning', completato: 'success', sospeso: 'danger',
}
const STATO_LABEL: Record<ProgettoStato, string> = {
  pianificazione: 'Pianificazione', in_corso: 'In corso', in_revisione: 'In revisione',
  completato: 'Completato', sospeso: 'Sospeso',
}

export function ProgettoDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: p, isLoading } = useProgetto(id)
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!p) return <p className="text-sm text-muted-foreground">Progetto non trovato.</p>

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate('/progetti')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Progetti
      </button>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {p.tipo === 'cliente' ? <Building2 className="h-3.5 w-3.5" /> : <Cog className="h-3.5 w-3.5" />}
              {p.tipo === 'cliente' ? 'Cliente' : 'Interno'}
            </span>
            <h1 className="mt-1 text-2xl font-bold text-foreground">{p.nome}</h1>
            {p.organizzazione && (
              <p className="mt-0.5 text-sm text-muted-foreground">{p.organizzazione.ragione_sociale}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <Badge tone={STATO_TONE[p.stato]}>{STATO_LABEL[p.stato]}</Badge>
              {p.budget != null && <span className="font-bold text-foreground">{fmtEuro(Number(p.budget))}</span>}
              {p.scadenza && <span className="text-muted-foreground">Scadenza: {new Date(p.scadenza).toLocaleDateString('it-IT')}</span>}
            </div>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Modifica
          </Button>
        </div>
        {p.descrizione && <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-sm text-foreground">{p.descrizione}</p>}
      </div>

      <Tabs defaultValue="milestone">
        <TabsList>
          <TabsTrigger value="milestone">Milestone</TabsTrigger>
          <TabsTrigger value="allegati">Allegati</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>
        <TabsContent value="milestone" className="mt-4">
          <MilestoneSection progettoId={p.id} />
        </TabsContent>
        <TabsContent value="allegati" className="mt-4">
          <AllegatiSection entita="progetti" entitaId={p.id} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="progetti" entitaId={p.id} />
        </TabsContent>
      </Tabs>

      <ProgettoDialog open={editOpen} onOpenChange={setEditOpen} progetto={p} />
    </div>
  )
}
