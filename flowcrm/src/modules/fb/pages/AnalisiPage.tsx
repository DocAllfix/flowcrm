/**
 * AnalisiPage — business intelligence per la direzione (Ristorante §25-27,
 * §32, §40; Bar §29-32): KPI commerciali, di cucina, economici e sui
 * clienti; menu engineering con i quattro quadranti; food cost per piatto,
 * categoria, menu, giorno, chef e canale; bevande teorico contro effettivo;
 * sprechi con il loro costo.
 */
import { useMemo, useState } from 'react'
import { ChartPie } from 'lucide-react'
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import { PageHeader } from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { ManagerOnly } from '@/components/ManagerOnly'
import { useRpc } from '@/lib/queries/fondamenta'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale, SelettoreLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { CLASSE_MENU, CANALE_LABEL, SPRECO_CAUSALE, fmtEuro, fmtNumero, oggiIso } from '@/modules/fb/stati'

const tooltipStyle = { borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }
type Kpi = Record<string, Record<string, number | string | null | Record<string, number>>>
interface Me { prodotto_id: string; prodotto: string; categoria: string; venduti: number; quota_pct: number; prezzo_medio: number; costo_unitario: number
  margine_unitario: number; margine_totale: number; food_cost_pct: number | null; popolare: boolean; redditizio: boolean; classe: string }
interface Fc { chiave: string; quantita: number; ricavo: number; costo: number; margine: number; food_cost_pct: number | null }
interface Bev { articolo_id: string; articolo: string; unita: string; teorico: number; sprechi: number; ammanchi: number; effettivo: number; scostamento_pct: number | null; valore_scostamento: number; anomalia: boolean }
interface Spreco { causale: string; eventi: number; costo: number }

