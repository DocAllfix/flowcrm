/**
 * Nuovo ordine (documento Fioraio §6, §9, §10): chi ordina, chi riceve, dove
 * e quando, il biglietto con la firma o anonimo, l'occasione da ricordare.
 * I prodotti si aggiungono nella scheda dell'ordine.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { CercaContatto, type ContattoScelto } from '@/components/condivisi/CercaContatto'
import { supabase } from '@/lib/supabase'
import { useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import { useCatalogoFioraio, useImpostazioni, TABELLE_ORDINE } from '@/modules/fioraio/queries'
import { CANALE, MODALITA, OCCASIONE, fmtEuro, oggiIso } from '@/modules/fioraio/stati'

const NESSUNA = 'nessuna'
const oNull = (v: string) => (v.trim() ? v.trim() : null)

export function NuovoOrdineDialog({ open, onOpenChange, eventoId }: { open: boolean; onOpenChange: (o: boolean) => void; eventoId?: string }) {
  const navigate = useNavigate()
  const { zone } = useCatalogoFioraio()
  const { impostazioni } = useImpostazioni()
  const salva = useSalva('fior_ordini', TABELLE_ORDINE)
  const [nome, setNome] = useState('')
  const [contatto, setContatto] = useState<ContattoScelto | null>(null)
  const vuoto = {
    telefono: '', modalita: 'ritiro', data: oggiIso(), ora: '', fascia: NESSUNA, canale: 'negozio', destinatario: '', destTelefono: '', indirizzo: '', cap: '', citta: '',
    indicazioni: '', messaggio: '', firma: '', anonimo: false, occasione: NESSUNA, ricorda: false, registra: true,
  }
  const [f, setF] = useState(vuoto)
  const [inCorso, setInCorso] = useState(false)
  useEffect(() => { if (open) { setNome(''); setContatto(null); setF(vuoto) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const consegna = f.modalita === 'consegna'
  const zona = consegna && f.cap.trim() ? zone.find((z) => z.cap.includes(f.cap.trim())) : undefined

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Scrivi chi ordina'); return }
    if (consegna && (!f.destinatario.trim() || !f.indirizzo.trim())) { toast.error('Per la consegna servono destinatario e indirizzo'); return }
    setInCorso(true)
    try {
      let committente = contatto?.id ?? null
      if (!committente && f.registra) {
        const { data: auth } = await supabase.auth.getUser()
        const [n, ...resto] = nome.trim().split(/\s+/)
        const { data, error } = await supabase.from('contatti').insert({ nome: n, cognome: resto.join(' ') || null, telefono: oNull(f.telefono), created_by: auth.user!.id })
          .select('id').single()
        if (error) throw error
        committente = data.id
      }
      const o = await salva.mutateAsync({ values: {
        committente_id: committente, committente_nome: nome.trim(), committente_telefono: oNull(f.telefono) ?? contatto?.telefono ?? null,
        modalita: f.modalita, data_richiesta: f.data, ora_richiesta: f.ora || null, fascia: f.fascia === NESSUNA ? null : f.fascia, canale: f.canale,
        destinatario_nome: oNull(f.destinatario), destinatario_telefono: oNull(f.destTelefono), indirizzo: oNull(f.indirizzo), cap: oNull(f.cap), citta: oNull(f.citta),
        indicazioni: oNull(f.indicazioni), messaggio: oNull(f.messaggio), firma: f.anonimo ? null : oNull(f.firma), anonimo: f.anonimo,
        occasione: f.occasione === NESSUNA ? null : f.occasione, ricorda_ricorrenza: f.ricorda && f.occasione !== NESSUNA, evento_id: eventoId ?? null,
      } })
      toast.success(`Ordine ${o.codice} aperto: aggiungi i prodotti`)
      onOpenChange(false)
      navigate(`/fioraio/ordini/${o.id}`)
    } catch (err) { toast.error(messaggioErrore(err)) } finally { setInCorso(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo ordine</DialogTitle>
          <DialogDescription>Chi ordina può essere diverso da chi riceve: i due restano distinti, insieme alla firma del biglietto.</DialogDescription>
        </DialogHeader>
        <form onSubmit={crea} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="no-nome">Chi ordina *</Label>
            <CercaContatto id="no-nome" valore={nome} contattoId={contatto?.id ?? null} segnaposto="Cerca in anagrafica o scrivi il nome"
              onTesto={(v) => { setNome(v); setContatto(null) }}
              onScegli={(c) => { setContatto(c); setNome(`${c.nome} ${c.cognome ?? ''}`.trim()); setF({ ...f, telefono: c.telefono ?? '' }) }} /></div>
          <div className="space-y-1.5"><Label htmlFor="no-tel">Telefono</Label><Input id="no-tel" type="tel" value={f.telefono} onChange={set('telefono')} /></div>
          {!contatto && (
            <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2"><Checkbox checked={f.registra} onCheckedChange={(v) => setF({ ...f, registra: v === true })} />
              Registra il cliente in anagrafica (storico, ricorrenze, preferenze)</label>
          )}
          <div className="space-y-1.5"><Label>Modalità</Label>
            <Select value={f.modalita} onValueChange={(v) => setF({ ...f, modalita: v })}><SelectTrigger aria-label="Modalità"><SelectValue /></SelectTrigger>
              <SelectContent>{['ritiro', 'consegna'].map((k) => <SelectItem key={k} value={k}>{MODALITA[k]}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Arrivato da</Label>
            <Select value={f.canale} onValueChange={(v) => setF({ ...f, canale: v })}><SelectTrigger aria-label="Canale"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(CANALE).filter(([k]) => k !== 'abbonamento').map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="no-data">Per il giorno</Label><Input id="no-data" type="date" value={f.data} onChange={set('data')} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label htmlFor="no-ora">Ora</Label><Input id="no-ora" type="time" value={f.ora} onChange={set('ora')} /></div>
            <div className="space-y-1.5"><Label>Fascia</Label>
              <Select value={f.fascia} onValueChange={(v) => setF({ ...f, fascia: v })}><SelectTrigger aria-label="Fascia oraria"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NESSUNA}>Qualsiasi</SelectItem>{(impostazioni?.fasce ?? []).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          </div>

          <fieldset className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:col-span-2 sm:grid-cols-2">
            <legend className="px-1 text-sm font-medium text-foreground">Chi riceve{consegna ? ' *' : ' (se diverso da chi ordina)'}</legend>
            <div className="space-y-1.5"><Label htmlFor="no-dest">Destinatario</Label><Input id="no-dest" value={f.destinatario} onChange={set('destinatario')} placeholder="Anna Bianchi" /></div>
            <div className="space-y-1.5"><Label htmlFor="no-dtel">Telefono del destinatario</Label><Input id="no-dtel" type="tel" value={f.destTelefono} onChange={set('destTelefono')} /></div>
            {consegna && <>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="no-ind">Indirizzo di consegna</Label><Input id="no-ind" value={f.indirizzo} onChange={set('indirizzo')} placeholder="Via XX Settembre 4" /></div>
              <div className="space-y-1.5"><Label htmlFor="no-cap">CAP</Label><Input id="no-cap" inputMode="numeric" value={f.cap} onChange={set('cap')} />
                <p className="text-xs text-muted-foreground">{zona ? `Zona ${zona.nome}: consegna ${fmtEuro(zona.importo)}` : f.cap.trim() ? 'CAP fuori dalle zone: il costo si scrive nell\'ordine' : 'Dal CAP si riconosce la zona'}</p></div>
              <div className="space-y-1.5"><Label htmlFor="no-citta">Città</Label><Input id="no-citta" value={f.citta} onChange={set('citta')} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="no-indic">Indicazioni per chi consegna</Label><Input id="no-indic" value={f.indicazioni} onChange={set('indicazioni')} placeholder="Citofono, piano, orari del portiere" /></div>
            </>}
          </fieldset>

          <fieldset className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:col-span-2 sm:grid-cols-2">
            <legend className="px-1 text-sm font-medium text-foreground">Biglietto</legend>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="no-msg">Messaggio</Label><Textarea id="no-msg" rows={2} value={f.messaggio} onChange={set('messaggio')} placeholder="Buon anniversario, con tutto il mio amore" /></div>
            <div className="space-y-1.5"><Label htmlFor="no-firma">Firma</Label><Input id="no-firma" value={f.firma} onChange={set('firma')} disabled={f.anonimo} placeholder="Chi firma il biglietto" /></div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground"><Checkbox checked={f.anonimo} onCheckedChange={(v) => setF({ ...f, anonimo: v === true })} />Messaggio anonimo</label>
            <div className="space-y-1.5"><Label>Occasione</Label>
              <Select value={f.occasione} onValueChange={(v) => setF({ ...f, occasione: v })}><SelectTrigger aria-label="Occasione"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NESSUNA}>Nessuna in particolare</SelectItem>{Object.entries(OCCASIONE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            {f.occasione !== NESSUNA && (
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground"><Checkbox checked={f.ricorda} onCheckedChange={(v) => setF({ ...f, ricorda: v === true })} />
                Ricordala ogni anno al cliente</label>)}
          </fieldset>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={inCorso}>{inCorso ? 'Apertura…' : 'Apri l\'ordine'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
