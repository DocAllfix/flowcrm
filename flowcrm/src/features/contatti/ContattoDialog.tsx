import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useSaveContatto, type Contatto } from '@/lib/queries/contatti'
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
  contatto?: Contatto
  /** Precompila e blocca l'organizzazione (dalla scheda 360°). */
  organizzazioneId?: string
}

const NESSUNA = '__nessuna__'
const EMPTY = { nome: '', cognome: '', email: '', telefono: '', ruolo_aziendale: '' }

export function ContattoDialog({ open, onOpenChange, contatto, organizzazioneId }: Props) {
  const save = useSaveContatto()
  const { data: orgs } = useOrganizzazioni()
  const [form, setForm] = useState(EMPTY)
  const [orgId, setOrgId] = useState<string>(organizzazioneId ?? NESSUNA)

  useEffect(() => {
    if (contatto) {
      setForm({
        nome: contatto.nome ?? '', cognome: contatto.cognome ?? '',
        email: contatto.email ?? '', telefono: contatto.telefono ?? '',
        ruolo_aziendale: contatto.ruolo_aziendale ?? '',
      })
      setOrgId(contatto.organizzazione_id ?? NESSUNA)
    } else {
      setForm(EMPTY)
      setOrgId(organizzazioneId ?? NESSUNA)
    }
  }, [contatto, organizzazioneId, open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast.error('Il nome è obbligatorio')
      return
    }
    try {
      await save.mutateAsync({
        id: contatto?.id,
        values: {
          nome: form.nome.trim(),
          cognome: form.cognome.trim() || null,
          email: form.email.trim() || null,
          telefono: form.telefono.trim() || null,
          ruolo_aziendale: form.ruolo_aziendale.trim() || null,
          organizzazione_id: orgId === NESSUNA ? null : orgId,
        },
      })
      toast.success(contatto ? 'Contatto aggiornato' : 'Contatto creato')
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{contatto ? 'Modifica contatto' : 'Nuovo contatto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={form.nome} autoFocus
                onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cognome">Cognome</Label>
              <Input id="cognome" value={form.cognome}
                onChange={(e) => setForm({ ...form, cognome: e.target.value })} />
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ruoloaz">Ruolo aziendale</Label>
            <Input id="ruoloaz" value={form.ruolo_aziendale}
              placeholder="es. Responsabile acquisti"
              onChange={(e) => setForm({ ...form, ruolo_aziendale: e.target.value })} />
          </div>
          {!organizzazioneId && (
            <div className="space-y-1.5">
              <Label>Organizzazione</Label>
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger><SelectValue placeholder="Nessuna" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NESSUNA}>Nessuna</SelectItem>
                  {orgs?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvataggio…' : 'Salva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
