import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OFFERTA_STATO, ORDINE_STATO, fmtImporto, fmtData } from '@/modules/agenti/stati'
import { Plus, ShoppingCart } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useFigliAgente, useCreaFiglioAgente, useAggiornaFiglioAgente, useEliminaFiglioAgente, type Agente, type AgenteOrdine, type AgenteOfferta } from '@/modules/agenti/queries/agenti'
import { useOrganizzazioni } from '@/lib/queries/organizzazioni'
import { useState, type FormEvent } from 'react'
import { BtnElimina, RigheOrdine, card } from '@/modules/agenti/dettaglio/comuni'

export // ── Offerte e ordini ─────────────────────────────────────────────
function TabOfferteOrdini({ agente }: { agente: Agente }) {
  const { data: offerte = [] } = useFigliAgente<AgenteOfferta>(agente.id, 'agenti_offerte')
  const { data: ordini = [] } = useFigliAgente<AgenteOrdine>(agente.id, 'agenti_ordini')
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const crea = useCreaFiglioAgente()
  const aggiorna = useAggiornaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const [orgOff, setOrgOff] = useState('')
  const [descOff, setDescOff] = useState('')
  const [impOff, setImpOff] = useState('')
  const [scontoOff, setScontoOff] = useState('')
  const [validitaOff, setValiditaOff] = useState('')
  const [righeAperte, setRigheAperte] = useState<Record<string, boolean>>({})

  async function convertiInOrdine(off: AgenteOfferta) {
    try {
      await crea.mutateAsync({
        agenteId: agente.id, tabella: 'agenti_ordini',
        values: {
          organizzazione_id: off.organizzazione_id, stato: 'confermato',
          note: `Da offerta: ${off.descrizione}`,
        },
      })
      await aggiorna.mutateAsync({
        agenteId: agente.id, tabella: 'agenti_offerte', id: off.id,
        values: { stato: 'accettata' },
      })
      toast.success('Offerta accettata e convertita in ordine (aggiungi le righe)')
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Offerte e preventivi</h3>
        {offerte.map((o) => {
          const st = OFFERTA_STATO[o.stato] ?? OFFERTA_STATO.bozza
          return (
            <div key={o.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{o.descrizione}</p>
                <p className="text-xs text-muted-foreground">
                  {o.organizzazione?.ragione_sociale ?? '—'}
                  {o.sconto_percentuale != null && ` · sconto ${Number(o.sconto_percentuale)}%`}
                </p>
              </div>
              <span className="font-medium text-foreground">{fmtImporto(Number(o.importo))}</span>
              <Badge tone={st.tone}>{st.label}</Badge>
              {o.stato === 'bozza' && (
                <Button size="sm" variant="ghost" className="text-xs"
                  onClick={() => aggiorna.mutate({
                    agenteId: agente.id, tabella: 'agenti_offerte', id: o.id, values: { stato: 'inviata' },
                  })}>
                  Invia
                </Button>
              )}
              {o.stato === 'inviata' && (
                <Button size="sm" variant="outline" className="gap-1 text-xs"
                  onClick={() => void convertiInOrdine(o)}>
                  <ShoppingCart className="h-3 w-3" /> Converti
                </Button>
              )}
              <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_offerte', id: o.id })} />
            </div>
          )
        })}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            const imp = Number(impOff)
            if (!orgOff || !descOff.trim() || !impOff || Number.isNaN(imp)) {
              toast.error('Cliente, descrizione e importo obbligatori'); return
            }
            const sconto = scontoOff === '' ? null : Number(scontoOff)
            crea.mutate({
              agenteId: agente.id, tabella: 'agenti_offerte',
              values: {
                organizzazione_id: orgOff, descrizione: descOff.trim(), importo: imp,
                sconto_percentuale: sconto, validita: validitaOff || null,
              },
            }, {
              onSuccess: () => {
                setDescOff(''); setImpOff(''); setScontoOff(''); setValiditaOff('')
                if (sconto != null && sconto > 10) {
                  toast.warning('Sconto oltre il 10%: richiedi l\'approvazione dal tab Portafoglio')
                }
              },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-36 flex-1 space-y-1">
            <Label>Cliente</Label>
            <Select value={orgOff} onValueChange={setOrgOff}>
              <SelectTrigger><SelectValue placeholder="Organizzazione…" /></SelectTrigger>
              <SelectContent>
                {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32 flex-1 space-y-1">
            <Label>Descrizione</Label>
            <Input value={descOff} onChange={(e) => setDescOff(e.target.value)} />
          </div>
          <div className="w-28 space-y-1">
            <Label>Importo (€)</Label>
            <Input type="number" step="0.01" value={impOff} onChange={(e) => setImpOff(e.target.value)} />
          </div>
          <div className="w-24 space-y-1">
            <Label>Sconto %</Label>
            <Input type="number" step="0.01" value={scontoOff} onChange={(e) => setScontoOff(e.target.value)} />
          </div>
          <div className="w-36 space-y-1">
            <Label>Validità</Label>
            <Input type="date" value={validitaOff} onChange={(e) => setValiditaOff(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Ordini</h3>
        {ordini.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            Gli ordini nascono dalla conversione di un'offerta (o si registrano qui accanto).
          </p>
        )}
        {ordini.map((o) => {
          const st = ORDINE_STATO[o.stato] ?? ORDINE_STATO.bozza
          return (
            <div key={o.id} className="border-b border-border py-2 text-sm last:border-0">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{o.organizzazione?.ragione_sociale ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{fmtData(o.data)}{o.note ? ` · ${o.note}` : ''}</p>
                </div>
                <span className="font-semibold text-foreground">{fmtImporto(Number(o.valore))}</span>
                <Select value={o.stato}
                  onValueChange={(v) => aggiorna.mutate({
                    agenteId: agente.id, tabella: 'agenti_ordini', id: o.id, values: { stato: v },
                  })}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORDINE_STATO).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge tone={st.tone}>{st.label}</Badge>
                <Button size="sm" variant="ghost" className="text-xs"
                  onClick={() => setRigheAperte((p) => ({ ...p, [o.id]: !p[o.id] }))}>
                  {righeAperte[o.id] ? 'Chiudi righe' : 'Righe'}
                </Button>
                <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_ordini', id: o.id })} />
              </div>
              {righeAperte[o.id] && <RigheOrdine agenteId={agente.id} ordineId={o.id} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
