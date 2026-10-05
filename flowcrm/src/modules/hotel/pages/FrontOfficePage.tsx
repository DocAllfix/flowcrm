/**
 * Front office (documento Hotel §44): arrivi e partenze del giorno con il
 * check-in e il check-out a un tocco, camere per stato, prenotazioni nuove,
 * modificate e cancellate, pasti previsti per la cucina.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { BedDouble, ConciergeBell, KeyRound, LogIn, LogOut, Plus, Utensils } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useElenco, useRpc, useAzione, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { PrenotazioneDialog } from '@/modules/hotel/dialogs/PrenotazioneDialog'
import { useCatalogoHotel, TABELLE_SOGGIORNO, type Prenotazione } from '@/modules/hotel/queries'
import { CAMERA_STATO, fmtData, notti, oggiIso } from '@/modules/hotel/stati'

type Pasto = Database['public']['Functions']['hotel_pasti_previsti']['Returns'][number]
interface FrontOffice {
  arrivi: Record<string, number>; partenze: Record<string, number>; camere: Record<string, number>; prenotazioni: Record<string, number>
}

export function FrontOfficePage() {
  return <ConStruttura><FrontOffice_ /></ConStruttura>
}

function FrontOffice_() {
  const { strutturaId, struttura } = useHotel()
  const oggi = oggiIso()
  useDalVivo(['hotel_prenotazioni', 'hotel_camere', 'hotel_pulizie'], [['fond-rpc']])
  const { data: fo, isLoading } = useRpc<FrontOffice>('hotel_front_office', { p_struttura: strutturaId }, { abilitato: !!strutturaId, intervallo: 60_000 })
  const { data: pasti = [] } = useRpc<Pasto[]>('hotel_pasti_previsti', { p_struttura: strutturaId }, { abilitato: !!strutturaId })
  const { data: arrivi = [] } = useElenco<Prenotazione>('hotel_prenotazioni', {
    filtri: { struttura_id: strutturaId ?? undefined, arrivo: oggi, stato: ['opzionata', 'confermata', 'in_soggiorno'] },
    ordine: [{ colonna: 'arrivo_ora' }, { colonna: 'ospite_nome' }], abilitato: !!strutturaId,
  })
  const { data: partenze = [] } = useElenco<Prenotazione>('hotel_prenotazioni', {
    filtri: { struttura_id: strutturaId ?? undefined, partenza: oggi, stato: ['in_soggiorno', 'partita'] },
    ordine: [{ colonna: 'ospite_nome' }], abilitato: !!strutturaId,
  })
  const { camere } = useCatalogoHotel(strutturaId)
  const checkIn = useAzione('hotel_check_in', TABELLE_SOGGIORNO)
  const checkOut = useAzione('hotel_check_out', TABELLE_SOGGIORNO)
  const n = (v: number | undefined) => (isLoading ? undefined : v ?? 0)
  const [nuova, setNuova] = useState(false)
  const numero = (id: string | null) => camere.find((c) => c.id === id)?.numero
  const conta = (p: string) => pasti.filter((x) => x.pasto === p).reduce((s, x) => s + Number(x.persone ?? 0), 0)

  return (
    <div>
      <PageHeader title={struttura?.nome ? `Oggi · ${struttura.nome}` : 'Oggi in hotel'} description={`Front office del ${fmtData(oggi)}: arrivi, partenze e camere.`}
        numeri={[
          { etichetta: 'arrivi', valore: n(fo?.arrivi.previsti), inCaricamento: isLoading },
          { etichetta: 'partenze', valore: n(fo?.partenze.previste), inCaricamento: isLoading },
          { etichetta: 'camere occupate', valore: n(fo?.camere.occupate), inCaricamento: isLoading },
          { etichetta: 'ospiti in casa', valore: n(fo?.prenotazioni.ospiti_in_casa), inCaricamento: isLoading },
        ]}
        actions={<><SelettoreStruttura /><Button asChild variant="outline"><Link to="/hotel/planning">Planning</Link></Button>
          <BottoneScrittura onClick={() => setNuova(true)}><Plus className="h-4 w-4" /> Nuova prenotazione</BottoneScrittura></>} />
      <PrenotazioneDialog open={nuova} onOpenChange={setNuova} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-2 text-title text-foreground"><LogIn className="h-4 w-4 text-primary-testo" /> Arrivi</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {fo ? `${fo.arrivi.arrivati} arrivati su ${fo.arrivi.previsti}` : '…'}
            {fo?.arrivi.vip ? ` · ${fo.arrivi.vip} VIP` : ''}{fo?.arrivi.early_check_in ? ` · ${fo.arrivi.early_check_in} early check-in` : ''}
            {fo?.arrivi.senza_camera ? ` · ${fo.arrivi.senza_camera} senza camera` : ''}
          </p>
          {isLoading ? <Skeleton className="h-24" /> : arrivi.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nessun arrivo previsto oggi.</p> : (
            <ul className="divide-y divide-border">
              {arrivi.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <Link to={`/hotel/prenotazioni/${p.id}`} className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{p.ospite_nome}</span>
                    <span className="block text-xs text-muted-foreground">{notti(p.notti)} · {p.adulti + p.bambini} persone{p.arrivo_ora ? ` · alle ${p.arrivo_ora.slice(0, 5)}` : ''}{p.richieste ? ` · ${p.richieste}` : ''}</span>
                  </Link>
                  {numero(p.camera_id) ? <Badge tone="primary">{numero(p.camera_id)}</Badge> : <Badge tone="warning">Senza camera</Badge>}
                  {p.stato === 'in_soggiorno' ? <Badge tone="success">Arrivato</Badge> : (
                    <BottoneScrittura size="sm" variant="outline" disabled={checkIn.isPending || !p.camera_id}
                      onClick={() => checkIn.mutate({ p_prenotazione: p.id }, { onSuccess: () => toast.success(`${p.ospite_nome}: check-in fatto`),
                        onError: (e) => toast.error(messaggioErrore(e)) })}><KeyRound className="h-3.5 w-3.5" /> Check-in</BottoneScrittura>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-2 text-title text-foreground"><LogOut className="h-4 w-4 text-primary-testo" /> Partenze</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {fo ? `${fo.partenze.partite} partiti su ${fo.partenze.previste}` : '…'}{fo?.partenze.late_check_out ? ` · ${fo.partenze.late_check_out} late check-out` : ''}
            {fo?.partenze.conti_aperti ? ` · ${fo.partenze.conti_aperti} conti da saldare` : ''}
          </p>
          {isLoading ? <Skeleton className="h-24" /> : partenze.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nessuna partenza oggi.</p> : (
            <ul className="divide-y divide-border">
              {partenze.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <Link to={`/hotel/prenotazioni/${p.id}`} className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{p.ospite_nome}</span>
                    <span className="block text-xs text-muted-foreground">Camera {numero(p.camera_id) ?? '—'}{p.late_check_out ? ' · late check-out' : ''}</span>
                  </Link>
                  {p.stato === 'partita' ? <Badge tone="neutral">Partito</Badge> : (
                    <BottoneScrittura size="sm" variant="outline" disabled={checkOut.isPending}
                      onClick={() => checkOut.mutate({ p_prenotazione: p.id }, {
                        onSuccess: (r) => {
                          const e = r as unknown as { completato: boolean; residuo: number }
                          if (e.completato) toast.success(`${p.ospite_nome}: check-out fatto`)
                          else toast.warning(`${p.ospite_nome}: ${Number(e.residuo) > 0 ? 'conto da saldare' : 'eccedenza da restituire'} in cassa, poi di nuovo check-out`)
                        },
                        onError: (e) => toast.error(messaggioErrore(e)) })}><LogOut className="h-3.5 w-3.5" /> Check-out</BottoneScrittura>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><BedDouble className="h-4 w-4 text-primary-testo" /> Camere</h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {([['disponibili', 'disponibile', 'Disponibili'], ['occupate', 'occupata', 'Occupate'], ['da_pulire', 'da_pulire', 'Da pulire'],
               ['in_pulizia', 'in_pulizia', 'In pulizia'], ['pronte', 'pulita', 'Pronte'], ['fuori_servizio', 'fuori_servizio', 'Fuori servizio']] as const).map(([k, stato, etichetta]) => {
              const st = CAMERA_STATO[stato]
              return (
                <Link key={k} to="/hotel/camere" className={`rounded-lg border px-3 py-2 ${st.bordo} ${st.riempimento}`}>
                  <dt className="text-xs text-muted-foreground">{etichetta}</dt>
                  <dd data-slot="kpi" className="text-title text-foreground">{n(fo?.camere[k])}</dd>
                </Link>
              )
            })}
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">
            Prenotazioni di oggi: {fo?.prenotazioni.nuove ?? 0} nuove, {fo?.prenotazioni.modificate ?? 0} modificate, {fo?.prenotazioni.cancellate ?? 0} cancellate
            {fo?.arrivi.mancati_ieri ? `; ${fo.arrivi.mancati_ieri} arrivi mancati da segnare come no-show` : ''}.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><Utensils className="h-4 w-4 text-primary-testo" /> Pasti previsti</h2>
          <dl className="mb-3 grid grid-cols-3 gap-2">
            {[['colazione', 'Colazioni'], ['pranzo', 'Pranzi'], ['cena', 'Cene']].map(([k, l]) => (
              <div key={k} className="rounded-lg border border-border px-3 py-2"><dt className="text-xs text-muted-foreground">{l}</dt>
                <dd data-slot="kpi" className="text-title text-foreground">{conta(k)}</dd></div>
            ))}
          </dl>
          {pasti.filter((x) => x.pasto === 'cena').length > 0 && (
            <p className="text-sm text-muted-foreground">Stasera a cena: {pasti.filter((x) => x.pasto === 'cena').map((x) => `${x.camera ?? '—'} (${x.persone})`).join(', ')}</p>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><ConciergeBell className="h-3.5 w-3.5" aria-hidden />
            Ristorante e bar addebitano sul conto della camera dalla loro cassa.</p>
        </Card>
      </div>
    </div>
  )
}
