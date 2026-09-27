import { Eye } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { DEMO_PUBBLICA } from '@/lib/demo'

/**
 * Striscia permanente sull'istanza dimostrativa. Chiarisce che è una scelta della
 * demo, non un malfunzionamento. La barriera vera resta nel database.
 *
 * Due voci:
 *  - l'OSPITE della demo pubblica prova davvero (crea, sposta, incassa): gli si
 *    dice che non è solo e che ogni notte i dati tornano come nuovi, così una
 *    trattativa spostata da un altro visitatore non sembra un errore;
 *  - gli altri account della demo sono in sola lettura, come prima.
 *
 * «Richiedi una presentazione» compare solo quando c'è un indirizzo a cui
 * mandare le persone (`VITE_DEMO_PUBBLICA_CONTATTI`): una CTA verso un modulo
 * spento è peggio di niente (lezione di Legisboard).
 */
export function BannerDemo() {
  const { istanzaDemo, ospiteDemo } = useAuth()
  if (!istanzaDemo) return null

  const contatti = import.meta.env.VITE_DEMO_PUBBLICA_CONTATTI as string | undefined

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm text-foreground"
    >
      <span className="inline-flex items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" aria-hidden />
        {ospiteDemo ? (
          <span>
            <strong className="font-semibold">Stai provando PMIFlow con dati di fantasia.</strong>{' '}
            Altri visitatori possono essere qui con te; ogni notte i dati tornano come nuovi.
          </span>
        ) : (
          <span>
            <strong className="font-semibold">Versione dimostrativa · sola lettura.</strong>{' '}
            Puoi esplorare tutto liberamente; le modifiche sono disponibili solo nella versione completa.
          </span>
        )}
      </span>
      {ospiteDemo && (
        <span className="inline-flex items-center gap-3">
          {contatti && (
            <a href={contatti} className="font-semibold text-primary-testo underline underline-offset-2">
              Richiedi una presentazione
            </a>
          )}
          <a href={DEMO_PUBBLICA.sito} className="underline underline-offset-2">
            Torna al sito
          </a>
        </span>
      )}
    </div>
  )
}
