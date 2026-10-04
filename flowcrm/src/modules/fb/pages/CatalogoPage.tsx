/**
 * CatalogoPage — menu e ricette (Ristorante §1-6, §25; Bar §1-3, §16):
 * prodotti con costo, margine e food cost; ricettario con semilavorati;
 * menu e listini per giorno, fascia e canale; promozioni (happy hour, 2×1,
 * sconti); categorie e postazioni di preparazione; registro allergeni
 * stampabile.
 */
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Plus, Printer, Search, Trash2, UtensilsCrossed } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { SkeletonTabella } from '@/components/ui/skeleton'
import { DistinteBaseSezione } from '@/components/condivisi/DistinteBaseSezione'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useElenco, useSalva, useInserisci, useElimina, useRpc, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale, SelettoreLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { ProdottoDialog } from '@/modules/fb/dialogs/ProdottoDialog'
import { MENU_TIPO_LABEL, PROMO_TIPO_LABEL, CANALE_LABEL, etichettaAllergene, etichettaUscita, fmtEuro, fmtNumero } from '@/modules/fb/stati'
import {
  useCatalogo, useImpostaDisponibilita, type Categoria, type Menu, type MenuVoce, type Prodotto, type Promozione, type Stazione,
} from '@/modules/fb/queries'

type Economia = Database['public']['Views']['fb_prodotti_economia']['Row']
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export function CatalogoPage() {
  return <ConLocale><Catalogo_ /></ConLocale>
}

