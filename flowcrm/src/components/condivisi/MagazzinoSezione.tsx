/**
 * Magazzino (fondamenta F0.1), condiviso dai moduli: giacenze calcolate dai
 * movimenti, lotti con scadenza e vita residua, carichi e uscite (sfrido,
 * rottura, omaggio, consumo interno…), ordini ai fornitori con ricevimento
 * merci (lotto, scadenza, temperatura, DDT), inventari con rettifica,
 * proposta di riordino e valutazione dei fornitori.
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ClipboardCheck, PackagePlus, Plus, ShoppingCart, Star, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import type { Tables } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { useElenco, useInserisci, useSalva, useAzione, useRpc, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'

type Articolo = Tables<'mag_articoli'>
type Giacenza = Database['public']['Views']['mag_giacenze']['Row']
type LottoStato = Database['public']['Views']['mag_lotti_stato']['Row']
type Movimento = Tables<'mag_movimenti'>
type Ordine = Tables<'mag_ordini'>
type RigaOrdine = Tables<'mag_ordini_righe'>
type Inventario = Tables<'mag_inventari'>
type RigaInventario = Tables<'mag_inventari_righe'>
type Rating = Database['public']['Views']['fornitori_rating']['Row']
type Organizzazione = Pick<Tables<'organizzazioni'>, 'id' | 'ragione_sociale'>
interface Riordino { articolo_id: string; descrizione: string; fornitore_id: string | null; unita_misura: string
  giacenza: number; scorta_minima: number; consumo_medio_giorno: number; quantita_proposta: number }

const TABELLE = ['mag_articoli', 'mag_giacenze', 'mag_lotti', 'mag_lotti_stato', 'mag_movimenti', 'mag_ordini', 'mag_ordini_righe', 'mag_inventari', 'mag_inventari_righe']
const USCITE: { valore: Movimento['tipo']; label: string }[] = [
  { valore: 'consumo', label: 'Consumo' }, { valore: 'scarico', label: 'Scarico' }, { valore: 'sfrido', label: 'Sfrido' },
  { valore: 'deterioramento', label: 'Deterioramento' }, { valore: 'rottura', label: 'Rottura' }, { valore: 'omaggio', label: 'Omaggio' },
  { valore: 'consumo_interno', label: 'Consumo interno' }, { valore: 'reso_fornitore', label: 'Reso al fornitore' },
]
const TIPO_MOV: Record<string, string> = Object.fromEntries([...USCITE.map((u) => [u.valore, u.label]),
  ['carico', 'Carico'], ['vendita', 'Vendita'], ['inventario', 'Rettifica inventario'], ['trasferimento', 'Trasferimento'], ['reso_cliente', 'Reso del cliente']])
const n = (s: string) => Number(s.replace(',', '.'))
const fmt = (v: number | string | null | undefined, d = 3) => v == null ? '—' : new Intl.NumberFormat('it-IT', { maximumFractionDigits: d }).format(Number(v))
const euro = (v: number | string | null | undefined) => v == null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(v))
const data = (s: string | null) => s ? new Date(s).toLocaleDateString('it-IT') : '—'

interface Props {
  /** Modulo dei nuovi articoli; `moduli` quelli da mostrare (es. ['fb','ristorante']). */
  modulo: string
  moduli: string[]
  /** Schede in più del modulo (sprechi, tracciabilità…). */
  extra?: { valore: string; etichetta: string; contenuto: ReactNode }[]
}

export function MagazzinoSezione({ modulo, moduli, extra = [] }: Props) {
  const { data: giacenze = [] } = useElenco<Giacenza>('mag_giacenze', { filtri: { modulo: moduli }, ordine: [{ colonna: 'descrizione' }] })
  const { data: lotti = [] } = useElenco<LottoStato>('mag_lotti_stato', { filtri: { modulo: moduli }, ordine: [{ colonna: 'fine_vita' }] })
  const sotto = giacenze.filter((g) => g.sotto_scorta).length
  const inScadenza = lotti.filter((l) => Number(l.residuo) > 0 && l.giorni_residui !== null && l.giorni_residui <= 3).length
  return (
    <Tabs defaultValue="giacenze">
      <TabsList className="mb-4 flex-wrap">
        <TabsTrigger value="giacenze">Giacenze{sotto ? ` (${sotto} sotto scorta)` : ''}</TabsTrigger>
        <TabsTrigger value="lotti">Lotti e scadenze{inScadenza ? ` (${inScadenza})` : ''}</TabsTrigger>
        <TabsTrigger value="movimenti">Movimenti</TabsTrigger>
        <TabsTrigger value="ordini">Ordini e ricevimento</TabsTrigger>
        <TabsTrigger value="riordino">Riordino</TabsTrigger>
        <TabsTrigger value="inventari">Inventari</TabsTrigger>
        <TabsTrigger value="fornitori">Fornitori</TabsTrigger>
        {extra.map((e) => <TabsTrigger key={e.valore} value={e.valore}>{e.etichetta}</TabsTrigger>)}
      </TabsList>
      <TabsContent value="giacenze"><Giacenze modulo={modulo} moduli={moduli} giacenze={giacenze} /></TabsContent>
      <TabsContent value="lotti"><Lotti lotti={lotti} /></TabsContent>
      <TabsContent value="movimenti"><Movimenti moduli={moduli} /></TabsContent>
      <TabsContent value="ordini"><Ordini modulo={modulo} moduli={moduli} /></TabsContent>
      <TabsContent value="riordino"><RiordinoTab modulo={modulo} moduli={moduli} /></TabsContent>
      <TabsContent value="inventari"><Inventari modulo={modulo} moduli={moduli} /></TabsContent>
      <TabsContent value="fornitori"><Fornitori modulo={modulo} /><Listini modulo={modulo} moduli={moduli} /></TabsContent>
      {extra.map((e) => <TabsContent key={e.valore} value={e.valore}>{e.contenuto}</TabsContent>)}
    </Tabs>
  )
}

