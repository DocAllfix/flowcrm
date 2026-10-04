/**
 * PrenotazioneDialog — prenotazione completa (Ristorante §8, Bar §13):
 * cliente (dall'anagrafica o nuovo), data, ora, persone, zona, tavoli con
 * la disponibilità calcolata sulla fascia, recapiti, richieste, allergie,
 * occasione. Il database rifiuta comunque un tavolo già preso.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useElenco, useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import { useFb } from '@/modules/fb/contesto'
import { CercaContatto } from '@/components/condivisi/CercaContatto'
import { ALLERGENI, CANALE_PRENOTAZIONE_LABEL, PRENOTAZIONE_STATO } from '@/modules/fb/stati'
import type { Prenotazione, Sala, Tavolo } from '@/modules/fb/queries'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  prenotazione?: Prenotazione
  giorno: string
}

const ATTIVE = ['richiesta', 'confermata', 'arrivata', 'servita']
const oNull = (s: string) => (s.trim() === '' ? null : s.trim())

export function PrenotazioneDialog({ open, onOpenChange, prenotazione, giorno }: Props) {
  const { localeId, locale, modulo } = useFb()
  const salva = useSalva('fb_prenotazioni', ['fb_tavoli_stato', 'fb_prenotazioni_tavoli'])
  const { data: sale = [] } = useElenco<Sala>('fb_sale', { filtri: { locale_id: localeId ?? undefined, attiva: true }, ordine: [{ colonna: 'ordine' }] })
  const { data: tavoli = [] } = useElenco<Tavolo>('fb_tavoli', { filtri: { locale_id: localeId ?? undefined, attivo: true }, ordine: [{ colonna: 'numero' }] })

  const [f, setF] = useState({
    nome: '', telefono: '', email: '', data: giorno, ora: '20:00', durata: '', persone: '2', sala: '', canale: 'telefono',
    occasione: '', richieste: '', intolleranze: '', note: '', stato: 'confermata',
  })
  const [contattoId, setContattoId] = useState<string | null>(null)
  const [registra, setRegistra] = useState(false)
  const [consenso, setConsenso] = useState(false)
  const [allergie, setAllergie] = useState<string[]>([])
  const [scelti, setScelti] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    if (prenotazione) {
      const d = new Date(prenotazione.inizio)
      setF({
        nome: prenotazione.nome, telefono: prenotazione.telefono ?? '', email: prenotazione.email ?? '',
        data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        ora: d.toTimeString().slice(0, 5), durata: String(prenotazione.durata_min ?? ''), persone: String(prenotazione.persone),
        sala: prenotazione.sala_id ?? '', canale: prenotazione.canale, occasione: prenotazione.occasione ?? '',
        richieste: prenotazione.richieste_speciali ?? '', intolleranze: prenotazione.intolleranze ?? '', note: prenotazione.note ?? '',
        stato: prenotazione.stato,
      })
      setContattoId(prenotazione.contatto_id); setAllergie(prenotazione.allergie); setScelti(prenotazione.tavoli)
    } else {
      setF((x) => ({ ...x, nome: '', telefono: '', email: '', data: giorno, durata: '', persone: '2', sala: '', occasione: '',
        richieste: '', intolleranze: '', note: '', stato: 'confermata' }))
      setContattoId(null); setAllergie([]); setScelti([]); setRegistra(false); setConsenso(false)
    }
  }, [open, prenotazione, giorno])

  const inizio = useMemo(() => new Date(`${f.data}T${f.ora || '00:00'}`), [f.data, f.ora])
  const fine = useMemo(() => new Date(inizio.getTime() + (Number(f.durata) || locale?.durata_tavolo_min || 120) * 60000), [inizio, f.durata, locale])

  // Prenotazioni attive del giorno per calcolare i tavoli liberi nella fascia.
  const giornoDa = useMemo(() => { const d = new Date(`${f.data}T00:00`); d.setDate(d.getDate() - 1); return d.toISOString() }, [f.data])
  const giornoA = useMemo(() => { const d = new Date(`${f.data}T00:00`); d.setDate(d.getDate() + 2); return d.toISOString() }, [f.data])
  const { data: delGiorno = [] } = useElenco<Prenotazione>('fb_prenotazioni', {
    filtri: { locale_id: localeId ?? undefined, stato: ATTIVE }, tra: { colonna: 'inizio', da: giornoDa, a: giornoA },
    abilitato: open && !!localeId,
  })
  const occupati = useMemo(() => new Set(delGiorno
    .filter((p) => p.id !== prenotazione?.id && new Date(p.inizio) < fine && new Date(p.fine ?? p.inizio) > inizio)
    .flatMap((p) => p.tavoli)), [delGiorno, inizio, fine, prenotazione])
  const posti = tavoli.filter((t) => scelti.includes(t.id)).reduce((s, t) => s + (t.posti_max ?? t.posti), 0)
  const tavoliZona = tavoli.filter((t) => !f.sala || t.sala_id === f.sala)

  async function invia(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) { toast.error('Il nome è obbligatorio'); return }
    if (scelti.length && Number(f.persone) > posti) { toast.error(`I tavoli scelti hanno ${posti} posti`); return }
    try {
      let contatto = contattoId
      if (!contatto && registra) {
        const { data: auth } = await supabase.auth.getUser()
        const [nome, ...resto] = f.nome.trim().split(' ')
        const { data, error } = await supabase.from('contatti').insert({
          nome, cognome: resto.join(' ') || null, telefono: oNull(f.telefono), email: oNull(f.email),
          consenso_marketing: consenso, consenso_marketing_fonte: consenso ? `Prenotazione ${locale?.nome ?? modulo}` : null,
          created_by: auth.user!.id,
        }).select('id').single()
        if (error) throw error
        contatto = data.id
      }
      await salva.mutateAsync({ id: prenotazione?.id, values: {
        locale_id: localeId!, modulo, contatto_id: contatto, nome: f.nome.trim(), telefono: oNull(f.telefono), email: oNull(f.email),
        inizio: inizio.toISOString(), durata_min: f.durata ? Number(f.durata) : null, persone: Number(f.persone),
        sala_id: f.sala || null, tavoli: scelti, canale: f.canale, occasione: oNull(f.occasione),
        richieste_speciali: oNull(f.richieste), allergie, intolleranze: oNull(f.intolleranze), note: oNull(f.note),
        stato: f.stato as Prenotazione['stato'],
      } })
      toast.success(prenotazione ? 'Prenotazione aggiornata' : 'Prenotazione registrata')
      onOpenChange(false)
    } catch (err) { toast.error(messaggioErrore(err)) }
  }

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{prenotazione ? 'Modifica prenotazione' : 'Nuova prenotazione'}</DialogTitle></DialogHeader>
        <form onSubmit={invia} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 space-y-1.5 sm:col-span-1">
              <Label htmlFor="pr-nome">Cliente *</Label>
              <CercaContatto id="pr-nome" valore={f.nome} contattoId={contattoId} segnaposto="Nome o telefono"
                onTesto={(v) => { setF({ ...f, nome: v }); setContattoId(null) }}
                onScegli={(c) => { setContattoId(c.id); setF({ ...f, nome: `${c.nome} ${c.cognome ?? ''}`.trim(),
                  telefono: c.telefono ?? f.telefono, email: c.email ?? f.email }) }} />
            </div>
            <div className="space-y-1.5"><Label htmlFor="pr-tel">Telefono</Label><Input id="pr-tel" value={f.telefono} onChange={set('telefono')} /></div>
            <div className="space-y-1.5"><Label htmlFor="pr-email">Email</Label><Input id="pr-email" type="email" value={f.email} onChange={set('email')} /></div>
          </div>
          {!contattoId && !prenotazione && f.nome.trim().length > 1 && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <label className="flex items-center gap-2"><Checkbox checked={registra} onCheckedChange={(v) => setRegistra(!!v)} />Registra il cliente in anagrafica</label>
              {registra && <label className="flex items-center gap-2"><Checkbox checked={consenso} onCheckedChange={(v) => setConsenso(!!v)} />Acconsente a ricevere promozioni</label>}
            </div>
          )}

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5"><Label htmlFor="pr-data">Data</Label><Input id="pr-data" type="date" value={f.data} onChange={set('data')} required /></div>
            <div className="space-y-1.5"><Label htmlFor="pr-ora">Ora</Label><Input id="pr-ora" type="time" value={f.ora} onChange={set('ora')} required /></div>
            <div className="space-y-1.5"><Label htmlFor="pr-persone">Persone</Label><Input id="pr-persone" type="number" min={1} value={f.persone} onChange={set('persone')} required /></div>
            <div className="space-y-1.5"><Label htmlFor="pr-durata">Durata (min)</Label>
              <Input id="pr-durata" type="number" min={15} step={15} value={f.durata} onChange={set('durata')} placeholder={String(locale?.durata_tavolo_min ?? 120)} /></div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="w-48 space-y-1.5">
                <Label>Zona</Label>
                <Select value={f.sala || 'tutte'} onValueChange={(v) => setF({ ...f, sala: v === 'tutte' ? '' : v })}>
                  <SelectTrigger aria-label="Zona"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutte">Qualsiasi</SelectItem>
                    {sale.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Tavoli scelti: {scelti.length ? `${tavoli.filter((t) => scelti.includes(t.id)).map((t) => t.numero).join(', ')} · ${posti} posti` : 'nessuno (si assegna all\'arrivo)'}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tavoli">
              {tavoliZona.map((t) => {
                const preso = occupati.has(t.id)
                const sel = scelti.includes(t.id)
                return (
                  <button key={t.id} type="button" disabled={preso && !sel} aria-pressed={sel}
                    onClick={() => setScelti(sel ? scelti.filter((x) => x !== t.id) : [...scelti, t.id])}
                    className={cn('rounded-md border px-2.5 py-1 text-sm tabular-nums transition-colors',
                      sel ? 'border-primary bg-accent text-accent-foreground'
                        : preso ? 'cursor-not-allowed border-border bg-muted text-muted-foreground line-through'
                        : 'border-border bg-card text-foreground hover:border-input')}
                    title={preso ? 'Già prenotato in questa fascia' : `${t.posti} posti`}>
                    {t.numero}<span className="ml-1 text-xs text-muted-foreground">{t.posti}p</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Canale</Label>
              <Select value={f.canale} onValueChange={(v) => setF({ ...f, canale: v })}>
                <SelectTrigger aria-label="Canale"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CANALE_PRENOTAZIONE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="pr-occ">Occasione</Label>
              <Input id="pr-occ" value={f.occasione} onChange={set('occasione')} placeholder="Compleanno, anniversario…" /></div>
            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select value={f.stato} onValueChange={(v) => setF({ ...f, stato: v })}>
                <SelectTrigger aria-label="Stato"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PRENOTAZIONE_STATO).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Allergie comunicate</Label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Allergie">
              {ALLERGENI.map((a) => {
                const sel = allergie.includes(a.valore)
                return (
                  <button key={a.valore} type="button" aria-pressed={sel}
                    onClick={() => setAllergie(sel ? allergie.filter((x) => x !== a.valore) : [...allergie, a.valore])}
                    className={cn('rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                      sel ? 'border-destructive bg-destructive-tenue text-destructive-testo' : 'border-border text-muted-foreground hover:text-foreground')}>
                    {a.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label htmlFor="pr-intol">Intolleranze</Label><Input id="pr-intol" value={f.intolleranze} onChange={set('intolleranze')} /></div>
            <div className="space-y-1.5"><Label htmlFor="pr-rich">Richieste speciali</Label>
              <Input id="pr-rich" value={f.richieste} onChange={set('richieste')} placeholder="Seggiolone, tavolo all'aperto…" /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="pr-note">Note</Label><Textarea id="pr-note" rows={2} value={f.note} onChange={set('note')} /></div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={salva.isPending}>{salva.isPending ? 'Salvataggio…' : prenotazione ? 'Salva' : 'Prenota'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
