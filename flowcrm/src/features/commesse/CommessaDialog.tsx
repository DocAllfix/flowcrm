import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useCreateCommessa } from '@/lib/queries/commesse'
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
}

export function CommessaDialog({ open, onOpenChange, preset }: Props) {
  const create = useCreateCommessa()
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const [descrizione, setDescrizione] = useState('')
  const [importo, setImporto] = useState('')
  const [orgId, setOrgId] = useState('')

  useEffect(() => {
    if (open) {
      setDescrizione(preset?.descrizione ?? '')
      setImporto(preset ? String(preset.importo) : '')
      setOrgId(preset?.organizzazione_id ?? '')
    }
  }, [open, preset])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!descrizione.trim()) { toast.error('La descrizione è obbligatoria'); return }
    if (!orgId) { toast.error("L'organizzazione è obbligatoria"); return }
    try {
      const c = await create.mutateAsync({
        organizzazione_id: orgId,
        deal_id: preset?.deal_id ?? null,
        descrizione: descrizione.trim(),
        importo: importo ? Number(importo) : 0,
      })
      toast.success(`Commessa ${c.codice} creata`)
      onOpenChange(false)
    } catch {
      toast.error('Errore durante la creazione')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{preset ? 'Crea commessa da deal' : 'Nuova commessa'}</DialogTitle>
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
            <Button type="submit" disabled={create.isPending} data-testid="commessa-salva">
              {create.isPending ? 'Creazione…' : 'Crea commessa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
