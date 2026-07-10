import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Building2, Mail, Phone, MapPin, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useOrganizzazione, useDeleteOrganizzazione, RUOLO_LABEL, type OrgRuolo,
} from '@/lib/queries/organizzazioni'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useContatti } from '@/lib/queries/contatti'
import { useDealsByOrg } from '@/lib/queries/deals'
import { useFatturatoOrganizzazione } from '@/lib/queries/dashboard'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { StoricoSection } from '@/components/StoricoSection'
import { TimelineSection } from '@/components/TimelineSection'
import { FeedSection } from '@/components/FeedSection'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { OrganizzazioneDialog } from '@/features/organizzazioni/OrganizzazioneDialog'
import { ContattoDialog } from '@/features/contatti/ContattoDialog'

const RUOLO_TONE: Record<OrgRuolo, Parameters<typeof Badge>[0]['tone']> = {
  cliente: 'primary', fornitore: 'info', partner: 'purple',
  potenziale_partner: 'warning', prospect: 'neutral',
}

export function OrganizzazioneDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin, isManager } = useAuth()
  const { data: org, isLoading } = useOrganizzazione(id)
  const { data: contatti } = useContatti(id)
  const { data: dealsOrg = [] } = useDealsByOrg(id)
  const { data: fatturato = [] } = useFatturatoOrganizzazione(isManager ? id : undefined)
  const del = useDeleteOrganizzazione()
  const [editOpen, setEditOpen] = useState(false)
  const [contattoOpen, setContattoOpen] = useState(false)

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Caricamento…</div>
  }
  if (!org) {
    return (
      <EmptyState icon={Building2} title="Organizzazione non trovata"
        action={<Button variant="outline" onClick={() => navigate('/organizzazioni')}>Torna all'elenco</Button>} />
    )
  }

  async function handleDelete() {
    try {
      await del.mutateAsync(org!.id)
      toast.success('Organizzazione eliminata')
      navigate('/organizzazioni')
    } catch {
      toast.error('Impossibile eliminare')
    }
  }

  return (
    <div>
      <button onClick={() => navigate('/organizzazioni')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Organizzazioni
      </button>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{org.ragione_sociale}</h1>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {org.ruoli.map((r) => (
                <Badge key={r} tone={RUOLO_TONE[r]}>{RUOLO_LABEL[r]}</Badge>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {org.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{org.email}</span>}
              {org.telefono && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{org.telefono}</span>}
              {org.citta && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{org.citta}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Modifica
          </Button>
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminare {org.ragione_sociale}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    L'operazione è definitiva. I contatti collegati resteranno, senza organizzazione.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Tab 360° — deal/attività/allegati si popolano nelle fasi successive */}
      <Tabs defaultValue="panoramica">
        <TabsList>
          <TabsTrigger value="panoramica">Panoramica</TabsTrigger>
          <TabsTrigger value="contatti">Contatti ({contatti?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="attivita">Attività</TabsTrigger>
          <TabsTrigger value="commenti">Commenti</TabsTrigger>
          <TabsTrigger value="deal">Deal ({dealsOrg.length})</TabsTrigger>
          <TabsTrigger value="allegati">Allegati</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>

        <TabsContent value="panoramica" className="mt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoCard label="P.IVA" value={org.piva} />
            <InfoCard label="Settore" value={org.settore} />
            <InfoCard label="Indirizzo" value={[org.indirizzo, org.citta, org.provincia].filter(Boolean).join(', ') || null} />
            <InfoCard label="PEC" value={org.pec} />
          </div>
          {org.note && (
            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note</p>
              <p className="whitespace-pre-wrap text-sm text-foreground">{org.note}</p>
            </div>
          )}
          {isManager && org.ruoli.includes('cliente') && fatturato.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fatturato annuale</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={fatturato.map((r) => ({ anno: String(r.anno), totale: Number(r.totale) }))}>
                  <XAxis dataKey="anno" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip formatter={(v) => [new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v)), 'Fatturato']} />
                  <Bar dataKey="totale" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contatti" className="mt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => setContattoOpen(true)}>
              <Plus className="h-4 w-4" /> Aggiungi contatto
            </Button>
          </div>
          {(contatti?.length ?? 0) === 0 ? (
            <EmptyState icon={Building2} title="Nessun contatto"
              description="Aggiungi le persone di riferimento di questa organizzazione." />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {contatti!.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-semibold text-white">
                    {(c.nome[0] ?? '')}{(c.cognome?.[0] ?? '')}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{c.nome} {c.cognome ?? ''}</p>
                    <p className="text-xs text-muted-foreground">{c.ruolo_aziendale ?? c.email ?? ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deal" className="mt-4">
          {dealsOrg.length === 0 ? (
            <EmptyState icon={Building2} title="Nessun deal"
              description="Le offerte commerciali di questa organizzazione compariranno qui." />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {dealsOrg.map((d) => (
                <button key={d.id} onClick={() => navigate(`/deal/${d.id}`)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/30">
                  <span className="font-medium text-foreground">{d.nome}</span>
                  <span className="flex items-center gap-3">
                    {d.stage && (
                      <Badge className="text-white" style={{ backgroundColor: d.stage.colore ?? undefined }}>
                        {d.stage.nome}
                      </Badge>
                    )}
                    <span className="font-bold text-foreground">
                      {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(d.importo))}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attivita" className="mt-4">
          <TimelineSection scope={{ organizzazione_id: org.id }} />
        </TabsContent>

        <TabsContent value="commenti" className="mt-4">
          <FeedSection target={{ entita: 'organizzazioni', entitaId: org.id }} />
        </TabsContent>

        <TabsContent value="allegati" className="mt-4">
          <AllegatiSection entita="organizzazioni" entitaId={org.id} />
        </TabsContent>

        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="organizzazioni" entitaId={org.id} />
        </TabsContent>
      </Tabs>

      <OrganizzazioneDialog open={editOpen} onOpenChange={setEditOpen} organizzazione={org} />
      <ContattoDialog open={contattoOpen} onOpenChange={setContattoOpen} organizzazioneId={org.id} />
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value || '—'}</p>
    </div>
  )
}
