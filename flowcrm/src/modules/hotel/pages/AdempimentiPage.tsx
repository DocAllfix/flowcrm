/**
 * Adempimenti (documento Hotel §33–34): schedine per Alloggiati Web con il
 * controllo dei dati mancanti e il file da caricare (l'invio diretto è
 * predisposto), movimento ISTAT per provenienza, tassa di soggiorno con le
 * regole del Comune e il rendiconto del periodo.
 */
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Download, FileCheck, Landmark } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { supabase, type Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useRpc, useInserisci, useElimina, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { TIPO_ALLOGGIATO, fmtData, fmtEuro, oggiIso, piuGiorni } from '@/modules/hotel/stati'

type Controllo = Database['public']['Functions']['hotel_alloggiati_controllo']['Returns'][number]
type Istat = Database['public']['Functions']['hotel_istat_movimento']['Returns'][number]
type Rendiconto = Database['public']['Functions']['hotel_tassa_rendiconto']['Returns'][number]

export function AdempimentiPage() {
  return <ConStruttura><Adempimenti_ /></ConStruttura>
}

function Adempimenti_() {
  return (
    <div>
      <PageHeader title="Adempimenti" description="Schedine per la Questura, movimento ISTAT, tassa di soggiorno e archivio dei documenti della struttura." actions={<SelettoreStruttura />} />
      <Tabs defaultValue="alloggiati">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="alloggiati">Alloggiati Web</TabsTrigger><TabsTrigger value="istat">Movimento ISTAT</TabsTrigger>
          <TabsTrigger value="tassa">Tassa di soggiorno</TabsTrigger><TabsTrigger value="archivio">Archivio documenti</TabsTrigger>
        </TabsList>
        <TabsContent value="alloggiati"><Alloggiati /></TabsContent>
        <TabsContent value="istat"><IstatMovimento /></TabsContent>
        <TabsContent value="tassa"><Tassa /></TabsContent>
        <TabsContent value="archivio"><Archivio /></TabsContent>
      </Tabs>
    </div>
  )
}

function Alloggiati() {
  const { strutturaId, struttura } = useHotel()
  const [giorno, setGiorno] = useState(oggiIso())
  const { data: righe = [], isLoading } = useRpc<Controllo[]>('hotel_alloggiati_controllo', { p_struttura: strutturaId, p_giorno: giorno }, { abilitato: !!strutturaId })
  const segna = useAzione('hotel_alloggiati_segna_inviati', ['hotel_soggiorno_ospiti'])
  const incompleti = righe.filter((r) => (r.mancanti ?? []).length > 0)

  async function scarica() {
    const { data, error } = await supabase.rpc('hotel_alloggiati_file', { p_struttura: strutturaId!, p_giorno: giorno })
    if (error) { toast.error(messaggioErrore(error)); return }
    if (!data) { toast.info('Nessun ospite arrivato in quel giorno'); return }
    const url = URL.createObjectURL(new Blob([data], { type: 'text/plain;charset=windows-1252' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `alloggiati_${struttura?.codice_alloggiati ?? 'struttura'}_${giorno}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('File pronto da caricare su Alloggiati Web')
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label htmlFor="al-g">Arrivi del</Label><Input id="al-g" type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} className="w-40" /></div>
        <p className="max-w-[60ch] text-sm text-muted-foreground">Un record di 168 caratteri per ospite, capofamiglia o capogruppo prima dei familiari. Le schedine vanno inviate entro 24 ore dall'arrivo.</p>
        <div className="ml-auto flex gap-2">
          <BottoneScrittura variant="outline" onClick={scarica} disabled={!righe.length}><Download className="h-4 w-4" /> Scarica il file</BottoneScrittura>
          <BottoneScrittura disabled={!righe.length || incompleti.length > 0 || segna.isPending}
            onClick={() => segna.mutate({ p_struttura: strutturaId!, p_giorno: giorno }, {
              onSuccess: (n) => toast.success(`${n} schedine segnate come inviate`), onError: (e) => toast.error(messaggioErrore(e)) })}>
            <FileCheck className="h-4 w-4" /> Segna come inviate</BottoneScrittura>
        </div>
      </Card>
      {isLoading ? <Skeleton className="h-40" /> : righe.length === 0 ? (
        <EmptyState compatto icon={FileCheck} filtrato title="Nessun ospite arrivato" description="Scegli un altro giorno." />
      ) : (
        <Card className="overflow-x-auto">
          {incompleti.length > 0 && <p className="border-b border-border bg-warning-tenue px-4 py-2 text-sm text-foreground">{incompleti.length} ospiti con dati mancanti: completali dalla scheda del soggiorno.</p>}
          <Table>
            <TableHeader><TableRow><TableHead>Prenotazione</TableHead><TableHead>Ospite</TableHead><TableHead>Tipo</TableHead><TableHead>Dati</TableHead></TableRow></TableHeader>
            <TableBody>{righe.map((r) => (
              <TableRow key={r.soggiorno_ospite_id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.prenotazione}</TableCell>
                <TableCell className="text-foreground">{r.ospite}</TableCell>
                <TableCell className="text-muted-foreground">{TIPO_ALLOGGIATO[r.tipo_alloggiato ?? '16']}</TableCell>
                <TableCell>{(r.mancanti ?? []).length ? <span className="text-sm text-warning-testo">Manca: {r.mancanti!.join(', ')}</span> : <Badge tone="success">Completi</Badge>}</TableCell>
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function IstatMovimento() {
  const { strutturaId } = useHotel()
  const [giorno, setGiorno] = useState(piuGiorni(oggiIso(), -1))
  const { data: righe = [], isLoading } = useRpc<Istat[]>('hotel_istat_movimento', { p_struttura: strutturaId, p_giorno: giorno }, { abilitato: !!strutturaId })
  const tot = (k: 'arrivi' | 'partenze' | 'presenze') => righe.reduce((s, r) => s + Number(r[k] ?? 0), 0)
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label htmlFor="is-g">Giorno</Label><Input id="is-g" type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} className="w-40" /></div>
        <p className="text-sm text-muted-foreground">Arrivi, partenze e presenze per provenienza (residenza), come chiede il modello del movimento dei clienti. L'invio al portale regionale è predisposto.</p>
      </Card>
      {isLoading ? <Skeleton className="h-40" /> : righe.length === 0 ? (
        <EmptyState compatto icon={Landmark} filtrato title="Nessun movimento" description="Scegli un altro giorno." />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Provenienza</TableHead><TableHead className="text-right">Arrivi</TableHead><TableHead className="text-right">Partenze</TableHead><TableHead className="text-right">Presenze</TableHead></TableRow></TableHeader>
            <TableBody>
              {righe.map((r) => (
                <TableRow key={`${r.provenienza}-${r.italiano}`}>
                  <TableCell className="text-foreground">{r.provenienza}<span className="ml-2 text-xs text-muted-foreground">{r.italiano ? 'Italia' : 'Estero'}</span></TableCell>
                  <TableCell numerica>{r.arrivi}</TableCell><TableCell numerica>{r.partenze}</TableCell><TableCell numerica>{r.presenze}</TableCell>
                </TableRow>
              ))}
              <TableRow><TableCell className="font-semibold text-foreground">Totale</TableCell><TableCell numerica className="font-semibold">{tot('arrivi')}</TableCell>
                <TableCell numerica className="font-semibold">{tot('partenze')}</TableCell><TableCell numerica className="font-semibold">{tot('presenze')}</TableCell></TableRow>
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Tassa() {
  const { strutturaId, struttura } = useHotel()
  const { isManager } = useAuth()
  const { data: regole = [] } = useElenco<Tables<'hotel_tassa_regole'>>('hotel_tassa_regole', { filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'dal' }], abilitato: !!strutturaId })
  const salva = useInserisci('hotel_tassa_regole', ['hotel_tassa_regole', 'fond-rpc'])
  const elimina = useElimina('hotel_tassa_regole', ['fond-rpc'])
  const [dal, setDal] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` })
  const [al, setAl] = useState(oggiIso())
  const { data: rendiconto = [], isLoading } = useRpc<Rendiconto[]>('hotel_tassa_rendiconto', { p_struttura: strutturaId, p_dal: dal, p_al: al }, { abilitato: !!strutturaId })
  const [f, setF] = useState({ comune: struttura?.comune ?? '', importo: '', notti: '', eta: '', ridDa: '', ridA: '', ridPct: '', esenzioni: '', dal: '', al: '' })
  const somma = (k: 'dovuto' | 'riscosso' | 'notti_tassabili') => rendiconto.reduce((s, r) => s + Number(r[k] ?? 0), 0)

  function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.comune.trim() || !(Number(f.importo.replace(',', '.')) >= 0) || !f.importo) { toast.error('Comune e importo a notte'); return }
    salva.mutate({ struttura_id: strutturaId!, comune: f.comune.trim(), importo_notte: Number(f.importo.replace(',', '.')),
      notti_max: f.notti ? Number(f.notti) : null, eta_esenzione_sotto: f.eta ? Number(f.eta) : null,
      riduzioni: f.ridPct ? [{ eta_da: Number(f.ridDa) || 0, eta_a: Number(f.ridA) || 120, pct: Number(f.ridPct) }] : [],
      esenzioni: f.esenzioni.split(',').map((x) => x.trim()).filter(Boolean), dal: f.dal || null, al: f.al || null }, {
      onSuccess: () => { toast.success('Regola della tassa salvata'); setF({ ...f, importo: '' }) }, onError: (err) => toast.error(messaggioErrore(err)) })
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-2 text-title text-foreground">Regole del Comune</h3>
        {regole.length === 0 ? <p className="mb-3 text-sm text-muted-foreground">Nessuna regola: senza, la tassa non si calcola.</p> : (
          <ul className="mb-3 divide-y divide-border text-sm">{regole.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-foreground">{r.comune}: {fmtEuro(r.importo_notte)} a notte{r.notti_max ? `, al massimo ${r.notti_max} notti` : ''}
                {r.eta_esenzione_sotto != null ? `, esenti sotto i ${r.eta_esenzione_sotto} anni` : ''}
                {(r.riduzioni as { eta_da: number; eta_a: number; pct: number }[]).map((x) => `, −${x.pct}% dai ${x.eta_da} ai ${x.eta_a} anni`).join('')}
                {r.dal || r.al ? ` · dal ${fmtData(r.dal)} al ${fmtData(r.al)}` : ''}
                {r.esenzioni.length ? <span className="block text-xs text-muted-foreground">Esenzioni: {r.esenzioni.join(', ')}</span> : null}</span>
              {isManager && <Button size="sm" variant="ghost" onClick={() => elimina.mutate(r.id, { onError: (e) => toast.error(messaggioErrore(e)) })}>Togli</Button>}
            </li>))}</ul>
        )}
        {isManager && (
          <form onSubmit={crea} className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-5">
            <div className="space-y-1.5"><Label htmlFor="tx-c">Comune</Label><Input id="tx-c" value={f.comune} onChange={(e) => setF({ ...f, comune: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tx-i">€ a notte a persona</Label><Input id="tx-i" inputMode="decimal" value={f.importo} onChange={(e) => setF({ ...f, importo: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tx-n">Notti massime</Label><Input id="tx-n" type="number" value={f.notti} onChange={(e) => setF({ ...f, notti: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tx-e">Esenti sotto i (anni)</Label><Input id="tx-e" type="number" value={f.eta} onChange={(e) => setF({ ...f, eta: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tx-rp">Riduzione %</Label><Input id="tx-rp" type="number" value={f.ridPct} onChange={(e) => setF({ ...f, ridPct: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tx-rd">dai (anni)</Label><Input id="tx-rd" type="number" value={f.ridDa} onChange={(e) => setF({ ...f, ridDa: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tx-ra">ai (anni)</Label><Input id="tx-ra" type="number" value={f.ridA} onChange={(e) => setF({ ...f, ridA: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tx-d">Stagione dal</Label><Input id="tx-d" type="date" value={f.dal} onChange={(e) => setF({ ...f, dal: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tx-a">al</Label><Input id="tx-a" type="date" value={f.al} onChange={(e) => setF({ ...f, al: e.target.value })} /></div>
            <div className="col-span-2 space-y-1.5 sm:col-span-4"><Label htmlFor="tx-es">Esenzioni del regolamento (separate da virgola)</Label>
              <Input id="tx-es" value={f.esenzioni} onChange={(e) => setF({ ...f, esenzioni: e.target.value })} placeholder="residenti, autisti di pullman, accompagnatori di degenti" /></div>
            <div className="flex items-end justify-end"><BottoneScrittura type="submit" variant="outline">Aggiungi</BottoneScrittura></div>
          </form>
        )}
      </Card>
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label htmlFor="tr-dal">Rendiconto dal</Label><Input id="tr-dal" type="date" value={dal} onChange={(e) => setDal(e.target.value)} className="w-40" /></div>
        <div className="space-y-1.5"><Label htmlFor="tr-al">al</Label><Input id="tr-al" type="date" value={al} onChange={(e) => setAl(e.target.value)} className="w-40" /></div>
        <p className="ml-auto text-sm text-muted-foreground">Notti tassabili <span className="tabular-nums text-foreground">{somma('notti_tassabili')}</span> · dovuto <span className="tabular-nums text-foreground">{fmtEuro(somma('dovuto'))}</span> · riscosso <span className="tabular-nums text-foreground">{fmtEuro(somma('riscosso'))}</span></p>
      </Card>
      {isLoading ? <Skeleton className="h-40" /> : rendiconto.length === 0 ? (
        <EmptyState compatto icon={Landmark} filtrato title="Nessuna partenza nel periodo" description="Il rendiconto conta i soggiorni conclusi." />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Soggiorno</TableHead><TableHead>Periodo</TableHead><TableHead className="text-right">Ospiti</TableHead><TableHead className="text-right">Notti tassabili</TableHead>
              <TableHead className="text-right">Dovuto</TableHead><TableHead className="text-right">Riscosso</TableHead><TableHead>Esenzioni</TableHead></TableRow></TableHeader>
            <TableBody>{rendiconto.map((r) => (
              <TableRow key={r.prenotazione_id}>
                <TableCell><span className="text-foreground">{r.ospite}</span><span className="block font-mono text-xs text-muted-foreground">{r.codice}</span></TableCell>
                <TableCell className="text-muted-foreground">{fmtData(r.arrivo)} → {fmtData(r.partenza)}</TableCell>
                <TableCell numerica>{r.ospiti}</TableCell><TableCell numerica>{r.notti_tassabili}</TableCell>
                <TableCell numerica>{fmtEuro(r.dovuto)}</TableCell>
                <TableCell numerica className={Number(r.riscosso) + 0.005 < Number(r.dovuto) ? 'font-semibold text-warning-testo' : undefined}>{fmtEuro(r.riscosso)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.esenzioni ?? '—'}</TableCell>
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

/** Archivio della struttura (§43): contratti, certificazioni, impianti, procedure. Le
 *  prenotazioni e i guasti hanno i loro documenti nella propria scheda. */
function Archivio() {
  const { strutturaId } = useHotel()
  if (!strutturaId) return null
  return (
    <Card className="p-5">
      <AllegatiSection entita="hotel_strutture" entitaId={strutturaId}
        categorie={['contratti', 'contratti fornitori', 'certificazioni', 'documentazione impianti', 'procedure', 'registrazioni', 'documenti amministrativi']} />
    </Card>
  )
}
