/**
 * Housekeeping (documento Hotel §19–21, §23, §41): pulizie del giorno da
 * tablet (inizia, finita, verifica della governante, da rifare, anomalie),
 * generazione da arrivi e partenze e assegnazione bilanciata; biancheria con
 * lavanderia e perdite; segnalazioni di manutenzione; oggetti smarriti.
 */
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, CircleCheck, Play, RotateCcw, Sparkles, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { FotoDialog } from '@/modules/hotel/componenti/FotoDialog'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/lib/queries/users'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useSalva, useInserisci, useAzione, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { useCatalogoHotel, type Pulizia } from '@/modules/hotel/queries'
import {
  BIANCHERIA_TIPO, MANUTENZIONE_CATEGORIA, MANUTENZIONE_STATO, OGGETTO_STATO, PRIORITA, PULIZIA_STATO, PULIZIA_TIPO,
  fmtData, fmtEuro, oggiIso,
} from '@/modules/hotel/stati'

type BiancheriaStato = Database['public']['Views']['hotel_biancheria_stato']['Row']
const TABELLE_PULIZIE = ['hotel_pulizie', 'hotel_camere', 'hotel_camere_stato', 'hotel_manutenzioni']

export function HousekeepingPage() {
  return <ConStruttura><Housekeeping_ /></ConStruttura>
}

function Housekeeping_() {
  return (
    <div>
      <PageHeader title="Housekeeping" description="Pulizie del giorno, biancheria, guasti e oggetti smarriti." actions={<SelettoreStruttura />} />
      <Tabs defaultValue="pulizie">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="pulizie">Pulizie</TabsTrigger><TabsTrigger value="manutenzioni">Guasti e manutenzioni</TabsTrigger>
          <TabsTrigger value="biancheria">Biancheria</TabsTrigger><TabsTrigger value="smarriti">Oggetti smarriti</TabsTrigger>
        </TabsList>
        <TabsContent value="pulizie"><Pulizie /></TabsContent>
        <TabsContent value="manutenzioni"><Manutenzioni /></TabsContent>
        <TabsContent value="biancheria"><Biancheria /></TabsContent>
        <TabsContent value="smarriti"><Smarriti /></TabsContent>
      </Tabs>
    </div>
  )
}

