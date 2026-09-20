import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, MapPin } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { VISITA_ESITO } from '@/modules/agenti/stati'
import { toast } from 'sonner'
import { useFigliAgente, useCreaFiglioAgente, useEliminaFiglioAgente, type Agente, type AgenteVisita } from '@/modules/agenti/queries/agenti'
import { useOrganizzazioni } from '@/lib/queries/organizzazioni'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card } from '@/modules/agenti/dettaglio/comuni'

export // ── Visite ───────────────────────────────────────────────────────
function TabVisite({ agente }: { agente: Agente }) {
  const { data: visite = [] } = useFigliAgente<AgenteVisita>(agente.id, 'agenti_visite')
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const crea = useCreaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const [orgId, setOrgId] = useState('')
  const [esito, setEsito] = useState('positivo')
  const [argomenti, setArgomenti] = useState('')
  const [referenti, setReferenti] = useState('')
  const [opportunita, setOpportunita] = useState('')
  const [criticita, setCriticita] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Rapporti visita</h3>
      {visite.map((v) => {
        const es = VISITA_ESITO[v.esito] ?? VISITA_ESITO.neutro
        return (
          <div key={v.id} className="border-b border-border py-2 text-sm last:border-0">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {v.organizzazione?.ragione_sociale ?? '—'}
              </span>
              <Badge tone={es.tone}>{es.label}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(v.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
              <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_visite', id: v.id })} />
            </div>
            {v.argomenti && <p className="mt-0.5 text-xs text-muted-foreground">{v.argomenti}</p>}
            {v.referenti && <p className="mt-0.5 text-xs text-muted-foreground">Referenti: {v.referenti}</p>}
            {v.opportunita && <p className="mt-0.5 text-xs text-success">Opportunità: {v.opportunita}</p>}
            {v.criticita && <p className="mt-0.5 text-xs text-warning-foreground">Criticità: {v.criticita}</p>}
          </div>
        )
      })}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!orgId) { toast.error('Scegli il cliente visitato'); return }
          crea.mutate({
            agenteId: agente.id, tabella: 'agenti_visite',
            values: {
              organizzazione_id: orgId, esito, argomenti: argomenti.trim() || null,
              referenti: referenti.trim() || null,
              opportunita: opportunita.trim() || null,
              criticita: criticita.trim() || null,
            },
          }, {
            onSuccess: () => { setArgomenti(''); setReferenti(''); setOpportunita(''); setCriticita('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="min-w-40 flex-1 space-y-1">
          <Label>Cliente</Label>
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger><SelectValue placeholder="Organizzazione…" /></SelectTrigger>
            <SelectContent>
              {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36 space-y-1">
          <Label>Esito</Label>
          <Select value={esito} onValueChange={setEsito}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(VISITA_ESITO).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-36 flex-1 space-y-1">
          <Label>Argomenti</Label>
          <Input value={argomenti} onChange={(e) => setArgomenti(e.target.value)} />
        </div>
        <div className="w-40 space-y-1">
          <Label>Referenti incontrati</Label>
          <Input value={referenti} onChange={(e) => setReferenti(e.target.value)} />
        </div>
        <div className="w-40 space-y-1">
          <Label>Opportunità</Label>
          <Input value={opportunita} onChange={(e) => setOpportunita(e.target.value)} />
        </div>
        <div className="w-40 space-y-1">
          <Label>Criticità</Label>
          <Input value={criticita} onChange={(e) => setCriticita(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Registra</Button>
      </form>
    </div>
  )
}
