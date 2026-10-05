/**
 * Addebito in camera dalla cassa del ristorante o del bar (documento Hotel
 * §20 e §28): il conto del tavolo passa sul conto della camera di un ospite
 * in casa, con le sue aliquote. Il trattamento ricorda se il pasto è già
 * compreso nella pensione.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { BedDouble } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import type { Tables } from '@/lib/supabase'
import { useElenco, useInserisci, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'
import { fmtEuro } from '@/modules/hotel/stati'

type InCasa = Database['public']['Views']['hotel_conti_in_casa']['Row']

const TABELLE = ['conti', 'conti_righe', 'conti_pagamenti', 'conti_saldi', 'hotel_conti_in_casa']

export function AddebitoCamera({ conto, residuo, modulo }: { conto: Tables<'conti'>; residuo: number; modulo: string }) {
  const { data: inCasa = [] } = useElenco<InCasa>('hotel_conti_in_casa', { ordine: [{ colonna: 'camera' }] })
  const { data: sessioni = [] } = useElenco<Pick<Tables<'cassa_sessioni'>, 'id'>>('cassa_sessioni', { filtri: { modulo, stato: 'aperta' }, select: 'id' })
  const paga = useInserisci('conti_pagamenti', TABELLE)
  const [scelto, setScelto] = useState('')

  if (inCasa.length === 0) return null
  const ospite = inCasa.find((x) => x.conto_id === scelto)
  const compreso = ospite && [ospite.colazione && 'colazione', ospite.pranzo && 'pranzo', ospite.cena && 'cena'].filter(Boolean)

  return (
    <div className="border-t border-border pt-4">
      <h3 className="mb-2 flex items-center gap-2 text-title text-foreground"><BedDouble className="h-4 w-4" /> Addebito in camera</h3>
      <div className="space-y-1.5">
        <Label>Camera</Label>
        <Select value={scelto} onValueChange={setScelto}>
          <SelectTrigger aria-label="Camera dell'ospite"><SelectValue placeholder="Ospite in casa" /></SelectTrigger>
          <SelectContent>{inCasa.map((x) => (
            <SelectItem key={x.conto_id} value={x.conto_id!}>Camera {x.camera} · {x.ospite_nome}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      {ospite && (
        <p className="mt-2 text-sm text-muted-foreground">
          {ospite.trattamento ?? 'Solo pernottamento'}{compreso && compreso.length ? `: ${compreso.join(', ')} compresi` : ''} · fino al{' '}
          {new Date(ospite.partenza!).toLocaleDateString('it-IT')}
        </p>
      )}
      <BottoneScrittura variant="outline" className="mt-3 w-full" disabled={!ospite || residuo <= 0 || paga.isPending}
        onClick={() => paga.mutate({ conto_id: conto.id, modulo, metodo: 'addebito_conto', importo: residuo, conto_destinazione_id: scelto,
          sessione_id: sessioni[0]?.id ?? null }, {
          onSuccess: () => { toast.success(`${fmtEuro(residuo)} sul conto della camera ${ospite!.camera}`); setScelto('') },
          onError: (e) => toast.error(messaggioErrore(e)) })}>
        Addebita {residuo > 0 ? fmtEuro(residuo) : ''} in camera
      </BottoneScrittura>
    </div>
  )
}
