/**
 * Chiavi in custodia (§15), danni e anomalie (§16), colonnine e ricariche
 * (§19), servizi aggiuntivi (§20) e deposito pneumatici (§21).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, History, KeyRound, Pencil, Play, Plug, Plus, ShieldAlert, Sparkles, Disc3 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { FotoDialog } from '@/components/condivisi/FotoDialog'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useElenco, useSalva, useInserisci, useAzione, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { useGarage } from '@/modules/garage/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/garage/componenti/ConStruttura'
import { useAnagrafica, nomeCliente, TABELLE_SOSTA, type Chiave, type ColonninaStato, type Danno, type MovimentoChiave, type Pneumatici, type Ricarica,
  type Servizio, type Sosta, type VoceListino } from '@/modules/garage/queries'
import { CHIAVE_MOVIMENTO, CHIAVE_STATO, COLONNINA_STATO, DANNO_STATO, DANNO_TIPO, PNEUMATICI_STATO, RESPONSABILITA, RICARICA_STATO, SERVIZIO_CATEGORIA, SERVIZIO_STATO,
  STAGIONE, campoNumero, durata, fmtData, fmtEuro, fmtGiornoOra, fmtNumero, isoLocale, minutiDa, normalizzaTarga, numero, numeroONull, oggiIso } from '@/modules/garage/stati'

const oraLocale = (d: Date) => `${isoLocale(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** Scelta del veicolo: uno in anagrafica o una targa scritta a mano. */
function SceltaVeicolo({ id, veicolo, targa, onVeicolo, onTarga, clienteId }: {
  id: string; veicolo: string; targa: string; onVeicolo: (v: string) => void; onTarga: (t: string) => void; clienteId?: string
}) {
  const { veicoli, clienti } = useAnagrafica()
  const elenco = clienteId ? veicoli.filter((v) => v.cliente_id === clienteId) : veicoli
  return (
    <>
      <div className="col-span-3 space-y-1.5"><Label htmlFor={`${id}-ve`}>Veicolo in anagrafica</Label>
        <Select value={veicolo} onValueChange={onVeicolo}><SelectTrigger id={`${id}-ve`}><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="nessuno">Nessuno: scrivo la targa</SelectItem>
            {elenco.map((v) => <SelectItem key={v.id} value={v.id}>{v.targa}{v.cliente_id ? ` · ${nomeCliente(clienti, v.cliente_id) ?? ''}` : ''}</SelectItem>)}</SelectContent></Select></div>
      <div className="col-span-3 space-y-1.5"><Label htmlFor={`${id}-targa`}>Targa</Label>
        <Input id={`${id}-targa`} className="font-mono uppercase" value={veicolo === 'nessuno' ? targa : (veicoli.find((v) => v.id === veicolo)?.targa ?? '')}
          onChange={(e) => onTarga(e.target.value)} disabled={veicolo !== 'nessuno'} /></div>
    </>
  )
}

// ── Chiavi ──────────────────────────────────────────────────────────────
export function ChiaviPage() {
  return <ConStruttura><Chiavi_ /></ConStruttura>
}

