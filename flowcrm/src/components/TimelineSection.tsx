/**
 * TimelineSection — timeline attività di un'entità (deal, organizzazione,
 * contatto). Riusabile passando lo scope. Include il bottone "Aggiungi".
 */
import { useState } from 'react'
import {
  Plus, CheckSquare, Phone, Mail, Users, StickyNote, Calendar, Check, Download,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { AttivitaDialog } from '@/features/attivita/AttivitaDialog'
import {
  useAttivitaScope, useToggleAttivitaStato,
  type AttivitaScope, type AttivitaTipo, type Attivita,
} from '@/lib/queries/attivita'
import { scaricaIcs } from '@/lib/ics'

const TIPO_ICON: Record<AttivitaTipo, React.ElementType> = {
  task: CheckSquare,
  chiamata: Phone,
  email: Mail,
  riunione: Users,
  nota: StickyNote,
}

interface Props {
  scope: AttivitaScope
}

export function TimelineSection({ scope }: Props) {
  const { data: attivita = [], isLoading } = useAttivitaScope(scope)
  const toggle = useToggleAttivitaStato()
  const [dialogOpen, setDialogOpen] = useState(false)

  function completa(a: Attivita) {
    toggle.mutate({ id: a.id, stato: a.stato === 'completata' ? 'da_fare' : 'completata' })
  }

  function esportaIcs(a: Attivita) {
    if (!a.inizio) return
    scaricaIcs({
      uid: a.id,
      titolo: a.titolo,
      descrizione: a.descrizione,
      inizio: a.inizio,
      durataMinuti: a.durata_minuti,
      luogo: a.luogo,
    })
    toast.success('File calendario scaricato')
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)} data-testid="timeline-aggiungi">
          <Plus className="h-4 w-4" /> Aggiungi attività
        </Button>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Caricamento…</p>
      ) : attivita.length === 0 ? (
        <EmptyState icon={CheckSquare} title="Nessuna attività"
          description="Registra task, chiamate, email, riunioni e note." />
      ) : (
        <ol className="space-y-2">
          {attivita.map((a) => {
            const Icon = TIPO_ICON[a.tipo]
            const done = a.stato === 'completata'
            return (
              <li key={a.id} className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {a.titolo}
                  </p>
                  {a.descrizione && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.descrizione}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70">
                    <span className="capitalize">{a.tipo}</span>
                    {a.inizio && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(a.inizio).toLocaleString('it-IT')}
                      </span>
                    )}
                    <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: it })}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  {a.tipo === 'riunione' && a.inizio && (
                    <button onClick={() => esportaIcs(a)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Esporta in calendario" aria-label="Esporta ICS">
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                  {a.tipo !== 'nota' && (
                    <button onClick={() => completa(a)}
                      className={`rounded-md p-1.5 hover:bg-muted ${done ? 'text-success' : 'text-muted-foreground hover:text-foreground'}`}
                      title={done ? 'Riapri' : 'Completa'} aria-label="Completa">
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <AttivitaDialog open={dialogOpen} onOpenChange={setDialogOpen} scope={scope} />
    </div>
  )
}
