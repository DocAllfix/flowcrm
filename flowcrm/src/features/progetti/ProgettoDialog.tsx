import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useCreateProgetto, type ProgettoTipo } from '@/lib/queries/progetti'
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
}

export function ProgettoDialog({ open, onOpenChange }: Props) {
  const create = useCreateProgetto()
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const [tipo, setTipo] = useState<ProgettoTipo>('cliente')
  const [nome, setNome] = useState('')
  const [orgId, setOrgId] = useState('')
  const [budget, setBudget] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [descrizione, setDescrizione] = useState('')

  useEffect(() => {
    if (open) {
      setTipo('cliente'); setNome(''); setOrgId(''); setBudget(''); setScadenza(''); setDescrizione('')
    }
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Il nome è obbligatorio'); return }
    if (tipo === 'cliente' && !orgId) {
      toast.error("Un progetto cliente richiede un'organizzazione")
      return
    }
    try {
      await create.mutateAsync({
        tipo,
        nome: nome.trim(),
        organizzazione_id: tipo === 'cliente' ? orgId : (orgId || null),
        budget: budget ? Number(budget) : null,
        scadenza: scadenza || null,
        descrizione: descrizione.trim() || null,
      })
      toast.success('Progetto creato')
      onOpenChange(false)
    } catch {
      toast.error('Errore durante la creazione')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuovo progetto</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as ProgettoTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="interno">Interno</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)}
              required autoFocus data-testid="progetto-nome" />
          </div>
          {tipo === 'cliente' && (
            <div className="space-y-1.5">
              <Label>Organizzazione *</Label>
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
                <SelectContent>
                  {organizzazioni.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget (€)</Label>
              <Input id="budget" type="number" min="0" step="500" value={budget}
                onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scadenza">Scadenza</Label>
              <Input id="scadenza" type="date" value={scadenza}
                onChange={(e) => setScadenza(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea id="descrizione" rows={2} value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={create.isPending} data-testid="progetto-salva">
              {create.isPending ? 'Creazione…' : 'Crea progetto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
