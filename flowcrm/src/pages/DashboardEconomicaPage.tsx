import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { useFatturatoMensile, useCashFlow } from '@/lib/queries/dashboard'

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

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

  const fatturatoData = fatturato.map((r) => ({ mese: meseLabel(r.mese as string), totale: Number(r.totale) }))
  const cashData = cashflow.map((r) => ({
    mese: meseLabel(r.mese as string),
    entrate: Number(r.entrate),
    uscite: Number(r.uscite),
  }))

  return (
    <div>
      <PageHeader title="Dashboard economica" description="Fatturato e flusso di cassa, derivati dai dati reali." />

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
    </div>
  )
}
