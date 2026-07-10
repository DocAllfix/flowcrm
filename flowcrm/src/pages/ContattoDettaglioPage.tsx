import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Pencil, Mail, Phone, Building2 } from 'lucide-react'
import { useContatto } from '@/lib/queries/contatti'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { StoricoSection } from '@/components/StoricoSection'
import { ContattoDialog } from '@/features/contatti/ContattoDialog'

export function ContattoDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: c, isLoading } = useContatto(id)
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!c) return <p className="text-sm text-muted-foreground">Contatto non trovato.</p>

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate('/contatti')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Contatti
      </button>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-lg font-semibold text-white">
              {(c.nome[0] ?? '')}{(c.cognome?.[0] ?? '')}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{c.nome} {c.cognome ?? ''}</h1>
              {c.ruolo_aziendale && <p className="text-sm text-muted-foreground">{c.ruolo_aziendale}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {c.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{c.email}</span>}
                {c.telefono && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{c.telefono}</span>}
                {c.organizzazione && (
                  <Link to={`/organizzazioni/${c.organizzazione.id}`} className="flex items-center gap-1.5 hover:text-primary">
                    <Building2 className="h-3.5 w-3.5" />{c.organizzazione.ragione_sociale}
                  </Link>
                )}
              </div>
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
          <AllegatiSection entita="contatti" entitaId={c.id} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="contatti" entitaId={c.id} />
        </TabsContent>
      </Tabs>

      <ContattoDialog open={editOpen} onOpenChange={setEditOpen} contatto={c} />
    </div>
  )
}
