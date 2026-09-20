import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { fmtImporto, fmtData } from '@/modules/agenti/stati'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useFigliAgente, useCreaFiglioAgente, useEliminaFiglioAgente, type Agente, type AgenteMandato } from '@/modules/agenti/queries/agenti'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card } from '@/modules/agenti/dettaglio/comuni'

export // ── Mandati (manager; l'agente li vede) ──────────────────────────
function TabMandati({ agente }: { agente: Agente }) {
  const { isManager } = useAuth()
  const { data: mandati = [] } = useFigliAgente<AgenteMandato>(agente.id, 'agenti_mandati')
  const crea = useCreaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const [descrizione, setDescrizione] = useState('')
  const [zone, setZone] = useState('')
  const [fine, setFine] = useState('')
  const [esclusiva, setEsclusiva] = useState(false)
  const [prodotti, setProdotti] = useState('')
  const [obiettivoAnnuo, setObiettivoAnnuo] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Mandati e contratti</h3>
      {mandati.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          Registra i mandati: alla scadenza parte il promemoria di rinnovo automatico.
        </p>
      )}
      {mandati.map((m) => (
        <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              {m.descrizione}{m.esclusiva && <Badge tone="primary" className="ml-2">Esclusiva</Badge>}
            </p>
            <p className="text-xs text-muted-foreground">
              {[m.zone, m.prodotti].filter(Boolean).join(' · ')}
              {' · '}dal {fmtData(m.data_inizio)}{m.data_fine ? ` al ${fmtData(m.data_fine)}` : ''}
            </p>
          </div>
          {m.obiettivo_annuo != null && (
            <span className="text-xs text-muted-foreground">obiettivo {fmtImporto(Number(m.obiettivo_annuo))}</span>
          )}
          {isManager && (
            <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_mandati', id: m.id })} />
          )}
        </div>
      ))}
      {isManager && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!descrizione.trim()) { toast.error('Descrivi il mandato'); return }
            crea.mutate({
              agenteId: agente.id, tabella: 'agenti_mandati',
              values: {
                descrizione: descrizione.trim(), zone: zone.trim() || null, data_fine: fine || null,
                esclusiva, prodotti: prodotti.trim() || null,
                obiettivo_annuo: obiettivoAnnuo === '' ? null : Number(obiettivoAnnuo),
              },
            }, {
              onSuccess: () => {
                setDescrizione(''); setZone(''); setFine(''); setEsclusiva(false)
                setProdotti(''); setObiettivoAnnuo('')
              },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Mandato</Label>
            <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Es. Mandato linea industriale" />
          </div>
          <div className="w-32 space-y-1">
            <Label>Zone</Label>
            <Input value={zone} onChange={(e) => setZone(e.target.value)} />
          </div>
          <div className="w-40 space-y-1">
            <Label>Prodotti assegnati</Label>
            <Input value={prodotti} onChange={(e) => setProdotti(e.target.value)} />
          </div>
          <div className="w-32 space-y-1">
            <Label>Obiettivo annuo (€)</Label>
            <Input type="number" step="0.01" value={obiettivoAnnuo}
              onChange={(e) => setObiettivoAnnuo(e.target.value)} />
          </div>
          <div className="w-36 space-y-1">
            <Label>Fine</Label>
            <Input type="date" value={fine} onChange={(e) => setFine(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
            <Checkbox checked={esclusiva} onCheckedChange={(v) => setEsclusiva(v === true)} />
            Esclusiva
          </label>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      )}
    </div>
  )
}
