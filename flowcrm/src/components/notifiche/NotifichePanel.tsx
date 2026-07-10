/**
 * NotifichePanel — slide-over notifiche da destra (port CertDesk, adattato).
 * Non lette in cima, sezione collassabile "Già lette". Ricerca su titolo/messaggio.
 */
import { useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, Bell, CheckCheck, Search, AlertTriangle, ArrowRight,
  MessageSquare, Info, ChevronDown,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotifiche, useMarkAsRead, useMarkAllAsRead } from '@/hooks/useNotifiche'
import type { Notifica } from '@/lib/queries/notifiche'
import type { NotificaTipo } from '@/types/app.types'

interface TipoConfig {
  Icon: React.ElementType
  color: string
  bg: string
}

const TIPO_CONFIG: Record<NotificaTipo, TipoConfig> = {
  critical: { Icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/15' },
  warning:  { Icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/15' },
  success:  { Icon: ArrowRight, color: 'text-success', bg: 'bg-success/15' },
  info:     { Icon: Info, color: 'text-secondary', bg: 'bg-secondary/15' },
  sistema:  { Icon: MessageSquare, color: 'text-muted-foreground', bg: 'bg-muted' },
}

function fmtRelativo(d: string | null): string {
  if (!d) return ''
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true, locale: it })
  } catch {
    return ''
  }
}

interface NotifichePanelProps {
  open: boolean
  onClose: () => void
}

function NotificaItem({ n, onClickNotifica }: {
  n: Notifica
  onClickNotifica: (n: Notifica) => void
}) {
  const cfg = TIPO_CONFIG[n.tipo]
  const Icon = cfg.Icon
  const isUnread = !n.letta

  return (
    <button
      onClick={() => onClickNotifica(n)}
      className={`flex w-full gap-3 border-b border-border/30 px-5 py-3.5 text-left transition-colors last:border-0 hover:bg-muted/50 ${
        isUnread ? 'bg-primary/5' : ''
      }`}
    >
      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
        <Icon className={`h-4 w-4 ${cfg.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
            {n.titolo}
          </p>
          {isUnread && <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {n.messaggio}
        </p>
        <p className="mt-1.5 text-[11px] font-medium text-muted-foreground/60">
          {fmtRelativo(n.created_at)}
        </p>
      </div>
    </button>
  )
}

export const NotifichePanel = memo(function NotifichePanel({ open, onClose }: NotifichePanelProps) {
  const [ricerca, setRicerca] = useState('')
  const [letteOpen, setLetteOpen] = useState(false)
  const navigate = useNavigate()

  const { data: notifiche = [], isLoading } = useNotifiche()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

  if (!open) return null

  const q = ricerca.toLowerCase()
  const filtrate = ricerca
    ? notifiche.filter((n) => n.titolo.toLowerCase().includes(q) || n.messaggio.toLowerCase().includes(q))
    : notifiche

  const nonLette = filtrate.filter((n) => !n.letta)
  const lette = filtrate.filter((n) => n.letta)
  const countNonLette = notifiche.filter((n) => !n.letta).length

  const handleClickNotifica = (n: Notifica) => {
    if (!n.letta) markAsRead.mutate(n.id)
    onClose()
    if (n.azione_url) navigate(n.azione_url)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      <div className="fixed right-0 top-0 z-50 flex h-screen w-[440px] max-w-[calc(100vw-1rem)] flex-col border-l border-border bg-card shadow-2xl">
        <div className="shrink-0 px-5 pb-0 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Notifiche</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca notifiche…"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="h-8 border-border/60 bg-muted/40 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-5 py-2">
          <span className="text-xs text-muted-foreground">
            {countNonLette > 0 ? `${countNonLette} non lette` : 'Tutto letto'}
          </span>
          <button
            onClick={() => countNonLette > 0 && markAllAsRead.mutate()}
            disabled={countNonLette === 0 || markAllAsRead.isPending}
            className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Segna tutte lette
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {!isLoading && nonLette.length === 0 && lette.length === 0 && (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <Bell className="mb-3 h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">
                  {ricerca ? 'Nessun risultato' : 'Nessuna notifica'}
                </p>
                {!ricerca && (
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Le nuove notifiche appariranno qui in tempo reale
                  </p>
                )}
              </div>
            )}

            {!isLoading && nonLette.length === 0 && lette.length > 0 && !ricerca && (
              <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
                <CheckCheck className="mb-2 h-8 w-8 text-success/40" />
                <p className="text-sm text-muted-foreground">Tutto letto!</p>
              </div>
            )}

            {!isLoading && nonLette.map((n) => (
              <NotificaItem key={n.id} n={n} onClickNotifica={handleClickNotifica} />
            ))}

            {!isLoading && lette.length > 0 && (
              <div className="mt-1 border-t border-border/40">
                <button
                  onClick={() => setLetteOpen((p) => !p)}
                  className="flex w-full cursor-pointer items-center justify-between px-5 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                >
                  <span className="font-medium">Già lette ({lette.length})</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${letteOpen ? 'rotate-180' : ''}`} />
                </button>
                {letteOpen && lette.map((n) => (
                  <NotificaItem key={n.id} n={n} onClickNotifica={handleClickNotifica} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  )
})
