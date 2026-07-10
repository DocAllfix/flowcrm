import { useState } from 'react'
import { Plus, Users, Loader2, MapPin, Clock, CalendarPlus } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { RowActions } from '@/components/RowActions'
import { AttivitaDialog } from '@/features/attivita/AttivitaDialog'
import {
  useRiunioni, useArchiveAttivita, useDeleteAttivita, type Attivita,
} from '@/lib/queries/attivita'
import { scaricaIcs } from '@/lib/ics'
import { toast } from 'sonner'

function fmtQuando(iso: string | null) {
  if (!iso) return 'Data da definire'
  return new Date(iso).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })
}

export function RiunioniPage() {
  const { data: riunioni = [], isLoading } = useRiunioni()
  const archive = useArchiveAttivita()
  const del = useDeleteAttivita()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [edit, setEdit] = useState<Attivita | null>(null)

  const ora = Date.now()
  const prossime = riunioni.filter((r) => r.inizio && new Date(r.inizio).getTime() >= ora)
  const passate = riunioni.filter((r) => !r.inizio || new Date(r.inizio).getTime() < ora)

  function riga(r: Attivita) {
    return (
      <li key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{r.titolo}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtQuando(r.inizio)}</span>
            {r.durata_minuti != null && <span>{r.durata_minuti} min</span>}
            {r.luogo && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.luogo}</span>}
          </div>
        </div>
        {r.inizio && (
          <button
            onClick={() => scaricaIcs({ uid: r.id, titolo: r.titolo, descrizione: r.descrizione, inizio: r.inizio!, durataMinuti: r.durata_minuti, luogo: r.luogo })}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Calendario
          </button>
        )}
        <RowActions
          nome={r.titolo}
          onEdit={() => setEdit(r)}
          onArchive={() => archive.mutate(r.id, { onSuccess: () => toast.success('Riunione archiviata'), onError: (e) => toast.error((e as Error)?.message ?? 'Errore') })}
          onDelete={() => del.mutate(r.id, { onSuccess: () => toast.success('Riunione eliminata'), onError: (e) => toast.error((e as Error)?.message ?? 'Errore') })}
        />
      </li>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Riunioni"
        description="Gli appuntamenti del team, con luogo e orario."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Nuova riunione
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : riunioni.length === 0 ? (
        <EmptyState icon={Users} title="Nessuna riunione"
          description="Pianifica la prima riunione del team."
          action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Nuova riunione</Button>} />
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Prossime ({prossime.length})</h2>
            {prossime.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna riunione in programma.</p>
            ) : <ul className="space-y-2">{prossime.map(riga)}</ul>}
          </div>
          {passate.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Passate ({passate.length})</h2>
              <ul className="space-y-2">{passate.map(riga)}</ul>
            </div>
          )}
        </div>
      )}

      <AttivitaDialog
        open={dialogOpen || !!edit}
        tipoIniziale="riunione"
        attivita={edit ?? undefined}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEdit(null) } }}
      />
    </div>
  )
}
