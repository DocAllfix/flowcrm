import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtData, MEZZO_TIPO_LABEL, MOVIMENTO_LABEL } from '@/modules/cantiere/stati'
import { moduloBySlug } from '@/config/moduli.config'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useFigliCantiere, useCreaFiglioCantiere, useEliminaFiglioCantiere, type Cantiere, type CantiereMezzo, type CantiereMateriale } from '@/modules/cantiere/queries/cantieri'
import { useMemo, useState } from 'react'
import { useOrganizzazioni } from '@/lib/queries/organizzazioni'
import { useQuery } from '@tanstack/react-query'
import { BtnElimina, card } from '@/modules/cantiere/dettaglio/comuni'

export // ── Mezzi e materiali ────────────────────────────────────────────
function TabMezziMateriali({ cantiere }: { cantiere: Cantiere }) {
  const { data: mezzi = [] } = useFigliCantiere<CantiereMezzo>(cantiere.id, 'cantiere_mezzi')
  const { data: materiali = [] } = useFigliCantiere<CantiereMateriale>(cantiere.id, 'cantiere_materiali')
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const crea = useCreaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [tipoMezzo, setTipoMezzo] = useState('automezzo')
  const [descMezzo, setDescMezzo] = useState('')
  const [automezzoId, setAutomezzoId] = useState('')
  const [movimento, setMovimento] = useState('consegna')
  const [descMat, setDescMat] = useState('')
  const [quantita, setQuantita] = useState('')
  const [unita, setUnita] = useState('')
  const [fornitoreId, setFornitoreId] = useState('')

  // Cross-modulo: se il modulo Automezzi è attivo si può agganciare un
  // mezzo del parco (descrizione compilata in automatico dalla targa).
  const moduloAutomezziAttivo = !!moduloBySlug('automezzi')
  const { data: parco = [] } = useQuery({
    queryKey: ['cantiere', 'parco-automezzi'],
    enabled: moduloAutomezziAttivo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automezzi')
        .select('id, targa, marca, modello')
        .eq('attivo', true)
        .neq('stato', 'dismesso')
      if (error) throw error
      return data
    },
  })

  // Giacenze per materiale: consegne − consumi − resi (§7)
  const giacenze = useMemo(() => {
    const m: Record<string, { unita: string | null; q: number }> = {}
    for (const r of materiali) {
      const k = r.descrizione.toLowerCase()
      m[k] ??= { unita: r.unita, q: 0 }
      const q = Number(r.quantita)
      if (r.movimento === 'consegna') m[k].q += q
      else if (r.movimento === 'consumo' || r.movimento === 'reso') m[k].q -= q
    }
    return Object.entries(m).filter(([, v]) => v.q !== 0)
  }, [materiali])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Mezzi e attrezzature</h3>
        {mezzi.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{m.descrizione}</p>
              <p className="text-xs text-muted-foreground">
                {MEZZO_TIPO_LABEL[m.tipo]} · dal {fmtData(m.dal)}{m.al ? ` al ${fmtData(m.al)}` : ''}
              </p>
            </div>
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_mezzi', id: m.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const dalParco = parco.find((p) => p.id === automezzoId)
            const descrizione = dalParco
              ? `${dalParco.marca} ${dalParco.modello}${dalParco.targa ? ` (${dalParco.targa})` : ''}`
              : descMezzo.trim()
            if (!descrizione) { toast.error('Descrivi il mezzo o scegline uno dal parco'); return }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_mezzi',
              values: { tipo: tipoMezzo, descrizione, automezzo_id: automezzoId || null },
            }, {
              onSuccess: () => { setDescMezzo(''); setAutomezzoId('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-40 space-y-1">
            <Label>Tipo</Label>
            <Select value={tipoMezzo} onValueChange={setTipoMezzo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MEZZO_TIPO_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {moduloAutomezziAttivo && (
            <div className="w-48 space-y-1">
              <Label>Dal parco automezzi</Label>
              <Select value={automezzoId || 'nessuno'}
                onValueChange={(v) => setAutomezzoId(v === 'nessuno' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">— Manuale —</SelectItem>
                  {parco.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.targa ?? ''} {p.marca} {p.modello}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Descrizione</Label>
            <Input value={descMezzo} onChange={(e) => setDescMezzo(e.target.value)}
              placeholder="Es. Escavatore CAT 320" disabled={!!automezzoId} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Materiali</h3>
        {giacenze.length > 0 && (
          <div className="mb-3 rounded-lg bg-muted/50 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Giacenze</p>
            {giacenze.map(([desc, v]) => (
              <p key={desc} className="text-sm text-foreground">
                {desc}: <span className="font-semibold">{v.q}{v.unita ? ` ${v.unita}` : ''}</span>
              </p>
            ))}
          </div>
        )}
        {materiali.slice(0, 10).map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Badge tone={m.movimento === 'consegna' ? 'success' : m.movimento === 'consumo' ? 'primary' : 'neutral'}>
              {MOVIMENTO_LABEL[m.movimento]}
            </Badge>
            <span className="min-w-0 flex-1 truncate text-foreground">{m.descrizione}</span>
            <span className="text-muted-foreground">{Number(m.quantita)}{m.unita ? ` ${m.unita}` : ''}</span>
            <span className="text-xs text-muted-foreground">{fmtData(m.data)}</span>
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_materiali', id: m.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const q = Number(quantita)
            if (!descMat.trim() || !quantita || Number.isNaN(q)) { toast.error('Materiale e quantità obbligatori'); return }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_materiali',
              values: {
                descrizione: descMat.trim(), movimento, quantita: q,
                unita: unita.trim() || null, fornitore_id: fornitoreId || null,
              },
            }, {
              onSuccess: () => { setDescMat(''); setQuantita(''); setUnita('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-32 space-y-1">
            <Label>Movimento</Label>
            <Select value={movimento} onValueChange={setMovimento}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MOVIMENTO_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32 flex-1 space-y-1">
            <Label>Materiale</Label>
            <Input value={descMat} onChange={(e) => setDescMat(e.target.value)} placeholder="Es. Calcestruzzo" />
          </div>
          <div className="w-20 space-y-1">
            <Label>Q.tà</Label>
            <Input type="number" step="0.01" value={quantita} onChange={(e) => setQuantita(e.target.value)} />
          </div>
          <div className="w-20 space-y-1">
            <Label>Unità</Label>
            <Input value={unita} onChange={(e) => setUnita(e.target.value)} placeholder="mc" />
          </div>
          <div className="w-40 space-y-1">
            <Label>Fornitore</Label>
            <Select value={fornitoreId || 'nessuno'}
              onValueChange={(v) => setFornitoreId(v === 'nessuno' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nessuno">—</SelectItem>
                {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  )
}
