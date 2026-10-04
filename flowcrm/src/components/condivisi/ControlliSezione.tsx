/**
 * Controlli, attrezzature e sicurezza (fondamenta F0.2 e F0.7), condivisi
 * dai moduli: registri HACCP e pulizie con esito calcolato dalle soglie,
 * non conformità con azione correttiva verificata dalla direzione;
 * attrezzature con garanzie, piani di manutenzione e interventi (guasti,
 * fermo, costi); segnalazioni di incidenti, infortuni ed emergenze.
 */
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ClipboardCheck, Plus, ShieldAlert, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import { useElenco, useInserisci, useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'

type Punto = Tables<'controlli_punti'>
type Registrazione = Tables<'controlli_registrazioni'>
type StatoPunto = Database['public']['Views']['controlli_stato']['Row']
type Asset = Tables<'asset'>
type Piano = Tables<'asset_piani'>
type Intervento = Tables<'asset_interventi'>
type Indicatori = Database['public']['Views']['asset_indicatori']['Row']
type Segnalazione = Tables<'segnalazioni_sicurezza'>

const TIPI_CONTROLLO: Record<string, string> = {
  temperatura: 'Temperatura', ricevimento: 'Ricevimento merci', sanificazione: 'Sanificazione', pulizia: 'Pulizia',
  infestanti: 'Controllo infestanti', olio_frittura: 'Olio di frittura', verifica: 'Verifica periodica', altro: 'Altro',
}
const FREQUENZE: { ore: number | null; label: string }[] = [
  { ore: 4, label: 'Ogni 4 ore' }, { ore: 8, label: 'Ogni turno (8 h)' }, { ore: 24, label: 'Ogni giorno' },
  { ore: 168, label: 'Ogni settimana' }, { ore: 720, label: 'Ogni mese' }, { ore: null, label: 'Al bisogno' },
]
const ASSET_STATO: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  in_uso: { label: 'In uso', tone: 'success' }, in_manutenzione: { label: 'In manutenzione', tone: 'warning' },
  guasto: { label: 'Guasto', tone: 'danger' }, fuori_servizio: { label: 'Fuori servizio', tone: 'neutral' }, dismesso: { label: 'Dismesso', tone: 'neutral' },
}
const INTERVENTO_TIPO: Record<string, string> = { preventiva: 'Preventiva', ordinaria: 'Ordinaria', straordinaria: 'Straordinaria', guasto: 'Guasto' }
const SEGN_TIPO: Record<string, string> = { incidente: 'Incidente', infortunio: 'Infortunio', quasi_incidente: 'Quasi incidente', emergenza: 'Emergenza', pericolo: 'Situazione di pericolo', danno: 'Danno' }
const n = (s: string) => Number(s.replace(',', '.'))
const dataOra = (s: string | null) => s ? new Date(s).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const data = (s: string | null) => s ? new Date(s).toLocaleDateString('it-IT') : '—'
const euro = (v: number | string | null | undefined) => v == null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(v))

export function ControlliSezione({ modulo, moduli, categorieAsset }: { modulo: string; moduli: string[]; categorieAsset: string[] }) {
  const { data: stati = [] } = useElenco<StatoPunto>('controlli_stato', { filtri: { modulo: moduli } })
  const ritardi = stati.filter((s) => s.in_ritardo).length
  const nc = stati.reduce((x, s) => x + (s.non_conformita_aperte ?? 0), 0)
  return (
    <Tabs defaultValue="registri">
      <TabsList className="mb-4 flex-wrap">
        <TabsTrigger value="registri">Registri di controllo{ritardi + nc ? ` (${ritardi + nc})` : ''}</TabsTrigger>
        <TabsTrigger value="attrezzature">Attrezzature e manutenzioni</TabsTrigger>
        <TabsTrigger value="sicurezza">Sicurezza</TabsTrigger>
      </TabsList>
      <TabsContent value="registri"><Registri modulo={modulo} moduli={moduli} stati={stati} /></TabsContent>
      <TabsContent value="attrezzature"><Attrezzature modulo={modulo} moduli={moduli} categorie={categorieAsset} /></TabsContent>
      <TabsContent value="sicurezza"><Sicurezza modulo={modulo} /></TabsContent>
    </Tabs>
  )
}

