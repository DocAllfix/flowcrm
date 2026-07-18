/**
 * GaraDialog — creazione/modifica dell'anagrafica gara (documento §1 + §2).
 * Gli elaborati/documenti vivono nella scheda (tab Documenti); qui i dati.
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
import {
  useCreateGara, useUpdateGara,
  type Gara, type GaraTipologia, type GaraProcedura,
} from '@/modules/gare/queries/gare'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  gara?: Gara
}

const TIPOLOGIE: { value: GaraTipologia; label: string }[] = [
  { value: 'lavori', label: 'Lavori' },
  { value: 'servizi', label: 'Servizi' },
  { value: 'forniture', label: 'Forniture' },
]
const PROCEDURE: { value: GaraProcedura; label: string }[] = [
  { value: 'aperta', label: 'Aperta' },
  { value: 'ristretta', label: 'Ristretta' },
  { value: 'negoziata', label: 'Negoziata' },
  { value: 'affidamento_diretto', label: 'Affidamento diretto' },
  { value: 'accordo_quadro', label: 'Accordo quadro' },
  { value: 'manifestazione_interesse', label: 'Manifestazione di interesse' },
  { value: 'altro', label: 'Altro' },
]
const PRIORITA = [
  { value: 'bassa', label: 'Bassa' }, { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' }, { value: 'critica', label: 'Critica' },
]

/** '' → null; ISO datetime-local → ISO completo. */
const oNull = (s: string) => (s.trim() === '' ? null : s.trim())
const oNumero = (s: string) => (s.trim() === '' ? null : Number(s))

