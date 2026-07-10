import { useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Pencil, Mail, Phone, Plus, Check, Trash2, Plane, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import {
  useDipendente, useAssenze, useCreateAssenza, useSetAssenzaStato, useDeleteAssenza,
  useFormazione, useCreateFormazione, useToggleFormazione, useDeleteFormazione,
  type Assenza,
} from '@/lib/queries/hr'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DipendenteDialog } from '@/features/hr/DipendenteDialog'

const STATO_TONE = { richiesta: 'warning', approvata: 'success', rifiutata: 'danger' } as const
const TIPO_LABEL: Record<string, string> = { ferie: 'Ferie', permesso: 'Permesso', malattia: 'Malattia' }

export function DipendenteDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: d, isLoading } = useDipendente(id)
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!d) return <p className="text-sm text-muted-foreground">Dipendente non trovato.</p>

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate('/personale')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Personale
      </button>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{d.nome} {d.cognome ?? ''}</h1>
            {d.qualifica && <p className="text-sm text-muted-foreground">{d.qualifica}</p>}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {d.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{d.email}</span>}
              {d.telefono && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{d.telefono}</span>}
              {d.tipo_contratto && <Badge tone="info">{d.tipo_contratto}</Badge>}
              {d.data_assunzione && <span>Dal {new Date(d.data_assunzione).toLocaleDateString('it-IT')}</span>}
            </div>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Modifica</Button>
        </div>
      </div>

      <Tabs defaultValue="assenze">
        <TabsList>
          <TabsTrigger value="assenze">Ferie e permessi</TabsTrigger>
          <TabsTrigger value="formazione">Formazione</TabsTrigger>
        </TabsList>
        <TabsContent value="assenze" className="mt-4"><AssenzeSection dipId={d.id} /></TabsContent>
        <TabsContent value="formazione" className="mt-4"><FormazioneSection dipId={d.id} /></TabsContent>
      </Tabs>

      <DipendenteDialog open={editOpen} onOpenChange={setEditOpen} dipendente={d} />
    </div>
  )
}

function AssenzeSection({ dipId }: { dipId: string }) {
  const { isAdmin } = useAuth()
  const { data: assenze = [] } = useAssenze(dipId)
  const create = useCreateAssenza()
  const setStato = useSetAssenzaStato()
  const del = useDeleteAssenza()
  const [tipo, setTipo] = useState<Assenza['tipo']>('ferie')
  const [inizio, setInizio] = useState('')
  const [fine, setFine] = useState('')

  async function aggiungi(e: FormEvent) {
    e.preventDefault()
    if (!inizio || !fine) { toast.error('Indica le date'); return }
    try {
      await create.mutateAsync({ dipendente_id: dipId, tipo, data_inizio: inizio, data_fine: fine })
      setInizio(''); setFine('')
    } catch (err) { toast.error((err as Error)?.message ?? 'Errore') }
  }

  return (
    <div className="space-y-4">
      {assenze.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {assenze.map((a) => (
            <li key={a.id} className="flex items-center gap-3 p-3">
              <Plane className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">{TIPO_LABEL[a.tipo]}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(a.data_inizio).toLocaleDateString('it-IT')} → {new Date(a.data_fine).toLocaleDateString('it-IT')}
                </span>
              </div>
              <Badge tone={STATO_TONE[a.stato]}>{a.stato}</Badge>
              {a.stato === 'richiesta' && (
                <>
                  <button onClick={() => setStato.mutate({ id: a.id, stato: 'approvata', dipendente_id: dipId })}
                    className="text-success hover:opacity-70" aria-label="Approva"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setStato.mutate({ id: a.id, stato: 'rifiutata', dipendente_id: dipId })}
                    className="text-destructive hover:opacity-70" aria-label="Rifiuta">✕</button>
                </>
              )}
              {isAdmin && (
                <button onClick={() => del.mutate({ id: a.id, dipendente_id: dipId })}
                  className="text-muted-foreground hover:text-destructive" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={aggiungi} className="flex flex-wrap items-end gap-2">
        <Select value={tipo} onValueChange={(v) => setTipo(v as Assenza['tipo'])}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ferie">Ferie</SelectItem>
            <SelectItem value="permesso">Permesso</SelectItem>
            <SelectItem value="malattia">Malattia</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={inizio} onChange={(e) => setInizio(e.target.value)} className="w-40" />
        <Input type="date" value={fine} onChange={(e) => setFine(e.target.value)} className="w-40" />
        <Button type="submit" disabled={create.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
      </form>
    </div>
  )
}

function FormazioneSection({ dipId }: { dipId: string }) {
  const { isAdmin } = useAuth()
  const { data: corsi = [] } = useFormazione(dipId)
  const create = useCreateFormazione()
  const toggle = useToggleFormazione()
  const del = useDeleteFormazione()
  const [corso, setCorso] = useState('')
  const [data, setData] = useState('')
  const [ore, setOre] = useState('')

  async function aggiungi(e: FormEvent) {
    e.preventDefault()
    if (!corso.trim()) { toast.error('Indica il corso'); return }
    try {
      await create.mutateAsync({ dipendente_id: dipId, corso: corso.trim(), data: data || null, ore: ore ? Number(ore) : null })
      setCorso(''); setData(''); setOre('')
    } catch (err) { toast.error((err as Error)?.message ?? 'Errore') }
  }

  return (
    <div className="space-y-4">
      {corsi.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {corsi.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-3">
              <button onClick={() => toggle.mutate({ id: c.id, completato: !c.completato, dipendente_id: dipId })}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${c.completato ? 'border-success bg-success text-white' : 'border-border hover:border-primary'}`}
                aria-label={c.completato ? 'Da completare' : 'Completa'}>
                {c.completato && <Check className="h-3.5 w-3.5" />}
              </button>
              <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className={`flex-1 text-sm ${c.completato ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{c.corso}</span>
              {c.ore != null && <span className="text-xs text-muted-foreground">{c.ore}h</span>}
              {c.data && <span className="text-xs text-muted-foreground">{new Date(c.data).toLocaleDateString('it-IT')}</span>}
              {isAdmin && (
                <button onClick={() => del.mutate({ id: c.id, dipendente_id: dipId })}
                  className="text-muted-foreground hover:text-destructive" aria-label="Elimina"><Trash2 className="h-4 w-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={aggiungi} className="flex flex-wrap items-end gap-2">
        <Input value={corso} onChange={(e) => setCorso(e.target.value)} placeholder="Nome corso…" className="flex-1 min-w-40" />
        <Input type="number" min="0" step="0.5" value={ore} onChange={(e) => setOre(e.target.value)} placeholder="Ore" className="w-24" />
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-40" />
        <Button type="submit" disabled={create.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
      </form>
    </div>
  )
}
