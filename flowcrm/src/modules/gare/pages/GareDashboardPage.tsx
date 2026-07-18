/**
 * GareDashboardPage — cruscotto del modulo (documento §17+§19): KPI
 * (tasso di aggiudicazione, valori vinto/perso/in corso, tempi medi),
 * gare per stato, successo per ente e per territorio, scadenze imminenti.
 * Stile grafici identico alla Dashboard economica.
 */
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Gavel, Trophy, TrendingUp, Timer, Landmark, CalendarClock, MapPin,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { useScadenzeAperteModulo } from '@/lib/queries/scadenzeModuli'
import { GARA_STATI, fmtImporto } from '@/modules/gare/stati'
import {
  useGareKpi, useGarePerStato, useGareSuccessoEnte, useGareSuccessoTerritorio,
} from '@/modules/gare/queries/gare'

function Kpi({ icon: Icon, label, value, tint }: {
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

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
}

const fmtDataBreve = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })

export function GareDashboardPage() {
  const { data: kpi } = useGareKpi()
  const { data: perStato = [] } = useGarePerStato()
  const { data: perEnte = [] } = useGareSuccessoEnte(6)
  const { data: perTerritorio = [] } = useGareSuccessoTerritorio(6)
  const { data: scadenze = [] } = useScadenzeAperteModulo('gare', 8)

  const statoData = GARA_STATI.map((s) => {
    const r = perStato.find((x) => x.stato === s.value)
    return { stato: s.label, numero: r?.numero ?? 0, colore: s.colore }
  })
  const enteData = perEnte.map((e) => ({
    nome: (e.ente as string) ?? '—',
    aggiudicate: e.aggiudicate ?? 0,
    presentate: e.presentate ?? 0,
    valore: Number(e.valore_vinto ?? 0),
  }))
  const territorioData = perTerritorio.map((t) => ({
    nome: (t.territorio as string) ?? '—',
    aggiudicate: t.aggiudicate ?? 0,
    valore: Number(t.valore_vinto ?? 0),
  }))

  return (
    <div>
      <PageHeader title="Dashboard gare" description="Andamento delle procedure: partecipazione, esiti, scadenze." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi icon={Gavel} label="Gare in corso" tint="bg-orange-50 text-primary"
          value={String((kpi?.in_analisi ?? 0) + (kpi?.in_preparazione ?? 0) + (kpi?.presentate ?? 0))} />
        <Kpi icon={Trophy} label="Tasso aggiudicazione" tint="bg-green-50 text-green-600"
          value={kpi?.tasso_aggiudicazione != null ? `${kpi.tasso_aggiudicazione}%` : '—'} />
        <Kpi icon={TrendingUp} label="Valore vinto" tint="bg-green-50 text-green-600"
          value={fmtImporto(Number(kpi?.valore_vinte ?? 0))} />
        <Kpi icon={Landmark} label="Valore in corso" tint="bg-blue-50 text-blue-600"
          value={fmtImporto(Number(kpi?.valore_in_corso ?? 0))} />
        <Kpi icon={Timer} label="Preparazione media" tint="bg-purple-50 text-purple-600"
          value={kpi?.giorni_medi_preparazione != null ? `${kpi.giorni_medi_preparazione} gg` : '—'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Gare per stato</h2>
          </div>
          {statoData.every((s) => s.numero === 0) ? (
            <EmptyState icon={Gavel} title="Nessuna gara" description="Registra la prima procedura per vedere il funnel." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statoData}>
                <XAxis dataKey="stato" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip formatter={(v) => [String(v), 'Gare']} contentStyle={tooltipStyle} />
                <Bar dataKey="numero" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Scadenze imminenti</h2>
          </div>
          {scadenze.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nessuna scadenza aperta"
              description="Termini di presentazione e cauzioni compariranno qui." />
          ) : (
            <div className="space-y-1">
              {scadenze.map((s) => (
                <Link key={s.id} to={s.azione_url ?? '/gare'}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/40">
                  <Badge tone={new Date(s.data_scadenza) <= new Date() ? 'danger' : 'warning'}>
                    {fmtDataBreve(s.data_scadenza)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{s.tipo}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.descrizione}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Successo per ente appaltante</h2>
          </div>
          {enteData.length === 0 ? (
            <EmptyState icon={Trophy} title="Nessun dato" description="Gli esiti per ente compariranno dopo le prime gare presentate." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, enteData.length * 44)}>
              <BarChart data={enteData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis type="category" dataKey="nome" width={150} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  formatter={(v, name) => [String(v), name === 'aggiudicate' ? 'Aggiudicate' : 'Presentate']}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="presentate" name="Presentate" fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} />
                <Bar dataKey="aggiudicate" name="Aggiudicate" fill="var(--color-chart-3)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Valore vinto per territorio</h2>
          </div>
          {territorioData.length === 0 ? (
            <EmptyState icon={MapPin} title="Nessun dato" description="Classifica i territori nelle gare per vedere la mappa del successo." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, territorioData.length * 44)}>
              <BarChart data={territorioData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" tickFormatter={(v) => `€${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip formatter={(v) => [fmtImporto(Number(v)), 'Valore vinto']} contentStyle={tooltipStyle} />
                <Bar dataKey="valore" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
