import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useCreateDeal, useUpdateDeal, usePipelineStages, type Deal } from '@/lib/queries/deals'
import { useOrganizzazioni } from '@/lib/queries/organizzazioni'
import { moduloBySlug } from '@/config/moduli.config'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
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
  /** Se presente, il dialog è in modalità modifica. */
  deal?: Deal
}

const EMPTY = { nome: '', importo: '', data_chiusura_prevista: '', organizzazione_id: '', agente_id: '' }

export function DealDialog({ open, onOpenChange, organizzazioneId, deal }: Props) {
  const create = useCreateDeal()
  const update = useUpdateDeal()
  const { data: stages = [] } = usePipelineStages()
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const [form, setForm] = useState(EMPTY)
  const isEdit = !!deal

  // Modulo Agenti: se attivo, il deal si può attribuire a un agente (§6)
  const moduloAgentiAttivo = !!moduloBySlug('agenti')
  const { data: agenti = [] } = useQuery({
    queryKey: ['deal-dialog', 'agenti'],
    enabled: moduloAgentiAttivo && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenti').select('id, nome, cognome').eq('attivo', true).eq('stato', 'attivo')
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (!open) return
    if (deal) {
      setForm({
        nome: deal.nome,
        importo: deal.importo != null ? String(deal.importo) : '',
        data_chiusura_prevista: deal.data_chiusura_prevista ?? '',
        organizzazione_id: deal.organizzazione_id ?? '',
        agente_id: (deal as Deal & { agente_id?: string | null }).agente_id ?? '',
      })
    } else {
      setForm({ ...EMPTY, organizzazione_id: organizzazioneId ?? '' })
    }
  }, [open, organizzazioneId, deal])

  const pending = create.isPending || update.isPending

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast.error('Il nome del deal è obbligatorio')
      return
    }
    const importo = form.importo ? Number(form.importo) : 0
    if (Number.isNaN(importo)) { toast.error('Importo non valido'); return }
    try {
      if (deal) {
        await update.mutateAsync({ id: deal.id, values: {
          nome: form.nome.trim(),
          importo,
          organizzazione_id: form.organizzazione_id || null,
          data_chiusura_prevista: form.data_chiusura_prevista || null,
          agente_id: form.agente_id || null,
        } })
        toast.success('Deal aggiornato')
      } else {
        const primoStage = stages[0]
        if (!primoStage) { toast.error('Nessuna pipeline configurata'); return }
        await create.mutateAsync({
          nome: form.nome.trim(),
          pipeline_id: primoStage.pipeline_id,
          stage_id: primoStage.id,
          importo,
          organizzazione_id: form.organizzazione_id || null,
          data_chiusura_prevista: form.data_chiusura_prevista || null,
          agente_id: form.agente_id || null,
        })
        toast.success('Deal creato')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifica deal' : 'Nuovo deal'}</DialogTitle>
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

          {moduloAgentiAttivo && agenti.length > 0 && (
            <div className="space-y-1.5">
              <Label>Agente di riferimento</Label>
              <Select
                value={form.agente_id || 'nessuno'}
                onValueChange={(v) => setForm({ ...form, agente_id: v === 'nessuno' ? '' : v })}
              >
                <SelectTrigger><SelectValue placeholder="Nessuno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">— Nessuno —</SelectItem>
                  {agenti.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome} {a.cognome ?? ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={pending} data-testid="deal-salva">
              {pending ? 'Salvataggio…' : isEdit ? 'Salva' : 'Crea deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
