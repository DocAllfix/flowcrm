import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { ArrowLeft, Pencil, MapPin } from 'lucide-react'
import { AttesaCentrata } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CANTIERE_STATI, statoCantiere, fmtImporto, CANTIERE_CATEGORIE_DOC, CANTIERE_TIPI_SCADENZA } from '@/modules/cantiere/stati'
import { CantiereDialog } from '@/modules/cantiere/dialogs/CantiereDialog'
import { Card } from '@/components/ui/card'
import { FeedSection } from '@/components/FeedSection'
import { ScadenzeModuliSection } from '@/components/ScadenzeModuliSection'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StoricoSection } from '@/components/StoricoSection'
import { TabContabilita } from '@/modules/cantiere/dettaglio/tab-contabilita'
import { TabCronoprogramma } from '@/modules/cantiere/dettaglio/tab-cronoprogramma'
import { TabImprese } from '@/modules/cantiere/dettaglio/tab-imprese'
import { TabMezziMateriali } from '@/modules/cantiere/dettaglio/tab-mezzi-materiali'
import { TabPanoramica } from '@/modules/cantiere/dettaglio/tab-panoramica'
import { TabPersonale } from '@/modules/cantiere/dettaglio/tab-personale'
import { TabQualitaAmbiente } from '@/modules/cantiere/dettaglio/tab-qualita-ambiente'
import { TabRapportini } from '@/modules/cantiere/dettaglio/tab-rapportini'
import { TabSicurezza } from '@/modules/cantiere/dettaglio/tab-sicurezza'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TimelineSection } from '@/components/TimelineSection'
import { toast } from 'sonner'
import { useCantiere, useUpdateCantiere, type CantiereStato } from '@/modules/cantiere/queries/cantieri'
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
















// ── Pagina ───────────────────────────────────────────────────────
export function CantiereDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: cantiere, isLoading } = useCantiere(id)
  const update = useUpdateCantiere()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <AttesaCentrata className="py-20" />
  }
  if (!cantiere) return <p className="text-sm text-muted-foreground">Cantiere non trovato (o modulo non attivo).</p>

  const st = statoCantiere(cantiere.stato)

  return (
    <div className="mx-auto max-w-6xl">
      <button onClick={() => navigate('/cantieri')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Cantieri
      </button>

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-muted-foreground">{cantiere.codice}</p>
            <h1 className="mt-0.5 text-headline text-foreground">{cantiere.denominazione}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {(cantiere.indirizzo || cantiere.citta) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {[cantiere.indirizzo, cantiere.citta].filter(Boolean).join(', ')}
                </span>
              )}
              <span className="font-semibold text-foreground">{fmtImporto(Number(cantiere.importo_contrattuale))}</span>
              {cantiere.categoria_lavori && <span>{cantiere.categoria_lavori}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={st.tone} className="text-sm">{st.label}</Badge>
            <Select value={cantiere.stato}
              onValueChange={(v) => update.mutate({ id: cantiere.id, values: { stato: v as CantiereStato } }, {
                onError: (e) => toast.error((e as Error).message),
              })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CANTIERE_STATI.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
          <TabsTrigger value="cronoprogramma">Cronoprogramma</TabsTrigger>
          <TabsTrigger value="rapportini">Rapportini</TabsTrigger>
          <TabsTrigger value="personale">Personale</TabsTrigger>
          <TabsTrigger value="imprese">Imprese</TabsTrigger>
          <TabsTrigger value="mezzi">Mezzi e materiali</TabsTrigger>
          <TabsTrigger value="contabilita">Contabilità</TabsTrigger>
          <TabsTrigger value="sicurezza">Sicurezza</TabsTrigger>
          <TabsTrigger value="qualita">Qualità e ambiente</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger value="scadenze">Scadenze</TabsTrigger>
          <TabsTrigger value="attivita">Attività</TabsTrigger>
          <TabsTrigger value="commenti">Commenti</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>
        <TabsContent value="panoramica" className="mt-4"><TabPanoramica cantiere={cantiere} /></TabsContent>
        <TabsContent value="cronoprogramma" className="mt-4"><TabCronoprogramma cantiere={cantiere} /></TabsContent>
        <TabsContent value="rapportini" className="mt-4"><TabRapportini cantiere={cantiere} /></TabsContent>
        <TabsContent value="personale" className="mt-4"><TabPersonale cantiere={cantiere} /></TabsContent>
        <TabsContent value="imprese" className="mt-4"><TabImprese cantiere={cantiere} /></TabsContent>
        <TabsContent value="mezzi" className="mt-4"><TabMezziMateriali cantiere={cantiere} /></TabsContent>
        <TabsContent value="contabilita" className="mt-4"><TabContabilita cantiere={cantiere} /></TabsContent>
        <TabsContent value="sicurezza" className="mt-4"><TabSicurezza cantiere={cantiere} /></TabsContent>
        <TabsContent value="qualita" className="mt-4"><TabQualitaAmbiente cantiere={cantiere} /></TabsContent>
        <TabsContent value="documenti" className="mt-4">
          <AllegatiSection entita="cantieri" entitaId={cantiere.id} categorie={CANTIERE_CATEGORIE_DOC} />
        </TabsContent>
        <TabsContent value="scadenze" className="mt-4">
          <ScadenzeModuliSection modulo="cantiere" entita="cantieri" entitaId={cantiere.id}
            tipi={CANTIERE_TIPI_SCADENZA} azioneUrl={`/cantieri/${cantiere.id}`} />
        </TabsContent>
        <TabsContent value="attivita" className="mt-4">
          <TimelineSection scope={{ cantiere_id: cantiere.id }} />
        </TabsContent>
        <TabsContent value="commenti" className="mt-4">
          <FeedSection target={{ entita: 'cantieri', entitaId: cantiere.id }} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="cantieri" entitaId={cantiere.id} />
        </TabsContent>
      </Tabs>

      <CantiereDialog open={editOpen} onOpenChange={setEditOpen} cantiere={cantiere} />
    </div>
  )
}
