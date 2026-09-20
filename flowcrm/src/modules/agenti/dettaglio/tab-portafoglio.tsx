import { ApprovalSection } from '@/components/ApprovalSection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Link } from 'react-router-dom'
import { Plus, Building2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtData } from '@/modules/agenti/stati'
import { toast } from 'sonner'
import { useFigliAgente, useCreaFiglioAgente, useEliminaFiglioAgente, type Agente, type AgenteCliente } from '@/modules/agenti/queries/agenti'
import { useOrganizzazioni } from '@/lib/queries/organizzazioni'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card } from '@/modules/agenti/dettaglio/comuni'

export // ── Portafoglio clienti ──────────────────────────────────────────
function TabPortafoglio({ agente }: { agente: Agente }) {
  const { data: clienti = [] } = useFigliAgente<AgenteCliente>(agente.id, 'agenti_clienti')
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const crea = useCreaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const [orgId, setOrgId] = useState('')
  const [classificazione, setClassificazione] = useState('B')

  const disponibili = organizzazioni.filter(
    (o) => !clienti.some((c) => c.organizzazione_id === o.id)
  )

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Portafoglio clienti</h3>
        {clienti.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            {c.organizzazione ? (
              <Link to={`/organizzazioni/${c.organizzazione.id}`}
                className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-primary-testo">
                {c.organizzazione.ragione_sociale}
              </Link>
            ) : <span className="flex-1">—</span>}
            {c.classificazione && <Badge tone="neutral">Classe {c.classificazione}</Badge>}
            <span className="text-xs text-muted-foreground">dal {fmtData(c.dal)}</span>
            <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_clienti', id: c.id })} />
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!orgId) { toast.error('Scegli il cliente'); return }
            crea.mutate({
              agenteId: agente.id, tabella: 'agenti_clienti',
              values: { organizzazione_id: orgId, classificazione },
            }, { onSuccess: () => setOrgId(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-48 flex-1 space-y-1">
            <Label>Cliente</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue placeholder="Organizzazione…" /></SelectTrigger>
              <SelectContent>
                {disponibili.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1">
            <Label>Classe</Label>
            <Select value={classificazione} onValueChange={setClassificazione}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['A', 'B', 'C'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Assegna</Button>
        </form>
      </div>

      <ApprovalSection
        modulo="agenti" entita="agenti" entitaId={agente.id}
        tipiRichiesta={[
          { value: 'riassegnazione_portafoglio', label: 'Riassegnazione portafoglio' },
          { value: 'sconto_oltre_soglia', label: 'Sconto oltre soglia' },
          { value: 'deroga_commerciale', label: 'Deroga commerciale' },
          { value: 'liquidazione_provvigioni', label: 'Liquidazione provvigioni' },
          { value: 'nuovo_mandato', label: 'Nuovo mandato / rinnovo' },
        ]}
        azioneUrl={`/agenti/${agente.id}`}
      />
    </div>
  )
}
