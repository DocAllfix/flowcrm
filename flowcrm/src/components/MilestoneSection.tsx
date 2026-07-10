import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Plus, Check, Trash2, Flag } from 'lucide-react'
import {
  useMilestone, useCreateMilestone, useToggleMilestone, useDeleteMilestone,
} from '@/lib/queries/milestone'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'

export function MilestoneSection({ progettoId }: { progettoId: string }) {
  const { isAdmin } = useAuth()
  const { data: milestone = [], isLoading } = useMilestone(progettoId)
  const create = useCreateMilestone()
  const toggle = useToggleMilestone()
  const del = useDeleteMilestone()
  const [titolo, setTitolo] = useState('')
  const [data, setData] = useState('')

  const completate = milestone.filter((m) => m.completata).length
  const perc = milestone.length ? Math.round((completate / milestone.length) * 100) : 0

  async function aggiungi(e: FormEvent) {
    e.preventDefault()
    if (!titolo.trim()) return
    try {
      await create.mutateAsync({ progetto_id: progettoId, titolo: titolo.trim(), data: data || null, ordine: milestone.length })
      setTitolo(''); setData('')
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore')
    }
  }

  return (
    <div className="space-y-4">
      {milestone.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Avanzamento</span>
            <span className="text-muted-foreground">{completate}/{milestone.length} · {perc}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${perc}%` }} />
          </div>
        </div>
      )}

      {isLoading ? null : milestone.length === 0 ? (
        <EmptyState icon={Flag} title="Nessuna milestone" description="Aggiungi le tappe del progetto per seguirne l'avanzamento." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {milestone.map((m) => (
            <li key={m.id} className="flex items-center gap-3 p-3">
              <button
                onClick={() => toggle.mutate({ id: m.id, completata: !m.completata, progetto_id: progettoId })}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${m.completata ? 'border-success bg-success text-white' : 'border-border hover:border-primary'}`}
                aria-label={m.completata ? 'Segna da fare' : 'Completa'}
              >
                {m.completata && <Check className="h-3.5 w-3.5" />}
              </button>
              <span className={`flex-1 text-sm ${m.completata ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{m.titolo}</span>
              {m.data && <span className="text-xs text-muted-foreground">{new Date(m.data).toLocaleDateString('it-IT')}</span>}
              {isAdmin && (
                <button
                  onClick={() => del.mutate({ id: m.id, progetto_id: progettoId }, { onError: (e) => toast.error((e as Error)?.message ?? 'Errore') })}
                  className="text-muted-foreground hover:text-destructive" aria-label="Elimina milestone"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={aggiungi} className="flex gap-2">
        <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Nuova milestone…" className="flex-1" />
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-40" />
        <Button type="submit" disabled={create.isPending || !titolo.trim()}>
          <Plus className="h-4 w-4" /> Aggiungi
        </Button>
      </form>
    </div>
  )
}
