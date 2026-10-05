/**
 * Radice delle pagine del Garage, caricata solo quando se ne apre una:
 * il contesto e le query del modulo non pesano sull'avvio.
 */
import { Suspense, type ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { GarageProvider } from '@/modules/garage/contesto'

export default function GarageRadice({ children }: { children: ReactNode }) {
  return (
    <GarageProvider>
      <Suspense fallback={<div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>}>
        {children}
      </Suspense>
    </GarageProvider>
  )
}
