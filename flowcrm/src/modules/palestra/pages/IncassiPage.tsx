/**
 * Incassi (documento Palestra §21, §29–32): rate scadute e insolute di tutti
 * i soci, cassa per la vendita dei prodotti, convenzioni aziendali con
 * l'utilizzo e la fattura delle quote.
 */
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, CircleCheck, FileText, ShoppingBag, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { CassaSezione } from '@/components/condivisi/CassaSezione'
import { useAuth } from '@/hooks/useAuth'
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useSalva, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import { ConSede, SelettoreSede } from '@/modules/palestra/componenti/ConSede'
import { CercaSocio } from '@/modules/palestra/componenti/CercaSocio'
import { TABELLE_SOCIO, type Rata, type SocioStato } from '@/modules/palestra/queries'
import { METODO, RATA_STATO, fmtData, fmtEuro, fmtNumero, oggiIso, piuGiorni } from '@/modules/palestra/stati'

type Utilizzo = Database['public']['Views']['pal_convenzioni_utilizzo']['Row']
type Giacenza = Database['public']['Views']['mag_giacenze']['Row']
type Articolo = Pick<Tables<'mag_articoli'>, 'id' | 'descrizione' | 'prezzo_vendita' | 'categoria'>

export function IncassiPage() {
  return <ConSede><Incassi_ /></ConSede>
}

