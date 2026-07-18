/**
 * DirezioneCommercialePage — confronto della rete vendita (documento
 * §16-§17): tabella comparativa per agente (visite, ordini, conversione,
 * fatturato per visita, provvigioni) + grafico venduto. Manager-only
 * (route sotto ManagerOnly; la vista non espone dati agli altri).
 */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { useNavigate } from 'react-router-dom'
import { fmtImporto } from '@/modules/agenti/stati'
import { useAgentiKpi } from '@/modules/agenti/queries/agenti'

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
}

export function DirezioneCommercialePage() {
  const navigate = useNavigate()
  const { data: kpi = [] } = useAgentiKpi()

  const chartData = kpi.slice(0, 8).map((k) => ({
    nome: k.agente as string,
    valore: Number(k.valore_ordini ?? 0),
  }))

  return (
    <div>
      <PageHeader
        title="Direzione commerciale"
        description="Confronto della rete vendita: attività, risultati, efficienza (anno corrente)."
      />

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Venduto per agente</h2>
        </div>
        {chartData.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Nessun dato"
            description="Il confronto compare con i primi ordini della rete." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 44)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" tickFormatter={(v) => `€${(Number(v) / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
              <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 12 }}
                stroke="currentColor" className="text-muted-foreground" />
              <Tooltip formatter={(v) => [fmtImporto(Number(v)), 'Venduto']} contentStyle={tooltipStyle} />
              <Bar dataKey="valore" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Confronto agenti</h3>
        </div>
        {kpi.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Users} title="Nessun agente" description="Registra la rete vendita per vedere il confronto." />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agente</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visite</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ordini</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Venduto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversione</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">€/visita</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provvigioni</th>
              </tr>
            </thead>
            <tbody>
              {kpi.map((k) => (
                <tr key={k.agente_id as string}
                  onClick={() => navigate(`/agenti/${k.agente_id}`)}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{k.agente as string}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{k.visite}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{k.ordini}</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">
                    {fmtImporto(Number(k.valore_ordini ?? 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {k.tasso_conversione != null ? `${k.tasso_conversione}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {k.fatturato_per_visita != null ? fmtImporto(Number(k.fatturato_per_visita)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {fmtImporto(Number(k.provvigioni_anno ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
