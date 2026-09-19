/**
 * AgentiPage — rete vendita. Se l'utente È un agente (portale), viene
 * portato direttamente al proprio fascicolo: la lista è dello staff.
 */
import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, BriefcaseBusiness, Loader2, Download } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { RowActions } from '@/components/RowActions'
import { toCsv, scaricaCsv } from '@/lib/csv'
import { AgenteDialog } from '@/modules/agenti/dialogs/AgenteDialog'
import { TIPOLOGIA_LABEL, AGENTE_STATO } from '@/modules/agenti/stati'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, CollegamentoRiga } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import {
  useAgenti, useAgenteCorrente, useArchiveAgente, useDeleteAgente, type Agente,
} from '@/modules/agenti/queries/agenti'

export function AgentiPage() {
  const navigate = useNavigate()
  const { data: me } = useAgenteCorrente()
  const { data: agenti = [], isLoading } = useAgenti()
  const archive = useArchiveAgente()
  const del = useDeleteAgente()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editAgente, setEditAgente] = useState<Agente | null>(null)

  // Portale agente: chi è un agente va dritto al proprio fascicolo.
  useEffect(() => {
    if (me) navigate(`/agenti/${me.id}`, { replace: true })
  }, [me, navigate])

  const filtrati = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return agenti
    return agenti.filter((a) =>
      [a.codice, a.nome, a.cognome, a.ragione_sociale, a.zone, a.area_geografica]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [agenti, search])

  function esportaCsv() {
    scaricaCsv('agenti.csv', toCsv(
      ['Codice', 'Agente', 'Tipologia', 'Stato', 'Area', 'Zone', 'Email', 'Telefono'],
      filtrati.map((a) => [
        a.codice, `${a.nome} ${a.cognome ?? ''}`.trim(), TIPOLOGIA_LABEL[a.tipologia],
        AGENTE_STATO[a.stato]?.label ?? a.stato, a.area_geografica ?? '', a.zone ?? '',
        a.email ?? '', a.telefono ?? '',
      ]),
    ))
    toast.success(`Esportati ${filtrati.length} agenti`)
  }

  return (
    <div>
      <PageHeader
        title="Agenti di commercio"
        description="La rete vendita: mandati, portafogli, visite, ordini e provvigioni."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={esportaCsv} disabled={filtrati.length === 0}>
              <Download className="h-4 w-4" /> Esporta CSV
            </Button>
            <BottoneScrittura onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuovo agente</BottoneScrittura>
          </div>
        }
      />

      <div className="mb-4 w-72">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, zona…" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtrati.length === 0 ? (
        <EmptyState icon={BriefcaseBusiness} title="Nessun agente"
          description="Registra la rete vendita per gestire mandati, visite e provvigioni." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead>Tipologia</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Portale</TableHead>
                <TableHead><span className="sr-only">Azioni</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrati.map((a) => {
                const st = AGENTE_STATO[a.stato] ?? AGENTE_STATO.attivo
                return (
                  <TableRow key={a.id} onActivate={() => navigate(`/agenti/${a.id}`)}
                    >
                    <TableCell><CollegamentoRiga to={`/agenti/${a.id}`} className="font-mono text-xs font-semibold">{a.codice}</CollegamentoRiga></TableCell>
                    <TableCell className="font-medium text-foreground">
                      {a.nome} {a.cognome ?? ''}
                      {a.ragione_sociale && (
                        <span className="block text-xs font-normal text-muted-foreground">{a.ragione_sociale}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{TIPOLOGIA_LABEL[a.tipologia]}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground">
                      {a.zone ?? a.area_geografica ?? '—'}
                    </TableCell>
                    <TableCell><Badge tone={st.tone}>{st.label}</Badge></TableCell>
                    <TableCell>
                      {a.user_id ? <Badge tone="info">Attivo</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell numerica>
                      <RowActions
                        nome={`${a.nome} ${a.cognome ?? ''}`.trim()}
                        onEdit={() => setEditAgente(a)}
                        onArchive={() => archive.mutate(a.id, {
                          onSuccess: () => toast.success('Agente archiviato'),
                          onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                        })}
                        onDelete={() => del.mutate(a.id, {
                          onSuccess: () => toast.success('Agente eliminato'),
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

      <AgenteDialog
        open={createOpen || !!editAgente}
        agente={editAgente ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditAgente(null) } }}
      />
    </div>
  )
}
