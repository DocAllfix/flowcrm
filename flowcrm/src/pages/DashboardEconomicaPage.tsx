import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, Wallet, Euro, Clock, AlertTriangle, Landmark } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import {
  useFatturatoMensile, useCashFlow, useKpiEconomici, useTopClienti,
} from '@/lib/queries/dashboard'

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function KpiEco({ icon: Icon, label, value, tint }: {
  icon: React.ElementType; label: string; value: string; tint: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tint}`}><Icon className="h-4 w-4" /></div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  )
}

const meseLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
}

export function DashboardEconomicaPage() {
  const { data: fatturato = [] } = useFatturatoMensile()
  const { data: cashflow = [] } = useCashFlow()
  const { data: kpi } = useKpiEconomici()
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
        <KpiEco icon={Euro} label="Fatturato anno" tint="bg-orange-50 text-primary" value={fmtEuro(Number(kpi?.fatturato_ytd ?? 0))} />
        <KpiEco icon={Clock} label="Da incassare" tint="bg-blue-50 text-blue-600" value={fmtEuro(Number(kpi?.da_incassare ?? 0))} />
        <KpiEco icon={AlertTriangle} label="Scaduto" tint="bg-red-50 text-red-600" value={fmtEuro(Number(kpi?.scaduto ?? 0))} />
        <KpiEco icon={Wallet} label="Incassato (mese)" tint="bg-green-50 text-green-600" value={fmtEuro(Number(kpi?.incassato_mese ?? 0))} />
        <KpiEco icon={Landmark} label="Tasse 30gg" tint="bg-purple-50 text-purple-600" value={fmtEuro(Number(kpi?.tasse_30gg ?? 0))} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Fatturato mensile</h2>
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
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Cash flow previsto</h2>
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
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Top clienti per fatturato</h2>
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
      </div>
    </div>
  )
}