export function GaraDialog({ open, onOpenChange, gara }: Props) {
  const create = useCreateGara()
  const update = useUpdateGara()
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const { data: utenti = [] } = useUsers()
  const isEdit = !!gara
  const pending = create.isPending || update.isPending

  const [titolo, setTitolo] = useState('')
  const [enteId, setEnteId] = useState('')
  const [enteLibero, setEnteLibero] = useState('')
  const [rup, setRup] = useState('')
  const [cig, setCig] = useState('')
  const [cup, setCup] = useState('')
  const [cpv, setCpv] = useState('')
  const [tipologia, setTipologia] = useState<GaraTipologia>('lavori')
  const [procedura, setProcedura] = useState<GaraProcedura>('aperta')
  const [piattaforma, setPiattaforma] = useState('')
  const [piattaformaUrl, setPiattaformaUrl] = useState('')
  const [importoBase, setImportoBase] = useState('')
  const [oneri, setOneri] = useState('')
  const [durata, setDurata] = useState('')
  const [luogo, setLuogo] = useState('')
  const [dataPubb, setDataPubb] = useState('')
  const [termChiarimenti, setTermChiarimenti] = useState('')
  const [termPresentazione, setTermPresentazione] = useState('')
  const [dataApertura, setDataApertura] = useState('')
  const [settore, setSettore] = useState('')
  const [categoriaSoa, setCategoriaSoa] = useState('')
  const [territorio, setTerritorio] = useState('')
  const [priorita, setPriorita] = useState('media')
  const [fonte, setFonte] = useState('')
  const [responsabileId, setResponsabileId] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (gara) {
      setTitolo(gara.titolo)
      setEnteId(gara.ente_appaltante_id ?? '')
      setEnteLibero(gara.ente_appaltante ?? '')
      setRup(gara.rup ?? ''); setCig(gara.cig ?? ''); setCup(gara.cup ?? ''); setCpv(gara.cpv ?? '')
      setTipologia(gara.tipologia); setProcedura(gara.procedura)
      setPiattaforma(gara.piattaforma ?? ''); setPiattaformaUrl(gara.piattaforma_url ?? '')
      setImportoBase(gara.importo_base != null ? String(gara.importo_base) : '')
      setOneri(gara.oneri_sicurezza != null ? String(gara.oneri_sicurezza) : '')
      setDurata(gara.durata_mesi != null ? String(gara.durata_mesi) : '')
      setLuogo(gara.luogo_esecuzione ?? '')
      setDataPubb(gara.data_pubblicazione ?? '')
      setTermChiarimenti(gara.termine_chiarimenti ?? '')
      setTermPresentazione(gara.termine_presentazione ? gara.termine_presentazione.slice(0, 16) : '')
      setDataApertura(gara.data_apertura_offerte ? gara.data_apertura_offerte.slice(0, 16) : '')
      setSettore(gara.settore ?? ''); setCategoriaSoa(gara.categoria_soa ?? '')
      setTerritorio(gara.territorio ?? ''); setPriorita(gara.priorita)
      setFonte(gara.fonte ?? ''); setResponsabileId(gara.responsabile_id ?? '')
      setNote(gara.note ?? '')
    } else {
      setTitolo(''); setEnteId(''); setEnteLibero(''); setRup(''); setCig(''); setCup(''); setCpv('')
      setTipologia('lavori'); setProcedura('aperta'); setPiattaforma(''); setPiattaformaUrl('')
      setImportoBase(''); setOneri(''); setDurata(''); setLuogo('')
      setDataPubb(''); setTermChiarimenti(''); setTermPresentazione(''); setDataApertura('')
      setSettore(''); setCategoriaSoa(''); setTerritorio(''); setPriorita('media')
      setFonte(''); setResponsabileId(''); setNote('')
    }
  }, [open, gara])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!titolo.trim()) { toast.error('Il titolo della procedura è obbligatorio'); return }
    const importoN = importoBase === '' ? 0 : Number(importoBase)
    if (Number.isNaN(importoN)) { toast.error('Importo a base d\'asta non valido'); return }

    const values = {
      titolo: titolo.trim(),
      ente_appaltante_id: oNull(enteId),
      ente_appaltante: oNull(enteLibero),
      rup: oNull(rup), cig: oNull(cig), cup: oNull(cup), cpv: oNull(cpv),
      tipologia, procedura,
      piattaforma: oNull(piattaforma), piattaforma_url: oNull(piattaformaUrl),
      importo_base: importoN,
      oneri_sicurezza: oNumero(oneri),
      durata_mesi: oNumero(durata),
      luogo_esecuzione: oNull(luogo),
      data_pubblicazione: oNull(dataPubb),
      termine_chiarimenti: oNull(termChiarimenti),
      termine_presentazione: termPresentazione ? new Date(termPresentazione).toISOString() : null,
      data_apertura_offerte: dataApertura ? new Date(dataApertura).toISOString() : null,
      settore: oNull(settore), categoria_soa: oNull(categoriaSoa),
      territorio: oNull(territorio),
      priorita: priorita as 'media',
      fonte: oNull(fonte),
      responsabile_id: oNull(responsabileId),
      note: oNull(note),
    }

    try {
      if (gara) {
        await update.mutateAsync({ id: gara.id, values })
        toast.success('Gara aggiornata')
      } else {
        await create.mutateAsync(values)
        toast.success('Gara creata')
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
          <DialogTitle>{isEdit ? `Modifica gara ${gara?.codice ?? ''}` : 'Nuova gara'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="g-titolo">Titolo della procedura *</Label>
            <Input id="g-titolo" value={titolo} onChange={(e) => setTitolo(e.target.value)}
              placeholder="Es. Manutenzione straordinaria scuola comunale" required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Ente appaltante (anagrafica)</Label>
              <Select value={enteId || 'nessuno'} onValueChange={(v) => setEnteId(v === 'nessuno' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">— Nessuno —</SelectItem>
                  {organizzazioni.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-ente">…oppure denominazione libera</Label>
              <Input id="g-ente" value={enteLibero} onChange={(e) => setEnteLibero(e.target.value)}
                placeholder="Es. Comune di Milano" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-cig">CIG</Label>
              <Input id="g-cig" value={cig} onChange={(e) => setCig(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-cup">CUP</Label>
              <Input id="g-cup" value={cup} onChange={(e) => setCup(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-cpv">CPV</Label>
              <Input id="g-cpv" value={cpv} onChange={(e) => setCpv(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Tipologia</Label>
              <Select value={tipologia} onValueChange={(v) => setTipologia(v as GaraTipologia)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOLOGIE.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Procedura</Label>
              <Select value={procedura} onValueChange={(v) => setProcedura(v as GaraProcedura)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROCEDURE.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-rup">RUP</Label>
              <Input id="g-rup" value={rup} onChange={(e) => setRup(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-importo">Importo a base d'asta (€)</Label>
              <Input id="g-importo" type="number" min="0" step="0.01" value={importoBase}
                onChange={(e) => setImportoBase(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-oneri">Oneri sicurezza (€)</Label>
              <Input id="g-oneri" type="number" min="0" step="0.01" value={oneri}
                onChange={(e) => setOneri(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-durata">Durata (mesi)</Label>
              <Input id="g-durata" type="number" min="0" value={durata}
                onChange={(e) => setDurata(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-pubb">Data pubblicazione</Label>
              <Input id="g-pubb" type="date" value={dataPubb} onChange={(e) => setDataPubb(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-chiar">Termine richieste chiarimenti</Label>
              <Input id="g-chiar" type="date" value={termChiarimenti}
                onChange={(e) => setTermChiarimenti(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-term">Termine presentazione offerta</Label>
              <Input id="g-term" type="datetime-local" value={termPresentazione}
                onChange={(e) => setTermPresentazione(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-apert">Apertura offerte</Label>
              <Input id="g-apert" type="datetime-local" value={dataApertura}
                onChange={(e) => setDataApertura(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-piatt">Piattaforma</Label>
              <Input id="g-piatt" value={piattaforma} onChange={(e) => setPiattaforma(e.target.value)}
                placeholder="Es. MEPA, Sintel, TED" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-purl">Link piattaforma</Label>
              <Input id="g-purl" type="url" value={piattaformaUrl}
                onChange={(e) => setPiattaformaUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-settore">Settore</Label>
              <Input id="g-settore" value={settore} onChange={(e) => setSettore(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-soa">Categoria SOA</Label>
              <Input id="g-soa" value={categoriaSoa} onChange={(e) => setCategoriaSoa(e.target.value)}
                placeholder="Es. OG1 III" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-terr">Territorio</Label>
              <Input id="g-terr" value={territorio} onChange={(e) => setTerritorio(e.target.value)}
                placeholder="Es. Lombardia" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-luogo">Luogo di esecuzione</Label>
              <Input id="g-luogo" value={luogo} onChange={(e) => setLuogo(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Priorità</Label>
              <Select value={priorita} onValueChange={setPriorita}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITA.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-fonte">Fonte</Label>
              <Input id="g-fonte" value={fonte} onChange={(e) => setFonte(e.target.value)}
                placeholder="Es. albo, invito, segnalazione" />
            </div>
            <div className="space-y-1.5">
              <Label>Responsabile di gara</Label>
              <Select value={responsabileId || 'nessuno'}
                onValueChange={(v) => setResponsabileId(v === 'nessuno' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">— Nessuno —</SelectItem>
                  {utenti.filter((u) => u.attivo).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-note">Note</Label>
            <Textarea id="g-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvataggio…' : isEdit ? 'Salva' : 'Crea gara'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
