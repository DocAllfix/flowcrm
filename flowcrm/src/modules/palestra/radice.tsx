/**
 * Radice delle pagine della Palestra, caricata solo quando se ne apre una:
 * il contesto e le query del modulo non pesano sull'avvio.
 */
import { Suspense, type ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { PalestraProvider } from '@/modules/palestra/contesto'

export default function PalestraRadice({ children }: { children: ReactNode }) {
  return (
    <PalestraProvider>
      <Suspense fallback={<div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>}>
        {children}
      </Suspense>
    </PalestraProvider>
  )
}
