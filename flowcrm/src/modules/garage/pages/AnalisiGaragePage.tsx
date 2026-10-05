/**
 * Analisi della direzione (documento Garage §24): occupazione per piano e
 * per fascia oraria, ricavi da parcheggio, abbonamenti e servizi, insoluti,
 * movimenti, permanenza, prenotazioni, anomalie e danni.
 */
import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ManagerOnly } from '@/components/ManagerOnly'
import { useRpc } from '@/lib/queries/fondamenta'
import { useGarage } from '@/modules/garage/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/garage/componenti/ConStruttura'
import { durata, fmtEuro, fmtNumero, oggiIso, piuGiorni } from '@/modules/garage/stati'

interface Kpi {
  occupazione: { posti_totali: number; posti_occupati: number; posti_liberi: number; tasso: number
    per_piano: { piano: number; posti: number; occupati: number }[]; per_fascia: { ora: number; media: number }[] }
  economici: { ricavi_parcheggio: number; ricavi_abbonamenti: number; ricavi_servizi: number; ricavo_medio_posto: number; ricavo_medio_veicolo: number; insoluti: number; da_incassare: number } | null
  operativi: { ingressi: number; uscite: number; permanenza_media_min: number; prenotazioni: number; non_presentati: number; tasso_utilizzo: number; anomalie: number; danni: number
    ricariche: number; kwh: number }
}

export function AnalisiGaragePage() {
  return <ManagerOnly><ConStruttura><Analisi_ /></ConStruttura></ManagerOnly>
}

function Analisi_() {
  const { strutturaId } = useGarage()
  const [dal, setDal] = useState(piuGiorni(oggiIso(), -29))
  const [al, setAl] = useState(oggiIso())
  const { data: k, isLoading } = useRpc<Kpi>('gar_kpi', { p_struttura: strutturaId, p_dal: dal, p_al: al })
  const e = k?.economici
  const voce = (l: string, v: string) => <div key={l} className="flex items-center justify-between py-1.5"><dt className="text-muted-foreground">{l}</dt><dd className="tabular-nums text-foreground">{v}</dd></div>
  const picco = Math.max(0.1, ...(k?.occupazione.per_fascia.map((f) => f.media) ?? [0]))
  return (
    <div>
      <PageHeader title="Analisi" description="Occupazione, ricavi, movimenti e anomalie del periodo."
        numeri={[
          { etichetta: 'occupazione adesso', valore: k ? `${fmtNumero(k.occupazione.tasso, 1)}%` : undefined, inCaricamento: isLoading },
          { etichetta: 'utilizzo nel periodo', valore: k ? `${fmtNumero(k.operativi.tasso_utilizzo, 1)}%` : undefined, inCaricamento: isLoading },
          { etichetta: 'ricavi', valore: e ? fmtEuro(e.ricavi_parcheggio + e.ricavi_abbonamenti + e.ricavi_servizi) : undefined, inCaricamento: isLoading },
          { etichetta: 'ingressi', valore: k?.operativi.ingressi, inCaricamento: isLoading },
        ]}
        actions={<SelettoreStruttura />} />
      <Card className="mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label htmlFor="ag-dal">Dal</Label><Input id="ag-dal" type="date" value={dal} onChange={(ev) => ev.target.value && setDal(ev.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="ag-al">Al</Label><Input id="ag-al" type="date" value={al} onChange={(ev) => ev.target.value && setAl(ev.target.value)} /></div>
        {([['7 giorni', 6], ['30 giorni', 29], ['90 giorni', 89]] as const).map(([l, g]) => (
          <Button key={l} variant="ghost" onClick={() => { setDal(piuGiorni(oggiIso(), -g)); setAl(oggiIso()) }}>{l}</Button>))}
      </Card>
      {isLoading || !k ? <Skeleton className="h-96" /> : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Occupazione</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Posti totali', fmtNumero(k.occupazione.posti_totali)), voce('Occupati adesso', fmtNumero(k.occupazione.posti_occupati)),
              voce('Liberi adesso', fmtNumero(k.occupazione.posti_liberi)), voce('Tasso di occupazione', `${fmtNumero(k.occupazione.tasso, 1)}%`),
              voce('Tasso di utilizzo nel periodo', `${fmtNumero(k.operativi.tasso_utilizzo, 1)}%`),
            ]}</dl>
            <h3 className="mb-1 mt-4 text-label uppercase text-muted-foreground">Per piano, adesso</h3>
            <ul className="space-y-1.5 text-sm">{k.occupazione.per_piano.map((p) => (
              <li key={p.piano} className="flex items-center gap-3"><span className="w-20 text-muted-foreground">{p.piano === 0 ? 'Terra' : `Piano ${p.piano}`}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-primary" style={{ width: `${p.posti ? (100 * p.occupati) / p.posti : 0}%` }} /></span>
                <span className="w-16 text-right tabular-nums text-foreground">{p.occupati}/{p.posti}</span></li>))}</ul>
          </Card>
          <Card className="p-5"><h2 className="mb-1 text-title text-foreground">Occupazione per fascia oraria</h2>
            <p className="mb-3 text-sm text-muted-foreground">Veicoli dentro in media, ora per ora, nel periodo.</p>
            {k.occupazione.per_fascia.length === 0 ? <p className="text-sm text-muted-foreground">Nessun dato nel periodo.</p> : (
              <div className="flex h-40 items-end gap-0.5" role="img" aria-label={`Picco medio di ${fmtNumero(Math.max(...k.occupazione.per_fascia.map((f) => f.media)), 1)} veicoli`}>
                {k.occupazione.per_fascia.map((f) => (
                  <div key={f.ora} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${f.ora}:00 · ${fmtNumero(f.media, 1)}`}>
                    <span className="w-full rounded-t bg-primary/80" style={{ height: `${(100 * f.media) / picco}%` }} />
                    <span className="text-[10px] tabular-nums text-muted-foreground">{f.ora % 3 === 0 ? f.ora : ''}</span>
                  </div>))}
              </div>
            )}
          </Card>
          {e && <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Economici</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Ricavi da parcheggio', fmtEuro(e.ricavi_parcheggio)), voce('Ricavi da abbonamenti', fmtEuro(e.ricavi_abbonamenti)), voce('Ricavi da servizi e ricariche', fmtEuro(e.ricavi_servizi)),
              voce('Ricavo medio per posto', fmtEuro(e.ricavo_medio_posto)), voce('Ricavo medio per veicolo a tariffa', fmtEuro(e.ricavo_medio_veicolo)),
              voce('Insoluti', fmtEuro(e.insoluti)), voce('Soste da incassare', fmtEuro(e.da_incassare)),
            ]}</dl></Card>}
          <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Operativi</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Ingressi', fmtNumero(k.operativi.ingressi)), voce('Uscite', fmtNumero(k.operativi.uscite)), voce('Permanenza media', durata(k.operativi.permanenza_media_min)),
              voce('Prenotazioni', fmtNumero(k.operativi.prenotazioni)), voce('Prenotazioni non onorate', fmtNumero(k.operativi.non_presentati)),
              voce('Anomalie', fmtNumero(k.operativi.anomalie)), voce('Danni', fmtNumero(k.operativi.danni)),
              voce('Ricariche', `${fmtNumero(k.operativi.ricariche)} · ${fmtNumero(k.operativi.kwh, 1)} kWh`),
            ]}</dl></Card>
        </div>
      )}
    </div>
  )
}
