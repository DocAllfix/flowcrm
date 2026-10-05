/**
 * La gestione dell'agenzia: provvigioni e ripartizioni (§19, §27),
 * contratti da modello con approvazione e firma (§18), agenti con
 * classifica e obiettivi e rete dei collaboratori (§20, §27), marketing con
 * il ROI e il feed per i portali (§10, §22), antiriciclaggio e privacy
 * (§29), regole dell'agenzia, analisi della direzione (§25).
 */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, FileSignature, Megaphone, Pencil, Plus, Printer, ShieldCheck, Trash2, Users, Wallet } from 'lucide-react'
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
import { ManagerOnly } from '@/components/ManagerOnly'
import { FotoDialog } from '@/components/condivisi/FotoDialog'
import { ApprovalSection } from '@/components/ApprovalSection'
import { CampagneSezione } from '@/components/condivisi/CampagneSezione'
import { FeedbackSezione } from '@/components/condivisi/FeedbackSezione'
import { TurniSezione } from '@/components/condivisi/TurniSezione'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useElenco, useRpc, useSalva, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import { ConAgenzia } from '@/modules/immobiliare/componenti/ConAgenzia'
import { CampoCliente, CampoImmobile, assicuraContatto, clienteVuoto, type Cliente } from '@/modules/immobiliare/componenti/Scelte'
import { useAgenti, useImpostazioni, etichettaImmobile, type Aml, type Collaboratore, type ContattoBreve, type ContrattoDoc, type Immobile, type Marketing, type Modello,
  type Privacy, type Provvigione, type Ripartizione, type Utente } from '@/modules/immobiliare/queries'
import { CANALE_MKT, COLLABORATORE, CONTRATTO_STATO, DOCUMENTO_ID, LATO, MODELLO_TIPO, OBIETTIVO_MKT, PROVVIGIONE_STATO, RISCHIO, campoNumero, fmtData, fmtEuro,
  fmtNumero, intONull, nomeContatto, numero, numeroONull, oggiIso, piuGiorni } from '@/modules/immobiliare/stati'

const errore = (e: unknown) => toast.error(messaggioErrore(e))
type ImmBreve = Pick<Immobile, 'codice' | 'indirizzo' | 'comune'>

// ── Provvigioni ─────────────────────────────────────────────────────────
export function ProvvigioniPage() {
  return <ConAgenzia><Provvigioni_ /></ConAgenzia>
}

function Provvigioni_() {
  const { isManager } = useAuth()
  const { agenti } = useAgenti()
  const [vista, setVista] = useState('maturata')
  const { data: provv = [], isLoading } = useElenco<Provvigione & { contatti: ContattoBreve | null; imm_immobili: ImmBreve | null }>('imm_provvigioni', {
    select: '*, contatti(id, nome, cognome, email, telefono), imm_immobili(codice, indirizzo, comune)', ordine: [{ colonna: 'created_at', crescente: false }] })
  const { data: ripartizioni = [] } = useElenco<Ripartizione>('imm_ripartizioni')
  const { data: collaboratori = [] } = useElenco<Collaboratore>('imm_collaboratori')
  const salva = useSalva('imm_provvigioni')
  const [ripartisci, setRipartisci] = useState<Provvigione | null>(null)
  const [fattura, setFattura] = useState<Provvigione | null>(null)
  const visibili = provv.filter((p) => vista === 'tutte' || p.stato === vista)
  const tot = (s: string) => provv.filter((p) => p.stato === s).reduce((x, p) => x + Number(p.importo), 0)
  const chi = (r: Ripartizione) => r.beneficiario === 'agenzia' ? 'Agenzia' : r.beneficiario === 'agente' ? agenti.find((a) => a.agente_id === r.agente_id)?.nome ?? 'Agente'
    : collaboratori.find((c) => c.id === r.collaboratore_id)?.nome ?? 'Collaboratore'
  return (
    <div>
      <PageHeader title="Provvigioni" description={isManager ? 'Provvigioni maturate a ogni rogito e locazione, con la ripartizione tra agenzia, agenti e collaboratori, la fattura e l\'incasso.'
        : 'Le provvigioni degli affari che segui, con la tua quota.'}
        numeri={[
          { etichetta: 'maturate', valore: isLoading ? undefined : fmtEuro(tot('maturata'), 0), inCaricamento: isLoading },
          { etichetta: 'fatturate', valore: isLoading ? undefined : fmtEuro(tot('fatturata'), 0), inCaricamento: isLoading },
          { etichetta: 'incassate', valore: isLoading ? undefined : fmtEuro(tot('incassata'), 0), inCaricamento: isLoading },
        ]} />
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtra">{[...Object.entries(PROVVIGIONE_STATO).map(([k, v]) => [k, v.label] as const), ['tutte', 'Tutte'] as const].map(([k, l]) => (
        <Button key={k} size="sm" variant={vista === k ? 'default' : 'outline'} aria-pressed={vista === k} onClick={() => setVista(k)}>{l}</Button>))}</div>
      {isLoading ? <Skeleton className="h-64" /> : visibili.length === 0 ? (
        <EmptyState icon={Wallet} filtrato title="Nessuna provvigione" description="Nascono da sole al rogito (lato venditore e acquirente) e alla locazione (locatore e conduttore)." />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Affare</TableHead><TableHead>Lato</TableHead><TableHead numerica>Importo</TableHead><TableHead>Ripartizione</TableHead><TableHead>Stato</TableHead>
            <TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>{visibili.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.imm_immobili ? <Link to={`/immobiliare/immobili/${p.immobile_id}`} className="text-foreground hover:text-primary-testo">{etichettaImmobile(p.imm_immobili)}</Link> : ''}
                <span className="block text-xs text-muted-foreground">{p.codice} · {fmtData(p.created_at)}</span></TableCell>
              <TableCell className="text-sm">{LATO[p.lato]}<span className="block text-xs text-muted-foreground">{nomeContatto(p.contatti)}</span></TableCell>
              <TableCell numerica>{fmtEuro(p.importo)}<span className="block text-xs text-muted-foreground">{p.fisso != null ? 'importo fisso' : `${fmtNumero(p.pct, 2)}% di ${fmtEuro(p.base, 0)}`}</span></TableCell>
              <TableCell className="text-xs">{ripartizioni.filter((r) => r.provvigione_id === p.id).map((r) => `${chi(r)} ${fmtNumero(r.pct, 2)}% (${fmtEuro(r.importo)})`).join(' · ')}</TableCell>
              <TableCell><Badge tone={PROVVIGIONE_STATO[p.stato].tone}>{PROVVIGIONE_STATO[p.stato].label}</Badge>{p.incassata_il && <span className="block text-xs text-muted-foreground">il {fmtData(p.incassata_il)}</span>}</TableCell>
              <TableCell className="whitespace-nowrap text-right">{isManager && <>
                {p.stato === 'maturata' && <><Button size="sm" variant="ghost" onClick={() => setRipartisci(p)}>Ripartisci</Button>
                  <BottoneScrittura size="sm" variant="outline" onClick={() => setFattura(p)}>Fattura</BottoneScrittura></>}
                {p.stato === 'fatturata' && <BottoneScrittura size="sm" variant="outline" onClick={() => salva.mutate({ id: p.id, values: { stato: 'incassata' } }, { onSuccess: () => toast.success('Segnata incassata'), onError: errore })}>Incassata</BottoneScrittura>}
                {p.fattura_id && <Button asChild size="sm" variant="ghost"><Link to={`/fatture/${p.fattura_id}`}>Fattura</Link></Button>}</>}
              </TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      {ripartisci && <RipartizioneDialog key={ripartisci.id} provvigione={ripartisci} attuali={ripartizioni.filter((r) => r.provvigione_id === ripartisci.id)} collaboratori={collaboratori} onClose={() => setRipartisci(null)} />}
      {fattura && <FatturaDialog provvigione={fattura} onClose={() => setFattura(null)} />}
    </div>
  )
}

type Riga = { beneficiario: string; chi: string; pct: string }

