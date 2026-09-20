import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { COSTO_VOCE_LABEL, fmtImporto, fmtData } from '@/modules/automezzi/stati'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useFigliAutomezzo, useCreaFiglioAutomezzo, useEliminaFiglioAutomezzo, type Automezzo, type AutomezzoCosto } from '@/modules/automezzi/queries/automezzi'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card } from '@/modules/automezzi/dettaglio/comuni'

export // ── Costi (manager) ──────────────────────────────────────────────
function TabCosti({ mezzo }: { mezzo: Automezzo }) {
  const { isManager } = useAuth()
  const { data: costi = [] } = useFigliAutomezzo<AutomezzoCosto>(mezzo.id, 'automezzi_costi')
  const crea = useCreaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [voce, setVoce] = useState('assicurazione')
  const [descrizione, setDescrizione] = useState('')
  const [importo, setImporto] = useState('')

  if (!isManager) {
    return (
      <div className={card}>
        <p className="text-sm text-muted-foreground">
          I costi analitici del mezzo sono riservati ad admin e manager.
        </p>
      </div>
    )
  }

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Costi analitici (riservato)</h3>
      <p className="mb-2 text-xs text-muted-foreground">
        Carburante e manutenzioni si sommano da soli: qui le voci fisse (assicurazione, bollo, leasing, pedaggi…).
      </p>
      {costi.map((c) => (
        <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Badge tone="neutral">{COSTO_VOCE_LABEL[c.voce]}</Badge>
          <span className="flex-1 text-foreground">{c.descrizione}</span>
          <span className="font-medium text-foreground">{fmtImporto(Number(c.importo))}</span>
          <span className="text-xs text-muted-foreground">{fmtData(c.data)}</span>
          <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_costi', id: c.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          const imp = Number(importo)
          if (!descrizione.trim() || !importo || Number.isNaN(imp)) {
            toast.error('Descrizione e importo obbligatori'); return
          }
          crea.mutate({
            automezzoId: mezzo.id, tabella: 'automezzi_costi',
            values: { voce, descrizione: descrizione.trim(), importo: imp },
          }, {
            onSuccess: () => { setDescrizione(''); setImporto('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="w-40 space-y-1">
          <Label>Voce</Label>
          <Select value={voce} onValueChange={setVoce}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(COSTO_VOCE_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-36 flex-1 space-y-1">
          <Label>Descrizione</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
        </div>
        <div className="w-32 space-y-1">
          <Label>Importo (€)</Label>
          <Input type="number" step="0.01" value={importo} onChange={(e) => setImporto(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}
