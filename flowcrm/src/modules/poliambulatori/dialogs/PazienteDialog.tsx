/**
 * PazienteDialog — anagrafica amministrativa del paziente (documento §1).
 * I dati clinici NON stanno qui: vivono nel fascicolo (solo medici).
 */
import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
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
import {
  useSavePaziente, usePoliLista, type Paziente, type Convenzione,
} from '@/modules/poliambulatori/queries/poliambulatorio'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  paziente?: Paziente
}

const oNull = (s: string) => (s.trim() === '' ? null : s.trim())

export function PazienteDialog({ open, onOpenChange, paziente }: Props) {
  const save = useSavePaziente()
  const { data: convenzioni = [] } = usePoliLista<Convenzione>('convenzioni')
  const isEdit = !!paziente

  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [cf, setCf] = useState('')
  const [documento, setDocumento] = useState('')
  const [dataNascita, setDataNascita] = useState('')
  const [luogoNascita, setLuogoNascita] = useState('')
  const [sesso, setSesso] = useState('')
  const [residenza, setResidenza] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [medicoCurante, setMedicoCurante] = useState('')
  const [emergenza, setEmergenza] = useState('')
  const [convenzioneId, setConvenzioneId] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (paziente) {
      setNome(paziente.nome); setCognome(paziente.cognome ?? '')
      setCf(paziente.codice_fiscale ?? ''); setDocumento(paziente.documento ?? '')
      setDataNascita(paziente.data_nascita ?? ''); setLuogoNascita(paziente.luogo_nascita ?? '')
      setSesso(paziente.sesso ?? ''); setResidenza(paziente.residenza ?? '')
      setTelefono(paziente.telefono ?? ''); setEmail(paziente.email ?? '')
      setMedicoCurante(paziente.medico_curante ?? ''); setEmergenza(paziente.contatto_emergenza ?? '')
      setConvenzioneId(paziente.convenzione_id ?? ''); setNote(paziente.note_amministrative ?? '')
    } else {
      setNome(''); setCognome(''); setCf(''); setDocumento(''); setDataNascita('')
      setLuogoNascita(''); setSesso(''); setResidenza(''); setTelefono(''); setEmail('')
      setMedicoCurante(''); setEmergenza(''); setConvenzioneId(''); setNote('')
    }
  }, [open, paziente])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Il nome è obbligatorio'); return }
    const values = {
      nome: nome.trim(), cognome: oNull(cognome),
      codice_fiscale: oNull(cf.toUpperCase()), documento: oNull(documento),
      data_nascita: oNull(dataNascita), luogo_nascita: oNull(luogoNascita),
      sesso: (sesso || null) as 'm' | null,
      residenza: oNull(residenza),
      telefono: oNull(telefono), email: oNull(email),
      medico_curante: oNull(medicoCurante), contatto_emergenza: oNull(emergenza),
      convenzione_id: oNull(convenzioneId),
      note_amministrative: oNull(note),
    }
    try {
      await save.mutateAsync({ id: paziente?.id, values })
      toast.success(isEdit ? 'Paziente aggiornato' : 'Paziente registrato')
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Modifica ${paziente?.codice ?? ''}` : 'Nuovo paziente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-nome">Nome *</Label>
              <Input id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cognome">Cognome</Label>
              <Input id="p-cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cf">Codice fiscale</Label>
              <Input id="p-cf" value={cf} onChange={(e) => setCf(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-nascita">Data di nascita</Label>
              <Input id="p-nascita" type="date" value={dataNascita}
                onChange={(e) => setDataNascita(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-luogo">Luogo di nascita</Label>
              <Input id="p-luogo" value={luogoNascita} onChange={(e) => setLuogoNascita(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sesso</Label>
              <Select value={sesso || 'nd'} onValueChange={(v) => setSesso(v === 'nd' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nd">—</SelectItem>
                  <SelectItem value="f">F</SelectItem>
                  <SelectItem value="m">M</SelectItem>
                  <SelectItem value="altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-doc">Documento</Label>
              <Input id="p-doc" value={documento} onChange={(e) => setDocumento(e.target.value)}
                placeholder="Tipo e numero" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-res">Residenza</Label>
              <Input id="p-res" value={residenza} onChange={(e) => setResidenza(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-tel">Telefono</Label>
              <Input id="p-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-medico">Medico curante</Label>
              <Input id="p-medico" value={medicoCurante} onChange={(e) => setMedicoCurante(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-emerg">Contatto di emergenza</Label>
              <Input id="p-emerg" value={emergenza} onChange={(e) => setEmergenza(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Convenzione</Label>
              <Select value={convenzioneId || 'nessuna'}
                onValueChange={(v) => setConvenzioneId(v === 'nessuna' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Privato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuna">— Privato —</SelectItem>
                  {convenzioni.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-note">Note amministrative</Label>
            <Textarea id="p-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvataggio…' : isEdit ? 'Salva' : 'Registra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