function RipartizioneDialog({ provvigione: p, attuali, collaboratori, onClose }: { provvigione: Provvigione; attuali: Ripartizione[]; collaboratori: Collaboratore[]; onClose: () => void }) {
  const { agenti } = useAgenti()
  const ripartisci = useAzione('imm_ripartisci', ['imm_ripartizioni', 'imm_provvigioni', 'imm_agenti_riepilogo'])
  const [righe, setRighe] = useState<Riga[]>(attuali.map((r) => ({ beneficiario: r.beneficiario, chi: r.agente_id ?? r.collaboratore_id ?? '', pct: campoNumero(r.pct) })))
  const totale = righe.reduce((s, r) => s + numero(r.pct), 0)
  const salva = () => ripartisci.mutate({ p_provvigione: p.id, p_righe: righe.map((r) => ({ beneficiario: r.beneficiario, pct: numero(r.pct),
    agente_id: r.beneficiario === 'agente' ? r.chi : null, collaboratore_id: r.beneficiario === 'collaboratore' ? r.chi : null })) }, {
    onSuccess: () => { toast.success('Ripartizione salvata'); onClose() }, onError: errore })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Ripartizione · {fmtEuro(p.importo)}</DialogTitle><DialogDescription>Agenzia, agenti e collaboratori (co-mediazione, segnalazione): le quote fanno 100%.</DialogDescription></DialogHeader>
        <div className="space-y-2">{righe.map((r, k) => (
          <div key={k} className="flex flex-wrap items-center gap-2">
            <Select value={r.beneficiario} onValueChange={(v) => setRighe(righe.map((x, j) => (j === k ? { ...x, beneficiario: v, chi: '' } : x)))}>
              <SelectTrigger className="w-36" aria-label="Beneficiario"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="agenzia">Agenzia</SelectItem><SelectItem value="agente">Agente</SelectItem><SelectItem value="collaboratore">Collaboratore</SelectItem></SelectContent></Select>
            {r.beneficiario !== 'agenzia' && <Select value={r.chi} onValueChange={(v) => setRighe(righe.map((x, j) => (j === k ? { ...x, chi: v } : x)))}>
              <SelectTrigger className="w-44" aria-label="Chi"><SelectValue placeholder="Scegli" /></SelectTrigger>
              <SelectContent>{(r.beneficiario === 'agente' ? agenti.map((a) => [a.agente_id!, a.nome ?? '']) : collaboratori.map((c) => [c.id, c.nome])).map(([id, n]) => <SelectItem key={id} value={id}>{n}</SelectItem>)}</SelectContent></Select>}
            <Input className="w-20" inputMode="decimal" aria-label="Percentuale" value={r.pct} onChange={(e) => setRighe(righe.map((x, j) => (j === k ? { ...x, pct: e.target.value } : x)))} />
            <span className="text-sm text-muted-foreground">% · {fmtEuro(Number(p.importo) * numero(r.pct) / 100)}</span>
            <Button variant="ghost" size="icon" aria-label="Togli" onClick={() => setRighe(righe.filter((_, j) => j !== k))}><Trash2 className="h-4 w-4" /></Button>
          </div>))}
          <Button variant="outline" size="sm" onClick={() => setRighe([...righe, { beneficiario: 'collaboratore', chi: '', pct: '' }])}><Plus className="h-3.5 w-3.5" /> Aggiungi</Button>
          <p className={totale === 100 ? 'text-sm text-muted-foreground' : 'text-sm text-warning-testo'} aria-live="polite">Totale {fmtNumero(totale, 2)}%</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button>
          <BottoneScrittura onClick={salva} disabled={totale !== 100 || righe.some((r) => r.beneficiario !== 'agenzia' && !r.chi) || ripartisci.isPending}>Salva</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FatturaDialog({ provvigione: p, onClose }: { provvigione: Provvigione; onClose: () => void }) {
  const fattura = useAzione('imm_fattura_provvigione', ['imm_provvigioni', 'fatture'])
  const [n, setN] = useState('')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Fattura della provvigione</DialogTitle><DialogDescription>{fmtEuro(p.importo)} più IVA, al cliente del lato {LATO[p.lato].toLowerCase()}. Va in Amministrazione.</DialogDescription></DialogHeader>
        <div className="space-y-1.5"><Label htmlFor="fp-n">Numero della fattura</Label><Input id="fp-n" value={n} onChange={(e) => setN(e.target.value)} placeholder="2026/45" autoFocus /></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button>
          <BottoneScrittura disabled={!n.trim() || fattura.isPending} onClick={() => fattura.mutate({ p_provvigione: p.id, p_numero: n.trim() }, { onSuccess: () => { toast.success('Fattura emessa'); onClose() }, onError: errore })}>Emetti</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Contratti ───────────────────────────────────────────────────────────
export function ContrattiImmobiliarePage() {
  return <ConAgenzia><Contratti_ /></ConAgenzia>
}

function Contratti_() {
  const { isManager } = useAuth()
  const [params] = useSearchParams()
  const { data: contratti = [], isLoading } = useElenco<ContrattoDoc & { imm_immobili: ImmBreve | null; contatti: ContattoBreve | null }>('imm_contratti', {
    select: '*, imm_immobili(codice, indirizzo, comune), contatti(id, nome, cognome, email, telefono)', ordine: [{ colonna: 'created_at', crescente: false }] })
  const salva = useSalva('imm_contratti', ['approvazioni'])
  const [nuovo, setNuovo] = useState(!!params.get('immobile'))
  const [aperto, setAperto] = useState<ContrattoDoc | null>(null)
  const cambia = (c: ContrattoDoc, stato: string, ok: string) => salva.mutate({ id: c.id, values: { stato } }, { onSuccess: () => toast.success(ok), onError: errore })
  return (
    <div>
      <PageHeader title="Contratti" description="Incarichi, proposte, contratti di locazione, preliminari e mandati dai modelli dell'agenzia: approvazione della direzione e firma."
        numeri={[
          { etichetta: 'in approvazione', valore: isLoading ? undefined : contratti.filter((c) => c.stato === 'in_approvazione').length, inCaricamento: isLoading },
          { etichetta: 'alla firma', valore: isLoading ? undefined : contratti.filter((c) => c.stato === 'inviato_firma').length, inCaricamento: isLoading },
          { etichetta: 'firmati', valore: isLoading ? undefined : contratti.filter((c) => c.stato === 'firmato').length, inCaricamento: isLoading },
        ]}
        actions={<BottoneScrittura onClick={() => setNuovo(true)}><Plus className="h-4 w-4" /> Nuovo da modello</BottoneScrittura>} />
      <Tabs defaultValue="contratti">
        <TabsList className="mb-4"><TabsTrigger value="contratti">Contratti</TabsTrigger><TabsTrigger value="modelli">Modelli</TabsTrigger></TabsList>
        <TabsContent value="contratti">
          {isLoading ? <Skeleton className="h-48" /> : contratti.length === 0 ? (
            <EmptyState icon={FileSignature} title="Nessun contratto" description="Dal modello si compila il testo con i dati dell'immobile, del cliente e dell'affare; poi approvazione e firma."
              action={<BottoneScrittura variant="outline" onClick={() => setNuovo(true)}>Nuovo da modello</BottoneScrittura>} />
          ) : (
            <Card className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Immobile</TableHead><TableHead>Cliente</TableHead><TableHead>Stato</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
              <TableBody>{contratti.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><button type="button" className="font-medium text-foreground hover:text-primary-testo" onClick={() => setAperto(c)}>{c.titolo}</button>
                    <span className="block text-xs text-muted-foreground">{MODELLO_TIPO[c.tipo] ?? c.tipo} · {fmtData(c.created_at)}</span></TableCell>
                  <TableCell className="text-sm">{c.imm_immobili ? etichettaImmobile(c.imm_immobili) : '—'}</TableCell>
                  <TableCell className="text-sm">{nomeContatto(c.contatti) || '—'}</TableCell>
                  <TableCell><Badge tone={CONTRATTO_STATO[c.stato].tone}>{CONTRATTO_STATO[c.stato].label}</Badge>{c.firmato_il && <span className="block text-xs text-muted-foreground">il {fmtData(c.firmato_il)}</span>}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {c.stato === 'bozza' && <BottoneScrittura size="sm" variant="outline" onClick={() => cambia(c, 'in_approvazione', 'Inviato alla direzione per l\'approvazione')}>Chiedi l'approvazione</BottoneScrittura>}
                    {c.stato === 'approvato' && <BottoneScrittura size="sm" variant="outline" onClick={() => cambia(c, 'inviato_firma', 'Alla firma')}>Inviato alla firma</BottoneScrittura>}
                    {c.stato === 'inviato_firma' && <BottoneScrittura size="sm" variant="outline" onClick={() => cambia(c, 'firmato', 'Contratto firmato')}>Firmato</BottoneScrittura>}
                    {c.stato === 'in_approvazione' && isManager && <Button size="sm" variant="ghost" onClick={() => setAperto(c)}>Decidi</Button>}
                    <FotoDialog entita="imm_contratti" entitaId={c.id} titolo={c.titolo} categorie={['copia firmata', 'documento']} />
                  </TableCell>
                </TableRow>))}</TableBody>
            </Table></Card>
          )}
          <p className="mt-3 text-xs text-muted-foreground">La firma elettronica è predisposta: oggi si stampa, si firma e si carica la copia firmata dalla riga.</p>
        </TabsContent>
        <TabsContent value="modelli"><Modelli /></TabsContent>
      </Tabs>
      {nuovo && <NuovoContrattoDialog immobile={params.get('immobile')} incarico={params.get('incarico')} proposta={params.get('proposta')} onClose={() => setNuovo(false)} />}
      {aperto && <ContrattoDialog key={aperto.id} contratto={aperto} onClose={() => setAperto(null)} />}
    </div>
  )
}

function NuovoContrattoDialog({ immobile, incarico, proposta, onClose }: { immobile: string | null; incarico: string | null; proposta: string | null; onClose: () => void }) {
  const { data: modelli = [] } = useElenco<Modello>('imm_modelli', { filtri: { attivo: true }, ordine: [{ colonna: 'nome' }] })
  const salva = useSalva('imm_contratti')
  const [f, setF] = useState({ modello: '', immobile: immobile ?? '' })
  const [cliente, setCliente] = useState<Cliente>(clienteVuoto)
  const [testo, setTesto] = useState<string | null>(null)
  const m = modelli.find((x) => x.id === f.modello)
  async function compila() {
    if (!f.modello || !f.immobile) { toast.error('Scegli il modello e l\'immobile'); return }
    try {
      const contatto = cliente.testo.trim() ? await assicuraContatto(cliente) : null
      if (contatto && !cliente.id) setCliente({ ...cliente, id: contatto })
      const { data, error } = await supabase.rpc('imm_compila', { p_modello: f.modello, p_immobile: f.immobile, p_contatto: contatto ?? undefined, p_incarico: incarico ?? undefined,
        p_proposta: proposta ?? undefined })
      if (error) throw error
      setTesto(data)
    } catch (e) { errore(e) }
  }
  const registra = () => salva.mutate({ values: { modello_id: f.modello, tipo: m!.tipo, titolo: m!.nome, immobile_id: f.immobile, contatto_id: cliente.id, incarico_id: incarico, proposta_id: proposta,
    testo: testo! } }, { onSuccess: () => { toast.success('Contratto in bozza'); onClose() }, onError: errore })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nuovo contratto da modello</DialogTitle><DialogDescription>Il testo si compila con i dati dell'archivio e si corregge prima di salvarlo.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5"><Label htmlFor="nc-mod">Modello</Label>
            <Select value={f.modello} onValueChange={(v) => { setF({ ...f, modello: v }); setTesto(null) }}><SelectTrigger id="nc-mod"><SelectValue placeholder="Scegli il modello" /></SelectTrigger>
              <SelectContent>{modelli.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent></Select></div>
          <CampoImmobile id="nc-imm" valore={f.immobile} onChange={(v) => { setF({ ...f, immobile: v }); setTesto(null) }} />
          <CampoCliente id="nc-cli" etichetta="Cliente (se serve)" valore={cliente} onChange={(c) => { setCliente(c); setTesto(null) }} recapiti={false} />
          {testo != null && <div className="col-span-6 space-y-1.5"><Label htmlFor="nc-testo">Testo</Label><Textarea id="nc-testo" rows={12} className="font-mono text-xs" value={testo} onChange={(e) => setTesto(e.target.value)} /></div>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button>
          {testo == null ? <Button onClick={compila} disabled={!f.modello || !f.immobile}>Compila</Button> : <BottoneScrittura onClick={registra} disabled={salva.isPending}>Salva la bozza</BottoneScrittura>}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ContrattoDialog({ contratto: c, onClose }: { contratto: ContrattoDoc; onClose: () => void }) {
  const salva = useSalva('imm_contratti')
  const [testo, setTesto] = useState(c.testo)
  const modificabile = ['bozza', 'in_approvazione'].includes(c.stato)
  const stampa = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.title = c.titolo
    const pre = w.document.createElement('pre')
    pre.style.cssText = 'font-family:Georgia,serif;white-space:pre-wrap;font-size:13px;line-height:1.6;max-width:720px;margin:40px auto'
    pre.textContent = testo
    w.document.body.appendChild(pre)
    w.print()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{c.titolo}</DialogTitle><DialogDescription>{CONTRATTO_STATO[c.stato].label}{modificabile ? '' : ': il testo approvato non si cambia'}</DialogDescription></DialogHeader>
        <Textarea rows={14} className="font-mono text-xs" value={testo} onChange={(e) => setTesto(e.target.value)} readOnly={!modificabile} aria-label="Testo del contratto" />
        {c.approvazione_id && <ApprovalSection modulo="immobiliare" entita="imm_contratti" entitaId={c.id} tipiRichiesta={[{ value: 'contratto', label: 'Approvazione del contratto' }]} azioneUrl="/immobiliare/contratti" />}
        <DialogFooter><Button variant="outline" onClick={stampa}><Printer className="h-4 w-4" /> Stampa</Button>
          {modificabile && <BottoneScrittura disabled={testo === c.testo || salva.isPending} onClick={() => salva.mutate({ id: c.id, values: { testo } }, { onSuccess: () => { toast.success('Testo salvato'); onClose() }, onError: errore })}>Salva</BottoneScrittura>}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Modelli() {
  const { isManager } = useAuth()
  const { data: modelli = [] } = useElenco<Modello>('imm_modelli', { ordine: [{ colonna: 'tipo' }, { colonna: 'nome' }] })
  const salva = useSalva('imm_modelli')
  const [aperto, setAperto] = useState<Modello | 'nuovo' | null>(null)
  const [f, setF] = useState({ nome: '', tipo: 'accordo', testo: '' })
  const apri = (m: Modello | 'nuovo') => { setAperto(m); setF(m === 'nuovo' ? { nome: '', tipo: 'accordo', testo: '' } : { nome: m.nome, tipo: m.tipo, testo: m.testo }) }
  return (
    <div className="space-y-3">
      {isManager && <div className="flex justify-end"><BottoneScrittura variant="outline" onClick={() => apri('nuovo')}><Plus className="h-4 w-4" /> Nuovo modello</BottoneScrittura></div>}
      <Card className="divide-y divide-border">{modelli.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"><span className="min-w-0 flex-1 font-medium text-foreground">{m.nome}<span className="block text-xs font-normal text-muted-foreground">{MODELLO_TIPO[m.tipo]}</span></span>
          {!m.attivo && <Badge tone="neutral">Non attivo</Badge>}
          {isManager && <Button size="sm" variant="ghost" onClick={() => apri(m)}><Pencil className="h-3.5 w-3.5" /> Modifica</Button>}</div>))}</Card>
      <p className="text-xs text-muted-foreground">Segnaposto: {'{{agenzia}} {{data}} {{immobile}} {{indirizzo}} {{comune}} {{prezzo}} {{proprietari}} {{cliente}} {{esclusiva}} {{scadenza}} {{provvigione}} {{offerta}} {{caparra}} {{canone}} {{deposito}} {{inizio}} {{fine}} {{rogito_previsto}}'}</p>
      <Dialog open={!!aperto} onOpenChange={(o) => !o && setAperto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{aperto === 'nuovo' ? 'Nuovo modello' : 'Modello'}</DialogTitle><DialogDescription>I segnaposto tra doppie graffe si riempiono con i dati del caso.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-4 space-y-1.5"><Label htmlFor="mo-nome">Nome</Label><Input id="mo-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="mo-tipo">Tipo</Label>
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="mo-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(MODELLO_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-6 space-y-1.5"><Label htmlFor="mo-testo">Testo</Label><Textarea id="mo-testo" rows={14} className="font-mono text-xs" value={f.testo} onChange={(e) => setF({ ...f, testo: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAperto(null)}>Annulla</Button>
            <BottoneScrittura disabled={!f.nome.trim() || !f.testo.trim()} onClick={() => salva.mutate({ id: aperto === 'nuovo' ? undefined : aperto?.id, values: { nome: f.nome.trim(), tipo: f.tipo, testo: f.testo } }, {
              onSuccess: () => { toast.success('Modello salvato'); setAperto(null) }, onError: errore })}>Salva</BottoneScrittura></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Agenti e rete ───────────────────────────────────────────────────────
export function AgentiPage() {
  return <ConAgenzia><Agenti_ /></ConAgenzia>
}

function Agenti_() {
  const { isManager } = useAuth()
  const { tutti } = useAgenti()
  const [scelto, setScelto] = useState<string | 'nuovo' | null>(null)
  const classifica = [...tutti].filter((a) => a.attivo).sort((a, b) => (b.vendite_mese ?? 0) + (b.locazioni_mese ?? 0) - (a.vendite_mese ?? 0) - (a.locazioni_mese ?? 0)
    || (b.acquisizioni_mese ?? 0) - (a.acquisizioni_mese ?? 0))
  return (
    <div>
      <PageHeader title="Agenti e rete" description="Portafoglio, clienti, visite, trattative, acquisizioni e chiusure di ogni agente, con gli obiettivi; i collaboratori esterni e i turni."
        numeri={[{ etichetta: 'agenti attivi', valore: classifica.length }]}
        actions={isManager ? <BottoneScrittura onClick={() => setScelto('nuovo')}><Plus className="h-4 w-4" /> Nuovo agente</BottoneScrittura> : undefined} />
      <Tabs defaultValue="agenti">
        <TabsList className="mb-4 flex-wrap"><TabsTrigger value="agenti">Classifica del mese</TabsTrigger><TabsTrigger value="rete">Collaboratori</TabsTrigger><TabsTrigger value="turni">Turni</TabsTrigger></TabsList>
        <TabsContent value="agenti">
          {classifica.length === 0 ? <EmptyState icon={Users} title="Nessun agente" description="Gli agenti sono gli utenti che seguono immobili e clienti."
            action={isManager ? <BottoneScrittura variant="outline" onClick={() => setScelto('nuovo')}>Nuovo agente</BottoneScrittura> : undefined} filtrato={!isManager} /> : (
            <Card className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Agente</TableHead><TableHead numerica>Portafoglio</TableHead><TableHead numerica>Clienti</TableHead><TableHead numerica>Lead</TableHead>
                <TableHead numerica>Visite</TableHead><TableHead numerica>Trattative</TableHead><TableHead numerica>Acquisizioni</TableHead><TableHead numerica>Vendite + locazioni</TableHead>
                <TableHead numerica>Provvigioni</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
              <TableBody>{classifica.map((a, k) => (
                <TableRow key={a.agente_id}>
                  <TableCell className="tabular-nums text-muted-foreground">{k + 1}</TableCell>
                  <TableCell className="font-medium text-foreground">{a.nome}{a.zone?.length ? <span className="block text-xs font-normal text-muted-foreground">{a.zone.join(', ')}</span> : null}</TableCell>
                  <TableCell numerica>{a.portafoglio}<span className="block text-xs text-muted-foreground">{fmtEuro(a.valore_portafoglio, 0)}</span></TableCell>
                  <TableCell numerica>{a.clienti}</TableCell><TableCell numerica>{a.lead_aperti}</TableCell><TableCell numerica>{a.visite_mese}</TableCell><TableCell numerica>{a.trattative}</TableCell>
                  <TableCell numerica>{a.acquisizioni_mese}{a.obiettivo_acquisizioni ? <span className="block text-xs text-muted-foreground">su {a.obiettivo_acquisizioni}</span> : null}</TableCell>
                  <TableCell numerica>{(a.vendite_mese ?? 0) + (a.locazioni_mese ?? 0)}{a.obiettivo_chiusure ? <span className="block text-xs text-muted-foreground">su {a.obiettivo_chiusure}</span> : null}</TableCell>
                  <TableCell numerica>{fmtEuro(a.provvigioni_mese, 0)}{a.obiettivo_provvigioni ? <span className="block text-xs text-muted-foreground">su {fmtEuro(a.obiettivo_provvigioni, 0)}</span> : null}</TableCell>
                  <TableCell className="text-right">{isManager && <Button size="sm" variant="ghost" aria-label={`Modifica ${a.nome}`} onClick={() => setScelto(a.agente_id!)}><Pencil className="h-3.5 w-3.5" /></Button>}</TableCell>
                </TableRow>))}</TableBody>
            </Table></Card>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Le provvigioni di ogni agente le vedono lui e la direzione.</p>
        </TabsContent>
        <TabsContent value="rete"><Collaboratori /></TabsContent>
        <TabsContent value="turni"><TurniSezione modulo="immobiliare" reparti={['agenzia', 'vendite', 'locazioni', 'acquisizioni', 'amministrazione', 'direzione']} /></TabsContent>
      </Tabs>
      {scelto && <AgenteDialog key={scelto} id={scelto === 'nuovo' ? null : scelto} onClose={() => setScelto(null)} />}
    </div>
  )
}

function AgenteDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: agenti = [] } = useElenco<import('@/modules/immobiliare/queries').Agente>('imm_agenti')
  const { data: utenti = [] } = useElenco<Utente>('user_profiles', { select: 'id, nome, cognome, attivo', ordine: [{ colonna: 'nome' }] })
  const salva = useSalva('imm_agenti', ['imm_agenti_riepilogo'])
  const a = agenti.find((x) => x.id === id)
  const [f, setF] = useState<{ utente: string; quota: string; zone: string; acq: string; chi: string; provv: string; ruolo: string; attivo: boolean } | null>(null)
  const v = f ?? { utente: a?.user_id ?? '', quota: campoNumero(a?.quota_pct), zone: a?.zone.join(', ') ?? '', acq: campoNumero(a?.obiettivo_acquisizioni), chi: campoNumero(a?.obiettivo_chiusure),
    provv: campoNumero(a?.obiettivo_provvigioni), ruolo: a?.iscrizione_ruolo ?? '', attivo: a?.attivo ?? true }
  const liberi = utenti.filter((u) => u.attivo && (!agenti.some((x) => x.user_id === u.id) || u.id === a?.user_id))
  const registra = () => {
    if (!v.utente) { toast.error('Scegli l\'utente'); return }
    salva.mutate({ id: a?.id, values: { user_id: v.utente, quota_pct: numeroONull(v.quota), zone: v.zone.split(',').map((x) => x.trim()).filter(Boolean), obiettivo_acquisizioni: intONull(v.acq),
      obiettivo_chiusure: intONull(v.chi), obiettivo_provvigioni: numeroONull(v.provv), iscrizione_ruolo: v.ruolo.trim() || null, attivo: v.attivo } }, {
      onSuccess: () => { toast.success(a ? 'Agente aggiornato' : 'Agente aggiunto'); onClose() }, onError: errore })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{a ? 'Agente' : 'Nuovo agente'}</DialogTitle><DialogDescription>La quota vuota prende quella dell'agenzia. Gli obiettivi sono mensili.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5"><Label htmlFor="ag-ut">Utente</Label>
            <Select value={v.utente} onValueChange={(x) => setF({ ...v, utente: x })} disabled={!!a}><SelectTrigger id="ag-ut"><SelectValue placeholder="Scegli l'utente" /></SelectTrigger>
              <SelectContent>{liberi.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ag-q">Quota sulle provvigioni (%)</Label><Input id="ag-q" inputMode="decimal" value={v.quota} onChange={(e) => setF({ ...v, quota: e.target.value })} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ag-r">Iscrizione al ruolo</Label><Input id="ag-r" value={v.ruolo} onChange={(e) => setF({ ...v, ruolo: e.target.value })} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="ag-z">Zone</Label><Input id="ag-z" value={v.zone} onChange={(e) => setF({ ...v, zone: e.target.value })} placeholder="Centro, Navigli" /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ag-oa">Acquisizioni</Label><Input id="ag-oa" inputMode="numeric" value={v.acq} onChange={(e) => setF({ ...v, acq: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ag-oc">Chiusure</Label><Input id="ag-oc" inputMode="numeric" value={v.chi} onChange={(e) => setF({ ...v, chi: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ag-op">Provvigioni (€)</Label><Input id="ag-op" inputMode="decimal" value={v.provv} onChange={(e) => setF({ ...v, provv: e.target.value })} /></div>
          {a && <label className="col-span-6 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={v.attivo} onCheckedChange={(x) => setF({ ...v, attivo: x === true })} /> Attivo</label>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={salva.isPending}>Salva</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Collaboratori() {
  const { isManager } = useAuth()
  const { data: righe = [], isLoading } = useElenco<Collaboratore>('imm_collaboratori', { ordine: [{ colonna: 'tipo' }, { colonna: 'nome' }] })
  const salva = useSalva('imm_collaboratori')
  const [aperto, setAperto] = useState<Collaboratore | 'nuovo' | null>(null)
  const [f, setF] = useState({ tipo: 'agenzia', nome: '', telefono: '', email: '', pct: '', note: '', attivo: true })
  const apri = (c: Collaboratore | 'nuovo') => { setAperto(c); setF(c === 'nuovo' ? { tipo: 'agenzia', nome: '', telefono: '', email: '', pct: '', note: '', attivo: true }
    : { tipo: c.tipo, nome: c.nome, telefono: c.telefono ?? '', email: c.email ?? '', pct: campoNumero(c.provvigione_pct), note: c.note ?? '', attivo: c.attivo }) }
  return (
    <div className="space-y-3">
      {isManager && <div className="flex justify-end"><BottoneScrittura variant="outline" onClick={() => apri('nuovo')}><Plus className="h-4 w-4" /> Nuovo collaboratore</BottoneScrittura></div>}
      {isLoading ? <Skeleton className="h-32" /> : righe.length === 0 ? (
        <EmptyState icon={Users} title="Nessun collaboratore" description="Agenzie partner per le co-mediazioni, segnalatori, geometri, architetti, notai, consulenti e mediatori creditizi."
          action={isManager ? <BottoneScrittura variant="outline" onClick={() => apri('nuovo')}>Nuovo collaboratore</BottoneScrittura> : undefined} filtrato={!isManager} />
      ) : (
        <Card className="divide-y divide-border">{righe.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"><Badge tone="neutral">{COLLABORATORE[c.tipo]}</Badge>
            <span className="min-w-0 flex-1 font-medium text-foreground">{c.nome}<span className="block text-xs font-normal text-muted-foreground">{[c.telefono, c.email, c.note].filter(Boolean).join(' · ')}</span></span>
            {c.provvigione_pct != null && <span className="text-muted-foreground">quota {fmtNumero(c.provvigione_pct, 2)}%</span>}{!c.attivo && <Badge tone="neutral">Non attivo</Badge>}
            {isManager && <Button size="sm" variant="ghost" aria-label={`Modifica ${c.nome}`} onClick={() => apri(c)}><Pencil className="h-3.5 w-3.5" /></Button>}</div>))}</Card>
      )}
      <Dialog open={!!aperto} onOpenChange={(o) => !o && setAperto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{aperto === 'nuovo' ? 'Nuovo collaboratore' : 'Collaboratore'}</DialogTitle><DialogDescription>La quota abituale si propone nelle ripartizioni delle provvigioni.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3 space-y-1.5"><Label htmlFor="co-tipo">Tipo</Label>
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="co-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(COLLABORATORE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-3 space-y-1.5"><Label htmlFor="co-pct">Quota abituale (%)</Label><Input id="co-pct" inputMode="decimal" value={f.pct} onChange={(e) => setF({ ...f, pct: e.target.value })} /></div>
            <div className="col-span-6 space-y-1.5"><Label htmlFor="co-nome">Nome</Label><Input id="co-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
            <div className="col-span-3 space-y-1.5"><Label htmlFor="co-tel">Telefono</Label><Input id="co-tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></div>
            <div className="col-span-3 space-y-1.5"><Label htmlFor="co-mail">Email</Label><Input id="co-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="col-span-6 space-y-1.5"><Label htmlFor="co-note">Note</Label><Input id="co-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
            {aperto !== 'nuovo' && <label className="col-span-6 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.attivo} onCheckedChange={(v) => setF({ ...f, attivo: v === true })} /> Attivo</label>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAperto(null)}>Annulla</Button>
            <BottoneScrittura disabled={!f.nome.trim()} onClick={() => salva.mutate({ id: aperto === 'nuovo' ? undefined : aperto?.id, values: { tipo: f.tipo, nome: f.nome.trim(), telefono: f.telefono.trim() || null,
              email: f.email.trim() || null, provvigione_pct: numeroONull(f.pct), note: f.note.trim() || null, attivo: f.attivo } }, { onSuccess: () => { toast.success('Salvato'); setAperto(null) }, onError: errore })}>Salva</BottoneScrittura></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Marketing ───────────────────────────────────────────────────────────
export function MarketingPage() {
  return <ConAgenzia><Marketing_ /></ConAgenzia>
}

function Marketing_() {
  const { isManager } = useAuth()
  const { data: campagne = [], isLoading } = useElenco<Marketing>('imm_marketing', { ordine: [{ colonna: 'dal', crescente: false }] })
  const { data: lead = [] } = useElenco<{ marketing_id: string | null; stato: string }>('imm_lead', { select: 'marketing_id, stato' })
  const [aperta, setAperta] = useState<Marketing | 'nuova' | null>(null)
  async function scaricaFeed() {
    const { data, error } = await supabase.rpc('imm_feed_annunci')
    if (error) { errore(error); return }
    const url = URL.createObjectURL(new Blob([data ?? ''], { type: 'application/xml' }))
    const a = document.createElement('a'); a.href = url; a.download = `annunci-${oggiIso()}.xml`; a.click(); URL.revokeObjectURL(url)
  }
  return (
    <div>
      <PageHeader title="Marketing" description="Pubblicità degli immobili e campagne di acquisizione con il loro costo e i lead che portano; email, newsletter e open house; il feed per i portali."
        numeri={[
          { etichetta: 'campagne', valore: isLoading ? undefined : campagne.length, inCaricamento: isLoading },
          { etichetta: 'spesa', valore: isLoading ? undefined : fmtEuro(campagne.reduce((s, c) => s + Number(c.costo), 0), 0), inCaricamento: isLoading },
          { etichetta: 'lead dalle campagne', valore: lead.filter((l) => l.marketing_id).length },
        ]}
        actions={<><Button variant="outline" onClick={scaricaFeed}><Download className="h-4 w-4" /> Feed per i portali</Button>
          {isManager && <BottoneScrittura onClick={() => setAperta('nuova')}><Plus className="h-4 w-4" /> Nuova campagna</BottoneScrittura>}</>} />
      <Tabs defaultValue="pubblicita">
        <TabsList className="mb-4 flex-wrap"><TabsTrigger value="pubblicita">Pubblicità e ROI</TabsTrigger><TabsTrigger value="email">Email e newsletter</TabsTrigger><TabsTrigger value="feedback">Soddisfazione</TabsTrigger></TabsList>
        <TabsContent value="pubblicita">
          {isLoading ? <Skeleton className="h-48" /> : campagne.length === 0 ? (
            <EmptyState icon={Megaphone} title="Nessuna campagna" description="Portali a pagamento, social, cartelli, volantini, open house: con il costo, i lead e le provvigioni si calcola il ritorno."
              action={isManager ? <BottoneScrittura variant="outline" onClick={() => setAperta('nuova')}>Nuova campagna</BottoneScrittura> : undefined} filtrato={!isManager} />
          ) : (
            <Card className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Campagna</TableHead><TableHead>Canale</TableHead><TableHead>Periodo</TableHead><TableHead numerica>Costo</TableHead><TableHead numerica>Lead</TableHead>
                <TableHead numerica>Convertiti</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
              <TableBody>{campagne.map((c) => {
                const suoi = lead.filter((l) => l.marketing_id === c.id)
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-foreground">{c.nome}<span className="block text-xs text-muted-foreground">{c.codice} · {OBIETTIVO_MKT[c.obiettivo]}</span></TableCell>
                    <TableCell>{CANALE_MKT[c.canale]}</TableCell><TableCell>{fmtData(c.dal)}{c.al ? ` – ${fmtData(c.al)}` : ''}</TableCell><TableCell numerica>{fmtEuro(c.costo, 0)}</TableCell>
                    <TableCell numerica>{suoi.length}</TableCell><TableCell numerica>{suoi.filter((l) => l.stato === 'convertito').length}</TableCell>
                    <TableCell className="text-right">{isManager && <Button size="sm" variant="ghost" aria-label={`Modifica ${c.nome}`} onClick={() => setAperta(c)}><Pencil className="h-3.5 w-3.5" /></Button>}</TableCell>
                  </TableRow>
                )
              })}</TableBody>
            </Table></Card>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Il ROI di ogni campagna (provvigioni degli affari nati dai suoi lead, sul costo) è in «Analisi». La pubblicazione automatica sui portali è predisposta.</p>
        </TabsContent>
        <TabsContent value="email"><CampagneSezione modulo="immobiliare" /></TabsContent>
        <TabsContent value="feedback"><FeedbackSezione modulo="immobiliare" canali={['email', 'telefono', 'di persona', 'recensione online']} aspetti={['Agente', 'Tempi', 'Trasparenza', 'Documentazione']} /></TabsContent>
      </Tabs>
      {aperta && <CampagnaDialog key={aperta === 'nuova' ? 'nuova' : aperta.id} campagna={aperta === 'nuova' ? null : aperta} onClose={() => setAperta(null)} />}
    </div>
  )
}

function CampagnaDialog({ campagna: c, onClose }: { campagna: Marketing | null; onClose: () => void }) {
  const salva = useSalva('imm_marketing')
  const [f, setF] = useState({ nome: c?.nome ?? '', canale: c?.canale ?? 'portale', obiettivo: c?.obiettivo ?? 'vendita', immobile: c?.immobile_id ?? 'nessuno', dal: c?.dal ?? oggiIso(),
    al: c?.al ?? piuGiorni(oggiIso(), 30), costo: campoNumero(c?.costo ?? null), note: c?.note ?? '' })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{c ? c.nome : 'Nuova campagna'}</DialogTitle><DialogDescription>I lead si collegano alla campagna quando si registrano.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5"><Label htmlFor="mk-nome">Nome</Label><Input id="mk-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="mk-can">Canale</Label>
            <Select value={f.canale} onValueChange={(v) => setF({ ...f, canale: v })}><SelectTrigger id="mk-can"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(CANALE_MKT).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="mk-ob">Obiettivo</Label>
            <Select value={f.obiettivo} onValueChange={(v) => setF({ ...f, obiettivo: v })}><SelectTrigger id="mk-ob"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(OBIETTIVO_MKT).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <CampoImmobile id="mk-imm" valore={f.immobile} onChange={(v) => setF({ ...f, immobile: v })} etichetta="Per un immobile" nessuno="Nessuno: campagna generale" />
          <div className="col-span-2 space-y-1.5"><Label htmlFor="mk-dal">Dal</Label><Input id="mk-dal" type="date" value={f.dal} onChange={(e) => setF({ ...f, dal: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="mk-al">Al</Label><Input id="mk-al" type="date" value={f.al} onChange={(e) => setF({ ...f, al: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="mk-costo">Costo (€)</Label><Input id="mk-costo" inputMode="decimal" value={f.costo} onChange={(e) => setF({ ...f, costo: e.target.value })} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="mk-note">Note</Label><Input id="mk-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button>
          <BottoneScrittura disabled={!f.nome.trim() || salva.isPending} onClick={() => salva.mutate({ id: c?.id, values: { nome: f.nome.trim(), canale: f.canale, obiettivo: f.obiettivo,
            immobile_id: f.immobile === 'nessuno' ? null : f.immobile, dal: f.dal, al: f.al || null, costo: numero(f.costo), note: f.note.trim() || null } }, {
            onSuccess: () => { toast.success('Campagna salvata'); onClose() }, onError: errore })}>Salva</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Compliance ──────────────────────────────────────────────────────────
export function CompliancePage() {
  return <ConAgenzia><Compliance_ /></ConAgenzia>
}

function Compliance_() {
  const { data: aml = [], isLoading } = useElenco<Aml & { contatti: ContattoBreve | null }>('imm_aml_verifiche', { select: '*, contatti(id, nome, cognome, email, telefono)',
    ordine: [{ colonna: 'identificato_il', crescente: false }] })
  const { data: privacy = [] } = useElenco<Privacy & { contatti: ContattoBreve | null }>('imm_privacy', { select: '*, contatti(id, nome, cognome, email, telefono)', ordine: [{ colonna: 'informativa_il', crescente: false }] })
  const [nuovaAml, setNuovaAml] = useState(false)
  const [nuovaPrivacy, setNuovaPrivacy] = useState(false)
  const oggi = oggiIso()
  return (
    <div>
      <PageHeader title="Compliance" description="Adeguata verifica antiriciclaggio (D.Lgs. 231/2007) con la conservazione per dieci anni; informative e consensi privacy. Ogni modifica resta nel registro delle attività."
        numeri={[
          { etichetta: 'verifiche', valore: isLoading ? undefined : aml.length, inCaricamento: isLoading },
          { etichetta: 'rafforzate', valore: isLoading ? undefined : aml.filter((a) => a.adeguata_verifica === 'rafforzata').length, inCaricamento: isLoading },
          { etichetta: 'documenti scaduti', valore: isLoading ? undefined : aml.filter((a) => a.documento_scadenza && a.documento_scadenza < oggi).length, inCaricamento: isLoading },
        ]} />
      <Tabs defaultValue="aml">
        <TabsList className="mb-4"><TabsTrigger value="aml">Antiriciclaggio</TabsTrigger><TabsTrigger value="privacy">Privacy</TabsTrigger></TabsList>
        <TabsContent value="aml">
          <div className="mb-3 flex justify-end"><BottoneScrittura variant="outline" onClick={() => setNuovaAml(true)}><Plus className="h-4 w-4" /> Nuova verifica</BottoneScrittura></div>
          {isLoading ? <Skeleton className="h-48" /> : aml.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Nessuna verifica" description="Prima del rogito serve l'adeguata verifica dell'acquirente: documento, titolare effettivo, scopo, origine dei fondi, profilo di rischio."
              action={<BottoneScrittura variant="outline" onClick={() => setNuovaAml(true)}>Nuova verifica</BottoneScrittura>} />
          ) : (
            <Card className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Documento</TableHead><TableHead>Identificato</TableHead><TableHead>Rischio</TableHead><TableHead>Verifica</TableHead><TableHead>Conservare fino al</TableHead>
                <TableHead><span className="sr-only">File</span></TableHead></TableRow></TableHeader>
              <TableBody>{aml.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-foreground">{nomeContatto(a.contatti)}<span className="block text-xs text-muted-foreground">{a.ruolo}{a.pep ? ' · persona politicamente esposta' : ''}</span></TableCell>
                  <TableCell className="text-sm">{DOCUMENTO_ID[a.documento_tipo]} {a.documento_numero}<span className="block text-xs text-muted-foreground">{a.documento_scadenza ? `scade il ${fmtData(a.documento_scadenza)}` : ''}</span></TableCell>
                  <TableCell>{fmtData(a.identificato_il)}<span className="block text-xs text-muted-foreground">{a.modalita}</span></TableCell>
                  <TableCell><Badge tone={RISCHIO[a.rischio].tone}>{RISCHIO[a.rischio].label}</Badge></TableCell>
                  <TableCell className="capitalize">{a.adeguata_verifica}</TableCell>
                  <TableCell>{fmtData(a.conservare_fino)}</TableCell>
                  <TableCell className="text-right"><FotoDialog entita="imm_aml_verifiche" entitaId={a.id} titolo={`Verifica · ${nomeContatto(a.contatti)}`} categorie={['documento d\'identità', 'dichiarazione', 'visura']} /></TableCell>
                </TableRow>))}</TableBody>
            </Table></Card>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Le verifiche le vedono la direzione e chi le ha fatte.</p>
        </TabsContent>
        <TabsContent value="privacy">
          <div className="mb-3 flex justify-end"><BottoneScrittura variant="outline" onClick={() => setNuovaPrivacy(true)}><Plus className="h-4 w-4" /> Registra un'informativa</BottoneScrittura></div>
          {privacy.length === 0 ? <EmptyState icon={ShieldCheck} filtrato title="Nessuna informativa registrata" description="Consegna dell'informativa e consensi: trattamento, marketing, comunicazione a terzi (notai, banche, collaboratori)." /> : (
            <Card className="divide-y divide-border">{privacy.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"><span className="min-w-0 flex-1 font-medium text-foreground">{nomeContatto(p.contatti)}
                <span className="block text-xs font-normal text-muted-foreground">Informativa del {fmtData(p.informativa_il)}{p.revocato_il ? ` · revocato il ${fmtData(p.revocato_il)}` : ''}</span></span>
                <Badge tone={p.consenso_trattamento ? 'success' : 'danger'}>Trattamento</Badge><Badge tone={p.consenso_marketing ? 'success' : 'neutral'}>Marketing</Badge>
                <Badge tone={p.consenso_terzi ? 'success' : 'neutral'}>Terzi</Badge></div>))}</Card>
          )}
        </TabsContent>
      </Tabs>
      {nuovaAml && <AmlDialog onClose={() => setNuovaAml(false)} />}
      {nuovaPrivacy && <PrivacyDialog onClose={() => setNuovaPrivacy(false)} />}
    </div>
  )
}

function AmlDialog({ onClose }: { onClose: () => void }) {
  const salva = useSalva('imm_aml_verifiche', ['scadenze_moduli'])
  const [cliente, setCliente] = useState<Cliente>(clienteVuoto)
  const [f, setF] = useState({ ruolo: 'acquirente', immobile: 'nessuno', tipo: 'carta_identita', numero: '', scadenza: '', identificato: oggiIso(), modalita: 'presenza', titolare: '', pep: false,
    scopo: '', fondi: '', rischio: 'basso', note: '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  async function registra() {
    try {
      const contatto_id = await assicuraContatto(cliente)
      await salva.mutateAsync({ values: { contatto_id, ruolo: f.ruolo, immobile_id: f.immobile === 'nessuno' ? null : f.immobile, documento_tipo: f.tipo, documento_numero: f.numero.trim(),
        documento_scadenza: f.scadenza || null, identificato_il: f.identificato, modalita: f.modalita, titolare_effettivo: f.titolare.trim() || null, pep: f.pep,
        scopo_natura: f.scopo.trim() || null, origine_fondi: f.fondi.trim() || null, rischio: f.rischio, note: f.note.trim() || null } })
      toast.success('Verifica registrata'); onClose()
    } catch (e) { errore(e) }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Adeguata verifica</DialogTitle><DialogDescription>Con rischio alto o persona politicamente esposta la verifica è rafforzata e serve l'origine dei fondi.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <CampoCliente id="am-cli" valore={cliente} onChange={setCliente} recapiti={false} />
          <div className="col-span-3 space-y-1.5"><Label htmlFor="am-ruolo">Ruolo</Label>
            <Select value={f.ruolo} onValueChange={(v) => setF({ ...f, ruolo: v })}><SelectTrigger id="am-ruolo"><SelectValue /></SelectTrigger>
              <SelectContent>{['acquirente', 'venditore', 'conduttore', 'locatore'].map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent></Select></div>
          <CampoImmobile id="am-imm" valore={f.immobile} onChange={(v) => setF({ ...f, immobile: v })} etichetta="Operazione" nessuno="Non indicata" classe="col-span-3" />
          <div className="col-span-2 space-y-1.5"><Label htmlFor="am-tipo">Documento</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="am-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(DOCUMENTO_ID).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="am-num">Numero *</Label><Input id="am-num" value={f.numero} onChange={set('numero')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="am-sc">Scadenza</Label><Input id="am-sc" type="date" value={f.scadenza} onChange={set('scadenza')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="am-id">Identificato il</Label><Input id="am-id" type="date" value={f.identificato} onChange={set('identificato')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="am-mod">Modalità</Label>
            <Select value={f.modalita} onValueChange={(v) => setF({ ...f, modalita: v })}><SelectTrigger id="am-mod"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="presenza">In presenza</SelectItem><SelectItem value="remoto">A distanza</SelectItem><SelectItem value="terzi">Tramite terzi</SelectItem></SelectContent></Select></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="am-tit">Titolare effettivo</Label><Input id="am-tit" value={f.titolare} onChange={set('titolare')} placeholder="Per le società: chi le controlla" /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="am-scopo">Scopo e natura dell'operazione</Label><Input id="am-scopo" value={f.scopo} onChange={set('scopo')} placeholder="Prima casa, investimento…" /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="am-fondi">Origine dei fondi</Label><Input id="am-fondi" value={f.fondi} onChange={set('fondi')} placeholder="Mutuo, risparmi, vendita di un altro immobile…" /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="am-ris">Profilo di rischio</Label>
            <Select value={f.rischio} onValueChange={(v) => setF({ ...f, rischio: v })}><SelectTrigger id="am-ris"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(RISCHIO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
          <label className="col-span-3 flex items-end gap-2 pb-2 text-sm text-foreground"><Checkbox checked={f.pep} onCheckedChange={(v) => setF({ ...f, pep: v === true })} /> Persona politicamente esposta</label>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={!cliente.testo.trim() || !f.numero.trim() || salva.isPending}>Registra</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PrivacyDialog({ onClose }: { onClose: () => void }) {
  const salva = useSalva('imm_privacy')
  const [cliente, setCliente] = useState<Cliente>(clienteVuoto)
  const [f, setF] = useState({ data: oggiIso(), trattamento: true, marketing: false, terzi: true })
  async function registra() {
    try {
      const contatto_id = await assicuraContatto(cliente)
      await salva.mutateAsync({ values: { contatto_id, informativa_il: f.data, consenso_trattamento: f.trattamento, consenso_marketing: f.marketing, consenso_terzi: f.terzi } })
      toast.success('Informativa registrata'); onClose()
    } catch (e) { errore(e) }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Informativa e consensi</DialogTitle><DialogDescription>Il consenso al marketing aggiorna anche la scheda del contatto: le campagne lo rispettano.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <CampoCliente id="pv-cli" valore={cliente} onChange={setCliente} recapiti={false} />
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pv-d">Consegnata il</Label><Input id="pv-d" type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
          <label className="col-span-6 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.trattamento} onCheckedChange={(v) => setF({ ...f, trattamento: v === true })} /> Consenso al trattamento</label>
          <label className="col-span-6 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.marketing} onCheckedChange={(v) => setF({ ...f, marketing: v === true })} /> Consenso al marketing</label>
          <label className="col-span-6 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.terzi} onCheckedChange={(v) => setF({ ...f, terzi: v === true })} /> Comunicazione a notai, banche e collaboratori</label>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={!cliente.testo.trim() || salva.isPending}>Registra</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Regole dell'agenzia ─────────────────────────────────────────────────
export function ImpostazioniImmobiliarePage() {
  return <ManagerOnly><ConAgenzia><Impostazioni_ /></ConAgenzia></ManagerOnly>
}

function Impostazioni_() {
  const { impostazioni: s } = useImpostazioni()
  const salva = useSalva('imm_impostazioni')
  const [f, setF] = useState<Record<string, string> | null>(null)
  if (!s) return null
  const v = f ?? { agenzia: s.agenzia, venditore: campoNumero(s.provvigione_venditore_pct), acquirente: campoNumero(s.provvigione_acquirente_pct), minima: campoNumero(s.provvigione_minima),
    mensilita: campoNumero(s.locazione_mensilita), quota: campoNumero(s.quota_agente_pct), istat: campoNumero(s.istat_pct), report: String(s.report_giorni), lead: String(s.lead_risposta_ore) }
  const campo = (k: string, l: string) => <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor={`ri-${k}`}>{l}</Label>
    <Input id={`ri-${k}`} inputMode="decimal" value={v[k]} onChange={(e) => setF({ ...v, [k]: e.target.value })} /></div>
  return (
    <div>
      <PageHeader title="Regole dell'agenzia" description="Provvigioni di default, quota degli agenti, adeguamento ISTAT, report ai proprietari e tempo di risposta ai lead." />
      <Card className="grid max-w-3xl grid-cols-6 gap-3 p-5">
        <div className="col-span-6 space-y-1.5"><Label htmlFor="ri-agenzia">Nome dell'agenzia</Label><Input id="ri-agenzia" value={v.agenzia} onChange={(e) => setF({ ...v, agenzia: e.target.value })} /></div>
        {campo('venditore', 'Provvigione venditore (%)')}{campo('acquirente', 'Provvigione acquirente (%)')}{campo('minima', 'Provvigione minima (€)')}
        {campo('mensilita', 'Locazione: mensilità per lato')}{campo('quota', 'Quota dell\'agente (%)')}{campo('istat', 'Quota ISTAT applicata (%)')}
        {campo('report', 'Report ai proprietari ogni (giorni)')}{campo('lead', 'Risposta ai lead entro (ore)')}
        <div className="col-span-6 flex justify-end"><BottoneScrittura disabled={!f || salva.isPending} onClick={() => salva.mutate({ id: String(s.id), values: { agenzia: v.agenzia.trim(),
          provvigione_venditore_pct: numero(v.venditore), provvigione_acquirente_pct: numero(v.acquirente), provvigione_minima: numero(v.minima), locazione_mensilita: numero(v.mensilita),
          quota_agente_pct: numero(v.quota), istat_pct: numero(v.istat), report_giorni: Math.round(numero(v.report)) || 30, lead_risposta_ore: Math.round(numero(v.lead)) || 24 } }, {
          onSuccess: () => { toast.success('Regole salvate'); setF(null) }, onError: errore })}>Salva</BottoneScrittura></div>
      </Card>
    </div>
  )
}

// ── Analisi ─────────────────────────────────────────────────────────────
interface Kpi {
  acquisizione: { proprietari_contattati: number; appuntamenti: number; valutazioni: number; incarichi: number; esclusive: number; conversione_pct: number | null; valore_portafoglio: number }
  vendita: { disponibili: number; sotto_offerta: number; venduti: number; locati: number; giorni_medi_vendita: number | null; prezzo_medio: number | null; sconto_medio_pct: number | null
    visite: number; proposte: number; conversione_visite_offerte_pct: number | null }
  clienti: { lead: number; lead_qualificati: number; per_origine: Record<string, number>; clienti_attivi: number; clienti_convertiti: number }
  economici: { fatturato: number; provvigioni: number; provvigione_media: number | null; incassate: number; quote_agenti_collaboratori: number; costi_marketing: number; margine: number
    per_agente: { agente: string; provvigioni: number }[]; campagne: { nome: string; canale: string; costo: number; lead: number; provvigioni: number; roi_pct: number | null }[] } | null
}

export function AnalisiImmobiliarePage() {
  return <ManagerOnly><ConAgenzia><Analisi_ /></ConAgenzia></ManagerOnly>
}

function Analisi_() {
  const [dal, setDal] = useState(piuGiorni(oggiIso(), -89))
  const [al, setAl] = useState(oggiIso())
  const { data: k, isLoading } = useRpc<Kpi>('imm_kpi', { p_dal: dal, p_al: al })
  const voce = (l: string, v: string) => <div key={l} className="flex items-center justify-between py-1.5"><dt className="text-muted-foreground">{l}</dt><dd className="tabular-nums text-foreground">{v}</dd></div>
  const pct = (n: number | null | undefined) => (n == null ? '—' : `${fmtNumero(n, 1)}%`)
  const e = k?.economici
  return (
    <div>
      <PageHeader title="Analisi" description="Acquisizione, vendita, clienti ed economia dell'agenzia nel periodo, con il ritorno delle campagne."
        numeri={[
          { etichetta: 'incarichi', valore: k?.acquisizione.incarichi, inCaricamento: isLoading },
          { etichetta: 'venduti', valore: k?.vendita.venduti, inCaricamento: isLoading },
          { etichetta: 'provvigioni', valore: e ? fmtEuro(e.provvigioni, 0) : undefined, inCaricamento: isLoading },
          { etichetta: 'margine', valore: e ? fmtEuro(e.margine, 0) : undefined, inCaricamento: isLoading },
        ]} />
      <Card className="mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label htmlFor="ai-dal">Dal</Label><Input id="ai-dal" type="date" value={dal} onChange={(ev) => ev.target.value && setDal(ev.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="ai-al">Al</Label><Input id="ai-al" type="date" value={al} onChange={(ev) => ev.target.value && setAl(ev.target.value)} /></div>
        {([['30 giorni', 29], ['90 giorni', 89], ['12 mesi', 364]] as const).map(([l, g]) => <Button key={l} variant="ghost" onClick={() => { setDal(piuGiorni(oggiIso(), -g)); setAl(oggiIso()) }}>{l}</Button>)}
      </Card>
      {isLoading || !k ? <Skeleton className="h-96" /> : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Acquisizione</h2><dl className="divide-y divide-border text-sm">{[
            voce('Proprietari contattati', String(k.acquisizione.proprietari_contattati)), voce('Appuntamenti di acquisizione', String(k.acquisizione.appuntamenti)),
            voce('Valutazioni', String(k.acquisizione.valutazioni)), voce('Incarichi acquisiti', `${k.acquisizione.incarichi} (${k.acquisizione.esclusive} in esclusiva)`),
            voce('Conversione', pct(k.acquisizione.conversione_pct)), voce('Valore del portafoglio', fmtEuro(k.acquisizione.valore_portafoglio, 0))]}</dl></Card>
          <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Vendita</h2><dl className="divide-y divide-border text-sm">{[
            voce('Disponibili / sotto offerta', `${k.vendita.disponibili} / ${k.vendita.sotto_offerta}`), voce('Venduti / affittati', `${k.vendita.venduti} / ${k.vendita.locati}`),
            voce('Tempo medio di vendita', k.vendita.giorni_medi_vendita != null ? `${k.vendita.giorni_medi_vendita} giorni` : '—'), voce('Prezzo medio di vendita', fmtEuro(k.vendita.prezzo_medio, 0)),
            voce('Sconto medio sul prezzo iniziale', pct(k.vendita.sconto_medio_pct)), voce('Visite → proposte', `${k.vendita.visite} → ${k.vendita.proposte} (${pct(k.vendita.conversione_visite_offerte_pct)})`)]}</dl></Card>
          <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Clienti</h2><dl className="divide-y divide-border text-sm">{[
            voce('Lead acquisiti', String(k.clienti.lead)), voce('Lead qualificati', String(k.clienti.lead_qualificati)), voce('Clienti attivi', String(k.clienti.clienti_attivi)),
            voce('Clienti convertiti', String(k.clienti.clienti_convertiti))]}</dl>
            {Object.keys(k.clienti.per_origine).length > 0 && <p className="mt-2 text-sm text-muted-foreground">Da dove arrivano: {Object.entries(k.clienti.per_origine).sort((a, b) => b[1] - a[1]).map(([o, n]) => `${o} ${n}`).join(', ')}.</p>}</Card>
          {e && <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Economici</h2><dl className="divide-y divide-border text-sm">{[
            voce('Fatturato', fmtEuro(e.fatturato, 0)), voce('Provvigioni maturate', fmtEuro(e.provvigioni, 0)), voce('Provvigione media', fmtEuro(e.provvigione_media, 0)),
            voce('Incassate', fmtEuro(e.incassate, 0)), voce('Quote ad agenti e collaboratori', fmtEuro(e.quote_agenti_collaboratori, 0)), voce('Costi di marketing', fmtEuro(e.costi_marketing, 0)),
            voce('Margine dell\'agenzia', fmtEuro(e.margine, 0))]}</dl>
            {e.per_agente.length > 0 && <p className="mt-2 text-sm text-muted-foreground">Per agente: {e.per_agente.map((x) => `${x.agente} ${fmtEuro(x.provvigioni, 0)}`).join(', ')}.</p>}</Card>}
          {e && e.campagne.length > 0 && <Card className="p-5 lg:col-span-2"><h2 className="mb-2 text-title text-foreground">Ritorno delle campagne</h2>
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Campagna</TableHead><TableHead numerica>Costo</TableHead><TableHead numerica>Lead</TableHead><TableHead numerica>Provvigioni</TableHead><TableHead numerica>ROI</TableHead></TableRow></TableHeader>
              <TableBody>{e.campagne.map((c) => <TableRow key={c.nome}><TableCell className="text-foreground">{c.nome}<span className="block text-xs text-muted-foreground">{CANALE_MKT[c.canale]}</span></TableCell>
                <TableCell numerica>{fmtEuro(c.costo, 0)}</TableCell><TableCell numerica>{c.lead}</TableCell><TableCell numerica>{fmtEuro(c.provvigioni, 0)}</TableCell><TableCell numerica>{pct(c.roi_pct)}</TableCell></TableRow>)}</TableBody>
            </Table></div></Card>}
        </div>
      )}
    </div>
  )
}