function Pulizie() {
  const { strutturaId } = useHotel()
  const { user, isManager } = useAuth()
  const { camere } = useCatalogoHotel(strutturaId)
  const { data: persone = [] } = useUsers()
  useDalVivo(['hotel_pulizie', 'hotel_camere'])
  const [giorno, setGiorno] = useState(oggiIso())
  const [solo, setSolo] = useState<'mie' | 'tutte'>(isManager ? 'tutte' : 'mie')
  const { data: pulizie = [], isLoading } = useElenco<Pulizia>('hotel_pulizie', {
    filtri: { struttura_id: strutturaId ?? undefined, data: giorno }, ordine: [{ colonna: 'priorita', crescente: false }], abilitato: !!strutturaId,
  })
  const salva = useSalva('hotel_pulizie', TABELLE_PULIZIE)
  const genera = useAzione('hotel_genera_pulizie', TABELLE_PULIZIE)
  const assegna = useAzione('hotel_assegna_pulizie', TABELLE_PULIZIE)
  const [squadra, setSquadra] = useState<string[]>([])
  const [anomalia, setAnomalia] = useState<Record<string, string>>({})
  const perId = useMemo(() => new Map(camere.map((c) => [c.id, c])), [camere])
  const numero = (id: string) => perId.get(id)?.numero ?? '—'
  const visibili = useMemo(() => pulizie.filter((p) => solo === 'tutte' || p.assegnata_a === user?.id)
    .sort((a, b) => (a.stato === 'verificata' ? 1 : 0) - (b.stato === 'verificata' ? 1 : 0)
      || (b.priorita === 'alta' ? 1 : 0) - (a.priorita === 'alta' ? 1 : 0)
      || (perId.get(a.camera_id)?.piano ?? 0) - (perId.get(b.camera_id)?.piano ?? 0)
      || (perId.get(a.camera_id)?.numero ?? '').localeCompare(perId.get(b.camera_id)?.numero ?? '', 'it', { numeric: true })),
  [pulizie, solo, user?.id, perId])
  const nome = (id: string | null) => { const u = persone.find((x) => x.id === id); return u ? `${u.nome} ${u.cognome ?? ''}`.trim() : 'Non assegnata' }
  const avanza = (p: Pulizia, stato: string, ok: string) => salva.mutate({ id: p.id, values: { stato } }, {
    onSuccess: () => toast.success(ok), onError: (e) => toast.error(messaggioErrore(e)) })
  const minuti = pulizie.reduce((s, p) => s + (p.stato === 'da_fare' ? p.minuti_previsti ?? 0 : 0), 0)

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label htmlFor="hk-giorno">Giorno</Label>
          <Input id="hk-giorno" type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} className="w-40" /></div>
        <Tabs value={solo} onValueChange={(v) => setSolo(v as 'mie' | 'tutte')}>
          <TabsList><TabsTrigger value="mie">Le mie</TabsTrigger><TabsTrigger value="tutte">Tutte</TabsTrigger></TabsList>
        </Tabs>
        <p className="text-sm text-muted-foreground">{pulizie.filter((p) => p.stato !== 'verificata').length} da completare · circa {minuti} minuti di lavoro</p>
        {isManager && (
          <div className="ml-auto flex flex-wrap items-end gap-2">
            <BottoneScrittura variant="outline" disabled={genera.isPending}
              onClick={() => genera.mutate({ p_struttura: strutturaId!, p_giorno: giorno }, {
                onSuccess: (n) => toast.success(Number(n) ? `${n} pulizie generate da partenze e fermate` : 'Nessuna pulizia nuova da generare'),
                onError: (e) => toast.error(messaggioErrore(e)) })}><Sparkles className="h-4 w-4" /> Genera le pulizie</BottoneScrittura>
          </div>
        )}
      </Card>

      {isManager && pulizie.some((p) => !p.assegnata_a && p.stato === 'da_fare') && (
        <Card className="p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Users className="h-4 w-4" aria-hidden /> Chi pulisce oggi</h3>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {persone.filter((u) => u.attivo).map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={squadra.includes(u.id)} onCheckedChange={(v) => setSquadra(v ? [...squadra, u.id] : squadra.filter((x) => x !== u.id))} />
                {u.nome} {u.cognome ?? ''}
              </label>
            ))}
          </div>
          <BottoneScrittura className="mt-3" variant="outline" disabled={!squadra.length || assegna.isPending}
            onClick={() => assegna.mutate({ p_struttura: strutturaId!, p_giorno: giorno, p_persone: squadra }, {
              onSuccess: (n) => toast.success(`${n} pulizie assegnate, piano per piano`), onError: (e) => toast.error(messaggioErrore(e)) })}>
            Assegna le camere</BottoneScrittura>
        </Card>
      )}

      {isLoading ? <Skeleton className="h-48 w-full" /> : visibili.length === 0 ? (
        <EmptyState icon={Sparkles} title="Nessuna pulizia" filtrato={solo === 'mie' && pulizie.length > 0}
          description={solo === 'mie' && pulizie.length > 0 ? 'Non ne hai di assegnate: guarda «Tutte».' : 'Le pulizie del giorno nascono da partenze, fermate e camere lasciate da pulire.'}
          action={isManager && pulizie.length === 0 ? <Button variant="outline" onClick={() => genera.mutate({ p_struttura: strutturaId!, p_giorno: giorno },
            { onSuccess: (n) => toast.success(`${n} pulizie generate`), onError: (e) => toast.error(messaggioErrore(e)) })}>Genera le pulizie</Button> : undefined} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {visibili.map((p) => {
            const st = PULIZIA_STATO[p.stato]
            return (
              <li key={p.id}>
                <Card className={cn('space-y-3 p-4', p.priorita === 'alta' && p.stato === 'da_fare' && 'border-warning')}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-foreground">Camera {numero(p.camera_id)}</p>
                      <p className="text-sm text-muted-foreground">{PULIZIA_TIPO[p.tipo]}{p.minuti_previsti ? ` · ${p.minuti_previsti} min` : ''}{p.minuti_effettivi ? ` · fatta in ${p.minuti_effettivi} min` : ''}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {p.priorita === 'alta' && p.stato !== 'verificata' && <Badge tone="warning">Arrivo in giornata</Badge>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{nome(p.assegnata_a)}</p>
                  <div className="flex flex-wrap gap-2">
                    {(p.stato === 'da_fare' || p.stato === 'da_rifare') && (
                      <Button size="sm" onClick={() => avanza(p, 'in_corso', `Camera ${numero(p.camera_id)}: pulizia iniziata`)}><Play className="h-3.5 w-3.5" /> Inizia</Button>
                    )}
                    {p.stato === 'in_corso' && (
                      <Button size="sm" onClick={() => avanza(p, 'fatta', `Camera ${numero(p.camera_id)} pulita`)}><CircleCheck className="h-3.5 w-3.5" /> Finita</Button>
                    )}
                    {p.stato === 'fatta' && isManager && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => avanza(p, 'verificata', `Camera ${numero(p.camera_id)} verificata: pronta`)}><CircleCheck className="h-3.5 w-3.5" /> Verifica</Button>
                        <Button size="sm" variant="ghost" onClick={() => avanza(p, 'da_rifare', `Camera ${numero(p.camera_id)} da rifare`)}><RotateCcw className="h-3.5 w-3.5" /> Da rifare</Button>
                      </>
                    )}
                  </div>
                  {p.stato !== 'verificata' && (
                    <div className="flex gap-2">
                      <Input value={anomalia[p.id] ?? ''} onChange={(e) => setAnomalia({ ...anomalia, [p.id]: e.target.value })}
                        placeholder="Anomalia: lampadina, rubinetto…" aria-label={`Anomalia camera ${numero(p.camera_id)}`} className="h-9" />
                      <Button size="sm" variant="outline" disabled={!anomalia[p.id]?.trim()}
                        onClick={() => salva.mutate({ id: p.id, values: { anomalie: anomalia[p.id].trim() } }, {
                          onSuccess: () => { toast.success('Segnalazione mandata alla manutenzione'); setAnomalia({ ...anomalia, [p.id]: '' }) },
                          onError: (e) => toast.error(messaggioErrore(e)) })}><AlertTriangle className="h-3.5 w-3.5" /> Segnala</Button>
                    </div>
                  )}
                  {p.anomalie && <p className="text-xs text-warning-testo">Segnalato: {p.anomalie}</p>}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Manutenzioni() {
  const { strutturaId } = useHotel()
  const { isManager } = useAuth()
  const { camere } = useCatalogoHotel(strutturaId)
  const { data: persone = [] } = useUsers()
  const [tutte, setTutte] = useState(false)
  useDalVivo(['hotel_manutenzioni'])
  const { data: elenco = [], isLoading } = useElenco<Tables<'hotel_manutenzioni'>>('hotel_manutenzioni', {
    filtri: { struttura_id: strutturaId ?? undefined, stato: tutte ? undefined : ['aperta', 'assegnata', 'in_corso'] },
    ordine: [{ colonna: 'created_at', crescente: false }], limite: 300, abilitato: !!strutturaId,
  })
  const salva = useSalva('hotel_manutenzioni', ['hotel_camere', 'hotel_camere_stato'])
  const [n, setN] = useState({ camera: 'nessuna', categoria: 'altro', descrizione: '', priorita: 'media', blocca: false })

  function crea(e: FormEvent) {
    e.preventDefault()
    if (!n.descrizione.trim()) return
    salva.mutate({ values: { struttura_id: strutturaId!, camera_id: n.camera === 'nessuna' ? null : n.camera, categoria: n.categoria,
      descrizione: n.descrizione.trim(), priorita: n.priorita, mette_fuori_servizio: n.blocca } }, {
      onSuccess: () => { toast.success('Segnalazione registrata'); setN({ ...n, descrizione: '', blocca: false }) },
      onError: (err) => toast.error(messaggioErrore(err)) })
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={crea} className="flex flex-wrap items-end gap-3">
          <div className="w-40 space-y-1.5"><Label>Dove</Label>
            <Select value={n.camera} onValueChange={(v) => setN({ ...n, camera: v })}>
              <SelectTrigger aria-label="Camera"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuna">Aree comuni</SelectItem>{camere.map((c) => <SelectItem key={c.id} value={c.id}>Camera {c.numero}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="w-44 space-y-1.5"><Label>Categoria</Label>
            <Select value={n.categoria} onValueChange={(v) => setN({ ...n, categoria: v })}>
              <SelectTrigger aria-label="Categoria"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(MANUTENZIONE_CATEGORIA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="min-w-56 flex-1 space-y-1.5"><Label htmlFor="mn-desc">Problema</Label>
            <Input id="mn-desc" value={n.descrizione} onChange={(e) => setN({ ...n, descrizione: e.target.value })} /></div>
          <div className="w-32 space-y-1.5"><Label>Priorità</Label>
            <Select value={n.priorita} onValueChange={(v) => setN({ ...n, priorita: v })}>
              <SelectTrigger aria-label="Priorità"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PRIORITA).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select></div>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground"><Checkbox checked={n.blocca} onCheckedChange={(v) => setN({ ...n, blocca: v === true })} /> Camera ferma</label>
          <BottoneScrittura type="submit" variant="outline">Segnala</BottoneScrittura>
        </form>
      </Card>
      <div className="flex justify-end"><label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox checked={tutte} onCheckedChange={(v) => setTutte(v === true)} /> Anche risolte</label></div>
      {isLoading ? <Skeleton className="h-40" /> : elenco.length === 0 ? (
        <EmptyState compatto icon={CircleCheck} title="Nessun guasto aperto" filtrato description="Tutto funziona. Le segnalazioni arrivano anche dalle pulizie." />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Segnalazione</TableHead><TableHead>Dove</TableHead><TableHead>Priorità</TableHead><TableHead>Tecnico</TableHead><TableHead>Stato</TableHead>{isManager && <TableHead className="text-right">Costo</TableHead>}<TableHead><span className="sr-only">Foto</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {elenco.map((m) => (
                <TableRow key={m.id}>
                  <TableCell><span className="text-foreground">{m.descrizione}</span><span className="block font-mono text-xs text-muted-foreground">{m.codice} · {MANUTENZIONE_CATEGORIA[m.categoria]}</span></TableCell>
                  <TableCell className="text-muted-foreground">{m.camera_id ? `Camera ${camere.find((c) => c.id === m.camera_id)?.numero}` : 'Aree comuni'}{m.mette_fuori_servizio ? <Badge tone="danger" className="ml-2">Ferma</Badge> : null}</TableCell>
                  <TableCell><Badge tone={PRIORITA[m.priorita].tone}>{PRIORITA[m.priorita].label}</Badge></TableCell>
                  <TableCell>
                    <Select value={m.tecnico_id ?? 'nessuno'} onValueChange={(v) => salva.mutate({ id: m.id, values: { tecnico_id: v === 'nessuno' ? null : v, stato: v === 'nessuno' ? m.stato : m.stato === 'aperta' ? 'assegnata' : m.stato } })}>
                      <SelectTrigger className="h-8 w-40" aria-label="Tecnico"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="nessuno">Da assegnare</SelectItem>{persone.filter((u) => u.attivo).map((u) => <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={m.stato} onValueChange={(v) => salva.mutate({ id: m.id, values: { stato: v } }, { onSuccess: () => v === 'risolta' && toast.success('Risolta: se la camera era ferma torna in vendita') })}>
                      <SelectTrigger className="h-8 w-32" aria-label="Stato"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(MANUTENZIONE_STATO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  {isManager && (
                    <TableCell className="text-right">
                      <Input className="ml-auto h-8 w-24 text-right" inputMode="decimal" defaultValue={m.costo ?? ''} key={m.id + String(m.costo)} aria-label="Costo"
                        onBlur={(e) => { const v = e.target.value.trim(); const num = v ? Number(v.replace(',', '.')) : null
                          if (num !== (m.costo === null ? null : Number(m.costo))) salva.mutate({ id: m.id, values: { costo: num } }) }} />
                    </TableCell>
                  )}
                  <TableCell className="text-right"><FotoDialog entita="hotel_manutenzioni" entitaId={m.id} titolo={`${m.codice ?? 'Guasto'} · ${m.descrizione}`} categorie={['foto', 'rapporto di intervento', 'preventivo']} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Biancheria() {
  const { strutturaId } = useHotel()
  const { isManager } = useAuth()
  const { data: stato = [], isLoading } = useElenco<BiancheriaStato>('hotel_biancheria_stato', { filtri: { struttura_id: strutturaId ?? undefined }, abilitato: !!strutturaId })
  const nuovo = useInserisci('hotel_biancheria', ['hotel_biancheria', 'hotel_biancheria_stato'])
  const movimento = useInserisci('hotel_biancheria_movimenti', ['hotel_biancheria', 'hotel_biancheria_stato'])
  const [m, setM] = useState({ voce: '', tipo: 'invio_lavanderia', quantita: '' })
  const [a, setA] = useState({ tipo: 'lenzuola', descrizione: '', costo: '', lavaggio: '', cicli: '', scorta: '' })
  const num = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : null)
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); if (!m.voce || !(Number(m.quantita) > 0)) return
          movimento.mutate({ biancheria_id: m.voce, tipo: m.tipo, quantita: Number(m.quantita) }, {
            onSuccess: () => { toast.success('Movimento registrato'); setM({ ...m, quantita: '' }) }, onError: (err) => toast.error(messaggioErrore(err)) }) }}
          className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-1.5"><Label>Biancheria</Label>
            <Select value={m.voce} onValueChange={(v) => setM({ ...m, voce: v })}>
              <SelectTrigger aria-label="Biancheria"><SelectValue placeholder="Scegli…" /></SelectTrigger>
              <SelectContent>{stato.map((b) => <SelectItem key={b.biancheria_id!} value={b.biancheria_id!}>{b.descrizione}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="w-48 space-y-1.5"><Label>Movimento</Label>
            <Select value={m.tipo} onValueChange={(v) => setM({ ...m, tipo: v })}>
              <SelectTrigger aria-label="Movimento"><SelectValue /></SelectTrigger>
              <SelectContent>{[['invio_lavanderia', 'Invio in lavanderia'], ['rientro_lavanderia', 'Rientro dalla lavanderia'], ['acquisto', 'Acquisto'], ['perdita', 'Perdita'], ['scarto', 'Scarto (usurato)']]
                .map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="w-28 space-y-1.5"><Label htmlFor="bi-q">Pezzi</Label><Input id="bi-q" type="number" min={1} value={m.quantita} onChange={(e) => setM({ ...m, quantita: e.target.value })} /></div>
          <BottoneScrittura type="submit" variant="outline">Registra</BottoneScrittura>
        </form>
      </Card>
      {isLoading ? <Skeleton className="h-40" /> : stato.length === 0 ? (
        <EmptyState compatto icon={Sparkles} title="Nessun articolo di biancheria" filtrato={!isManager} description={isManager ? 'Aggiungi lenzuola, asciugamani, accappatoi con il loro costo di lavaggio.' : 'Li inserisce la direzione.'}
          action={isManager ? <Button variant="outline" onClick={() => document.getElementById('bi-desc')?.focus()}>Aggiungi il primo</Button> : undefined} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Articolo</TableHead><TableHead className="text-right">Dotazione</TableHead><TableHead className="text-right">In lavanderia</TableHead>
              <TableHead className="text-right">Disponibili</TableHead><TableHead className="text-right">Lavaggi medi</TableHead><TableHead className="text-right">Persi 90 gg</TableHead>{isManager && <TableHead className="text-right">Lavanderia 30 gg</TableHead>}</TableRow></TableHeader>
            <TableBody>{stato.map((b) => (
              <TableRow key={b.biancheria_id}>
                <TableCell><span className="text-foreground">{b.descrizione}</span><span className="block text-xs text-muted-foreground">{BIANCHERIA_TIPO[b.tipo ?? 'altro']}{b.da_sostituire ? ' · da sostituire presto' : ''}</span></TableCell>
                <TableCell numerica>{b.dotazione}</TableCell><TableCell numerica>{b.in_lavanderia}</TableCell>
                <TableCell numerica className={b.sotto_scorta ? 'font-semibold text-warning-testo' : undefined}>{b.disponibili}</TableCell>
                <TableCell numerica>{b.lavaggi_medi ?? '—'}{b.cicli_vita ? ` / ${b.cicli_vita}` : ''}</TableCell>
                <TableCell numerica>{b.persi_90_giorni}</TableCell>
                {isManager && <TableCell numerica>{fmtEuro(b.lavanderia_30_giorni)}</TableCell>}
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
      {isManager && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Nuovo articolo</h3>
          <form onSubmit={(e) => { e.preventDefault(); if (!a.descrizione.trim()) return
            nuovo.mutate({ struttura_id: strutturaId!, tipo: a.tipo, descrizione: a.descrizione.trim(), costo_unitario: num(a.costo), costo_lavaggio: num(a.lavaggio),
              cicli_vita: a.cicli ? Number(a.cicli) : null, scorta_minima: Number(a.scorta) || 0 }, {
              onSuccess: () => { toast.success('Articolo aggiunto: registra l\'acquisto per la dotazione'); setA({ ...a, descrizione: '' }) }, onError: (err) => toast.error(messaggioErrore(err)) }) }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <div className="space-y-1.5"><Label>Tipo</Label>
              <Select value={a.tipo} onValueChange={(v) => setA({ ...a, tipo: v })}><SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(BIANCHERIA_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="bi-desc">Descrizione</Label><Input id="bi-desc" value={a.descrizione} onChange={(e) => setA({ ...a, descrizione: e.target.value })} placeholder="Lenzuolo matrimoniale" /></div>
            <div className="space-y-1.5"><Label htmlFor="bi-c">Costo (€)</Label><Input id="bi-c" inputMode="decimal" value={a.costo} onChange={(e) => setA({ ...a, costo: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="bi-l">Lavaggio (€)</Label><Input id="bi-l" inputMode="decimal" value={a.lavaggio} onChange={(e) => setA({ ...a, lavaggio: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="bi-v">Vita (lavaggi)</Label><Input id="bi-v" type="number" value={a.cicli} onChange={(e) => setA({ ...a, cicli: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="bi-s">Scorta minima</Label><Input id="bi-s" type="number" value={a.scorta} onChange={(e) => setA({ ...a, scorta: e.target.value })} /></div>
            <div className="col-span-2 flex items-end justify-end sm:col-span-5"><BottoneScrittura type="submit" variant="outline">Aggiungi</BottoneScrittura></div>
          </form>
        </Card>
      )}
    </div>
  )
}

function Smarriti() {
  const { strutturaId } = useHotel()
  const { camere } = useCatalogoHotel(strutturaId)
  const { data: oggetti = [], isLoading } = useElenco<Tables<'hotel_oggetti_smarriti'>>('hotel_oggetti_smarriti', {
    filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'trovato_il', crescente: false }], limite: 300, abilitato: !!strutturaId,
  })
  const salva = useSalva('hotel_oggetti_smarriti', ['hotel_oggetti_smarriti'])
  const [o, setO] = useState({ descrizione: '', camera: 'nessuna', area: '', ubicazione: '' })
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); if (!o.descrizione.trim()) return
          salva.mutate({ values: { struttura_id: strutturaId!, descrizione: o.descrizione.trim(), camera_id: o.camera === 'nessuna' ? null : o.camera,
            area: o.area || null, ubicazione: o.ubicazione || null } }, {
            onSuccess: (x) => { toast.success(`${x.codice}: custodito fino al ${fmtData(x.custodia_fino)}`); setO({ descrizione: '', camera: 'nessuna', area: '', ubicazione: '' }) },
            onError: (err) => toast.error(messaggioErrore(err)) }) }} className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5"><Label htmlFor="os-d">Oggetto</Label><Input id="os-d" value={o.descrizione} onChange={(e) => setO({ ...o, descrizione: e.target.value })} placeholder="Caricabatterie bianco" /></div>
          <div className="w-40 space-y-1.5"><Label>Trovato in</Label>
            <Select value={o.camera} onValueChange={(v) => setO({ ...o, camera: v })}><SelectTrigger aria-label="Camera"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuna">Area comune</SelectItem>{camere.map((c) => <SelectItem key={c.id} value={c.id}>Camera {c.numero}</SelectItem>)}</SelectContent></Select></div>
          {o.camera === 'nessuna' && <div className="w-40 space-y-1.5"><Label htmlFor="os-a">Dove</Label><Input id="os-a" value={o.area} onChange={(e) => setO({ ...o, area: e.target.value })} placeholder="Piscina" /></div>}
          <div className="w-48 space-y-1.5"><Label htmlFor="os-u">Custodito in</Label><Input id="os-u" value={o.ubicazione} onChange={(e) => setO({ ...o, ubicazione: e.target.value })} placeholder="Cassaforte reception" /></div>
          <BottoneScrittura type="submit" variant="outline">Registra</BottoneScrittura>
        </form>
      </Card>
      {isLoading ? <Skeleton className="h-40" /> : oggetti.length === 0 ? (
        <EmptyState compatto icon={Sparkles} title="Nessun oggetto smarrito" filtrato description="Gli oggetti trovati restano in custodia con la loro scadenza." />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Oggetto</TableHead><TableHead>Trovato</TableHead><TableHead>Custodia</TableHead><TableHead>Stato</TableHead><TableHead><span className="sr-only">Dettagli</span></TableHead></TableRow></TableHeader>
            <TableBody>{oggetti.map((x) => (
              <TableRow key={x.id}>
                <TableCell><span className="text-foreground">{x.descrizione}</span><span className="block font-mono text-xs text-muted-foreground">{x.codice}</span></TableCell>
                <TableCell className="text-muted-foreground">{fmtData(x.trovato_il)} · {x.camera_id ? `camera ${camere.find((c) => c.id === x.camera_id)?.numero}` : x.area ?? 'area comune'}</TableCell>
                <TableCell className="text-muted-foreground">{x.ubicazione ?? '—'}<span className="block text-xs">fino al {fmtData(x.custodia_fino)}</span></TableCell>
                <TableCell>
                  <Select value={x.stato} onValueChange={(v) => salva.mutate({ id: x.id, values: { stato: v } }, { onSuccess: () => toast.success(OGGETTO_STATO[v].label) })}>
                    <SelectTrigger className="h-8 w-44" aria-label="Stato dell'oggetto"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(OGGETTO_STATO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {x.restituito_il && <span className="mt-1 block text-xs text-muted-foreground">il {fmtData(x.restituito_il)}{x.modalita_restituzione ? ` · ${x.modalita_restituzione}` : ''}</span>}
                </TableCell>
                <TableCell className="text-right">
                  <FotoDialog entita="hotel_oggetti_smarriti" entitaId={x.id} titolo={`${x.codice ?? 'Oggetto'} · ${x.descrizione}`} categorie={['foto', 'ricevuta di restituzione']}>
                    <Restituzione oggetto={x} />
                  </FotoDialog>
                </TableCell>
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

/** Proprietario e restituzione dell'oggetto (§41): a chi, come, con quale spedizione. */
function Restituzione({ oggetto: x }: { oggetto: Tables<'hotel_oggetti_smarriti'> }) {
  const salva = useSalva('hotel_oggetti_smarriti', ['hotel_oggetti_smarriti'])
  const [r, setR] = useState({ proprietario: x.proprietario ?? '', modalita: x.modalita_restituzione ?? '', spedizione: x.spedizione ?? '' })
  return (
    <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault()
      salva.mutate({ id: x.id, values: { proprietario: r.proprietario.trim() || null, modalita_restituzione: r.modalita.trim() || null, spedizione: r.spedizione.trim() || null } },
        { onSuccess: () => toast.success('Dati della restituzione salvati'), onError: (err) => toast.error(messaggioErrore(err)) }) }}>
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`os-p-${x.id}`}>Proprietario e recapito</Label>
        <Input id={`os-p-${x.id}`} value={r.proprietario} onChange={(e) => setR({ ...r, proprietario: e.target.value })} placeholder="Chi lo reclama, telefono o email" /></div>
      <div className="space-y-1.5"><Label htmlFor={`os-m-${x.id}`}>Modalità di restituzione</Label>
        <Input id={`os-m-${x.id}`} value={r.modalita} onChange={(e) => setR({ ...r, modalita: e.target.value })} placeholder="Ritirato in reception, spedito…" /></div>
      <div className="space-y-1.5"><Label htmlFor={`os-s-${x.id}`}>Spedizione</Label>
        <Input id={`os-s-${x.id}`} value={r.spedizione} onChange={(e) => setR({ ...r, spedizione: e.target.value })} placeholder="Corriere e numero di tracciamento" /></div>
      <div className="flex justify-end sm:col-span-2"><BottoneScrittura type="submit" variant="outline" disabled={salva.isPending}>Salva</BottoneScrittura></div>
    </form>
  )
}
