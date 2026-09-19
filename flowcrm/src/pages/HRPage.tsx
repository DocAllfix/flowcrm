import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Users, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { RowActions } from '@/components/RowActions'
import { DipendenteDialog } from '@/features/hr/DipendenteDialog'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, CollegamentoRiga } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import {
  useDipendenti, useArchiveDipendente, useDeleteDipendente, type Dipendente,
} from '@/lib/queries/hr'

const CONTRATTO_LABEL: Record<string, string> = {
  indeterminato: 'Indeterminato', determinato: 'Determinato', apprendistato: 'Apprendistato',
  collaborazione: 'Collaborazione', stage: 'Stage', partita_iva: 'Partita IVA',
}

export function HRPage() {
  const navigate = useNavigate()
  const { data: dipendenti = [], isLoading } = useDipendenti()
  const archive = useArchiveDipendente()
  const del = useDeleteDipendente()
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<Dipendente | null>(null)

  return (
    <div>
      <PageHeader
        title="Personale"
        description="Anagrafica del personale, contratti, ferie e formazione."
        actions={<BottoneScrittura onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuovo dipendente</BottoneScrittura>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : dipendenti.length === 0 ? (
        <EmptyState icon={Users} title="Nessun dipendente" description="Aggiungi il personale dell'azienda."
          action={<BottoneScrittura onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuovo dipendente</BottoneScrittura>} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Qualifica</TableHead>
                <TableHead>Contratto</TableHead>
                <TableHead>Assunzione</TableHead>
                <TableHead><span className="sr-only">Azioni</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dipendenti.map((d) => (
                <TableRow key={d.id} onActivate={() => navigate(`/personale/${d.id}`)}
                  >
                  <TableCell><CollegamentoRiga to={`/personale/${d.id}`}>{d.nome} {d.cognome ?? ''}</CollegamentoRiga></TableCell>
                  <TableCell className="text-muted-foreground">{d.qualifica ?? '—'}</TableCell>
                  <TableCell>{d.tipo_contratto ? <Badge tone="info">{CONTRATTO_LABEL[d.tipo_contratto]}</Badge> : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{d.data_assunzione ? new Date(d.data_assunzione).toLocaleDateString('it-IT') : '—'}</TableCell>
                  <TableCell numerica>
                    <RowActions
                      nome={`${d.nome} ${d.cognome ?? ''}`.trim()}
                      onEdit={() => setEdit(d)}
                      onArchive={() => archive.mutate(d.id, { onSuccess: () => toast.success('Dipendente archiviato'), onError: (e) => toast.error((e as Error)?.message ?? 'Errore') })}
                      onDelete={() => del.mutate(d.id, { onSuccess: () => toast.success('Dipendente eliminato'), onError: (e) => toast.error((e as Error)?.message ?? 'Errore') })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <DipendenteDialog
        open={createOpen || !!edit}
        dipendente={edit ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEdit(null) } }}
      />
    </div>
  )
}
