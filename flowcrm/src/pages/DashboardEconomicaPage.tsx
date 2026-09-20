import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, Wallet, Euro, Clock, AlertTriangle, Landmark } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'
import { SchedaKpi } from '@/components/ui/kpi'
import {
  useFatturatoMensile, useCashFlow, useKpiEconomici, useTopClienti,
} from '@/lib/queries/dashboard'

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const meseLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--card)',
}

export function DashboardEconomicaPage() {
  const { data: fatturato = [] } = useFatturatoMensile()
  const { data: cashflow = [] } = useCashFlow()
  const { data: kpi, isPending: kpiInCorso } = useKpiEconomici()
  const { data: topClienti = [] } = useTopClienti(5)

  const fatturatoData = fatturato.map((r) => ({ mese: meseLabel(r.mese as string), totale: Number(r.totale) }))
  const cashData = cashflow.map((r) => ({
    mese: meseLabel(r.mese as string),
    entrate: Number(r.entrate),
    uscite: Number(r.uscite),
  }))
  const topData = topClienti.map((c) => ({ nome: (c.ragione_sociale as string) ?? '—', totale: Number(c.totale) }))

  return (
    <div>
      <PageHeader title="Dashboard economica" description="Fatturato e flusso di cassa, derivati dai dati reali." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SchedaKpi icona={Euro} etichetta="Fatturato anno" tinta="bg-accent text-accent-foreground"
          formato="euro" valore={kpiInCorso ? undefined : Number(kpi?.fatturato_ytd ?? 0)} />
        <SchedaKpi icona={Clock} etichetta="Da incassare" tinta="bg-muted text-muted-foreground"
          formato="euro" valore={kpiInCorso ? undefined : Number(kpi?.da_incassare ?? 0)} />
        <SchedaKpi icona={AlertTriangle} etichetta="Scaduto" tinta="bg-destructive-tenue text-destructive-testo"
          formato="euro" valore={kpiInCorso ? undefined : Number(kpi?.scaduto ?? 0)} />
        <SchedaKpi icona={Wallet} etichetta="Incassato (mese)" tinta="bg-muted text-muted-foreground"
          formato="euro" valore={kpiInCorso ? undefined : Number(kpi?.incassato_mese ?? 0)} />
        <SchedaKpi icona={Landmark} etichetta="Tasse 30gg" tinta="bg-muted text-muted-foreground"
          formato="euro" valore={kpiInCorso ? undefined : Number(kpi?.tasse_30gg ?? 0)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-testo" />
            <h2 className="text-title text-foreground">Fatturato mensile</h2>
          </div>
          {fatturatoData.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Nessun dato" description="Registra fatture attive per vedere il fatturato." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fatturatoData}>
                <XAxis dataKey="mese" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip formatter={(v) => [fmtEuro(Number(v)), 'Fatturato']} contentStyle={tooltipStyle} />
                <Bar dataKey="totale" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary-testo" />
            <h2 className="text-title text-foreground">Cash flow previsto</h2>
          </div>
          {cashData.length === 0 ? (
            <EmptyState icon={Wallet} title="Nessun dato" description="Incassi previsti e scadenze fiscali appariranno qui." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cashData}>
                <XAxis dataKey="mese" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip formatter={(v) => fmtEuro(Number(v))} contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="entrate" name="Entrate" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="uscite" name="Uscite" fill="var(--color-chart-5)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-testo" />
          <h2 className="text-title text-foreground">Top clienti per fatturato</h2>
        </div>
        {topData.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Nessun dato" description="Registra fatture attive per vedere i clienti principali." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, topData.length * 44)}>
            <BarChart data={topData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
              <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
              <Tooltip formatter={(v) => [fmtEuro(Number(v)), 'Fatturato']} contentStyle={tooltipStyle} />
              <Bar dataKey="totale" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}
