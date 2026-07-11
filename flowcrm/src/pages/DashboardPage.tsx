import {
  Building2, BookUser, CircleDollarSign, Briefcase, TrendingUp,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Link } from 'react-router-dom'
import { CheckSquare } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardKpi, usePipelinePesata } from '@/lib/queries/dashboard'
import { useMieAttivita } from '@/lib/queries/attivita'

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function KpiCard({ icon: Icon, label, value, tint }: {
  icon: React.ElementType; label: string; value: string; tint: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-3xl font-bold text-foreground">{value}</span>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

export function DashboardPage() {
  const { userProfile } = useAuth()
  const { data: kpi } = useDashboardKpi()
  const { data: pipeline = [] } = usePipelinePesata()
  const { data: mieAttivita = [] } = useMieAttivita(userProfile?.id)
  const daFare = mieAttivita.filter((a) => a.stato !== 'completata' && a.stato !== 'annullata').slice(0, 6)

  const chartData = pipeline.map((s) => ({
    nome: s.nome,
    pesato: Number(s.valore_pesato),
    colore: s.colore ?? '#ff5c35',
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">
        Ciao{userProfile ? `, ${userProfile.nome}` : ''} 👋
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Ecco la situazione operativa.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Building2} label="Organizzazioni" tint="bg-orange-50 text-primary"
          value={String(kpi?.organizzazioni ?? 0)} />
        <KpiCard icon={BookUser} label="Contatti" tint="bg-blue-50 text-blue-500"
          value={String(kpi?.contatti ?? 0)} />
        <KpiCard icon={CircleDollarSign} label="Deal aperti" tint="bg-green-50 text-green-600"
          value={String(kpi?.deal ?? 0)} />
        <KpiCard icon={Briefcase} label="Commesse attive" tint="bg-purple-50 text-purple-600"
          value={String(kpi?.commesse ?? 0)} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Pipeline pesata</h2>
          </div>
          <span className="text-sm text-muted-foreground">
            Totale: <span className="font-bold text-foreground">{fmtEuro(kpi?.pipelinePesata ?? 0)}</span>
          </span>
        </div>
        {chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nessun deal in pipeline</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <XAxis dataKey="nome" tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
              <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
              <Tooltip
                formatter={(v) => [fmtEuro(Number(v)), 'Valore pesato']}
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              />
              <Bar dataKey="pesato" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.colore} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Le mie attività da fare</h2>
          </div>
          <Link to="/attivita" className="text-sm text-primary hover:underline">Vedi tutte</Link>
        </div>
        {daFare.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nessuna attività in sospeso. Ottimo lavoro!</p>
        ) : (
          <ul className="divide-y divide-border">
            {daFare.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm font-medium text-foreground">{a.titolo}</span>
                {a.scadenza && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(a.scadenza).toLocaleDateString('it-IT')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
