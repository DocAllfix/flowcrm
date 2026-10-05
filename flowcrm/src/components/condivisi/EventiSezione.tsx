/**
 * Eventi (fondamenta F0.8): matrimoni, cene aziendali, compleanni, corsi,
 * tornei, cerimonie. Programma e invitati (con allergie per la cucina) per
 * tutti; il personale assegnato diventa un turno; preventivo, voci di costo
 * e ricavo e margine solo per la direzione.
 */
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarHeart, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { supabase, type Tables } from '@/lib/supabase'
import { useElenco, useInserisci, useSalva, useElimina, useRpc, messaggioErrore } from '@/lib/queries/fondamenta'
import { CercaContatto } from '@/components/condivisi/CercaContatto'
import type { Database } from '@/types/database.types'

type Evento = Tables<'eventi'>
type Preventivo = Tables<'eventi_preventivi'>
type Voce = Tables<'eventi_voci'>
type Personale = Tables<'eventi_personale'>
type Partecipante = Tables<'eventi_partecipanti'>
type Margine = Database['public']['Views']['eventi_margini']['Row']
type AllergeneEvento = Database['public']['Views']['eventi_allergeni']['Row']
interface Persona { id: string; nome: string; cognome: string | null; qualifica: string | null }

const STATI: { valore: Evento['stato']; label: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'primary' }[] = [
  { valore: 'richiesta', label: 'Richiesta', tone: 'warning' }, { valore: 'preventivo', label: 'Preventivo', tone: 'info' },
  { valore: 'confermato', label: 'Confermato', tone: 'primary' }, { valore: 'in_corso', label: 'In corso', tone: 'primary' },
  { valore: 'concluso', label: 'Concluso', tone: 'success' }, { valore: 'annullato', label: 'Annullato', tone: 'neutral' },
]
const CATEGORIE_VOCE: Record<string, string> = { menu: 'Menu', bevande: 'Bevande', allestimento: 'Allestimento', personale: 'Personale', fiori: 'Fiori',
  musica: 'Musica', noleggio: 'Noleggio', location: 'Location', trasporto: 'Trasporto', altro: 'Altro' }
const n = (s: string) => Number(s.replace(',', '.'))
const euro = (v: number | string | null | undefined) => v == null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(v))
const giornoOra = (s: string) => new Date(s).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

interface Props {
  modulo: string
  tipi: string[]
  etichettaAllergene?: (v: string) => string
  allergeni?: { valore: string; label: string }[]
}