function Incassi_() {
  const { isManager } = useAuth()
  const oggi = oggiIso()
  const { data: rate = [], isLoading } = useElenco<Rata>('pal_rate', {
    filtri: { pagatore: 'socio', stato: ['da_pagare', 'fallita', 'insoluta'] }, tra: { colonna: 'scadenza', a: piuGiorni(oggi, 8) },
    ordine: [{ colonna: 'scadenza' }], limite: 300 })
  const ids = [...new Set(rate.map((r) => r.socio_id))]
  const { data: soci = [] } = useElenco<SocioStato>('pal_soci_stato', { filtri: { socio_id: ids }, abilitato: ids.length > 0 })
  const incassa = useAzione('pal_incassa_rata', TABELLE_SOCIO)
  const [metodo, setMetodo] = useState<'pos' | 'contanti' | 'carta' | 'bonifico'>('pos')
  const somma = (f: (r: Rata) => boolean) => rate.filter(f).reduce((s, r) => s + Number(r.importo), 0)

  return (
    <div>
      <PageHeader title="Incassi" description="Rate da incassare, insoluti, cassa dei prodotti e convenzioni aziendali."
        numeri={[
          { etichetta: 'scaduto da incassare', valore: isLoading ? undefined : fmtEuro(somma((r) => r.stato !== 'insoluta' && r.scadenza <= oggi)), inCaricamento: isLoading },
          { etichetta: 'insoluti', valore: isLoading ? undefined : fmtEuro(somma((r) => r.stato === 'insoluta')), inCaricamento: isLoading },
          { etichetta: 'in scadenza in 7 giorni', valore: isLoading ? undefined : fmtEuro(somma((r) => r.scadenza > oggi)), inCaricamento: isLoading },
        ]}
        actions={<SelettoreSede />} />
      <Tabs defaultValue="rate">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="rate">Rate</TabsTrigger>
          <TabsTrigger value="cassa">Cassa e prodotti</TabsTrigger>
          <TabsTrigger value="aziende">Convenzioni aziendali</TabsTrigger>
        </TabsList>
        <TabsContent value="rate">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">Incasso con
            <Select value={metodo} onValueChange={(v) => setMetodo(v as typeof metodo)}>
              <SelectTrigger className="w-36" aria-label="Metodo d'incasso"><SelectValue /></SelectTrigger>
              <SelectContent>{(['pos', 'contanti', 'carta', 'bonifico'] as const).map((k) => <SelectItem key={k} value={k}>{METODO[k]}</SelectItem>)}</SelectContent>
            </Select></div>
          {isLoading ? <Skeleton className="h-64" /> : rate.length === 0 ? (
            <EmptyState icon={CircleCheck} filtrato title="Niente da incassare" description="Nessuna rata scaduta o in scadenza nei prossimi 7 giorni." />
          ) : (
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Socio</TableHead><TableHead>Voce</TableHead><TableHead>Scadenza</TableHead><TableHead>Stato</TableHead>
                  <TableHead className="text-right">Importo</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>{rate.map((r) => {
                  const s = soci.find((x) => x.socio_id === r.socio_id)
                  const st = RATA_STATO[r.stato]
                  return (
                    <TableRow key={r.id}>
                      <TableCell><Link to={`/palestra/soci/${r.socio_id}`} className="font-medium text-foreground hover:text-primary-testo">{s?.nome ?? '…'}</Link></TableCell>
                      <TableCell className="text-muted-foreground">{r.descrizione}{r.ultimo_esito && <span className="block text-xs">{r.ultimo_esito}</span>}</TableCell>
                      <TableCell className={r.scadenza < oggi ? 'text-destructive-testo' : 'text-muted-foreground'}>{fmtData(r.scadenza)}</TableCell>
                      <TableCell><Badge tone={st.tone}>{st.label}</Badge></TableCell>
                      <TableCell numerica>{fmtEuro(r.importo)}</TableCell>
                      <TableCell className="text-right"><BottoneScrittura size="sm" variant="outline" disabled={incassa.isPending}
                        onClick={() => incassa.mutate({ p_rata: r.id, p_metodo: metodo }, {
                          onSuccess: () => toast.success(`${s?.nome ?? 'Socio'}: ${fmtEuro(r.importo)} incassati`), onError: (e) => toast.error(messaggioErrore(e)) })}>Incassa</BottoneScrittura></TableCell>
                    </TableRow>
                  )
                })}</TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="cassa"><div className="space-y-5"><VenditaBanco /><CassaSezione modulo="palestra" /></div></TabsContent>
        <TabsContent value="aziende"><Aziende puoGestire={isManager} /></TabsContent>
      </Tabs>
    </div>
  )
}

function Aziende({ puoGestire }: { puoGestire: boolean }) {
  const { data: utilizzo = [], isLoading } = useElenco<Utilizzo>('pal_convenzioni_utilizzo', { ordine: [{ colonna: 'azienda' }] })
  const { data: aziende = [] } = useElenco<Pick<Tables<'organizzazioni'>, 'id' | 'ragione_sociale'>>('organizzazioni', {
    filtri: { attivo: true }, select: 'id, ragione_sociale', ordine: [{ colonna: 'ragione_sociale' }], limite: 1000, abilitato: puoGestire })
  const salva = useSalva('pal_convenzioni', ['pal_convenzioni_utilizzo'])
  const fattura = useAzione('pal_fattura_convenzione', ['pal_rate', 'pal_convenzioni_utilizzo', 'fatture'])
  const [f, setF] = useState({ azienda: '', sconto: '10', quota: '50', budget: '' })
  const [numero, setNumero] = useState<Record<string, string>>({})

  function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.azienda) return
    salva.mutate({ values: { organizzazione_id: f.azienda, sconto_pct: Number(f.sconto) || 0, quota_azienda_pct: Number(f.quota) || 0,
      budget_annuo: f.budget ? Number(f.budget.replace(',', '.')) : null } }, {
      onSuccess: () => { toast.success('Convenzione creata: associa i dipendenti dalla loro scheda'); setF({ ...f, azienda: '', budget: '' }) },
      onError: (err) => toast.error(messaggioErrore(err)) })
  }

  return (
    <div className="space-y-4">
      {puoGestire && (
        <Card className="p-5">
          <form onSubmit={crea} className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1 space-y-1.5"><Label>Azienda</Label>
              <Select value={f.azienda} onValueChange={(v) => setF({ ...f, azienda: v })}><SelectTrigger id="cz-azienda" aria-label="Azienda"><SelectValue placeholder="Dalle organizzazioni" /></SelectTrigger>
                <SelectContent>{aziende.map((a) => <SelectItem key={a.id} value={a.id}>{a.ragione_sociale}</SelectItem>)}</SelectContent></Select></div>
            <div className="w-28 space-y-1.5"><Label htmlFor="cz-sc">Sconto %</Label><Input id="cz-sc" inputMode="decimal" value={f.sconto} onChange={(e) => setF({ ...f, sconto: e.target.value })} /></div>
            <div className="w-36 space-y-1.5"><Label htmlFor="cz-q">A carico azienda %</Label><Input id="cz-q" inputMode="decimal" value={f.quota} onChange={(e) => setF({ ...f, quota: e.target.value })} /></div>
            <div className="w-36 space-y-1.5"><Label htmlFor="cz-b">Budget annuo (€)</Label><Input id="cz-b" inputMode="decimal" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} placeholder="Facoltativo" /></div>
            <BottoneScrittura type="submit" variant="outline" disabled={!f.azienda || salva.isPending}><Building2 className="h-4 w-4" /> Crea la convenzione</BottoneScrittura>
          </form>
        </Card>
      )}
      {isLoading ? <Skeleton className="h-40" /> : utilizzo.length === 0 ? (
        <EmptyState compatto icon={Building2} title="Nessuna convenzione aziendale" filtrato={!puoGestire}
          description="Corporate wellness: sconto ai dipendenti, quota a carico dell'azienda, fattura periodica e utilizzo."
          action={puoGestire ? <Button variant="outline" onClick={() => document.getElementById('cz-azienda')?.focus()}>Crea la prima</Button> : undefined} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Azienda</TableHead><TableHead className="text-right">Dipendenti</TableHead><TableHead className="text-right">Ingressi nel mese</TableHead>
              <TableHead className="text-right">Quota dell'anno</TableHead><TableHead className="text-right">Da fatturare</TableHead>{puoGestire && <TableHead />}</TableRow></TableHeader>
            <TableBody>{utilizzo.map((u) => (
              <TableRow key={u.convenzione_id}>
                <TableCell><span className="font-medium text-foreground">{u.azienda}</span>
                  <span className="block text-xs text-muted-foreground">{u.codice} · sconto {fmtNumero(u.sconto_pct)}% · azienda {fmtNumero(u.quota_azienda_pct)}%</span></TableCell>
                <TableCell numerica>{u.attivi}/{u.iscritti}</TableCell>
                <TableCell numerica>{u.accessi_mese}</TableCell>
                <TableCell numerica>{fmtEuro(u.quota_anno)}{u.budget_annuo ? <span className="block text-xs text-muted-foreground">su {fmtEuro(u.budget_annuo)}</span> : null}</TableCell>
                <TableCell numerica>{fmtEuro(u.da_fatturare)}</TableCell>
                {puoGestire && (
                  <TableCell className="text-right">{Number(u.da_fatturare) > 0 && (
                    <span className="inline-flex gap-1">
                      <Input className="h-8 w-28" placeholder="N. fattura" aria-label={`Numero fattura per ${u.azienda}`} value={numero[u.convenzione_id!] ?? ''}
                        onChange={(e) => setNumero({ ...numero, [u.convenzione_id!]: e.target.value })} />
                      <BottoneScrittura size="sm" variant="outline" disabled={!numero[u.convenzione_id!]?.trim() || fattura.isPending}
                        onClick={() => fattura.mutate({ p_convenzione: u.convenzione_id!, p_al: oggiIso(), p_numero: numero[u.convenzione_id!].trim() }, {
                          onSuccess: () => { toast.success(`Fattura emessa a ${u.azienda}`); setNumero({ ...numero, [u.convenzione_id!]: '' }) },
                          onError: (e) => toast.error(messaggioErrore(e)) })}><FileText className="h-3.5 w-3.5" /> Fattura</BottoneScrittura>
                    </span>)}</TableCell>
                )}
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

/** Vendita dei prodotti al banco (§21): dal magazzino al conto, poi si incassa qui sotto. */
function VenditaBanco() {
  const [, setParams] = useSearchParams()
  const { data: articoli = [] } = useElenco<Articolo>('mag_articoli', {
    filtri: { modulo: 'palestra', attivo: true, vendibile: true }, select: 'id, descrizione, prezzo_vendita, categoria', ordine: [{ colonna: 'descrizione' }] })
  const { data: giacenze = [] } = useElenco<Giacenza>('mag_giacenze', { filtri: { modulo: 'palestra' } })
  const vendi = useAzione('pal_vendi_prodotti', ['conti', 'conti_righe', 'conti_saldi', 'mag_giacenze', 'mag_movimenti', 'mag_lotti_stato'])
  const [carrello, setCarrello] = useState<{ articolo_id: string; quantita: number }[]>([])
  const [socio, setSocio] = useState<SocioStato | null>(null)
  const inVendita = articoli.filter((a) => a.prezzo_vendita !== null)
  const art = (id: string) => articoli.find((a) => a.id === id)
  const totale = carrello.reduce((s, r) => s + r.quantita * Number(art(r.articolo_id)?.prezzo_vendita ?? 0), 0)

  function aggiungi(id: string) {
    setCarrello((c) => c.some((r) => r.articolo_id === id) ? c.map((r) => r.articolo_id === id ? { ...r, quantita: r.quantita + 1 } : r) : [...c, { articolo_id: id, quantita: 1 }])
  }

  return (
    <Card className="p-5">
      <h3 className="mb-3 flex items-center gap-2 text-title text-foreground"><ShoppingBag className="h-4 w-4 text-primary-testo" /> Vendita al banco</h3>
      {inVendita.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun prodotto in vendita: crea gli articoli con il prezzo di vendita in <Link to="/palestra/magazzino" className="underline underline-offset-2">Magazzino e prodotti</Link>.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1 space-y-1.5"><Label>Prodotto</Label>
              <Select value="" onValueChange={aggiungi}><SelectTrigger aria-label="Prodotto da vendere"><SelectValue placeholder="Aggiungi un prodotto" /></SelectTrigger>
                <SelectContent>{inVendita.map((a) => {
                  const g = giacenze.find((x) => x.articolo_id === a.id)
                  return <SelectItem key={a.id} value={a.id}>{a.descrizione} · {fmtEuro(a.prezzo_vendita)} · {fmtNumero(g?.giacenza ?? 0)} in magazzino</SelectItem>
                })}</SelectContent></Select></div>
            <div className="min-w-56 flex-1 space-y-1.5"><Label htmlFor="vb-socio">Socio (facoltativo)</Label>
              {socio ? <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span className="text-foreground">{socio.nome}</span>
                <Button size="sm" variant="ghost" onClick={() => setSocio(null)}>Togli</Button></div> : <CercaSocio id="vb-socio" onScegli={setSocio} segnaposto="Per lo storico degli acquisti" />}</div>
          </div>
          {carrello.length > 0 && (
            <>
              <ul className="mt-3 divide-y divide-border text-sm">{carrello.map((r) => (
                <li key={r.articolo_id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-foreground">{art(r.articolo_id)?.descrizione}</span>
                  <Input type="number" min={1} className="h-8 w-20" value={r.quantita} aria-label={`Quantità di ${art(r.articolo_id)?.descrizione}`}
                    onChange={(e) => setCarrello(carrello.map((x) => x.articolo_id === r.articolo_id ? { ...x, quantita: Math.max(1, Number(e.target.value) || 1) } : x))} />
                  <span className="w-20 text-right tabular-nums text-foreground">{fmtEuro(r.quantita * Number(art(r.articolo_id)?.prezzo_vendita ?? 0))}</span>
                  <Button size="sm" variant="ghost" aria-label={`Togli ${art(r.articolo_id)?.descrizione}`} onClick={() => setCarrello(carrello.filter((x) => x.articolo_id !== r.articolo_id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </li>))}</ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-foreground">Totale <strong className="tabular-nums">{fmtEuro(totale)}</strong></span>
                <BottoneScrittura variant="outline" disabled={vendi.isPending}
                  onClick={() => vendi.mutate({ p_righe: carrello, p_socio: socio?.socio_id ?? undefined }, {
                    onSuccess: (conto) => { toast.success('Conto aperto: incassalo qui sotto'); setCarrello([]); setSocio(null); setParams({ conto: String(conto) }) },
                    onError: (e) => toast.error(messaggioErrore(e)) })}>Apri il conto</BottoneScrittura>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  )
}
