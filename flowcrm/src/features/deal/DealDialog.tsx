import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useCreateDeal, usePipelineStages } from '@/lib/queries/deals'
import { useOrganizzazioni } from '@/lib/queries/organizzazioni'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** Preseleziona un'organizzazione (dalla scheda 360°). */
  organizzazioneId?: string
}

const EMPTY = { nome: '', importo: '', data_chiusura_prevista: '', organizzazione_id: '' }

export function DealDialog({ open, onOpenChange, organizzazioneId }: Props) {
  const create = useCreateDeal()
  const { data: stages = [] } = usePipelineStages()
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (open) setForm({ ...EMPTY, organizzazione_id: organizzazioneId ?? '' })
  }, [open, organizzazioneId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast.error('Il nome del deal è obbligatorio')
      return
    }
    // Nuovo deal → primo stage della pipeline (ordine minimo)
    const primoStage = stages[0]
    if (!primoStage) {
      toast.error('Nessuna pipeline configurata')
      return
    }
    try {
      await create.mutateAsync({
        nome: form.nome.trim(),
        pipeline_id: primoStage.pipeline_id,
        stage_id: primoStage.id,
        importo: form.importo ? Number(form.importo) : 0,
        organizzazione_id: form.organizzazione_id || null,
        data_chiusura_prevista: form.data_chiusura_prevista || null,
      })
      toast.success('Deal creato')
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante la creazione')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuovo deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome deal *</Label>
            <Input id="nome" value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required autoFocus data-testid="deal-nome" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="importo">Importo (€)</Label>
              <Input id="importo" type="number" min="0" step="100" value={form.importo}
                onChange={(e) => setForm({ ...form, importo: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chiusura">Chiusura prevista</Label>
              <Input id="chiusura" type="date" value={form.data_chiusura_prevista}
                onChange={(e) => setForm({ ...form, data_chiusura_prevista: e.target.value })} />
            </div>
          </div>

          {!organizzazioneId && (
            <div className="space-y-1.5">
              <Label>Organizzazione</Label>
              <Select
                value={form.organizzazione_id}
                onValueChange={(v) => setForm({ ...form, organizzazione_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Nessuna" /></SelectTrigger>
                <SelectContent>
                  {organizzazioni.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={create.isPending} data-testid="deal-salva">
              {create.isPending ? 'Creazione…' : 'Crea deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
