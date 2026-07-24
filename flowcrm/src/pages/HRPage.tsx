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
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qualifica</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contratto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assunzione</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {dipendenti.map((d) => (
                <tr key={d.id} onClick={() => navigate(`/personale/${d.id}`)}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{d.nome} {d.cognome ?? ''}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.qualifica ?? '—'}</td>
                  <td className="px-4 py-3">{d.tipo_contratto ? <Badge tone="info">{CONTRATTO_LABEL[d.tipo_contratto]}</Badge> : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.data_assunzione ? new Date(d.data_assunzione).toLocaleDateString('it-IT') : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <RowActions
                      nome={`${d.nome} ${d.cognome ?? ''}`.trim()}
                      onEdit={() => setEdit(d)}
                      onArchive={() => archive.mutate(d.id, { onSuccess: () => toast.success('Dipendente archiviato'), onError: (e) => toast.error((e as Error)?.message ?? 'Errore') })}
                      onDelete={() => del.mutate(d.id, { onSuccess: () => toast.success('Dipendente eliminato'), onError: (e) => toast.error((e as Error)?.message ?? 'Errore') })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DipendenteDialog
        open={createOpen || !!edit}
        dipendente={edit ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEdit(null) } }}
      />
    </div>
  )
}
