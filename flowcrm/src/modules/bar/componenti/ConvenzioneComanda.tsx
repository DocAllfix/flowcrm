/**
 * Il cliente dell'ordine è un dipendente convenzionato (documento Bar §20):
 * da qui in poi le voci prendono il listino della sua azienda e alla cassa
 * l'addebito è già pronto.
 */
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useElenco, useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'
import { TABELLE_SERVIZIO } from '@/modules/fb/queries'

type Riepilogo = Database['public']['Views']['bar_convenzioni_riepilogo']['Row']
type DipendenteSaldo = Database['public']['Views']['bar_convenzioni_dipendenti_saldi']['Row']

export function ConvenzioneComanda({ comandaId, localeId, dipendenteId }: { comandaId: string; localeId: string; dipendenteId: string | null }) {
  const { data: convenzioni = [] } = useElenco<Riepilogo>('bar_convenzioni_riepilogo', { filtri: { locale_id: localeId, attiva: true } })
  const ids = convenzioni.map((c) => c.convenzione_id!)
  const { data: dipendenti = [] } = useElenco<DipendenteSaldo>('bar_convenzioni_dipendenti_saldi', {
    filtri: { convenzione_id: ids, attivo: true }, ordine: [{ colonna: 'nome' }], abilitato: ids.length > 0,
  })
  const salva = useSalva('fb_comande', TABELLE_SERVIZIO)
  if (dipendenti.length === 0) return null
  const azienda = (id: string | null) => convenzioni.find((c) => c.convenzione_id === id)?.azienda

  return (
    <div className="w-64">
      <Select value={dipendenteId ?? 'nessuna'}
        onValueChange={(v) => salva.mutate({ id: comandaId, values: { convenzione_dipendente_id: v === 'nessuna' ? null : v } }, {
          onSuccess: () => toast.success(v === 'nessuna' ? 'Prezzi normali' : 'Ordine in convenzione: le prossime voci hanno il listino dell\'azienda'),
          onError: (e) => toast.error(messaggioErrore(e)) })}>
        <SelectTrigger aria-label="Convenzione aziendale"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="nessuna">Nessuna convenzione</SelectItem>
          {dipendenti.map((d) => (
            <SelectItem key={d.dipendente_id} value={d.dipendente_id!}>{azienda(d.convenzione_id)} · {d.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
