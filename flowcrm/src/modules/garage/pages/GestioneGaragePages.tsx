/**
 * Gestione dell'autorimessa: anagrafica della struttura (§1), aree e posti
 * della mappa (§2–3), tariffari con il simulatore e i festivi (§9),
 * colonnine (§19), listino dei servizi (§20); impianti, manutenzioni e
 * sicurezza (§17–18) sulle sezioni condivise; personale e turni;
 * comunicazioni e promozioni (§23).
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Calculator, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { ManagerOnly } from '@/components/ManagerOnly'
import { ControlliSezione } from '@/components/condivisi/ControlliSezione'
import { TurniSezione } from '@/components/condivisi/TurniSezione'
import { CampagneSezione } from '@/components/condivisi/CampagneSezione'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { useElenco, useRpc, useSalva, useElimina, messaggioErrore } from '@/lib/queries/fondamenta'
import { useGarage } from '@/modules/garage/contesto'
import { ConStruttura, ConfiguraStrutturaDialog, SelettoreStruttura, codicePosto } from '@/modules/garage/componenti/ConStruttura'
import type { Area, Colonnina, Festivo, Posto, Struttura, Tariffario, VoceListino } from '@/modules/garage/queries'
import { AREA_TIPO, MODALITA_ACCESSO, POSTO_TIPO, SERVIZIO_CATEGORIA, STRUTTURA_TIPO, VEICOLO_TIPO, campoNumero, fmtData, fmtEuro, fmtNumero, isoLocale, numero,
  numeroONull, oggiIso } from '@/modules/garage/stati'

type Utente = { id: string; nome: string; cognome: string | null; attivo: boolean }
const errore = (e: unknown) => toast.error(messaggioErrore(e))

// ── Struttura e tariffe ─────────────────────────────────────────────────
export function ImpostazioniGaragePage() {
  return <ManagerOnly><ConStruttura><Impostazioni_ /></ConStruttura></ManagerOnly>
}

function Impostazioni_() {
  const [params, setParams] = useSearchParams()
  const scheda = params.get('scheda') ?? 'struttura'
  const [nuova, setNuova] = useState(false)
  return (
    <div>
      <PageHeader title="Struttura e tariffe" description="Dati dell'autorimessa, aree e posti della mappa, tariffari e festivi, colonnine di ricarica, listino dei servizi."
        actions={<><SelettoreStruttura /><Button variant="outline" onClick={() => setNuova(true)}><Plus className="h-4 w-4" /> Altra struttura</Button></>} />
      <ConfiguraStrutturaDialog open={nuova} onOpenChange={setNuova} />
      <Tabs value={scheda} onValueChange={(v) => setParams({ scheda: v })}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="struttura">Struttura</TabsTrigger><TabsTrigger value="posti">Posti</TabsTrigger><TabsTrigger value="aree">Aree della mappa</TabsTrigger>
          <TabsTrigger value="tariffe">Tariffe</TabsTrigger><TabsTrigger value="festivi">Festivi</TabsTrigger><TabsTrigger value="colonnine">Colonnine</TabsTrigger>
          <TabsTrigger value="listino">Listino servizi</TabsTrigger>
        </TabsList>
        <TabsContent value="struttura"><SchedaStruttura /></TabsContent>
        <TabsContent value="posti"><Posti /></TabsContent>
        <TabsContent value="aree"><Aree /></TabsContent>
        <TabsContent value="tariffe"><Tariffe /></TabsContent>
        <TabsContent value="festivi"><Festivi /></TabsContent>
        <TabsContent value="colonnine"><Colonnine /></TabsContent>
        <TabsContent value="listino"><Listino /></TabsContent>
      </Tabs>
    </div>
  )
}

type Orario = { giorni: number[]; dalle: string; alle: string }

function SchedaStruttura() {
  const { struttura } = useGarage()
  return struttura ? <FormStruttura key={`${struttura.id}-${struttura.updated_at}`} s={struttura} /> : null
}

function FormStruttura({ s }: { s: Struttura }) {
  const salva = useSalva('gar_strutture')
  const { data: utenti = [] } = useElenco<Utente>('user_profiles', { select: 'id, nome, cognome, attivo', ordine: [{ colonna: 'nome' }] })
  const { data: riep } = useElenco<{ posti: number; coperti: number; scoperti: number; auto: number; moto: number; commerciali: number; elettrici: number; disabili: number; fermi: number }>(
    'gar_strutture_riepilogo', { filtri: { struttura_id: s.id } })
  const orari = (Array.isArray(s.orari) ? s.orari : []) as Orario[]
  const feriali = orari.find((o) => o.giorni.includes(1))
  const festivi = orari.find((o) => o.giorni.includes(7))
  const [f, setF] = useState({ nome: s.nome, tipologia: s.tipologia, indirizzo: s.indirizzo ?? '', comune: s.comune ?? '', superficie: campoNumero(s.superficie_mq), piani: String(s.piani),
    altezza: campoNumero(s.altezza_max_m), peso: s.peso_max_kg != null ? String(s.peso_max_kg) : '', sempre: orari.length === 0,
    ferDalle: feriali?.dalle ?? '07:00', ferAlle: feriali?.alle ?? '22:00', fesDalle: festivi?.dalle ?? '08:00', fesAlle: festivi?.alle ?? '20:00', festiviChiuso: orari.length > 0 && !festivi,
    modalita: s.modalita_accesso, responsabile: s.responsabile_id ?? 'nessuno', avvisa: s.avvisa_ingresso, note: s.note ?? '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const r = riep?.[0]
  const registra = () => {
    if (!f.nome.trim()) { toast.error('Il nome è obbligatorio'); return }
    const o: Orario[] = f.sempre ? [] : [{ giorni: [1, 2, 3, 4, 5, 6], dalle: f.ferDalle, alle: f.ferAlle }, ...(f.festiviChiuso ? [] : [{ giorni: [7], dalle: f.fesDalle, alle: f.fesAlle }])]
    salva.mutate({ id: s.id, values: { nome: f.nome.trim(), tipologia: f.tipologia, indirizzo: f.indirizzo.trim() || null, comune: f.comune.trim() || null, superficie_mq: numeroONull(f.superficie),
      piani: Math.max(1, Math.round(numero(f.piani))), altezza_max_m: numeroONull(f.altezza), peso_max_kg: f.peso.trim() ? Math.round(numero(f.peso)) : null, orari: o,
      modalita_accesso: f.modalita.length ? f.modalita : ['manuale'], responsabile_id: f.responsabile === 'nessuno' ? null : f.responsabile, avvisa_ingresso: f.avvisa, note: f.note.trim() || null } }, {
      onSuccess: () => toast.success('Struttura aggiornata'), onError: errore })
  }
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card className="grid grid-cols-6 gap-3 p-5">
        <div className="col-span-6 space-y-1.5 sm:col-span-4"><Label htmlFor="st-nome">Denominazione</Label><Input id="st-nome" value={f.nome} onChange={set('nome')} /></div>
        <div className="col-span-6 space-y-1.5 sm:col-span-2"><Label htmlFor="st-tipo">Tipologia</Label>
          <Select value={f.tipologia} onValueChange={(v) => setF({ ...f, tipologia: v })}><SelectTrigger id="st-tipo"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(STRUTTURA_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="col-span-6 space-y-1.5 sm:col-span-4"><Label htmlFor="st-ind">Indirizzo</Label><Input id="st-ind" value={f.indirizzo} onChange={set('indirizzo')} /></div>
        <div className="col-span-6 space-y-1.5 sm:col-span-2"><Label htmlFor="st-com">Comune</Label><Input id="st-com" value={f.comune} onChange={set('comune')} /></div>
        <div className="col-span-3 space-y-1.5 sm:col-span-1"><Label htmlFor="st-sup">Superficie (m²)</Label><Input id="st-sup" inputMode="decimal" value={f.superficie} onChange={set('superficie')} /></div>
        <div className="col-span-3 space-y-1.5 sm:col-span-1"><Label htmlFor="st-piani">Piani</Label><Input id="st-piani" inputMode="numeric" value={f.piani} onChange={set('piani')} /></div>
        <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="st-alt">Altezza massima (m)</Label><Input id="st-alt" inputMode="decimal" value={f.altezza} onChange={set('altezza')} /></div>
        <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="st-peso">Peso massimo (kg)</Label><Input id="st-peso" inputMode="numeric" value={f.peso} onChange={set('peso')} /></div>
        <fieldset className="col-span-6 grid grid-cols-6 gap-3">
          <legend className="col-span-6 mb-1 text-sm font-medium text-foreground">Orari di apertura</legend>
          <label className="col-span-6 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.sempre} onCheckedChange={(v) => setF({ ...f, sempre: v === true })} /> Sempre aperto (24 ore su 24)</label>
          {!f.sempre && <>
            <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="st-fd">Lun–Sab dalle</Label><Input id="st-fd" type="time" value={f.ferDalle} onChange={set('ferDalle')} /></div>
            <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="st-fa">alle</Label><Input id="st-fa" type="time" value={f.ferAlle} onChange={set('ferAlle')} /></div>
            <label className="col-span-6 flex items-end gap-2 pb-2 text-sm text-foreground sm:col-span-2"><Checkbox checked={f.festiviChiuso} onCheckedChange={(v) => setF({ ...f, festiviChiuso: v === true })} /> Chiuso la domenica</label>
            {!f.festiviChiuso && <>
              <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="st-sd">Domenica dalle</Label><Input id="st-sd" type="time" value={f.fesDalle} onChange={set('fesDalle')} /></div>
              <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="st-sa">alle</Label><Input id="st-sa" type="time" value={f.fesAlle} onChange={set('fesAlle')} /></div>
            </>}
          </>}
        </fieldset>
        <fieldset className="col-span-6">
          <legend className="mb-2 text-sm font-medium text-foreground">Modalità di accesso</legend>
          <div className="flex flex-wrap gap-1.5">{Object.entries(MODALITA_ACCESSO).map(([k, l]) => {
            const on = f.modalita.includes(k)
            return <Button key={k} type="button" size="sm" variant={on ? 'default' : 'outline'} aria-pressed={on}
              onClick={() => setF({ ...f, modalita: on ? f.modalita.filter((x) => x !== k) : [...f.modalita, k] })}>{l}</Button>
          })}</div>
          <p className="mt-1 text-xs text-muted-foreground">Lettori di targhe, badge, RFID, telecomandi e app sono predisposti: si collegano su richiesta.</p>
        </fieldset>
        <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="st-resp">Responsabile</Label>
          <Select value={f.responsabile} onValueChange={(v) => setF({ ...f, responsabile: v })}><SelectTrigger id="st-resp"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nessuno">Non indicato</SelectItem>{utenti.filter((u) => u.attivo).map((u) => <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>)}</SelectContent></Select></div>
        <label className="col-span-6 flex items-end gap-2 pb-2 text-sm text-foreground sm:col-span-3"><Checkbox checked={f.avvisa} onCheckedChange={(v) => setF({ ...f, avvisa: v === true })} /> Conferma d'ingresso per email ai clienti</label>
        <div className="col-span-6 space-y-1.5"><Label htmlFor="st-note">Note</Label><Input id="st-note" value={f.note} onChange={set('note')} /></div>
        <div className="col-span-6 flex justify-end"><BottoneScrittura onClick={registra} disabled={salva.isPending}>Salva la struttura</BottoneScrittura></div>
      </Card>
      <Card className="h-fit p-5">
        <h2 className="mb-2 text-title text-foreground">I posti in numeri</h2>
        {!r ? <Skeleton className="h-32" /> : (
          <dl className="divide-y divide-border text-sm">{([['Posti in tutto', r.posti], ['Coperti', r.coperti], ['Scoperti', r.scoperti], ['Auto', r.auto], ['Moto', r.moto],
            ['Veicoli commerciali', r.commerciali], ['Con ricarica', r.elettrici], ['Disabili', r.disabili], ['Fermi', r.fermi]] as const).map(([l, v]) => (
            <div key={l} className="flex justify-between py-1.5"><dt className="text-muted-foreground">{l}</dt><dd className="tabular-nums text-foreground">{v}</dd></div>))}</dl>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Si calcolano dai posti: per cambiarli, la scheda «Posti».</p>
      </Card>
    </div>
  )
}

function Posti() {
  const { strutturaId } = useGarage()
  const { isAdmin } = useAuth()
  const { data: posti = [], isLoading } = useElenco<Posto>('gar_posti', { filtri: { struttura_id: strutturaId }, ordine: [{ colonna: 'piano' }, { colonna: 'numero' }, { colonna: 'codice' }] })
  const elimina = useElimina('gar_posti', ['gar_posti_stato', 'gar_strutture_riepilogo'])
  const [scelto, setScelto] = useState<Posto | 'nuovo' | null>(null)
  const [serie, setSerie] = useState(false)
  const [q, setQ] = useState('')
  const visibili = posti.filter((p) => !q || p.codice.toLowerCase().includes(q.toLowerCase()) || (p.zona ?? '').toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Codice o zona" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca un posto" />
        <span className="ml-auto" />
        <Button variant="outline" onClick={() => setSerie(true)}><Plus className="h-4 w-4" /> Più posti insieme</Button>
        <BottoneScrittura variant="outline" onClick={() => setScelto('nuovo')}><Plus className="h-4 w-4" /> Un posto</BottoneScrittura>
      </div>
      {isLoading ? <Skeleton className="h-48" /> : visibili.length === 0 ? (
        q ? <EmptyState icon={Plus} filtrato title="Nessun posto trovato" description="Cambia la ricerca." />
          : <EmptyState icon={Plus} title="Nessun posto" description="Aggiungi i posti uno per uno o tutta una fila insieme." action={<Button variant="outline" onClick={() => setSerie(true)}>Più posti insieme</Button>} />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Codice</TableHead><TableHead>Piano</TableHead><TableHead>Zona</TableHead><TableHead>Tipo</TableHead><TableHead>Dimensioni</TableHead>
            <TableHead numerica>Canone</TableHead><TableHead>Note</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>{visibili.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium text-foreground">{p.codice}</TableCell><TableCell>{p.piano}</TableCell><TableCell>{p.zona ?? '—'}</TableCell>
              <TableCell>{POSTO_TIPO[p.tipo]}<span className="block text-xs text-muted-foreground">{[p.coperto ? 'coperto' : 'scoperto', p.riservato ? 'solo contratti' : null,
                p.fermo === 'manutenzione' ? 'in manutenzione' : p.fermo === 'non_disponibile' ? 'non disponibile' : null].filter(Boolean).join(' · ')}</span></TableCell>
              <TableCell>{p.lunghezza_m ? `${fmtNumero(p.lunghezza_m, 2)} × ${fmtNumero(p.larghezza_m, 2)} m` : '—'}</TableCell>
              <TableCell numerica>{p.canone != null ? fmtEuro(p.canone) : '—'}</TableCell>
              <TableCell className="max-w-48 truncate text-sm">{p.note ?? ''}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <Button size="sm" variant="ghost" aria-label={`Modifica ${p.codice}`} onClick={() => setScelto(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                {isAdmin && <Button size="sm" variant="ghost" aria-label={`Elimina ${p.codice}`} onClick={() => { if (window.confirm(`Eliminare il posto ${p.codice}?`)) elimina.mutate(p.id, { onSuccess: () => toast.success('Posto eliminato'), onError: errore }) }}>
                  <Trash2 className="h-3.5 w-3.5" /></Button>}
              </TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      {scelto && <PostoDialog key={scelto === 'nuovo' ? 'nuovo' : scelto.id} posto={scelto === 'nuovo' ? null : scelto} onClose={() => setScelto(null)} />}
      {serie && <SeriePostiDialog onClose={() => setSerie(false)} esistenti={posti} />}
    </div>
  )
}

function PostoDialog({ posto: p, onClose }: { posto: Posto | null; onClose: () => void }) {
  const { strutturaId } = useGarage()
  const salva = useSalva('gar_posti', ['gar_posti_stato', 'gar_strutture_riepilogo', 'gar_posti_assegnabili'])
  const [f, setF] = useState({ codice: p?.codice ?? '', piano: String(p?.piano ?? 0), zona: p?.zona ?? '', numero: p?.numero != null ? String(p.numero) : '', tipo: p?.tipo ?? 'auto',
    lunghezza: campoNumero(p?.lunghezza_m), larghezza: campoNumero(p?.larghezza_m), coperto: p?.coperto ?? true, riservato: p?.riservato ?? false, fermo: p?.fermo ?? 'nessuno',
    canone: campoNumero(p?.canone), note: p?.note ?? '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const registra = () => {
    if (!f.codice.trim()) { toast.error('Il codice è obbligatorio'); return }
    salva.mutate({ id: p?.id, values: { struttura_id: p?.struttura_id ?? strutturaId!, codice: f.codice.trim(), piano: Math.round(numero(f.piano)), zona: f.zona.trim() || null,
      numero: f.numero.trim() ? Math.round(numero(f.numero)) : null, tipo: f.tipo, lunghezza_m: numeroONull(f.lunghezza), larghezza_m: numeroONull(f.larghezza), coperto: f.coperto,
      riservato: f.riservato, fermo: f.fermo === 'nessuno' ? null : f.fermo, canone: numeroONull(f.canone), note: f.note.trim() || null } }, {
      onSuccess: () => { toast.success(p ? 'Posto aggiornato' : `Posto ${f.codice.trim()} aggiunto`); onClose() }, onError: errore })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{p ? `Posto ${p.codice}` : 'Nuovo posto'}</DialogTitle><DialogDescription>Un posto riservato va solo ai contratti: la rotazione non lo usa mai.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="po-cod">Codice *</Label><Input id="po-cod" value={f.codice} onChange={set('codice')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="po-piano">Piano</Label><Input id="po-piano" inputMode="numeric" value={f.piano} onChange={set('piano')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="po-num">Numero</Label><Input id="po-num" inputMode="numeric" value={f.numero} onChange={set('numero')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="po-zona">Zona</Label><Input id="po-zona" value={f.zona} onChange={set('zona')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="po-tipo">Tipo</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="po-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(POSTO_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="po-lu">Lunghezza (m)</Label><Input id="po-lu" inputMode="decimal" value={f.lunghezza} onChange={set('lunghezza')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="po-la">Larghezza (m)</Label><Input id="po-la" inputMode="decimal" value={f.larghezza} onChange={set('larghezza')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="po-can">Canone mensile (€)</Label><Input id="po-can" inputMode="decimal" value={f.canone} onChange={set('canone')} /></div>
          <label className="col-span-3 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.coperto} onCheckedChange={(v) => setF({ ...f, coperto: v === true })} /> Coperto</label>
          <label className="col-span-3 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.riservato} onCheckedChange={(v) => setF({ ...f, riservato: v === true })} /> Solo per contratti</label>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="po-fermo">Disponibilità</Label>
            <Select value={f.fermo} onValueChange={(v) => setF({ ...f, fermo: v })}><SelectTrigger id="po-fermo"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">Utilizzabile</SelectItem><SelectItem value="manutenzione">In manutenzione</SelectItem><SelectItem value="non_disponibile">Non disponibile</SelectItem></SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="po-note">Note</Label><Input id="po-note" value={f.note} onChange={set('note')} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={salva.isPending}>{p ? 'Salva' : 'Aggiungi'}</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SeriePostiDialog({ onClose, esistenti }: { onClose: () => void; esistenti: Posto[] }) {
  const { strutturaId } = useGarage()
  const qc = useQueryClient()
  const [f, setF] = useState({ piano: '0', dal: '1', al: '10', tipo: 'auto', zona: '', coperto: true, canone: '' })
  const [inCorso, setInCorso] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const piano = Math.round(numero(f.piano)), dal = Math.round(numero(f.dal)), al = Math.round(numero(f.al))
  const codici = al >= dal && al - dal < 500 ? Array.from({ length: al - dal + 1 }, (_, i) => codicePosto(piano, dal + i)) : []
  const doppi = codici.filter((c) => esistenti.some((p) => p.codice === c))
  async function crea() {
    if (!codici.length) { toast.error('Controlla i numeri: da… a…'); return }
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const nuovi = codici.map((codice, i) => ({ codice, numero: dal + i })).filter((x) => !doppi.includes(x.codice)).map((x) => ({ struttura_id: strutturaId!, ...x, piano, tipo: f.tipo,
        zona: f.zona.trim() || null, coperto: f.coperto, canone: numeroONull(f.canone), created_by: auth.user!.id }))
      const { error } = await supabase.from('gar_posti').insert(nuovi)
      if (error) throw error
      await qc.invalidateQueries({ queryKey: ['fond'] })
      toast.success(`${nuovi.length} posti aggiunti`)
      onClose()
    } catch (e) { errore(e) } finally { setInCorso(false) }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Più posti insieme</DialogTitle><DialogDescription>Una fila di posti numerati sullo stesso piano: i codici sono piano e numero ({codicePosto(piano, dal)}…).</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="sp-piano">Piano (−1 = interrato)</Label><Input id="sp-piano" inputMode="numeric" value={f.piano} onChange={set('piano')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="sp-dal">Dal numero</Label><Input id="sp-dal" inputMode="numeric" value={f.dal} onChange={set('dal')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="sp-al">Al numero</Label><Input id="sp-al" inputMode="numeric" value={f.al} onChange={set('al')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="sp-tipo">Tipo</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="sp-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(POSTO_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="sp-zona">Zona</Label><Input id="sp-zona" value={f.zona} onChange={set('zona')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="sp-can">Canone mensile (€)</Label><Input id="sp-can" inputMode="decimal" value={f.canone} onChange={set('canone')} /></div>
          <label className="col-span-3 flex items-end gap-2 pb-2 text-sm text-foreground"><Checkbox checked={f.coperto} onCheckedChange={(v) => setF({ ...f, coperto: v === true })} /> Coperti</label>
          <p className="col-span-6 text-sm text-muted-foreground" aria-live="polite">{codici.length ? `${codici.length - doppi.length} posti nuovi${doppi.length ? `; ${doppi.length} esistono già e restano come sono` : ''}.` : 'Numeri non validi.'}</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={crea} disabled={inCorso || codici.length === doppi.length}>Aggiungi i posti</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Aree() {
  const { strutturaId } = useGarage()
  const { isAdmin } = useAuth()
  const { data: aree = [], isLoading } = useElenco<Area>('gar_aree', { filtri: { struttura_id: strutturaId }, ordine: [{ colonna: 'piano' }, { colonna: 'ordine' }] })
  const salva = useSalva('gar_aree')
  const elimina = useElimina('gar_aree')
  const [f, setF] = useState({ piano: '0', nome: '', tipo: 'corsia' })
  const aggiungi = () => {
    if (!f.nome.trim()) { toast.error('Dai un nome all\'area'); return }
    salva.mutate({ values: { struttura_id: strutturaId!, piano: Math.round(numero(f.piano)), nome: f.nome.trim(), tipo: f.tipo, ordine: aree.length } }, {
      onSuccess: () => { toast.success('Area aggiunta'); setF({ ...f, nome: '' }) }, onError: errore })
  }
  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 items-end gap-3 p-4 md:grid-cols-[6rem_1fr_12rem_auto]">
        <div className="space-y-1.5"><Label htmlFor="ar-piano">Piano</Label><Input id="ar-piano" inputMode="numeric" value={f.piano} onChange={(e) => setF({ ...f, piano: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="ar-nome">Nome</Label><Input id="ar-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Rampa nord, Corsia A…" /></div>
        <div className="space-y-1.5"><Label htmlFor="ar-tipo">Tipo</Label>
          <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="ar-tipo"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(AREA_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <BottoneScrittura variant="outline" onClick={aggiungi} disabled={salva.isPending}>Aggiungi</BottoneScrittura>
      </Card>
      {isLoading ? <Skeleton className="h-32" /> : aree.length === 0 ? (
        <EmptyState icon={Plus} filtrato title="Nessuna area" description="Corsie, rampe, ingressi, uscite, aree riservate e di servizio compaiono sulla mappa accanto ai posti del loro piano." />
      ) : (
        <Card className="divide-y divide-border">{aree.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-4 py-2 text-sm"><span className="w-16 text-muted-foreground">Piano {a.piano}</span><Badge tone="neutral">{AREA_TIPO[a.tipo]}</Badge>
            <span className="flex-1 text-foreground">{a.nome}</span>
            {isAdmin && <Button size="sm" variant="ghost" aria-label={`Elimina ${a.nome}`} onClick={() => elimina.mutate(a.id, { onSuccess: () => toast.success('Area eliminata'), onError: errore })}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>))}</Card>
      )}
    </div>
  )
}

function Tariffe() {
  const { strutturaId } = useGarage()
  const { data: tariffe = [], isLoading } = useElenco<Tariffario>('gar_tariffari', { filtri: { struttura_id: strutturaId }, ordine: [{ colonna: 'convenzionato' }, { colonna: 'nome' }] })
  const [scelta, setScelta] = useState<Tariffario | 'nuova' | null>(null)
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div>
        <div className="mb-3 flex justify-end"><BottoneScrittura variant="outline" onClick={() => setScelta('nuova')}><Plus className="h-4 w-4" /> Nuova tariffa</BottoneScrittura></div>
        {isLoading ? <Skeleton className="h-48" /> : tariffe.length === 0 ? (
          <EmptyState icon={Calculator} title="Nessuna tariffa" description="Senza tariffa la sosta a rotazione non si paga." action={<BottoneScrittura variant="outline" onClick={() => setScelta('nuova')}>Nuova tariffa</BottoneScrittura>} />
        ) : (
          <ul className="space-y-3">{tariffe.map((t) => (
            <li key={t.id}><Card className="space-y-1 p-4 text-sm">
              <div className="flex items-start justify-between gap-2"><p className="text-title text-foreground">{t.nome}</p>
                <span className="flex items-center gap-1.5">{t.convenzionato && <Badge tone="info">Convenzioni</Badge>}{!t.attivo && <Badge tone="neutral">Non attiva</Badge>}
                  <Button size="sm" variant="ghost" aria-label={`Modifica ${t.nome}`} onClick={() => setScelta(t)}><Pencil className="h-3.5 w-3.5" /></Button></span></div>
              <p className="text-foreground">{fmtEuro(t.prezzo_frazione)} ogni {t.frazione_min === 60 ? 'ora' : `${t.frazione_min} minuti`} · gratis fino a {t.franchigia_min} minuti
                {t.tipo_veicolo ? ` · solo ${VEICOLO_TIPO[t.tipo_veicolo].toLowerCase()}` : ''}</p>
              <p className="text-muted-foreground">{[t.prezzo_notte != null ? `notte ${t.notte_dalle?.slice(0, 5)}–${t.notte_alle?.slice(0, 5)} ${fmtEuro(t.prezzo_notte)}` : null,
                Number(t.festivo_pct) ? `festivi ${Number(t.festivo_pct) > 0 ? '+' : ''}${fmtNumero(t.festivo_pct, 1)}%` : null, t.tetto_giornaliero != null ? `massimo ${fmtEuro(t.tetto_giornaliero)} al giorno` : null,
                t.settimanale != null ? `settimana ${fmtEuro(t.settimanale)}` : null, t.mensile != null ? `mese ${fmtEuro(t.mensile)}` : null, t.annuale != null ? `anno ${fmtEuro(t.annuale)}` : null].filter(Boolean).join(' · ')}</p>
              {t.condizioni && <p className="text-muted-foreground">{t.condizioni}</p>}
            </Card></li>))}</ul>
        )}
      </div>
      <Simulatore tariffe={tariffe} />
      {scelta && <TariffaDialog key={scelta === 'nuova' ? 'nuova' : scelta.id} tariffa={scelta === 'nuova' ? null : scelta} onClose={() => setScelta(null)} />}
    </div>
  )
}

const oraLocale = (d: Date) => `${isoLocale(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** Prova di una tariffa su orari a scelta: lo stesso calcolo dell'uscita. */
function Simulatore({ tariffe }: { tariffe: Tariffario[] }) {
  const [id, setId] = useState<string>('')
  const [f] = useState(() => { const d = new Date(); d.setHours(20, 0, 0, 0); const u = new Date(d); u.setDate(u.getDate() + 1); u.setHours(8); return { da: oraLocale(d), a: oraLocale(u) } })
  const [da, setDa] = useState(f.da)
  const [a, setA] = useState(f.a)
  const scelta = id || tariffe[0]?.id
  const valido = !!scelta && !!da && !!a && new Date(a) >= new Date(da)
  const { data: r } = useRpc<{ importo: number; minuti: number; franchigia: boolean; blocchi: { dal: string; frazioni: number; notti: number; festivo: boolean; importo: number; tetto: boolean }[] }>(
    'gar_calcola_tariffa', { p_tariffario: scelta, p_ingresso: valido ? new Date(da).toISOString() : null, p_uscita: valido ? new Date(a).toISOString() : null }, { abilitato: valido })
  return (
    <Card className="h-fit space-y-3 p-5">
      <h2 className="flex items-center gap-2 text-title text-foreground"><Calculator className="h-4 w-4 text-primary-testo" /> Prova una sosta</h2>
      <div className="space-y-1.5"><Label htmlFor="si-t">Tariffa</Label>
        <Select value={scelta ?? ''} onValueChange={setId}><SelectTrigger id="si-t"><SelectValue placeholder="Nessuna tariffa" /></SelectTrigger>
          <SelectContent>{tariffe.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="si-da">Ingresso</Label><Input id="si-da" type="datetime-local" value={da} onChange={(e) => setDa(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="si-a">Uscita</Label><Input id="si-a" type="datetime-local" value={a} onChange={(e) => setA(e.target.value)} /></div>
      </div>
      <div aria-live="polite">{!valido ? <p className="text-sm text-muted-foreground">L'uscita deve venire dopo l'ingresso.</p> : r && (
        <>
          <p data-slot="kpi" className="text-display text-foreground">{r.franchigia ? 'Gratis' : fmtEuro(r.importo)}</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{r.blocchi.map((b, i) => (
            <li key={i}>Giorno {i + 1}: {b.frazioni} frazioni{b.notti ? `, ${b.notti} ${b.notti === 1 ? 'notte' : 'notti'}` : ''}{b.festivo ? ', festivo' : ''} → {fmtEuro(b.importo)}{b.tetto ? ' (tetto)' : ''}</li>))}</ul>
        </>
      )}</div>
    </Card>
  )
}

function TariffaDialog({ tariffa: t, onClose }: { tariffa: Tariffario | null; onClose: () => void }) {
  const { strutturaId } = useGarage()
  const salva = useSalva('gar_tariffari')
  const [f, setF] = useState({ nome: t?.nome ?? '', tipo: t?.tipo_veicolo ?? 'tutti', convenzionato: t?.convenzionato ?? false, franchigia: String(t?.franchigia_min ?? 10),
    frazione: String(t?.frazione_min ?? 60), prezzo: campoNumero(t?.prezzo_frazione ?? 2), notte: t?.prezzo_notte != null, notteDalle: t?.notte_dalle?.slice(0, 5) ?? '22:00',
    notteAlle: t?.notte_alle?.slice(0, 5) ?? '07:00', prezzoNotte: campoNumero(t?.prezzo_notte), festivo: campoNumero(t?.festivo_pct ?? 0), tetto: campoNumero(t?.tetto_giornaliero),
    settimanale: campoNumero(t?.settimanale), mensile: campoNumero(t?.mensile), annuale: campoNumero(t?.annuale), condizioni: t?.condizioni ?? '', attivo: t?.attivo ?? true })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const registra = () => {
    if (!f.nome.trim()) { toast.error('Dai un nome alla tariffa'); return }
    if (f.notte && !f.prezzoNotte.trim()) { toast.error('Indica il prezzo della notte'); return }
    salva.mutate({ id: t?.id, values: { struttura_id: t?.struttura_id ?? strutturaId!, nome: f.nome.trim(), tipo_veicolo: f.tipo === 'tutti' ? null : f.tipo, convenzionato: f.convenzionato,
      franchigia_min: Math.round(numero(f.franchigia)), frazione_min: Math.max(1, Math.round(numero(f.frazione))), prezzo_frazione: numero(f.prezzo),
      notte_dalle: f.notte ? f.notteDalle : null, notte_alle: f.notte ? f.notteAlle : null, prezzo_notte: f.notte ? numero(f.prezzoNotte) : null, festivo_pct: numero(f.festivo),
      tetto_giornaliero: numeroONull(f.tetto), settimanale: numeroONull(f.settimanale), mensile: numeroONull(f.mensile), annuale: numeroONull(f.annuale),
      condizioni: f.condizioni.trim() || null, attivo: f.attivo } }, { onSuccess: () => { toast.success(t ? 'Tariffa aggiornata' : 'Tariffa creata'); onClose() }, onError: errore })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{t ? t.nome : 'Nuova tariffa'}</DialogTitle>
          <DialogDescription>La sosta si divide in giorni di 24 ore: le ore di notte costano il prezzo fisso, le altre a frazioni (maggiorate se è festivo), e ogni giorno non supera il massimo.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="tf-nome">Nome</Label><Input id="tf-nome" value={f.nome} onChange={set('nome')} /></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="tf-tipo">Per</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="tf-tipo"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="tutti">Tutti i veicoli</SelectItem>{Object.entries(VEICOLO_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="tf-fr">Prezzo (€)</Label><Input id="tf-fr" inputMode="decimal" value={f.prezzo} onChange={set('prezzo')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="tf-min">ogni (minuti)</Label><Input id="tf-min" inputMode="numeric" value={f.frazione} onChange={set('frazione')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="tf-fra">Gratis fino a (minuti)</Label><Input id="tf-fra" inputMode="numeric" value={f.franchigia} onChange={set('franchigia')} /></div>
          <label className="col-span-6 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.notte} onCheckedChange={(v) => setF({ ...f, notte: v === true })} /> Notte a prezzo fisso</label>
          {f.notte && <>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="tf-nd">Dalle</Label><Input id="tf-nd" type="time" value={f.notteDalle} onChange={set('notteDalle')} /></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="tf-na">Alle</Label><Input id="tf-na" type="time" value={f.notteAlle} onChange={set('notteAlle')} /></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="tf-np">Prezzo (€)</Label><Input id="tf-np" inputMode="decimal" value={f.prezzoNotte} onChange={set('prezzoNotte')} /></div>
          </>}
          <div className="col-span-3 space-y-1.5"><Label htmlFor="tf-fe">Festivi (% in più o in meno)</Label><Input id="tf-fe" inputMode="decimal" value={f.festivo} onChange={set('festivo')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="tf-te">Massimo al giorno (€)</Label><Input id="tf-te" inputMode="decimal" value={f.tetto} onChange={set('tetto')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="tf-se">Settimana (€)</Label><Input id="tf-se" inputMode="decimal" value={f.settimanale} onChange={set('settimanale')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="tf-me">Mese (€)</Label><Input id="tf-me" inputMode="decimal" value={f.mensile} onChange={set('mensile')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="tf-an">Anno (€)</Label><Input id="tf-an" inputMode="decimal" value={f.annuale} onChange={set('annuale')} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="tf-co">Condizioni speciali</Label><Input id="tf-co" value={f.condizioni} onChange={set('condizioni')} /></div>
          <label className="col-span-3 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.convenzionato} onCheckedChange={(v) => setF({ ...f, convenzionato: v === true })} /> Per le convenzioni</label>
          <label className="col-span-3 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.attivo} onCheckedChange={(v) => setF({ ...f, attivo: v === true })} /> Attiva</label>
          <p className="col-span-6 text-xs text-muted-foreground">Settimana, mese e anno sono i prezzi di listino degli abbonamenti: il canone di ogni contratto si fissa nel contratto.</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={salva.isPending}>{t ? 'Salva' : 'Crea la tariffa'}</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Festivi() {
  const { isAdmin } = useAuth()
  const { data: festivi = [], isLoading } = useElenco<Festivo>('gar_festivi', { ordine: [{ colonna: 'data' }] })
  const qc = useQueryClient()
  const [f, setF] = useState({ data: '', descrizione: '' })
  const aggiungi = async () => {
    if (!f.data || !f.descrizione.trim()) { toast.error('Data e descrizione'); return }
    const { data: auth } = await supabase.auth.getUser()
    const { error } = await supabase.from('gar_festivi').insert({ data: f.data, descrizione: f.descrizione.trim(), created_by: auth.user!.id })
    if (error) { errore(error); return }
    await qc.invalidateQueries({ queryKey: ['fond'] }); toast.success('Festivo aggiunto'); setF({ data: '', descrizione: '' })
  }
  const togli = async (data: string) => {
    const { error } = await supabase.from('gar_festivi').delete().eq('data', data)
    if (error) { errore(error); return }
    await qc.invalidateQueries({ queryKey: ['fond'] }); toast.success('Festivo tolto')
  }
  const futuri = festivi.filter((x) => x.data >= oggiIso())
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">Domeniche, Capodanno, Epifania, 25 aprile, 1° maggio, 2 giugno, Ferragosto, Ognissanti, Immacolata, Natale e Santo Stefano valgono da soli. Qui si aggiungono Pasquetta e il santo patrono.</p>
      <Card className="grid grid-cols-2 items-end gap-3 p-4 sm:grid-cols-[10rem_1fr_auto]">
        <div className="space-y-1.5"><Label htmlFor="fe-d">Data</Label><Input id="fe-d" type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="fe-desc">Descrizione</Label><Input id="fe-desc" value={f.descrizione} onChange={(e) => setF({ ...f, descrizione: e.target.value })} placeholder="Lunedì dell'Angelo" /></div>
        <BottoneScrittura variant="outline" onClick={aggiungi}>Aggiungi</BottoneScrittura>
      </Card>
      {isLoading ? <Skeleton className="h-24" /> : futuri.length === 0 ? <EmptyState icon={Plus} filtrato title="Nessun festivo aggiunto" description="Le festività nazionali fisse sono già comprese." /> : (
        <Card className="divide-y divide-border">{futuri.map((x) => (
          <div key={x.data} className="flex items-center gap-3 px-4 py-2 text-sm"><span className="w-28 tabular-nums text-foreground">{fmtData(x.data)}</span><span className="flex-1">{x.descrizione}</span>
            {isAdmin && <Button size="sm" variant="ghost" aria-label={`Togli ${x.descrizione}`} onClick={() => togli(x.data)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>))}</Card>
      )}
    </div>
  )
}

function Colonnine() {
  const { strutturaId } = useGarage()
  const { data: colonnine = [], isLoading } = useElenco<Colonnina>('gar_colonnine', { filtri: { struttura_id: strutturaId }, ordine: [{ colonna: 'codice' }] })
  const { data: posti = [] } = useElenco<Posto>('gar_posti', { filtri: { struttura_id: strutturaId }, ordine: [{ colonna: 'codice' }] })
  const [scelta, setScelta] = useState<Colonnina | 'nuova' | null>(null)
  return (
    <div>
      <div className="mb-3 flex justify-end"><BottoneScrittura variant="outline" onClick={() => setScelta('nuova')}><Plus className="h-4 w-4" /> Nuova colonnina</BottoneScrittura></div>
      {isLoading ? <Skeleton className="h-32" /> : colonnine.length === 0 ? (
        <EmptyState icon={Plus} title="Nessuna colonnina" description="Codice, posto, prese, potenza e tariffa al kWh: la ricarica si paga per l'energia erogata."
          action={<BottoneScrittura variant="outline" onClick={() => setScelta('nuova')}>Nuova colonnina</BottoneScrittura>} />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Codice</TableHead><TableHead>Posto</TableHead><TableHead>Prese</TableHead><TableHead>Potenza</TableHead><TableHead numerica>Tariffa</TableHead><TableHead>Stato</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>{colonnine.map((c) => (
            <TableRow key={c.id}><TableCell className="font-medium text-foreground">{c.codice}</TableCell><TableCell>{posti.find((p) => p.id === c.posto_id)?.codice ?? '—'}</TableCell>
              <TableCell>{c.prese}{c.connettore ? ` · ${c.connettore}` : ''}</TableCell><TableCell>{c.potenza_kw ? `${fmtNumero(c.potenza_kw, 1)} kW` : '—'}</TableCell>
              <TableCell numerica>{fmtEuro(c.tariffa_kwh, 3)}/kWh</TableCell><TableCell>{c.fermo ? <Badge tone="danger">{c.fermo === 'guasta' ? 'Guasta' : 'Fuori servizio'}</Badge> : <Badge tone="success">In servizio</Badge>}</TableCell>
              <TableCell className="text-right"><Button size="sm" variant="ghost" aria-label={`Modifica ${c.codice}`} onClick={() => setScelta(c)}><Pencil className="h-3.5 w-3.5" /></Button></TableCell></TableRow>))}</TableBody>
        </Table></Card>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Le manutenzioni delle colonnine si registrano come impianti in «Impianti e sicurezza».</p>
      {scelta && <ColonninaDialog key={scelta === 'nuova' ? 'nuova' : scelta.id} colonnina={scelta === 'nuova' ? null : scelta} posti={posti} onClose={() => setScelta(null)} />}
    </div>
  )
}

function ColonninaDialog({ colonnina: c, posti, onClose }: { colonnina: Colonnina | null; posti: Posto[]; onClose: () => void }) {
  const { strutturaId } = useGarage()
  const salva = useSalva('gar_colonnine', ['gar_colonnine_stato'])
  const [f, setF] = useState({ codice: c?.codice ?? '', posto: c?.posto_id ?? 'nessuno', prese: String(c?.prese ?? 1), potenza: campoNumero(c?.potenza_kw), connettore: c?.connettore ?? 'Tipo 2',
    tariffa: campoNumero(c?.tariffa_kwh ?? 0.5), fermo: c?.fermo ?? 'nessuno', note: c?.note ?? '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const registra = () => {
    if (!f.codice.trim()) { toast.error('Il codice è obbligatorio'); return }
    salva.mutate({ id: c?.id, values: { struttura_id: c?.struttura_id ?? strutturaId!, codice: f.codice.trim(), posto_id: f.posto === 'nessuno' ? null : f.posto, prese: Math.max(1, Math.round(numero(f.prese))),
      potenza_kw: numeroONull(f.potenza), connettore: f.connettore.trim() || null, tariffa_kwh: numero(f.tariffa), fermo: f.fermo === 'nessuno' ? null : f.fermo, note: f.note.trim() || null } }, {
      onSuccess: () => { toast.success(c ? 'Colonnina aggiornata' : 'Colonnina installata'); onClose() }, onError: errore })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{c ? `Colonnina ${c.codice}` : 'Nuova colonnina'}</DialogTitle><DialogDescription>La tariffa vale per le ricariche avviate da qui in poi.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="co-cod">Codice</Label><Input id="co-cod" value={f.codice} onChange={set('codice')} /></div>
          <div className="col-span-4 space-y-1.5"><Label htmlFor="co-posto">Posto</Label>
            <Select value={f.posto} onValueChange={(v) => setF({ ...f, posto: v })}><SelectTrigger id="co-posto"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">Nessuno</SelectItem>{posti.map((p) => <SelectItem key={p.id} value={p.id}>{p.codice} · {POSTO_TIPO[p.tipo]}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="co-pr">Prese</Label><Input id="co-pr" inputMode="numeric" value={f.prese} onChange={set('prese')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="co-kw">Potenza (kW)</Label><Input id="co-kw" inputMode="decimal" value={f.potenza} onChange={set('potenza')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="co-con">Connettore</Label><Input id="co-con" value={f.connettore} onChange={set('connettore')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="co-tar">Tariffa (€/kWh)</Label><Input id="co-tar" inputMode="decimal" value={f.tariffa} onChange={set('tariffa')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="co-st">Stato</Label>
            <Select value={f.fermo} onValueChange={(v) => setF({ ...f, fermo: v })}><SelectTrigger id="co-st"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">In servizio</SelectItem><SelectItem value="guasta">Guasta</SelectItem><SelectItem value="fuori_servizio">Fuori servizio</SelectItem></SelectContent></Select></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="co-note">Note</Label><Input id="co-note" value={f.note} onChange={set('note')} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={salva.isPending}>{c ? 'Salva' : 'Installa'}</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Listino() {
  const { data: voci = [], isLoading } = useElenco<VoceListino>('gar_servizi_listino', { ordine: [{ colonna: 'categoria' }, { colonna: 'nome' }] })
  const [scelta, setScelta] = useState<VoceListino | 'nuova' | null>(null)
  return (
    <div>
      <div className="mb-3 flex justify-end"><BottoneScrittura variant="outline" onClick={() => setScelta('nuova')}><Plus className="h-4 w-4" /> Nuovo servizio</BottoneScrittura></div>
      {isLoading ? <Skeleton className="h-32" /> : voci.length === 0 ? (
        <EmptyState icon={Plus} title="Listino vuoto" description="Lavaggio, pulizia interna, sanificazione, cambio e deposito gomme, piccola manutenzione, revisione, recupero e consegna."
          action={<BottoneScrittura variant="outline" onClick={() => setScelta('nuova')}>Nuovo servizio</BottoneScrittura>} />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Servizio</TableHead><TableHead>Categoria</TableHead><TableHead>Durata</TableHead><TableHead numerica>Prezzo</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>{voci.map((v) => (
            <TableRow key={v.id}><TableCell className="text-foreground">{v.nome}{!v.attivo && <Badge tone="neutral" className="ml-2">Non attivo</Badge>}</TableCell><TableCell>{SERVIZIO_CATEGORIA[v.categoria]}</TableCell>
              <TableCell>{v.durata_min ? `${v.durata_min} minuti` : '—'}</TableCell><TableCell numerica>{fmtEuro(v.prezzo)}<span className="block text-xs text-muted-foreground">IVA {fmtNumero(v.aliquota_iva)}%</span></TableCell>
              <TableCell className="text-right"><Button size="sm" variant="ghost" aria-label={`Modifica ${v.nome}`} onClick={() => setScelta(v)}><Pencil className="h-3.5 w-3.5" /></Button></TableCell></TableRow>))}</TableBody>
        </Table></Card>
      )}
      {scelta && <VoceDialog key={scelta === 'nuova' ? 'nuova' : scelta.id} voce={scelta === 'nuova' ? null : scelta} onClose={() => setScelta(null)} />}
    </div>
  )
}

function VoceDialog({ voce: v, onClose }: { voce: VoceListino | null; onClose: () => void }) {
  const salva = useSalva('gar_servizi_listino')
  const [f, setF] = useState({ nome: v?.nome ?? '', categoria: v?.categoria ?? 'lavaggio', prezzo: campoNumero(v?.prezzo ?? null), iva: campoNumero(v?.aliquota_iva ?? 22),
    durata: v?.durata_min != null ? String(v.durata_min) : '', attivo: v?.attivo ?? true })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const registra = () => {
    if (!f.nome.trim()) { toast.error('Dai un nome al servizio'); return }
    salva.mutate({ id: v?.id, values: { nome: f.nome.trim(), categoria: f.categoria, prezzo: numero(f.prezzo), aliquota_iva: numero(f.iva), durata_min: f.durata.trim() ? Math.round(numero(f.durata)) : null,
      attivo: f.attivo } }, { onSuccess: () => { toast.success(v ? 'Servizio aggiornato' : 'Servizio a listino'); onClose() }, onError: errore })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{v ? v.nome : 'Nuovo servizio a listino'}</DialogTitle><DialogDescription>Ogni servizio si associa al veicolo e si incassa a parte.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5"><Label htmlFor="vl-nome">Nome</Label><Input id="vl-nome" value={f.nome} onChange={set('nome')} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="vl-cat">Categoria</Label>
            <Select value={f.categoria} onValueChange={(x) => setF({ ...f, categoria: x })}><SelectTrigger id="vl-cat"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(SERVIZIO_CATEGORIA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="vl-pr">Prezzo (€)</Label><Input id="vl-pr" inputMode="decimal" value={f.prezzo} onChange={set('prezzo')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="vl-iva">IVA (%)</Label><Input id="vl-iva" inputMode="decimal" value={f.iva} onChange={set('iva')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="vl-dur">Minuti</Label><Input id="vl-dur" inputMode="numeric" value={f.durata} onChange={set('durata')} /></div>
          <label className="col-span-6 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.attivo} onCheckedChange={(x) => setF({ ...f, attivo: x === true })} /> A listino</label>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={salva.isPending}>{v ? 'Salva' : 'Aggiungi'}</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Sezioni condivise ───────────────────────────────────────────────────
export function ImpiantiGaragePage() {
  return (
    <ConStruttura>
      <PageHeader title="Impianti e sicurezza" description="Cancelli, serrande, ascensori, impianti elettrici, illuminazione, ventilazione, antincendio, pompe, sicurezza e colonnine: manutenzioni, controlli periodici, incidenti e allarmi."
        actions={<SelettoreStruttura />} />
      <ControlliSezione modulo="garage" moduli={['garage']}
        categorieAsset={['Cancello', 'Serranda', 'Sbarra', 'Ascensore', 'Impianto elettrico', 'Illuminazione', 'Ventilazione', 'Antincendio', 'Rilevazione fumo', 'Rilevazione CO',
          'Pompe', 'Videosorveglianza', 'Controllo accessi', 'Colonnina di ricarica', 'Altro']} />
      <p className="mt-3 text-xs text-muted-foreground">Videosorveglianza, allarmi, antincendio e rilevatori di fumo e CO sono predisposti: l'evento arriva come segnalazione di sicurezza e si collega al movimento del veicolo, senza conservare immagini nel gestionale.</p>
    </ConStruttura>
  )
}

export function PersonaleGaragePage() {
  return (
    <ConStruttura>
      <PageHeader title="Personale e turni" description="Turni di cassa, custodia e servizi, presenze e carenze." actions={<SelettoreStruttura />} />
      <TurniSezione modulo="garage" reparti={['cassa', 'custodia', 'parcheggiatori', 'lavaggio', 'manutenzione', 'notte', 'direzione']} />
    </ConStruttura>
  )
}

export function CampagneGaragePage() {
  return (
    <ConStruttura>
      <PageHeader title="Comunicazioni e promozioni" description="Promozioni agli abbonati, a chi ha il contratto in scadenza, ai clienti abituali della sosta breve e agli ex abbonati." actions={<SelettoreStruttura />} />
      <CampagneSezione modulo="garage" />
      <p className="mt-3 text-xs text-muted-foreground">Gli avvisi di servizio partono da soli per email: scadenza del contratto, mancato pagamento, conferma della prenotazione e dell'ingresso, posto disponibile, veicolo pronto. SMS, WhatsApp e app sono predisposti.</p>
    </ConStruttura>
  )
}
