import type { ReactNode, CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'serie'

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/20 text-warning-foreground',
  danger: 'bg-destructive/12 text-destructive',
  // `info` e `serie` prendevano classi di palette Tailwind con le rispettive
  // varianti dark scritte a mano: fuori dai token, quindi uguali per ogni
  // cliente e da riverificare a ogni cambio di tema. Ora sono token, e le due
  // versioni del tema le porta gia' il token.
  info: 'bg-info/12 text-info',
  serie: 'bg-serie-4/12 text-serie-4',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
  /** Override inline (es. colore stage dinamico dalla pipeline). */
  style?: CSSProperties
}

export function Badge({ tone = 'neutral', children, className, style }: BadgeProps) {
  return (
    <span
      style={style}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
