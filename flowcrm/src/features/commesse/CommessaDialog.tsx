import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useCreateCommessa, useUpdateCommessa, type Commessa } from '@/lib/queries/commesse'
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
import { Textarea } from '@/components/ui/textarea'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** Precompila da un deal vinto (organizzazione, importo, deal_id). */
  preset?: {
    organizzazione_id: string | null
    deal_id: string
    descrizione: string
    importo: number
  }
  /** Se presente, il dialog è in modalità modifica. */
  commessa?: Commessa
}

export function CommessaDialog({ open, onOpenChange, preset, commessa }: Props) {
  const create = useCreateCommessa()
  const update = useUpdateCommessa()
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const [descrizione, setDescrizione] = useState('')
  const [importo, setImporto] = useState('')
  const [orgId, setOrgId] = useState('')
  const isEdit = !!commessa
  const pending = create.isPending || update.isPending

  useEffect(() => {
    if (!open) return
    if (commessa) {
      setDescrizione(commessa.descrizione ?? '')
      setImporto(commessa.importo != null ? String(commessa.importo) : '')
      setOrgId(commessa.organizzazione_id ?? '')
    } else {
      setDescrizione(preset?.descrizione ?? '')
      setImporto(preset ? String(preset.importo) : '')
      setOrgId(preset?.organizzazione_id ?? '')
    }
  }, [open, preset, commessa])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!descrizione.trim()) { toast.error('La descrizione è obbligatoria'); return }
    if (!orgId) { toast.error("L'organizzazione è obbligatoria"); return }
    const importoN = importo ? Number(importo) : 0
    if (Number.isNaN(importoN)) { toast.error('Importo non valido'); return }
    try {
      if (commessa) {
        await update.mutateAsync({ id: commessa.id, values: {
          organizzazione_id: orgId, descrizione: descrizione.trim(), importo: importoN,
        } })
        toast.success('Commessa aggiornata')
      } else {
        const c = await create.mutateAsync({
          organizzazione_id: orgId,
          deal_id: preset?.deal_id ?? null,
          descrizione: descrizione.trim(),
          importo: importoN,
        })
        toast.success(`Commessa ${c.codice} creata`)
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
          <DialogTitle>{isEdit ? 'Modifica commessa' : preset ? 'Crea commessa da deal' : 'Nuova commessa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Organizzazione *</Label>
            <Select value={orgId} onValueChange={setOrgId} disabled={!!preset?.organizzazione_id}>
              <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
              <SelectContent>
                {organizzazioni.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descrizione">Descrizione *</Label>
            <Textarea id="descrizione" rows={2} value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)} required
              data-testid="commessa-descrizione" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="importo">Importo (€)</Label>
            <Input id="importo" type="number" min="0" step="100" value={importo}
              onChange={(e) => setImporto(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={pending} data-testid="commessa-salva">
              {pending ? 'Salvataggio…' : isEdit ? 'Salva' : 'Crea commessa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
