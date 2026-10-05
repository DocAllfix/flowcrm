/**
 * MescitaPage — bottiglie e fusti aperti (documento Bar §29).
 * Le vendite scaricano già la dose teorica; qui il banco registra la
 * bottiglia in uso e, quando la chiude, quanto è rimasto davvero. La
 * differenza tra consumo reale e teorico è lo sfrido: va a magazzino e,
 * sopra la soglia del locale, è un consumo anomalo segnalato alla direzione.
 */
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Martini, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
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
import { useElenco, useRpc, useInserisci, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale, SelettoreLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { fmtEuro, fmtGiornoOra, fmtNumero, oggiIso } from '@/modules/fb/stati'

type Mescita = Database['public']['Views']['bar_mescite_stato']['Row']
type Articolo = Pick<Tables<'mag_articoli'>, 'id' | 'descrizione' | 'unita_misura' | 'categoria'>
type Lotto = Database['public']['Views']['mag_lotti_stato']['Row']
interface RigaAnalisi {
  articolo_id: string; articolo: string; unita_misura: string; contenitori: number; quantita_iniziale: number
  erogato_teorico: number; consumo_reale: number; sfrido: number; sfrido_pct: number | null; anomalie: number; costo_sfrido: number
}
interface EsitoChiusura { erogato_teorico: number; consumo_reale: number; sfrido: number; sfrido_pct: number; anomalia: boolean; sfrido_registrato: boolean }

const CONTENITORE: Record<string, string> = { bottiglia: 'Bottiglia', fusto: 'Fusto', brick: 'Brick', altro: 'Altro' }
const TABELLE = ['bar_mescite', 'bar_mescite_stato', 'mag_giacenze', 'mag_movimenti']
const n = (s: string) => Number(s.replace(',', '.'))

export function MescitaPage() {
  return <ConLocale><Mescita_ /></ConLocale>
}

function Mescita_() {
  const { localeId, locale } = useFb()
  const { isManager } = useAuth()
  const [scheda, setScheda] = useState('aperte')
  const { data: mescite = [], isLoading } = useElenco<Mescita>('bar_mescite_stato', {
    filtri: { locale_id: localeId ?? undefined }, ordine: [{ colonna: 'aperta_at', crescente: false }], limite: 300,
    abilitato: !!localeId, intervallo: 60_000,
  })
  const aperte = mescite.filter((m) => m.aperta)
  const chiuse = mescite.filter((m) => !m.aperta)
  const anomale = chiuse.filter((m) => m.anomalia).length
  const costoSfrido = chiuse.reduce((s, m) => s + Number(m.costo_sfrido ?? 0), 0)
  const soglia = Number(locale?.soglia_sfrido_pct ?? 5)

  return (
    <div>
      <PageHeader title="Mescita" description="Bottiglie e fusti in uso: quanto è uscito secondo le vendite e quanto è uscito davvero."
        numeri={[
          { etichetta: 'in uso', valore: aperte.length, inCaricamento: isLoading },
          { etichetta: 'chiuse', valore: chiuse.length, inCaricamento: isLoading },
          { etichetta: 'consumi anomali', valore: anomale, inCaricamento: isLoading },
          ...(isManager ? [{ etichetta: 'sfrido', valore: fmtEuro(costoSfrido), inCaricamento: isLoading }] : []),
        ]}
        actions={<SelettoreLocale />} />

      <Tabs value={scheda} onValueChange={setScheda}>
        <TabsList className="mb-4">
          <TabsTrigger value="aperte">In uso</TabsTrigger>
          <TabsTrigger value="storico">Chiuse</TabsTrigger>
          {isManager && <TabsTrigger value="analisi">Teorico e reale</TabsTrigger>}
        </TabsList>

        <TabsContent value="aperte" className="space-y-4">
          <ApriMescita />
          {isLoading ? <Card className="h-32 animate-pulse bg-muted/40" aria-hidden /> : aperte.length === 0 ? (
            <EmptyState icon={Martini} title="Nessuna bottiglia in uso"
              description="Quando apri una bottiglia o attacchi un fusto, registralo: alla chiusura si vede subito se il consumo torna."
              action={<Button variant="outline" onClick={() => document.getElementById('ms-articolo')?.focus()}><Plus className="h-4 w-4" /> Apri la prima</Button>} />
          ) : (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {aperte.map((m) => <li key={m.id}><MescitaAperta m={m} soglia={soglia} /></li>)}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="storico">
          {chiuse.length === 0 ? (
            <EmptyState icon={Martini} title="Ancora nessuna chiusura" description="Le bottiglie chiuse compaiono qui con consumo teorico, reale e sfrido."
              action={<Button variant="outline" onClick={() => setScheda('aperte')}>Vai alle bottiglie in uso</Button>} />
          ) : (
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Prodotto</TableHead><TableHead>Aperta</TableHead><TableHead>Chiusa</TableHead>
                  <TableHead className="text-right">Iniziale</TableHead><TableHead className="text-right">Teorico</TableHead>
                  <TableHead className="text-right">Reale</TableHead><TableHead className="text-right">Sfrido</TableHead><TableHead>Esito</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {chiuse.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell><span className="font-medium text-foreground">{m.articolo}</span>
                        <span className="block text-xs text-muted-foreground">{CONTENITORE[m.contenitore ?? ''] ?? m.contenitore}{m.codice_lotto ? ` · lotto ${m.codice_lotto}` : ''}</span></TableCell>
                      <TableCell className="text-muted-foreground">{fmtGiornoOra(m.aperta_at)}</TableCell>
                      <TableCell className="text-muted-foreground">{fmtGiornoOra(m.chiusa_at)}</TableCell>
                      <TableCell numerica>{fmtNumero(m.quantita_iniziale, 2)} {m.unita_misura}</TableCell>
                      <TableCell numerica>{fmtNumero(m.erogato, 2)}</TableCell>
                      <TableCell numerica>{fmtNumero(Number(m.quantita_iniziale) - Number(m.quantita_residua ?? 0), 2)}</TableCell>
                      <TableCell numerica className={m.anomalia ? 'font-semibold text-destructive-testo' : undefined}>
                        {fmtNumero(m.sfrido, 2)} ({fmtNumero(m.sfrido_pct, 1)}%)</TableCell>
                      <TableCell>{m.anomalia
                        ? <Badge tone="danger"><AlertTriangle className="mr-1 h-3 w-3" />Anomalo</Badge>
                        : <Badge tone="success">Nella norma</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {isManager && <TabsContent value="analisi"><AnalisiMescita /></TabsContent>}
      </Tabs>
    </div>
  )
}

function ApriMescita() {
  const { localeId, modulo } = useFb()
  const { data: articoli = [] } = useElenco<Articolo>('mag_articoli', {
    filtri: { modulo: ['fb', modulo], attivo: true }, select: 'id, descrizione, unita_misura, categoria', ordine: [{ colonna: 'descrizione' }], limite: 1000,
  })
  const [f, setF] = useState({ articolo: '', lotto: '', contenitore: 'bottiglia', quantita: '' })
  const { data: lotti = [] } = useElenco<Lotto>('mag_lotti_stato', { filtri: { articolo_id: f.articolo || undefined }, abilitato: !!f.articolo })
  const apri = useInserisci('bar_mescite', TABELLE)
  const articolo = articoli.find((a) => a.id === f.articolo)

  function invia(e: FormEvent) {
    e.preventDefault()
    if (!localeId || !f.articolo || !(n(f.quantita) > 0)) { toast.error('Scegli il prodotto e scrivi quanto contiene'); return }
    apri.mutate({ locale_id: localeId, articolo_id: f.articolo, lotto_id: f.lotto || null, contenitore: f.contenitore, quantita_iniziale: n(f.quantita) }, {
      onSuccess: () => { toast.success(`${articolo?.descrizione ?? 'Bottiglia'} in uso`); setF({ articolo: '', lotto: '', contenitore: f.contenitore, quantita: '' }) },
      onError: (err) => toast.error(/23P01|bar_mescite_una_aperta/.test(JSON.stringify(err)) ? 'C\'è già una bottiglia aperta di questo prodotto: chiudila prima' : messaggioErrore(err)),
    })
  }

  return (
    <Card className="p-4">
      <form onSubmit={invia} className="flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1 space-y-1.5"><Label>Prodotto</Label>
          <Select value={f.articolo} onValueChange={(v) => setF({ ...f, articolo: v, lotto: '' })}>
            <SelectTrigger id="ms-articolo" aria-label="Prodotto a mescita"><SelectValue placeholder="Gin, vino, fusto di birra…" /></SelectTrigger>
            <SelectContent>{articoli.map((a) => <SelectItem key={a.id} value={a.id}>{a.descrizione} ({a.unita_misura})</SelectItem>)}</SelectContent>
          </Select></div>
        {lotti.filter((l) => Number(l.residuo) > 0).length > 0 && (
          <div className="w-44 space-y-1.5"><Label>Lotto</Label>
            <Select value={f.lotto} onValueChange={(v) => setF({ ...f, lotto: v })}>
              <SelectTrigger aria-label="Lotto"><SelectValue placeholder="Facoltativo" /></SelectTrigger>
              <SelectContent>{lotti.filter((l) => Number(l.residuo) > 0).map((l) => <SelectItem key={l.lotto_id!} value={l.lotto_id!}>{l.codice_lotto ?? 'Senza codice'}</SelectItem>)}</SelectContent>
            </Select></div>
        )}
        <div className="w-36 space-y-1.5"><Label>Contenitore</Label>
          <Select value={f.contenitore} onValueChange={(v) => setF({ ...f, contenitore: v })}>
            <SelectTrigger aria-label="Contenitore"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(CONTENITORE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="w-36 space-y-1.5"><Label htmlFor="ms-q">Contiene{articolo ? ` (${articolo.unita_misura})` : ''}</Label>
          <Input id="ms-q" inputMode="decimal" value={f.quantita} onChange={(e) => setF({ ...f, quantita: e.target.value })} placeholder="0,7" /></div>
        <BottoneScrittura type="submit" disabled={apri.isPending}><Plus className="h-4 w-4" /> Apri</BottoneScrittura>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">La quantità è nell'unità dell'articolo di magazzino (la stessa delle ricette). Una sola bottiglia aperta per prodotto.</p>
    </Card>
  )
}

function MescitaAperta({ m, soglia }: { m: Mescita; soglia: number }) {
  const chiudi = useAzione('bar_chiudi_mescita', TABELLE)
  const [residuo, setResiduo] = useState('')
  const iniziale = Number(m.quantita_iniziale)
  const erogato = Number(m.erogato ?? 0)
  const pct = Math.min(100, Math.round((erogato / iniziale) * 100))
  const oltre = erogato > iniziale

  function conferma(valore: string) {
    const r = n(valore)
    if (valore.trim() === '' || !(r >= 0) || r > iniziale) { toast.error(`Il residuo va da 0 a ${fmtNumero(iniziale, 2)}`); return }
    chiudi.mutate({ p_mescita: m.id!, p_residuo: r }, {
      onSuccess: (d) => {
        const e = d as unknown as EsitoChiusura
        if (e.anomalia) toast.warning(`Consumo anomalo: reale ${fmtNumero(e.consumo_reale, 2)}, teorico ${fmtNumero(e.erogato_teorico, 2)} (${fmtNumero(e.sfrido_pct, 1)}%). La direzione è avvisata.`)
        else toast.success(`Chiusa: sfrido ${fmtNumero(e.sfrido, 2)} ${m.unita_misura} (${fmtNumero(e.sfrido_pct, 1)}%), nella norma`)
        setResiduo('')
      },
      onError: (err) => toast.error(messaggioErrore(err)),
    })
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{m.articolo}</p>
          <p className="text-xs text-muted-foreground">{CONTENITORE[m.contenitore ?? ''] ?? m.contenitore} da {fmtNumero(iniziale, 2)} {m.unita_misura} · aperta {fmtGiornoOra(m.aperta_at)}{m.codice_lotto ? ` · lotto ${m.codice_lotto}` : ''}</p>
        </div>
        {oltre && <Badge tone="warning">Vendute più dosi del contenuto</Badge>}
      </div>
      <div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
          aria-label={`Erogato secondo le vendite: ${pct}%`}>
          <div className={oltre ? 'h-full bg-warning' : 'h-full bg-primary'} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 flex justify-between text-sm tabular-nums">
          <span className="text-muted-foreground">Uscito secondo le vendite: <span className="text-foreground">{fmtNumero(erogato, 2)} {m.unita_misura}</span></span>
          <span className="text-muted-foreground">Dovrebbe restare: <span className="text-foreground">{fmtNumero(m.residuo_teorico, 2)}</span></span>
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <div className="w-40 space-y-1.5"><Label htmlFor={`ms-r-${m.id}`}>Rimasto davvero ({m.unita_misura})</Label>
          <Input id={`ms-r-${m.id}`} inputMode="decimal" value={residuo} onChange={(e) => setResiduo(e.target.value)} placeholder="0" /></div>
        <BottoneScrittura variant="outline" disabled={chiudi.isPending} onClick={() => conferma(residuo)}>Chiudi</BottoneScrittura>
        <BottoneScrittura variant="ghost" disabled={chiudi.isPending} onClick={() => conferma('0')}>Finita</BottoneScrittura>
      </div>
      <p className="text-xs text-muted-foreground">Oltre il {fmtNumero(soglia, 0)}% di differenza il consumo è segnalato come anomalo.</p>
    </Card>
  )
}

function AnalisiMescita() {
  const { localeId } = useFb()
  const [dal, setDal] = useState(() => { const d = new Date(); d.setDate(1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` })
  const [al, setAl] = useState(oggiIso)
  const { data: righe = [], isLoading } = useRpc<RigaAnalisi[]>('bar_mescita_analisi', { p_locale: localeId, p_dal: dal, p_al: al }, { abilitato: !!localeId })
  const totale = useMemo(() => righe.reduce((s, r) => s + Number(r.costo_sfrido ?? 0), 0), [righe])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5"><Label htmlFor="am-dal">Dal</Label><Input id="am-dal" type="date" value={dal} onChange={(e) => setDal(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="am-al">Al</Label><Input id="am-al" type="date" value={al} onChange={(e) => setAl(e.target.value)} /></div>
        <p className="ml-auto text-sm text-muted-foreground">Sfrido del periodo: <span className="font-semibold tabular-nums text-foreground">{fmtEuro(totale)}</span></p>
      </div>
      {isLoading ? <Card className="h-40 animate-pulse bg-muted/40" aria-hidden /> : righe.length === 0 ? (
        <EmptyState icon={Martini} filtrato title="Nessuna bottiglia chiusa nel periodo" description="Allarga il periodo." />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Prodotto</TableHead><TableHead className="text-right">Contenitori</TableHead><TableHead className="text-right">Teorico</TableHead>
              <TableHead className="text-right">Reale</TableHead><TableHead className="text-right">Sfrido</TableHead><TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Anomalie</TableHead><TableHead className="text-right">Costo</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {righe.map((r) => (
                <TableRow key={r.articolo_id}>
                  <TableCell className="font-medium text-foreground">{r.articolo}</TableCell>
                  <TableCell numerica>{r.contenitori}</TableCell>
                  <TableCell numerica>{fmtNumero(r.erogato_teorico, 2)} {r.unita_misura}</TableCell>
                  <TableCell numerica>{fmtNumero(r.consumo_reale, 2)}</TableCell>
                  <TableCell numerica>{fmtNumero(r.sfrido, 2)}</TableCell>
                  <TableCell numerica className={r.anomalie > 0 ? 'font-semibold text-destructive-testo' : undefined}>{fmtNumero(r.sfrido_pct, 1)}%</TableCell>
                  <TableCell numerica>{r.anomalie}</TableCell>
                  <TableCell numerica>{fmtEuro(r.costo_sfrido)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
