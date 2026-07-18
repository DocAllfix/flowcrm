/**
 * AppuntamentoDialog — prenotazione in agenda (documento §3). La durata
 * si precompila dalla prestazione; il DB blocca le sovrapposizioni del
 * professionista (anti doppia prenotazione).
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
import { Checkbox } from '@/components/ui/checkbox'
import { APPUNTAMENTO_STATO, nomePaziente } from '@/modules/poliambulatori/stati'
import {
  useSaveAppuntamento, useDeleteAppuntamento, usePazienti, usePoliLista,
  type Appuntamento, type Professionista, type Ambulatorio, type Prestazione,
} from '@/modules/poliambulatori/queries/poliambulatorio'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  appuntamento?: Appuntamento
  /** Slot precompilato dal click sul calendario. */
  slotIniziale?: Date
}

export function AppuntamentoDialog({ open, onOpenChange, appuntamento, slotIniziale }: Props) {
  const save = useSaveAppuntamento()
  const del = useDeleteAppuntamento()
  const { data: pazienti = [] } = usePazienti()
  const { data: professionisti = [] } = usePoliLista<Professionista>('professionisti')
  const { data: ambulatori = [] } = usePoliLista<Ambulatorio>('ambulatori')
  const { data: prestazioni = [] } = usePoliLista<Prestazione>('prestazioni')
  const isEdit = !!appuntamento

  const [pazienteId, setPazienteId] = useState('')
  const [professionistaId, setProfessionistaId] = useState('')
  const [ambulatorioId, setAmbulatorioId] = useState('')
  const [prestazioneId, setPrestazioneId] = useState('')
  const [inizio, setInizio] = useState('')
  const [durata, setDurata] = useState('30')
  const [stato, setStato] = useState('prenotato')
  const [urgente, setUrgente] = useState(false)
  const [listaAttesa, setListaAttesa] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (appuntamento) {
      setPazienteId(appuntamento.paziente_id)
      setProfessionistaId(appuntamento.professionista_id)
      setAmbulatorioId(appuntamento.ambulatorio_id ?? '')
      setPrestazioneId(appuntamento.prestazione_id ?? '')
      setInizio(new Date(appuntamento.inizio).toISOString().slice(0, 16))
      setDurata(String(appuntamento.durata_minuti))
      setStato(appuntamento.stato)
      setUrgente(appuntamento.urgente)
      setListaAttesa(appuntamento.lista_attesa)
      setNote(appuntamento.note ?? '')
    } else {
      setPazienteId(''); setProfessionistaId(''); setAmbulatorioId(''); setPrestazioneId('')
      setInizio(slotIniziale
        ? new Date(slotIniziale.getTime() - slotIniziale.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        : '')
      setDurata('30'); setStato('prenotato'); setUrgente(false); setListaAttesa(false); setNote('')
    }
  }, [open, appuntamento, slotIniziale])

  // La prestazione precompila la durata
  useEffect(() => {
    if (!prestazioneId) return
    const p = prestazioni.find((x) => x.id === prestazioneId)
    if (p) setDurata(String(p.durata_minuti))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prestazioneId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!pazienteId) { toast.error('Scegli il paziente'); return }
    if (!professionistaId) { toast.error('Scegli il professionista'); return }
    if (!inizio) { toast.error('Indica data e ora'); return }
    try {
      await save.mutateAsync({
        id: appuntamento?.id,
        values: {
          paziente_id: pazienteId,
          professionista_id: professionistaId,
          ambulatorio_id: ambulatorioId || null,
          prestazione_id: prestazioneId || null,
          inizio: new Date(inizio).toISOString(),
          durata_minuti: Number(durata) || 30,
          stato: stato as 'prenotato',
          urgente, lista_attesa: listaAttesa,
          note: note.trim() || null,
        },
      })
      toast.success(isEdit ? 'Appuntamento aggiornato' : 'Appuntamento prenotato')
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifica appuntamento' : 'Nuovo appuntamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Paziente *</Label>
            <Select value={pazienteId} onValueChange={setPazienteId}>
              <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
              <SelectContent>
                {pazienti.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{nomePaziente(p)} · {p.codice}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Professionista *</Label>
              <Select value={professionistaId} onValueChange={setProfessionistaId}>
                <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
                <SelectContent>
                  {professionisti.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} {p.cognome ?? ''}{p.specializzazione ? ` (${p.specializzazione})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prestazione</Label>
              <Select value={prestazioneId || 'nessuna'}
                onValueChange={(v) => setPrestazioneId(v === 'nessuna' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuna">—</SelectItem>
                  {prestazioni.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome} ({p.durata_minuti}')</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-inizio">Data e ora *</Label>
              <Input id="ap-inizio" type="datetime-local" value={inizio}
                onChange={(e) => setInizio(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-durata">Durata (minuti)</Label>
              <Input id="ap-durata" type="number" min="5" step="5" value={durata}
                onChange={(e) => setDurata(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Ambulatorio</Label>
              <Select value={ambulatorioId || 'nessuno'}
                onValueChange={(v) => setAmbulatorioId(v === 'nessuno' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">—</SelectItem>
                  {ambulatori.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isEdit && (
              <div className="space-y-1.5">
                <Label>Stato</Label>
                <Select value={stato} onValueChange={setStato}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(APPUNTAMENTO_STATO).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={urgente} onCheckedChange={(v) => setUrgente(v === true)} />
              Urgente
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={listaAttesa} onCheckedChange={(v) => setListaAttesa(v === true)} />
              Lista d'attesa
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ap-note">Note</Label>
            <Input id="ap-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <DialogFooter className="gap-2">
            {isEdit && (
              <Button type="button" variant="destructive"
                onClick={() => {
                  del.mutate(appuntamento!.id, {
                    onSuccess: () => { toast.success('Appuntamento eliminato'); onOpenChange(false) },
                    onError: (e) => toast.error((e as Error).message),
                  })
                }}>
                Elimina
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvataggio…' : isEdit ? 'Salva' : 'Prenota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
