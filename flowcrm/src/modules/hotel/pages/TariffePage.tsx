/**
 * Camere e tariffe (documento Hotel §1–3, §10–11, §17): tipologie e camere,
 * trattamenti, piani tariffari con le loro regole, tariffe per periodo e
 * restrizioni, e il revenue management: suggerimenti di prezzo dalla domanda
 * prevista e dai concorrenti, applicati solo dalla direzione.
 */
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Download, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { ManagerOnly } from '@/components/ManagerOnly'
import { supabase } from '@/lib/supabase'
import { scaricaCsv, toCsv } from '@/lib/csv'
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useRpc, useSalva, useInserisci, useAzione, useElimina, messaggioErrore } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { useCatalogoHotel } from '@/modules/hotel/queries'
import { PIANO_TIPO, TIPOLOGIA_CATEGORIA, fmtData, fmtEuro, oggiIso, piuGiorni } from '@/modules/hotel/stati'

type Suggerimento = Database['public']['Functions']['hotel_suggerimenti_tariffe']['Returns'][number]
const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))
const GIORNI_SETTIMANA = [['1', 'Lu'], ['2', 'Ma'], ['3', 'Me'], ['4', 'Gi'], ['5', 'Ve'], ['6', 'Sa'], ['7', 'Do']]

export function TariffePage() {
  return <ManagerOnly><ConStruttura><Tariffe_ /></ConStruttura></ManagerOnly>
}

function Tariffe_() {
  return (
    <div>
      <PageHeader title="Camere e tariffe" description="Tipologie, camere, trattamenti, piani tariffari, prezzi per periodo e suggerimenti di revenue."
        actions={<><SelettoreStruttura /><EsportaCanali /></>} />
      <Tabs defaultValue="tariffe">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="tariffe">Tariffe</TabsTrigger><TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="piani">Piani tariffari</TabsTrigger><TabsTrigger value="trattamenti">Trattamenti</TabsTrigger>
          <TabsTrigger value="tipologie">Tipologie e camere</TabsTrigger>
        </TabsList>
        <TabsContent value="tariffe"><Tariffe /></TabsContent>
        <TabsContent value="revenue"><Revenue /></TabsContent>
        <TabsContent value="piani"><Piani /></TabsContent>
        <TabsContent value="trattamenti"><Trattamenti /></TabsContent>
        <TabsContent value="tipologie"><Tipologie /></TabsContent>
      </Tabs>
    </div>
  )
}

