/**
 * CassaPage — cassa del locale (Ristorante §33-35, Bar §17-19): la sezione
 * condivisa delle fondamenta, sui conti di questo modulo.
 */
import { PageHeader } from '@/components/ui/page-header'
import { CassaSezione } from '@/components/condivisi/CassaSezione'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale } from '@/modules/fb/componenti/SelettoreLocale'

export function CassaPage() {
  const { modulo } = useFb()
  return (
    <ConLocale>
      <PageHeader title="Cassa" description="Conti aperti, divisioni, pagamenti misti e chiusura della cassa a fine turno." />
      <CassaSezione modulo={modulo} />
    </ConLocale>
  )
}
