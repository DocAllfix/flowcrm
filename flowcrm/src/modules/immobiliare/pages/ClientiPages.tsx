/**
 * I clienti dell'agenzia: richieste di acquirenti e conduttori (§4–5) con il
 * matching domanda/offerta (§12), lead con la loro pipeline (§11), CRM dei
 * proprietari con il report (§23).
 */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Inbox, Plus, Search, Send, Star, UserRound, X } from 'lucide-react'
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
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { cn } from '@/lib/utils'
import { useElenco, useRiga, useRpc, useSalva, useAzione, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { ConAgenzia } from '@/modules/immobiliare/componenti/ConAgenzia'
import { CampoAgente, CampoCliente, CampoImmobile, assicuraContatto, clienteVuoto, type Cliente } from '@/modules/immobiliare/componenti/Scelte'
import { useAgenti, nomeAgente, etichettaImmobile, TABELLE_COMMERCIALI, type ContattoBreve, type Immobile, type Lead, type Match, type Proprietario, type Richiesta,
  type Selezione, type Visita, type Proposta } from '@/modules/immobiliare/queries'
import { IMMOBILE_STATO, LEAD_STATO, LEAD_TIPO, ORIGINE, PRIORITA, REQUISITI, RICHIESTA_STATO, SELEZIONE_STATO, TIPOLOGIA, TIPO_CLIENTE, VISITA_STATO, campoNumero,
  elenco, fmtData, fmtEuro, fmtGiornoOra, giorniTra, intONull, nomeContatto, numeroONull, oggiIso } from '@/modules/immobiliare/stati'

const errore = (e: unknown) => toast.error(messaggioErrore(e))

// ── Richieste ───────────────────────────────────────────────────────────
export function RichiestePage() {
  return <ConAgenzia><Richieste_ /></ConAgenzia>
}

function Richieste_() {
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') ?? 'attiva'
  const [q, setQ] = useState('')
  const [nuova, setNuova] = useState(false)
  const { agenti } = useAgenti()
  const { data: richieste = [], isLoading } = useElenco<Richiesta & { contatti: ContattoBreve | null }>('imm_richieste', {
    select: '*, contatti(id, nome, cognome, email, telefono)', ordine: [{ colonna: 'created_at', crescente: false }] })
  const cerca = q.trim().toLowerCase()
  const visibili = richieste.filter((r) => r.stato === vista && (!cerca || [nomeContatto(r.contatti), r.codice, r.comuni.join(' ')].some((x) => x?.toLowerCase().includes(cerca))))
  const conta = (s: string) => richieste.filter((r) => r.stato === s).length
  return (
    <div>
      <PageHeader title="Richieste e matching" description="Chi cerca casa, in acquisto o in affitto, con quello che vuole: il sistema propone gli immobili compatibili."
        numeri={[
          { etichetta: 'attive', valore: isLoading ? undefined : conta('attiva'), inCaricamento: isLoading },
          { etichetta: 'in acquisto', valore: isLoading ? undefined : richieste.filter((r) => r.stato === 'attiva' && r.tipo === 'acquisto').length, inCaricamento: isLoading },
          { etichetta: 'in affitto', valore: isLoading ? undefined : richieste.filter((r) => r.stato === 'attiva' && r.tipo === 'affitto').length, inCaricamento: isLoading },
        ]}
        actions={<BottoneScrittura onClick={() => setNuova(true)}><Plus className="h-4 w-4" /> Nuova richiesta</BottoneScrittura>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Cliente o comune" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca" />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtra">{Object.entries(RICHIESTA_STATO).map(([k, v]) => (
          <Button key={k} size="sm" variant={vista === k ? 'default' : 'outline'} aria-pressed={vista === k} onClick={() => setParams(k === 'attiva' ? {} : { vista: k })}>
            {v.label} <span className="tabular-nums opacity-70">{conta(k)}</span></Button>))}</div>
      </div>
      {isLoading ? <Skeleton className="h-64" /> : visibili.length === 0 ? (
        richieste.length === 0
          ? <EmptyState icon={Search} title="Nessuna richiesta" description="Ogni cliente che cerca un immobile: budget, zona, camere, requisiti. Le richieste nascono anche dai lead convertiti."
              action={<BottoneScrittura variant="outline" onClick={() => setNuova(true)}>Nuova richiesta</BottoneScrittura>} />
          : <EmptyState icon={Search} filtrato title="Nessuna richiesta con questo filtro" description="Cambia la ricerca o il filtro." />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Cerca</TableHead><TableHead>Dove</TableHead><TableHead numerica>Budget</TableHead><TableHead>Agente</TableHead><TableHead>Dal</TableHead></TableRow></TableHeader>
          <TableBody>{visibili.map((r) => (
            <TableRow key={r.id}>
              <TableCell><Link to={`/immobiliare/richieste/${r.id}`} className="font-medium text-foreground hover:text-primary-testo">{nomeContatto(r.contatti)}</Link>
                <span className="block text-xs text-muted-foreground">{r.codice} · {TIPO_CLIENTE[r.tipo_cliente]}{r.finanziamento ? ' · con mutuo' : ''}</span></TableCell>
              <TableCell className="text-sm">{r.tipo === 'acquisto' ? 'Acquisto' : 'Affitto'}{r.tipologie.length ? ` · ${r.tipologie.map((t) => TIPOLOGIA[t]).join(', ')}` : ''}
                <span className="block text-xs text-muted-foreground">{[r.camere_min != null && `${r.camere_min}+ camere`, r.superficie_min != null && `${r.superficie_min}+ m²`,
                  ...r.requisiti.map((x) => REQUISITI[x]?.toLowerCase())].filter(Boolean).join(', ')}</span></TableCell>
              <TableCell className="text-sm">{r.comuni.join(', ') || 'Ovunque'}{r.zone.length ? <span className="block text-xs text-muted-foreground">{r.zone.join(', ')}</span> : null}</TableCell>
              <TableCell numerica>{r.budget_max != null ? `${r.budget_min != null ? `${fmtEuro(r.budget_min, 0)}–` : 'fino a '}${fmtEuro(r.budget_max, 0)}` : '—'}</TableCell>
              <TableCell className="text-sm">{nomeAgente(agenti, r.agente_id) ?? '—'}</TableCell>
              <TableCell>{fmtData(r.created_at)}</TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      {nuova && <RichiestaDialog onClose={() => setNuova(false)} />}
    </div>
  )
}

export function RichiestaDialog({ richiesta: r, onClose }: { richiesta?: Richiesta | null; onClose: () => void }) {
  const navigate = useNavigate()
  const { io } = useAgenti()
  const salva = useSalva('imm_richieste')
  const [cliente, setCliente] = useState<Cliente>(clienteVuoto)
  const [f, setF] = useState({ tipo: r?.tipo ?? 'acquisto', tipo_cliente: r?.tipo_cliente ?? 'privato', tipologie: r?.tipologie ?? [], comuni: r?.comuni.join(', ') ?? '',
    zone: r?.zone.join(', ') ?? '', min: campoNumero(r?.budget_min), max: campoNumero(r?.budget_max), sup: campoNumero(r?.superficie_min), camere: campoNumero(r?.camere_min),
    bagni: campoNumero(r?.bagni_min), requisiti: r?.requisiti ?? [], finanziamento: r?.finanziamento ?? false, tempistica: r?.tempistica ?? '', preferenze: r?.preferenze ?? '',
    reddito: campoNumero(r?.reddito_mensile), garanzie: r?.garanzie ?? '', referenze: r?.referenze ?? '', agente: r?.agente_id ?? io?.agente_id ?? 'nessuno', stato: r?.stato ?? 'attiva' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const alterna = (k: 'tipologie' | 'requisiti', v: string) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] })
  async function registra(e: FormEvent) {
    e.preventDefault()
    try {
      const contatto_id = r?.contatto_id ?? await assicuraContatto(cliente)
      const x = await salva.mutateAsync({ id: r?.id, values: { contatto_id, tipo: f.tipo, tipo_cliente: f.tipo_cliente, tipologie: f.tipologie, comuni: elenco(f.comuni), zone: elenco(f.zone),
        budget_min: numeroONull(f.min), budget_max: numeroONull(f.max), superficie_min: numeroONull(f.sup), camere_min: intONull(f.camere), bagni_min: intONull(f.bagni),
        requisiti: f.requisiti, finanziamento: f.finanziamento, tempistica: f.tempistica.trim() || null, preferenze: f.preferenze.trim() || null,
        reddito_mensile: numeroONull(f.reddito), garanzie: f.garanzie.trim() || null, referenze: f.referenze.trim() || null, agente_id: f.agente === 'nessuno' ? null : f.agente,
        stato: f.stato } })
      toast.success(r ? 'Richiesta aggiornata' : 'Richiesta registrata: ecco gli immobili compatibili')
      onClose()
      if (!r) navigate(`/immobiliare/richieste/${x.id}`)
    } catch (err) { errore(err) }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{r ? `Richiesta ${r.codice}` : 'Nuova richiesta'}</DialogTitle>
          <DialogDescription>Più è precisa, più il matching è utile. I comuni e le zone si scrivono separati da virgole.</DialogDescription></DialogHeader>
        <form onSubmit={registra} className="grid grid-cols-6 gap-3">
          {!r && <CampoCliente id="rq-cli" valore={cliente} onChange={setCliente} />}
          <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="rq-tipo">Cerca in</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="rq-tipo"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="acquisto">Acquisto</SelectItem><SelectItem value="affitto">Affitto</SelectItem></SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="rq-tc">Cliente</Label>
            <Select value={f.tipo_cliente} onValueChange={(v) => setF({ ...f, tipo_cliente: v })}><SelectTrigger id="rq-tc"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TIPO_CLIENTE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <CampoAgente id="rq-ag" valore={f.agente} onChange={(v) => setF({ ...f, agente: v })} classe="col-span-6 sm:col-span-2" />
          <fieldset className="col-span-6"><legend className="mb-1.5 text-sm font-medium text-foreground">Tipologie (nessuna = qualsiasi)</legend>
            <div className="flex flex-wrap gap-1.5">{['appartamento', 'villa', 'villetta', 'ufficio', 'negozio', 'box', 'terreno', 'capannone', 'nuova_costruzione'].map((t) => (
              <Button key={t} type="button" size="sm" variant={f.tipologie.includes(t) ? 'default' : 'outline'} aria-pressed={f.tipologie.includes(t)} onClick={() => alterna('tipologie', t)}>{TIPOLOGIA[t]}</Button>))}</div></fieldset>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="rq-com">Comuni</Label><Input id="rq-com" value={f.comuni} onChange={set('comuni')} placeholder="Milano, Sesto San Giovanni" /></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="rq-zone">Zone</Label><Input id="rq-zone" value={f.zone} onChange={set('zone')} placeholder="Centro, Navigli" /></div>
          <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="rq-min">Budget minimo (€)</Label><Input id="rq-min" inputMode="decimal" value={f.min} onChange={set('min')} /></div>
          <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="rq-max">Budget massimo (€)</Label><Input id="rq-max" inputMode="decimal" value={f.max} onChange={set('max')} /></div>
          <div className="col-span-2 space-y-1.5 sm:col-span-2"><Label htmlFor="rq-sup">Almeno m²</Label><Input id="rq-sup" inputMode="decimal" value={f.sup} onChange={set('sup')} /></div>
          <div className="col-span-2 space-y-1.5 sm:col-span-1"><Label htmlFor="rq-cam">Camere</Label><Input id="rq-cam" inputMode="numeric" value={f.camere} onChange={set('camere')} /></div>
          <div className="col-span-2 space-y-1.5 sm:col-span-1"><Label htmlFor="rq-bag">Bagni</Label><Input id="rq-bag" inputMode="numeric" value={f.bagni} onChange={set('bagni')} /></div>
          <fieldset className="col-span-6"><legend className="mb-1.5 text-sm font-medium text-foreground">Requisiti</legend>
            <div className="flex flex-wrap gap-1.5">{Object.entries(REQUISITI).map(([k, l]) => (
              <Button key={k} type="button" size="sm" variant={f.requisiti.includes(k) ? 'default' : 'outline'} aria-pressed={f.requisiti.includes(k)} onClick={() => alterna('requisiti', k)}>{l}</Button>))}</div></fieldset>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="rq-tem">Tempistica</Label><Input id="rq-tem" value={f.tempistica} onChange={set('tempistica')} placeholder="Entro sei mesi" /></div>
          <label className="col-span-6 flex items-end gap-2 pb-2 text-sm text-foreground sm:col-span-3"><Checkbox checked={f.finanziamento} onCheckedChange={(v) => setF({ ...f, finanziamento: v === true })} /> Serve un mutuo</label>
          {f.tipo === 'affitto' && <>
            <div className="col-span-6 space-y-1.5 sm:col-span-2"><Label htmlFor="rq-red">Reddito mensile (€)</Label><Input id="rq-red" inputMode="decimal" value={f.reddito} onChange={set('reddito')} /></div>
            <div className="col-span-6 space-y-1.5 sm:col-span-2"><Label htmlFor="rq-gar">Garanzie</Label><Input id="rq-gar" value={f.garanzie} onChange={set('garanzie')} placeholder="Fideiussione, garante…" /></div>
            <div className="col-span-6 space-y-1.5 sm:col-span-2"><Label htmlFor="rq-ref">Referenze</Label><Input id="rq-ref" value={f.referenze} onChange={set('referenze')} /></div>
          </>}
          <div className="col-span-6 space-y-1.5"><Label htmlFor="rq-pref">Preferenze e note</Label><Textarea id="rq-pref" rows={2} value={f.preferenze} onChange={set('preferenze')} /></div>
          {r && <div className="col-span-3 space-y-1.5"><Label htmlFor="rq-st">Stato</Label>
            <Select value={f.stato} onValueChange={(v) => setF({ ...f, stato: v })}><SelectTrigger id="rq-st"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(RICHIESTA_STATO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>}
          <DialogFooter className="col-span-6">
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={salva.isPending || (!r && !cliente.testo.trim())}>{r ? 'Salva' : 'Registra la richiesta'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RichiestaPage() {
  return <ConAgenzia><Richiesta_ /></ConAgenzia>
}

function Richiesta_() {
  const { id } = useParams<{ id: string }>()
  const { data: r, isLoading } = useRiga<Richiesta & { contatti: ContattoBreve | null }>('imm_richieste', id, '*, contatti(id, nome, cognome, email, telefono)')
  const { data: match = [] } = useRpc<Match[]>('imm_match', { p_richiesta: id }, { abilitato: !!id })
  const { data: selezioni = [] } = useElenco<Selezione>('imm_selezioni', { filtri: { richiesta_id: id }, abilitato: !!id })
  const ids = [...new Set([...match.map((m) => m.immobile_id), ...selezioni.map((s) => s.immobile_id)])]
  const { data: immobili = [] } = useElenco<Immobile>('imm_immobili', { filtri: { id: ids }, abilitato: ids.length > 0 })
  const { data: visite = [] } = useElenco<Visita>('imm_visite', { filtri: { contatto_id: r?.contatto_id }, ordine: [{ colonna: 'inizio', crescente: false }], abilitato: !!r })
  const proponi = useAzione('imm_proponi', ['imm_selezioni'])
  const invia = useAzione('imm_invia_selezione', ['imm_selezioni'])
  const salvaSel = useSalva('imm_selezioni')
  const [modifica, setModifica] = useState(false)
  const [soglia, setSoglia] = useState('60')
  if (isLoading) return <Skeleton className="h-96" />
  if (!r) return <EmptyState icon={Search} filtrato title="Richiesta non trovata" description="Potrebbe essere stata eliminata." />
  const imm = (iid: string) => immobili.find((x) => x.id === iid)
  const sel = (iid: string) => selezioni.find((x) => x.immobile_id === iid)
  const daInviare = selezioni.filter((s) => s.stato === 'proposto').length
  return (
    <div>
      <PageHeader title={nomeContatto(r.contatti)} briciole={[{ label: 'Richieste e matching', to: '/immobiliare/richieste' }, { label: r.codice ?? '' }]}
        description={`${r.tipo === 'acquisto' ? 'Cerca da comprare' : 'Cerca in affitto'} · ${r.comuni.join(', ') || 'ovunque'}${r.budget_max != null ? ` · fino a ${fmtEuro(r.budget_max, 0)}` : ''}`
          + `${r.contatti?.telefono ? ` · ${r.contatti.telefono}` : ''}`}
        numeri={[
          { etichetta: 'immobili compatibili', valore: match.length },
          { etichetta: 'proposti', valore: selezioni.length },
          { etichetta: 'visite', valore: visite.filter((v) => v.stato === 'svolta').length },
        ]}
        actions={<><Badge tone={RICHIESTA_STATO[r.stato].tone}>{RICHIESTA_STATO[r.stato].label}</Badge>
          <Button variant="outline" onClick={() => setModifica(true)}>Modifica</Button>
          <BottoneScrittura disabled={daInviare === 0 || invia.isPending} onClick={() => invia.mutate({ p_richiesta: r.id }, { onSuccess: (n) => toast.success(`${n} immobili inviati al cliente`), onError: errore })}>
            <Send className="h-4 w-4" /> Invia la selezione{daInviare ? ` (${daInviare})` : ''}</BottoneScrittura></>} />
      {modifica && <RichiestaDialog richiesta={r} onClose={() => setModifica(false)} />}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-title text-foreground">Immobili compatibili</h2>
            <div className="flex items-end gap-2"><div className="space-y-1"><Label htmlFor="rs-soglia" className="text-xs">Punteggio minimo</Label>
              <Input id="rs-soglia" className="h-8 w-20" inputMode="numeric" value={soglia} onChange={(e) => setSoglia(e.target.value)} /></div>
              <BottoneScrittura size="sm" variant="outline" disabled={proponi.isPending} onClick={() => proponi.mutate({ p_richiesta: r.id, p_soglia: Number(soglia) || 60 }, {
                onSuccess: (n) => toast.success(`${n} immobili nella selezione`), onError: errore })}>Metti in selezione</BottoneScrittura></div>
          </div>
          {match.length === 0 ? <p className="py-2 text-sm text-muted-foreground">Nessun immobile disponibile risponde alla ricerca. Appena ne entra uno, l'agente è avvisato.</p> : (
            <ul className="divide-y divide-border">{match.map((m) => {
              const i = imm(m.immobile_id)
              const s = sel(m.immobile_id)
              return (
                <li key={m.immobile_id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className={cn('flex h-10 w-12 shrink-0 items-center justify-center rounded-md font-medium tabular-nums', m.punteggio >= 80 ? 'bg-success-tenue text-success-testo'
                    : m.punteggio >= 60 ? 'bg-warning-tenue text-warning-testo' : 'bg-muted text-muted-foreground')} aria-label={`Punteggio ${m.punteggio} su 100`}>{m.punteggio}</span>
                  <span className="min-w-0 flex-1"><Link to={`/immobiliare/immobili/${m.immobile_id}`} className="font-medium text-foreground hover:text-primary-testo">{i?.titolo ?? (i ? TIPOLOGIA[i.tipologia] : '…')}</Link>
                    <span className="block text-xs text-muted-foreground">{i ? `${etichettaImmobile(i)} · ${fmtEuro(r.tipo === 'acquisto' ? i.prezzo : i.canone, 0)}` : ''}</span>
                    <span className="block text-xs text-muted-foreground">{m.motivi.length ? m.motivi.join(', ') : 'Risponde a tutto'}</span></span>
                  {s ? <Badge tone={SELEZIONE_STATO[s.stato].tone}>{SELEZIONE_STATO[s.stato].label}</Badge>
                    : <Button size="sm" variant="ghost" onClick={() => salvaSel.mutate({ values: { richiesta_id: r.id, immobile_id: m.immobile_id, punteggio: m.punteggio } }, { onError: errore })}>Proponi</Button>}
                  <Button asChild size="sm" variant="outline"><Link to={`/immobiliare/visite?immobile=${m.immobile_id}&contatto=${r.contatto_id}`}>Visita</Link></Button>
                </li>
              )
            })}</ul>
          )}
        </Card>
        <div className="space-y-5">
          <Card className="p-5"><h3 className="mb-2 text-title text-foreground">Selezione inviata</h3>
            {selezioni.length === 0 ? <p className="text-sm text-muted-foreground">Nessun immobile ancora proposto.</p> : (
              <ul className="divide-y divide-border text-sm">{selezioni.map((s) => {
                const i = imm(s.immobile_id)
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 py-2"><span className="min-w-0 flex-1 truncate text-foreground">{i ? etichettaImmobile(i) : '…'}</span>
                    <Badge tone={SELEZIONE_STATO[s.stato].tone}>{SELEZIONE_STATO[s.stato].label}</Badge>
                    <Button size="icon" variant="ghost" aria-label="Preferito" onClick={() => salvaSel.mutate({ id: s.id, values: { stato: 'preferito' } }, { onError: errore })}><Star className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Scartato" onClick={() => salvaSel.mutate({ id: s.id, values: { stato: 'scartato' } }, { onError: errore })}><X className="h-3.5 w-3.5" /></Button></li>
                )
              })}</ul>)}
          </Card>
          <Card className="p-5"><h3 className="mb-2 text-title text-foreground">Visite</h3>
            {visite.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna visita.</p> : (
              <ul className="divide-y divide-border text-sm">{visite.map((v) => (
                <li key={v.id} className="flex items-center gap-2 py-2"><span className="min-w-0 flex-1 text-foreground">{imm(v.immobile_id) ? etichettaImmobile(imm(v.immobile_id)) : fmtGiornoOra(v.inizio)}
                  <span className="block text-xs text-muted-foreground">{fmtGiornoOra(v.inizio)}{v.feedback ? ` · «${v.feedback}»` : ''}</span></span>
                  <Badge tone={VISITA_STATO[v.stato].tone}>{VISITA_STATO[v.stato].label}</Badge></li>))}</ul>)}
          </Card>
          <Card className="space-y-1 p-5 text-sm"><h3 className="mb-1 text-title text-foreground">Cosa cerca</h3>
            <p className="text-foreground">{r.tipologie.length ? r.tipologie.map((t) => TIPOLOGIA[t]).join(', ') : 'Qualsiasi tipologia'}{r.zone.length ? ` · zone ${r.zone.join(', ')}` : ''}</p>
            <p className="text-muted-foreground">{[r.superficie_min != null && `almeno ${r.superficie_min} m²`, r.camere_min != null && `${r.camere_min} camere`, r.bagni_min != null && `${r.bagni_min} bagni`,
              ...r.requisiti.map((x) => REQUISITI[x]?.toLowerCase())].filter(Boolean).join(', ') || 'Nessun requisito particolare'}</p>
            {r.tempistica && <p className="text-muted-foreground">Tempistica: {r.tempistica}{r.finanziamento ? ' · con mutuo' : ''}</p>}
            {r.tipo === 'affitto' && (r.reddito_mensile || r.garanzie) && <p className="text-muted-foreground">Reddito {fmtEuro(r.reddito_mensile, 0)}{r.garanzie ? ` · ${r.garanzie}` : ''}{r.referenze ? ` · ${r.referenze}` : ''}</p>}
            {r.preferenze && <p className="text-muted-foreground">{r.preferenze}</p>}
            <Button asChild variant="link" className="px-0"><Link to={`/contatti/${r.contatto_id}`}><UserRound className="h-3.5 w-3.5" /> Scheda nel CRM</Link></Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Lead ────────────────────────────────────────────────────────────────
export function LeadPage() {
  return <ConAgenzia><Lead_ /></ConAgenzia>
}

const COLONNE_LEAD = ['nuovo', 'contattato', 'qualificato', 'appuntamento'] as const

function Lead_() {
  useDalVivo(['imm_lead'])
  const navigate = useNavigate()
  const { agenti } = useAgenti()
  const { data: lead = [], isLoading } = useElenco<Lead & { imm_immobili: Pick<Immobile, 'codice' | 'indirizzo' | 'comune'> | null }>('imm_lead', {
    select: '*, imm_immobili(codice, indirizzo, comune)', ordine: [{ colonna: 'ricevuto_at', crescente: false }], limite: 300 })
  const salva = useSalva('imm_lead')
  const converti = useAzione('imm_converti_lead', TABELLE_COMMERCIALI)
  const [nuovo, setNuovo] = useState(false)
  const [perso, setPerso] = useState<Lead | null>(null)
  const [motivo, setMotivo] = useState('')
  const aperti = lead.filter((l) => COLONNE_LEAD.includes(l.stato as typeof COLONNE_LEAD[number]))
  const vecchio = (l: Lead) => l.stato === 'nuovo' && Date.now() - new Date(l.ricevuto_at).getTime() > 24 * 3600_000
  const cambia = (l: Lead, values: Partial<Lead>, ok?: string) => salva.mutate({ id: l.id, values }, { onSuccess: () => ok && toast.success(ok), onError: errore })
  return (
    <div>
      <PageHeader title="Lead" description="Le richieste che arrivano da portali, sito, social, telefono e vetrina: chi le segue, a che punto sono, la prossima mossa."
        numeri={[
          { etichetta: 'aperti', valore: isLoading ? undefined : aperti.length, inCaricamento: isLoading },
          { etichetta: 'senza risposta', valore: isLoading ? undefined : lead.filter(vecchio).length, inCaricamento: isLoading },
          { etichetta: 'convertiti', valore: isLoading ? undefined : lead.filter((l) => l.stato === 'convertito').length, inCaricamento: isLoading },
        ]}
        actions={<BottoneScrittura onClick={() => setNuovo(true)}><Plus className="h-4 w-4" /> Nuovo lead</BottoneScrittura>} />
      {isLoading ? <Skeleton className="h-64" /> : aperti.length === 0 ? (
        <EmptyState icon={Inbox} title="Nessun lead aperto" description="I contatti dai portali e dal sito entreranno qui da soli (predisposto); oggi si registrano a mano, anche dalle telefonate."
          action={<BottoneScrittura variant="outline" onClick={() => setNuovo(true)}>Nuovo lead</BottoneScrittura>} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">{COLONNE_LEAD.map((col) => {
          const qui = aperti.filter((l) => l.stato === col)
          return (
            <section key={col} aria-label={LEAD_STATO[col].label} className="rounded-lg border border-border bg-muted/30 p-2">
              <h3 className="mb-2 flex items-center justify-between px-1 text-label uppercase text-muted-foreground">{LEAD_STATO[col].label}<span className="tabular-nums">{qui.length}</span></h3>
              <ul className="space-y-2">{qui.map((l) => (
                <li key={l.id} className={cn('space-y-1.5 rounded-md border bg-card p-2.5 text-sm', vecchio(l) ? 'border-destructive' : 'border-border')}>
                  <div className="flex items-start justify-between gap-2"><p className="font-medium text-foreground">{l.nome}</p><Badge tone={PRIORITA[l.priorita].tone}>{PRIORITA[l.priorita].label}</Badge></div>
                  <p className="text-xs text-muted-foreground">{LEAD_TIPO[l.tipo]} · {ORIGINE[l.origine]}{l.fonte ? ` (${l.fonte})` : ''} · {fmtGiornoOra(l.ricevuto_at)}</p>
                  {l.imm_immobili && <p className="truncate text-xs text-foreground">{etichettaImmobile(l.imm_immobili)}</p>}
                  {l.messaggio && <p className="line-clamp-2 text-xs text-muted-foreground">«{l.messaggio}»</p>}
                  <p className="text-xs text-muted-foreground">{[l.telefono, l.email].filter(Boolean).join(' · ')}{nomeAgente(agenti, l.agente_id) ? ` · ${nomeAgente(agenti, l.agente_id)}` : ' · da assegnare'}</p>
                  {l.prossima_azione && <p className="text-xs text-foreground">Prossimo passo: {l.prossima_azione}{l.prossima_azione_il ? ` (${fmtData(l.prossima_azione_il)})` : ''}</p>}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {col === 'nuovo' && <BottoneScrittura size="sm" variant="outline" onClick={() => cambia(l, { stato: 'contattato' }, 'Segnato come contattato')}>Contattato</BottoneScrittura>}
                    {col === 'contattato' && <BottoneScrittura size="sm" variant="outline" onClick={() => cambia(l, { stato: 'qualificato' })}>Qualificato</BottoneScrittura>}
                    {col === 'qualificato' && <BottoneScrittura size="sm" variant="outline" onClick={() => cambia(l, { stato: 'appuntamento' })}>Appuntamento</BottoneScrittura>}
                    {col !== 'nuovo' && <BottoneScrittura size="sm" onClick={() => converti.mutate({ p_lead: l.id }, {
                      onSuccess: (x) => { const v = x as unknown as { richiesta_id: string | null }; toast.success('Convertito: contatto e trattativa nel CRM'); if (v.richiesta_id) navigate(`/immobiliare/richieste/${v.richiesta_id}`) },
                      onError: errore })}>Converti</BottoneScrittura>}
                    <Button size="sm" variant="ghost" onClick={() => { setPerso(l); setMotivo('') }}>Perso</Button>
                  </div>
                </li>))}</ul>
            </section>
          )
        })}</div>
      )}
      {nuovo && <LeadDialog onClose={() => setNuovo(false)} />}
      <Dialog open={!!perso} onOpenChange={(o) => !o && setPerso(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Lead perso: {perso?.nome}</DialogTitle><DialogDescription>Il motivo serve a capire dove si perdono i clienti.</DialogDescription></DialogHeader>
          <div className="space-y-1.5"><Label htmlFor="lp-mot">Motivo</Label><Input id="lp-mot" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ha già trovato, budget troppo basso, non risponde…" autoFocus /></div>
          <DialogFooter><Button variant="outline" onClick={() => setPerso(null)}>Annulla</Button>
            <BottoneScrittura disabled={!motivo.trim()} onClick={() => perso && salva.mutate({ id: perso.id, values: { stato: 'perso', motivo_perdita: motivo.trim() } }, {
              onSuccess: () => { toast.success('Lead chiuso'); setPerso(null) }, onError: errore })}>Segna perso</BottoneScrittura></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LeadDialog({ onClose }: { onClose: () => void }) {
  const salva = useSalva('imm_lead')
  const [f, setF] = useState({ tipo: 'acquirente', nome: '', telefono: '', email: '', origine: 'telefono', fonte: '', immobile: 'nessuno', messaggio: '', priorita: 'media',
    agente: 'nessuno', prossima: '', prossimaIl: '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  function registra(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) { toast.error('Scrivi il nome'); return }
    if (!f.telefono.trim() && !f.email.trim()) { toast.error('Serve almeno il telefono o l\'email'); return }
    salva.mutate({ values: { tipo: f.tipo, nome: f.nome.trim(), telefono: f.telefono.trim() || null, email: f.email.trim() || null, origine: f.origine, fonte: f.fonte.trim() || null,
      immobile_id: f.immobile === 'nessuno' ? null : f.immobile, messaggio: f.messaggio.trim() || null, priorita: f.priorita, agente_id: f.agente === 'nessuno' ? null : f.agente,
      prossima_azione: f.prossima.trim() || null, prossima_azione_il: f.prossimaIl || null } }, { onSuccess: () => { toast.success('Lead registrato: l\'agente è avvisato'); onClose() }, onError: errore })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Nuovo lead</DialogTitle><DialogDescription>Se chiede di un immobile, il lead va al suo agente.</DialogDescription></DialogHeader>
        <form onSubmit={registra} className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="ld-tipo">Chi è</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="ld-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(LEAD_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="ld-nome">Nome *</Label><Input id="ld-nome" value={f.nome} onChange={set('nome')} required autoFocus /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ld-tel">Telefono</Label><Input id="ld-tel" type="tel" value={f.telefono} onChange={set('telefono')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ld-mail">Email</Label><Input id="ld-mail" type="email" value={f.email} onChange={set('email')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ld-or">Da dove arriva</Label>
            <Select value={f.origine} onValueChange={(v) => setF({ ...f, origine: v })}><SelectTrigger id="ld-or"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ORIGINE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ld-fonte">Quale (portale, annuncio…)</Label><Input id="ld-fonte" value={f.fonte} onChange={set('fonte')} /></div>
          <CampoImmobile id="ld-imm" valore={f.immobile} onChange={(v) => setF({ ...f, immobile: v })} etichetta="Immobile di interesse" nessuno="Nessuno in particolare" />
          <div className="col-span-6 space-y-1.5"><Label htmlFor="ld-msg">Messaggio</Label><Textarea id="ld-msg" rows={2} value={f.messaggio} onChange={set('messaggio')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ld-pr">Priorità</Label>
            <Select value={f.priorita} onValueChange={(v) => setF({ ...f, priorita: v })}><SelectTrigger id="ld-pr"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PRIORITA).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
          <CampoAgente id="ld-ag" valore={f.agente} onChange={(v) => setF({ ...f, agente: v })} />
          <div className="col-span-4 space-y-1.5"><Label htmlFor="ld-pa">Prossima azione</Label><Input id="ld-pa" value={f.prossima} onChange={set('prossima')} placeholder="Richiamare, inviare le foto…" /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ld-pail">Entro il</Label><Input id="ld-pail" type="date" value={f.prossimaIl} onChange={set('prossimaIl')} /></div>
          <DialogFooter className="col-span-6"><Button type="button" variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura type="submit" disabled={salva.isPending}>Registra il lead</BottoneScrittura></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── CRM proprietari ─────────────────────────────────────────────────────
export function ProprietariPage() {
  return <ConAgenzia><Proprietari_ /></ConAgenzia>
}

function Proprietari_() {
  const { data: righe = [], isLoading } = useElenco<Proprietario & { contatti: ContattoBreve | null; organizzazioni: { ragione_sociale: string } | null }>('imm_proprietari', {
    select: '*, contatti(id, nome, cognome, email, telefono), organizzazioni(ragione_sociale)' })
  const { data: immobili = [] } = useElenco<Immobile>('imm_immobili')
  const { data: visite = [] } = useElenco<Pick<Visita, 'immobile_id' | 'stato'>>('imm_visite', { select: 'immobile_id, stato', filtri: { stato: 'svolta' } })
  const { data: proposte = [] } = useElenco<Pick<Proposta, 'immobile_id' | 'padre_id'>>('imm_proposte', { select: 'immobile_id, padre_id' })
  const [q, setQ] = useState('')
  // Un proprietario può avere più immobili: una riga per proprietario.
  const perProprietario = new Map<string, { nome: string; contatto: string | null; telefono: string | null; email: string | null; immobili: Immobile[] }>()
  for (const r of righe) {
    const chiave = r.contatto_id ?? r.organizzazione_id ?? r.id
    const i = immobili.find((x) => x.id === r.immobile_id)
    if (!i) continue
    const v = perProprietario.get(chiave) ?? { nome: r.contatti ? nomeContatto(r.contatti) : r.organizzazioni?.ragione_sociale ?? '', contatto: r.contatto_id,
      telefono: r.contatti?.telefono ?? null, email: r.contatti?.email ?? null, immobili: [] }
    v.immobili.push(i)
    perProprietario.set(chiave, v)
  }
  const cerca = q.trim().toLowerCase()
  const lista = [...perProprietario.entries()].filter(([, v]) => !cerca || v.nome.toLowerCase().includes(cerca)).sort((a, b) => a[1].nome.localeCompare(b[1].nome))
  return (
    <div>
      <PageHeader title="Proprietari" description="La relazione con chi ci ha affidato l'immobile: da quanto è sul mercato, quante visite e proposte, i ribassi, il report da inviare."
        numeri={[
          { etichetta: 'proprietari', valore: isLoading ? undefined : perProprietario.size, inCaricamento: isLoading },
          { etichetta: 'immobili sul mercato', valore: immobili.filter((i) => ['disponibile', 'sotto_offerta'].includes(i.stato)).length },
        ]} />
      <Input className="mb-4 max-w-xs" placeholder="Cerca un proprietario" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca un proprietario" />
      {isLoading ? <Skeleton className="h-64" /> : lista.length === 0 ? (
        <EmptyState icon={UserRound} filtrato title={cerca ? 'Nessun proprietario trovato' : 'Nessun proprietario'} description="I proprietari si aggiungono nel fascicolo di ogni immobile." />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Proprietario</TableHead><TableHead>Immobile</TableHead><TableHead numerica>Giorni</TableHead><TableHead numerica>Visite</TableHead>
            <TableHead numerica>Proposte</TableHead><TableHead numerica>Prezzo</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
          <TableBody>{lista.flatMap(([k, v]) => v.immobili.map((i, n) => (
            <TableRow key={`${k}-${i.id}`}>
              <TableCell>{n === 0 && <>{v.contatto ? <Link to={`/contatti/${v.contatto}`} className="font-medium text-foreground hover:text-primary-testo">{v.nome}</Link> : <span className="font-medium text-foreground">{v.nome}</span>}
                <span className="block text-xs text-muted-foreground">{[v.telefono, v.email].filter(Boolean).join(' · ')}</span></>}</TableCell>
              <TableCell><Link to={`/immobiliare/immobili/${i.id}?scheda=report`} className="text-foreground hover:text-primary-testo">{etichettaImmobile(i)}</Link></TableCell>
              <TableCell numerica>{i.pubblicato_il ? giorniTra(i.pubblicato_il, i.concluso_il ?? oggiIso()) : '—'}</TableCell>
              <TableCell numerica>{visite.filter((x) => x.immobile_id === i.id).length}</TableCell>
              <TableCell numerica>{proposte.filter((x) => x.immobile_id === i.id && !x.padre_id).length}</TableCell>
              <TableCell numerica>{fmtEuro(i.prezzo ?? i.canone, 0)}{i.prezzo_iniziale && i.prezzo && i.prezzo < i.prezzo_iniziale
                ? <span className="block text-xs text-muted-foreground">da {fmtEuro(i.prezzo_iniziale, 0)}</span> : null}</TableCell>
              <TableCell><Badge tone={IMMOBILE_STATO[i.stato].tone}>{IMMOBILE_STATO[i.stato].label}</Badge></TableCell>
            </TableRow>)))}</TableBody>
        </Table></Card>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Il report parte da solo ogni mese ai proprietari referenti degli immobili sul mercato; si invia anche a mano dal fascicolo, scheda «Report».</p>
    </div>
  )
}