function Chiavi_() {
  const { strutturaId } = useGarage()
  const { clienti } = useAnagrafica()
  const [tutte, setTutte] = useState(false)
  const { data: chiavi = [], isLoading } = useElenco<Chiave>('gar_chiavi', { filtri: { struttura_id: strutturaId, stato: tutte ? undefined : ['in_custodia', 'consegnata'] },
    ordine: [{ colonna: 'numero' }] })
  const [nuova, setNuova] = useState(false)
  const [mossa, setMossa] = useState<{ chiave: Chiave; tipo: 'consegna' | 'rientro' | 'restituzione' } | null>(null)
  const [storico, setStorico] = useState<Chiave | null>(null)
  const [q, setQ] = useState('')
  const cerca = normalizzaTarga(q)
  const visibili = chiavi.filter((k) => !q || k.numero.toUpperCase().includes(q.toUpperCase()) || (k.targa ?? '').includes(cerca))
  return (
    <div>
      <PageHeader title="Chiavi in custodia" description="Ogni chiave con il suo veicolo, dove sta e chi l'ha avuta: consegne, rientri e restituzioni restano nel registro."
        numeri={[
          { etichetta: 'in bacheca', valore: isLoading ? undefined : chiavi.filter((k) => k.stato === 'in_custodia').length, inCaricamento: isLoading },
          { etichetta: 'fuori', valore: isLoading ? undefined : chiavi.filter((k) => k.stato === 'consegnata').length, inCaricamento: isLoading },
        ]}
        actions={<><SelettoreStruttura /><BottoneScrittura onClick={() => setNuova(true)}><Plus className="h-4 w-4" /> Prendi in custodia</BottoneScrittura></>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input className="max-w-xs" placeholder="Numero o targa" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca" />
        <label className="flex items-center gap-2 text-sm text-foreground"><Checkbox checked={tutte} onCheckedChange={(v) => setTutte(v === true)} /> Anche le restituite</label>
      </div>
      {isLoading ? <Skeleton className="h-48" /> : visibili.length === 0 ? (
        q || tutte ? <EmptyState icon={KeyRound} filtrato title="Nessuna chiave trovata" description="Cambia la ricerca." />
          : <EmptyState icon={KeyRound} title="Nessuna chiave in custodia" description="Le chiavi lasciate dai clienti per spostare il veicolo, lavarlo o custodirlo."
              action={<BottoneScrittura variant="outline" onClick={() => setNuova(true)}>Prendi in custodia</BottoneScrittura>} />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Chiave</TableHead><TableHead>Veicolo</TableHead><TableHead>Cliente</TableHead><TableHead>Dove</TableHead><TableHead>Stato</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>{visibili.map((k) => (
            <TableRow key={k.id}>
              <TableCell className="font-medium text-foreground">N. {k.numero}</TableCell>
              <TableCell className="font-mono">{k.targa ?? '—'}</TableCell>
              <TableCell>{k.cliente_id ? <Link to={`/garage/clienti/${k.cliente_id}`} className="hover:text-primary-testo">{nomeCliente(clienti, k.cliente_id)}</Link> : '—'}</TableCell>
              <TableCell className="text-sm">{[k.armadietto, k.posizione].filter(Boolean).join(' · ') || '—'}</TableCell>
              <TableCell><Badge tone={CHIAVE_STATO[k.stato].tone}>{CHIAVE_STATO[k.stato].label}</Badge>{k.in_mano_a && <span className="block text-xs text-muted-foreground">ce l'ha {k.in_mano_a}</span>}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {k.stato === 'in_custodia' && <><BottoneScrittura size="sm" variant="outline" onClick={() => setMossa({ chiave: k, tipo: 'consegna' })}>Consegna</BottoneScrittura>
                  <Button size="sm" variant="ghost" onClick={() => setMossa({ chiave: k, tipo: 'restituzione' })}>Restituisci al cliente</Button></>}
                {k.stato === 'consegnata' && <BottoneScrittura size="sm" variant="outline" onClick={() => setMossa({ chiave: k, tipo: 'rientro' })}>Rientrata</BottoneScrittura>}
                <Button size="sm" variant="ghost" aria-label={`Registro della chiave ${k.numero}`} onClick={() => setStorico(k)}><History className="h-3.5 w-3.5" /></Button>
              </TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      {nuova && <NuovaChiaveDialog onClose={() => setNuova(false)} />}
      {mossa && <MovimentoChiaveDialog key={`${mossa.chiave.id}-${mossa.tipo}`} {...mossa} cliente={nomeCliente(clienti, mossa.chiave.cliente_id)} onClose={() => setMossa(null)} />}
      {storico && <StoricoChiave chiave={storico} onClose={() => setStorico(null)} />}
    </div>
  )
}

function NuovaChiaveDialog({ onClose }: { onClose: () => void }) {
  const { strutturaId } = useGarage()
  const salva = useSalva('gar_chiavi', ['gar_chiavi_movimenti'])
  const [f, setF] = useState({ numero: '', veicolo: 'nessuno', targa: '', armadietto: '', posizione: '', note: '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const crea = () => {
    if (!f.numero.trim()) { toast.error('Scrivi il numero della chiave'); return }
    salva.mutate({ values: { struttura_id: strutturaId!, numero: f.numero.trim(), veicolo_id: f.veicolo === 'nessuno' ? null : f.veicolo, targa: f.veicolo === 'nessuno' ? f.targa || null : null,
      armadietto: f.armadietto.trim() || null, posizione: f.posizione.trim() || null, note: f.note.trim() || null } }, {
      onSuccess: () => { toast.success(`Chiave ${f.numero.trim()} in custodia`); onClose() }, onError: (e) => toast.error(messaggioErrore(e)) })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Prendi in custodia una chiave</DialogTitle><DialogDescription>La presa in custodia è il primo movimento del registro, con l'operatore e l'ora.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="nk-num">Numero *</Label><Input id="nk-num" value={f.numero} onChange={set('numero')} autoFocus /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="nk-arm">Armadietto</Label><Input id="nk-arm" value={f.armadietto} onChange={set('armadietto')} placeholder="Bacheca A" /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="nk-pos">Posizione</Label><Input id="nk-pos" value={f.posizione} onChange={set('posizione')} placeholder="Gancio 12" /></div>
          <SceltaVeicolo id="nk" veicolo={f.veicolo} targa={f.targa} onVeicolo={(v) => setF({ ...f, veicolo: v })} onTarga={(t) => setF({ ...f, targa: t })} />
          <div className="col-span-6 space-y-1.5"><Label htmlFor="nk-note">Note</Label><Input id="nk-note" value={f.note} onChange={set('note')} placeholder="Doppia chiave, telecomando…" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={crea} disabled={salva.isPending}>Prendi in custodia</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MovimentoChiaveDialog({ chiave, tipo, cliente, onClose }: { chiave: Chiave; tipo: 'consegna' | 'rientro' | 'restituzione'; cliente: string | null; onClose: () => void }) {
  const inserisci = useInserisci('gar_chiavi_movimenti', ['gar_chiavi'])
  const [persona, setPersona] = useState(tipo === 'rientro' ? chiave.in_mano_a ?? '' : tipo === 'restituzione' ? cliente ?? '' : '')
  const [motivo, setMotivo] = useState('')
  const titolo = { consegna: 'Consegna la chiave', rientro: 'Chiave rientrata', restituzione: 'Restituisci al cliente' }[tipo]
  const registra = () => inserisci.mutate({ chiave_id: chiave.id, tipo, persona: persona.trim() || null, motivo: motivo.trim() || null }, {
    onSuccess: () => { toast.success(`Chiave ${chiave.numero}: ${CHIAVE_MOVIMENTO[tipo].toLowerCase()}`); onClose() }, onError: (e) => toast.error(messaggioErrore(e)) })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{titolo}</DialogTitle><DialogDescription>Chiave n. {chiave.numero}{chiave.targa ? ` · ${chiave.targa}` : ''}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="mk-pers">{tipo === 'rientro' ? 'Restituita da' : 'A chi'}{tipo !== 'rientro' ? ' *' : ''}</Label><Input id="mk-pers" value={persona} onChange={(e) => setPersona(e.target.value)} autoFocus /></div>
          <div className="space-y-1.5"><Label htmlFor="mk-mot">Motivo</Label><Input id="mk-mot" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={tipo === 'consegna' ? 'Lavaggio, spostamento, ritiro…' : ''} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={inserisci.isPending}>Registra</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StoricoChiave({ chiave, onClose }: { chiave: Chiave; onClose: () => void }) {
  const { data: mov = [] } = useElenco<MovimentoChiave>('gar_chiavi_movimenti', { filtri: { chiave_id: chiave.id }, ordine: [{ colonna: 'avvenuto_at', crescente: false }] })
  const { data: persone = [] } = useElenco<{ id: string; nome: string; cognome: string | null }>('user_profiles', { select: 'id, nome, cognome' })
  const chi = (id: string | null) => { const p = persone.find((x) => x.id === id); return p ? `${p.nome} ${p.cognome ?? ''}`.trim() : '—' }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Registro della chiave n. {chiave.numero}</DialogTitle><DialogDescription>{chiave.targa ?? ''} · il registro non si modifica.</DialogDescription></DialogHeader>
        <ol className="max-h-96 divide-y divide-border overflow-y-auto text-sm">{mov.map((m) => (
          <li key={m.id} className="py-2"><p className="text-foreground"><span className="font-medium">{CHIAVE_MOVIMENTO[m.tipo]}</span>{m.persona ? ` · ${m.persona}` : ''}{m.motivo ? ` · ${m.motivo}` : ''}</p>
            <p className="text-xs text-muted-foreground">{fmtGiornoOra(m.avvenuto_at)} · operatore {chi(m.operatore_id)}</p></li>))}</ol>
      </DialogContent>
    </Dialog>
  )
}

// ── Danni e anomalie ────────────────────────────────────────────────────
export function DanniPage() {
  return <ConStruttura><Danni_ /></ConStruttura>
}

function Danni_() {
  const { strutturaId } = useGarage()
  const { clienti } = useAnagrafica()
  const [aperti, setAperti] = useState(true)
  const { data: danni = [], isLoading } = useElenco<Danno>('gar_danni', { filtri: { struttura_id: strutturaId, stato: aperti ? ['aperto', 'in_gestione'] : undefined },
    ordine: [{ colonna: 'rilevato_at', crescente: false }], limite: 200 })
  const [scelto, setScelto] = useState<Danno | 'nuovo' | null>(null)
  return (
    <div>
      <PageHeader title="Danni e anomalie" description="Danni all'ingresso e all'uscita, urti, incidenti, furti, smarrimenti, contestazioni: con foto, video, testimoni e pratica assicurativa."
        numeri={[
          { etichetta: aperti ? 'aperti' : 'registrati', valore: isLoading ? undefined : danni.length, inCaricamento: isLoading },
          { etichetta: 'da accertare', valore: isLoading ? undefined : danni.filter((d) => d.responsabilita === 'da_accertare' && d.stato !== 'chiuso').length, inCaricamento: isLoading },
        ]}
        actions={<><SelettoreStruttura /><BottoneScrittura onClick={() => setScelto('nuovo')}><Plus className="h-4 w-4" /> Registra</BottoneScrittura></>} />
      <label className="mb-4 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={!aperti} onCheckedChange={(v) => setAperti(v !== true)} /> Anche i chiusi</label>
      {isLoading ? <Skeleton className="h-48" /> : danni.length === 0 ? (
        aperti ? <EmptyState icon={ShieldAlert} title="Nessun danno aperto" description="Registra subito i danni visti all'ingresso: con le foto, tutela l'autorimessa nelle contestazioni."
          action={<BottoneScrittura variant="outline" onClick={() => setScelto('nuovo')}>Registra un danno</BottoneScrittura>} />
          : <EmptyState icon={ShieldAlert} filtrato title="Nessun danno registrato" description="I danni e le anomalie compaiono qui." />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Tipo</TableHead><TableHead>Veicolo</TableHead><TableHead>Descrizione</TableHead><TableHead>Responsabilità</TableHead><TableHead>Stato</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>{danni.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="tabular-nums">{fmtGiornoOra(d.rilevato_at)}<span className="block text-xs text-muted-foreground">{d.codice}</span></TableCell>
              <TableCell><Badge tone={DANNO_TIPO[d.tipo].tone}>{DANNO_TIPO[d.tipo].label}</Badge></TableCell>
              <TableCell className="font-mono">{d.targa ?? '—'}{d.cliente_id && <span className="block font-sans text-xs text-muted-foreground">{nomeCliente(clienti, d.cliente_id)}</span>}</TableCell>
              <TableCell className="max-w-xs text-sm">{d.descrizione}</TableCell>
              <TableCell className="text-sm">{RESPONSABILITA[d.responsabilita]}{d.importo_stimato != null && <span className="block text-xs text-muted-foreground">stima {fmtEuro(d.importo_stimato)}</span>}</TableCell>
              <TableCell><Badge tone={DANNO_STATO[d.stato].tone}>{DANNO_STATO[d.stato].label}</Badge></TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <FotoDialog entita="gar_danni" entitaId={d.id} titolo={`${DANNO_TIPO[d.tipo].label} · ${d.codice}`} categorie={['foto', 'video', 'verbale', 'documentazione assicurativa', 'relazione']} />
                <Button size="sm" variant="ghost" aria-label={`Gestisci ${d.codice}`} onClick={() => setScelto(d)}><Pencil className="h-3.5 w-3.5" /></Button>
              </TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Videosorveglianza, allarmi e rilevatori sono predisposti: il danno conserva il riferimento alla registrazione (telecamera e orario), non le immagini, come vuole la norma sulla videosorveglianza.</p>
      {scelto && <DannoDialog key={scelto === 'nuovo' ? 'nuovo' : scelto.id} danno={scelto === 'nuovo' ? null : scelto} onClose={() => setScelto(null)} />}
    </div>
  )
}

function DannoDialog({ danno: d, onClose }: { danno: Danno | null; onClose: () => void }) {
  const { strutturaId } = useGarage()
  const salva = useSalva('gar_danni')
  const { data: dentro = [] } = useElenco<Sosta>('gar_soste', { filtri: { struttura_id: strutturaId, uscita_at: null }, abilitato: !d })
  const [f, setF] = useState({ tipo: d?.tipo ?? 'danno_ingresso', sosta: d?.sosta_id ?? 'nessuna', veicolo: d?.veicolo_id ?? 'nessuno', targa: d?.targa ?? '',
    quando: oraLocale(d ? new Date(d.rilevato_at) : new Date()), descrizione: d?.descrizione ?? '', testimoni: d?.testimoni ?? '', relazione: d?.relazione ?? '',
    responsabilita: d?.responsabilita ?? 'da_accertare', assicurazione: d?.assicurazione ?? '', importo: campoNumero(d?.importo_stimato), video: d?.riferimento_video ?? '',
    stato: d?.stato ?? 'aperto', esito: d?.esito ?? '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const n = (s: string) => s.trim() || null
  const registra = () => {
    if (!f.descrizione.trim()) { toast.error('Descrivi cosa è successo'); return }
    salva.mutate({ id: d?.id, values: { struttura_id: d?.struttura_id ?? strutturaId!, tipo: f.tipo, sosta_id: f.sosta === 'nessuna' ? null : f.sosta,
      veicolo_id: f.sosta !== 'nessuna' ? d?.veicolo_id ?? null : f.veicolo === 'nessuno' ? null : f.veicolo, targa: f.sosta === 'nessuna' && f.veicolo === 'nessuno' ? n(f.targa) : d?.targa ?? null,
      rilevato_at: new Date(f.quando).toISOString(), descrizione: f.descrizione.trim(), testimoni: n(f.testimoni), relazione: n(f.relazione), responsabilita: f.responsabilita,
      assicurazione: n(f.assicurazione), importo_stimato: numeroONull(f.importo), riferimento_video: n(f.video), stato: f.stato, esito: n(f.esito) } }, {
      onSuccess: (x) => { toast.success(d ? 'Aggiornato' : `${x.codice} registrato: la direzione è avvisata. Ora le foto dalla riga.`); onClose() },
      onError: (e) => toast.error(messaggioErrore(e)) })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{d ? `${DANNO_TIPO[d.tipo].label} · ${d.codice}` : 'Registra un danno o un\'anomalia'}</DialogTitle>
          <DialogDescription>Operatore, data e ora restano sul verbale; foto, video e documenti si allegano dalla riga.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3 space-y-1.5"><Label htmlFor="dn-tipo">Tipo</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger id="dn-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(DANNO_TIPO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="dn-q">Quando</Label><Input id="dn-q" type="datetime-local" value={f.quando} onChange={set('quando')} /></div>
          {!d && <div className="col-span-6 space-y-1.5"><Label htmlFor="dn-sosta">Veicolo dentro adesso</Label>
            <Select value={f.sosta} onValueChange={(v) => setF({ ...f, sosta: v })}><SelectTrigger id="dn-sosta"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuna">Nessuno, o un altro veicolo</SelectItem>{dentro.map((s) => <SelectItem key={s.id} value={s.id}>{s.targa} · {s.ticket}</SelectItem>)}</SelectContent></Select></div>}
          {!d && f.sosta === 'nessuna' && <SceltaVeicolo id="dn" veicolo={f.veicolo} targa={f.targa} onVeicolo={(v) => setF({ ...f, veicolo: v })} onTarga={(t) => setF({ ...f, targa: t })} />}
          <div className="col-span-6 space-y-1.5"><Label htmlFor="dn-desc">Cosa è successo *</Label><Textarea id="dn-desc" rows={2} value={f.descrizione} onChange={set('descrizione')} /></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="dn-test">Testimoni</Label><Input id="dn-test" value={f.testimoni} onChange={set('testimoni')} /></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-3"><Label htmlFor="dn-vid">Registrazione video (telecamera, orario)</Label><Input id="dn-vid" value={f.video} onChange={set('video')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="dn-resp">Responsabilità</Label>
            <Select value={f.responsabilita} onValueChange={(v) => setF({ ...f, responsabilita: v })}><SelectTrigger id="dn-resp"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(RESPONSABILITA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="dn-imp">Danno stimato (€)</Label><Input id="dn-imp" inputMode="decimal" value={f.importo} onChange={set('importo')} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="dn-ass">Assicurazione e numero del sinistro</Label><Input id="dn-ass" value={f.assicurazione} onChange={set('assicurazione')} /></div>
          {d && <>
            <div className="col-span-6 space-y-1.5"><Label htmlFor="dn-rel">Relazione</Label><Textarea id="dn-rel" rows={3} value={f.relazione} onChange={set('relazione')} /></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="dn-st">Stato</Label>
              <Select value={f.stato} onValueChange={(v) => setF({ ...f, stato: v })}><SelectTrigger id="dn-st"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(DANNO_STATO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-4 space-y-1.5"><Label htmlFor="dn-esito">Esito</Label><Input id="dn-esito" value={f.esito} onChange={set('esito')} placeholder="Risarcito, respinto, preesistente…" /></div>
          </>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={registra} disabled={salva.isPending}>{d ? 'Salva' : 'Registra'}</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Colonnine e ricariche ───────────────────────────────────────────────
export function RicarichePage() {
  return <ConStruttura><Ricariche_ /></ConStruttura>
}

function Ricariche_() {
  const { strutturaId } = useGarage()
  useDalVivo(['gar_ricariche'])
  const { data: colonnine = [], isLoading } = useElenco<ColonninaStato>('gar_colonnine_stato', { filtri: { struttura_id: strutturaId }, ordine: [{ colonna: 'codice' }] })
  const ids = colonnine.map((c) => c.colonnina_id!)
  const { data: inCorso = [] } = useElenco<Ricarica>('gar_ricariche', { filtri: { colonnina_id: ids, fine_at: null }, abilitato: ids.length > 0 })
  const { data: fatte = [] } = useElenco<Ricarica>('gar_ricariche', { filtri: { colonnina_id: ids }, tra: { colonna: 'fine_at', da: new Date(`${oggiIso()}T00:00`).toISOString() },
    ordine: [{ colonna: 'fine_at', crescente: false }], abilitato: ids.length > 0 })
  const salvaCol = useSalva('gar_colonnine', ['gar_colonnine_stato'])
  const avvia = useAzione('gar_ricarica_avvia', ['gar_ricariche', 'gar_colonnine_stato'])
  const chiudi = useAzione('gar_ricarica_chiudi', ['gar_ricariche', 'gar_colonnine_stato', ...TABELLE_SOSTA])
  const [targhe, setTarghe] = useState<Record<string, string>>({})
  const [kwh, setKwh] = useState<Record<string, string>>({})
  return (
    <div>
      <PageHeader title="Ricarica elettrica" description="Colonnine, prese e ricariche in corso: il costo è l'energia erogata per la tariffa della colonnina."
        numeri={[
          { etichetta: 'colonnine', valore: isLoading ? undefined : colonnine.length, inCaricamento: isLoading },
          { etichetta: 'in carica', valore: inCorso.length },
          { etichetta: 'kWh oggi', valore: fmtNumero(fatte.reduce((s, r) => s + Number(r.kwh ?? 0), 0), 1) },
        ]}
        actions={<SelettoreStruttura />} />
      {isLoading ? <Skeleton className="h-48" /> : colonnine.length === 0 ? (
        <EmptyState icon={Plug} title="Nessuna colonnina" description="Le colonnine si installano da «Struttura e tariffe», con potenza, prese e tariffa al kWh."
          action={<Button asChild variant="outline"><Link to="/garage/impostazioni?scheda=colonnine">Struttura e tariffe</Link></Button>} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{colonnine.map((c) => {
          const st = COLONNINA_STATO[c.stato!]
          const mie = inCorso.filter((r) => r.colonnina_id === c.colonnina_id)
          return (
            <li key={c.colonnina_id}><Card className="flex h-full flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-title text-foreground">{c.codice}{c.posto ? <span className="text-sm font-normal text-muted-foreground"> · posto {c.posto}</span> : null}</p>
                  <p className="text-sm text-muted-foreground">{[c.potenza_kw ? `${fmtNumero(c.potenza_kw, 1)} kW` : null, c.connettore, `${c.prese} ${c.prese === 1 ? 'presa' : 'prese'}`, `${fmtEuro(c.tariffa_kwh, 3)}/kWh`].filter(Boolean).join(' · ')}</p></div>
                <Badge tone={st.tone}>{st.label}</Badge>
              </div>
              {mie.map((r) => (
                <div key={r.id} className="flex flex-wrap items-end gap-2 rounded-md bg-muted/60 p-2 text-sm">
                  <span className="min-w-0 flex-1"><span className="font-mono font-medium text-foreground">{r.targa}</span> · presa {r.presa} · da {durata(minutiDa(r.inizio_at))}</span>
                  <Input className="h-8 w-24" inputMode="decimal" placeholder="kWh" aria-label={`Energia erogata a ${r.targa}`} value={kwh[r.id] ?? ''} onChange={(e) => setKwh({ ...kwh, [r.id]: e.target.value })} />
                  <BottoneScrittura size="sm" variant="outline" disabled={!kwh[r.id]?.trim() || chiudi.isPending} onClick={() => chiudi.mutate({ p_ricarica: r.id, p_kwh: numero(kwh[r.id]) }, {
                    onSuccess: (x) => { const v = x as unknown as { costo: number; stato: string }; toast.success(`Ricarica conclusa: ${fmtEuro(v.costo)}${v.stato === 'in_convenzione' ? ' sul conto dell\'azienda' : v.stato === 'da_pagare' ? ' da incassare' : ''}`) },
                    onError: (e) => toast.error(messaggioErrore(e)) })}><Check className="h-3.5 w-3.5" /> Fine</BottoneScrittura>
                </div>))}
              <div className="mt-auto flex flex-wrap items-end gap-2">
                {c.stato === 'disponibile' && <>
                  <Input className="h-9 w-32 font-mono uppercase" placeholder="Targa" aria-label={`Targa da ricaricare su ${c.codice}`} value={targhe[c.colonnina_id!] ?? ''}
                    onChange={(e) => setTarghe({ ...targhe, [c.colonnina_id!]: e.target.value })} />
                  <BottoneScrittura size="sm" variant="outline" disabled={!targhe[c.colonnina_id!]?.trim() || avvia.isPending} onClick={() => avvia.mutate({ p_colonnina: c.colonnina_id!, p_targa: targhe[c.colonnina_id!] }, {
                    onSuccess: () => { toast.success('Ricarica avviata'); setTarghe({ ...targhe, [c.colonnina_id!]: '' }) }, onError: (e) => toast.error(messaggioErrore(e)) })}>
                    <Play className="h-3.5 w-3.5" /> Avvia</BottoneScrittura></>}
                <span className="ml-auto" />
                {c.fermo ? <Button size="sm" variant="ghost" onClick={() => salvaCol.mutate({ id: c.colonnina_id!, values: { fermo: null } }, { onSuccess: () => toast.success('Colonnina di nuovo disponibile'), onError: (e) => toast.error(messaggioErrore(e)) })}>Rimetti in servizio</Button>
                  : <Button size="sm" variant="ghost" onClick={() => salvaCol.mutate({ id: c.colonnina_id!, values: { fermo: 'guasta' } }, { onSuccess: () => toast.success('Segnata come guasta'), onError: (e) => toast.error(messaggioErrore(e)) })}>Segnala guasto</Button>}
              </div>
            </Card></li>
          )
        })}</ul>
      )}
      {fatte.length > 0 && (
        <Card className="mt-5 overflow-x-auto"><h2 className="px-4 pt-4 text-title text-foreground">Ricariche di oggi</h2><Table>
          <TableHeader><TableRow><TableHead>Targa</TableHead><TableHead>Colonnina</TableHead><TableHead>Inizio</TableHead><TableHead>Fine</TableHead><TableHead numerica>kWh</TableHead><TableHead numerica>Costo</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
          <TableBody>{fatte.map((r) => (
            <TableRow key={r.id}><TableCell className="font-mono">{r.targa}</TableCell><TableCell>{colonnine.find((c) => c.colonnina_id === r.colonnina_id)?.codice} · presa {r.presa}</TableCell>
              <TableCell>{fmtGiornoOra(r.inizio_at)}</TableCell><TableCell>{fmtGiornoOra(r.fine_at)}</TableCell><TableCell numerica>{fmtNumero(r.kwh, 2)}</TableCell><TableCell numerica>{fmtEuro(r.costo)}</TableCell>
              <TableCell><Badge tone={RICARICA_STATO[r.stato].tone}>{RICARICA_STATO[r.stato].label}</Badge>{r.stato === 'da_pagare' && r.conto_id && <Link className="ml-2 text-xs underline underline-offset-2" to={`/garage/incassi?conto=${r.conto_id}`}>incassa</Link>}</TableCell>
            </TableRow>))}</TableBody></Table></Card>
      )}
      <p className="mt-3 text-xs text-muted-foreground">La lettura automatica dell'energia dalle colonnine è predisposta; oggi i kWh si leggono dal display. Le manutenzioni delle colonnine sono in «Impianti e sicurezza».</p>
    </div>
  )
}

// ── Servizi aggiuntivi e deposito gomme ─────────────────────────────────
export function ServiziGaragePage({ scheda = 'servizi' }: { scheda?: string }) {
  return <ConStruttura><Servizi_ scheda={scheda} /></ConStruttura>
}

function Servizi_({ scheda }: { scheda: string }) {
  return (
    <div>
      <PageHeader title="Servizi e gomme" description="Lavaggi, pulizie, sanificazioni, cambio gomme, piccola manutenzione, revisione, recupero e consegna; deposito degli pneumatici." actions={<SelettoreStruttura />} />
      <Tabs defaultValue={scheda}>
        <TabsList className="mb-4"><TabsTrigger value="servizi">Servizi</TabsTrigger><TabsTrigger value="pneumatici">Deposito gomme</TabsTrigger></TabsList>
        <TabsContent value="servizi"><ElencoServizi /></TabsContent>
        <TabsContent value="pneumatici"><DepositoGomme /></TabsContent>
      </Tabs>
    </div>
  )
}

const COLONNE_SERVIZI = ['richiesto', 'in_corso', 'pronto'] as const

function ElencoServizi() {
  const { strutturaId } = useGarage()
  const { clienti } = useAnagrafica()
  useDalVivo(['gar_servizi'])
  const { data: servizi = [], isLoading } = useElenco<Servizio>('gar_servizi', { filtri: { struttura_id: strutturaId, stato: ['richiesto', 'in_corso', 'pronto'] }, ordine: [{ colonna: 'programmato_at' }, { colonna: 'created_at' }] })
  const { data: consegnati = [] } = useElenco<Servizio>('gar_servizi', { filtri: { struttura_id: strutturaId, stato: 'consegnato' }, ordine: [{ colonna: 'consegnato_at', crescente: false }], limite: 10 })
  const salva = useSalva('gar_servizi', ['conti', 'conti_saldi'])
  const [nuovo, setNuovo] = useState(false)
  const avanza = (s: Servizio, stato: string, ok: string) => salva.mutate({ id: s.id, values: { stato } }, { onSuccess: () => toast.success(ok), onError: (e) => toast.error(messaggioErrore(e)) })
  return (
    <div>
      <div className="mb-3 flex justify-end"><BottoneScrittura onClick={() => setNuovo(true)}><Plus className="h-4 w-4" /> Nuovo servizio</BottoneScrittura></div>
      {isLoading ? <Skeleton className="h-48" /> : servizi.length === 0 ? (
        <EmptyState icon={Sparkles} title="Nessun servizio da fare" description="Ogni servizio è legato al veicolo e si incassa a parte: il conto nasce quando è pronto, e il cliente riceve l'avviso."
          action={<BottoneScrittura variant="outline" onClick={() => setNuovo(true)}>Nuovo servizio</BottoneScrittura>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{COLONNE_SERVIZI.map((col) => (
          <section key={col} aria-label={SERVIZIO_STATO[col].label}>
            <h3 className="mb-2 text-label uppercase text-muted-foreground">{SERVIZIO_STATO[col].label} ({servizi.filter((s) => s.stato === col).length})</h3>
            <ul className="space-y-2">{servizi.filter((s) => s.stato === col).map((s) => (
              <li key={s.id}><Card className="space-y-2 p-3 text-sm">
                <div className="flex items-start justify-between gap-2"><span className="font-medium text-foreground">{s.descrizione}</span><span className="tabular-nums text-foreground">{fmtEuro(s.prezzo)}</span></div>
                <p className="text-muted-foreground"><span className="font-mono">{s.targa ?? '—'}</span>{s.cliente_id ? ` · ${nomeCliente(clienti, s.cliente_id)}` : ''}{s.programmato_at ? ` · ${fmtGiornoOra(s.programmato_at)}` : ''}</p>
                {s.note && <p className="text-muted-foreground">{s.note}</p>}
                <div className="flex flex-wrap justify-end gap-1.5">
                  {col === 'richiesto' && <><Button size="sm" variant="ghost" onClick={() => avanza(s, 'annullato', 'Servizio annullato')}>Annulla</Button>
                    <BottoneScrittura size="sm" variant="outline" onClick={() => avanza(s, 'in_corso', 'Servizio iniziato')}><Play className="h-3.5 w-3.5" /> Inizia</BottoneScrittura></>}
                  {col === 'in_corso' && <BottoneScrittura size="sm" variant="outline" onClick={() => avanza(s, 'pronto', 'Pronto: il cliente è avvisato e il conto è in cassa')}><Check className="h-3.5 w-3.5" /> Pronto</BottoneScrittura>}
                  {col === 'pronto' && <>{!s.pagato && s.conto_id && <Button asChild size="sm" variant="ghost"><Link to={`/garage/incassi?conto=${s.conto_id}`}>Incassa</Link></Button>}
                    <BottoneScrittura size="sm" variant="outline" onClick={() => avanza(s, 'consegnato', 'Veicolo riconsegnato')}>Riconsegnato</BottoneScrittura></>}
                </div>
                {s.pagato && <Badge tone="success">Pagato</Badge>}
              </Card></li>))}</ul>
          </section>))}</div>
      )}
      {consegnati.length > 0 && <p className="mt-4 text-sm text-muted-foreground">Ultimi riconsegnati: {consegnati.map((s) => `${s.descrizione} (${s.targa ?? ''}${s.pagato ? '' : ', da incassare'})`).join(', ')}.</p>}
      {nuovo && <NuovoServizioDialog onClose={() => setNuovo(false)} />}
    </div>
  )
}

function NuovoServizioDialog({ onClose }: { onClose: () => void }) {
  const { strutturaId } = useGarage()
  const { isManager } = useAuth()
  const { data: listino = [] } = useElenco<VoceListino>('gar_servizi_listino', { filtri: { attivo: true }, ordine: [{ colonna: 'categoria' }, { colonna: 'nome' }] })
  const salva = useSalva('gar_servizi')
  const [f, setF] = useState({ listino: '', descrizione: '', veicolo: 'nessuno', targa: '', quando: '', prezzo: '', note: '' })
  const voce = listino.find((l) => l.id === f.listino)
  const crea = () => {
    if (!f.listino && !f.descrizione.trim()) { toast.error('Scegli il servizio'); return }
    salva.mutate({ values: { struttura_id: strutturaId!, listino_id: f.listino || null, descrizione: f.descrizione.trim() || null, categoria: voce?.categoria ?? 'altro',
      veicolo_id: f.veicolo === 'nessuno' ? null : f.veicolo, targa: f.veicolo === 'nessuno' ? f.targa || null : null, programmato_at: f.quando ? new Date(f.quando).toISOString() : null,
      prezzo: f.prezzo.trim() ? numero(f.prezzo) : null, note: f.note.trim() || null } }, {
      onSuccess: (s) => { toast.success(`${s.descrizione}: ${fmtEuro(s.prezzo)}`); onClose() }, onError: (e) => toast.error(messaggioErrore(e)) })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuovo servizio</DialogTitle><DialogDescription>Il prezzo è quello di listino{isManager ? ': la direzione può cambiarlo' : ''}.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5"><Label htmlFor="ns-l">Servizio</Label>
            <Select value={f.listino} onValueChange={(v) => setF({ ...f, listino: v })}><SelectTrigger id="ns-l"><SelectValue placeholder={listino.length ? 'Scegli dal listino' : 'Listino vuoto: scrivi il servizio sotto'} /></SelectTrigger>
              <SelectContent>{listino.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome} · {SERVIZIO_CATEGORIA[l.categoria]} · {fmtEuro(l.prezzo)}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="ns-d">{f.listino ? 'Descrizione (facoltativa)' : 'Servizio'}</Label><Input id="ns-d" value={f.descrizione} onChange={(e) => setF({ ...f, descrizione: e.target.value })} /></div>
          <SceltaVeicolo id="ns" veicolo={f.veicolo} targa={f.targa} onVeicolo={(v) => setF({ ...f, veicolo: v })} onTarga={(t) => setF({ ...f, targa: t })} />
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ns-q">Quando</Label><Input id="ns-q" type="datetime-local" value={f.quando} onChange={(e) => setF({ ...f, quando: e.target.value })} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ns-p">Prezzo (€)</Label><Input id="ns-p" inputMode="decimal" value={f.prezzo} placeholder={voce ? campoNumero(voce.prezzo) : ''}
            onChange={(e) => setF({ ...f, prezzo: e.target.value })} disabled={!!f.listino && !isManager} /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="ns-n">Note</Label><Input id="ns-n" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={crea} disabled={salva.isPending}>Crea il servizio</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DepositoGomme() {
  const { strutturaId } = useGarage()
  const { clienti } = useAnagrafica()
  const [tutti, setTutti] = useState(false)
  const { data: gomme = [], isLoading } = useElenco<Pneumatici>('gar_pneumatici', { filtri: { struttura_id: strutturaId, stato: tutti ? undefined : ['in_deposito', 'da_sostituire'] },
    ordine: [{ colonna: 'restituzione_prevista' }] })
  const salva = useSalva('gar_pneumatici', ['scadenze_moduli'])
  const [scelto, setScelto] = useState<Pneumatici | 'nuovo' | null>(null)
  const oggi = oggiIso()
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-foreground"><Checkbox checked={tutti} onCheckedChange={(v) => setTutti(v === true)} /> Anche montati e restituiti</label>
        <BottoneScrittura variant="outline" onClick={() => setScelto('nuovo')}><Plus className="h-4 w-4" /> Deposita un set</BottoneScrittura>
      </div>
      {isLoading ? <Skeleton className="h-48" /> : gomme.length === 0 ? (
        tutti ? <EmptyState icon={Disc3} filtrato title="Nessun set" description="I set depositati compaiono qui." />
          : <EmptyState icon={Disc3} title="Nessun set in deposito" description="Marca, misura, stagione e posizione a scaffale; la restituzione prevista va tra le scadenze."
              action={<BottoneScrittura variant="outline" onClick={() => setScelto('nuovo')}>Deposita un set</BottoneScrittura>} />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Set</TableHead><TableHead>Cliente</TableHead><TableHead>Pneumatici</TableHead><TableHead>Posizione</TableHead><TableHead>Restituzione</TableHead><TableHead>Stato</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>{gomme.map((g) => (
            <TableRow key={g.id}>
              <TableCell className="font-medium text-foreground">{g.codice}<span className="block text-xs text-muted-foreground">depositato il {fmtData(g.data_deposito)}</span></TableCell>
              <TableCell><Link to={`/garage/clienti/${g.cliente_id}`} className="hover:text-primary-testo">{nomeCliente(clienti, g.cliente_id)}</Link></TableCell>
              <TableCell className="text-sm">{g.quantita} {STAGIONE[g.stagione].toLowerCase()} {[g.marca, g.misura].filter(Boolean).join(' ')}{g.con_cerchi ? ' con cerchi' : ''}
                {g.battistrada_mm != null && <span className="block text-xs text-muted-foreground">battistrada {fmtNumero(g.battistrada_mm, 1)} mm{g.numeri_serie ? ` · ${g.numeri_serie}` : ''}</span>}</TableCell>
              <TableCell className="text-sm">{g.posizione ?? '—'}</TableCell>
              <TableCell className={cn(g.stato === 'in_deposito' && g.restituzione_prevista && g.restituzione_prevista <= oggi && 'text-warning-testo')}>{fmtData(g.restituzione_prevista)}</TableCell>
              <TableCell><Badge tone={PNEUMATICI_STATO[g.stato].tone}>{PNEUMATICI_STATO[g.stato].label}</Badge></TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {['in_deposito', 'da_sostituire'].includes(g.stato) && <BottoneScrittura size="sm" variant="outline" onClick={() => salva.mutate({ id: g.id, values: { stato: 'montati' } }, { onSuccess: () => toast.success('Set montato sul veicolo'), onError: (e) => toast.error(messaggioErrore(e)) })}>Montati</BottoneScrittura>}
                <FotoDialog entita="gar_pneumatici" entitaId={g.id} titolo={`Pneumatici ${g.codice}`} categorie={['foto', 'documento']} />
                <Button size="sm" variant="ghost" aria-label={`Modifica ${g.codice}`} onClick={() => setScelto(g)}><Pencil className="h-3.5 w-3.5" /></Button>
              </TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      {scelto && <GommeDialog key={scelto === 'nuovo' ? 'nuovo' : scelto.id} set={scelto === 'nuovo' ? null : scelto} onClose={() => setScelto(null)} />}
    </div>
  )
}

function GommeDialog({ set: g, onClose }: { set: Pneumatici | null; onClose: () => void }) {
  const { strutturaId } = useGarage()
  const { clienti, veicoli } = useAnagrafica()
  const salva = useSalva('gar_pneumatici', ['scadenze_moduli'])
  const [f, setF] = useState({ cliente: g?.cliente_id ?? '', veicolo: g?.veicolo_id ?? 'nessuno', marca: g?.marca ?? '', misura: g?.misura ?? '', stagione: g?.stagione ?? 'invernali',
    quantita: String(g?.quantita ?? 4), cerchi: g?.con_cerchi ?? false, serie: g?.numeri_serie ?? '', battistrada: campoNumero(g?.battistrada_mm), deposito: g?.data_deposito ?? oggiIso(),
    posizione: g?.posizione ?? '', restituzione: g?.restituzione_prevista ?? '', stato: g?.stato ?? 'in_deposito', note: g?.note ?? '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const salvaSet = () => {
    if (!f.cliente) { toast.error('Scegli il cliente'); return }
    salva.mutate({ id: g?.id, values: { struttura_id: g?.struttura_id ?? strutturaId!, cliente_id: f.cliente, veicolo_id: f.veicolo === 'nessuno' ? null : f.veicolo, marca: f.marca.trim() || null,
      misura: f.misura.trim() || null, stagione: f.stagione, quantita: Math.max(1, Math.round(numero(f.quantita))), con_cerchi: f.cerchi, numeri_serie: f.serie.trim() || null,
      battistrada_mm: numeroONull(f.battistrada), data_deposito: f.deposito, posizione: f.posizione.trim() || null, restituzione_prevista: f.restituzione || null, stato: f.stato,
      note: f.note.trim() || null } }, { onSuccess: (x) => { toast.success(g ? 'Set aggiornato' : `Set ${x.codice} in deposito`); onClose() }, onError: (e) => toast.error(messaggioErrore(e)) })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{g ? `Set ${g.codice}` : 'Deposita un set di pneumatici'}</DialogTitle><DialogDescription>Alla data di restituzione prevista arriva l'avviso, per il cambio di stagione.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pn-cli">Cliente *</Label>
            <Select value={f.cliente} onValueChange={(v) => setF({ ...f, cliente: v, veicolo: 'nessuno' })}><SelectTrigger id="pn-cli"><SelectValue placeholder="Scegli il cliente" /></SelectTrigger>
              <SelectContent>{clienti.map((k) => <SelectItem key={k.id} value={k.id}>{k.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="pn-ve">Veicolo</Label>
            <Select value={f.veicolo} onValueChange={(v) => setF({ ...f, veicolo: v })}><SelectTrigger id="pn-ve"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">Non indicato</SelectItem>{veicoli.filter((v) => v.cliente_id === f.cliente).map((v) => <SelectItem key={v.id} value={v.id}>{v.targa}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="pn-marca">Marca</Label><Input id="pn-marca" value={f.marca} onChange={set('marca')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="pn-mis">Misura</Label><Input id="pn-mis" value={f.misura} onChange={set('misura')} placeholder="205/55 R16 91V" /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="pn-st">Stagione</Label>
            <Select value={f.stagione} onValueChange={(v) => setF({ ...f, stagione: v })}><SelectTrigger id="pn-st"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(STAGIONE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="pn-q">Quanti</Label><Input id="pn-q" inputMode="numeric" value={f.quantita} onChange={set('quantita')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="pn-bat">Battistrada (mm)</Label><Input id="pn-bat" inputMode="decimal" value={f.battistrada} onChange={set('battistrada')} /></div>
          <label className="col-span-2 flex items-end gap-2 pb-2 text-sm text-foreground"><Checkbox checked={f.cerchi} onCheckedChange={(v) => setF({ ...f, cerchi: v === true })} /> Con cerchi</label>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="pn-ser">Numeri di serie o DOT</Label><Input id="pn-ser" value={f.serie} onChange={set('serie')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="pn-dep">Depositati il</Label><Input id="pn-dep" type="date" value={f.deposito} onChange={set('deposito')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="pn-pos">Posizione</Label><Input id="pn-pos" value={f.posizione} onChange={set('posizione')} placeholder="Scaffale 3B" /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="pn-res">Restituzione prevista</Label><Input id="pn-res" type="date" value={f.restituzione} onChange={set('restituzione')} /></div>
          {g && <div className="col-span-3 space-y-1.5"><Label htmlFor="pn-stato">Stato</Label>
            <Select value={f.stato} onValueChange={(v) => setF({ ...f, stato: v })}><SelectTrigger id="pn-stato"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PNEUMATICI_STATO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>}
          <div className={cn('space-y-1.5', g ? 'col-span-3' : 'col-span-6')}><Label htmlFor="pn-note">Note</Label><Input id="pn-note" value={f.note} onChange={set('note')} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annulla</Button><BottoneScrittura onClick={salvaSet} disabled={salva.isPending}>{g ? 'Salva' : 'Deposita'}</BottoneScrittura></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
