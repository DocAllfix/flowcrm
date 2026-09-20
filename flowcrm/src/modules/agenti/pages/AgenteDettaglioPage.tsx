import { AgenteDialog } from '@/modules/agenti/dialogs/AgenteDialog'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { ArrowLeft, Pencil } from 'lucide-react'
import { AttesaCentrata } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FeedSection } from '@/components/FeedSection'
import { ScadenzeModuliSection } from '@/components/ScadenzeModuliSection'
import { StoricoSection } from '@/components/StoricoSection'
import { TIPOLOGIA_LABEL, AGENTE_STATO } from '@/modules/agenti/stati'
import { TabMandati } from '@/modules/agenti/dettaglio/tab-mandati'
import { TabNoteSpese } from '@/modules/agenti/dettaglio/tab-note-spese'
import { TabObiettivi } from '@/modules/agenti/dettaglio/tab-obiettivi'
import { TabOfferteOrdini } from '@/modules/agenti/dettaglio/tab-offerte-ordini'
import { TabPanoramica } from '@/modules/agenti/dettaglio/tab-panoramica'
import { TabPortafoglio } from '@/modules/agenti/dettaglio/tab-portafoglio'
import { TabProvvigioni } from '@/modules/agenti/dettaglio/tab-provvigioni'
import { TabVisite } from '@/modules/agenti/dettaglio/tab-visite'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TimelineSection } from '@/components/TimelineSection'
import { useAgente, useAgenteCorrente } from '@/modules/agenti/queries/agenti'
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'













// ── Pagina ───────────────────────────────────────────────────────
export function AgenteDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: agente, isLoading } = useAgente(id)
  const { data: me } = useAgenteCorrente()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <AttesaCentrata className="py-20" />
  }
  if (!agente) return <p className="text-sm text-muted-foreground">Agente non trovato (o accesso non consentito).</p>

  const st = AGENTE_STATO[agente.stato] ?? AGENTE_STATO.attivo
  const sonoIo = me?.id === agente.id

  return (
    <div className="mx-auto max-w-6xl">
      {!sonoIo && (
        <button onClick={() => navigate('/agenti')}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Agenti
        </button>
      )}

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-muted-foreground">{agente.codice}</p>
            <h1 className="mt-0.5 text-headline text-foreground">
              {sonoIo ? `Il mio portale — ${agente.nome} ${agente.cognome ?? ''}` : `${agente.nome} ${agente.cognome ?? ''}`}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{TIPOLOGIA_LABEL[agente.tipologia]}</span>
              {agente.zone && <span>{agente.zone}</span>}
              {agente.email && <span>{agente.email}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={st.tone} className="text-sm">{st.label}</Badge>
            {!sonoIo && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Modifica
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="panoramica">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="panoramica">Panoramica</TabsTrigger>
          <TabsTrigger value="mandati">Mandati</TabsTrigger>
          <TabsTrigger value="portafoglio">Portafoglio</TabsTrigger>
          <TabsTrigger value="visite">Visite</TabsTrigger>
          <TabsTrigger value="offerte">Offerte e ordini</TabsTrigger>
          <TabsTrigger value="provvigioni">Provvigioni</TabsTrigger>
          <TabsTrigger value="obiettivi">Obiettivi</TabsTrigger>
          <TabsTrigger value="spese">Note spese</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger value="scadenze">Scadenze</TabsTrigger>
          <TabsTrigger value="attivita">Attività</TabsTrigger>
          <TabsTrigger value="commenti">Commenti</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>
        <TabsContent value="panoramica" className="mt-4"><TabPanoramica agente={agente} /></TabsContent>
        <TabsContent value="mandati" className="mt-4"><TabMandati agente={agente} /></TabsContent>
        <TabsContent value="portafoglio" className="mt-4"><TabPortafoglio agente={agente} /></TabsContent>
        <TabsContent value="visite" className="mt-4"><TabVisite agente={agente} /></TabsContent>
        <TabsContent value="offerte" className="mt-4"><TabOfferteOrdini agente={agente} /></TabsContent>
        <TabsContent value="provvigioni" className="mt-4"><TabProvvigioni agente={agente} /></TabsContent>
        <TabsContent value="obiettivi" className="mt-4"><TabObiettivi agente={agente} /></TabsContent>
        <TabsContent value="spese" className="mt-4"><TabNoteSpese agente={agente} /></TabsContent>
        <TabsContent value="documenti" className="mt-4">
          <AllegatiSection entita="agenti" entitaId={agente.id}
            categorie={['Contratti', 'Cataloghi e listini', 'Note spese', 'Formazione', 'Altro']} />
        </TabsContent>
        <TabsContent value="scadenze" className="mt-4">
          <ScadenzeModuliSection modulo="agenti" entita="agenti" entitaId={agente.id}
            tipi={['Rinnovo mandato', 'Obiettivo', 'Formazione', 'Documento', 'Altro']}
            azioneUrl={`/agenti/${agente.id}`} />
        </TabsContent>
        <TabsContent value="attivita" className="mt-4">
          <TimelineSection scope={{ agente_id: agente.id }} />
        </TabsContent>
        <TabsContent value="commenti" className="mt-4">
          <FeedSection target={{ entita: 'agenti', entitaId: agente.id }} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="agenti" entitaId={agente.id} />
        </TabsContent>
      </Tabs>

      <AgenteDialog open={editOpen} onOpenChange={setEditOpen} agente={agente} />
    </div>
  )
}
