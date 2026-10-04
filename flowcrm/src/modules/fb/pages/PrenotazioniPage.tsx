/**
 * PrenotazioniPage — prenotazioni del giorno in ordine d'orario con il
 * ciclo Richiesta → Confermata → Arrivata → Servita → Conclusa / No-show
 * (Ristorante §8, Bar §13) e la lista d'attesa (Ristorante §9): chi
 * aspetta, da quanto, e quale tavolo libero gli va bene adesso.
 */
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, Hourglass, Plus, UserCheck, UserX } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useElenco, useRpc, useSalva, useDalVivo, fondKeys, messaggioErrore } from '@/lib/queries/fondamenta'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale, SelettoreLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { PrenotazioneDialog } from '@/modules/fb/dialogs/PrenotazioneDialog'
import {
  ATTESA_STATO, PRENOTAZIONE_STATO, CANALE_PRENOTAZIONE_LABEL, etichettaAllergene, fmtOra, minutiDa, oggiIso,
} from '@/modules/fb/stati'
import { TABELLE_SERVIZIO, type Attesa, type Prenotazione, type Sala, type Tavolo } from '@/modules/fb/queries'

export function PrenotazioniPage() {
  return <ConLocale><Prenotazioni_ /></ConLocale>
}

const sposta = (iso: string, giorni: number) => {
  const d = new Date(`${iso}T12:00`); d.setDate(d.getDate() + giorni)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Prenotazioni_() {
  const { localeId } = useFb()
  const [giorno, setGiorno] = useState(oggiIso())
  const [dialog, setDialog] = useState<{ aperta: boolean; p?: Prenotazione }>({ aperta: false })
  useDalVivo(['fb_prenotazioni', 'fb_attesa', 'fb_comande'], [fondKeys.tabella('fb_tavoli_stato')])

  const da = new Date(`${giorno}T00:00`).toISOString()
  const a = new Date(`${sposta(giorno, 1)}T00:00`).toISOString()
  const { data: prenotazioni = [], isLoading } = useElenco<Prenotazione>('fb_prenotazioni', {
    filtri: { locale_id: localeId ?? undefined }, tra: { colonna: 'inizio', da, a }, ordine: [{ colonna: 'inizio' }], abilitato: !!localeId,
  })
  const { data: tavoli = [] } = useElenco<Tavolo>('fb_tavoli', { filtri: { locale_id: localeId ?? undefined } })
  const { data: attesa = [] } = useElenco<Attesa>('fb_attesa', {
    filtri: { locale_id: localeId ?? undefined, stato: ['in_attesa', 'avvisato'] }, ordine: [{ colonna: 'priorita', crescente: false }, { colonna: 'ora_richiesta' }],
    abilitato: !!localeId,
  })
  const attive = prenotazioni.filter((p) => !['annullata', 'no_show'].includes(p.stato))
  const numero = (id: string) => tavoli.find((t) => t.id === id)?.numero ?? '?'

  return (
    <div>
      <PageHeader title="Prenotazioni" description="Il giorno in ordine d'orario e la lista d'attesa."
        numeri={[
          { etichetta: 'prenotazioni', valore: attive.length, inCaricamento: isLoading },
          { etichetta: 'coperti previsti', valore: attive.reduce((s, p) => s + p.persone, 0), inCaricamento: isLoading },
          { etichetta: 'in lista d\'attesa', valore: attesa.length },
          { etichetta: 'no-show', valore: prenotazioni.filter((p) => p.stato === 'no_show').length, inCaricamento: isLoading },
        ]}
        actions={<>
          <SelettoreLocale />
          <BottoneScrittura onClick={() => setDialog({ aperta: true })}><Plus className="h-4 w-4" /> Nuova prenotazione</BottoneScrittura>
        </>} />

      <Tabs defaultValue="giorno">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="giorno">Prenotazioni</TabsTrigger>
            <TabsTrigger value="attesa">Lista d'attesa{attesa.length ? ` (${attesa.length})` : ''}</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setGiorno(sposta(giorno, -1))} aria-label="Giorno precedente"><ChevronLeft className="h-4 w-4" /></Button>
            <Input type="date" value={giorno} onChange={(e) => e.target.value && setGiorno(e.target.value)} className="w-40" aria-label="Giorno" />
            <Button variant="outline" size="icon" onClick={() => setGiorno(sposta(giorno, 1))} aria-label="Giorno successivo"><ChevronRight className="h-4 w-4" /></Button>
            {giorno !== oggiIso() && <Button variant="ghost" onClick={() => setGiorno(oggiIso())}>Oggi</Button>}
          </div>
        </div>

        <TabsContent value="giorno">
          {prenotazioni.length === 0 && !isLoading ? (
            <EmptyState icon={CalendarClock} title="Nessuna prenotazione"
              description="Le prenotazioni del giorno compariranno qui in ordine d'orario."
              action={<BottoneScrittura onClick={() => setDialog({ aperta: true })}>Nuova prenotazione</BottoneScrittura>} />
          ) : (
            <Card className="divide-y divide-border">
              {prenotazioni.map((p) => <RigaPrenotazione key={p.id} p={p} numero={numero} onModifica={() => setDialog({ aperta: true, p })} />)}
            </Card>
          )}
        </TabsContent>
        <TabsContent value="attesa"><ListaAttesa attesa={attesa} /></TabsContent>
      </Tabs>

      <PrenotazioneDialog open={dialog.aperta} prenotazione={dialog.p} giorno={giorno}
        onOpenChange={(o) => { if (!o) setDialog({ aperta: false }) }} />
    </div>
  )
}

function RigaPrenotazione({ p, numero, onModifica }: { p: Prenotazione; numero: (id: string) => string; onModifica: () => void }) {
  const navigate = useNavigate()
  const { base, localeId, modulo } = useFb()
  const salva = useSalva('fb_prenotazioni', ['fb_tavoli_stato'])
  const apriComanda = useSalva('fb_comande', TABELLE_SERVIZIO)
  const st = PRENOTAZIONE_STATO[p.stato] ?? PRENOTAZIONE_STATO.richiesta
  const cambia = (stato: Prenotazione['stato'], ok: string) =>
    salva.mutate({ id: p.id, values: { stato } }, { onSuccess: () => toast.success(ok), onError: (e) => toast.error(messaggioErrore(e)) })

  async function arrivo() {
    if (!p.tavoli.length) { onModifica(); toast.info('Assegna un tavolo per far accomodare il cliente'); return }
    try {
      const c = await apriComanda.mutateAsync({ values: { locale_id: localeId!, modulo, tavolo_id: p.tavoli[0], prenotazione_id: p.id,
        contatto_id: p.contatto_id, coperti: p.persone, canale: 'sala' } })
      navigate(`${base}/comande/${c.id}`)
    } catch (e) { toast.error(messaggioErrore(e)) }
  }

  const passata = new Date(p.inizio).getTime() < Date.now() - 20 * 60000
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <span className="w-12 font-mono text-sm font-semibold tabular-nums text-foreground">{fmtOra(p.inizio)}</span>
      <button type="button" onClick={onModifica} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium text-foreground">{p.nome}
          <span className="ml-2 font-normal text-muted-foreground">{p.persone} {p.persone === 1 ? 'persona' : 'persone'}</span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {[p.tavoli.length ? `Tavolo ${p.tavoli.map(numero).join(' + ')}` : 'Tavolo da assegnare', p.telefono,
            p.occasione, CANALE_PRENOTAZIONE_LABEL[p.canale], p.richieste_speciali].filter(Boolean).join(' · ')}
        </span>
        {(p.allergie.length > 0 || p.intolleranze) && (
          <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-destructive-testo">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            {[...p.allergie.map(etichettaAllergene), p.intolleranze].filter(Boolean).join(', ')}
          </span>
        )}
      </button>
      <Badge tone={st.tone}>{st.label}</Badge>
      <div className="flex gap-1.5">
        {p.stato === 'richiesta' && <BottoneScrittura size="sm" variant="outline" onClick={() => cambia('confermata', 'Prenotazione confermata')}>Conferma</BottoneScrittura>}
        {(p.stato === 'richiesta' || p.stato === 'confermata') && (
          <>
            <BottoneScrittura size="sm" onClick={arrivo}><UserCheck className="h-3.5 w-3.5" /> Arrivati</BottoneScrittura>
            {passata && <BottoneScrittura size="sm" variant="outline" onClick={() => cambia('no_show', 'Segnato come no-show')}><UserX className="h-3.5 w-3.5" /> No-show</BottoneScrittura>}
            <BottoneScrittura size="sm" variant="ghost" onClick={() => cambia('annullata', 'Prenotazione annullata')}>Annulla</BottoneScrittura>
          </>
        )}
      </div>
    </div>
  )
}

