/**
 * CantinaPage — gestione dei vini e carta vini digitale (Ristorante
 * §23-24). Ogni vino è un articolo di magazzino (giacenza, costo, lotti)
 * con la sua scheda e i prodotti in vendita (bottiglia e, se si serve a
 * calice, il calice: un quinto di bottiglia). Bottiglie vendute e
 * rimanenze vengono dai movimenti.
 */
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Plus, Printer, Wine } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables } from '@/lib/supabase'
import { useElenco, useSalva, useRpc, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'
import { ConLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { fmtEuro, fmtNumero } from '@/modules/fb/stati'
import { useCatalogo, type Vino } from '@/modules/fb/queries'

type Giacenza = Database['public']['Views']['mag_giacenze']['Row']
interface VoceCarta { nome: string; produttore: string | null; annata: number | null; denominazione: string | null; regione: string | null; vitigno: string | null
  tipologia: string | null; formato: string | null; descrizione: string | null; abbinamenti: string | null; prezzo_bottiglia: number | null; prezzo_calice: number | null }
const TIPOLOGIE: Record<string, string> = { rosso: 'Rossi', bianco: 'Bianchi', rosato: 'Rosati', bollicine: 'Bollicine', dolce: 'Dolci', passito: 'Passiti', altro: 'Altri' }
const TIPOLOGIA: Record<string, string> = { rosso: 'Rosso', bianco: 'Bianco', rosato: 'Rosato', bollicine: 'Bollicine', dolce: 'Dolce', passito: 'Passito', altro: 'Altro' }
const n = (s: string) => Number(s.replace(',', '.'))

export function CantinaPage() {
  return <ConLocale><Cantina_ /></ConLocale>
}

function Cantina_() {
  const [scheda, setScheda] = useState('cantina')
  const { isManager } = useAuth()
  const { prodotti } = useCatalogo()
  const { data: vini = [] } = useElenco<Vino>('fb_vini', { ordine: [{ colonna: 'tipologia' }, { colonna: 'ordine' }] })
  const articoliIds = vini.map((v) => v.articolo_id)
  const { data: giacenze = [] } = useElenco<Giacenza>('mag_giacenze', { filtri: { articolo_id: articoliIds }, abilitato: articoliIds.length > 0 })
  const da30 = useMemo(() => new Date(Date.now() - 30 * 86400000).toISOString(), [])
  const { data: vendite = [] } = useElenco<Pick<Tables<'mag_movimenti'>, 'articolo_id' | 'quantita'>>('mag_movimenti', {
    filtri: { articolo_id: articoliIds, tipo: 'vendita' }, tra: { colonna: 'eseguito_at', da: da30 }, select: 'articolo_id, quantita', abilitato: articoliIds.length > 0 })
  const salvaVino = useSalva('fb_vini')
  const g = (id: string) => giacenze.find((x) => x.articolo_id === id)
  const venduteDi = (id: string) => -vendite.filter((m) => m.articolo_id === id).reduce((s, m) => s + Number(m.quantita), 0)
  const prezzo = (id: string | null) => prodotti.find((p) => p.id === id)?.prezzo
  const bottiglie = vini.reduce((s, v) => s + Number(g(v.articolo_id)?.giacenza ?? 0), 0)
  const valore = vini.reduce((s, v) => s + Number(g(v.articolo_id)?.valore ?? 0), 0)

  return (
    <div>
      <PageHeader title="Cantina e carta vini" description="Etichette, annate, giacenze e rotazione; la carta vini si stampa o si mostra al tavolo."
        numeri={[
          { etichetta: 'etichette', valore: vini.length },
          { etichetta: 'in carta', valore: vini.filter((v) => v.in_carta).length },
          { etichetta: 'bottiglie in cantina', valore: fmtNumero(bottiglie) },
          ...(isManager ? [{ etichetta: 'valore della cantina', valore: fmtEuro(valore, 0) }] : []),
        ]} />
      <Tabs value={scheda} onValueChange={setScheda}>
        <TabsList className="mb-4"><TabsTrigger value="cantina">Cantina</TabsTrigger><TabsTrigger value="carta">Carta vini</TabsTrigger>{isManager && <TabsTrigger value="nuovo">Nuovo vino</TabsTrigger>}</TabsList>
        <TabsContent value="cantina">
          {vini.length === 0 ? (
            <EmptyState icon={Wine} title="Cantina vuota"
              description={isManager ? 'Aggiungi i vini: scheda, costo, prezzo a bottiglia e a calice.' : 'I vini li inserisce la direzione: qui compariranno con giacenze e prezzi.'}
              action={isManager ? <Button variant="outline" onClick={() => setScheda('nuovo')}><Plus className="h-4 w-4" /> Aggiungi un vino</Button> : undefined} filtrato={!isManager} />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Vino</TableHead><TableHead>Denominazione</TableHead><TableHead className="text-right">Giacenza</TableHead><TableHead className="text-right">Vendute 30 gg</TableHead>
                  {isManager && <TableHead className="text-right">Costo</TableHead>}<TableHead className="text-right">Bottiglia</TableHead><TableHead className="text-right">Calice</TableHead><TableHead>In carta</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {vini.map((v) => {
                    const gi = g(v.articolo_id)
                    return (
                      <TableRow key={v.id}>
                        <TableCell><span className="font-medium text-foreground">{gi?.descrizione ?? '—'}</span>
                          <span className="block text-xs text-muted-foreground">{[v.produttore ?? v.cantina, v.annata, v.formato].filter(Boolean).join(' · ')}</span></TableCell>
                        <TableCell className="text-muted-foreground">{[v.denominazione, v.regione, v.vitigno].filter(Boolean).join(' · ') || '—'}</TableCell>
                        <TableCell numerica className={gi?.sotto_scorta ? 'text-warning-testo' : undefined}>{fmtNumero(gi?.giacenza, 1)}</TableCell>
                        <TableCell numerica>{fmtNumero(venduteDi(v.articolo_id), 1)}</TableCell>
                        {isManager && <TableCell numerica>{fmtEuro(gi?.costo_unitario)}</TableCell>}
                        <TableCell numerica>{fmtEuro(prezzo(v.prodotto_bottiglia_id))}</TableCell>
                        <TableCell numerica>{fmtEuro(prezzo(v.prodotto_calice_id))}</TableCell>
                        <TableCell><Switch checked={v.in_carta} disabled={!isManager} aria-label="In carta"
                          onCheckedChange={(x) => salvaVino.mutate({ id: v.id, values: { in_carta: x } }, { onError: (e) => toast.error(messaggioErrore(e)) })} /></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="carta"><CartaVini /></TabsContent>
        {isManager && <TabsContent value="nuovo"><NuovoVino /></TabsContent>}
      </Tabs>
    </div>
  )
}

function CartaVini() {
  const { data: voci = [] } = useRpc<VoceCarta[]>('fb_carta_vini', {})
  const gruppi = Object.entries(voci.reduce<Record<string, VoceCarta[]>>((a, v) => { const k = v.tipologia ?? 'altro'; (a[k] ??= []).push(v); return a }, {}))
  return voci.length === 0 ? <EmptyState icon={Wine} title="Carta vuota" description="Metti in carta i vini con un prezzo di vendita." /> : (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <p className="max-w-[70ch] text-sm text-muted-foreground">La stessa carta è pronta per la pagina pubblica da aprire con il QR al tavolo: il collegamento si attiva su richiesta.</p>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Stampa</Button>
      </div>
      <Card className="mx-auto max-w-3xl space-y-8 p-8">
        {gruppi.map(([tipo, elenco]) => (
          <section key={tipo}>
            <h2 className="mb-3 border-b border-border pb-1 text-label uppercase text-muted-foreground">{TIPOLOGIE[tipo] ?? tipo}</h2>
            <ul className="space-y-4">
              {elenco.map((v, i) => (
                <li key={`${v.nome}-${i}`} className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{v.nome}{v.annata ? ` ${v.annata}` : ''}</p>
                    <p className="text-sm text-muted-foreground">{[v.produttore, v.denominazione, v.regione, v.vitigno].filter(Boolean).join(' · ')}</p>
                    {v.descrizione && <p className="mt-0.5 text-sm text-foreground">{v.descrizione}</p>}
                    {v.abbinamenti && <p className="text-xs italic text-muted-foreground">Con: {v.abbinamenti}</p>}
                  </div>
                  <div className="shrink-0 text-right text-sm tabular-nums">
                    {v.prezzo_bottiglia != null && <p className="text-foreground">{fmtEuro(v.prezzo_bottiglia)}</p>}
                    {v.prezzo_calice != null && <p className="text-muted-foreground">calice {fmtEuro(v.prezzo_calice)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Card>
    </div>
  )
}

function NuovoVino() {
  const qc = useQueryClient()
  const { categorie } = useCatalogo()
  const [f, setF] = useState({ nome: '', produttore: '', denominazione: '', annata: '', regione: '', vitigno: '', tipologia: 'rosso', formato: '0,75 l',
    costo: '', prezzo: '', calice: '', temperatura: '', abbinamenti: '', descrizione: '', scorta: '6' })
  const [inCorso, setInCorso] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim() || !(n(f.prezzo) > 0)) { toast.error('Nome e prezzo a bottiglia'); return }
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const io = auth.user!.id
      let categoria = categorie.find((c) => /vin/i.test(c.nome))?.id
      if (!categoria) {
        const { data, error } = await supabase.from('fb_categorie').insert({ nome: 'Vini', area: 'beverage', uscita: 0, created_by: io }).select('id').single()
        if (error) throw error
        categoria = data.id
      }
      const { data: art, error: e1 } = await supabase.from('mag_articoli').insert({ modulo: 'fb', descrizione: f.nome.trim(), categoria: 'Vini', unita_misura: 'bottiglia',
        costo_unitario: n(f.costo) || 0, scorta_minima: n(f.scorta) || 0, aliquota_iva: 22, created_by: io }).select('id').single()
      if (e1) throw e1
      const nomeVendita = `${f.nome.trim()}${f.annata ? ` ${f.annata}` : ''}`
      const { data: bott, error: e2 } = await supabase.from('fb_prodotti').insert({ nome: nomeVendita, categoria_id: categoria, prezzo: n(f.prezzo), aliquota_iva: 22,
        unita_vendita: 'bottiglia', articolo_id: art.id, articolo_quantita: 1, beverage_tipo: 'vino', created_by: io }).select('id').single()
      if (e2) throw e2
      let calice: string | null = null
      if (n(f.calice) > 0) {
        const { data, error } = await supabase.from('fb_prodotti').insert({ nome: `${nomeVendita} (calice)`, categoria_id: categoria, prezzo: n(f.calice), aliquota_iva: 22,
          unita_vendita: 'calice', articolo_id: art.id, articolo_quantita: 0.2, beverage_tipo: 'vino', mescita: true, created_by: io }).select('id').single()
        if (error) throw error
        calice = data.id
      }
      const { error: e3 } = await supabase.from('fb_vini').insert({ articolo_id: art.id, prodotto_bottiglia_id: bott.id, prodotto_calice_id: calice,
        produttore: f.produttore || null, denominazione: f.denominazione || null, annata: f.annata ? Number(f.annata) : null, regione: f.regione || null,
        vitigno: f.vitigno || null, tipologia: f.tipologia, formato: f.formato || '0,75 l', temperatura_servizio: f.temperatura || null,
        abbinamenti: f.abbinamenti || null, descrizione: f.descrizione || null, created_by: io })
      if (e3) throw e3
      await qc.invalidateQueries({ queryKey: ['fond'] })
      toast.success('Vino aggiunto: registra il carico delle bottiglie dal magazzino')
      setF({ ...f, nome: '', annata: '', costo: '', prezzo: '', calice: '', descrizione: '', abbinamenti: '' })
    } catch (err) { toast.error(messaggioErrore(err)) } finally { setInCorso(false) }
  }

  return (
    <Card className="p-5">
      <form onSubmit={crea} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="col-span-2 space-y-1.5"><Label htmlFor="nv-n">Etichetta *</Label><Input id="nv-n" value={f.nome} onChange={set('nome')} placeholder="Barolo Cannubi" /></div>
        <div className="space-y-1.5"><Label htmlFor="nv-p">Produttore</Label><Input id="nv-p" value={f.produttore} onChange={set('produttore')} /></div>
        <div className="space-y-1.5"><Label htmlFor="nv-a">Annata</Label><Input id="nv-a" type="number" min={1900} max={2100} value={f.annata} onChange={set('annata')} /></div>
        <div className="space-y-1.5"><Label htmlFor="nv-d">Denominazione</Label><Input id="nv-d" value={f.denominazione} onChange={set('denominazione')} placeholder="DOCG" /></div>
        <div className="space-y-1.5"><Label htmlFor="nv-r">Regione</Label><Input id="nv-r" value={f.regione} onChange={set('regione')} /></div>
        <div className="space-y-1.5"><Label htmlFor="nv-v">Vitigno</Label><Input id="nv-v" value={f.vitigno} onChange={set('vitigno')} /></div>
        <div className="space-y-1.5"><Label>Tipologia</Label><Select value={f.tipologia} onValueChange={(v) => setF({ ...f, tipologia: v })}><SelectTrigger aria-label="Tipologia"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(TIPOLOGIA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label htmlFor="nv-f">Formato</Label><Input id="nv-f" value={f.formato} onChange={set('formato')} /></div>
        <div className="space-y-1.5"><Label htmlFor="nv-c">Costo bottiglia (€)</Label><Input id="nv-c" inputMode="decimal" value={f.costo} onChange={set('costo')} /></div>
        <div className="space-y-1.5"><Label htmlFor="nv-pb">Prezzo bottiglia (€) *</Label><Input id="nv-pb" inputMode="decimal" value={f.prezzo} onChange={set('prezzo')} /></div>
        <div className="space-y-1.5"><Label htmlFor="nv-pc">Prezzo calice (€)</Label><Input id="nv-pc" inputMode="decimal" value={f.calice} onChange={set('calice')} placeholder="se si serve a calice" /></div>
        <div className="space-y-1.5"><Label htmlFor="nv-t">Temperatura di servizio</Label><Input id="nv-t" value={f.temperatura} onChange={set('temperatura')} placeholder="16–18 °C" /></div>
        <div className="space-y-1.5"><Label htmlFor="nv-s">Scorta minima (bottiglie)</Label><Input id="nv-s" inputMode="decimal" value={f.scorta} onChange={set('scorta')} /></div>
        <div className="col-span-2 space-y-1.5"><Label htmlFor="nv-ab">Abbinamenti</Label><Input id="nv-ab" value={f.abbinamenti} onChange={set('abbinamenti')} /></div>
        <div className="col-span-2 space-y-1.5 sm:col-span-4"><Label htmlFor="nv-de">Descrizione per la carta</Label><Textarea id="nv-de" rows={2} value={f.descrizione} onChange={set('descrizione')} /></div>
        <div className="col-span-2 flex justify-end sm:col-span-4"><BottoneScrittura type="submit" disabled={inCorso}>{inCorso ? 'Creazione…' : 'Aggiungi alla cantina'}</BottoneScrittura></div>
      </form>
    </Card>
  )
}
