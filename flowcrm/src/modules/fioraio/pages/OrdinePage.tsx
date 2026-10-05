/**
 * Scheda dell'ordine (documento Fioraio §5–6, §9–10, §22): prodotti e
 * composizioni (anche su misura, con costo e prezzo calcolati), avanzamento
 * da ricevuto a chiuso, destinatario e biglietto stampabile, produzione e
 * consegna, conto di cassa, resi, foto di riferimento e della consegna.
 */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, Check, Flower2, Printer, Receipt, Trash2, Wand2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useElenco, useRiga, useRpc, useSalva, useInserisci, useElimina, useAzione, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { ConNegozio } from '@/modules/fioraio/componenti/ConNegozio'
import {
  useCatalogoFioraio, nomePersona, TABELLE_ORDINE, type Consegna, type Materiale, type Ordine, type Produzione, type Reso, type RigaOrdine, type Stima,
} from '@/modules/fioraio/queries'
import {
  CONSEGNA_STATO, MODALITA, OCCASIONE, ORDINE_SEQUENZA, ORDINE_STATO, PRODUZIONE_STATO, fmtData, fmtEuro, fmtGiornoOra, fmtNumero,
} from '@/modules/fioraio/stati'

export function OrdinePage() {
  return <ConNegozio><Ordine_ /></ConNegozio>
}

