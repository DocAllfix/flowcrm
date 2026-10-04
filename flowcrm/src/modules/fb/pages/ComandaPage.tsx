/**
 * ComandaPage — la comanda al tavolo, pensata per il tablet (Ristorante
 * §10-11, Bar §8-9). Si compone l'ordine in bozza (quantità,
 * personalizzazioni, allergie, uscita) e lo si invia in un colpo: le
 * portate successive restano trattenute e partono con «Marcia», oppure da
 * sole se le uscite automatiche sono attive. Il prezzo è quello del
 * momento (listini e promozioni della fascia), calcolato dal database.
 */
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Ban, Check, ChefHat, Gift, Minus, Plus, Receipt, RotateCcw, Search, Send, Trash2, Truck, Wine,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { cn } from '@/lib/utils'
import { supabase, type Tables } from '@/lib/supabase'
import { CercaContatto } from '@/components/condivisi/CercaContatto'
import { useSalva, useRiga, useElenco, useInserisci, useDalVivo, fondKeys, messaggioErrore } from '@/lib/queries/fondamenta'
import { useQueryClient } from '@tanstack/react-query'
import { useFb } from '@/modules/fb/contesto'
import {
  RIGA_STATO, CANALE_LABEL, CONSEGNA_STATO, ALLERGENI, etichettaAllergene, etichettaUscita, fmtEuro, fmtOra, minutiDa,
} from '@/modules/fb/stati'
import {
  useCatalogo, useComanda, useMarciaUscita, usePrezzi, useRifaiRiga, useSaldoConto, TABELLE_SERVIZIO,
  type Consegna, type Prodotto, type RigaComanda,
} from '@/modules/fb/queries'

interface Bozza {
  chiave: string
  prodotto: Prodotto
  quantita: number
  personalizzazioni: string
  allergie: string[]
  uscita: number
  differito: boolean
}

export function ComandaPage() {
  const { id } = useParams()
  const { base } = useFb()
  const { data: comanda, isLoading } = useComanda(id)
  useDalVivo(['fb_comande_righe', 'fb_comande'], [['fond', 'fb_comande', 'dettaglio', id], fondKeys.tabella('conti_saldi')])

  if (isLoading) return <div className="flex justify-center py-20"><Spinner etichetta="Caricamento della comanda" dimensione="lg" /></div>
  if (!comanda) {
    return <EmptyState icon={ChefHat} title="Comanda non trovata" description="Forse è già chiusa."
      action={<Button asChild variant="outline"><Link to={`${base}/comande`}>Torna alle comande</Link></Button>} />
  }
  return <Comanda_ comandaId={comanda.id} />
}