export function EventiSezione({ modulo, tipi, etichettaAllergene = (v) => v, allergeni = [] }: Props) {
  const { data: eventi = [] } = useElenco<Evento>('eventi', { filtri: { modulo }, ordine: [{ colonna: 'inizio' }] })
  const salva = useSalva('eventi')
  const [sceltoId, setSceltoId] = useState<string | null>(null)
  const [vista, setVista] = useState<'prossimi' | 'tutti'>('prossimi')
  const [f, setF] = useState({ titolo: '', tipo: tipi[0] ?? '', data: '', dalle: '19:00', alle: '23:30', persone: '' })
  const scelto = eventi.find((e) => e.id === sceltoId) ?? null
  const elenco = eventi.filter((e) => vista === 'tutti' || (new Date(e.fine) >= new Date() && e.stato !== 'annullato'))

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.titolo.trim() || !f.data) { toast.error('Titolo e data'); return }
    const inizio = new Date(`${f.data}T${f.dalle}`)
    const fine = new Date(`${f.data}T${f.alle}`); if (fine <= inizio) fine.setDate(fine.getDate() + 1)
    try {
      const ev = await salva.mutateAsync({ values: { modulo, titolo: f.titolo.trim(), tipo: f.tipo || null, inizio: inizio.toISOString(), fine: fine.toISOString(),
        partecipanti_previsti: f.persone ? Number(f.persone) : null } })
      setSceltoId(ev.id); setF({ ...f, titolo: '', data: '', persone: '' })
    } catch (err) { toast.error(messaggioErrore(err)) }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={crea} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-1.5"><Label htmlFor="ev-t">Nuovo evento</Label><Input id="ev-t" value={f.titolo} onChange={(e) => setF({ ...f, titolo: e.target.value })} placeholder="Matrimonio Rossi – Bianchi" /></div>
          <div className="w-40 space-y-1.5"><Label>Tipo</Label><Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
            <SelectContent>{tipi.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
          <div className="w-40 space-y-1.5"><Label htmlFor="ev-d">Data</Label><Input id="ev-d" type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
          <div className="w-28 space-y-1.5"><Label htmlFor="ev-i">Dalle</Label><Input id="ev-i" type="time" value={f.dalle} onChange={(e) => setF({ ...f, dalle: e.target.value })} /></div>
          <div className="w-28 space-y-1.5"><Label htmlFor="ev-f">Alle</Label><Input id="ev-f" type="time" value={f.alle} onChange={(e) => setF({ ...f, alle: e.target.value })} /></div>
          <div className="w-24 space-y-1.5"><Label htmlFor="ev-p">Persone</Label><Input id="ev-p" type="number" min={1} value={f.persone} onChange={(e) => setF({ ...f, persone: e.target.value })} /></div>
          <BottoneScrittura type="submit"><Plus className="h-4 w-4" /> Crea</BottoneScrittura>
        </form>
      </Card>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden">
          <div className="flex gap-1 border-b border-border p-2">
            {(['prossimi', 'tutti'] as const).map((v) => <Button key={v} size="sm" variant={vista === v ? 'default' : 'ghost'} onClick={() => setVista(v)}>{v === 'prossimi' ? 'In programma' : 'Tutti'}</Button>)}
          </div>
          {elenco.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">Nessun evento in programma.</p> : (
            <ul className="max-h-[65vh] divide-y divide-border overflow-y-auto">
              {elenco.map((e) => {
                const st = STATI.find((s) => s.valore === e.stato)
                return (
                  <li key={e.id}><button type="button" onClick={() => setSceltoId(e.id)} aria-current={e.id === sceltoId}
                    className={cn('flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted/50', e.id === sceltoId && 'bg-muted')}>
                    <span className="min-w-0"><span className="block truncate font-medium text-foreground">{e.titolo}</span>
                      <span className="block text-xs text-muted-foreground">{giornoOra(e.inizio)}{e.partecipanti_previsti ? ` · ${e.partecipanti_confermati ?? e.partecipanti_previsti} persone` : ''}</span></span>
                    {st && <Badge tone={st.tone}>{st.label}</Badge>}
                  </button></li>
                )
              })}
            </ul>
          )}
        </Card>
        {scelto ? <DettaglioEvento evento={scelto} modulo={modulo} etichettaAllergene={etichettaAllergene} allergeni={allergeni} />
          : <EmptyState icon={CalendarHeart} filtrato title="Scegli un evento" description="Programma, invitati e allergie, personale, preventivo e margine." />}
      </div>
    </div>
  )
}

