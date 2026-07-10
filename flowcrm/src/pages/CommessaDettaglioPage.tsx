import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Pencil } from 'lucide-react'
import { useCommessa, type CommessaStato } from '@/lib/queries/commesse'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { StoricoSection } from '@/components/StoricoSection'
import { CommessaDialog } from '@/features/commesse/CommessaDialog'

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const STATO_TONE: Record<CommessaStato, 'success' | 'warning' | 'info' | 'neutral'> = {
  attiva: 'success', in_pausa: 'warning', completata: 'info', annullata: 'neutral',
}
const STATO_LABEL: Record<CommessaStato, string> = {
  attiva: 'Attiva', in_pausa: 'In pausa', completata: 'Completata', annullata: 'Annullata',
}

export function CommessaDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: c, isLoading } = useCommessa(id)
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!c) return <p className="text-sm text-muted-foreground">Commessa non trovata.</p>

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate('/commesse')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Commesse
      </button>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="font-mono text-xs font-semibold text-muted-foreground">{c.codice}</span>
            <h1 className="mt-1 text-2xl font-bold text-foreground">{c.descrizione}</h1>
            {c.organizzazione && (
              <p className="mt-0.5 text-sm text-muted-foreground">{c.organizzazione.ragione_sociale}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <Badge tone={STATO_TONE[c.stato]}>{STATO_LABEL[c.stato]}</Badge>
              <span className="font-bold text-foreground">{fmtEuro(Number(c.importo))}</span>
              {c.data_inizio && <span className="text-muted-foreground">Inizio: {new Date(c.data_inizio).toLocaleDateString('it-IT')}</span>}
              {c.data_fine_prevista && <span className="text-muted-foreground">Fine prevista: {new Date(c.data_fine_prevista).toLocaleDateString('it-IT')}</span>}
            </div>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Modifica
          </Button>
        </div>
      </div>

      <Tabs defaultValue="allegati">
        <TabsList>
          <TabsTrigger value="allegati">Allegati</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>
        <TabsContent value="allegati" className="mt-4">
          <AllegatiSection entita="commesse" entitaId={c.id} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="commesse" entitaId={c.id} />
        </TabsContent>
      </Tabs>

      <CommessaDialog open={editOpen} onOpenChange={setEditOpen} commessa={c} />
    </div>
  )
}
