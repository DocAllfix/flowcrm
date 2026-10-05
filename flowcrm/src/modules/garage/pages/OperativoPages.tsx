/**
 * Il lavoro di ogni giorno dell'autorimessa: cruscotto (§25), ingressi e
 * uscite con il ticket e la tariffa (§7–8), mappa dei posti dal vivo
 * (§2–3), prenotazioni (§10).
 */
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowDownToLine, ArrowUpFromLine, CalendarClock, Car, ChevronLeft, ChevronRight, LogOut, Plug, Plus, TriangleAlert, Warehouse } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { cn } from '@/lib/utils'
import { useElenco, useRpc, useSalva, useAzione, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { useGarage } from '@/modules/garage/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/garage/componenti/ConStruttura'
import { useAnagrafica, nomeCliente, TABELLE_SOSTA, type Area, type ColonninaStato, type EsitoAccesso, type EsitoIngresso, type EsitoUscita,
  type PostoStato, type Prenotazione, type Sosta } from '@/modules/garage/queries'
import { CANALE, MODALITA_ACCESSO, POSTO_STATO, POSTO_TIPO, PRENOTAZIONE_STATO, SOSTA_STATO, TITOLO, VEICOLO_TIPO, AREA_TIPO, durata, fmtData, fmtEuro,
  fmtGiornoOra, fmtOra, isoLocale, minutiDa, normalizzaTarga, numero, oggiIso, piuGiorni } from '@/modules/garage/stati'

interface Cruscotto {
  posti: { totali: number; liberi: number; occupati: number; prenotati: number; riservati: number; fermi: number }
  veicoli_presenti: number; ingressi_oggi: number; uscite_oggi: number; prenotazioni_oggi: number
  movimenti: { sosta_id: string; verso: 'ingresso' | 'uscita'; quando: string; targa: string; posto: string | null; cliente: string | null; ticket: string }[]
  da_incassare: { numero: number; importo: number }; abbonamenti_in_scadenza: number; incassi_oggi: number
  insoluti: { numero: number; importo: number | null }; allarmi: number; manutenzioni_aperte: number
  colonnine: { totali: number; disponibili: number; in_uso: number; ferme: number }
  servizi_aperti: number; chiavi_fuori: number; in_attesa: number
}

/** Data e ora locale per un campo datetime-local. */
const oraLocale = (d: Date) => `${isoLocale(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
/** Il titolo con cui un veicolo è dentro, dalla sosta. */
const titoloSosta = (s: Pick<Sosta, 'contratto_id' | 'convenzione_id' | 'tariffario_id'>) =>
  s.contratto_id ? 'contratto' : s.convenzione_id ? 'convenzione' : s.tariffario_id ? 'rotazione' : 'autorizzazione'

// ── Cruscotto ───────────────────────────────────────────────────────────
export function CruscottoGaragePage() {
  return <ConStruttura><Cruscotto_ /></ConStruttura>
}

function Cruscotto_() {
  const { struttura, strutturaId } = useGarage()
  useDalVivo(['gar_soste', 'gar_posti', 'gar_prenotazioni', 'gar_ricariche', 'gar_servizi'], [['fond-rpc']])
  const { data: c, isLoading } = useRpc<Cruscotto>('gar_cruscotto', { p_struttura: strutturaId }, { intervallo: 60_000 })
  const n = (v: number | undefined) => (isLoading ? undefined : v ?? 0)
  const avvisi: [number | undefined, string, string][] = [
    [c?.da_incassare.numero, 'conti da incassare (soste, servizi, ricariche)', '/garage/incassi'],
    [c?.insoluti.numero, 'canoni insoluti', '/garage/incassi?scheda=rate'],
    [c?.abbonamenti_in_scadenza, 'contratti che scadono entro 30 giorni', '/garage/contratti'],
    [c?.allarmi, 'danni, anomalie e allarmi aperti', '/garage/danni'],
    [c?.manutenzioni_aperte, 'manutenzioni aperte', '/garage/impianti'],
    [c?.servizi_aperti, 'servizi da fare', '/garage/servizi'],
    [c?.chiavi_fuori, 'chiavi fuori dalla bacheca', '/garage/chiavi'],
    [c?.in_attesa, 'clienti in lista d\'attesa per un posto', '/garage/contratti?scheda=attesa'],
  ]
  const aperti = avvisi.filter(([v]) => Number(v) > 0)
  const p = c?.posti

  return (
    <div>
      <PageHeader title={struttura?.nome ?? 'Autorimessa'} description={`Posti, movimenti e incassi del ${fmtData(oggiIso())}.`}
        numeri={[
          { etichetta: 'veicoli dentro', valore: n(c?.veicoli_presenti), inCaricamento: isLoading },
          { etichetta: 'posti liberi', valore: n(p?.liberi), inCaricamento: isLoading },
          { etichetta: 'ingressi oggi', valore: n(c?.ingressi_oggi), inCaricamento: isLoading },
          { etichetta: 'incassato oggi', valore: isLoading ? undefined : fmtEuro(c?.incassi_oggi ?? 0), inCaricamento: isLoading },
        ]}
        actions={<><SelettoreStruttura /><Button asChild variant="outline"><Link to="/garage/posti">Mappa</Link></Button>
          <Button asChild><Link to="/garage/movimenti"><ArrowDownToLine className="h-4 w-4" /> Ingressi e uscite</Link></Button></>} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><Warehouse className="h-4 w-4 text-primary-testo" /> I posti</h2>
          {isLoading || !p ? <Skeleton className="h-24" /> : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img"
                aria-label={`${p.occupati} occupati, ${p.prenotati} prenotati, ${p.riservati} riservati, ${p.fermi} fermi, ${p.liberi} liberi su ${p.totali}`}>
                {([['occupati', 'bg-destructive'], ['prenotati', 'bg-info'], ['riservati', 'bg-serie-testo'], ['fermi', 'bg-warning']] as const).map(([k, cl]) => (
                  <span key={k} className={cl} style={{ width: `${p.totali ? (100 * p[k]) / p.totali : 0}%` }} />))}
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm sm:grid-cols-6">
                {([['Totali', p.totali], ['Liberi', p.liberi], ['Occupati', p.occupati], ['Prenotati', p.prenotati], ['Riservati', p.riservati], ['Fermi', p.fermi]] as const).map(([l, v]) => (
                  <div key={l}><dt className="text-muted-foreground">{l}</dt><dd data-slot="kpi" className="text-title tabular-nums text-foreground">{v}</dd></div>))}
              </dl>
              <p className="mt-3 text-sm text-muted-foreground">Prenotazioni di oggi: {c?.prenotazioni_oggi ?? 0} · Colonnine libere: {c?.colonnine.disponibili ?? 0} su {c?.colonnine.totali ?? 0}
                {c && c.colonnine.ferme > 0 ? ` (${c.colonnine.ferme} ferme)` : ''}</p>
            </>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><TriangleAlert className="h-4 w-4 text-primary-testo" /> Da sistemare</h2>
          {isLoading ? <Skeleton className="h-24" /> : aperti.length === 0 ? <p className="py-2 text-sm text-muted-foreground">Niente in sospeso.</p> : (
            <ul className="space-y-1 text-sm">{aperti.map(([v, l, to]) => (
              <li key={l}><Link to={to} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"><span className="text-foreground">{l}</span><Badge tone="warning">{v}</Badge></Link></li>))}</ul>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            <div><dt className="text-muted-foreground">Da incassare</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtEuro(c?.da_incassare.importo ?? 0)}</dd></div>
            {c?.insoluti.importo != null && <div><dt className="text-muted-foreground">Insoluti</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtEuro(c.insoluti.importo)}</dd></div>}
          </dl>
        </Card>

        <Card className="p-5 xl:col-span-2">
          <h2 className="mb-3 text-title text-foreground">Ingressi e uscite dal vivo</h2>
          {(c?.movimenti.length ?? 0) === 0 ? <p className="py-2 text-sm text-muted-foreground">Ancora nessun movimento.</p> : (
            <ul className="divide-y divide-border text-sm">{c!.movimenti.map((m) => (
              <li key={`${m.sosta_id}-${m.verso}`} className="flex flex-wrap items-center gap-3 py-2">
                <span className="w-24 tabular-nums text-muted-foreground">{new Date(m.quando).toDateString() === new Date().toDateString() ? fmtOra(m.quando) : fmtGiornoOra(m.quando)}</span>
                <Badge tone={m.verso === 'ingresso' ? 'info' : 'neutral'}>{m.verso === 'ingresso' ? 'Entrato' : 'Uscito'}</Badge>
                <span className="font-mono font-medium text-foreground">{m.targa}</span>
                <span className="text-muted-foreground">{m.posto ? `posto ${m.posto}` : ''}{m.cliente ? ` · ${m.cliente}` : ''}</span>
                <span className="ml-auto text-xs text-muted-foreground">{m.ticket}</span>
              </li>))}</ul>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── Ingressi e uscite ───────────────────────────────────────────────────
export function MovimentiPage() {
  return <ConStruttura><Movimenti_ /></ConStruttura>
}

function Movimenti_() {
  const { strutturaId } = useGarage()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  useDalVivo(['gar_soste', 'gar_posti'])
  const [targa, setTarga] = useState('')
  const [tipo, setTipo] = useState('auto')
  const [posto, setPosto] = useState(params.get('posto') ?? 'auto')
  const [modalita, setModalita] = useState('manuale')
  const [filtro, setFiltro] = useState('')
  const [inUscita, setInUscita] = useState<Sosta | null>(null)
  const t = normalizzaTarga(targa)
  const { data: verifica, isFetching } = useRpc<EsitoAccesso>('gar_verifica_accesso', { p_struttura: strutturaId, p_targa: t }, { abilitato: t.length >= 5 })
  const { data: liberi = [] } = useElenco<PostoStato>('gar_posti_stato', { filtri: { struttura_id: strutturaId, stato: ['libero', 'prenotato', 'riservato'] },
    ordine: [{ colonna: 'piano' }, { colonna: 'numero' }] })
  const { data: dentro = [], isLoading } = useElenco<Sosta>('gar_soste', { filtri: { struttura_id: strutturaId, uscita_at: null }, ordine: [{ colonna: 'ingresso_at', crescente: false }] })
  const { data: daPagare = [] } = useElenco<Sosta>('gar_soste', { filtri: { struttura_id: strutturaId, stato: 'da_pagare' }, ordine: [{ colonna: 'uscita_at', crescente: false }] })
  const { data: posti = [] } = useElenco<PostoStato>('gar_posti_stato', { filtri: { struttura_id: strutturaId } })
  const { clienti } = useAnagrafica()
  const ingresso = useAzione('gar_ingresso', TABELLE_SOSTA)
  const codice = (id: string | null) => posti.find((p) => p.posto_id === id)?.codice ?? '—'
  const visibili = dentro.filter((s) => !filtro || s.targa.includes(normalizzaTarga(filtro)))

  function entra(e: FormEvent) {
    e.preventDefault()
    if (!strutturaId || t.length < 2) { toast.error('Scrivi la targa'); return }
    ingresso.mutate({ p_struttura: strutturaId, p_targa: t, p_posto: posto === 'auto' ? undefined : posto, p_modalita: modalita, p_tipo_veicolo: tipo }, {
      onSuccess: (r) => {
        const x = r as unknown as EsitoIngresso
        toast.success(`${t} dentro: ticket ${x.ticket}, posto ${x.posto}`, { description: x.avviso ? `${x.avviso}: entra a tariffa.` : undefined })
        setTarga(''); setPosto('auto')
      },
      onError: (err) => toast.error(messaggioErrore(err)),
    })
  }

  return (
    <div>
      <PageHeader title="Ingressi e uscite" description="Registro degli accessi: chi entra, con che titolo, in quale posto; all'uscita la tariffa si calcola da sola."
        numeri={[
          { etichetta: 'dentro adesso', valore: isLoading ? undefined : dentro.length, inCaricamento: isLoading },
          { etichetta: 'da incassare', valore: daPagare.length },
          { etichetta: 'posti liberi', valore: posti.filter((p) => p.stato === 'libero').length },
        ]}
        actions={<SelettoreStruttura />} />

      <Card className="mb-5 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><ArrowDownToLine className="h-4 w-4 text-primary-testo" /> Ingresso</h2>
        <form onSubmit={entra} className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(10rem,1fr)_10rem_12rem_10rem_auto] md:items-end">
          <div className="col-span-2 space-y-1.5 md:col-span-1"><Label htmlFor="mv-targa">Targa</Label>
            <Input id="mv-targa" value={targa} onChange={(e) => setTarga(e.target.value.toUpperCase())} autoFocus autoComplete="off" placeholder="Es. AB123CD"
              className="font-mono text-lg uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal" /></div>
          <div className="space-y-1.5"><Label htmlFor="mv-tipo">Veicolo</Label>
            <Select value={tipo} onValueChange={setTipo}><SelectTrigger id="mv-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(VEICOLO_TIPO).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="mv-posto">Posto</Label>
            <Select value={posto} onValueChange={setPosto}><SelectTrigger id="mv-posto"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="auto">Assegna da sé</SelectItem>
                {liberi.map((p) => <SelectItem key={p.posto_id!} value={p.posto_id!}>{p.codice} · {POSTO_STATO[p.stato!]?.label.toLowerCase()} · {POSTO_TIPO[p.tipo!]}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="mv-mod">Modalità</Label>
            <Select value={modalita} onValueChange={setModalita}><SelectTrigger id="mv-mod"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(MODALITA_ACCESSO).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
          <BottoneScrittura type="submit" className="col-span-2 md:col-span-1" disabled={ingresso.isPending || (verifica && !verifica.consentito)}>
            {ingresso.isPending ? 'Registrazione…' : 'Registra l\'ingresso'}</BottoneScrittura>
        </form>
        <div className="mt-3 min-h-6 text-sm" aria-live="polite">
          {t.length >= 5 && (isFetching && !verifica ? <span className="text-muted-foreground">Verifica della targa…</span> : verifica && (
            <span className="flex flex-wrap items-center gap-2">
              {verifica.consentito ? <Badge tone={TITOLO[verifica.titolo]?.tone ?? 'neutral'}>{TITOLO[verifica.titolo]?.label ?? verifica.titolo}</Badge> : <Badge tone="danger">Non entra</Badge>}
              <span className="text-foreground">{verifica.motivo}</span>
              {verifica.cliente_id && <Link className="text-muted-foreground underline underline-offset-2" to={`/garage/clienti/${verifica.cliente_id}`}>{nomeCliente(clienti, verifica.cliente_id) ?? 'Scheda del cliente'}</Link>}
            </span>))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Lettori di targhe, badge, RFID, telecomandi e app sono predisposti: registrano l'ingresso allo stesso modo.</p>
      </Card>

      <Tabs defaultValue="dentro">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="dentro">Dentro adesso ({dentro.length})</TabsTrigger>
          <TabsTrigger value="pagare">Da incassare ({daPagare.length})</TabsTrigger>
          <TabsTrigger value="registro">Registro</TabsTrigger>
        </TabsList>
        <TabsContent value="dentro">
          <div className="mb-3"><Input className="max-w-xs" placeholder="Cerca una targa" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Cerca una targa" /></div>
          {isLoading ? <Skeleton className="h-48" /> : visibili.length === 0 ? (
            <EmptyState icon={Car} filtrato title={filtro ? 'Nessuna targa trovata' : 'Nessun veicolo dentro'} description={filtro ? 'Controlla la targa scritta.' : 'I veicoli compaiono qui appena entrano.'} />
          ) : (
            <Card className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Targa</TableHead><TableHead>Posto</TableHead><TableHead>Titolo</TableHead><TableHead>Cliente</TableHead><TableHead>Entrato</TableHead>
                <TableHead numerica>Da</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
              <TableBody>{visibili.map((s) => {
                const ti = TITOLO[titoloSosta(s)]
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-medium text-foreground">{s.targa}<span className="block font-sans text-xs font-normal text-muted-foreground">{s.ticket}</span></TableCell>
                    <TableCell>{codice(s.posto_id)}</TableCell>
                    <TableCell><Badge tone={ti.tone}>{ti.label}</Badge></TableCell>
                    <TableCell>{s.cliente_id ? <Link className="hover:text-primary-testo" to={`/garage/clienti/${s.cliente_id}`}>{nomeCliente(clienti, s.cliente_id) ?? '…'}</Link> : <span className="text-muted-foreground">Occasionale</span>}</TableCell>
                    <TableCell className="tabular-nums">{fmtGiornoOra(s.ingresso_at)}</TableCell>
                    <TableCell numerica>{durata(minutiDa(s.ingresso_at))}</TableCell>
                    <TableCell className="text-right"><BottoneScrittura size="sm" variant="outline" onClick={() => setInUscita(s)}><ArrowUpFromLine className="h-3.5 w-3.5" /> Uscita</BottoneScrittura></TableCell>
                  </TableRow>
                )
              })}</TableBody>
            </Table></Card>
          )}
        </TabsContent>
        <TabsContent value="pagare">
          {daPagare.length === 0 ? <EmptyState icon={Car} filtrato title="Niente da incassare" description="Le soste a tariffa restano qui finché il conto non è pagato." /> : (
            <Card className="divide-y divide-border">{daPagare.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="font-mono font-medium text-foreground">{s.targa}</span>
                <span className="text-muted-foreground">uscito {fmtGiornoOra(s.uscita_at)} · {durata(s.minuti)}</span>
                <span className="ml-auto font-medium tabular-nums text-foreground">{fmtEuro(s.importo)}</span>
                <Button size="sm" onClick={() => navigate(`/garage/incassi?conto=${s.conto_id}`)}>Incassa</Button>
              </div>))}</Card>
          )}
        </TabsContent>
        <TabsContent value="registro"><Registro strutturaId={strutturaId!} codice={codice} /></TabsContent>
      </Tabs>
      <UscitaDialog sosta={inUscita} onClose={() => setInUscita(null)} codice={codice} />
    </div>
  )
}

/** Uscita: prima l'importo che si pagherà, poi la conferma. */
function UscitaDialog({ sosta, onClose, codice }: { sosta: Sosta | null; onClose: () => void; codice: (id: string | null) => string }) {
  // Una finestra per sosta: l'ora dell'anteprima è quella in cui si apre.
  return sosta ? <Uscita key={sosta.id} sosta={sosta} onClose={onClose} codice={codice} /> : null
}

function Uscita({ sosta, onClose, codice }: { sosta: Sosta; onClose: () => void; codice: (id: string | null) => string }) {
  const navigate = useNavigate()
  const [adesso] = useState(() => new Date().toISOString())
  const { data: stima } = useRpc<{ importo: number; minuti: number; franchigia: boolean }>('gar_calcola_tariffa',
    { p_tariffario: sosta.tariffario_id, p_ingresso: sosta.ingresso_at, p_uscita: adesso }, { abilitato: !!sosta.tariffario_id && !sosta.contratto_id })
  const uscita = useAzione('gar_uscita', TABELLE_SOSTA)
  const [modalita, setModalita] = useState('manuale')
  const ti = TITOLO[titoloSosta(sosta)]
  const esci = () => uscita.mutate({ p_sosta: sosta.id, p_modalita: modalita }, {
    onSuccess: (r) => {
      const x = r as unknown as EsitoUscita
      onClose()
      if (x.conto_id) { toast.success(`${sosta.targa} uscito: ${fmtEuro(x.importo)} da incassare`); navigate(`/garage/incassi?conto=${x.conto_id}`) }
      else toast.success(`${sosta.targa} uscito${x.titolo === 'convenzione' && x.importo > 0 ? `: ${fmtEuro(x.importo)} sul conto dell'azienda` : ''}`)
    },
    onError: (e) => toast.error(messaggioErrore(e)),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Uscita di {sosta.targa}</DialogTitle>
          <DialogDescription>Ticket {sosta.ticket} · posto {codice(sosta.posto_id)} · entrato {fmtGiornoOra(sosta.ingresso_at)}</DialogDescription>
        </DialogHeader>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Permanenza</dt><dd className="text-foreground">{durata(minutiDa(sosta.ingresso_at))}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Titolo</dt><dd><Badge tone={ti.tone}>{ti.label}</Badge></dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Da pagare</dt>
            <dd data-slot="kpi" className="text-title text-foreground">{sosta.contratto_id ? 'Niente: abbonato' : !sosta.tariffario_id ? 'Niente: posto della convenzione'
              : stima ? (stima.franchigia ? 'Niente: dentro la franchigia' : fmtEuro(stima.importo)) : '…'}</dd></div>
          {sosta.convenzione_id && sosta.tariffario_id && <p className="text-xs text-muted-foreground">Oltre i posti acquistati: la sosta va sul conto dell'azienda, a tariffa convenzionata.</p>}
        </dl>
        <div className="space-y-1.5"><Label htmlFor="us-mod">Modalità</Label>
          <Select value={modalita} onValueChange={setModalita}><SelectTrigger id="us-mod"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(MODALITA_ACCESSO).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <BottoneScrittura onClick={esci} disabled={uscita.isPending}><LogOut className="h-4 w-4" /> Registra l'uscita</BottoneScrittura>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Registro({ strutturaId, codice }: { strutturaId: string; codice: (id: string | null) => string }) {
  const [giorno, setGiorno] = useState(oggiIso())
  const { clienti } = useAnagrafica()
  const { data: persone = [] } = useElenco<{ id: string; nome: string; cognome: string | null }>('user_profiles', { select: 'id, nome, cognome' })
  const { data: soste = [], isLoading } = useElenco<Sosta>('gar_soste', { filtri: { struttura_id: strutturaId },
    tra: { colonna: 'ingresso_at', da: new Date(`${giorno}T00:00`).toISOString(), a: new Date(`${piuGiorni(giorno, 1)}T00:00`).toISOString() },
    ordine: [{ colonna: 'ingresso_at' }] })
  const chi = (id: string | null) => { const p = persone.find((x) => x.id === id); return p ? `${p.nome} ${p.cognome ?? ''}`.trim() : null }
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Giorno precedente" onClick={() => setGiorno(piuGiorni(giorno, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <Input type="date" className="w-44" value={giorno} onChange={(e) => e.target.value && setGiorno(e.target.value)} aria-label="Giorno" />
        <Button variant="outline" size="icon" aria-label="Giorno successivo" onClick={() => setGiorno(piuGiorni(giorno, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      {isLoading ? <Skeleton className="h-48" /> : soste.length === 0 ? <EmptyState icon={Car} filtrato title="Nessun ingresso in questo giorno" description="Scegli un altro giorno." /> : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Targa</TableHead><TableHead>Cliente</TableHead><TableHead>Posto</TableHead><TableHead>Ingresso</TableHead><TableHead>Uscita</TableHead>
            <TableHead>Operatore</TableHead><TableHead numerica>Importo</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
          <TableBody>{soste.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-foreground">{s.targa}<span className="block font-sans text-xs text-muted-foreground">{s.ticket}</span></TableCell>
              <TableCell>{nomeCliente(clienti, s.cliente_id) ?? '—'}</TableCell>
              <TableCell>{codice(s.posto_id)}</TableCell>
              <TableCell className="tabular-nums">{fmtOra(s.ingresso_at)}<span className="block text-xs text-muted-foreground">{MODALITA_ACCESSO[s.modalita_ingresso]}</span></TableCell>
              <TableCell className="tabular-nums">{s.uscita_at ? fmtGiornoOra(s.uscita_at) : '—'}<span className="block text-xs text-muted-foreground">{s.modalita_uscita ? MODALITA_ACCESSO[s.modalita_uscita] : ''}</span></TableCell>
              <TableCell className="text-sm">{chi(s.operatore_ingresso) ?? '—'}{s.operatore_uscita && s.operatore_uscita !== s.operatore_ingresso ? ` · ${chi(s.operatore_uscita)}` : ''}</TableCell>
              <TableCell numerica>{s.importo != null ? fmtEuro(s.importo) : '—'}</TableCell>
              <TableCell><Badge tone={SOSTA_STATO[s.stato].tone}>{SOSTA_STATO[s.stato].label}</Badge></TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
    </div>
  )
}

// ── Mappa dei posti ─────────────────────────────────────────────────────
export function MappaPostiPage() {
  return <ConStruttura><Mappa_ /></ConStruttura>
}

const TINTA: Record<string, string> = {
  libero: 'border-success/40 bg-success-tenue text-success-testo',
  occupato: 'border-destructive/40 bg-destructive-tenue text-destructive-testo',
  prenotato: 'border-info/40 bg-info-tenue text-info-testo',
  riservato: 'border-serie-testo/40 bg-serie-tenue text-serie-testo',
  manutenzione: 'border-warning/40 bg-warning-tenue text-warning-testo',
  non_disponibile: 'border-border bg-muted text-muted-foreground',
}

function Mappa_() {
  const { strutturaId, struttura } = useGarage()
  useDalVivo(['gar_soste', 'gar_posti', 'gar_prenotazioni', 'gar_ricariche'])
  const { data: posti = [], isLoading } = useElenco<PostoStato>('gar_posti_stato', { filtri: { struttura_id: strutturaId }, ordine: [{ colonna: 'piano' }, { colonna: 'codice' }] })
  const { data: aree = [] } = useElenco<Area>('gar_aree', { filtri: { struttura_id: strutturaId }, ordine: [{ colonna: 'ordine' }] })
  const { data: colonnine = [] } = useElenco<ColonninaStato>('gar_colonnine_stato', { filtri: { struttura_id: strutturaId } })
  const [filtro, setFiltro] = useState('tutti')
  const [scelto, setScelto] = useState<string | null>(null)
  const piani = useMemo(() => [...new Set(posti.map((p) => p.piano!))].sort((a, b) => a - b), [posti])
  const conta = (s: string) => posti.filter((p) => p.stato === s).length
  const posto = posti.find((p) => p.posto_id === scelto) ?? null

  return (
    <div>
      <PageHeader title="Mappa dei posti" description={`${struttura?.nome ?? ''}: stato di ogni posto dal vivo, piano per piano. Tocca un posto per vederlo.`}
        numeri={[
          { etichetta: 'posti', valore: isLoading ? undefined : posti.length, inCaricamento: isLoading },
          { etichetta: 'liberi', valore: isLoading ? undefined : conta('libero'), inCaricamento: isLoading },
          { etichetta: 'occupati', valore: isLoading ? undefined : conta('occupato'), inCaricamento: isLoading },
        ]}
        actions={<SelettoreStruttura />} />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtra per stato">
        {['tutti', ...Object.keys(POSTO_STATO)].map((s) => (
          <Button key={s} size="sm" variant={filtro === s ? 'default' : 'outline'} aria-pressed={filtro === s} onClick={() => setFiltro(s)}>
            {s === 'tutti' ? 'Tutti' : POSTO_STATO[s].label} <span className="tabular-nums opacity-70">{s === 'tutti' ? posti.length : conta(s)}</span></Button>))}
      </div>
      {isLoading ? <Skeleton className="h-64" /> : posti.length === 0 ? (
        <EmptyState icon={Warehouse} title="Nessun posto" description="I posti si aggiungono da «Struttura e tariffe»." action={<Button asChild variant="outline"><Link to="/garage/impostazioni">Struttura e tariffe</Link></Button>} />
      ) : piani.map((piano) => {
        const qui = posti.filter((p) => p.piano === piano && (filtro === 'tutti' || p.stato === filtro))
        const areeQui = aree.filter((a) => a.piano === piano)
        return (
          <section key={piano} className="mb-6" aria-label={`Piano ${piano}`}>
            <h2 className="mb-2 flex flex-wrap items-center gap-2 text-label uppercase text-muted-foreground">{piano === 0 ? 'Piano terra' : piano < 0 ? `Interrato ${-piano}` : `Piano ${piano}`}
              {areeQui.map((a) => <span key={a.id} className="rounded border border-dashed border-border px-1.5 py-0.5 text-xs normal-case text-muted-foreground">{AREA_TIPO[a.tipo]}: {a.nome}</span>)}</h2>
            {qui.length === 0 ? <p className="text-sm text-muted-foreground">Nessun posto con questo stato.</p> : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
                {qui.map((p) => {
                  const col = colonnine.find((c) => c.posto_id === p.posto_id)
                  return (
                    <li key={p.posto_id}>
                      <button type="button" onClick={() => setScelto(p.posto_id)}
                        aria-label={`Posto ${p.codice}: ${POSTO_STATO[p.stato!]?.label}${p.targa ? `, ${p.targa}` : ''}`}
                        className={cn('flex h-20 w-full flex-col items-start justify-between rounded-md border p-2 text-left text-xs transition-shadow hover:shadow-md focus-visible:outline-2',
                          TINTA[p.stato!])}>
                        <span className="flex w-full items-center justify-between font-semibold">{p.codice}{col && <Plug className="h-3.5 w-3.5" aria-label="Colonnina" />}</span>
                        <span className={cn((p.targa ?? p.targa_assegnata) && 'font-mono')}>{p.targa ?? p.targa_assegnata ?? (p.tipo !== 'auto' ? POSTO_TIPO[p.tipo!] : '')}</span>
                        <span className="truncate">{p.stato === 'occupato' && p.ingresso_at ? durata(minutiDa(p.ingresso_at)) : p.cliente ?? p.prenotato_da ?? (p.coperto ? '' : 'scoperto')}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
      <PostoDialog posto={posto} onClose={() => setScelto(null)} colonnina={colonnine.find((c) => c.posto_id === scelto) ?? null} />
    </div>
  )
}

function PostoDialog({ posto, onClose, colonnina }: { posto: PostoStato | null; onClose: () => void; colonnina: ColonninaStato | null }) {
  const salva = useSalva('gar_posti', ['gar_posti_stato'])
  const [nota, setNota] = useState<string | null>(null)
  if (!posto) return null
  const st = POSTO_STATO[posto.stato!]
  const fermo = (v: string | null) => salva.mutate({ id: posto.posto_id!, values: { fermo: v } }, {
    onSuccess: () => toast.success(v ? `Posto ${posto.codice}: ${POSTO_STATO[v === 'manutenzione' ? 'manutenzione' : 'non_disponibile'].label.toLowerCase()}` : `Posto ${posto.codice} di nuovo utilizzabile`),
    onError: (e) => toast.error(messaggioErrore(e)) })
  return (
    <Dialog open onOpenChange={(o) => { if (!o) { setNota(null); onClose() } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">Posto {posto.codice} <Badge tone={st.tone}>{st.label}</Badge></DialogTitle>
          <DialogDescription>{POSTO_TIPO[posto.tipo!]} · {posto.coperto ? 'coperto' : 'scoperto'}{posto.zona ? ` · ${posto.zona}` : ''}{posto.riservato ? ' · solo per contratti' : ''}</DialogDescription>
        </DialogHeader>
        <dl className="space-y-1.5 text-sm">
          {posto.targa && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Dentro</dt><dd className="text-foreground"><span className="font-mono">{posto.targa}</span> dalle {fmtGiornoOra(posto.ingresso_at)} · {posto.ticket}</dd></div>}
          {posto.cliente && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Assegnato a</dt><dd className="text-foreground">
            <Link className="hover:text-primary-testo" to={`/garage/clienti/${posto.cliente_id}`}>{posto.cliente}</Link>{posto.targa_assegnata ? ` · ${posto.targa_assegnata}` : ''} dal {fmtData(posto.assegnato_dal)}</dd></div>}
          {posto.prenotato_da && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Prenotato</dt><dd className="text-foreground">{posto.prenotato_da} · {fmtGiornoOra(posto.prenotato_dalle)}</dd></div>}
          {posto.canone != null && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Canone di listino</dt><dd className="text-foreground">{fmtEuro(posto.canone)} al mese</dd></div>}
          {colonnina && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Colonnina {colonnina.codice}</dt><dd className="text-foreground">{colonnina.potenza_kw ? `${colonnina.potenza_kw} kW · ` : ''}{colonnina.prese_libere} prese libere</dd></div>}
        </dl>
        <div className="space-y-1.5"><Label htmlFor="ps-nota">Note sul posto</Label>
          <Textarea id="ps-nota" rows={2} value={nota ?? posto.note ?? ''} onChange={(e) => setNota(e.target.value)} /></div>
        <DialogFooter className="flex-wrap gap-2">
          {nota !== null && nota !== (posto.note ?? '') && <Button variant="outline" onClick={() => salva.mutate({ id: posto.posto_id!, values: { note: nota || null } }, { onSuccess: () => { toast.success('Nota salvata'); setNota(null) }, onError: (e) => toast.error(messaggioErrore(e)) })}>Salva la nota</Button>}
          {posto.fermo ? <BottoneScrittura variant="outline" onClick={() => fermo(null)}>Rimetti in uso</BottoneScrittura> : <>
            <BottoneScrittura variant="outline" onClick={() => fermo('manutenzione')}>In manutenzione</BottoneScrittura>
            <Button variant="ghost" onClick={() => fermo('non_disponibile')}>Non disponibile</Button></>}
          {posto.stato === 'libero' || posto.stato === 'prenotato' ? <Button asChild><Link to={`/garage/movimenti?posto=${posto.posto_id}`}>Ingresso qui</Link></Button>
            : posto.stato === 'occupato' ? <Button asChild><Link to="/garage/movimenti">Vai all'uscita</Link></Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Prenotazioni ────────────────────────────────────────────────────────
export function PrenotazioniGaragePage() {
  return <ConStruttura><Prenotazioni_ /></ConStruttura>
}

function Prenotazioni_() {
  const { strutturaId } = useGarage()
  useDalVivo(['gar_prenotazioni'])
  const [dal, setDal] = useState(oggiIso())
  const al = piuGiorni(dal, 7)
  const { data: pren = [], isLoading } = useElenco<Prenotazione>('gar_prenotazioni', { filtri: { struttura_id: strutturaId },
    tra: { colonna: 'ingresso', da: new Date(`${dal}T00:00`).toISOString(), a: new Date(`${al}T00:00`).toISOString() }, ordine: [{ colonna: 'ingresso' }] })
  const { data: posti = [] } = useElenco<PostoStato>('gar_posti_stato', { filtri: { struttura_id: strutturaId } })
  const salva = useSalva('gar_prenotazioni', ['gar_posti_stato'])
  const [nuova, setNuova] = useState(false)
  const attive = pren.filter((p) => ['richiesta', 'confermata'].includes(p.stato))
  const cambia = (p: Prenotazione, stato: string, ok: string) => salva.mutate({ id: p.id, values: { stato } }, { onSuccess: () => toast.success(ok), onError: (e) => toast.error(messaggioErrore(e)) })

  return (
    <div>
      <PageHeader title="Prenotazioni" description="Posti prenotati per giorno e ora, con l'importo previsto e l'eventuale anticipo. Un posto non si prenota due volte nella stessa fascia."
        numeri={[
          { etichetta: 'in arrivo', valore: isLoading ? undefined : attive.length, inCaricamento: isLoading },
          { etichetta: 'da confermare', valore: isLoading ? undefined : pren.filter((p) => p.stato === 'richiesta').length, inCaricamento: isLoading },
          { etichetta: 'arrivate', valore: isLoading ? undefined : pren.filter((p) => p.stato === 'arrivata').length, inCaricamento: isLoading },
        ]}
        actions={<><SelettoreStruttura /><BottoneScrittura onClick={() => setNuova(true)}><Plus className="h-4 w-4" /> Nuova prenotazione</BottoneScrittura></>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Settimana prima" onClick={() => setDal(piuGiorni(dal, -7))}><ChevronLeft className="h-4 w-4" /></Button>
        <Input type="date" className="w-44" value={dal} onChange={(e) => e.target.value && setDal(e.target.value)} aria-label="Dal giorno" />
        <Button variant="outline" size="icon" aria-label="Settimana dopo" onClick={() => setDal(piuGiorni(dal, 7))}><ChevronRight className="h-4 w-4" /></Button>
        <span className="text-sm text-muted-foreground">fino al {fmtData(piuGiorni(al, -1))}</span>
      </div>
      {isLoading ? <Skeleton className="h-48" /> : pren.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nessuna prenotazione in questa settimana" description="Le prenotazioni arrivano dal banco, dal telefono o, quando sarà collegata, dalla prenotazione online."
          action={<BottoneScrittura variant="outline" onClick={() => setNuova(true)}>Nuova prenotazione</BottoneScrittura>} />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Cliente</TableHead><TableHead>Veicolo</TableHead><TableHead>Posto</TableHead>
            <TableHead numerica>Previsto</TableHead><TableHead numerica>Anticipo</TableHead><TableHead>Stato</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>{pren.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="tabular-nums">{fmtGiornoOra(p.ingresso)}<span className="block text-xs text-muted-foreground">fino a {fmtGiornoOra(p.uscita)}</span></TableCell>
              <TableCell className="text-foreground">{p.cliente_nome}<span className="block text-xs text-muted-foreground">{[p.telefono, CANALE[p.canale]].filter(Boolean).join(' · ')}</span></TableCell>
              <TableCell className="font-mono">{p.targa ?? '—'}<span className="block font-sans text-xs text-muted-foreground">{VEICOLO_TIPO[p.tipo_veicolo] ?? p.tipo_veicolo}</span></TableCell>
              <TableCell>{posti.find((x) => x.posto_id === p.posto_id)?.codice ?? 'Da assegnare'}</TableCell>
              <TableCell numerica>{fmtEuro(p.importo_previsto)}</TableCell>
              <TableCell numerica>{Number(p.anticipo) > 0 ? fmtEuro(p.anticipo) : '—'}</TableCell>
              <TableCell><Badge tone={PRENOTAZIONE_STATO[p.stato].tone}>{PRENOTAZIONE_STATO[p.stato].label}</Badge></TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {p.stato === 'richiesta' && <BottoneScrittura size="sm" variant="outline" onClick={() => cambia(p, 'confermata', 'Prenotazione confermata')}>Conferma</BottoneScrittura>}
                {['richiesta', 'confermata'].includes(p.stato) && <Button size="sm" variant="ghost" onClick={() => cambia(p, 'annullata', 'Prenotazione annullata')}>Annulla</Button>}
              </TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      <p className="mt-3 text-xs text-muted-foreground">All'arrivo la targa prenotata entra nel suo posto e la prenotazione risulta arrivata; l'anticipo si scala dalla tariffa. La prenotazione online è predisposta.</p>
      <NuovaPrenotazioneDialog open={nuova} onOpenChange={setNuova} />
    </div>
  )
}

function NuovaPrenotazioneDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { strutturaId } = useGarage()
  const { clienti, veicoli } = useAnagrafica()
  const salva = useSalva('gar_prenotazioni', ['gar_posti_stato'])
  const { data: posti = [] } = useElenco<PostoStato>('gar_posti_stato', { filtri: { struttura_id: strutturaId }, ordine: [{ colonna: 'piano' }, { colonna: 'numero' }] })
  const [f0] = useState(() => {
    const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1)
    const u = new Date(d); u.setHours(u.getHours() + 3)
    return { cliente: 'nessuno', nome: '', telefono: '', targa: '', tipo: 'auto', ingresso: oraLocale(d), uscita: oraLocale(u), posto: 'nessuno', anticipo: '', canale: 'telefono', stato: 'confermata', note: '' }
  })
  const [f, setF] = useState(f0)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const scegliCliente = (id: string) => {
    const c = clienti.find((x) => x.id === id)
    const v = veicoli.find((x) => x.cliente_id === id)
    setF({ ...f, cliente: id, nome: c?.nome ?? f.nome, telefono: c?.telefono ?? f.telefono, targa: v?.targa ?? f.targa })
  }
  function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) { toast.error('Scrivi a nome di chi'); return }
    if (new Date(f.uscita) <= new Date(f.ingresso)) { toast.error('L\'uscita deve venire dopo l\'ingresso'); return }
    const v = veicoli.find((x) => x.targa === normalizzaTarga(f.targa))
    salva.mutate({ values: {
      struttura_id: strutturaId!, cliente_id: f.cliente === 'nessuno' ? null : f.cliente, cliente_nome: f.nome.trim(), telefono: f.telefono.trim() || null,
      targa: f.targa.trim() || null, veicolo_id: v?.id ?? null, tipo_veicolo: f.tipo, ingresso: new Date(f.ingresso).toISOString(), uscita: new Date(f.uscita).toISOString(),
      posto_id: f.posto === 'nessuno' ? null : f.posto, anticipo: numero(f.anticipo), canale: f.canale, stato: f.stato, note: f.note.trim() || null } }, {
      onSuccess: (p) => { toast.success(`Prenotazione ${p.codice}: ${fmtEuro(p.importo_previsto)} previsti`); setF(f0); onOpenChange(false) },
      onError: (err) => toast.error(messaggioErrore(err)),
    })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuova prenotazione</DialogTitle>
          <DialogDescription>L'importo previsto si calcola dal tariffario del veicolo; se il cliente ha l'email riceve la conferma.</DialogDescription></DialogHeader>
        <form onSubmit={crea} className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5"><Label htmlFor="np-cli">Cliente in anagrafica</Label>
            <Select value={f.cliente} onValueChange={scegliCliente}><SelectTrigger id="np-cli"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">Nessuno: cliente occasionale</SelectItem>{clienti.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="np-nome">A nome di *</Label><Input id="np-nome" value={f.nome} onChange={set('nome')} required /></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="np-tel">Telefono</Label><Input id="np-tel" type="tel" value={f.telefono} onChange={set('telefono')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="np-targa">Targa</Label><Input id="np-targa" className="font-mono uppercase" value={f.targa} onChange={set('targa')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="np-tipo">Veicolo</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="np-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(VEICOLO_TIPO).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="np-in">Ingresso</Label><Input id="np-in" type="datetime-local" value={f.ingresso} onChange={set('ingresso')} required /></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="np-out">Uscita prevista</Label><Input id="np-out" type="datetime-local" value={f.uscita} onChange={set('uscita')} required /></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="np-posto">Posto richiesto</Label>
            <Select value={f.posto} onValueChange={(v) => setF({ ...f, posto: v })}><SelectTrigger id="np-posto"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">Il primo libero all'arrivo</SelectItem>
                {posti.filter((p) => !p.fermo && !p.riservato).map((p) => <SelectItem key={p.posto_id!} value={p.posto_id!}>{p.codice} · {POSTO_TIPO[p.tipo!]}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5 sm:col-span-1"><Label htmlFor="np-ant">Anticipo €</Label><Input id="np-ant" inputMode="decimal" value={f.anticipo} onChange={set('anticipo')} /></div>
          <div className="col-span-3 space-y-1.5 sm:col-span-2"><Label htmlFor="np-can">Canale</Label>
            <Select value={f.canale} onValueChange={(v) => setF({ ...f, canale: v })}><SelectTrigger id="np-can"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(CANALE).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="np-note">Note</Label><Input id="np-note" value={f.note} onChange={set('note')} /></div>
          <label className="col-span-6 flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={f.stato === 'richiesta'} onChange={(e) => setF({ ...f, stato: e.target.checked ? 'richiesta' : 'confermata' })} />
            Da confermare più tardi</label>
          <DialogFooter className="col-span-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={salva.isPending}>Prenota</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
