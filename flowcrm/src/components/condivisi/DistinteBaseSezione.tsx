/**
 * Ricettario e distinte base (fondamenta F0.1): ricette, semilavorati
 * (ragù, brodo, impasti) usati in più ricette, composizioni floreali.
 * Costo per porzione lungo tutta la catena materia prima → preparazione →
 * piatto, con lo scarto di lavorazione; allergeni ereditati dai
 * componenti; i cicli li rifiuta il database.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import { useElenco, useSalva, useInserisci, useElimina, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'

type Distinta = Tables<'distinte_base'>
type RigaDistinta = Tables<'distinte_base_righe'>
type Articolo = Tables<'mag_articoli'>
type Riepilogo = Database['public']['Views']['distinte_base_riepilogo']['Row']

const euro = (n: number | string | null | undefined, d = 2) =>
  n === null || n === undefined ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n))

interface Props {
  /** Modulo delle nuove ricette (es. 'fb', 'fioraio'). */
  modulo: string
  /** Moduli di cui mostrare le distinte e gli articoli. */
  moduli: string[]
  tipi: { valore: string; label: string }[]
  etichetta: { singolare: string; plurale: string }
  etichettaAllergene?: (v: string) => string
}

export function DistinteBaseSezione({ modulo, moduli, tipi, etichetta, etichettaAllergene = (v) => v }: Props) {
  const { data: distinte = [], isLoading } = useElenco<Distinta>('distinte_base', { filtri: { modulo: moduli, attivo: true }, ordine: [{ colonna: 'nome' }] })
  const { data: riepiloghi = [] } = useElenco<Riepilogo>('distinte_base_riepilogo', { filtri: { modulo: moduli } })
  const [sceltaId, setSceltaId] = useState<string | null>(null)
  const [nuova, setNuova] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('tutti')
  const riep = (id: string) => riepiloghi.find((r) => r.distinta_id === id)
  const scelta = distinte.find((d) => d.id === sceltaId) ?? null
  const elenco = distinte.filter((d) => filtroTipo === 'tutti' || d.tipo === filtroTipo)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="h-fit overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-8 w-40" aria-label="Tipo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutte</SelectItem>
              {tipi.map((t) => <SelectItem key={t.valore} value={t.valore}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <BottoneScrittura size="sm" onClick={() => { setNuova(true); setSceltaId(null) }}><Plus className="h-3.5 w-3.5" /> Nuova</BottoneScrittura>
        </div>
        {isLoading ? null : elenco.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Ancora nessuna {etichetta.singolare}.</p>
        ) : (
          <ul className="max-h-[65vh] divide-y divide-border overflow-y-auto">
            {elenco.map((d) => {
              const r = riep(d.id)
              return (
                <li key={d.id}>
                  <button type="button" onClick={() => { setSceltaId(d.id); setNuova(false) }} aria-current={d.id === sceltaId}
                    className={cn('flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/50', d.id === sceltaId && 'bg-muted')}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{d.nome}</span>
                      <span className="block text-xs text-muted-foreground">
                        {tipi.find((t) => t.valore === d.tipo)?.label ?? d.tipo}{r?.usata_in ? ` · usata in ${r.usata_in}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">{euro(r?.costo_unitario)}<br />/{d.unita_resa}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      {nuova ? <NuovaDistinta modulo={modulo} tipi={tipi} onCreata={(id) => { setNuova(false); setSceltaId(id) }} onAnnulla={() => setNuova(false)} etichetta={etichetta.singolare} />
        : scelta ? <EditorDistinta distinta={scelta} distinte={distinte} moduli={moduli} riepilogo={riep(scelta.id)} tipi={tipi} etichettaAllergene={etichettaAllergene} />
        : <EmptyState icon={BookOpen} title={`Scegli una ${etichetta.singolare}`}
            description={`A sinistra le ${etichetta.plurale}: ingredienti, quantità, scarto, costo e allergeni.`}
            action={<BottoneScrittura onClick={() => setNuova(true)}>Nuova {etichetta.singolare}</BottoneScrittura>} />}
    </div>
  )
}

function NuovaDistinta({ modulo, tipi, onCreata, onAnnulla, etichetta }: {
  modulo: string; tipi: { valore: string; label: string }[]; onCreata: (id: string) => void; onAnnulla: () => void; etichetta: string
}) {
  const salva = useSalva('distinte_base', ['distinte_base_riepilogo'])
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState(tipi[0]?.valore ?? 'ricetta')
  const [resa, setResa] = useState('1')
  const [unita, setUnita] = useState('porzione')
  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    try {
      const d = await salva.mutateAsync({ values: { modulo, nome: nome.trim(), tipo, resa: Number(resa.replace(',', '.')) || 1, unita_resa: unita.trim() || 'porzione' } })
      onCreata(d.id)
    } catch (err) { toast.error(messaggioErrore(err)) }
  }
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-title text-foreground">Nuova {etichetta}</h2>
      <form onSubmit={crea} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="db-nome">Nome *</Label><Input id="db-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus required /></div>
          <div className="space-y-1.5"><Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{tipi.map((t) => <SelectItem key={t.valore} value={t.valore}>{t.label}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label htmlFor="db-resa">Resa</Label><Input id="db-resa" inputMode="decimal" value={resa} onChange={(e) => setResa(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="db-unita">Unità</Label><Input id="db-unita" value={unita} onChange={(e) => setUnita(e.target.value)} /></div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">La resa è quante porzioni (o litri, pezzi) produce la ricetta: il costo si divide per la resa.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onAnnulla}>Annulla</Button>
          <BottoneScrittura type="submit" disabled={salva.isPending}>Crea e aggiungi gli ingredienti</BottoneScrittura>
        </div>
      </form>
    </Card>
  )
}

function EditorDistinta({ distinta, distinte, moduli, riepilogo, tipi, etichettaAllergene }: {
  distinta: Distinta; distinte: Distinta[]; moduli: string[]; riepilogo?: Riepilogo
  tipi: { valore: string; label: string }[]; etichettaAllergene: (v: string) => string
}) {
  const { data: righe = [] } = useElenco<RigaDistinta>('distinte_base_righe', { filtri: { distinta_id: distinta.id }, ordine: [{ colonna: 'ordine' }, { colonna: 'created_at' }] })
  const { data: articoli = [] } = useElenco<Articolo>('mag_articoli', { filtri: { modulo: moduli, attivo: true }, ordine: [{ colonna: 'descrizione' }] })
  const { data: riepiloghi = [] } = useElenco<Riepilogo>('distinte_base_riepilogo', { filtri: { modulo: moduli } })
  const salvaDistinta = useSalva('distinte_base', ['distinte_base_riepilogo', 'fb_prodotti_economia'])
  const aggiungi = useInserisci('distinte_base_righe', ['distinte_base_riepilogo', 'fb_prodotti_economia'])
  const salvaRiga = useSalva('distinte_base_righe', ['distinte_base_riepilogo', 'fb_prodotti_economia'])
  const togli = useElimina('distinte_base_righe', ['distinte_base_riepilogo', 'fb_prodotti_economia'])
  const nuovoArticolo = useSalva('mag_articoli')

  const [testa, setTesta] = useState({ nome: '', resa: '', unita: '', tempo: '', procedimento: '', prezzo: '', tipo: '' })
  useEffect(() => {
    setTesta({ nome: distinta.nome, resa: String(distinta.resa), unita: distinta.unita_resa, tempo: distinta.tempo_preparazione_min ? String(distinta.tempo_preparazione_min) : '',
      procedimento: distinta.procedimento ?? '', prezzo: distinta.prezzo_vendita ? String(distinta.prezzo_vendita) : '', tipo: distinta.tipo })
  }, [distinta])
  const [comp, setComp] = useState('')
  const [quantita, setQuantita] = useState('')
  const [scarto, setScarto] = useState('0')
  const [nuovoIngr, setNuovoIngr] = useState({ descrizione: '', unita: 'kg', costo: '' })

  const altrePreparazioni = useMemo(() => distinte.filter((d) => d.id !== distinta.id), [distinte, distinta.id])
  const { data: usi = [] } = useElenco<Pick<RigaDistinta, 'distinta_id'>>('distinte_base_righe', {
    filtri: { sotto_distinta_id: distinta.id }, select: 'distinta_id' })
  const usataIn = [...new Set(usi.map((u) => distinte.find((d) => d.id === u.distinta_id)?.nome).filter(Boolean))]
  const costoComponente = (r: RigaDistinta) => {
    const unit = r.articolo_id ? Number(articoli.find((a) => a.id === r.articolo_id)?.costo_unitario ?? 0)
      : Number(riepiloghi.find((x) => x.distinta_id === r.sotto_distinta_id)?.costo_unitario ?? 0)
    return Number(r.quantita) / (1 - Number(r.scarto_percentuale) / 100) * unit
  }
  const nomeComponente = (r: RigaDistinta) => r.articolo_id ? articoli.find((a) => a.id === r.articolo_id)?.descrizione ?? '—'
    : distinte.find((d) => d.id === r.sotto_distinta_id)?.nome ?? '—'
  const unitaComponente = (r: RigaDistinta) => r.articolo_id ? articoli.find((a) => a.id === r.articolo_id)?.unita_misura ?? ''
    : distinte.find((d) => d.id === r.sotto_distinta_id)?.unita_resa ?? ''

  async function aggiungiRiga(e: FormEvent) {
    e.preventDefault()
    if (!comp || !(Number(quantita.replace(',', '.')) > 0)) { toast.error('Scegli il componente e la quantità'); return }
    const [tipo, id] = comp.split(':')
    try {
      await aggiungi.mutateAsync({ distinta_id: distinta.id, modulo: distinta.modulo, articolo_id: tipo === 'a' ? id : null,
        sotto_distinta_id: tipo === 'd' ? id : null, quantita: Number(quantita.replace(',', '.')),
        scarto_percentuale: Number(scarto.replace(',', '.')) || 0, ordine: righe.length })
      setComp(''); setQuantita(''); setScarto('0')
    } catch (err) { toast.error(messaggioErrore(err)) }
  }
  async function creaIngrediente() {
    if (!nuovoIngr.descrizione.trim()) return
    try {
      const a = await nuovoArticolo.mutateAsync({ values: { modulo: moduli[0], descrizione: nuovoIngr.descrizione.trim(), unita_misura: nuovoIngr.unita,
        costo_unitario: Number(nuovoIngr.costo.replace(',', '.')) || 0 } })
      setComp(`a:${a.id}`); setNuovoIngr({ descrizione: '', unita: 'kg', costo: '' })
      toast.success('Ingrediente creato anche in magazzino')
    } catch (err) { toast.error(messaggioErrore(err)) }
  }
  function salvaTesta() {
    salvaDistinta.mutate({ id: distinta.id, values: { nome: testa.nome.trim(), tipo: testa.tipo, resa: Number(testa.resa.replace(',', '.')) || 1, unita_resa: testa.unita.trim() || 'porzione',
      tempo_preparazione_min: testa.tempo ? Number(testa.tempo) : null, procedimento: testa.procedimento.trim() || null,
      prezzo_vendita: testa.prezzo ? Number(testa.prezzo.replace(',', '.')) : null } },
      { onSuccess: () => toast.success('Salvata'), onError: (e) => toast.error(messaggioErrore(e)) })
  }

  const costoTot = righe.reduce((s, r) => s + costoComponente(r), 0)
  const prezzo = Number(testa.prezzo.replace(',', '.')) || 0
  const costoPorz = costoTot / (Number(testa.resa.replace(',', '.')) || 1)

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-60 flex-1 space-y-1.5"><Label htmlFor="ed-nome">Nome</Label>
            <Input id="ed-nome" value={testa.nome} onChange={(e) => setTesta({ ...testa, nome: e.target.value })} onBlur={salvaTesta} /></div>
          <dl className="flex gap-6 text-right text-sm">
            <div><dt className="text-muted-foreground">Costo totale</dt><dd data-slot="kpi" className="text-title text-foreground">{euro(costoTot)}</dd></div>
            <div><dt className="text-muted-foreground">Per {testa.unita || 'porzione'}</dt><dd data-slot="kpi" className="text-title text-foreground">{euro(costoPorz)}</dd></div>
            {prezzo > 0 && <div><dt className="text-muted-foreground">Margine</dt><dd data-slot="kpi" className="text-title text-foreground">{euro(prezzo - costoPorz)}</dd></div>}
            {prezzo > 0 && <div><dt className="text-muted-foreground">Food cost</dt><dd data-slot="kpi" className="text-title text-foreground">{new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format((costoPorz / prezzo) * 100)}%</dd></div>}
          </dl>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="space-y-1.5"><Label>Tipo</Label>
            <Select value={testa.tipo} onValueChange={(v) => { setTesta({ ...testa, tipo: v }); salvaDistinta.mutate({ id: distinta.id, values: { tipo: v } }) }}>
              <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{tipi.map((t) => <SelectItem key={t.valore} value={t.valore}>{t.label}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label htmlFor="ed-resa">Resa</Label><Input id="ed-resa" inputMode="decimal" value={testa.resa} onChange={(e) => setTesta({ ...testa, resa: e.target.value })} onBlur={salvaTesta} /></div>
          <div className="space-y-1.5"><Label htmlFor="ed-unita">Unità di resa</Label><Input id="ed-unita" value={testa.unita} onChange={(e) => setTesta({ ...testa, unita: e.target.value })} onBlur={salvaTesta} /></div>
          <div className="space-y-1.5"><Label htmlFor="ed-tempo">Tempo (min)</Label><Input id="ed-tempo" type="number" min={0} value={testa.tempo} onChange={(e) => setTesta({ ...testa, tempo: e.target.value })} onBlur={salvaTesta} /></div>
          <div className="space-y-1.5"><Label htmlFor="ed-prezzo">Prezzo di vendita (€, netto)</Label><Input id="ed-prezzo" inputMode="decimal" value={testa.prezzo} onChange={(e) => setTesta({ ...testa, prezzo: e.target.value })} onBlur={salvaTesta} /></div>
        </div>
        <ProduzioneSemilavorato distinta={distinta} moduloArticoli={moduli[0]} />
        {usataIn.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Usata in: <span className="text-foreground">{usataIn.join(', ')}</span></p>
        )}
        {riepilogo?.allergeni && riepilogo.allergeni.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm"><span className="text-muted-foreground">Allergeni ereditati:</span>
            {riepilogo.allergeni.map((a) => <Badge key={a} tone="danger">{etichettaAllergene(a)}</Badge>)}</p>
        )}
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Componente</TableHead>
              <TableHead className="text-right">Quantità</TableHead>
              <TableHead className="text-right">Scarto</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead><span className="sr-only">Azioni</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {righe.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-foreground">
                  {nomeComponente(r)}
                  {r.sotto_distinta_id && <Badge tone="info" className="ml-2">preparazione</Badge>}
                </TableCell>
                <TableCell numerica>
                  <Input defaultValue={String(r.quantita)} inputMode="decimal" className="ml-auto h-8 w-24 text-right" aria-label="Quantità"
                    onBlur={(e) => { const q = Number(e.target.value.replace(',', '.')); if (q > 0 && q !== Number(r.quantita))
                      salvaRiga.mutate({ id: r.id, values: { quantita: q } }, { onError: (err) => toast.error(messaggioErrore(err)) }) }} />
                  <span className="ml-1 text-xs text-muted-foreground">{unitaComponente(r)}</span>
                </TableCell>
                <TableCell numerica>{Number(r.scarto_percentuale) ? `${Number(r.scarto_percentuale)}%` : '—'}</TableCell>
                <TableCell numerica>{euro(costoComponente(r), 3)}</TableCell>
                <TableCell numerica>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Togli ${nomeComponente(r)}`}
                    onClick={() => togli.mutate(r.id, { onError: (e) => toast.error(messaggioErrore(e)) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <form onSubmit={aggiungiRiga} className="flex flex-wrap items-end gap-3 border-t border-border p-4">
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label>Componente</Label>
            <Select value={comp} onValueChange={setComp}>
              <SelectTrigger aria-label="Componente"><SelectValue placeholder="Ingrediente o preparazione…" /></SelectTrigger>
              <SelectContent>
                {altrePreparazioni.map((d) => <SelectItem key={d.id} value={`d:${d.id}`}>Preparazione · {d.nome} ({d.unita_resa})</SelectItem>)}
                {articoli.map((a) => <SelectItem key={a.id} value={`a:${a.id}`}>{a.descrizione} ({a.unita_misura} · {euro(a.costo_unitario, 2)})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28 space-y-1.5"><Label htmlFor="ed-q">Quantità</Label><Input id="ed-q" inputMode="decimal" value={quantita} onChange={(e) => setQuantita(e.target.value)} placeholder="0,09" /></div>
          <div className="w-24 space-y-1.5"><Label htmlFor="ed-s">Scarto %</Label><Input id="ed-s" inputMode="decimal" value={scarto} onChange={(e) => setScarto(e.target.value)} /></div>
          <BottoneScrittura type="submit"><Plus className="h-4 w-4" /> Aggiungi</BottoneScrittura>
        </form>
        <div className="flex flex-wrap items-end gap-3 border-t border-dashed border-border bg-muted/30 p-4">
          <p className="w-full text-xs text-muted-foreground">Ingrediente che non c'è ancora? Crealo qui: entra anche in magazzino.</p>
          <div className="min-w-48 flex-1 space-y-1.5"><Label htmlFor="ed-ni">Nuovo ingrediente</Label>
            <Input id="ed-ni" value={nuovoIngr.descrizione} onChange={(e) => setNuovoIngr({ ...nuovoIngr, descrizione: e.target.value })} /></div>
          <div className="w-24 space-y-1.5"><Label htmlFor="ed-nu">Unità</Label>
            <Input id="ed-nu" value={nuovoIngr.unita} onChange={(e) => setNuovoIngr({ ...nuovoIngr, unita: e.target.value })} /></div>
          <div className="w-28 space-y-1.5"><Label htmlFor="ed-nc">Costo/unità (€)</Label>
            <Input id="ed-nc" inputMode="decimal" value={nuovoIngr.costo} onChange={(e) => setNuovoIngr({ ...nuovoIngr, costo: e.target.value })} /></div>
          <BottoneScrittura variant="outline" onClick={creaIngrediente}>Crea</BottoneScrittura>
        </div>
      </Card>

      <Card className="p-5">
        <Label htmlFor="ed-proc">Procedimento</Label>
        <Textarea id="ed-proc" rows={5} className="mt-1.5" value={testa.procedimento}
          onChange={(e) => setTesta({ ...testa, procedimento: e.target.value })} onBlur={salvaTesta}
          placeholder="Preparazioni preliminari, passaggi, tempi, conservazione…" />
      </Card>
    </div>
  )
}

/**
 * Preparazione fatta in anticipo e tenuta in magazzino (ragù, brodo,
 * impasti): si collega a un articolo e si produce in lotti. La produzione
 * scarica gli ingredienti e carica il lotto del semilavorato; i piatti poi
 * scaricano il semilavorato.
 */
function ProduzioneSemilavorato({ distinta, moduloArticoli }: { distinta: Distinta; moduloArticoli: string }) {
  const salvaDistinta = useSalva('distinte_base', ['distinte_base_riepilogo'])
  const nuovoArticolo = useSalva('mag_articoli', ['mag_giacenze'])
  const produci = useAzione('mag_produci_distinta', ['mag_giacenze', 'mag_lotti_stato', 'mag_movimenti', 'mag_articoli'])
  const [quantita, setQuantita] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [durata, setDurata] = useState('3')
  if (distinta.tipo !== 'semilavorato') return null
  if (!distinta.articolo_prodotto_id) {
    return (
      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3 text-sm">
        <p className="w-full text-muted-foreground">La prepari in anticipo e la conservi? Mettila a magazzino: si produce in lotti con la sua scadenza.</p>
        <div className="w-36 space-y-1.5"><Label htmlFor="ps-d">Si conserva (giorni)</Label><Input id="ps-d" type="number" min={1} value={durata} onChange={(e) => setDurata(e.target.value)} /></div>
        <BottoneScrittura variant="outline" onClick={async () => {
          try {
            const a = await nuovoArticolo.mutateAsync({ values: { modulo: moduloArticoli, descrizione: distinta.nome, unita_misura: distinta.unita_resa,
              categoria: 'Semilavorati', deperibile: true, durata_giorni: Number(durata) || null } })
            await salvaDistinta.mutateAsync({ id: distinta.id, values: { articolo_prodotto_id: a.id } })
            toast.success('Preparazione messa a magazzino')
          } catch (e) { toast.error(messaggioErrore(e)) }
        }}>Metti a magazzino</BottoneScrittura>
      </div>
    )
  }
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-muted/40 p-3 text-sm">
      <p className="w-full text-muted-foreground">Preparazione a magazzino: i piatti scaricano il semilavorato prodotto.</p>
      <div className="w-32 space-y-1.5"><Label htmlFor="ps-q">Produci ({distinta.unita_resa})</Label><Input id="ps-q" inputMode="decimal" value={quantita} onChange={(e) => setQuantita(e.target.value)} /></div>
      <div className="w-40 space-y-1.5"><Label htmlFor="ps-s">Scadenza (facoltativa)</Label><Input id="ps-s" type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} /></div>
      <BottoneScrittura disabled={!(Number(quantita.replace(',', '.')) > 0)} onClick={() => produci.mutate({ p_distinta: distinta.id,
        p_quantita: Number(quantita.replace(',', '.')), p_scadenza: scadenza || undefined },
        { onSuccess: () => { toast.success('Lotto prodotto: ingredienti scaricati, semilavorato caricato'); setQuantita('') }, onError: (e) => toast.error(messaggioErrore(e)) })}>
        Produci il lotto</BottoneScrittura>
    </div>
  )
}
