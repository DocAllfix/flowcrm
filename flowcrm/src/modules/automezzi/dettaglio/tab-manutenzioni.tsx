import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Wrench } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtImporto, fmtData } from '@/modules/automezzi/stati'
import { toast } from 'sonner'
import { useFigliAutomezzo, useCreaFiglioAutomezzo, useEliminaFiglioAutomezzo, type Automezzo, type AutomezzoManutenzione } from '@/modules/automezzi/queries/automezzi'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card, fmtKm } from '@/modules/automezzi/dettaglio/comuni'

export // ── Manutenzioni ─────────────────────────────────────────────────
function TabManutenzioni({ mezzo }: { mezzo: Automezzo }) {
  const { data: manutenzioni = [] } = useFigliAutomezzo<AutomezzoManutenzione>(mezzo.id, 'automezzi_manutenzioni')
  const crea = useCreaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [tipo, setTipo] = useState('ordinaria')
  const [descrizione, setDescrizione] = useState('')
  const [officina, setOfficina] = useState('')
  const [costoMan, setCostoMan] = useState('')
  const [costoMat, setCostoMat] = useState('')
  const [kmMan, setKmMan] = useState('')
  const [oreFermo, setOreFermo] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Registro manutenzioni</h3>
      {manutenzioni.map((m) => (
        <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{m.descrizione}</p>
            <p className="text-xs text-muted-foreground">
              {fmtData(m.data)}{m.officina ? ` · ${m.officina}` : ''}{m.km != null ? ` · ${fmtKm(m.km)}` : ''}
            </p>
          </div>
          <Badge tone={m.tipo === 'straordinaria' ? 'warning' : 'neutral'}>{m.tipo}</Badge>
          {(m.costo_manodopera != null || m.costo_materiali != null) && (
            <span className="font-medium text-foreground">
              {fmtImporto(Number(m.costo_manodopera ?? 0) + Number(m.costo_materiali ?? 0))}
            </span>
          )}
          <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_manutenzioni', id: m.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!descrizione.trim()) { toast.error("Descrivi l'intervento"); return }
          crea.mutate({
            automezzoId: mezzo.id, tabella: 'automezzi_manutenzioni',
            values: {
              tipo, descrizione: descrizione.trim(), officina: officina.trim() || null,
              costo_manodopera: costoMan === '' ? null : Number(costoMan),
              costo_materiali: costoMat === '' ? null : Number(costoMat),
              km: kmMan === '' ? null : Number(kmMan),
              ore_fermo: oreFermo === '' ? null : Number(oreFermo),
            },
          }, {
            onSuccess: () => { setDescrizione(''); setOfficina(''); setCostoMan(''); setCostoMat(''); setKmMan(''); setOreFermo('') },
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
              <SelectItem value="ordinaria">Ordinaria</SelectItem>
              <SelectItem value="straordinaria">Straordinaria</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-40 flex-1 space-y-1">
          <Label>Intervento</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Es. Tagliando 60.000 km" />
        </div>
        <div className="w-32 space-y-1">
          <Label>Officina</Label>
          <Input value={officina} onChange={(e) => setOfficina(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label>Km</Label>
          <Input type="number" value={kmMan} onChange={(e) => setKmMan(e.target.value)} />
        </div>
        <div className="w-24 space-y-1">
          <Label>Ore fermo</Label>
          <Input type="number" step="0.5" value={oreFermo} onChange={(e) => setOreFermo(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label>Manodopera (€)</Label>
          <Input type="number" step="0.01" value={costoMan} onChange={(e) => setCostoMan(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label>Ricambi (€)</Label>
          <Input type="number" step="0.01" value={costoMat} onChange={(e) => setCostoMat(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}
