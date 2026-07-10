/**
 * NotificheBadge — icona campana con contatore non lette, per l'header.
 * Legge useNotificheCount() → aggiornamento realtime automatico.
 */
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotificheCount } from '@/hooks/useNotifiche'

interface Props {
  onClick: () => void
}

export function NotificheBadge({ onClick }: Props) {
  const count = useNotificheCount()
  const label = count > 9 ? '9+' : String(count)

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
      onClick={onClick}
      aria-label={`Notifiche${count > 0 ? `, ${count} non lette` : ''}`}
      data-testid="notifiche-badge"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
          {label}
        </span>
      )}
    </Button>
  )
}
