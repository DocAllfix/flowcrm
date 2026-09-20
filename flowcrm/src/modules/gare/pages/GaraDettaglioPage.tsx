import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { ArrowLeft, Pencil, Building2 } from 'lucide-react'
import { AttesaCentrata } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FeedSection } from '@/components/FeedSection'
import { GARA_STATI, statoGara, fmtImporto } from '@/modules/gare/stati'
import { GaraDialog } from '@/modules/gare/dialogs/GaraDialog'
import { ScadenzeModuliSection } from '@/components/ScadenzeModuliSection'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StoricoSection } from '@/components/StoricoSection'
import { TabChiarimenti } from '@/modules/gare/dettaglio/tab-chiarimenti'
import { TabOfferta } from '@/modules/gare/dettaglio/tab-offerta'
import { TabPanoramica } from '@/modules/gare/dettaglio/tab-panoramica'
import { TabRequisiti } from '@/modules/gare/dettaglio/tab-requisiti'
import { TabTeam } from '@/modules/gare/dettaglio/tab-team'
import { TabValutazione } from '@/modules/gare/dettaglio/tab-valutazione'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TimelineSection } from '@/components/TimelineSection'
import { toast } from 'sonner'
import { useGara, useMoveGaraStato, type GaraStato } from '@/modules/gare/queries/gare'
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'

// Criteri Go/No-Go suggeriti (documento §3)
// ── Pagina ───────────────────────────────────────────────────────
export function GaraDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: gara, isLoading } = useGara(id)
  const move = useMoveGaraStato()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <AttesaCentrata className="py-20" />
  }
  if (!gara) return <p className="text-sm text-muted-foreground">Gara non trovata (o modulo non attivo).</p>

  const st = statoGara(gara.stato)

  return (
    <div className="mx-auto max-w-6xl">
      <button onClick={() => navigate('/gare')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Gare
      </button>

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-muted-foreground">{gara.codice}</p>
            <h1 className="mt-0.5 text-headline text-foreground">{gara.titolo}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {gara.ente?.ragione_sociale ?? gara.ente_appaltante ?? 'Ente non indicato'}
              </span>
              <span className="font-semibold text-foreground">{fmtImporto(Number(gara.importo_base))}</span>
              {gara.termine_presentazione && ['in_analisi', 'in_preparazione'].includes(gara.stato) && (
                <span>termine: {new Date(gara.termine_presentazione).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span>
              )}
              {gara.responsabile && (
                <span>resp. {gara.responsabile.nome} {gara.responsabile.cognome ?? ''}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={st.tone} className="text-sm">{st.label}</Badge>
            <Select value={gara.stato}
              onValueChange={(v) => move.mutate({ id: gara.id, stato: v as GaraStato }, {
                onError: (e) => toast.error((e as Error).message),
              })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GARA_STATI.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Modifica
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="panoramica">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="panoramica">Panoramica</TabsTrigger>
          <TabsTrigger value="valutazione">Go/No-Go</TabsTrigger>
          <TabsTrigger value="requisiti">Requisiti</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="chiarimenti">Chiarimenti</TabsTrigger>
          <TabsTrigger value="offerta">Offerta</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger value="scadenze">Scadenze</TabsTrigger>
          <TabsTrigger value="attivita">Attività</TabsTrigger>
          <TabsTrigger value="commenti">Commenti</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>
        <TabsContent value="panoramica" className="mt-4"><TabPanoramica gara={gara} /></TabsContent>
        <TabsContent value="valutazione" className="mt-4"><TabValutazione gara={gara} /></TabsContent>
        <TabsContent value="requisiti" className="mt-4"><TabRequisiti gara={gara} /></TabsContent>
        <TabsContent value="team" className="mt-4"><TabTeam gara={gara} /></TabsContent>
        <TabsContent value="chiarimenti" className="mt-4"><TabChiarimenti gara={gara} /></TabsContent>
        <TabsContent value="offerta" className="mt-4"><TabOfferta gara={gara} /></TabsContent>
        <TabsContent value="documenti" className="mt-4">
          <AllegatiSection entita="gare" entitaId={gara.id}
            categorie={['Documentazione di gara', 'Documentazione aziendale', 'Offerta']} />
        </TabsContent>
        <TabsContent value="scadenze" className="mt-4">
          <ScadenzeModuliSection modulo="gare" entita="gare" entitaId={gara.id}
            tipi={['Cauzione', 'Polizza', 'Validità offerta', 'Firma contratto', 'Avvio lavori', 'Adempimento', 'Altro']}
            azioneUrl={`/gare/${gara.id}`} />
        </TabsContent>
        <TabsContent value="attivita" className="mt-4">
          <TimelineSection scope={{ gara_id: gara.id }} />
        </TabsContent>
        <TabsContent value="commenti" className="mt-4">
          <FeedSection target={{ entita: 'gare', entitaId: gara.id }} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="gare" entitaId={gara.id} />
        </TabsContent>
      </Tabs>

      <GaraDialog open={editOpen} onOpenChange={setEditOpen} gara={gara} />
    </div>
  )
}
