/**
 * Radice delle pagine dell'Hotel, caricata solo quando se ne apre una:
 * il contesto e le query del modulo non pesano sull'avvio.
 */
import { Suspense, type ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { HotelProvider } from '@/modules/hotel/contesto'

export default function HotelRadice({ children }: { children: ReactNode }) {
  return (
    <HotelProvider>
      <Suspense fallback={<div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>}>
        {children}
      </Suspense>
    </HotelProvider>
  )
}
