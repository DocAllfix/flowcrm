/**
 * Il portafoglio dell'agenzia (§1–2) e il fascicolo digitale dell'immobile:
 * scheda, proprietari (§3), documenti (§16), incarichi (§6), valutazione
 * (§8), annuncio (§9–10), clienti compatibili (§12), visite e proposte,
 * report al proprietario (§23), foto e planimetrie.
 */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Building, FileText, Home, Pencil, Plus, Printer, Send, Trash2 } from 'lucide-react'
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
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { FotoDialog } from '@/components/condivisi/FotoDialog'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useElenco, useRiga, useRpc, useSalva, useElimina, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import { ConAgenzia } from '@/modules/immobiliare/componenti/ConAgenzia'
import { CampoAgente, CampoCliente, assicuraContatto, clienteVuoto, type Cliente } from '@/modules/immobiliare/componenti/Scelte'
import { useAgenti, nomeAgente, TABELLE_COMMERCIALI, type Annuncio, type ContattoBreve, type Documento, type Immobile, type Incarico, type MatchImmobile,
  type Proposta, type Proprietario, type Report, type Richiesta, type Stima, type Valutazione, type Visita } from '@/modules/immobiliare/queries'
import { ANNUNCIO_STATO, CLASSI, CONSERVAZIONE, CONTRATTO, DOCUMENTO, DOCUMENTO_STATO, IMMOBILE_STATO, INCARICO_STATO, PORTALI, PROPOSTA_STATO, TIPOLOGIA,
  TITOLO_PROPRIETA, VISITA_STATO, campoNumero, classeLabel, fmtData, fmtEuro, fmtGiornoOra, fmtNumero, giorniTra, intONull, nomeContatto, numero, numeroONull,
  oggiIso } from '@/modules/immobiliare/stati'

const errore = (e: unknown) => toast.error(messaggioErrore(e))
const prezzoDi = (i: Pick<Immobile, 'contratto' | 'prezzo' | 'canone'>) =>
  i.contratto === 'affitto' ? (i.canone != null ? `${fmtEuro(i.canone, 0)} al mese` : '—') : fmtEuro(i.prezzo, 0)

// ── Elenco ──────────────────────────────────────────────────────────────
export function ImmobiliPage() {
  return <ConAgenzia><Immobili_ /></ConAgenzia>
}