function Tariffe() {
  const { strutturaId } = useHotel()
  const { tipologie, piani } = useCatalogoHotel(strutturaId)
  const { data: tariffe = [], isLoading } = useElenco<Tables<'hotel_tariffe'>>('hotel_tariffe', {
    filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'dal' }, { colonna: 'priorita', crescente: false }], limite: 1000, abilitato: !!strutturaId,
  })
  const salva = useInserisci('hotel_tariffe', ['hotel_tariffe', 'fond-rpc'])
  const elimina = useElimina('hotel_tariffe', ['fond-rpc'])
  const [f, setF] = useState({ piano: '', tipologia: '', dal: oggiIso(), al: piuGiorni(oggiIso(), 90), prezzo: '', persona: '', singola: '', minimo: '',
    giorni: ['1', '2', '3', '4', '5', '6', '7'], chiusoArrivo: false, chiusoPartenza: false, stop: false, priorita: '0' })
  const piano = (id: string) => piani.find((p) => p.id === id)?.nome
  const tipologia = (id: string) => tipologie.find((t) => t.id === id)?.nome

  function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.piano || !f.tipologia || num(f.prezzo) === null) { toast.error('Piano, tipologia e prezzo'); return }
    salva.mutate({ struttura_id: strutturaId!, piano_id: f.piano, tipologia_id: f.tipologia, dal: f.dal, al: f.al, prezzo: num(f.prezzo)!,
      supplemento_persona: num(f.persona) ?? 0, riduzione_singola: num(f.singola) ?? 0, soggiorno_min: f.minimo ? Number(f.minimo) : null,
      giorni: f.giorni.map(Number), chiuso_arrivo: f.chiusoArrivo, chiuso_partenza: f.chiusoPartenza, stop_vendita: f.stop, priorita: Number(f.priorita) || 0 }, {
      onSuccess: () => { toast.success('Tariffa salvata: le nuove prenotazioni la usano subito'); setF({ ...f, prezzo: '' }) },
      onError: (err) => toast.error(messaggioErrore(err)) })
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={crea} className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          <div className="space-y-1.5"><Label>Piano</Label>
            <Select value={f.piano} onValueChange={(v) => setF({ ...f, piano: v })}><SelectTrigger aria-label="Piano tariffario"><SelectValue placeholder="Scegli…" /></SelectTrigger>
              <SelectContent>{piani.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Tipologia</Label>
            <Select value={f.tipologia} onValueChange={(v) => setF({ ...f, tipologia: v })}><SelectTrigger aria-label="Tipologia"><SelectValue placeholder="Scegli…" /></SelectTrigger>
              <SelectContent>{tipologie.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="tf-dal">Dal</Label><Input id="tf-dal" type="date" value={f.dal} onChange={(e) => setF({ ...f, dal: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tf-al">Al</Label><Input id="tf-al" type="date" value={f.al} onChange={(e) => setF({ ...f, al: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tf-p">Prezzo a notte (€)</Label><Input id="tf-p" inputMode="decimal" value={f.prezzo} onChange={(e) => setF({ ...f, prezzo: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tf-pers">Persona in più (€)</Label><Input id="tf-pers" inputMode="decimal" value={f.persona} onChange={(e) => setF({ ...f, persona: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tf-sgl">Uso singola (−€)</Label><Input id="tf-sgl" inputMode="decimal" value={f.singola} onChange={(e) => setF({ ...f, singola: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tf-min">Soggiorno minimo</Label><Input id="tf-min" type="number" min={1} value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tf-pri">Priorità</Label><Input id="tf-pri" type="number" value={f.priorita} onChange={(e) => setF({ ...f, priorita: e.target.value })} /></div>
          <fieldset className="col-span-2 space-y-1.5 sm:col-span-3"><legend className="text-sm font-medium text-foreground">Giorni</legend>
            <div className="flex flex-wrap gap-3">{GIORNI_SETTIMANA.map(([k, l]) => (
              <label key={k} className="flex items-center gap-1.5 text-sm"><Checkbox checked={f.giorni.includes(k)}
                onCheckedChange={(v) => setF({ ...f, giorni: v ? [...f.giorni, k] : f.giorni.filter((x) => x !== k) })} />{l}</label>))}</div>
          </fieldset>
          <div className="col-span-2 flex flex-wrap items-center gap-4 text-sm sm:col-span-4 xl:col-span-6">
            <label className="flex items-center gap-2"><Switch checked={f.chiusoArrivo} onCheckedChange={(v) => setF({ ...f, chiusoArrivo: v })} /> Chiuso all'arrivo</label>
            <label className="flex items-center gap-2"><Switch checked={f.chiusoPartenza} onCheckedChange={(v) => setF({ ...f, chiusoPartenza: v })} /> Chiuso alla partenza</label>
            <label className="flex items-center gap-2"><Switch checked={f.stop} onCheckedChange={(v) => setF({ ...f, stop: v })} /> Stop vendita</label>
            <BottoneScrittura type="submit" className="ml-auto">Salva la tariffa</BottoneScrittura>
          </div>
        </form>
      </Card>
      {isLoading ? <Skeleton className="h-40" /> : tariffe.length === 0 ? (
        <EmptyState compatto icon={TrendingUp} filtrato title="Nessuna tariffa per periodo" description="Senza tariffe vale il prezzo base della tipologia; i piani derivati applicano la loro variazione." />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Piano</TableHead><TableHead>Tipologia</TableHead><TableHead>Periodo</TableHead><TableHead className="text-right">Prezzo</TableHead>
              <TableHead>Regole</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{tariffe.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-foreground">{piano(t.piano_id)}</TableCell><TableCell className="text-muted-foreground">{tipologia(t.tipologia_id)}</TableCell>
                <TableCell className="text-muted-foreground">{fmtData(t.dal)} → {fmtData(t.al)}{t.giorni.length < 7 ? <span className="block text-xs">{t.giorni.map((g) => GIORNI_SETTIMANA[g - 1][1]).join(' ')}</span> : null}</TableCell>
                <TableCell numerica>{fmtEuro(t.prezzo)}{Number(t.supplemento_persona) ? <span className="block text-xs text-muted-foreground">+{fmtEuro(t.supplemento_persona)} a persona</span> : null}</TableCell>
                <TableCell className="space-x-1">{t.soggiorno_min ? <Badge tone="info">min {t.soggiorno_min} notti</Badge> : null}{t.chiuso_arrivo ? <Badge tone="warning">CTA</Badge> : null}
                  {t.chiuso_partenza ? <Badge tone="warning">CTD</Badge> : null}{t.stop_vendita ? <Badge tone="danger">Stop</Badge> : null}{t.priorita ? <Badge tone="neutral">priorità {t.priorita}</Badge> : null}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => elimina.mutate(t.id, { onError: (e) => toast.error(messaggioErrore(e)) })}>Togli</Button></TableCell>
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Revenue() {
  const { strutturaId } = useHotel()
  const [dal, setDal] = useState(oggiIso())
  const [al, setAl] = useState(piuGiorni(oggiIso(), 13))
  const { data: suggerimenti = [], isLoading } = useRpc<Suggerimento[]>('hotel_suggerimenti_tariffe', { p_struttura: strutturaId, p_dal: dal, p_al: al }, { abilitato: !!strutturaId })
  const { data: regole = [] } = useElenco<Tables<'hotel_revenue_regole'>>('hotel_revenue_regole', { filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'priorita', crescente: false }] })
  const applica = useAzione('hotel_applica_prezzo', ['hotel_tariffe'])
  const salvaRegola = useInserisci('hotel_revenue_regole', ['hotel_revenue_regole', 'fond-rpc'])
  const eliminaRegola = useElimina('hotel_revenue_regole', ['fond-rpc'])
  const competitor = useInserisci('hotel_competitor_prezzi', ['fond-rpc'])
  const [r, setR] = useState({ nome: '', da: '80', a: '100', anticipo: '', variazione: '15' })
  const [c, setC] = useState({ nome: '', data: oggiIso(), tipologia: 'doppia', prezzo: '' })
  const diversi = suggerimenti.filter((s) => s.regola)

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label htmlFor="rv-dal">Dal</Label><Input id="rv-dal" type="date" value={dal} onChange={(e) => setDal(e.target.value)} className="w-40" /></div>
        <div className="space-y-1.5"><Label htmlFor="rv-al">Al</Label><Input id="rv-al" type="date" value={al} onChange={(e) => setAl(e.target.value)} className="w-40" /></div>
        <p className="max-w-[70ch] text-sm text-muted-foreground">Occupazione prevista = venduto più il pickup medio delle settimane passate. Il prezzo suggerito parte dal BAR e applica la regola che scatta: nulla cambia finché non lo applichi tu.</p>
      </Card>
      {isLoading ? <Skeleton className="h-48" /> : suggerimenti.length === 0 ? (
        <EmptyState compatto icon={TrendingUp} filtrato title="Nessuna tipologia nel periodo" description="Allarga il periodo." />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Notte</TableHead><TableHead>Tipologia</TableHead><TableHead className="text-right">Venduto</TableHead><TableHead className="text-right">Previsto</TableHead>
              <TableHead className="text-right">BAR</TableHead><TableHead className="text-right">Concorrenti</TableHead><TableHead>Regola</TableHead><TableHead className="text-right">Suggerito</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{suggerimenti.map((s) => {
              const cambia = s.prezzo_suggerito != null && s.prezzo_attuale != null && Number(s.prezzo_suggerito) !== Number(s.prezzo_attuale)
              return (
                <TableRow key={`${s.data}-${s.tipologia_id}`}>
                  <TableCell className="text-foreground">{new Date(`${s.data}T12:00`).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</TableCell>
                  <TableCell className="text-muted-foreground">{s.tipologia}</TableCell>
                  <TableCell numerica>{s.occupazione_pct ?? 0}%</TableCell>
                  <TableCell numerica className={Number(s.prevista_pct) >= 90 ? 'font-semibold text-foreground' : undefined}>{s.prevista_pct ?? 0}%</TableCell>
                  <TableCell numerica>{fmtEuro(s.prezzo_attuale)}</TableCell>
                  <TableCell numerica>{s.prezzo_concorrenti != null ? fmtEuro(s.prezzo_concorrenti) : '—'}</TableCell>
                  <TableCell>{s.regola ? <Badge tone={Number(s.variazione_pct) > 0 ? 'success' : 'warning'}>{s.regola} {Number(s.variazione_pct) > 0 ? '+' : ''}{s.variazione_pct}%</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell numerica className={cambia ? 'font-semibold text-foreground' : undefined}>{fmtEuro(s.prezzo_suggerito)}</TableCell>
                  <TableCell className="text-right">{cambia && (
                    <Button size="sm" variant="outline" disabled={applica.isPending}
                      onClick={() => applica.mutate({ p_struttura: strutturaId!, p_tipologia: s.tipologia_id!, p_data: s.data!, p_prezzo: Number(s.prezzo_suggerito) }, {
                        onSuccess: () => toast.success(`${s.tipologia} del ${fmtData(s.data)} a ${fmtEuro(s.prezzo_suggerito)}`), onError: (e) => toast.error(messaggioErrore(e)) })}>Applica</Button>
                  )}</TableCell>
                </TableRow>
              )
            })}</TableBody>
          </Table>
          {diversi.length === 0 && <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">Nessuna regola scatta nel periodo: aggiungine una qui sotto.</p>}
        </Card>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h3 className="text-title text-foreground">Regole di prezzo</h3>
          {regole.length > 0 && (
            <ul className="divide-y divide-border text-sm">{regole.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="text-foreground">{x.nome}: occupazione {x.occupazione_da}–{x.occupazione_a}%{x.anticipo_max_giorni != null ? ` a ${x.anticipo_max_giorni} giorni dall'arrivo` : ''} → {Number(x.variazione_pct) > 0 ? '+' : ''}{x.variazione_pct}%</span>
                <Button size="sm" variant="ghost" onClick={() => eliminaRegola.mutate(x.id)}>Togli</Button>
              </li>))}</ul>
          )}
          <form onSubmit={(e) => { e.preventDefault(); if (!r.nome.trim()) return
            salvaRegola.mutate({ struttura_id: strutturaId!, nome: r.nome.trim(), occupazione_da: Number(r.da), occupazione_a: Number(r.a),
              anticipo_max_giorni: r.anticipo ? Number(r.anticipo) : null, variazione_pct: Number(r.variazione.replace(',', '.')) }, {
              onSuccess: () => { toast.success('Regola aggiunta'); setR({ ...r, nome: '' }) }, onError: (err) => toast.error(messaggioErrore(err)) }) }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="col-span-2 space-y-1.5"><Label htmlFor="rr-n">Nome</Label><Input id="rr-n" value={r.nome} onChange={(e) => setR({ ...r, nome: e.target.value })} placeholder="Alta domanda" /></div>
            <div className="space-y-1.5"><Label htmlFor="rr-da">Da %</Label><Input id="rr-da" type="number" value={r.da} onChange={(e) => setR({ ...r, da: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="rr-a">A %</Label><Input id="rr-a" type="number" value={r.a} onChange={(e) => setR({ ...r, a: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="rr-v">Variazione %</Label><Input id="rr-v" value={r.variazione} onChange={(e) => setR({ ...r, variazione: e.target.value })} /></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="rr-ant">Solo a giorni dall'arrivo (max)</Label><Input id="rr-ant" type="number" value={r.anticipo} onChange={(e) => setR({ ...r, anticipo: e.target.value })} placeholder="Sempre" /></div>
            <div className="col-span-2 flex items-end justify-end sm:col-span-3"><BottoneScrittura type="submit" variant="outline">Aggiungi la regola</BottoneScrittura></div>
          </form>
        </Card>
        <Card className="space-y-3 p-4">
          <h3 className="text-title text-foreground">Prezzi dei concorrenti</h3>
          <p className="text-sm text-muted-foreground">Rilevazione manuale; il collegamento a un rate shopper è predisposto.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (!c.nome.trim() || num(c.prezzo) === null) return
            competitor.mutate({ struttura_id: strutturaId!, competitor: c.nome.trim(), data: c.data, tipologia: c.tipologia, prezzo: num(c.prezzo)!, fonte: 'manuale' }, {
              onSuccess: () => { toast.success('Prezzo registrato'); setC({ ...c, prezzo: '' }) },
              onError: (err) => toast.error(/23505/.test(JSON.stringify(err)) ? 'Prezzo già registrato per quel giorno' : messaggioErrore(err)) }) }}
            className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="cp-n">Concorrente</Label><Input id="cp-n" value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="cp-d">Notte</Label><Input id="cp-d" type="date" value={c.data} onChange={(e) => setC({ ...c, data: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Tipologia</Label>
              <Select value={c.tipologia} onValueChange={(v) => setC({ ...c, tipologia: v })}><SelectTrigger aria-label="Tipologia del concorrente"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TIPOLOGIA_CATEGORIA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="cp-p">Prezzo (€)</Label><Input id="cp-p" inputMode="decimal" value={c.prezzo} onChange={(e) => setC({ ...c, prezzo: e.target.value })} /></div>
            <div className="col-span-2 flex justify-end"><BottoneScrittura type="submit" variant="outline">Registra</BottoneScrittura></div>
          </form>
        </Card>
      </div>
    </div>
  )
}

function Piani() {
  const { strutturaId } = useHotel()
  const { piani, trattamenti } = useCatalogoHotel(strutturaId)
  const { data: aziende = [] } = useElenco<Pick<Tables<'organizzazioni'>, 'id' | 'ragione_sociale'>>('organizzazioni', { filtri: { attivo: true }, select: 'id, ragione_sociale', ordine: [{ colonna: 'ragione_sociale' }], limite: 1000 })
  const salva = useSalva('hotel_piani_tariffari', ['fond-rpc'])
  const [f, setF] = useState({ codice: '', nome: '', tipo: 'flex', base: 'nessuno', variazione: '0', rimborsabile: true, cancellazione: '2', penale: '100', caparra: '0',
    antMin: '', antMax: '', minimo: '', massimo: '', trattamento: 'nessuno', azienda: 'nessuno', valDal: '', valAl: '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.codice.trim() || !f.nome.trim()) { toast.error('Codice e nome'); return }
    salva.mutate({ values: { struttura_id: strutturaId!, codice: f.codice.trim().toUpperCase(), nome: f.nome.trim(), tipo: f.tipo,
      base_piano_id: f.base === 'nessuno' ? null : f.base, variazione_pct: Number(f.variazione.replace(',', '.')) || 0, rimborsabile: f.rimborsabile,
      cancellazione_giorni: Number(f.cancellazione) || 0, penale_pct: Number(f.penale) || 0, caparra_pct: Number(f.caparra) || 0,
      anticipo_min_giorni: f.antMin ? Number(f.antMin) : null, anticipo_max_giorni: f.antMax ? Number(f.antMax) : null,
      soggiorno_min: f.minimo ? Number(f.minimo) : null, soggiorno_max: f.massimo ? Number(f.massimo) : null,
      trattamento_id: f.trattamento === 'nessuno' ? null : f.trattamento, organizzazione_id: f.azienda === 'nessuno' ? null : f.azienda,
      valido_dal: f.valDal || null, valido_al: f.valAl || null, ordine: piani.length } }, {
      onSuccess: () => { toast.success('Piano tariffario creato'); setF({ ...f, codice: '', nome: '' }) },
      onError: (err) => toast.error(/23505/.test(JSON.stringify(err)) ? 'Codice già usato' : messaggioErrore(err)) })
  }
  return (
    <div className="space-y-4">
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Piano</TableHead><TableHead>Tipo</TableHead><TableHead>Prezzo</TableHead><TableHead>Cancellazione</TableHead><TableHead>Regole</TableHead><TableHead>Attivo</TableHead></TableRow></TableHeader>
          <TableBody>{piani.map((p) => (
            <TableRow key={p.id}>
              <TableCell><span className="font-medium text-foreground">{p.nome}</span><span className="block font-mono text-xs text-muted-foreground">{p.codice}</span></TableCell>
              <TableCell className="text-muted-foreground">{PIANO_TIPO[p.tipo]}</TableCell>
              <TableCell className="text-muted-foreground">{p.base_piano_id ? `${piani.find((x) => x.id === p.base_piano_id)?.codice} ${Number(p.variazione_pct) >= 0 ? '+' : ''}${p.variazione_pct}%` : 'Tariffe proprie'}</TableCell>
              <TableCell className="text-muted-foreground">{p.rimborsabile ? `gratis fino a ${p.cancellazione_giorni} giorni, poi ${p.penale_pct}%` : 'Non rimborsabile'}{Number(p.caparra_pct) ? ` · caparra ${p.caparra_pct}%` : ''}</TableCell>
              <TableCell className="space-x-1 text-xs">{p.anticipo_min_giorni != null && <Badge tone="info">≥ {p.anticipo_min_giorni} gg prima</Badge>}{p.anticipo_max_giorni != null && <Badge tone="info">≤ {p.anticipo_max_giorni} gg prima</Badge>}
                {p.soggiorno_min && <Badge tone="neutral">min {p.soggiorno_min}</Badge>}{p.soggiorno_max && <Badge tone="neutral">max {p.soggiorno_max}</Badge>}</TableCell>
              <TableCell><Switch checked={p.attivo} aria-label={`${p.nome} attivo`} onCheckedChange={(v) => salva.mutate({ id: p.id, values: { attivo: v } })} /></TableCell>
            </TableRow>))}</TableBody>
        </Table>
      </Card>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Nuovo piano</h3>
        <form onSubmit={crea} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1.5"><Label htmlFor="pt-c">Codice</Label><Input id="pt-c" value={f.codice} onChange={set('codice')} placeholder="WKD" /></div>
          <div className="space-y-1.5"><Label htmlFor="pt-n">Nome</Label><Input id="pt-n" value={f.nome} onChange={set('nome')} placeholder="Weekend romantico" /></div>
          <div className="space-y-1.5"><Label>Tipo</Label><Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger aria-label="Tipo di piano"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(PIANO_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Deriva da</Label><Select value={f.base} onValueChange={(v) => setF({ ...f, base: v })}><SelectTrigger aria-label="Piano di base"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nessuno">Tariffe proprie</SelectItem>{piani.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="pt-v">Variazione %</Label><Input id="pt-v" value={f.variazione} onChange={set('variazione')} /></div>
          <div className="space-y-1.5"><Label htmlFor="pt-cg">Cancellazione gratis fino a (giorni)</Label><Input id="pt-cg" type="number" value={f.cancellazione} onChange={set('cancellazione')} /></div>
          <div className="space-y-1.5"><Label htmlFor="pt-pe">Penale %</Label><Input id="pt-pe" type="number" value={f.penale} onChange={set('penale')} /></div>
          <div className="space-y-1.5"><Label htmlFor="pt-ca">Caparra %</Label><Input id="pt-ca" type="number" value={f.caparra} onChange={set('caparra')} /></div>
          <div className="space-y-1.5"><Label htmlFor="pt-am">Prenota almeno (giorni prima)</Label><Input id="pt-am" type="number" value={f.antMin} onChange={set('antMin')} placeholder="Early booking" /></div>
          <div className="space-y-1.5"><Label htmlFor="pt-ax">Prenota al massimo (giorni prima)</Label><Input id="pt-ax" type="number" value={f.antMax} onChange={set('antMax')} placeholder="Last minute" /></div>
          <div className="space-y-1.5"><Label htmlFor="pt-mi">Soggiorno minimo</Label><Input id="pt-mi" type="number" value={f.minimo} onChange={set('minimo')} /></div>
          <div className="space-y-1.5"><Label htmlFor="pt-ma">Soggiorno massimo</Label><Input id="pt-ma" type="number" value={f.massimo} onChange={set('massimo')} /></div>
          <div className="space-y-1.5"><Label>Trattamento incluso</Label><Select value={f.trattamento} onValueChange={(v) => setF({ ...f, trattamento: v })}><SelectTrigger aria-label="Trattamento incluso"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nessuno">A scelta</SelectItem>{trattamenti.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Azienda (corporate)</Label><Select value={f.azienda} onValueChange={(v) => setF({ ...f, azienda: v })}><SelectTrigger aria-label="Azienda"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nessuno">Per tutti</SelectItem>{aziende.map((a) => <SelectItem key={a.id} value={a.id}>{a.ragione_sociale}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="pt-vd">Valido dal</Label><Input id="pt-vd" type="date" value={f.valDal} onChange={set('valDal')} /></div>
          <div className="space-y-1.5"><Label htmlFor="pt-va">Valido al</Label><Input id="pt-va" type="date" value={f.valAl} onChange={set('valAl')} /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.rimborsabile} onCheckedChange={(v) => setF({ ...f, rimborsabile: v })} /> Rimborsabile</label>
          <div className="col-span-2 flex justify-end sm:col-span-3"><BottoneScrittura type="submit" variant="outline">Crea il piano</BottoneScrittura></div>
        </form>
      </Card>
    </div>
  )
}

function Trattamenti() {
  const { strutturaId } = useHotel()
  const { trattamenti } = useCatalogoHotel(strutturaId)
  const salva = useSalva('hotel_trattamenti', ['fond-rpc'])
  return (
    <Card className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Trattamento</TableHead><TableHead>Pasti inclusi</TableHead><TableHead className="text-right">Adulto a notte</TableHead><TableHead className="text-right">Bambino a notte</TableHead><TableHead>Attivo</TableHead></TableRow></TableHeader>
        <TableBody>{trattamenti.map((t) => (
          <TableRow key={t.id}>
            <TableCell><span className="font-medium text-foreground">{t.nome}</span><span className="block font-mono text-xs text-muted-foreground">{t.codice}</span></TableCell>
            <TableCell className="text-muted-foreground">{[t.colazione && 'colazione', t.pranzo && 'pranzo', t.cena && 'cena', t.bevande && 'bevande'].filter(Boolean).join(', ') || 'nessuno'}</TableCell>
            {(['supplemento_adulto', 'supplemento_bambino'] as const).map((k) => (
              <TableCell key={k} className="text-right"><Input className="ml-auto h-8 w-24 text-right" inputMode="decimal" defaultValue={t[k]} key={`${t.id}-${k}-${t[k]}`} aria-label={k.replace('_', ' ')}
                onBlur={(e) => { const v = Number(e.target.value.replace(',', '.')); if (!Number.isNaN(v) && v !== Number(t[k])) salva.mutate({ id: t.id, values: { [k]: v } },
                  { onSuccess: () => toast.success('Supplemento aggiornato'), onError: (err) => toast.error(messaggioErrore(err)) }) }} /></TableCell>
            ))}
            <TableCell><Switch checked={t.attivo} aria-label={`${t.nome} attivo`} onCheckedChange={(v) => salva.mutate({ id: t.id, values: { attivo: v } })} /></TableCell>
          </TableRow>))}</TableBody>
      </Table>
    </Card>
  )
}

function Tipologie() {
  const { strutturaId } = useHotel()
  const { tipologie, camere } = useCatalogoHotel(strutturaId)
  const salvaTip = useSalva('hotel_tipologie', ['fond-rpc'])
  const salvaCam = useSalva('hotel_camere', ['hotel_camere_stato'])
  const [t, setT] = useState({ codice: '', nome: '', categoria: 'doppia', base: '2', max: '2', prezzo: '' })
  const [c, setC] = useState({ numero: '', piano: '', tipologia: '' })
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="space-y-3 p-4">
        <h3 className="text-title text-foreground">Tipologie</h3>
        <ul className="divide-y divide-border text-sm">{tipologie.map((x) => (
          <li key={x.id} className="flex items-center justify-between gap-2 py-2">
            <span><span className="font-medium text-foreground">{x.nome}</span> <span className="text-muted-foreground">· {x.occupazione_base}–{x.occupazione_max} persone · {camere.filter((k) => k.tipologia_id === x.id).length} camere</span></span>
            <span className="flex items-center gap-2"><Input className="h-8 w-24 text-right" inputMode="decimal" defaultValue={x.prezzo_base} key={`${x.id}-${x.prezzo_base}`} aria-label={`Prezzo base ${x.nome}`}
              onBlur={(e) => { const v = Number(e.target.value.replace(',', '.')); if (!Number.isNaN(v) && v !== Number(x.prezzo_base)) salvaTip.mutate({ id: x.id, values: { prezzo_base: v } }) }} />
              <span className="text-xs text-muted-foreground">€ base</span></span>
          </li>))}</ul>
        <form onSubmit={(e) => { e.preventDefault(); if (!t.codice.trim() || !t.nome.trim()) return
          salvaTip.mutate({ values: { struttura_id: strutturaId!, codice: t.codice.trim().toUpperCase(), nome: t.nome.trim(), categoria: t.categoria,
            occupazione_base: Number(t.base) || 2, occupazione_min: 1, occupazione_max: Math.max(Number(t.max) || 2, Number(t.base) || 2), prezzo_base: Number(t.prezzo.replace(',', '.')) || 0, ordine: tipologie.length } }, {
            onSuccess: () => { toast.success('Tipologia aggiunta'); setT({ ...t, codice: '', nome: '' }) }, onError: (err) => toast.error(messaggioErrore(err)) }) }}
          className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="tp-c">Codice</Label><Input id="tp-c" value={t.codice} onChange={(e) => setT({ ...t, codice: e.target.value })} placeholder="DLX" /></div>
          <div className="space-y-1.5"><Label htmlFor="tp-n">Nome</Label><Input id="tp-n" value={t.nome} onChange={(e) => setT({ ...t, nome: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Categoria</Label><Select value={t.categoria} onValueChange={(v) => setT({ ...t, categoria: v })}><SelectTrigger aria-label="Categoria"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TIPOLOGIA_CATEGORIA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="tp-b">Persone base</Label><Input id="tp-b" type="number" min={1} value={t.base} onChange={(e) => setT({ ...t, base: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tp-m">Massimo</Label><Input id="tp-m" type="number" min={1} value={t.max} onChange={(e) => setT({ ...t, max: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tp-p">Prezzo base (€)</Label><Input id="tp-p" inputMode="decimal" value={t.prezzo} onChange={(e) => setT({ ...t, prezzo: e.target.value })} /></div>
          <div className="col-span-2 flex justify-end sm:col-span-3"><BottoneScrittura type="submit" variant="outline">Aggiungi la tipologia</BottoneScrittura></div>
        </form>
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="text-title text-foreground">Camere</h3>
        <p className="text-sm text-muted-foreground">{camere.length} camere su {new Set(camere.map((x) => x.piano)).size} piani.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (!c.numero.trim() || !c.tipologia) return
          salvaCam.mutate({ values: { struttura_id: strutturaId!, numero: c.numero.trim(), piano: c.piano ? Number(c.piano) : null, tipologia_id: c.tipologia, ordine: camere.length } }, {
            onSuccess: () => { toast.success(`Camera ${c.numero} aggiunta`); setC({ ...c, numero: '' }) },
            onError: (err) => toast.error(/23505/.test(JSON.stringify(err)) ? 'Numero di camera già usato' : messaggioErrore(err)) }) }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1.5"><Label htmlFor="cm-n">Numero</Label><Input id="cm-n" value={c.numero} onChange={(e) => setC({ ...c, numero: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="cm-p">Piano</Label><Input id="cm-p" type="number" value={c.piano} onChange={(e) => setC({ ...c, piano: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Tipologia</Label><Select value={c.tipologia} onValueChange={(v) => setC({ ...c, tipologia: v })}><SelectTrigger aria-label="Tipologia della camera"><SelectValue placeholder="Scegli…" /></SelectTrigger>
            <SelectContent>{tipologie.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 flex justify-end sm:col-span-4"><BottoneScrittura type="submit" variant="outline">Aggiungi la camera</BottoneScrittura></div>
        </form>
      </Card>
    </div>
  )
}

/** Disponibilità, prezzi e restrizioni dei prossimi 90 giorni per channel manager e booking engine
 *  (collegamento diretto predisposto, oggi il file da caricare). */
function EsportaCanali() {
  const { strutturaId, struttura } = useHotel()
  const [inCorso, setInCorso] = useState(false)
  async function esporta() {
    setInCorso(true)
    const dal = oggiIso()
    const { data, error } = await supabase.rpc('hotel_ari', { p_struttura: strutturaId!, p_dal: dal, p_al: piuGiorni(dal, 89) })
    setInCorso(false)
    if (error) { toast.error(messaggioErrore(error)); return }
    const sn = (b: boolean | null) => (b ? 'sì' : 'no')
    scaricaCsv(`disponibilita_prezzi_${(struttura?.nome ?? 'hotel').replace(/\W+/g, '_')}_${dal}`, toCsv(
      ['Data', 'Tipologia', 'Codice tipologia', 'Piano', 'Codice piano', 'Disponibili', 'Prezzo', 'Soggiorno minimo', "Chiuso all'arrivo", 'Chiuso alla partenza', 'Stop vendita'],
      (data ?? []).map((r) => [r.data, r.tipologia, r.tipologia_codice, r.piano, r.piano_codice, r.disponibili, r.prezzo, r.soggiorno_min, sn(r.chiuso_arrivo), sn(r.chiuso_partenza), sn(r.stop_vendita)])))
    toast.success('File per i canali scaricato: 90 giorni')
  }
  return <Button variant="outline" onClick={esporta} disabled={!strutturaId || inCorso}><Download className="h-4 w-4" /> Esporta per i canali</Button>
}
