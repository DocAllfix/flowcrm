/**
 * Il lavoro commerciale dell'agenzia: cruscotto della direzione (§26),
 * visite (§13), proposte e trattative fino al rogito con il post-vendita
 * (§7, §14–15, §24), locazioni con l'ISTAT (§17), agenda (§21).
 */
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Handshake, KeyRound, Plus, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import { useElenco, useRpc, useSalva, useAzione, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { ConAgenzia } from '@/modules/immobiliare/componenti/ConAgenzia'
import { CampoAgente, CampoCliente, CampoImmobile, assicuraContatto, clienteVuoto, type Cliente } from '@/modules/immobiliare/componenti/Scelte'
import { useAgenti, useImmobiliBrevi, nomeAgente, etichettaImmobile, TABELLE_COMMERCIALI, type Canone, type Chiusura, type Collaboratore, type ContattoBreve, type Immobile,
  type Locazione, type Proposta, type Visita, type VoceAgenda } from '@/modules/immobiliare/queries'
import { AGENDA_TIPO, CHIUSURA_STATO, ESITO, LOCAZIONE_STATO, PROPOSTA_STATO, TIPO_LOCAZIONE, VISITA_STATO, campoNumero, fmtData, fmtEuro, fmtNumero, fmtOra,
  isoLocale, nomeContatto, numero, numeroONull, oggiIso, piuGiorni } from '@/modules/immobiliare/stati'

const errore = (e: unknown) => toast.error(messaggioErrore(e))
const oraLocale = (d: Date) => `${isoLocale(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
type ImmBreve = Pick<Immobile, 'codice' | 'indirizzo' | 'comune'>

// ── Cruscotto ───────────────────────────────────────────────────────────
interface Cruscotto {
  portafoglio: number; in_acquisizione: number; nuovi_incarichi: number; incarichi_in_scadenza: number; lead_nuovi: number; lead_senza_risposta: number
  visite_oggi: { id: string; inizio: string; immobile: string; indirizzo: string; cliente: string; stato: string }[]
  trattative_aperte: number; offerte_in_attesa: number; vendite_mese: number; locazioni_mese: number; rogiti_in_arrivo: number; documenti_mancanti: number
  pipeline: { pipeline: string; fase: string; ordine: number; trattative: number; valore: number }[]
  fatturato_previsto: number | null; provvigioni_mese: number | null
  agenti: { nome: string; portafoglio: number; visite: number; acquisizioni: number; vendite: number; provvigioni: number | null }[]
}

export function CruscottoImmobiliarePage() {
  return <ConAgenzia><Cruscotto_ /></ConAgenzia>
}

function Cruscotto_() {
  useDalVivo(['imm_lead', 'imm_visite', 'imm_proposte'], [['fond-rpc']])
  const { data: c, isLoading } = useRpc<Cruscotto>('imm_cruscotto', {}, { intervallo: 60_000 })
  const n = (v: number | undefined) => (isLoading ? undefined : v ?? 0)
  const avvisi: [number | undefined, string, string][] = [
    [c?.lead_senza_risposta, 'lead che aspettano una risposta', '/immobiliare/lead'],
    [c?.offerte_in_attesa, 'proposte in attesa di risposta', '/immobiliare/trattative'],
    [c?.incarichi_in_scadenza, 'incarichi che scadono entro 30 giorni', '/immobiliare/immobili'],
    [c?.rogiti_in_arrivo, 'rogiti nei prossimi 30 giorni', '/immobiliare/trattative?scheda=chiusure'],
    [c?.documenti_mancanti, 'documenti obbligatori mancanti', '/immobiliare/immobili'],
  ]
  const aperti = avvisi.filter(([v]) => Number(v) > 0)
  const pipeline = (nome: string) => (c?.pipeline ?? []).filter((p) => p.pipeline === nome)
  return (
    <div>
      <PageHeader title="Cruscotto dell'agenzia" description={`Portafoglio, clienti, visite e trattative del ${fmtData(oggiIso())}.`}
        numeri={[
          { etichetta: 'immobili sul mercato', valore: n(c?.portafoglio), inCaricamento: isLoading },
          { etichetta: 'lead nuovi', valore: n(c?.lead_nuovi), inCaricamento: isLoading },
          { etichetta: 'trattative aperte', valore: n(c?.trattative_aperte), inCaricamento: isLoading },
          { etichetta: 'vendite e locazioni del mese', valore: isLoading ? undefined : (c?.vendite_mese ?? 0) + (c?.locazioni_mese ?? 0), inCaricamento: isLoading },
        ]}
        actions={<><Button asChild variant="outline"><Link to="/immobiliare/lead">Lead</Link></Button><Button asChild><Link to="/immobiliare/visite">Visite</Link></Button></>} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><CalendarDays className="h-4 w-4 text-primary-testo" /> Visite di oggi</h2>
          {isLoading ? <Skeleton className="h-24" /> : (c?.visite_oggi.length ?? 0) === 0 ? <p className="py-2 text-sm text-muted-foreground">Nessuna visita in programma oggi.</p> : (
            <ul className="divide-y divide-border text-sm">{c!.visite_oggi.map((v) => (
              <li key={v.id}><Link to="/immobiliare/visite" className="flex items-center gap-3 py-2 hover:text-primary-testo"><span className="w-12 tabular-nums text-muted-foreground">{fmtOra(v.inizio)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium text-foreground">{v.cliente}</span><span className="block truncate text-xs text-muted-foreground">{v.immobile} · {v.indirizzo}</span></span>
                <Badge tone={VISITA_STATO[v.stato]?.tone ?? 'neutral'}>{VISITA_STATO[v.stato]?.label ?? v.stato}</Badge></Link></li>))}</ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><TriangleAlert className="h-4 w-4 text-primary-testo" /> Da sistemare</h2>
          {isLoading ? <Skeleton className="h-24" /> : aperti.length === 0 ? <p className="py-2 text-sm text-muted-foreground">Niente in sospeso.</p> : (
            <ul className="space-y-1 text-sm">{aperti.map(([v, l, to]) => (
              <li key={l}><Link to={to} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"><span className="text-foreground">{l}</span><Badge tone="warning">{v}</Badge></Link></li>))}</ul>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            <div><dt className="text-muted-foreground">Nuovi incarichi del mese</dt><dd data-slot="kpi" className="text-title text-foreground">{c?.nuovi_incarichi ?? 0}</dd></div>
            <div><dt className="text-muted-foreground">In acquisizione</dt><dd data-slot="kpi" className="text-title text-foreground">{c?.in_acquisizione ?? 0}</dd></div>
            {c?.fatturato_previsto != null && <div><dt className="text-muted-foreground">Provvigioni attese dalle trattative</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtEuro(c.fatturato_previsto, 0)}</dd></div>}
            {c?.provvigioni_mese != null && <div><dt className="text-muted-foreground">Provvigioni maturate nel mese</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtEuro(c.provvigioni_mese, 0)}</dd></div>}
          </dl>
        </Card>
        {(['Acquisizione', 'Trattative'] as const).map((nome) => {
          const fasi = pipeline(nome)
          const max = Math.max(1, ...fasi.map((f) => f.trattative))
          return (
            <Card key={nome} className="p-5">
              <h2 className="mb-3 text-title text-foreground">{nome === 'Acquisizione' ? 'Acquisizione degli immobili' : 'Trattative con i clienti'}</h2>
              {isLoading ? <Skeleton className="h-32" /> : <ul className="space-y-1.5 text-sm">{fasi.map((f) => (
                <li key={f.fase} className="flex items-center gap-3"><span className="w-36 shrink-0 truncate text-muted-foreground">{f.fase}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-primary" style={{ width: `${(100 * f.trattative) / max}%` }} /></span>
                  <span className="w-8 text-right tabular-nums text-foreground">{f.trattative}</span></li>))}</ul>}
            </Card>
          )
        })}
        <Card className="p-5 xl:col-span-2">
          <h2 className="mb-3 text-title text-foreground">Gli agenti questo mese</h2>
          {isLoading ? <Skeleton className="h-24" /> : (c?.agenti.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">Nessun agente: si aggiungono da «Agenti e rete».</p> : (
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Agente</TableHead><TableHead numerica>Portafoglio</TableHead><TableHead numerica>Visite</TableHead><TableHead numerica>Acquisizioni</TableHead>
                <TableHead numerica>Vendite e locazioni</TableHead>{c!.agenti.some((a) => a.provvigioni != null) && <TableHead numerica>Provvigioni</TableHead>}</TableRow></TableHeader>
              <TableBody>{c!.agenti.map((a) => <TableRow key={a.nome}><TableCell className="text-foreground">{a.nome}</TableCell><TableCell numerica>{a.portafoglio}</TableCell>
                <TableCell numerica>{a.visite}</TableCell><TableCell numerica>{a.acquisizioni}</TableCell><TableCell numerica>{a.vendite}</TableCell>
                {a.provvigioni != null && <TableCell numerica>{fmtEuro(a.provvigioni, 0)}</TableCell>}</TableRow>)}</TableBody>
            </Table></div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── Visite ──────────────────────────────────────────────────────────────
export function VisitePage() {
  return <ConAgenzia><Visite_ /></ConAgenzia>
}

function Visite_() {
  useDalVivo(['imm_visite'])
  const [params] = useSearchParams()
  const { agenti, io } = useAgenti()
  const [dal, setDal] = useState(oggiIso())
  const [agente, setAgente] = useState<string>(io?.agente_id ?? 'tutti')
  const al = piuGiorni(dal, 7)
  const { data: visite = [], isLoading } = useElenco<Visita & { contatti: ContattoBreve | null; imm_immobili: ImmBreve | null }>('imm_visite', {
    select: '*, contatti(id, nome, cognome, email, telefono), imm_immobili(codice, indirizzo, comune)', filtri: { agente_id: agente === 'tutti' ? undefined : agente },
    tra: { colonna: 'inizio', da: new Date(`${dal}T00:00`).toISOString(), a: new Date(`${al}T00:00`).toISOString() }, ordine: [{ colonna: 'inizio' }] })
  const salva = useSalva('imm_visite', TABELLE_COMMERCIALI)
  const [nuova, setNuova] = useState(!!params.get('immobile'))
  const [esito, setEsito] = useState<Visita | null>(null)
  const giorni = [...new Set(visite.map((v) => isoLocale(new Date(v.inizio))))]
  const cambia = (v: Visita, stato: string, ok: string) => salva.mutate({ id: v.id, values: { stato } }, { onSuccess: () => toast.success(ok), onError: errore })
  return (
    <div>
      <PageHeader title="Visite" description="Il calendario delle visite: conferma al cliente e all'agente, esito e commenti, seconda visita, seguito."
        numeri={[
          { etichetta: 'in settimana', valore: isLoading ? undefined : visite.filter((v) => v.stato !== 'annullata').length, inCaricamento: isLoading },
          { etichetta: 'svolte', valore: isLoading ? undefined : visite.filter((v) => v.stato === 'svolta').length, inCaricamento: isLoading },
          { etichetta: 'da confermare', valore: isLoading ? undefined : visite.filter((v) => v.stato === 'proposta').length, inCaricamento: isLoading },
        ]}
        actions={<BottoneScrittura onClick={() => setNuova(true)}><Plus className="h-4 w-4" /> Nuova visita</BottoneScrittura>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Settimana prima" onClick={() => setDal(piuGiorni(dal, -7))}><ChevronLeft className="h-4 w-4" /></Button>
        <Input type="date" className="w-44" value={dal} onChange={(e) => e.target.value && setDal(e.target.value)} aria-label="Dal giorno" />
        <Button variant="outline" size="icon" aria-label="Settimana dopo" onClick={() => setDal(piuGiorni(dal, 7))}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={() => setDal(oggiIso())}>Da oggi</Button>
        <Select value={agente} onValueChange={setAgente}><SelectTrigger className="w-48" aria-label="Agente"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="tutti">Tutti gli agenti</SelectItem>{agenti.map((a) => <SelectItem key={a.agente_id!} value={a.agente_id!}>{a.nome}</SelectItem>)}</SelectContent></Select>
      </div>
      {isLoading ? <Skeleton className="h-64" /> : visite.length === 0 ? (
        <EmptyState icon={CalendarDays} filtrato title="Nessuna visita in questa settimana" description="Le visite si fissano da qui, dal fascicolo dell'immobile o dalla richiesta del cliente." />
      ) : giorni.map((g) => (
        <section key={g} className="mb-5" aria-label={fmtData(g)}>
          <h2 className={cn('mb-2 text-label uppercase', g === oggiIso() ? 'text-primary-testo' : 'text-muted-foreground')}>
            {new Date(`${g}T12:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          <Card className="divide-y divide-border">{visite.filter((v) => isoLocale(new Date(v.inizio)) === g).map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="w-12 tabular-nums text-muted-foreground">{fmtOra(v.inizio)}</span>
              <span className="min-w-0 flex-1"><span className="block font-medium text-foreground">{nomeContatto(v.contatti)}{v.numero > 1 ? ` · ${v.numero}ª visita` : ''}</span>
                <span className="block text-xs text-muted-foreground">{v.imm_immobili ? <Link className="hover:text-primary-testo" to={`/immobiliare/immobili/${v.immobile_id}`}>{etichettaImmobile(v.imm_immobili)}</Link> : ''}
                  {` · ${nomeAgente(agenti, v.agente_id) ?? 'senza agente'}`}{v.contatti?.telefono ? ` · ${v.contatti.telefono}` : ''}</span>
                {v.esito && <span className="block text-xs text-foreground">{ESITO[v.esito]}{v.gradimento ? ` · gradimento ${v.gradimento}/5` : ''}{v.feedback ? ` · «${v.feedback}»` : ''}</span>}</span>
              <Badge tone={VISITA_STATO[v.stato].tone}>{VISITA_STATO[v.stato].label}</Badge>
              {v.stato === 'proposta' && <BottoneScrittura size="sm" variant="outline" onClick={() => cambia(v, 'confermata', 'Visita confermata: il cliente riceve l\'email')}>Conferma</BottoneScrittura>}
              {['proposta', 'confermata'].includes(v.stato) && <>
                <BottoneScrittura size="sm" variant="outline" onClick={() => setEsito(v)}><Check className="h-3.5 w-3.5" /> Com'è andata</BottoneScrittura>
                <Button size="sm" variant="ghost" onClick={() => cambia(v, 'non_presentato', 'Segnato: non presentato')}>Non è venuto</Button>
                <Button size="sm" variant="ghost" onClick={() => cambia(v, 'annullata', 'Visita annullata')}>Annulla</Button></>}
            </div>))}</Card>
        </section>
      ))}
      {nuova && <VisitaDialog immobile={params.get('immobile')} contatto={params.get('contatto')} onClose={() => setNuova(false)} />}
      {esito && <EsitoDialog key={esito.id} visita={esito} onClose={() => setEsito(null)} />}
    </div>
  )
}

