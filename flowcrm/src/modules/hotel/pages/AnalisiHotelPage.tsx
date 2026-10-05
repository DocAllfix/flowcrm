/**
 * Analisi e revenue (documento Hotel §11, §45–47): occupazione, ADR, RevPAR,
 * TRevPAR e GOPPAR stimato, ricavi per reparto, LOS, lead time, booking pace,
 * pickup, cancellazioni, no-show, prenotazioni dirette, costo dei portali,
 * clienti; previsione dei prossimi giorni; confronto tra strutture.
 */
import { useState } from 'react'
import { ChartPie } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { ManagerOnly } from '@/components/ManagerOnly'
import type { Database } from '@/types/database.types'
import { useRpc } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { CANALE, REPARTO, fmtEuro, fmtNumero, oggiIso, piuGiorni } from '@/modules/hotel/stati'

type Kpi = Record<string, Record<string, unknown>>
type Forecast = Database['public']['Functions']['hotel_forecast']['Returns'][number]
type Confronto = Database['public']['Functions']['hotel_confronto_strutture']['Returns'][number]
const tooltipStyle = { borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }

export function AnalisiHotelPage() {
  return <ManagerOnly><ConStruttura><Analisi_ /></ConStruttura></ManagerOnly>
}

function Analisi_() {
  const { strutturaId, strutture } = useHotel()
  const [dal, setDal] = useState(piuGiorni(oggiIso(), -29))
  const [al, setAl] = useState(oggiIso())
  const { data: k, isLoading } = useRpc<Kpi>('hotel_kpi', { p_struttura: strutturaId, p_dal: dal, p_al: al }, { abilitato: !!strutturaId })
  const { data: forecast = [] } = useRpc<Forecast[]>('hotel_forecast', { p_struttura: strutturaId, p_dal: oggiIso(), p_al: piuGiorni(oggiIso(), 29) }, { abilitato: !!strutturaId })
  const { data: confronto = [] } = useRpc<Confronto[]>('hotel_confronto_strutture', { p_dal: dal, p_al: al }, { abilitato: strutture.length > 1 })
  const o = k?.occupazione ?? {}
  const r = k?.redditivita ?? {}
  const v = k?.vendite ?? {}
  const c = k?.clienti ?? {}
  const euro = (x: unknown) => fmtEuro(x as number)
  const pct = (x: unknown) => (x == null ? '—' : `${fmtNumero(x as number, 1)}%`)
  const reparti = Object.entries((v.per_reparto ?? {}) as Record<string, number>).map(([kk, val]) => ({ reparto: REPARTO[kk] ?? kk, ricavo: Number(val) }))
  const pace = Object.entries((v.booking_pace ?? {}) as Record<string, number>).map(([s, n]) => ({
    settimana: new Date(`${s}T12:00`).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }), prenotazioni: n }))
  const costi = (r.costi_stimati ?? {}) as Record<string, number>
  const voce = (l: string, val: string) => <div key={l} className="flex items-baseline justify-between gap-3 py-1.5"><dt className="text-muted-foreground">{l}</dt><dd data-slot="kpi" className="text-foreground">{val}</dd></div>

  return (
    <div>
      <PageHeader title="Analisi e revenue" description="I numeri della direzione: occupazione, ricavi per camera disponibile, canali, clienti, previsione."
        numeri={[
          { etichetta: 'occupazione', valore: pct(o.occupazione_pct), inCaricamento: isLoading },
          { etichetta: 'ADR', valore: euro(r.adr), inCaricamento: isLoading },
          { etichetta: 'RevPAR', valore: euro(r.revpar), inCaricamento: isLoading },
          { etichetta: 'ricavi', valore: fmtEuro(r.ricavi_totali as number, 0), inCaricamento: isLoading },
        ]}
        actions={<SelettoreStruttura />} />

      <Card className="mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label htmlFor="ah-dal">Dal</Label><Input id="ah-dal" type="date" className="w-40" value={dal} onChange={(e) => setDal(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="ah-al">Al</Label><Input id="ah-al" type="date" className="w-40" value={al} onChange={(e) => setAl(e.target.value)} /></div>
        {[['7 giorni', -6], ['30 giorni', -29], ['90 giorni', -89], ['Prossimi 30', 29]].map(([l, g]) => (
          <Button key={l} variant="ghost" onClick={() => { const n = g as number
            if (n > 0) { setDal(oggiIso()); setAl(piuGiorni(oggiIso(), n)) } else { setDal(piuGiorni(oggiIso(), n)); setAl(oggiIso()) } }}>{l}</Button>
        ))}
        <p className="ml-auto text-xs text-muted-foreground">Ricavi al netto dell'IVA; la tassa di soggiorno non è un ricavo.</p>
      </Card>

      {isLoading ? <Skeleton className="h-96" /> : !k ? (
        <EmptyState icon={ChartPie} title="Nessun dato" description="Scegli un periodo." />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-3 text-title text-foreground">Occupazione e redditività</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Camere-notte disponibili', fmtNumero(o.camere_disponibili as number)), voce('Camere-notte vendute', fmtNumero(o.camere_vendute as number)),
              voce('Occupancy', pct(o.occupazione_pct)), voce('ADR (prezzo medio a camera)', euro(r.adr)), voce('RevPAR', euro(r.revpar)),
              voce('TRevPAR (tutti i ricavi)', euro(r.trevpar)), voce('Ricavo per ospite', euro(r.ricavo_per_ospite)),
              voce('GOP stimato', euro(r.gop_stimato)), voce('GOPPAR stimato', euro(r.goppar_stimato)),
            ]}</dl>
            <p className="mt-2 text-xs text-muted-foreground">Costi stimati: personale {fmtEuro(costi.personale)}, manutenzioni {fmtEuro(costi.manutenzioni)}, biancheria {fmtEuro(costi.biancheria)},
              transfer {fmtEuro(costi.transfer)}, minibar {fmtEuro(costi.minibar)}, commissioni {fmtEuro(costi.commissioni)}.</p>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-title text-foreground">Prenotazioni e canali</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Prenotazioni con arrivo nel periodo', fmtNumero(v.prenotazioni as number)), voce('Durata media (LOS)', o.los != null ? `${fmtNumero(o.los as number, 2)} ${Number(o.los) === 1 ? 'notte' : 'notti'}` : '—'),
              voce('Anticipo medio (lead time)', o.lead_time_giorni != null ? `${fmtNumero(o.lead_time_giorni as number, 1)} giorni` : '—'),
              voce('Cancellation rate', pct(v.cancellation_rate_pct)), voce('No-show rate', pct(v.no_show_rate_pct)),
              voce('Prenotazioni dirette', pct(v.dirette_pct)), voce('Costo dei portali (OTA)', pct(v.costo_ota_pct)),
              voce('Pickup ultimi 7 giorni', `${fmtNumero(v.pickup_7_giorni as number)} camere-notte`),
            ]}</dl>
            <p className="mt-2 text-sm text-muted-foreground">Per canale: {Object.entries((v.per_canale ?? {}) as Record<string, number>).map(([kk, n]) => `${CANALE[kk] ?? kk} ${n}`).join(' · ') || '—'}</p>
          </Card>
          <Card className="p-5">
            <h2 className="mb-1 text-title text-foreground">Ricavi per reparto</h2>
            {reparti.length === 0 ? <p className="text-sm text-muted-foreground">Nessun ricavo nel periodo.</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={reparti}>
                  <XAxis dataKey="reparto" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip formatter={(x) => [fmtEuro(Number(x)), 'Ricavo netto']} contentStyle={tooltipStyle} />
                  <Bar dataKey="ricavo" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-title text-foreground">Clienti</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Ospiti identificati', fmtNumero(c.ospiti_identificati as number)), voce('Nuovi', fmtNumero(c.nuovi as number)), voce('Abituali', fmtNumero(c.abituali as number)),
              voce('NPS', c.nps != null ? fmtNumero(c.nps as number) : '—'), voce('Valutazione media', c.valutazione_media != null ? `${fmtNumero(c.valutazione_media as number, 1)} / 5` : '—'),
              voce('Recensioni', fmtNumero(c.recensioni as number)), voce('Reclami', fmtNumero(c.reclami as number)),
            ]}</dl>
          </Card>
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-1 text-title text-foreground">Prossimi 30 giorni: venduto e previsto</h2>
            <p className="mb-2 text-sm text-muted-foreground">Il previsto aggiunge al venduto il pickup medio osservato alla stessa distanza dall'arrivo.</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={forecast.map((f) => ({ giorno: new Date(`${f.data}T12:00`).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
                Venduto: Number(f.occupazione_pct ?? 0), Previsto: Math.max(0, Number(f.prevista_pct ?? 0) - Number(f.occupazione_pct ?? 0)) }))}>
                <XAxis dataKey="giorno" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip formatter={(x, n) => [`${fmtNumero(Number(x), 1)}%`, n]} contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="Venduto" stackId="o" fill="var(--color-chart-1)" />
                <Bar dataKey="Previsto" stackId="o" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          {pace.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-1 text-title text-foreground">Booking pace</h2>
              <p className="mb-2 text-sm text-muted-foreground">Prenotazioni prese ogni settimana per soggiorni del periodo.</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pace}>
                  <XAxis dataKey="settimana" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="prenotazioni" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
          {confronto.length > 1 && (
            <Card className="overflow-x-auto lg:col-span-2">
              <h2 className="px-5 pt-4 text-title text-foreground">Confronto tra strutture</h2>
              <Table>
                <TableHeader><TableRow><TableHead>Struttura</TableHead><TableHead className="text-right">Occupancy</TableHead><TableHead className="text-right">ADR</TableHead>
                  <TableHead className="text-right">RevPAR</TableHead><TableHead className="text-right">TRevPAR</TableHead><TableHead className="text-right">Ricavi</TableHead></TableRow></TableHeader>
                <TableBody>{confronto.map((s) => (
                  <TableRow key={s.struttura_id}><TableCell className="text-foreground">{s.struttura}</TableCell><TableCell numerica>{pct(s.occupazione_pct)}</TableCell>
                    <TableCell numerica>{fmtEuro(s.adr)}</TableCell><TableCell numerica>{fmtEuro(s.revpar)}</TableCell><TableCell numerica>{fmtEuro(s.trevpar)}</TableCell>
                    <TableCell numerica>{fmtEuro(s.ricavi_totali)}</TableCell></TableRow>))}</TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
