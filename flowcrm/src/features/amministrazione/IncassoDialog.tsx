import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useCreateIncasso, useUpdateIncasso, type ScadenzaPagamento } from '@/lib/queries/amministrazione'
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
  incasso?: ScadenzaPagamento
}

export function IncassoDialog({ open, onOpenChange, incasso }: Props) {
  const create = useCreateIncasso()
  const update = useUpdateIncasso()
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const [descrizione, setDescrizione] = useState('')
  const [orgId, setOrgId] = useState('')
  const [importo, setImporto] = useState('')
  const [dataPrevista, setDataPrevista] = useState('')
  const isEdit = !!incasso
  const pending = create.isPending || update.isPending

  useEffect(() => {
    if (!open) return
    if (incasso) {
      setDescrizione(incasso.descrizione ?? '')
      setOrgId(incasso.organizzazione_id ?? '')
      setImporto(incasso.importo != null ? String(incasso.importo) : '')
      setDataPrevista(incasso.data_prevista ?? '')
    } else {
      setDescrizione(''); setOrgId(''); setImporto(''); setDataPrevista('')
    }
  }, [open, incasso])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!descrizione.trim()) { toast.error('La descrizione è obbligatoria'); return }
    if (!orgId) { toast.error("L'organizzazione è obbligatoria"); return }
    if (!dataPrevista) { toast.error('La data prevista è obbligatoria'); return }
    const importoN = Number(importo)
    if (!importo || Number.isNaN(importoN)) { toast.error('Importo non valido'); return }
    const values = { descrizione: descrizione.trim(), organizzazione_id: orgId, importo: importoN, data_prevista: dataPrevista }
    try {
      if (incasso) {
        await update.mutateAsync({ id: incasso.id, values })
        toast.success('Incasso aggiornato')
      } else {
        await create.mutateAsync(values)
        toast.success('Incasso previsto aggiunto')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifica incasso' : 'Nuovo incasso previsto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="i-desc">Descrizione *</Label>
            <Input id="i-desc" value={descrizione} onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Es. Acconto contratto, Rata mensile" required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
              <SelectContent>
                {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="i-imp">Importo (€) *</Label>
              <Input id="i-imp" type="number" min="0" step="0.01" value={importo}
                onChange={(e) => setImporto(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i-data">Data prevista *</Label>
              <Input id="i-data" type="date" value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : isEdit ? 'Salva' : 'Aggiungi'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
