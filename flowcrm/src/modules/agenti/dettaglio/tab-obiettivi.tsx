import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtImporto } from '@/modules/agenti/stati'
import { toast } from 'sonner'
import { useAgentiKpi, useFigliAgente, useCreaFiglioAgente, useEliminaFiglioAgente, type Agente, type AgenteObiettivo } from '@/modules/agenti/queries/agenti'
import { useAuth } from '@/hooks/useAuth'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card } from '@/modules/agenti/dettaglio/comuni'

export // ── Obiettivi ────────────────────────────────────────────────────
function TabObiettivi({ agente }: { agente: Agente }) {
  const { isManager } = useAuth()
  const { data: obiettivi = [] } = useFigliAgente<AgenteObiettivo>(agente.id, 'agenti_obiettivi')
  const { data: kpi = [] } = useAgentiKpi()
  const crea = useCreaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const [anno, setAnno] = useState(String(new Date().getFullYear()))
  const [mese, setMese] = useState('')
  const [importo, setImporto] = useState('')

  const venduto = Number(kpi.find((k) => k.agente_id === agente.id)?.valore_ordini ?? 0)

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Obiettivi commerciali</h3>
      {obiettivi.map((o) => {
        const pct = Number(o.importo_obiettivo) > 0
          ? Math.min(100, Math.round(venduto * 100 / Number(o.importo_obiettivo)))
          : 0
        return (
          <div key={o.id} className="border-b border-border py-2 last:border-0">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-foreground">
                {o.anno}{o.mese ? `-${String(o.mese).padStart(2, '0')}` : ''}
                {o.ambito ? ` · ${o.ambito}` : ''}
              </span>
              <span className="ml-auto text-muted-foreground">
                {fmtImporto(venduto)} / {fmtImporto(Number(o.importo_obiettivo))}
              </span>
              <Badge tone={pct >= 100 ? 'success' : pct >= 60 ? 'warning' : 'neutral'}>{pct}%</Badge>
              {isManager && (
                <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_obiettivi', id: o.id })} />
              )}
            </div>
            <Progress value={pct} etichetta="Avanzamento verso l'obiettivo" className="mt-1.5" />
          </div>
        )
      })}
      {isManager && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            const imp = Number(importo)
            if (!importo || Number.isNaN(imp)) { toast.error('Importo obiettivo non valido'); return }
            crea.mutate({
              agenteId: agente.id, tabella: 'agenti_obiettivi',
              values: {
                anno: Number(anno), importo_obiettivo: imp,
                mese: mese === '' ? null : Number(mese),
              },
            }, { onSuccess: () => setImporto(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-24 space-y-1">
            <Label>Anno</Label>
            <Input type="number" value={anno} onChange={(e) => setAnno(e.target.value)} />
          </div>
          <div className="w-36 space-y-1">
            <Label>Mese (opz.)</Label>
            <Select value={mese || 'annuale'} onValueChange={(v) => setMese(v === 'annuale' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annuale">Annuale</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{String(i + 1).padStart(2, '0')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-1">
            <Label>Obiettivo (€)</Label>
            <Input type="number" step="0.01" value={importo} onChange={(e) => setImporto(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      )}
    </div>
  )
}
