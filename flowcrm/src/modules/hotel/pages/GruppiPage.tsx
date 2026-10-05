/**
 * Gruppi, intermediari e sale (documento Hotel §28–30): gruppi e tour
 * operator con blocco di camere, rilascio e rooming list; agenzie, portali e
 * aziende con commissioni e produzione; sale meeting con capienza per
 * allestimento; eventi e pacchetti meeting + camere + ristorazione.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, Plus, Presentation, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { EventiSezione } from '@/components/condivisi/EventiSezione'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useRpc, useSalva, useInserisci, messaggioErrore } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { PrenotazioneDialog } from '@/modules/hotel/dialogs/PrenotazioneDialog'
import { useCatalogoHotel, type Gruppo, type Prenotazione } from '@/modules/hotel/queries'
import { ALLESTIMENTO, PRENOTAZIONE_STATO, fmtData, fmtEuro, fmtGiornoOra, oggiIso, piuGiorni } from '@/modules/hotel/stati'

type Azienda = Pick<Tables<'organizzazioni'>, 'id' | 'ragione_sociale'>
type Produzione = Database['public']['Functions']['hotel_produzione_intermediari']['Returns'][number]

export function GruppiPage() {
  return <ConStruttura><Gruppi_ /></ConStruttura>
}

function Gruppi_() {
  const { isManager } = useAuth()
  return (
    <div>
      <PageHeader title="Gruppi, sale ed eventi" description="Gruppi e tour operator, intermediari con le commissioni, sale meeting ed eventi." actions={<SelettoreStruttura />} />
      <Tabs defaultValue="gruppi">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="gruppi">Gruppi</TabsTrigger><TabsTrigger value="sale">Sale meeting</TabsTrigger>
          <TabsTrigger value="eventi">Eventi</TabsTrigger>{isManager && <TabsTrigger value="intermediari">Intermediari</TabsTrigger>}
        </TabsList>
        <TabsContent value="gruppi"><Gruppi /></TabsContent>
        <TabsContent value="sale"><Sale /></TabsContent>
        <TabsContent value="eventi"><EventiSezione modulo="hotel" tipi={['Meeting aziendale', 'Convegno', 'Matrimonio', 'Banchetto', 'Pacchetto meeting e camere', 'Festa privata', 'Altro']} /></TabsContent>
        {isManager && <TabsContent value="intermediari"><Intermediari /></TabsContent>}
      </Tabs>
    </div>
  )
}

function useAziende() {
  return useElenco<Azienda>('organizzazioni', { filtri: { attivo: true }, select: 'id, ragione_sociale', ordine: [{ colonna: 'ragione_sociale' }], limite: 1000 }).data ?? []
}

function Gruppi() {
  const { strutturaId } = useHotel()
  const { tipologie, piani, trattamenti } = useCatalogoHotel(strutturaId)
  const aziende = useAziende()
  const { data: gruppi = [], isLoading } = useElenco<Gruppo>('hotel_gruppi', { filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'arrivo', crescente: false }], abilitato: !!strutturaId })
  const salva = useSalva('hotel_gruppi', ['hotel_gruppi', 'fond-rpc'])
  const [sceltoId, setSceltoId] = useState<string | null>(null)
  const scelto = gruppi.find((g) => g.id === sceltoId) ?? gruppi[0]
  const [f, setF] = useState({ nome: '', azienda: 'nessuna', arrivo: oggiIso(), partenza: piuGiorni(oggiIso(), 2), rilascio: '', piano: 'nessuno', trattamento: 'nessuno', fatturazione: 'capogruppo' })

  function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) return
    salva.mutate({ values: { struttura_id: strutturaId!, nome: f.nome.trim(), organizzazione_id: f.azienda === 'nessuna' ? null : f.azienda, arrivo: f.arrivo, partenza: f.partenza,
      rilascio: f.rilascio || null, piano_id: f.piano === 'nessuno' ? null : f.piano, trattamento_id: f.trattamento === 'nessuno' ? null : f.trattamento, fatturazione: f.fatturazione } }, {
      onSuccess: (g) => { toast.success(`Gruppo ${g.codice} creato: blocca le camere`); setSceltoId(g.id); setF({ ...f, nome: '' }) }, onError: (err) => toast.error(messaggioErrore(err)) })
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={crea} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1.5"><Label htmlFor="gr-n">Gruppo</Label><Input id="gr-n" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Convegno medico" /></div>
          <div className="space-y-1.5"><Label>Azienda o tour operator</Label><Select value={f.azienda} onValueChange={(v) => setF({ ...f, azienda: v })}><SelectTrigger aria-label="Azienda"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nessuna">—</SelectItem>{aziende.map((a) => <SelectItem key={a.id} value={a.id}>{a.ragione_sociale}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="gr-a">Arrivo</Label><Input id="gr-a" type="date" value={f.arrivo} onChange={(e) => setF({ ...f, arrivo: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="gr-p">Partenza</Label><Input id="gr-p" type="date" value={f.partenza} onChange={(e) => setF({ ...f, partenza: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="gr-r">Rilascio camere non nominate</Label><Input id="gr-r" type="date" value={f.rilascio} onChange={(e) => setF({ ...f, rilascio: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Tariffa</Label><Select value={f.piano} onValueChange={(v) => setF({ ...f, piano: v })}><SelectTrigger aria-label="Piano tariffario"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nessuno">—</SelectItem>{piani.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Trattamento</Label><Select value={f.trattamento} onValueChange={(v) => setF({ ...f, trattamento: v })}><SelectTrigger aria-label="Trattamento"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nessuno">—</SelectItem>{trattamenti.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Fatturazione</Label><Select value={f.fatturazione} onValueChange={(v) => setF({ ...f, fatturazione: v })}><SelectTrigger aria-label="Fatturazione"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="capogruppo">Al capogruppo</SelectItem><SelectItem value="singoli">Ai singoli</SelectItem><SelectItem value="misto">Mista</SelectItem></SelectContent></Select></div>
          <div className="col-span-2 flex justify-end sm:col-span-4"><BottoneScrittura type="submit" variant="outline"><Plus className="h-4 w-4" /> Crea il gruppo</BottoneScrittura></div>
        </form>
      </Card>
      {isLoading ? <Skeleton className="h-40" /> : gruppi.length === 0 ? (
        <EmptyState compatto icon={Users} title="Nessun gruppo" description="Convegni, tour, matrimoni: blocca le camere, poi nomina gli ospiti nella rooming list."
          action={<Button variant="outline" onClick={() => document.getElementById('gr-n')?.focus()}>Crea il primo</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="h-fit overflow-hidden">
            <ul className="divide-y divide-border">{gruppi.map((g) => (
              <li key={g.id}><button type="button" onClick={() => setSceltoId(g.id)} aria-current={g.id === scelto?.id}
                className={cn('w-full px-4 py-3 text-left text-sm hover:bg-muted/50', g.id === scelto?.id && 'bg-muted')}>
                <span className="block font-medium text-foreground">{g.nome}</span>
                <span className="block text-xs text-muted-foreground">{fmtData(g.arrivo)} → {fmtData(g.partenza)} · {g.stato}</span>
              </button></li>))}</ul>
          </Card>
          {scelto && <DettaglioGruppo gruppo={scelto} tipologie={tipologie} />}
        </div>
      )}
    </div>
  )
}

function DettaglioGruppo({ gruppo: g, tipologie }: { gruppo: Gruppo; tipologie: Tables<'hotel_tipologie'>[] }) {
  const { data: blocchi = [] } = useElenco<Tables<'hotel_gruppi_blocchi'>>('hotel_gruppi_blocchi', { filtri: { gruppo_id: g.id } })
  const { data: rooming = [] } = useElenco<Prenotazione>('hotel_prenotazioni', { filtri: { gruppo_id: g.id }, ordine: [{ colonna: 'ospite_nome' }] })
  const blocca = useInserisci('hotel_gruppi_blocchi', ['hotel_gruppi_blocchi', 'fond-rpc'])
  const salva = useSalva('hotel_gruppi', ['hotel_gruppi'])
  const [b, setB] = useState({ tipologia: '', camere: '', prezzo: '' })
  const [nuova, setNuova] = useState(false)
  const nominate = (tip: string) => rooming.filter((p) => p.tipologia_id === tip && !['annullata', 'no_show'].includes(p.stato)).length
  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-title text-foreground">{g.nome}</h3>
          <p className="text-sm text-muted-foreground"><span className="font-mono">{g.codice}</span> · {fmtData(g.arrivo)} → {fmtData(g.partenza)}{g.rilascio ? ` · rilascio il ${fmtData(g.rilascio)}` : ''}</p>
        </div>
        <Select value={g.stato} onValueChange={(v) => salva.mutate({ id: g.id, values: { stato: v } }, { onSuccess: () => toast.success('Stato del gruppo aggiornato') })}>
          <SelectTrigger className="h-8 w-36" aria-label="Stato del gruppo"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="opzione">Opzione</SelectItem><SelectItem value="confermato">Confermato</SelectItem><SelectItem value="annullato">Annullato</SelectItem></SelectContent>
        </Select>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold text-foreground">Camere bloccate</h4>
        {blocchi.length > 0 && (
          <ul className="mb-3 space-y-1 text-sm">{blocchi.map((x) => (
            <li key={x.id} className="flex justify-between gap-2"><span className="text-foreground">{tipologie.find((t) => t.id === x.tipologia_id)?.nome}</span>
              <span className="tabular-nums text-muted-foreground">{nominate(x.tipologia_id)} nominate su {x.camere}{x.prezzo ? ` · ${fmtEuro(x.prezzo)} a notte` : ''}</span></li>))}</ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <Select value={b.tipologia} onValueChange={(v) => setB({ ...b, tipologia: v })}><SelectTrigger className="w-40" aria-label="Tipologia da bloccare"><SelectValue placeholder="Tipologia" /></SelectTrigger>
            <SelectContent>{tipologie.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select>
          <Input className="w-24" type="number" min={1} value={b.camere} onChange={(e) => setB({ ...b, camere: e.target.value })} placeholder="Camere" aria-label="Numero di camere" />
          <Input className="w-28" inputMode="decimal" value={b.prezzo} onChange={(e) => setB({ ...b, prezzo: e.target.value })} placeholder="€ a notte" aria-label="Tariffa concordata" />
          <BottoneScrittura size="sm" variant="outline" disabled={!b.tipologia || !(Number(b.camere) > 0)}
            onClick={() => blocca.mutate({ gruppo_id: g.id, tipologia_id: b.tipologia, camere: Number(b.camere), prezzo: b.prezzo ? Number(b.prezzo.replace(',', '.')) : null }, {
              onSuccess: () => { toast.success('Camere bloccate: fuori vendita fino al rilascio'); setB({ tipologia: '', camere: '', prezzo: '' }) },
              onError: (e) => toast.error(/23505/.test(JSON.stringify(e)) ? 'Tipologia già bloccata per questo gruppo' : messaggioErrore(e)) })}>Blocca</BottoneScrittura>
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">Rooming list ({rooming.length})</h4>
          <Button size="sm" variant="outline" onClick={() => setNuova(true)}><Plus className="h-3.5 w-3.5" /> Nomina un ospite</Button>
        </div>
        {rooming.length === 0 ? <p className="text-sm text-muted-foreground">Nessun ospite nominato.</p> : (
          <ul className="divide-y divide-border text-sm">{rooming.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
              <Link to={`/hotel/prenotazioni/${p.id}`} className="text-foreground underline-offset-2 hover:underline">{p.ospite_nome}</Link>
              <span className="flex items-center gap-2 text-muted-foreground">{tipologie.find((t) => t.id === p.tipologia_id)?.codice}
                <Badge tone={PRENOTAZIONE_STATO[p.stato]?.tone ?? 'neutral'}>{PRENOTAZIONE_STATO[p.stato]?.label}</Badge></span>
            </li>))}</ul>
        )}
      </div>
      <PrenotazioneDialog open={nuova} onOpenChange={setNuova} iniziale={{ arrivo: g.arrivo, gruppo_id: g.id }} />
    </Card>
  )
}

function Sale() {
  const { strutturaId } = useHotel()
  const { isManager } = useAuth()
  const aziende = useAziende()
  const { data: sale = [] } = useElenco<Tables<'hotel_sale'>>('hotel_sale', { filtri: { struttura_id: strutturaId ?? undefined, attiva: true }, ordine: [{ colonna: 'nome' }], abilitato: !!strutturaId })
  const { data: prenotazioni = [], isLoading } = useElenco<Tables<'hotel_sale_prenotazioni'>>('hotel_sale_prenotazioni', {
    filtri: { struttura_id: strutturaId ?? undefined }, tra: { colonna: 'inizio', da: `${piuGiorni(oggiIso(), -1)}T00:00:00` }, ordine: [{ colonna: 'inizio' }], abilitato: !!strutturaId,
  })
  const salvaSala = useSalva('hotel_sale', ['hotel_sale'])
  const salva = useSalva('hotel_sale_prenotazioni', ['hotel_sale_prenotazioni'])
  const [f, setF] = useState({ sala: '', titolo: '', azienda: 'nessuna', giorno: oggiIso(), dalle: '09:00', alle: '18:00', allestimento: 'teatro', partecipanti: '', coffee: '0', catering: '', prezzo: '' })
  const [s, setS] = useState({ nome: '', teatro: '', banchi: '', ferro: '', mezza: '', intera: '' })
  return (
    <div className="space-y-4">
      {sale.length > 0 && (
        <Card className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); if (!f.sala || !f.titolo.trim()) return
            salva.mutate({ values: { struttura_id: strutturaId!, sala_id: f.sala, titolo: f.titolo.trim(), organizzazione_id: f.azienda === 'nessuna' ? null : f.azienda,
              inizio: new Date(`${f.giorno}T${f.dalle}`).toISOString(), fine: new Date(`${f.giorno}T${f.alle}`).toISOString(), allestimento: f.allestimento,
              partecipanti: f.partecipanti ? Number(f.partecipanti) : null, coffee_break: Number(f.coffee) || 0, catering: f.catering || null,
              prezzo: f.prezzo ? Number(f.prezzo.replace(',', '.')) : null } }, {
              onSuccess: () => { toast.success('Sala prenotata in opzione'); setF({ ...f, titolo: '' }) },
              onError: (err) => toast.error(/23P01|hotel_sala_libera/.test(JSON.stringify(err)) ? 'La sala è già prenotata in quell\'orario' : messaggioErrore(err)) }) }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
            <div className="space-y-1.5"><Label>Sala</Label><Select value={f.sala} onValueChange={(v) => setF({ ...f, sala: v })}><SelectTrigger aria-label="Sala"><SelectValue placeholder="Scegli…" /></SelectTrigger>
              <SelectContent>{sale.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="sp-t">Titolo</Label><Input id="sp-t" value={f.titolo} onChange={(e) => setF({ ...f, titolo: e.target.value })} placeholder="Riunione commerciale" /></div>
            <div className="space-y-1.5"><Label>Cliente</Label><Select value={f.azienda} onValueChange={(v) => setF({ ...f, azienda: v })}><SelectTrigger aria-label="Cliente"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuna">—</SelectItem>{aziende.map((a) => <SelectItem key={a.id} value={a.id}>{a.ragione_sociale}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="sp-g">Giorno</Label><Input id="sp-g" type="date" value={f.giorno} onChange={(e) => setF({ ...f, giorno: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sp-d">Dalle</Label><Input id="sp-d" type="time" value={f.dalle} onChange={(e) => setF({ ...f, dalle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sp-a">Alle</Label><Input id="sp-a" type="time" value={f.alle} onChange={(e) => setF({ ...f, alle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Allestimento</Label><Select value={f.allestimento} onValueChange={(v) => setF({ ...f, allestimento: v })}><SelectTrigger aria-label="Allestimento"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ALLESTIMENTO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="sp-p">Partecipanti</Label><Input id="sp-p" type="number" min={1} value={f.partecipanti} onChange={(e) => setF({ ...f, partecipanti: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sp-c">Coffee break</Label><Input id="sp-c" type="number" min={0} value={f.coffee} onChange={(e) => setF({ ...f, coffee: e.target.value })} /></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="sp-cat">Catering</Label><Input id="sp-cat" value={f.catering} onChange={(e) => setF({ ...f, catering: e.target.value })} placeholder="Pranzo a buffet per 40" /></div>
            <div className="space-y-1.5"><Label htmlFor="sp-pr">Prezzo (€)</Label><Input id="sp-pr" inputMode="decimal" value={f.prezzo} onChange={(e) => setF({ ...f, prezzo: e.target.value })} /></div>
            <div className="col-span-2 flex items-end justify-end sm:col-span-4 xl:col-span-6"><BottoneScrittura type="submit"><Presentation className="h-4 w-4" /> Prenota la sala</BottoneScrittura></div>
          </form>
        </Card>
      )}
      {isLoading ? <Skeleton className="h-40" /> : prenotazioni.length === 0 ? (
        <EmptyState compatto icon={Presentation} title="Nessuna sala prenotata" filtrato={sale.length > 0}
          action={sale.length ? undefined : <Button variant="outline" onClick={() => document.getElementById('sa-n')?.focus()}>Aggiungi la prima sala</Button>}
          description={sale.length ? 'Riunioni, convegni e corsi: con allestimento, coffee break e catering.' : 'Prima aggiungi le sale qui sotto.'} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Sala</TableHead><TableHead>Titolo</TableHead><TableHead>Allestimento</TableHead><TableHead>Stato</TableHead><TableHead className="text-right">Prezzo</TableHead></TableRow></TableHeader>
            <TableBody>{prenotazioni.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-foreground">{fmtGiornoOra(p.inizio)}</TableCell>
                <TableCell className="text-muted-foreground">{sale.find((x) => x.id === p.sala_id)?.nome}</TableCell>
                <TableCell className="text-foreground">{p.titolo}{p.catering ? <span className="block text-xs text-muted-foreground">{p.catering}</span> : null}</TableCell>
                <TableCell className="text-muted-foreground">{ALLESTIMENTO[p.allestimento ?? ''] ?? p.allestimento ?? '—'}{p.partecipanti ? ` · ${p.partecipanti}` : ''}{p.coffee_break ? ` · ${p.coffee_break} coffee break` : ''}</TableCell>
                <TableCell><Select value={p.stato} onValueChange={(v) => salva.mutate({ id: p.id, values: { stato: v } })}>
                  <SelectTrigger className="h-8 w-32" aria-label="Stato"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="opzione">Opzione</SelectItem><SelectItem value="confermata">Confermata</SelectItem><SelectItem value="annullata">Annullata</SelectItem></SelectContent></Select></TableCell>
                <TableCell numerica>{fmtEuro(p.prezzo)}</TableCell>
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
      {isManager && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Sale ({sale.length})</h3>
          {sale.length > 0 && <ul className="mb-3 space-y-1 text-sm">{sale.map((x) => (
            <li key={x.id} className="text-foreground">{x.nome} <span className="text-muted-foreground">· {Object.entries(x.capienze as Record<string, number>).map(([k, v]) => `${ALLESTIMENTO[k] ?? k} ${v}`).join(', ') || 'capienza da indicare'}</span></li>))}</ul>}
          <form onSubmit={(e) => { e.preventDefault(); if (!s.nome.trim()) return
            const capienze = Object.fromEntries([['teatro', s.teatro], ['banchi', s.banchi], ['ferro_di_cavallo', s.ferro]].filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)]))
            salvaSala.mutate({ values: { struttura_id: strutturaId!, nome: s.nome.trim(), capienze, prezzo_mezza_giornata: s.mezza ? Number(s.mezza.replace(',', '.')) : null,
              prezzo_giornata: s.intera ? Number(s.intera.replace(',', '.')) : null } }, {
              onSuccess: () => { toast.success('Sala aggiunta'); setS({ nome: '', teatro: '', banchi: '', ferro: '', mezza: '', intera: '' }) }, onError: (err) => toast.error(messaggioErrore(err)) }) }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <div className="col-span-2 space-y-1.5"><Label htmlFor="sa-n">Nome</Label><Input id="sa-n" value={s.nome} onChange={(e) => setS({ ...s, nome: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sa-t">A teatro</Label><Input id="sa-t" type="number" value={s.teatro} onChange={(e) => setS({ ...s, teatro: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sa-b">A banchi</Label><Input id="sa-b" type="number" value={s.banchi} onChange={(e) => setS({ ...s, banchi: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sa-f">A ferro di cavallo</Label><Input id="sa-f" type="number" value={s.ferro} onChange={(e) => setS({ ...s, ferro: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sa-g">Giornata (€)</Label><Input id="sa-g" inputMode="decimal" value={s.intera} onChange={(e) => setS({ ...s, intera: e.target.value })} /></div>
            <div className="col-span-2 flex justify-end sm:col-span-6"><BottoneScrittura type="submit" variant="outline">Aggiungi la sala</BottoneScrittura></div>
          </form>
        </Card>
      )}
    </div>
  )
}

function Intermediari() {
  const { strutturaId } = useHotel()
  const aziende = useAziende()
  const { data: elenco = [] } = useElenco<Tables<'hotel_intermediari'>>('hotel_intermediari', { ordine: [{ colonna: 'tipo' }] })
  const { data: produzione = [] } = useRpc<Produzione[]>('hotel_produzione_intermediari',
    { p_struttura: strutturaId, p_dal: piuGiorni(oggiIso(), -365), p_al: piuGiorni(oggiIso(), 365) }, { abilitato: !!strutturaId })
  const salva = useSalva('hotel_intermediari', ['hotel_intermediari', 'fond-rpc'])
  const [f, setF] = useState({ azienda: '', tipo: 'agenzia', commissione: '10', netta: false, dal: '', al: '', condizioni: '', codice: '' })
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); if (!f.azienda) return
          salva.mutate({ values: { struttura_id: strutturaId, organizzazione_id: f.azienda, tipo: f.tipo, commissione_pct: Number(f.commissione.replace(',', '.')) || 0,
            tariffa_netta: f.netta, contratto_dal: f.dal || null, contratto_al: f.al || null, condizioni_pagamento: f.condizioni || null, codice_canale: f.codice || null } }, {
            onSuccess: () => { toast.success('Intermediario aggiunto'); setF({ ...f, azienda: '' }) }, onError: (err) => toast.error(messaggioErrore(err)) }) }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2 space-y-1.5"><Label>Organizzazione</Label><Select value={f.azienda} onValueChange={(v) => setF({ ...f, azienda: v })}><SelectTrigger id="in-org" aria-label="Organizzazione"><SelectValue placeholder="Dall'anagrafica" /></SelectTrigger>
            <SelectContent>{aziende.map((a) => <SelectItem key={a.id} value={a.id}>{a.ragione_sociale}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Tipo</Label><Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
            <SelectContent>{[['agenzia', 'Agenzia viaggi'], ['tour_operator', 'Tour operator'], ['ota', 'Portale (OTA)'], ['gds', 'GDS'], ['corporate', 'Azienda'], ['event_planner', 'Event planner']]
              .map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="in-c">Commissione %</Label><Input id="in-c" value={f.commissione} onChange={(e) => setF({ ...f, commissione: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="in-d">Contratto dal</Label><Input id="in-d" type="date" value={f.dal} onChange={(e) => setF({ ...f, dal: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="in-a">al</Label><Input id="in-a" type="date" value={f.al} onChange={(e) => setF({ ...f, al: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="in-p">Pagamento</Label><Input id="in-p" value={f.condizioni} onChange={(e) => setF({ ...f, condizioni: e.target.value })} placeholder="30 giorni fine mese" /></div>
          <div className="space-y-1.5"><Label htmlFor="in-k">Codice nel channel manager</Label><Input id="in-k" value={f.codice} onChange={(e) => setF({ ...f, codice: e.target.value })} placeholder="Predisposto" /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.netta} onCheckedChange={(v) => setF({ ...f, netta: v })} /> Tariffe nette</label>
          <div className="col-span-2 flex justify-end sm:col-span-3"><BottoneScrittura type="submit" variant="outline"><Building2 className="h-4 w-4" /> Aggiungi</BottoneScrittura></div>
        </form>
      </Card>
      {produzione.length === 0 && elenco.length === 0 ? (
        <EmptyState compatto icon={Building2} title="Nessun intermediario" description="Agenzie, tour operator, portali e aziende con la loro commissione."
          action={<Button variant="outline" onClick={() => document.getElementById('in-org')?.focus()}>Aggiungi il primo</Button>} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Intermediario</TableHead><TableHead className="text-right">Prenotazioni</TableHead><TableHead className="text-right">Notti</TableHead><TableHead className="text-right">Ricavo</TableHead>
              <TableHead className="text-right">Commissione</TableHead><TableHead className="text-right">Annullate</TableHead></TableRow></TableHeader>
            <TableBody>{produzione.map((p) => (
              <TableRow key={p.intermediario_id}>
                <TableCell><span className="text-foreground">{p.nome}</span><span className="block text-xs text-muted-foreground">{p.tipo} · {p.commissione_pct}%</span></TableCell>
                <TableCell numerica>{p.prenotazioni}</TableCell><TableCell numerica>{p.notti}</TableCell><TableCell numerica>{fmtEuro(p.ricavo)}</TableCell>
                <TableCell numerica>{fmtEuro(p.commissione)}</TableCell><TableCell numerica>{p.annullate}</TableCell>
              </TableRow>))}</TableBody>
          </Table>
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">Produzione degli ultimi 12 mesi e dei prossimi 12 (per data di arrivo).</p>
        </Card>
      )}
    </div>
  )
}
