/**
 * Mappa dell'hotel (documento Hotel §4, §2, §19, §22–23): piani con le
 * camere colorate per stato, aree comuni, e per ogni camera ospite, stato
 * della pulizia, fuori servizio con la sua segnalazione e consumi del minibar.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Building, CircleCheck, Sparkles, Wrench, Wine } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { FotoDialog } from '@/components/condivisi/FotoDialog'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import { useElenco, useSalva, useInserisci, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { useCamereStato, type CameraStato } from '@/modules/hotel/queries'
import { CAMERA_STATO, MANUTENZIONE_CATEGORIA, fmtData, fmtEuro } from '@/modules/hotel/stati'

type Dotazione = Tables<'hotel_minibar_dotazioni'> & { mag_articoli: { descrizione: string } | null }

export function CamerePage() {
  return <ConStruttura><Camere_ /></ConStruttura>
}

function Camere_() {
  const { strutturaId } = useHotel()
  useDalVivo(['hotel_camere', 'hotel_prenotazioni', 'hotel_pulizie'])
  const { data: camere = [], isLoading } = useCamereStato(strutturaId)
  const { data: aree = [] } = useElenco<Tables<'hotel_aree'>>('hotel_aree', { filtri: { struttura_id: strutturaId ?? undefined }, abilitato: !!strutturaId })
  const [sceltaId, setSceltaId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('tutte')
  const piani = useMemo(() => [...new Set(camere.map((c) => c.piano ?? 0))].sort((a, b) => b - a), [camere])
  const scelta = camere.find((c) => c.camera_id === sceltaId) ?? null
  const conta = (s: string) => camere.filter((c) => c.stato === s).length

  return (
    <div>
      <PageHeader title="Camere" description="La struttura piano per piano: tocca una camera per vederne ospite, pulizia e minibar."
        numeri={(['disponibile', 'occupata', 'da_pulire', 'fuori_servizio'] as const).map((s) => ({ etichetta: CAMERA_STATO[s].label.toLowerCase(), valore: conta(s), inCaricamento: isLoading }))}
        actions={<SelettoreStruttura />} />

      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtra per stato">
        {['tutte', ...Object.keys(CAMERA_STATO).filter((s) => s !== 'verificata')].map((s) => (
          <button key={s} type="button" role="tab" aria-selected={filtro === s} onClick={() => setFiltro(s)}
            className={cn('rounded-full border px-3 py-1.5 text-sm transition-colors',
              filtro === s ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground')}>
            {s === 'tutte' ? 'Tutte' : CAMERA_STATO[s].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {isLoading ? <Skeleton className="h-96 w-full" /> : (
          <div className="space-y-4">
            {piani.map((piano) => (
              <section key={piano} aria-label={`Piano ${piano}`} className="rounded-xl border border-border bg-muted/30 p-3">
                <h2 className="mb-2 flex items-center gap-2 px-1 text-label uppercase text-muted-foreground"><Building className="h-3.5 w-3.5" aria-hidden />
                  {piano === 0 ? 'Piano terra' : `Piano ${piano}`}
                  {aree.filter((a) => (a.piano ?? 0) === piano).map((a) => <Badge key={a.id} tone="neutral">{a.nome}</Badge>)}
                </h2>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7 2xl:grid-cols-9">
                  {camere.filter((c) => (c.piano ?? 0) === piano && (filtro === 'tutte' || c.stato === filtro)).map((c) => {
                    const st = CAMERA_STATO[c.stato ?? 'disponibile'] ?? CAMERA_STATO.disponibile
                    return (
                      <li key={c.camera_id}>
                        <button type="button" onClick={() => setSceltaId(c.camera_id)} aria-pressed={c.camera_id === sceltaId}
                          aria-label={`Camera ${c.numero}, ${c.tipologia}, ${st.label}${c.ospite_nome ? `, ${c.ospite_nome}` : ''}`}
                          className={cn('flex h-20 w-full flex-col items-start justify-between rounded-lg border-2 p-2 text-left transition-shadow hover:shadow-risposta',
                            st.riempimento, st.bordo, c.camera_id === sceltaId && 'ring-2 ring-ring ring-offset-2 ring-offset-background')}>
                          <span className="flex w-full items-center justify-between">
                            <span className="text-base font-semibold text-foreground">{c.numero}</span>
                            <span className="text-xs text-muted-foreground">{c.tipologia_codice}</span>
                          </span>
                          <span className="w-full truncate text-xs text-foreground">{c.ospite_nome ?? (c.arrivo_oggi ? `Arriva ${c.arrivo_ospite}` : st.label)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {Object.entries(CAMERA_STATO).filter(([s]) => s !== 'verificata').map(([s, v]) => (
                <span key={s} className="flex items-center gap-1.5"><span className={cn('size-3 rounded border-2', v.bordo, v.riempimento)} aria-hidden />{v.label}</span>
              ))}
            </div>
          </div>
        )}
        <div>
          {scelta ? <PannelloCamera camera={scelta} /> : (
            <Card className="border-dashed p-5 text-sm text-muted-foreground">Tocca una camera per gestirla.</Card>
          )}
        </div>
      </div>
    </div>
  )
}

function PannelloCamera({ camera: c }: { camera: CameraStato }) {
  const { strutturaId } = useHotel()
  const salvaCamera = useSalva('hotel_camere', ['hotel_camere_stato'])
  const segnala = useInserisci('hotel_manutenzioni', ['hotel_manutenzioni', 'hotel_camere', 'hotel_camere_stato'])
  const consumo = useInserisci('hotel_minibar_consumi', ['hotel_minibar_consumi', 'conti_righe', 'conti_saldi'])
  const { data: dotazioni = [] } = useElenco<Dotazione>('hotel_minibar_dotazioni', {
    filtri: { struttura_id: strutturaId ?? undefined }, select: '*, mag_articoli(descrizione)', ordine: [{ colonna: 'ordine' }], abilitato: !!strutturaId,
  })
  const { data: guasti = [] } = useElenco<Tables<'hotel_manutenzioni'>>('hotel_manutenzioni', {
    filtri: { camera_id: c.camera_id ?? undefined, stato: ['aperta', 'assegnata', 'in_corso'] }, ordine: [{ colonna: 'created_at', crescente: false }],
  })
  const [g, setG] = useState({ categoria: 'altro', descrizione: '', blocca: false })
  const [mb, setMb] = useState({ articolo: '', quantita: '1' })
  const st = CAMERA_STATO[c.stato ?? 'disponibile'] ?? CAMERA_STATO.disponibile
  const dotazioniCamera = dotazioni.filter((d) => !d.tipologia_id || d.tipologia_id === c.tipologia_id)

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-title text-foreground">Camera {c.numero}</h2>
          <p className="text-sm text-muted-foreground">{c.tipologia}{c.piano != null ? ` · ${c.piano}° piano` : ''}{c.posti_letto ? ` · ${c.posti_letto} letti` : ''}</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge tone={st.tone}>{st.label}</Badge>
          <FotoDialog entita="hotel_camere" entitaId={c.camera_id!} titolo={`Camera ${c.numero}`} categorie={['foto', 'planimetria', 'documento']} />
        </div>
      </div>
      {c.prenotazione_id ? (
        <p className="text-sm"><Link to={`/hotel/prenotazioni/${c.prenotazione_id}`} className="font-medium text-foreground underline underline-offset-2">{c.ospite_nome}</Link>
          <span className="block text-muted-foreground">{c.ospiti} ospiti · parte il {fmtData(c.partenza_prevista)}</span></p>
      ) : c.arrivo_id ? (
        <p className="text-sm text-muted-foreground">Oggi arriva <Link to={`/hotel/prenotazioni/${c.arrivo_id}`} className="font-medium text-foreground underline underline-offset-2">{c.arrivo_ospite}</Link></p>
      ) : <p className="text-sm text-muted-foreground">Libera.</p>}

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {c.stato_pulizia !== 'da_pulire' && <Button size="sm" variant="outline" onClick={() => salvaCamera.mutate({ id: c.camera_id!, values: { stato_pulizia: 'da_pulire' } })}>Da pulire</Button>}
        {c.stato_pulizia !== 'pulita' && <Button size="sm" variant="outline" onClick={() => salvaCamera.mutate({ id: c.camera_id!, values: { stato_pulizia: 'pulita' } })}><Sparkles className="h-3.5 w-3.5" /> Pulita</Button>}
        {c.stato_pulizia !== 'verificata' && <Button size="sm" variant="outline" onClick={() => salvaCamera.mutate({ id: c.camera_id!, values: { stato_pulizia: 'verificata' } },
          { onSuccess: () => toast.success(`Camera ${c.numero} verificata`) })}><CircleCheck className="h-3.5 w-3.5" /> Verificata</Button>}
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Wrench className="h-4 w-4" aria-hidden /> Guasti</h3>
        {guasti.length > 0 && (
          <ul className="mb-2 space-y-1 text-sm">{guasti.map((x) => (
            <li key={x.id} className="text-foreground">{x.descrizione} <span className="text-xs text-muted-foreground">· {MANUTENZIONE_CATEGORIA[x.categoria]}{x.mette_fuori_servizio ? ' · camera ferma' : ''}</span></li>))}</ul>
        )}
        <div className="space-y-2">
          <Select value={g.categoria} onValueChange={(v) => setG({ ...g, categoria: v })}>
            <SelectTrigger aria-label="Categoria del guasto"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(MANUTENZIONE_CATEGORIA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={g.descrizione} onChange={(e) => setG({ ...g, descrizione: e.target.value })} placeholder="Cosa non funziona" aria-label="Descrizione del guasto" />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={g.blocca} onCheckedChange={(v) => setG({ ...g, blocca: v === true })} aria-label="La camera non si può vendere" />
            La camera non si può vendere
          </label>
          <BottoneScrittura size="sm" variant="outline" disabled={!g.descrizione.trim() || segnala.isPending}
            onClick={() => segnala.mutate({ struttura_id: strutturaId!, camera_id: c.camera_id, categoria: g.categoria, descrizione: g.descrizione.trim(),
              mette_fuori_servizio: g.blocca, priorita: g.blocca ? 'alta' : 'media' }, {
              onSuccess: () => { toast.success(g.blocca ? `Guasto segnalato: camera ${c.numero} fuori servizio` : 'Guasto segnalato'); setG({ categoria: 'altro', descrizione: '', blocca: false }) },
              onError: (e) => toast.error(messaggioErrore(e)) })}>Segnala</BottoneScrittura>
        </div>
      </div>

      {dotazioniCamera.length > 0 && (
        <div className="border-t border-border pt-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Wine className="h-4 w-4" aria-hidden /> Minibar</h3>
          <div className="flex gap-2">
            <Select value={mb.articolo} onValueChange={(v) => setMb({ ...mb, articolo: v })}>
              <SelectTrigger aria-label="Prodotto del minibar"><SelectValue placeholder="Cosa è stato consumato" /></SelectTrigger>
              <SelectContent>{dotazioniCamera.map((d) => <SelectItem key={d.id} value={d.articolo_id}>{d.mag_articoli?.descrizione} · {fmtEuro(d.prezzo)}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="w-20" type="number" min={1} value={mb.quantita} onChange={(e) => setMb({ ...mb, quantita: e.target.value })} aria-label="Quantità" />
          </div>
          <Label className="sr-only">Registra il consumo</Label>
          <BottoneScrittura size="sm" variant="outline" className="mt-2" disabled={!mb.articolo || consumo.isPending}
            onClick={() => consumo.mutate({ struttura_id: strutturaId!, camera_id: c.camera_id!, articolo_id: mb.articolo, quantita: Number(mb.quantita) || 1 }, {
              onSuccess: () => { toast.success(c.prenotazione_id ? 'Consumo sul conto della camera' : 'Consumo registrato (camera libera: nessun addebito)'); setMb({ articolo: '', quantita: '1' }) },
              onError: (e) => toast.error(messaggioErrore(e)) })}>Registra il consumo</BottoneScrittura>
        </div>
      )}
    </Card>
  )
}
