/**
 * PoliambulatorioDashboardPage — cruscotto (documento §17-§19): KPI del
 * giorno, agenda di oggi, referti da validare (medici), scadenze
 * (tarature, lotti), no-show ed eventi qualità aperti.
 */
import { Link } from 'react-router-dom'
import {
  HeartPulse, CalendarDays, FileSignature, CalendarClock, AlertTriangle, Users,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { useScadenzeAperteModulo } from '@/lib/queries/scadenzeModuli'
import {
  APPUNTAMENTO_STATO, nomePaziente, fmtData,
} from '@/modules/poliambulatori/stati'
import {
  usePoliKpi, useAppuntamenti, useRefertiDaValidare, useSonoMedico,
} from '@/modules/poliambulatori/queries/poliambulatorio'

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

export function PoliambulatorioDashboardPage() {
  const { data: kpi } = usePoliKpi()
  const { data: appuntamenti = [] } = useAppuntamenti()
  const { data: refertiDaValidare = [] } = useRefertiDaValidare()
  const { data: sonoMedico } = useSonoMedico()
  const { data: scadenze = [] } = useScadenzeAperteModulo('poliambulatori', 8)

  const oggi = new Date().toDateString()
  const appuntamentiOggi = appuntamenti
    .filter((a) => new Date(a.inizio).toDateString() === oggi && a.stato !== 'annullato')
    .sort((a, b) => a.inizio.localeCompare(b.inizio))

  return (
    <div>
      <PageHeader title="Dashboard poliambulatorio"
        description="La giornata della struttura: agenda, referti, scadenze, qualità." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi icon={CalendarDays} label="Appuntamenti oggi" tint="bg-orange-50 text-primary"
          value={String(kpi?.appuntamenti_oggi ?? 0)} />
        <Kpi icon={CalendarDays} label="Prossimi 7 giorni" tint="bg-blue-50 text-blue-600"
          value={String(kpi?.appuntamenti_7gg ?? 0)} />
        <Kpi icon={Users} label="Pazienti" tint="bg-green-50 text-green-600"
          value={`${kpi?.pazienti_totali ?? 0} (+${kpi?.nuovi_pazienti_mese ?? 0} nel mese)`} />
        <Kpi icon={AlertTriangle} label="No-show (30gg)" tint="bg-red-50 text-red-600"
          value={kpi?.tasso_no_show_30gg != null ? `${kpi.tasso_no_show_30gg}%` : '—'} />
        <Kpi icon={FileSignature} label={sonoMedico ? 'Referti da validare' : 'Eventi qualità aperti'}
          tint="bg-purple-50 text-purple-600"
          value={sonoMedico ? String(kpi?.referti_da_validare ?? 0) : String(kpi?.eventi_qualita_aperti ?? 0)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Agenda di oggi</h2>
          </div>
          {appuntamentiOggi.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nessun appuntamento oggi"
              description="Gli appuntamenti della giornata compariranno qui." />
          ) : (
            <div className="space-y-1">
              {appuntamentiOggi.map((a) => {
                const st = APPUNTAMENTO_STATO[a.stato] ?? APPUNTAMENTO_STATO.prenotato
                return (
                  <Link key={a.id} to="/agenda-poliambulatorio"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/40">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {new Date(a.inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{nomePaziente(a.paziente)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[a.professionista ? `${a.professionista.nome} ${a.professionista.cognome ?? ''}` : null,
                          a.prestazione?.nome].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {a.urgente && <Badge tone="danger">Urgente</Badge>}
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Scadenze della struttura</h2>
          </div>
          {scadenze.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nessuna scadenza aperta"
              description="Tarature, lotti in scadenza e verifiche compariranno qui." />
          ) : (
            <div className="space-y-1">
              {scadenze.map((s) => (
                <Link key={s.id} to={s.azione_url ?? '/poliambulatorio-struttura'}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/40">
                  <Badge tone={new Date(s.data_scadenza) <= new Date() ? 'danger' : 'warning'}>
                    {fmtData(s.data_scadenza)}
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

        {sonoMedico && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Referti da validare</h2>
            </div>
            {refertiDaValidare.length === 0 ? (
              <EmptyState icon={HeartPulse} title="Nessun referto in attesa"
                description="I referti da firmare compariranno qui." />
            ) : (
              <div className="space-y-1">
                {refertiDaValidare.map((r) => (
                  <Link key={r.id} to={`/pazienti/${r.paziente_id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/40">
                    <FileSignature className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{r.titolo}</span>
                    <span className="text-xs text-muted-foreground">{fmtData(r.created_at)}</span>
                    <Badge tone="warning">Da validare</Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
