import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { MESSAGGIO_DEMO } from '@/lib/demo'

/**
 * Comodità per la UI in sola lettura (demo). `solaLettura` per disabilitare i
 * controlli di scrittura; `blocca(fn)` avvolge un handler: se in sola lettura
 * mostra il toast e non esegue, altrimenti procede. La barriera vera resta il
 * trigger `blocca_scrittura_demo()` nel database.
 */
export function useSolaLettura() {
  const { solaLettura } = useAuth()

  function blocca<T extends unknown[]>(fn: (...args: T) => void) {
    return (...args: T) => {
      if (solaLettura) {
        toast.error(MESSAGGIO_DEMO)
        return
      }
      fn(...args)
    }
  }

  return { solaLettura, blocca, messaggio: MESSAGGIO_DEMO }
}
