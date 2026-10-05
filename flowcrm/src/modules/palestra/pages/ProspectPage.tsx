/**
 * Prospect (documento Palestra §2): richieste, visite, prove gratuite,
 * offerte e iscrizioni sulla pipeline Lead → Contatto → Visita → Prova →
 * Offerta → Iscrizione, con i motivi di mancata iscrizione e la conversione.
 * Le trattative sono deal del CRM: richiami e appuntamenti stanno lì.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Target, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { CercaContatto, type ContattoScelto } from '@/components/condivisi/CercaContatto'
import { supabase, type Tables } from '@/lib/supabase'
import { useElenco, useRpc, useSalva, useInserisci, messaggioErrore } from '@/lib/queries/fondamenta'
import { usePalestra } from '@/modules/palestra/contesto'
import { ConSede, SelettoreSede } from '@/modules/palestra/componenti/ConSede'
import { NuovoSocioDialog } from '@/modules/palestra/dialogs/NuovoSocioDialog'
import type { Prova } from '@/modules/palestra/queries'
import { fmtGiornoOra, fmtNumero, oggiIso, piuGiorni } from '@/modules/palestra/stati'

type Deal = Tables<'deals'> & { contatti: { id: string; nome: string; cognome: string | null; telefono: string | null; email: string | null } | null }
type Fase = Tables<'pipeline_stages'>
interface Kpi { prospect: { lead: number; iscritti: number; persi: number; aperti: number; conversione: number | null; prove_svolte: number; prove_iscritti: number; motivi_persi: Record<string, number> } }

const MOTIVI = ['prezzo', 'orari', 'distanza', 'ha scelto un\'altra palestra', 'non ha tempo', 'non risponde', 'altro']

export function ProspectPage() {
  return <ConSede><Prospect_ /></ConSede>
}

function Prospect_() {
  const { sedeId } = usePalestra()
  const { data: pipeline } = useRpc<string>('pal_pipeline', {})
  const { data: fasi = [] } = useElenco<Fase>('pipeline_stages', { filtri: { pipeline_id: pipeline }, ordine: [{ colonna: 'ordine' }], abilitato: !!pipeline })
  const { data: deals = [], isLoading } = useElenco<Deal>('deals', {
    filtri: { pipeline_id: pipeline, attivo: true }, select: '*, contatti(id, nome, cognome, telefono, email)',
    ordine: [{ colonna: 'created_at', crescente: false }], limite: 300, abilitato: !!pipeline })
  const { data: prove = [] } = useElenco<Prova>('pal_prove', { filtri: { sede_id: sedeId ?? undefined }, ordine: [{ colonna: 'quando', crescente: false }], limite: 60, abilitato: !!sedeId })
  const { data: kpi } = useRpc<Kpi>('pal_kpi', { p_sede: sedeId, p_dal: piuGiorni(oggiIso(), -90), p_al: oggiIso() }, { abilitato: !!sedeId })
  const salva = useSalva('deals')
  const salvaProva = useSalva('pal_prove')
  const nuovaProva = useInserisci('pal_prove')
  const [nuovo, setNuovo] = useState(false)
  const [persa, setPersa] = useState<Deal | null>(null)
  const [iscrivi, setIscrivi] = useState<ContattoScelto | null>(null)
  const [prova, setProva] = useState<{ deal: Deal; tipo: string; quando: string } | null>(null)
  const aperte = fasi.filter((f) => !f.is_won && !f.is_lost)
  const fasePersa = fasi.find((f) => f.is_lost)
  const nomeContatto = (d: Deal) => (d.contatti ? `${d.contatti.nome} ${d.contatti.cognome ?? ''}`.trim() : d.nome)
  const p = kpi?.prospect

  function sposta(d: Deal, faseId: string) {
    const fase = fasi.find((f) => f.id === faseId)
    if (fase?.is_lost) { setPersa(d); return }
    if (fase?.is_won && d.contatti) { setIscrivi(d.contatti); return }
    salva.mutate({ id: d.id, values: { stage_id: faseId } }, { onError: (e) => toast.error(messaggioErrore(e)) })
  }

  return (
    <div>
      <PageHeader title="Prospect" description="Dalla richiesta d'informazioni all'iscrizione: visite, prove gratuite, offerte e motivi di chi non si iscrive."
        numeri={[
          { etichetta: 'lead negli ultimi 90 giorni', valore: p?.lead },
          { etichetta: 'iscritti', valore: p?.iscritti },
          { etichetta: 'conversione', valore: p?.conversione != null ? `${fmtNumero(p.conversione, 1)}%` : '—' },
          { etichetta: 'prove → iscritti', valore: p ? `${p.prove_iscritti}/${p.prove_svolte}` : undefined },
        ]}
        actions={<><SelettoreSede /><BottoneScrittura onClick={() => setNuovo(true)}><UserPlus className="h-4 w-4" /> Nuovo lead</BottoneScrittura></>} />

      {isLoading || !pipeline ? <Skeleton className="h-64" /> : deals.length === 0 ? (
        <EmptyState icon={Target} title="Nessun prospect" description="Chi chiede informazioni, visita la palestra o fa una prova entra qui e si segue fino all'iscrizione."
          action={<Button variant="outline" onClick={() => setNuovo(true)}>Registra il primo lead</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 2xl:grid-cols-5">
          {aperte.map((f) => {
            const dellaFase = deals.filter((d) => d.stage_id === f.id)
            return (
              <section key={f.id} aria-label={f.nome} className="rounded-lg border border-border bg-muted/30 p-2">
                <h3 className="mb-2 flex items-center justify-between px-1 text-label uppercase text-muted-foreground">{f.nome}<span className="tabular-nums">{dellaFase.length}</span></h3>
                <ul className="space-y-2">{dellaFase.map((d) => (
                  <li key={d.id} className="rounded-md border border-border bg-card p-2.5 text-sm">
                    <p className="font-medium text-foreground">{nomeContatto(d)}</p>
                    <p className="truncate text-xs text-muted-foreground">{d.contatti?.telefono ?? d.contatti?.email ?? ''}{d.note ? ` · ${d.note}` : ''}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <Select value={d.stage_id} onValueChange={(v) => sposta(d, v)}>
                        <SelectTrigger className="h-8 flex-1 text-xs" aria-label={`Fase di ${nomeContatto(d)}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{fasi.map((x) => <SelectItem key={x.id} value={x.id}>{x.is_won ? 'Iscrizione →' : x.is_lost ? 'Persa…' : x.nome}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => setProva({ deal: d, tipo: 'prova', quando: `${piuGiorni(oggiIso(), 1)}T18:00` })}>Prova</Button>
                    </div>
                  </li>))}</ul>
              </section>
            )
          })}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-title text-foreground">Prove e visite</h2>
          {prove.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna prova in agenda: si fissa dalla scheda del lead, con «Prova».</p> : (
            <ul className="divide-y divide-border text-sm">{prove.map((x) => {
              const d = deals.find((y) => y.id === x.deal_id)
              return (
                <li key={x.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1"><span className="font-medium text-foreground">{d ? nomeContatto(d) : 'Prospect'}</span>
                    <span className="block text-xs text-muted-foreground">{x.tipo === 'prova' ? 'Prova gratuita' : 'Visita'} · {fmtGiornoOra(x.quando)}</span></span>
                  {x.stato === 'prenotata' ? <>
                    <BottoneScrittura size="sm" variant="outline" onClick={() => salvaProva.mutate({ id: x.id, values: { stato: 'svolta' } }, { onSuccess: () => toast.success('Segnata come svolta') })}>Svolta</BottoneScrittura>
                    <Button size="sm" variant="ghost" onClick={() => salvaProva.mutate({ id: x.id, values: { stato: 'non_presentato' } })}>Non venuto</Button>
                  </> : <Badge tone={x.stato === 'svolta' ? 'success' : 'neutral'}>{x.stato === 'svolta' ? 'Svolta' : x.stato === 'non_presentato' ? 'Non venuto' : 'Annullata'}</Badge>}
                </li>
              )
            })}</ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-title text-foreground">Perché non si iscrivono</h2>
          {!p || Object.keys(p.motivi_persi).length === 0 ? <p className="text-sm text-muted-foreground">Negli ultimi 90 giorni nessuna trattativa persa.</p> : (
            <ul className="space-y-1.5 text-sm">{Object.entries(p.motivi_persi).sort((a, b) => b[1] - a[1]).map(([m, n]) => (
              <li key={m} className="flex items-center justify-between"><span className="text-foreground">{m}</span><span className="tabular-nums text-muted-foreground">{n}</span></li>))}</ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Richiami, preventivi e appuntamenti di ogni trattativa si gestiscono dal <Link to="/kanban" className="underline underline-offset-2">CRM</Link>, sulla pipeline «Palestra · Prospect».</p>
        </Card>
      </div>

      {pipeline && <NuovoLeadDialog open={nuovo} onOpenChange={setNuovo} pipeline={pipeline} primaFase={fasi[0]?.id} />}
      <NuovoSocioDialog open={!!iscrivi} onOpenChange={(o) => !o && setIscrivi(null)} contattoIniziale={iscrivi} />

      {persa && fasePersa && (
        <Dialog open onOpenChange={(o) => !o && setPersa(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Perché non si iscrive?</DialogTitle><DialogDescription>{nomeContatto(persa)}: il motivo serve a capire dove si perdono le iscrizioni.</DialogDescription></DialogHeader>
            <div className="flex flex-wrap gap-2">{MOTIVI.map((m) => (
              <Button key={m} variant="outline" size="sm" onClick={() => salva.mutate({ id: persa.id, values: { stage_id: fasePersa.id, motivo_perdita: m, chiuso_at: new Date().toISOString() } }, {
                onSuccess: () => { toast.success('Segnata come persa'); setPersa(null) }, onError: (e) => toast.error(messaggioErrore(e)) })}>{m}</Button>))}</div>
          </DialogContent>
        </Dialog>
      )}

      {prova && (
        <Dialog open onOpenChange={(o) => !o && setProva(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Prova o visita</DialogTitle><DialogDescription>{nomeContatto(prova.deal)}</DialogDescription></DialogHeader>
            <div className="grid gap-3">
              <Select value={prova.tipo} onValueChange={(v) => setProva({ ...prova, tipo: v })}><SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="prova">Prova gratuita</SelectItem><SelectItem value="visita">Visita della palestra</SelectItem></SelectContent></Select>
              <div className="space-y-1.5"><Label htmlFor="pv-quando">Quando</Label>
                <Input id="pv-quando" type="datetime-local" value={prova.quando} onChange={(e) => setProva({ ...prova, quando: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProva(null)}>Annulla</Button>
              <BottoneScrittura disabled={!prova.deal.contatto_id || nuovaProva.isPending}
                onClick={() => nuovaProva.mutate({ contatto_id: prova.deal.contatto_id!, deal_id: prova.deal.id, sede_id: sedeId!, tipo: prova.tipo, quando: new Date(prova.quando).toISOString() }, {
                  onSuccess: () => {
                    const fase = fasi.find((f) => f.nome === (prova.tipo === 'prova' ? 'Prova' : 'Visita'))
                    if (fase) salva.mutate({ id: prova.deal.id, values: { stage_id: fase.id } })
                    toast.success('In agenda'); setProva(null)
                  }, onError: (e) => toast.error(messaggioErrore(e)) })}>Fissa</BottoneScrittura>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function NuovoLeadDialog({ open, onOpenChange, pipeline, primaFase }: { open: boolean; onOpenChange: (o: boolean) => void; pipeline: string; primaFase?: string }) {
  const crea = useInserisci('deals')
  const [nome, setNome] = useState('')
  const [contatto, setContatto] = useState<ContattoScelto | null>(null)
  const [f, setF] = useState({ telefono: '', email: '', interesse: '' })
  const [inCorso, setInCorso] = useState(false)

  async function invia(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !primaFase) return
    setInCorso(true)
    try {
      let id = contatto?.id
      if (!id) {
        const { data: auth } = await supabase.auth.getUser()
        const [n, ...resto] = nome.trim().split(/\s+/)
        const { data, error } = await supabase.from('contatti').insert({ nome: n, cognome: resto.join(' ') || null,
          telefono: f.telefono.trim() || null, email: f.email.trim() || null, created_by: auth.user!.id }).select('id').single()
        if (error) throw error
        id = data.id
      }
      await crea.mutateAsync({ nome: `${nome.trim()} · iscrizione`, contatto_id: id, pipeline_id: pipeline, stage_id: primaFase, note: f.interesse.trim() || null })
      toast.success('Lead registrato')
      setNome(''); setContatto(null); setF({ telefono: '', email: '', interesse: '' })
      onOpenChange(false)
    } catch (err) { toast.error(messaggioErrore(err)) } finally { setInCorso(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuovo lead</DialogTitle><DialogDescription>Chi ha chiesto informazioni: da qui si segue fino all'iscrizione.</DialogDescription></DialogHeader>
        <form onSubmit={invia} className="grid gap-3">
          <div className="space-y-1.5"><Label htmlFor="ld-nome">Nome e cognome *</Label>
            <CercaContatto id="ld-nome" valore={nome} contattoId={contatto?.id ?? null} onTesto={(v) => { setNome(v); setContatto(null) }}
              onScegli={(c) => { setContatto(c); setNome(`${c.nome} ${c.cognome ?? ''}`.trim()) }} /></div>
          {!contatto && <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="ld-tel">Telefono</Label><Input id="ld-tel" type="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="ld-mail">Email</Label><Input id="ld-mail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          </div>}
          <div className="space-y-1.5"><Label htmlFor="ld-int">Cosa cerca</Label>
            <Input id="ld-int" value={f.interesse} onChange={(e) => setF({ ...f, interesse: e.target.value })} placeholder="Corsi serali, sala pesi, personal trainer…" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={!nome.trim() || inCorso}>Registra</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
