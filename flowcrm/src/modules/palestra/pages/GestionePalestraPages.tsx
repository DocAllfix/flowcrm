/**
 * Pagine di gestione della palestra: trainer, certificazioni e turni (§14,
 * §38–39), spogliatoi (§26), magazzino dei prodotti (§21–22), attrezzature,
 * pulizie e sicurezza (§23–25, §40), eventi (§28), fidelizzazione, riscontri
 * e campagne (§33–34, §36–37). Le sezioni sono quelle condivise delle fondamenta.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { KeyRound, Medal, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { MagazzinoSezione } from '@/components/condivisi/MagazzinoSezione'
import { ControlliSezione } from '@/components/condivisi/ControlliSezione'
import { TurniSezione } from '@/components/condivisi/TurniSezione'
import { EventiSezione } from '@/components/condivisi/EventiSezione'
import { FidelizzazioneSezione } from '@/components/condivisi/FidelizzazioneSezione'
import { FeedbackSezione } from '@/components/condivisi/FeedbackSezione'
import { CampagneSezione } from '@/components/condivisi/CampagneSezione'
import { useAuth } from '@/hooks/useAuth'
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import { usePalestra } from '@/modules/palestra/contesto'
import { ConSede, SelettoreSede } from '@/modules/palestra/componenti/ConSede'
import { FotoDialog } from '@/components/condivisi/FotoDialog'
import type { Armadietto, SocioStato, Trainer } from '@/modules/palestra/queries'
import { CERTIFICAZIONE_TIPO, fmtData, fmtEuro, oggiIso, piuGiorni } from '@/modules/palestra/stati'

type Riepilogo = Database['public']['Views']['pal_trainer_riepilogo']['Row']
type Certificazione = Tables<'pal_certificazioni'>
type Dipendente = Pick<Tables<'dipendenti'>, 'id' | 'nome' | 'cognome' | 'attivo'>
type Utente = Pick<Tables<'user_profiles'>, 'id' | 'nome' | 'cognome' | 'attivo'>
const NESSUNO = 'nessuno'
const num = (s: string) => Number(s.replace(',', '.')) || 0

// ── Trainer, certificazioni, turni ──────────────────────────────────────
export function PersonalePalestraPage() {
  return (
    <ConSede>
      <PageHeader title="Trainer e personale" description="Personal trainer e istruttori con tariffe e compensi, certificazioni in scadenza, turni e presenze."
        actions={<SelettoreSede />} />
      <Tabs defaultValue="trainer">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="trainer">Trainer e istruttori</TabsTrigger><TabsTrigger value="certificazioni">Certificazioni</TabsTrigger><TabsTrigger value="turni">Turni</TabsTrigger>
        </TabsList>
        <TabsContent value="trainer"><TrainerElenco /></TabsContent>
        <TabsContent value="certificazioni"><Certificazioni /></TabsContent>
        <TabsContent value="turni"><TurniSezione modulo="palestra" reparti={['reception', 'sala', 'corsi', 'personal training', 'wellness', 'pulizie', 'manutenzione', 'direzione']} /></TabsContent>
      </Tabs>
    </ConSede>
  )
}

function TrainerElenco() {
  const { isManager } = useAuth()
  const { data: trainer = [] } = useElenco<Trainer>('pal_trainer', { ordine: [{ colonna: 'nome' }] })
  const { data: riepilogo = [] } = useElenco<Riepilogo>('pal_trainer_riepilogo')
  const { data: utenti = [] } = useElenco<Utente>('user_profiles', { select: 'id, nome, cognome, attivo', ordine: [{ colonna: 'nome' }], abilitato: isManager })
  const salva = useSalva('pal_trainer', ['pal_trainer_riepilogo'])
  const vuoto = { nome: '', utente: NESSUNO, pt: true, competenze: '', specializzazioni: '', tariffa: '', compensoSessione: '', compensoLezione: '', dalle: '', alle: '' }
  const [f, setF] = useState(vuoto)

  function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) return
    const lista = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)
    salva.mutate({ values: { nome: f.nome.trim(), user_id: f.utente === NESSUNO ? null : f.utente, personal_trainer: f.pt, competenze: lista(f.competenze),
      specializzazioni: lista(f.specializzazioni), disponibilita: f.dalle && f.alle ? [{ giorni: [1, 2, 3, 4, 5, 6], dalle: f.dalle, alle: f.alle }] : [],
      tariffa_sessione: num(f.tariffa), compenso_sessione: num(f.compensoSessione), compenso_lezione: num(f.compensoLezione) } }, {
      onSuccess: () => { toast.success('Trainer aggiunto'); setF(vuoto) },
      onError: (err) => toast.error(/23505/.test(JSON.stringify(err)) ? 'Questo utente è già collegato a un trainer' : messaggioErrore(err)) })
  }

  return (
    <div className="space-y-4">
      {isManager && (
        <Card className="p-5">
          <form onSubmit={crea} className="grid grid-cols-2 items-end gap-3 md:grid-cols-4">
            <div className="space-y-1.5"><Label htmlFor="tr-nome">Nome</Label><Input id="tr-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Accesso al gestionale</Label>
              <Select value={f.utente} onValueChange={(v) => setF({ ...f, utente: v })}><SelectTrigger aria-label="Utente collegato"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NESSUNO}>Nessuno</SelectItem>{utenti.filter((u) => u.attivo).map((u) => <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="tr-comp">Competenze</Label><Input id="tr-comp" value={f.competenze} onChange={(e) => setF({ ...f, competenze: e.target.value })} placeholder="Pilates, functional" /></div>
            <div className="space-y-1.5"><Label htmlFor="tr-spec">Specializzazioni</Label><Input id="tr-spec" value={f.specializzazioni} onChange={(e) => setF({ ...f, specializzazioni: e.target.value })} placeholder="Posturale, preparazione atletica" /></div>
            <div className="space-y-1.5"><Label htmlFor="tr-tar">Tariffa sessione (€)</Label><Input id="tr-tar" inputMode="decimal" value={f.tariffa} onChange={(e) => setF({ ...f, tariffa: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tr-cs">Compenso a sessione (€)</Label><Input id="tr-cs" inputMode="decimal" value={f.compensoSessione} onChange={(e) => setF({ ...f, compensoSessione: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tr-cl">Compenso a lezione (€)</Label><Input id="tr-cl" inputMode="decimal" value={f.compensoLezione} onChange={(e) => setF({ ...f, compensoLezione: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tr-dalle">Disponibile dalle</Label><Input id="tr-dalle" type="time" value={f.dalle} onChange={(e) => setF({ ...f, dalle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tr-alle">alle</Label><Input id="tr-alle" type="time" value={f.alle} onChange={(e) => setF({ ...f, alle: e.target.value })} /></div>
            <div className="col-span-2 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-foreground"><Switch checked={f.pt} onCheckedChange={(v) => setF({ ...f, pt: v })} aria-label="Fa personal training" />Personal trainer</label>
              <BottoneScrittura type="submit" variant="outline" disabled={!f.nome.trim() || salva.isPending}>Aggiungi</BottoneScrittura></div>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">Collegando l'utente, il trainer vede misure e valutazioni dei soci che gli sono assegnati (e solo quelli).</p>
        </Card>
      )}
      {trainer.length === 0 ? (
        <EmptyState compatto icon={UserRound} title="Nessun trainer" filtrato={!isManager} description="Personal trainer e istruttori dei corsi, con tariffe e compensi."
          action={isManager ? <Button variant="outline" onClick={() => document.getElementById('tr-nome')?.focus()}>Aggiungi il primo</Button> : undefined} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Trainer</TableHead><TableHead>Competenze</TableHead><TableHead className="text-right">Clienti</TableHead>
              <TableHead className="text-right">Sessioni fatte</TableHead><TableHead className="text-right">Residue dei clienti</TableHead><TableHead className="text-right">Tariffa</TableHead>
              <TableHead className="text-right">Compensi del mese</TableHead><TableHead>Attivo</TableHead></TableRow></TableHeader>
            <TableBody>{trainer.map((t) => {
              const r = riepilogo.find((x) => x.trainer_id === t.id)
              return (
                <TableRow key={t.id}>
                  <TableCell><span className="font-medium text-foreground">{t.nome}</span><span className="block text-xs text-muted-foreground">{t.personal_trainer ? 'Personal trainer' : 'Istruttore dei corsi'}{t.user_id ? ' · con accesso' : ''}
                    {(t.disponibilita as { dalle: string; alle: string }[]).map((d, i) => <span key={i}> · {d.dalle}–{d.alle}</span>)}</span></TableCell>
                  <TableCell className="text-muted-foreground">{[...t.competenze, ...t.specializzazioni].join(', ') || '—'}</TableCell>
                  <TableCell numerica>{r?.clienti ?? 0}</TableCell><TableCell numerica>{r?.sessioni_svolte ?? 0}</TableCell><TableCell numerica>{r?.sessioni_residue_clienti ?? 0}</TableCell>
                  <TableCell numerica>{fmtEuro(t.tariffa_sessione)}</TableCell>
                  <TableCell numerica>{r?.compensi_mese != null ? fmtEuro(r.compensi_mese) : '—'}</TableCell>
                  <TableCell>{isManager ? <Switch checked={t.attivo} aria-label={`${t.nome} attivo`} onCheckedChange={(v) => salva.mutate({ id: t.id, values: { attivo: v } })} /> : <Badge tone={t.attivo ? 'success' : 'neutral'}>{t.attivo ? 'Sì' : 'No'}</Badge>}</TableCell>
                </TableRow>
              )
            })}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Certificazioni() {
  const { isManager } = useAuth()
  const { data: elenco = [] } = useElenco<Certificazione>('pal_certificazioni', { ordine: [{ colonna: 'scadenza' }] })
  const { data: dipendenti = [] } = useElenco<Dipendente>('dipendenti', { select: 'id, nome, cognome, attivo', ordine: [{ colonna: 'cognome' }] })
  const salva = useSalva('pal_certificazioni', ['scadenze_moduli'])
  const [f, setF] = useState({ dipendente: '', certificazione: '', tipo: 'abilitazione', ente: '', conseguita: '', scadenza: '' })
  const oggi = oggiIso()
  const chi = (id: string) => { const d = dipendenti.find((x) => x.id === id); return d ? `${d.nome} ${d.cognome}` : '…' }
  return (
    <div className="space-y-4">
      {isManager && (
        <Card className="p-5">
          {dipendenti.length === 0 ? (
            <p className="text-sm text-muted-foreground">Prima si registrano i dipendenti in <Link to="/personale" className="underline underline-offset-2">Amministrazione → Personale</Link>.</p>
          ) : (
            <form className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 xl:grid-cols-7" onSubmit={(e) => { e.preventDefault()
              if (!f.dipendente || !f.certificazione.trim()) { toast.error('Scegli la persona e scrivi la certificazione'); return }
              salva.mutate({ values: { dipendente_id: f.dipendente, certificazione: f.certificazione.trim(), tipo: f.tipo, ente: f.ente.trim() || null,
                conseguita_il: f.conseguita || null, scadenza: f.scadenza || null } }, {
                onSuccess: () => { toast.success('Certificazione registrata: avviso prima della scadenza'); setF({ ...f, certificazione: '', ente: '', conseguita: '', scadenza: '' }) },
                onError: (err) => toast.error(messaggioErrore(err)) }) }}>
              <div className="space-y-1.5"><Label>Persona</Label><Select value={f.dipendente} onValueChange={(v) => setF({ ...f, dipendente: v })}><SelectTrigger id="ce-dip" aria-label="Dipendente"><SelectValue placeholder="Scegli…" /></SelectTrigger>
                <SelectContent>{dipendenti.filter((d) => d.attivo).map((d) => <SelectItem key={d.id} value={d.id}>{d.nome} {d.cognome}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-2 space-y-1.5"><Label htmlFor="ce-nome">Certificazione</Label><Input id="ce-nome" value={f.certificazione} onChange={(e) => setF({ ...f, certificazione: e.target.value })} placeholder="Istruttore Pilates Matwork" /></div>
              <div className="space-y-1.5"><Label>Tipo</Label><Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger aria-label="Tipo di certificazione"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CERTIFICAZIONE_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor="ce-ente">Ente</Label><Input id="ce-ente" value={f.ente} onChange={(e) => setF({ ...f, ente: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="ce-da">Conseguita il</Label><Input id="ce-da" type="date" value={f.conseguita} onChange={(e) => setF({ ...f, conseguita: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="ce-a">Scade il</Label><Input id="ce-a" type="date" value={f.scadenza} onChange={(e) => setF({ ...f, scadenza: e.target.value })} /></div>
              <div className="col-span-2 flex justify-end md:col-span-4 xl:col-span-7"><BottoneScrittura type="submit" variant="outline" disabled={salva.isPending}>Registra</BottoneScrittura></div>
            </form>
          )}
        </Card>
      )}
      {elenco.length === 0 ? (
        <EmptyState compatto icon={Medal} title="Nessuna certificazione" filtrato={!isManager || dipendenti.length === 0} description="Abilitazioni, brevetti, primo soccorso e BLSD con l'ente, la scadenza e il documento."
          action={isManager && dipendenti.length > 0 ? <Button variant="outline" onClick={() => document.getElementById('ce-dip')?.focus()}>Registra la prima</Button> : undefined} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Persona</TableHead><TableHead>Certificazione</TableHead><TableHead>Ente</TableHead><TableHead>Conseguita</TableHead>
              <TableHead>Scadenza</TableHead><TableHead>Stato</TableHead><TableHead><span className="sr-only">Documento</span></TableHead></TableRow></TableHeader>
            <TableBody>{elenco.map((c) => {
              const stato = !c.scadenza ? ['Senza scadenza', 'neutral'] : c.scadenza < oggi ? ['Scaduta', 'danger'] : c.scadenza <= piuGiorni(oggi, 60) ? ['In scadenza', 'warning'] : ['Valida', 'success']
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-foreground">{chi(c.dipendente_id)}</TableCell>
                  <TableCell><span className="text-foreground">{c.certificazione}</span><span className="block text-xs text-muted-foreground">{CERTIFICAZIONE_TIPO[c.tipo]}</span></TableCell>
                  <TableCell className="text-muted-foreground">{c.ente ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtData(c.conseguita_il)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtData(c.scadenza)}</TableCell>
                  <TableCell><Badge tone={stato[1] as 'neutral'}>{stato[0]}</Badge></TableCell>
                  <TableCell className="text-right"><FotoDialog entita="pal_certificazioni" entitaId={c.id} titolo={`${chi(c.dipendente_id)} · ${c.certificazione}`} categorie={['attestato', 'documento']} /></TableCell>
                </TableRow>
              )
            })}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

// ── Spogliatoi ──────────────────────────────────────────────────────────
export function SpogliatoiPage() {
  return <ConSede><Spogliatoi_ /></ConSede>
}

function Spogliatoi_() {
  const { sedeId } = usePalestra()
  const { isManager } = useAuth()
  const { data: armadietti = [], isLoading } = useElenco<Armadietto>('pal_armadietti', { filtri: { sede_id: sedeId ?? undefined }, ordine: [{ colonna: 'zona' }, { colonna: 'numero' }], abilitato: !!sedeId })
  const ids = armadietti.map((a) => a.socio_id).filter(Boolean) as string[]
  const { data: soci = [] } = useElenco<SocioStato>('pal_soci_stato', { filtri: { socio_id: ids }, abilitato: ids.length > 0 })
  const salva = useSalva('pal_armadietti', ['scadenze_moduli'])
  const [f, setF] = useState({ zona: 'Spogliatoio uomini', da: '1', a: '20', cauzione: '0' })
  const [inCorso, setInCorso] = useState(false)
  const oggi = oggiIso()

  async function crea(e: FormEvent) {
    e.preventDefault()
    const da = Number(f.da), a = Number(f.a)
    if (!(da > 0) || a < da || a - da > 300) { toast.error('Numeri non validi (al massimo 300 per volta)'); return }
    setInCorso(true)
    try {
      for (let n = da; n <= a; n++) {
        const sigla = f.zona.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? ''
        await salva.mutateAsync({ values: { sede_id: sedeId!, numero: `${sigla}${n}`, zona: f.zona.trim() || null, cauzione: num(f.cauzione) } })
      }
      toast.success(`${a - da + 1} armadietti aggiunti`)
    } catch (err) { toast.error(/23505/.test(JSON.stringify(err)) ? 'Alcuni numeri esistono già in questa zona' : messaggioErrore(err)) } finally { setInCorso(false) }
  }

  const zone = [...new Set(armadietti.map((a) => a.zona ?? 'Armadietti'))]
  return (
    <div>
      <PageHeader title="Spogliatoi" description="Armadietti con il socio assegnatario, chiave, cauzione e scadenza dell'assegnazione."
        numeri={[
          { etichetta: 'armadietti', valore: isLoading ? undefined : armadietti.length, inCaricamento: isLoading },
          { etichetta: 'assegnati', valore: isLoading ? undefined : armadietti.filter((a) => a.stato === 'assegnato').length, inCaricamento: isLoading },
          { etichetta: 'liberi', valore: isLoading ? undefined : armadietti.filter((a) => a.stato === 'libero').length, inCaricamento: isLoading },
        ]} actions={<SelettoreSede />} />
      {isManager && (
        <Card className="mb-4 p-5">
          <form onSubmit={crea} className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1.5"><Label htmlFor="ar-zona">Zona</Label><Input id="ar-zona" value={f.zona} onChange={(e) => setF({ ...f, zona: e.target.value })} /></div>
            <div className="w-24 space-y-1.5"><Label htmlFor="ar-da">Dal n.</Label><Input id="ar-da" type="number" min={1} value={f.da} onChange={(e) => setF({ ...f, da: e.target.value })} /></div>
            <div className="w-24 space-y-1.5"><Label htmlFor="ar-a">al n.</Label><Input id="ar-a" type="number" min={1} value={f.a} onChange={(e) => setF({ ...f, a: e.target.value })} /></div>
            <div className="w-28 space-y-1.5"><Label htmlFor="ar-cau">Cauzione (€)</Label><Input id="ar-cau" inputMode="decimal" value={f.cauzione} onChange={(e) => setF({ ...f, cauzione: e.target.value })} /></div>
            <BottoneScrittura type="submit" variant="outline" disabled={inCorso}>{inCorso ? 'Creazione…' : 'Aggiungi gli armadietti'}</BottoneScrittura>
          </form>
        </Card>
      )}
      {!isLoading && armadietti.length === 0 ? (
        <EmptyState icon={KeyRound} title="Nessun armadietto" filtrato={!isManager} description="Si creano per zona e numerazione; l'assegnazione al socio si fa dalla sua scheda."
          action={isManager ? <Button variant="outline" onClick={() => document.getElementById('ar-zona')?.focus()}>Aggiungi i primi</Button> : undefined} />
      ) : zone.map((z) => (
        <section key={z} className="mb-5" aria-label={z}>
          <h2 className="mb-2 text-label uppercase text-muted-foreground">{z}</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
            {armadietti.filter((a) => (a.zona ?? 'Armadietti') === z).map((a) => {
              const s = soci.find((x) => x.socio_id === a.socio_id)
              const scaduto = a.assegnato_fino && a.assegnato_fino < oggi
              return (
                <li key={a.id} className={a.stato === 'assegnato' ? `rounded-lg border p-2 text-sm ${scaduto ? 'border-warning bg-warning-tenue' : 'border-primary bg-accent'}`
                  : a.stato === 'guasto' ? 'rounded-lg border border-destructive bg-destructive-tenue p-2 text-sm' : 'rounded-lg border border-border bg-card p-2 text-sm'}>
                  <p className="font-mono font-medium text-foreground">{a.numero}</p>
                  {a.stato === 'assegnato' ? <>
                    <Link to={`/palestra/soci/${a.socio_id}`} className="block truncate text-foreground hover:text-primary-testo">{s?.nome ?? '…'}</Link>
                    <p className="text-xs text-muted-foreground">{a.assegnato_fino ? `fino al ${fmtData(a.assegnato_fino)}` : 'senza scadenza'}</p>
                    {Number(a.cauzione) > 0 && (
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-foreground"><Switch checked={a.cauzione_versata} aria-label={`Cauzione dell'armadietto ${a.numero} versata`}
                        onCheckedChange={(v) => salva.mutate({ id: a.id, values: { cauzione_versata: v } })} />cauzione {fmtEuro(a.cauzione)}</label>)}
                    <Button size="sm" variant="ghost" className="mt-1 h-7 px-2" onClick={() => salva.mutate({ id: a.id, values: { socio_id: null } }, { onSuccess: () => toast.success(`Armadietto ${a.numero} liberato`) })}>Libera</Button>
                  </> : <>
                    <p className="text-xs text-muted-foreground">{a.stato === 'guasto' ? 'Guasto' : 'Libero'}</p>
                    <Button size="sm" variant="ghost" className="mt-1 h-7 px-2" onClick={() => salva.mutate({ id: a.id, values: { stato: a.stato === 'guasto' ? 'libero' : 'guasto' } })}>
                      {a.stato === 'guasto' ? 'Riparato' : 'Segna guasto'}</Button>
                  </>}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

// ── Sezioni condivise ───────────────────────────────────────────────────
export function MagazzinoPalestraPage() {
  return (
    <ConSede>
      <PageHeader title="Magazzino e prodotti" description="Abbigliamento, integratori, accessori, materiali di consumo e per le pulizie: carichi, scarichi, lotti, scadenze, scorte minime, inventari."
        actions={<SelettoreSede />} />
      <MagazzinoSezione modulo="palestra" moduli={['palestra']} />
      <p className="mt-3 text-xs text-muted-foreground">I prodotti si vendono dalla cassa in <Link to="/palestra/incassi" className="underline underline-offset-2">Incassi → Cassa e prodotti</Link>.</p>
    </ConSede>
  )
}

export function AttrezzaturePalestraPage() {
  return (
    <ConSede>
      <PageHeader title="Attrezzature, pulizie e sicurezza" description="Macchine con matricola, garanzia e manutenzioni; piano delle pulizie e sanificazioni; incidenti, infortuni e controlli periodici."
        actions={<SelettoreSede />} />
      <ControlliSezione modulo="palestra" moduli={['palestra']}
        categorieAsset={['Tapis roulant', 'Cyclette', 'Ellittiche', 'Macchine cardio', 'Macchine isotoniche', 'Panche', 'Bilancieri', 'Manubri', 'Attrezzature funzionali', 'Impianti', 'Altro']} />
    </ConSede>
  )
}

export function EventiPalestraPage() {
  return (
    <ConSede>
      <PageHeader title="Eventi" description="Open day, workshop, gare, seminari, masterclass, challenge ed eventi aziendali: iscritti, docenti, costi, ricavi e presenze."
        actions={<SelettoreSede />} />
      <EventiSezione modulo="palestra" tipi={['Open day', 'Workshop', 'Gara', 'Seminario', 'Masterclass', 'Challenge', 'Evento aziendale', 'Altro']} />
    </ConSede>
  )
}

export function ClientiPalestraPage() {
  return (
    <ConSede>
      <PageHeader title="Fidelizzazione e campagne" description="Punti, livelli e premi; questionari, NPS e reclami; campagne per nuovi iscritti, inattivi, abbonamenti in scadenza, ex soci."
        actions={<SelettoreSede />} />
      <Tabs defaultValue="campagne">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="campagne">Campagne</TabsTrigger><TabsTrigger value="fidelity">Fidelizzazione</TabsTrigger><TabsTrigger value="feedback">Riscontri</TabsTrigger>
        </TabsList>
        <TabsContent value="campagne"><CampagneSezione modulo="palestra" /></TabsContent>
        <TabsContent value="fidelity"><FidelizzazioneSezione modulo="palestra" /></TabsContent>
        <TabsContent value="feedback"><FeedbackSezione modulo="palestra" canali={['reception', 'email', 'app', 'telefono', 'recensione online']} aspetti={['Corsi', 'Personal trainer', 'Struttura', 'Pulizia']} /></TabsContent>
      </Tabs>
    </ConSede>
  )
}
