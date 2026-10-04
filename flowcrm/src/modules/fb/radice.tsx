/**
 * Radice delle pagine food & beverage, caricata solo quando si apre una
 * pagina del Ristorante o del Bar: il contesto del modulo e le query non
 * pesano sull'avvio dell'applicazione.
 */
import { Suspense, type ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { FbProvider, type ModuloFb } from '@/modules/fb/contesto'

export default function FbRadice({ modulo, children }: { modulo: ModuloFb; children: ReactNode }) {
  return (
    <FbProvider modulo={modulo}>
      <Suspense fallback={<div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>}>
        {children}
      </Suspense>
    </FbProvider>
  )
}
