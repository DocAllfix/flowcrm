import type { ReactNode, CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'serie'

const TONE: Record<BadgeTone, string> = {
  // Ogni tono e' una coppia di token SOLIDI calcolata e verificata insieme
  // (src/__tests__/contrasto-token.test.ts). Prima erano velature
  // trasparenti del colore di stato con sopra lo stesso colore come testo:
  // axe le ha misurate a 3,86:1 sulle pagine interne.
  neutral: 'bg-muted text-muted-foreground',
  // Il primario e' del cliente: la velatura e il testo li calcola il tema
  // derivato (accent / accent-foreground), per qualunque tinta.
  primary: 'bg-accent text-accent-foreground',
  success: 'bg-success-tenue text-success-testo',
  warning: 'bg-warning-tenue text-warning-testo',
  danger: 'bg-destructive-tenue text-destructive-testo',
  info: 'bg-info-tenue text-info-testo',
  serie: 'bg-serie-tenue text-serie-testo',
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
