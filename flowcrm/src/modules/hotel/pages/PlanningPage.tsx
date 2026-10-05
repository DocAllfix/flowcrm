/**
 * Planning / room rack (documento Hotel §8–9): camere × giorni con le
 * prenotazioni come barre, arrivi e partenze, camere fuori servizio,
 * disponibilità per tipologia e overbooking in testa, prenotazioni da
 * assegnare. Una barra si trascina su un'altra camera (oppure si sposta dal
 * pannello, anche da tastiera); il database rifiuta le sovrapposizioni.
 */
import { useMemo, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Wrench } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { cn } from '@/lib/utils'
import { useRpc, useSalva, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { PrenotazioneDialog } from '@/modules/hotel/dialogs/PrenotazioneDialog'
import { useCatalogoHotel, usePrenotazioniPeriodo, TABELLE_SOGGIORNO, type Disponibilita, type Prenotazione } from '@/modules/hotel/queries'
import { PRENOTAZIONE_STATO, fmtData, giorniTra, oggiIso, piuGiorni } from '@/modules/hotel/stati'

const GIORNI = 14
const LARGHEZZA = 44   // px per giorno
const ATTIVE = ['richiesta', 'opzionata', 'confermata', 'in_soggiorno', 'partita']

export function PlanningPage() {
  return <ConStruttura><Planning_ /></ConStruttura>
}

function Planning_() {
  const { strutturaId } = useHotel()
  const navigate = useNavigate()
  const oggi = oggiIso()
  const [inizio, setInizio] = useState(piuGiorni(oggi, -1))
  const fine = piuGiorni(inizio, GIORNI)
  const giorni = useMemo(() => Array.from({ length: GIORNI }, (_, i) => piuGiorni(inizio, i)), [inizio])
  const { tipologie, camere, caricamento } = useCatalogoHotel(strutturaId)
  useDalVivo(['hotel_prenotazioni', 'hotel_camere'])
  const { data: prenotazioni = [] } = usePrenotazioniPeriodo(strutturaId, inizio, fine, ATTIVE)
  const { data: disponibilita = [] } = useRpc<Disponibilita[]>('hotel_disponibilita',
    { p_struttura: strutturaId, p_dal: inizio, p_al: piuGiorni(fine, -1) }, { abilitato: !!strutturaId })
  const salva = useSalva('hotel_prenotazioni', TABELLE_SOGGIORNO)
  const [trascinata, setTrascinata] = useState<string | null>(null)
  const [sopra, setSopra] = useState<string | null>(null)
  const [scelta, setScelta] = useState<Prenotazione | null>(null)
  const [nuova, setNuova] = useState<{ camera_id: string; tipologia_id: string; arrivo: string } | null>(null)

  const daAssegnare = prenotazioni.filter((p) => !p.camera_id && p.stato !== 'partita')
  const perCamera = (id: string) => prenotazioni.filter((p) => p.camera_id === id)
  const dispo = (data: string, tipologia: string) => disponibilita.find((d) => d.data === data && d.tipologia_id === tipologia)

  function sposta(p: Prenotazione, camera: string) {
    if (p.camera_id === camera) return
    const c = camere.find((x) => x.id === camera)
    salva.mutate({ id: p.id, values: { camera_id: camera } }, {
      onSuccess: () => toast.success(`${p.ospite_nome} spostato nella camera ${c?.numero}`),
      onError: (e) => toast.error(/23P01|hotel_camera_libera/.test(JSON.stringify(e))
        ? `La camera ${c?.numero} è occupata in quelle notti` : messaggioErrore(e)),
    })
  }
  function lascia(e: DragEvent, camera: string) {
    e.preventDefault()
    setSopra(null)
    const p = prenotazioni.find((x) => x.id === (trascinata ?? e.dataTransfer.getData('text/plain')))
    setTrascinata(null)
    if (p) sposta(p, camera)
  }

  /** Posizione della barra nella finestra visibile. */
  function geometria(p: Prenotazione) {
    const da = Math.max(0, giorniTra(inizio, p.arrivo))
    const a = Math.min(GIORNI, giorniTra(inizio, p.partenza))
    // mezzo giorno di rientro: la partenza lascia posto all'arrivo nella stessa colonna
    const sinistra = da * LARGHEZZA + (giorniTra(inizio, p.arrivo) >= 0 ? LARGHEZZA / 2 : 0)
    const destra = a * LARGHEZZA + (giorniTra(inizio, p.partenza) <= GIORNI ? LARGHEZZA / 2 : 0)
    return { left: sinistra, width: Math.max(LARGHEZZA / 2, destra - sinistra - 2) }
  }

  return (
    <div>
      <PageHeader title="Planning" description="Camere e giorni: trascina una prenotazione su un'altra camera per spostarla."
        numeri={[
          { etichetta: 'da assegnare', valore: daAssegnare.length },
          { etichetta: 'notti in overbooking', valore: disponibilita.filter((d) => d.overbooking).length },
        ]}
        actions={<SelettoreStruttura />} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setInizio(piuGiorni(inizio, -7))} aria-label="Settimana precedente"><ChevronLeft className="h-4 w-4" /></Button>
        <Input type="date" className="w-40" value={inizio} onChange={(e) => e.target.value && setInizio(e.target.value)} aria-label="Dal giorno" />
        <Button variant="outline" size="icon" onClick={() => setInizio(piuGiorni(inizio, 7))} aria-label="Settimana successiva"><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={() => setInizio(piuGiorni(oggi, -1))}>Oggi</Button>
      </div>

      {caricamento ? <Skeleton className="h-96 w-full" /> : (
        <Card className="overflow-x-auto">
          <div style={{ minWidth: 150 + GIORNI * LARGHEZZA }} className="text-sm">
            {/* intestazione dei giorni */}
            <div className="sticky top-0 z-10 flex border-b border-border bg-card">
              <div className="w-[150px] shrink-0 px-3 py-2 text-label uppercase text-muted-foreground">Camera</div>
              {giorni.map((g) => {
                const d = new Date(`${g}T12:00`)
                const festivo = d.getDay() === 0 || d.getDay() === 6
                return (
                  <div key={g} style={{ width: LARGHEZZA }} className={cn('shrink-0 border-l border-border py-1 text-center text-xs tabular-nums',
                    g === oggi ? 'bg-accent font-semibold text-accent-foreground' : festivo ? 'bg-muted/60 text-foreground' : 'text-muted-foreground')}>
                    <span className="block">{d.toLocaleDateString('it-IT', { weekday: 'narrow' })}</span>{d.getDate()}
                  </div>
                )
              })}
            </div>

            {tipologie.filter((t) => t.attiva).map((t) => (
              <div key={t.id}>
                {/* disponibilità della tipologia */}
                <div className="flex border-b border-border bg-muted/40">
                  <div className="w-[150px] shrink-0 px-3 py-1 text-xs font-semibold text-foreground">{t.nome} <span className="font-normal text-muted-foreground">libere</span></div>
                  {giorni.map((g) => {
                    const d = dispo(g, t.id)
                    return (
                      <div key={g} style={{ width: LARGHEZZA }} className={cn('shrink-0 border-l border-border py-1 text-center text-xs tabular-nums',
                        d?.overbooking ? 'bg-destructive-tenue font-semibold text-destructive-testo' : 'text-muted-foreground')}
                        title={d?.overbooking ? 'Overbooking' : undefined}>{d?.disponibili ?? '—'}</div>
                    )
                  })}
                </div>
                {camere.filter((c) => c.tipologia_id === t.id).map((c) => (
                  <div key={c.id} className={cn('relative flex h-10 border-b border-border', sopra === c.id && 'bg-accent/50')}
                    onDragOver={(e) => { e.preventDefault(); setSopra(c.id) }} onDragLeave={() => setSopra(null)} onDrop={(e) => lascia(e, c.id)}>
                    <div className="flex w-[150px] shrink-0 items-center gap-1.5 px-3 font-medium text-foreground">
                      {c.numero}
                      {c.fuori_servizio && <Wrench className="h-3.5 w-3.5 text-destructive-testo" aria-label="Fuori servizio" />}
                    </div>
                    <div className="relative flex">
                      {giorni.map((g) => (
                        <button key={g} type="button" style={{ width: LARGHEZZA }} aria-label={`Nuova prenotazione camera ${c.numero} dal ${g}`}
                          onClick={() => setNuova({ camera_id: c.id, tipologia_id: c.tipologia_id, arrivo: g })}
                          className={cn('shrink-0 border-l border-border hover:bg-muted/60', c.fuori_servizio && 'bg-destructive-tenue/40', g === oggi && 'bg-accent/30')} />
                      ))}
                      {perCamera(c.id).map((p) => {
                        const geo = geometria(p)
                        const st = PRENOTAZIONE_STATO[p.stato]
                        return (
                          <button key={p.id} type="button" draggable={p.stato !== 'partita'}
                            onDragStart={(e) => { setTrascinata(p.id); e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move' }}
                            onDragEnd={() => { setTrascinata(null); setSopra(null) }}
                            onClick={() => setScelta(p)}
                            style={{ left: geo.left, width: geo.width }}
                            className={cn('absolute top-1 bottom-1 truncate rounded-md border px-1.5 text-left text-xs font-medium',
                              st?.barra, trascinata === p.id && 'opacity-50', 'focus-visible:outline-2 focus-visible:outline-ring')}
                            title={`${p.ospite_nome} · ${fmtData(p.arrivo)} → ${fmtData(p.partenza)}`}
                            aria-label={`${p.ospite_nome}, ${st?.label}, dal ${fmtData(p.arrivo)} al ${fmtData(p.partenza)}. Apri`}>
                            {p.ospite_nome}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 text-title text-foreground">Da assegnare</h2>
          {daAssegnare.length === 0 ? <p className="text-sm text-muted-foreground">Ogni prenotazione del periodo ha la sua camera.</p> : (
            <ul className="divide-y divide-border">
              {daAssegnare.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <button type="button" className="text-left font-medium text-foreground underline-offset-2 hover:underline" onClick={() => navigate(`/hotel/prenotazioni/${p.id}`)}>
                    {p.ospite_nome}<span className="block text-xs font-normal text-muted-foreground">{tipologie.find((t) => t.id === p.tipologia_id)?.nome} · {p.arrivo} → {p.partenza}</span>
                  </button>
                  <Select onValueChange={(v) => sposta(p, v)}>
                    <SelectTrigger className="h-8 w-40" aria-label={`Assegna una camera a ${p.ospite_nome}`}><SelectValue placeholder="Assegna…" /></SelectTrigger>
                    <SelectContent>{camere.filter((c) => c.tipologia_id === p.tipologia_id).map((c) => <SelectItem key={c.id} value={c.id}>Camera {c.numero}</SelectItem>)}</SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {scelta && (
          <Card className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-title text-foreground">{scelta.ospite_nome}</h2>
                <p className="text-sm text-muted-foreground">{scelta.codice} · {scelta.arrivo} → {scelta.partenza}</p>
              </div>
              <Badge tone={PRENOTAZIONE_STATO[scelta.stato]?.tone ?? 'neutral'}>{PRENOTAZIONE_STATO[scelta.stato]?.label}</Badge>
            </div>
            {scelta.stato !== 'partita' && (
              <Select onValueChange={(v) => { sposta(scelta, v); setScelta(null) }}>
                <SelectTrigger aria-label="Sposta in un'altra camera"><SelectValue placeholder="Sposta in un'altra camera…" /></SelectTrigger>
                <SelectContent>{camere.map((c) => <SelectItem key={c.id} value={c.id} disabled={c.id === scelta.camera_id}>Camera {c.numero} · {tipologie.find((t) => t.id === c.tipologia_id)?.nome}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <BottoneScrittura variant="outline" onClick={() => navigate(`/hotel/prenotazioni/${scelta.id}`)}>Apri la scheda del soggiorno</BottoneScrittura>
          </Card>
        )}
      </div>

      <Button className="fixed bottom-20 right-6 z-30 shadow-sospeso lg:hidden" onClick={() => setNuova({ camera_id: '', tipologia_id: '', arrivo: oggi })}>
        <Plus className="h-4 w-4" /> Prenota</Button>
      <PrenotazioneDialog open={!!nuova} onOpenChange={(o) => { if (!o) setNuova(null) }}
        iniziale={nuova ? { camera_id: nuova.camera_id || undefined, tipologia_id: nuova.tipologia_id || undefined, arrivo: nuova.arrivo } : undefined} />
    </div>
  )
}