function Immobili_() {
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') ?? 'mercato'
  const [q, setQ] = useState('')
  const [nuovo, setNuovo] = useState(false)
  const { agenti } = useAgenti()
  const { data: immobili = [], isLoading } = useElenco<Immobile>('imm_immobili', { ordine: [{ colonna: 'created_at', crescente: false }] })
  const viste: [string, string, (i: Immobile) => boolean][] = [
    ['mercato', 'Sul mercato', (i) => ['disponibile', 'sotto_offerta'].includes(i.stato)],
    ['acquisizione', 'In acquisizione', (i) => ['in_acquisizione', 'in_valutazione'].includes(i.stato)],
    ['conclusi', 'Venduti e affittati', (i) => ['venduto', 'affittato'].includes(i.stato)],
    ['ritirati', 'Ritirati', (i) => i.stato === 'ritirato'],
    ['tutti', 'Tutti', () => true],
  ]
  const filtro = viste.find((v) => v[0] === vista)?.[2] ?? (() => true)
  const cerca = q.trim().toLowerCase()
  const visibili = immobili.filter(filtro).filter((i) => !cerca || [i.codice, i.titolo, i.indirizzo, i.comune, i.zona].some((x) => x?.toLowerCase().includes(cerca)))
  const sulMercato = immobili.filter((i) => ['disponibile', 'sotto_offerta'].includes(i.stato))

  return (
    <div>
      <PageHeader title="Immobili" description="Il portafoglio dell'agenzia: ogni immobile con il suo fascicolo, dall'acquisizione al rogito."
        numeri={[
          { etichetta: 'sul mercato', valore: isLoading ? undefined : sulMercato.length, inCaricamento: isLoading },
          { etichetta: 'valore in vendita', valore: isLoading ? undefined : fmtEuro(sulMercato.reduce((s, i) => s + Number(i.prezzo ?? 0), 0), 0), inCaricamento: isLoading },
          { etichetta: 'in acquisizione', valore: isLoading ? undefined : immobili.filter(viste[1][2]).length, inCaricamento: isLoading },
        ]}
        actions={<BottoneScrittura onClick={() => setNuovo(true)}><Plus className="h-4 w-4" /> Nuovo immobile</BottoneScrittura>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Codice, indirizzo, zona…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca" />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtra">{viste.map(([k, l, f]) => (
          <Button key={k} size="sm" variant={vista === k ? 'default' : 'outline'} aria-pressed={vista === k} onClick={() => setParams(k === 'mercato' ? {} : { vista: k })}>
            {l} <span className="tabular-nums opacity-70">{immobili.filter(f).length}</span></Button>))}</div>
      </div>
      {isLoading ? <Skeleton className="h-64" /> : visibili.length === 0 ? (
        immobili.length === 0
          ? <EmptyState icon={Building} title="Ancora nessun immobile" description="Si parte dall'indirizzo e dal proprietario: valutazione, incarico e annuncio vengono dopo, nel fascicolo."
              action={<BottoneScrittura variant="outline" onClick={() => setNuovo(true)}>Nuovo immobile</BottoneScrittura>} />
          : <EmptyState icon={Building} filtrato title="Nessun immobile con questo filtro" description="Cambia la ricerca o il filtro." />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Immobile</TableHead><TableHead>Dove</TableHead><TableHead numerica>Prezzo</TableHead><TableHead numerica>m²</TableHead>
            <TableHead>Agente</TableHead><TableHead numerica>Sul mercato</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
          <TableBody>{visibili.map((i) => (
            <TableRow key={i.id}>
              <TableCell><Link to={`/immobiliare/immobili/${i.id}`} className="font-medium text-foreground hover:text-primary-testo">{i.titolo ?? TIPOLOGIA[i.tipologia]}</Link>
                <span className="block text-xs text-muted-foreground">{i.codice} · {TIPOLOGIA[i.tipologia]} · {CONTRATTO[i.contratto]}</span></TableCell>
              <TableCell className="text-sm">{i.indirizzo}<span className="block text-xs text-muted-foreground">{i.comune}{i.zona ? ` · ${i.zona}` : ''}</span></TableCell>
              <TableCell numerica>{prezzoDi(i)}{i.prezzo_iniziale && i.prezzo && i.prezzo < i.prezzo_iniziale ? <span className="block text-xs text-muted-foreground line-through">{fmtEuro(i.prezzo_iniziale, 0)}</span> : null}</TableCell>
              <TableCell numerica>{fmtNumero(i.superficie_commerciale)}</TableCell>
              <TableCell className="text-sm">{nomeAgente(agenti, i.agente_id) ?? '—'}</TableCell>
              <TableCell numerica>{i.pubblicato_il ? `${giorniTra(i.pubblicato_il, i.concluso_il ?? oggiIso())} g` : '—'}</TableCell>
              <TableCell><Badge tone={IMMOBILE_STATO[i.stato].tone}>{IMMOBILE_STATO[i.stato].label}</Badge></TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      {nuovo && <NuovoImmobileDialog onClose={() => setNuovo(false)} />}
    </div>
  )
}

function NuovoImmobileDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { io } = useAgenti()
  const salva = useSalva('imm_immobili')
  const salvaProp = useSalva('imm_proprietari')
  const [f, setF] = useState({ tipologia: 'appartamento', contratto: 'vendita', indirizzo: '', comune: '', zona: '', superficie: '', camere: '', prezzo: '', canone: '',
    agente: io?.agente_id ?? 'nessuno' })
  const [proprietario, setProprietario] = useState<Cliente>(clienteVuoto)
  const [inCorso, setInCorso] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.indirizzo.trim() || !f.comune.trim()) { toast.error('Indirizzo e comune sono obbligatori'); return }
    setInCorso(true)
    try {
      const i = await salva.mutateAsync({ values: { tipologia: f.tipologia, contratto: f.contratto, indirizzo: f.indirizzo.trim(), comune: f.comune.trim(), zona: f.zona.trim() || null,
        superficie_commerciale: numeroONull(f.superficie), camere: intONull(f.camere), prezzo: f.contratto !== 'affitto' ? numeroONull(f.prezzo) : null,
        canone: f.contratto !== 'vendita' ? numeroONull(f.canone) : null, agente_id: f.agente === 'nessuno' ? null : f.agente } })
      if (proprietario.testo.trim()) {
        const contatto = await assicuraContatto(proprietario)
        await salvaProp.mutateAsync({ values: { immobile_id: i.id, contatto_id: contatto, quota_pct: 100, referente: true } })
      }
      toast.success(`${i.codice}: ora il fascicolo, con la valutazione e l'incarico`)
      onClose()
      navigate(`/immobiliare/immobili/${i.id}`)
    } catch (err) { errore(err) } finally { setInCorso(false) }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Nuovo immobile</DialogTitle>
          <DialogDescription>Il resto della scheda (piano, bagni, classe energetica, dotazioni) si completa nel fascicolo.</DialogDescription></DialogHeader>
        <form onSubmit={crea} className="grid grid-cols-6 gap-3">
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ni-tipo">Tipologia</Label>
            <Select value={f.tipologia} onValueChange={(v) => setF({ ...f, tipologia: v })}><SelectTrigger id="ni-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TIPOLOGIA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ni-con">Per</Label>
            <Select value={f.contratto} onValueChange={(v) => setF({ ...f, contratto: v })}><SelectTrigger id="ni-con"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(CONTRATTO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="ni-ind">Indirizzo *</Label><Input id="ni-ind" value={f.indirizzo} onChange={set('indirizzo')} required autoFocus /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ni-com">Comune *</Label><Input id="ni-com" value={f.comune} onChange={set('comune')} required /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ni-zona">Zona o quartiere</Label><Input id="ni-zona" value={f.zona} onChange={set('zona')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ni-mq">Superficie (m²)</Label><Input id="ni-mq" inputMode="decimal" value={f.superficie} onChange={set('superficie')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ni-cam">Camere</Label><Input id="ni-cam" inputMode="numeric" value={f.camere} onChange={set('camere')} /></div>
          {f.contratto !== 'affitto'
            ? <div className="col-span-2 space-y-1.5"><Label htmlFor="ni-pr">Prezzo (€)</Label><Input id="ni-pr" inputMode="decimal" value={f.prezzo} onChange={set('prezzo')} /></div>
            : <div className="col-span-2 space-y-1.5"><Label htmlFor="ni-can">Canone (€/mese)</Label><Input id="ni-can" inputMode="decimal" value={f.canone} onChange={set('canone')} /></div>}
          {f.contratto === 'entrambi' && <div className="col-span-2 col-start-5 space-y-1.5"><Label htmlFor="ni-can2">Canone (€/mese)</Label><Input id="ni-can2" inputMode="decimal" value={f.canone} onChange={set('canone')} /></div>}
          <CampoAgente id="ni-ag" valore={f.agente} onChange={(v) => setF({ ...f, agente: v })} classe="col-span-6" />
          <CampoCliente id="ni-prop" etichetta="Proprietario (facoltativo)" valore={proprietario} onChange={setProprietario} />
          <DialogFooter className="col-span-6">
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={inCorso}>Crea il fascicolo</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Fascicolo ───────────────────────────────────────────────────────────
export function ImmobilePage() {
  return <ConAgenzia><Immobile_ /></ConAgenzia>
}

function Immobile_() {
  const { id } = useParams<{ id: string }>()
  const [params, setParams] = useSearchParams()
  const { data: i, isLoading } = useRiga<Immobile>('imm_immobili', id)
  const { agenti } = useAgenti()
  if (isLoading) return <Skeleton className="h-96" />
  if (!i) return <EmptyState icon={Building} filtrato title="Immobile non trovato" description="Potrebbe essere stato eliminato." />
  const st = IMMOBILE_STATO[i.stato]
  const scheda = params.get('scheda') ?? 'scheda'
  return (
    <div>
      <PageHeader title={i.titolo ?? `${TIPOLOGIA[i.tipologia]} in ${i.indirizzo}`} briciole={[{ label: 'Immobili', to: '/immobiliare/immobili' }, { label: i.codice ?? '' }]}
        description={`${i.codice} · ${i.indirizzo}, ${i.comune}${i.zona ? ` (${i.zona})` : ''} · ${CONTRATTO[i.contratto]}`}
        numeri={[
          { etichetta: 'prezzo', valore: prezzoDi(i) },
          { etichetta: 'al m²', valore: i.prezzo_mq != null ? fmtEuro(i.prezzo_mq, 0) : '—' },
          { etichetta: 'giorni sul mercato', valore: i.pubblicato_il ? giorniTra(i.pubblicato_il, i.concluso_il ?? oggiIso()) : '—' },
          { etichetta: 'agente', valore: nomeAgente(agenti, i.agente_id) ?? '—' },
        ]}
        actions={<><Badge tone={st.tone}>{st.label}</Badge>
          {['disponibile', 'sotto_offerta'].includes(i.stato) && <>
            <Button asChild variant="outline"><Link to={`/immobiliare/visite?immobile=${i.id}`}>Fissa una visita</Link></Button>
            <Button asChild><Link to={`/immobiliare/trattative?immobile=${i.id}`}>Proposte</Link></Button></>}</>} />
      <Tabs value={scheda} onValueChange={(v) => setParams({ scheda: v })}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="scheda">Scheda</TabsTrigger><TabsTrigger value="proprietari">Proprietari</TabsTrigger><TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger value="incarico">Incarico</TabsTrigger><TabsTrigger value="valutazione">Valutazione</TabsTrigger><TabsTrigger value="annuncio">Annuncio</TabsTrigger>
          <TabsTrigger value="clienti">Clienti compatibili</TabsTrigger><TabsTrigger value="visite">Visite e proposte</TabsTrigger><TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="foto">Foto e file</TabsTrigger>
        </TabsList>
        <TabsContent value="scheda"><SchedaImmobile key={i.updated_at} i={i} /></TabsContent>
        <TabsContent value="proprietari"><Proprietari i={i} /></TabsContent>
        <TabsContent value="documenti"><Documenti i={i} /></TabsContent>
        <TabsContent value="incarico"><Incarichi i={i} /></TabsContent>
        <TabsContent value="valutazione"><SchedaValutazione i={i} /></TabsContent>
        <TabsContent value="annuncio"><SchedaAnnuncio i={i} /></TabsContent>
        <TabsContent value="clienti"><Compatibili i={i} /></TabsContent>
        <TabsContent value="visite"><VisiteProposte i={i} /></TabsContent>
        <TabsContent value="report"><SchedaReport i={i} /></TabsContent>
        <TabsContent value="foto"><Card className="p-5"><AllegatiSection entita="imm_immobili" entitaId={i.id} categorie={['foto', 'planimetria', 'video', 'virtual tour', 'brochure', 'documento']} /></Card></TabsContent>
      </Tabs>
    </div>
  )
}

const DOTAZIONI = [['giardino', 'Giardino'], ['garage', 'Garage'], ['posto_auto', 'Posto auto'], ['cantina', 'Cantina'], ['ascensore', 'Ascensore'], ['condizionamento', 'Aria condizionata']] as const

function SchedaImmobile({ i }: { i: Immobile }) {
  const salva = useSalva('imm_immobili', ['imm_prezzi', 'imm_annunci'])
  const [f, setF] = useState({ titolo: i.titolo ?? '', tipologia: i.tipologia, contratto: i.contratto, indirizzo: i.indirizzo, comune: i.comune, provincia: i.provincia ?? '',
    cap: i.cap ?? '', zona: i.zona ?? '', piano: i.piano ?? '', commerciale: campoNumero(i.superficie_commerciale), calpestabile: campoNumero(i.superficie_calpestabile),
    locali: campoNumero(i.locali), camere: campoNumero(i.camere), bagni: campoNumero(i.bagni), balconi: String(i.balconi), terrazzi: String(i.terrazzi),
    giardino: i.giardino, garage: i.garage, posto_auto: i.posto_auto, cantina: i.cantina, ascensore: i.ascensore, condizionamento: i.condizionamento, arredato: i.arredato,
    classe: i.classe_energetica ?? 'nessuna', ipe: campoNumero(i.ipe), conservazione: i.stato_conservazione ?? 'nessuno', anno: campoNumero(i.anno_costruzione),
    riscaldamento: i.riscaldamento ?? '', prezzo: campoNumero(i.prezzo), canone: campoNumero(i.canone), spese: campoNumero(i.spese_condominiali), stato: i.stato,
    agente: i.agente_id ?? 'nessuno', descrizione: i.descrizione ?? '', note: i.note ?? '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const n = (s: string) => s.trim() || null
  const registra = () => {
    if (!f.indirizzo.trim() || !f.comune.trim()) { toast.error('Indirizzo e comune sono obbligatori'); return }
    salva.mutate({ id: i.id, values: { titolo: n(f.titolo), tipologia: f.tipologia, contratto: f.contratto, indirizzo: f.indirizzo.trim(), comune: f.comune.trim(),
      provincia: n(f.provincia), cap: n(f.cap), zona: n(f.zona), piano: n(f.piano), superficie_commerciale: numeroONull(f.commerciale), superficie_calpestabile: numeroONull(f.calpestabile),
      locali: intONull(f.locali), camere: intONull(f.camere), bagni: intONull(f.bagni), balconi: intONull(f.balconi) ?? 0, terrazzi: intONull(f.terrazzi) ?? 0,
      giardino: f.giardino, garage: f.garage, posto_auto: f.posto_auto, cantina: f.cantina, ascensore: f.ascensore, condizionamento: f.condizionamento, arredato: f.arredato,
      classe_energetica: f.classe === 'nessuna' ? null : f.classe, ipe: numeroONull(f.ipe), stato_conservazione: f.conservazione === 'nessuno' ? null : f.conservazione,
      anno_costruzione: intONull(f.anno), riscaldamento: n(f.riscaldamento), prezzo: numeroONull(f.prezzo), canone: numeroONull(f.canone), spese_condominiali: numeroONull(f.spese),
      stato: f.stato, agente_id: f.agente === 'nessuno' ? null : f.agente, descrizione: n(f.descrizione), note: n(f.note) } }, {
      onSuccess: () => toast.success('Scheda salvata'), onError: errore })
  }
  const campo = (k: keyof typeof f, etichetta: string, classe = 'col-span-3 sm:col-span-2', decimale = false) => (
    <div className={cn(classe, 'space-y-1.5')}><Label htmlFor={`is-${k}`}>{etichetta}</Label>
      <Input id={`is-${k}`} inputMode={decimale ? 'decimal' : undefined} value={f[k] as string} onChange={set(k)} /></div>
  )
  return (
    <Card className="grid grid-cols-6 gap-3 p-5">
      {campo('titolo', 'Titolo', 'col-span-6 sm:col-span-4')}
      <div className="col-span-6 space-y-1.5 sm:col-span-2"><Label htmlFor="is-stato">Stato</Label>
        <Select value={f.stato} onValueChange={(v) => setF({ ...f, stato: v })}><SelectTrigger id="is-stato"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(IMMOBILE_STATO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="is-tipo">Tipologia</Label>
        <Select value={f.tipologia} onValueChange={(v) => setF({ ...f, tipologia: v })}><SelectTrigger id="is-tipo"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(TIPOLOGIA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
      <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="is-con">Per</Label>
        <Select value={f.contratto} onValueChange={(v) => setF({ ...f, contratto: v })}><SelectTrigger id="is-con"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(CONTRATTO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
      <CampoAgente id="is-ag" valore={f.agente} onChange={(v) => setF({ ...f, agente: v })} classe="col-span-6 sm:col-span-2" />
      {campo('indirizzo', 'Indirizzo', 'col-span-6 sm:col-span-3')}{campo('comune', 'Comune', 'col-span-3 sm:col-span-2')}{campo('provincia', 'Prov.', 'col-span-3 sm:col-span-1')}
      {campo('cap', 'CAP')}{campo('zona', 'Zona o quartiere')}{campo('piano', 'Piano')}
      {campo('commerciale', 'Superficie commerciale (m²)', undefined, true)}{campo('calpestabile', 'Calpestabile (m²)', undefined, true)}{campo('locali', 'Locali')}
      {campo('camere', 'Camere')}{campo('bagni', 'Bagni')}{campo('balconi', 'Balconi')}{campo('terrazzi', 'Terrazzi')}
      <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="is-arr">Arredato</Label>
        <Select value={f.arredato} onValueChange={(v) => setF({ ...f, arredato: v })}><SelectTrigger id="is-arr"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="parziale">In parte</SelectItem><SelectItem value="si">Sì</SelectItem></SelectContent></Select></div>
      <fieldset className="col-span-6 flex flex-wrap gap-x-5 gap-y-2"><legend className="sr-only">Dotazioni</legend>{DOTAZIONI.map(([k, l]) => (
        <label key={k} className="flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f[k]} onCheckedChange={(v) => setF({ ...f, [k]: v === true })} /> {l}</label>))}</fieldset>
      <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="is-cl">Classe energetica</Label>
        <Select value={f.classe} onValueChange={(v) => setF({ ...f, classe: v })}><SelectTrigger id="is-cl"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="nessuna">Non indicata</SelectItem>{CLASSI.map((c) => <SelectItem key={c} value={c}>{classeLabel(c)}</SelectItem>)}</SelectContent></Select></div>
      {campo('ipe', 'IPE (kWh/m² anno)', undefined, true)}
      <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="is-cons">Stato di conservazione</Label>
        <Select value={f.conservazione} onValueChange={(v) => setF({ ...f, conservazione: v })}><SelectTrigger id="is-cons"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="nessuno">Non indicato</SelectItem>{Object.entries(CONSERVAZIONE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
      {campo('anno', 'Anno di costruzione')}{campo('riscaldamento', 'Riscaldamento', 'col-span-6 sm:col-span-4')}
      {f.contratto !== 'affitto' && campo('prezzo', 'Prezzo richiesto (€)', undefined, true)}
      {f.contratto !== 'vendita' && campo('canone', 'Canone richiesto (€/mese)', undefined, true)}
      {campo('spese', 'Spese condominiali (€/mese)', undefined, true)}
      <div className="col-span-6 space-y-1.5"><Label htmlFor="is-desc">Descrizione commerciale</Label><Textarea id="is-desc" rows={4} value={f.descrizione} onChange={set('descrizione')} /></div>
      <div className="col-span-6 space-y-1.5"><Label htmlFor="is-note">Note interne</Label><Input id="is-note" value={f.note} onChange={set('note')} /></div>
      <div className="col-span-6 flex justify-end"><BottoneScrittura onClick={registra} disabled={salva.isPending}>Salva la scheda</BottoneScrittura></div>
    </Card>
  )
}

function Proprietari({ i }: { i: Immobile }) {
  const { data: righe = [], isLoading } = useElenco<Proprietario & { contatti: ContattoBreve | null; organizzazioni: { ragione_sociale: string } | null }>('imm_proprietari', {
    filtri: { immobile_id: i.id }, select: '*, contatti(id, nome, cognome, email, telefono), organizzazioni(ragione_sociale)', ordine: [{ colonna: 'quota_pct', crescente: false }] })
  const salva = useSalva('imm_proprietari')
  const elimina = useElimina('imm_proprietari')
  const { isAdmin } = useAuth()
  const [cliente, setCliente] = useState<Cliente>(clienteVuoto)
  const [quota, setQuota] = useState('100')
  const [titolo, setTitolo] = useState('piena_proprieta')
  const totale = righe.filter((r) => r.titolo === 'piena_proprieta').reduce((s, r) => s + Number(r.quota_pct), 0)
  async function aggiungi() {
    try {
      const contatto = await assicuraContatto(cliente)
      await salva.mutateAsync({ values: { immobile_id: i.id, contatto_id: contatto, quota_pct: numero(quota), titolo, referente: righe.length === 0 } })
      toast.success('Proprietario aggiunto'); setCliente(clienteVuoto); setQuota(String(Math.max(0, 100 - totale - numero(quota)) || 100))
    } catch (e) { errore(e) }
  }
  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-6 items-end gap-3 p-4">
        <CampoCliente id="pr-cli" etichetta="Proprietario" valore={cliente} onChange={setCliente} />
        <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="pr-quota">Quota (%)</Label><Input id="pr-quota" inputMode="decimal" value={quota} onChange={(e) => setQuota(e.target.value)} /></div>
        <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="pr-tit">Titolo</Label>
          <Select value={titolo} onValueChange={setTitolo}><SelectTrigger id="pr-tit"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TITOLO_PROPRIETA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <BottoneScrittura variant="outline" className="col-span-6 sm:col-span-2" onClick={aggiungi} disabled={!cliente.testo.trim() || salva.isPending}>Aggiungi</BottoneScrittura>
      </Card>
      {isLoading ? <Skeleton className="h-24" /> : righe.length === 0 ? (
        <EmptyState icon={Home} filtrato title="Nessun proprietario" description="Chi conferisce l'incarico, con la sua quota: possono essere più persone o una società." />
      ) : (
        <Card className="divide-y divide-border">{righe.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 flex-1">
              {r.contatto_id ? <Link to={`/contatti/${r.contatto_id}`} className="font-medium text-foreground hover:text-primary-testo">{nomeContatto(r.contatti)}</Link>
                : <span className="font-medium text-foreground">{r.organizzazioni?.ragione_sociale}</span>}
              <span className="block text-xs text-muted-foreground">{TITOLO_PROPRIETA[r.titolo]}{r.contatti?.telefono ? ` · ${r.contatti.telefono}` : ''}{r.contatti?.email ? ` · ${r.contatti.email}` : ''}</span>
            </span>
            <span className="tabular-nums text-foreground">{fmtNumero(r.quota_pct, 2)}%</span>
            {r.referente ? <Badge tone="info">Riceve il report</Badge> : <Button size="sm" variant="ghost" onClick={() => {
              for (const x of righe) if (x.referente) salva.mutate({ id: x.id, values: { referente: false } })
              salva.mutate({ id: r.id, values: { referente: true } }, { onSuccess: () => toast.success('Referente cambiato'), onError: errore })
            }}>Rendi referente</Button>}
            {isAdmin && <Button size="sm" variant="ghost" aria-label="Togli" onClick={() => elimina.mutate(r.id, { onError: errore })}><Trash2 className="h-3.5 w-3.5" /></Button>}
          </div>))}</Card>
      )}
      {righe.length > 0 && totale !== 100 && righe.some((r) => r.titolo === 'piena_proprieta') && <p className="text-sm text-warning-testo">Le quote di piena proprietà fanno {fmtNumero(totale, 2)}%: manca qualcuno?</p>}
    </div>
  )
}

function Documenti({ i }: { i: Immobile }) {
  const { data: documenti = [], isLoading } = useElenco<Documento>('imm_documenti', { filtri: { immobile_id: i.id }, ordine: [{ colonna: 'obbligatorio', crescente: false }, { colonna: 'tipo' }] })
  const salva = useSalva('imm_documenti', ['scadenze_moduli'])
  const [nuovo, setNuovo] = useState('regolamento_condominiale')
  const presenti = new Set(documenti.map((d) => d.tipo))
  const mancanti = documenti.filter((d) => d.obbligatorio && ['mancante', 'richiesto'].includes(d.stato)).length
  const cambia = (d: Documento, values: Partial<Documento>) => salva.mutate({ id: d.id, values }, { onError: errore })
  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground">{mancanti === 0 ? 'Documentazione completa.' : `Mancano ${mancanti} documenti che servono sempre.`}</p>
      {isLoading ? <Skeleton className="h-48" /> : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Stato</TableHead><TableHead>Ricevuto</TableHead><TableHead>Scadenza</TableHead><TableHead><span className="sr-only">File</span></TableHead></TableRow></TableHeader>
          <TableBody>{documenti.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="text-foreground">{d.descrizione ?? DOCUMENTO[d.tipo]}{d.obbligatorio && <span className="block text-xs text-muted-foreground">Serve sempre</span>}</TableCell>
              <TableCell><Select value={d.stato} onValueChange={(v) => cambia(d, { stato: v })}>
                <SelectTrigger className="h-8 w-40" aria-label={`Stato di ${DOCUMENTO[d.tipo]}`}><Badge tone={DOCUMENTO_STATO[d.stato].tone}>{DOCUMENTO_STATO[d.stato].label}</Badge></SelectTrigger>
                <SelectContent>{Object.entries(DOCUMENTO_STATO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></TableCell>
              <TableCell>{fmtData(d.ricevuto_il)}</TableCell>
              <TableCell><Input type="date" className="h-8 w-40" aria-label={`Scadenza di ${DOCUMENTO[d.tipo]}`} defaultValue={d.scadenza ?? ''}
                onBlur={(e) => (e.target.value || null) !== d.scadenza && cambia(d, { scadenza: e.target.value || null })} /></TableCell>
              <TableCell className="text-right"><FotoDialog entita="imm_documenti" entitaId={d.id} titolo={DOCUMENTO[d.tipo]} categorie={['documento', 'foto']} /></TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5"><Label htmlFor="dc-nuovo">Aggiungi un documento</Label>
          <Select value={nuovo} onValueChange={setNuovo}><SelectTrigger id="dc-nuovo" className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(DOCUMENTO).filter(([k]) => k === 'altro' || !presenti.has(k)).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <BottoneScrittura variant="outline" onClick={() => salva.mutate({ values: { immobile_id: i.id, tipo: nuovo } }, { onSuccess: () => toast.success('Documento in elenco'), onError: errore })}>Aggiungi</BottoneScrittura>
      </div>
      <p className="text-xs text-muted-foreground">Le scadenze (APE, certificazioni) arrivano tra le notifiche a 30, 7 e 1 giorno.</p>
    </div>
  )
}

function Incarichi({ i }: { i: Immobile }) {
  const { isManager } = useAuth()
  const { io, agenti } = useAgenti()
  const { data: incarichi = [], isLoading } = useElenco<Incarico>('imm_incarichi', { filtri: { immobile_id: i.id }, ordine: [{ colonna: 'conferito_il', crescente: false }] })
  const salva = useSalva('imm_incarichi', TABELLE_COMMERCIALI)
  const [nuovo, setNuovo] = useState<Incarico | 'nuovo' | null>(null)
  const puo = isManager || (!!io && io.agente_id === i.agente_id)
  return (
    <div className="space-y-3">
      {puo && <div className="flex justify-end"><BottoneScrittura variant="outline" onClick={() => setNuovo('nuovo')}><Plus className="h-4 w-4" /> Nuovo incarico</BottoneScrittura></div>}
      {isLoading ? <Skeleton className="h-32" /> : incarichi.length === 0 ? (
        <EmptyState icon={FileText} title="Nessun incarico" description="Con l'incarico firmato l'immobile va sul mercato e l'acquisizione è vinta."
          action={puo ? <BottoneScrittura variant="outline" onClick={() => setNuovo('nuovo')}>Nuovo incarico</BottoneScrittura> : undefined} filtrato={!puo} />
      ) : incarichi.map((c) => (
        <Card key={c.id} className="space-y-2 p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><p className="text-title text-foreground">{c.codice} · {c.tipo === 'vendita' ? 'Vendita' : 'Locazione'} {c.esclusiva ? 'in esclusiva' : 'non in esclusiva'}</p>
              <p className="text-muted-foreground">Dal {fmtData(c.conferito_il)} al {fmtData(c.scadenza)} · {c.durata_mesi} mesi{c.rinnovo_tacito ? ' · rinnovo tacito' : ''} · {nomeAgente(agenti, c.agente_id) ?? 'senza agente'}</p></div>
            <Badge tone={INCARICO_STATO[c.stato].tone}>{INCARICO_STATO[c.stato].label}</Badge>
          </div>
          <p className="text-foreground">Prezzo {fmtEuro(c.prezzo_richiesto, 0)}{c.prezzo_minimo != null ? ` · minimo ${fmtEuro(c.prezzo_minimo, 0)}` : ''} · provvigione{' '}
            {c.provvigione_fissa != null ? fmtEuro(c.provvigione_fissa) : `${fmtNumero(c.provvigione_pct, 2)}%`}{c.firmato_il ? ` · firmato il ${fmtData(c.firmato_il)}` : ' · da firmare'}</p>
          {(c.condizioni || c.obiettivi) && <p className="text-muted-foreground">{[c.condizioni, c.obiettivi && `Obiettivi: ${c.obiettivi}`].filter(Boolean).join(' · ')}</p>}
          {puo && c.stato === 'attivo' && <div className="flex flex-wrap justify-end gap-2">
            <Button asChild size="sm" variant="ghost"><Link to={`/immobiliare/contratti?immobile=${i.id}&incarico=${c.id}`}>Prepara il contratto</Link></Button>
            <Button size="sm" variant="ghost" onClick={() => setNuovo(c)}><Pencil className="h-3.5 w-3.5" /> Modifica</Button>
            <Button size="sm" variant="ghost" onClick={() => { if (window.confirm('Revocare l\'incarico? Senza altri incarichi l\'immobile esce dal mercato.')) salva.mutate({ id: c.id, values: { stato: 'revocato' } }, { onSuccess: () => toast.success('Incarico revocato'), onError: errore }) }}>Revoca</Button>
          </div>}
        </Card>))}
      {nuovo && <IncaricoDialog key={nuovo === 'nuovo' ? 'nuovo' : nuovo.id} i={i} incarico={nuovo === 'nuovo' ? null : nuovo} onClose={() => setNuovo(null)} />}
    </div>
  )
}

function IncaricoDialog({ i, incarico: c, onClose }: { i: Immobile; incarico: Incarico | null; onClose: () => void }) {
  const salva = useSalva('imm_incarichi', TABELLE_COMMERCIALI)
  const [f, setF] = useState({ tipo: c?.tipo ?? (i.contratto === 'affitto' ? 'locazione' : 'vendita'), esclusiva: c?.esclusiva ?? true, conferito: c?.conferito_il ?? oggiIso(),
    durata: String(c?.durata_mesi ?? 6), prezzo: campoNumero(c?.prezzo_richiesto ?? (i.contratto === 'affitto' ? i.canone : i.prezzo)), minimo: campoNumero(c?.prezzo_minimo),
    pct: campoNumero(c?.provvigione_pct), fissa: campoNumero(c?.provvigione_fissa), condizioni: c?.condizioni ?? '', obiettivi: c?.obiettivi ?? '',
    agente: c?.agente_id ?? i.agente_id ?? 'nessuno', rinnovo: c?.rinnovo_tacito ?? false, firmato: c?.firmato_il ?? '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const registra = () => salva.mutate({ id: c?.id, values: { immobile_id: i.id, tipo: f.tipo, esclusiva: f.esclusiva, conferito_il: f.conferito, durata_mesi: Math.round(numero(f.durata)) || 6,
    prezzo_richiesto: numeroONull(f.prezzo), prezzo_minimo: numeroONull(f.minimo), provvigione_pct: numeroONull(f.pct), provvigione_fissa: numeroONull(f.fissa),
    condizioni: f.condizioni.trim() || null, obiettivi: f.obiettivi.trim() || null, agente_id: f.agente === 'nessuno' ? null : f.agente, rinnovo_tacito: f.rinnovo,
    firmato_il: f.firmato || null } }, { onSuccess: () => { toast.success(c ? 'Incarico aggiornato' : 'Incarico acquisito: l\'immobile è sul mercato'); onClose() }, onError: errore })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{c ? `Incarico ${c.codice}` : 'Nuovo incarico'}</DialogTitle>
          <DialogDescription>La provvigione vuota prende quella dell'agenzia; la scadenza va tra le scadenze.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3 space-y-1.5"><Label htmlFor="in-tipo">Tipo</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })} disabled={!!c}><SelectTrigger id="in-tipo"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="vendita">Vendita</SelectItem><SelectItem value="locazione">Locazione</SelectItem></SelectContent></Select></div>
          <CampoAgente id="in-ag" valore={f.agente} onChange={(v) => setF({ ...f, agente: v })} />
          <div className="col-span-2 space-y-1.5"><Label htmlFor="in-dal">Conferito il</Label><Input id="in-dal" type="date" value={f.conferito} onChange={set('conferito')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="in-dur">Durata (mesi)</Label><Input id="in-dur" inputMode="numeric" value={f.durata} onChange={set('durata')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="in-firma">Firmato il</Label><Input id="in-firma" type="date" value={f.firmato} onChange={set('firmato')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="in-pr">{f.tipo === 'locazione' ? 'Canone richiesto (€/mese)' : 'Prezzo richiesto (€)'}</Label><Input id="in-pr" inputMode="decimal" value={f.prezzo} onChange={set('prezzo')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="in-min">Minimo concordato</Label><Input id="in-min" inputMode="decimal" value={f.minimo} onChange={set('minimo')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="in-pct">Provvigione (%)</Label><Input id="in-pct" inputMode="decimal" value={f.pct} onChange={set('pct')} placeholder="dell'agenzia" /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="in-fis">oppure importo fisso (€)</Label><Input id="in-fis" inputMode="decimal" value={f.fissa} onChange={set('fissa')} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="in-cond">Condizioni</Label><Textarea id="in-cond" rows={2} value={f.condizioni} onChange={set('condizioni')} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="in-ob">Obiettivi</Label><Input id="in-ob" value={f.obiettivi} onChange={set('obiettivi')} /></div>
          <label className="col-span-3 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.esclusiva} onCheckedChange={(v) => setF({ ...f, esclusiva: v === true })} /> In esclusiva</label>
          <label className="col-span-3 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.rinnovo} onCheckedChange={(v) => setF({ ...f, rinnovo: v === true })} /> Rinnovo tacito</label>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={salva.isPending}>{c ? 'Salva' : 'Registra l\'incarico'}</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type Correttivo = { voce: string; pct: string }

function SchedaValutazione({ i }: { i: Immobile }) {
  const [correttivi, setCorrettivi] = useState<Correttivo[]>([])
  const p_correttivi = correttivi.filter((c) => c.voce.trim() && c.pct.trim()).map((c) => ({ voce: c.voce.trim(), pct: numero(c.pct) }))
  const { data: s } = useRpc<Stima>('imm_stima', { p_immobile: i.id, p_correttivi })
  const { data: storico = [] } = useElenco<Valutazione>('imm_valutazioni', { filtri: { immobile_id: i.id }, ordine: [{ colonna: 'data', crescente: false }] })
  const salva = useSalva('imm_valutazioni', TABELLE_COMMERCIALI)
  const [agente, setAgente] = useState('')
  const [note, setNote] = useState('')
  const registra = () => salva.mutate({ values: { immobile_id: i.id, superficie: s?.superficie ?? null, comparabili: s?.comparabili ?? [], correttivi: p_correttivi, valore_mq: s?.valore_mq ?? null,
    valore_automatico: s?.valore ?? null, valore_agente: numeroONull(agente), valore_min: s?.valore_min ?? null, valore_max: s?.valore_max ?? null, note: note.trim() || null } }, {
    onSuccess: () => { toast.success('Valutazione registrata'); setAgente(''); setNote('') }, onError: errore })
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card className="space-y-4 p-5" id="relazione-valutazione">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-title text-foreground">Relazione di valutazione</h2><p className="text-sm text-muted-foreground">{i.codice} · {i.indirizzo}, {i.comune} · {fmtNumero(i.superficie_commerciale)} m²</p></div>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden"><Printer className="h-4 w-4" /> Stampa</Button>
        </div>
        {!s ? <Skeleton className="h-32" /> : s.valore == null ? (
          <p className="text-sm text-muted-foreground">{!i.superficie_commerciale ? 'Indica la superficie commerciale nella scheda.' : 'Nessun comparabile in archivio nello stesso comune e della stessa tipologia: la valutazione è quella dell\'agente.'}</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-muted-foreground">Valore al m²</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtEuro(s.valore_mq, 0)}</dd></div>
              <div><dt className="text-muted-foreground">Correttivi</dt><dd data-slot="kpi" className="text-title text-foreground">{s.correttivi_pct > 0 ? '+' : ''}{fmtNumero(s.correttivi_pct, 1)}%</dd></div>
              <div className="col-span-2"><dt className="text-muted-foreground">Valore stimato</dt><dd data-slot="kpi" className="text-display text-foreground">{fmtEuro(s.valore, 0)}</dd>
                <dd className="text-xs text-muted-foreground">tra {fmtEuro(s.valore_min, 0)} e {fmtEuro(s.valore_max, 0)}</dd></div>
            </dl>
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Comparabile</TableHead><TableHead numerica>m²</TableHead><TableHead numerica>Prezzo</TableHead><TableHead numerica>€/m²</TableHead><TableHead>Fonte</TableHead></TableRow></TableHeader>
              <TableBody>{s.comparabili.map((c) => <TableRow key={c.codice}><TableCell className="text-foreground">{c.codice} · {c.indirizzo}</TableCell><TableCell numerica>{fmtNumero(c.superficie)}</TableCell>
                <TableCell numerica>{fmtEuro(c.prezzo, 0)}</TableCell><TableCell numerica>{fmtEuro(c.prezzo_mq, 0)}</TableCell><TableCell>{c.fonte}</TableCell></TableRow>)}</TableBody>
            </Table></div>
          </>
        )}
        {s && s.storico_prezzi.length > 1 && <p className="text-sm text-muted-foreground">Storico dei prezzi: {s.storico_prezzi.map((x) => `${fmtData(x.dal)} ${fmtEuro(x.prezzo ?? x.canone, 0)}`).join(' → ')}</p>}
      </Card>
      <div className="space-y-4">
        <Card className="space-y-3 p-5 print:hidden">
          <h3 className="text-title text-foreground">Correttivi</h3>
          {correttivi.map((c, k) => (
            <div key={k} className="flex gap-2">
              <Input aria-label="Voce del correttivo" placeholder="Piano alto, da ristrutturare…" value={c.voce} onChange={(e) => setCorrettivi(correttivi.map((x, j) => (j === k ? { ...x, voce: e.target.value } : x)))} />
              <Input aria-label="Percentuale" className="w-24" inputMode="decimal" placeholder="+5" value={c.pct} onChange={(e) => setCorrettivi(correttivi.map((x, j) => (j === k ? { ...x, pct: e.target.value } : x)))} />
              <Button variant="ghost" size="icon" aria-label="Togli il correttivo" onClick={() => setCorrettivi(correttivi.filter((_, j) => j !== k))}><Trash2 className="h-4 w-4" /></Button>
            </div>))}
          <Button variant="outline" size="sm" onClick={() => setCorrettivi([...correttivi, { voce: '', pct: '' }])}><Plus className="h-3.5 w-3.5" /> Correttivo</Button>
          <div className="space-y-1.5"><Label htmlFor="va-ag">Valutazione dell'agente (€)</Label><Input id="va-ag" inputMode="decimal" value={agente} onChange={(e) => setAgente(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="va-note">Note per il proprietario</Label><Textarea id="va-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <BottoneScrittura onClick={registra} disabled={salva.isPending || (!s?.valore && !agente.trim())}>Registra la valutazione</BottoneScrittura>
        </Card>
        {storico.length > 0 && <Card className="p-5 print:hidden"><h3 className="mb-2 text-title text-foreground">Valutazioni fatte</h3>
          <ul className="divide-y divide-border text-sm">{storico.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-2 py-2"><span className="min-w-0 flex-1 text-foreground">{fmtData(v.data)} · {fmtEuro(v.valore_agente ?? v.valore_automatico, 0)}
              <span className="block text-xs text-muted-foreground">automatica {fmtEuro(v.valore_automatico, 0)}{v.presentata_il ? ` · presentata il ${fmtData(v.presentata_il)}` : ''}</span></span>
              {!v.presentata_il && <BottoneScrittura size="sm" variant="outline" onClick={() => salva.mutate({ id: v.id, values: { presentata_il: oggiIso() } }, { onSuccess: () => toast.success('Presentata: ora la proposta di incarico'), onError: errore })}>Presentata al proprietario</BottoneScrittura>}
            </li>))}</ul></Card>}
      </div>
    </div>
  )
}

function SchedaAnnuncio({ i }: { i: Immobile }) {
  const { data: annunci = [], isLoading } = useElenco<Annuncio>('imm_annunci', { filtri: { immobile_id: i.id } })
  const a = annunci[0]
  if (isLoading) return <Skeleton className="h-48" />
  return <FormAnnuncio key={a?.updated_at ?? 'nuovo'} i={i} a={a ?? null} />
}

function FormAnnuncio({ i, a }: { i: Immobile; a: Annuncio | null }) {
  const salva = useSalva('imm_annunci')
  const [f, setF] = useState({ titolo: a?.titolo ?? i.titolo ?? '', descrizione: a?.descrizione ?? i.descrizione ?? '', portali: a?.portali ?? [], video: a?.video_url ?? '', tour: a?.tour_url ?? '',
    sito: a?.sito ?? true, social: a?.social ?? false })
  const sulMercato = ['disponibile', 'sotto_offerta'].includes(i.stato)
  const registra = (stato?: string) => {
    if (!f.titolo.trim() || !f.descrizione.trim()) { toast.error('Titolo e descrizione servono all\'annuncio'); return }
    salva.mutate({ id: a?.id, values: { immobile_id: i.id, titolo: f.titolo.trim(), descrizione: f.descrizione.trim(), portali: f.portali, video_url: f.video.trim() || null,
      tour_url: f.tour.trim() || null, sito: f.sito, social: f.social, ...(stato ? { stato } : {}) } }, {
      onSuccess: () => toast.success(stato === 'pubblicato' ? 'Annuncio pubblicato: è nel feed per i portali' : stato === 'sospeso' ? 'Annuncio sospeso' : 'Annuncio salvato'), onError: errore })
  }
  return (
    <Card className="grid grid-cols-6 gap-3 p-5">
      <div className="col-span-6 flex flex-wrap items-center justify-between gap-2"><h2 className="text-title text-foreground">Annuncio</h2>
        {a && <Badge tone={ANNUNCIO_STATO[a.stato].tone}>{ANNUNCIO_STATO[a.stato].label}{a.pubblicato_il ? ` dal ${fmtData(a.pubblicato_il)}` : ''}</Badge>}</div>
      <div className="col-span-6 space-y-1.5"><Label htmlFor="an-tit">Titolo</Label><Input id="an-tit" value={f.titolo} onChange={(e) => setF({ ...f, titolo: e.target.value })} /></div>
      <div className="col-span-6 space-y-1.5"><Label htmlFor="an-desc">Descrizione commerciale</Label><Textarea id="an-desc" rows={6} value={f.descrizione} onChange={(e) => setF({ ...f, descrizione: e.target.value })} /></div>
      <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="an-vid">Video</Label><Input id="an-vid" type="url" value={f.video} onChange={(e) => setF({ ...f, video: e.target.value })} placeholder="https://" /></div>
      <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="an-tour">Virtual tour</Label><Input id="an-tour" type="url" value={f.tour} onChange={(e) => setF({ ...f, tour: e.target.value })} placeholder="https://" /></div>
      <fieldset className="col-span-6"><legend className="mb-2 text-sm font-medium text-foreground">Dove pubblicarlo</legend>
        <div className="flex flex-wrap gap-1.5">{PORTALI.map((p) => {
          const on = f.portali.includes(p)
          return <Button key={p} type="button" size="sm" variant={on ? 'default' : 'outline'} aria-pressed={on} onClick={() => setF({ ...f, portali: on ? f.portali.filter((x) => x !== p) : [...f.portali, p] })}>{p}</Button>
        })}</div>
        <p className="mt-1 text-xs text-muted-foreground">Il collegamento automatico con i portali è predisposto: oggi si scarica il feed da «Marketing» e lo si carica sul portale. Foto, planimetrie e brochure stanno in «Foto e file».</p></fieldset>
      <div className="col-span-6 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => registra()} disabled={salva.isPending}>Salva</Button>
        {a?.stato === 'pubblicato' ? <Button variant="ghost" onClick={() => registra('sospeso')}>Sospendi</Button>
          : <BottoneScrittura onClick={() => registra('pubblicato')} disabled={salva.isPending || !sulMercato} title={sulMercato ? undefined : 'Si pubblica un immobile sul mercato'}>Pubblica</BottoneScrittura>}
      </div>
    </Card>
  )
}

function Compatibili({ i }: { i: Immobile }) {
  const { data: match = [], isLoading } = useRpc<MatchImmobile[]>('imm_match_immobile', { p_immobile: i.id })
  const { data: richieste = [] } = useElenco<Richiesta & { contatti: ContattoBreve | null }>('imm_richieste', { filtri: { id: match.map((m) => m.richiesta_id) },
    select: '*, contatti(id, nome, cognome, email, telefono)', abilitato: match.length > 0 })
  if (isLoading) return <Skeleton className="h-32" />
  if (i.stato !== 'disponibile') return <EmptyState icon={Send} filtrato title="L'immobile non è disponibile" description="Il matching considera gli immobili sul mercato e non già sotto offerta." />
  if (match.length === 0) return <EmptyState icon={Send} filtrato title="Nessun cliente lo sta cercando" description="Appena entra una richiesta compatibile compare qui; l'agente è avvisato." />
  return (
    <Card className="divide-y divide-border">{match.map((m) => {
      const r = richieste.find((x) => x.id === m.richiesta_id)
      return (
        <div key={m.richiesta_id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
          <span className={cn('flex h-10 w-12 items-center justify-center rounded-md font-medium tabular-nums', m.punteggio >= 80 ? 'bg-success-tenue text-success-testo' : 'bg-warning-tenue text-warning-testo')}>{m.punteggio}</span>
          <span className="min-w-0 flex-1"><Link to={`/immobiliare/richieste/${m.richiesta_id}`} className="font-medium text-foreground hover:text-primary-testo">{nomeContatto(r?.contatti)}</Link>
            <span className="block text-xs text-muted-foreground">{m.motivi.length ? m.motivi.join(', ') : 'Risponde a tutto quello che cerca'}{r?.contatti?.telefono ? ` · ${r.contatti.telefono}` : ''}</span></span>
          <Button asChild size="sm" variant="outline"><Link to={`/immobiliare/visite?immobile=${i.id}&contatto=${m.contatto_id}`}>Fissa una visita</Link></Button>
        </div>
      )
    })}</Card>
  )
}

function VisiteProposte({ i }: { i: Immobile }) {
  const { data: visite = [] } = useElenco<Visita & { contatti: ContattoBreve | null }>('imm_visite', { filtri: { immobile_id: i.id }, select: '*, contatti(id, nome, cognome, email, telefono)',
    ordine: [{ colonna: 'inizio', crescente: false }] })
  const { data: proposte = [] } = useElenco<Proposta & { contatti: ContattoBreve | null }>('imm_proposte', { filtri: { immobile_id: i.id }, select: '*, contatti(id, nome, cognome, email, telefono)',
    ordine: [{ colonna: 'created_at', crescente: false }] })
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5"><h3 className="mb-2 text-title text-foreground">Visite ({visite.length})</h3>
        {visite.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna visita.</p> : (
          <ul className="divide-y divide-border text-sm">{visite.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-2 py-2"><span className="min-w-0 flex-1 text-foreground">{nomeContatto(v.contatti)}
              <span className="block text-xs text-muted-foreground">{fmtGiornoOra(v.inizio)}{v.numero > 1 ? ` · ${v.numero}ª visita` : ''}{v.feedback ? ` · «${v.feedback}»` : ''}</span></span>
              {v.gradimento && <span className="text-xs text-muted-foreground">{v.gradimento}/5</span>}
              <Badge tone={VISITA_STATO[v.stato].tone}>{VISITA_STATO[v.stato].label}</Badge></li>))}</ul>)}
      </Card>
      <Card className="p-5"><h3 className="mb-2 text-title text-foreground">Proposte ({proposte.length})</h3>
        {proposte.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna proposta.</p> : (
          <ul className="divide-y divide-border text-sm">{proposte.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 py-2"><span className="min-w-0 flex-1 text-foreground">{p.da === 'proprietario' ? 'Controproposta del proprietario' : nomeContatto(p.contatti)}
              <span className="block text-xs text-muted-foreground">{p.codice} · {fmtData(p.created_at)}{p.scadenza ? ` · scade il ${fmtData(p.scadenza)}` : ''}</span></span>
              <span className="tabular-nums text-foreground">{fmtEuro(p.prezzo_offerto, 0)}</span><Badge tone={PROPOSTA_STATO[p.stato].tone}>{PROPOSTA_STATO[p.stato].label}</Badge></li>))}</ul>)}
        <Button asChild variant="link" className="mt-1 px-0"><Link to={`/immobiliare/trattative?immobile=${i.id}`}>Gestisci le proposte</Link></Button>
      </Card>
    </div>
  )
}

function SchedaReport({ i }: { i: Immobile }) {
  const { data: r, isLoading } = useRpc<Report>('imm_report', { p_immobile: i.id })
  const invia = useAzione('imm_invia_report', ['imm_report_inviati'])
  const { data: inviati = [] } = useElenco<{ id: string; inviato_il: string; destinatari: number }>('imm_report_inviati', { filtri: { immobile_id: i.id }, select: 'id, inviato_il, destinatari',
    ordine: [{ colonna: 'inviato_il', crescente: false }], limite: 5 })
  if (isLoading || !r) return <Skeleton className="h-48" />
  const voce = (l: string, v: string) => <div key={l} className="flex justify-between py-1.5"><dt className="text-muted-foreground">{l}</dt><dd className="tabular-nums text-foreground">{v}</dd></div>
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5"><h3 className="mb-2 text-title text-foreground">Andamento</h3>
        <dl className="divide-y divide-border text-sm">{[
          voce('Giorni sul mercato', r.giorni_sul_mercato != null ? String(r.giorni_sul_mercato) : '—'), voce('Visite', `${r.visite} (ultimi 30 giorni: ${r.visite_30_giorni})`),
          voce('Richieste di informazioni', String(r.richieste)), voce('Clienti compatibili in archivio', String(r.clienti_compatibili)),
          voce('Prezzo iniziale', fmtEuro(r.prezzo_iniziale, 0)), voce('Prezzo attuale', fmtEuro(r.prezzo_attuale, 0)),
          voce('Riduzioni di prezzo', r.riduzioni ? `${r.riduzioni} (−${fmtNumero(r.riduzione_pct, 1)}%)` : 'nessuna'),
          voce('Proposte ricevute', String(r.offerte)), voce('Proposta migliore', fmtEuro(r.offerta_migliore, 0)),
          voce('Probabilità di vendita', `${r.probabilita}%`), voce('Gradimento medio delle visite', r.gradimento_medio != null ? `${fmtNumero(r.gradimento_medio, 1)} su 5` : '—'),
          voce('Attività dell\'agente (30 giorni)', String(r.attivita_agente)),
        ]}</dl>
      </Card>
      <Card className="space-y-3 p-5"><h3 className="text-title text-foreground">Cosa dicono i clienti</h3>
        {r.commenti.length === 0 ? <p className="text-sm text-muted-foreground">Ancora nessun commento dalle visite.</p> : <ul className="space-y-1 text-sm">{r.commenti.map((c, k) => <li key={k} className="text-foreground">«{c}»</li>)}</ul>}
        <BottoneScrittura variant="outline" disabled={invia.isPending} onClick={() => invia.mutate({ p_immobile: i.id }, {
          onSuccess: (n) => toast.success(Number(n) > 0 ? `Report inviato a ${n} proprietari` : 'Nessun proprietario con l\'email: il report è registrato'), onError: errore })}>
          <Send className="h-4 w-4" /> Invia il report al proprietario</BottoneScrittura>
        <p className="text-xs text-muted-foreground">Parte da solo ogni {inviati.length ? 'periodo' : '30 giorni'} per gli immobili sul mercato. {inviati.length > 0 && `Ultimi invii: ${inviati.map((x) => fmtData(x.inviato_il)).join(', ')}.`}</p>
      </Card>
    </div>
  )
}