const COLORE_CLASSE: Record<string, string> = { star: 'var(--color-chart-1)', plow_horse: 'var(--color-chart-2)', puzzle: 'var(--color-chart-3)', dog: 'var(--color-chart-4)' }
const sposta = (giorni: number) => {
  const d = new Date(); d.setDate(d.getDate() + giorni)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AnalisiPage() {
  return <ManagerOnly><ConLocale><Analisi_ /></ConLocale></ManagerOnly>
}

function Analisi_() {
  const { localeId, modulo } = useFb()
  const [dal, setDal] = useState(sposta(-29))
  const [al, setAl] = useState(oggiIso())
  const { data: kpi, isLoading } = useRpc<Kpi>('fb_kpi', { p_locale: localeId, p_dal: dal, p_al: al }, { abilitato: !!localeId })
  const c = kpi?.commerciali ?? {}
  const e = kpi?.economici ?? {}
  const k = kpi?.cucina ?? {}
  const cl = kpi?.clienti ?? {}
  const num = (v: unknown, d = 0) => fmtNumero(v as number, d)
  const pct = (v: unknown) => v == null ? '—' : `${fmtNumero(v as number, 1)}%`

  return (
    <div>
      <PageHeader title="Analisi" description="Numeri del periodo per decidere: cosa promuovere, cosa correggere, dove si perde."
        numeri={[
          { etichetta: 'fatturato', valore: fmtEuro(c.fatturato as number, 0), inCaricamento: isLoading },
          { etichetta: 'coperti', valore: num(c.coperti), inCaricamento: isLoading },
          { etichetta: 'ticket medio', valore: fmtEuro(c.ticket_medio as number), inCaricamento: isLoading },
          { etichetta: 'food cost', valore: pct(e.food_cost_pct), inCaricamento: isLoading },
          { etichetta: 'margine lordo', valore: fmtEuro(e.margine_lordo as number, 0), inCaricamento: isLoading },
        ]}
        actions={<SelettoreLocale />} />

      <Card className="mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label htmlFor="an-dal">Dal</Label><Input id="an-dal" type="date" className="w-40" value={dal} onChange={(x) => setDal(x.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="an-al">Al</Label><Input id="an-al" type="date" className="w-40" value={al} onChange={(x) => setAl(x.target.value)} /></div>
        {[['Oggi', 0], ['7 giorni', -6], ['30 giorni', -29], ['90 giorni', -89]].map(([l, g]) => (
          <Button key={l} variant="ghost" onClick={() => { setDal(sposta(g as number)); setAl(oggiIso()) }}>{l}</Button>
        ))}
      </Card>

      <Tabs defaultValue="kpi">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="kpi">KPI</TabsTrigger>
          <TabsTrigger value="menu">Menu engineering</TabsTrigger>
          <TabsTrigger value="foodcost">Food cost</TabsTrigger>
          <TabsTrigger value="tempi">Tempi di cucina</TabsTrigger>
          <TabsTrigger value="bevande">Bevande</TabsTrigger>
          <TabsTrigger value="sprechi">Sprechi</TabsTrigger>
        </TabsList>

        <TabsContent value="kpi">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-3 text-title text-foreground">Commerciali</h2>
              <Righe voci={[['Fatturato', fmtEuro(c.fatturato as number)], ['Fatturato netto IVA', fmtEuro(c.fatturato_netto as number)], ['Conti', num(c.conti)],
                ['Coperti', num(c.coperti)], ['Ticket medio', fmtEuro(c.ticket_medio as number)], ['Ricavo per coperto', fmtEuro(c.ricavo_per_coperto as number)],
                ['Tasso di occupazione', pct(c.tasso_occupazione_pct)], ['Rotazione tavoli', `${num(c.rotazione_tavoli, 2)} al giorno`]]} />
              <Fasce dati={c.per_fascia_oraria as Record<string, number> | undefined} />
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 text-title text-foreground">Economici</h2>
              <Righe voci={[['Food cost', pct(e.food_cost_pct)], ['Beverage cost', pct(e.beverage_cost_pct)], ['Margine lordo', fmtEuro(e.margine_lordo as number)],
                ['Costo materie prime', fmtEuro(e.costo_materie_prime as number)], ['Ore lavorate', num(e.ore_lavorate, 1)],
                ['Costo del personale', e.costo_personale != null ? fmtEuro(e.costo_personale as number) : 'imposta il costo orario medio del locale'], ['Sprechi', fmtEuro(e.sprechi as number)]]} />
              {c.per_canale && Object.keys(c.per_canale as object).length > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">Per canale: {Object.entries(c.per_canale as Record<string, number>).map(([k2, v]) => `${CANALE_LABEL[k2] ?? k2} ${fmtEuro(v, 0)}`).join(' · ')}</p>
              )}
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 text-title text-foreground">Cucina</h2>
              <Righe voci={[['Tempo medio di preparazione', k.tempo_medio_preparazione_min != null ? `${num(k.tempo_medio_preparazione_min, 1)} min` : '—'],
                ['Tempo medio di servizio', k.tempo_medio_servizio_min != null ? `${num(k.tempo_medio_servizio_min, 1)} min` : '—'],
                ['Piatti venduti', num(k.piatti_venduti)], ['Bevande vendute', num(k.bevande_vendute)], ['Piatti restituiti', num(k.piatti_restituiti)],
                ['Rifacimenti', num(k.rifacimenti)], ['Righe annullate', num(k.righe_annullate)]]} />
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 text-title text-foreground">Clienti</h2>
              <Righe voci={[['Clienti identificati', num(cl.clienti_identificati)], ['Nuovi clienti', num(cl.nuovi_clienti)], ['Clienti ricorrenti', num(cl.clienti_ricorrenti)],
                ['Frequenza media', num(cl.frequenza_media, 2)], ['Spesa media', fmtEuro(cl.spesa_media as number)], ['Prenotazioni', num(cl.prenotazioni)],
                ['No-show', `${num(cl.no_show)} (${pct(cl.no_show_pct)})`], ['NPS', cl.nps != null ? num(cl.nps) : '—'],
                ['Valutazione media', cl.valutazione_media != null ? `${num(cl.valutazione_media, 1)} / 5` : '—']]} />
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="menu"><MenuEngineering dal={dal} al={al} /></TabsContent>
        <TabsContent value="foodcost"><FoodCost dal={dal} al={al} /></TabsContent>
        <TabsContent value="tempi"><TempiCucina dal={dal} al={al} /></TabsContent>
        <TabsContent value="bevande"><Bevande modulo={modulo} dal={dal} al={al} /></TabsContent>
        <TabsContent value="sprechi"><SprechiAnalisi dal={dal} al={al} /></TabsContent>
      </Tabs>
    </div>
  )
}

