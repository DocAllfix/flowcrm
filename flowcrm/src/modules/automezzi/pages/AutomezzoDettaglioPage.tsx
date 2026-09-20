import { fmtKm } from '@/modules/automezzi/dettaglio/comuni'
import { AUTOMEZZO_STATI, statoAutomezzo, CATEGORIA_LABEL, AUTOMEZZO_TIPI_SCADENZA } from '@/modules/automezzi/stati'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { ArrowLeft, Pencil } from 'lucide-react'
import { AttesaCentrata } from '@/components/ui/spinner'
import { AutomezzoDialog } from '@/modules/automezzi/dialogs/AutomezzoDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FeedSection } from '@/components/FeedSection'
import { ScadenzeModuliSection } from '@/components/ScadenzeModuliSection'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StoricoSection } from '@/components/StoricoSection'
import { TabAssegnazioni } from '@/modules/automezzi/dettaglio/tab-assegnazioni'
import { TabCosti } from '@/modules/automezzi/dettaglio/tab-costi'
import { TabManutenzioni } from '@/modules/automezzi/dettaglio/tab-manutenzioni'
import { TabPanoramica } from '@/modules/automezzi/dettaglio/tab-panoramica'
import { TabPneumaticiAttrezzature } from '@/modules/automezzi/dettaglio/tab-pneumatici-attrezzature'
import { TabRifornimenti } from '@/modules/automezzi/dettaglio/tab-rifornimenti'
import { TabSinistriMulte } from '@/modules/automezzi/dettaglio/tab-sinistri-multe'
import { TabUtilizzi } from '@/modules/automezzi/dettaglio/tab-utilizzi'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useAutomezzo, useUpdateAutomezzo, type AutomezzoStato } from '@/modules/automezzi/queries/automezzi'
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'













// ── Pagina ───────────────────────────────────────────────────────
export function AutomezzoDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: mezzo, isLoading } = useAutomezzo(id)
  const update = useUpdateAutomezzo()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <AttesaCentrata className="py-20" />
  }
  if (!mezzo) return <p className="text-sm text-muted-foreground">Mezzo non trovato (o modulo non attivo).</p>

  const st = statoAutomezzo(mezzo.stato)

  return (
    <div className="mx-auto max-w-6xl">
      <button onClick={() => navigate('/automezzi')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Parco automezzi
      </button>

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-muted-foreground">
              {mezzo.codice}{mezzo.targa ? ` · ${mezzo.targa}` : ''}
            </p>
            <h1 className="mt-0.5 text-headline text-foreground">
              {mezzo.marca} {mezzo.modello}{mezzo.versione ? ` ${mezzo.versione}` : ''}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{CATEGORIA_LABEL[mezzo.categoria]}</span>
              <span>{fmtKm(mezzo.km_attuali)}</span>
              {mezzo.centro_costo && <span>{mezzo.centro_costo}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={st.tone} className="text-sm">{st.label}</Badge>
            <Select value={mezzo.stato}
              onValueChange={(v) => update.mutate({ id: mezzo.id, values: { stato: v as AutomezzoStato } }, {
                onError: (e) => toast.error((e as Error).message),
              })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUTOMEZZO_STATI.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
          <TabsTrigger value="assegnazioni">Assegnazioni</TabsTrigger>
          <TabsTrigger value="manutenzioni">Manutenzioni</TabsTrigger>
          <TabsTrigger value="rifornimenti">Rifornimenti</TabsTrigger>
          <TabsTrigger value="utilizzi">Utilizzi</TabsTrigger>
          <TabsTrigger value="sinistri">Sinistri e multe</TabsTrigger>
          <TabsTrigger value="pneumatici">Pneumatici e attrezzature</TabsTrigger>
          <TabsTrigger value="costi">Costi</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger value="scadenze">Scadenze</TabsTrigger>
          <TabsTrigger value="commenti">Commenti</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>
        <TabsContent value="panoramica" className="mt-4"><TabPanoramica mezzo={mezzo} /></TabsContent>
        <TabsContent value="assegnazioni" className="mt-4"><TabAssegnazioni mezzo={mezzo} /></TabsContent>
        <TabsContent value="manutenzioni" className="mt-4"><TabManutenzioni mezzo={mezzo} /></TabsContent>
        <TabsContent value="rifornimenti" className="mt-4"><TabRifornimenti mezzo={mezzo} /></TabsContent>
        <TabsContent value="utilizzi" className="mt-4"><TabUtilizzi mezzo={mezzo} /></TabsContent>
        <TabsContent value="sinistri" className="mt-4"><TabSinistriMulte mezzo={mezzo} /></TabsContent>
        <TabsContent value="pneumatici" className="mt-4"><TabPneumaticiAttrezzature mezzo={mezzo} /></TabsContent>
        <TabsContent value="costi" className="mt-4"><TabCosti mezzo={mezzo} /></TabsContent>
        <TabsContent value="documenti" className="mt-4">
          <AllegatiSection entita="automezzi" entitaId={mezzo.id}
            categorie={['Circolazione', 'Proprietà', 'Assicurazione', 'Contratti', 'Manuali', 'Altro']} />
        </TabsContent>
        <TabsContent value="scadenze" className="mt-4">
          <ScadenzeModuliSection modulo="automezzi" entita="automezzi" entitaId={mezzo.id}
            tipi={AUTOMEZZO_TIPI_SCADENZA} azioneUrl={`/automezzi/${mezzo.id}`} />
        </TabsContent>
        <TabsContent value="commenti" className="mt-4">
          <FeedSection target={{ entita: 'automezzi', entitaId: mezzo.id }} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="automezzi" entitaId={mezzo.id} />
        </TabsContent>
      </Tabs>

      <AutomezzoDialog open={editOpen} onOpenChange={setEditOpen} automezzo={mezzo} />
    </div>
  )
}
