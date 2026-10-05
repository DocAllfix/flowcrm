/**
 * Corsi (documento Palestra §9–13): calendario settimanale con posti, iscritti
 * e lista d'attesa; nella lezione si prenota, si fa il check-in, si chiude con
 * le assenze o si annulla; i corsi e i loro orari li configura la direzione.
 */
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck, Sparkles, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useElenco, useRpc, useSalva, useInserisci, useAzione, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { usePalestra } from '@/modules/palestra/contesto'
import { ConSede, SelettoreSede } from '@/modules/palestra/componenti/ConSede'
import { CercaSocio } from '@/modules/palestra/componenti/CercaSocio'
import { useCatalogoPalestra, TABELLE_CORSI, type Corso, type LezionePosti, type PrenotazioneCorso, type SocioStato } from '@/modules/palestra/queries'
import { DISCIPLINA, GIORNI, LIVELLO, PRENOTAZIONE_STATO, fmtData, fmtOra, isoLocale, oggiIso, piuGiorni } from '@/modules/palestra/stati'

export function CorsiPage() {
  return <ConSede><Corsi_ /></ConSede>
}

/** Lunedì della settimana di una data AAAA-MM-GG. */
const lunedi = (iso: string) => { const d = new Date(`${iso}T12:00`); return piuGiorni(iso, -((d.getDay() + 6) % 7)) }

