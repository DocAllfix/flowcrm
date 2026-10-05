/**
 * Dialoghi dell'anagrafica del Garage: cliente (§4), veicolo (§5),
 * contratto o abbonamento (§6, §11), accesso autorizzato (§13–14).
 */
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { supabase } from '@/lib/supabase'
import { useElenco, useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import { useQueryClient } from '@tanstack/react-query'
import { useGarage } from '@/modules/garage/contesto'
import { useAnagrafica, TABELLE_CONTRATTO, type Autorizzazione, type Cliente, type Contratto, type Veicolo } from '@/modules/garage/queries'
import { ALIMENTAZIONE, AUTORIZZAZIONE_TIPO, CONTRATTO_TIPO, LIVELLO, PERIODICITA, POSTO_TIPO, VEICOLO_TIPO, campoNumero, fmtEuro, numero, numeroONull,
  oggiIso } from '@/modules/garage/stati'

type Assegnabile = { posto_id: string | null; codice: string | null; tipo: string | null; piano: number | null; canone: number | null; struttura_id: string | null }

// ── Cliente ─────────────────────────────────────────────────────────────
export function ClienteDialog({ open, onOpenChange, cliente }: { open: boolean; onOpenChange: (o: boolean) => void; cliente?: Cliente | null }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const salva = useSalva('gar_clienti', ['gar_clienti_riepilogo'])
  const f0 = { tipo: cliente?.tipo ?? 'privato', nome: cliente?.nome ?? '', codice_fiscale: cliente?.codice_fiscale ?? '', partita_iva: cliente?.partita_iva ?? '',
    telefono: cliente?.telefono ?? '', email: cliente?.email ?? '', indirizzo: cliente?.indirizzo ?? '', note: cliente?.note ?? '', targa: '', marca: '', modello: '' }
  const [f, setF] = useState(f0)
  const [inCorso, setInCorso] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const n = (s: string) => s.trim() || null

  async function salvaCliente(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) { toast.error(f.tipo === 'azienda' ? 'Scrivi la ragione sociale' : 'Scrivi nome e cognome'); return }
    setInCorso(true)
    try {
      const k = await salva.mutateAsync({ id: cliente?.id, values: { tipo: f.tipo, nome: f.nome.trim(), codice_fiscale: n(f.codice_fiscale), partita_iva: n(f.partita_iva),
        telefono: n(f.telefono), email: n(f.email), indirizzo: n(f.indirizzo), note: n(f.note) } })
      if (!cliente && f.targa.trim()) {
        const { data: auth } = await supabase.auth.getUser()
        const { error } = await supabase.from('gar_veicoli').insert({ cliente_id: k.id, targa: f.targa, marca: n(f.marca), modello: n(f.modello), created_by: auth.user!.id })
        if (error) toast.error(`Cliente creato, ma il veicolo no: ${messaggioErrore(error)}`)
        await qc.invalidateQueries({ queryKey: ['fond'] })
      }
      toast.success(cliente ? 'Cliente aggiornato' : `${k.nome} è in anagrafica (${k.codice})`)
      onOpenChange(false)
      if (!cliente) { setF(f0); navigate(`/garage/clienti/${k.id}`) }
    } catch (err) { toast.error(messaggioErrore(err)) } finally { setInCorso(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{cliente ? 'Modifica il cliente' : 'Nuovo cliente'}</DialogTitle>
          <DialogDescription>Il cliente entra anche nel CRM: {f.tipo === 'azienda' ? 'come organizzazione cliente' : 'come contatto'}, con lo storico in un posto solo.</DialogDescription></DialogHeader>
        <form onSubmit={salvaCliente} className="grid grid-cols-6 gap-3">
          <div className="col-span-6 flex gap-2" role="radiogroup" aria-label="Tipo di cliente">
            {(['privato', 'azienda'] as const).map((t) => (
              <Button key={t} type="button" size="sm" role="radio" aria-checked={f.tipo === t} variant={f.tipo === t ? 'default' : 'outline'} disabled={!!cliente}
                onClick={() => setF({ ...f, tipo: t })}>{t === 'privato' ? 'Privato' : 'Azienda'}</Button>))}
          </div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="cl-nome">{f.tipo === 'azienda' ? 'Ragione sociale *' : 'Nome e cognome *'}</Label>
            <Input id="cl-nome" value={f.nome} onChange={set('nome')} required autoFocus /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="cl-cf">Codice fiscale</Label><Input id="cl-cf" className="uppercase" value={f.codice_fiscale} onChange={set('codice_fiscale')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="cl-piva">Partita IVA</Label><Input id="cl-piva" value={f.partita_iva} onChange={set('partita_iva')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="cl-tel">Telefono</Label><Input id="cl-tel" type="tel" value={f.telefono} onChange={set('telefono')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="cl-email">Email</Label><Input id="cl-email" type="email" value={f.email} onChange={set('email')} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="cl-ind">Indirizzo</Label><Input id="cl-ind" value={f.indirizzo} onChange={set('indirizzo')} /></div>
          {!cliente && (
            <fieldset className="col-span-6 grid grid-cols-6 gap-3">
              <legend className="col-span-6 mb-1 text-sm font-medium text-foreground">Primo veicolo (facoltativo)</legend>
              <div className="col-span-2 space-y-1.5"><Label htmlFor="cl-targa">Targa</Label><Input id="cl-targa" className="font-mono uppercase" value={f.targa} onChange={set('targa')} /></div>
              <div className="col-span-2 space-y-1.5"><Label htmlFor="cl-marca">Marca</Label><Input id="cl-marca" value={f.marca} onChange={set('marca')} /></div>
              <div className="col-span-2 space-y-1.5"><Label htmlFor="cl-mod">Modello</Label><Input id="cl-mod" value={f.modello} onChange={set('modello')} /></div>
            </fieldset>
          )}
          <div className="col-span-6 space-y-1.5"><Label htmlFor="cl-note">Note</Label><Textarea id="cl-note" rows={2} value={f.note} onChange={set('note')} /></div>
          <DialogFooter className="col-span-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={inCorso}>{cliente ? 'Salva' : 'Crea il cliente'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Veicolo ─────────────────────────────────────────────────────────────
export function VeicoloDialog({ open, onOpenChange, clienteId, veicolo }: { open: boolean; onOpenChange: (o: boolean) => void; clienteId: string; veicolo?: Veicolo | null }) {
  const salva = useSalva('gar_veicoli', ['gar_clienti_riepilogo'])
  const v = veicolo
  const f0 = { targa: v?.targa ?? '', marca: v?.marca ?? '', modello: v?.modello ?? '', tipo: v?.tipo ?? 'auto', colore: v?.colore ?? '', alimentazione: v?.alimentazione ?? 'nessuna',
    cilindrata: v?.cilindrata != null ? String(v.cilindrata) : '', lunghezza: campoNumero(v?.lunghezza_m), larghezza: campoNumero(v?.larghezza_m), altezza: campoNumero(v?.altezza_m),
    peso: v?.peso_kg != null ? String(v.peso_kg) : '', proprietario: v?.proprietario ?? '', utilizzatore: v?.utilizzatore ?? '', assicurazione: v?.assicurazione ?? '',
    scadenza: v?.assicurazione_scadenza ?? '', note: v?.note ?? '' }
  const [f, setF] = useState(f0)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const n = (s: string) => s.trim() || null
  const intero = (s: string) => (s.trim() ? Math.round(numero(s)) : null)

  function salvaVeicolo(e: FormEvent) {
    e.preventDefault()
    if (!f.targa.trim()) { toast.error('La targa è obbligatoria'); return }
    salva.mutate({ id: v?.id, values: { cliente_id: clienteId, targa: f.targa, marca: n(f.marca), modello: n(f.modello), tipo: f.tipo, colore: n(f.colore),
      alimentazione: f.alimentazione === 'nessuna' ? null : f.alimentazione, cilindrata: intero(f.cilindrata), lunghezza_m: numeroONull(f.lunghezza),
      larghezza_m: numeroONull(f.larghezza), altezza_m: numeroONull(f.altezza), peso_kg: intero(f.peso), proprietario: n(f.proprietario), utilizzatore: n(f.utilizzatore),
      assicurazione: n(f.assicurazione), assicurazione_scadenza: f.scadenza || null, note: n(f.note) } }, {
      onSuccess: (x) => { toast.success(v ? 'Veicolo aggiornato' : `${x.targa} aggiunto`); if (!v) setF(f0); onOpenChange(false) },
      onError: (err) => toast.error(messaggioErrore(err)),
    })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{v ? `Veicolo ${v.targa}` : 'Nuovo veicolo'}</DialogTitle>
          <DialogDescription>Le dimensioni servono a capire se entra nel posto; foto e libretto si caricano dalla riga del veicolo.</DialogDescription></DialogHeader>
        <form onSubmit={salvaVeicolo} className="grid grid-cols-6 gap-3">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ve-targa">Targa *</Label><Input id="ve-targa" className="font-mono uppercase" value={f.targa} onChange={set('targa')} required autoFocus /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ve-marca">Marca</Label><Input id="ve-marca" value={f.marca} onChange={set('marca')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ve-mod">Modello</Label><Input id="ve-mod" value={f.modello} onChange={set('modello')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ve-tipo">Tipo</Label>
            <Select value={f.tipo} onValueChange={(x) => setF({ ...f, tipo: x })}><SelectTrigger id="ve-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(VEICOLO_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ve-col">Colore</Label><Input id="ve-col" value={f.colore} onChange={set('colore')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ve-al">Alimentazione</Label>
            <Select value={f.alimentazione} onValueChange={(x) => setF({ ...f, alimentazione: x })}><SelectTrigger id="ve-al"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuna">Non indicata</SelectItem>{Object.entries(ALIMENTAZIONE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ve-cc">Cilindrata (cc)</Label><Input id="ve-cc" inputMode="numeric" value={f.cilindrata} onChange={set('cilindrata')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ve-peso">Peso (kg)</Label><Input id="ve-peso" inputMode="numeric" value={f.peso} onChange={set('peso')} /></div>
          <div className="col-span-2" />
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ve-lu">Lunghezza (m)</Label><Input id="ve-lu" inputMode="decimal" value={f.lunghezza} onChange={set('lunghezza')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ve-la">Larghezza (m)</Label><Input id="ve-la" inputMode="decimal" value={f.larghezza} onChange={set('larghezza')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ve-al2">Altezza (m)</Label><Input id="ve-al2" inputMode="decimal" value={f.altezza} onChange={set('altezza')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ve-prop">Proprietario</Label><Input id="ve-prop" value={f.proprietario} onChange={set('proprietario')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ve-ut">Utilizzatore</Label><Input id="ve-ut" value={f.utilizzatore} onChange={set('utilizzatore')} /></div>
          <div className="col-span-4 space-y-1.5"><Label htmlFor="ve-ass">Assicurazione (compagnia e polizza)</Label><Input id="ve-ass" value={f.assicurazione} onChange={set('assicurazione')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ve-scad">Scadenza</Label><Input id="ve-scad" type="date" value={f.scadenza} onChange={set('scadenza')} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="ve-note">Note</Label><Input id="ve-note" value={f.note} onChange={set('note')} /></div>
          <DialogFooter className="col-span-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={salva.isPending}>{v ? 'Salva' : 'Aggiungi il veicolo'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Contratto o abbonamento ─────────────────────────────────────────────
export function ContrattoDialog({ open, onOpenChange, clienteId, contratto }: {
  open: boolean; onOpenChange: (o: boolean) => void; clienteId?: string; contratto?: Contratto | null
}) {
  const { strutturaId } = useGarage()
  const { clienti, veicoli } = useAnagrafica()
  const salva = useSalva('gar_contratti', TABELLE_CONTRATTO)
  const { data: assegnabili = [] } = useElenco<Assegnabile>('gar_posti_assegnabili', { filtri: { struttura_id: contratto?.struttura_id ?? strutturaId },
    ordine: [{ colonna: 'piano' }, { colonna: 'numero' }], abilitato: open })
  const c = contratto
  const f0 = { cliente: c?.cliente_id ?? clienteId ?? '', veicolo: c?.veicolo_id ?? 'nessuno', posto: c?.posto_id ?? 'nessuno', tipo: c?.tipo ?? 'abbonamento_mensile',
    inizio: c?.inizio ?? oggiIso(), fine: c?.fine ?? '', canone: c ? campoNumero(c.canone) : '', periodicita: c?.periodicita ?? 'mensile',
    deposito: c ? campoNumero(c.deposito_cauzionale) : '', versato: c?.deposito_versato ?? false, condizioni: c?.condizioni ?? '', rinnovo: c?.rinnovo_automatico ?? true,
    preavviso: String(c?.preavviso_giorni ?? 30), automatico: c?.pagamento_automatico ?? false, note: c?.note ?? '' }
  const [f, setF] = useState(f0)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  // Il posto già del contratto resta tra le scelte anche se non è più «assegnabile».
  const posti = c?.posto_id && !assegnabili.some((p) => p.posto_id === c.posto_id) ? [{ posto_id: c.posto_id, codice: 'attuale', tipo: null, piano: null, canone: null, struttura_id: null }, ...assegnabili] : assegnabili
  const scegliPosto = (id: string) => {
    const p = assegnabili.find((x) => x.posto_id === id)
    setF({ ...f, posto: id, canone: !c && p?.canone != null && !f.canone ? campoNumero(p.canone) : f.canone })
  }
  const scegliTipo = (t: string) => setF({ ...f, tipo: t, periodicita: t === 'abbonamento_annuale' ? 'annuale' : ['sosta_giornaliera', 'sosta_oraria'].includes(t) ? 'una_tantum' : f.periodicita })
  const suoiVeicoli = veicoli.filter((v) => v.cliente_id === f.cliente)

  function salvaContratto(e: FormEvent) {
    e.preventDefault()
    if (!f.cliente) { toast.error('Scegli il cliente'); return }
    if (f.fine && f.fine < f.inizio) { toast.error('La fine deve venire dopo l\'inizio'); return }
    salva.mutate({ id: c?.id, values: { struttura_id: c?.struttura_id ?? strutturaId!, cliente_id: f.cliente, veicolo_id: f.veicolo === 'nessuno' ? null : f.veicolo,
      posto_id: f.posto === 'nessuno' ? null : f.posto, tipo: f.tipo, inizio: f.inizio, fine: f.fine || null, canone: numero(f.canone), periodicita: f.periodicita,
      deposito_cauzionale: numero(f.deposito), deposito_versato: f.versato, condizioni: f.condizioni.trim() || null, rinnovo_automatico: f.rinnovo,
      preavviso_giorni: Math.round(numero(f.preavviso)), pagamento_automatico: f.automatico, note: f.note.trim() || null } }, {
      onSuccess: (x) => { toast.success(c ? 'Contratto aggiornato' : `Contratto ${x.codice}: ${fmtEuro(x.canone)} ${PERIODICITA[x.periodicita].toLowerCase()}, prima rata emessa`)
        if (!c) setF(f0); onOpenChange(false) },
      onError: (err) => toast.error(messaggioErrore(err)),
    })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{c ? `Contratto ${c.codice}` : 'Nuovo contratto'}</DialogTitle>
          <DialogDescription>Le rate si emettono da sole a ogni periodo; la fine del contratto va tra le scadenze. Un posto non è mai di due contratti insieme.</DialogDescription></DialogHeader>
        <form onSubmit={salvaContratto} className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="ct-cli">Cliente *</Label>
            <Select value={f.cliente} onValueChange={(x) => setF({ ...f, cliente: x, veicolo: 'nessuno' })} disabled={!!clienteId || !!c}>
              <SelectTrigger id="ct-cli"><SelectValue placeholder="Scegli il cliente" /></SelectTrigger>
              <SelectContent>{clienti.map((k) => <SelectItem key={k.id} value={k.id}>{k.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="ct-tipo">Tipo</Label>
            <Select value={f.tipo} onValueChange={scegliTipo}><SelectTrigger id="ct-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(CONTRATTO_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ct-ve">Veicolo</Label>
            <Select value={f.veicolo} onValueChange={(x) => setF({ ...f, veicolo: x })}><SelectTrigger id="ct-ve"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">Qualsiasi del cliente</SelectItem>{suoiVeicoli.map((v) => <SelectItem key={v.id} value={v.id}>{v.targa}{v.modello ? ` · ${v.modello}` : ''}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ct-posto">Posto</Label>
            <Select value={f.posto} onValueChange={scegliPosto}><SelectTrigger id="ct-posto"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">Nessuno: a rotazione</SelectItem>
                {posti.map((p) => <SelectItem key={p.posto_id!} value={p.posto_id!}>{p.codice}{p.tipo ? ` · ${POSTO_TIPO[p.tipo]}` : ''}{p.canone != null ? ` · ${fmtEuro(p.canone)}` : ''}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="ct-in">Inizio</Label><Input id="ct-in" type="date" value={f.inizio} onChange={set('inizio')} required /></div>
          <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="ct-fine">Fine (vuota = indeterminato)</Label><Input id="ct-fine" type="date" value={f.fine} onChange={set('fine')} /></div>
          <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="ct-per">Periodicità</Label>
            <Select value={f.periodicita} onValueChange={(x) => setF({ ...f, periodicita: x })}><SelectTrigger id="ct-per"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PERIODICITA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="ct-can">Canone per periodo (€)</Label><Input id="ct-can" inputMode="decimal" value={f.canone} onChange={set('canone')} placeholder="dal posto" /></div>
          <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="ct-dep">Deposito cauzionale (€)</Label><Input id="ct-dep" inputMode="decimal" value={f.deposito} onChange={set('deposito')} /></div>
          <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="ct-pre">Preavviso di recesso (giorni)</Label><Input id="ct-pre" inputMode="numeric" value={f.preavviso} onChange={set('preavviso')} /></div>
          <div className="col-span-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.versato} onCheckedChange={(x) => setF({ ...f, versato: x === true })} /> Deposito versato</label>
            <label className="flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.rinnovo} onCheckedChange={(x) => setF({ ...f, rinnovo: x === true })} /> Rinnovo automatico</label>
            <label className="flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.automatico} onCheckedChange={(x) => setF({ ...f, automatico: x === true })} /> Addebito automatico</label>
          </div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="ct-cond">Condizioni</Label><Textarea id="ct-cond" rows={2} value={f.condizioni} onChange={set('condizioni')} /></div>
          <p className="col-span-6 text-xs text-muted-foreground">L'addebito automatico è predisposto: la rata nasce comunque e si segna pagata all'esito del circuito.</p>
          <DialogFooter className="col-span-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={salva.isPending}>{c ? 'Salva' : 'Stipula il contratto'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Accesso autorizzato ─────────────────────────────────────────────────
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
type Fascia = { giorni: number[]; dalle: string; alle: string }

/** «Lun–Ven 08:00–20:00» da una fascia. */
export const testoFasce = (fasce: unknown) => {
  const fs = (Array.isArray(fasce) ? fasce : []) as Fascia[]
  if (!fs.length) return 'Sempre'
  return fs.map((x) => `${x.giorni.length === 7 ? 'Tutti i giorni' : x.giorni.map((g) => GIORNI[g - 1]).join(' ')} ${x.dalle}–${x.alle}`).join('; ')
}

export function AutorizzazioneDialog({ open, onOpenChange, clienteId, convenzioneId, autorizzazione }: {
  open: boolean; onOpenChange: (o: boolean) => void; clienteId: string; convenzioneId?: string | null; autorizzazione?: Autorizzazione | null
}) {
  const { veicoli } = useAnagrafica()
  const salva = useSalva('gar_autorizzazioni')
  const a = autorizzazione
  const fascia = ((Array.isArray(a?.fasce) ? a.fasce : []) as Fascia[])[0]
  const f0 = { tipo: a?.tipo ?? (convenzioneId ? 'dipendente' : 'delegato'), persona: a?.persona ?? '', veicolo: a?.veicolo_id ?? 'nessuno', targa: a?.targa ?? '',
    livello: a?.livello ?? 'accesso', limitata: !!fascia, giorni: fascia?.giorni ?? [1, 2, 3, 4, 5], dalle: fascia?.dalle ?? '08:00', alle: fascia?.alle ?? '20:00',
    dal: a?.dal ?? oggiIso(), al: a?.al ?? '', codice: a?.codice ?? '', note: a?.note ?? '' }
  const [f, setF] = useState(f0)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const suoi = veicoli.filter((v) => v.cliente_id === clienteId)

  function salvaAut(e: FormEvent) {
    e.preventDefault()
    if (f.veicolo === 'nessuno' && !f.targa.trim() && !f.persona.trim()) { toast.error('Indica almeno la persona o la targa'); return }
    if (f.limitata && !f.giorni.length) { toast.error('Scegli almeno un giorno'); return }
    salva.mutate({ id: a?.id, values: { cliente_id: clienteId, convenzione_id: convenzioneId ?? a?.convenzione_id ?? null, tipo: f.tipo, persona: f.persona.trim() || null,
      veicolo_id: f.veicolo === 'nessuno' ? null : f.veicolo, targa: f.veicolo === 'nessuno' ? f.targa.trim() || null : null, livello: f.livello,
      fasce: f.limitata ? [{ giorni: [...f.giorni].sort(), dalle: f.dalle, alle: f.alle }] : [], dal: f.dal, al: f.al || null, codice: f.codice.trim() || null,
      note: f.note.trim() || null } }, {
      onSuccess: () => { toast.success(a ? 'Autorizzazione aggiornata' : 'Accesso autorizzato'); if (!a) setF(f0); onOpenChange(false) },
      onError: (err) => toast.error(messaggioErrore(err)),
    })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{a ? 'Modifica l\'autorizzazione' : convenzioneId ? 'Dipendente autorizzato' : 'Accesso autorizzato'}</DialogTitle>
          <DialogDescription>Chi può entrare con il titolo del cliente, con quale veicolo, in quali giorni e ore. Fuori fascia entra solo a tariffa.</DialogDescription></DialogHeader>
        <form onSubmit={salvaAut} className="grid grid-cols-6 gap-3">
          <div className="col-span-3 space-y-1.5"><Label htmlFor="au-tipo">Tipo</Label>
            <Select value={f.tipo} onValueChange={(x) => setF({ ...f, tipo: x })}><SelectTrigger id="au-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(AUTORIZZAZIONE_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="au-pers">Persona</Label><Input id="au-pers" value={f.persona} onChange={set('persona')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="au-ve">Veicolo</Label>
            <Select value={f.veicolo} onValueChange={(x) => setF({ ...f, veicolo: x })}><SelectTrigger id="au-ve"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">Un'altra targa</SelectItem>{suoi.map((v) => <SelectItem key={v.id} value={v.id}>{v.targa}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="au-targa">Targa (ospite, temporaneo)</Label>
            <Input id="au-targa" className="font-mono uppercase" value={f.targa} onChange={set('targa')} disabled={f.veicolo !== 'nessuno'} /></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="au-liv">Livello</Label>
            <Select value={f.livello} onValueChange={(x) => setF({ ...f, livello: x })}><SelectTrigger id="au-liv"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(LIVELLO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="au-cod">Badge, RFID, QR o telecomando</Label><Input id="au-cod" value={f.codice} onChange={set('codice')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="au-dal">Dal</Label><Input id="au-dal" type="date" value={f.dal} onChange={set('dal')} required /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="au-al">Al (vuoto = sempre)</Label><Input id="au-al" type="date" value={f.al} onChange={set('al')} /></div>
          <label className="col-span-6 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.limitata} onCheckedChange={(x) => setF({ ...f, limitata: x === true })} /> Solo in certi giorni e ore</label>
          {f.limitata && (
            <fieldset className="col-span-6 grid grid-cols-6 gap-3">
              <legend className="sr-only">Fascia oraria</legend>
              <div className="col-span-6 flex flex-wrap gap-1.5" role="group" aria-label="Giorni">
                {GIORNI.map((g, i) => {
                  const on = f.giorni.includes(i + 1)
                  return <Button key={g} type="button" size="sm" variant={on ? 'default' : 'outline'} aria-pressed={on}
                    onClick={() => setF({ ...f, giorni: on ? f.giorni.filter((x) => x !== i + 1) : [...f.giorni, i + 1] })}>{g}</Button>
                })}
              </div>
              <div className="col-span-3 space-y-1.5"><Label htmlFor="au-dalle">Dalle</Label><Input id="au-dalle" type="time" value={f.dalle} onChange={set('dalle')} /></div>
              <div className="col-span-3 space-y-1.5"><Label htmlFor="au-alle">Alle</Label><Input id="au-alle" type="time" value={f.alle} onChange={set('alle')} /></div>
            </fieldset>
          )}
          <div className="col-span-6 space-y-1.5"><Label htmlFor="au-note">Note</Label><Input id="au-note" value={f.note} onChange={set('note')} /></div>
          <DialogFooter className="col-span-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={salva.isPending}>{a ? 'Salva' : 'Autorizza'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