function Ordine_() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isManager } = useAuth()
  useDalVivo(['fior_ordini', 'fior_produzione', 'fior_consegne'])
  const { data: o, isLoading } = useRiga<Ordine>('fior_ordini', id)
  const { data: righe = [] } = useElenco<RigaOrdine>('fior_ordini_righe', { filtri: { ordine_id: id }, ordine: [{ colonna: 'created_at' }], abilitato: !!id })
  const { data: produzione = [] } = useElenco<Produzione>('fior_produzione', { filtri: { ordine_id: id }, ordine: [{ colonna: 'created_at' }], abilitato: !!id })
  const { data: consegne = [] } = useElenco<Consegna>('fior_consegne', { filtri: { ordine_id: id }, abilitato: !!id })
  const salva = useSalva('fior_ordini', TABELLE_ORDINE)
  const conto = useAzione('fior_conto_ordine', TABELLE_ORDINE)
  const [annulla, setAnnulla] = useState(false)
  const [motivo, setMotivo] = useState('')

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (!o) {
    return <EmptyState icon={Flower2} title="Ordine non trovato" description="Forse è stato cancellato."
      action={<Button asChild variant="outline"><Link to="/fioraio/ordini">Torna agli ordini</Link></Button>} />
  }
  const st = ORDINE_STATO[o.stato]
  const chiuso = ['consegnato', 'chiuso', 'annullato'].includes(o.stato)
  const consegna = consegne[0]
  const daProdurre = produzione.some((p) => p.stato === 'da_fare' || p.stato === 'in_corso')
  const passa = (stato: Ordine['stato'], messaggio: string) => salva.mutate({ id: o.id, values: { stato } },
    { onSuccess: () => toast.success(messaggio), onError: (e) => toast.error(messaggioErrore(e)) })
  const vaiAlConto = () => conto.mutate({ p_ordine: o.id }, {
    onSuccess: (c) => navigate(`/fioraio/banco?conto=${c}`), onError: (e) => toast.error(messaggioErrore(e)) })

  // Il passo successivo dipende dallo stato: è l'unico pulsante principale della scheda.
  const prossimo = o.stato === 'ricevuto' ? <BottoneScrittura disabled={righe.length === 0} onClick={() => passa('confermato', 'Ordine confermato: produzione e consegna in agenda')}><Check className="h-4 w-4" /> Conferma</BottoneScrittura>
    : (o.stato === 'confermato' || o.stato === 'in_preparazione') && !daProdurre ? <BottoneScrittura onClick={() => passa('pronto', 'Ordine pronto')}><Check className="h-4 w-4" /> Segna pronto</BottoneScrittura>
    : o.stato === 'pronto' && o.modalita !== 'consegna' ? <BottoneScrittura onClick={() => passa('consegnato', 'Consegnato al cliente')}><Check className="h-4 w-4" /> Ritirato dal cliente</BottoneScrittura>
    : o.stato === 'consegnato' ? <BottoneScrittura onClick={vaiAlConto} disabled={conto.isPending}><Receipt className="h-4 w-4" /> Incassa</BottoneScrittura>
    : null

  return (
    <div>
      <PageHeader title={o.committente_nome}
        description={`${o.codice} · ${MODALITA[o.modalita]} per il ${fmtData(o.data_richiesta)}${o.ora_richiesta ? ` alle ${o.ora_richiesta.slice(0, 5)}` : o.fascia ? ` (${o.fascia})` : ''}${o.occasione ? ` · ${OCCASIONE[o.occasione] ?? o.occasione}` : ''}`}
        briciole={[{ label: 'Ordini', to: '/fioraio/ordini' }, { label: o.codice ?? '' }]}
        numeri={[
          { etichetta: 'totale', valore: fmtEuro(o.totale) },
          ...(isManager ? [{ etichetta: 'costo stimato', valore: fmtEuro(o.costo_stimato) },
            { etichetta: 'margine', valore: fmtEuro(Number(o.totale) - Number(o.importo_consegna) - Number(o.costo_stimato)) }] : []),
        ]}
        actions={<>
          <Button variant="outline" onClick={() => navigate('/fioraio/ordini')}><ArrowLeft className="h-4 w-4" /> Ordini</Button>
          {!chiuso && o.stato !== 'consegnato' && righe.length > 0 && <Button variant="outline" onClick={vaiAlConto} disabled={conto.isPending}><Receipt className="h-4 w-4" /> Acconto</Button>}
          {prossimo}
        </>} />

      <ol className="mb-4 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Avanzamento dell'ordine">
        {o.stato === 'annullato' ? <li><Badge tone="neutral">Annullato{o.annullato_motivo ? `: ${o.annullato_motivo}` : ''}</Badge></li>
          : ORDINE_SEQUENZA.filter((s) => s !== 'in_consegna' || o.modalita === 'consegna').map((s) => {
            const fatto = ORDINE_SEQUENZA.indexOf(s) <= ORDINE_SEQUENZA.indexOf(o.stato as (typeof ORDINE_SEQUENZA)[number])
            return <li key={s} aria-current={s === o.stato ? 'step' : undefined}
              className={cn('rounded-full border px-2.5 py-1', s === o.stato ? 'border-primary bg-accent font-medium text-accent-foreground' : fatto ? 'border-border text-foreground' : 'border-dashed border-border text-muted-foreground')}>
              {ORDINE_STATO[s].label}</li>
          })}
        {!['in_consegna', 'consegnato', 'chiuso', 'annullato'].includes(o.stato) && (
          <li className="ml-auto"><Button size="sm" variant="ghost" onClick={() => setAnnulla(!annulla)}><Ban className="h-3.5 w-3.5" /> Annulla l'ordine</Button></li>)}
      </ol>
      {annulla && (
        <Card className="mb-4 flex flex-wrap items-end gap-3 border-destructive p-4">
          <div className="min-w-56 flex-1 space-y-1.5"><Label htmlFor="or-motivo">Motivo dell'annullamento</Label><Input id="or-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus /></div>
          <BottoneScrittura variant="destructive" disabled={!motivo.trim()} onClick={() => salva.mutate({ id: o.id, values: { stato: 'annullato', annullato_motivo: motivo.trim() } },
            { onSuccess: () => { toast.success('Ordine annullato: produzione e consegna tolte'); setAnnulla(false) }, onError: (e) => toast.error(messaggioErrore(e)) })}>Annulla l'ordine</BottoneScrittura>
        </Card>
      )}
      <p className="sr-only" role="status">Stato: {st.label}</p>

      <Tabs defaultValue="prodotti">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="prodotti">Prodotti</TabsTrigger>
          <TabsTrigger value="destinatario">Destinatario e biglietto</TabsTrigger>
          <TabsTrigger value="lavorazione">Produzione e consegna</TabsTrigger>
          <TabsTrigger value="resi">Resi</TabsTrigger>
          <TabsTrigger value="foto">Foto</TabsTrigger>
        </TabsList>
        <TabsContent value="prodotti"><Prodotti ordine={o} righe={righe} bloccato={chiuso} /></TabsContent>
        <TabsContent value="destinatario"><Destinatario ordine={o} bloccato={o.stato === 'chiuso' || o.stato === 'annullato'} /></TabsContent>
        <TabsContent value="lavorazione"><Lavorazione produzione={produzione} consegna={consegna} ordine={o} /></TabsContent>
        <TabsContent value="resi"><Resi ordine={o} righe={righe} /></TabsContent>
        <TabsContent value="foto">
          <Card className="p-5"><AllegatiSection entita="fior_ordini" entitaId={o.id} categorie={['foto di riferimento', 'foto della composizione', 'foto della consegna', 'firma di ricezione', 'altro']} /></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Prodotti ────────────────────────────────────────────────────────────
function Prodotti({ ordine: o, righe, bloccato }: { ordine: Ordine; righe: RigaOrdine[]; bloccato: boolean }) {
  const { articoli, composizioni } = useCatalogoFioraio()
  const inserisci = useInserisci('fior_ordini_righe', TABELLE_ORDINE)
  const salvaRiga = useSalva('fior_ordini_righe', TABELLE_ORDINE)
  const togli = useElimina('fior_ordini_righe', TABELLE_ORDINE)
  const salvaOrdine = useSalva('fior_ordini', TABELLE_ORDINE)
  const [suMisura, setSuMisura] = useState(false)
  const vendibili = articoli.filter((a) => a.vendibile && a.prezzo_vendita !== null)
  const aggiungi = (v: string) => {
    const [tipo, rif] = v.split(':')
    inserisci.mutate(tipo === 'c' ? { ordine_id: o.id, tipo: 'composizione', distinta_id: rif } : { ordine_id: o.id, tipo: 'articolo', articolo_id: rif },
      { onError: (e) => toast.error(messaggioErrore(e)) })
  }

  return (
    <div className="space-y-4">
      {!bloccato && (
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1 space-y-1.5"><Label>Aggiungi dal catalogo</Label>
              <Select value="" onValueChange={aggiungi}>
                <SelectTrigger aria-label="Prodotto o composizione"><SelectValue placeholder={composizioni.length + vendibili.length ? 'Composizione o articolo' : 'Il catalogo è vuoto'} /></SelectTrigger>
                <SelectContent>
                  {composizioni.map((c) => <SelectItem key={c.distinta_id} value={`c:${c.distinta_id}`}>{c.nome} · {fmtEuro(c.prezzo)}{c.realizzabili === 0 ? ' · fiori da ordinare' : ''}</SelectItem>)}
                  {vendibili.map((a) => <SelectItem key={a.id} value={`a:${a.id}`}>{a.descrizione} · {fmtEuro(a.prezzo_vendita)}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <Button variant="outline" onClick={() => setSuMisura(!suMisura)}><Wand2 className="h-4 w-4" /> Composizione su misura</Button>
          </div>
          {composizioni.length + vendibili.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Crea articoli e composizioni in <Link to="/fioraio/catalogo" className="underline underline-offset-2">Catalogo e composizioni</Link>, oppure usa la composizione su misura.</p>)}
          {suMisura && <SuMisura ordineId={o.id} onFatto={() => setSuMisura(false)} />}
        </Card>
      )}

      <Card className="p-5">
        {righe.length === 0 ? <p className="text-sm text-muted-foreground">Ancora nessun prodotto: l'ordine si conferma quando ne ha almeno uno.</p> : (
          <ul className="divide-y divide-border text-sm">
            {righe.map((r) => {
              const richiesta = (r.richiesta ?? {}) as Record<string, string>
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1"><span className="font-medium text-foreground">{r.descrizione}</span>
                    <span className="block text-xs text-muted-foreground">{r.tipo === 'su_misura' ? 'Su misura' : r.tipo === 'composizione' ? 'Composizione' : 'Articolo'}
                      {Object.entries(richiesta).filter(([, v]) => v).map(([k, v]) => ` · ${k}: ${v}`).join('')}</span></span>
                  <Input type="number" min={1} step="1" className="h-8 w-20" defaultValue={Number(r.quantita)} key={`${r.id}-${r.quantita}`} disabled={bloccato} aria-label={`Quantità di ${r.descrizione}`}
                    onBlur={(e) => { const q = Number(e.target.value); if (q > 0 && q !== Number(r.quantita)) salvaRiga.mutate({ id: r.id, values: { quantita: q } }, { onError: (err) => toast.error(messaggioErrore(err)) }) }} />
                  <Input inputMode="decimal" className="h-8 w-24 text-right" defaultValue={Number(r.prezzo_unitario ?? 0).toFixed(2).replace('.', ',')} key={`${r.id}-p-${r.prezzo_unitario}`} disabled={bloccato} aria-label={`Prezzo di ${r.descrizione}`}
                    onBlur={(e) => { const p = Number(e.target.value.replace(',', '.')); if (p >= 0 && p !== Number(r.prezzo_unitario)) salvaRiga.mutate({ id: r.id, values: { prezzo_unitario: p } }, { onError: (err) => toast.error(messaggioErrore(err)) }) }} />
                  <span className="w-20 text-right tabular-nums text-foreground">{fmtEuro(r.importo)}</span>
                  {!bloccato && <Button size="sm" variant="ghost" aria-label={`Togli ${r.descrizione}`} onClick={() => togli.mutate(r.id, { onError: (e) => toast.error(messaggioErrore(e)) })}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </li>
              )
            })}
            {o.modalita === 'consegna' && (
              <li className="flex items-center gap-3 py-2.5"><span className="min-w-0 flex-1 text-foreground">Consegna a domicilio</span>
                <Input inputMode="decimal" className="h-8 w-24 text-right" defaultValue={Number(o.importo_consegna).toFixed(2).replace('.', ',')} key={`cons-${o.importo_consegna}`} disabled={bloccato} aria-label="Costo della consegna"
                  onBlur={(e) => { const p = Number(e.target.value.replace(',', '.')); if (p >= 0 && p !== Number(o.importo_consegna)) salvaOrdine.mutate({ id: o.id, values: { importo_consegna: p } }) }} />
                <span className="w-20" /></li>
            )}
            <li className="flex items-center gap-3 py-2.5"><span className="min-w-0 flex-1 text-foreground">Sconto</span>
              <Input inputMode="decimal" className="h-8 w-24 text-right" defaultValue={Number(o.sconto) ? Number(o.sconto).toFixed(2).replace('.', ',') : ''} key={`sc-${o.sconto}`} disabled={bloccato} aria-label="Sconto in euro"
                onBlur={(e) => { const p = Number(e.target.value.replace(',', '.')) || 0; if (p !== Number(o.sconto)) salvaOrdine.mutate({ id: o.id, values: { sconto: p } }) }} />
              <span className="w-20" /></li>
            <li className="flex items-center justify-between py-2.5 text-foreground"><span className="font-medium">Totale</span><strong className="tabular-nums">{fmtEuro(o.totale)}</strong></li>
          </ul>
        )}
      </Card>
    </div>
  )
}

/** Composizione su misura (§5): richiesta del cliente, materiali, costo e prezzo proposto. */
function SuMisura({ ordineId, onFatto }: { ordineId: string; onFatto: () => void }) {
  const qc = useQueryClient()
  const { articoli } = useCatalogoFioraio()
  const [f, setF] = useState({ descrizione: '', tipo: '', colori: '', fiori: '', dimensioni: '', stile: '', budget: '', accessori: '', note: '', minuti: '20', prezzo: '' })
  const [materiali, setMateriali] = useState<{ articolo_id: string; quantita: number }[]>([])
  const { data: stima } = useRpc<Stima>('fior_stima', { p_materiali: materiali, p_minuti: Number(f.minuti) || 0 })
  const [inCorso, setInCorso] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const art = (id: string) => articoli.find((a) => a.id === id)

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.descrizione.trim()) { toast.error('Dai un nome alla composizione'); return }
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const io = auth.user!.id
      const richiesta = Object.fromEntries(Object.entries({ tipo: f.tipo, colori: f.colori, fiori: f.fiori, dimensioni: f.dimensioni, stile: f.stile, budget: f.budget, accessori: f.accessori, note: f.note })
        .filter(([, v]) => v.trim()))
      const { data: riga, error } = await supabase.from('fior_ordini_righe').insert({
        ordine_id: ordineId, tipo: 'su_misura', descrizione: f.descrizione.trim(), minuti: Number(f.minuti) || 0, richiesta,
        prezzo_unitario: Number((f.prezzo || String(stima?.prezzo ?? 0)).replace(',', '.')) || 0, created_by: io }).select('id').single()
      if (error) throw error
      if (materiali.length) {
        const { error: e2 } = await supabase.from('fior_righe_materiali').insert(materiali.map((m) => ({ ...m, riga_id: riga.id, created_by: io })))
        if (e2) throw e2
      }
      await qc.invalidateQueries({ queryKey: ['fond'] })
      toast.success('Composizione su misura aggiunta')
      onFatto()
    } catch (err) { toast.error(messaggioErrore(err)) } finally { setInCorso(false) }
  }

  return (
    <form onSubmit={crea} className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 md:grid-cols-4">
      <div className="col-span-2 space-y-1.5"><Label htmlFor="sm-desc">Composizione *</Label><Input id="sm-desc" value={f.descrizione} onChange={set('descrizione')} placeholder="Mazzo campestre nei toni del bianco" /></div>
      <div className="space-y-1.5"><Label htmlFor="sm-tipo">Tipo</Label><Input id="sm-tipo" value={f.tipo} onChange={set('tipo')} placeholder="Bouquet, centrotavola…" /></div>
      <div className="space-y-1.5"><Label htmlFor="sm-budget">Budget del cliente (€)</Label><Input id="sm-budget" inputMode="decimal" value={f.budget} onChange={set('budget')} /></div>
      <div className="space-y-1.5"><Label htmlFor="sm-colori">Colori</Label><Input id="sm-colori" value={f.colori} onChange={set('colori')} /></div>
      <div className="space-y-1.5"><Label htmlFor="sm-fiori">Fiori</Label><Input id="sm-fiori" value={f.fiori} onChange={set('fiori')} /></div>
      <div className="space-y-1.5"><Label htmlFor="sm-dim">Dimensioni</Label><Input id="sm-dim" value={f.dimensioni} onChange={set('dimensioni')} /></div>
      <div className="space-y-1.5"><Label htmlFor="sm-stile">Stile</Label><Input id="sm-stile" value={f.stile} onChange={set('stile')} /></div>
      <div className="col-span-2 space-y-1.5"><Label htmlFor="sm-acc">Accessori</Label><Input id="sm-acc" value={f.accessori} onChange={set('accessori')} placeholder="Nastro, carta, vaso" /></div>
      <div className="col-span-2 space-y-1.5"><Label htmlFor="sm-note">Note del cliente</Label><Input id="sm-note" value={f.note} onChange={set('note')} /></div>

      <div className="col-span-2 space-y-2 md:col-span-4">
        <Label>Fiori e materiali che userai</Label>
        <Select value="" onValueChange={(id) => setMateriali((m) => m.some((x) => x.articolo_id === id) ? m : [...m, { articolo_id: id, quantita: 1 }])}>
          <SelectTrigger aria-label="Aggiungi un materiale"><SelectValue placeholder={articoli.length ? 'Aggiungi dal magazzino' : 'Magazzino vuoto: il costo si stima solo dalla manodopera'} /></SelectTrigger>
          <SelectContent>{articoli.map((a) => <SelectItem key={a.id} value={a.id}>{a.descrizione} · {fmtEuro(a.costo_unitario)} / {a.unita_misura}</SelectItem>)}</SelectContent>
        </Select>
        {materiali.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">{materiali.map((m) => (
            <li key={m.articolo_id} className="flex items-center gap-3 px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate text-foreground">{art(m.articolo_id)?.descrizione}</span>
              <Input type="number" min={0.5} step="0.5" className="h-8 w-20" value={m.quantita} aria-label={`Quantità di ${art(m.articolo_id)?.descrizione}`}
                onChange={(e) => setMateriali(materiali.map((x) => x.articolo_id === m.articolo_id ? { ...x, quantita: Math.max(0.5, Number(e.target.value) || 1) } : x))} />
              <span className="w-16 text-xs text-muted-foreground">{art(m.articolo_id)?.unita_misura}</span>
              <Button type="button" size="sm" variant="ghost" aria-label="Togli" onClick={() => setMateriali(materiali.filter((x) => x.articolo_id !== m.articolo_id))}><Trash2 className="h-3.5 w-3.5" /></Button>
            </li>))}</ul>
        )}
      </div>
      <div className="space-y-1.5"><Label htmlFor="sm-min">Minuti di lavoro</Label><Input id="sm-min" type="number" min={0} value={f.minuti} onChange={set('minuti')} /></div>
      <div className="col-span-2 self-end text-sm text-muted-foreground" aria-live="polite">
        {stima ? <>Costo {fmtEuro(stima.costo)} ({fmtEuro(stima.materiali)} di materiali, {fmtEuro(stima.manodopera)} di lavoro) · prezzo proposto <strong className="text-foreground">{fmtEuro(stima.prezzo)}</strong> (ricarico {fmtNumero(stima.ricarico_pct)}%)</> : 'Calcolo…'}
      </div>
      <div className="space-y-1.5"><Label htmlFor="sm-prezzo">Prezzo al cliente (€)</Label><Input id="sm-prezzo" inputMode="decimal" value={f.prezzo} onChange={set('prezzo')} placeholder={stima ? String(stima.prezzo) : ''} /></div>
      <div className="col-span-2 flex justify-end md:col-span-4"><BottoneScrittura type="submit" variant="outline" disabled={inCorso}>Aggiungi all'ordine</BottoneScrittura></div>
    </form>
  )
}

