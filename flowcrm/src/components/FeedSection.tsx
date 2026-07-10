/**
 * FeedSection — feed di commenti realtime per un record o per il canale team.
 * Composer con menzioni @nome (risolte sui membri del team). Adattamento del
 * FeedPratica di CertDesk generalizzato a entità polimorfica.
 */
import { useState, useEffect, useRef, type FormEvent } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { useFeed, useSendMessaggio, type FeedTarget, type Messaggio } from '@/lib/queries/messaggi'
import { useUsers } from '@/lib/queries/users'
import { useAuth } from '@/hooks/useAuth'
import { EmptyState } from '@/components/ui/empty-state'

interface Props {
  target: FeedTarget
}

/** Avatar deterministico dalle iniziali (come CertDesk). */
function iniziali(m: Messaggio): string {
  const n = m.autore?.nome ?? '?'
  const c = m.autore?.cognome ?? ''
  return `${n[0] ?? ''}${c[0] ?? ''}`.toUpperCase()
}

export function FeedSection({ target }: Props) {
  const { userProfile } = useAuth()
  const { data: messaggi = [], isLoading } = useFeed(target)
  const { data: team = [] } = useUsers()
  const send = useSendMessaggio(target)
  const [testo, setTesto] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll all'ultimo messaggio
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi.length])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const t = testo.trim()
    if (!t) return
    // Risolvi le menzioni @nome sui membri del team
    const menzioni = team
      .filter((u) => new RegExp(`@${u.nome}\\b`, 'i').test(t))
      .map((u) => u.id)
    try {
      await send.mutateAsync({ testo: t, menzioni })
      setTesto('')
    } catch {
      /* toast gestito nell'hook */
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          {target.entita === 'team' ? 'Canale del team' : 'Commenti'}
        </h3>
      </div>

      <div className="max-h-[420px] min-h-[160px] flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Caricamento…</p>
        ) : messaggi.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Nessun messaggio"
            description="Scrivi il primo commento. Usa @nome per menzionare un collega." />
        ) : (
          messaggi.map((m) => {
            const mine = m.autore_id === userProfile?.id
            return (
              <div key={m.id} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-[11px] font-semibold text-white">
                  {iniziali(m)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {mine ? 'Tu' : `${m.autore?.nome ?? ''} ${m.autore?.cognome ?? ''}`}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: it })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{m.testo}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Scrivi un messaggio… (@nome per menzionare)"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          data-testid="feed-input"
        />
        <button
          type="submit"
          disabled={send.isPending || !testo.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
          aria-label="Invia"
          data-testid="feed-invia"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
