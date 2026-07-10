import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useCreateAttivita, type AttivitaScope, type AttivitaTipo } from '@/lib/queries/attivita'
import { useAuth } from '@/hooks/useAuth'
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

const TIPI: { value: AttivitaTipo; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'chiamata', label: 'Chiamata' },
  { value: 'email', label: 'Email' },
  { value: 'riunione', label: 'Riunione' },
  { value: 'nota', label: 'Nota' },
]

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** Entità a cui collegare l'attività (dal 360°). */
  scope?: AttivitaScope
  /** Tipo iniziale (default task). */
  tipoIniziale?: AttivitaTipo
}

export function AttivitaDialog({ open, onOpenChange, scope, tipoIniziale = 'task' }: Props) {
  const { userProfile } = useAuth()
  const create = useCreateAttivita()
  const [tipo, setTipo] = useState<AttivitaTipo>(tipoIniziale)
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [inizio, setInizio] = useState('')
  const [durata, setDurata] = useState('60')
  const [luogo, setLuogo] = useState('')

  useEffect(() => {
    if (open) {
      setTipo(tipoIniziale)
      setTitolo(''); setDescrizione(''); setScadenza('')
      setInizio(''); setDurata('60'); setLuogo('')
    }
  }, [open, tipoIniziale])

  const isRiunione = tipo === 'riunione'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titolo.trim()) {
      toast.error('Il titolo è obbligatorio')
      return
    }
    if (isRiunione && !inizio) {
      toast.error('Data e ora di inizio obbligatorie per una riunione')
      return
    }
    try {
      await create.mutateAsync({
        tipo,
        titolo: titolo.trim(),
        descrizione: descrizione.trim() || null,
        scadenza: !isRiunione && scadenza ? new Date(scadenza).toISOString() : null,
        inizio: isRiunione && inizio ? new Date(inizio).toISOString() : null,
        durata_minuti: isRiunione ? Number(durata) || 60 : null,
        luogo: isRiunione ? luogo.trim() || null : null,
        assegnato_a: userProfile?.id ?? null,
        ...scope,
      })
      toast.success('Attività creata')
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante la creazione')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuova attività</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as AttivitaTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPI.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="titolo">Titolo *</Label>
            <Input id="titolo" value={titolo} onChange={(e) => setTitolo(e.target.value)}
              required autoFocus data-testid="attivita-titolo" />
          </div>

          {isRiunione ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inizio">Inizio *</Label>
                <Input id="inizio" type="datetime-local" value={inizio}
                  onChange={(e) => setInizio(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="durata">Durata (min)</Label>
                <Input id="durata" type="number" min="15" step="15" value={durata}
                  onChange={(e) => setDurata(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="luogo">Luogo</Label>
                <Input id="luogo" value={luogo} onChange={(e) => setLuogo(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="scadenza">Scadenza</Label>
              <Input id="scadenza" type="date" value={scadenza}
                onChange={(e) => setScadenza(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea id="descrizione" rows={3} value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={create.isPending} data-testid="attivita-salva">
              {create.isPending ? 'Creazione…' : 'Crea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
