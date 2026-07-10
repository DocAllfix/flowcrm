import { useState } from 'react'
import { toast } from 'sonner'
import {
  Plus, CheckSquare, Phone, Mail, Users, StickyNote, Check, Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { RowActions } from '@/components/RowActions'
import { AttivitaDialog } from '@/features/attivita/AttivitaDialog'
import { useAuth } from '@/hooks/useAuth'
import {
  useMieAttivita, useToggleAttivitaStato, useArchiveAttivita, useDeleteAttivita,
  type AttivitaTipo, type Attivita,
} from '@/lib/queries/attivita'

const TIPO_ICON: Record<AttivitaTipo, React.ElementType> = {
  task: CheckSquare, chiamata: Phone, email: Mail, riunione: Users, nota: StickyNote,
}

export function AttivitaPage() {
  const { userProfile } = useAuth()
  const { data: attivita = [], isLoading } = useMieAttivita(userProfile?.id)
  const toggle = useToggleAttivitaStato()
  const archive = useArchiveAttivita()
  const del = useDeleteAttivita()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editAttivita, setEditAttivita] = useState<Attivita | null>(null)

  const aperte = attivita.filter((a) => a.stato !== 'completata' && a.stato !== 'annullata')
  const completate = attivita.filter((a) => a.stato === 'completata')

  function riga(a: Attivita) {
    const Icon = TIPO_ICON[a.tipo]
    const done = a.stato === 'completata'
    return (
      <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <button
          onClick={() => toggle.mutate({ id: a.id, stato: done ? 'da_fare' : 'completata' })}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            done ? 'border-success bg-success text-white' : 'border-border hover:border-primary'
          }`}
          aria-label={done ? 'Riapri' : 'Completa'}
        >
          {done && <Check className="h-3.5 w-3.5" />}
        </button>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {a.titolo}
          </p>
        </div>
        {a.scadenza && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(a.scadenza).toLocaleDateString('it-IT')}
          </span>
        )}
        <RowActions
          nome={a.titolo}
          onEdit={() => setEditAttivita(a)}
          onArchive={() => archive.mutate(a.id, {
            onSuccess: () => toast.success('Attività archiviata'),
            onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
          })}
          onDelete={() => del.mutate(a.id, {
            onSuccess: () => toast.success('Attività eliminata'),
            onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
          })}
        />
      </li>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Le mie attività"
        description="Task, chiamate, email e riunioni assegnate a te."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Nuova attività
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : attivita.length === 0 ? (
        <EmptyState icon={CheckSquare} title="Nessuna attività"
          description="Crea la tua prima attività per iniziare a organizzarti." />
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Da fare ({aperte.length})</h2>
            <ol className="space-y-2">{aperte.map(riga)}</ol>
          </div>
          {completate.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Completate ({completate.length})</h2>
              <ol className="space-y-2">{completate.map(riga)}</ol>
            </div>
          )}
        </div>
      )}

      <AttivitaDialog
        open={dialogOpen || !!editAttivita}
        attivita={editAttivita ?? undefined}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditAttivita(null) } }}
      />
    </div>
  )
}