interface Candidato { attesa_id: string; nome: string; persone: number; minuti_attesa: number; tavolo_id: string; tavolo: string }

function ListaAttesa({ attesa }: { attesa: Attesa[] }) {
  const navigate = useNavigate()
  const { localeId, base, modulo } = useFb()
  const salva = useSalva('fb_attesa')
  const apriComanda = useSalva('fb_comande', TABELLE_SERVIZIO)
  const { data: candidati = [] } = useRpc<Candidato[]>('fb_attesa_candidati', { p_locale: localeId }, { abilitato: !!localeId, intervallo: 30_000 })
  const [n, setN] = useState({ nome: '', persone: '2', telefono: '', note: '', sala: '', priorita: '0' })
  const { data: sale = [] } = useElenco<Sala>('fb_sale', { filtri: { locale_id: localeId ?? undefined, attiva: true }, ordine: [{ colonna: 'ordine' }] })

  async function aggiungi(e: FormEvent) {
    e.preventDefault()
    if (!n.nome.trim()) return
    try {
      await salva.mutateAsync({ values: { locale_id: localeId!, modulo, nome: n.nome.trim(), persone: Number(n.persone) || 1,
        telefono: n.telefono.trim() || null, note: n.note.trim() || null, sala_id: n.sala || null, priorita: Number(n.priorita) || 0 } })
      setN({ nome: '', persone: '2', telefono: '', note: '', sala: '', priorita: '0' })
    } catch (err) { toast.error(messaggioErrore(err)) }
  }
  async function siedi(a: Attesa, tavoloId: string) {
    try {
      const c = await apriComanda.mutateAsync({ values: { locale_id: localeId!, modulo, tavolo_id: tavoloId, coperti: a.persone,
        contatto_id: a.contatto_id, canale: 'sala' } })
      await salva.mutateAsync({ id: a.id, values: { stato: 'seduto', tavolo_id: tavoloId } })
      navigate(`${base}/comande/${c.id}`)
    } catch (e) { toast.error(messaggioErrore(e)) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={aggiungi} className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1 space-y-1.5"><Label htmlFor="la-nome">Nome</Label>
            <Input id="la-nome" value={n.nome} onChange={(e) => setN({ ...n, nome: e.target.value })} /></div>
          <div className="w-24 space-y-1.5"><Label htmlFor="la-persone">Persone</Label>
            <Input id="la-persone" type="number" min={1} value={n.persone} onChange={(e) => setN({ ...n, persone: e.target.value })} /></div>
          <div className="w-40 space-y-1.5"><Label htmlFor="la-tel">Telefono</Label>
            <Input id="la-tel" value={n.telefono} onChange={(e) => setN({ ...n, telefono: e.target.value })} /></div>
          {sale.length > 1 && (
            <div className="w-40 space-y-1.5"><Label>Zona preferita</Label>
              <Select value={n.sala || 'qualsiasi'} onValueChange={(v) => setN({ ...n, sala: v === 'qualsiasi' ? '' : v })}>
                <SelectTrigger aria-label="Zona preferita"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="qualsiasi">Qualsiasi</SelectItem>{sale.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
              </Select></div>
          )}
          <div className="w-36 space-y-1.5"><Label>Priorità</Label>
            <Select value={n.priorita} onValueChange={(v) => setN({ ...n, priorita: v })}>
              <SelectTrigger aria-label="Priorità"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="0">Normale</SelectItem><SelectItem value="1">Cliente abituale</SelectItem><SelectItem value="2">Alta</SelectItem></SelectContent>
            </Select></div>
          <div className="min-w-40 flex-1 space-y-1.5"><Label htmlFor="la-note">Preferenze</Label>
            <Input id="la-note" value={n.note} onChange={(e) => setN({ ...n, note: e.target.value })} placeholder="Fuori, vicino alla finestra…" /></div>
          <BottoneScrittura type="submit"><Plus className="h-4 w-4" /> In lista</BottoneScrittura>
        </form>
      </Card>
      {attesa.length === 0 ? (
        <EmptyState icon={Hourglass} title="Nessuno in attesa" description="Chi aspetta un tavolo si aggiunge qui sopra." />
      ) : (
        <Card className="divide-y divide-border">
          {attesa.map((a) => {
            const cand = candidati.find((c) => c.attesa_id === a.id)
            const st = ATTESA_STATO[a.stato] ?? ATTESA_STATO.in_attesa
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <span className="w-16 text-sm tabular-nums text-muted-foreground">{minutiDa(a.ora_richiesta)} min</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{a.nome} <span className="font-normal text-muted-foreground">· {a.persone} persone</span></p>
                  <p className="text-xs text-muted-foreground">{[a.telefono, sale.find((s) => s.id === a.sala_id)?.nome, a.priorita > 0 ? 'priorità' : null, a.note].filter(Boolean).join(' · ') || '—'}</p>
                </div>
                {cand ? <Badge tone="success">Tavolo {cand.tavolo} libero</Badge> : <span className="text-xs text-muted-foreground">Nessun tavolo adatto libero</span>}
                <Badge tone={st.tone}>{st.label}</Badge>
                <div className="flex gap-1.5">
                  {a.stato === 'in_attesa' && (
                    <BottoneScrittura size="sm" variant="outline" title="L'avviso via SMS o WhatsApp si collega su richiesta: per ora si chiama il cliente"
                      onClick={() => salva.mutate({ id: a.id, values: { stato: 'avvisato' } })}>Avvisato</BottoneScrittura>
                  )}
                  {cand && <BottoneScrittura size="sm" onClick={() => siedi(a, cand.tavolo_id)}>Fai sedere</BottoneScrittura>}
                  <BottoneScrittura size="sm" variant="ghost" onClick={() => salva.mutate({ id: a.id, values: { stato: 'rinunciato' } })}>Rinuncia</BottoneScrittura>
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