// ── Destinatario e biglietto ────────────────────────────────────────────
function Destinatario({ ordine: o, bloccato }: { ordine: Ordine; bloccato: boolean }) {
  const { zone } = useCatalogoFioraio()
  const salva = useSalva('fior_ordini', TABELLE_ORDINE)
  // `ricerca` è una colonna calcolata: non si scrive.
  type Campi = Omit<Ordine, 'ricerca'>
  const [f, setF] = useState<Partial<Campi> | null>(null)
  const v = { ...o, ...f }
  const set = <K extends keyof Campi>(k: K, val: Campi[K]) => setF({ ...f, [k]: val })
  const testo = (k: 'destinatario_nome' | 'destinatario_telefono' | 'indirizzo' | 'cap' | 'citta' | 'indicazioni' | 'firma' | 'note', etichetta: string, classe = '') => (
    <div className={cn('space-y-1.5', classe)}><Label htmlFor={`ds-${k}`}>{etichetta}</Label>
      <Input id={`ds-${k}`} value={v[k] ?? ''} disabled={bloccato || (k === 'firma' && v.anonimo)} onChange={(e) => set(k, e.target.value || null)} /></div>
  )

  function stampa() {
    const w = window.open('', '_blank', 'width=520,height=400')
    if (!w) { toast.error('Il browser ha bloccato la finestra di stampa'); return }
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
    w.document.write(`<html><head><title>Biglietto ${o.codice}</title><style>body{font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
      .b{max-width:11cm;text-align:center;padding:1cm}.m{font-size:18pt;line-height:1.5;white-space:pre-wrap}.f{margin-top:1cm;font-size:14pt;font-style:italic}.d{margin-bottom:.8cm;font-size:11pt}</style></head>
      <body><div class="b">${v.destinatario_nome ? `<div class="d">Per ${esc(v.destinatario_nome)}</div>` : ''}<div class="m">${esc(v.messaggio ?? '')}</div>
      ${!v.anonimo && v.firma ? `<div class="f">${esc(v.firma)}</div>` : ''}</div></body></html>`)
    w.document.close(); w.focus(); w.print()
    if (!o.biglietto_stampato) salva.mutate({ id: o.id, values: { biglietto_stampato: true } })
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-3 text-title text-foreground">Chi riceve</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {testo('destinatario_nome', 'Destinatario')}{testo('destinatario_telefono', 'Telefono')}
          {testo('indirizzo', 'Indirizzo', 'sm:col-span-2')}{testo('cap', 'CAP')}{testo('citta', 'Città')}
          {testo('indicazioni', 'Indicazioni per chi consegna', 'sm:col-span-2')}
          {o.modalita === 'consegna' && (
            <div className="space-y-1.5"><Label>Zona di consegna</Label>
              <Select value={v.zona_id ?? 'nessuna'} onValueChange={(x) => set('zona_id', x === 'nessuna' ? null : x)} disabled={bloccato}>
                <SelectTrigger aria-label="Zona di consegna"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="nessuna">Fuori zona</SelectItem>{zone.map((z) => <SelectItem key={z.id} value={z.id}>{z.nome} · {fmtEuro(z.importo)}</SelectItem>)}</SelectContent>
              </Select></div>
          )}
          {testo('note', 'Note interne', 'sm:col-span-2')}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Ordina {o.committente_nome}{o.committente_telefono ? ` (${o.committente_telefono})` : ''}; paga chi ordina, salvo diverso intestatario del conto in cassa.</p>
      </Card>
      <Card className="p-5">
        <h3 className="mb-3 text-title text-foreground">Biglietto</h3>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="ds-msg">Messaggio</Label>
            <Textarea id="ds-msg" rows={4} value={v.messaggio ?? ''} disabled={bloccato} onChange={(e) => set('messaggio', e.target.value || null)} /></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {testo('firma', 'Firma')}
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground"><Checkbox checked={v.anonimo} disabled={bloccato} onCheckedChange={(x) => set('anonimo', x === true)} />Messaggio anonimo</label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{o.biglietto_stampato ? 'Biglietto già stampato.' : v.messaggio ? 'Da stampare prima della consegna.' : 'Nessun messaggio.'}</span>
            <Button variant="outline" onClick={stampa} disabled={!v.messaggio}><Printer className="h-4 w-4" /> Stampa il biglietto</Button>
          </div>
        </div>
      </Card>
      {!bloccato && (
        <div className="flex justify-end xl:col-span-2">
          <BottoneScrittura variant="outline" disabled={!f || salva.isPending} onClick={() => salva.mutate({ id: o.id, values: f! }, {
            onSuccess: () => { toast.success('Dati aggiornati'); setF(null) }, onError: (e) => toast.error(messaggioErrore(e)) })}>Salva le modifiche</BottoneScrittura>
        </div>
      )}
    </div>
  )
}