function DettaglioEvento({ evento, modulo, etichettaAllergene, allergeni }: { evento: Evento; modulo: string; etichettaAllergene: (v: string) => string; allergeni: { valore: string; label: string }[] }) {
  const { isManager } = useAuth()
  const salva = useSalva('eventi', ['eventi_margini', 'turni'])
  const [programma, setProgramma] = useState(evento.programma ?? '')
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-title text-foreground">{evento.titolo}</h2>
          <p className="text-sm text-muted-foreground">{evento.codice} · {giornoOra(evento.inizio)} – {new Date(evento.fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}{evento.tipo ? ` · ${evento.tipo}` : ''}</p>
        </div>
        <Select value={evento.stato} onValueChange={(v) => salva.mutate({ id: evento.id, values: { stato: v as Evento['stato'] } }, { onError: (e) => toast.error(messaggioErrore(e)) })}>
          <SelectTrigger className="w-40" aria-label="Stato dell'evento"><SelectValue /></SelectTrigger>
          <SelectContent>{STATI.map((s) => <SelectItem key={s.valore} value={s.valore}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Tabs defaultValue="programma">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="programma">Programma</TabsTrigger>
          <TabsTrigger value="invitati">Invitati</TabsTrigger>
          <TabsTrigger value="personale">Personale</TabsTrigger>
          {isManager && <TabsTrigger value="economia">Preventivo e margine</TabsTrigger>}
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
        </TabsList>
        <TabsContent value="programma" className="space-y-3">
          <ClienteEvento evento={evento} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="ed-pp">Partecipanti previsti</Label>
              <Input id="ed-pp" type="number" defaultValue={evento.partecipanti_previsti ?? ''} key={`pp-${evento.id}`} onBlur={(e) => salva.mutate({ id: evento.id, values: { partecipanti_previsti: e.target.value ? Number(e.target.value) : null } })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ed-pc">Confermati</Label>
              <Input id="ed-pc" type="number" defaultValue={evento.partecipanti_confermati ?? ''} key={`pc-${evento.id}`} onBlur={(e) => salva.mutate({ id: evento.id, values: { partecipanti_confermati: e.target.value ? Number(e.target.value) : null } })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ed-l">Luogo o sala</Label>
              <Input id="ed-l" defaultValue={evento.luogo ?? ''} key={`l-${evento.id}`} onBlur={(e) => salva.mutate({ id: evento.id, values: { luogo: e.target.value || null } })} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="ed-pr">Programma, menu, allestimento</Label>
            <Textarea id="ed-pr" rows={8} value={programma} onChange={(e) => setProgramma(e.target.value)} onBlur={() => salva.mutate({ id: evento.id, values: { programma: programma || null } })}
              placeholder="Aperitivo in giardino alle 19, cena alle 20.30: menu, vini, torta, musica, fiori, tavoli…" /></div>
        </TabsContent>
        <TabsContent value="invitati"><Invitati evento={evento} etichettaAllergene={etichettaAllergene} allergeni={allergeni} /></TabsContent>
        <TabsContent value="personale"><PersonaleEvento evento={evento} modulo={modulo} /></TabsContent>
        {isManager && <TabsContent value="economia"><Economia evento={evento} /></TabsContent>}
        <TabsContent value="documenti"><AllegatiSection entita="eventi" entitaId={evento.id} categorie={['contratto', 'preventivo', 'menu', 'planimetria', 'altro']} /></TabsContent>
      </Tabs>
    </Card>
  )
}

function Invitati({ evento, etichettaAllergene, allergeni }: { evento: Evento; etichettaAllergene: (v: string) => string; allergeni: { valore: string; label: string }[] }) {
  const { data: invitati = [] } = useElenco<Partecipante>('eventi_partecipanti', { filtri: { evento_id: evento.id }, ordine: [{ colonna: 'gruppo' }, { colonna: 'nome' }] })
  const { data: perAllergene = [] } = useElenco<AllergeneEvento>('eventi_allergeni', { filtri: { evento_id: evento.id } })
  const aggiungi = useInserisci('eventi_partecipanti', ['eventi_allergeni'])
  const salva = useSalva('eventi_partecipanti', ['eventi_allergeni'])
  const togli = useElimina('eventi_partecipanti', ['eventi_allergeni'])
  const [f, setF] = useState({ nome: '', gruppo: '', esigenze: '' })
  const [sel, setSel] = useState<string[]>([])
  return (
    <div className="space-y-3">
      {perAllergene.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-sm"><span className="text-muted-foreground">Per la cucina:</span>
          {perAllergene.map((a) => <Badge key={a.allergene} tone="danger">{etichettaAllergene(a.allergene ?? '')} × {a.persone}</Badge>)}</p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <Input className="min-w-40 flex-1" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Nome" aria-label="Nome dell'invitato" />
        <Input className="w-32" value={f.gruppo} onChange={(e) => setF({ ...f, gruppo: e.target.value })} placeholder="Tavolo, squadra…" aria-label="Gruppo" />
        <Input className="w-48" value={f.esigenze} onChange={(e) => setF({ ...f, esigenze: e.target.value })} placeholder="Vegetariano, senza glutine…" aria-label="Esigenze alimentari" />
        <BottoneScrittura variant="outline" disabled={!f.nome.trim()} onClick={() => aggiungi.mutate({ evento_id: evento.id, modulo: evento.modulo, nome: f.nome.trim(), gruppo: f.gruppo || null,
          esigenze_alimentari: f.esigenze || null, allergeni: sel }, { onSuccess: () => { setF({ nome: '', gruppo: f.gruppo, esigenze: '' }); setSel([]) }, onError: (e) => toast.error(messaggioErrore(e)) })}>Aggiungi</BottoneScrittura>
      </div>
      {allergeni.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Allergie dell'invitato">
          {allergeni.map((a) => <button key={a.valore} type="button" aria-pressed={sel.includes(a.valore)} onClick={() => setSel(sel.includes(a.valore) ? sel.filter((x) => x !== a.valore) : [...sel, a.valore])}
            className={cn('rounded-full border px-2 py-0.5 text-xs', sel.includes(a.valore) ? 'border-destructive bg-destructive-tenue text-destructive-testo' : 'border-border text-muted-foreground')}>{a.label}</button>)}
        </div>
      )}
      {invitati.length > 0 && (
        <Table>
          <TableHeader><TableRow><TableHead>Invitato</TableHead><TableHead>Gruppo</TableHead><TableHead>Allergie ed esigenze</TableHead><TableHead>Confermato</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {invitati.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-foreground">{p.nome}</TableCell>
                <TableCell className="text-muted-foreground">{p.gruppo ?? '—'}</TableCell>
                <TableCell className="text-xs">{[...p.allergeni.map(etichettaAllergene), p.esigenze_alimentari].filter(Boolean).join(', ') || '—'}</TableCell>
                <TableCell><Switch checked={p.confermato} aria-label={`${p.nome} confermato`} onCheckedChange={(v) => salva.mutate({ id: p.id, values: { confermato: v } })} /></TableCell>
                <TableCell numerica><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Togli ${p.nome}`} onClick={() => togli.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function PersonaleEvento({ evento, modulo }: { evento: Evento; modulo: string }) {
  const { isManager } = useAuth()
  const { data: persone = [] } = useRpc<Persona[]>('turni_persone', { p_modulo: modulo })
  const { data: assegnati = [] } = useElenco<Personale>('eventi_personale', { filtri: { evento_id: evento.id } })
  const aggiungi = useInserisci('eventi_personale', ['turni'])
  const togli = useElimina('eventi_personale', ['turni'])
  const ora = (s: string) => new Date(s).toTimeString().slice(0, 5)
  const [f, setF] = useState({ persona: '', ruolo: '', dalle: ora(evento.inizio), alle: ora(evento.fine) })
  const istante = (hhmm: string, rif: string) => { const d = new Date(rif); const [h, m] = hhmm.split(':').map(Number); d.setHours(h, m, 0, 0); return d }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Ogni persona assegnata riceve un turno: chi è già in servizio altrove o in ferie non si può assegnare.</p>
      {isManager && (
        <div className="flex flex-wrap items-end gap-2">
          <Select value={f.persona} onValueChange={(v) => setF({ ...f, persona: v })}><SelectTrigger className="w-52" aria-label="Persona"><SelectValue placeholder="Persona…" /></SelectTrigger>
            <SelectContent>{persone.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} {p.cognome ?? ''}</SelectItem>)}</SelectContent></Select>
          <Input className="w-36" value={f.ruolo} onChange={(e) => setF({ ...f, ruolo: e.target.value })} placeholder="Ruolo" aria-label="Ruolo" />
          <Input className="w-28" type="time" value={f.dalle} onChange={(e) => setF({ ...f, dalle: e.target.value })} aria-label="Dalle" />
          <Input className="w-28" type="time" value={f.alle} onChange={(e) => setF({ ...f, alle: e.target.value })} aria-label="Alle" />
          <BottoneScrittura variant="outline" disabled={!f.persona} onClick={() => {
            const inizio = istante(f.dalle, evento.inizio); const fine = istante(f.alle, evento.inizio); if (fine <= inizio) fine.setDate(fine.getDate() + 1)
            aggiungi.mutate({ evento_id: evento.id, modulo: evento.modulo, dipendente_id: f.persona, ruolo: f.ruolo || null, inizio: inizio.toISOString(), fine: fine.toISOString() },
              { onSuccess: () => { setF({ ...f, persona: '', ruolo: '' }); toast.success('Assegnato: il turno è in calendario') }, onError: (e) => toast.error(messaggioErrore(e)) })
          }}>Assegna</BottoneScrittura>
        </div>
      )}
      <ul className="divide-y divide-border text-sm">
        {assegnati.map((a) => {
          const p = persone.find((x) => x.id === a.dipendente_id)
          return (
            <li key={a.id} className="flex items-center justify-between gap-2 py-2">
              <span><span className="font-medium text-foreground">{p ? `${p.nome} ${p.cognome ?? ''}` : 'Persona'}</span>{a.ruolo ? ` · ${a.ruolo}` : ''}</span>
              <span className="flex items-center gap-2 tabular-nums text-muted-foreground">{ora(a.inizio)}–{ora(a.fine)}
                {isManager && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Togli dall'evento" onClick={() => togli.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Economia({ evento }: { evento: Evento }) {
  const { data: prev = [] } = useElenco<Preventivo>('eventi_preventivi', { filtri: { evento_id: evento.id } })
  const { data: voci = [] } = useElenco<Voce>('eventi_voci', { filtri: { evento_id: evento.id }, ordine: [{ colonna: 'categoria' }] })
  const { data: margini = [] } = useElenco<Margine>('eventi_margini', { filtri: { evento_id: evento.id } })
  const salvaPrev = useSalva('eventi_preventivi', ['eventi_margini', 'scadenze_moduli'])
  const aggiungi = useInserisci('eventi_voci', ['eventi_margini'])
  const togli = useElimina('eventi_voci', ['eventi_margini'])
  const p = prev[0]
  const m = margini[0]
  const [v, setV] = useState({ categoria: 'menu', descrizione: '', quantita: '1', costo: '', prezzo: '', fornitore: '' })
  const aziende = useAziende()
  const campo = (k: keyof Preventivo, etichetta: string, tipo = 'decimal') => (
    <div className="space-y-1.5"><Label htmlFor={`pv-${k}`}>{etichetta}</Label>
      <Input id={`pv-${k}`} type={tipo === 'date' ? 'date' : 'text'} inputMode={tipo === 'date' ? undefined : 'decimal'} key={`${k}-${p?.id ?? 'nuovo'}`}
        defaultValue={(p?.[k] as string | number | null) ?? ''} onBlur={(e) => {
          const val = e.target.value === '' ? null : tipo === 'date' ? e.target.value : n(e.target.value)
          salvaPrev.mutate({ id: p?.id, values: { ...(p ? {} : { evento_id: evento.id, modulo: evento.modulo }), [k]: val } }, { onError: (err) => toast.error(messaggioErrore(err)) })
        }} /></div>
  )
  return (
    <div className="space-y-4">
      <ContoEvento evento={evento} preventivo={p} voci={voci} />
      {m && (
        <dl className="flex flex-wrap gap-8 rounded-lg bg-muted/50 px-4 py-3">
          <div><dt className="text-sm text-muted-foreground">Ricavi</dt><dd data-slot="kpi" className="text-title">{euro(m.ricavi)}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Costi</dt><dd data-slot="kpi" className="text-title">{euro(m.costi)}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Margine</dt><dd data-slot="kpi" className={cn('text-title', Number(m.margine) < 0 ? 'text-destructive-testo' : 'text-foreground')}>{euro(m.margine)}</dd></div>
        </dl>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {campo('prezzo_persona', 'Prezzo a persona (€)')}{campo('prezzo_forfait', 'Oppure forfait (€)')}{campo('sconto', 'Sconto (€)')}{campo('budget_cliente', 'Budget del cliente (€)')}
        {campo('acconto', 'Acconto (€)')}{campo('acconto_scadenza', 'Acconto entro il', 'date')}{campo('acconto_pagato_at', 'Acconto pagato il', 'date')}
      </div>
      <div>
        <h3 className="mb-2 text-label uppercase text-muted-foreground">Voci di costo e ricavo</h3>
        <div className="mb-2 flex flex-wrap items-end gap-2">
          <Select value={v.categoria} onValueChange={(x) => setV({ ...v, categoria: x })}><SelectTrigger className="w-36" aria-label="Categoria"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(CATEGORIE_VOCE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
          <Input className="min-w-40 flex-1" value={v.descrizione} onChange={(e) => setV({ ...v, descrizione: e.target.value })} placeholder="Menu nozze, centrotavola, duo acustico…" aria-label="Descrizione" />
          <Input className="w-20" inputMode="decimal" value={v.quantita} onChange={(e) => setV({ ...v, quantita: e.target.value })} aria-label="Quantità" />
          <Input className="w-28" inputMode="decimal" value={v.costo} onChange={(e) => setV({ ...v, costo: e.target.value })} placeholder="Costo €" aria-label="Costo unitario" />
          <Input className="w-28" inputMode="decimal" value={v.prezzo} onChange={(e) => setV({ ...v, prezzo: e.target.value })} placeholder="Prezzo €" aria-label="Prezzo unitario" />
          <Select value={v.fornitore || 'nessuno'} onValueChange={(x) => setV({ ...v, fornitore: x === 'nessuno' ? '' : x })}>
            <SelectTrigger className="w-44" aria-label="Fornitore"><SelectValue placeholder="Fornitore" /></SelectTrigger>
            <SelectContent><SelectItem value="nessuno">Nessun fornitore</SelectItem>{aziende.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}</SelectContent>
          </Select>
          <BottoneScrittura variant="outline" disabled={!v.descrizione.trim()} onClick={() => aggiungi.mutate({ evento_id: evento.id, modulo: evento.modulo, categoria: v.categoria as Voce['categoria'],
            descrizione: v.descrizione.trim(), quantita: n(v.quantita) || 1, costo_unitario: n(v.costo) || 0, prezzo_unitario: n(v.prezzo) || 0, fornitore_id: v.fornitore || null },
            { onSuccess: () => setV({ ...v, descrizione: '', costo: '', prezzo: '' }), onError: (e) => toast.error(messaggioErrore(e)) })}>Aggiungi</BottoneScrittura>
        </div>
        {voci.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Voce</TableHead><TableHead className="text-right">Quantità</TableHead><TableHead className="text-right">Costo</TableHead><TableHead className="text-right">Ricavo</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {voci.map((x) => (
                <TableRow key={x.id}>
                  <TableCell><span className="text-foreground">{x.descrizione}</span><span className="block text-xs text-muted-foreground">{CATEGORIE_VOCE[x.categoria]}{x.fornitore_id ? ` · ${aziende.find((o) => o.id === x.fornitore_id)?.ragione_sociale ?? ''}` : ''}</span></TableCell>
                  <TableCell numerica>{Number(x.quantita)}</TableCell><TableCell numerica>{euro(x.costo)}</TableCell><TableCell numerica>{euro(x.ricavo)}</TableCell>
                  <TableCell numerica><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Togli la voce" onClick={() => togli.mutate(x.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

function useAziende() {
  return useElenco<Pick<Tables<'organizzazioni'>, 'id' | 'ragione_sociale'>>('organizzazioni', {
    filtri: { attivo: true }, select: 'id, ragione_sociale', ordine: [{ colonna: 'ragione_sociale' }], limite: 1000 }).data ?? []
}

function ClienteEvento({ evento }: { evento: Evento }) {
  const salva = useSalva('eventi')
  const aziende = useAziende()
  const { data: contatti = [] } = useElenco<Pick<Tables<'contatti'>, 'id' | 'nome' | 'cognome'>>('contatti', {
    filtri: { id: evento.contatto_id ?? undefined }, select: 'id, nome, cognome', abilitato: !!evento.contatto_id })
  const cliente = contatti[0]
  const [nome, setNome] = useState('')
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="ev-cliente">Cliente</Label>
        <CercaContatto id="ev-cliente" valore={cliente ? `${cliente.nome} ${cliente.cognome ?? ''}`.trim() : nome} contattoId={evento.contatto_id}
          onTesto={(v) => { setNome(v); if (evento.contatto_id) salva.mutate({ id: evento.id, values: { contatto_id: null } }) }}
          onScegli={(k) => salva.mutate({ id: evento.id, values: { contatto_id: k.id } })} /></div>
      <div className="space-y-1.5"><Label>Azienda (per la fattura)</Label>
        <Select value={evento.organizzazione_id ?? 'nessuna'} onValueChange={(v) => salva.mutate({ id: evento.id, values: { organizzazione_id: v === 'nessuna' ? null : v } })}>
          <SelectTrigger aria-label="Azienda"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="nessuna">Privato</SelectItem>{aziende.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}</SelectContent>
        </Select></div>
    </div>
  )
}

/** Il conto dell'evento nasce dal preventivo: da lì si incassa (acconto e saldo) e si emette la fattura. */
function ContoEvento({ evento, preventivo, voci }: { evento: Evento; preventivo?: Preventivo; voci: Voce[] }) {
  const navigate = useNavigate()
  const salva = useSalva('eventi')
  const [inCorso, setInCorso] = useState(false)
  const ALIQUOTA_22 = ['fiori', 'musica', 'noleggio', 'allestimento', 'trasporto', 'location']
  async function crea() {
    if (!preventivo) { toast.error('Compila prima il preventivo'); return }
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const io = auth.user!.id
      const { data: conto, error } = await supabase.from('conti').insert({ modulo: evento.modulo, descrizione: `Evento: ${evento.titolo}`, riferimento_tipo: 'eventi',
        riferimento_id: evento.id, contatto_id: evento.contatto_id, organizzazione_id: evento.organizzazione_id,
        coperti: evento.partecipanti_confermati ?? evento.partecipanti_previsti, sconto_importo: Number(preventivo.sconto) || 0, created_by: io }).select('id').single()
      if (error) throw error
      const persone = evento.partecipanti_confermati ?? evento.partecipanti_previsti ?? 0
      const righe = [
        ...(preventivo.prezzo_forfait != null ? [{ descrizione: `${evento.titolo} (forfait)`, quantita: 1, prezzo_unitario: Number(preventivo.prezzo_forfait), aliquota_iva: 10 }]
          : preventivo.prezzo_persona != null && persone > 0 ? [{ descrizione: `Menu ${evento.titolo}`, quantita: persone, prezzo_unitario: Number(preventivo.prezzo_persona), aliquota_iva: 10 }] : []),
        ...voci.filter((x) => Number(x.prezzo_unitario) > 0).map((x) => ({ descrizione: x.descrizione, quantita: Number(x.quantita), prezzo_unitario: Number(x.prezzo_unitario),
          aliquota_iva: ALIQUOTA_22.includes(x.categoria) ? 22 : 10 })),
      ]
      if (righe.length) {
        const { error: e2 } = await supabase.from('conti_righe').insert(righe.map((r) => ({ ...r, conto_id: conto.id, modulo: evento.modulo,
          riferimento_tipo: 'eventi', riferimento_id: evento.id, created_by: io })))
        if (e2) throw e2
      }
      await salva.mutateAsync({ id: evento.id, values: { conto_id: conto.id } })
      toast.success("Conto dell'evento creato: si incassa e si fattura dalla cassa")
    } catch (e) { toast.error(messaggioErrore(e)) } finally { setInCorso(false) }
  }
  return evento.conto_id ? (
    <Button variant="outline" onClick={() => navigate(`/${evento.modulo}/cassa?conto=${evento.conto_id}`)}>Apri il conto dell'evento (acconto, saldo, fattura)</Button>
  ) : (
    <BottoneScrittura variant="outline" onClick={crea} disabled={inCorso || !preventivo}>Crea il conto dell'evento dal preventivo</BottoneScrittura>
  )
}
