/**
 * Gestione del fiorista: catalogo e composizioni con le foto (§1, §4, §24),
 * magazzino floreale con fabbisogno e sprechi (§2–3, §16–17, §23), eventi e
 * cerimonie (§11–13), abbonamenti floreali (§14), clienti e ricorrenze
 * (§7, §15, §25), negozio e zone di consegna, personale.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarHeart, Flower2, HeartHandshake, Repeat, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { ManagerOnly } from '@/components/ManagerOnly'
import { MagazzinoSezione, type RiordinoPrevisto } from '@/components/condivisi/MagazzinoSezione'
import { DistinteBaseSezione } from '@/components/condivisi/DistinteBaseSezione'
import { EventiSezione } from '@/components/condivisi/EventiSezione'
import { TurniSezione } from '@/components/condivisi/TurniSezione'
import { FidelizzazioneSezione } from '@/components/condivisi/FidelizzazioneSezione'
import { FeedbackSezione } from '@/components/condivisi/FeedbackSezione'
import { CampagneSezione } from '@/components/condivisi/CampagneSezione'
import { FotoDialog } from '@/components/condivisi/FotoDialog'
import { CercaContatto, type ContattoScelto } from '@/components/condivisi/CercaContatto'
import { useAuth } from '@/hooks/useAuth'
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useRpc, useSalva, useInserisci, useElimina, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import { ConNegozio } from '@/modules/fioraio/componenti/ConNegozio'
import { CatalogoVisuale } from '@/modules/fioraio/componenti/CatalogoVisuale'
import { NuovoOrdineDialog } from '@/modules/fioraio/dialogs/NuovoOrdineDialog'
import { useCatalogoFioraio, useImpostazioni, TABELLE_ORDINE, type Abbonamento, type Cerimonia, type ClienteRiepilogo, type Impostazioni, type Zona } from '@/modules/fioraio/queries'
import {
  ABBONAMENTO_TIPO, ALLESTIMENTI, CATEGORIE_ARTICOLO, CATEGORIE_COMPOSIZIONE, CERIMONIA_TIPO, FREQUENZA, OCCASIONE, ORDINE_STATO,
  fmtData, fmtEuro, fmtNumero, oggiIso, piuGiorni,
} from '@/modules/fioraio/stati'

const num = (s: string) => Number(s.replace(',', '.')) || 0
const NESSUNO = 'nessuno'

// ── Catalogo e composizioni ─────────────────────────────────────────────
export function CatalogoFioraioPage() {
  return <ConNegozio><Catalogo_ /></ConNegozio>
}

function Catalogo_() {
  const { composizioni } = useCatalogoFioraio()
  return (
    <div>
      <PageHeader title="Catalogo e composizioni" description="Le composizioni standard con fiori, accessori, tempo, costo e margine; il catalogo con le foto da mostrare al cliente." />
      <Tabs defaultValue="vetrina">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="vetrina">Catalogo visuale</TabsTrigger><TabsTrigger value="composizioni">Composizioni</TabsTrigger><TabsTrigger value="varianti">Foto e varianti</TabsTrigger>
        </TabsList>
        <TabsContent value="vetrina">
          {composizioni.length === 0 ? (
            <EmptyState icon={Flower2} filtrato title="Catalogo vuoto" description="Crea le composizioni nella scheda «Composizioni» e aggiungi le foto: compariranno qui, pronte da mostrare al cliente su tablet o telefono." />
          ) : <CatalogoVisuale composizioni={composizioni} />}
        </TabsContent>
        <TabsContent value="composizioni">
          <DistinteBaseSezione modulo="fioraio" moduli={['fioraio']} etichetta={{ singolare: 'composizione', plurale: 'composizioni' }} tipi={CATEGORIE_COMPOSIZIONE} />
        </TabsContent>
        <TabsContent value="varianti"><Varianti /></TabsContent>
      </Tabs>
      <p className="mt-3 text-xs text-muted-foreground">Fiori, piante, vasi e accessori (con varietà, colore, stagionalità e prezzo) si gestiscono in <Link to="/fioraio/magazzino" className="underline underline-offset-2">Magazzino</Link>.</p>
    </div>
  )
}

function Varianti() {
  const { data: distinte = [] } = useElenco<Tables<'distinte_base'>>('distinte_base', { filtri: { modulo: 'fioraio', attivo: true }, ordine: [{ colonna: 'nome' }] })
  const salva = useSalva('distinte_base')
  if (distinte.length === 0) return <EmptyState compatto icon={Flower2} filtrato title="Nessuna composizione" description="Si creano nella scheda «Composizioni»." />
  const campi = [['colori', 'Colori'], ['dimensioni', 'Dimensioni'], ['varianti', 'Varianti'], ['personalizzazioni', 'Personalizzazioni']] as const
  return (
    <Card className="divide-y divide-border">
      {distinte.map((d) => {
        const attr = (d.attributi ?? {}) as Record<string, string>
        return (
          <div key={d.id} className="grid grid-cols-2 items-end gap-3 p-4 md:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))_auto]">
            <p className="col-span-2 self-center font-medium text-foreground md:col-span-1">{d.nome}<span className="block text-xs font-normal text-muted-foreground">{fmtEuro(d.prezzo_vendita)}</span></p>
            {campi.map(([k, l]) => (
              <div key={k} className="space-y-1.5"><Label htmlFor={`va-${d.id}-${k}`}>{l}</Label>
                <Input id={`va-${d.id}-${k}`} defaultValue={attr[k] ?? ''} key={`${d.id}-${k}-${attr[k] ?? ''}`}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v !== (attr[k] ?? '')) salva.mutate({ id: d.id, values: { attributi: { ...attr, [k]: v } } }, { onError: (err) => toast.error(messaggioErrore(err)) }) }} /></div>
            ))}
            <FotoDialog entita="distinte_base" entitaId={d.id} titolo={d.nome} categorie={['foto', 'variante']} />
          </div>
        )
      })}
    </Card>
  )
}

// ── Magazzino floreale ──────────────────────────────────────────────────
type Fabbisogno = Database['public']['Functions']['fior_fabbisogno']['Returns'][number]
interface Sprechi { costo: number; resi_persi: number; per_tipo: Record<string, number>; per_prodotto: { descrizione: string; categoria: string | null; quantita: number; costo: number }[]
  per_fornitore: { fornitore: string; costo: number }[]; per_mese: { mese: string; costo: number }[] }

export function MagazzinoFioraioPage() {
  return <ConNegozio><Magazzino_ /></ConNegozio>
}

function Magazzino_() {
  const [giorni, setGiorni] = useState('7')
  const { data: fabbisogno = [] } = useRpc<Fabbisogno[]>('fior_fabbisogno', { p_giorni: Number(giorni) })
  const previste: RiordinoPrevisto[] = fabbisogno.map((x) => ({
    articolo_id: x.articolo_id, descrizione: x.descrizione, fornitore_id: x.fornitore_id, unita_misura: x.unita_misura, giacenza: Number(x.giacenza),
    scorta_minima: Number(x.scorta_minima), consumo_medio_giorno: Number(x.consumo_medio_giorno), quantita_proposta: Number(x.quantita_proposta),
    in_arrivo: 0, fattore_stagionale: 1, fabbisogno_periodo: Number(x.consumo_medio_giorno) * Number(giorni), fabbisogno_eventi: Number(x.per_eventi), fabbisogno_ordini: Number(x.per_ordini),
  }))
  return (
    <div>
      <PageHeader title="Magazzino floreale" description="Fiori, piante, vasi e materiali: lotti con arrivo e fine vita, deterioramenti e sfridi, inventari, fornitori e acquisti." />
      <MagazzinoSezione modulo="fioraio" moduli={['fioraio']} categorieArticolo={CATEGORIE_ARTICOLO}
        campiArticolo={[{ chiave: 'varieta', etichetta: 'Varietà', segnaposto: 'Rosa Red Naomi' }, { chiave: 'colore', etichetta: 'Colore' }, { chiave: 'dimensione', etichetta: 'Dimensione', segnaposto: 'Stelo 60 cm' }]}
        riordino={{ righe: previste, controlli: (
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-44 space-y-1.5"><Label>Copri i prossimi</Label>
              <Select value={giorni} onValueChange={setGiorni}><SelectTrigger aria-label="Giorni da coprire"><SelectValue /></SelectTrigger>
                <SelectContent>{['3', '7', '14', '30'].map((g) => <SelectItem key={g} value={g}>{g} giorni</SelectItem>)}</SelectContent></Select></div>
            <p className="max-w-[60ch] text-sm text-muted-foreground">Fiori e materiali per gli ordini ricevuti e gli eventi in programma, più il consumo medio dell'ultimo mese e la scorta minima; tolta la giacenza.</p>
          </div>
        ) }}
        extra={[{ valore: 'sprechi', etichetta: 'Sprechi', contenuto: <SprechiScheda /> }]} />
    </div>
  )
}

function SprechiScheda() {
  const [dal, setDal] = useState(piuGiorni(oggiIso(), -29))
  const al = oggiIso()
  const { data: s, isLoading } = useRpc<Sprechi>('fior_sprechi', { p_dal: dal, p_al: al })
  const TIPO: Record<string, string> = { deterioramento: 'Fiori deteriorati', sfrido: 'Sfridi di lavorazione', rottura: 'Rotture' }
  if (isLoading || !s) return <Skeleton className="h-48" />
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-4 p-4">
        <div className="space-y-1.5"><Label htmlFor="sp-dal">Dal</Label><Input id="sp-dal" type="date" value={dal} onChange={(e) => e.target.value && setDal(e.target.value)} /></div>
        <dl className="flex flex-wrap gap-6 text-sm">
          <div><dt className="text-muted-foreground">Costo degli sprechi</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtEuro(s.costo)}</dd></div>
          {Object.entries(s.per_tipo).map(([k, v]) => <div key={k}><dt className="text-muted-foreground">{TIPO[k] ?? k}</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtEuro(v)}</dd></div>)}
          <div><dt className="text-muted-foreground">Resi non rivendibili</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtEuro(s.resi_persi)}</dd></div>
        </dl>
      </Card>
      {s.per_prodotto.length === 0 ? (
        <EmptyState compatto icon={Flower2} filtrato title="Nessuno spreco nel periodo" description="Deterioramenti, sfridi e rotture si registrano come uscite dal magazzino." />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Prodotto</TableHead><TableHead className="text-right">Quantità</TableHead><TableHead className="text-right">Costo</TableHead></TableRow></TableHeader>
            <TableBody>{s.per_prodotto.map((p) => <TableRow key={p.descrizione}><TableCell><span className="text-foreground">{p.descrizione}</span><span className="block text-xs text-muted-foreground">{p.categoria ?? ''}</span></TableCell>
              <TableCell numerica>{fmtNumero(p.quantita, 1)}</TableCell><TableCell numerica>{fmtEuro(p.costo)}</TableCell></TableRow>)}</TableBody>
          </Table></Card>
          <Card className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Fornitore</TableHead><TableHead className="text-right">Costo degli sprechi</TableHead></TableRow></TableHeader>
            <TableBody>{s.per_fornitore.map((p) => <TableRow key={p.fornitore}><TableCell className="text-foreground">{p.fornitore}</TableCell><TableCell numerica>{fmtEuro(p.costo)}</TableCell></TableRow>)}
              {s.per_mese.map((m) => <TableRow key={m.mese}><TableCell className="text-muted-foreground">{new Date(`${m.mese}T12:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</TableCell><TableCell numerica>{fmtEuro(m.costo)}</TableCell></TableRow>)}</TableBody>
          </Table></Card>
        </div>
      )}
    </div>
  )
}

// ── Eventi e cerimonie ──────────────────────────────────────────────────
export function EventiFioraioPage() {
  return (
    <ConNegozio>
      <PageHeader title="Eventi e cerimonie" description="Matrimoni, funerali ed eventi aziendali: cliente, location, invitati, budget e margine; poi gli allestimenti floreali con consegna, montaggio e smontaggio." />
      <Tabs defaultValue="eventi">
        <TabsList className="mb-4"><TabsTrigger value="eventi">Eventi</TabsTrigger><TabsTrigger value="allestimenti">Allestimenti floreali</TabsTrigger></TabsList>
        <TabsContent value="eventi"><EventiSezione modulo="fioraio" tipi={['Matrimonio', 'Cerimonia', 'Funerale', 'Evento aziendale', 'Allestimento', 'Altro']} /></TabsContent>
        <TabsContent value="allestimenti"><Allestimenti /></TabsContent>
      </Tabs>
    </ConNegozio>
  )
}

interface Voce { voce: string; quantita: number; note: string; fatto: boolean }

function Allestimenti() {
  const { data: eventi = [], isLoading } = useElenco<Tables<'eventi'>>('eventi', { filtri: { modulo: 'fioraio' }, ordine: [{ colonna: 'inizio', crescente: false }], limite: 100 })
  const { data: cerimonie = [] } = useElenco<Cerimonia>('fior_cerimonie')
  const [sceltoId, setSceltoId] = useState<string | null>(null)
  const vivi = eventi.filter((e) => e.stato !== 'annullato')
  const scelto = vivi.find((e) => e.id === sceltoId) ?? vivi[0] ?? null
  if (isLoading) return <Skeleton className="h-48" />
  if (!scelto) return <EmptyState compatto icon={CalendarHeart} filtrato title="Nessun evento" description="Crea l'evento nella scheda «Eventi»: qui si aggiungono i dettagli floreali." />
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-fit overflow-hidden">
        <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">{vivi.map((e) => (
          <li key={e.id}><button type="button" onClick={() => setSceltoId(e.id)} aria-current={e.id === scelto.id}
            className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 ${e.id === scelto.id ? 'bg-muted' : ''}`}>
            <span className="block truncate font-medium text-foreground">{e.titolo}</span>
            <span className="block text-xs text-muted-foreground">{fmtData(e.inizio)}{cerimonie.some((c) => c.evento_id === e.id) ? '' : ' · dettagli da inserire'}</span></button></li>))}</ul>
      </Card>
      <SchedaCerimonia key={scelto.id} evento={scelto} cerimonia={cerimonie.find((c) => c.evento_id === scelto.id) ?? null} />
    </div>
  )
}

function SchedaCerimonia({ evento, cerimonia }: { evento: Tables<'eventi'>; cerimonia: Cerimonia | null }) {
  const salva = useSalva('fior_cerimonie')
  const { data: aziende = [] } = useElenco<Pick<Tables<'organizzazioni'>, 'id' | 'ragione_sociale'>>('organizzazioni', {
    filtri: { attivo: true }, select: 'id, ragione_sociale', ordine: [{ colonna: 'ragione_sociale' }], limite: 1000 })
  const tipoIniziale = cerimonia?.tipo ?? (/matrimon/i.test(evento.tipo ?? '') ? 'matrimonio' : /funer/i.test(evento.tipo ?? '') ? 'funerale' : /aziend/i.test(evento.tipo ?? '') ? 'aziendale' : 'cerimonia')
  const [f, setF] = useState({
    tipo: tipoIniziale, tema: cerimonia?.tema ?? '', colori: cerimonia?.colori ?? '', fiori: cerimonia?.fiori ?? '', luogo: cerimonia?.luogo_cerimonia ?? '',
    consegna: cerimonia?.consegna_at?.slice(0, 16) ?? '', montaggio: cerimonia?.montaggio_at?.slice(0, 16) ?? '', smontaggio: cerimonia?.smontaggio_at?.slice(0, 16) ?? '',
    agenzia: cerimonia?.agenzia_id ?? NESSUNO, defunto: cerimonia?.defunto ?? '', ricorrente: cerimonia?.ricorrente ?? false, note: cerimonia?.note ?? '',
  })
  const [voci, setVoci] = useState<Voce[]>(() => (cerimonia?.allestimenti as unknown as Voce[] | undefined)?.length
    ? (cerimonia!.allestimenti as unknown as Voce[]) : (ALLESTIMENTI[tipoIniziale] ?? []).map((v) => ({ voce: v, quantita: 0, note: '', fatto: false })))
  const [ordine, setOrdine] = useState(false)
  const iso = (v: string) => (v ? new Date(v).toISOString() : null)

  function registra(e: FormEvent) {
    e.preventDefault()
    salva.mutate({ id: cerimonia?.id, values: {
      evento_id: evento.id, tipo: f.tipo, tema: f.tema.trim() || null, colori: f.colori.trim() || null, fiori: f.fiori.trim() || null,
      luogo_cerimonia: f.luogo.trim() || null, consegna_at: iso(f.consegna), montaggio_at: iso(f.montaggio), smontaggio_at: iso(f.smontaggio),
      agenzia_id: f.agenzia === NESSUNO ? null : f.agenzia, defunto: f.defunto.trim() || null, ricorrente: f.ricorrente, note: f.note.trim() || null,
      allestimenti: voci.filter((v) => v.voce.trim()) as never,
    } }, { onSuccess: () => toast.success('Allestimenti salvati: consegna e montaggio sono in agenda'), onError: (err) => toast.error(messaggioErrore(err)) })
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-title text-foreground">{evento.titolo} · {fmtData(evento.inizio)}</h3>
        <Button variant="outline" onClick={() => setOrdine(true)}>Apri un ordine per l'evento</Button>
      </div>
      <NuovoOrdineDialog open={ordine} onOpenChange={setOrdine} eventoId={evento.id} />
      <form onSubmit={registra} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="space-y-1.5"><Label>Tipo</Label>
          <Select value={f.tipo} onValueChange={(v) => { setF({ ...f, tipo: v }); if (voci.every((x) => !x.quantita && !x.note)) setVoci((ALLESTIMENTI[v] ?? []).map((n) => ({ voce: n, quantita: 0, note: '', fatto: false }))) }}>
            <SelectTrigger aria-label="Tipo di cerimonia"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(CERIMONIA_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="ce-tema">Tema</Label><Input id="ce-tema" value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="ce-colori">Colori</Label><Input id="ce-colori" value={f.colori} onChange={(e) => setF({ ...f, colori: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="ce-fiori">Fiori</Label><Input id="ce-fiori" value={f.fiori} onChange={(e) => setF({ ...f, fiori: e.target.value })} placeholder="Peonie, rose inglesi…" /></div>
        <div className="col-span-2 space-y-1.5"><Label htmlFor="ce-luogo">{f.tipo === 'funerale' ? 'Luogo della cerimonia' : 'Chiesa o luogo della cerimonia'}</Label><Input id="ce-luogo" value={f.luogo} onChange={(e) => setF({ ...f, luogo: e.target.value })} /></div>
        <div className="col-span-2 space-y-1.5"><Label>{f.tipo === 'funerale' ? 'Agenzia funebre' : 'Wedding o event planner'}</Label>
          <Select value={f.agenzia} onValueChange={(v) => setF({ ...f, agenzia: v })}><SelectTrigger aria-label="Agenzia o planner"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={NESSUNO}>Nessuno</SelectItem>{aziende.map((a) => <SelectItem key={a.id} value={a.id}>{a.ragione_sociale}</SelectItem>)}</SelectContent></Select></div>
        {f.tipo === 'funerale' && <div className="col-span-2 space-y-1.5"><Label htmlFor="ce-def">In memoria di</Label><Input id="ce-def" value={f.defunto} onChange={(e) => setF({ ...f, defunto: e.target.value })} /></div>}
        <div className="space-y-1.5"><Label htmlFor="ce-cons">Consegna</Label><Input id="ce-cons" type="datetime-local" value={f.consegna} onChange={(e) => setF({ ...f, consegna: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="ce-mont">Montaggio</Label><Input id="ce-mont" type="datetime-local" value={f.montaggio} onChange={(e) => setF({ ...f, montaggio: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="ce-smont">Smontaggio</Label><Input id="ce-smont" type="datetime-local" value={f.smontaggio} onChange={(e) => setF({ ...f, smontaggio: e.target.value })} /></div>
        {f.tipo === 'aziendale' && <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground"><Checkbox checked={f.ricorrente} onCheckedChange={(v) => setF({ ...f, ricorrente: v === true })} />Servizio ricorrente</label>}

        <fieldset className="col-span-2 md:col-span-4">
          <legend className="mb-1.5 text-sm font-medium text-foreground">Allestimenti</legend>
          <ul className="space-y-1.5">{voci.map((v, i) => (
            <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)_4.5rem_minmax(0,1.3fr)_auto] items-center gap-2">
              <Checkbox checked={v.fatto} aria-label={`${v.voce || 'Voce'} fatto`} onCheckedChange={(x) => setVoci(voci.map((y, j) => j === i ? { ...y, fatto: x === true } : y))} />
              <Input value={v.voce} aria-label="Voce" onChange={(e) => setVoci(voci.map((y, j) => j === i ? { ...y, voce: e.target.value } : y))} />
              <Input type="number" min={0} value={v.quantita || ''} placeholder="N." aria-label={`Quantità di ${v.voce}`} onChange={(e) => setVoci(voci.map((y, j) => j === i ? { ...y, quantita: Number(e.target.value) || 0 } : y))} />
              <Input value={v.note} placeholder="Note" aria-label={`Note su ${v.voce}`} onChange={(e) => setVoci(voci.map((y, j) => j === i ? { ...y, note: e.target.value } : y))} />
              <Button type="button" size="sm" variant="ghost" aria-label={`Togli ${v.voce}`} onClick={() => setVoci(voci.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
            </li>))}</ul>
          <Button type="button" size="sm" variant="ghost" className="mt-1.5" onClick={() => setVoci([...voci, { voce: '', quantita: 1, note: '', fatto: false }])}>Aggiungi una voce</Button>
        </fieldset>
        <div className="col-span-2 space-y-1.5 md:col-span-4"><Label htmlFor="ce-note">Note</Label><Input id="ce-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        <div className="col-span-2 flex justify-end md:col-span-4"><BottoneScrittura type="submit" variant="outline" disabled={salva.isPending}>Salva gli allestimenti</BottoneScrittura></div>
      </form>
    </Card>
  )
}

// ── Abbonamenti floreali ────────────────────────────────────────────────
export function AbbonamentiFioraioPage() {
  return <ConNegozio><Abbonamenti_ /></ConNegozio>
}

function Abbonamenti_() {
  const { composizioni } = useCatalogoFioraio()
  const { data: elenco = [], isLoading } = useElenco<Abbonamento>('fior_abbonamenti', { ordine: [{ colonna: 'prossima_consegna' }] })
  const { data: aziende = [] } = useElenco<Pick<Tables<'organizzazioni'>, 'id' | 'ragione_sociale'>>('organizzazioni', {
    filtri: { attivo: true }, select: 'id, ragione_sociale', ordine: [{ colonna: 'ragione_sociale' }], limite: 1000 })
  const { data: clienti = [] } = useElenco<Pick<Tables<'contatti'>, 'id' | 'nome' | 'cognome'>>('contatti', {
    filtri: { id: elenco.map((a) => a.contatto_id).filter(Boolean) as string[] }, select: 'id, nome, cognome', abilitato: elenco.some((a) => a.contatto_id) })
  const salva = useSalva('fior_abbonamenti')
  const genera = useAzione('fior_genera_ordini_abbonamenti', [...TABELLE_ORDINE, 'fior_abbonamenti'])
  const [nome, setNome] = useState('')
  const [contatto, setContatto] = useState<ContattoScelto | null>(null)
  const vuoto = { azienda: NESSUNO, piano: '', tipo: 'bouquet', frequenza: 'settimanale', prezzo: '', composizione: NESSUNO, prodotti: '', destinatario: '', indirizzo: '', cap: '', citta: '', prima: piuGiorni(oggiIso(), 7), rinnovo: '', ritiro: false }
  const [f, setF] = useState(vuoto)
  const [aperto, setAperto] = useState(false)
  const chi = (a: Abbonamento) => aziende.find((x) => x.id === a.organizzazione_id)?.ragione_sociale
    ?? (() => { const c = clienti.find((x) => x.id === a.contatto_id); return c ? `${c.nome} ${c.cognome ?? ''}`.trim() : a.destinatario_nome })()

  function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.piano.trim() || !f.prezzo || !f.destinatario.trim()) { toast.error('Piano, prezzo e destinatario sono obbligatori'); return }
    if (!contatto && f.azienda === NESSUNO) { toast.error('Scegli il cliente o l\'azienda'); return }
    salva.mutate({ values: {
      contatto_id: contatto?.id ?? null, organizzazione_id: f.azienda === NESSUNO ? null : f.azienda, piano: f.piano.trim(), tipo: f.tipo, frequenza: f.frequenza,
      prezzo: num(f.prezzo), distinta_id: f.composizione === NESSUNO ? null : f.composizione, prodotti: f.prodotti.trim() || null, destinatario_nome: f.destinatario.trim(),
      indirizzo: f.indirizzo.trim() || null, cap: f.cap.trim() || null, citta: f.citta.trim() || null, ritiro: f.ritiro, prossima_consegna: f.prima, data_rinnovo: f.rinnovo || null,
    } }, { onSuccess: () => { toast.success('Abbonamento attivo: gli ordini nasceranno da soli'); setF(vuoto); setNome(''); setContatto(null); setAperto(false) }, onError: (err) => toast.error(messaggioErrore(err)) })
  }

  return (
    <div>
      <PageHeader title="Abbonamenti floreali" description="Bouquet settimanali, fiori per uffici, hotel e ristoranti, piante e manutenzione del verde: gli ordini nascono da soli alla frequenza scelta."
        numeri={[
          { etichetta: 'attivi', valore: isLoading ? undefined : elenco.filter((a) => a.stato === 'attivo').length, inCaricamento: isLoading },
          { etichetta: 'consegne in 7 giorni', valore: isLoading ? undefined : elenco.filter((a) => a.stato === 'attivo' && a.prossima_consegna <= piuGiorni(oggiIso(), 7)).length, inCaricamento: isLoading },
        ]}
        actions={<><Button variant="outline" disabled={genera.isPending} onClick={() => genera.mutate({} as never, {
          onSuccess: (n) => toast.success(Number(n) ? `${n} ordini generati dagli abbonamenti` : 'Nessun ordine da generare oggi'), onError: (e) => toast.error(messaggioErrore(e)) })}>
          <Repeat className="h-4 w-4" /> Genera gli ordini</Button>
          <BottoneScrittura onClick={() => setAperto(!aperto)}>Nuovo abbonamento</BottoneScrittura></>} />
      {aperto && (
        <Card className="mb-4 p-5">
          <form onSubmit={crea} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2 space-y-1.5"><Label htmlFor="ab-cliente">Cliente privato</Label>
              <CercaContatto id="ab-cliente" valore={nome} contattoId={contatto?.id ?? null} segnaposto="Dall'anagrafica" onTesto={(v) => { setNome(v); setContatto(null) }}
                onScegli={(c) => { setContatto(c); setNome(`${c.nome} ${c.cognome ?? ''}`.trim()); if (!f.destinatario) setF({ ...f, destinatario: `${c.nome} ${c.cognome ?? ''}`.trim() }) }} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Oppure azienda</Label>
              <Select value={f.azienda} onValueChange={(v) => setF({ ...f, azienda: v })}><SelectTrigger aria-label="Azienda"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NESSUNO}>Nessuna</SelectItem>{aziende.map((a) => <SelectItem key={a.id} value={a.id}>{a.ragione_sociale}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="ab-piano">Piano</Label><Input id="ab-piano" value={f.piano} onChange={(e) => setF({ ...f, piano: e.target.value })} placeholder="Fiori per la reception" /></div>
            <div className="space-y-1.5"><Label>Tipo</Label><Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger aria-label="Tipo di abbonamento"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ABBONAMENTO_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Frequenza</Label><Select value={f.frequenza} onValueChange={(v) => setF({ ...f, frequenza: v })}><SelectTrigger aria-label="Frequenza"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(FREQUENZA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2 space-y-1.5"><Label>Composizione</Label><Select value={f.composizione} onValueChange={(v) => setF({ ...f, composizione: v })}><SelectTrigger aria-label="Composizione"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={NESSUNO}>A scelta del fiorista</SelectItem>{composizioni.map((c) => <SelectItem key={c.distinta_id} value={c.distinta_id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="ab-prod">Cosa comprende</Label><Input id="ab-prod" value={f.prodotti} onChange={(e) => setF({ ...f, prodotti: e.target.value })} placeholder="Fiori di stagione, cura delle piante…" /></div>
            <div className="space-y-1.5"><Label htmlFor="ab-prezzo">Prezzo a consegna (€)</Label><Input id="ab-prezzo" inputMode="decimal" value={f.prezzo} onChange={(e) => setF({ ...f, prezzo: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ab-prima">Prima consegna</Label><Input id="ab-prima" type="date" value={f.prima} onChange={(e) => setF({ ...f, prima: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ab-rinnovo">Fino al (rinnovo)</Label><Input id="ab-rinnovo" type="date" value={f.rinnovo} onChange={(e) => setF({ ...f, rinnovo: e.target.value })} /></div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground"><Checkbox checked={f.ritiro} onCheckedChange={(v) => setF({ ...f, ritiro: v === true })} />Ritira in negozio</label>
            <div className="space-y-1.5"><Label htmlFor="ab-dest">Destinatario</Label><Input id="ab-dest" value={f.destinatario} onChange={(e) => setF({ ...f, destinatario: e.target.value })} placeholder="Reception" /></div>
            <div className="space-y-1.5"><Label htmlFor="ab-ind">Indirizzo</Label><Input id="ab-ind" value={f.indirizzo} onChange={(e) => setF({ ...f, indirizzo: e.target.value })} disabled={f.ritiro} /></div>
            <div className="space-y-1.5"><Label htmlFor="ab-cap">CAP</Label><Input id="ab-cap" value={f.cap} onChange={(e) => setF({ ...f, cap: e.target.value })} disabled={f.ritiro} /></div>
            <div className="space-y-1.5"><Label htmlFor="ab-citta">Città</Label><Input id="ab-citta" value={f.citta} onChange={(e) => setF({ ...f, citta: e.target.value })} disabled={f.ritiro} /></div>
            <div className="col-span-2 flex justify-end md:col-span-4"><BottoneScrittura type="submit" variant="outline" disabled={salva.isPending}>Attiva l'abbonamento</BottoneScrittura></div>
          </form>
        </Card>
      )}
      {isLoading ? <Skeleton className="h-48" /> : elenco.length === 0 ? (
        <EmptyState icon={Repeat} title="Nessun abbonamento" description="Un servizio ricorrente genera da solo l'ordine tre giorni prima di ogni consegna."
          action={!aperto ? <Button variant="outline" onClick={() => setAperto(true)}>Crea il primo abbonamento</Button> : undefined} filtrato={aperto} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Piano</TableHead><TableHead>Frequenza</TableHead><TableHead>Prossima consegna</TableHead>
              <TableHead className="text-right">Prezzo</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
            <TableBody>{elenco.map((a) => (
              <TableRow key={a.id}>
                <TableCell><span className="font-medium text-foreground">{chi(a)}</span><span className="block font-mono text-xs text-muted-foreground">{a.codice}</span></TableCell>
                <TableCell><span className="text-foreground">{a.piano}</span><span className="block text-xs text-muted-foreground">{ABBONAMENTO_TIPO[a.tipo]} · {a.ritiro ? 'ritiro in negozio' : a.indirizzo ?? 'consegna'}</span></TableCell>
                <TableCell className="text-muted-foreground">{FREQUENZA[a.frequenza]}</TableCell>
                <TableCell className="text-muted-foreground">{fmtData(a.prossima_consegna)}{a.data_rinnovo ? <span className="block text-xs">fino al {fmtData(a.data_rinnovo)}</span> : null}</TableCell>
                <TableCell numerica>{fmtEuro(a.prezzo)}</TableCell>
                <TableCell><Select value={a.stato} onValueChange={(v) => salva.mutate({ id: a.id, values: { stato: v } }, { onError: (e) => toast.error(messaggioErrore(e)) })}>
                  <SelectTrigger className="h-8 w-32" aria-label={`Stato dell'abbonamento ${a.codice}`}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="attivo">Attivo</SelectItem><SelectItem value="sospeso">Sospeso</SelectItem><SelectItem value="chiuso">Chiuso</SelectItem></SelectContent></Select></TableCell>
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Il pagamento ricorrente con addebito automatico è predisposto; oggi ogni consegna si incassa dalla cassa o si fattura al cliente.</p>
    </div>
  )
}

// ── Clienti e ricorrenze ────────────────────────────────────────────────
interface Profilo {
  riepilogo: ClienteRiepilogo | null; preferiti: { descrizione: string; volte: number }[]
  destinatari: { nome: string; indirizzo: string; citta: string | null }[]
  ricorrenze: { id: string; tipo: string; per_chi: string | null; giorno: number; mese: number; prossima: string; attiva: boolean }[]
  ordini: { id: string; codice: string; data: string; stato: string; totale: number; destinatario: string | null; occasione: string | null }[]
}

export function ClientiFioraioPage() {
  return (
    <ConNegozio>
      <PageHeader title="Clienti e ricorrenze" description="Privati, aziende, wedding planner, hotel e agenzie: ordini, preferenze, ricorrenze da ricordare; fidelizzazione e campagne." />
      <Tabs defaultValue="clienti">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="clienti">Clienti</TabsTrigger><TabsTrigger value="campagne">Campagne</TabsTrigger>
          <TabsTrigger value="fidelity">Fidelizzazione</TabsTrigger><TabsTrigger value="feedback">Riscontri</TabsTrigger>
        </TabsList>
        <TabsContent value="clienti"><Clienti /></TabsContent>
        <TabsContent value="campagne"><CampagneSezione modulo="fioraio" /></TabsContent>
        <TabsContent value="fidelity"><FidelizzazioneSezione modulo="fioraio" /></TabsContent>
        <TabsContent value="feedback"><FeedbackSezione modulo="fioraio" canali={['negozio', 'telefono', 'email', 'recensione online']} aspetti={['Composizione', 'Consegna', 'Cortesia']} /></TabsContent>
      </Tabs>
    </ConNegozio>
  )
}

function Clienti() {
  const { data: clienti = [], isLoading } = useElenco<ClienteRiepilogo>('fior_clienti_riepilogo', { ordine: [{ colonna: 'ultimo_ordine', crescente: false }], limite: 500 })
  const [cerca, setCerca] = useState('')
  const [sceltoId, setSceltoId] = useState<string | null>(null)
  const visibili = clienti.filter((c) => !cerca.trim() || `${c.nome} ${c.email ?? ''} ${c.telefono ?? ''}`.toLowerCase().includes(cerca.trim().toLowerCase()))
  const scelto = sceltoId ?? visibili[0]?.contatto_id ?? null
  if (isLoading) return <Skeleton className="h-64" />
  if (clienti.length === 0) {
    return <EmptyState icon={HeartHandshake} title="Nessun cliente" description="I clienti compaiono con il primo ordine registrato a loro nome."
      action={<Button asChild variant="outline"><Link to="/fioraio/ordini">Vai agli ordini</Link></Button>} />
  }
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3">
        <Input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Nome, email o telefono" aria-label="Cerca cliente" className="max-w-sm" />
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-right">Ordini</TableHead><TableHead>Ultimo</TableHead><TableHead className="text-right">Spesa</TableHead></TableRow></TableHeader>
            <TableBody>{visibili.map((c) => (
              <TableRow key={c.contatto_id} data-state={c.contatto_id === scelto ? 'selected' : undefined}>
                <TableCell><button type="button" className="text-left font-medium text-foreground hover:text-primary-testo" onClick={() => setSceltoId(c.contatto_id)} aria-pressed={c.contatto_id === scelto}>{c.nome}</button>
                  {c.ricorrenze ? <span className="block text-xs text-muted-foreground">{c.ricorrenze} ricorrenze</span> : null}</TableCell>
                <TableCell numerica>{c.ordini}</TableCell><TableCell className="text-muted-foreground">{fmtData(c.ultimo_ordine)}</TableCell><TableCell numerica>{fmtEuro(c.spesa)}</TableCell>
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      </div>
      {scelto && <ProfiloCliente key={scelto} contattoId={scelto} />}
    </div>
  )
}

function ProfiloCliente({ contattoId }: { contattoId: string }) {
  const { data: p } = useRpc<Profilo>('fior_cliente_profilo', { p_contatto: contattoId })
  const nuova = useInserisci('fior_ricorrenze', ['fior_ricorrenze', 'fior_clienti_riepilogo'])
  const togli = useElimina('fior_ricorrenze', ['fior_ricorrenze', 'fior_clienti_riepilogo'])
  const [r, setR] = useState({ tipo: 'compleanno', perChi: '', data: '' })
  if (!p?.riepilogo) return <Skeleton className="h-64" />
  const k = p.riepilogo
  return (
    <Card className="space-y-4 p-5">
      <div>
        <h3 className="text-title text-foreground">{k.nome}</h3>
        <p className="text-sm text-muted-foreground">{[k.telefono, k.email].filter(Boolean).join(' · ') || 'Nessun recapito'} · {k.consenso_marketing ? 'riceve le offerte' : 'niente offerte'}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-muted-foreground">Ordini</dt><dd data-slot="kpi" className="text-title text-foreground">{k.ordini}</dd></div>
        <div><dt className="text-muted-foreground">Spesa</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtEuro(k.spesa)}</dd></div>
        <div><dt className="text-muted-foreground">Ultimo acquisto</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtData(k.ultimo_ordine)}</dd></div>
        <div><dt className="text-muted-foreground">Ogni</dt><dd data-slot="kpi" className="text-title text-foreground">{k.giorni_tra_ordini != null ? `${fmtNumero(k.giorni_tra_ordini)} giorni` : '—'}</dd></div>
      </dl>
      {p.preferiti.length > 0 && <p className="text-sm text-muted-foreground">Preferiti: {p.preferiti.map((x) => `${x.descrizione} (${x.volte})`).join(', ')}</p>}
      {p.destinatari.length > 0 && <p className="text-sm text-muted-foreground">Ha già fatto consegnare a: {p.destinatari.map((d) => `${d.nome}, ${d.indirizzo}`).join(' · ')}</p>}

      <section>
        <h4 className="mb-1.5 text-label uppercase text-muted-foreground">Ricorrenze</h4>
        {p.ricorrenze.length > 0 && (
          <ul className="mb-2 divide-y divide-border text-sm">{p.ricorrenze.map((x) => (
            <li key={x.id} className="flex items-center gap-3 py-1.5">
              <span className="min-w-0 flex-1 text-foreground">{OCCASIONE[x.tipo] ?? x.tipo}{x.per_chi ? ` · ${x.per_chi}` : ''}</span>
              <span className="text-muted-foreground">{String(x.giorno).padStart(2, '0')}/{String(x.mese).padStart(2, '0')} · prossima il {fmtData(x.prossima)}</span>
              <Button size="sm" variant="ghost" aria-label="Togli la ricorrenza" onClick={() => togli.mutate(x.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </li>))}</ul>
        )}
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault()
          if (!r.data) { toast.error('Scegli la data'); return }
          const d = new Date(`${r.data}T12:00`)
          nuova.mutate({ contatto_id: contattoId, tipo: r.tipo, per_chi: r.perChi.trim(), giorno: d.getDate(), mese: d.getMonth() + 1, anno: d.getFullYear() }, {
            onSuccess: () => { toast.success('Ricorrenza registrata: avviso una settimana prima'); setR({ ...r, perChi: '', data: '' }) },
            onError: (err) => toast.error(/23505/.test(JSON.stringify(err)) ? 'Questa ricorrenza c\'è già' : messaggioErrore(err)) }) }}>
          <Select value={r.tipo} onValueChange={(v) => setR({ ...r, tipo: v })}><SelectTrigger className="w-44" aria-label="Tipo di ricorrenza"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(OCCASIONE).map(([key, l]) => <SelectItem key={key} value={key}>{l}</SelectItem>)}</SelectContent></Select>
          <Input className="w-40" value={r.perChi} onChange={(e) => setR({ ...r, perChi: e.target.value })} placeholder="Per chi" aria-label="Per chi" />
          <Input className="w-40" type="date" value={r.data} onChange={(e) => setR({ ...r, data: e.target.value })} aria-label="Data della ricorrenza" />
          <BottoneScrittura type="submit" variant="outline" disabled={nuova.isPending}>Aggiungi</BottoneScrittura>
        </form>
      </section>

      <section>
        <h4 className="mb-1.5 text-label uppercase text-muted-foreground">Ordini</h4>
        <ul className="divide-y divide-border text-sm">{p.ordini.map((o) => (
          <li key={o.id}><Link to={`/fioraio/ordini/${o.id}`} className="flex flex-wrap items-center gap-3 py-1.5 hover:text-primary-testo">
            <span className="w-24 text-muted-foreground">{fmtData(o.data)}</span>
            <span className="min-w-0 flex-1 truncate text-foreground">{o.codice}{o.destinatario ? ` · per ${o.destinatario}` : ''}{o.occasione ? ` · ${OCCASIONE[o.occasione] ?? o.occasione}` : ''}</span>
            <Badge tone={ORDINE_STATO[o.stato]?.tone ?? 'neutral'}>{ORDINE_STATO[o.stato]?.label ?? o.stato}</Badge>
            <span className="tabular-nums text-foreground">{fmtEuro(o.totale)}</span></Link></li>))}</ul>
      </section>
    </Card>
  )
}

// ── Negozio, zone, personale ────────────────────────────────────────────
export function ImpostazioniFioraioPage() {
  return <ManagerOnly><ConNegozio><Impostazioni_ /></ConNegozio></ManagerOnly>
}

function Impostazioni_() {
  const { impostazioni } = useImpostazioni()
  const { data: zone = [] } = useElenco<Zona>('fior_zone', { ordine: [{ colonna: 'ordine' }, { colonna: 'nome' }] })
  const salva = useSalva('fior_impostazioni')
  const salvaZona = useSalva('fior_zone')
  const [f, setF] = useState<Partial<Impostazioni> | null>(null)
  const [fasce, setFasce] = useState<string | null>(null)
  const [z, setZ] = useState({ nome: '', cap: '', importo: '' })
  if (!impostazioni) return null
  const v = { ...impostazioni, ...f }
  return (
    <div>
      <PageHeader title="Negozio e zone" description="Regole per il prezzo delle composizioni, fasce orarie, promemoria e zone di consegna con il loro costo." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-title text-foreground">Negozio</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="im-nome">Nome</Label><Input id="im-nome" value={v.negozio ?? ''} onChange={(e) => setF({ ...f, negozio: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="im-ind">Indirizzo</Label><Input id="im-ind" value={v.indirizzo ?? ''} onChange={(e) => setF({ ...f, indirizzo: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="im-ric">Ricarico sul costo (%)</Label><Input id="im-ric" inputMode="decimal" value={String(v.ricarico_pct)} onChange={(e) => setF({ ...f, ricarico_pct: num(e.target.value) })} />
              <p className="text-xs text-muted-foreground">Prezzo proposto = costo di fiori e lavoro, più questa percentuale.</p></div>
            <div className="space-y-1.5"><Label htmlFor="im-ora">Manodopera (€ l'ora)</Label><Input id="im-ora" inputMode="decimal" value={String(v.costo_orario)} onChange={(e) => setF({ ...f, costo_orario: num(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label htmlFor="im-prom">Promemoria delle ricorrenze (giorni prima)</Label><Input id="im-prom" type="number" min={1} max={60} value={v.promemoria_ricorrenze_giorni} onChange={(e) => setF({ ...f, promemoria_ricorrenze_giorni: Number(e.target.value) || 7 })} /></div>
            <div className="space-y-1.5"><Label htmlFor="im-abb">Ordini degli abbonamenti (giorni prima)</Label><Input id="im-abb" type="number" min={0} max={30} value={v.abbonamenti_anticipo_giorni} onChange={(e) => setF({ ...f, abbonamenti_anticipo_giorni: Number(e.target.value) || 0 })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="im-fasce">Fasce orarie (separate da virgola)</Label>
              <Input id="im-fasce" value={fasce ?? impostazioni.fasce.join(', ')} onChange={(e) => setFasce(e.target.value)} /></div>
          </div>
          <div className="mt-4 flex justify-end"><BottoneScrittura disabled={(!f && fasce === null) || salva.isPending}
            onClick={() => salva.mutate({ id: 1 as never, values: { ...f, ...(fasce !== null ? { fasce: fasce.split(',').map((x) => x.trim()).filter(Boolean) } : {}) } }, {
              onSuccess: () => { toast.success('Negozio aggiornato'); setF(null); setFasce(null) }, onError: (e) => toast.error(messaggioErrore(e)) })}>Salva</BottoneScrittura></div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-title text-foreground">Zone di consegna</h2>
          <form className="mb-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (!z.nome.trim()) return
            salvaZona.mutate({ values: { nome: z.nome.trim(), cap: z.cap.split(/[\s,;]+/).filter(Boolean), importo: num(z.importo), ordine: zone.length } }, {
              onSuccess: () => { toast.success('Zona aggiunta'); setZ({ nome: '', cap: '', importo: '' }) }, onError: (err) => toast.error(/23505/.test(JSON.stringify(err)) ? 'C\'è già una zona con questo nome' : messaggioErrore(err)) }) }}>
            <div className="w-36 space-y-1.5"><Label htmlFor="zn-nome">Zona</Label><Input id="zn-nome" value={z.nome} onChange={(e) => setZ({ ...z, nome: e.target.value })} /></div>
            <div className="min-w-40 flex-1 space-y-1.5"><Label htmlFor="zn-cap">CAP serviti</Label><Input id="zn-cap" value={z.cap} onChange={(e) => setZ({ ...z, cap: e.target.value })} placeholder="40121, 40122" /></div>
            <div className="w-24 space-y-1.5"><Label htmlFor="zn-imp">Costo (€)</Label><Input id="zn-imp" inputMode="decimal" value={z.importo} onChange={(e) => setZ({ ...z, importo: e.target.value })} /></div>
            <BottoneScrittura type="submit" variant="outline" disabled={!z.nome.trim()}>Aggiungi</BottoneScrittura>
          </form>
          {zone.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna zona: senza zone il costo della consegna si scrive a mano nell'ordine.</p> : (
            <ul className="divide-y divide-border text-sm">{zone.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="min-w-0 flex-1"><span className="font-medium text-foreground">{x.nome}</span><span className="block text-xs text-muted-foreground">{x.cap.join(', ') || 'nessun CAP: si sceglie a mano'}</span></span>
                <span className="tabular-nums text-foreground">{fmtEuro(x.importo)}</span>
                <Switch checked={x.attiva} aria-label={`Zona ${x.nome} attiva`} onCheckedChange={(a) => salvaZona.mutate({ id: x.id, values: { attiva: a } })} />
              </li>))}</ul>
          )}
        </Card>
      </div>
    </div>
  )
}

export function PersonaleFioraioPage() {
  const { isManager } = useAuth()
  return (
    <ConNegozio>
      <PageHeader title="Personale e turni" description={isManager ? 'Negozio, laboratorio e consegne: turni, presenze e ore.' : 'I turni del negozio.'} />
      <TurniSezione modulo="fioraio" reparti={['negozio', 'laboratorio', 'consegne', 'allestimenti', 'direzione']} />
    </ConNegozio>
  )
}
