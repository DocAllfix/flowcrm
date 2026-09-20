import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus } from 'lucide-react'
import { fmtData } from '@/modules/gare/stati'
import { toast } from 'sonner'
import { useGaraChiarimenti, useCreaFiglioGara, useAggiornaFiglioGara, useEliminaFiglioGara, type Gara } from '@/modules/gare/queries/gare'
import { useState, type FormEvent } from 'react'
import { card } from '@/modules/gare/dettaglio/comuni'

export // ── Chiarimenti ──────────────────────────────────────────────────
function TabChiarimenti({ gara }: { gara: Gara }) {
  const { data: chiarimenti = [] } = useGaraChiarimenti(gara.id)
  const crea = useCreaFiglioGara()
  const aggiorna = useAggiornaFiglioGara()
  const elimina = useEliminaFiglioGara()
  const [domanda, setDomanda] = useState('')
  const [rispostaDraft, setRispostaDraft] = useState<Record<string, string>>({})
  const [impattoDraft, setImpattoDraft] = useState<Record<string, string>>({})

  async function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!domanda.trim()) { toast.error('Scrivi la domanda'); return }
    try {
      await crea.mutateAsync({
        garaId: gara.id, tabella: 'gare_chiarimenti', values: { domanda: domanda.trim() },
      })
      setDomanda('')
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Richieste di chiarimento</h3>
      {chiarimenti.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">Registra le domande inviate alla stazione appaltante e le risposte ricevute.</p>
      )}
      {chiarimenti.map((c) => (
        <div key={c.id} className="border-b border-border py-3 last:border-0">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{c.domanda}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Inviata il {fmtData(c.data_invio)}</p>
            </div>
            <button
              onClick={() => elimina.mutate({ garaId: gara.id, tabella: 'gare_chiarimenti', id: c.id })}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {c.risposta ? (
            <p className="mt-2 rounded-lg bg-muted/50 p-3 text-sm text-foreground">
              {c.risposta}
              <span className="mt-1 block text-xs text-muted-foreground">
                Risposta del {fmtData(c.data_risposta)}
                {c.impatto_offerta && <> · Impatto: {c.impatto_offerta}</>}
              </span>
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                className="min-w-56 flex-1"
                value={rispostaDraft[c.id] ?? ''}
                onChange={(e) => setRispostaDraft((p) => ({ ...p, [c.id]: e.target.value }))}
                placeholder="Registra la risposta ricevuta…"
              />
              <Input
                className="w-56"
                value={impattoDraft[c.id] ?? ''}
                onChange={(e) => setImpattoDraft((p) => ({ ...p, [c.id]: e.target.value }))}
                placeholder="Impatto sull'offerta (opz.)"
              />
              <Button size="sm" variant="outline" disabled={!rispostaDraft[c.id]?.trim() || aggiorna.isPending}
                onClick={() => aggiorna.mutate({
                  garaId: gara.id, tabella: 'gare_chiarimenti', id: c.id,
                  values: {
                    risposta: rispostaDraft[c.id].trim(),
                    impatto_offerta: impattoDraft[c.id]?.trim() || null,
                    data_risposta: new Date().toISOString().slice(0, 10),
                  },
                })}>
                Salva
              </Button>
            </div>
          )}
        </div>
      ))}
      <form onSubmit={handleAggiungi} className="mt-3 flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label>Nuova domanda</Label>
          <Input value={domanda} onChange={(e) => setDomanda(e.target.value)}
            placeholder="Es. Si chiede conferma che…" />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Registra</Button>
      </form>
    </div>
  )
}
