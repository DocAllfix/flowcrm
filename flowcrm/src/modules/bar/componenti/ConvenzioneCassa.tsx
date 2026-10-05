/**
 * Addebito in convenzione alla cassa (documento Bar §20): il dipendente
 * dell'azienda convenzionata consuma sul conto aziendale. I limiti di
 * spesa li controlla il database; qui si vede quanto resta prima di provare.
 */
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import type { Tables } from '@/lib/supabase'
import { useElenco, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'
import { useFb } from '@/modules/fb/contesto'
import { fmtEuro } from '@/modules/fb/stati'

type Riepilogo = Database['public']['Views']['bar_convenzioni_riepilogo']['Row']
type DipendenteSaldo = Database['public']['Views']['bar_convenzioni_dipendenti_saldi']['Row']

const TABELLE = ['conti', 'conti_righe', 'conti_pagamenti', 'conti_saldi', 'bar_convenzioni_addebiti', 'bar_convenzioni_riepilogo',
  'bar_convenzioni_dipendenti_saldi']

export function ConvenzioneCassa({ conto, residuo }: { conto: Tables<'conti'>; residuo: number }) {
  const { localeId } = useFb()
  const { data: convenzioni = [] } = useElenco<Riepilogo>('bar_convenzioni_riepilogo', {
    filtri: { locale_id: localeId ?? undefined, attiva: true }, abilitato: !!localeId,
  })
  const ids = convenzioni.map((c) => c.convenzione_id!)
  const { data: dipendenti = [] } = useElenco<DipendenteSaldo>('bar_convenzioni_dipendenti_saldi', {
    filtri: { convenzione_id: ids, attivo: true }, ordine: [{ colonna: 'nome' }], abilitato: ids.length > 0,
  })
  const { data: comande = [] } = useElenco<Pick<Tables<'fb_comande'>, 'id' | 'convenzione_dipendente_id'>>('fb_comande', {
    filtri: { conto_id: conto.id }, select: 'id, convenzione_dipendente_id',
  })
  const addebita = useAzione('bar_addebita_convenzione', TABELLE)
  const dellaComanda = comande[0]?.convenzione_dipendente_id ?? ''
  const [scelto, setScelto] = useState('')
  useEffect(() => { setScelto(dellaComanda) }, [conto.id, dellaComanda])

  if (convenzioni.length === 0 || dipendenti.length === 0) return null
  const d = dipendenti.find((x) => x.dipendente_id === scelto)
  const azienda = (id: string | null) => convenzioni.find((c) => c.convenzione_id === id)
  const restaMese = d?.limite_mensile ? Number(d.limite_mensile) - Number(d.speso_mese ?? 0) : null
  const restaOggi = d?.limite_giornaliero ? Number(d.limite_giornaliero) - Number(d.speso_oggi ?? 0) : null

  return (
    <div className="border-t border-border pt-4">
      <h3 className="mb-2 flex items-center gap-2 text-title text-foreground"><Building2 className="h-4 w-4" /> Convenzione aziendale</h3>
      <div className="space-y-1.5">
        <Label>Dipendente</Label>
        <Select value={scelto} onValueChange={setScelto}>
          <SelectTrigger aria-label="Dipendente convenzionato"><SelectValue placeholder="Chi consuma sul conto dell'azienda" /></SelectTrigger>
          <SelectContent>{dipendenti.map((x) => (
            <SelectItem key={x.dipendente_id} value={x.dipendente_id!}>
              {azienda(x.convenzione_id)?.azienda} · {x.nome}{x.codice_tessera ? ` (${x.codice_tessera})` : ''}
            </SelectItem>))}</SelectContent>
        </Select>
      </div>
      {d && (
        <p className="mt-2 text-sm text-muted-foreground">
          Nel mese {fmtEuro(d.speso_mese)}{restaMese !== null ? `, restano ${fmtEuro(Math.max(restaMese, 0))}` : ''}
          {restaOggi !== null ? ` · oggi restano ${fmtEuro(Math.max(restaOggi, 0))}` : ''}
        </p>
      )}
      <BottoneScrittura variant="outline" className="mt-3 w-full" disabled={!d || residuo <= 0 || addebita.isPending}
        onClick={() => addebita.mutate({ p_conto: conto.id, p_dipendente: scelto, p_importo: residuo }, {
          onSuccess: () => toast.success(`${fmtEuro(residuo)} addebitati a ${azienda(d!.convenzione_id)?.azienda}`),
          onError: (e) => toast.error(messaggioErrore(e)) })}>
        Addebita {residuo > 0 ? fmtEuro(residuo) : ''} all'azienda
      </BottoneScrittura>
    </div>
  )
}
