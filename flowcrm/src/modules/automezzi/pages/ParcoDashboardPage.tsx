/**
 * ParcoDashboardPage — cruscotto del parco (documento §18): mezzi per
 * stato, scadenze imminenti, costi per mezzo (manager) e patenti/
 * abilitazioni dei conducenti con scadenze automatiche (§14, manager).
 */
import { Link } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Truck, Wrench, CalendarClock, IdCard, Trash2, Plus, Euro,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useScadenzeAperteModulo } from '@/lib/queries/scadenzeModuli'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import {
  AUTOMEZZO_STATI, PATENTE_LABEL, fmtImporto, fmtData,
} from '@/modules/automezzi/stati'
import {
  useAutomezzi, usePatenti, useCreaPatente, useEliminaPatente,
} from '@/modules/automezzi/queries/automezzi'

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
}

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

/** Costi totali del parco (vista manager-only: l'operatore riceve 0 righe). */
function useCostiParco() {
  return useQuery({
    queryKey: ['automezzi', 'costi-parco'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_automezzo_costo_km').select('*')
      if (error) throw error
      return data
    },
  })
}

function SezionePatenti() {
  const { data: dipendenti = [] } = useQuery({
    queryKey: ['dipendenti-per-patenti'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dipendenti').select('id, nome, cognome').eq('attivo', true).order('cognome')
      if (error) throw error
      return data
    },
  })
  const { data: patenti = [] } = usePatenti()
  const crea = useCreaPatente()
  const elimina = useEliminaPatente()
  const [dipendenteId, setDipendenteId] = useState('')
  const [tipo, setTipo] = useState('patente_b')
  const [scadenza, setScadenza] = useState('')

  function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!dipendenteId) { toast.error('Scegli il conducente (anagrafica HR)'); return }
    crea.mutate({
      dipendente_id: dipendenteId,
      tipo: tipo as 'patente_b',
      scadenza: scadenza || null,
    }, {
      onSuccess: () => { setScadenza(''); toast.success('Abilitazione registrata (scadenza monitorata in automatico)') },
      onError: (err) => toast.error((err as Error).message),
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <IdCard className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Conducenti: patenti e abilitazioni</h2>
      </div>
      {dipendenti.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          I conducenti si prendono dall'anagrafica HR (Personale): aggiungi prima i dipendenti.
        </p>
      )}
      {patenti.map((p) => {
        const giorni = p.scadenza
          ? Math.round((new Date(p.scadenza + 'T00:00:00').getTime() - Date.now()) / 86400000)
          : null
        return (
          <div key={p.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="flex-1 font-medium text-foreground">
              {p.dipendente ? `${p.dipendente.nome} ${p.dipendente.cognome ?? ''}` : '—'}
            </span>
            <Badge tone="neutral">{PATENTE_LABEL[p.tipo] ?? p.tipo}</Badge>
            {p.punti != null && <span className="text-xs text-muted-foreground">{p.punti} punti</span>}
            {p.scadenza && (
              <Badge tone={giorni != null && giorni <= 30 ? (giorni <= 0 ? 'danger' : 'warning') : 'neutral'}>
                {fmtData(p.scadenza)}
              </Badge>
            )}
            <button
              onClick={() => elimina.mutate(p.id)}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
      <form onSubmit={handleAggiungi} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-44 flex-1 space-y-1">
          <Label>Conducente</Label>
          <Select value={dipendenteId} onValueChange={setDipendenteId}>
            <SelectTrigger><SelectValue placeholder="Dipendente…" /></SelectTrigger>
            <SelectContent>
              {dipendenti.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.nome} {d.cognome ?? ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44 space-y-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PATENTE_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40 space-y-1">
          <Label>Scadenza</Label>
          <Input type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
      </form>
    </div>
  )
}

export function ParcoDashboardPage() {
  const { isManager } = useAuth()
  const { data: automezzi = [] } = useAutomezzi()
  const { data: scadenze = [] } = useScadenzeAperteModulo('automezzi', 10)
  const { data: costiParco = [] } = useCostiParco()

  const perStato = AUTOMEZZO_STATI.map((s) => ({
    stato: s.label,
    numero: automezzi.filter((a) => a.stato === s.value).length,
  }))
  const disponibili = automezzi.filter((a) => a.stato === 'disponibile').length
  const inManutenzione = automezzi.filter((a) => a.stato === 'in_manutenzione').length
  const costoTotaleParco = costiParco.reduce((s, c) => s + Number(c.costo_totale ?? 0), 0)

  return (
    <div>
      <PageHeader title="Dashboard parco" description="Disponibilità, scadenze e costi della flotta." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Truck} label="Mezzi nel parco" tint="bg-orange-50 text-primary"
          value={String(automezzi.length)} />
        <Kpi icon={Truck} label="Disponibili" tint="bg-green-50 text-green-600"
          value={String(disponibili)} />
        <Kpi icon={Wrench} label="In manutenzione" tint="bg-yellow-50 text-yellow-600"
          value={String(inManutenzione)} />
        <Kpi icon={Euro} label={isManager ? 'Costo totale parco' : 'Scadenze aperte'}
          tint="bg-purple-50 text-purple-600"
          value={isManager ? fmtImporto(costoTotaleParco) : String(scadenze.length)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Mezzi per stato</h2>
          </div>
          {automezzi.length === 0 ? (
            <EmptyState icon={Truck} title="Nessun mezzo" description="Registra i veicoli per vedere il quadro del parco." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={perStato}>
                <XAxis dataKey="stato" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip formatter={(v) => [String(v), 'Mezzi']} contentStyle={tooltipStyle} />
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
              description="Revisioni, bolli, assicurazioni e abilitazioni compariranno qui." />
          ) : (
            <div className="space-y-1">
              {scadenze.map((s) => (
                <Link key={s.id} to={s.azione_url ?? '/automezzi'}
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
      </div>

      {isManager && (
        <div className="mt-6">
          <SezionePatenti />
        </div>
      )}
    </div>
  )
}
