import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useCreateFattura, type FatturaDirezione } from '@/lib/queries/amministrazione'
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
  direzione: FatturaDirezione
}

export function FatturaDialog({ open, onOpenChange, direzione }: Props) {
  const create = useCreateFattura()
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const [numero, setNumero] = useState('')
  const [orgId, setOrgId] = useState('')
  const [imponibile, setImponibile] = useState('')
  const [aliquota, setAliquota] = useState('22')
  const [scadenza, setScadenza] = useState('')

  useEffect(() => {
    if (open) { setNumero(''); setOrgId(''); setImponibile(''); setAliquota('22'); setScadenza('') }
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!numero.trim() || !orgId || !scadenza) {
      toast.error('Numero, organizzazione e scadenza sono obbligatori')
      return
    }
    try {
      await create.mutateAsync({
        direzione,
        numero: numero.trim(),
        organizzazione_id: orgId,
        imponibile: imponibile ? Number(imponibile) : 0,
        aliquota_iva: Number(aliquota) || 0,
        totale: 0, // il trigger calcola il default
        scadenza,
      })
      toast.success('Fattura registrata')
      onOpenChange(false)
    } catch (err) {
      toast.error('Errore', { description: (err as Error).message })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Nuova fattura {direzione === 'attiva' ? '(cliente)' : '(fornitore)'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="numero">Numero *</Label>
              <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)}
                required data-testid="fattura-numero" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scadenza">Scadenza *</Label>
              <Input id="scadenza" type="date" value={scadenza}
                onChange={(e) => setScadenza(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{direzione === 'attiva' ? 'Cliente' : 'Fornitore'} *</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
              <SelectContent>
                {organizzazioni.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="imponibile">Imponibile (€)</Label>
              <Input id="imponibile" type="number" min="0" step="0.01" value={imponibile}
                onChange={(e) => setImponibile(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aliquota">IVA %</Label>
              <Input id="aliquota" type="number" min="0" step="1" value={aliquota}
                onChange={(e) => setAliquota(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={create.isPending} data-testid="fattura-salva">
              {create.isPending ? 'Salvataggio…' : 'Registra fattura'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