// ── Produzione e consegna ───────────────────────────────────────────────
function Lavorazione({ produzione, consegna, ordine: o }: { produzione: Produzione[]; consegna?: Consegna; ordine: Ordine }) {
  const { persone } = useCatalogoFioraio()
  const { data: materiali = [] } = useElenco<Materiale>('fior_righe_materiali', { filtri: { riga_id: produzione.map((p) => p.riga_id) }, abilitato: produzione.length > 0 })
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-3 text-title text-foreground">Produzione</h3>
        {produzione.length === 0 ? <p className="text-sm text-muted-foreground">{o.stato === 'ricevuto' ? 'Le commesse nascono alla conferma dell\'ordine.' : 'Nessuna composizione da produrre.'}</p> : (
          <ul className="divide-y divide-border text-sm">{produzione.map((p) => {
            const st = PRODUZIONE_STATO[p.stato]
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="min-w-0 flex-1"><span className="font-medium text-foreground">{p.descrizione} × {fmtNumero(p.quantita)}</span>
                  <span className="block text-xs text-muted-foreground">{p.codice}{p.minuti_previsti ? ` · ${p.minuti_previsti} min previsti` : ''}{p.minuti_effettivi != null ? ` · ${p.minuti_effettivi} effettivi` : ''}
                    {nomePersona(persone, p.operatore_id) ? ` · ${nomePersona(persone, p.operatore_id)}` : ''}{materiali.some((m) => m.riga_id === p.riga_id) ? ' · con materiali su misura' : ''}</span></span>
                <Badge tone={st.tone}>{st.label}</Badge>
              </li>
            )
          })}</ul>
        )}
        <Button asChild variant="link" className="mt-2 px-0"><Link to="/fioraio/produzione">Vai al laboratorio</Link></Button>
      </Card>
      <Card className="p-5">
        <h3 className="mb-3 text-title text-foreground">{o.modalita === 'consegna' ? 'Consegna' : 'Ritiro'}</h3>
        {o.modalita !== 'consegna' ? <p className="text-sm text-muted-foreground">Il cliente ritira in negozio il {fmtData(o.data_richiesta)}{o.ora_richiesta ? ` alle ${o.ora_richiesta.slice(0, 5)}` : ''}.</p>
          : !consegna ? <p className="text-sm text-muted-foreground">La consegna entra in agenda alla conferma dell'ordine.</p> : (
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Stato</dt><dd><Badge tone={CONSEGNA_STATO[consegna.stato].tone}>{CONSEGNA_STATO[consegna.stato].label}</Badge></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Quando</dt><dd className="text-foreground">{fmtData(consegna.data)}{consegna.fascia ? ` · ${consegna.fascia}` : ''}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Chi consegna</dt><dd className="text-foreground">{nomePersona(persone, consegna.autista_id) ?? 'da assegnare'}{consegna.veicolo ? ` · ${consegna.veicolo}` : ''}</dd></div>
              {consegna.consegnata_at && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Consegnata</dt><dd className="text-foreground">{fmtGiornoOra(consegna.consegnata_at)}{consegna.ricevuta_da ? ` a ${consegna.ricevuta_da}` : ''}</dd></div>}
              {consegna.esito && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Esito</dt><dd className="text-foreground">{consegna.esito}</dd></div>}
            </dl>
          )}
        {o.modalita === 'consegna' && <Button asChild variant="link" className="mt-2 px-0"><Link to="/fioraio/consegne">Vai alle consegne</Link></Button>}
      </Card>
    </div>
  )
}

