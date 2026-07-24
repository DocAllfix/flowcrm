/**
 * AutomezziPage — parco mezzi: targa, mezzo, categoria, stato, km,
 * scadenze imminenti del modulo. Export CSV, azioni riga.
 */
import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, Truck, Loader2, Download, CalendarClock } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RowActions } from '@/components/RowActions'
import { toCsv, scaricaCsv } from '@/lib/csv'
import { useScadenzeAperteModulo } from '@/lib/queries/scadenzeModuli'
import { AutomezzoDialog } from '@/modules/automezzi/dialogs/AutomezzoDialog'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import {
  AUTOMEZZO_STATI, statoAutomezzo, CATEGORIA_LABEL, fmtData,
} from '@/modules/automezzi/stati'
import {
  useAutomezzi, useArchiveAutomezzo, useDeleteAutomezzo, type Automezzo,
} from '@/modules/automezzi/queries/automezzi'

export function AutomezziPage() {
  const navigate = useNavigate()
  const { data: automezzi = [], isLoading } = useAutomezzi()
  const { data: scadenze = [] } = useScadenzeAperteModulo('automezzi', 6)
  const archive = useArchiveAutomezzo()
  const del = useDeleteAutomezzo()
  const [search, setSearch] = useState('')
  const [statoFiltro, setStatoFiltro] = useState('tutti')
  const [createOpen, setCreateOpen] = useState(false)
  const [editMezzo, setEditMezzo] = useState<Automezzo | null>(null)

  const filtrati = useMemo(() => {
    const q = search.trim().toLowerCase()
    return automezzi.filter((a) => {
      if (statoFiltro !== 'tutti' && a.stato !== statoFiltro) return false
      if (!q) return true
      return [a.codice, a.targa, a.marca, a.modello, a.centro_costo, a.sede]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [automezzi, search, statoFiltro])

  function esportaCsv() {
    scaricaCsv('automezzi.csv', toCsv(
      ['Codice', 'Targa', 'Marca', 'Modello', 'Categoria', 'Stato', 'Km', 'Centro di costo', 'Sede'],
      filtrati.map((a) => [
        a.codice, a.targa ?? '', a.marca, a.modello, CATEGORIA_LABEL[a.categoria],
        statoAutomezzo(a.stato).label, a.km_attuali, a.centro_costo ?? '', a.sede ?? '',
      ]),
    ))
    toast.success(`Esportati ${filtrati.length} mezzi`)
  }

  return (
    <div>
      <PageHeader
        title="Parco automezzi"
        description="I mezzi dell'azienda: scadenze, manutenzioni, consumi e costi."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={esportaCsv} disabled={filtrati.length === 0}>
              <Download className="h-4 w-4" /> Esporta CSV
            </Button>
            <BottoneScrittura onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuovo mezzo</BottoneScrittura>
          </div>
        }
      />

      {scadenze.length > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-warning-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Scadenze imminenti del parco</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {scadenze.map((s) => (
              <Link key={s.id} to={s.azione_url ?? '/automezzi'}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted">
                <Badge tone={new Date(s.data_scadenza) <= new Date() ? 'danger' : 'warning'}>
                  {fmtData(s.data_scadenza)}
                </Badge>
                <span className="font-medium text-foreground">{s.tipo}</span>
                <span className="max-w-40 truncate text-muted-foreground">{s.descrizione}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per targa, marca, modello…" className="pl-9" />
        </div>
        <Select value={statoFiltro} onValueChange={setStatoFiltro}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            {AUTOMEZZO_STATI.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtrati.length === 0 ? (
        <EmptyState icon={Truck} title="Nessun mezzo"
          description="Registra il primo veicolo per monitorare scadenze e costi." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Targa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mezzo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stato</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Km</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Centro di costo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map((a) => {
                const st = statoAutomezzo(a.stato)
                return (
                  <tr key={a.id} onClick={() => navigate(`/automezzi/${a.id}`)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                      {a.targa ?? a.codice}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{a.marca} {a.modello}</td>
                    <td className="px-4 py-3 text-muted-foreground">{CATEGORIA_LABEL[a.categoria]}</td>
                    <td className="px-4 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {new Intl.NumberFormat('it-IT').format(a.km_attuali)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.centro_costo ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <RowActions
                        nome={a.targa ?? a.codice ?? undefined}
                        onEdit={() => setEditMezzo(a)}
                        onArchive={() => archive.mutate(a.id, {
                          onSuccess: () => toast.success('Mezzo archiviato'),
                          onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                        })}
                        onDelete={() => del.mutate(a.id, {
                          onSuccess: () => toast.success('Mezzo eliminato'),
                          onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                        })}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AutomezzoDialog
        open={createOpen || !!editMezzo}
        automezzo={editMezzo ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditMezzo(null) } }}
      />
    </div>
  )
}
