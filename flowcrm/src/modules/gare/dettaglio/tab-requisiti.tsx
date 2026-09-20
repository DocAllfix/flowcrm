import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useGaraRequisiti, useCreaFiglioGara, useAggiornaFiglioGara, useEliminaFiglioGara, type Gara, type GaraRequisitoTipo } from '@/modules/gare/queries/gare'
import { useState, type FormEvent } from 'react'
import { card, REQUISITO_TIPI } from '@/modules/gare/dettaglio/comuni'

export // ── Requisiti ────────────────────────────────────────────────────
function TabRequisiti({ gara }: { gara: Gara }) {
  const { data: requisiti = [] } = useGaraRequisiti(gara.id)
  const crea = useCreaFiglioGara()
  const aggiorna = useAggiornaFiglioGara()
  const elimina = useEliminaFiglioGara()
  const [tipo, setTipo] = useState<GaraRequisitoTipo>('generale')
  const [descrizione, setDescrizione] = useState('')

  const soddisfatti = requisiti.filter((r) => r.soddisfatto).length
  const pct = requisiti.length ? Math.round((soddisfatti / requisiti.length) * 100) : 0

  async function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!descrizione.trim()) { toast.error('Descrivi il requisito'); return }
    try {
      await crea.mutateAsync({
        garaId: gara.id, tabella: 'gare_requisiti',
        values: { tipo, descrizione: descrizione.trim() },
      })
      setDescrizione('')
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Requisiti di partecipazione</h3>
        {requisiti.length > 0 && (
          <div className="flex items-center gap-2">
            <Progress value={pct} etichetta="Requisiti soddisfatti" tono="success" className="w-32" />
            <span className="text-xs font-medium text-muted-foreground">{soddisfatti}/{requisiti.length}</span>
          </div>
        )}
      </div>

      {requisiti.map((r) => (
        <div key={r.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Checkbox
            checked={r.soddisfatto}
            onCheckedChange={(v) => aggiorna.mutate({
              garaId: gara.id, tabella: 'gare_requisiti', id: r.id,
              values: { soddisfatto: v === true },
            })}
          />
          <span className={r.soddisfatto ? 'flex-1 text-muted-foreground line-through' : 'flex-1 text-foreground'}>
            {r.descrizione}
          </span>
          <Badge tone="neutral">{REQUISITO_TIPI.find((t) => t.value === r.tipo)?.label ?? r.tipo}</Badge>
          <button
            onClick={() => elimina.mutate({ garaId: gara.id, tabella: 'gare_requisiti', id: r.id })}
            className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <form onSubmit={handleAggiungi} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="w-52 space-y-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as GaraRequisitoTipo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REQUISITO_TIPI.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-56 flex-1 space-y-1">
          <Label>Requisito</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Es. Fatturato minimo triennio € 1M" />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
      </form>
    </div>
  )
}
