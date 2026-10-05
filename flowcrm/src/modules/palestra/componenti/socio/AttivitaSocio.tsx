/**
 * Ingressi, corsi e personal training del socio (documento Palestra §7,
 * §11–13, §15, §19): storico degli accessi con l'esito, prenotazioni dei
 * corsi con la lista d'attesa, sessioni con il trainer.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useElenco, useInserisci, useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import { usePalestra } from '@/modules/palestra/contesto'
import { useCatalogoPalestra, TABELLE_CORSI, TABELLE_SOCIO, type Accesso, type LezionePosti, type PrenotazioneCorso, type SessionePt, type SocioStato } from '@/modules/palestra/queries'
import { PRENOTAZIONE_STATO, SESSIONE_STATO, SERVIZIO, fmtEuro, fmtGiornoOra, oggiIso, piuGiorni } from '@/modules/palestra/stati'

export function AttivitaSocio({ socio }: { socio: SocioStato }) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Corsi socio={socio} />
      <PersonalTraining socio={socio} />
      <Ingressi socio={socio} />
    </div>
  )
}

function Ingressi({ socio }: { socio: SocioStato }) {
  const { data: accessi = [] } = useElenco<Accesso>('pal_accessi', { filtri: { socio_id: socio.socio_id! }, ordine: [{ colonna: 'ingresso_at', crescente: false }], limite: 40 })
  return (
    <Card className="p-5 xl:col-span-2">
      <h3 className="mb-3 text-title text-foreground">Ingressi</h3>
      {accessi.length === 0 ? <p className="text-sm text-muted-foreground">Ancora nessun ingresso.</p> : (
        <ul className="divide-y divide-border text-sm">{accessi.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 py-2">
            <span className="w-36 tabular-nums text-muted-foreground">{fmtGiornoOra(a.ingresso_at)}</span>
            <Badge tone={a.consentito ? 'success' : 'danger'}>{a.consentito ? 'Entrato' : 'Negato'}</Badge>
            <span className="min-w-0 flex-1 truncate text-foreground">{a.motivo}</span>
            <span className="text-xs text-muted-foreground">{SERVIZIO[a.servizio] ?? a.servizio} · {a.tipo}{a.uscita_at ? ` · uscito ${fmtGiornoOra(a.uscita_at).split(' ').pop()}` : ''}</span>
          </li>))}</ul>
      )}
    </Card>
  )
}

function Corsi({ socio }: { socio: SocioStato }) {
  const { sedeId } = usePalestra()
  const ora = new Date().toISOString()
  const { data: lezioni = [] } = useElenco<LezionePosti>('pal_lezioni_posti', {
    filtri: { sede_id: sedeId ?? undefined, stato: 'programmata' }, tra: { colonna: 'inizio', da: ora, a: `${piuGiorni(oggiIso(), 15)}T00:00` },
    ordine: [{ colonna: 'inizio' }], abilitato: !!sedeId })
  const { data: prenotazioni = [] } = useElenco<PrenotazioneCorso>('pal_prenotazioni', {
    filtri: { socio_id: socio.socio_id! }, ordine: [{ colonna: 'created_at', crescente: false }], limite: 50 })
  const { data: dettagli = [] } = useElenco<LezionePosti>('pal_lezioni_posti', {
    filtri: { lezione_id: prenotazioni.map((p) => p.lezione_id) }, abilitato: prenotazioni.length > 0 })
  const prenota = useInserisci('pal_prenotazioni', TABELLE_CORSI)
  const salva = useSalva('pal_prenotazioni', TABELLE_CORSI)
  const [scelta, setScelta] = useState('')
  const lezione = (id: string) => dettagli.find((l) => l.lezione_id === id)
  const giaPrenotate = new Set(prenotazioni.filter((p) => p.stato !== 'annullata').map((p) => p.lezione_id))

  return (
    <Card className="p-5">
      <h3 className="mb-3 text-title text-foreground">Corsi</h3>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1 space-y-1.5"><Label>Prenota una lezione</Label>
          <Select value={scelta} onValueChange={setScelta}>
            <SelectTrigger aria-label="Lezione da prenotare"><SelectValue placeholder={lezioni.length ? 'Prossimi 15 giorni' : 'Nessuna lezione in calendario'} /></SelectTrigger>
            <SelectContent>{lezioni.filter((l) => !giaPrenotate.has(l.lezione_id!)).map((l) => (
              <SelectItem key={l.lezione_id} value={l.lezione_id!}>{fmtGiornoOra(l.inizio)} · {l.corso} · {l.posti_liberi ? `${l.posti_liberi} posti` : 'lista d\'attesa'}</SelectItem>))}</SelectContent>
          </Select></div>
        <BottoneScrittura variant="outline" disabled={!scelta || prenota.isPending}
          onClick={() => prenota.mutate({ lezione_id: scelta, socio_id: socio.socio_id! }, {
            onSuccess: (p) => { toast.success(p.stato === 'attesa' ? `Corso pieno: in lista d'attesa, posizione ${p.posizione}` : 'Posto prenotato'); setScelta('') },
            onError: (e) => toast.error(messaggioErrore(e)) })}>Prenota</BottoneScrittura>
      </div>
      {prenotazioni.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna prenotazione.</p> : (
        <ul className="divide-y divide-border text-sm">{prenotazioni.map((p) => {
          const l = lezione(p.lezione_id)
          const st = PRENOTAZIONE_STATO[p.stato]
          const futura = l && new Date(l.inizio!) > new Date()
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1"><span className="font-medium text-foreground">{l?.corso ?? '…'}</span>
                <span className="block text-xs text-muted-foreground">{l ? fmtGiornoOra(l.inizio) : ''}{p.tardiva ? ' · disdetta tardiva' : ''}</span></span>
              <Badge tone={st.tone}>{st.label}{p.stato === 'attesa' && p.posizione ? ` · ${p.posizione}°` : ''}</Badge>
              {futura && (p.stato === 'prenotata' || p.stato === 'attesa') && (
                <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: p.id, values: { stato: 'annullata' } }, {
                  onSuccess: (x) => toast.success(x.tardiva ? 'Disdetta tardiva: il credito non torna' : 'Disdetta: posto liberato'), onError: (e) => toast.error(messaggioErrore(e)) })}>Disdici</Button>)}
            </li>
          )
        })}</ul>
      )}
    </Card>
  )
}

function PersonalTraining({ socio }: { socio: SocioStato }) {
  const { sedeId } = usePalestra()
  const { trainer, sale } = useCatalogoPalestra(sedeId)
  const { data: sessioni = [] } = useElenco<SessionePt>('pal_sessioni_pt', { filtri: { socio_id: socio.socio_id! }, ordine: [{ colonna: 'inizio', crescente: false }], limite: 30 })
  const salva = useSalva('pal_sessioni_pt', TABELLE_SOCIO)
  const inserisci = useInserisci('pal_sessioni_pt', TABELLE_SOCIO)
  const [f, setF] = useState({ trainer: socio.trainer_id ?? '', data: piuGiorni(oggiIso(), 1), ora: '10:00', durata: '60', sala: '', tipo: 'allenamento' })
  const pt = trainer.filter((t) => t.personal_trainer)
  const nome = (id: string) => trainer.find((t) => t.id === id)?.nome ?? '…'

  function prenota() {
    const inizio = new Date(`${f.data}T${f.ora}`)
    const fine = new Date(inizio.getTime() + (Number(f.durata) || 60) * 60_000)
    inserisci.mutate({ trainer_id: f.trainer, socio_id: socio.socio_id!, sede_id: sedeId!, sala_id: f.sala || null,
      inizio: inizio.toISOString(), fine: fine.toISOString(), tipo: f.tipo }, {
      onSuccess: (x) => toast.success(x.carnet_id ? 'Sessione prenotata: scalata dal carnet PT'
        : Number(x.prezzo) > 0 ? `Sessione prenotata: ${fmtEuro(x.prezzo)} in «Pagamenti»` : 'Sessione prenotata'),
      onError: (e) => toast.error(/23P01/.test(JSON.stringify(e)) ? `${nome(f.trainer)} ha già un appuntamento a quell'ora` : messaggioErrore(e)),
    })
  }

  return (
    <Card className="p-5">
      <h3 className="mb-3 text-title text-foreground">Personal training</h3>
      {pt.length === 0 ? <p className="mb-3 text-sm text-muted-foreground">Nessun personal trainer: si aggiungono in «Trainer e personale».</p> : (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Select value={f.trainer} onValueChange={(x) => setF({ ...f, trainer: x })}><SelectTrigger aria-label="Trainer"><SelectValue placeholder="Trainer" /></SelectTrigger>
            <SelectContent>{pt.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select>
          <Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} aria-label="Giorno" />
          <Input type="time" value={f.ora} onChange={(e) => setF({ ...f, ora: e.target.value })} aria-label="Ora" />
          <Select value={f.durata} onValueChange={(x) => setF({ ...f, durata: x })}><SelectTrigger aria-label="Durata"><SelectValue /></SelectTrigger>
            <SelectContent>{['30', '45', '60', '90'].map((m) => <SelectItem key={m} value={m}>{m} minuti</SelectItem>)}</SelectContent></Select>
          <Select value={f.tipo} onValueChange={(x) => setF({ ...f, tipo: x })}><SelectTrigger aria-label="Tipo di sessione"><SelectValue /></SelectTrigger>
            <SelectContent>{[['allenamento', 'Allenamento'], ['coppia', 'In coppia'], ['valutazione', 'Valutazione iniziale'], ['follow_up', 'Follow-up'], ['online', 'Online']]
              .map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
          <Select value={f.sala || 'nessuna'} onValueChange={(x) => setF({ ...f, sala: x === 'nessuna' ? '' : x })}><SelectTrigger aria-label="Sala"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nessuna">Sala: qualsiasi</SelectItem>{sale.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent></Select>
          <BottoneScrittura variant="outline" className="col-span-2 sm:col-span-3" disabled={!f.trainer || inserisci.isPending} onClick={prenota}>Prenota la sessione</BottoneScrittura>
        </div>
      )}
      {sessioni.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna sessione.</p> : (
        <ul className="divide-y divide-border text-sm">{sessioni.map((x) => {
          const st = SESSIONE_STATO[x.stato]
          return (
            <li key={x.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1"><span className="font-medium text-foreground">{fmtGiornoOra(x.inizio)} · {nome(x.trainer_id)}</span>
                <span className="block text-xs text-muted-foreground">{x.carnet_id ? 'dal carnet' : Number(x.prezzo) > 0 ? fmtEuro(x.prezzo) : 'senza addebito'}</span></span>
              <Badge tone={st.tone}>{st.label}</Badge>
              {x.stato === 'prenotata' && <>
                <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: x.id, values: { stato: 'svolta' } }, { onSuccess: () => toast.success('Sessione svolta'), onError: (e) => toast.error(messaggioErrore(e)) })}>Svolta</Button>
                <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: x.id, values: { stato: 'annullata' } }, { onSuccess: () => toast.success('Annullata: credito o addebito restituito'), onError: (e) => toast.error(messaggioErrore(e)) })}>Annulla</Button>
              </>}
            </li>
          )
        })}</ul>
      )}
    </Card>
  )
}
