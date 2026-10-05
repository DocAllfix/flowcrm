/**
 * Contratti e abbonamenti (§6, §11) con sospensione, recesso, rinnovo e la
 * lista d'attesa; convenzioni aziendali (§13) con consuntivo e fattura;
 * incassi (§12): cassa, canoni da incassare e insoluti.
 */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Undo2 } from 'lucide-react'
import { Building2, FileText, Hourglass, KeyRound, Pencil, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { CassaSezione, type EstensioneConto } from '@/components/condivisi/CassaSezione'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'
import type { Tables } from '@/lib/supabase'
import { useElenco, useRpc, useSalva, useAzione, useInserisci, messaggioErrore } from '@/lib/queries/fondamenta'
import { useGarage } from '@/modules/garage/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/garage/componenti/ConStruttura'
import { AutorizzazioneDialog, ContrattoDialog, testoFasce } from '@/modules/garage/dialogs/AnagraficaDialogs'
import { IncassaRata } from '@/modules/garage/pages/ClientiPages'
import { useAnagrafica, nomeCliente, TABELLE_CONTRATTO, type Attesa, type Autorizzazione, type Contratto, type Convenzione, type PostoStato, type Rata,
  type Tariffario } from '@/modules/garage/queries'
import { ATTESA_STATO, CONTRATTO_STATO, CONTRATTO_TIPO, PERIODICITA, POSTO_TIPO, RATA_STATO, fmtData, fmtEuro, fmtNumero, numero, campoNumero, oggiIso,
  piuGiorni } from '@/modules/garage/stati'

type Metodo = Database['public']['Enums']['pagamento_metodo']

// ── Contratti ───────────────────────────────────────────────────────────
export function ContrattiGaragePage() {
  return <ConStruttura><Contratti_ /></ConStruttura>
}

function Contratti_() {
  const { strutturaId } = useGarage()
  const { isManager } = useAuth()
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') ?? 'in_corso'
  const scheda = params.get('scheda') ?? 'contratti'
  const { clienti } = useAnagrafica()
  const { data: contratti = [], isLoading } = useElenco<Contratto>('gar_contratti', { filtri: { struttura_id: strutturaId }, ordine: [{ colonna: 'inizio', crescente: false }] })
  const { data: posti = [] } = useElenco<PostoStato>('gar_posti_stato', { filtri: { struttura_id: strutturaId } })
  const [nuovo, setNuovo] = useState(false)
  const [q, setQ] = useState('')
  const oggi = oggiIso()
  const scadeEntro = (c: Contratto, g: number) => { const d = c.recesso_il ?? c.fine; return !!d && d >= oggi && d <= piuGiorni(oggi, g) }
  const filtra = (c: Contratto) => vista === 'in_corso' ? ['attivo', 'sospeso'].includes(c.stato) : vista === 'in_scadenza' ? ['attivo', 'sospeso'].includes(c.stato) && scadeEntro(c, 30)
    : vista === 'sospesi' ? c.stato === 'sospeso' : ['scaduto', 'disdetto'].includes(c.stato)
  const cerca = q.trim().toLowerCase()
  const visibili = contratti.filter(filtra).filter((c) => !cerca || [c.codice, nomeCliente(clienti, c.cliente_id)].some((x) => x?.toLowerCase().includes(cerca)))
  const scelto = contratti.find((c) => c.id === params.get('id')) ?? null
  const apri = (id: string | null) => { const p = new URLSearchParams(params); if (id) p.set('id', id); else p.delete('id'); setParams(p) }
  const imposta = (k: string, v: string) => { const p = new URLSearchParams(params); p.set(k, v); setParams(p) }
  const viste: [string, string][] = [['in_corso', 'In corso'], ['in_scadenza', 'In scadenza (30 giorni)'], ['sospesi', 'Sospesi'], ['chiusi', 'Scaduti e disdetti']]

  return (
    <div>
      <PageHeader title="Contratti e abbonamenti" description="Abbonamenti, posti riservati, custodia e noleggio: canone, rate, rinnovo, sospensione e recesso."
        numeri={[
          { etichetta: 'in corso', valore: isLoading ? undefined : contratti.filter((c) => ['attivo', 'sospeso'].includes(c.stato)).length, inCaricamento: isLoading },
          { etichetta: 'in scadenza', valore: isLoading ? undefined : contratti.filter((c) => ['attivo', 'sospeso'].includes(c.stato) && scadeEntro(c, 30)).length, inCaricamento: isLoading },
          { etichetta: 'canoni al mese', valore: isLoading ? undefined : fmtEuro(contratti.filter((c) => c.stato === 'attivo').reduce((s, c) =>
              s + Number(c.canone) / (c.periodicita === 'annuale' ? 12 : c.periodicita === 'trimestrale' ? 3 : c.periodicita === 'una_tantum' ? Infinity : 1), 0)), inCaricamento: isLoading },
        ]}
        actions={<><SelettoreStruttura />{isManager && <BottoneScrittura onClick={() => setNuovo(true)}><Plus className="h-4 w-4" /> Nuovo contratto</BottoneScrittura>}</>} />
      <Tabs value={scheda} onValueChange={(v) => imposta('scheda', v)}>
        <TabsList className="mb-4"><TabsTrigger value="contratti">Contratti</TabsTrigger><TabsTrigger value="attesa">Lista d'attesa</TabsTrigger></TabsList>
        <TabsContent value="contratti">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input className="max-w-xs" placeholder="Codice o cliente" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca" />
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtra">{viste.map(([k, l]) => (
              <Button key={k} size="sm" variant={vista === k ? 'default' : 'outline'} aria-pressed={vista === k} onClick={() => imposta('vista', k)}>{l}</Button>))}</div>
          </div>
          {isLoading ? <Skeleton className="h-64" /> : visibili.length === 0 ? (
            vista === 'in_corso' && !cerca
              ? <EmptyState icon={KeyRound} title="Nessun contratto in corso" description="Gli abbonamenti si stipulano qui o dalla scheda del cliente."
                  action={isManager ? <BottoneScrittura variant="outline" onClick={() => setNuovo(true)}>Nuovo contratto</BottoneScrittura> : undefined} filtrato={!isManager} />
              : <EmptyState icon={KeyRound} filtrato title="Nessun contratto con questo filtro" description="Cambia la ricerca o il filtro." />
          ) : (
            <Card className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Contratto</TableHead><TableHead>Cliente</TableHead><TableHead>Posto</TableHead><TableHead>Periodo</TableHead><TableHead numerica>Canone</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
              <TableBody>{visibili.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => apri(c.id)}>
                  <TableCell><button type="button" className="font-medium text-foreground hover:text-primary-testo" onClick={() => apri(c.id)}>{c.codice}</button>
                    <span className="block text-xs text-muted-foreground">{CONTRATTO_TIPO[c.tipo]}</span></TableCell>
                  <TableCell><Link to={`/garage/clienti/${c.cliente_id}`} className="hover:text-primary-testo" onClick={(e) => e.stopPropagation()}>{nomeCliente(clienti, c.cliente_id) ?? '…'}</Link></TableCell>
                  <TableCell>{posti.find((p) => p.posto_id === c.posto_id)?.codice ?? 'A rotazione'}</TableCell>
                  <TableCell>{fmtData(c.inizio)} – {c.recesso_il ? fmtData(c.recesso_il) : c.fine ? fmtData(c.fine) : 'indeterminato'}
                    {scadeEntro(c, 30) && <Badge tone="warning" className="ml-2">scade</Badge>}</TableCell>
                  <TableCell numerica>{fmtEuro(c.canone)}<span className="block text-xs text-muted-foreground">{PERIODICITA[c.periodicita].toLowerCase()}</span></TableCell>
                  <TableCell><Badge tone={CONTRATTO_STATO[c.stato].tone}>{CONTRATTO_STATO[c.stato].label}</Badge></TableCell>
                </TableRow>))}</TableBody>
            </Table></Card>
          )}
        </TabsContent>
        <TabsContent value="attesa"><ListaAttesa /></TabsContent>
      </Tabs>
      {isManager && <ContrattoDialog open={nuovo} onOpenChange={setNuovo} />}
      {scelto && <SchedaContratto key={`${scelto.id}-${scelto.updated_at}`} contratto={scelto} onClose={() => apri(null)} cliente={nomeCliente(clienti, scelto.cliente_id)}
        posto={posti.find((p) => p.posto_id === scelto.posto_id)?.codice ?? null} />}
    </div>
  )
}

