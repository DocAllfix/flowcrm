import { Eye } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

/**
 * Striscia permanente mostrata quando l'istanza è in sola lettura (demo).
 * Chiarisce che è una scelta della demo — non un malfunzionamento — e invita
 * a contattare per la versione completa. La barriera vera resta nel database.
 */
export function BannerDemo() {
  const { solaLettura } = useAuth()
  if (!solaLettura) return null

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <Eye className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        <strong className="font-semibold">Versione dimostrativa · sola lettura.</strong>{' '}
        Puoi esplorare tutto liberamente; le modifiche sono disponibili solo nella
        versione completa — contatta per attivarla.
      </span>
    </div>
  )
}
