/**
 * ConnectionIndicator — stato connessione WebSocket Supabase Realtime.
 * Ref: ../evalisdesk-ref/src/components/layout/ConnectionIndicator.jsx
 *
 * Legge useRealtimeStatus() → pallino verde/arancio/rosso in sidebar.
 *   connected    → verde     (WebSocket attivo)
 *   connecting   → giallo    (in attesa connessione iniziale)
 *   reconnecting → arancio lampeggiante (WebSocket caduto)
 *   polling      → arancio   (fallback polling attivo)
 *   error        → rosso     (errore permanente)
 */
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useRealtimeStatus, type RealtimeConnectionStatus } from '@/hooks/useRealtimeStatus'

// ── Config stato → stile ─────────────────────────────────────────

interface StatusConfig {
  label:     string
  dotClass:  string
  textClass: string
  Icon:      React.ElementType
  /** Il puntino che pulsa dice che il canale sta riagganciando: fermarlo
   *  col movimento ridotto farebbe credere che sia rimasto disconnesso. */
  movimento?: 'funzionale'
}

/* I `-testo` e non i token pieni: questi ultimi sono RIEMPIMENTI, tarati per
   reggere il proprio `-foreground` sopra, non per essere letti su `card`. In
   tema chiaro `text-warning` dava 2,11:1 su testo da 12px — trovato da axe
   solo perche' lo stato «Connessione...» era visibile durante la scansione,
   cioe' per caso. I `-testo` stanno fra 5,25 e 5,50:1 in entrambi i temi. */
const STATUS_CONFIG: Record<RealtimeConnectionStatus, StatusConfig> = {
  connected:    { label: 'Connesso',          dotClass: 'bg-success',              textClass: 'text-success-testo',     Icon: Wifi      },
  connecting:   { label: 'Connessione...',    dotClass: 'bg-warning animate-pulse', movimento: 'funzionale', textClass: 'text-warning-testo',    Icon: RefreshCw },
  reconnecting: { label: 'Riconnessione...', dotClass: 'bg-warning animate-pulse', movimento: 'funzionale', textClass: 'text-warning-testo',     Icon: RefreshCw },
  polling:      { label: 'Polling attivo',   dotClass: 'bg-warning',               textClass: 'text-warning-testo',     Icon: RefreshCw },
  error:        { label: 'Disconnesso',      dotClass: 'bg-destructive',           textClass: 'text-destructive-testo', Icon: WifiOff   },
}

// ── Props ─────────────────────────────────────────────────────────

interface ConnectionIndicatorProps {
  collapsed: boolean
}

// ── Componente ────────────────────────────────────────────────────

export function ConnectionIndicator({ collapsed }: ConnectionIndicatorProps) {
  const status = useRealtimeStatus()
  const { label, dotClass, textClass, movimento } = STATUS_CONFIG[status]

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center py-1">
            <span data-movimento={movimento} className={`size-2 rounded-full ${dotClass}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span data-movimento={movimento} className={`size-2 shrink-0 rounded-full ${dotClass}`} />
      <span className={`text-xs ${textClass}`}>{label}</span>
    </div>
  )
}
