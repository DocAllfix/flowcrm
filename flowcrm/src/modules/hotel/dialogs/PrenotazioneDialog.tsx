/**
 * Nuova prenotazione (documento Hotel §7, §10, §17): ospite dall'anagrafica,
 * date, persone, tipologia con la disponibilità del periodo, camera, piano
 * tariffario e trattamento con il preventivo notte per notte, canale e
 * intermediario, gruppo, caparra, richieste. Le regole del piano (soggiorno
 * minimo, chiusure, anticipo) si vedono prima di salvare.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { CercaContatto, type ContattoScelto } from '@/components/condivisi/CercaContatto'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useRpc, useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { useCatalogoHotel, useQuota, TABELLE_SOGGIORNO, type Disponibilita, type Gruppo, type Intermediario, type Prenotazione } from '@/modules/hotel/queries'
import { CANALE, fmtEuro, oggiIso, piuGiorni, notti as nNotti, giorniTra } from '@/modules/hotel/stati'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** Precompilazione dal planning: camera e arrivo cliccati. */
  iniziale?: { camera_id?: string; tipologia_id?: string; arrivo?: string; gruppo_id?: string }
}

const VUOTO = 'nessuno'

export function PrenotazioneDialog({ open, onOpenChange, iniziale }: Props) {
  const { strutturaId } = useHotel()
  const navigate = useNavigate()
  const { tipologie, camere, trattamenti, piani } = useCatalogoHotel(strutturaId)
  const { data: intermediari = [] } = useElenco<Intermediario & { organizzazioni: { ragione_sociale: string } | null }>('hotel_intermediari', {
    filtri: { attivo: true }, select: '*, organizzazioni(ragione_sociale)', abilitato: open,
  })
  const { data: gruppi = [] } = useElenco<Gruppo>('hotel_gruppi', {
    filtri: { struttura_id: strutturaId ?? undefined, stato: ['opzione', 'confermato'] }, ordine: [{ colonna: 'arrivo' }], abilitato: open && !!strutturaId,
  })
  const { data: aziende = [] } = useElenco<Pick<Tables<'organizzazioni'>, 'id' | 'ragione_sociale'>>('organizzazioni', {
    filtri: { attivo: true }, select: 'id, ragione_sociale', ordine: [{ colonna: 'ragione_sociale' }], limite: 1000, abilitato: open,
  })
  const salva = useSalva('hotel_prenotazioni', TABELLE_SOGGIORNO)

  const [nome, setNome] = useState('')
  const [contatto, setContatto] = useState<ContattoScelto | null>(null)
  const [f0, setF] = useState({
    arrivo: oggiIso(), partenza: piuGiorni(oggiIso(), 1), adulti: '2', bambini: '0', tipologia: '', camera: VUOTO,
    piano: '', trattamento: '', canale: 'diretto', intermediario: VUOTO, gruppo: VUOTO, azienda: VUOTO, stato: 'confermata',
    opzione: '', caparra: '', caparraScadenza: '', manuale: false, prezzo: '', arrivoOra: '', early: false, late: false,
    richieste: '', note: '',
  })
  useEffect(() => {
    if (!open) return
    setNome(''); setContatto(null)
    setF((x) => ({
      ...x, arrivo: iniziale?.arrivo ?? oggiIso(), partenza: piuGiorni(iniziale?.arrivo ?? oggiIso(), 1),
      tipologia: iniziale?.tipologia_id ?? '', camera: iniziale?.camera_id ?? VUOTO, gruppo: iniziale?.gruppo_id ?? VUOTO,
      richieste: '', note: '', caparra: '', prezzo: '', manuale: false,
    }))
  }, [open, iniziale?.camera_id, iniziale?.tipologia_id, iniziale?.arrivo, iniziale?.gruppo_id])
  // Valori di partenza calcolati al disegno (prima tipologia, BAR, BB), mai in
  // un effetto: l'azzeramento all'apertura li cancellerebbe a catalogo già caricato.
  const f = {
    ...f0,
    tipologia: f0.tipologia
      || tipologie.find((t) => t.occupazione_max >= (Number(f0.adulti) || 1) + (Number(f0.bambini) || 0))?.id || tipologie[0]?.id || '',
    piano: f0.piano || piani.find((p) => p.tipo === 'bar')?.id || piani[0]?.id || '',
    trattamento: f0.trattamento || trattamenti.find((t) => t.codice === 'BB')?.id || trattamenti[0]?.id || '',
  }
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const notti = giorniTra(f.arrivo, f.partenza)
  const { data: quota, isFetching } = useQuota({
    p_struttura: strutturaId, p_tipologia: f.tipologia, p_arrivo: f.arrivo, p_partenza: f.partenza,
    p_adulti: Number(f.adulti) || 1, p_bambini: Number(f.bambini) || 0, p_piano: f.piano || null, p_trattamento: f.trattamento || null,
    p_canale: f.canale,
  })
  const { data: disponibilita = [] } = useRpc<Disponibilita[]>('hotel_disponibilita',
    { p_struttura: strutturaId, p_dal: f.arrivo, p_al: notti > 0 ? piuGiorni(f.partenza, -1) : f.arrivo }, { abilitato: open && !!strutturaId && notti > 0 })
  const liberePer = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of disponibilita) m.set(d.tipologia_id!, Math.min(m.get(d.tipologia_id!) ?? Infinity, d.disponibili ?? 0))
    return m
  }, [disponibilita])
  const libere = liberePer.get(f.tipologia)
  const camereTipologia = camere.filter((c) => c.tipologia_id === f.tipologia)
  const caparraSuggerita = Number(quota?.caparra ?? 0)

  async function crea(e: FormEvent) {
    e.preventDefault()
    const ospite = (contatto ? `${contatto.nome} ${contatto.cognome ?? ''}` : nome).trim()
    if (!ospite) { toast.error('Scrivi il nome dell\'ospite'); return }
    if (notti < 1) { toast.error('La partenza deve seguire l\'arrivo'); return }
    if (!f.tipologia) { toast.error('Scegli la tipologia'); return }
    if (f.manuale && !(Number(f.prezzo.replace(',', '.')) >= 0)) { toast.error('Scrivi il prezzo concordato'); return }
    const values: Database['public']['Tables']['hotel_prenotazioni']['Insert'] = {
      struttura_id: strutturaId!, ospite_nome: ospite, contatto_id: contatto?.id ?? null,
      organizzazione_id: f.azienda === VUOTO ? null : f.azienda,
      arrivo: f.arrivo, partenza: f.partenza, adulti: Number(f.adulti) || 1, bambini: Number(f.bambini) || 0,
      tipologia_id: f.tipologia, camera_id: f.camera === VUOTO ? null : f.camera, piano_id: f.piano || null, trattamento_id: f.trattamento || null,
      canale: f.canale as Prenotazione['canale'], intermediario_id: f.intermediario === VUOTO ? null : f.intermediario,
      gruppo_id: f.gruppo === VUOTO ? null : f.gruppo, stato: f.stato as Prenotazione['stato'],
      opzione_scadenza: f.stato === 'opzionata' && f.opzione ? f.opzione : null,
      caparra_richiesta: f.caparra ? Number(f.caparra.replace(',', '.')) : caparraSuggerita,
      caparra_scadenza: f.caparraScadenza || null,
      prezzo_manuale: f.manuale, prezzo_totale: f.manuale ? Number(f.prezzo.replace(',', '.')) : 0,
      arrivo_ora: f.arrivoOra || null, early_check_in: f.early, late_check_out: f.late,
      richieste: f.richieste.trim() || null, note: f.note.trim() || null,
    }
    salva.mutate({ values }, {
      onSuccess: (p) => { toast.success(`Prenotazione ${p.codice} registrata`); onOpenChange(false); navigate(`/hotel/prenotazioni/${p.id}`) },
      onError: (err) => toast.error(/23P01|hotel_camera_libera/.test(JSON.stringify(err))
        ? 'La camera è già assegnata in quelle notti: scegline un\'altra o lasciala da assegnare' : messaggioErrore(err)),
    })
  }

  const conIntermediario = ['ota', 'agenzia', 'tour_operator', 'gds', 'corporate'].includes(f.canale)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova prenotazione</DialogTitle>
          <DialogDescription>Il prezzo arriva dal piano tariffario notte per notte; si può fissare a mano se concordato.</DialogDescription>
        </DialogHeader>
        <form onSubmit={crea} className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5"><Label htmlFor="pr-ospite">Ospite *</Label>
              <CercaContatto id="pr-ospite" valore={nome} contattoId={contatto?.id ?? null} segnaposto="Nome e cognome, o cerca in anagrafica"
                onTesto={(v) => { setNome(v); setContatto(null) }} onScegli={(c) => { setContatto(c); setNome(`${c.nome} ${c.cognome ?? ''}`.trim()) }} /></div>
            <div className="space-y-1.5"><Label htmlFor="pr-arrivo">Arrivo</Label>
              <Input id="pr-arrivo" type="date" value={f.arrivo} onChange={(e) => setF({ ...f, arrivo: e.target.value,
                partenza: f.partenza <= e.target.value ? piuGiorni(e.target.value, 1) : f.partenza })} /></div>
            <div className="space-y-1.5"><Label htmlFor="pr-partenza">Partenza</Label>
              <Input id="pr-partenza" type="date" min={piuGiorni(f.arrivo, 1)} value={f.partenza} onChange={set('partenza')} /></div>
            <div className="space-y-1.5"><Label htmlFor="pr-adulti">Adulti</Label>
              <Input id="pr-adulti" type="number" min={1} max={12} value={f.adulti} onChange={set('adulti')} /></div>
            <div className="space-y-1.5"><Label htmlFor="pr-bambini">Bambini</Label>
              <Input id="pr-bambini" type="number" min={0} max={12} value={f.bambini} onChange={set('bambini')} /></div>
            <div className="space-y-1.5"><Label>Tipologia</Label>
              <Select value={f.tipologia} onValueChange={(v) => setF({ ...f, tipologia: v, camera: VUOTO })}>
                <SelectTrigger aria-label="Tipologia"><SelectValue placeholder="Scegli…" /></SelectTrigger>
                <SelectContent>{tipologie.filter((t) => t.attiva).map((t) => {
                  const l = liberePer.get(t.id)
                  return <SelectItem key={t.id} value={t.id}>{t.nome}{l !== undefined ? ` · ${l > 0 ? `${l} libere` : 'esaurita'}` : ''}</SelectItem>
                })}</SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>Camera</Label>
              <Select value={f.camera} onValueChange={(v) => setF({ ...f, camera: v })}>
                <SelectTrigger aria-label="Camera"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={VUOTO}>Da assegnare</SelectItem>
                  {camereTipologia.map((c) => <SelectItem key={c.id} value={c.id}>Camera {c.numero}{c.piano != null ? ` · ${c.piano}° piano` : ''}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>Piano tariffario</Label>
              <Select value={f.piano} onValueChange={(v) => setF({ ...f, piano: v })}>
                <SelectTrigger aria-label="Piano tariffario"><SelectValue placeholder="Scegli…" /></SelectTrigger>
                <SelectContent>{piani.filter((p) => p.attivo).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>Trattamento</Label>
              <Select value={f.trattamento} onValueChange={(v) => setF({ ...f, trattamento: v })}>
                <SelectTrigger aria-label="Trattamento"><SelectValue placeholder="Scegli…" /></SelectTrigger>
                <SelectContent>{trattamenti.filter((t) => t.attivo).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>Canale</Label>
              <Select value={f.canale} onValueChange={(v) => setF({ ...f, canale: v })}>
                <SelectTrigger aria-label="Canale"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CANALE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select></div>
            {conIntermediario ? (
              <div className="space-y-1.5"><Label>Intermediario</Label>
                <Select value={f.intermediario} onValueChange={(v) => setF({ ...f, intermediario: v })}>
                  <SelectTrigger aria-label="Intermediario"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VUOTO}>Nessuno</SelectItem>
                    {intermediari.map((i) => <SelectItem key={i.id} value={i.id}>{i.organizzazioni?.ragione_sociale ?? '—'} · {Number(i.commissione_pct)}%</SelectItem>)}
                  </SelectContent>
                </Select></div>
            ) : (
              <div className="space-y-1.5"><Label>Azienda (pagatore)</Label>
                <Select value={f.azienda} onValueChange={(v) => setF({ ...f, azienda: v })}>
                  <SelectTrigger aria-label="Azienda"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VUOTO}>Privato</SelectItem>
                    {aziende.map((a) => <SelectItem key={a.id} value={a.id}>{a.ragione_sociale}</SelectItem>)}
                  </SelectContent>
                </Select></div>
            )}
            {gruppi.length > 0 && (
              <div className="space-y-1.5"><Label>Gruppo</Label>
                <Select value={f.gruppo} onValueChange={(v) => setF({ ...f, gruppo: v })}>
                  <SelectTrigger aria-label="Gruppo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VUOTO}>Nessuno</SelectItem>
                    {gruppi.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
                  </SelectContent>
                </Select></div>
            )}
            <div className="space-y-1.5"><Label>Stato</Label>
              <Select value={f.stato} onValueChange={(v) => setF({ ...f, stato: v })}>
                <SelectTrigger aria-label="Stato della prenotazione"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confermata">Confermata</SelectItem>
                  <SelectItem value="opzionata">Opzionata (scade)</SelectItem>
                  <SelectItem value="richiesta">Solo richiesta</SelectItem>
                </SelectContent>
              </Select></div>
            {f.stato === 'opzionata' && (
              <div className="space-y-1.5"><Label htmlFor="pr-opz">Opzione valida fino al</Label>
                <Input id="pr-opz" type="date" value={f.opzione} onChange={set('opzione')} /></div>
            )}
            <div className="space-y-1.5"><Label htmlFor="pr-cap">Caparra richiesta (€)</Label>
              <Input id="pr-cap" inputMode="decimal" value={f.caparra} onChange={set('caparra')} placeholder={caparraSuggerita ? String(caparraSuggerita) : '0'} /></div>
            <div className="space-y-1.5"><Label htmlFor="pr-capd">Caparra entro il</Label>
              <Input id="pr-capd" type="date" value={f.caparraScadenza} onChange={set('caparraScadenza')} /></div>
            <div className="space-y-1.5"><Label htmlFor="pr-ora">Ora di arrivo</Label>
              <Input id="pr-ora" type="time" value={f.arrivoOra} onChange={set('arrivoOra')} /></div>
            <div className="flex items-end gap-4 pb-2 text-sm">
              <label className="flex items-center gap-2"><Switch checked={f.early} onCheckedChange={(v) => setF({ ...f, early: v })} aria-label="Early check-in" /> Early check-in</label>
              <label className="flex items-center gap-2"><Switch checked={f.late} onCheckedChange={(v) => setF({ ...f, late: v })} aria-label="Late check-out" /> Late check-out</label>
            </div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="pr-ric">Richieste speciali</Label>
              <Input id="pr-ric" value={f.richieste} onChange={set('richieste')} placeholder="Culla, piano alto, camera silenziosa…" /></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="pr-note">Note interne</Label>
              <Textarea id="pr-note" rows={2} value={f.note} onChange={set('note')} /></div>
          </div>

          <aside className="space-y-3 rounded-xl border border-border bg-muted/40 p-4" aria-live="polite" aria-label="Preventivo">
            <h3 className="text-title text-foreground">Preventivo</h3>
            <p className="text-sm text-muted-foreground">{nNotti(notti)} · {Number(f.adulti) + Number(f.bambini)} persone</p>
            {libere !== undefined && libere <= 0 && (
              <p className="flex items-start gap-1.5 text-sm text-warning-testo"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Tipologia esaurita in almeno una notte: salvando si va in overbooking (la direzione viene avvisata).</p>
            )}
            {quota && (
              <>
                <ul className={cn('max-h-48 space-y-1 overflow-y-auto text-sm tabular-nums', isFetching && 'opacity-60')}>
                  {quota.notti.map((n) => (
                    <li key={n.data} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{new Date(`${n.data}T12:00`).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                      <span className="text-foreground">{fmtEuro(Number(n.camera) + Number(n.trattamento))}</span>
                    </li>
                  ))}
                </ul>
                <p className="flex justify-between border-t border-border pt-2 font-semibold tabular-nums text-foreground">
                  <span>Totale</span><span>{fmtEuro(quota.totale)}</span></p>
                {caparraSuggerita > 0 && <p className="text-xs text-muted-foreground">Caparra prevista dal piano: {fmtEuro(caparraSuggerita)}</p>}
                {!quota.valida && (
                  <ul className="space-y-1 text-sm text-warning-testo">{quota.motivi.map((m) => <li key={m} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{m}</li>)}</ul>
                )}
              </>
            )}
            <label className="flex items-center gap-2 border-t border-border pt-3 text-sm text-foreground">
              <Switch checked={f.manuale} onCheckedChange={(v) => setF({ ...f, manuale: v, prezzo: v ? String(quota?.totale ?? '') : '' })} aria-label="Prezzo concordato" />
              Prezzo concordato
            </label>
            {f.manuale && (
              <div className="space-y-1.5"><Label htmlFor="pr-prezzo">Totale del soggiorno (€)</Label>
                <Input id="pr-prezzo" inputMode="decimal" value={f.prezzo} onChange={set('prezzo')} /></div>
            )}
          </aside>

          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={salva.isPending}>{salva.isPending ? 'Registrazione…' : 'Registra la prenotazione'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
