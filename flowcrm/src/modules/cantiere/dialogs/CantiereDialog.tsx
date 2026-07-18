/**
 * CantiereDialog — anagrafica del cantiere (documento §1): committenza,
 * localizzazione, date, importi, figure responsabili.
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
import { useOrganizzazioni } from '@/lib/queries/organizzazioni'
import { useUsers } from '@/lib/queries/users'
import { CANTIERE_STATI } from '@/modules/cantiere/stati'
import {
  useCreateCantiere, useUpdateCantiere, type Cantiere, type CantiereStato,
} from '@/modules/cantiere/queries/cantieri'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  cantiere?: Cantiere
}

const oNull = (s: string) => (s.trim() === '' ? null : s.trim())

function SelectOrg({ value, onChange, organizzazioni, placeholder }: {
  value: string; onChange: (v: string) => void
  organizzazioni: { id: string; ragione_sociale: string }[]
  placeholder?: string
}) {
  return (
    <Select value={value || 'nessuno'} onValueChange={(v) => onChange(v === 'nessuno' ? '' : v)}>
      <SelectTrigger><SelectValue placeholder={placeholder ?? 'Seleziona…'} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="nessuno">— Nessuno —</SelectItem>
        {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

export function CantiereDialog({ open, onOpenChange, cantiere }: Props) {
  const create = useCreateCantiere()
  const update = useUpdateCantiere()
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const { data: utenti = [] } = useUsers()
  const isEdit = !!cantiere
  const pending = create.isPending || update.isPending

  const [denominazione, setDenominazione] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [committenteId, setCommittenteId] = useState('')
  const [stazioneId, setStazioneId] = useState('')
  const [stato, setStato] = useState<CantiereStato>('pianificato')
  const [importoContr, setImportoContr] = useState('')
  const [importoLavori, setImportoLavori] = useState('')
  const [categoria, setCategoria] = useState('')
  const [cig, setCig] = useState('')
  const [cup, setCup] = useState('')
  const [indirizzo, setIndirizzo] = useState('')
  const [citta, setCitta] = useState('')
  const [dataApertura, setDataApertura] = useState('')
  const [dataFine, setDataFine] = useState('')
  const [dl, setDl] = useState('')
  const [rup, setRup] = useState('')
  const [dirTecnico, setDirTecnico] = useState('')
  const [respSicurezza, setRespSicurezza] = useState('')
  const [respInternoId, setRespInternoId] = useState('')
  const [capocantiereId, setCapocantiereId] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (cantiere) {
      setDenominazione(cantiere.denominazione)
      setClienteId(cantiere.cliente_id ?? '')
      setCommittenteId(cantiere.committente_id ?? '')
      setStazioneId(cantiere.stazione_appaltante_id ?? '')
      setStato(cantiere.stato)
      setImportoContr(cantiere.importo_contrattuale != null ? String(cantiere.importo_contrattuale) : '')
      setImportoLavori(cantiere.importo_lavori != null ? String(cantiere.importo_lavori) : '')
      setCategoria(cantiere.categoria_lavori ?? '')
      setCig(cantiere.cig ?? ''); setCup(cantiere.cup ?? '')
      setIndirizzo(cantiere.indirizzo ?? ''); setCitta(cantiere.citta ?? '')
      setDataApertura(cantiere.data_apertura ?? ''); setDataFine(cantiere.data_fine_prevista ?? '')
      setDl(cantiere.direttore_lavori ?? ''); setRup(cantiere.rup ?? '')
      setDirTecnico(cantiere.direttore_tecnico ?? ''); setRespSicurezza(cantiere.responsabile_sicurezza ?? '')
      setRespInternoId(cantiere.responsabile_interno_id ?? '')
      setCapocantiereId(cantiere.capocantiere_id ?? '')
      setNote(cantiere.note ?? '')
    } else {
      setDenominazione(''); setClienteId(''); setCommittenteId(''); setStazioneId('')
      setStato('pianificato'); setImportoContr(''); setImportoLavori(''); setCategoria('')
      setCig(''); setCup(''); setIndirizzo(''); setCitta('')
      setDataApertura(''); setDataFine(''); setDl(''); setRup('')
      setDirTecnico(''); setRespSicurezza(''); setRespInternoId(''); setCapocantiereId('')
      setNote('')
    }
  }, [open, cantiere])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!denominazione.trim()) { toast.error('La denominazione è obbligatoria'); return }
    const impC = importoContr === '' ? 0 : Number(importoContr)
    if (Number.isNaN(impC)) { toast.error('Importo contrattuale non valido'); return }

    const values = {
      denominazione: denominazione.trim(),
      cliente_id: oNull(clienteId),
      committente_id: oNull(committenteId),
      stazione_appaltante_id: oNull(stazioneId),
      stato,
      importo_contrattuale: impC,
      importo_lavori: importoLavori === '' ? null : Number(importoLavori),
      categoria_lavori: oNull(categoria),
      cig: oNull(cig), cup: oNull(cup),
      indirizzo: oNull(indirizzo), citta: oNull(citta),
      data_apertura: oNull(dataApertura),
      data_fine_prevista: oNull(dataFine),
      direttore_lavori: oNull(dl), rup: oNull(rup),
      direttore_tecnico: oNull(dirTecnico),
      responsabile_sicurezza: oNull(respSicurezza),
      responsabile_interno_id: oNull(respInternoId),
      capocantiere_id: oNull(capocantiereId),
      note: oNull(note),
    }

    try {
      if (cantiere) {
        await update.mutateAsync({ id: cantiere.id, values })
        toast.success('Cantiere aggiornato')
      } else {
        await create.mutateAsync(values)
        toast.success('Cantiere creato')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante il salvataggio')
    }
  }

  const utentiAttivi = utenti.filter((u) => u.attivo)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Modifica cantiere ${cantiere?.codice ?? ''}` : 'Nuovo cantiere'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-den">Denominazione *</Label>
            <Input id="c-den" value={denominazione} onChange={(e) => setDenominazione(e.target.value)}
              placeholder="Es. Ristrutturazione condominio via Roma 12" required autoFocus />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <SelectOrg value={clienteId} onChange={setClienteId} organizzazioni={organizzazioni} />
            </div>
            <div className="space-y-1.5">
              <Label>Committente</Label>
              <SelectOrg value={committenteId} onChange={setCommittenteId} organizzazioni={organizzazioni} />
            </div>
            <div className="space-y-1.5">
              <Label>Stazione appaltante</Label>
              <SelectOrg value={stazioneId} onChange={setStazioneId} organizzazioni={organizzazioni} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select value={stato} onValueChange={(v) => setStato(v as CantiereStato)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CANTIERE_STATI.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-impc">Importo contratto (€)</Label>
              <Input id="c-impc" type="number" min="0" step="0.01" value={importoContr}
                onChange={(e) => setImportoContr(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-impl">Importo lavori (€)</Label>
              <Input id="c-impl" type="number" min="0" step="0.01" value={importoLavori}
                onChange={(e) => setImportoLavori(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-cat">Categoria lavori</Label>
              <Input id="c-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)}
                placeholder="Es. OG1" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-cig">CIG</Label>
              <Input id="c-cig" value={cig} onChange={(e) => setCig(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-cup">CUP</Label>
              <Input id="c-cup" value={cup} onChange={(e) => setCup(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-apertura">Apertura</Label>
              <Input id="c-apertura" type="date" value={dataApertura}
                onChange={(e) => setDataApertura(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-fine">Fine prevista</Label>
              <Input id="c-fine" type="date" value={dataFine}
                onChange={(e) => setDataFine(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-ind">Indirizzo</Label>
              <Input id="c-ind" value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-citta">Città</Label>
              <Input id="c-citta" value={citta} onChange={(e) => setCitta(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Responsabile interno</Label>
              <Select value={respInternoId || 'nessuno'}
                onValueChange={(v) => setRespInternoId(v === 'nessuno' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">— Nessuno —</SelectItem>
                  {utentiAttivi.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Capocantiere</Label>
              <Select value={capocantiereId || 'nessuno'}
                onValueChange={(v) => setCapocantiereId(v === 'nessuno' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">— Nessuno —</SelectItem>
                  {utentiAttivi.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-dl">Direttore lavori</Label>
              <Input id="c-dl" value={dl} onChange={(e) => setDl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-rup">RUP</Label>
              <Input id="c-rup" value={rup} onChange={(e) => setRup(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-dt">Direttore tecnico</Label>
              <Input id="c-dt" value={dirTecnico} onChange={(e) => setDirTecnico(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-rs">Responsabile sicurezza</Label>
              <Input id="c-rs" value={respSicurezza} onChange={(e) => setRespSicurezza(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-note">Note</Label>
            <Textarea id="c-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvataggio…' : isEdit ? 'Salva' : 'Crea cantiere'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
