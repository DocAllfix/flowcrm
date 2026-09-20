import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { fmtData } from '@/modules/automezzi/stati'
import { toast } from 'sonner'
import { useFigliAutomezzo, useCreaFiglioAutomezzo, useEliminaFiglioAutomezzo, type Automezzo, type AutomezzoUtilizzo } from '@/modules/automezzi/queries/automezzi'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card } from '@/modules/automezzi/dettaglio/comuni'

export // ── Utilizzi ─────────────────────────────────────────────────────
function TabUtilizzi({ mezzo }: { mezzo: Automezzo }) {
  const { data: utilizzi = [] } = useFigliAutomezzo<AutomezzoUtilizzo>(mezzo.id, 'automezzi_utilizzi')
  const crea = useCreaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [conducente, setConducente] = useState('')
  const [destinazione, setDestinazione] = useState('')
  const [kmIni, setKmIni] = useState('')
  const [kmFin, setKmFin] = useState('')
  const [anomalie, setAnomalie] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Registro utilizzi</h3>
      {utilizzi.map((u) => (
        <div key={u.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <span className="text-xs text-muted-foreground">{fmtData(u.data)}</span>
          <span className="flex-1 text-foreground">
            {[u.conducente, u.destinazione].filter(Boolean).join(' → ') || '—'}
          </span>
          {u.km_iniziali != null && u.km_finali != null && (
            <span className="text-xs text-muted-foreground">{u.km_finali - u.km_iniziali} km</span>
          )}
          {u.anomalie && <Badge tone="warning">Anomalie</Badge>}
          <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_utilizzi', id: u.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!conducente.trim()) { toast.error('Indica il conducente'); return }
          crea.mutate({
            automezzoId: mezzo.id, tabella: 'automezzi_utilizzi',
            values: {
              conducente: conducente.trim(), destinazione: destinazione.trim() || null,
              km_iniziali: kmIni === '' ? null : Number(kmIni),
              km_finali: kmFin === '' ? null : Number(kmFin),
              anomalie: anomalie.trim() || null,
            },
          }, {
            onSuccess: () => { setConducente(''); setDestinazione(''); setKmIni(''); setKmFin(''); setAnomalie('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="min-w-36 flex-1 space-y-1">
          <Label>Conducente</Label>
          <Input value={conducente} onChange={(e) => setConducente(e.target.value)} />
        </div>
        <div className="min-w-36 flex-1 space-y-1">
          <Label>Destinazione</Label>
          <Input value={destinazione} onChange={(e) => setDestinazione(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label>Km iniziali</Label>
          <Input type="number" value={kmIni} onChange={(e) => setKmIni(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label>Km finali</Label>
          <Input type="number" value={kmFin} onChange={(e) => setKmFin(e.target.value)} />
        </div>
        <div className="min-w-32 flex-1 space-y-1">
          <Label>Anomalie</Label>
          <Input value={anomalie} onChange={(e) => setAnomalie(e.target.value)} placeholder="Vuoto = nessuna" />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}
