/**
 * Cassa e conti (fondamenta F0.3), condivisa da Ristorante, Bar, Hotel,
 * Palestra, Fioraio e Garage. Il conto non è un documento fiscale: lo
 * scontrino passa dal registratore telematico (campo di aggancio pronto).
 * Totale, pagato e residuo li calcola il database; un conto si chiude solo
 * a saldo zero e poi non cambia più.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Banknote, CircleCheck, Lock, Receipt, Scissors, SplitSquareHorizontal, Ticket, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { cn } from '@/lib/utils'
import { supabase, type Tables } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useElenco, useInserisci, useSalva, useAzione, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'

type Conto = Tables<'conti'>
type Riga = Tables<'conti_righe'>
type Pagamento = Tables<'conti_pagamenti'>
type Sessione = Tables<'cassa_sessioni'>
type Saldo = Database['public']['Views']['conti_saldi']['Row']
type Metodo = Pagamento['metodo']

const TABELLE = ['conti', 'conti_righe', 'conti_pagamenti', 'conti_saldi', 'cassa_sessioni', 'fb_comande', 'gift_card_saldi', 'coupon_utilizzi']

const METODI: { valore: Metodo; label: string }[] = [
  { valore: 'contanti', label: 'Contanti' }, { valore: 'pos', label: 'POS' }, { valore: 'carta', label: 'Carta' },
  { valore: 'bonifico', label: 'Bonifico' }, { valore: 'online', label: 'Pagamento online' }, { valore: 'buono', label: 'Buono pasto' },
  { valore: 'gift_card', label: 'Gift card' }, { valore: 'addebito_conto', label: 'Addebito su altro conto' },
  { valore: 'conto_aziendale', label: 'Conto aziendale' }, { valore: 'altro', label: 'Altro' },
]
const etichettaMetodo = (m: string) => METODI.find((x) => x.valore === m)?.label ?? m
const euro = (n: number | string | null | undefined) =>
  n === null || n === undefined ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n))

/** Aggiunte del modulo al conto scelto (es. l'addebito in convenzione del Bar). */
export type EstensioneConto = (ctx: { conto: Tables<'conti'>; residuo: number }) => ReactNode