function Comanda_({ comandaId }: { comandaId: string }) {
  const { base, localeId } = useFb()
  const qc = useQueryClient()
  const { data: c } = useComanda(comandaId)
  const { categorie, prodotti } = useCatalogo()
  const canalePrezzi = c?.canale === 'telefono' || c?.canale === 'app' ? 'online' : c?.canale ?? 'sala'
  const { data: prezzi = {} } = usePrezzi(localeId, canalePrezzi, c?.tipologia_cliente ?? null)
  const { data: saldo } = useSaldoConto(c?.conto_id)
  const salvaComanda = useSalva('fb_comande', TABELLE_SERVIZIO)
  const salvaRiga = useSalva('fb_comande_righe', TABELLE_SERVIZIO)
  const marcia = useMarciaUscita()
  const rifai = useRifaiRiga()

  const [categoria, setCategoria] = useState<string>('tutte')
  const [cerca, setCerca] = useState('')
  const [bozza, setBozza] = useState<Bozza[]>([])
  const [invio, setInvio] = useState(false)

  const uscitaDi = (p: Prodotto) => categorie.find((k) => k.id === p.categoria_id)?.uscita ?? 1
  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return prodotti.filter((p) => p.stato !== 'sospeso'
      && (categoria === 'tutte' || p.categoria_id === categoria)
      && (!q || `${p.nome} ${p.codice ?? ''}`.toLowerCase().includes(q)))
  }, [prodotti, categoria, cerca])

  if (!c) return null
  const aperta = c.stato === 'aperta'
  const righe = c.righe.filter((r) => !r.padre_id)
  const figli = (r: RigaComanda) => c.righe.filter((x) => x.padre_id === r.id)
  const uscite = [...new Set(righe.map((r) => r.uscita ?? 1))].sort((a, b) => a - b)

  function aggiungi(p: Prodotto) {
    if (p.stato === 'esaurito') { toast.error(`${p.nome} è finito`); return }
    setBozza((b) => {
      const uguale = b.find((x) => x.prodotto.id === p.id && !x.personalizzazioni && x.allergie.length === 0)
      if (uguale) return b.map((x) => x === uguale ? { ...x, quantita: x.quantita + 1 } : x)
      const u = uscitaDi(p)
      const prima = Math.min(u, ...b.map((x) => x.uscita), ...righe.filter((r) => r.stato !== 'annullata').map((r) => r.uscita ?? 1))
      return [...b, { chiave: crypto.randomUUID(), prodotto: p, quantita: 1, personalizzazioni: '', allergie: [],
        uscita: u, differito: u > 0 && u > prima }]
    })
  }
  const aggiorna = (k: string, v: Partial<Bozza>) => setBozza((b) => b.map((x) => x.chiave === k ? { ...x, ...v } : x))

  async function invia() {
    if (!bozza.length) return
    setInvio(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('fb_comande_righe').insert(bozza.map((b) => ({
        comanda_id: c!.id, prodotto_id: b.prodotto.id, quantita: b.quantita,
        personalizzazioni: b.personalizzazioni.trim() || null, allergie: b.allergie, uscita: b.uscita,
        invio: b.differito ? 'differito' : 'immediato', created_by: auth.user!.id,
        // colonne valorizzate dal database (trigger): obbligatorie solo per il tipo
        locale_id: c!.locale_id, modulo: c!.modulo, descrizione: b.prodotto.nome,
      })))
      if (error) throw error
      for (const t of TABELLE_SERVIZIO) qc.invalidateQueries({ queryKey: fondKeys.tabella(t) })
      qc.invalidateQueries({ queryKey: ['fond', 'fb_comande', 'dettaglio', c!.id] })
      toast.success(bozza.some((b) => b.differito) ? 'Inviato: le portate successive aspettano la marcia' : 'Inviato in cucina e al bar')
      setBozza([])
    } catch (e) { toast.error(messaggioErrore(e)) } finally { setInvio(false) }
  }

  const azioneRiga = (r: RigaComanda, values: Partial<RigaComanda>, ok: string) =>
    salvaRiga.mutate({ id: r.id, values }, { onSuccess: () => toast.success(ok), onError: (e) => toast.error(messaggioErrore(e)) })

  const titolo = c.tavolo ? `Tavolo ${c.tavolo.numero}` : `${CANALE_LABEL[c.canale] ?? c.canale} n. ${c.numero}`
  const totaleBozza = bozza.reduce((s, b) => s + b.quantita * (prezzi[b.prodotto.id]?.prezzo ?? Number(b.prodotto.prezzo)), 0)

  return (
    <div>
      <PageHeader title={titolo}
        briciole={[{ label: 'Sala', to: `${base}/sala` }, { label: 'Comande', to: `${base}/comande` }, { label: titolo }]}
        description={[`Comanda n. ${c.numero}`, c.coperti ? `${c.coperti} coperti` : null, `aperta alle ${fmtOra(c.aperta_at)}`,
          c.cliente_nome, c.ritiro_at ? `ritiro alle ${fmtOra(c.ritiro_at)}` : null].filter(Boolean).join(' · ')}
        numeri={[
          { etichetta: 'conto', valore: fmtEuro(saldo?.totale), inCaricamento: !!c.conto_id && !saldo },
          { etichetta: 'pagato', valore: fmtEuro(saldo?.pagato ?? 0) },
          { etichetta: 'minuti', valore: minutiDa(c.aperta_at) },
        ]}
        actions={<>
          <Button variant="outline" asChild><Link to={`${base}/sala`}><ArrowLeft className="h-4 w-4" /> Sala</Link></Button>
          {aperta && c.conto_id && (
            <Button asChild><Link to={`${base}/cassa?conto=${c.conto_id}`}><Receipt className="h-4 w-4" /> Conto e pagamento</Link></Button>
          )}
        </>} />

      {!aperta && (
        <div className="mb-4 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          Comanda {c.stato === 'chiusa' ? 'chiusa' : 'annullata'}{c.chiusa_at ? ` alle ${fmtOra(c.chiusa_at)}` : ''}: si consulta soltanto.
        </div>
      )}
      <ClienteComanda comandaId={c.id} contattoId={c.contatto_id} aperta={aperta} note={c.note} modulo={c.modulo} chiusa={c.stato === 'chiusa'} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* ── Scelta dei prodotti ── */}
        {aperta && (
          <section aria-label="Prodotti" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-48 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca un piatto o una bevanda…" className="pl-9" aria-label="Cerca prodotto" />
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Categorie">
              {[{ id: 'tutte', nome: 'Tutte' }, ...categorie.filter((k) => k.attiva)].map((k) => (
                <button key={k.id} type="button" role="tab" aria-selected={categoria === k.id} onClick={() => setCategoria(k.id)}
                  className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors',
                    categoria === k.id ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground')}>
                  {k.nome}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibili.map((p) => {
                const pr = prezzi[p.id]
                const esaurito = p.stato === 'esaurito'
                return (
                  <button key={p.id} type="button" onClick={() => aggiungi(p)} disabled={esaurito}
                    className={cn('flex min-h-20 flex-col justify-between rounded-lg border border-border bg-card p-3 text-left transition-[box-shadow,border-color]',
                      'hover:border-input hover:shadow-risposta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      esaurito && 'cursor-not-allowed opacity-50')}>
                    <span className="text-sm font-medium leading-snug text-foreground">{p.nome}</span>
                    <span className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">{fmtEuro(pr?.prezzo ?? p.prezzo)}</span>
                      {esaurito ? <span>Finito</span>
                        : pr?.origine?.startsWith('promozione') ? <span className="text-success-testo">{pr.origine.replace('promozione: ', '')}</span>
                        : p.beverage_tipo === 'vino' ? <Wine className="h-3.5 w-3.5" aria-label="Vino" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
            {visibili.length === 0 && (
              <EmptyState compatto filtrato icon={Search} title="Nessun prodotto" description="Cambia categoria o ricerca." />
            )}
          </section>
        )}

        {/* ── Bozza e comanda ── */}
        <section aria-label="Comanda" className="space-y-4">
          {aperta && bozza.length > 0 && (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-title text-foreground">Da inviare</h2>
                <span className="text-sm tabular-nums text-muted-foreground">{fmtEuro(totaleBozza)}</span>
              </div>
              <ul className="divide-y divide-border">
                {bozza.map((b) => (
                  <li key={b.chiave} className="space-y-2 py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{b.prodotto.nome}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Togli ${b.prodotto.nome} dalla bozza`}
                        onClick={() => setBozza((x) => x.filter((y) => y.chiave !== b.chiave))}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center rounded-md border border-border">
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Uno in meno"
                          onClick={() => b.quantita > 1 ? aggiorna(b.chiave, { quantita: b.quantita - 1 }) : setBozza((x) => x.filter((y) => y.chiave !== b.chiave))}>
                          <Minus className="h-3.5 w-3.5" /></Button>
                        <span className="w-6 text-center text-sm tabular-nums">{b.quantita}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Uno in più"
                          onClick={() => aggiorna(b.chiave, { quantita: b.quantita + 1 })}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                      <Select value={String(b.uscita)} onValueChange={(v) => aggiorna(b.chiave, { uscita: Number(v) })}>
                        <SelectTrigger className="h-8 w-32" aria-label="Uscita"><SelectValue /></SelectTrigger>
                        <SelectContent>{[0, 1, 2, 3, 4, 5].map((u) => <SelectItem key={u} value={String(u)}>{etichettaUscita(u)}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value="" onValueChange={(v) => aggiorna(b.chiave, { allergie: b.allergie.includes(v) ? b.allergie.filter((a) => a !== v) : [...b.allergie, v] })}>
                        <SelectTrigger className="h-8 w-40" aria-label="Allergie dichiarate">
                          <span className="truncate">{b.allergie.length ? b.allergie.map(etichettaAllergene).join(', ') : 'Allergie…'}</span>
                        </SelectTrigger>
                        <SelectContent>{ALLERGENI.map((a) => (
                          <SelectItem key={a.valore} value={a.valore}>
                            <span className="flex items-center gap-1.5">
                              {b.allergie.includes(a.valore) && <Check className="h-3.5 w-3.5" aria-label="selezionato" />}{a.label}
                            </span>
                          </SelectItem>
                        ))}</SelectContent>
                      </Select>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Switch checked={b.differito} onCheckedChange={(v) => aggiorna(b.chiave, { differito: v })} aria-label="Trattieni fino alla marcia" />
                        Aspetta la marcia
                      </label>
                    </div>
                    <Input value={b.personalizzazioni} onChange={(e) => aggiorna(b.chiave, { personalizzazioni: e.target.value })}
                      placeholder="Personalizzazione: cottura media, senza rosmarino…" className="h-8 text-sm" aria-label="Personalizzazione" />
                  </li>
                ))}
              </ul>
              <BottoneScrittura className="mt-3 w-full" onClick={invia} disabled={invio}>
                <Send className="h-4 w-4" /> {invio ? 'Invio…' : `Invia ${bozza.reduce((s, b) => s + b.quantita, 0)} ${bozza.length === 1 && bozza[0].quantita === 1 ? 'piatto' : 'piatti'}`}
              </BottoneScrittura>
            </Card>
          )}

          {aperta && bozza.length > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 shadow-sospeso lg:hidden">
              <span className="text-sm text-foreground">{bozza.reduce((x, b) => x + b.quantita, 0)} da inviare · <span className="tabular-nums">{fmtEuro(totaleBozza)}</span></span>
              <BottoneScrittura onClick={invia} disabled={invio}><Send className="h-4 w-4" /> Invia</BottoneScrittura>
            </div>
          )}
          {c.consegna && <SchedaConsegna consegnaId={c.consegna.id} />}

          {righe.length === 0 ? (
            <EmptyState compatto icon={ChefHat} title="Ancora nulla in comanda"
              description={aperta ? 'Tocca i prodotti a sinistra per comporre l\'ordine.' : 'La comanda è stata chiusa senza ordini.'} />
          ) : uscite.map((u) => {
            const gruppo = righe.filter((r) => (r.uscita ?? 1) === u)
            const trattenute = gruppo.filter((r) => r.stato === 'in_attesa').length
            return (
              <Card key={u} className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-label uppercase text-muted-foreground">{etichettaUscita(u)}</h3>
                  {aperta && trattenute > 0 && (
                    <BottoneScrittura size="sm" onClick={() => marcia.mutate({ p_comanda: c.id, p_uscita: u },
                      { onSuccess: () => toast.success(`${etichettaUscita(u)}: via in cucina`), onError: (e) => toast.error(messaggioErrore(e)) })}>
                      <Send className="h-3.5 w-3.5" /> Marcia ({trattenute})
                    </BottoneScrittura>
                  )}
                </div>
                <ul className="divide-y divide-border">
                  {gruppo.map((r) => {
                    const st = RIGA_STATO[r.stato] ?? RIGA_STATO.da_preparare
                    const sotto = figli(r)
                    return (
                      <li key={r.id} className={cn('flex items-start gap-3 py-2.5', r.stato === 'annullata' && 'opacity-60')}>
                        <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">{Number(r.quantita)}×</span>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm font-medium text-foreground', r.stato === 'annullata' && 'line-through')}>
                            {r.descrizione}
                            {r.omaggio && <Gift className="ml-1.5 inline h-3.5 w-3.5 text-success-testo" aria-label="Omaggio" />}
                            {r.rifacimento_di && <RotateCcw className="ml-1.5 inline h-3.5 w-3.5 text-warning-testo" aria-label="Rifacimento" />}
                          </p>
                          {(r.personalizzazioni || r.note) && <p className="text-xs text-muted-foreground">{[r.personalizzazioni, r.note].filter(Boolean).join(' · ')}</p>}
                          {r.allergie.length > 0 && <p className="text-xs font-medium text-destructive-testo">Allergie: {r.allergie.map(etichettaAllergene).join(', ')}</p>}
                          {sotto.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {sotto.map((f) => (
                                <li key={f.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{f.descrizione}</span>
                                  <Badge tone={(RIGA_STATO[f.stato] ?? RIGA_STATO.da_preparare).tone} className="px-1.5 py-0">{(RIGA_STATO[f.stato] ?? RIGA_STATO.da_preparare).label}</Badge>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm tabular-nums text-muted-foreground">{fmtEuro(Number(r.quantita) * Number(r.prezzo_unitario ?? 0))}</span>
                          {sotto.length === 0 && <Badge tone={st.tone}>{st.label}</Badge>}
                          {aperta && r.stato !== 'annullata' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 px-2" aria-label={`Azioni su ${r.descrizione}`}>•••</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {r.stato === 'pronta' && (
                                  <DropdownMenuItem onSelect={() => azioneRiga(r, { stato: 'servita' }, 'Servito')}>Segna servito</DropdownMenuItem>
                                )}
                                {r.stato === 'in_attesa' && (
                                  <DropdownMenuItem onSelect={() => azioneRiga(r, { stato: 'da_preparare' }, 'Inviato in cucina')}>Manda subito</DropdownMenuItem>
                                )}
                                {!r.omaggio && !r.rifacimento_di && (
                                  <DropdownMenuItem onSelect={() => azioneRiga(r, { omaggio: true }, 'Offerto dalla casa')}>
                                    <Gift className="h-4 w-4" /> Offri dalla casa</DropdownMenuItem>
                                )}
                                {(r.stato === 'pronta' || r.stato === 'servita') && !r.padre_id && sotto.length === 0 && (
                                  <>
                                    <DropdownMenuItem onSelect={() => rifai.mutate({ p_riga: r.id, p_motivo: 'restituito' },
                                      { onSuccess: () => toast.success('Rifacimento inviato con priorità'), onError: (e) => toast.error(messaggioErrore(e)) })}>
                                      <RotateCcw className="h-4 w-4" /> Rifai: restituito dal cliente</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => rifai.mutate({ p_riga: r.id, p_motivo: 'errore' },
                                      { onSuccess: () => toast.success('Rifacimento inviato con priorità'), onError: (e) => toast.error(messaggioErrore(e)) })}>
                                      <RotateCcw className="h-4 w-4" /> Rifai: errore</DropdownMenuItem>
                                  </>
                                )}
                                {r.stato !== 'servita' && (
                                  <DropdownMenuItem onSelect={() => azioneRiga(r, { stato: 'annullata' },
                                    r.scaricata ? 'Annullato: il costo finisce tra gli sprechi' : 'Annullato e tolto dal conto')}
                                    className="text-destructive-testo">
                                    <Ban className="h-4 w-4" /> Annulla</DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )
          })}

          {aperta && (
            <Card className="space-y-3 p-4">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium text-foreground">Uscite automatiche</span>
                  <span className="block text-xs text-muted-foreground">Servita un'uscita, la successiva parte da sola dopo la pausa del locale.</span>
                </span>
                <Switch checked={c.uscite_automatiche} onCheckedChange={(v) => salvaComanda.mutate({ id: c.id, values: { uscite_automatiche: v } })} />
              </label>
              <div className="flex items-center justify-between gap-3 text-sm">
                <Label htmlFor="cm-priorita">Priorità del tavolo</Label>
                <Select value={c.priorita} onValueChange={(v) => salvaComanda.mutate({ id: c.id, values: { priorita: v } })}>
                  <SelectTrigger id="cm-priorita" className="h-8 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}

function SchedaConsegna({ consegnaId }: { consegnaId: string }) {
  const salva = useSalva('fb_consegne', TABELLE_SERVIZIO)
  const { data: consegna } = useRiga<Consegna>('fb_consegne', consegnaId)
  if (!consegna) return null
  const st = CONSEGNA_STATO[consegna.stato] ?? CONSEGNA_STATO.da_assegnare
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-title text-foreground"><Truck className="h-4 w-4" /> Consegna</h2>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      <p className="text-sm text-foreground">{consegna.indirizzo}{consegna.citta ? `, ${consegna.citta}` : ''}</p>
      <p className="text-xs text-muted-foreground">
        {[consegna.zona, consegna.fascia_dalle ? `dalle ${fmtOra(consegna.fascia_dalle)}` : null,
          consegna.fascia_alle ? `alle ${fmtOra(consegna.fascia_alle)}` : null, consegna.rider_esterno,
          Number(consegna.costo_consegna) > 0 ? `consegna ${fmtEuro(consegna.costo_consegna)}` : null].filter(Boolean).join(' · ')}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(['assegnata', 'in_consegna', 'consegnata', 'fallita'] as const).map((s) => (
          <Button key={s} size="sm" variant={consegna.stato === s ? 'default' : 'outline'}
            onClick={() => salva.mutate({ id: consegna.id, values: { stato: s } }, { onError: (e) => toast.error(messaggioErrore(e)) })}>
            {CONSEGNA_STATO[s].label}
          </Button>
        ))}
      </div>
    </Card>
  )
}

/** Cliente al tavolo: chi è, cosa non può mangiare, cosa preferisce; a fine servizio il suo parere. */
function ClienteComanda({ comandaId, contattoId, aperta, note, modulo, chiusa }: {
  comandaId: string; contattoId: string | null; aperta: boolean; note: string | null; modulo: string; chiusa: boolean
}) {
  const salva = useSalva('fb_comande', TABELLE_SERVIZIO)
  const parere = useInserisci('feedback')
  const { data: contatti = [] } = useElenco<Pick<Tables<'contatti'>, 'id' | 'nome' | 'cognome'>>('contatti', {
    filtri: { id: contattoId ?? undefined }, select: 'id, nome, cognome', abilitato: !!contattoId })
  const { data: schede = [] } = useElenco<Tables<'fb_clienti'>>('fb_clienti', { filtri: { contatto_id: contattoId ?? undefined }, abilitato: !!contattoId })
  const { data: pareri = [] } = useElenco<Pick<Tables<'feedback'>, 'id' | 'nps'>>('feedback', {
    filtri: { entita_tipo: 'fb_comande', entita_id: comandaId }, select: 'id, nps', abilitato: chiusa })
  const [nome, setNome] = useState('')
  const cliente = contatti[0]
  const scheda = schede[0]

  return (
    <Card className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 p-4 text-sm">
      {cliente ? (
        <div className="min-w-56">
          <span className="text-muted-foreground">Cliente </span><span className="font-medium text-foreground">{cliente.nome} {cliente.cognome ?? ''}</span>
          {scheda && (scheda.allergie.length > 0 || scheda.intolleranze) && (
            <p className="mt-0.5 font-medium text-destructive-testo">Allergie: {[...scheda.allergie.map(etichettaAllergene), scheda.intolleranze].filter(Boolean).join(', ')}</p>
          )}
          {scheda?.preferenze && <p className="text-xs text-muted-foreground">{scheda.preferenze}</p>}
        </div>
      ) : aperta ? (
        <div className="w-72"><CercaContatto id="cm-cliente" valore={nome} contattoId={null} segnaposto="Collega il cliente (storico e allergie)…"
          onTesto={setNome} onScegli={(k) => salva.mutate({ id: comandaId, values: { contatto_id: k.id } }, { onError: (e) => toast.error(messaggioErrore(e)) })} /></div>
      ) : <span className="text-muted-foreground">Cliente non identificato</span>}
      {aperta ? (
        <div className="min-w-60 flex-1"><Input defaultValue={note ?? ''} key={comandaId} placeholder="Nota per la sala e la cucina (compleanno, fretta…)" aria-label="Nota della comanda"
          onBlur={(e) => e.target.value !== (note ?? '') && salva.mutate({ id: comandaId, values: { note: e.target.value || null } })} /></div>
      ) : note ? <span className="text-muted-foreground">Nota: {note}</span> : null}
      {chiusa && (pareri.length ? (
        <span className="text-muted-foreground">Parere registrato: {pareri[0].nps}/10</span>
      ) : (
        <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Com'è andata? Voto da 0 a 10">
          <span className="mr-1 text-muted-foreground">Com'è andata?</span>
          {Array.from({ length: 11 }, (_, i) => (
            <button key={i} type="button" onClick={() => parere.mutate({ modulo, tipo: 'nps', nps: i, contatto_id: contattoId, canale: 'sala',
              entita_tipo: 'fb_comande', entita_id: comandaId }, { onSuccess: () => toast.success('Grazie, parere registrato'), onError: (e) => toast.error(messaggioErrore(e)) })}
              className="size-8 rounded-md border border-border text-xs tabular-nums text-muted-foreground hover:border-input hover:text-foreground">{i}</button>
          ))}
        </div>
      ))}
    </Card>
  )
}