function Corsi_() {
  const { sedeId } = usePalestra()
  const { isManager } = useAuth()
  const [params, setParams] = useSearchParams()
  const [settimana, setSettimana] = useState(() => lunedi(oggiIso()))
  const [mese, setMese] = useState(false)
  const quanti = mese ? 28 : 7
  useDalVivo(['pal_prenotazioni', 'pal_lezioni'])
  const { data: lezioni = [], isLoading } = useElenco<LezionePosti>('pal_lezioni_posti', {
    filtri: { sede_id: sedeId ?? undefined }, tra: { colonna: 'inizio', da: `${settimana}T00:00`, a: `${piuGiorni(settimana, quanti)}T00:00` },
    ordine: [{ colonna: 'inizio' }], abilitato: !!sedeId })
  const { data: corsi = [] } = useElenco<Corso>('pal_corsi', { filtri: { sede_id: sedeId ?? undefined }, ordine: [{ colonna: 'nome' }], abilitato: !!sedeId })
  const genera = useAzione('pal_genera_lezioni', TABELLE_CORSI)
  const lezioneId = params.get('lezione')
  const scheda = params.get('scheda') ?? 'calendario'
  const giorni = Array.from({ length: quanti }, (_, i) => piuGiorni(settimana, i))
  const attive = lezioni.filter((l) => l.stato !== 'annullata')
  const imposta = (k: string, v: string | null) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }) }
  const generaMese = () => genera.mutate({ p_sede: sedeId!, p_dal: oggiIso(), p_al: piuGiorni(oggiIso(), 27) }, {
    onSuccess: (n) => toast.success(Number(n) ? `${n} lezioni in calendario per le prossime 4 settimane` : 'Il calendario è già aggiornato'),
    onError: (e) => toast.error(messaggioErrore(e)) })

  return (
    <div>
      <PageHeader title="Corsi" description="Calendario delle lezioni con posti, iscritti e lista d'attesa."
        numeri={[
          { etichetta: mese ? 'lezioni in 4 settimane' : 'lezioni in settimana', valore: isLoading ? undefined : attive.length, inCaricamento: isLoading },
          { etichetta: 'iscritti', valore: isLoading ? undefined : attive.reduce((s, l) => s + (l.iscritti ?? 0), 0), inCaricamento: isLoading },
          { etichetta: 'in lista d\'attesa', valore: isLoading ? undefined : attive.reduce((s, l) => s + (l.in_attesa ?? 0), 0), inCaricamento: isLoading },
        ]}
        actions={<><SelettoreSede />{isManager && corsi.length > 0 && <BottoneScrittura onClick={generaMese} disabled={genera.isPending}><Sparkles className="h-4 w-4" /> Genera le lezioni</BottoneScrittura>}</>} />

      <Tabs value={scheda} onValueChange={(v) => imposta('scheda', v)}>
        <TabsList className="mb-4">
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
          <TabsTrigger value="corsi">Corsi e orari</TabsTrigger>
        </TabsList>
        <TabsContent value="calendario">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Settimana precedente" onClick={() => setSettimana(piuGiorni(settimana, -quanti))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" aria-label="Settimana successiva" onClick={() => setSettimana(piuGiorni(settimana, quanti))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" onClick={() => setSettimana(lunedi(oggiIso()))}>Questa settimana</Button>
            <div className="flex gap-1" role="group" aria-label="Periodo del calendario">
              <Button size="sm" variant={mese ? 'ghost' : 'secondary'} aria-pressed={!mese} onClick={() => setMese(false)}>Settimana</Button>
              <Button size="sm" variant={mese ? 'secondary' : 'ghost'} aria-pressed={mese} onClick={() => setMese(true)}>4 settimane</Button>
            </div>
            <span className="text-sm text-muted-foreground">{fmtData(settimana)} – {fmtData(giorni[giorni.length - 1])}</span>
          </div>
          {isLoading ? <Skeleton className="h-72" /> : lezioni.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nessuna lezione in questo periodo" filtrato={!isManager}
              description={corsi.length ? 'Genera le lezioni dagli orari dei corsi per le prossime quattro settimane.' : 'Prima si creano i corsi con giorni e orario.'}
              action={!isManager ? undefined : corsi.length
                ? <Button variant="outline" onClick={generaMese}>Genera le lezioni</Button>
                : <Button variant="outline" onClick={() => imposta('scheda', 'corsi')}>Crea il primo corso</Button>} />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
              {giorni.map((g, i) => {
                const delGiorno = lezioni.filter((l) => isoLocale(new Date(l.inizio!)) === g)
                return (
                  <section key={g} aria-label={`${GIORNI[i % 7]} ${fmtData(g)}`} className={cn('rounded-lg border border-border p-2', g === oggiIso() && 'border-primary')}>
                    <h3 className="mb-2 px-1 text-label uppercase text-muted-foreground">{GIORNI[i % 7]} {fmtData(g).slice(0, 5)}</h3>
                    {delGiorno.length === 0 ? <p className="px-1 py-2 text-xs text-muted-foreground">—</p> : (
                      <ul className="space-y-1.5">{delGiorno.map((l) => {
                        const pieno = (l.posti_liberi ?? 0) === 0
                        return (
                          <li key={l.lezione_id}>
                            <button type="button" onClick={() => imposta('lezione', l.lezione_id)}
                              className={cn('w-full rounded-md border px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                                l.stato === 'annullata' ? 'border-border text-muted-foreground line-through' : pieno ? 'border-warning bg-warning-tenue' : 'border-border bg-card')}>
                              <span className="block font-medium text-foreground">{fmtOra(l.inizio)} · {l.corso}</span>
                              <span className="block text-xs tabular-nums text-muted-foreground">{l.iscritti}/{l.capienza}{l.in_attesa ? ` · ${l.in_attesa} in attesa` : ''}
                                {l.stato === 'svolta' ? ` · ${l.presenti} presenti` : ''}</span>
                            </button>
                          </li>
                        )
                      })}</ul>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="corsi"><CorsiOrari corsi={corsi} /></TabsContent>
      </Tabs>
      {lezioneId && <LezioneDialog lezioneId={lezioneId} onChiudi={() => imposta('lezione', null)} />}
    </div>
  )
}

function LezioneDialog({ lezioneId, onChiudi }: { lezioneId: string; onChiudi: () => void }) {
  const { isManager } = useAuth()
  const { sedeId } = usePalestra()
  const { trainer, sale } = useCatalogoPalestra(sedeId)
  const { data: mioTrainer } = useRpc<string | null>('pal_trainer_corrente', {})
  const { data: righe = [] } = useElenco<LezionePosti>('pal_lezioni_posti', { filtri: { lezione_id: lezioneId } })
  const l = righe[0]
  const { data: prenotazioni = [] } = useElenco<PrenotazioneCorso>('pal_prenotazioni', { filtri: { lezione_id: lezioneId }, ordine: [{ colonna: 'posizione' }, { colonna: 'created_at' }] })
  const ids = prenotazioni.map((p) => p.socio_id)
  const { data: soci = [] } = useElenco<SocioStato>('pal_soci_stato', { filtri: { socio_id: ids }, abilitato: ids.length > 0 })
  const prenota = useInserisci('pal_prenotazioni', TABELLE_CORSI)
  const salva = useSalva('pal_prenotazioni', TABELLE_CORSI)
  const salvaLezione = useSalva('pal_lezioni', TABELLE_CORSI)
  const chiudi = useAzione('pal_chiudi_lezione', TABELLE_CORSI)
  const nome = (id: string) => soci.find((s) => s.socio_id === id)?.nome ?? '…'
  const puoGestire = isManager || (!!mioTrainer && l?.istruttore_id === mioTrainer)
  const iniziata = l ? new Date(l.inizio!) <= new Date() : false
  const gruppi = [['prenotata', 'presente', 'assente'], ['attesa'], ['annullata']]

  return (
    <Dialog open onOpenChange={(o) => !o && onChiudi()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{l ? `${l.corso} · ${fmtData(l.inizio)} alle ${fmtOra(l.inizio)}` : 'Lezione'}</DialogTitle>
          <DialogDescription>
            {l ? `${DISCIPLINA[l.disciplina ?? 'altro']} · ${LIVELLO[l.livello ?? 'tutti']} · ${trainer.find((t) => t.id === l.istruttore_id)?.nome ?? 'istruttore da assegnare'} · ${sale.find((s) => s.id === l.sala_id)?.nome ?? 'sala da assegnare'} · ${l.iscritti}/${l.capienza} posti` : ''}
          </DialogDescription>
        </DialogHeader>
        {!l ? <Skeleton className="h-40" /> : (
          <div className="space-y-4">
            {l.stato === 'programmata' && (
              <div className="space-y-1.5"><Label htmlFor="lz-socio">Prenota un socio</Label>
                <CercaSocio id="lz-socio" onScegli={(s) => prenota.mutate({ lezione_id: lezioneId, socio_id: s.socio_id! }, {
                  onSuccess: (p) => toast.success(p.stato === 'attesa' ? `${s.nome}: in lista d'attesa, posizione ${p.posizione}` : `${s.nome}: posto prenotato`),
                  onError: (e) => toast.error(/23505/.test(JSON.stringify(e)) ? `${s.nome} è già in elenco` : messaggioErrore(e)) })} /></div>
            )}
            {l.stato !== 'programmata' && <Badge tone={l.stato === 'svolta' ? 'success' : 'neutral'}>{l.stato === 'svolta' ? 'Lezione svolta' : 'Lezione annullata'}</Badge>}

            {prenotazioni.length === 0 ? <p className="text-sm text-muted-foreground">Ancora nessun iscritto.</p> : gruppi.map((stati, gi) => {
              const elenco = prenotazioni.filter((p) => stati.includes(p.stato))
              if (elenco.length === 0) return null
              return (
                <section key={gi}>
                  <h4 className="mb-1 flex items-center gap-2 text-label uppercase text-muted-foreground"><Users className="h-3.5 w-3.5" aria-hidden />
                    {gi === 0 ? `Iscritti (${elenco.length})` : gi === 1 ? `Lista d'attesa (${elenco.length})` : `Disdette (${elenco.length})`}</h4>
                  <ul className="divide-y divide-border text-sm">{elenco.map((p) => {
                    const st = PRENOTAZIONE_STATO[p.stato]
                    return (
                      <li key={p.id} className="flex flex-wrap items-center gap-2 py-1.5">
                        <span className="min-w-0 flex-1 truncate text-foreground">{p.stato === 'attesa' ? `${p.posizione}. ` : ''}{nome(p.socio_id)}{p.tardiva ? ' · tardiva' : ''}</span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {l.stato === 'programmata' && p.stato === 'prenotata' && (
                          <BottoneScrittura size="sm" variant="outline" onClick={() => salva.mutate({ id: p.id, values: { stato: 'presente' } }, { onError: (e) => toast.error(messaggioErrore(e)) })}>
                            <CircleCheck className="h-3.5 w-3.5" /> Check-in</BottoneScrittura>)}
                        {l.stato === 'programmata' && (p.stato === 'prenotata' || p.stato === 'attesa') && (
                          <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: p.id, values: { stato: 'annullata' } }, {
                            onSuccess: (x) => toast.success(x.tardiva ? 'Disdetta tardiva: il credito non torna' : 'Disdetta: il posto passa al primo in attesa'),
                            onError: (e) => toast.error(messaggioErrore(e)) })}>Disdici</Button>)}
                      </li>
                    )
                  })}</ul>
                </section>
              )
            })}

            {l.stato === 'programmata' && puoGestire && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                <Button variant="ghost" onClick={() => salvaLezione.mutate({ id: lezioneId, values: { stato: 'annullata' } }, {
                  onSuccess: () => { toast.success('Lezione annullata: iscritti avvisati, crediti restituiti'); onChiudi() }, onError: (e) => toast.error(messaggioErrore(e)) })}>
                  Annulla la lezione</Button>
                {iniziata && <BottoneScrittura variant="outline" disabled={chiudi.isPending} onClick={() => chiudi.mutate({ p_lezione: lezioneId }, {
                  onSuccess: (n) => toast.success(Number(n) ? `Lezione chiusa: ${n} assenti` : 'Lezione chiusa: tutti presenti'), onError: (e) => toast.error(messaggioErrore(e)) })}>
                  Chiudi la lezione</BottoneScrittura>}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CorsiOrari({ corsi }: { corsi: Corso[] }) {
  const { sedeId } = usePalestra()
  const { isManager } = useAuth()
  const { trainer, sale } = useCatalogoPalestra(sedeId)
  const salva = useSalva('pal_corsi', TABELLE_CORSI)
  const vuoto = { nome: '', disciplina: 'pilates', livello: 'tutti', sala: '', istruttore: '', durata: '50', capienza: '20', giorni: [] as number[], ora: '18:00' }
  const [f, setF] = useState(vuoto)

  function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) { toast.error('Dai un nome al corso'); return }
    if (!f.giorni.length) { toast.error('Scegli almeno un giorno'); return }
    salva.mutate({ values: { sede_id: sedeId!, nome: f.nome.trim(), disciplina: f.disciplina, livello: f.livello, sala_id: f.sala || null,
      istruttore_id: f.istruttore || null, durata_min: Number(f.durata) || 50, capienza: Number(f.capienza) || 20, giorni: f.giorni, ora: f.ora } }, {
      onSuccess: () => { toast.success('Corso creato: ora genera le lezioni'); setF(vuoto) }, onError: (err) => toast.error(messaggioErrore(err)) })
  }

  return (
    <div className="space-y-4">
      {isManager && (
        <Card className="p-5">
          <form onSubmit={crea} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2 space-y-1.5"><Label htmlFor="co-nome">Corso</Label><Input id="co-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Pilates del mattino" /></div>
            <div className="space-y-1.5"><Label>Disciplina</Label><Select value={f.disciplina} onValueChange={(v) => setF({ ...f, disciplina: v })}><SelectTrigger aria-label="Disciplina"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(DISCIPLINA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Livello</Label><Select value={f.livello} onValueChange={(v) => setF({ ...f, livello: v })}><SelectTrigger aria-label="Livello"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(LIVELLO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Sala</Label><Select value={f.sala || 'nessuna'} onValueChange={(v) => setF({ ...f, sala: v === 'nessuna' ? '' : v })}><SelectTrigger aria-label="Sala"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuna">Da assegnare</SelectItem>{sale.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Istruttore</Label><Select value={f.istruttore || 'nessuno'} onValueChange={(v) => setF({ ...f, istruttore: v === 'nessuno' ? '' : v })}><SelectTrigger aria-label="Istruttore"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">Da assegnare</SelectItem>{trainer.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="co-dur">Durata (minuti)</Label><Input id="co-dur" type="number" min={10} value={f.durata} onChange={(e) => setF({ ...f, durata: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="co-cap">Capienza</Label><Input id="co-cap" type="number" min={1} value={f.capienza} onChange={(e) => setF({ ...f, capienza: e.target.value })} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Giorni</Label>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Giorni della settimana">{GIORNI.map((g, i) => {
                const n = i + 1; const on = f.giorni.includes(n)
                return <Button key={g} type="button" size="sm" variant={on ? 'secondary' : 'outline'} aria-pressed={on}
                  onClick={() => setF({ ...f, giorni: on ? f.giorni.filter((x) => x !== n) : [...f.giorni, n].sort() })}>{g}</Button>
              })}</div></div>
            <div className="space-y-1.5"><Label htmlFor="co-ora">Alle</Label><Input id="co-ora" type="time" value={f.ora} onChange={(e) => setF({ ...f, ora: e.target.value })} /></div>
            <div className="flex items-end justify-end"><BottoneScrittura type="submit" variant="outline" disabled={salva.isPending}>Crea il corso</BottoneScrittura></div>
          </form>
        </Card>
      )}
      {corsi.length === 0 ? (
        <EmptyState compatto icon={CalendarDays} title="Nessun corso" filtrato={!isManager} description={isManager ? 'Yoga, pilates, spinning, functional…: giorni e orario generano le lezioni.' : 'I corsi li crea la direzione.'}
          action={isManager ? <Button variant="outline" onClick={() => document.getElementById('co-nome')?.focus()}>Crea il primo corso</Button> : undefined} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Corso</TableHead><TableHead>Quando</TableHead><TableHead>Sala</TableHead><TableHead>Istruttore</TableHead>
              <TableHead className="text-right">Capienza</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
            <TableBody>{corsi.map((c) => (
              <TableRow key={c.id}>
                <TableCell><span className="font-medium text-foreground">{c.nome}</span><span className="block text-xs text-muted-foreground">{DISCIPLINA[c.disciplina]} · {LIVELLO[c.livello]}</span></TableCell>
                <TableCell className="text-muted-foreground">{c.giorni.map((g) => GIORNI[g - 1]).join(', ')}{c.ora ? ` alle ${c.ora.slice(0, 5)}` : ''} · {c.durata_min} min</TableCell>
                <TableCell className="text-muted-foreground">{sale.find((s) => s.id === c.sala_id)?.nome ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{trainer.find((t) => t.id === c.istruttore_id)?.nome ?? '—'}</TableCell>
                <TableCell numerica>{c.capienza}</TableCell>
                <TableCell>{isManager
                  ? <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: c.id, values: { attivo: !c.attivo } }, { onError: (e) => toast.error(messaggioErrore(e)) })}>{c.attivo ? 'Attivo · sospendi' : 'Sospeso · riattiva'}</Button>
                  : <Badge tone={c.attivo ? 'success' : 'neutral'}>{c.attivo ? 'Attivo' : 'Sospeso'}</Badge>}</TableCell>
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
