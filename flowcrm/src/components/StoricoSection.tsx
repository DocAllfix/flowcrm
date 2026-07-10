/**
 * StoricoSection — timeline audit di un'entità (chi ha fatto cosa, quando).
 * Sola lettura: l'audit_log è immutabile lato DB.
 */
import { History, Plus, Pencil, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuditLog, type AuditEntry } from '@/lib/queries/audit'
import { EmptyState } from '@/components/ui/empty-state'

interface Props {
  entita: string
  entitaId: string
}

const AZIONE_CONFIG: Record<string, { Icon: React.ElementType; label: string; color: string }> = {
  insert: { Icon: Plus, label: 'ha creato', color: 'text-success' },
  update: { Icon: Pencil, label: 'ha modificato', color: 'text-primary' },
  delete: { Icon: Trash2, label: 'ha eliminato', color: 'text-destructive' },
}

function autore(e: AuditEntry): string {
  const p = e.eseguito_da_profilo
  if (!p) return 'Sistema'
  return `${p.nome}${p.cognome ? ' ' + p.cognome : ''}`
}

function campiModificati(e: AuditEntry): string {
  if (e.azione !== 'update' || !e.diff || typeof e.diff !== 'object') return ''
  const campi = Object.keys(e.diff as Record<string, unknown>).filter((k) => k !== 'updated_at')
  return campi.length ? `Campi: ${campi.join(', ')}` : ''
}

export function StoricoSection({ entita, entitaId }: Props) {
  const { data: entries = [], isLoading } = useAuditLog(entita, entitaId)

  if (isLoading) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Caricamento…</p>
  }
  if (entries.length === 0) {
    return <EmptyState icon={History} title="Nessuna modifica registrata" />
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Storico modifiche</h3>
      </div>
      <ol className="divide-y divide-border">
        {entries.map((e) => {
          const cfg = AZIONE_CONFIG[e.azione] ?? AZIONE_CONFIG.update
          const Icon = cfg.Icon
          const dettaglio = campiModificati(e)
          return (
            <li key={e.id} className="flex gap-3 px-5 py-3">
              <div className="mt-0.5">
                <Icon className={`h-4 w-4 ${cfg.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{autore(e)}</span> {cfg.label}
                </p>
                {dettaglio && <p className="text-xs text-muted-foreground">{dettaglio}</p>}
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                  {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: it })}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
