/**
 * Agenda del personal training e dei servizi wellness (documento Palestra
 * §14–15, §19–20): sessioni del giorno per trainer, appuntamenti con
 * cabina e operatore mai doppi, anche per clienti esterni.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Flower2, UserRound } from 'lucide-react'
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
import { useAuth } from '@/hooks/useAuth'
import type { Tables } from '@/lib/supabase'
import { useElenco, useSalva, useInserisci, messaggioErrore } from '@/lib/queries/fondamenta'
import { usePalestra } from '@/modules/palestra/contesto'
import { ConSede, SelettoreSede } from '@/modules/palestra/componenti/ConSede'
import { CercaSocio } from '@/modules/palestra/componenti/CercaSocio'
import { useCatalogoPalestra, TABELLE_SOCIO, type Appuntamento, type ServizioWellness, type SessionePt, type SocioStato } from '@/modules/palestra/queries'
import { APPUNTAMENTO_STATO, SESSIONE_STATO, WELLNESS_TIPO, fmtData, fmtEuro, fmtOra, oggiIso, piuGiorni } from '@/modules/palestra/stati'

export function AgendaPage() {
  return <ConSede><Agenda_ /></ConSede>
}

function Agenda_() {
  const [giorno, setGiorno] = useState(oggiIso())
  return (
    <div>
      <PageHeader title="Personal training e wellness" description="Agenda dei trainer e degli appuntamenti: niente doppioni di trainer, operatore o cabina."
        actions={<SelettoreSede />} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Giorno precedente" onClick={() => setGiorno(piuGiorni(giorno, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <Input type="date" className="w-44" value={giorno} onChange={(e) => e.target.value && setGiorno(e.target.value)} aria-label="Giorno" />
        <Button variant="outline" size="icon" aria-label="Giorno successivo" onClick={() => setGiorno(piuGiorni(giorno, 1))}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={() => setGiorno(oggiIso())}>Oggi</Button>
      </div>
      <Tabs defaultValue="pt">
        <TabsList className="mb-4"><TabsTrigger value="pt">Personal training</TabsTrigger><TabsTrigger value="wellness">Wellness</TabsTrigger></TabsList>
        <TabsContent value="pt"><AgendaPt giorno={giorno} /></TabsContent>
        <TabsContent value="wellness"><Wellness giorno={giorno} /></TabsContent>
      </Tabs>
    </div>
  )
}

function AgendaPt({ giorno }: { giorno: string }) {
  const { sedeId } = usePalestra()
  const { trainer } = useCatalogoPalestra(sedeId)
  const { data: sessioni = [] } = useElenco<SessionePt>('pal_sessioni_pt', {
    filtri: { sede_id: sedeId ?? undefined }, tra: { colonna: 'inizio', da: `${giorno}T00:00`, a: `${piuGiorni(giorno, 1)}T00:00` },
    ordine: [{ colonna: 'inizio' }], abilitato: !!sedeId })
  const ids = [...new Set(sessioni.map((s) => s.socio_id))]
  const { data: soci = [] } = useElenco<SocioStato>('pal_soci_stato', { filtri: { socio_id: ids }, abilitato: ids.length > 0 })
  const salva = useSalva('pal_sessioni_pt', TABELLE_SOCIO)
  const inserisci = useInserisci('pal_sessioni_pt', TABELLE_SOCIO)
  const [f, setF] = useState({ trainer: '', ora: '10:00', durata: '60' })
  const [socio, setSocio] = useState<SocioStato | null>(null)
  const pt = trainer.filter((t) => t.personal_trainer)
  const trainerScelto = f.trainer || socio?.trainer_id || ''

  function prenota() {
    const inizio = new Date(`${giorno}T${f.ora}`)
    inserisci.mutate({ trainer_id: trainerScelto, socio_id: socio!.socio_id!, sede_id: sedeId!, inizio: inizio.toISOString(),
      fine: new Date(inizio.getTime() + Number(f.durata) * 60_000).toISOString() }, {
      onSuccess: (x) => { toast.success(x.carnet_id ? `${socio!.nome}: scalata dal carnet PT` : Number(x.prezzo) > 0 ? `${socio!.nome}: ${fmtEuro(x.prezzo)} da incassare` : 'Sessione prenotata'); setSocio(null) },
      onError: (e) => toast.error(/23P01/.test(JSON.stringify(e)) ? 'Il trainer ha già un appuntamento a quell\'ora' : messaggioErrore(e)) })
  }

  if (pt.length === 0) {
    return <EmptyState icon={UserRound} title="Nessun personal trainer" description="I trainer con tariffe, competenze e disponibilità si aggiungono in «Trainer e personale»."
      action={<Button asChild variant="outline"><Link to="/palestra/personale">Vai ai trainer</Link></Button>} />
  }
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5"><Label htmlFor="ag-socio">Socio</Label>
            {socio ? <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span className="text-foreground">{socio.nome}</span>
              <Button size="sm" variant="ghost" onClick={() => setSocio(null)}>Cambia</Button></div> : <CercaSocio id="ag-socio" onScegli={setSocio} />}</div>
          <div className="w-44 space-y-1.5"><Label>Trainer</Label>
            <Select value={trainerScelto} onValueChange={(v) => setF({ ...f, trainer: v })}><SelectTrigger aria-label="Trainer"><SelectValue placeholder="Scegli…" /></SelectTrigger>
              <SelectContent>{pt.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="w-28 space-y-1.5"><Label htmlFor="ag-ora">Alle</Label><Input id="ag-ora" type="time" value={f.ora} onChange={(e) => setF({ ...f, ora: e.target.value })} /></div>
          <div className="w-32 space-y-1.5"><Label>Durata</Label>
            <Select value={f.durata} onValueChange={(v) => setF({ ...f, durata: v })}><SelectTrigger aria-label="Durata"><SelectValue /></SelectTrigger>
              <SelectContent>{['30', '45', '60', '90'].map((m) => <SelectItem key={m} value={m}>{m} minuti</SelectItem>)}</SelectContent></Select></div>
          <BottoneScrittura variant="outline" disabled={!socio || !trainerScelto || inserisci.isPending} onClick={prenota}>Prenota per il {fmtData(giorno).slice(0, 5)}</BottoneScrittura>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {pt.map((t) => {
          const sue = sessioni.filter((s) => s.trainer_id === t.id)
          return (
            <Card key={t.id} className="p-4">
              <h3 className="mb-2 flex items-center justify-between text-title text-foreground">{t.nome}<span className="text-sm font-normal tabular-nums text-muted-foreground">{sue.filter((s) => s.stato !== 'annullata').length} sessioni</span></h3>
              {sue.length === 0 ? <p className="text-sm text-muted-foreground">Libero.</p> : (
                <ul className="divide-y divide-border text-sm">{sue.map((x) => {
                  const st = SESSIONE_STATO[x.stato]
                  return (
                    <li key={x.id} className="flex flex-wrap items-center gap-2 py-2">
                      <span className="w-24 tabular-nums text-muted-foreground">{fmtOra(x.inizio)}–{fmtOra(x.fine)}</span>
                      <Link to={`/palestra/soci/${x.socio_id}`} className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-primary-testo">{soci.find((s) => s.socio_id === x.socio_id)?.nome ?? '…'}</Link>
                      {x.stato === 'prenotata' ? <>
                        <BottoneScrittura size="sm" variant="outline" onClick={() => salva.mutate({ id: x.id, values: { stato: 'svolta' } }, { onError: (e) => toast.error(messaggioErrore(e)) })}>Svolta</BottoneScrittura>
                        <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: x.id, values: { stato: 'no_show' } }, { onSuccess: () => toast.success('Non presentato: il credito resta usato') })}>Assente</Button>
                        <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: x.id, values: { stato: 'annullata' } }, { onSuccess: () => toast.success('Annullata: credito restituito') })}>Annulla</Button>
                      </> : <Badge tone={st.tone}>{st.label}</Badge>}
                    </li>
                  )
                })}</ul>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

const NESSUNO = 'nessuno'

function Wellness({ giorno }: { giorno: string }) {
  const { sedeId } = usePalestra()
  const { isManager } = useAuth()
  const { data: servizi = [] } = useElenco<ServizioWellness>('pal_servizi', { filtri: { sede_id: sedeId ?? undefined, attivo: true }, ordine: [{ colonna: 'nome' }], abilitato: !!sedeId })
  const { data: appuntamenti = [] } = useElenco<Appuntamento>('pal_appuntamenti', {
    filtri: { sede_id: sedeId ?? undefined }, tra: { colonna: 'inizio', da: `${giorno}T00:00`, a: `${piuGiorni(giorno, 1)}T00:00` },
    ordine: [{ colonna: 'inizio' }], abilitato: !!sedeId })
  const { data: persone = [] } = useElenco<Pick<Tables<'user_profiles'>, 'id' | 'nome' | 'cognome' | 'attivo'>>('user_profiles', { select: 'id, nome, cognome, attivo', ordine: [{ colonna: 'nome' }] })
  const ids = appuntamenti.map((a) => a.socio_id).filter(Boolean) as string[]
  const { data: soci = [] } = useElenco<SocioStato>('pal_soci_stato', { filtri: { socio_id: ids }, abilitato: ids.length > 0 })
  const inserisci = useInserisci('pal_appuntamenti', TABELLE_SOCIO)
  const salva = useSalva('pal_appuntamenti', TABELLE_SOCIO)
  const salvaServizio = useSalva('pal_servizi')
  const [f, setF] = useState({ servizio: '', ora: '15:00', operatore: NESSUNO, risorsa: '', esterno: '' })
  const [socio, setSocio] = useState<SocioStato | null>(null)
  const [n, setN] = useState({ nome: '', tipo: 'massaggio', durata: '50', prezzo: '', cabine: '', operatore: true, carnet: NESSUNO })
  const servizio = servizi.find((s) => s.id === f.servizio)

  function prenota(e: FormEvent) {
    e.preventDefault()
    if (!servizio || (!socio && !f.esterno.trim())) { toast.error('Scegli il servizio e il cliente'); return }
    inserisci.mutate({ servizio_id: servizio.id, sede_id: sedeId!, socio_id: socio?.socio_id ?? null, cliente_nome: socio ? null : f.esterno.trim(),
      operatore_id: f.operatore === NESSUNO ? null : f.operatore, risorsa: f.risorsa || null, inizio: new Date(`${giorno}T${f.ora}`).toISOString() }, {
      onSuccess: (x) => { toast.success(x.carnet_id ? 'Prenotato: scalato dal carnet' : `Prenotato: ${fmtEuro(x.prezzo)}${socio ? ' nei pagamenti del socio' : ' da incassare in cassa'}`); setSocio(null); setF({ ...f, esterno: '' }) },
      onError: (err) => toast.error(/23P01/.test(JSON.stringify(err)) ? 'Cabina o operatore già impegnati a quell\'ora' : messaggioErrore(err)) })
  }

  return (
    <div className="space-y-4">
      {servizi.length === 0 ? (
        <EmptyState icon={Flower2} title="Nessun servizio wellness" filtrato={!isManager}
          description="Sauna, massaggi, estetica, solarium, fisioterapia, nutrizione: con durata, prezzo, cabine e operatore."
          action={isManager ? <Button variant="outline" onClick={() => document.getElementById('ws-nome')?.focus()}>Aggiungi il primo servizio</Button> : undefined} />
      ) : (
        <Card className="p-4">
          <form onSubmit={prenota} className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 xl:grid-cols-7">
            <div className="col-span-2 space-y-1.5"><Label>Servizio</Label>
              <Select value={f.servizio} onValueChange={(v) => setF({ ...f, servizio: v, risorsa: '' })}><SelectTrigger aria-label="Servizio wellness"><SelectValue placeholder="Scegli…" /></SelectTrigger>
                <SelectContent>{servizi.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome} · {s.durata_min} min · {fmtEuro(s.prezzo)}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="wl-socio">Socio o cliente esterno</Label>
              {socio ? <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span>{socio.nome}</span><Button type="button" size="sm" variant="ghost" onClick={() => setSocio(null)}>Cambia</Button></div>
                : <div className="grid grid-cols-2 gap-2"><CercaSocio id="wl-socio" onScegli={setSocio} segnaposto="Socio" />
                    <Input value={f.esterno} onChange={(e) => setF({ ...f, esterno: e.target.value })} placeholder="Oppure nome esterno" aria-label="Cliente esterno" /></div>}</div>
            <div className="space-y-1.5"><Label htmlFor="wl-ora">Alle</Label><Input id="wl-ora" type="time" value={f.ora} onChange={(e) => setF({ ...f, ora: e.target.value })} /></div>
            {servizio && servizio.risorse.length > 0 && <div className="space-y-1.5"><Label>Cabina</Label>
              <Select value={f.risorsa} onValueChange={(v) => setF({ ...f, risorsa: v })}><SelectTrigger aria-label="Cabina"><SelectValue placeholder="Scegli…" /></SelectTrigger>
                <SelectContent>{servizio.risorse.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>}
            {servizio?.richiede_operatore && <div className="space-y-1.5"><Label>Operatore</Label>
              <Select value={f.operatore} onValueChange={(v) => setF({ ...f, operatore: v })}><SelectTrigger aria-label="Operatore"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NESSUNO}>Scegli…</SelectItem>{persone.filter((u) => u.attivo).map((u) => <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>)}</SelectContent></Select></div>}
            <BottoneScrittura type="submit" variant="outline" disabled={inserisci.isPending}>Prenota</BottoneScrittura>
          </form>
        </Card>
      )}

      {appuntamenti.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-2 text-title text-foreground">Appuntamenti del {fmtData(giorno)}</h3>
          <ul className="divide-y divide-border text-sm">{appuntamenti.map((a) => {
            const st = APPUNTAMENTO_STATO[a.stato]
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="w-24 tabular-nums text-muted-foreground">{fmtOra(a.inizio)}–{fmtOra(a.fine)}</span>
                <span className="min-w-0 flex-1"><span className="font-medium text-foreground">{a.socio_id ? soci.find((s) => s.socio_id === a.socio_id)?.nome ?? '…' : a.cliente_nome}</span>
                  <span className="block text-xs text-muted-foreground">{servizi.find((s) => s.id === a.servizio_id)?.nome}{a.risorsa ? ` · ${a.risorsa}` : ''}{a.carnet_id ? ' · dal carnet' : Number(a.prezzo) > 0 ? ` · ${fmtEuro(a.prezzo)}` : ''}</span></span>
                {a.stato === 'prenotato' ? <>
                  <BottoneScrittura size="sm" variant="outline" onClick={() => salva.mutate({ id: a.id, values: { stato: 'svolto' } }, { onError: (e) => toast.error(messaggioErrore(e)) })}>Svolto</BottoneScrittura>
                  <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: a.id, values: { stato: 'annullato' } }, { onSuccess: () => toast.success('Annullato: credito o addebito restituito') })}>Annulla</Button>
                </> : <Badge tone={st.tone}>{st.label}</Badge>}
              </li>
            )
          })}</ul>
        </Card>
      )}

      {isManager && (
        <Card className="p-4">
          <h3 className="mb-2 text-title text-foreground">Nuovo servizio</h3>
          <form className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 xl:grid-cols-7" onSubmit={(e) => { e.preventDefault()
            if (!n.nome.trim()) return
            salvaServizio.mutate({ values: { sede_id: sedeId!, nome: n.nome.trim(), tipo: n.tipo, durata_min: Number(n.durata) || 50, prezzo: Number(n.prezzo.replace(',', '.')) || 0,
              risorse: n.cabine.split(',').map((x) => x.trim()).filter(Boolean), richiede_operatore: n.operatore, carnet: n.carnet === NESSUNO ? null : n.carnet } }, {
              onSuccess: () => { toast.success('Servizio aggiunto'); setN({ ...n, nome: '', prezzo: '' }) }, onError: (err) => toast.error(messaggioErrore(err)) }) }}>
            <div className="col-span-2 space-y-1.5"><Label htmlFor="ws-nome">Nome</Label><Input id="ws-nome" value={n.nome} onChange={(e) => setN({ ...n, nome: e.target.value })} placeholder="Massaggio sportivo" /></div>
            <div className="space-y-1.5"><Label>Tipo</Label><Select value={n.tipo} onValueChange={(v) => setN({ ...n, tipo: v })}><SelectTrigger aria-label="Tipo di servizio"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(WELLNESS_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="ws-dur">Minuti</Label><Input id="ws-dur" type="number" min={5} value={n.durata} onChange={(e) => setN({ ...n, durata: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ws-pr">Prezzo (€)</Label><Input id="ws-pr" inputMode="decimal" value={n.prezzo} onChange={(e) => setN({ ...n, prezzo: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ws-cab">Cabine</Label><Input id="ws-cab" value={n.cabine} onChange={(e) => setN({ ...n, cabine: e.target.value })} placeholder="Cabina 1, Cabina 2" /></div>
            <div className="space-y-1.5"><Label>Carnet</Label><Select value={n.carnet} onValueChange={(v) => setN({ ...n, carnet: v })}><SelectTrigger aria-label="Carnet utilizzabile"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={NESSUNO}>Nessuno</SelectItem><SelectItem value="massaggi">Massaggi</SelectItem><SelectItem value="wellness">Wellness</SelectItem></SelectContent></Select></div>
            <BottoneScrittura type="submit" variant="outline" className="col-span-2 md:col-span-1" disabled={!n.nome.trim()}>Aggiungi</BottoneScrittura>
          </form>
        </Card>
      )}
    </div>
  )
}