// ═══ REGISTRI ═══════════════════════════════════════════════════════
function Registri({ modulo, moduli, stati }: { modulo: string; moduli: string[]; stati: StatoPunto[] }) {
  const { isManager } = useAuth()
  const { data: punti = [] } = useElenco<Punto>('controlli_punti', { filtri: { modulo: moduli, attivo: true }, ordine: [{ colonna: 'nome' }] })
  const { data: aperte = [] } = useElenco<Registrazione>('controlli_registrazioni', {
    filtri: { modulo: moduli, esito: 'non_conforme', azione_verificata_at: null }, ordine: [{ colonna: 'eseguito_at', crescente: false }], limite: 50 })
  const [sceltoId, setSceltoId] = useState<string | null>(null)
  const [nuovo, setNuovo] = useState(false)
  const scelto = punti.find((p) => p.id === sceltoId) ?? null
  const stato = (id: string) => stati.find((s) => s.punto_id === id)

  return (
    <div className="space-y-4">
      {aperte.length > 0 && (
        <Card className="border-destructive p-4">
          <h2 className="mb-2 flex items-center gap-2 text-title text-destructive-testo"><AlertTriangle className="h-4 w-4" /> Non conformità da chiudere ({aperte.length})</h2>
          <ul className="divide-y divide-border text-sm">
            {aperte.map((r) => <RigaNonConformita key={r.id} r={r} punto={punti.find((p) => p.id === r.punto_id)} />)}
          </ul>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-label uppercase text-muted-foreground">Punti di controllo</span>
            {isManager && <BottoneScrittura size="sm" onClick={() => { setNuovo(true); setSceltoId(null) }}><Plus className="h-3.5 w-3.5" /> Nuovo</BottoneScrittura>}
          </div>
          {punti.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">Nessun punto: frigoriferi, congelatori, ricevimento merci, pulizie…</p> : (
            <ul className="max-h-[65vh] divide-y divide-border overflow-y-auto">
              {punti.map((p) => {
                const s = stato(p.id)
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => { setSceltoId(p.id); setNuovo(false) }} aria-current={p.id === sceltoId}
                      className={cn('flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted/50', p.id === sceltoId && 'bg-muted')}>
                      <span className="min-w-0"><span className="block truncate font-medium text-foreground">{p.nome}</span>
                        <span className="block text-xs text-muted-foreground">{TIPI_CONTROLLO[p.tipo]}{s?.ultimo_controllo ? ` · ultimo ${dataOra(s.ultimo_controllo)}` : ' · mai controllato'}</span></span>
                      {s?.in_ritardo ? <Badge tone="warning">In ritardo</Badge> : s?.ultimo_esito === 'non_conforme' ? <Badge tone="danger">Non conforme</Badge>
                        : s?.ultimo_esito ? <Badge tone="success">Conforme</Badge> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
        {nuovo ? <NuovoPunto modulo={modulo} onCreato={(id) => { setNuovo(false); setSceltoId(id) }} />
          : scelto ? <Registra punto={scelto} />
          : <EmptyState icon={ClipboardCheck} title="Scegli un punto di controllo" description="Registra la temperatura, la pulizia o il ricevimento: l'esito lo calcola il sistema dalle soglie." />}
      </div>
    </div>
  )
}

function RigaNonConformita({ r, punto }: { r: Registrazione; punto?: Punto }) {
  const { isManager } = useAuth()
  const salva = useSalva('controlli_registrazioni', ['controlli_stato'])
  const [azione, setAzione] = useState('')
  return (
    <li className="flex flex-wrap items-center gap-3 py-2">
      <span className="min-w-48 flex-1"><span className="font-medium text-foreground">{punto?.nome}</span>
        <span className="block text-xs text-muted-foreground">{dataOra(r.eseguito_at)}{r.valore != null ? ` · ${r.valore} ${punto?.unita ?? ''}` : ''}{r.note ? ` · ${r.note}` : ''}</span></span>
      {r.azione_correttiva ? (
        <>
          <span className="text-xs text-foreground">Azione: {r.azione_correttiva}</span>
          {isManager && <BottoneScrittura size="sm" onClick={() => salva.mutate({ id: r.id, values: { azione_verificata_at: new Date().toISOString() } },
            { onSuccess: () => toast.success('Azione correttiva verificata'), onError: (e) => toast.error(messaggioErrore(e)) })}>Verifica</BottoneScrittura>}
        </>
      ) : (
        <span className="flex gap-2">
          <Input className="h-8 w-72" value={azione} onChange={(e) => setAzione(e.target.value)} placeholder="Azione correttiva: cosa si è fatto" aria-label="Azione correttiva" />
          <BottoneScrittura size="sm" disabled={!azione.trim()} onClick={() => salva.mutate({ id: r.id, values: { azione_correttiva: azione.trim() } },
            { onSuccess: () => toast.success('Azione correttiva registrata'), onError: (e) => toast.error(messaggioErrore(e)) })}>Registra</BottoneScrittura>
        </span>
      )}
    </li>
  )
}

function NuovoPunto({ modulo, onCreato }: { modulo: string; onCreato: (id: string) => void }) {
  const salva = useSalva('controlli_punti', ['controlli_stato'])
  const [f, setF] = useState({ nome: '', tipo: 'temperatura', ubicazione: '', ore: '24', unita: '°C', min: '', max: '', checklist: '', istruzioni: '' })
  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) return
    try {
      const p = await salva.mutateAsync({ values: { modulo, nome: f.nome.trim(), tipo: f.tipo as Punto['tipo'], ubicazione: f.ubicazione.trim() || null,
        ogni_ore: f.ore === 'null' ? null : Number(f.ore), unita: f.unita.trim() || null,
        soglia_min: f.min.trim() ? n(f.min) : null, soglia_max: f.max.trim() ? n(f.max) : null,
        checklist: f.checklist.split(',').map((x) => x.trim()).filter(Boolean), istruzioni: f.istruzioni.trim() || null } })
      onCreato(p.id)
    } catch (err) { toast.error(messaggioErrore(err)) }
  }
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-title text-foreground">Nuovo punto di controllo</h2>
      <form onSubmit={crea} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="col-span-2 space-y-1.5"><Label htmlFor="np-nome">Nome *</Label><Input id="np-nome" value={f.nome} onChange={set('nome')} placeholder="Cella carni, Frigo bibite, Spogliatoio…" /></div>
        <div className="space-y-1.5"><Label>Tipo</Label>
          <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v, unita: v === 'temperatura' ? '°C' : v === 'olio_frittura' ? '% TPM' : '' })}>
            <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TIPI_CONTROLLO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="space-y-1.5"><Label htmlFor="np-ub">Ubicazione</Label><Input id="np-ub" value={f.ubicazione} onChange={set('ubicazione')} /></div>
        <div className="space-y-1.5"><Label>Frequenza</Label>
          <Select value={f.ore} onValueChange={(v) => setF({ ...f, ore: v })}>
            <SelectTrigger aria-label="Frequenza"><SelectValue /></SelectTrigger>
            <SelectContent>{FREQUENZE.map((x) => <SelectItem key={x.label} value={String(x.ore)}>{x.label}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="space-y-1.5"><Label htmlFor="np-un">Unità</Label><Input id="np-un" value={f.unita} onChange={set('unita')} /></div>
        <div className="space-y-1.5"><Label htmlFor="np-min">Soglia minima</Label><Input id="np-min" inputMode="decimal" value={f.min} onChange={set('min')} placeholder="0" /></div>
        <div className="space-y-1.5"><Label htmlFor="np-max">Soglia massima</Label><Input id="np-max" inputMode="decimal" value={f.max} onChange={set('max')} placeholder="4" /></div>
        <div className="col-span-2 space-y-1.5 sm:col-span-3"><Label htmlFor="np-ck">Checklist (voci separate da virgola)</Label>
          <Input id="np-ck" value={f.checklist} onChange={set('checklist')} placeholder="Pavimenti, Piani di lavoro, Cappa, Lavelli" /></div>
        <div className="col-span-2 space-y-1.5 sm:col-span-3"><Label htmlFor="np-ist">Istruzioni</Label><Textarea id="np-ist" rows={2} value={f.istruzioni} onChange={set('istruzioni')} /></div>
        <div className="col-span-2 flex justify-end sm:col-span-3"><BottoneScrittura type="submit">Crea il punto</BottoneScrittura></div>
      </form>
    </Card>
  )
}

function Registra({ punto }: { punto: Punto }) {
  const inserisci = useInserisci('controlli_registrazioni', ['controlli_stato'])
  const { data: storico = [] } = useElenco<Registrazione>('controlli_registrazioni', { filtri: { punto_id: punto.id }, ordine: [{ colonna: 'eseguito_at', crescente: false }], limite: 30 })
  const checklist = (punto.checklist as string[]) ?? []
  const conSoglie = punto.soglia_min != null || punto.soglia_max != null
  const [valore, setValore] = useState('')
  const [voci, setVoci] = useState<Record<string, boolean>>({})
  const [esito, setEsito] = useState<'conforme' | 'non_conforme'>('conforme')
  const [note, setNote] = useState('')
  const [azione, setAzione] = useState('')
  const fuoriSoglia = conSoglie && valore.trim() !== '' && ((punto.soglia_min != null && n(valore) < Number(punto.soglia_min)) || (punto.soglia_max != null && n(valore) > Number(punto.soglia_max)))

  async function invia(e: FormEvent) {
    e.preventDefault()
    try {
      await inserisci.mutateAsync({ punto_id: punto.id, modulo: punto.modulo, valore: conSoglie ? n(valore) : null,
        checklist: Object.fromEntries(checklist.map((v) => [v, voci[v] ?? false])), esito: conSoglie || checklist.length ? undefined : esito,
        note: note.trim() || null, azione_correttiva: azione.trim() || null })
      toast.success('Controllo registrato')
      setValore(''); setVoci({}); setNote(''); setAzione(''); setEsito('conforme')
    } catch (err) { toast.error(messaggioErrore(err)) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-title text-foreground">{punto.nome}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{TIPI_CONTROLLO[punto.tipo]}{punto.ubicazione ? ` · ${punto.ubicazione}` : ''}
          {conSoglie ? ` · ammesso da ${punto.soglia_min ?? '—'} a ${punto.soglia_max ?? '—'} ${punto.unita ?? ''}` : ''}</p>
        {punto.istruzioni && <p className="mb-4 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">{punto.istruzioni}</p>}
        <form onSubmit={invia} className="space-y-4">
          {conSoglie && (
            <div className="w-48 space-y-1.5"><Label htmlFor="rg-val">Valore misurato ({punto.unita})</Label>
              <Input id="rg-val" inputMode="decimal" value={valore} onChange={(e) => setValore(e.target.value)} required
                className={cn(fuoriSoglia && 'border-destructive')} aria-describedby={fuoriSoglia ? 'rg-fuori' : undefined} />
              {fuoriSoglia && <p id="rg-fuori" className="text-xs font-medium text-destructive-testo">Fuori soglia: sarà non conforme. Indica cosa fai.</p>}
            </div>
          )}
          {checklist.length > 0 && (
            <ul className="space-y-2">
              {checklist.map((v) => (
                <li key={v} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                  <span>{v}</span>
                  <Switch checked={voci[v] ?? false} onCheckedChange={(x) => setVoci({ ...voci, [v]: x })} aria-label={`${v} fatto`} />
                </li>
              ))}
            </ul>
          )}
          {!conSoglie && !checklist.length && (
            <div className="flex gap-2" role="radiogroup" aria-label="Esito">
              {(['conforme', 'non_conforme'] as const).map((x) => (
                <button key={x} type="button" role="radio" aria-checked={esito === x} onClick={() => setEsito(x)}
                  className={cn('rounded-md border px-3 py-1.5 text-sm', esito === x ? (x === 'conforme' ? 'border-success bg-success-tenue text-success-testo' : 'border-destructive bg-destructive-tenue text-destructive-testo') : 'border-border text-muted-foreground')}>
                  {x === 'conforme' ? 'Conforme' : 'Non conforme'}</button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="rg-note">Note</Label><Input id="rg-note" value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="rg-az">Azione correttiva (se serve)</Label><Input id="rg-az" value={azione} onChange={(e) => setAzione(e.target.value)} placeholder="Merce spostata, tecnico chiamato…" /></div>
          </div>
          <BottoneScrittura type="submit" disabled={inserisci.isPending}>Registra il controllo</BottoneScrittura>
          <p className="text-xs text-muted-foreground">Le registrazioni non si modificano né si cancellano: fanno da registro di autocontrollo.</p>
        </form>
      </Card>
      {storico.length > 0 && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead className="text-right">Quando</TableHead><TableHead className="text-right">Valore</TableHead><TableHead>Esito</TableHead><TableHead>Note e azioni</TableHead></TableRow></TableHeader>
            <TableBody>
              {storico.map((r) => (
                <TableRow key={r.id}>
                  <TableCell numerica>{dataOra(r.eseguito_at)}</TableCell>
                  <TableCell numerica>{r.valore ?? '—'}</TableCell>
                  <TableCell><Badge tone={r.esito === 'conforme' ? 'success' : 'danger'}>{r.esito === 'conforme' ? 'Conforme' : 'Non conforme'}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{[r.note, r.azione_correttiva && `Azione: ${r.azione_correttiva}`, r.azione_verificata_at && 'verificata'].filter(Boolean).join(' · ') || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

// ═══ ATTREZZATURE ═══════════════════════════════════════════════════
function Attrezzature({ modulo, moduli, categorie }: { modulo: string; moduli: string[]; categorie: string[] }) {
  const { data: asset = [] } = useElenco<Asset>('asset', { filtri: { modulo: moduli }, ordine: [{ colonna: 'descrizione' }] })
  const { data: indicatori = [] } = useElenco<Indicatori>('asset_indicatori', { filtri: { modulo: moduli } })
  const salva = useSalva('asset', ['asset_indicatori', 'scadenze_moduli'])
  const [sceltoId, setSceltoId] = useState<string | null>(null)
  const [f, setF] = useState({ descrizione: '', categoria: categorie[0] ?? '', marca: '', modello: '', matricola: '', acquisto: '', garanzia: '', ubicazione: '' })
  const scelto = asset.find((a) => a.id === sceltoId) ?? null
  const ind = (id: string) => indicatori.find((i) => i.asset_id === id)

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.descrizione.trim()) return
    try {
      const a = await salva.mutateAsync({ values: { modulo, descrizione: f.descrizione.trim(), categoria: f.categoria || null, marca: f.marca || null, modello: f.modello || null,
        matricola: f.matricola || null, data_acquisto: f.acquisto || null, garanzia_scadenza: f.garanzia || null, ubicazione: f.ubicazione || null } })
      setF({ ...f, descrizione: '', marca: '', modello: '', matricola: '', acquisto: '', garanzia: '' })
      setSceltoId(a.id)
    } catch (err) { toast.error(messaggioErrore(err)) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={crea} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-1.5"><Label htmlFor="as-d">Attrezzatura</Label><Input id="as-d" value={f.descrizione} onChange={(e) => setF({ ...f, descrizione: e.target.value })} placeholder="Forno combinato, frigo bibite…" /></div>
          <div className="w-40 space-y-1.5"><Label>Categoria</Label>
            <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v })}><SelectTrigger aria-label="Categoria"><SelectValue /></SelectTrigger>
              <SelectContent>{categorie.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div className="w-32 space-y-1.5"><Label htmlFor="as-m">Marca</Label><Input id="as-m" value={f.marca} onChange={(e) => setF({ ...f, marca: e.target.value })} /></div>
          <div className="w-32 space-y-1.5"><Label htmlFor="as-mo">Modello</Label><Input id="as-mo" value={f.modello} onChange={(e) => setF({ ...f, modello: e.target.value })} /></div>
          <div className="w-32 space-y-1.5"><Label htmlFor="as-mt">Matricola</Label><Input id="as-mt" value={f.matricola} onChange={(e) => setF({ ...f, matricola: e.target.value })} /></div>
          <div className="w-40 space-y-1.5"><Label htmlFor="as-ac">Acquisto</Label><Input id="as-ac" type="date" value={f.acquisto} onChange={(e) => setF({ ...f, acquisto: e.target.value })} /></div>
          <div className="w-40 space-y-1.5"><Label htmlFor="as-g">Garanzia fino al</Label><Input id="as-g" type="date" value={f.garanzia} onChange={(e) => setF({ ...f, garanzia: e.target.value })} /></div>
          <BottoneScrittura type="submit"><Plus className="h-4 w-4" /> Aggiungi</BottoneScrittura>
        </form>
      </Card>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {asset.length === 0 ? <EmptyState icon={Wrench} title="Nessuna attrezzatura" description="Forni, frigoriferi, lavastoviglie, macchine da caffè, impianti." /> : (
          <Card className="h-fit overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Attrezzatura</TableHead><TableHead>Stato</TableHead><TableHead className="text-right">Guasti</TableHead><TableHead className="text-right">Costo interventi</TableHead></TableRow></TableHeader>
              <TableBody>
                {asset.map((a) => {
                  const i = ind(a.id)
                  return (
                    <TableRow key={a.id} onActivate={() => setSceltoId(a.id)} className={cn(a.id === sceltoId && 'bg-muted')}>
                      <TableCell><span className="font-medium text-foreground">{a.descrizione}</span>
                        <span className="block text-xs text-muted-foreground">{[a.codice, a.categoria, a.marca, a.modello].filter(Boolean).join(' · ')}</span></TableCell>
                      <TableCell><Badge tone={ASSET_STATO[a.stato]?.tone ?? 'neutral'}>{ASSET_STATO[a.stato]?.label ?? a.stato}</Badge></TableCell>
                      <TableCell numerica>{i?.guasti ?? 0}</TableCell>
                      <TableCell numerica>{euro(i?.costo_interventi)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
        {scelto ? <DettaglioAsset asset={scelto} indicatori={ind(scelto.id)} /> : asset.length > 0 && <EmptyState icon={Wrench} title="Scegli un'attrezzatura" description="Piani di manutenzione, guasti, interventi e documenti." />}
      </div>
    </div>
  )
}

function DettaglioAsset({ asset, indicatori }: { asset: Asset; indicatori?: Indicatori }) {
  const { data: piani = [] } = useElenco<Piano>('asset_piani', { filtri: { asset_id: asset.id }, ordine: [{ colonna: 'prossima_data' }] })
  const { data: interventi = [] } = useElenco<Intervento>('asset_interventi', { filtri: { asset_id: asset.id }, ordine: [{ colonna: 'segnalato_at', crescente: false }] })
  const salvaPiano = useSalva('asset_piani', ['scadenze_moduli'])
  const salvaInt = useSalva('asset_interventi', ['asset', 'asset_indicatori', 'asset_piani', 'scadenze_moduli'])
  const [piano, setPiano] = useState({ descrizione: '', giorni: '180', prossima: '' })
  const [guasto, setGuasto] = useState({ tipo: 'guasto', descrizione: '', piano: '' })
  const [chiusura, setChiusura] = useState<Record<string, { manodopera: string; ricambi: string; ore: string; tecnico: string }>>({})

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="text-title text-foreground">{asset.descrizione}</h2>
        <p className="text-sm text-muted-foreground">{[asset.codice, asset.matricola && `matricola ${asset.matricola}`, asset.data_acquisto && `acquisto ${data(asset.data_acquisto)}`,
          asset.garanzia_scadenza && `garanzia fino al ${data(asset.garanzia_scadenza)}`].filter(Boolean).join(' · ')}</p>
        {indicatori?.mtbf_giorni != null && <p className="text-sm text-muted-foreground">Tempo medio fra guasti: {indicatori.mtbf_giorni} giorni · fermo {indicatori.ore_fermo} h</p>}
      </div>
      <section>
        <h3 className="mb-2 text-label uppercase text-muted-foreground">Manutenzione programmata</h3>
        <ul className="divide-y divide-border text-sm">
          {piani.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-1.5"><span>{p.descrizione} · ogni {p.ogni_giorni} giorni</span>
              <Badge tone={p.attivo ? (new Date(p.prossima_data) <= new Date() ? 'danger' : 'info') : 'neutral'}>{p.attivo ? `prossima ${data(p.prossima_data)}` : 'fermo'}</Badge></li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <Input className="min-w-40 flex-1" value={piano.descrizione} onChange={(e) => setPiano({ ...piano, descrizione: e.target.value })} placeholder="Revisione, sanificazione cappa…" aria-label="Descrizione del piano" />
          <Input className="w-24" type="number" min={1} value={piano.giorni} onChange={(e) => setPiano({ ...piano, giorni: e.target.value })} aria-label="Ogni quanti giorni" />
          <Input className="w-40" type="date" value={piano.prossima} onChange={(e) => setPiano({ ...piano, prossima: e.target.value })} aria-label="Prossima data" />
          <BottoneScrittura variant="outline" disabled={!piano.descrizione.trim() || !piano.prossima} onClick={() => salvaPiano.mutate({ values: { asset_id: asset.id, modulo: asset.modulo,
            descrizione: piano.descrizione.trim(), ogni_giorni: Number(piano.giorni), prossima_data: piano.prossima } },
            { onSuccess: () => { setPiano({ descrizione: '', giorni: '180', prossima: '' }); toast.success('Piano aggiunto allo scadenzario') }, onError: (e) => toast.error(messaggioErrore(e)) })}>Aggiungi</BottoneScrittura>
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-label uppercase text-muted-foreground">Interventi</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          <Select value={guasto.tipo} onValueChange={(v) => setGuasto({ ...guasto, tipo: v })}>
            <SelectTrigger className="w-40" aria-label="Tipo di intervento"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(INTERVENTO_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
          {guasto.tipo === 'preventiva' && piani.length > 0 && (
            <Select value={guasto.piano} onValueChange={(v) => setGuasto({ ...guasto, piano: v })}>
              <SelectTrigger className="w-48" aria-label="Piano"><SelectValue placeholder="Del piano…" /></SelectTrigger>
              <SelectContent>{piani.map((p) => <SelectItem key={p.id} value={p.id}>{p.descrizione}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Input className="min-w-40 flex-1" value={guasto.descrizione} onChange={(e) => setGuasto({ ...guasto, descrizione: e.target.value })} placeholder="Non scalda, perdita d'acqua…" aria-label="Descrizione" />
          <BottoneScrittura disabled={!guasto.descrizione.trim()} onClick={() => salvaInt.mutate({ values: { asset_id: asset.id, modulo: asset.modulo, tipo: guasto.tipo as Intervento['tipo'],
            descrizione: guasto.descrizione.trim(), piano_id: guasto.piano || null } },
            { onSuccess: () => { setGuasto({ tipo: 'guasto', descrizione: '', piano: '' }); toast.success(guasto.tipo === 'guasto' ? 'Guasto segnalato' : 'Intervento registrato') }, onError: (e) => toast.error(messaggioErrore(e)) })}>
            {guasto.tipo === 'guasto' ? 'Segnala il guasto' : 'Registra'}</BottoneScrittura>
        </div>
        <ul className="divide-y divide-border text-sm">
          {interventi.map((i) => {
            const c = chiusura[i.id] ?? { manodopera: '', ricambi: '', ore: '', tecnico: '' }
            const aperto = !['chiuso', 'annullato'].includes(i.stato)
            return (
              <li key={i.id} className="space-y-1.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span><span className="font-medium text-foreground">{INTERVENTO_TIPO[i.tipo]}</span> · {i.descrizione}</span>
                  <Badge tone={aperto ? 'warning' : 'success'}>{aperto ? 'Aperto' : `Chiuso ${data(i.data_intervento)}`}</Badge>
                </div>
                {!aperto && (i.costo_manodopera || i.costo_ricambi) && <p className="text-xs text-muted-foreground">Costo {euro(Number(i.costo_manodopera ?? 0) + Number(i.costo_ricambi ?? 0))}{i.ore_fermo ? ` · fermo ${i.ore_fermo} h` : ''}{i.tecnico ? ` · ${i.tecnico}` : ''}</p>}
                {aperto && (
                  <div className="flex flex-wrap gap-1.5">
                    <Input className="h-8 w-32" value={c.tecnico} onChange={(e) => setChiusura({ ...chiusura, [i.id]: { ...c, tecnico: e.target.value } })} placeholder="Tecnico" aria-label="Tecnico" />
                    <Input className="h-8 w-28" inputMode="decimal" value={c.manodopera} onChange={(e) => setChiusura({ ...chiusura, [i.id]: { ...c, manodopera: e.target.value } })} placeholder="Manodopera €" aria-label="Costo manodopera" />
                    <Input className="h-8 w-28" inputMode="decimal" value={c.ricambi} onChange={(e) => setChiusura({ ...chiusura, [i.id]: { ...c, ricambi: e.target.value } })} placeholder="Ricambi €" aria-label="Costo ricambi" />
                    <Input className="h-8 w-24" inputMode="decimal" value={c.ore} onChange={(e) => setChiusura({ ...chiusura, [i.id]: { ...c, ore: e.target.value } })} placeholder="Ore fermo" aria-label="Ore di fermo" />
                    <BottoneScrittura size="sm" onClick={() => salvaInt.mutate({ id: i.id, values: { stato: 'chiuso', tecnico: c.tecnico || null,
                      costo_manodopera: c.manodopera ? n(c.manodopera) : null, costo_ricambi: c.ricambi ? n(c.ricambi) : null, ore_fermo: c.ore ? n(c.ore) : null } },
                      { onSuccess: () => toast.success('Intervento chiuso'), onError: (e) => toast.error(messaggioErrore(e)) })}>Chiudi</BottoneScrittura>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      <section className="border-t border-border pt-4">
        <h3 className="mb-2 text-label uppercase text-muted-foreground">Documenti</h3>
        <AllegatiSection entita="asset" entitaId={asset.id} categorie={['manuale', 'garanzia', 'contratto di assistenza', 'rapporto di intervento']} />
      </section>
    </Card>
  )
}

// ═══ SICUREZZA ══════════════════════════════════════════════════════
function Sicurezza({ modulo }: { modulo: string }) {
  const { isManager } = useAuth()
  const { data: segnalazioni = [] } = useElenco<Segnalazione>('segnalazioni_sicurezza', { filtri: { modulo }, ordine: [{ colonna: 'avvenuta_at', crescente: false }], limite: 100 })
  const salva = useSalva('segnalazioni_sicurezza', ['scadenze_moduli'])
  const [f, setF] = useState({ tipo: 'incidente', gravita: 'media', luogo: '', descrizione: '', persone: '', soccorso: false, esterno: '', azioni: '' })
  const elenco = useMemo(() => segnalazioni, [segnalazioni])
  async function invia(e: FormEvent) {
    e.preventDefault()
    if (!f.descrizione.trim()) return
    try {
      await salva.mutateAsync({ values: { modulo, tipo: f.tipo as Segnalazione['tipo'], gravita: f.gravita as Segnalazione['gravita'], luogo: f.luogo || null,
        descrizione: f.descrizione.trim(), persone_coinvolte: f.persone || null, primo_soccorso: f.soccorso, soccorso_esterno: f.esterno || null, azioni_immediate: f.azioni || null } })
      setF({ tipo: 'incidente', gravita: 'media', luogo: '', descrizione: '', persone: '', soccorso: false, esterno: '', azioni: '' })
      toast.success('Segnalazione registrata: la direzione è stata avvisata se serve')
    } catch (err) { toast.error(messaggioErrore(err)) }
  }
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><ShieldAlert className="h-4 w-4" /> Nuova segnalazione</h2>
        <form onSubmit={invia} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1.5"><Label>Tipo</Label><Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(SEGN_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Gravità</Label><Select value={f.gravita} onValueChange={(v) => setF({ ...f, gravita: v })}><SelectTrigger aria-label="Gravità"><SelectValue /></SelectTrigger>
            <SelectContent>{['bassa', 'media', 'alta', 'critica'].map((g) => <SelectItem key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="sg-l">Luogo</Label><Input id="sg-l" value={f.luogo} onChange={(e) => setF({ ...f, luogo: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="sg-p">Persone coinvolte</Label><Input id="sg-p" value={f.persone} onChange={(e) => setF({ ...f, persone: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5 sm:col-span-4"><Label htmlFor="sg-d">Cosa è successo *</Label><Textarea id="sg-d" rows={2} value={f.descrizione} onChange={(e) => setF({ ...f, descrizione: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="sg-a">Azioni immediate</Label><Input id="sg-a" value={f.azioni} onChange={(e) => setF({ ...f, azioni: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="sg-e">Soccorso esterno</Label><Input id="sg-e" value={f.esterno} onChange={(e) => setF({ ...f, esterno: e.target.value })} placeholder="118, vigili del fuoco…" /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><Switch checked={f.soccorso} onCheckedChange={(v) => setF({ ...f, soccorso: v })} /> Primo soccorso prestato</label>
          <div className="col-span-2 flex justify-end sm:col-span-4"><BottoneScrittura type="submit">Registra</BottoneScrittura></div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Le segnalazioni possono contenere dati sulla salute: le leggono solo chi le scrive, la direzione e l'amministrazione. Per un infortunio parte il promemoria della denuncia INAIL.</p>
      </Card>
      {elenco.length > 0 && (
        <Card className="divide-y divide-border">
          {elenco.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="font-mono text-xs">{s.codice}</span>
              <span className="min-w-48 flex-1"><span className="font-medium text-foreground">{SEGN_TIPO[s.tipo]}</span> · {s.descrizione}
                <span className="block text-xs text-muted-foreground">{dataOra(s.avvenuta_at)}{s.luogo ? ` · ${s.luogo}` : ''}</span></span>
              <Badge tone={s.gravita === 'critica' || s.gravita === 'alta' ? 'danger' : s.gravita === 'media' ? 'warning' : 'neutral'}>{s.gravita}</Badge>
              {isManager && s.stato !== 'chiusa' ? (
                <Button size="sm" variant="outline" onClick={() => salva.mutate({ id: s.id, values: { stato: s.stato === 'aperta' ? 'in_gestione' : 'chiusa' } })}>
                  {s.stato === 'aperta' ? 'Prendi in carico' : 'Chiudi'}</Button>
              ) : <Badge tone={s.stato === 'chiusa' ? 'success' : 'info'}>{s.stato === 'chiusa' ? 'Chiusa' : s.stato === 'in_gestione' ? 'In gestione' : 'Aperta'}</Badge>}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
