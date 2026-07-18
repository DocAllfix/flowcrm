/**
 * RapportinoDialog — rapportino giornaliero del capocantiere (documento
 * §9). Ottimizzato mobile: colonna singola, campi grandi, compilazione
 * in meno di un minuto. Le foto si allegano dalla scheda (Documenti).
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
import { useAuth } from '@/hooks/useAuth'
import { METEO_LABEL } from '@/modules/cantiere/stati'
import {
  useCreaFiglioCantiere, useAggiornaFiglioCantiere, type CantiereRapportino,
} from '@/modules/cantiere/queries/cantieri'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  cantiereId: string
  rapportino?: CantiereRapportino
}

export function RapportinoDialog({ open, onOpenChange, cantiereId, rapportino }: Props) {
  const { userProfile } = useAuth()
  const crea = useCreaFiglioCantiere()
  const aggiorna = useAggiornaFiglioCantiere()
  const isEdit = !!rapportino
  const pending = crea.isPending || aggiorna.isPending

  const [data, setData] = useState('')
  const [lavorazioni, setLavorazioni] = useState('')
  const [personale, setPersonale] = useState('')
  const [mezzi, setMezzi] = useState('')
  const [materiali, setMateriali] = useState('')
  const [meteo, setMeteo] = useState('')
  const [problemi, setProblemi] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (rapportino) {
      setData(rapportino.data)
      setLavorazioni(rapportino.lavorazioni)
      setPersonale(rapportino.personale ?? '')
      setMezzi(rapportino.mezzi ?? '')
      setMateriali(rapportino.materiali ?? '')
      setMeteo(rapportino.meteo ?? '')
      setProblemi(rapportino.problemi ?? '')
      setNote(rapportino.note ?? '')
    } else {
      setData(new Date().toISOString().slice(0, 10))
      setLavorazioni(''); setPersonale(''); setMezzi(''); setMateriali('')
      setMeteo(''); setProblemi(''); setNote('')
    }
  }, [open, rapportino])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!lavorazioni.trim()) { toast.error('Descrivi le lavorazioni eseguite'); return }
    const values = {
      data,
      lavorazioni: lavorazioni.trim(),
      personale: personale.trim() || null,
      mezzi: mezzi.trim() || null,
      materiali: materiali.trim() || null,
      meteo: meteo || null,
      problemi: problemi.trim() || null,
      note: note.trim() || null,
      capocantiere_id: rapportino?.capocantiere_id ?? userProfile?.id ?? null,
    }
    try {
      if (rapportino) {
        await aggiorna.mutateAsync({
          cantiereId, tabella: 'cantiere_rapportini', id: rapportino.id, values,
        })
        toast.success('Rapportino aggiornato')
      } else {
        await crea.mutateAsync({ cantiereId, tabella: 'cantiere_rapportini', values })
        toast.success('Rapportino registrato')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifica rapportino' : 'Rapportino di oggi'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="r-data">Data</Label>
              <Input id="r-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Meteo</Label>
              <Select value={meteo || 'nessuno'} onValueChange={(v) => setMeteo(v === 'nessuno' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">—</SelectItem>
                  {Object.entries(METEO_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-lav">Lavorazioni eseguite *</Label>
            <Textarea id="r-lav" value={lavorazioni} onChange={(e) => setLavorazioni(e.target.value)}
              placeholder="Es. Getto solaio piano primo, posa impianti bagno" rows={3} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-per">Personale presente</Label>
            <Textarea id="r-per" value={personale} onChange={(e) => setPersonale(e.target.value)}
              placeholder="Es. Rossi, Bianchi, 2 operai impresa Verdi" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-mez">Mezzi utilizzati</Label>
            <Input id="r-mez" value={mezzi} onChange={(e) => setMezzi(e.target.value)}
              placeholder="Es. Escavatore, autocarro" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-mat">Materiali impiegati</Label>
            <Input id="r-mat" value={materiali} onChange={(e) => setMateriali(e.target.value)}
              placeholder="Es. 4 mc calcestruzzo, 20 q ferro" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-pro">Problemi riscontrati</Label>
            <Textarea id="r-pro" value={problemi} onChange={(e) => setProblemi(e.target.value)}
              placeholder="Vuoto = nessun problema" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-note">Note</Label>
            <Input id="r-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvataggio…' : isEdit ? 'Salva' : 'Registra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
