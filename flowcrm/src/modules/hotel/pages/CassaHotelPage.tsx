/**
 * Cassa dell'hotel (documento Hotel §16, §31–32): conti camera con divisioni,
 * pagamenti misti, caparre e rimborsi; fattura a un'azienda, a un gruppo o a
 * un tour operator da uno o più conti chiusi (anche con più aliquote); conti
 * ancora da incassare.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { FileText, Undo2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { CassaSezione, type EstensioneConto } from '@/components/condivisi/CassaSezione'
import { useAuth } from '@/hooks/useAuth'
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useAzione, useInserisci, messaggioErrore } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { fmtData, fmtEuro, piuGiorni, oggiIso } from '@/modules/hotel/stati'

type Saldo = Database['public']['Views']['conti_saldi']['Row']
type Insoluto = Database['public']['Views']['hotel_insoluti']['Row']
type Metodo = Database['public']['Enums']['pagamento_metodo']

export function CassaHotelPage() {
  return <ConStruttura><Cassa_ /></ConStruttura>
}

/** Rimborso dell'eccedenza (caparra più alta del conto). */
const Rimborso: EstensioneConto = ({ conto, residuo }) => <RimborsoConto conto={conto} residuo={residuo} />

function RimborsoConto({ conto, residuo }: { conto: Tables<'conti'>; residuo: number }) {
  const rimborsa = useInserisci('conti_rimborsi', ['conti', 'conti_saldi', 'conti_rimborsi'])
  const [metodo, setMetodo] = useState<Metodo>('bonifico')
  if (residuo >= -0.005) return null
  return (
    <div className="border-t border-border pt-4">
      <h3 className="mb-1 flex items-center gap-2 text-title text-foreground"><Undo2 className="h-4 w-4" /> Da restituire</h3>
      <p className="mb-2 text-sm text-muted-foreground">L'ospite ha versato {fmtEuro(-residuo)} più del conto.</p>
      <div className="flex gap-2">
        <Select value={metodo} onValueChange={(v) => setMetodo(v as Metodo)}>
          <SelectTrigger aria-label="Metodo del rimborso"><SelectValue /></SelectTrigger>
          <SelectContent>{[['bonifico', 'Bonifico'], ['contanti', 'Contanti'], ['carta', 'Carta'], ['pos', 'POS']].map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <BottoneScrittura variant="outline" disabled={rimborsa.isPending}
          onClick={() => rimborsa.mutate({ conto_id: conto.id, modulo: 'hotel', importo: Math.round(-residuo * 100) / 100, metodo, motivo: 'Eccedenza della caparra' }, {
            onSuccess: () => toast.success(`${fmtEuro(-residuo)} restituiti: ora il conto si chiude`), onError: (e) => toast.error(messaggioErrore(e)) })}>
          Restituisci</BottoneScrittura>
      </div>
    </div>
  )
}

function Cassa_() {
  const { isManager } = useAuth()
  return (
    <div>
      <PageHeader title="Cassa" description="Conti camera, caparre, divisioni e pagamenti; fatture alle aziende e conti da incassare." actions={<SelettoreStruttura />} />
      <Tabs defaultValue="conti">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="conti">Conti</TabsTrigger>
          {isManager && <TabsTrigger value="fatture">Fatture ad aziende e gruppi</TabsTrigger>}
          <TabsTrigger value="insoluti">Da incassare</TabsTrigger>
        </TabsList>
        <TabsContent value="conti"><CassaSezione modulo="hotel" estensione={Rimborso} /></TabsContent>
        {isManager && <TabsContent value="fatture"><Fatture /></TabsContent>}
        <TabsContent value="insoluti"><Insoluti /></TabsContent>
      </Tabs>
    </div>
  )
}

function Fatture() {
  const { data: aziende = [] } = useElenco<Pick<Tables<'organizzazioni'>, 'id' | 'ragione_sociale'>>('organizzazioni', {
    filtri: { attivo: true }, select: 'id, ragione_sociale', ordine: [{ colonna: 'ragione_sociale' }], limite: 1000 })
  const [azienda, setAzienda] = useState('')
  const [dal, setDal] = useState(piuGiorni(oggiIso(), -31))
  const { data: conti = [] } = useElenco<Tables<'conti'>>('conti', {
    filtri: { modulo: 'hotel', stato: 'chiuso', fattura_id: null, organizzazione_id: azienda || undefined },
    tra: { colonna: 'chiuso_at', da: `${dal}T00:00:00` }, ordine: [{ colonna: 'chiuso_at' }], limite: 500, abilitato: !!azienda,
  })
  const ids = conti.map((c) => c.id)
  const { data: saldi = [] } = useElenco<Saldo>('conti_saldi', { filtri: { conto_id: ids }, abilitato: ids.length > 0 })
  const fattura = useAzione('hotel_fattura_conti', ['conti', 'fatture'])
  const [scelti, setScelti] = useState<string[]>([])
  const [numero, setNumero] = useState('')
  const totale = scelti.reduce((s, id) => s + Number(saldi.find((x) => x.conto_id === id)?.totale ?? 0), 0)
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="w-72 space-y-1.5"><Label>Azienda, gruppo o tour operator</Label>
          <Select value={azienda} onValueChange={(v) => { setAzienda(v); setScelti([]) }}><SelectTrigger aria-label="Intestatario"><SelectValue placeholder="Scegli…" /></SelectTrigger>
            <SelectContent>{aziende.map((a) => <SelectItem key={a.id} value={a.id}>{a.ragione_sociale}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="ft-dal">Conti chiusi dal</Label><Input id="ft-dal" type="date" value={dal} onChange={(e) => setDal(e.target.value)} className="w-40" /></div>
        <p className="max-w-[50ch] text-sm text-muted-foreground">Conti chiusi con il pagamento «conto aziendale» o intestati all'azienda: una sola fattura, con il dettaglio per aliquota.</p>
      </Card>
      {!azienda ? null : conti.length === 0 ? (
        <EmptyState compatto icon={FileText} filtrato title="Nessun conto da fatturare" description="Nessun conto chiuso e non fatturato per questo intestatario nel periodo." />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="w-10" /><TableHead>Conto</TableHead><TableHead>Chiuso</TableHead><TableHead className="text-right">Totale</TableHead></TableRow></TableHeader>
            <TableBody>{conti.map((c) => (
              <TableRow key={c.id}>
                <TableCell><Checkbox checked={scelti.includes(c.id)} aria-label={`Fattura ${c.codice}`}
                  onCheckedChange={(v) => setScelti(v ? [...scelti, c.id] : scelti.filter((x) => x !== c.id))} /></TableCell>
                <TableCell><span className="text-foreground">{c.descrizione}</span><span className="block font-mono text-xs text-muted-foreground">{c.codice}</span></TableCell>
                <TableCell className="text-muted-foreground">{fmtData(c.chiuso_at)}</TableCell>
                <TableCell numerica>{fmtEuro(saldi.find((x) => x.conto_id === c.id)?.totale)}</TableCell>
              </TableRow>))}</TableBody>
          </Table>
          <div className="flex flex-wrap items-end justify-end gap-3 border-t border-border p-4">
            <p className="mr-auto text-sm text-muted-foreground">{scelti.length} conti · <span className="tabular-nums text-foreground">{fmtEuro(totale)}</span></p>
            <div className="space-y-1.5"><Label htmlFor="ft-n">N. fattura</Label><Input id="ft-n" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-36" /></div>
            <BottoneScrittura disabled={!scelti.length || !numero.trim() || fattura.isPending}
              onClick={() => fattura.mutate({ p_conti: scelti, p_organizzazione: azienda, p_numero: numero.trim() }, {
                onSuccess: () => { toast.success('Fattura emessa nel modulo amministrativo'); setScelti([]); setNumero('') }, onError: (e) => toast.error(messaggioErrore(e)) })}>
              <FileText className="h-4 w-4" /> Emetti la fattura</BottoneScrittura>
          </div>
        </Card>
      )}
    </div>
  )
}

function Insoluti() {
  const { strutturaId } = useHotel()
  const { data: insoluti = [] } = useElenco<Insoluto>('hotel_insoluti', { ordine: [{ colonna: 'giorni', crescente: false }] })
  const elenco = insoluti.filter((x) => !x.struttura_id || x.struttura_id === strutturaId)
  return elenco.length === 0 ? (
    <EmptyState compatto icon={FileText} filtrato title="Nessun conto da incassare" description="Penali di no-show e cancellazione, soggiorni chiusi con un residuo, clienti esterni." />
  ) : (
    <Card className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Conto</TableHead><TableHead>Motivo</TableHead><TableHead className="text-right">Da incassare</TableHead><TableHead className="text-right">Da giorni</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>{elenco.map((x) => (
          <TableRow key={x.conto_id}>
            <TableCell><span className="text-foreground">{x.descrizione}</span><span className="block font-mono text-xs text-muted-foreground">{x.codice}</span></TableCell>
            <TableCell className="text-muted-foreground">{x.stato_prenotazione === 'no_show' ? 'No-show' : x.stato_prenotazione === 'annullata' ? 'Penale di cancellazione' : x.stato_prenotazione === 'partita' ? 'Soggiorno concluso' : 'Cliente esterno'}</TableCell>
            <TableCell numerica className="font-semibold">{fmtEuro(x.residuo)}</TableCell>
            <TableCell numerica>{x.giorni}</TableCell>
            <TableCell className="text-right"><Button size="sm" variant="outline" asChild><Link to={`/hotel/cassa?conto=${x.conto_id}`}>Incassa</Link></Button></TableCell>
          </TableRow>))}</TableBody>
      </Table>
    </Card>
  )
}