function Righe({ voci }: { voci: [string, string][] }) {
  return (
    <dl className="divide-y divide-border text-sm">
      {voci.map(([l, v]) => <div key={l} className="flex items-baseline justify-between gap-3 py-1.5"><dt className="text-muted-foreground">{l}</dt><dd data-slot="kpi" className="text-foreground">{v}</dd></div>)}
    </dl>
  )
}

function Fasce({ dati }: { dati?: Record<string, number> }) {
  const serie = Object.entries(dati ?? {}).map(([ora, v]) => ({ ora: `${ora}:00`, valore: Number(v) }))
  if (!serie.length) return null
  return (
    <div className="mt-4">
      <h3 className="mb-1 text-label uppercase text-muted-foreground">Fatturato per fascia oraria</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={serie}>
          <XAxis dataKey="ora" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
          <Tooltip formatter={(v) => [fmtEuro(Number(v)), 'Venduto']} contentStyle={tooltipStyle} />
          <Bar dataKey="valore" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function MenuEngineering({ dal, al }: { dal: string; al: string }) {
  const { localeId } = useFb()
  const { data: righe = [] } = useRpc<Me[]>('fb_menu_engineering', { p_locale: localeId, p_dal: dal, p_al: al }, { abilitato: !!localeId })
  const soglia = righe.length ? 70 / righe.length : 0
  const margineMedio = useMemo(() => {
    const q = righe.reduce((s, r) => s + Number(r.venduti), 0)
    return q ? righe.reduce((s, r) => s + Number(r.margine_totale), 0) / q : 0
  }, [righe])
  if (!righe.length) return <EmptyState icon={ChartPie} title="Nessuna vendita nel periodo" description="Il menu engineering si calcola sui piatti venduti." />
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
          {Object.entries(CLASSE_MENU).map(([k2, v]) => <span key={k2} className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-full" style={{ background: COLORE_CLASSE[k2] }} aria-hidden />{v.label}</span>)}
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <XAxis type="number" dataKey="quota_pct" name="Quota vendite" unit="%" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground"
              label={{ value: 'Popolarità (quota sulle vendite)', position: 'insideBottom', offset: -18, fontSize: 12 }} />
            <YAxis type="number" dataKey="margine_unitario" name="Margine" unit=" €" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground"
              label={{ value: 'Margine per piatto', angle: -90, position: 'insideLeft', fontSize: 12 }} />
            <ZAxis type="number" dataKey="venduti" range={[60, 400]} name="Venduti" />
            <ReferenceLine x={soglia} stroke="var(--border)" strokeDasharray="4 4" />
            <ReferenceLine y={margineMedio} stroke="var(--border)" strokeDasharray="4 4" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, nome) => [nome === 'Margine' ? fmtEuro(Number(v)) : nome === 'Quota vendite' ? `${v}%` : String(v), String(nome)]}
              labelFormatter={() => ''} />
            <Scatter data={righe.map((r) => ({ ...r, quota_pct: Number(r.quota_pct), margine_unitario: Number(r.margine_unitario), venduti: Number(r.venduti) }))}>
              {righe.map((r) => <Cell key={r.prodotto_id} fill={COLORE_CLASSE[r.classe]} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground">Le linee tratteggiate sono le soglie: popolarità al 70% della quota media ({fmtNumero(soglia, 1)}%), margine medio ponderato ({fmtEuro(margineMedio)}).</p>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Piatto</TableHead><TableHead className="text-right">Venduti</TableHead><TableHead className="text-right">Quota</TableHead><TableHead className="text-right">Prezzo netto</TableHead>
            <TableHead className="text-right">Costo</TableHead><TableHead className="text-right">Margine</TableHead><TableHead className="text-right">Food cost</TableHead><TableHead>Classe e consiglio</TableHead></TableRow></TableHeader>
          <TableBody>
            {righe.map((r) => {
              const cm = CLASSE_MENU[r.classe]
              return (
                <TableRow key={r.prodotto_id}>
                  <TableCell><span className="font-medium text-foreground">{r.prodotto}</span><span className="block text-xs text-muted-foreground">{r.categoria}</span></TableCell>
                  <TableCell numerica>{fmtNumero(r.venduti)}</TableCell><TableCell numerica>{fmtNumero(r.quota_pct, 1)}%</TableCell>
                  <TableCell numerica>{fmtEuro(r.prezzo_medio)}</TableCell><TableCell numerica>{fmtEuro(r.costo_unitario)}</TableCell>
                  <TableCell numerica>{fmtEuro(r.margine_unitario)}</TableCell><TableCell numerica>{r.food_cost_pct != null ? `${fmtNumero(r.food_cost_pct, 1)}%` : '—'}</TableCell>
                  <TableCell><Badge tone={cm?.tone ?? 'neutral'}>{cm?.label ?? r.classe}</Badge><span className="ml-2 text-xs text-muted-foreground">{cm?.consiglio}</span></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function FoodCost({ dal, al }: { dal: string; al: string }) {
  const { localeId } = useFb()
  const [dimensione, setDimensione] = useState('categoria')
  const { data: righe = [] } = useRpc<Fc[]>('fb_food_cost', { p_locale: localeId, p_dal: dal, p_al: al, p_dimensione: dimensione }, { abilitato: !!localeId })
  const DIM: Record<string, string> = { piatto: 'Piatto', categoria: 'Categoria', menu: 'Menu o listino', giorno: 'Giorno', chef: 'Chef', canale: 'Canale di vendita', area: 'Cucina e bevande', bevanda: 'Tipo di bevanda' }
  return (
    <div className="space-y-3">
      <div className="w-56 space-y-1.5"><Label>Per</Label><Select value={dimensione} onValueChange={setDimensione}><SelectTrigger aria-label="Dimensione"><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(DIM).map(([k2, l]) => <SelectItem key={k2} value={k2}>{l}</SelectItem>)}</SelectContent></Select></div>
      {righe.length === 0 ? <EmptyState compatto icon={ChartPie} title="Nessuna vendita nel periodo" description="Allarga il periodo." /> : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>{DIM[dimensione]}</TableHead><TableHead className="text-right">Quantità</TableHead><TableHead className="text-right">Ricavo netto</TableHead>
              <TableHead className="text-right">Costo</TableHead><TableHead className="text-right">Margine</TableHead><TableHead className="text-right">Food cost</TableHead></TableRow></TableHeader>
            <TableBody>
              {righe.map((r) => (
                <TableRow key={r.chiave}>
                  <TableCell className="text-foreground">{dimensione === 'canale' ? CANALE_LABEL[r.chiave] ?? r.chiave : dimensione === 'area' ? (r.chiave === 'food' ? 'Cucina' : 'Bevande') : r.chiave}</TableCell>
                  <TableCell numerica>{fmtNumero(r.quantita)}</TableCell><TableCell numerica>{fmtEuro(r.ricavo)}</TableCell><TableCell numerica>{fmtEuro(r.costo)}</TableCell>
                  <TableCell numerica>{fmtEuro(r.margine)}</TableCell>
                  <TableCell numerica>{r.food_cost_pct != null ? <Badge tone={r.food_cost_pct <= 30 ? 'success' : r.food_cost_pct <= 38 ? 'warning' : 'danger'}>{fmtNumero(r.food_cost_pct, 1)}%</Badge> : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Bevande({ modulo, dal, al }: { modulo: string; dal: string; al: string }) {
  const { data: righe = [] } = useRpc<Bev[]>('fb_beverage_controllo', { p_modulo: modulo, p_dal: dal, p_al: al })
  return righe.length === 0 ? <EmptyState compatto icon={ChartPie} title="Nessun movimento di bevande" description="Il confronto si fa sulle bevande vendute e sugli inventari del periodo." /> : (
    <div className="space-y-3">
      <p className="max-w-[80ch] text-sm text-muted-foreground">Consumo teorico (dalle vendite) contro effettivo (con sprechi registrati e ammanchi trovati negli inventari): oltre il 5% è un'anomalia da verificare.</p>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Bevanda</TableHead><TableHead className="text-right">Teorico</TableHead><TableHead className="text-right">Sprechi</TableHead><TableHead className="text-right">Ammanchi</TableHead>
            <TableHead className="text-right">Effettivo</TableHead><TableHead className="text-right">Scostamento</TableHead><TableHead className="text-right">Valore</TableHead></TableRow></TableHeader>
          <TableBody>
            {righe.map((r) => (
              <TableRow key={r.articolo_id}>
                <TableCell className="text-foreground">{r.articolo} <span className="text-xs text-muted-foreground">({r.unita})</span></TableCell>
                <TableCell numerica>{fmtNumero(r.teorico, 2)}</TableCell><TableCell numerica>{fmtNumero(r.sprechi, 2)}</TableCell><TableCell numerica>{fmtNumero(r.ammanchi, 2)}</TableCell>
                <TableCell numerica>{fmtNumero(r.effettivo, 2)}</TableCell>
                <TableCell numerica>{r.anomalia ? <Badge tone="danger">{r.scostamento_pct != null ? `${fmtNumero(r.scostamento_pct, 1)}%` : 'ammanco'}</Badge> : r.scostamento_pct != null ? `${fmtNumero(r.scostamento_pct, 1)}%` : '—'}</TableCell>
                <TableCell numerica>{fmtEuro(r.valore_scostamento)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function SprechiAnalisi({ dal, al }: { dal: string; al: string }) {
  const { localeId } = useFb()
  const { data: righe = [] } = useRpc<Spreco[]>('fb_sprechi_analisi', { p_locale: localeId, p_dal: dal, p_al: al }, { abilitato: !!localeId })
  const totale = righe.reduce((s, r) => s + Number(r.costo), 0)
  return righe.length === 0 ? <EmptyState compatto icon={ChartPie} title="Nessuno spreco nel periodo" description="Scarti, deterioramenti, piatti rifatti e omaggi compaiono qui con il loro costo." /> : (
    <Card className="p-5">
      <p className="mb-3 text-sm text-muted-foreground">Costo complessivo degli sprechi: <span className="font-semibold text-foreground">{fmtEuro(totale)}</span></p>
      <Righe voci={righe.map((r) => [`${SPRECO_CAUSALE[r.causale] ?? r.causale} (${r.eventi})`, fmtEuro(r.costo)] as [string, string])} />
    </Card>
  )
}

interface Tempo { prodotto: string; stazione: string | null; piatti: number; tempo_medio_min: number; tempo_massimo_min: number
  tempo_previsto_min: number | null; in_ritardo: number; attesa_servizio_min: number | null }

function TempiCucina({ dal, al }: { dal: string; al: string }) {
  const { localeId } = useFb()
  const { data: righe = [] } = useRpc<Tempo[]>('fb_tempi_cucina', { p_locale: localeId, p_dal: dal, p_al: al }, { abilitato: !!localeId })
  return righe.length === 0 ? <EmptyState compatto icon={ChartPie} title="Nessun piatto preparato nel periodo" description="I tempi si misurano dall'invio in cucina al piatto pronto." /> : (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader><TableRow><TableHead>Piatto</TableHead><TableHead>Postazione</TableHead><TableHead className="text-right">Preparati</TableHead><TableHead className="text-right">Tempo medio</TableHead>
          <TableHead className="text-right">Massimo</TableHead><TableHead className="text-right">Previsto</TableHead><TableHead className="text-right">In ritardo</TableHead><TableHead className="text-right">Attesa al pass</TableHead></TableRow></TableHeader>
        <TableBody>
          {righe.map((r, i) => (
            <TableRow key={`${r.prodotto}-${i}`}>
              <TableCell className="text-foreground">{r.prodotto}</TableCell><TableCell className="text-muted-foreground">{r.stazione ?? '—'}</TableCell>
              <TableCell numerica>{r.piatti}</TableCell><TableCell numerica>{fmtNumero(r.tempo_medio_min, 1)} min</TableCell>
              <TableCell numerica>{fmtNumero(r.tempo_massimo_min, 1)} min</TableCell><TableCell numerica>{r.tempo_previsto_min != null ? `${r.tempo_previsto_min} min` : '—'}</TableCell>
              <TableCell numerica>{r.in_ritardo > 0 ? <Badge tone="warning">{r.in_ritardo}</Badge> : 0}</TableCell>
              <TableCell numerica>{r.attesa_servizio_min != null ? `${fmtNumero(r.attesa_servizio_min, 1)} min` : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
