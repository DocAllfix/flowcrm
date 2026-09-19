import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Briefcase } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { RowActions } from '@/components/RowActions'
import { CommessaDialog } from '@/features/commesse/CommessaDialog'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, CollegamentoRiga } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { AttesaCentrata } from '@/components/ui/spinner'
import {
  useCommesse, useArchiveCommessa, useDeleteCommessa, type CommessaStato, type Commessa,
} from '@/lib/queries/commesse'

const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const STATO_TONE: Record<CommessaStato, 'success' | 'warning' | 'info' | 'neutral'> = {
  attiva: 'success', in_pausa: 'warning', completata: 'info', annullata: 'neutral',
}
const STATO_LABEL: Record<CommessaStato, string> = {
  attiva: 'Attiva', in_pausa: 'In pausa', completata: 'Completata', annullata: 'Annullata',
}

export function CommessePage() {
  const navigate = useNavigate()
  const { data: commesse = [], isLoading } = useCommesse()
  const [createOpen, setCreateOpen] = useState(false)
  const [editCommessa, setEditCommessa] = useState<Commessa | null>(null)
  const archive = useArchiveCommessa()
  const del = useDeleteCommessa()

  return (
    <div>
      <PageHeader
        title="Commesse"
        description="Le commesse acquisite, con codice progressivo automatico."
        actions={<BottoneScrittura onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuova commessa</BottoneScrittura>}
      />

      {isLoading ? (
        <AttesaCentrata className="py-20" />
      ) : commesse.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nessuna commessa"
          description="Le commesse nascono da un deal vinto o si creano manualmente." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codice</TableHead>
                <TableHead>Organizzazione</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead numerica>Importo</TableHead>
                <TableHead><span className="sr-only">Azioni</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commesse.map((c) => (
                <TableRow key={c.id} onActivate={() => navigate(`/commesse/${c.id}`)}
                  >
                  <TableCell><CollegamentoRiga to={`/commesse/${c.id}`} className="font-mono text-xs font-semibold">{c.codice}</CollegamentoRiga></TableCell>
                  <TableCell className="text-muted-foreground">{c.organizzazione?.ragione_sociale ?? '—'}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{c.descrizione}</TableCell>
                  <TableCell><Badge tone={STATO_TONE[c.stato]}>{STATO_LABEL[c.stato]}</Badge></TableCell>
                  <TableCell numerica className="font-bold text-foreground">{fmtImporto(Number(c.importo))}</TableCell>
                  <TableCell numerica>
                    <RowActions
                      nome={c.codice ?? undefined}
                      onEdit={() => setEditCommessa(c)}
                      onArchive={() => archive.mutate(c.id, {
                        onSuccess: () => toast.success('Commessa archiviata'),
                        onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                      })}
                      onDelete={() => del.mutate(c.id, {
                        onSuccess: () => toast.success('Commessa eliminata'),
                        onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                      })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <CommessaDialog
        open={createOpen || !!editCommessa}
        commessa={editCommessa ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditCommessa(null) } }}
      />
    </div>
  )
}
