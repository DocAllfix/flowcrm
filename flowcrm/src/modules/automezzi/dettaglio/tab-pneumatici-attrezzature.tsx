import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtData } from '@/modules/automezzi/stati'
import { toast } from 'sonner'
import { useFigliAutomezzo, useCreaFiglioAutomezzo, useAggiornaFiglioAutomezzo, useEliminaFiglioAutomezzo, type Automezzo, type AutomezzoPneumatico, type AutomezzoAttrezzatura } from '@/modules/automezzi/queries/automezzi'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card } from '@/modules/automezzi/dettaglio/comuni'

export // ── Pneumatici e attrezzature ────────────────────────────────────
function TabPneumaticiAttrezzature({ mezzo }: { mezzo: Automezzo }) {
  const { data: pneumatici = [] } = useFigliAutomezzo<AutomezzoPneumatico>(mezzo.id, 'automezzi_pneumatici')
  const { data: attrezzature = [] } = useFigliAutomezzo<AutomezzoAttrezzatura>(mezzo.id, 'automezzi_attrezzature')
  const crea = useCreaFiglioAutomezzo()
  const aggiorna = useAggiornaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [tipologia, setTipologia] = useState('estivi')
  const [misura, setMisura] = useState('')
  const [descrAttr, setDescrAttr] = useState('')

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Pneumatici</h3>
        {pneumatici.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="flex-1 text-foreground">
              {p.tipologia}{p.misura ? ` ${p.misura}` : ''}{p.marca ? ` · ${p.marca}` : ''}
            </span>
            <span className="text-xs text-muted-foreground">{fmtData(p.data_installazione)}</span>
            {p.montati ? (
              <Badge tone="success">Montati</Badge>
            ) : (
              <Badge tone="neutral">A deposito</Badge>
            )}
            <Button size="sm" variant="ghost" className="text-xs"
              onClick={() => aggiorna.mutate({
                automezzoId: mezzo.id, tabella: 'automezzi_pneumatici', id: p.id,
                values: { montati: !p.montati },
              })}>
              {p.montati ? 'Smonta' : 'Monta'}
            </Button>
            <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_pneumatici', id: p.id })} />
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            crea.mutate({
              automezzoId: mezzo.id, tabella: 'automezzi_pneumatici',
              values: { tipologia, misura: misura.trim() || null },
            }, { onSuccess: () => setMisura(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-36 space-y-1">
            <Label>Tipologia</Label>
            <Select value={tipologia} onValueChange={setTipologia}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="estivi">Estivi</SelectItem>
                <SelectItem value="invernali">Invernali</SelectItem>
                <SelectItem value="4 stagioni">4 stagioni</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32 flex-1 space-y-1">
            <Label>Misura</Label>
            <Input value={misura} onChange={(e) => setMisura(e.target.value)} placeholder="205/65 R16" />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Attrezzature installate</h3>
        {attrezzature.map((a) => (
          <div key={a.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="flex-1 text-foreground">{a.descrizione}</span>
            {a.matricola && <span className="text-xs text-muted-foreground">matr. {a.matricola}</span>}
            <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_attrezzature', id: a.id })} />
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!descrAttr.trim()) { toast.error("Descrivi l'attrezzatura"); return }
            crea.mutate({
              automezzoId: mezzo.id, tabella: 'automezzi_attrezzature',
              values: { descrizione: descrAttr.trim() },
            }, { onSuccess: () => setDescrAttr(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex items-end gap-2"
        >
          <div className="flex-1 space-y-1">
            <Label>Attrezzatura</Label>
            <Input value={descrAttr} onChange={(e) => setDescrAttr(e.target.value)}
              placeholder="Es. Gru retrocabina, sponda idraulica" />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  )
}
