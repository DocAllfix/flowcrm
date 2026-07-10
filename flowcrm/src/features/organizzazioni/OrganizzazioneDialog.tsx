import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  useSaveOrganizzazione, ORG_RUOLI, RUOLO_LABEL,
  type OrganizzazioneConRuoli, type OrgRuolo,
} from '@/lib/queries/organizzazioni'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** Se presente, modalità modifica. */
  organizzazione?: OrganizzazioneConRuoli
}

const EMPTY = {
  ragione_sociale: '', piva: '', email: '', telefono: '',
  citta: '', settore: '', note: '',
}

export function OrganizzazioneDialog({ open, onOpenChange, organizzazione }: Props) {
  const save = useSaveOrganizzazione()
  const [form, setForm] = useState(EMPTY)
  const [ruoli, setRuoli] = useState<OrgRuolo[]>([])

  useEffect(() => {
    if (organizzazione) {
      setForm({
        ragione_sociale: organizzazione.ragione_sociale ?? '',
        piva: organizzazione.piva ?? '',
        email: organizzazione.email ?? '',
        telefono: organizzazione.telefono ?? '',
        citta: organizzazione.citta ?? '',
        settore: organizzazione.settore ?? '',
        note: organizzazione.note ?? '',
      })
      setRuoli(organizzazione.ruoli)
    } else {
      setForm(EMPTY)
      setRuoli([])
    }
  }, [organizzazione, open])

  function toggleRuolo(r: OrgRuolo) {
    setRuoli((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.ragione_sociale.trim()) {
      toast.error('La ragione sociale è obbligatoria')
      return
    }
    try {
      await save.mutateAsync({
        id: organizzazione?.id,
        values: {
          ragione_sociale: form.ragione_sociale.trim(),
          piva: form.piva.trim() || null,
          email: form.email.trim() || null,
          telefono: form.telefono.trim() || null,
          citta: form.citta.trim() || null,
          settore: form.settore.trim() || null,
          note: form.note.trim() || null,
        },
        ruoli,
      })
      toast.success(organizzazione ? 'Organizzazione aggiornata' : 'Organizzazione creata')
      onOpenChange(false)
    } catch {
      toast.error('Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {organizzazione ? 'Modifica organizzazione' : 'Nuova organizzazione'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rs">Ragione sociale *</Label>
            <Input id="rs" value={form.ragione_sociale}
              onChange={(e) => setForm({ ...form, ragione_sociale: e.target.value })}
              required autoFocus />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="piva">P.IVA</Label>
              <Input id="piva" value={form.piva}
                onChange={(e) => setForm({ ...form, piva: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settore">Settore</Label>
              <Input id="settore" value={form.settore}
                onChange={(e) => setForm({ ...form, settore: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tel">Telefono</Label>
              <Input id="tel" value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="citta">Città</Label>
              <Input id="citta" value={form.citta}
                onChange={(e) => setForm({ ...form, citta: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ruoli</Label>
            <div className="flex flex-wrap gap-2">
              {ORG_RUOLI.map((r) => {
                const active = ruoli.includes(r)
                return (
                  <button key={r} type="button" onClick={() => toggleRuolo(r)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    )}>
                    {RUOLO_LABEL[r]}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Un'organizzazione può avere più ruoli (es. cliente e partner insieme).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" rows={3} value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvataggio…' : 'Salva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
