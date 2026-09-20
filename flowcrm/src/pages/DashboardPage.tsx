import {
  Building2, BookUser, CircleDollarSign, Briefcase, TrendingUp,
  FolderKanban, CheckSquare, CalendarDays, Users,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardKpi, usePipelinePesata } from '@/lib/queries/dashboard'
import { useMieAttivita, useRiunioni } from '@/lib/queries/attivita'
import { Card } from '@/components/ui/card'
import { SchedaKpi } from '@/components/ui/kpi'

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export function DashboardPage() {
  const { userProfile } = useAuth()
  const { data: kpi } = useDashboardKpi()
  const { data: pipeline = [] } = usePipelinePesata()
  const { data: mieAttivita = [], isPending: attivitaInCorso } = useMieAttivita(userProfile?.id)
  const { data: riunioni = [], isPending: riunioniInCorso } = useRiunioni()
  const aperte = mieAttivita.filter((a) => a.stato !== 'completata' && a.stato !== 'annullata')
  const daFare = aperte.slice(0, 6)

  const ora = Date.now()
  const prossimeRiunioni = riunioni
    .filter((r) => r.inizio && new Date(r.inizio).getTime() >= ora)
    .slice(0, 5)

  const chartData = pipeline.map((s) => ({
    nome: s.nome,
    pesato: Number(s.valore_pesato),
    colore: s.colore ?? 'var(--color-primary)',
  }))

  return (
    <div>
      <h1 className="text-headline text-foreground">
        Ciao{userProfile ? `, ${userProfile.nome}` : ''}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Ecco la situazione operativa.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <SchedaKpi icona={Building2} etichetta="Organizzazioni" tinta="bg-accent text-accent-foreground" a="/organizzazioni"
          valore={kpi?.organizzazioni} ampia />
        <SchedaKpi icona={BookUser} etichetta="Contatti" tinta="bg-muted text-muted-foreground" a="/contatti"
          valore={kpi?.contatti} ampia />
        <SchedaKpi icona={CircleDollarSign} etichetta="Deal aperti" tinta="bg-muted text-muted-foreground" a="/deal"
          valore={kpi?.deal} ampia />
        <SchedaKpi icona={Briefcase} etichetta="Commesse attive" tinta="bg-muted text-muted-foreground" a="/commesse"
          valore={kpi?.commesse} ampia />
        <SchedaKpi icona={FolderKanban} etichetta="Progetti attivi" tinta="bg-muted text-muted-foreground" a="/progetti"
          valore={kpi?.progetti} ampia />
        <SchedaKpi icona={CheckSquare} etichetta="Attività da fare" tinta="bg-muted text-muted-foreground" a="/attivita"
          valore={attivitaInCorso ? undefined : aperte.length} ampia />
        <SchedaKpi icona={CalendarDays} etichetta="Riunioni in arrivo" tinta="bg-muted text-muted-foreground" a="/riunioni"
          valore={riunioniInCorso ? undefined : prossimeRiunioni.length} ampia />
        <SchedaKpi icona={TrendingUp} etichetta="Valore pipeline" tinta="bg-muted text-muted-foreground" a="/kanban"
          valore={kpi?.pipelinePesata} formato="euro" ampia />
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-testo" />
            <h2 className="text-title text-foreground">Pipeline pesata</h2>
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
                contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }}
              />
              <Bar dataKey="pesato" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.colore} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary-testo" />
              <h2 className="text-title text-foreground">Le mie attività da fare</h2>
            </div>
            <Link to="/attivita" className="text-sm text-primary-testo hover:underline">Vedi tutte</Link>
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
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-testo" />
              <h2 className="text-title text-foreground">Prossime riunioni</h2>
            </div>
            <Link to="/riunioni" className="text-sm text-primary-testo hover:underline">Vedi tutte</Link>
          </div>
          {prossimeRiunioni.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nessuna riunione in programma.</p>
          ) : (
            <ul className="divide-y divide-border">
              {prossimeRiunioni.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-sm font-medium text-foreground">{r.titolo}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.inizio && new Date(r.inizio).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
