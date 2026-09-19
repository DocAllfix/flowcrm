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
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, CollegamentoRiga } from '@/components/ui/table'
import { Card } from '@/components/ui/card'

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--card)',
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

      <Card className="mb-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-title text-foreground">Venduto per agente</h2>
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
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Confronto agenti</h3>
        </div>
        {kpi.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Users} title="Nessun agente" description="Registra la rete vendita per vedere il confronto." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agente</TableHead>
                <TableHead numerica>Visite</TableHead>
                <TableHead numerica>Ordini</TableHead>
                <TableHead numerica>Venduto</TableHead>
                <TableHead numerica>Conversione</TableHead>
                <TableHead numerica>€/visita</TableHead>
                <TableHead numerica>Provvigioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpi.map((k) => (
                <TableRow key={k.agente_id as string} onActivate={() => navigate(`/agenti/${k.agente_id}`)}>
                  <TableCell>
                    <CollegamentoRiga to={`/agenti/${k.agente_id}`}>{k.agente as string}</CollegamentoRiga>
                  </TableCell>
                  <TableCell numerica className="text-muted-foreground">{k.visite}</TableCell>
                  <TableCell numerica className="text-muted-foreground">{k.ordini}</TableCell>
                  <TableCell numerica className="font-bold text-foreground">
                    {fmtImporto(Number(k.valore_ordini ?? 0))}
                  </TableCell>
                  <TableCell numerica className="text-muted-foreground">
                    {k.tasso_conversione != null ? `${k.tasso_conversione}%` : '—'}
                  </TableCell>
                  <TableCell numerica className="text-muted-foreground">
                    {k.fatturato_per_visita != null ? fmtImporto(Number(k.fatturato_per_visita)) : '—'}
                  </TableCell>
                  <TableCell numerica className="text-muted-foreground">
                    {fmtImporto(Number(k.provvigioni_anno ?? 0))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
