/**
 * CantieriPage — elenco cantieri con stato, avanzamento (dalle fasi),
 * committenza e importo. Export CSV, azioni riga.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, HardHat, Loader2, Download } from 'lucide-react'
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
import { CantiereDialog } from '@/modules/cantiere/dialogs/CantiereDialog'
import { CANTIERE_STATI, statoCantiere, fmtImporto, fmtData } from '@/modules/cantiere/stati'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, CollegamentoRiga } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import {
  useCantieri, useCantieriKpiTutti, useArchiveCantiere, useDeleteCantiere, type Cantiere,
} from '@/modules/cantiere/queries/cantieri'

export function CantieriPage() {
  const navigate = useNavigate()
  const { data: cantieri = [], isLoading } = useCantieri()
  const { data: kpi = [] } = useCantieriKpiTutti()
  const archive = useArchiveCantiere()
  const del = useDeleteCantiere()
  const [search, setSearch] = useState('')
  const [statoFiltro, setStatoFiltro] = useState('tutti')
  const [createOpen, setCreateOpen] = useState(false)
  const [editCantiere, setEditCantiere] = useState<Cantiere | null>(null)

  const avanzamenti = useMemo(() => {
    const m: Record<string, number> = {}
    for (const k of kpi) m[k.cantiere_id as string] = Number(k.avanzamento_medio ?? 0)
    return m
  }, [kpi])

  const filtrati = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cantieri.filter((c) => {
      if (statoFiltro !== 'tutti' && c.stato !== statoFiltro) return false
      if (!q) return true
      return [c.codice, c.denominazione, c.citta, c.cliente?.ragione_sociale, c.categoria_lavori]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [cantieri, search, statoFiltro])

  function esportaCsv() {
    scaricaCsv('cantieri.csv', toCsv(
      ['Codice', 'Denominazione', 'Cliente', 'Città', 'Stato', 'Categoria',
       'Importo contratto', 'Apertura', 'Fine prevista', 'Avanzamento %'],
      filtrati.map((c) => [
        c.codice, c.denominazione, c.cliente?.ragione_sociale ?? '', c.citta ?? '',
        statoCantiere(c.stato).label, c.categoria_lavori ?? '',
        Number(c.importo_contrattuale), fmtData(c.data_apertura),
        fmtData(c.data_fine_prevista), avanzamenti[c.id] ?? 0,
      ]),
    ))
    toast.success(`Esportati ${filtrati.length} cantieri`)
  }

  return (
    <div>
      <PageHeader
        title="Cantieri"
        description="I cantieri dell'impresa: avanzamento, sicurezza, contabilità lavori."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={esportaCsv} disabled={filtrati.length === 0}>
              <Download className="h-4 w-4" /> Esporta CSV
            </Button>
            <BottoneScrittura onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuovo cantiere</BottoneScrittura>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, città, cliente…" className="pl-9" />
        </div>
        <Select value={statoFiltro} onValueChange={setStatoFiltro}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            {CANTIERE_STATI.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtrati.length === 0 ? (
        <EmptyState icon={HardHat} title="Nessun cantiere"
          description="Apri il primo cantiere per gestire avanzamento, personale e sicurezza." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Denominazione</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Avanzamento</TableHead>
                <TableHead numerica>Contratto</TableHead>
                <TableHead><span className="sr-only">Azioni</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrati.map((c) => {
                const st = statoCantiere(c.stato)
                const av = avanzamenti[c.id] ?? 0
                return (
                  <TableRow key={c.id} onActivate={() => navigate(`/cantieri/${c.id}`)}
                    >
                    <TableCell><CollegamentoRiga to={`/cantieri/${c.id}`} className="font-mono text-xs font-semibold">{c.codice}</CollegamentoRiga></TableCell>
                    <TableCell className="max-w-sm truncate font-medium text-foreground">{c.denominazione}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground">
                      {c.cliente?.ragione_sociale ?? '—'}
                    </TableCell>
                    <TableCell><Badge tone={st.tone}>{st.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${av}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{av}%</span>
                      </div>
                    </TableCell>
                    <TableCell numerica className="font-bold text-foreground">
                      {fmtImporto(Number(c.importo_contrattuale))}
                    </TableCell>
                    <TableCell numerica>
                      <RowActions
                        nome={c.codice ?? undefined}
                        onEdit={() => setEditCantiere(c)}
                        onArchive={() => archive.mutate(c.id, {
                          onSuccess: () => toast.success('Cantiere archiviato'),
                          onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                        })}
                        onDelete={() => del.mutate(c.id, {
                          onSuccess: () => toast.success('Cantiere eliminato'),
                          onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                        })}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <CantiereDialog
        open={createOpen || !!editCantiere}
        cantiere={editCantiere ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditCantiere(null) } }}
      />
    </div>
  )
}
