import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { SINISTRO_STATO_LABEL, fmtImporto, fmtData } from '@/modules/automezzi/stati'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useFigliAutomezzo, useCreaFiglioAutomezzo, useAggiornaFiglioAutomezzo, useEliminaFiglioAutomezzo, type Automezzo, type AutomezzoSinistro, type AutomezzoMulta } from '@/modules/automezzi/queries/automezzi'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card } from '@/modules/automezzi/dettaglio/comuni'

export // ── Sinistri e multe ─────────────────────────────────────────────
function TabSinistriMulte({ mezzo }: { mezzo: Automezzo }) {
  const { data: sinistri = [] } = useFigliAutomezzo<AutomezzoSinistro>(mezzo.id, 'automezzi_sinistri')
  const { data: multe = [] } = useFigliAutomezzo<AutomezzoMulta>(mezzo.id, 'automezzi_multe')
  const crea = useCreaFiglioAutomezzo()
  const aggiorna = useAggiornaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [descSinistro, setDescSinistro] = useState('')
  const [luogoSinistro, setLuogoSinistro] = useState('')
  const [controparte, setControparte] = useState('')
  const [importoMulta, setImportoMulta] = useState('')
  const [enteMulta, setEnteMulta] = useState('')
  const [puntiMulta, setPuntiMulta] = useState('')
  const [liquidazioneDraft, setLiquidazioneDraft] = useState<Record<string, string>>({})

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Sinistri</h3>
        {sinistri.map((s) => {
          const st = SINISTRO_STATO_LABEL[s.stato]
          return (
            <div key={s.id} className="border-b border-border py-2 text-sm last:border-0">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{s.descrizione}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtData(s.data)}{s.luogo ? ` · ${s.luogo}` : ''}
                    {s.controparte ? ` · controparte ${s.controparte}` : ''}
                    {s.pratica ? ` · pratica ${s.pratica}` : ''}
                    {s.importo_liquidato != null ? ` · liquidati ${fmtImporto(Number(s.importo_liquidato))}` : ''}
                  </p>
                </div>
                <Select value={s.stato}
                  onValueChange={(v) => aggiorna.mutate({
                    automezzoId: mezzo.id, tabella: 'automezzi_sinistri', id: s.id, values: { stato: v },
                  })}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SINISTRO_STATO_LABEL).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge tone={st.tone}>{st.label}</Badge>
                <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_sinistri', id: s.id })} />
              </div>
              {s.stato === 'liquidato' && s.importo_liquidato == null && (
                <div className="mt-2 flex items-center gap-2">
                  <Input type="number" step="0.01" className="h-8 w-40 text-xs"
                    placeholder="Importo liquidato (€)"
                    value={liquidazioneDraft[s.id] ?? ''}
                    onChange={(e) => setLiquidazioneDraft((p) => ({ ...p, [s.id]: e.target.value }))} />
                  <Button size="sm" variant="outline" className="text-xs"
                    disabled={!liquidazioneDraft[s.id]}
                    onClick={() => aggiorna.mutate({
                      automezzoId: mezzo.id, tabella: 'automezzi_sinistri', id: s.id,
                      values: { importo_liquidato: Number(liquidazioneDraft[s.id]) },
                    })}>
                    Registra liquidazione
                  </Button>
                </div>
              )}
            </div>
          )
        })}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!descSinistro.trim()) { toast.error('Descrivi il sinistro'); return }
            crea.mutate({
              automezzoId: mezzo.id, tabella: 'automezzi_sinistri',
              values: {
                descrizione: descSinistro.trim(),
                luogo: luogoSinistro.trim() || null,
                controparte: controparte.trim() || null,
              },
            }, {
              onSuccess: () => { setDescSinistro(''); setLuogoSinistro(''); setControparte('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Nuovo sinistro</Label>
            <Input value={descSinistro} onChange={(e) => setDescSinistro(e.target.value)}
              placeholder="Es. Tamponamento in via Roma" />
          </div>
          <div className="w-32 space-y-1">
            <Label>Luogo</Label>
            <Input value={luogoSinistro} onChange={(e) => setLuogoSinistro(e.target.value)} />
          </div>
          <div className="w-36 space-y-1">
            <Label>Controparte</Label>
            <Input value={controparte} onChange={(e) => setControparte(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Multe</h3>
        {multe.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="text-xs text-muted-foreground">{fmtData(m.data)}</span>
            <span className="flex-1 text-foreground">{m.ente ?? '—'}</span>
            <span className="font-medium text-foreground">{fmtImporto(Number(m.importo))}</span>
            {m.punti_decurtati != null && m.punti_decurtati > 0 && (
              <Badge tone="warning">-{m.punti_decurtati} punti</Badge>
            )}
            {m.ricorso ? (
              <Badge tone="info">Ricorso</Badge>
            ) : !m.pagata && (
              <Button size="sm" variant="ghost" className="text-xs"
                onClick={() => aggiorna.mutate({
                  automezzoId: mezzo.id, tabella: 'automezzi_multe', id: m.id, values: { ricorso: true },
                })}>
                Fai ricorso
              </Button>
            )}
            {m.pagata ? (
              <Badge tone="success">Pagata</Badge>
            ) : (
              <Button size="sm" variant="ghost" className="text-xs"
                onClick={() => aggiorna.mutate({
                  automezzoId: mezzo.id, tabella: 'automezzi_multe', id: m.id, values: { pagata: true },
                })}>
                Segna pagata
              </Button>
            )}
            <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_multe', id: m.id })} />
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            const imp = Number(importoMulta)
            if (!importoMulta || Number.isNaN(imp)) { toast.error('Importo obbligatorio'); return }
            crea.mutate({
              automezzoId: mezzo.id, tabella: 'automezzi_multe',
              values: {
                importo: imp, ente: enteMulta.trim() || null,
                punti_decurtati: puntiMulta === '' ? null : Number(puntiMulta),
              },
            }, {
              onSuccess: () => { setImportoMulta(''); setEnteMulta(''); setPuntiMulta('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-32 flex-1 space-y-1">
            <Label>Ente accertatore</Label>
            <Input value={enteMulta} onChange={(e) => setEnteMulta(e.target.value)} />
          </div>
          <div className="w-28 space-y-1">
            <Label>Importo (€)</Label>
            <Input type="number" step="0.01" value={importoMulta}
              onChange={(e) => setImportoMulta(e.target.value)} />
          </div>
          <div className="w-20 space-y-1">
            <Label>Punti</Label>
            <Input type="number" min="0" value={puntiMulta}
              onChange={(e) => setPuntiMulta(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  )
}