export function CassaSezione({ modulo, estensione }: { modulo: string; estensione?: EstensioneConto }) {
  const [params, setParams] = useSearchParams()
  const contoId = params.get('conto')
  useDalVivo(['fb_comande_righe', 'fb_comande'])
  const { data: conti = [], isLoading } = useElenco<Conto>('conti', { filtri: { modulo, stato: 'aperto' }, ordine: [{ colonna: 'aperto_at' }] })
  const { data: saldi = [] } = useElenco<Saldo>('conti_saldi', { filtri: { modulo, stato: 'aperto' } })
  const saldo = (id: string) => saldi.find((s) => s.conto_id === id)
  const scelto = useMemo(() => conti.find((c) => c.id === contoId) ?? null, [conti, contoId])

  return (
    <div className="space-y-5">
      <SessioneCassa modulo={modulo} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden">
          <h2 className="border-b border-border px-4 py-3 text-label uppercase text-muted-foreground">Conti aperti ({conti.length})</h2>
          {conti.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nessun conto aperto.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
              {conti.map((c) => {
                const s = saldo(c.id)
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => setParams({ conto: c.id })} aria-current={c.id === contoId}
                      className={cn('flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/50',
                        c.id === contoId && 'bg-muted')}>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{c.descrizione ?? c.codice}</span>
                        <span className="block font-mono text-xs text-muted-foreground">{c.codice}</span>
                      </span>
                      <span className="text-right tabular-nums">
                        <span className="block font-medium text-foreground">{euro(s?.totale)}</span>
                        {s && Number(s.pagato) > 0 && <span className="block text-xs text-muted-foreground">resta {euro(s.residuo)}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
        {scelto ? <DettaglioConto conto={scelto} conti={conti} modulo={modulo} estensione={estensione} onChiuso={() => setParams({})} />
          : isLoading && contoId ? <Skeleton className="h-64" />
          : <EmptyState icon={Receipt} filtrato title="Scegli un conto" description="A sinistra i conti aperti: tavoli, banco, camere, clienti." />}
      </div>
    </div>
  )
}

function SessioneCassa({ modulo }: { modulo: string }) {
  const { data: sessioni = [] } = useElenco<Sessione>('cassa_sessioni', { filtri: { modulo, stato: 'aperta' } })
  const apri = useInserisci('cassa_sessioni')
  const chiudi = useAzione('chiudi_sessione_cassa', ['cassa_sessioni'])
  const [fondo, setFondo] = useState('100')
  const [contati, setContati] = useState('')
  const s = sessioni[0]
  const { data: contanti = [] } = useElenco<Pick<Pagamento, 'importo'>>('conti_pagamenti', {
    filtri: { sessione_id: s?.id, metodo: 'contanti' }, select: 'importo', abilitato: !!s,
  })
  const attesi = s ? Number(s.fondo_iniziale) + contanti.reduce((x, p) => x + Number(p.importo), 0) : 0

  if (!s) {
    return (
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> Cassa chiusa</div>
        <div className="w-36 space-y-1.5"><Label htmlFor="cs-fondo">Fondo cassa (€)</Label>
          <Input id="cs-fondo" inputMode="decimal" value={fondo} onChange={(e) => setFondo(e.target.value)} /></div>
        <BottoneScrittura onClick={() => apri.mutate({ modulo, postazione: 'Cassa', fondo_iniziale: Number(fondo.replace(',', '.')) || 0 },
          { onSuccess: () => toast.success('Cassa aperta'), onError: (e) => toast.error(messaggioErrore(e)) })}>
          <Wallet className="h-4 w-4" /> Apri la cassa
        </BottoneScrittura>
      </Card>
    )
  }
  return (
    <Card className="flex flex-wrap items-end gap-x-6 gap-y-3 p-4">
      <div className="text-sm">
        <p className="font-medium text-foreground">Cassa aperta alle {new Date(s.aperta_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="text-muted-foreground">Fondo {euro(s.fondo_iniziale)} · contanti attesi in cassetto <span className="tabular-nums">{euro(attesi)}</span></p>
      </div>
      <div className="ml-auto flex items-end gap-2">
        <div className="w-36 space-y-1.5"><Label htmlFor="cs-contati">Contanti contati (€)</Label>
          <Input id="cs-contati" inputMode="decimal" value={contati} onChange={(e) => setContati(e.target.value)} /></div>
        <BottoneScrittura variant="outline" disabled={contati === ''}
          onClick={() => chiudi.mutate({ p_sessione: s.id, p_contanti_contati: Number(contati.replace(',', '.')) }, {
            onSuccess: (d) => { setContati(''); toast.success(Number(d) === 0 ? 'Cassa chiusa: torna al centesimo'
              : `Cassa chiusa con una differenza di ${euro(d)}`) },
            onError: (e) => toast.error(messaggioErrore(e)) })}>
          Chiudi la cassa
        </BottoneScrittura>
      </div>
    </Card>
  )
}

function DettaglioConto({ conto, conti, modulo, estensione, onChiuso }: {
  conto: Conto; conti: Conto[]; modulo: string; estensione?: EstensioneConto; onChiuso: () => void
}) {
  const { isManager } = useAuth()
  const { data: righe = [] } = useElenco<Riga>('conti_righe', { filtri: { conto_id: conto.id }, ordine: [{ colonna: 'created_at' }] })
  const { data: pagamenti = [] } = useElenco<Pagamento>('conti_pagamenti', { filtri: { conto_id: conto.id }, ordine: [{ colonna: 'pagato_at' }] })
  const { data: saldi = [] } = useElenco<Saldo>('conti_saldi', { filtri: { conto_id: conto.id } })
  const { data: sessioni = [] } = useElenco<Sessione>('cassa_sessioni', { filtri: { modulo, stato: 'aperta' } })
  const { data: aziende = [] } = useElenco<Pick<Tables<'organizzazioni'>, 'id' | 'ragione_sociale'>>('organizzazioni', {
    filtri: { attivo: true }, select: 'id, ragione_sociale', ordine: [{ colonna: 'ragione_sociale' }], limite: 500,
  })
  const saldo = saldi[0]
  const residuo = Number(saldo?.residuo ?? 0)

  const paga = useInserisci('conti_pagamenti', TABELLE)
  const salvaConto = useSalva('conti', TABELLE)
  const salvaRiga = useSalva('conti_righe', TABELLE)
  const chiudi = useAzione('chiudi_conto', TABELLE)
  const sposta = useAzione('sposta_righe_conto', TABELLE)
  const coupon = useAzione('applica_coupon', TABELLE)

  const [metodo, setMetodo] = useState<Metodo>('contanti')
  const [importo, setImporto] = useState('')
  const [riferimento, setRiferimento] = useState('')
  const [destinazione, setDestinazione] = useState('')
  const [codiceCoupon, setCodiceCoupon] = useState('')
  const [parti, setParti] = useState('2')
  const [quote, setQuote] = useState<number[] | null>(null)
  const [selezione, setSelezione] = useState<string[]>([])
  const [numeroFattura, setNumeroFattura] = useState('')
  useEffect(() => { setImporto(residuo > 0 ? residuo.toFixed(2) : ''); setSelezione([]); setQuote(null) }, [conto.id, residuo])

  const attive = righe.filter((r) => !r.stornata)
  const persone = [...new Set(attive.map((r) => r.persona).filter((p): p is number => p !== null))].sort()

  async function registraPagamento(valore = importo) {
    const n = Number(valore.replace(',', '.'))
    if (!(n > 0)) { toast.error('Importo non valido'); return }
    if (metodo === 'gift_card' && !riferimento.trim()) { toast.error('Scrivi il codice della gift card'); return }
    if (metodo === 'addebito_conto' && !destinazione) { toast.error('Scegli il conto su cui addebitare'); return }
    try {
      await paga.mutateAsync({ conto_id: conto.id, modulo, metodo, importo: n, riferimento: riferimento.trim() || null,
        conto_destinazione_id: metodo === 'addebito_conto' ? destinazione : null,
        organizzazione_id: metodo === 'conto_aziendale' ? conto.organizzazione_id : null, sessione_id: sessioni[0]?.id ?? null })
      toast.success(`${etichettaMetodo(metodo)}: ${euro(n)} registrati`)
      setRiferimento('')
    } catch (e) { toast.error(messaggioErrore(e)) }
  }

  async function chiudiConto(numero?: string) {
    try {
      await chiudi.mutateAsync({ p_conto: conto.id })
      if (numero) {
        const { error } = await supabase.rpc('genera_fattura_da_conto', { p_conto: conto.id, p_numero: numero })
        if (error) toast.error(`Conto chiuso, ma la fattura non è partita: ${messaggioErrore(error)}`)
        else toast.success('Fattura emessa nel modulo amministrativo')
      }
      // Punti fedeltà, se il cliente ha la tessera di questo modulo.
      if (conto.contatto_id) {
        const { data: tessera } = await supabase.from('fid_tessere').select('id').eq('contatto_id', conto.contatto_id)
          .eq('modulo', modulo).eq('attiva', true).maybeSingle()
        if (tessera) {
          const { data } = await supabase.rpc('fid_registra_acquisto', { p_tessera: tessera.id, p_importo: Number(saldo?.totale ?? 0),
            p_rif_tipo: 'conto', p_rif_id: conto.id })
          const esito = data as { punti_aggiunti?: number; premi_disponibili?: number } | null
          if (esito?.punti_aggiunti) toast.success(`+${esito.punti_aggiunti} punti sulla tessera`)
          if (esito?.premi_disponibili) toast.info('Il cliente ha un premio da ritirare')
        }
      }
      toast.success('Conto chiuso')
      onChiuso()
    } catch (e) { toast.error(messaggioErrore(e)) }
  }

  async function dividi() {
    const { data, error } = await supabase.rpc('dividi_conto_in_parti', { p_conto: conto.id, p_parti: Number(parti) })
    if (error) { toast.error(messaggioErrore(error)); return }
    setQuote((data as number[]).map(Number))
  }

  async function separa() {
    if (!selezione.length) return
    try {
      const { data: auth } = await supabase.auth.getUser()
      const { data: nuovo, error } = await supabase.from('conti').insert({
        modulo, descrizione: `${conto.descrizione ?? conto.codice} · separato`, riferimento_tipo: conto.riferimento_tipo,
        riferimento_id: conto.riferimento_id, conto_padre_id: conto.id, created_by: auth.user!.id,
      }).select().single()
      if (error) throw error
      await sposta.mutateAsync({ p_righe: selezione, p_destinazione: nuovo.id })
      toast.success('Righe spostate su un conto separato')
      setSelezione([])
    } catch (e) { toast.error(messaggioErrore(e)) }
  }


  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5">
            <h2 className="text-title text-foreground">{conto.descrizione ?? 'Conto'}</h2>
            <p className="font-mono text-xs text-muted-foreground">{conto.codice}{conto.coperti ? ` · ${conto.coperti} coperti` : ''}</p>
            <Select value={conto.organizzazione_id ?? 'privato'}
              onValueChange={(v) => salvaConto.mutate({ id: conto.id, values: { organizzazione_id: v === 'privato' ? null : v } },
                { onError: (e) => toast.error(messaggioErrore(e)) })}>
              <SelectTrigger className="h-8 w-56 text-xs" aria-label="Intestatario del conto"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="privato">Cliente privato</SelectItem>
                {aziende.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <dl className="flex gap-6 text-right text-sm">
            <div><dt className="text-muted-foreground">Totale</dt><dd data-slot="kpi" className="text-title text-foreground">{euro(saldo?.totale)}</dd></div>
            <div><dt className="text-muted-foreground">Pagato</dt><dd data-slot="kpi" className="text-title text-foreground">{euro(saldo?.pagato)}</dd></div>
            <div><dt className="text-muted-foreground">Resta</dt><dd data-slot="kpi" className={cn('text-title', residuo > 0 ? 'text-foreground' : 'text-success-testo')}>{euro(residuo)}</dd></div>
          </dl>
        </div>

        <ul className="divide-y divide-border text-sm">
          {righe.map((r) => (
            <li key={r.id} className={cn('flex items-center gap-3 py-2', r.stornata && 'text-muted-foreground line-through')}>
              {!r.stornata && (
                <Checkbox checked={selezione.includes(r.id)} aria-label={`Seleziona ${r.descrizione}`}
                  onCheckedChange={(v) => setSelezione(v ? [...selezione, r.id] : selezione.filter((x) => x !== r.id))} />
              )}
              <span className="w-10 text-right tabular-nums">{Number(r.quantita)}×</span>
              <span className="min-w-0 flex-1 truncate">{r.descrizione}</span>
              {!r.stornata && (
                <Select value={r.persona ? String(r.persona) : 'tutti'}
                  onValueChange={(v) => salvaRiga.mutate({ id: r.id, values: { persona: v === 'tutti' ? null : Number(v) } },
                    { onError: (e) => toast.error(messaggioErrore(e)) })}>
                  <SelectTrigger className="h-7 w-28 text-xs" aria-label="Chi paga questa riga"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Da dividere</SelectItem>
                    {Array.from({ length: Math.max(conto.coperti ?? 0, 6) }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>Persona {i + 1}</SelectItem>))}
                  </SelectContent>
                </Select>
              )}
              <span className="w-20 text-right tabular-nums">{euro(r.importo)}</span>
            </li>
          ))}
          {Number(conto.sconto_importo) > 0 && (
            <li className="flex items-center justify-between py-2 text-success-testo"><span>Sconto</span><span className="tabular-nums">− {euro(conto.sconto_importo)}</span></li>
          )}
        </ul>

        {(selezione.length > 0 || persone.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {selezione.length > 0 && (
              <BottoneScrittura size="sm" variant="outline" onClick={separa}><Scissors className="h-3.5 w-3.5" /> Conto separato con {selezione.length} righe</BottoneScrittura>
            )}
            {persone.map((p) => {
              const tot = attive.filter((r) => r.persona === p).reduce((s, r) => s + Number(r.importo), 0)
              return (
                <Button key={p} size="sm" variant="ghost" onClick={() => setImporto(tot.toFixed(2))}>
                  Persona {p}: {euro(tot)}
                </Button>
              )
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h3 className="flex items-center gap-2 text-title text-foreground"><Banknote className="h-4 w-4" /> Pagamento</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Metodo</Label>
              <Select value={metodo} onValueChange={(v) => setMetodo(v as Metodo)}>
                <SelectTrigger aria-label="Metodo di pagamento"><SelectValue /></SelectTrigger>
                <SelectContent>{METODI.filter((m) => m.valore !== 'conto_aziendale' || conto.organizzazione_id)
                  .map((m) => <SelectItem key={m.valore} value={m.valore}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="pg-importo">Importo (€)</Label>
              <Input id="pg-importo" inputMode="decimal" value={importo} onChange={(e) => setImporto(e.target.value)} /></div>
          </div>
          {metodo === 'gift_card' && (
            <div className="space-y-1.5"><Label htmlFor="pg-gift">Codice gift card</Label>
              <Input id="pg-gift" value={riferimento} onChange={(e) => setRiferimento(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX" className="font-mono" /></div>
          )}
          {(metodo === 'pos' || metodo === 'carta' || metodo === 'buono') && (
            <div className="space-y-1.5"><Label htmlFor="pg-rif">Riferimento (facoltativo)</Label>
              <Input id="pg-rif" value={riferimento} onChange={(e) => setRiferimento(e.target.value)} placeholder="Numero transazione o buono" /></div>
          )}
          {metodo === 'addebito_conto' && (
            <div className="space-y-1.5">
              <Label>Addebita su</Label>
              <Select value={destinazione} onValueChange={setDestinazione}>
                <SelectTrigger aria-label="Conto di destinazione"><SelectValue placeholder="Camera, conto aziendale…" /></SelectTrigger>
                <SelectContent>{conti.filter((c) => c.id !== conto.id).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.descrizione ?? c.codice}</SelectItem>))}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Arriva sul conto di destinazione con le sue aliquote IVA.</p>
            </div>
          )}
          <BottoneScrittura className="w-full" onClick={() => registraPagamento()} disabled={paga.isPending || residuo <= 0}>
            Registra {importo ? euro(importo.replace(',', '.')) : ''}
          </BottoneScrittura>
          {pagamenti.length > 0 && (
            <ul className="divide-y divide-border border-t border-border pt-1 text-sm">
              {pagamenti.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-1.5">
                  <span>{etichettaMetodo(p.metodo)}{p.riferimento ? <span className="ml-1 font-mono text-xs text-muted-foreground">{p.riferimento}</span> : null}</span>
                  <span className="tabular-nums">{euro(p.importo)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-title text-foreground"><SplitSquareHorizontal className="h-4 w-4" /> Alla romana</h3>
            <div className="flex items-end gap-2">
              <div className="w-24 space-y-1.5"><Label htmlFor="pg-parti">Persone</Label>
                <Input id="pg-parti" type="number" min={2} value={parti} onChange={(e) => setParti(e.target.value)} /></div>
              <Button variant="outline" onClick={dividi} disabled={residuo <= 0}>Dividi il residuo</Button>
            </div>
            {quote && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quote.map((q, i) => (
                  <Button key={i} size="sm" variant="ghost" onClick={() => setImporto(q.toFixed(2))}>Quota {i + 1}: {euro(q)}</Button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="mb-2 flex items-center gap-2 text-title text-foreground"><Ticket className="h-4 w-4" /> Coupon</h3>
            <div className="flex gap-2">
              <Input value={codiceCoupon} onChange={(e) => setCodiceCoupon(e.target.value)} placeholder="Codice" aria-label="Codice coupon" />
              <BottoneScrittura variant="outline" disabled={!codiceCoupon.trim()}
                onClick={() => coupon.mutate({ p_conto: conto.id, p_codice: codiceCoupon }, {
                  onSuccess: (s) => { toast.success(`Sconto di ${euro(s)} applicato`); setCodiceCoupon('') },
                  onError: (e) => toast.error(messaggioErrore(e)) })}>Applica</BottoneScrittura>
            </div>
          </div>
          {conto.contatto_id && <FedeltaConto conto={conto} modulo={modulo} />}
          {estensione?.({ conto, residuo })}
          {isManager && (
            <div className="border-t border-border pt-4">
              <Label htmlFor="pg-sconto">Sconto o abbuono (€)</Label>
              <div className="mt-1.5 flex gap-2">
                <Input id="pg-sconto" inputMode="decimal" defaultValue={Number(conto.sconto_importo) || ''} key={conto.id}
                  onBlur={(e) => { const n = Number(e.target.value.replace(',', '.')) || 0
                    if (n !== Number(conto.sconto_importo)) salvaConto.mutate({ id: conto.id, values: { sconto_importo: n } },
                      { onError: (err) => toast.error(messaggioErrore(err)) }) }} />
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-muted-foreground">
          {residuo > 0 ? `Mancano ${euro(residuo)} per chiudere il conto.` : 'Conto saldato.'}
          {' '}Lo scontrino si emette dal registratore telematico.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {conto.organizzazione_id && (
            <>
              <Input value={numeroFattura} onChange={(e) => setNumeroFattura(e.target.value)} placeholder="N. fattura" className="w-32" aria-label="Numero fattura" />
              <BottoneScrittura variant="outline" onClick={() => chiudiConto(numeroFattura.trim())}
                disabled={!numeroFattura.trim() || residuo !== 0}>Chiudi e fattura</BottoneScrittura>
            </>
          )}
          <BottoneScrittura onClick={() => chiudiConto()} disabled={residuo !== 0 || chiudi.isPending}>
            <CircleCheck className="h-4 w-4" /> Chiudi il conto
          </BottoneScrittura>
        </div>
      </Card>
    </div>
  )
}

/**
 * Tessera del cliente sul conto: punti spendibili (cashback, sconti) e
 * premio a timbri («10 caffè → 1 omaggio») da togliere dal conto.
 */
function FedeltaConto({ conto, modulo }: { conto: Conto; modulo: string }) {
  const { data: tessere = [] } = useElenco<Database['public']['Views']['fid_saldi']['Row']>('fid_saldi', { filtri: { contatto_id: conto.contatto_id ?? undefined, modulo } })
  const { data: programmi = [] } = useElenco<Tables<'fid_programmi'>>('fid_programmi', { filtri: { modulo } })
  const usa = useAzione('fid_usa_punti_su_conto', ['fid_saldi', 'conti', 'conti_saldi'])
  const omaggio = useAzione('fid_omaggio_su_conto', ['fid_saldi', 'conti', 'conti_saldi'])
  const [punti, setPunti] = useState('')
  const programma = (id: string | null) => programmi.find((p) => p.id === id)
  const t = tessere.find((x) => programma(x.programma_id)?.valore_punto)
  const tt = tessere.find((x) => programma(x.programma_id)?.timbri_soglia)
  if (!t && !tt) return null
  const valore = Number(programma(t?.programma_id ?? null)?.valore_punto ?? 0)
  const soglia = programma(tt?.programma_id ?? null)?.timbri_soglia ?? 0
  return (
    <>
      {t && (
        <div className="border-t border-border pt-4">
          <h3 className="mb-1 text-title text-foreground">Punti della tessera</h3>
          <p className="mb-2 text-sm text-muted-foreground">{t.codice}: {t.punti} punti, valgono {euro((t.punti ?? 0) * valore)}</p>
          <div className="flex gap-2">
            <Input inputMode="numeric" value={punti} onChange={(e) => setPunti(e.target.value)} placeholder="Punti da usare" aria-label="Punti da usare" />
            <BottoneScrittura variant="outline" disabled={!(Number(punti) > 0)} onClick={() => usa.mutate({ p_tessera: t.tessera_id!, p_conto: conto.id, p_punti: Number(punti) },
              { onSuccess: (s) => { toast.success(`Sconto di ${euro(s)} con i punti`); setPunti('') }, onError: (e) => toast.error(messaggioErrore(e)) })}>Usa</BottoneScrittura>
          </div>
        </div>
      )}
      {tt && (
        <div className="border-t border-border pt-4">
          <h3 className="mb-1 text-title text-foreground">Timbri della tessera</h3>
          <p className="mb-2 text-sm text-muted-foreground">
            {tt.codice}: <span className="tabular-nums">{tt.timbri ?? 0} su {soglia}</span>
            {(tt.premi_disponibili ?? 0) > 0 ? ` · ${programma(tt.programma_id)?.premio_timbri ?? 'premio'} da ritirare` : ''}
          </p>
          {(tt.premi_disponibili ?? 0) > 0 && (
            <BottoneScrittura variant="outline" disabled={omaggio.isPending}
              onClick={() => omaggio.mutate({ p_tessera: tt.tessera_id!, p_conto: conto.id },
                { onSuccess: (nome) => toast.success(`${nome} in omaggio: tolto dal conto`), onError: (e) => toast.error(messaggioErrore(e)) })}>
              Applica l'omaggio
            </BottoneScrittura>
          )}
        </div>
      )}
    </>
  )
}
