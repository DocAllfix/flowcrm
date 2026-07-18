/**
 * AutomezzoDialog — anagrafica del veicolo (documento §1).
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
  AUTOMEZZO_STATI, CATEGORIA_LABEL, ALIMENTAZIONE_LABEL, ACQUISIZIONE_LABEL,
} from '@/modules/automezzi/stati'
import {
  useCreateAutomezzo, useUpdateAutomezzo, type Automezzo,
} from '@/modules/automezzi/queries/automezzi'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  automezzo?: Automezzo
}

const oNull = (s: string) => (s.trim() === '' ? null : s.trim())

export function AutomezzoDialog({ open, onOpenChange, automezzo }: Props) {
  const create = useCreateAutomezzo()
  const update = useUpdateAutomezzo()
  const isEdit = !!automezzo
  const pending = create.isPending || update.isPending

  const [targa, setTarga] = useState('')
  const [telaio, setTelaio] = useState('')
  const [marca, setMarca] = useState('')
  const [modello, setModello] = useState('')
  const [versione, setVersione] = useState('')
  const [categoria, setCategoria] = useState('autovettura')
  const [alimentazione, setAlimentazione] = useState('')
  const [classeEuro, setClasseEuro] = useState('')
  const [anno, setAnno] = useState('')
  const [dataAcquisto, setDataAcquisto] = useState('')
  const [acquisizione, setAcquisizione] = useState('acquisto')
  const [proprietario, setProprietario] = useState('')
  const [centroCosto, setCentroCosto] = useState('')
  const [sede, setSede] = useState('')
  const [stato, setStato] = useState('disponibile')
  const [km, setKm] = useState('')
  const [note, setNote] = useState('')
  const [dismissioneTipo, setDismissioneTipo] = useState('')
  const [dismissioneValore, setDismissioneValore] = useState('')
  const [dismissioneNote, setDismissioneNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (automezzo) {
      setTarga(automezzo.targa ?? ''); setTelaio(automezzo.telaio ?? '')
      setMarca(automezzo.marca); setModello(automezzo.modello)
      setVersione(automezzo.versione ?? ''); setCategoria(automezzo.categoria)
      setAlimentazione(automezzo.alimentazione ?? ''); setClasseEuro(automezzo.classe_euro ?? '')
      setAnno(automezzo.anno_immatricolazione != null ? String(automezzo.anno_immatricolazione) : '')
      setDataAcquisto(automezzo.data_acquisto ?? ''); setAcquisizione(automezzo.acquisizione)
      setProprietario(automezzo.proprietario ?? ''); setCentroCosto(automezzo.centro_costo ?? '')
      setSede(automezzo.sede ?? ''); setStato(automezzo.stato)
      setKm(String(automezzo.km_attuali ?? 0)); setNote(automezzo.note ?? '')
      setDismissioneTipo(automezzo.dismissione_tipo ?? '')
      setDismissioneValore(automezzo.dismissione_valore != null ? String(automezzo.dismissione_valore) : '')
      setDismissioneNote(automezzo.dismissione_note ?? '')
    } else {
      setTarga(''); setTelaio(''); setMarca(''); setModello(''); setVersione('')
      setCategoria('autovettura'); setAlimentazione(''); setClasseEuro(''); setAnno('')
      setDataAcquisto(''); setAcquisizione('acquisto'); setProprietario('')
      setCentroCosto(''); setSede(''); setStato('disponibile'); setKm(''); setNote('')
      setDismissioneTipo(''); setDismissioneValore(''); setDismissioneNote('')
    }
  }, [open, automezzo])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!marca.trim() || !modello.trim()) { toast.error('Marca e modello sono obbligatori'); return }
    const values = {
      targa: oNull(targa.toUpperCase()),
      telaio: oNull(telaio),
      marca: marca.trim(), modello: modello.trim(),
      versione: oNull(versione),
      categoria: categoria as 'autovettura',
      alimentazione: (alimentazione || null) as 'diesel' | null,
      classe_euro: oNull(classeEuro),
      anno_immatricolazione: anno === '' ? null : Number(anno),
      data_acquisto: oNull(dataAcquisto),
      acquisizione: acquisizione as 'acquisto',
      proprietario: oNull(proprietario),
      centro_costo: oNull(centroCosto),
      sede: oNull(sede),
      stato: stato as 'disponibile',
      km_attuali: km === '' ? 0 : Number(km),
      note: oNull(note),
      dismissione_tipo: (stato === 'dismesso' && dismissioneTipo ? dismissioneTipo : null) as 'vendita' | null,
      dismissione_valore: stato === 'dismesso' && dismissioneValore !== '' ? Number(dismissioneValore) : null,
      dismissione_note: stato === 'dismesso' ? oNull(dismissioneNote) : null,
    }
    try {
      if (automezzo) {
        await update.mutateAsync({ id: automezzo.id, values })
        toast.success('Automezzo aggiornato')
      } else {
        await create.mutateAsync(values)
        toast.success('Automezzo registrato')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Modifica ${automezzo?.codice ?? ''}` : 'Nuovo automezzo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="a-targa">Targa</Label>
              <Input id="a-targa" value={targa} onChange={(e) => setTarga(e.target.value)}
                placeholder="AA123BB" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-marca">Marca *</Label>
              <Input id="a-marca" value={marca} onChange={(e) => setMarca(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-modello">Modello *</Label>
              <Input id="a-modello" value={modello} onChange={(e) => setModello(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIA_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Alimentazione</Label>
              <Select value={alimentazione || 'nessuna'}
                onValueChange={(v) => setAlimentazione(v === 'nessuna' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuna">—</SelectItem>
                  {Object.entries(ALIMENTAZIONE_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-euro">Classe Euro</Label>
              <Input id="a-euro" value={classeEuro} onChange={(e) => setClasseEuro(e.target.value)}
                placeholder="Euro 6" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-anno">Anno immatr.</Label>
              <Input id="a-anno" type="number" min="1950" max="2100" value={anno}
                onChange={(e) => setAnno(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Acquisizione</Label>
              <Select value={acquisizione} onValueChange={setAcquisizione}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACQUISIZIONE_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-dacq">Data acquisto</Label>
              <Input id="a-dacq" type="date" value={dataAcquisto}
                onChange={(e) => setDataAcquisto(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select value={stato} onValueChange={setStato}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUTOMEZZO_STATI.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-km">Km attuali</Label>
              <Input id="a-km" type="number" min="0" value={km} onChange={(e) => setKm(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="a-prop">Proprietario</Label>
              <Input id="a-prop" value={proprietario} onChange={(e) => setProprietario(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-cdc">Centro di costo</Label>
              <Input id="a-cdc" value={centroCosto} onChange={(e) => setCentroCosto(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-sede">Sede</Label>
              <Input id="a-sede" value={sede} onChange={(e) => setSede(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="a-telaio">Telaio (VIN)</Label>
              <Input id="a-telaio" value={telaio} onChange={(e) => setTelaio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-note">Note</Label>
              <Textarea id="a-note" value={note} onChange={(e) => setNote(e.target.value)} rows={1} />
            </div>
          </div>

          {stato === 'dismesso' && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dismissione (fine ciclo di vita)
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Modalità</Label>
                  <Select value={dismissioneTipo || 'nd'}
                    onValueChange={(v) => setDismissioneTipo(v === 'nd' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nd">—</SelectItem>
                      <SelectItem value="vendita">Vendita</SelectItem>
                      <SelectItem value="rottamazione">Rottamazione</SelectItem>
                      <SelectItem value="trasferimento">Trasferimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="a-disval">Valore realizzato (€)</Label>
                  <Input id="a-disval" type="number" step="0.01" value={dismissioneValore}
                    onChange={(e) => setDismissioneValore(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="a-disnote">Note dismissione</Label>
                  <Input id="a-disnote" value={dismissioneNote}
                    onChange={(e) => setDismissioneNote(e.target.value)} />
                </div>
              </div>
            </div>
          )}

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
