import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Calculator } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtImporto, periodoCorrente } from '@/modules/agenti/stati'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useFigliAgente, useCreaFiglioAgente, useAggiornaFiglioAgente, useEliminaFiglioAgente, useAgentePiano, useSalvaAgentePiano, useCalcolaProvvigioni, type Agente, type AgenteRegola, type AgenteProvvigione } from '@/modules/agenti/queries/agenti'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card } from '@/modules/agenti/dettaglio/comuni'

export // ── Provvigioni (manager gestisce; l'agente vede le sue) ─────────
function TabProvvigioni({ agente }: { agente: Agente }) {
  const { isManager } = useAuth()
  const { data: piano } = useAgentePiano(agente.id)
  const { data: regole = [] } = useFigliAgente<AgenteRegola>(agente.id, 'agenti_provvigioni_regole')
  const { data: provvigioni = [] } = useFigliAgente<AgenteProvvigione>(agente.id, 'agenti_provvigioni')
  const salvaPiano = useSalvaAgentePiano()
  const calcola = useCalcolaProvvigioni()
  const crea = useCreaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const aggiorna = useAggiornaFiglioAgente()
  const [base, setBase] = useState<string | null>(null)
  const [ambito, setAmbito] = useState('cliente')
  const [riferimento, setRiferimento] = useState('')
  const [percentuale, setPercentuale] = useState('')
  const [periodo, setPeriodo] = useState(periodoCorrente())

  const vBase = base ?? (piano ? String(Number(piano.percentuale_base)) : '')

  return (
    <div className="space-y-4">
      {isManager && (
        <div className={card}>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Piano provvigionale (riservato)</h3>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40 space-y-1">
              <Label>Percentuale base (%)</Label>
              <Input type="number" step="0.01" value={vBase} onChange={(e) => setBase(e.target.value)} />
            </div>
            <Button
              onClick={() => {
                const n = Number(vBase)
                if (Number.isNaN(n)) { toast.error('Percentuale non valida'); return }
                salvaPiano.mutate({ agenteId: agente.id, percentualeBase: n }, {
                  onSuccess: () => toast.success('Piano salvato'),
                  onError: (err) => toast.error((err as Error).message),
                })
              }}
              disabled={salvaPiano.isPending}
            >
              Salva piano
            </Button>
          </div>

          <h4 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Regole differenziate
          </h4>
          {regole.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-b border-border py-1.5 text-sm last:border-0">
              <Badge tone="neutral">{r.ambito}</Badge>
              <span className="flex-1 text-foreground">{r.riferimento}</span>
              <span className="font-medium text-foreground">{Number(r.percentuale)}%</span>
              <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_provvigioni_regole', id: r.id })} />
            </div>
          ))}
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              const p = Number(percentuale)
              if (!riferimento.trim() || !percentuale || Number.isNaN(p)) {
                toast.error('Riferimento e percentuale obbligatori'); return
              }
              crea.mutate({
                agenteId: agente.id, tabella: 'agenti_provvigioni_regole',
                values: { ambito, riferimento: riferimento.trim(), percentuale: p },
              }, {
                onSuccess: () => { setRiferimento(''); setPercentuale('') },
                onError: (err) => toast.error((err as Error).message),
              })
            }}
            className="mt-2 flex flex-wrap items-end gap-2"
          >
            <div className="w-36 space-y-1">
              <Label>Ambito</Label>
              <Select value={ambito} onValueChange={setAmbito}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['cliente', 'zona', 'prodotto', 'fascia_fatturato'].map((a) => (
                    <SelectItem key={a} value={a}>{a.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-36 flex-1 space-y-1">
              <Label>Riferimento</Label>
              <Input value={riferimento} onChange={(e) => setRiferimento(e.target.value)}
                placeholder="Es. ragione sociale del cliente" />
            </div>
            <div className="w-24 space-y-1">
              <Label>%</Label>
              <Input type="number" step="0.01" value={percentuale}
                onChange={(e) => setPercentuale(e.target.value)} />
            </div>
            <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
          </form>

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
            <div className="w-40 space-y-1">
              <Label>Periodo (AAAA-MM)</Label>
              <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
            </div>
            <Button variant="outline" className="gap-1.5"
              disabled={calcola.isPending}
              onClick={() => calcola.mutate({ agenteId: agente.id, periodo }, {
                onSuccess: (tot) => toast.success(`Provvigioni del periodo: ${fmtImporto(tot)} (dal venduto consegnato/fatturato)`),
                onError: (err) => toast.error((err as Error).message),
              })}>
              <Calculator className="h-4 w-4" />
              {calcola.isPending ? 'Calcolo…' : 'Calcola dal venduto'}
            </Button>
          </div>
        </div>
      )}

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Provvigioni per periodo</h3>
        {provvigioni.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            {isManager
              ? 'Usa "Calcola dal venduto" per maturare il periodo corrente.'
              : 'Le provvigioni maturate compariranno qui.'}
          </p>
        )}
        {provvigioni.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="font-mono text-xs font-semibold text-muted-foreground">{p.periodo}</span>
            <span className="flex-1 text-foreground">
              maturato <span className="font-semibold">{fmtImporto(Number(p.importo_maturato))}</span>
              {Number(p.anticipi) > 0 && <> · anticipi {fmtImporto(Number(p.anticipi))}</>}
            </span>
            {Number(p.importo_liquidato) > 0 ? (
              <Badge tone="success">Liquidate {fmtImporto(Number(p.importo_liquidato))}</Badge>
            ) : isManager ? (
              <Button size="sm" variant="outline" className="text-xs"
                onClick={() => aggiorna.mutate({
                  agenteId: agente.id, tabella: 'agenti_provvigioni', id: p.id,
                  values: {
                    importo_liquidato: p.importo_maturato,
                    liquidata_at: new Date().toISOString().slice(0, 10),
                  },
                }, { onSuccess: () => toast.success('Provvigioni liquidate') })}>
                Liquida
              </Button>
            ) : (
              <Badge tone="primary">Da liquidare</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
