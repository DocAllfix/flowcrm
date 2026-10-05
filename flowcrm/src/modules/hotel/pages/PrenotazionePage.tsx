/**
 * Scheda del soggiorno (documento Hotel §7, §14–16, §31): stato e azioni del
 * ricevimento (conferma, check-in con camera e documenti, check-out in due
 * tempi, annullamento con la politica del piano, no-show), ospiti registrati,
 * notti a prezzo bloccato, conto camera, servizi e garanzie.
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, BedDouble, CalendarClock, KeyRound, LogOut, Receipt, UserPlus, Ban, CircleCheck } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { FeedbackSezione } from '@/components/condivisi/FeedbackSezione'
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useRiga, useRpc, useSalva, useAzione, useInserisci, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { OspiteDialog } from '@/modules/hotel/dialogs/OspiteDialog'
import { useCatalogoHotel, TABELLE_SOGGIORNO, type Notte, type Prenotazione } from '@/modules/hotel/queries'
import {
  CANALE, PRENOTAZIONE_STATO, SERVIZIO_STATO, TIPO_ALLOGGIATO, fmtData, fmtEuro, fmtGiornoOra, notti as nNotti, oggiIso,
} from '@/modules/hotel/stati'

type ContoSaldo = Database['public']['Views']['conti_saldi']['Row']
type Tassa = Database['public']['Functions']['hotel_tassa_calcola']['Returns'][number]
type RegistroOspite = Tables<'hotel_soggiorno_ospiti'> & {
  hotel_ospiti: (Tables<'hotel_ospiti'> & { contatti: { nome: string; cognome: string | null } | null }) | null
}
const METODI_RIMBORSO: { valore: string; label: string }[] = [
  { valore: 'bonifico', label: 'Bonifico' }, { valore: 'carta', label: 'Carta' }, { valore: 'contanti', label: 'Contanti' }, { valore: 'pos', label: 'POS' },
]

export function PrenotazionePage() {
  return <ConStruttura><Prenotazione_ /></ConStruttura>
}

function Prenotazione_() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { strutturaId } = useHotel()
  useDalVivo(['hotel_prenotazioni', 'hotel_camere'])
  const { data: p, isLoading } = useRiga<Prenotazione>('hotel_prenotazioni', id)
  const { tipologie, camere, trattamenti, piani } = useCatalogoHotel(strutturaId)
  const { data: statoCamere = [] } = useElenco<Database['public']['Views']['hotel_camere_stato']['Row']>('hotel_camere_stato', {
    filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'ordine' }, { colonna: 'numero' }], abilitato: !!strutturaId,
  })
  const { data: saldi = [] } = useElenco<ContoSaldo>('conti_saldi', { filtri: { conto_id: p?.conto_id ?? undefined }, abilitato: !!p?.conto_id })
  const saldo = saldi[0]
  const salva = useSalva('hotel_prenotazioni', TABELLE_SOGGIORNO)
  const checkIn = useAzione('hotel_check_in', TABELLE_SOGGIORNO)
  const checkOut = useAzione('hotel_check_out', TABELLE_SOGGIORNO)
  const noShow = useAzione('hotel_no_show', TABELLE_SOGGIORNO)
  const [cameraScelta, setCameraScelta] = useState('')
  const [annulla, setAnnulla] = useState(false)
  const [daSaldare, setDaSaldare] = useState<number | null>(null)

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (!p) {
    return <EmptyState icon={BedDouble} title="Prenotazione non trovata" description="Forse è stata cancellata."
      action={<Button asChild variant="outline"><Link to="/hotel/prenotazioni">Torna alle prenotazioni</Link></Button>} />
  }
  const oggi = oggiIso()
  const camera = camere.find((c) => c.id === p.camera_id)
  const tipologia = tipologie.find((t) => t.id === p.tipologia_id)
  const st = PRENOTAZIONE_STATO[p.stato] ?? PRENOTAZIONE_STATO.confermata
  const prenotabile = ['richiesta', 'opzionata', 'confermata'].includes(p.stato)
  const puoCheckIn = ['confermata', 'opzionata'].includes(p.stato) && p.arrivo <= oggi
  // Camere del tipo non occupate da altri, le pronte in cima: si propone la prima pronta.
  const pronta = (c: { stato_pulizia: string | null; fuori_servizio: boolean | null }) => ['pulita', 'verificata'].includes(c.stato_pulizia ?? '') && !c.fuori_servizio
  const camereLibereTipo = statoCamere
    .filter((c) => c.tipologia_id === p.tipologia_id && (c.stato !== 'occupata' || c.prenotazione_id === p.id))
    .sort((x, y) => Number(pronta(y)) - Number(pronta(x)))
  const cameraCheckIn = cameraScelta || p.camera_id || camereLibereTipo.find(pronta)?.camera_id || ''

  function faiCheckIn() {
    checkIn.mutate({ p_prenotazione: p!.id, p_camera: cameraCheckIn || undefined }, {
      onSuccess: () => toast.success(`Check-in fatto: camera ${camere.find((c) => c.id === cameraCheckIn)?.numero ?? ''}`),
      onError: (e) => toast.error(messaggioErrore(e)),
    })
  }
  function faiCheckOut() {
    checkOut.mutate({ p_prenotazione: p!.id }, {
      onSuccess: (r) => {
        const esito = r as unknown as { completato: boolean; residuo: number; conto_id: string; tassa: number }
        if (esito.completato) { toast.success('Check-out fatto: camera da pulire'); setDaSaldare(null) }
        else setDaSaldare(Number(esito.residuo))
      },
      onError: (e) => toast.error(messaggioErrore(e)),
    })
  }

  return (
    <div>
      <PageHeader title={p.ospite_nome}
        description={`${p.codice} · ${fmtData(p.arrivo)} → ${fmtData(p.partenza)} · ${nNotti(p.notti)} · ${p.adulti + p.bambini} persone`}
        briciole={[{ label: 'Prenotazioni', to: '/hotel/prenotazioni' }, { label: p.codice ?? '' }]}
        numeri={[
          { etichetta: 'totale soggiorno', valore: fmtEuro(p.prezzo_totale) },
          ...(saldo ? [{ etichetta: 'sul conto', valore: fmtEuro(saldo.totale) }, { etichetta: Number(saldo.residuo) < 0 ? 'a credito' : 'da saldare', valore: fmtEuro(Math.abs(Number(saldo.residuo))) }] : []),
        ]}
        actions={<>
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Indietro</Button>
          {p.conto_id && <Button variant="outline" asChild><Link to={`/hotel/cassa?conto=${p.conto_id}`}><Receipt className="h-4 w-4" /> Conto</Link></Button>}
          {puoCheckIn && <BottoneScrittura onClick={faiCheckIn} disabled={checkIn.isPending}><KeyRound className="h-4 w-4" /> Check-in</BottoneScrittura>}
          {p.stato === 'in_soggiorno' && <BottoneScrittura onClick={faiCheckOut} disabled={checkOut.isPending}><LogOut className="h-4 w-4" /> Check-out</BottoneScrittura>}
        </>} />

      {daSaldare !== null && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-warning p-4">
          <p className="text-sm text-foreground">
            Notti e tassa di soggiorno sono sul conto: {daSaldare > 0 ? <>restano <strong className="tabular-nums">{fmtEuro(daSaldare)}</strong> da saldare.</>
              : <>l'ospite ha versato <strong className="tabular-nums">{fmtEuro(-daSaldare)}</strong> in più: restituiscili dalla cassa.</>}
            {' '}Poi premi di nuovo «Check-out».
          </p>
          <Button asChild><Link to={`/hotel/cassa?conto=${p.conto_id}`}><Receipt className="h-4 w-4" /> Vai alla cassa</Link></Button>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
        <Badge tone="neutral">{tipologia?.nome ?? 'Tipologia'}</Badge>
        {camera ? <Badge tone="primary">Camera {camera.numero}</Badge> : <Badge tone="warning">Camera da assegnare</Badge>}
        <Badge tone="neutral">{CANALE[p.canale] ?? p.canale}</Badge>
        {p.stato === 'opzionata' && p.opzione_scadenza && <Badge tone="warning">Opzione fino al {fmtData(p.opzione_scadenza)}</Badge>}
        {p.early_check_in && <Badge tone="info">Early check-in</Badge>}
        {p.late_check_out && <Badge tone="info">Late check-out</Badge>}
        {p.stato === 'opzionata' && (
          <BottoneScrittura size="sm" variant="outline" onClick={() => salva.mutate({ id: p.id, values: { stato: 'confermata' } },
            { onSuccess: () => toast.success('Prenotazione confermata'), onError: (e) => toast.error(messaggioErrore(e)) })}>
            <CircleCheck className="h-3.5 w-3.5" /> Conferma</BottoneScrittura>
        )}
        {prenotabile && <Button size="sm" variant="ghost" onClick={() => setAnnulla(true)}><Ban className="h-3.5 w-3.5" /> Annulla</Button>}
        {p.stato === 'confermata' && p.arrivo < oggi && (
          <Button size="sm" variant="ghost" onClick={() => noShow.mutate({ p_prenotazione: p.id }, {
            onSuccess: (x) => toast.success(Number(x) > 0 ? `No-show: ${fmtEuro(Number(x))} di penale sul conto` : 'Segnata come no-show'),
            onError: (e) => toast.error(messaggioErrore(e)) })}>No-show</Button>
        )}
      </div>

      {puoCheckIn && (
        <Card className="mb-4 flex flex-wrap items-end gap-3 p-4">
          <div className="w-56 space-y-1.5"><Label>Camera per il check-in</Label>
            <Select value={cameraCheckIn} onValueChange={setCameraScelta}>
              <SelectTrigger aria-label="Camera per il check-in"><SelectValue placeholder="Scegli la camera" /></SelectTrigger>
              <SelectContent>{camereLibereTipo.map((c) => <SelectItem key={c.camera_id} value={c.camera_id!}>Camera {c.numero} · {(c.stato_pulizia ?? '').replace('_', ' ')}{c.fuori_servizio ? ' · fuori servizio' : ''}</SelectItem>)}</SelectContent>
            </Select></div>
          <p className="max-w-[60ch] text-sm text-muted-foreground">Servono almeno un ospite con il documento e la camera pulita o verificata.</p>
        </Card>
      )}

      <Tabs defaultValue="ospiti">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="ospiti">Ospiti</TabsTrigger>
          <TabsTrigger value="soggiorno">Soggiorno</TabsTrigger>
          <TabsTrigger value="notti">Notti</TabsTrigger>
          <TabsTrigger value="servizi">Servizi</TabsTrigger>
          <TabsTrigger value="garanzie">Caparra e garanzie</TabsTrigger>
          <TabsTrigger value="riscontro">Riscontro</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
        </TabsList>
        <TabsContent value="ospiti"><Ospiti prenotazione={p} /></TabsContent>
        <TabsContent value="soggiorno">
          <Soggiorno prenotazione={p} camere={camere.filter((c) => c.tipologia_id === p.tipologia_id)} trattamenti={trattamenti} piani={piani} />
        </TabsContent>
        <TabsContent value="notti"><Notti prenotazioneId={p.id} /></TabsContent>
        <TabsContent value="servizi"><ServiziSoggiorno prenotazioneId={p.id} /></TabsContent>
        <TabsContent value="garanzie"><Garanzie prenotazione={p} saldo={saldo} /></TabsContent>
        <TabsContent value="riscontro">
          <FeedbackSezione modulo="hotel" canali={['check-out', 'email', 'telefono', 'portale di prenotazione', 'recensione online']}
            entita={{ tipo: 'hotel_prenotazioni', id: p.id, contatto: p.contatto_id ? { id: p.contatto_id, nome: p.ospite_nome, cognome: null, telefono: null, email: null } : null }}
            aspetti={['Camera', 'Pulizia', 'Colazione e ristorante', 'Personale']} />
        </TabsContent>
        <TabsContent value="documenti">
          <AllegatiSection entita="hotel_prenotazioni" entitaId={p.id} categorie={['conferma', 'contratto', 'voucher', 'ricevuta', 'altro']} />
        </TabsContent>
      </Tabs>

      {annulla && <AnnullaDialog prenotazione={p} pagato={Number(saldo?.pagato ?? 0)} onChiudi={() => setAnnulla(false)} />}
    </div>
  )
}

function Ospiti({ prenotazione: p }: { prenotazione: Prenotazione }) {
  const { data: registrati = [], isLoading } = useElenco<RegistroOspite>('hotel_soggiorno_ospiti', {
    filtri: { prenotazione_id: p.id }, select: '*, hotel_ospiti(*, contatti(nome, cognome))', ordine: [{ colonna: 'tipo_alloggiato' }],
  })
  const { data: tassa = [] } = useRpc<Tassa[]>('hotel_tassa_calcola', { p_prenotazione: p.id })
  const { data: regole = [] } = useElenco<Tables<'hotel_tassa_regole'>>('hotel_tassa_regole', { filtri: { struttura_id: p.struttura_id } })
  const [apri, setApri] = useState(false)
  const chiusa = ['partita', 'annullata', 'no_show'].includes(p.stato)
  const esenzioni = [...new Set(regole.flatMap((r) => r.esenzioni))]

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="text-title text-foreground">Ospiti registrati</h3>
          {!chiusa && <Button size="sm" variant="outline" onClick={() => setApri(true)}><UserPlus className="h-3.5 w-3.5" /> Registra un ospite</Button>}
        </div>
        {isLoading ? <Skeleton className="m-4 h-20" /> : registrati.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Nessun ospite registrato: al check-in serve almeno chi presenta il documento.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Ospite</TableHead><TableHead>Tipo</TableHead><TableHead>Documento</TableHead><TableHead>Nascita</TableHead><TableHead>Alloggiati</TableHead></TableRow></TableHeader>
            <TableBody>
              {registrati.map((r) => {
                const o = r.hotel_ospiti
                return (
                  <TableRow key={r.id}>
                    <TableCell><span className="font-medium text-foreground">{o?.contatti?.nome} {o?.contatti?.cognome ?? ''}</span>
                      {o?.vip && <Badge tone="warning" className="ml-2">VIP</Badge>}
                      {r.esenzione_tassa && <span className="block text-xs text-muted-foreground">Esente: {r.esenzione_tassa}</span>}</TableCell>
                    <TableCell className="text-muted-foreground">{TIPO_ALLOGGIATO[r.tipo_alloggiato]}</TableCell>
                    <TableCell className="font-mono text-xs">{o?.documento_numero ? `${o.documento_tipo} ${o.documento_numero}` : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtData(o?.data_nascita)}</TableCell>
                    <TableCell>{r.inviato_alloggiati_at ? <Badge tone="success">Inviato</Badge> : <Badge tone="neutral">Da inviare</Badge>}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
      <Card className="h-fit p-4">
        <h3 className="mb-2 text-title text-foreground">Tassa di soggiorno</h3>
        {regole.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna regola del Comune: si imposta in «Adempimenti».</p> : (
          <ul className="space-y-1.5 text-sm">
            {tassa.map((t, i) => (
              <li key={t.ospite_id ?? i} className="flex justify-between gap-2">
                <span className="min-w-0 truncate text-foreground">{t.nome}{t.esenzione ? <span className="block text-xs text-muted-foreground">{t.esenzione}</span> : null}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{t.notti_tassabili} n · {fmtEuro(t.importo)}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-border pt-1.5 font-semibold tabular-nums text-foreground">
              <span>Al check-out</span><span>{fmtEuro(tassa.reduce((s, t) => s + Number(t.importo ?? 0), 0))}</span></li>
          </ul>
        )}
      </Card>
      {apri && <OspiteDialog open={apri} onOpenChange={setApri} prenotazioneId={p.id} primo={registrati.length === 0} esenzioni={esenzioni} nomePrenotazione={p.ospite_nome} />}
    </div>
  )
}

function Soggiorno({ prenotazione: p, camere, trattamenti, piani }: {
  prenotazione: Prenotazione; camere: Tables<'hotel_camere'>[]; trattamenti: Tables<'hotel_trattamenti'>[]; piani: Tables<'hotel_piani_tariffari'>[]
}) {
  const salva = useSalva('hotel_prenotazioni', TABELLE_SOGGIORNO)
  const modificabile = ['richiesta', 'opzionata', 'confermata', 'in_soggiorno'].includes(p.stato)
  const [f, setF] = useState({ arrivo: p.arrivo, partenza: p.partenza, adulti: String(p.adulti), bambini: String(p.bambini),
    camera: p.camera_id ?? 'nessuna', piano: p.piano_id ?? '', trattamento: p.trattamento_id ?? '', richieste: p.richieste ?? '', note: p.note ?? '' })
  function registra() {
    salva.mutate({ id: p.id, values: {
      arrivo: f.arrivo, partenza: f.partenza, adulti: Number(f.adulti) || 1, bambini: Number(f.bambini) || 0,
      camera_id: f.camera === 'nessuna' ? null : f.camera, piano_id: f.piano || null, trattamento_id: f.trattamento || null,
      richieste: f.richieste || null, note: f.note || null } }, {
      onSuccess: () => toast.success('Soggiorno aggiornato: prezzo e notti ricalcolati'),
      onError: (e) => toast.error(/23P01|hotel_camera_libera/.test(JSON.stringify(e)) ? 'La camera è occupata in quelle notti' : messaggioErrore(e)),
    })
  }
  return (
    <Card className="p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1.5"><Label htmlFor="sg-arr">Arrivo</Label>
          <Input id="sg-arr" type="date" value={f.arrivo} disabled={!modificabile || p.stato === 'in_soggiorno'} onChange={(e) => setF({ ...f, arrivo: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="sg-par">Partenza</Label>
          <Input id="sg-par" type="date" value={f.partenza} disabled={!modificabile} onChange={(e) => setF({ ...f, partenza: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="sg-ad">Adulti</Label>
          <Input id="sg-ad" type="number" min={1} value={f.adulti} disabled={!modificabile} onChange={(e) => setF({ ...f, adulti: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="sg-bb">Bambini</Label>
          <Input id="sg-bb" type="number" min={0} value={f.bambini} disabled={!modificabile} onChange={(e) => setF({ ...f, bambini: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Camera</Label>
          <Select value={f.camera} onValueChange={(v) => setF({ ...f, camera: v })} disabled={!modificabile}>
            <SelectTrigger aria-label="Camera"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nessuna">Da assegnare</SelectItem>{camere.map((c) => <SelectItem key={c.id} value={c.id}>Camera {c.numero}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="space-y-1.5"><Label>Piano tariffario</Label>
          <Select value={f.piano} onValueChange={(v) => setF({ ...f, piano: v })} disabled={!modificabile}>
            <SelectTrigger aria-label="Piano tariffario"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{piani.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="space-y-1.5"><Label>Trattamento</Label>
          <Select value={f.trattamento} onValueChange={(v) => setF({ ...f, trattamento: v })} disabled={!modificabile}>
            <SelectTrigger aria-label="Trattamento"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{trattamenti.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="col-span-2 space-y-1.5 sm:col-span-4"><Label htmlFor="sg-ric">Richieste speciali</Label>
          <Input id="sg-ric" value={f.richieste} disabled={!modificabile} onChange={(e) => setF({ ...f, richieste: e.target.value })} /></div>
        <div className="col-span-2 space-y-1.5 sm:col-span-4"><Label htmlFor="sg-note">Note</Label>
          <Input id="sg-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
      </div>
      <div className="mt-4 flex justify-end">
        <BottoneScrittura variant="outline" onClick={registra} disabled={salva.isPending}>Salva le modifiche</BottoneScrittura>
      </div>
    </Card>
  )
}

function Notti({ prenotazioneId }: { prenotazioneId: string }) {
  const { data: notti = [], isLoading } = useElenco<Notte>('hotel_notti', { filtri: { prenotazione_id: prenotazioneId }, ordine: [{ colonna: 'data' }] })
  if (isLoading) return <Skeleton className="h-40 w-full" />
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader><TableRow><TableHead>Notte</TableHead><TableHead className="text-right">Camera</TableHead><TableHead className="text-right">Trattamento</TableHead><TableHead className="text-right">Totale</TableHead><TableHead>Sul conto</TableHead></TableRow></TableHeader>
        <TableBody>
          {notti.map((n) => (
            <TableRow key={n.id}>
              <TableCell className="text-foreground">{new Date(`${n.data}T12:00`).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: '2-digit' })}</TableCell>
              <TableCell numerica>{fmtEuro(n.prezzo_camera)}</TableCell>
              <TableCell numerica>{fmtEuro(n.prezzo_trattamento)}</TableCell>
              <TableCell numerica className="font-medium">{fmtEuro(Number(n.prezzo_camera) + Number(n.prezzo_trattamento))}</TableCell>
              <TableCell>{n.conto_riga_id ? <Badge tone="success">Addebitata</Badge> : <Badge tone="neutral">Alla chiusura notturna</Badge>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function ServiziSoggiorno({ prenotazioneId }: { prenotazioneId: string }) {
  const { data: servizi = [] } = useElenco<Tables<'hotel_servizi_prenotazioni'> & { hotel_servizi: { nome: string } | null }>('hotel_servizi_prenotazioni', {
    filtri: { prenotazione_id: prenotazioneId }, select: '*, hotel_servizi(nome)', ordine: [{ colonna: 'inizio' }] })
  const { data: transfer = [] } = useElenco<Tables<'hotel_transfer'>>('hotel_transfer', { filtri: { prenotazione_id: prenotazioneId }, ordine: [{ colonna: 'data_ora' }] })
  const { data: parcheggio = [] } = useElenco<Tables<'hotel_parcheggio'>>('hotel_parcheggio', { filtri: { prenotazione_id: prenotazioneId } })
  const voci = [
    ...servizi.map((s) => ({ id: s.id, quando: s.inizio, cosa: s.hotel_servizi?.nome ?? 'Servizio', stato: SERVIZIO_STATO[s.stato]?.label ?? s.stato, prezzo: Number(s.prezzo_unitario ?? 0) * Number(s.quantita) })),
    ...transfer.map((t) => ({ id: t.id, quando: t.data_ora, cosa: `Transfer · ${t.luogo}`, stato: t.stato, prezzo: Number(t.prezzo ?? 0) })),
    ...parcheggio.map((x) => ({ id: x.id, quando: x.ingresso_at, cosa: `Parcheggio · ${x.targa}`, stato: x.uscita_at ? 'uscito' : 'in parcheggio', prezzo: Number(x.tariffa_giorno) * (x.giorni ?? 1) })),
  ].sort((a, b) => a.quando.localeCompare(b.quando))
  return voci.length === 0 ? (
    <EmptyState compatto icon={CalendarClock} title="Nessun servizio prenotato" description="SPA, massaggi, transfer e parcheggio finiscono sul conto della camera."
      action={<Button asChild variant="outline"><Link to="/hotel/servizi">Prenota un servizio</Link></Button>} />
  ) : (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Servizio</TableHead><TableHead>Stato</TableHead><TableHead className="text-right">Prezzo</TableHead></TableRow></TableHeader>
        <TableBody>{voci.map((v) => (
          <TableRow key={v.id}><TableCell className="text-muted-foreground">{fmtGiornoOra(v.quando)}</TableCell><TableCell className="text-foreground">{v.cosa}</TableCell>
            <TableCell className="text-muted-foreground">{v.stato}</TableCell><TableCell numerica>{fmtEuro(v.prezzo)}</TableCell></TableRow>
        ))}</TableBody>
      </Table>
    </Card>
  )
}

function Garanzie({ prenotazione: p, saldo }: { prenotazione: Prenotazione; saldo?: ContoSaldo }) {
  const { data: garanzie = [] } = useElenco<Tables<'hotel_garanzie'>>('hotel_garanzie', { filtri: { prenotazione_id: p.id }, ordine: [{ colonna: 'created_at' }] })
  const inserisci = useInserisci('hotel_garanzie', ['hotel_garanzie'])
  const contoAzione = useAzione('hotel_conto_prenotazione', TABELLE_SOGGIORNO)
  const navigate = useNavigate()
  const [g, setG] = useState({ tipo: 'carta_garanzia', importo: '', riferimento: '', scadenza: '' })
  const versato = Number(saldo?.pagato ?? 0)
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h3 className="text-title text-foreground">Caparra</h3>
        <p className="text-sm text-muted-foreground">Richiesta <span className="tabular-nums text-foreground">{fmtEuro(p.caparra_richiesta)}</span>
          {p.caparra_scadenza ? ` entro il ${fmtData(p.caparra_scadenza)}` : ''} · versata <span className="tabular-nums text-foreground">{fmtEuro(versato)}</span></p>
        <BottoneScrittura variant="outline" onClick={() => contoAzione.mutate({ p_prenotazione: p.id }, {
          onSuccess: (conto) => navigate(`/hotel/cassa?conto=${conto}`), onError: (e) => toast.error(messaggioErrore(e)) })}>
          <Receipt className="h-4 w-4" /> Registra la caparra in cassa</BottoneScrittura>
        <p className="text-xs text-muted-foreground">Il conto della prenotazione accetta acconti prima dell'arrivo; a fine soggiorno l'eccedenza si restituisce.</p>
      </Card>
      <Card className="space-y-3 p-5">
        <h3 className="text-title text-foreground">Garanzie</h3>
        {garanzie.length > 0 && (
          <ul className="divide-y divide-border text-sm">{garanzie.map((x) => (
            <li key={x.id} className="flex justify-between gap-2 py-1.5"><span className="text-foreground">{x.tipo.replace('_', ' ')} {x.riferimento ? <span className="font-mono text-xs text-muted-foreground">{x.riferimento}</span> : null}</span>
              <span className="tabular-nums text-muted-foreground">{fmtEuro(x.importo)} · {x.stato}</span></li>))}</ul>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Tipo</Label>
            <Select value={g.tipo} onValueChange={(v) => setG({ ...g, tipo: v })}>
              <SelectTrigger aria-label="Tipo di garanzia"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="carta_garanzia">Carta a garanzia</SelectItem><SelectItem value="preautorizzazione">Preautorizzazione</SelectItem>
                <SelectItem value="virtual_card">Virtual card</SelectItem><SelectItem value="voucher">Voucher</SelectItem><SelectItem value="prepagato">Prepagato</SelectItem>
              </SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label htmlFor="gr-imp">Importo (€)</Label><Input id="gr-imp" inputMode="decimal" value={g.importo} onChange={(e) => setG({ ...g, importo: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="gr-rif">Riferimento</Label><Input id="gr-rif" value={g.riferimento} onChange={(e) => setG({ ...g, riferimento: e.target.value })} placeholder="Token o numero del voucher" /></div>
          <div className="space-y-1.5"><Label htmlFor="gr-sc">Scadenza</Label><Input id="gr-sc" type="date" value={g.scadenza} onChange={(e) => setG({ ...g, scadenza: e.target.value })} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Mai il numero della carta: solo il riferimento del circuito (il collegamento con il gateway è predisposto).</p>
        <BottoneScrittura variant="outline" onClick={() => inserisci.mutate({ prenotazione_id: p.id, tipo: g.tipo, importo: g.importo ? Number(g.importo.replace(',', '.')) : null,
          riferimento: g.riferimento || null, scadenza: g.scadenza || null }, {
          onSuccess: () => { toast.success('Garanzia registrata'); setG({ ...g, importo: '', riferimento: '' }) }, onError: (e) => toast.error(messaggioErrore(e)) })}>
          Registra la garanzia</BottoneScrittura>
      </Card>
    </div>
  )
}

function AnnullaDialog({ prenotazione: p, pagato, onChiudi }: { prenotazione: Prenotazione; pagato: number; onChiudi: () => void }) {
  const annulla = useAzione('hotel_annulla_prenotazione', TABELLE_SOGGIORNO)
  const [motivo, setMotivo] = useState('')
  const [metodo, setMetodo] = useState('bonifico')
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onChiudi() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annulla {p.codice}</DialogTitle>
          <DialogDescription>Penale e caparra seguono la politica del piano tariffario: la calcola il sistema.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="an-mot">Motivo</Label><Input id="an-mot" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Cambio di programma, malattia…" /></div>
          {pagato > 0 && (
            <div className="space-y-1.5"><Label>Se resta caparra da restituire</Label>
              <Select value={metodo} onValueChange={setMetodo}>
                <SelectTrigger aria-label="Metodo del rimborso"><SelectValue /></SelectTrigger>
                <SelectContent>{METODI_RIMBORSO.map((m) => <SelectItem key={m.valore} value={m.valore}>Rimborso con {m.label.toLowerCase()}</SelectItem>)}
                  <SelectItem value="credito">Tieni a credito</SelectItem></SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Versati {fmtEuro(pagato)}.</p></div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onChiudi}>Indietro</Button>
          <BottoneScrittura variant="destructive" disabled={!motivo.trim() || annulla.isPending}
            onClick={() => annulla.mutate({ p_prenotazione: p.id, p_motivo: motivo.trim(),
              p_rimborso_metodo: pagato > 0 && metodo !== 'credito' ? metodo as Database['public']['Enums']['pagamento_metodo'] : undefined }, {
              onSuccess: (r) => {
                const e = r as unknown as { penale: number; rimborso: number; credito: number }
                toast.success(`Annullata${Number(e.penale) > 0 ? ` · penale ${fmtEuro(e.penale)}` : ''}${Number(e.rimborso) > 0 ? ` · rimborso ${fmtEuro(e.rimborso)}` : ''}${Number(e.credito) > 0 ? ` · credito ${fmtEuro(e.credito)}` : ''}`)
                onChiudi()
              },
              onError: (err) => toast.error(messaggioErrore(err)) })}>
            Annulla la prenotazione</BottoneScrittura>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
