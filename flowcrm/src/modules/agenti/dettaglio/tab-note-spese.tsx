import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NOTA_SPESE_TIPO, NOTA_SPESE_STATO, fmtImporto, fmtData } from '@/modules/agenti/stati'
import { Plus, Receipt } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useFigliAgente, useCreaFiglioAgente, useAggiornaFiglioAgente, useEliminaFiglioAgente, type Agente, type AgenteNotaSpese } from '@/modules/agenti/queries/agenti'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card } from '@/modules/agenti/dettaglio/comuni'

export // ── Note spese ───────────────────────────────────────────────────
function TabNoteSpese({ agente }: { agente: Agente }) {
  const { isManager } = useAuth()
  const { data: note = [] } = useFigliAgente<AgenteNotaSpese>(agente.id, 'agenti_note_spese')
  const crea = useCreaFiglioAgente()
  const aggiorna = useAggiornaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const [tipo, setTipo] = useState('carburante')
  const [descrizione, setDescrizione] = useState('')
  const [importo, setImporto] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-1 text-sm font-semibold text-foreground">Note spese</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Le ricevute si allegano nei Documenti. Solo admin e manager approvano.
      </p>
      {note.map((n) => {
        const st = NOTA_SPESE_STATO[n.stato] ?? NOTA_SPESE_STATO.presentata
        return (
          <div key={n.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{n.descrizione}</p>
              <p className="text-xs text-muted-foreground">{NOTA_SPESE_TIPO[n.tipo]} · {fmtData(n.data)}</p>
            </div>
            <span className="font-medium text-foreground">{fmtImporto(Number(n.importo))}</span>
            <Badge tone={st.tone}>{st.label}</Badge>
            {isManager && n.stato === 'presentata' && (
              <>
                <Button size="sm" variant="outline" className="text-xs"
                  onClick={() => aggiorna.mutate({
                    agenteId: agente.id, tabella: 'agenti_note_spese', id: n.id,
                    values: { stato: 'approvata' },
                  })}>
                  Approva
                </Button>
                <Button size="sm" variant="ghost" className="text-xs text-destructive"
                  onClick={() => aggiorna.mutate({
                    agenteId: agente.id, tabella: 'agenti_note_spese', id: n.id,
                    values: { stato: 'rifiutata' },
                  })}>
                  Rifiuta
                </Button>
              </>
            )}
            {isManager && n.stato === 'approvata' && (
              <Button size="sm" variant="ghost" className="text-xs"
                onClick={() => aggiorna.mutate({
                  agenteId: agente.id, tabella: 'agenti_note_spese', id: n.id,
                  values: { stato: 'rimborsata' },
                })}>
                Segna rimborsata
              </Button>
            )}
            <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_note_spese', id: n.id })} />
          </div>
        )
      })}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          const imp = Number(importo)
          if (!descrizione.trim() || !importo || Number.isNaN(imp)) {
            toast.error('Descrizione e importo obbligatori'); return
          }
          crea.mutate({
            agenteId: agente.id, tabella: 'agenti_note_spese',
            values: { tipo, descrizione: descrizione.trim(), importo: imp },
          }, {
            onSuccess: () => { setDescrizione(''); setImporto('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="w-36 space-y-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(NOTA_SPESE_TIPO).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-36 flex-1 space-y-1">
          <Label>Descrizione</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label>Importo (€)</Label>
          <Input type="number" step="0.01" value={importo} onChange={(e) => setImporto(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Presenta</Button>
      </form>
    </div>
  )
}
