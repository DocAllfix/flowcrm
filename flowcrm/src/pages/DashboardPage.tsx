import {
  Building2, BookUser, CircleDollarSign, Briefcase, TrendingUp,
  FolderKanban, CheckSquare, CalendarDays, Users, ArrowRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardKpi, usePipelinePesata } from '@/lib/queries/dashboard'
import { useMieAttivita, useRiunioni } from '@/lib/queries/attivita'
import { Card } from '@/components/ui/card'

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function KpiCard({ icon: Icon, label, value, tint, to, inCaricamento }: {
  icon: React.ElementType
  label: string
  /** `undefined` finché il dato non è arrivato: NON zero. */
  value: string | undefined
  tint: string
  to: string
  inCaricamento?: boolean
}) {
  return (
    <Link
      to={to}
      // `transition-colors` e non `transition-all`: quest'ultima anima
      // anche ciò che non cambia, e costringe il browser a ricalcolare
      // proprietà che nessuno ha toccato.
      className="group rounded-lg border border-border bg-card p-5 transition-[box-shadow,border-color] hover:border-input hover:shadow-risposta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex size-11 items-center justify-center rounded-md ${tint}`}>
          <Icon className="size-5" aria-hidden />
        </div>
        {/* Mai uno zero provvisorio al posto del dato che deve arrivare:
            l'utente lo legge prima di capire che non era vero. */}
        {inCaricamento || value === undefined ? (
          <span
            aria-hidden
            className="h-8 w-16 rounded-md bg-muted motion-safe:animate-pulse"
          />
        ) : (
          <span data-slot="kpi" className="text-3xl font-semibold text-foreground">
            {value}
          </span>
        )}
      </div>
      <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground group-hover:text-foreground">
        {label}
        <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </p>
    </Link>
  )
}

export function DashboardPage() {
  const { userProfile } = useAuth()
  const { data: kpi, isPending: kpiInCorso } = useDashboardKpi()
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
        <KpiCard icon={Building2} label="Organizzazioni" tint="bg-primary/10 text-primary" to="/organizzazioni"
          value={kpi ? String(kpi.organizzazioni) : undefined} inCaricamento={kpiInCorso} />
        <KpiCard icon={BookUser} label="Contatti" tint="bg-muted text-muted-foreground" to="/contatti"
          value={kpi ? String(kpi.contatti) : undefined} inCaricamento={kpiInCorso} />
        <KpiCard icon={CircleDollarSign} label="Deal aperti" tint="bg-muted text-muted-foreground" to="/deal"
          value={kpi ? String(kpi.deal) : undefined} inCaricamento={kpiInCorso} />
        <KpiCard icon={Briefcase} label="Commesse attive" tint="bg-muted text-muted-foreground" to="/commesse"
          value={kpi ? String(kpi.commesse) : undefined} inCaricamento={kpiInCorso} />
        <KpiCard icon={FolderKanban} label="Progetti attivi" tint="bg-muted text-muted-foreground" to="/progetti"
          value={kpi ? String(kpi.progetti) : undefined} inCaricamento={kpiInCorso} />
        <KpiCard icon={CheckSquare} label="Attività da fare" tint="bg-muted text-muted-foreground" to="/attivita"
          value={attivitaInCorso ? undefined : String(aperte.length)} inCaricamento={attivitaInCorso} />
        <KpiCard icon={CalendarDays} label="Riunioni in arrivo" tint="bg-muted text-muted-foreground" to="/riunioni"
          value={riunioniInCorso ? undefined : String(prossimeRiunioni.length)} inCaricamento={riunioniInCorso} />
        <KpiCard icon={TrendingUp} label="Valore pipeline" tint="bg-muted text-muted-foreground" to="/kanban"
          value={kpi ? fmtEuro(kpi.pipelinePesata) : undefined} inCaricamento={kpiInCorso} />
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
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
              <CheckSquare className="h-5 w-5 text-primary" />
              <h2 className="text-title text-foreground">Le mie attività da fare</h2>
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
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-title text-foreground">Prossime riunioni</h2>
            </div>
            <Link to="/riunioni" className="text-sm text-primary hover:underline">Vedi tutte</Link>
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