function useArticoli(moduli: string[]) {
  return useElenco<Articolo>('mag_articoli', { filtri: { modulo: moduli, attivo: true }, ordine: [{ colonna: 'descrizione' }] }).data ?? []
}
function useOrganizzazioni() {
  return useElenco<Organizzazione>('organizzazioni', { filtri: { attivo: true }, select: 'id, ragione_sociale', ordine: [{ colonna: 'ragione_sociale' }], limite: 1000 }).data ?? []
}

function Giacenze({ modulo, moduli, giacenze }: { modulo: string; moduli: string[]; giacenze: Giacenza[] }) {
  const { isManager } = useAuth()
  const articoli = useArticoli(moduli)
  const fornitori = useOrganizzazioni()
  const nuovo = useSalva('mag_articoli', TABELLE)
  const muovi = useInserisci('mag_movimenti', TABELLE)
  const [f, setF] = useState({ descrizione: '', categoria: '', unita: 'kg', costo: '', scorta: '', fornitore: '', deperibile: false, durata: '' })
  const [mov, setMov] = useState<{ articolo: string; tipo: string; quantita: string; note: string }>({ articolo: '', tipo: 'carico', quantita: '', note: '' })
  const [aperto, setAperto] = useState(false)

  async function creaArticolo(e: FormEvent) {
    e.preventDefault()
    if (!f.descrizione.trim()) return
    try {
      await nuovo.mutateAsync({ values: { modulo, descrizione: f.descrizione.trim(), categoria: f.categoria.trim() || null, unita_misura: f.unita.trim() || 'pz',
        costo_unitario: n(f.costo) || 0, scorta_minima: n(f.scorta) || 0, fornitore_id: f.fornitore || null, deperibile: f.deperibile,
        durata_giorni: f.durata ? Number(f.durata) : null } })
      setF({ descrizione: '', categoria: '', unita: 'kg', costo: '', scorta: '', fornitore: '', deperibile: false, durata: '' })
      setAperto(false)
      toast.success('Articolo creato')
    } catch (err) { toast.error(messaggioErrore(err)) }
  }
  async function registra(e: FormEvent) {
    e.preventDefault()
    const q = n(mov.quantita)
    if (!mov.articolo || !(q > 0)) { toast.error('Articolo e quantità'); return }
    try {
      if (mov.tipo === 'carico') {
        await muovi.mutateAsync({ articolo_id: mov.articolo, modulo, tipo: 'carico', quantita: q, note: mov.note || null })
      } else {
        const { error } = await supabase.rpc('mag_scarica', { p_articolo: mov.articolo, p_quantita: q, p_tipo: mov.tipo as Movimento['tipo'], p_note: mov.note || undefined })
        if (error) throw error
      }
      setMov({ ...mov, quantita: '', note: '' })
      toast.success('Movimento registrato')
    } catch (err) { toast.error(messaggioErrore(err)) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={registra} className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5"><Label>Articolo</Label>
            <Select value={mov.articolo} onValueChange={(v) => setMov({ ...mov, articolo: v })}>
              <SelectTrigger aria-label="Articolo"><SelectValue placeholder="Scegli…" /></SelectTrigger>
              <SelectContent>{articoli.map((a) => <SelectItem key={a.id} value={a.id}>{a.descrizione} ({a.unita_misura})</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="w-48 space-y-1.5"><Label>Movimento</Label>
            <Select value={mov.tipo} onValueChange={(v) => setMov({ ...mov, tipo: v })}>
              <SelectTrigger aria-label="Tipo di movimento"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="carico">Carico</SelectItem>{USCITE.map((u) => <SelectItem key={u.valore} value={u.valore}>{u.label}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="w-28 space-y-1.5"><Label htmlFor="mg-q">Quantità</Label><Input id="mg-q" inputMode="decimal" value={mov.quantita} onChange={(e) => setMov({ ...mov, quantita: e.target.value })} /></div>
          <div className="min-w-40 flex-1 space-y-1.5"><Label htmlFor="mg-note">Note</Label><Input id="mg-note" value={mov.note} onChange={(e) => setMov({ ...mov, note: e.target.value })} /></div>
          <BottoneScrittura type="submit">Registra</BottoneScrittura>
          <Button type="button" variant="outline" onClick={() => setAperto(!aperto)}><PackagePlus className="h-4 w-4" /> Nuovo articolo</Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Le uscite scalano i lotti in ordine di scadenza e non portano mai la giacenza sotto zero: per correggere serve un inventario.</p>
        {aperto && (
          <form onSubmit={creaArticolo} className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
            <div className="col-span-2 space-y-1.5"><Label htmlFor="ar-d">Descrizione *</Label><Input id="ar-d" value={f.descrizione} onChange={(e) => setF({ ...f, descrizione: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ar-c">Categoria</Label><Input id="ar-c" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} placeholder="Materie prime, bevande…" /></div>
            <div className="space-y-1.5"><Label htmlFor="ar-u">Unità</Label><Input id="ar-u" value={f.unita} onChange={(e) => setF({ ...f, unita: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ar-k">Costo unitario (€)</Label><Input id="ar-k" inputMode="decimal" value={f.costo} onChange={(e) => setF({ ...f, costo: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ar-s">Scorta minima</Label><Input id="ar-s" inputMode="decimal" value={f.scorta} onChange={(e) => setF({ ...f, scorta: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Fornitore</Label>
              <Select value={f.fornitore} onValueChange={(v) => setF({ ...f, fornitore: v })}>
                <SelectTrigger aria-label="Fornitore"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{fornitori.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label htmlFor="ar-v">Vita commerciale (giorni)</Label><Input id="ar-v" type="number" min={1} value={f.durata} onChange={(e) => setF({ ...f, durata: e.target.value, deperibile: !!e.target.value })} /></div>
            <div className="col-span-2 flex justify-end gap-2 sm:col-span-4"><BottoneScrittura type="submit">Crea articolo</BottoneScrittura></div>
          </form>
        )}
      </Card>
      {giacenze.length === 0 ? (
        <EmptyState icon={PackagePlus} title="Magazzino vuoto" description="Crea gli articoli e registra i primi carichi."
          action={!aperto ? <Button variant="outline" onClick={() => setAperto(true)}><PackagePlus className="h-4 w-4" /> Nuovo articolo</Button> : undefined} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Articolo</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Giacenza</TableHead>
              <TableHead className="text-right">Scorta minima</TableHead>{isManager && <TableHead className="text-right">Valore</TableHead>}<TableHead>Stato</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {giacenze.map((g) => (
                <TableRow key={g.articolo_id}>
                  <TableCell><span className="font-medium text-foreground">{g.descrizione}</span><span className="block font-mono text-xs text-muted-foreground">{g.codice}</span></TableCell>
                  <TableCell className="text-muted-foreground">{g.categoria ?? '—'}</TableCell>
                  <TableCell numerica>{fmt(g.giacenza)} {g.unita_misura}</TableCell>
                  <TableCell numerica>{fmt(g.scorta_minima)}</TableCell>
                  {isManager && <TableCell numerica>{euro(g.valore)}</TableCell>}
                  <TableCell>{g.anomalia_negativa ? <Badge tone="danger">Sotto zero: inventario</Badge> : g.sotto_scorta ? <Badge tone="warning">Sotto scorta</Badge> : <Badge tone="success">Ok</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Lotti({ lotti }: { lotti: LottoStato[] }) {
  const [tutti, setTutti] = useState(false)
  const elenco = lotti.filter((l) => tutti || Number(l.residuo) > 0)
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={tutti} onChange={(e) => setTutti(e.target.checked)} /> Mostra anche i lotti esauriti</label>
      {elenco.length === 0 ? <EmptyState compatto icon={ClipboardCheck} title="Nessun lotto" description="I lotti nascono al ricevimento delle merci." /> : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Lotto</TableHead><TableHead>Articolo</TableHead><TableHead>Ubicazione</TableHead>
              <TableHead className="text-right">Ricevuto</TableHead><TableHead className="text-right">Fine vita</TableHead><TableHead className="text-right">Residuo</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
            <TableBody>
              {elenco.map((l) => {
                const g = l.giorni_residui
                return (
                  <TableRow key={l.lotto_id}>
                    <TableCell className="font-mono text-xs font-semibold">{l.codice_lotto ?? '—'}</TableCell>
                    <TableCell className="text-foreground">{l.descrizione}</TableCell>
                    <TableCell className="text-muted-foreground">{l.ubicazione ?? '—'}</TableCell>
                    <TableCell numerica>{data(l.data_ricevimento)}</TableCell>
                    <TableCell numerica>{data(l.fine_vita)}</TableCell>
                    <TableCell numerica>{fmt(l.residuo)}</TableCell>
                    <TableCell>{g === null ? <Badge tone="neutral">Senza scadenza</Badge> : g < 0 ? <Badge tone="danger">Scaduto</Badge>
                      : g <= 3 ? <Badge tone="warning">{g === 0 ? 'Scade oggi' : `${g} giorni`}</Badge> : <Badge tone="success">{g} giorni</Badge>}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Movimenti({ moduli }: { moduli: string[] }) {
  const articoli = useArticoli(moduli)
  const { data: mov = [] } = useElenco<Movimento>('mag_movimenti', { filtri: { modulo: moduli }, ordine: [{ colonna: 'eseguito_at', crescente: false }], limite: 200 })
  return mov.length === 0 ? <EmptyState compatto icon={Truck} title="Nessun movimento" description="Carichi, vendite e uscite compariranno qui." /> : (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader><TableRow><TableHead className="text-right">Quando</TableHead><TableHead>Articolo</TableHead><TableHead>Movimento</TableHead><TableHead className="text-right">Quantità</TableHead><TableHead>Riferimento</TableHead></TableRow></TableHeader>
        <TableBody>
          {mov.map((m) => (
            <TableRow key={m.id}>
              <TableCell numerica>{new Date(m.eseguito_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
              <TableCell className="text-foreground">{articoli.find((a) => a.id === m.articolo_id)?.descrizione ?? '—'}</TableCell>
              <TableCell>{TIPO_MOV[m.tipo] ?? m.tipo}</TableCell>
              <TableCell numerica className={Number(m.quantita) < 0 ? 'text-muted-foreground' : 'text-foreground'}>{Number(m.quantita) > 0 ? '+' : ''}{fmt(m.quantita)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{m.note ?? m.riferimento_tipo ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function Ordini({ modulo, moduli }: { modulo: string; moduli: string[] }) {
  const fornitori = useOrganizzazioni()
  const articoli = useArticoli(moduli)
  const { data: ordini = [] } = useElenco<Ordine>('mag_ordini', { filtri: { modulo: moduli }, ordine: [{ colonna: 'data_ordine', crescente: false }], limite: 100 })
  const salvaOrdine = useSalva('mag_ordini', TABELLE)
  const [sceltoId, setSceltoId] = useState<string | null>(null)
  const [fornitore, setFornitore] = useState('')
  const scelto = ordini.find((o) => o.id === sceltoId) ?? null
  const STATO: Record<string, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
    bozza: { label: 'Bozza', tone: 'neutral' }, inviato: { label: 'Inviato', tone: 'info' }, ricevuto_parziale: { label: 'Ricevuto in parte', tone: 'warning' },
    ricevuto: { label: 'Ricevuto', tone: 'success' }, annullato: { label: 'Annullato', tone: 'danger' } }
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="h-fit overflow-hidden">
        <div className="flex gap-2 border-b border-border p-3">
          <Select value={fornitore} onValueChange={setFornitore}>
            <SelectTrigger aria-label="Fornitore del nuovo ordine"><SelectValue placeholder="Fornitore…" /></SelectTrigger>
            <SelectContent>{fornitori.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}</SelectContent>
          </Select>
          <BottoneScrittura size="sm" disabled={!fornitore} onClick={() => salvaOrdine.mutate({ values: { modulo, fornitore_id: fornitore } },
            { onSuccess: (o) => setSceltoId(o.id), onError: (e) => toast.error(messaggioErrore(e)) })}><Plus className="h-3.5 w-3.5" /> Ordine</BottoneScrittura>
        </div>
        <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
          {ordini.map((o) => (
            <li key={o.id}><button type="button" onClick={() => setSceltoId(o.id)} className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted/50">
              <span><span className="block font-mono text-xs font-semibold">{o.codice}</span>
                <span className="block text-foreground">{fornitori.find((f) => f.id === o.fornitore_id)?.ragione_sociale ?? '—'}</span></span>
              <Badge tone={STATO[o.stato]?.tone ?? 'neutral'}>{STATO[o.stato]?.label ?? o.stato}</Badge></button></li>
          ))}
        </ul>
      </Card>
      {scelto ? <DettaglioOrdine ordine={scelto} articoli={articoli} /> : <EmptyState icon={ShoppingCart} title="Scegli o crea un ordine" description="Righe, invio al fornitore e ricevimento della merce con lotto e scadenza." />}
    </div>
  )
}

function DettaglioOrdine({ ordine, articoli }: { ordine: Ordine; articoli: Articolo[] }) {
  const { data: righe = [] } = useElenco<RigaOrdine>('mag_ordini_righe', { filtri: { ordine_id: ordine.id } })
  const aggiungi = useInserisci('mag_ordini_righe', TABELLE)
  const salva = useSalva('mag_ordini', TABELLE)
  const ricevi = useAzione('ricevi_riga_ordine', TABELLE)
  const [riga, setRiga] = useState({ articolo: '', quantita: '', prezzo: '' })
  const [ric, setRic] = useState<Record<string, { q: string; lotto: string; scadenza: string; temp: string }>>({})
  const [ddt, setDdt] = useState({ numero: ordine.ddt_numero ?? '', data: ordine.ddt_data ?? '' })
  const modificabile = ordine.stato === 'bozza'

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-title">{ordine.codice}</h2>
        <div className="flex gap-2">
          {modificabile && <BottoneScrittura size="sm" disabled={!righe.length} onClick={() => salva.mutate({ id: ordine.id, values: { stato: 'inviato' } })}>Segna come inviato</BottoneScrittura>}
          {ordine.stato !== 'ricevuto' && ordine.stato !== 'annullato' && <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: ordine.id, values: { stato: 'annullato' } })}>Annulla</Button>}
        </div>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Articolo</TableHead><TableHead className="text-right">Ordinato</TableHead><TableHead className="text-right">Ricevuto</TableHead><TableHead className="text-right">Prezzo</TableHead><TableHead>Ricevimento</TableHead></TableRow></TableHeader>
        <TableBody>
          {righe.map((r) => {
            const v = ric[r.id] ?? { q: String(Math.max(0, Number(r.quantita_ordinata) - Number(r.quantita_ricevuta))), lotto: '', scadenza: '', temp: '' }
            const manca = Number(r.quantita_ordinata) - Number(r.quantita_ricevuta)
            return (
              <TableRow key={r.id}>
                <TableCell className="text-foreground">{articoli.find((a) => a.id === r.articolo_id)?.descrizione}</TableCell>
                <TableCell numerica>{fmt(r.quantita_ordinata)}</TableCell>
                <TableCell numerica>{fmt(r.quantita_ricevuta)}</TableCell>
                <TableCell numerica>{euro(r.prezzo_unitario)}</TableCell>
                <TableCell>
                  {ordine.stato !== 'bozza' && ordine.stato !== 'annullato' && manca > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Input className="h-8 w-20" inputMode="decimal" value={v.q} aria-label="Quantità ricevuta" onChange={(e) => setRic({ ...ric, [r.id]: { ...v, q: e.target.value } })} />
                      <Input className="h-8 w-24" value={v.lotto} placeholder="Lotto" aria-label="Lotto" onChange={(e) => setRic({ ...ric, [r.id]: { ...v, lotto: e.target.value } })} />
                      <Input className="h-8 w-36" type="date" value={v.scadenza} aria-label="Scadenza" onChange={(e) => setRic({ ...ric, [r.id]: { ...v, scadenza: e.target.value } })} />
                      <Input className="h-8 w-20" inputMode="decimal" value={v.temp} placeholder="°C" aria-label="Temperatura di ricevimento" onChange={(e) => setRic({ ...ric, [r.id]: { ...v, temp: e.target.value } })} />
                      <BottoneScrittura size="sm" onClick={() => ricevi.mutate({ p_riga: r.id, p_quantita: n(v.q), p_codice_lotto: v.lotto || undefined,
                        p_scadenza: v.scadenza || undefined, p_temperatura: v.temp ? n(v.temp) : undefined },
                        { onSuccess: () => toast.success('Merce ricevuta e caricata'), onError: (e) => toast.error(messaggioErrore(e)) })}>Ricevi</BottoneScrittura>
                    </div>
                  ) : manca <= 0 ? <Badge tone="success">Completo</Badge> : '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {modificabile && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1"><Select value={riga.articolo} onValueChange={(v) => setRiga({ ...riga, articolo: v, prezzo: String(articoli.find((a) => a.id === v)?.costo_unitario ?? '') })}>
            <SelectTrigger aria-label="Articolo da ordinare"><SelectValue placeholder="Articolo…" /></SelectTrigger>
            <SelectContent>{articoli.map((a) => <SelectItem key={a.id} value={a.id}>{a.descrizione}</SelectItem>)}</SelectContent>
          </Select></div>
          <Input className="w-24" inputMode="decimal" placeholder="Q.tà" aria-label="Quantità" value={riga.quantita} onChange={(e) => setRiga({ ...riga, quantita: e.target.value })} />
          <Input className="w-28" inputMode="decimal" placeholder="Prezzo €" aria-label="Prezzo unitario" value={riga.prezzo} onChange={(e) => setRiga({ ...riga, prezzo: e.target.value })} />
          <BottoneScrittura variant="outline" disabled={!riga.articolo || !(n(riga.quantita) > 0)} onClick={() => aggiungi.mutate({ ordine_id: ordine.id, modulo: ordine.modulo, articolo_id: riga.articolo,
            quantita_ordinata: n(riga.quantita), prezzo_unitario: n(riga.prezzo) || 0 }, { onSuccess: () => setRiga({ articolo: '', quantita: '', prezzo: '' }), onError: (e) => toast.error(messaggioErrore(e)) })}>Aggiungi riga</BottoneScrittura>
        </div>
      )}
      {ordine.stato !== 'bozza' && (
        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <div className="space-y-1.5"><Label htmlFor="ddt-n">DDT n.</Label><Input id="ddt-n" className="w-32" value={ddt.numero} onChange={(e) => setDdt({ ...ddt, numero: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ddt-d">del</Label><Input id="ddt-d" type="date" className="w-40" value={ddt.data} onChange={(e) => setDdt({ ...ddt, data: e.target.value })} /></div>
          <BottoneScrittura variant="outline" onClick={() => salva.mutate({ id: ordine.id, values: { ddt_numero: ddt.numero || null, ddt_data: ddt.data || null } }, { onSuccess: () => toast.success('DDT registrato') })}>Salva DDT</BottoneScrittura>
        </div>
      )}
    </Card>
  )
}

function RiordinoTab({ modulo, moduli }: { modulo: string; moduli: string[] }) {
  const proposte = moduli.map((m) => m)
  const r0 = useRpc<Riordino[]>('mag_proposta_riordino', { p_modulo: proposte[0] })
  const r1 = useRpc<Riordino[]>('mag_proposta_riordino', { p_modulo: proposte[1] ?? proposte[0] }, { abilitato: proposte.length > 1 })
  const righe = [...(r0.data ?? []), ...(proposte.length > 1 ? r1.data ?? [] : [])]
  const fornitori = useOrganizzazioni()
  const [inCorso, setInCorso] = useState(false)

  async function creaOrdini() {
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const perFornitore = new Map<string, Riordino[]>()
      for (const r of righe.filter((x) => x.fornitore_id && x.quantita_proposta > 0)) perFornitore.set(r.fornitore_id!, [...(perFornitore.get(r.fornitore_id!) ?? []), r])
      for (const [forn, elenco] of perFornitore) {
        const { data: o, error } = await supabase.from('mag_ordini').insert({ modulo, fornitore_id: forn, created_by: auth.user!.id, note: 'Da proposta di riordino' }).select().single()
        if (error) throw error
        const { error: e2 } = await supabase.from('mag_ordini_righe').insert(elenco.map((r) => ({ ordine_id: o.id, modulo, articolo_id: r.articolo_id,
          quantita_ordinata: r.quantita_proposta, created_by: auth.user!.id })))
        if (e2) throw e2
      }
      toast.success(`${perFornitore.size} ordini in bozza creati: controllali in «Ordini e ricevimento»`)
    } catch (e) { toast.error(messaggioErrore(e)) } finally { setInCorso(false) }
  }

  return righe.length === 0 ? <EmptyState icon={ShoppingCart} title="Nulla da riordinare" description="Nessun articolo è sotto la scorta minima." /> : (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Proposta: tornare alla scorta minima più una settimana di consumo medio degli ultimi 30 giorni.</p>
        <BottoneScrittura onClick={creaOrdini} disabled={inCorso}>Crea gli ordini per fornitore</BottoneScrittura>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Articolo</TableHead><TableHead>Fornitore</TableHead><TableHead className="text-right">Giacenza</TableHead><TableHead className="text-right">Scorta minima</TableHead><TableHead className="text-right">Consumo/giorno</TableHead><TableHead className="text-right">Da ordinare</TableHead></TableRow></TableHeader>
          <TableBody>
            {righe.map((r) => (
              <TableRow key={r.articolo_id}>
                <TableCell className="text-foreground">{r.descrizione}</TableCell>
                <TableCell className="text-muted-foreground">{fornitori.find((f) => f.id === r.fornitore_id)?.ragione_sociale ?? <Badge tone="warning">Senza fornitore</Badge>}</TableCell>
                <TableCell numerica>{fmt(r.giacenza)} {r.unita_misura}</TableCell>
                <TableCell numerica>{fmt(r.scorta_minima)}</TableCell>
                <TableCell numerica>{fmt(r.consumo_medio_giorno)}</TableCell>
                <TableCell numerica className="font-semibold">{fmt(r.quantita_proposta)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function Inventari({ modulo, moduli }: { modulo: string; moduli: string[] }) {
  const articoli = useArticoli(moduli)
  const { data: inventari = [] } = useElenco<Inventario>('mag_inventari', { filtri: { modulo: moduli }, ordine: [{ colonna: 'data', crescente: false }] })
  const nuovo = useSalva('mag_inventari', TABELLE)
  const aperto = inventari.find((i) => i.stato === 'aperto')
  const { data: righe = [] } = useElenco<RigaInventario>('mag_inventari_righe', { filtri: { inventario_id: aperto?.id }, abilitato: !!aperto })
  const conta = useInserisci('mag_inventari_righe', TABELLE)
  const chiudi = useAzione('chiudi_inventario', TABELLE)
  const [conteggi, setConteggi] = useState<Record<string, string>>({})

  if (!aperto) {
    return (
      <div className="space-y-3">
        <BottoneScrittura onClick={() => nuovo.mutate({ values: { modulo, descrizione: `Inventario del ${new Date().toLocaleDateString('it-IT')}` } }, { onError: (e) => toast.error(messaggioErrore(e)) })}>
          <ClipboardCheck className="h-4 w-4" /> Inizia un inventario</BottoneScrittura>
        {inventari.length > 0 && (
          <Card className="divide-y divide-border">{inventari.map((i) => (
            <div key={i.id} className="flex items-center justify-between px-4 py-2.5 text-sm"><span>{i.descrizione ?? data(i.data)}</span><Badge tone="success">Chiuso {data(i.chiuso_at)}</Badge></div>))}</Card>
        )}
      </div>
    )
  }
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title text-foreground">{aperto.descrizione}</h2>
        <BottoneScrittura onClick={() => chiudi.mutate({ p_inventario: aperto.id }, { onSuccess: (k) => toast.success(`Inventario chiuso: ${k} rettifiche registrate`), onError: (e) => toast.error(messaggioErrore(e)) })}>
          Chiudi e rettifica</BottoneScrittura>
      </div>
      <p className="text-sm text-muted-foreground">Scrivi la quantità contata: alla chiusura le differenze diventano movimenti di rettifica.</p>
      <Table>
        <TableHeader><TableRow><TableHead>Articolo</TableHead><TableHead className="text-right">Contato</TableHead></TableRow></TableHeader>
        <TableBody>
          {articoli.map((a) => {
            const r = righe.find((x) => x.articolo_id === a.id && !x.lotto_id)
            return (
              <TableRow key={a.id}>
                <TableCell className="text-foreground">{a.descrizione} <span className="text-xs text-muted-foreground">({a.unita_misura})</span></TableCell>
                <TableCell numerica>{r ? fmt(r.quantita_contata) : (
                  <span className="inline-flex gap-1.5">
                    <Input className="h-8 w-24 text-right" inputMode="decimal" aria-label={`Quantità contata di ${a.descrizione}`} value={conteggi[a.id] ?? ''}
                      onChange={(e) => setConteggi({ ...conteggi, [a.id]: e.target.value })} />
                    <Button size="sm" variant="outline" disabled={conteggi[a.id] === undefined || conteggi[a.id] === ''}
                      onClick={() => conta.mutate({ inventario_id: aperto.id, modulo: a.modulo, articolo_id: a.id, quantita_contata: n(conteggi[a.id]) },
                        { onError: (e) => toast.error(messaggioErrore(e)) })}>Conta</Button>
                  </span>)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

function Fornitori({ modulo }: { modulo: string }) {
  const { data: rating = [] } = useElenco<Rating>('fornitori_rating', { filtri: { modulo } })
  const fornitori = useOrganizzazioni()
  const valuta = useInserisci('fornitori_valutazioni', ['fornitori_rating'])
  const [v, setV] = useState({ fornitore: '', prezzo: '4', qualita: '4', puntualita: '4', completezza: '4', continuita: '4', non_conformita: '' })
  const ETICHETTA = { prezzo: 'Prezzo', qualita: 'Qualità', puntualita: 'Puntualità', completezza: 'Completezza', continuita: 'Continuità' }
  const voto = (k: keyof typeof ETICHETTA) => (
    <div className="w-24 space-y-1.5"><Label>{ETICHETTA[k]}</Label>
      <Select value={v[k]} onValueChange={(x) => setV({ ...v, [k]: x })}><SelectTrigger aria-label={k}><SelectValue /></SelectTrigger>
        <SelectContent>{[1, 2, 3, 4, 5].map((i) => <SelectItem key={i} value={String(i)}>{i}</SelectItem>)}</SelectContent></Select></div>
  )
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5"><Label>Fornitore</Label>
            <Select value={v.fornitore} onValueChange={(x) => setV({ ...v, fornitore: x })}><SelectTrigger aria-label="Fornitore"><SelectValue placeholder="Scegli…" /></SelectTrigger>
              <SelectContent>{fornitori.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}</SelectContent></Select></div>
          {voto('prezzo')}{voto('qualita')}{voto('puntualita')}{voto('completezza')}{voto('continuita')}
          <div className="min-w-48 flex-1 space-y-1.5"><Label htmlFor="fv-nc">Non conformità (se c'è stata)</Label><Input id="fv-nc" value={v.non_conformita} onChange={(e) => setV({ ...v, non_conformita: e.target.value })} placeholder="Merce danneggiata, temperatura fuori norma…" /></div>
          <BottoneScrittura disabled={!v.fornitore} onClick={() => valuta.mutate({ modulo, fornitore_id: v.fornitore, prezzo: Number(v.prezzo), qualita: Number(v.qualita),
            puntualita: Number(v.puntualita), completezza: Number(v.completezza), continuita: Number(v.continuita), non_conformita: v.non_conformita.trim() || null },
            { onSuccess: () => toast.success('Valutazione registrata'), onError: (e) => toast.error(messaggioErrore(e)) })}><Star className="h-4 w-4" /> Valuta</BottoneScrittura>
        </div>
      </Card>
      {rating.length === 0 ? <EmptyState compatto icon={Star} title="Nessuna valutazione" description="Valuta prezzo, qualità, puntualità e completezza delle consegne." /> : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Fornitore</TableHead><TableHead className="text-right">Valutazioni</TableHead><TableHead className="text-right">Prezzo</TableHead><TableHead className="text-right">Qualità</TableHead><TableHead className="text-right">Puntualità</TableHead><TableHead className="text-right">Completezza</TableHead><TableHead className="text-right">Continuità</TableHead><TableHead className="text-right">Non conformità</TableHead><TableHead className="text-right">Punteggio</TableHead></TableRow></TableHeader>
            <TableBody>
              {rating.map((r) => (
                <TableRow key={r.fornitore_id}>
                  <TableCell className="text-foreground">{fornitori.find((f) => f.id === r.fornitore_id)?.ragione_sociale ?? '—'}</TableCell>
                  <TableCell numerica>{r.valutazioni}</TableCell>
                  <TableCell numerica>{fmt(r.prezzo, 1)}</TableCell><TableCell numerica>{fmt(r.qualita, 1)}</TableCell>
                  <TableCell numerica>{fmt(r.puntualita, 1)}</TableCell><TableCell numerica>{fmt(r.completezza, 1)}</TableCell><TableCell numerica>{fmt(r.continuita, 1)}</TableCell>
                  <TableCell numerica>{r.non_conformita}</TableCell>
                  <TableCell numerica className="font-semibold">{fmt(r.punteggio, 2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

type Listino = Tables<'fornitori_listini'>

/** Listini: prezzo di ogni fornitore per articolo, lotto minimo, tempi di consegna, condizioni. */
function Listini({ modulo, moduli }: { modulo: string; moduli: string[] }) {
  const { isManager } = useAuth()
  const articoli = useArticoli(moduli)
  const fornitori = useOrganizzazioni()
  const { data: listini = [] } = useElenco<Listino>('fornitori_listini', { filtri: { modulo: moduli }, ordine: [{ colonna: 'articolo_id' }, { colonna: 'prezzo' }] })
  const salva = useSalva('fornitori_listini', ['fornitori_miglior_prezzo'])
  const [f, setF] = useState({ fornitore: '', articolo: '', prezzo: '', minimo: '', giorni: '', condizioni: '' })
  const nomeArt = (id: string) => articoli.find((a) => a.id === id)?.descrizione ?? '—'
  const nomeForn = (id: string) => fornitori.find((o) => o.id === id)?.ragione_sociale ?? '—'
  const migliore = (l: Listino) => !listini.some((x) => x.articolo_id === l.articolo_id && x.id !== l.id && Number(x.prezzo) < Number(l.prezzo))
  return (
    <Card className="mt-4 space-y-3 p-5">
      <h2 className="text-title text-foreground">Listini e condizioni</h2>
      {isManager && (
        <div className="flex flex-wrap items-end gap-2">
          <Select value={f.fornitore} onValueChange={(v) => setF({ ...f, fornitore: v })}><SelectTrigger className="w-52" aria-label="Fornitore"><SelectValue placeholder="Fornitore…" /></SelectTrigger>
            <SelectContent>{fornitori.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}</SelectContent></Select>
          <Select value={f.articolo} onValueChange={(v) => setF({ ...f, articolo: v })}><SelectTrigger className="w-52" aria-label="Articolo"><SelectValue placeholder="Articolo…" /></SelectTrigger>
            <SelectContent>{articoli.map((a) => <SelectItem key={a.id} value={a.id}>{a.descrizione}</SelectItem>)}</SelectContent></Select>
          <Input className="w-28" inputMode="decimal" placeholder="Prezzo €" aria-label="Prezzo" value={f.prezzo} onChange={(e) => setF({ ...f, prezzo: e.target.value })} />
          <Input className="w-28" inputMode="decimal" placeholder="Minimo" aria-label="Lotto minimo" value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value })} />
          <Input className="w-28" type="number" min={0} placeholder="Giorni" aria-label="Giorni di consegna" value={f.giorni} onChange={(e) => setF({ ...f, giorni: e.target.value })} />
          <Input className="min-w-40 flex-1" placeholder="Condizioni (pagamento, resa…)" aria-label="Condizioni" value={f.condizioni} onChange={(e) => setF({ ...f, condizioni: e.target.value })} />
          <BottoneScrittura variant="outline" disabled={!f.fornitore || !f.articolo || !(n(f.prezzo) >= 0) || f.prezzo === ''}
            onClick={() => salva.mutate({ values: { modulo, fornitore_id: f.fornitore, articolo_id: f.articolo, prezzo: n(f.prezzo), minimo_ordine: f.minimo ? n(f.minimo) : null,
              giorni_consegna: f.giorni ? Number(f.giorni) : null, condizioni: f.condizioni || null } },
              { onSuccess: () => setF({ ...f, articolo: '', prezzo: '', minimo: '' }), onError: (e) => toast.error(messaggioErrore(e)) })}>Aggiungi</BottoneScrittura>
        </div>
      )}
      {listini.length === 0 ? <p className="text-sm text-muted-foreground">Nessun listino: registra i prezzi dei fornitori per confrontarli.</p> : (
        <Table>
          <TableHeader><TableRow><TableHead>Articolo</TableHead><TableHead>Fornitore</TableHead><TableHead className="text-right">Prezzo</TableHead><TableHead className="text-right">Minimo</TableHead><TableHead className="text-right">Consegna</TableHead><TableHead>Condizioni</TableHead></TableRow></TableHeader>
          <TableBody>
            {listini.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-foreground">{nomeArt(l.articolo_id)}</TableCell>
                <TableCell>{nomeForn(l.fornitore_id)}{migliore(l) && <Badge tone="success" className="ml-2">Miglior prezzo</Badge>}</TableCell>
                <TableCell numerica>{euro(l.prezzo)}</TableCell>
                <TableCell numerica>{l.minimo_ordine ? fmt(l.minimo_ordine) : '—'}</TableCell>
                <TableCell numerica>{l.giorni_consegna != null ? `${l.giorni_consegna} gg` : '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.condizioni ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
