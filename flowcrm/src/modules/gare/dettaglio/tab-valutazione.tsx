import { ApprovalSection } from '@/components/ApprovalSection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useGaraValutazioni, useCreaFiglioGara, useEliminaFiglioGara, type Gara } from '@/modules/gare/queries/gare'
import { useState, type FormEvent } from 'react'
import { card, CRITERI_GO_NO_GO } from '@/modules/gare/dettaglio/comuni'

export // ── Valutazione Go/No-Go ─────────────────────────────────────────
function TabValutazione({ gara }: { gara: Gara }) {
  const { data: valutazioni = [] } = useGaraValutazioni(gara.id)
  const crea = useCreaFiglioGara()
  const elimina = useEliminaFiglioGara()
  const [criterio, setCriterio] = useState('')
  const [punteggio, setPunteggio] = useState('3')
  const [note, setNote] = useState('')

  const media = valutazioni.length
    ? (valutazioni.reduce((s, v) => s + v.punteggio, 0) / valutazioni.length).toFixed(1)
    : null
  const criteriDisponibili = CRITERI_GO_NO_GO.filter(
    (c) => !valutazioni.some((v) => v.criterio === c)
  )

  async function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!criterio) { toast.error('Scegli il criterio'); return }
    try {
      await crea.mutateAsync({
        garaId: gara.id, tabella: 'gare_valutazioni',
        values: { criterio, punteggio: Number(punteggio), note: note.trim() || null },
      })
      setCriterio(''); setPunteggio('3'); setNote('')
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Criteri di valutazione (Go / No-Go)</h3>
          {media && (
            <Badge tone={Number(media) >= 3.5 ? 'success' : Number(media) >= 2.5 ? 'warning' : 'danger'}>
              Media {media} / 5
            </Badge>
          )}
        </div>

        {valutazioni.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            Valuta i criteri (1–5), poi chiedi l'approvazione della Direzione qui sotto.
          </p>
        )}
        {valutazioni.map((v) => (
          <div key={v.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="flex-1 text-foreground">{v.criterio}</span>
            {v.note && <span className="max-w-[200px] truncate text-xs text-muted-foreground">{v.note}</span>}
            <Badge tone={v.punteggio >= 4 ? 'success' : v.punteggio >= 3 ? 'warning' : 'danger'}>
              {v.punteggio}/5
            </Badge>
            <button
              onClick={() => elimina.mutate({ garaId: gara.id, tabella: 'gare_valutazioni', id: v.id })}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <form onSubmit={handleAggiungi} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1 space-y-1">
            <Label>Criterio</Label>
            <Select value={criterio} onValueChange={setCriterio}>
              <SelectTrigger><SelectValue placeholder="Scegli un criterio…" /></SelectTrigger>
              <SelectContent>
                {criteriDisponibili.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24 space-y-1">
            <Label>Voto</Label>
            <Select value={punteggio} onValueChange={setPunteggio}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opzionale" />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
        </form>
      </div>

      <ApprovalSection
        modulo="gare" entita="gare" entitaId={gara.id}
        tipiRichiesta={[{ value: 'go_no_go', label: 'Decisione di partecipazione (Go/No-Go)' }]}
        azioneUrl={`/gare/${gara.id}`}
      />
    </div>
  )
}
