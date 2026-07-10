import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useSaveDipendente, type Dipendente, type TipoContratto } from '@/lib/queries/hr'
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

const CONTRATTI: { value: NonNullable<TipoContratto>; label: string }[] = [
  { value: 'indeterminato', label: 'Indeterminato' },
  { value: 'determinato', label: 'Determinato' },
  { value: 'apprendistato', label: 'Apprendistato' },
  { value: 'collaborazione', label: 'Collaborazione' },
  { value: 'stage', label: 'Stage' },
  { value: 'partita_iva', label: 'Partita IVA' },
]
const NESSUNO = '__nessuno__'
const EMPTY = { nome: '', cognome: '', email: '', telefono: '', qualifica: '', data_assunzione: '', data_fine: '', note: '' }

export function DipendenteDialog({ open, onOpenChange, dipendente }: {
  open: boolean; onOpenChange: (o: boolean) => void; dipendente?: Dipendente
}) {
  const save = useSaveDipendente()
  const [form, setForm] = useState(EMPTY)
  const [contratto, setContratto] = useState<string>(NESSUNO)
  const isEdit = !!dipendente

  useEffect(() => {
    if (!open) return
    if (dipendente) {
      setForm({
        nome: dipendente.nome, cognome: dipendente.cognome ?? '', email: dipendente.email ?? '',
        telefono: dipendente.telefono ?? '', qualifica: dipendente.qualifica ?? '',
        data_assunzione: dipendente.data_assunzione ?? '', data_fine: dipendente.data_fine ?? '', note: dipendente.note ?? '',
      })
      setContratto(dipendente.tipo_contratto ?? NESSUNO)
    } else { setForm(EMPTY); setContratto(NESSUNO) }
  }, [open, dipendente])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { toast.error('Il nome è obbligatorio'); return }
    const values = {
      nome: form.nome.trim(), cognome: form.cognome.trim() || null, email: form.email.trim() || null,
      telefono: form.telefono.trim() || null, qualifica: form.qualifica.trim() || null,
      tipo_contratto: contratto === NESSUNO ? null : (contratto as TipoContratto),
      data_assunzione: form.data_assunzione || null, data_fine: form.data_fine || null, note: form.note.trim() || null,
    }
    try {
      await save.mutateAsync({ id: dipendente?.id, values })
      toast.success(isEdit ? 'Dipendente aggiornato' : 'Dipendente aggiunto')
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? 'Modifica dipendente' : 'Nuovo dipendente'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label htmlFor="d-nome">Nome *</Label>
              <Input id="d-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoFocus /></div>
            <div className="space-y-1.5"><Label htmlFor="d-cognome">Cognome</Label>
              <Input id="d-cognome" value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="d-email">Email</Label>
              <Input id="d-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="d-tel">Telefono</Label>
              <Input id="d-tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="d-qual">Qualifica</Label>
              <Input id="d-qual" value={form.qualifica} onChange={(e) => setForm({ ...form, qualifica: e.target.value })} placeholder="es. Sviluppatore" /></div>
            <div className="space-y-1.5"><Label>Contratto</Label>
              <Select value={contratto} onValueChange={setContratto}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NESSUNO}>—</SelectItem>
                  {CONTRATTI.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label htmlFor="d-ass">Assunzione</Label>
              <Input id="d-ass" type="date" value={form.data_assunzione} onChange={(e) => setForm({ ...form, data_assunzione: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="d-fine">Fine contratto</Label>
              <Input id="d-fine" type="date" value={form.data_fine} onChange={(e) => setForm({ ...form, data_fine: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="d-note">Note</Label>
            <Textarea id="d-note" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Salvataggio…' : isEdit ? 'Salva' : 'Aggiungi'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
