import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtData, QUALITA_TIPO_LABEL, AMBIENTE_LABEL } from '@/modules/cantiere/stati'
import { toast } from 'sonner'
import { useFigliCantiere, useCreaFiglioCantiere, useAggiornaFiglioCantiere, useEliminaFiglioCantiere, type Cantiere, type CantiereControlloQualita, type CantiereRegistroAmbiente } from '@/modules/cantiere/queries/cantieri'
import { useState } from 'react'
import { BtnElimina, card } from '@/modules/cantiere/dettaglio/comuni'

export // ── Qualità e ambiente ───────────────────────────────────────────
function TabQualitaAmbiente({ cantiere }: { cantiere: Cantiere }) {
  const { data: controlli = [] } = useFigliCantiere<CantiereControlloQualita>(cantiere.id, 'cantiere_controlli_qualita')
  const { data: registri = [] } = useFigliCantiere<CantiereRegistroAmbiente>(cantiere.id, 'cantiere_registri_ambiente')
  const crea = useCreaFiglioCantiere()
  const aggiorna = useAggiornaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [tipoQ, setTipoQ] = useState('corso_opera')
  const [descQ, setDescQ] = useState('')
  const [tipoA, setTipoA] = useState('rifiuti')
  const [descA, setDescA] = useState('')
  const [quantA, setQuantA] = useState('')
  const [unitaA, setUnitaA] = useState('')
  const [formularioA, setFormularioA] = useState('')

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Controlli qualità</h3>
        {controlli.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{QUALITA_TIPO_LABEL[c.tipo]}</p>
              <p className="truncate text-xs text-muted-foreground">{c.descrizione} · {fmtData(c.data)}</p>
            </div>
            <Select value={c.esito}
              onValueChange={(v) => aggiorna.mutate({
                cantiereId: cantiere.id, tabella: 'cantiere_controlli_qualita', id: c.id,
                values: { esito: v },
              })}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_attesa">In attesa</SelectItem>
                <SelectItem value="conforme">Conforme</SelectItem>
                <SelectItem value="non_conforme">Non conforme</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <Checkbox checked={c.approvato_dl}
                onCheckedChange={(v) => aggiorna.mutate({
                  cantiereId: cantiere.id, tabella: 'cantiere_controlli_qualita', id: c.id,
                  values: { approvato_dl: v === true },
                })} />
              DL
            </label>
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_controlli_qualita', id: c.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!descQ.trim()) { toast.error('Descrivi il controllo'); return }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_controlli_qualita',
              values: { tipo: tipoQ, descrizione: descQ.trim() },
            }, { onSuccess: () => setDescQ(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-48 space-y-1">
            <Label>Tipo</Label>
            <Select value={tipoQ} onValueChange={setTipoQ}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(QUALITA_TIPO_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-36 flex-1 space-y-1">
            <Label>Descrizione</Label>
            <Input value={descQ} onChange={(e) => setDescQ(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Registro ambiente</h3>
        {registri.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Badge tone="neutral">{AMBIENTE_LABEL[r.tipo]}</Badge>
            <span className="min-w-0 flex-1 truncate text-foreground">
              {r.descrizione}
              {r.formulario && <span className="text-muted-foreground"> · FIR {r.formulario}</span>}
            </span>
            {r.quantita != null && (
              <span className="text-muted-foreground">{Number(r.quantita)}{r.unita ? ` ${r.unita}` : ''}</span>
            )}
            <span className="text-xs text-muted-foreground">{fmtData(r.data)}</span>
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_registri_ambiente', id: r.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!descA.trim()) { toast.error('Descrivi la registrazione'); return }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_registri_ambiente',
              values: {
                tipo: tipoA, descrizione: descA.trim(),
                quantita: quantA === '' ? null : Number(quantA),
                unita: unitaA.trim() || null,
                formulario: formularioA.trim() || null,
              },
            }, {
              onSuccess: () => { setDescA(''); setQuantA(''); setUnitaA(''); setFormularioA('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-36 space-y-1">
            <Label>Tipo</Label>
            <Select value={tipoA} onValueChange={setTipoA}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(AMBIENTE_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32 flex-1 space-y-1">
            <Label>Descrizione</Label>
            <Input value={descA} onChange={(e) => setDescA(e.target.value)}
              placeholder="Es. Conferimento macerie" />
          </div>
          <div className="w-20 space-y-1">
            <Label>Q.tà</Label>
            <Input type="number" step="0.01" value={quantA} onChange={(e) => setQuantA(e.target.value)} />
          </div>
          <div className="w-20 space-y-1">
            <Label>Unità</Label>
            <Input value={unitaA} onChange={(e) => setUnitaA(e.target.value)} placeholder="t" />
          </div>
          <div className="w-32 space-y-1">
            <Label>Formulario</Label>
            <Input value={formularioA} onChange={(e) => setFormularioA(e.target.value)}
              placeholder="FIR n." />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  )
}
