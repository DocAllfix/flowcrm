import type { ReactNode, CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/20 text-warning-foreground',
  danger: 'bg-destructive/12 text-destructive',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
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
