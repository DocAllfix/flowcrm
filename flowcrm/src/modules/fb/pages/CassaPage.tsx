/**
 * CassaPage — cassa del locale (Ristorante §33-35, Bar §17-19): la sezione
 * condivisa delle fondamenta, sui conti di questo modulo. Con l'Hotel attivo
 * il conto passa anche sulla camera di un ospite in casa.
 */
import { PageHeader } from '@/components/ui/page-header'
import { CassaSezione } from '@/components/condivisi/CassaSezione'
import { APP_CONFIG } from '@/config/app.config'
import { ConvenzioneCassa } from '@/modules/bar/componenti/ConvenzioneCassa'
import { AddebitoCamera } from '@/modules/hotel/componenti/AddebitoCamera'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale } from '@/modules/fb/componenti/SelettoreLocale'

export function CassaPage() {
  const { modulo } = useFb()
  const hotel = APP_CONFIG.moduli.includes('hotel')
  return (
    <ConLocale>
      <PageHeader title="Cassa" description="Conti aperti, divisioni, pagamenti misti e chiusura della cassa a fine turno." />
      <CassaSezione modulo={modulo} estensione={(ctx) => <>
        {modulo === 'bar' && <ConvenzioneCassa {...ctx} />}
        {hotel && <AddebitoCamera {...ctx} modulo={modulo} />}
      </>} />
    </ConLocale>
  )
}