function VisitaDialog({ immobile, contatto, onClose }: { immobile: string | null; contatto: string | null; onClose: () => void }) {
  const salva = useSalva('imm_visite', TABELLE_COMMERCIALI)
  const { data: preso = [] } = useElenco<ContattoBreve>('contatti', { filtri: { id: contatto ?? undefined }, select: 'id, nome, cognome, email, telefono', abilitato: !!contatto })
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [f0] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return oraLocale(d) })
  const [f, setF] = useState({ immobile: immobile ?? '', inizio: f0, durata: '45', agente: 'nessuno', stato: 'confermata', note: '' })
  const c = cliente ?? (preso[0] ? { testo: nomeContatto(preso[0]), id: preso[0].id, telefono: preso[0].telefono ?? '', email: preso[0].email ?? '' } : clienteVuoto)
  async function registra(e: FormEvent) {
    e.preventDefault()
    if (!f.immobile) { toast.error('Scegli l\'immobile'); return }
    try {
      const contatto_id = await assicuraContatto(c)
      await salva.mutateAsync({ values: { immobile_id: f.immobile, contatto_id, inizio: new Date(f.inizio).toISOString(), durata_min: Math.round(numero(f.durata)) || 45,
        agente_id: f.agente === 'nessuno' ? null : f.agente, stato: f.stato, note: f.note.trim() || null } })
      toast.success(f.stato === 'confermata' ? 'Visita fissata: conferma inviata al cliente e all\'agente' : 'Visita da confermare')
      onClose()
    } catch (err) { errore(err) }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuova visita</DialogTitle><DialogDescription>Senza agente scelto la visita va all'agente dell'immobile.</DialogDescription></DialogHeader>
        <form onSubmit={registra} className="grid grid-cols-6 gap-3">
          <CampoImmobile id="vi-imm" valore={f.immobile} onChange={(v) => setF({ ...f, immobile: v })} stati={['disponibile', 'sotto_offerta']} />
          <CampoCliente id="vi-cli" valore={c} onChange={setCliente} />
          <div className="col-span-4 space-y-1.5"><Label htmlFor="vi-q">Quando</Label><Input id="vi-q" type="datetime-local" value={f.inizio} onChange={(e) => setF({ ...f, inizio: e.target.value })} required /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="vi-d">Minuti</Label><Input id="vi-d" inputMode="numeric" value={f.durata} onChange={(e) => setF({ ...f, durata: e.target.value })} /></div>
          <CampoAgente id="vi-ag" valore={f.agente} onChange={(v) => setF({ ...f, agente: v })} />
          <label className="col-span-3 flex items-end gap-2 pb-2 text-sm text-foreground"><Checkbox checked={f.stato === 'proposta'} onCheckedChange={(v) => setF({ ...f, stato: v === true ? 'proposta' : 'confermata' })} /> Da confermare</label>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="vi-note">Note</Label><Input id="vi-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
          <DialogFooter className="col-span-6"><Button type="button" variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura type="submit" disabled={salva.isPending || !c.testo.trim()}>Fissa la visita</BottoneScrittura></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EsitoDialog({ visita: v, onClose }: { visita: Visita; onClose: () => void }) {
  const salva = useSalva('imm_visite', TABELLE_COMMERCIALI)
  const [f, setF] = useState({ esito: 'interessato', gradimento: '4', feedback: '', prossime: '' })
  const registra = () => salva.mutate({ id: v.id, values: { stato: 'svolta', esito: f.esito, gradimento: Number(f.gradimento), feedback: f.feedback.trim() || null, prossime_azioni: f.prossime.trim() || null } }, {
    onSuccess: () => { toast.success(f.esito === 'non_interessato' ? 'Visita registrata' : 'Visita registrata: fra due giorni l\'agente lo risente'); onClose() }, onError: errore })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Com'è andata la visita</DialogTitle><DialogDescription>I commenti finiscono nel report al proprietario.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-4 space-y-1.5"><Label htmlFor="es-es">Esito</Label>
            <Select value={f.esito} onValueChange={(x) => setF({ ...f, esito: x })}><SelectTrigger id="es-es"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ESITO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="es-gr">Gradimento</Label>
            <Select value={f.gradimento} onValueChange={(x) => setF({ ...f, gradimento: x })}><SelectTrigger id="es-gr"><SelectValue /></SelectTrigger>
              <SelectContent>{[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} su 5</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="es-fb">Cosa ha detto il cliente</Label><Textarea id="es-fb" rows={2} value={f.feedback} onChange={(e) => setF({ ...f, feedback: e.target.value })} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="es-pa">Prossime azioni</Label><Input id="es-pa" value={f.prossime} onChange={(e) => setF({ ...f, prossime: e.target.value })} placeholder="Seconda visita con la moglie, proposta…" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={salva.isPending}>Registra</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Trattative: proposte, preliminari, rogiti ───────────────────────────
export function TrattativePage() {
  return <ConAgenzia><Trattative_ /></ConAgenzia>
}

function Trattative_() {
  useDalVivo(['imm_proposte'])
  const [params, setParams] = useSearchParams()
  const scheda = params.get('scheda') ?? 'proposte'
  const filtroImm = params.get('immobile') ?? undefined
  const { data: proposte = [], isLoading } = useElenco<Proposta & { contatti: ContattoBreve | null; imm_immobili: ImmBreve | null }>('imm_proposte', {
    select: '*, contatti(id, nome, cognome, email, telefono), imm_immobili(codice, indirizzo, comune)', filtri: { immobile_id: filtroImm }, ordine: [{ colonna: 'created_at', crescente: false }], limite: 300 })
  const { data: chiusure = [] } = useElenco<Chiusura & { contatti: ContattoBreve | null; imm_immobili: ImmBreve | null }>('imm_chiusure', {
    select: '*, contatti(id, nome, cognome, email, telefono), imm_immobili(codice, indirizzo, comune)', ordine: [{ colonna: 'created_at', crescente: false }] })
  const [nuova, setNuova] = useState<{ padre?: Proposta } | null>(params.get('immobile') && scheda === 'proposte' ? {} : null)
  const [chiusura, setChiusura] = useState<Proposta | null>(null)
  const salva = useSalva('imm_proposte', TABELLE_COMMERCIALI)
  const cambia = (p: Proposta, stato: string, ok: string) => salva.mutate({ id: p.id, values: { stato } }, { onSuccess: () => toast.success(ok), onError: errore })
  // Le catene: una proposta e le sue risposte, dalla prima.
  const radici = proposte.filter((p) => !p.padre_id)
  const catena = (p: Proposta): Proposta[] => { const figlia = proposte.find((x) => x.padre_id === p.id); return figlia ? [p, ...catena(figlia)] : [p] }
  return (
    <div>
      <PageHeader title="Trattative" description="Proposte e controproposte con lo storico, accettazione, preliminare e rogito; il post-vendita dopo la firma."
        numeri={[
          { etichetta: 'proposte in attesa', valore: isLoading ? undefined : proposte.filter((p) => p.stato === 'in_attesa').length, inCaricamento: isLoading },
          { etichetta: 'accettate', valore: isLoading ? undefined : proposte.filter((p) => p.stato === 'accettata').length, inCaricamento: isLoading },
          { etichetta: 'preliminari', valore: chiusure.filter((c) => c.stato === 'preliminare').length },
          { etichetta: 'rogiti', valore: chiusure.filter((c) => c.stato === 'rogitato').length },
        ]}
        actions={<BottoneScrittura onClick={() => setNuova({})}><Plus className="h-4 w-4" /> Nuova proposta</BottoneScrittura>} />
      <Tabs value={scheda} onValueChange={(v) => setParams({ scheda: v })}>
        <TabsList className="mb-4"><TabsTrigger value="proposte">Proposte</TabsTrigger><TabsTrigger value="chiusure">Preliminari e rogiti</TabsTrigger><TabsTrigger value="pipeline">Pipeline</TabsTrigger></TabsList>
        <TabsContent value="proposte">
          {filtroImm && <p className="mb-3 text-sm text-muted-foreground">Solo l'immobile scelto · <button type="button" className="underline underline-offset-2" onClick={() => setParams({ scheda: 'proposte' })}>tutte</button></p>}
          {isLoading ? <Skeleton className="h-64" /> : radici.length === 0 ? (
            <EmptyState icon={Handshake} title="Nessuna proposta" description="Le proposte dei clienti con prezzo, caparra, condizioni e scadenza; le controproposte del proprietario restano nello storico."
              action={<BottoneScrittura variant="outline" onClick={() => setNuova({})}>Nuova proposta</BottoneScrittura>} />
          ) : (
            <ul className="space-y-3">{radici.map((r) => {
              const c = catena(r)
              const ultima = c[c.length - 1]
              return (
                <li key={r.id}><Card className="p-4">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div><p className="text-title text-foreground">{nomeContatto(r.contatti)} · {r.tipo === 'acquisto' ? 'acquisto' : 'locazione'}</p>
                      <p className="text-sm text-muted-foreground">{r.imm_immobili ? <Link to={`/immobiliare/immobili/${r.immobile_id}`} className="hover:text-primary-testo">{etichettaImmobile(r.imm_immobili)}</Link> : ''}
                        {` · richiesto ${fmtEuro(r.prezzo_richiesto, 0)}`}</p></div>
                    <Badge tone={PROPOSTA_STATO[ultima.stato].tone}>{PROPOSTA_STATO[ultima.stato].label}</Badge>
                  </div>
                  <ol className="space-y-1.5 rounded-md bg-muted/50 p-3 text-sm">{c.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-2"><span className="font-medium text-foreground">{p.da === 'cliente' ? 'Cliente' : 'Proprietario'}: {fmtEuro(p.prezzo_offerto, 0)}</span>
                      <span className="text-muted-foreground">{p.codice} · {fmtData(p.created_at)}{p.scadenza ? ` · scade il ${fmtData(p.scadenza)}` : ''}{Number(p.caparra) > 0 ? ` · caparra ${fmtEuro(p.caparra, 0)}` : ''}
                        {p.mutuo ? ` · con mutuo${p.importo_mutuo ? ` di ${fmtEuro(p.importo_mutuo, 0)}` : ''}` : ''}</span>
                      {(p.condizioni || p.condizioni_sospensive) && <span className="w-full text-xs text-muted-foreground">{[p.condizioni, p.condizioni_sospensive && `Sospensive: ${p.condizioni_sospensive}`].filter(Boolean).join(' · ')}</span>}
                    </li>))}</ol>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {ultima.stato === 'in_attesa' && <>
                      <Button size="sm" variant="ghost" onClick={() => cambia(ultima, 'rifiutata', 'Proposta rifiutata')}>Rifiuta</Button>
                      <Button size="sm" variant="ghost" onClick={() => cambia(ultima, 'ritirata', 'Proposta ritirata')}>Ritirata</Button>
                      <Button size="sm" variant="outline" onClick={() => setNuova({ padre: ultima })}>Controproposta</Button>
                      <BottoneScrittura size="sm" onClick={() => cambia(ultima, 'accettata', 'Accettata: l\'immobile è sotto offerta')}>Accettata</BottoneScrittura></>}
                    {ultima.stato === 'accettata' && ultima.tipo === 'acquisto' && !chiusure.some((x) => x.proposta_id === ultima.id) &&
                      <BottoneScrittura size="sm" onClick={() => setChiusura(ultima)}>Registra il preliminare</BottoneScrittura>}
                    {ultima.stato === 'accettata' && ultima.tipo === 'locazione' &&
                      <Button asChild size="sm"><Link to={`/immobiliare/locazioni?proposta=${ultima.id}`}>Registra la locazione</Link></Button>}
                    <Button asChild size="sm" variant="ghost"><Link to={`/immobiliare/contratti?immobile=${r.immobile_id}&proposta=${ultima.id}`}>Documento</Link></Button>
                  </div>
                </Card></li>
              )
            })}</ul>
          )}
        </TabsContent>
        <TabsContent value="chiusure"><Chiusure righe={chiusure} /></TabsContent>
        <TabsContent value="pipeline"><Pipeline /></TabsContent>
      </Tabs>
      {nuova && <PropostaDialog padre={nuova.padre ?? null} immobile={filtroImm ?? null} onClose={() => setNuova(null)} />}
      {chiusura && <PreliminareDialog proposta={chiusura} onClose={() => setChiusura(null)} />}
    </div>
  )
}

function PropostaDialog({ padre, immobile, onClose }: { padre: Proposta | null; immobile: string | null; onClose: () => void }) {
  const salva = useSalva('imm_proposte', TABELLE_COMMERCIALI)
  const [cliente, setCliente] = useState<Cliente>(clienteVuoto)
  const [f, setF] = useState({ immobile: padre?.immobile_id ?? immobile ?? '', tipo: padre?.tipo ?? 'acquisto', prezzo: '', caparra: '', condizioni: '', sospensive: '', mutuo: false,
    importoMutuo: '', scadenza: piuGiorni(oggiIso(), 7) })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  async function registra(e: FormEvent) {
    e.preventDefault()
    if (!f.immobile) { toast.error('Scegli l\'immobile'); return }
    if (!numero(f.prezzo)) { toast.error('Indica il prezzo'); return }
    try {
      const contatto_id = padre?.contatto_id ?? await assicuraContatto(cliente)
      await salva.mutateAsync({ values: { immobile_id: f.immobile, contatto_id, padre_id: padre?.id ?? null, tipo: f.tipo, prezzo_offerto: numero(f.prezzo), caparra: numero(f.caparra),
        condizioni: f.condizioni.trim() || null, condizioni_sospensive: f.sospensive.trim() || null, mutuo: f.mutuo, importo_mutuo: numeroONull(f.importoMutuo), scadenza: f.scadenza || null } })
      toast.success(padre ? 'Controproposta registrata: lo storico resta' : 'Proposta registrata: l\'agente è avvisato')
      onClose()
    } catch (err) { errore(err) }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{padre ? `Risposta a ${padre.codice}` : 'Nuova proposta'}</DialogTitle>
          <DialogDescription>{padre ? `La proposta di ${fmtEuro(padre.prezzo_offerto, 0)} diventa «controproposta»; questa è la risposta ${padre.da === 'cliente' ? 'del proprietario' : 'del cliente'}.`
            : 'Una proposta scritta del cliente, con le sue condizioni e la scadenza.'}</DialogDescription></DialogHeader>
        <form onSubmit={registra} className="grid grid-cols-6 gap-3">
          {!padre && <>
            <CampoImmobile id="pp-imm" valore={f.immobile} onChange={(v) => setF({ ...f, immobile: v })} stati={['disponibile', 'sotto_offerta']} />
            <CampoCliente id="pp-cli" etichetta="Chi propone" valore={cliente} onChange={setCliente} />
            <div className="col-span-3 space-y-1.5"><Label htmlFor="pp-tipo">Tipo</Label>
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="pp-tipo"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="acquisto">Acquisto</SelectItem><SelectItem value="locazione">Locazione</SelectItem></SelectContent></Select></div>
          </>}
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pp-pr">{f.tipo === 'locazione' ? 'Canone mensile (€)' : 'Prezzo (€)'} *</Label><Input id="pp-pr" inputMode="decimal" value={f.prezzo} onChange={set('prezzo')} required /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pp-cap">Caparra (€)</Label><Input id="pp-cap" inputMode="decimal" value={f.caparra} onChange={set('caparra')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pp-sc">Valida fino al</Label><Input id="pp-sc" type="date" value={f.scadenza} onChange={set('scadenza')} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="pp-cond">Condizioni</Label><Input id="pp-cond" value={f.condizioni} onChange={set('condizioni')} placeholder="Rogito entro…, arredi inclusi…" /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="pp-sos">Condizioni sospensive</Label><Input id="pp-sos" value={f.sospensive} onChange={set('sospensive')} placeholder="Concessione del mutuo, vendita della casa attuale…" /></div>
          <label className="col-span-3 flex items-end gap-2 pb-2 text-sm text-foreground"><Checkbox checked={f.mutuo} onCheckedChange={(v) => setF({ ...f, mutuo: v === true })} /> Con mutuo</label>
          {f.mutuo && <div className="col-span-3 space-y-1.5"><Label htmlFor="pp-mut">Importo del mutuo (€)</Label><Input id="pp-mut" inputMode="decimal" value={f.importoMutuo} onChange={set('importoMutuo')} /></div>}
          <DialogFooter className="col-span-6"><Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={salva.isPending || (!padre && !cliente.testo.trim())}>{padre ? 'Registra la risposta' : 'Registra la proposta'}</BottoneScrittura></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PreliminareDialog({ proposta: p, onClose }: { proposta: Proposta; onClose: () => void }) {
  const salva = useSalva('imm_chiusure', TABELLE_COMMERCIALI)
  const { data: notai = [] } = useElenco<Collaboratore>('imm_collaboratori', { filtri: { tipo: 'notaio', attivo: true }, ordine: [{ colonna: 'nome' }] })
  const [f, setF] = useState({ data: oggiIso(), caparra: campoNumero(p.caparra), rogito: piuGiorni(oggiIso(), 60), notaio: 'nessuno' })
  const registra = () => salva.mutate({ values: { immobile_id: p.immobile_id, proposta_id: p.id, contatto_id: p.contatto_id, prezzo: p.prezzo_offerto, preliminare_il: f.data,
    caparra_versata: numero(f.caparra), rogito_previsto: f.rogito || null, notaio_id: f.notaio === 'nessuno' ? null : f.notaio } }, {
    onSuccess: () => { toast.success('Preliminare registrato: il rogito è in agenda'); onClose() }, onError: errore })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Preliminare · {fmtEuro(p.prezzo_offerto, 0)}</DialogTitle><DialogDescription>Il rogito previsto va tra le scadenze e nell'agenda.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pl-d">Firmato il</Label><Input id="pl-d" type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pl-c">Caparra versata (€)</Label><Input id="pl-c" inputMode="decimal" value={f.caparra} onChange={(e) => setF({ ...f, caparra: e.target.value })} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pl-r">Rogito entro il</Label><Input id="pl-r" type="date" value={f.rogito} onChange={(e) => setF({ ...f, rogito: e.target.value })} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pl-n">Notaio</Label>
            <Select value={f.notaio} onValueChange={(v) => setF({ ...f, notaio: v })}><SelectTrigger id="pl-n"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">Da scegliere</SelectItem>{notai.map((n) => <SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={salva.isPending}>Registra il preliminare</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Chiusure({ righe }: { righe: (Chiusura & { contatti: ContattoBreve | null; imm_immobili: ImmBreve | null })[] }) {
  const salva = useSalva('imm_chiusure', TABELLE_COMMERCIALI)
  const [post, setPost] = useState<Chiusura | null>(null)
  if (righe.length === 0) return <EmptyState icon={KeyRound} filtrato title="Nessun preliminare" description="Dopo una proposta accettata si registra il preliminare; al rogito l'immobile risulta venduto e nascono le provvigioni." />
  return (
    <>
      <Card className="overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>Immobile</TableHead><TableHead>Acquirente</TableHead><TableHead numerica>Prezzo</TableHead><TableHead>Preliminare</TableHead><TableHead>Rogito</TableHead>
          <TableHead>Stato</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
        <TableBody>{righe.map((c) => (
          <TableRow key={c.id}>
            <TableCell>{c.imm_immobili ? <Link to={`/immobiliare/immobili/${c.immobile_id}`} className="text-foreground hover:text-primary-testo">{etichettaImmobile(c.imm_immobili)}</Link> : ''}
              <span className="block text-xs text-muted-foreground">{c.codice}</span></TableCell>
            <TableCell>{nomeContatto(c.contatti)}</TableCell>
            <TableCell numerica>{fmtEuro(c.prezzo, 0)}<span className="block text-xs text-muted-foreground">caparra {fmtEuro(c.caparra_versata, 0)}</span></TableCell>
            <TableCell>{fmtData(c.preliminare_il)}</TableCell>
            <TableCell>{c.rogito_il ? fmtData(c.rogito_il) : c.rogito_previsto ? `entro il ${fmtData(c.rogito_previsto)}` : '—'}</TableCell>
            <TableCell><Badge tone={CHIUSURA_STATO[c.stato].tone}>{CHIUSURA_STATO[c.stato].label}</Badge></TableCell>
            <TableCell className="whitespace-nowrap text-right">
              {c.stato === 'preliminare' && <>
                <BottoneScrittura size="sm" onClick={() => salva.mutate({ id: c.id, values: { stato: 'rogitato' } }, { onSuccess: () => toast.success('Rogito fatto: immobile venduto, provvigioni maturate'), onError: errore })}>Rogito fatto</BottoneScrittura>
                <Button size="sm" variant="ghost" onClick={() => { if (window.confirm('La trattativa è saltata? L\'immobile torna disponibile.')) salva.mutate({ id: c.id, values: { stato: 'saltato' } }, { onSuccess: () => toast.success('Segnata come saltata'), onError: errore }) }}>Saltata</Button></>}
              {c.stato === 'rogitato' && <Button size="sm" variant="outline" onClick={() => setPost(c)}>Post-vendita</Button>}
            </TableCell>
          </TableRow>))}</TableBody>
      </Table></Card>
      <p className="mt-3 text-xs text-muted-foreground">Il rogito vuole l'adeguata verifica antiriciclaggio dell'acquirente, da registrare in «Compliance».</p>
      {post && <PostVenditaDialog key={post.id} chiusura={post} onClose={() => setPost(null)} />}
    </>
  )
}

function PostVenditaDialog({ chiusura: c, onClose }: { chiusura: Chiusura; onClose: () => void }) {
  const salva = useSalva('imm_chiusure')
  const [f, setF] = useState({ chiavi: c.consegna_chiavi_il ?? '', documenti: c.documentazione_finale, soddisfazione: c.soddisfazione ? String(c.soddisfazione) : 'nessuna',
    recensione: c.recensione_richiesta_il ?? '', referral: c.referral ?? '', note: c.note ?? '' })
  const registra = () => salva.mutate({ id: c.id, values: { consegna_chiavi_il: f.chiavi || null, documentazione_finale: f.documenti,
    soddisfazione: f.soddisfazione === 'nessuna' ? null : Number(f.soddisfazione), recensione_richiesta_il: f.recensione || null, referral: f.referral.trim() || null, note: f.note.trim() || null } }, {
    onSuccess: () => { toast.success('Post-vendita aggiornato'); onClose() }, onError: errore })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Post-vendita · {c.codice}</DialogTitle><DialogDescription>Il seguito con il cliente fra sei mesi è già in agenda.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pv-ch">Chiavi consegnate il</Label><Input id="pv-ch" type="date" value={f.chiavi} onChange={(e) => setF({ ...f, chiavi: e.target.value })} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pv-so">Soddisfazione</Label>
            <Select value={f.soddisfazione} onValueChange={(v) => setF({ ...f, soddisfazione: v })}><SelectTrigger id="pv-so"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuna">Non chiesta</SelectItem>{[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} su 5</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pv-rec">Recensione chiesta il</Label><Input id="pv-rec" type="date" value={f.recensione} onChange={(e) => setF({ ...f, recensione: e.target.value })} /></div>
          <label className="col-span-3 flex items-end gap-2 pb-2 text-sm text-foreground"><Checkbox checked={f.documenti} onCheckedChange={(v) => setF({ ...f, documenti: v === true })} /> Documentazione finale consegnata</label>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="pv-ref">Segnalazioni (referral)</Label><Input id="pv-ref" value={f.referral} onChange={(e) => setF({ ...f, referral: e.target.value })} placeholder="Chi ci ha segnalato o ci ha presentato" /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="pv-note">Note</Label><Input id="pv-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={salva.isPending}>Salva</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type Deal = Tables<'deals'> & { contatti: ContattoBreve | null; organizzazioni: { ragione_sociale: string } | null; imm_immobili: ImmBreve | null }
type Fase = Tables<'pipeline_stages'>

function Pipeline() {
  const [nome, setNome] = useState<'Acquisizione' | 'Trattative'>('Trattative')
  const { data: pipeline } = useRpc<string>('imm_pipeline', { p_nome: nome })
  const { data: fasi = [] } = useElenco<Fase>('pipeline_stages', { filtri: { pipeline_id: pipeline }, ordine: [{ colonna: 'ordine' }], abilitato: !!pipeline })
  const { data: deals = [], isLoading } = useElenco<Deal>('deals', { filtri: { pipeline_id: pipeline, attivo: true },
    select: '*, contatti(id, nome, cognome, email, telefono), organizzazioni(ragione_sociale), imm_immobili(codice, indirizzo, comune)', limite: 300, abilitato: !!pipeline })
  const salva = useSalva('deals')
  const [persa, setPersa] = useState<Deal | null>(null)
  const [motivo, setMotivo] = useState('')
  const aperte = fasi.filter((f) => !f.is_won && !f.is_lost)
  const sposta = (d: Deal, fase: string) => {
    if (fasi.find((f) => f.id === fase)?.is_lost) { setPersa(d); setMotivo(''); return }
    salva.mutate({ id: d.id, values: { stage_id: fase } }, { onError: errore })
  }
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Pipeline">
        {(['Trattative', 'Acquisizione'] as const).map((n) => <Button key={n} size="sm" variant={nome === n ? 'default' : 'outline'} aria-pressed={nome === n} onClick={() => setNome(n)}>
          {n === 'Trattative' ? 'Trattative con i clienti' : 'Acquisizione degli immobili'}</Button>)}
        <span className="text-sm text-muted-foreground">Le fasi avanzano da sole con visite, proposte, incarichi e rogiti; qui si spostano a mano.</span>
      </div>
      {isLoading ? <Skeleton className="h-64" /> : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 2xl:grid-cols-4">{aperte.map((f) => {
          const qui = deals.filter((d) => d.stage_id === f.id && !d.chiuso_at)
          return (
            <section key={f.id} aria-label={f.nome} className="rounded-lg border border-border bg-muted/30 p-2">
              <h3 className="mb-2 flex items-center justify-between px-1 text-label uppercase text-muted-foreground">{f.nome}<span className="tabular-nums">{qui.length}</span></h3>
              <ul className="space-y-2">{qui.map((d) => (
                <li key={d.id} className="rounded-md border border-border bg-card p-2.5 text-sm">
                  <p className="font-medium text-foreground">{d.contatti ? nomeContatto(d.contatti) : d.organizzazioni?.ragione_sociale ?? d.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">{d.imm_immobili ? etichettaImmobile(d.imm_immobili) : 'Senza immobile'}{Number(d.importo) > 0 ? ` · ${fmtEuro(d.importo, 0)}` : ''}</p>
                  <Select value={d.stage_id} onValueChange={(v) => sposta(d, v)}>
                    <SelectTrigger className="mt-2 h-8 text-xs" aria-label={`Fase di ${d.nome}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{fasi.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </li>))}</ul>
            </section>
          )
        })}</div>
      )}
      <Dialog open={!!persa} onOpenChange={(o) => !o && setPersa(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Trattativa persa</DialogTitle><DialogDescription>Il motivo resta nel CRM e negli indicatori.</DialogDescription></DialogHeader>
          <div className="space-y-1.5"><Label htmlFor="tp-mot">Motivo</Label><Input id="tp-mot" value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus /></div>
          <DialogFooter><Button variant="outline" onClick={() => setPersa(null)}>Annulla</Button>
            <BottoneScrittura disabled={!motivo.trim()} onClick={() => persa && salva.mutate({ id: persa.id, values: { stage_id: fasi.find((f) => f.is_lost)!.id, motivo_perdita: motivo.trim() } }, {
              onSuccess: () => { toast.success('Trattativa chiusa'); setPersa(null) }, onError: errore })}>Segna persa</BottoneScrittura></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Locazioni ───────────────────────────────────────────────────────────
export function LocazioniPage() {
  return <ConAgenzia><Locazioni_ /></ConAgenzia>
}

function Locazioni_() {
  const [params] = useSearchParams()
  const { data: locazioni = [], isLoading } = useElenco<Locazione & { contatti: ContattoBreve | null; imm_immobili: ImmBreve | null }>('imm_locazioni', {
    select: '*, contatti(id, nome, cognome, email, telefono), imm_immobili(codice, indirizzo, comune)', ordine: [{ colonna: 'inizio', crescente: false }] })
  const { data: canoni = [] } = useElenco<Canone>('imm_canoni', { ordine: [{ colonna: 'dal' }] })
  const [nuova, setNuova] = useState(!!params.get('proposta'))
  const [istat, setIstat] = useState<Locazione | null>(null)
  const salva = useSalva('imm_locazioni', TABELLE_COMMERCIALI)
  const attive = locazioni.filter((l) => l.stato === 'attiva')
  const oggi = oggiIso()
  return (
    <div>
      <PageHeader title="Locazioni" description="Contratti in corso: canone, deposito, garanzie, durata, rinnovi e adeguamento ISTAT."
        numeri={[
          { etichetta: 'in corso', valore: isLoading ? undefined : attive.length, inCaricamento: isLoading },
          { etichetta: 'canoni al mese', valore: isLoading ? undefined : fmtEuro(attive.reduce((s, l) => s + Number(l.canone ?? 0), 0), 0), inCaricamento: isLoading },
          { etichetta: 'ISTAT da fare', valore: isLoading ? undefined : attive.filter((l) => l.istat && l.prossimo_adeguamento && l.prossimo_adeguamento <= oggi).length, inCaricamento: isLoading },
        ]}
        actions={<BottoneScrittura onClick={() => setNuova(true)}><Plus className="h-4 w-4" /> Nuova locazione</BottoneScrittura>} />
      {isLoading ? <Skeleton className="h-64" /> : locazioni.length === 0 ? (
        <EmptyState icon={KeyRound} title="Nessuna locazione" description="Chiusa una locazione, l'immobile risulta affittato e nascono le provvigioni dei due lati."
          action={<BottoneScrittura variant="outline" onClick={() => setNuova(true)}>Nuova locazione</BottoneScrittura>} />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Immobile</TableHead><TableHead>Conduttore</TableHead><TableHead>Contratto</TableHead><TableHead numerica>Canone</TableHead><TableHead>Prossimo ISTAT</TableHead>
            <TableHead>Stato</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>{locazioni.map((l) => {
            const storico = canoni.filter((c) => c.locazione_id === l.id)
            return (
              <TableRow key={l.id}>
                <TableCell>{l.imm_immobili ? <Link to={`/immobiliare/immobili/${l.immobile_id}`} className="text-foreground hover:text-primary-testo">{etichettaImmobile(l.imm_immobili)}</Link> : ''}
                  <span className="block text-xs text-muted-foreground">{l.codice}</span></TableCell>
                <TableCell>{nomeContatto(l.contatti)}<span className="block text-xs text-muted-foreground">{l.garanzie ?? ''}</span></TableCell>
                <TableCell className="text-sm">{TIPO_LOCAZIONE[l.tipo_contratto]}<span className="block text-xs text-muted-foreground">{fmtData(l.inizio)} – {fmtData(l.fine)}{l.rinnovo_tacito ? ' · rinnovo tacito' : ''}</span></TableCell>
                <TableCell numerica>{fmtEuro(l.canone)}<span className="block text-xs text-muted-foreground">{storico.length > 1 ? `da ${fmtEuro(l.canone_iniziale)}` : `deposito ${fmtEuro(l.deposito, 0)}`}</span></TableCell>
                <TableCell className={cn(l.prossimo_adeguamento && l.prossimo_adeguamento <= oggi && 'text-warning-testo')}>{l.istat ? fmtData(l.prossimo_adeguamento) : 'Senza ISTAT'}</TableCell>
                <TableCell><Badge tone={LOCAZIONE_STATO[l.stato].tone}>{LOCAZIONE_STATO[l.stato].label}</Badge></TableCell>
                <TableCell className="whitespace-nowrap text-right">{l.stato === 'attiva' && <>
                  {l.istat && <BottoneScrittura size="sm" variant="outline" onClick={() => setIstat(l)}>Adegua ISTAT</BottoneScrittura>}
                  <Button size="sm" variant="ghost" onClick={() => { if (window.confirm('Registrare la disdetta?')) salva.mutate({ id: l.id, values: { stato: 'disdetta' } }, { onSuccess: () => toast.success('Disdetta registrata'), onError: errore }) }}>Disdetta</Button></>}
                </TableCell>
              </TableRow>
            )
          })}</TableBody>
        </Table></Card>
      )}
      {nuova && <LocazioneDialog proposta={params.get('proposta')} onClose={() => setNuova(false)} />}
      {istat && <IstatDialog locazione={istat} onClose={() => setIstat(null)} />}
    </div>
  )
}

function LocazioneDialog({ proposta, onClose }: { proposta: string | null; onClose: () => void }) {
  const salva = useSalva('imm_locazioni', TABELLE_COMMERCIALI)
  const { data: prop = [] } = useElenco<Proposta & { contatti: ContattoBreve | null }>('imm_proposte', { filtri: { id: proposta ?? undefined }, select: '*, contatti(id, nome, cognome, email, telefono)', abilitato: !!proposta })
  const p = prop[0]
  const immobili = useImmobiliBrevi({ stato: ['disponibile', 'sotto_offerta'] }).filter((i) => i.contratto !== 'vendita')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [f0] = useState({ immobile: '', tipo: '4+4', canone: '', deposito: '', inizio: oggiIso(), garanzie: '', istat: true, rinnovo: true })
  const [f, setF] = useState<typeof f0 | null>(null)
  const v = f ?? { ...f0, immobile: p?.immobile_id ?? '', canone: p ? campoNumero(p.prezzo_offerto) : '' }
  const c = cliente ?? (p?.contatti ? { testo: nomeContatto(p.contatti), id: p.contatto_id, telefono: '', email: '' } : clienteVuoto)
  const set = (k: keyof typeof f0) => (e: { target: { value: string } }) => setF({ ...v, [k]: e.target.value })
  async function registra(e: FormEvent) {
    e.preventDefault()
    if (!v.immobile) { toast.error('Scegli l\'immobile'); return }
    if (!numero(v.canone)) { toast.error('Indica il canone'); return }
    try {
      const conduttore_id = await assicuraContatto(c)
      await salva.mutateAsync({ values: { immobile_id: v.immobile, proposta_id: p?.id ?? null, conduttore_id, tipo_contratto: v.tipo, canone_iniziale: numero(v.canone), deposito: numero(v.deposito),
        inizio: v.inizio, garanzie: v.garanzie.trim() || null, istat: v.istat, rinnovo_tacito: v.rinnovo } })
      toast.success('Locazione registrata: immobile affittato, provvigioni maturate')
      onClose()
    } catch (err) { errore(err) }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuova locazione</DialogTitle><DialogDescription>Fine contratto e primo adeguamento ISTAT si calcolano dal tipo di contratto.</DialogDescription></DialogHeader>
        <form onSubmit={registra} className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5"><Label htmlFor="lo-imm">Immobile</Label>
            <Select value={v.immobile} onValueChange={(x) => setF({ ...v, immobile: x })}><SelectTrigger id="lo-imm"><SelectValue placeholder={immobili.length ? 'Scegli l\'immobile' : 'Nessun immobile in affitto sul mercato'} /></SelectTrigger>
              <SelectContent>{immobili.map((i) => <SelectItem key={i.id} value={i.id}>{etichettaImmobile(i)} · {fmtEuro(i.canone, 0)}</SelectItem>)}</SelectContent></Select></div>
          <CampoCliente id="lo-cli" etichetta="Conduttore" valore={c} onChange={setCliente} />
          <div className="col-span-3 space-y-1.5"><Label htmlFor="lo-tipo">Contratto</Label>
            <Select value={v.tipo} onValueChange={(x) => setF({ ...v, tipo: x })}><SelectTrigger id="lo-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TIPO_LOCAZIONE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="lo-in">Decorrenza</Label><Input id="lo-in" type="date" value={v.inizio} onChange={set('inizio')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="lo-can">Canone mensile (€) *</Label><Input id="lo-can" inputMode="decimal" value={v.canone} onChange={set('canone')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="lo-dep">Deposito cauzionale (€)</Label><Input id="lo-dep" inputMode="decimal" value={v.deposito} onChange={set('deposito')} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="lo-gar">Garanzie</Label><Input id="lo-gar" value={v.garanzie} onChange={set('garanzie')} placeholder="Fideiussione bancaria, garante…" /></div>
          <label className="col-span-3 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={v.istat} onCheckedChange={(x) => setF({ ...v, istat: x === true })} /> Adeguamento ISTAT</label>
          <label className="col-span-3 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={v.rinnovo} onCheckedChange={(x) => setF({ ...v, rinnovo: x === true })} /> Rinnovo tacito</label>
          <DialogFooter className="col-span-6"><Button type="button" variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura type="submit" disabled={salva.isPending || !c.testo.trim()}>Registra la locazione</BottoneScrittura></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function IstatDialog({ locazione: l, onClose }: { locazione: Locazione; onClose: () => void }) {
  const adegua = useAzione('imm_adegua_istat', ['imm_locazioni', 'imm_canoni', 'scadenze_moduli'])
  const [variazione, setVariazione] = useState('')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Adeguamento ISTAT · {l.codice}</DialogTitle>
          <DialogDescription>La variazione annua dell'indice FOI; il canone sale della quota prevista dalle regole dell'agenzia e il conduttore riceve l'avviso.</DialogDescription></DialogHeader>
        <div className="space-y-1.5"><Label htmlFor="is-var">Variazione FOI (%)</Label><Input id="is-var" inputMode="decimal" value={variazione} onChange={(e) => setVariazione(e.target.value)} placeholder="1,8" autoFocus /></div>
        <p className="text-sm text-muted-foreground">Canone attuale {fmtEuro(l.canone)}.</p>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button>
          <BottoneScrittura disabled={!variazione.trim() || adegua.isPending} onClick={() => adegua.mutate({ p_locazione: l.id, p_variazione: numero(variazione) }, {
            onSuccess: (x) => { toast.success(`Nuovo canone: ${fmtEuro(Number(x))} al mese`); onClose() }, onError: errore })}>Adegua</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Agenda ──────────────────────────────────────────────────────────────
export function AgendaImmobiliarePage() {
  return <ConAgenzia><Agenda_ /></ConAgenzia>
}

function Agenda_() {
  const { agenti, io } = useAgenti()
  const { isManager } = useAuth()
  const [dal, setDal] = useState(oggiIso())
  const [agente, setAgente] = useState<string>(io && !isManager ? io.agente_id! : 'tutti')
  const al = piuGiorni(dal, 13)
  const { data: voci = [], isLoading } = useRpc<VoceAgenda[]>('imm_agenda', { p_dal: dal, p_al: al, p_agente: agente === 'tutti' ? null : agente })
  const giorni = [...new Set(voci.map((v) => isoLocale(new Date(v.quando))))]
  return (
    <div>
      <PageHeader title="Agenda" description="Visite, appuntamenti, telefonate, sopralluoghi, rogiti e scadenze di incarichi, proposte e canoni."
        numeri={[{ etichetta: 'impegni in due settimane', valore: isLoading ? undefined : voci.length, inCaricamento: isLoading }]} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Due settimane prima" onClick={() => setDal(piuGiorni(dal, -14))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" aria-label="Due settimane dopo" onClick={() => setDal(piuGiorni(dal, 14))}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={() => setDal(oggiIso())}>Da oggi</Button>
        <Select value={agente} onValueChange={setAgente}><SelectTrigger className="w-48" aria-label="Agente"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="tutti">Tutti gli agenti</SelectItem>{agenti.map((a) => <SelectItem key={a.agente_id!} value={a.agente_id!}>{a.nome}</SelectItem>)}</SelectContent></Select>
        <span className="text-sm text-muted-foreground">{fmtData(dal)} – {fmtData(al)}</span>
      </div>
      {isLoading ? <Skeleton className="h-64" /> : voci.length === 0 ? (
        <EmptyState icon={CalendarDays} filtrato title="Agenda libera" description="Gli appuntamenti con i clienti si creano come attività dal CRM, collegate all'immobile." />
      ) : giorni.map((g) => (
        <section key={g} className="mb-5" aria-label={fmtData(g)}>
          <h2 className={cn('mb-2 text-label uppercase', g === oggiIso() ? 'text-primary-testo' : 'text-muted-foreground')}>
            {new Date(`${g}T12:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          <Card className="divide-y divide-border">{voci.filter((v) => isoLocale(new Date(v.quando)) === g).map((v, k) => {
            const t = AGENDA_TIPO[v.tipo] ?? AGENDA_TIPO.attivita
            return (
              <Link key={`${v.riferimento}-${k}`} to={v.percorso} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50">
                <span className="w-12 tabular-nums text-muted-foreground">{fmtOra(v.quando)}</span><Badge tone={t.tone}>{t.label}</Badge>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium text-foreground">{v.titolo}</span><span className="block truncate text-xs text-muted-foreground">{v.dettaglio}</span></span>
              </Link>
            )
          })}</Card>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">{fmtNumero(voci.filter((v) => v.tipo === 'visita').length)} visite nel periodo. Telefonate e seguiti nascono da soli dopo visite e rogiti.</p>
    </div>
  )
}
