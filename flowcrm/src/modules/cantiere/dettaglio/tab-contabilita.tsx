import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtImporto, fmtData, SAL_STATO_LABEL } from '@/modules/cantiere/stati'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useFigliCantiere, useCreaFiglioCantiere, useAggiornaFiglioCantiere, useEliminaFiglioCantiere, cantieriKeys, type Cantiere, type CantiereSal, type CantiereCosto } from '@/modules/cantiere/queries/cantieri'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { BtnElimina, card, type CantiereMisura } from '@/modules/cantiere/dettaglio/comuni'

export // ── Contabilità (manager): SAL → fattura + costi ─────────────────
function TabContabilita({ cantiere }: { cantiere: Cantiere }) {
  const { isManager } = useAuth()
  const qc = useQueryClient()
  const { data: sal = [] } = useFigliCantiere<CantiereSal>(cantiere.id, 'cantiere_sal')
  const { data: costi = [] } = useFigliCantiere<CantiereCosto>(cantiere.id, 'cantiere_costi')
  const { data: misure = [] } = useFigliCantiere<CantiereMisura>(cantiere.id, 'cantiere_misure')
  const crea = useCreaFiglioCantiere()
  const aggiorna = useAggiornaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [importoSal, setImportoSal] = useState('')
  const [descSal, setDescSal] = useState('')
  const [tipoCosto, setTipoCosto] = useState('materiali')
  const [descCosto, setDescCosto] = useState('')
  const [importoCosto, setImportoCosto] = useState('')
  const [fatturando, setFatturando] = useState<string | null>(null)
  const [descMisura, setDescMisura] = useState('')
  const [qtaMisura, setQtaMisura] = useState('')
  const [unitaMisura, setUnitaMisura] = useState('')
  const [prezzoMisura, setPrezzoMisura] = useState('')

  const totaleMisure = misure.reduce((s, m) => s + Number(m.quantita) * Number(m.prezzo_unitario), 0)

  if (!isManager) {
    return (
      <div className={card}>
        <p className="text-sm text-muted-foreground">
          La contabilità di cantiere (SAL, costi, margini) è riservata ad admin e manager.
        </p>
      </div>
    )
  }

  async function generaFattura(s: CantiereSal) {
    if (!cantiere.cliente_id) {
      toast.error('Per fatturare il SAL collega il Cliente del cantiere a un\'organizzazione')
      return
    }
    setFatturando(s.id)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const scadenza = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      const { data: fattura, error } = await supabase.from('fatture').insert({
        direzione: 'attiva',
        numero: `${cantiere.codice}-SAL${s.numero}`,
        organizzazione_id: cantiere.cliente_id,
        commessa_id: cantiere.commessa_id,
        imponibile: Number(s.importo),
        scadenza,
        note: `SAL ${s.numero} — ${cantiere.denominazione}`,
        created_by: auth.user!.id,
      }).select('id, numero').single()
      if (error) throw error
      await aggiorna.mutateAsync({
        cantiereId: cantiere.id, tabella: 'cantiere_sal', id: s.id,
        values: { fattura_id: fattura.id },
      })
      qc.invalidateQueries({ queryKey: cantieriKeys.figli(cantiere.id, 'economia') })
      toast.success(`Fattura ${fattura.numero} creata (con incasso previsto automatico)`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setFatturando(null)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">SAL — Stati di avanzamento lavori</h3>
        {sal.map((s) => {
          const st = SAL_STATO_LABEL[s.stato] ?? SAL_STATO_LABEL.bozza
          return (
            <div key={s.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
              <span className="font-mono text-xs font-semibold text-muted-foreground">SAL {s.numero}</span>
              <span className="min-w-0 flex-1 truncate text-foreground">{s.descrizione ?? fmtData(s.data)}</span>
              <span className="font-semibold text-foreground">{fmtImporto(Number(s.importo))}</span>
              <Badge tone={st.tone}>{st.label}</Badge>
              {s.stato === 'bozza' && (
                <Button size="sm" variant="ghost" className="text-xs"
                  onClick={() => aggiorna.mutate({
                    cantiereId: cantiere.id, tabella: 'cantiere_sal', id: s.id, values: { stato: 'emesso' },
                  })}>
                  Emetti
                </Button>
              )}
              {s.stato === 'emesso' && !s.fattura_id && (
                <Button size="sm" variant="outline" className="gap-1 text-xs"
                  disabled={fatturando === s.id}
                  onClick={() => void generaFattura(s)}>
                  <FileText className="h-3 w-3" /> {fatturando === s.id ? 'Creazione…' : 'Genera fattura'}
                </Button>
              )}
              {s.fattura_id && (
                <Link to={`/fatture/${s.fattura_id}`} className="text-xs text-primary-testo hover:underline">
                  fattura
                </Link>
              )}
              <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_sal', id: s.id })} />
            </div>
          )
        })}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const imp = Number(importoSal)
            if (!importoSal || Number.isNaN(imp)) { toast.error('Importo SAL non valido'); return }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_sal',
              values: { importo: imp, descrizione: descSal.trim() || null, stato: 'bozza' },
            }, {
              onSuccess: () => { setImportoSal(''); setDescSal('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Descrizione</Label>
            <Input value={descSal} onChange={(e) => setDescSal(e.target.value)}
              placeholder="Es. Lavori al 30 giugno" />
          </div>
          <div className="w-36 space-y-1">
            <Label>Importo (€)</Label>
            <Input type="number" step="0.01" value={importoSal} onChange={(e) => setImportoSal(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Nuovo SAL</Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Costi di cantiere</h3>
        {costi.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Badge tone="neutral">{c.tipo}</Badge>
            <span className="min-w-0 flex-1 truncate text-foreground">{c.descrizione}</span>
            <span className="font-medium text-foreground">{fmtImporto(Number(c.importo))}</span>
            <span className="text-xs text-muted-foreground">{fmtData(c.data)}</span>
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_costi', id: c.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const imp = Number(importoCosto)
            if (!descCosto.trim() || !importoCosto || Number.isNaN(imp)) {
              toast.error('Descrizione e importo obbligatori'); return
            }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_costi',
              values: { tipo: tipoCosto, descrizione: descCosto.trim(), importo: imp },
            }, {
              onSuccess: () => { setDescCosto(''); setImportoCosto('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-36 space-y-1">
            <Label>Voce</Label>
            <Select value={tipoCosto} onValueChange={setTipoCosto}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['personale', 'materiali', 'mezzi', 'subappalti', 'altro'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32 flex-1 space-y-1">
            <Label>Descrizione</Label>
            <Input value={descCosto} onChange={(e) => setDescCosto(e.target.value)} />
          </div>
          <div className="w-32 space-y-1">
            <Label>Importo (€)</Label>
            <Input type="number" step="0.01" value={importoCosto} onChange={(e) => setImportoCosto(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div className={card + ' lg:col-span-2'}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Libretto delle misure</h3>
          {misure.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Contabilizzato: <span className="font-semibold text-foreground">{fmtImporto(totaleMisure)}</span>
            </span>
          )}
        </div>
        {misure.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="min-w-0 flex-1 truncate text-foreground">{m.descrizione}</span>
            <span className="text-muted-foreground">
              {Number(m.quantita)}{m.unita ? ` ${m.unita}` : ''} × {fmtImporto(Number(m.prezzo_unitario))}
            </span>
            <span className="font-medium text-foreground">
              {fmtImporto(Number(m.quantita) * Number(m.prezzo_unitario))}
            </span>
            <span className="text-xs text-muted-foreground">{fmtData(m.data)}</span>
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_misure', id: m.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const q = Number(qtaMisura); const p = Number(prezzoMisura)
            if (!descMisura.trim() || Number.isNaN(q) || Number.isNaN(p) || !qtaMisura || !prezzoMisura) {
              toast.error('Descrizione, quantità e prezzo obbligatori'); return
            }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_misure',
              values: {
                descrizione: descMisura.trim(), quantita: q,
                unita: unitaMisura.trim() || null, prezzo_unitario: p,
              },
            }, {
              onSuccess: () => { setDescMisura(''); setQtaMisura(''); setUnitaMisura(''); setPrezzoMisura('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-44 flex-1 space-y-1">
            <Label>Voce di misura</Label>
            <Input value={descMisura} onChange={(e) => setDescMisura(e.target.value)}
              placeholder="Es. Muratura in blocchi sp. 25cm" />
          </div>
          <div className="w-24 space-y-1">
            <Label>Quantità</Label>
            <Input type="number" step="0.001" value={qtaMisura} onChange={(e) => setQtaMisura(e.target.value)} />
          </div>
          <div className="w-20 space-y-1">
            <Label>Unità</Label>
            <Input value={unitaMisura} onChange={(e) => setUnitaMisura(e.target.value)} placeholder="mq" />
          </div>
          <div className="w-32 space-y-1">
            <Label>Prezzo unit. (€)</Label>
            <Input type="number" step="0.01" value={prezzoMisura} onChange={(e) => setPrezzoMisura(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Registra misura</Button>
        </form>
      </div>
    </div>
  )
}