function SchedaContratto({ contratto: c, onClose, cliente, posto }: { contratto: Contratto; onClose: () => void; cliente: string | null; posto: string | null }) {
  const { isManager } = useAuth()
  const salva = useSalva('gar_contratti', TABELLE_CONTRATTO)
  const { data: rate = [] } = useElenco<Rata>('gar_rate', { filtri: { contratto_id: c.id }, ordine: [{ colonna: 'periodo_dal', crescente: false }] })
  const [modifica, setModifica] = useState(false)
  const [azione, setAzione] = useState<'sospendi' | 'recesso' | null>(null)
  const [dal, setDal] = useState(oggiIso())
  const [al, setAl] = useState('')
  const [recesso, setRecesso] = useState(piuGiorni(oggiIso(), c.preavviso_giorni))
  const aperto = ['attivo', 'sospeso'].includes(c.stato)
  const cambia = (values: { stato?: string; sospeso_dal?: string | null; sospeso_al?: string | null; recesso_il?: string | null }, ok: string) => salva.mutate({ id: c.id, values }, { onSuccess: () => { toast.success(ok); setAzione(null) }, onError: (e) => toast.error(messaggioErrore(e)) })
  const voce = (l: string, v: string) => <div className="flex justify-between gap-3 py-1"><dt className="text-muted-foreground">{l}</dt><dd className="text-right text-foreground">{v}</dd></div>
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">{c.codice} <Badge tone={CONTRATTO_STATO[c.stato].tone}>{CONTRATTO_STATO[c.stato].label}</Badge></DialogTitle>
          <DialogDescription>{CONTRATTO_TIPO[c.tipo]} · {cliente} · posto {posto ?? 'a rotazione'}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
          {voce('Periodo', `${fmtData(c.inizio)} – ${c.fine ? fmtData(c.fine) : 'indeterminato'}`)}
          {voce('Canone', `${fmtEuro(c.canone)} ${PERIODICITA[c.periodicita].toLowerCase()}`)}
          {voce('Deposito cauzionale', Number(c.deposito_cauzionale) > 0 ? `${fmtEuro(c.deposito_cauzionale)} ${c.deposito_versato ? '(versato)' : '(da versare)'}` : '—')}
          {voce('Rinnovo', c.rinnovo_automatico ? 'Automatico' : 'Da rinnovare a mano')}
          {voce('Preavviso di recesso', `${c.preavviso_giorni} giorni`)}
          {voce('Pagamento', c.pagamento_automatico ? 'Addebito automatico (predisposto)' : 'In cassa o bonifico')}
          {c.recesso_il && voce('Recesso', `finisce il ${fmtData(c.recesso_il)}`)}
          {c.stato === 'sospeso' && voce('Sospeso', `dal ${fmtData(c.sospeso_dal)}${c.sospeso_al ? ` al ${fmtData(c.sospeso_al)}` : ''}`)}
          {voce('Rate emesse fino al', fmtData(c.rate_fino))}
        </dl>
        {c.condizioni && <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">{c.condizioni}</p>}
        {azione === 'sospendi' && (
          <div className="grid grid-cols-2 gap-3 rounded-md border border-border p-3">
            <div className="space-y-1.5"><Label htmlFor="sc-dal">Sospeso dal</Label><Input id="sc-dal" type="date" value={dal} onChange={(e) => setDal(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="sc-al">Fino al (vuoto = finché non si riattiva)</Label><Input id="sc-al" type="date" value={al} onChange={(e) => setAl(e.target.value)} /></div>
            <p className="col-span-2 text-xs text-muted-foreground">Durante la sospensione l'abbonamento non vale per entrare e non si emettono rate.</p>
            <BottoneScrittura className="col-span-2 justify-self-end" variant="outline" onClick={() => cambia({ stato: 'sospeso', sospeso_dal: dal, sospeso_al: al || null }, 'Contratto sospeso')}>Conferma la sospensione</BottoneScrittura>
          </div>
        )}
        {azione === 'recesso' && (
          <div className="grid grid-cols-2 items-end gap-3 rounded-md border border-border p-3">
            <div className="space-y-1.5"><Label htmlFor="sc-rec">Il contratto finisce il</Label><Input id="sc-rec" type="date" value={recesso} min={c.inizio} onChange={(e) => setRecesso(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Con il preavviso di {c.preavviso_giorni} giorni il primo giorno utile è il {fmtData(piuGiorni(oggiIso(), c.preavviso_giorni))}. Il rinnovo automatico si spegne.</p>
            <BottoneScrittura className="col-span-2 justify-self-end" variant="outline" onClick={() => cambia({ recesso_il: recesso }, `Recesso registrato: finisce il ${fmtData(recesso)}`)}>Registra il recesso</BottoneScrittura>
          </div>
        )}
        <div>
          <h3 className="mb-1 text-label uppercase text-muted-foreground">Rate</h3>
          {rate.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna rata: il canone è zero o il contratto non è attivo.</p> : (
            <ul className="max-h-56 divide-y divide-border overflow-y-auto text-sm">{rate.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-1.5"><span className="min-w-0 flex-1 text-foreground">{fmtData(r.periodo_dal)} – {fmtData(r.periodo_al)}</span>
                <span className="tabular-nums">{fmtEuro(r.importo)}</span><Badge tone={RATA_STATO[r.stato].tone}>{RATA_STATO[r.stato].label}</Badge>
                {['da_pagare', 'insoluta'].includes(r.stato) && <IncassaRata rata={r} />}</li>))}</ul>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {isManager && aperto && <>
            <Button variant="outline" onClick={() => setModifica(true)}><Pencil className="h-4 w-4" /> Modifica</Button>
            {c.stato === 'sospeso' ? <BottoneScrittura variant="outline" onClick={() => cambia({ stato: 'attivo' }, 'Contratto riattivato')}>Riattiva</BottoneScrittura>
              : <Button variant="outline" onClick={() => setAzione(azione === 'sospendi' ? null : 'sospendi')}>Sospendi</Button>}
            {!c.recesso_il ? <Button variant="outline" onClick={() => setAzione(azione === 'recesso' ? null : 'recesso')}>Recesso</Button>
              : <Button variant="ghost" onClick={() => cambia({ recesso_il: null }, 'Recesso annullato')}>Annulla il recesso</Button>}
          </>}
          <Button asChild variant="ghost"><Link to={`/garage/clienti/${c.cliente_id}`}>Scheda del cliente</Link></Button>
        </DialogFooter>
        {modifica && <ContrattoDialog open onOpenChange={setModifica} contratto={c} />}
      </DialogContent>
    </Dialog>
  )
}

function ListaAttesa() {
  const { strutturaId } = useGarage()
  const { clienti } = useAnagrafica()
  const { data: attese = [], isLoading } = useElenco<Attesa>('gar_attese', { filtri: { struttura_id: strutturaId }, ordine: [{ colonna: 'created_at' }] })
  const { data: liberi = [] } = useElenco<{ posto_id: string; tipo: string }>('gar_posti_assegnabili', { filtri: { struttura_id: strutturaId }, select: 'posto_id, tipo' })
  const salva = useSalva('gar_attese')
  const [f, setF] = useState({ cliente: '', tipo: 'auto', coperto: false, note: '' })
  const aperte = attese.filter((a) => ['in_attesa', 'avvisato'].includes(a.stato))
  const aggiungi = () => {
    if (!f.cliente) { toast.error('Scegli il cliente'); return }
    salva.mutate({ values: { struttura_id: strutturaId!, cliente_id: f.cliente, tipo_posto: f.tipo, solo_coperto: f.coperto, note: f.note.trim() || null } }, {
      onSuccess: () => { toast.success('In lista d\'attesa'); setF({ cliente: '', tipo: 'auto', coperto: false, note: '' }) }, onError: (e) => toast.error(messaggioErrore(e)) })
  }
  const cambia = (a: Attesa, stato: string, ok: string) => salva.mutate({ id: a.id, values: { stato } }, { onSuccess: () => toast.success(ok), onError: (e) => toast.error(messaggioErrore(e)) })
  return (
    <div className="space-y-4">
      <Card className="grid grid-cols-2 items-end gap-3 p-4 md:grid-cols-[1fr_12rem_auto_1fr_auto]">
        <div className="col-span-2 space-y-1.5 md:col-span-1"><Label htmlFor="la-cli">Cliente</Label>
          <Select value={f.cliente} onValueChange={(v) => setF({ ...f, cliente: v })}><SelectTrigger id="la-cli"><SelectValue placeholder="Scegli il cliente" /></SelectTrigger>
            <SelectContent>{clienti.map((k) => <SelectItem key={k.id} value={k.id}>{k.nome}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="la-tipo">Posto</Label>
          <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="la-tipo"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(POSTO_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <label className="flex h-10 items-center gap-2 text-sm text-foreground"><Checkbox checked={f.coperto} onCheckedChange={(v) => setF({ ...f, coperto: v === true })} /> Solo coperto</label>
        <div className="col-span-2 space-y-1.5 md:col-span-1"><Label htmlFor="la-note">Note</Label><Input id="la-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        <BottoneScrittura variant="outline" onClick={aggiungi} disabled={salva.isPending}>Metti in lista</BottoneScrittura>
      </Card>
      {isLoading ? <Skeleton className="h-32" /> : aperte.length === 0 ? (
        <EmptyState icon={Hourglass} filtrato title="Nessuno in attesa" description="Chi aspetta un posto in abbonamento viene avvisato per email, in ordine di arrivo, quando se ne libera uno adatto." />
      ) : (
        <Card className="divide-y divide-border">{aperte.map((a, i) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="w-6 tabular-nums text-muted-foreground">{i + 1}.</span>
            <Link to={`/garage/clienti/${a.cliente_id}`} className="font-medium text-foreground hover:text-primary-testo">{nomeCliente(clienti, a.cliente_id)}</Link>
            <span className="text-muted-foreground">{POSTO_TIPO[a.tipo_posto]}{a.solo_coperto ? ', coperto' : ''} · dal {fmtData(a.created_at)}{a.note ? ` · ${a.note}` : ''}</span>
            <Badge tone={ATTESA_STATO[a.stato].tone}>{ATTESA_STATO[a.stato].label}{a.avvisato_il ? ` il ${fmtData(a.avvisato_il)}` : ''}</Badge>
            <span className="ml-auto text-xs text-muted-foreground">{liberi.filter((p) => p.tipo === a.tipo_posto).length} posti adatti liberi</span>
            <Button size="sm" variant="outline" onClick={() => cambia(a, 'soddisfatta', 'Segnato: posto assegnato')}>Posto assegnato</Button>
            <Button size="sm" variant="ghost" onClick={() => cambia(a, 'annullata', 'Tolto dalla lista')}>Togli</Button>
          </div>))}</Card>
      )}
    </div>
  )
}

// ── Convenzioni aziendali ───────────────────────────────────────────────
export function ConvenzioniGaragePage() {
  return <ConStruttura><Convenzioni_ /></ConStruttura>
}

function Convenzioni_() {
  const { strutturaId } = useGarage()
  const { isManager } = useAuth()
  const { clienti } = useAnagrafica()
  const { data: conv = [], isLoading } = useElenco<Convenzione>('gar_convenzioni', { filtri: { struttura_id: strutturaId }, ordine: [{ colonna: 'created_at', crescente: false }] })
  const [aperta, setAperta] = useState<Convenzione | 'nuova' | null>(null)
  const [scheda, setScheda] = useState<string | null>(null)
  const attive = conv.filter((c) => c.attiva)
  return (
    <div>
      <PageHeader title="Convenzioni aziendali" description="Aziende con posti acquistati per i dipendenti: chi è autorizzato, quanto usano, fatturazione periodica."
        numeri={[
          { etichetta: 'convenzioni attive', valore: isLoading ? undefined : attive.length, inCaricamento: isLoading },
          { etichetta: 'posti acquistati', valore: isLoading ? undefined : attive.reduce((s, c) => s + c.posti_acquistati, 0), inCaricamento: isLoading },
          { etichetta: 'canoni al mese', valore: isLoading ? undefined : fmtEuro(attive.reduce((s, c) => s + Number(c.canone_mensile), 0)), inCaricamento: isLoading },
        ]}
        actions={<><SelettoreStruttura />{isManager && <BottoneScrittura onClick={() => setAperta('nuova')}><Plus className="h-4 w-4" /> Nuova convenzione</BottoneScrittura>}</>} />
      {isLoading ? <Skeleton className="h-48" /> : conv.length === 0 ? (
        <EmptyState icon={Building2} title="Nessuna convenzione" description="Un'azienda acquista N posti: i suoi dipendenti entrano gratis fin lì, oltre pagano la tariffa convenzionata sul conto dell'azienda."
          action={isManager ? <BottoneScrittura variant="outline" onClick={() => setAperta('nuova')}>Nuova convenzione</BottoneScrittura> : undefined} filtrato={!isManager} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{conv.map((c) => (
          <li key={c.id}><Card className="flex h-full flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-title text-foreground">{nomeCliente(clienti, c.cliente_id) ?? '…'}</p><p className="text-sm text-muted-foreground">{c.codice} · dal {fmtData(c.dal)}{c.al ? ` al ${fmtData(c.al)}` : ''}</p></div>
              <Badge tone={c.attiva ? 'success' : 'neutral'}>{c.attiva ? 'Attiva' : 'Chiusa'}</Badge>
            </div>
            <p className="text-sm text-foreground">{c.posti_acquistati} posti · {fmtEuro(c.canone_mensile)} al mese · fattura {c.fatturazione}{c.fatturato_fino ? ` · fatturata fino al ${fmtData(c.fatturato_fino)}` : ''}</p>
            <div className="mt-auto flex flex-wrap justify-end gap-2">
              {isManager && <Button size="sm" variant="ghost" onClick={() => setAperta(c)}><Pencil className="h-3.5 w-3.5" /> Modifica</Button>}
              <Button size="sm" variant="outline" onClick={() => setScheda(c.id)}>Utilizzi e dipendenti</Button>
            </div>
          </Card></li>))}</ul>
      )}
      {aperta && <ConvenzioneDialog key={aperta === 'nuova' ? 'nuova' : aperta.id} convenzione={aperta === 'nuova' ? null : aperta} onClose={() => setAperta(null)} />}
      {scheda && <SchedaConvenzione convenzione={conv.find((c) => c.id === scheda)!} cliente={nomeCliente(clienti, conv.find((c) => c.id === scheda)?.cliente_id) ?? ''} onClose={() => setScheda(null)} />}
    </div>
  )
}

function ConvenzioneDialog({ convenzione: c, onClose }: { convenzione: Convenzione | null; onClose: () => void }) {
  const { strutturaId } = useGarage()
  const { clienti } = useAnagrafica()
  const { data: tariffe = [] } = useElenco<Tariffario>('gar_tariffari', { filtri: { struttura_id: c?.struttura_id ?? strutturaId, attivo: true } })
  const salva = useSalva('gar_convenzioni')
  const [f, setF] = useState({ cliente: c?.cliente_id ?? '', posti: String(c?.posti_acquistati ?? 5), tariffa: c?.tariffario_id ?? 'nessuna', canone: campoNumero(c?.canone_mensile ?? null),
    dal: c?.dal ?? oggiIso(), al: c?.al ?? '', fatturazione: c?.fatturazione ?? 'mensile', attiva: c?.attiva ?? true, note: c?.note ?? '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const aziende = clienti.filter((k) => k.tipo === 'azienda')
  const salvaConv = () => {
    if (!f.cliente) { toast.error('Scegli l\'azienda'); return }
    salva.mutate({ id: c?.id, values: { struttura_id: c?.struttura_id ?? strutturaId!, cliente_id: f.cliente, posti_acquistati: Math.max(1, Math.round(numero(f.posti))),
      tariffario_id: f.tariffa === 'nessuna' ? null : f.tariffa, canone_mensile: numero(f.canone), dal: f.dal, al: f.al || null, fatturazione: f.fatturazione, attiva: f.attiva,
      note: f.note.trim() || null } }, { onSuccess: () => { toast.success(c ? 'Convenzione aggiornata' : 'Convenzione attiva: ora i dipendenti autorizzati'); onClose() }, onError: (e) => toast.error(messaggioErrore(e)) })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{c ? `Convenzione ${c.codice}` : 'Nuova convenzione'}</DialogTitle>
          <DialogDescription>Dentro i posti acquistati la sosta è compresa nel canone; oltre, si paga la tariffa convenzionata e va in fattura all'azienda.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5"><Label htmlFor="cv-az">Azienda</Label>
            <Select value={f.cliente} onValueChange={(v) => setF({ ...f, cliente: v })} disabled={!!c}><SelectTrigger id="cv-az"><SelectValue placeholder={aziende.length ? 'Scegli l\'azienda' : 'Prima crea un cliente azienda'} /></SelectTrigger>
              <SelectContent>{aziende.map((k) => <SelectItem key={k.id} value={k.id}>{k.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="cv-posti">Posti acquistati</Label><Input id="cv-posti" inputMode="numeric" value={f.posti} onChange={set('posti')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="cv-can">Canone al mese (€)</Label><Input id="cv-can" inputMode="decimal" value={f.canone} onChange={set('canone')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="cv-fat">Fatturazione</Label>
            <Select value={f.fatturazione} onValueChange={(v) => setF({ ...f, fatturazione: v })}><SelectTrigger id="cv-fat"><SelectValue /></SelectTrigger>
              <SelectContent>{[['mensile', 'Mensile'], ['trimestrale', 'Trimestrale'], ['annuale', 'Annuale']].map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="cv-tar">Tariffa oltre i posti</Label>
            <Select value={f.tariffa} onValueChange={(v) => setF({ ...f, tariffa: v })}><SelectTrigger id="cv-tar"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuna">La tariffa convenzionata della struttura</SelectItem>{tariffe.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}{t.convenzionato ? ' (convenzionata)' : ''}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="cv-dal">Dal</Label><Input id="cv-dal" type="date" value={f.dal} onChange={set('dal')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="cv-al">Al (scadenza)</Label><Input id="cv-al" type="date" value={f.al} onChange={set('al')} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="cv-note">Note e condizioni</Label><Input id="cv-note" value={f.note} onChange={set('note')} /></div>
          {c && <label className="col-span-6 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.attiva} onCheckedChange={(v) => setF({ ...f, attiva: v === true })} /> Attiva</label>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <BottoneScrittura onClick={salvaConv} disabled={salva.isPending}>{c ? 'Salva' : 'Crea la convenzione'}</BottoneScrittura>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface Consuntivo {
  posti_acquistati: number; dentro_adesso: number; autorizzati: number; accessi: number; ore: number; oltre_i_posti: number; a_consumo: number; ricariche: number
  da_fatturare: number; fatturato_fino: string | null; veicoli: { targa: string; accessi: number; ore: number; importo: number }[]
}

function SchedaConvenzione({ convenzione: c, cliente, onClose }: { convenzione: Convenzione; cliente: string; onClose: () => void }) {
  const { isManager } = useAuth()
  const [dal, setDal] = useState(piuGiorni(oggiIso(), -29))
  const [al, setAl] = useState(oggiIso())
  const [numeroFattura, setNumeroFattura] = useState('')
  const [aut, setAut] = useState<Autorizzazione | 'nuova' | null>(null)
  const { data: k } = useRpc<Consuntivo>('gar_convenzione_consuntivo', { p_convenzione: c.id, p_dal: dal, p_al: al })
  const { data: dip = [] } = useElenco<Autorizzazione>('gar_autorizzazioni', { filtri: { convenzione_id: c.id }, ordine: [{ colonna: 'persona' }] })
  const fattura = useAzione('gar_fattura_convenzione', ['gar_convenzioni', 'gar_soste', 'gar_ricariche', 'fatture'])
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{cliente} · {c.codice}</DialogTitle>
          <DialogDescription>{c.posti_acquistati} posti acquistati · {fmtEuro(c.canone_mensile)} al mese</DialogDescription></DialogHeader>
        <Tabs defaultValue="consuntivo">
          <TabsList className="mb-3"><TabsTrigger value="consuntivo">Consuntivo</TabsTrigger><TabsTrigger value="dipendenti">Autorizzati ({dip.length})</TabsTrigger></TabsList>
          <TabsContent value="consuntivo" className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5"><Label htmlFor="cs-dal">Dal</Label><Input id="cs-dal" type="date" value={dal} onChange={(e) => e.target.value && setDal(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="cs-al">Al</Label><Input id="cs-al" type="date" value={al} onChange={(e) => e.target.value && setAl(e.target.value)} /></div>
            </div>
            {!k ? <Skeleton className="h-32" /> : <>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {([['Dentro adesso', `${k.dentro_adesso} su ${k.posti_acquistati}`], ['Accessi', fmtNumero(k.accessi)], ['Ore di sosta', fmtNumero(k.ore, 1)], ['Oltre i posti', fmtNumero(k.oltre_i_posti)],
                   ['Soste a consumo', fmtEuro(k.a_consumo)], ['Ricariche', fmtEuro(k.ricariche)], ['Da fatturare', fmtEuro(k.da_fatturare)], ['Fatturato fino al', fmtData(k.fatturato_fino)]] as const).map(([l, v]) => (
                  <div key={l}><dt className="text-muted-foreground">{l}</dt><dd className="font-medium tabular-nums text-foreground">{v}</dd></div>))}
              </dl>
              {k.veicoli.length > 0 && <div className="max-h-48 overflow-auto"><Table>
                <TableHeader><TableRow><TableHead>Targa</TableHead><TableHead numerica>Accessi</TableHead><TableHead numerica>Ore</TableHead><TableHead numerica>A consumo</TableHead></TableRow></TableHeader>
                <TableBody>{k.veicoli.map((v) => <TableRow key={v.targa}><TableCell className="font-mono">{v.targa}</TableCell><TableCell numerica>{v.accessi}</TableCell>
                  <TableCell numerica>{fmtNumero(v.ore, 1)}</TableCell><TableCell numerica>{fmtEuro(v.importo)}</TableCell></TableRow>)}</TableBody></Table></div>}
            </>}
            {isManager && (
              <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
                <div className="space-y-1.5"><Label htmlFor="cs-num">Numero della fattura</Label><Input id="cs-num" value={numeroFattura} onChange={(e) => setNumeroFattura(e.target.value)} placeholder="2026/123" /></div>
                <BottoneScrittura variant="outline" disabled={!numeroFattura.trim() || fattura.isPending} onClick={() => fattura.mutate({ p_convenzione: c.id, p_al: al, p_numero: numeroFattura.trim() }, {
                  onSuccess: () => { toast.success('Fattura emessa: la trovi in Amministrazione'); setNumeroFattura('') }, onError: (e) => toast.error(messaggioErrore(e)) })}>
                  <FileText className="h-4 w-4" /> Fattura fino al {fmtData(al)}</BottoneScrittura>
                <p className="w-full text-xs text-muted-foreground">Comprende i mesi di canone non ancora fatturati, le soste oltre i posti e le ricariche: nulla si fattura due volte.</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="dipendenti">
            <div className="mb-2 flex justify-end"><BottoneScrittura size="sm" variant="outline" onClick={() => setAut('nuova')}><Plus className="h-3.5 w-3.5" /> Autorizza un dipendente</BottoneScrittura></div>
            {dip.length === 0 ? <p className="text-sm text-muted-foreground">Nessun dipendente autorizzato: indica persona e targa di chi può entrare.</p> : (
              <ul className="max-h-72 divide-y divide-border overflow-y-auto text-sm">{dip.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-2"><span className="font-medium text-foreground">{a.persona ?? '—'}</span><span className="font-mono">{a.targa ?? ''}</span>
                  <span className="text-muted-foreground">{testoFasce(a.fasce)}</span>{!a.attiva && <Badge tone="neutral">Revocata</Badge>}
                  <Button size="sm" variant="ghost" className="ml-auto" aria-label="Modifica" onClick={() => setAut(a)}><Pencil className="h-3.5 w-3.5" /></Button></li>))}</ul>
            )}
          </TabsContent>
        </Tabs>
        {aut && <AutorizzazioneDialog key={aut === 'nuova' ? 'nuova' : aut.id} open onOpenChange={(o) => !o && setAut(null)} clienteId={c.cliente_id} convenzioneId={c.id}
          autorizzazione={aut === 'nuova' ? null : aut} />}
      </DialogContent>
    </Dialog>
  )
}

// ── Incassi ─────────────────────────────────────────────────────────────
/** Rimborso dell'eccedenza (anticipo più alto della sosta). */
const Rimborso: EstensioneConto = ({ conto, residuo }) => <RimborsoConto conto={conto} residuo={residuo} />

function RimborsoConto({ conto, residuo }: { conto: Tables<'conti'>; residuo: number }) {
  const rimborsa = useInserisci('conti_rimborsi', ['conti', 'conti_saldi', 'conti_rimborsi'])
  const [metodo, setMetodo] = useState<Metodo>('contanti')
  if (residuo >= -0.005) return null
  return (
    <div className="border-t border-border pt-4">
      <h3 className="mb-1 flex items-center gap-2 text-title text-foreground"><Undo2 className="h-4 w-4" /> Da restituire</h3>
      <p className="mb-2 text-sm text-muted-foreground">Il cliente ha versato {fmtEuro(-residuo)} più del conto.</p>
      <div className="flex gap-2">
        <Select value={metodo} onValueChange={(v) => setMetodo(v as Metodo)}>
          <SelectTrigger aria-label="Metodo del rimborso"><SelectValue /></SelectTrigger>
          <SelectContent>{[['contanti', 'Contanti'], ['pos', 'POS'], ['carta', 'Carta'], ['bonifico', 'Bonifico']].map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <BottoneScrittura variant="outline" disabled={rimborsa.isPending}
          onClick={() => rimborsa.mutate({ conto_id: conto.id, modulo: 'garage', importo: Math.round(-residuo * 100) / 100, metodo, motivo: 'Eccedenza rimborsata' }, {
            onSuccess: () => toast.success(`${fmtEuro(-residuo)} restituiti: ora il conto si chiude`), onError: (e) => toast.error(messaggioErrore(e)) })}>Restituisci</BottoneScrittura>
      </div>
    </div>
  )
}

export function IncassiGaragePage() {
  return <ConStruttura><Incassi_ /></ConStruttura>
}

function Incassi_() {
  const [params, setParams] = useSearchParams()
  const scheda = params.get('conto') ? 'cassa' : (params.get('scheda') ?? 'cassa')
  return (
    <div>
      <PageHeader title="Incassi" description="Cassa del giorno con soste, servizi e ricariche da incassare; canoni degli abbonamenti, insoluti e rimborsi." actions={<SelettoreStruttura />} />
      <Tabs value={scheda} onValueChange={(v) => setParams({ scheda: v })}>
        <TabsList className="mb-4"><TabsTrigger value="cassa">Cassa</TabsTrigger><TabsTrigger value="rate">Canoni e insoluti</TabsTrigger></TabsList>
        <TabsContent value="cassa"><CassaSezione modulo="garage" estensione={Rimborso} />
          <p className="mt-3 text-xs text-muted-foreground">Ricevuta e fattura si emettono dal conto; lo scontrino fiscale e i pagamenti online sono predisposti. Le note di credito si fanno dalle fatture in Amministrazione.</p></TabsContent>
        <TabsContent value="rate"><Canoni /></TabsContent>
      </Tabs>
    </div>
  )
}

function Canoni() {
  const { strutturaId } = useGarage()
  const { clienti } = useAnagrafica()
  const [vista, setVista] = useState<'da_pagare' | 'insoluta' | 'pagata'>('da_pagare')
  const { data: contratti = [] } = useElenco<Pick<Contratto, 'id'>>('gar_contratti', { filtri: { struttura_id: strutturaId }, select: 'id' })
  const ids = contratti.map((c) => c.id)
  const { data: rate = [], isLoading } = useElenco<Rata>('gar_rate', { filtri: { contratto_id: ids, stato: vista }, ordine: [{ colonna: 'scadenza', crescente: vista !== 'pagata' }],
    limite: 200, abilitato: ids.length > 0 })
  const totale = rate.reduce((s, r) => s + Number(r.importo), 0)
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filtra">
        {([['da_pagare', 'Da pagare'], ['insoluta', 'Insolute'], ['pagata', 'Pagate']] as const).map(([k, l]) => (
          <Button key={k} size="sm" variant={vista === k ? 'default' : 'outline'} aria-pressed={vista === k} onClick={() => setVista(k)}>{l}</Button>))}
        <span className="ml-auto text-sm text-muted-foreground">{rate.length} rate · {fmtEuro(totale)}</span>
      </div>
      {isLoading && ids.length > 0 ? <Skeleton className="h-48" /> : rate.length === 0 ? (
        <EmptyState icon={KeyRound} filtrato title="Nessuna rata" description={vista === 'insoluta' ? 'Nessun insoluto: bene.' : 'Le rate nascono dai contratti, ogni notte per il periodo che comincia.'} />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Periodo</TableHead><TableHead>Scadenza</TableHead><TableHead numerica>Importo</TableHead><TableHead>Stato</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>{rate.map((r) => (
            <TableRow key={r.id}>
              <TableCell><Link to={`/garage/clienti/${r.cliente_id}`} className="text-foreground hover:text-primary-testo">{nomeCliente(clienti, r.cliente_id) ?? '…'}</Link></TableCell>
              <TableCell className="text-sm">{r.descrizione}</TableCell><TableCell>{fmtData(r.scadenza)}</TableCell><TableCell numerica>{fmtEuro(r.importo)}</TableCell>
              <TableCell><Badge tone={RATA_STATO[r.stato].tone}>{RATA_STATO[r.stato].label}</Badge>{r.avviso_il && <span className="block text-xs text-muted-foreground">sollecito il {fmtData(r.avviso_il)}</span>}</TableCell>
              <TableCell className="text-right">{r.stato !== 'pagata' && <IncassaRata rata={r} />}</TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Dieci giorni dopo la scadenza la rata diventa insoluta: il cliente riceve il sollecito e l'abbonamento non vale più per entrare finché non paga.</p>
    </div>
  )
}