function Catalogo_() {
  const { modulo } = useFb()
  const { prodotti, categorie, caricamento } = useCatalogo()
  return (
    <div>
      <PageHeader title="Menu e ricette" description="Prodotti, ricette e costi, listini per fascia e canale, promozioni, allergeni."
        numeri={[
          { etichetta: 'prodotti', valore: prodotti.length },
          { etichetta: 'disponibili', valore: prodotti.filter((p) => p.stato === 'attivo').length },
          { etichetta: 'finiti', valore: prodotti.filter((p) => p.stato === 'esaurito').length },
          { etichetta: 'categorie', valore: categorie.length },
        ]}
        actions={<SelettoreLocale />} />
      <Tabs defaultValue="prodotti">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="prodotti">Prodotti</TabsTrigger>
          <TabsTrigger value="ricette">Ricette</TabsTrigger>
          <TabsTrigger value="menu">Menu e listini</TabsTrigger>
          <TabsTrigger value="promozioni">Promozioni</TabsTrigger>
          <TabsTrigger value="struttura">Locale e postazioni</TabsTrigger>
          <TabsTrigger value="allergeni">Registro allergeni</TabsTrigger>
        </TabsList>
        <TabsContent value="prodotti"><ProdottiTab prodotti={prodotti} categorie={categorie} caricamento={caricamento} /></TabsContent>
        <TabsContent value="ricette">
          <DistinteBaseSezione modulo="fb" moduli={['fb', modulo]} etichetta={{ singolare: 'ricetta', plurale: 'ricette' }}
            etichettaAllergene={etichettaAllergene}
            tipi={[{ valore: 'ricetta', label: 'Ricetta' }, { valore: 'semilavorato', label: 'Preparazione intermedia' },
              { valore: 'cocktail', label: 'Cocktail' }, { valore: 'bevanda', label: 'Bevanda preparata' }]} />
        </TabsContent>
        <TabsContent value="menu"><MenuTab prodotti={prodotti} /></TabsContent>
        <TabsContent value="promozioni"><PromozioniTab prodotti={prodotti} categorie={categorie} /></TabsContent>
        <TabsContent value="struttura"><StrutturaTab categorie={categorie} /></TabsContent>
        <TabsContent value="allergeni"><AllergeniTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function ProdottiTab({ prodotti, categorie, caricamento }: { prodotti: Prodotto[]; categorie: Categoria[]; caricamento: boolean }) {
  const { isManager } = useAuth()
  const { data: economia = [] } = useElenco<Economia>('fb_prodotti_economia')
  const disponibilita = useImpostaDisponibilita()
  const [cerca, setCerca] = useState('')
  const [cat, setCat] = useState('tutte')
  const [dialog, setDialog] = useState<{ aperto: boolean; p?: Prodotto }>({ aperto: false })
  const eco = (id: string) => economia.find((e) => e.prodotto_id === id)
  const elenco = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return prodotti.filter((p) => (cat === 'tutte' || p.categoria_id === cat) && (!q || `${p.nome} ${p.codice}`.toLowerCase().includes(q)))
  }, [prodotti, cerca, cat])
  const tonoFc = (fc: number | null | undefined) => fc == null ? 'neutral' : fc <= 30 ? 'success' : fc <= 38 ? 'warning' : 'danger'

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca un prodotto…" className="pl-9" aria-label="Cerca prodotto" /></div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-48" aria-label="Categoria"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="tutte">Tutte le categorie</SelectItem>
            {categorie.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>
        {isManager && <BottoneScrittura className="ml-auto" onClick={() => setDialog({ aperto: true })} disabled={!categorie.length}>
          <Plus className="h-4 w-4" /> Nuovo prodotto</BottoneScrittura>}
      </div>
      {caricamento ? <SkeletonTabella righe={6} colonne={isManager ? 8 : 5} /> : elenco.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Nessun prodotto" filtrato={prodotti.length > 0}
          description={prodotti.length ? 'Cambia categoria o ricerca.' : 'Crea i piatti e le bevande: prezzo, ricetta e allergeni.'}
          action={isManager && !prodotti.length ? <BottoneScrittura onClick={() => setDialog({ aperto: true })}>Nuovo prodotto</BottoneScrittura> : undefined} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prodotto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Prezzo</TableHead>
                {isManager && <><TableHead className="text-right">Costo</TableHead><TableHead className="text-right">Margine</TableHead><TableHead className="text-right">Food cost</TableHead></>}
                <TableHead>Allergeni</TableHead>
                <TableHead>Disponibile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {elenco.map((p) => {
                const e = eco(p.id)
                return (
                  <TableRow key={p.id} onActivate={isManager ? () => setDialog({ aperto: true, p }) : undefined}>
                    <TableCell>
                      <span className="block font-medium text-foreground">{p.nome}</span>
                      <span className="font-mono text-xs text-muted-foreground">{p.codice}{p.componenti.length ? ` · menu di ${p.componenti.length} piatti` : ''}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{categorie.find((c) => c.id === p.categoria_id)?.nome}</TableCell>
                    <TableCell numerica>{fmtEuro(p.prezzo)}</TableCell>
                    {isManager && <>
                      <TableCell numerica>{fmtEuro(e?.costo)}</TableCell>
                      <TableCell numerica>{fmtEuro(e?.margine)}</TableCell>
                      <TableCell numerica>{e?.food_cost_pct != null ? <Badge tone={tonoFc(Number(e.food_cost_pct))}>{fmtNumero(e.food_cost_pct, 1)}%</Badge> : '—'}</TableCell>
                    </>}
                    <TableCell className="max-w-48 text-xs text-muted-foreground">
                      {[...(e?.allergeni ?? []).map(etichettaAllergene), ...p.allergeni_potenziali.map((a) => `tracce di ${etichettaAllergene(a).toLowerCase()}`)].join(', ') || '—'}
                    </TableCell>
                    <TableCell onClick={(ev) => ev.stopPropagation()}>
                      {p.stato === 'sospeso' ? <Badge tone="neutral">Sospeso</Badge> : (
                        <Switch checked={p.stato === 'attivo'} aria-label={`${p.nome} disponibile`}
                          onCheckedChange={(v) => disponibilita.mutate({ p_prodotto: p.id, p_stato: v ? 'attivo' : 'esaurito' },
                            { onError: (err) => toast.error(messaggioErrore(err)) })} />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      <ProdottoDialog open={dialog.aperto} prodotto={dialog.p} categorie={categorie} prodotti={prodotti}
        onOpenChange={(o) => { if (!o) setDialog({ aperto: false }) }} />
    </>
  )
}

function MenuTab({ prodotti }: { prodotti: Prodotto[] }) {
  const { localeId, modulo } = useFb()
  const { isManager } = useAuth()
  const { data: menu = [] } = useElenco<Menu>('fb_menu', { filtri: { locale_id: localeId ?? undefined }, ordine: [{ colonna: 'priorita', crescente: false }, { colonna: 'nome' }] })
  const salva = useSalva('fb_menu', ['fond-rpc'])
  const [sceltoId, setSceltoId] = useState<string | null>(null)
  const scelto = menu.find((m) => m.id === sceltoId) ?? null

  async function nuovo() {
    try {
      const m = await salva.mutateAsync({ values: { locale_id: localeId!, modulo, nome: 'Nuovo menu', tipo: 'carta' } })
      setSceltoId(m.id)
    } catch (e) { toast.error(messaggioErrore(e)) }
  }
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="h-fit overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-label uppercase text-muted-foreground">Menu e listini</span>
          {isManager && <BottoneScrittura size="sm" onClick={nuovo}><Plus className="h-3.5 w-3.5" /> Nuovo</BottoneScrittura>}
        </div>
        {menu.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">Senza listini vale il prezzo del prodotto.</p> : (
          <ul className="divide-y divide-border">
            {menu.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => setSceltoId(m.id)} aria-current={m.id === sceltoId}
                  className={cn('flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted/50', m.id === sceltoId && 'bg-muted')}>
                  <span><span className="block font-medium text-foreground">{m.nome}</span>
                    <span className="block text-xs text-muted-foreground">{MENU_TIPO_LABEL[m.tipo]} · {m.canale === 'tutti' ? 'tutti i canali' : CANALE_LABEL[m.canale]}
                      {m.ora_inizio ? ` · ${m.ora_inizio.slice(0, 5)}–${m.ora_fine?.slice(0, 5)}` : ''}</span></span>
                  {!m.attivo && <Badge tone="neutral">Spento</Badge>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {scelto ? <EditorMenu menu={scelto} prodotti={prodotti} /> : (
        <EmptyState icon={UtensilsCrossed} title="Scegli un menu" description="Ogni listino vale nei giorni, nella fascia oraria e sul canale indicati; vince quello con priorità più alta." />
      )}
    </div>
  )
}

function EditorMenu({ menu, prodotti }: { menu: Menu; prodotti: Prodotto[] }) {
  const salva = useSalva('fb_menu', ['fond-rpc'])
  const { data: voci = [] } = useElenco<MenuVoce>('fb_menu_voci', { filtri: { menu_id: menu.id }, ordine: [{ colonna: 'ordine' }] })
  const aggiungi = useInserisci('fb_menu_voci', ['fond-rpc'])
  const salvaVoce = useSalva('fb_menu_voci', ['fond-rpc'])
  const togli = useElimina('fb_menu_voci', ['fond-rpc'])
  const elimina = useElimina('fb_menu')
  const [nuovaVoce, setNuovaVoce] = useState('')
  const aggiorna = (values: Partial<Menu>) => salva.mutate({ id: menu.id, values }, { onError: (e) => toast.error(messaggioErrore(e)) })

  return (
    <Card className="space-y-5 p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="col-span-2 space-y-1.5"><Label htmlFor="mn-nome">Nome</Label>
          <Input id="mn-nome" defaultValue={menu.nome} key={`n-${menu.id}`} onBlur={(e) => e.target.value.trim() && aggiorna({ nome: e.target.value.trim() })} /></div>
        <div className="space-y-1.5"><Label>Tipo</Label>
          <Select value={menu.tipo} onValueChange={(v) => aggiorna({ tipo: v })}>
            <SelectTrigger aria-label="Tipo di menu"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(MENU_TIPO_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="space-y-1.5"><Label>Canale</Label>
          <Select value={menu.canale} onValueChange={(v) => aggiorna({ canale: v })}>
            <SelectTrigger aria-label="Canale"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="tutti">Tutti</SelectItem>
              {['sala', 'banco', 'asporto', 'delivery', 'online'].map((c) => <SelectItem key={c} value={c}>{CANALE_LABEL[c]}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="space-y-1.5"><Label htmlFor="mn-dalle">Dalle</Label>
          <Input id="mn-dalle" type="time" defaultValue={menu.ora_inizio?.slice(0, 5) ?? ''} key={`d-${menu.id}`} onBlur={(e) => aggiorna({ ora_inizio: e.target.value || null })} /></div>
        <div className="space-y-1.5"><Label htmlFor="mn-alle">Alle</Label>
          <Input id="mn-alle" type="time" defaultValue={menu.ora_fine?.slice(0, 5) ?? ''} key={`a-${menu.id}`} onBlur={(e) => aggiorna({ ora_fine: e.target.value || null })} /></div>
        <div className="space-y-1.5"><Label htmlFor="mn-prio">Priorità</Label>
          <Input id="mn-prio" type="number" defaultValue={menu.priorita} key={`p-${menu.id}`} onBlur={(e) => aggiorna({ priorita: Number(e.target.value) || 0 })} /></div>
        <div className="space-y-1.5"><Label htmlFor="mn-fisso">Prezzo fisso (€)</Label>
          <Input id="mn-fisso" inputMode="decimal" defaultValue={menu.prezzo_fisso ?? ''} key={`f-${menu.id}`} placeholder="Degustazione, business"
            onBlur={(e) => aggiorna({ prezzo_fisso: e.target.value ? Number(e.target.value.replace(',', '.')) : null })} /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Giorni">
          {GIORNI.map((g, i) => {
            const on = menu.giorni.includes(i + 1)
            return <button key={g} type="button" aria-pressed={on} onClick={() => aggiorna({ giorni: on ? menu.giorni.filter((x) => x !== i + 1) : [...menu.giorni, i + 1].sort() })}
              className={cn('rounded-full border px-2.5 py-0.5 text-xs', on ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground')}>{g}</button>
          })}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">Attivo <Switch checked={menu.attivo} onCheckedChange={(v) => aggiorna({ attivo: v })} /></label>
          <Button variant="ghost" size="icon" aria-label="Elimina il menu" onClick={() => elimina.mutate(menu.id, { onError: (e) => toast.error(messaggioErrore(e)) })}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-label uppercase text-muted-foreground">Prodotti e prezzi del listino</h3>
        <ul className="divide-y divide-border">
          {voci.map((v) => {
            const p = prodotti.find((x) => x.id === v.prodotto_id)
            return (
              <li key={v.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-foreground">{p?.nome ?? '—'}</span>
                <span className="text-xs text-muted-foreground">base {fmtEuro(p?.prezzo)}</span>
                <Input defaultValue={v.prezzo ?? ''} inputMode="decimal" placeholder="come base" className="h-8 w-28 text-right" aria-label={`Prezzo di ${p?.nome} in questo listino`}
                  onBlur={(e) => salvaVoce.mutate({ id: v.id, values: { prezzo: e.target.value ? Number(e.target.value.replace(',', '.')) : null } })} />
                <Switch checked={v.disponibile} aria-label="Disponibile in questo listino" onCheckedChange={(d) => salvaVoce.mutate({ id: v.id, values: { disponibile: d } })} />
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Togli dal listino" onClick={() => togli.mutate(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </li>
            )
          })}
        </ul>
        <div className="mt-2 flex gap-2">
          <Select value={nuovaVoce} onValueChange={setNuovaVoce}>
            <SelectTrigger aria-label="Prodotto da aggiungere"><SelectValue placeholder="Aggiungi un prodotto al listino…" /></SelectTrigger>
            <SelectContent>{prodotti.filter((p) => !voci.some((v) => v.prodotto_id === p.id)).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
          </Select>
          <BottoneScrittura variant="outline" disabled={!nuovaVoce}
            onClick={() => aggiungi.mutate({ menu_id: menu.id, modulo: menu.modulo, prodotto_id: nuovaVoce, ordine: voci.length },
              { onSuccess: () => setNuovaVoce(''), onError: (e) => toast.error(messaggioErrore(e)) })}>Aggiungi</BottoneScrittura>
        </div>
      </div>
    </Card>
  )
}

function PromozioniTab({ prodotti, categorie }: { prodotti: Prodotto[]; categorie: Categoria[] }) {
  const { localeId } = useFb()
  const { data: promo = [] } = useElenco<Promozione>('fb_promozioni', { ordine: [{ colonna: 'nome' }] })
  const salva = useSalva('fb_promozioni', ['fond-rpc'])
  const elimina = useElimina('fb_promozioni', ['fond-rpc'])
  const [f, setF] = useState({ nome: '', tipo: 'prezzo_speciale', bersaglio: '', prezzo: '', sconto: '', x: '2', y: '1', dalle: '', alle: '' })

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim() || !f.bersaglio) { toast.error('Nome e prodotto o categoria sono obbligatori'); return }
    const [tipoB, id] = f.bersaglio.split(':')
    try {
      await salva.mutateAsync({ values: { locale_id: localeId, nome: f.nome.trim(), tipo: f.tipo,
        prodotti: tipoB === 'p' ? [id] : [], categorie: tipoB === 'c' ? [id] : [],
        prezzo: f.tipo === 'prezzo_speciale' ? Number(f.prezzo.replace(',', '.')) : null,
        sconto_percentuale: f.tipo === 'sconto_percentuale' ? Number(f.sconto.replace(',', '.')) : null,
        quantita_x: f.tipo === 'x_per_y' ? Number(f.x) : null, quantita_y: f.tipo === 'x_per_y' ? Number(f.y) : null,
        ora_inizio: f.dalle || null, ora_fine: f.alle || null } })
      setF({ ...f, nome: '', prezzo: '', sconto: '' })
      toast.success('Promozione attiva')
    } catch (err) { toast.error(messaggioErrore(err)) }
  }
  const bersaglio = (p: Promozione) => [...p.prodotti.map((id) => prodotti.find((x) => x.id === id)?.nome),
    ...p.categorie.map((id) => categorie.find((x) => x.id === id)?.nome)].filter(Boolean).join(', ')
  const regola = (p: Promozione) => p.tipo === 'prezzo_speciale' ? fmtEuro(p.prezzo) : p.tipo === 'sconto_percentuale' ? `−${Number(p.sconto_percentuale)}%`
    : `${p.quantita_x}×${p.quantita_y}`

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={crea} className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1 space-y-1.5"><Label htmlFor="pm-nome">Nome</Label><Input id="pm-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Happy hour" /></div>
          <div className="w-44 space-y-1.5"><Label>Tipo</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
              <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PROMO_TIPO_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="w-56 space-y-1.5"><Label>Su</Label>
            <Select value={f.bersaglio} onValueChange={(v) => setF({ ...f, bersaglio: v })}>
              <SelectTrigger aria-label="Prodotto o categoria"><SelectValue placeholder="Prodotto o categoria…" /></SelectTrigger>
              <SelectContent>
                {categorie.map((c) => <SelectItem key={c.id} value={`c:${c.id}`}>Categoria · {c.nome}</SelectItem>)}
                {prodotti.map((p) => <SelectItem key={p.id} value={`p:${p.id}`}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select></div>
          {f.tipo === 'prezzo_speciale' && <div className="w-28 space-y-1.5"><Label htmlFor="pm-prezzo">Prezzo (€)</Label><Input id="pm-prezzo" inputMode="decimal" value={f.prezzo} onChange={(e) => setF({ ...f, prezzo: e.target.value })} /></div>}
          {f.tipo === 'sconto_percentuale' && <div className="w-24 space-y-1.5"><Label htmlFor="pm-sconto">Sconto %</Label><Input id="pm-sconto" inputMode="decimal" value={f.sconto} onChange={(e) => setF({ ...f, sconto: e.target.value })} /></div>}
          {f.tipo === 'x_per_y' && <>
            <div className="w-20 space-y-1.5"><Label htmlFor="pm-x">Prendi</Label><Input id="pm-x" type="number" min={2} value={f.x} onChange={(e) => setF({ ...f, x: e.target.value })} /></div>
            <div className="w-20 space-y-1.5"><Label htmlFor="pm-y">Paghi</Label><Input id="pm-y" type="number" min={1} value={f.y} onChange={(e) => setF({ ...f, y: e.target.value })} /></div>
          </>}
          <div className="w-28 space-y-1.5"><Label htmlFor="pm-dalle">Dalle</Label><Input id="pm-dalle" type="time" value={f.dalle} onChange={(e) => setF({ ...f, dalle: e.target.value })} /></div>
          <div className="w-28 space-y-1.5"><Label htmlFor="pm-alle">Alle</Label><Input id="pm-alle" type="time" value={f.alle} onChange={(e) => setF({ ...f, alle: e.target.value })} /></div>
          <BottoneScrittura type="submit">Attiva</BottoneScrittura>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Prodotto + fascia oraria + prezzo: il prezzo cambia da solo all'inizio e alla fine della fascia (anche a cavallo della mezzanotte).</p>
      </Card>
      {promo.length === 0 ? <EmptyState compatto icon={UtensilsCrossed} title="Nessuna promozione" description="Happy hour, 2×1, sconti a fascia oraria." /> : (
        <Card className="divide-y divide-border">
          {promo.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="min-w-40 flex-1"><span className="font-medium text-foreground">{p.nome}</span>
                <span className="block text-xs text-muted-foreground">{bersaglio(p)}{p.ora_inizio ? ` · ${p.ora_inizio.slice(0, 5)}–${p.ora_fine?.slice(0, 5)}` : ' · sempre'}</span></span>
              <Badge tone="info">{PROMO_TIPO_LABEL[p.tipo]}: {regola(p)}</Badge>
              <Switch checked={p.attiva} aria-label="Attiva" onCheckedChange={(v) => salva.mutate({ id: p.id, values: { attiva: v } })} />
              <Button variant="ghost" size="icon" aria-label="Elimina" onClick={() => elimina.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function ImpostazioniLocale() {
  const { locale } = useFb()
  const { isManager } = useAuth()
  const salva = useSalva('fb_locali')
  if (!locale || !isManager) return null
  const campo = (k: 'durata_tavolo_min' | 'anticipo_prenotato_min' | 'pausa_uscite_min' | 'coperti_per_cameriere' | 'coperti_per_cuoco' | 'costo_orario_medio',
                 etichetta: string, aiuto: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`il-${k}`}>{etichetta}</Label>
      <Input id={`il-${k}`} inputMode="decimal" key={`${k}-${locale.id}`} defaultValue={locale[k] ?? ''}
        onBlur={(e) => { const v = e.target.value.trim() === '' ? null : Number(e.target.value.replace(',', '.'))
          if (v !== (locale[k] ?? null)) salva.mutate({ id: locale.id, values: { [k]: v } }, { onSuccess: () => toast.success('Impostazione salvata'), onError: (err) => toast.error(messaggioErrore(err)) }) }} />
      <p className="text-xs text-muted-foreground">{aiuto}</p>
    </div>
  )
  return (
    <Card className="p-5 xl:col-span-2">
      <h2 className="mb-3 text-title text-foreground">Impostazioni di {locale.nome}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {campo('durata_tavolo_min', 'Durata del tavolo (min)', 'Quanto resta occupato un tavolo prenotato.')}
        {campo('anticipo_prenotato_min', 'Prenotato da (min prima)', 'Da quando la mappa mostra il tavolo come prenotato.')}
        {campo('pausa_uscite_min', 'Pausa tra le portate (min)', 'Con le uscite automatiche: attesa prima della portata successiva.')}
        {campo('coperti_per_cameriere', 'Coperti per cameriere', 'Per il fabbisogno di personale in sala.')}
        {campo('coperti_per_cuoco', 'Coperti per cuoco', 'Per il fabbisogno di personale in cucina.')}
        {campo('costo_orario_medio', 'Costo orario medio (€)', 'Per il costo del personale nelle analisi.')}
      </div>
    </Card>
  )
}

function StrutturaTab({ categorie }: { categorie: Categoria[] }) {
  const { localeId, modulo } = useFb()
  const { data: stazioni = [] } = useElenco<Stazione>('fb_stazioni', { filtri: { locale_id: localeId ?? undefined }, ordine: [{ colonna: 'ordine' }] })
  const salvaCat = useSalva('fb_categorie')
  const salvaSt = useSalva('fb_stazioni')
  const [nuovaCat, setNuovaCat] = useState({ nome: '', area: 'food', uscita: '1' })
  const [nuovaSt, setNuovaSt] = useState({ nome: '', tipo: 'cucina' })

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <ImpostazioniLocale />
      <Card className="p-5">
        <h2 className="mb-3 text-title text-foreground">Categorie</h2>
        <ul className="divide-y divide-border">
          {categorie.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 text-foreground">{c.nome}</span>
              <Badge tone={c.area === 'food' ? 'neutral' : 'info'}>{c.area === 'food' ? 'Cucina' : 'Bevande'}</Badge>
              <Select value={String(c.uscita)} onValueChange={(v) => salvaCat.mutate({ id: c.id, values: { uscita: Number(v) } })}>
                <SelectTrigger className="h-8 w-40" aria-label={`Uscita di ${c.nome}`}><SelectValue /></SelectTrigger>
                <SelectContent>{[0, 1, 2, 3, 4, 5].map((u) => <SelectItem key={u} value={String(u)}>{etichettaUscita(u)}</SelectItem>)}</SelectContent>
              </Select>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input value={nuovaCat.nome} onChange={(e) => setNuovaCat({ ...nuovaCat, nome: e.target.value })} placeholder="Nuova categoria" className="min-w-40 flex-1" aria-label="Nome categoria" />
          <Select value={nuovaCat.area} onValueChange={(v) => setNuovaCat({ ...nuovaCat, area: v, uscita: v === 'food' ? '1' : '0' })}>
            <SelectTrigger className="w-32" aria-label="Area"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="food">Cucina</SelectItem><SelectItem value="beverage">Bevande</SelectItem></SelectContent>
          </Select>
          <BottoneScrittura variant="outline" disabled={!nuovaCat.nome.trim()} onClick={() => salvaCat.mutate({ values: { nome: nuovaCat.nome.trim(), area: nuovaCat.area,
            uscita: Number(nuovaCat.uscita), ordine: categorie.length } }, { onSuccess: () => setNuovaCat({ nome: '', area: 'food', uscita: '1' }), onError: (e) => toast.error(messaggioErrore(e)) })}>Aggiungi</BottoneScrittura>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="mb-1 text-title text-foreground">Postazioni di preparazione</h2>
        <p className="mb-3 text-sm text-muted-foreground">Ogni postazione riceve le categorie scelte; la predefinita riceve il resto.</p>
        <ul className="space-y-3">
          {stazioni.map((s) => (
            <li key={s.id} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{s.nome}</span>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">Predefinita
                  <Switch checked={s.predefinita} onCheckedChange={(v) => salvaSt.mutate({ id: s.id, values: { predefinita: v } }, { onError: (e) => toast.error(messaggioErrore(e)) })} /></label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categorie.map((c) => {
                  const on = s.categorie.includes(c.id)
                  return <button key={c.id} type="button" aria-pressed={on}
                    onClick={() => salvaSt.mutate({ id: s.id, values: { categorie: on ? s.categorie.filter((x) => x !== c.id) : [...s.categorie, c.id] } })}
                    className={cn('rounded-full border px-2.5 py-0.5 text-xs', on ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground')}>{c.nome}</button>
                })}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input value={nuovaSt.nome} onChange={(e) => setNuovaSt({ ...nuovaSt, nome: e.target.value })} placeholder="Griglia, Pizzeria, Fritti…" className="min-w-40 flex-1" aria-label="Nome postazione" />
          <Select value={nuovaSt.tipo} onValueChange={(v) => setNuovaSt({ ...nuovaSt, tipo: v })}>
            <SelectTrigger className="w-36" aria-label="Tipo"><SelectValue /></SelectTrigger>
            <SelectContent>{['cucina', 'pizzeria', 'pasticceria', 'bar', 'banco', 'caffetteria'].map((t) => <SelectItem key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
          <BottoneScrittura variant="outline" disabled={!nuovaSt.nome.trim()} onClick={() => salvaSt.mutate({ values: { locale_id: localeId!, modulo, nome: nuovaSt.nome.trim(),
            tipo: nuovaSt.tipo, ordine: stazioni.length } }, { onSuccess: () => setNuovaSt({ nome: '', tipo: 'cucina' }), onError: (e) => toast.error(messaggioErrore(e)) })}>Aggiungi</BottoneScrittura>
        </div>
      </Card>
    </div>
  )
}

interface VoceRegistro { categoria: string; prodotto: string; allergeni: string[]; possibili_tracce: string[];
  ingredienti_sostituibili: string | null; contaminazioni: string | null; note_operative: string | null }

function AllergeniTab() {
  const { localeId, locale } = useFb()
  const { data: voci = [] } = useRpc<VoceRegistro[]>('fb_registro_allergeni', { p_locale: localeId }, { abilitato: !!localeId })
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          Informazione sugli allergeni (Reg. UE 1169/2011, allegato II): si calcola dagli ingredienti delle ricette. Stampala e tienila a disposizione dei clienti.
        </p>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Stampa</Button>
      </div>
      <Card className="overflow-hidden">
        <h2 className="hidden px-4 pt-4 text-title print:block">Allergeni · {locale?.nome}</h2>
        <Table>
          <TableHeader><TableRow><TableHead>Piatto</TableHead><TableHead>Contiene</TableHead><TableHead>Può contenere tracce di</TableHead><TableHead>Note</TableHead></TableRow></TableHeader>
          <TableBody>
            {voci.map((v, i) => (
              <TableRow key={`${v.prodotto}-${i}`}>
                <TableCell><span className="font-medium text-foreground">{v.prodotto}</span><span className="block text-xs text-muted-foreground">{v.categoria}</span></TableCell>
                <TableCell>{v.allergeni.length ? v.allergeni.map(etichettaAllergene).join(', ') : 'Nessun allergene'}</TableCell>
                <TableCell className="text-muted-foreground">{v.possibili_tracce.map(etichettaAllergene).join(', ') || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{[v.ingredienti_sostituibili && `Sostituibili: ${v.ingredienti_sostituibili}`, v.contaminazioni, v.note_operative].filter(Boolean).join(' · ') || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
