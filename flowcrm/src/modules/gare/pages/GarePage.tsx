/**
 * GarePage — elenco gare con filtri (stato, ricerca su titolo/ente/SOA/
 * territorio), countdown al termine, export CSV, azioni riga.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, Gavel, Download } from 'lucide-react'
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
import { GaraDialog } from '@/modules/gare/dialogs/GaraDialog'
import { GARA_STATI, statoGara, fmtImporto, fmtData, giorniAlTermine } from '@/modules/gare/stati'
import { useGare, useArchiveGara, useDeleteGara, type Gara } from '@/modules/gare/queries/gare'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, CollegamentoRiga } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

function CountdownTermine({ gara }: { gara: Gara }) {
  if (!['in_analisi', 'in_preparazione'].includes(gara.stato)) return <span className="text-muted-foreground">—</span>
  const gg = giorniAlTermine(gara.termine_presentazione)
  if (gg === null) return <span className="text-muted-foreground">—</span>
  if (gg < 0) return <Badge tone="danger">Scaduto</Badge>
  if (gg <= 3) return <Badge tone="danger">{gg === 0 ? 'Oggi' : `${gg} gg`}</Badge>
  if (gg <= 10) return <Badge tone="warning">{gg} gg</Badge>
  return <span className="text-muted-foreground">{gg} gg</span>
}

export function GarePage() {
  const navigate = useNavigate()
  const { data: gare = [], isLoading } = useGare()
  const archive = useArchiveGara()
  const del = useDeleteGara()
  const [search, setSearch] = useState('')
  const [statoFiltro, setStatoFiltro] = useState('tutti')
  const [createOpen, setCreateOpen] = useState(false)
  const [editGara, setEditGara] = useState<Gara | null>(null)

  const filtrate = useMemo(() => {
    const q = search.trim().toLowerCase()
    return gare.filter((g) => {
      if (statoFiltro !== 'tutti' && g.stato !== statoFiltro) return false
      if (!q) return true
      const testo = [
        g.codice, g.titolo, g.ente?.ragione_sociale, g.ente_appaltante,
        g.cig, g.categoria_soa, g.territorio, g.settore,
      ].filter(Boolean).join(' ').toLowerCase()
      return testo.includes(q)
    })
  }, [gare, search, statoFiltro])

  function esportaCsv() {
    const righe = filtrate.map((g) => [
      g.codice, g.titolo, g.ente?.ragione_sociale ?? g.ente_appaltante ?? '',
      g.cig ?? '', g.tipologia, g.procedura, statoGara(g.stato).label,
      Number(g.importo_base), g.categoria_soa ?? '', g.territorio ?? '',
      fmtData(g.data_pubblicazione), fmtData(g.termine_presentazione),
    ])
    scaricaCsv('gare.csv', toCsv(
      ['Codice', 'Titolo', 'Ente', 'CIG', 'Tipologia', 'Procedura', 'Stato',
       'Importo base', 'Categoria SOA', 'Territorio', 'Pubblicazione', 'Termine presentazione'],
      righe,
    ))
    toast.success(`Esportate ${righe.length} gare`)
  }

  return (
    <div>
      <PageHeader
        title="Gare d'appalto"
        description="Le procedure monitorate e in lavorazione, dal bando all'esito."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={esportaCsv} disabled={filtrate.length === 0}>
              <Download className="h-4 w-4" /> Esporta CSV
            </Button>
            <BottoneScrittura onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuova gara</BottoneScrittura>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3" data-tour="gare-filtri">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per titolo, ente, CIG, SOA…" className="pl-9" />
        </div>
        <Select value={statoFiltro} onValueChange={setStatoFiltro}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            {GARA_STATI.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner etichetta="Caricamento in corso" dimensione="lg" />
        </div>
      ) : filtrate.length === 0 ? (
        <EmptyState icon={Gavel} title="Nessuna gara"
          description="Registra la prima procedura per iniziare a monitorare termini ed esiti." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead>Ente</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead numerica>Base d'asta</TableHead>
                <TableHead>Termine</TableHead>
                <TableHead><span className="sr-only">Azioni</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrate.map((g) => {
                const st = statoGara(g.stato)
                return (
                  <TableRow key={g.id} onActivate={() => navigate(`/gare/${g.id}`)}
                    >
                    <TableCell><CollegamentoRiga to={`/gare/${g.id}`} className="font-mono text-xs font-semibold">{g.codice}</CollegamentoRiga></TableCell>
                    <TableCell className="max-w-sm truncate font-medium text-foreground">{g.titolo}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-muted-foreground">
                      {g.ente?.ragione_sociale ?? g.ente_appaltante ?? '—'}
                    </TableCell>
                    <TableCell><Badge tone={st.tone}>{st.label}</Badge></TableCell>
                    <TableCell numerica className="font-bold text-foreground">{fmtImporto(Number(g.importo_base))}</TableCell>
                    <TableCell><CountdownTermine gara={g} /></TableCell>
                    <TableCell numerica>
                      <RowActions
                        nome={g.codice ?? undefined}
                        onEdit={() => setEditGara(g)}
                        onArchive={() => archive.mutate(g.id, {
                          onSuccess: () => toast.success('Gara archiviata'),
                          onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                        })}
                        onDelete={() => del.mutate(g.id, {
                          onSuccess: () => toast.success('Gara eliminata'),
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

      <GaraDialog
        open={createOpen || !!editGara}
        gara={editGara ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditGara(null) } }}
      />
    </div>
  )
}