// ── Resi ────────────────────────────────────────────────────────────────
function Resi({ ordine: o, righe }: { ordine: Ordine; righe: RigaOrdine[] }) {
  const { data: resi = [] } = useElenco<Reso>('fior_resi', { filtri: { ordine_id: o.id }, ordine: [{ colonna: 'created_at' }] })
  const inserisci = useInserisci('fior_resi', TABELLE_ORDINE)
  const [f, setF] = useState({ riga: '', quantita: '1', motivo: '', rivendibile: false })
  const consegnato = ['consegnato', 'chiuso'].includes(o.stato)
  const riga = righe.find((r) => r.id === f.riga)
  return (
    <Card className="p-5">
      {!consegnato ? <p className="text-sm text-muted-foreground">I resi si registrano dopo la consegna.</p> : (
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault()
          if (!f.riga || !f.motivo.trim()) { toast.error('Scegli il prodotto e scrivi il motivo'); return }
          inserisci.mutate({ ordine_id: o.id, riga_id: f.riga, quantita: Number(f.quantita) || 1, motivo: f.motivo.trim(), rivendibile: f.rivendibile }, {
            onSuccess: (x) => { toast.success(`Reso registrato: ${fmtEuro(x.importo)} da restituire dalla cassa${x.rivendibile ? ', merce di nuovo in magazzino' : ''}`); setF({ riga: '', quantita: '1', motivo: '', rivendibile: false }) },
            onError: (err) => toast.error(messaggioErrore(err)) }) }}>
          <div className="min-w-56 flex-1 space-y-1.5"><Label>Prodotto reso</Label>
            <Select value={f.riga} onValueChange={(v) => setF({ ...f, riga: v })}><SelectTrigger aria-label="Prodotto reso"><SelectValue placeholder="Scegli…" /></SelectTrigger>
              <SelectContent>{righe.map((r) => <SelectItem key={r.id} value={r.id}>{r.descrizione} × {fmtNumero(r.quantita)}</SelectItem>)}</SelectContent></Select></div>
          <div className="w-24 space-y-1.5"><Label htmlFor="rs-q">Quantità</Label><Input id="rs-q" type="number" min={1} value={f.quantita} onChange={(e) => setF({ ...f, quantita: e.target.value })} /></div>
          <div className="min-w-56 flex-1 space-y-1.5"><Label htmlFor="rs-m">Motivo</Label><Input id="rs-m" value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Fiori appassiti, misura sbagliata…" /></div>
          {riga?.tipo === 'articolo' && <label className="flex items-center gap-2 pb-2 text-sm text-foreground"><Checkbox checked={f.rivendibile} onCheckedChange={(v) => setF({ ...f, rivendibile: v === true })} />Integro: torna in vendita</label>}
          <BottoneScrittura type="submit" variant="outline" disabled={inserisci.isPending}>Registra il reso</BottoneScrittura>
        </form>
      )}
      {resi.length > 0 && (
        <ul className="mt-4 divide-y divide-border text-sm">{resi.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center gap-3 py-2">
            <span className="min-w-0 flex-1"><span className="text-foreground">{righe.find((r) => r.id === x.riga_id)?.descrizione} × {fmtNumero(x.quantita)}</span>
              <span className="block text-xs text-muted-foreground">{x.motivo} · {fmtData(x.created_at)}</span></span>
            <Badge tone={x.rivendibile ? 'success' : 'warning'}>{x.rivendibile ? 'Tornato in magazzino' : 'Perdita'}</Badge>
            <span className="tabular-nums text-foreground">{fmtEuro(x.importo)}</span>
          </li>))}</ul>
      )}
      {consegnato && <p className="mt-3 text-xs text-muted-foreground">Il rimborso al cliente si fa dalla cassa; fiori e composizioni resi contano tra gli sprechi.</p>}
    </Card>
  )
}
