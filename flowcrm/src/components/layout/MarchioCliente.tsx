import { useState } from 'react'
import { Zap } from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'
import { cn } from '@/lib/utils'

/**
 * Il marchio dell'istanza: logo del cliente, o un ripiego che non sfigura.
 *
 * ── Perché non basta <img src={APP_CONFIG.logoUrl}> ─────────────────
 * Il valore predefinito di `logoUrl` è `/logo-default.svg`, e **quel file
 * non esiste** in `public/`: cablarlo direttamente darebbe un'immagine
 * rotta su ogni istanza che non configura un logo, cioè su tutte quelle
 * appena installate. E un URL sbagliato scritto in fase di provisioning
 * darebbe la stessa cosa a un cliente vero.
 *
 * Quindi tre casi, in ordine:
 *   1. logo del cliente, se configurato e se si carica;
 *   2. monogramma del nome, per chi ha un nome proprio ma non un logo;
 *   3. il fulmine, solo per l'istanza che si chiama ancora FlowCRM.
 *
 * ── Perché niente gradiente ─────────────────────────────────────────
 * Le quattro copie di questo riquadro (barra laterale e tre pagine di
 * accesso) usavano `bg-gradient-to-br from-primary to-orange-600`: un
 * arancio fisso, fuori dal sistema dei token. Un cliente con marchio blu
 * riceveva un riquadro che sfumava dal suo blu al nostro arancio.
 */

const LOGO_PREDEFINITO = '/logo-default.svg'

function monogramma(nome: string): string {
  const parole = nome.trim().split(/[\s_-]+/).filter(Boolean)
  if (parole.length === 0) return '?'
  if (parole.length === 1) {
    // Un nome solo: due lettere se è scritto in cammello (FlowCRM → FC),
    // altrimenti la prima.
    const maiuscole = parole[0].match(/[A-ZÀ-Þ]/g)
    if (maiuscole && maiuscole.length >= 2) return maiuscole.slice(0, 2).join('')
    return parole[0][0].toUpperCase()
  }
  return (parole[0][0] + parole[1][0]).toUpperCase()
}

interface MarchioClienteProps {
  /** `sm` nella barra laterale, `lg` nelle pagine di accesso. */
  dimensione?: 'sm' | 'lg'
  className?: string
}

export function MarchioCliente({ dimensione = 'sm', className }: MarchioClienteProps) {
  const [immagineRotta, setImmagineRotta] = useState(false)

  const personalizzato =
    APP_CONFIG.logoUrl && APP_CONFIG.logoUrl !== LOGO_PREDEFINITO && !immagineRotta

  const riquadro = cn(
    'flex shrink-0 items-center justify-center overflow-hidden',
    dimensione === 'lg' ? 'h-12 w-12 rounded-xl' : 'h-9 w-9 rounded-lg',
    className,
  )

  if (personalizzato) {
    return (
      <img
        src={APP_CONFIG.logoUrl}
        // Il nome del cliente è già scritto accanto al marchio in tutti i
        // punti in cui questo compare: ripeterlo qui farebbe leggere due
        // volte la stessa cosa a chi usa uno screen reader.
        alt=""
        aria-hidden
        className={cn(riquadro, 'object-contain')}
        onError={() => setImmagineRotta(true)}
      />
    )
  }

  const predefinita = APP_CONFIG.appName === 'FlowCRM'

  return (
    <div className={cn(riquadro, 'bg-primary text-primary-foreground')} aria-hidden>
      {predefinita ? (
        <Zap
          className={dimensione === 'lg' ? 'h-6 w-6' : 'h-[1.125rem] w-[1.125rem]'}
          fill="currentColor"
        />
      ) : (
        <span
          className={cn(
            'font-semibold leading-none tracking-tight',
            dimensione === 'lg' ? 'text-lg' : 'text-sm',
          )}
        >
          {monogramma(APP_CONFIG.appName)}
        </span>
      )}
    </div>
  )
}
