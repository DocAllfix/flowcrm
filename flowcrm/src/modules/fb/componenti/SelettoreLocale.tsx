/**
 * Selettore del locale (un hotel può avere ristorante e bar della piscina)
 * e guardia delle pagine: senza locali propone la configurazione iniziale.
 */
import { useState, type ReactNode } from 'react'
import { Store } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { useFb } from '@/modules/fb/contesto'
import { ConfiguraLocaleDialog } from '@/modules/fb/componenti/ConfiguraLocaleDialog'

export function SelettoreLocale() {
  const { locali, localeId, scegliLocale } = useFb()
  if (locali.length < 2) return null
  return (
    <Select value={localeId ?? undefined} onValueChange={scegliLocale}>
      <SelectTrigger className="w-56" aria-label="Locale">
        <Store className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Locale" />
      </SelectTrigger>
      <SelectContent>
        {locali.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

/** Mostra i figli solo se c'è un locale; altrimenti la configurazione guidata. */
export function ConLocale({ children }: { children: ReactNode }) {
  const { locale, caricamento, nome } = useFb()
  const { isManager } = useAuth()
  const [apri, setApri] = useState(false)
  if (caricamento) {
    return <div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>
  }
  if (!locale) {
    return (
      <>
        <EmptyState icon={Store} title={`Nessun ${nome.toLowerCase()} configurato`}
          description={isManager
            ? 'Crea il locale con la sua sala, i tavoli e le postazioni di preparazione: bastano due minuti.'
            : 'La direzione deve prima configurare il locale.'}
          action={isManager ? <BottoneScrittura onClick={() => setApri(true)}>Configura il locale</BottoneScrittura> : undefined} filtrato={!isManager} />
        <ConfiguraLocaleDialog open={apri} onOpenChange={setApri} />
      </>
    )
  }
  return <>{children}</>
}
