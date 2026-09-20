import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtData, SICUREZZA_LABEL } from '@/modules/cantiere/stati'
import { toast } from 'sonner'
import { useFigliCantiere, useCreaFiglioCantiere, useAggiornaFiglioCantiere, useEliminaFiglioCantiere, type Cantiere, type CantiereEventoSicurezza } from '@/modules/cantiere/queries/cantieri'
import { useState } from 'react'
import { BtnElimina, card } from '@/modules/cantiere/dettaglio/comuni'

export // ── Sicurezza ────────────────────────────────────────────────────
function TabSicurezza({ cantiere }: { cantiere: Cantiere }) {
  const { data: eventi = [] } = useFigliCantiere<CantiereEventoSicurezza>(cantiere.id, 'cantiere_eventi_sicurezza')
  const crea = useCreaFiglioCantiere()
  const aggiorna = useAggiornaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [tipo, setTipo] = useState('sopralluogo')
  const [descrizione, setDescrizione] = useState('')
  const [gravita, setGravita] = useState('media')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Registro sicurezza</h3>
      <p className="mb-2 text-xs text-muted-foreground">
        Incidenti e infortuni notificano immediatamente admin e manager.
      </p>
      {eventi.map((ev) => (
        <div key={ev.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <ShieldAlert className={ev.tipo === 'incidente' || ev.tipo === 'infortunio'
            ? 'h-4 w-4 shrink-0 text-destructive' : 'h-4 w-4 shrink-0 text-muted-foreground'} />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              {SICUREZZA_LABEL[ev.tipo] ?? ev.tipo}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{fmtData(ev.data)}</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">{ev.descrizione}</p>
          </div>
          <Badge tone={ev.gravita === 'critica' ? 'danger' : ev.gravita === 'alta' ? 'warning' : 'neutral'}>
            {ev.gravita}
          </Badge>
          {ev.chiuso ? (
            <Badge tone="success">Chiuso</Badge>
          ) : (
            <Button size="sm" variant="ghost" className="gap-1 text-xs"
              onClick={() => aggiorna.mutate({
                cantiereId: cantiere.id, tabella: 'cantiere_eventi_sicurezza', id: ev.id,
                values: { chiuso: true },
              })}>
              <CheckCircle2 className="h-3 w-3" /> Chiudi
            </Button>
          )}
          <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_eventi_sicurezza', id: ev.id })} />
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!descrizione.trim()) { toast.error('Descrivi l\'evento'); return }
          crea.mutate({
            cantiereId: cantiere.id, tabella: 'cantiere_eventi_sicurezza',
            values: { tipo, descrizione: descrizione.trim(), gravita },
          }, {
            onSuccess: () => setDescrizione(''),
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="w-52 space-y-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SICUREZZA_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <Label>Descrizione</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
        </div>
        <div className="w-32 space-y-1">
          <Label>Gravità</Label>
          <Select value={gravita} onValueChange={setGravita}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['bassa', 'media', 'alta', 'critica'].map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Registra</Button>
      </form>
    </div>
  )
}
