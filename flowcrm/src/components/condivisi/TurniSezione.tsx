/**
 * Turni del personale (fondamenta F0.5): la settimana per persona, i
 * modelli di turno (mattina, spezzato, sera), il fabbisogno per reparto e
 * fascia con le carenze segnalate, le ore previste ed effettive. Una
 * persona non può stare in due turni sovrapposti né lavorare in ferie: lo
 * impedisce il database. L'anagrafica dei dipendenti resta riservata.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import { useElenco, useRpc, useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'

type Turno = Tables<'turni'>
type Modello = Tables<'turni_modelli'>
type Fabbisogno = Tables<'turni_fabbisogno'>
type OreSettimana = Database['public']['Views']['turni_ore_settimana']['Row']
interface Persona { id: string; nome: string; cognome: string | null; qualifica: string | null }
interface Carenza { data: string; reparto: string | null; ora_inizio: string; ora_fine: string; richieste: number; coperte: number }

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const lunedi = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const ora = (s: string) => new Date(s).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
const istante = (giorno: string, hhmm: string, giornoDopo = false) => {
  const d = new Date(`${giorno}T${hhmm}`); if (giornoDopo) d.setDate(d.getDate() + 1); return d.toISOString()
}

export function TurniSezione({ modulo, reparti, extra }: { modulo: string; reparti: string[]; extra?: (giorno: string) => ReactNode }) {
  const { isManager } = useAuth()
  const [inizioSett, setInizioSett] = useState(() => lunedi(new Date()))
  const giorni = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(inizioSett); d.setDate(d.getDate() + i); return iso(d) }), [inizioSett])
  const fineSett = useMemo(() => { const d = new Date(inizioSett); d.setDate(d.getDate() + 7); return d }, [inizioSett])
  const { data: persone = [] } = useRpc<Persona[]>('turni_persone', { p_modulo: modulo })
  const { data: turni = [] } = useElenco<Turno>('turni', { filtri: { modulo }, tra: { colonna: 'inizio', da: inizioSett.toISOString(), a: fineSett.toISOString() }, ordine: [{ colonna: 'inizio' }] })
  const { data: modelli = [] } = useElenco<Modello>('turni_modelli', { filtri: { modulo, attivo: true }, ordine: [{ colonna: 'ora_inizio' }] })
  const { data: carenze = [] } = useRpc<Carenza[]>('turni_carenze', { p_modulo: modulo, p_dal: giorni[0], p_al: giorni[6] })
  const { data: ore = [] } = useElenco<OreSettimana>('turni_ore_settimana', { filtri: { modulo, settimana: giorni[0] } })
  const salva = useSalva('turni', ['turni_ore_settimana', 'fond-rpc'])
  const [cella, setCella] = useState<{ persona: string; giorno: string } | null>(null)
  const [sostituendo, setSostituendo] = useState<string | null>(null)
  const [nuovo, setNuovo] = useState({ modello: '', dalle: '09:00', alle: '15:00', reparto: reparti[0] ?? '', pausa: '30' })

  const sposta = (settimane: number) => { const d = new Date(inizioSett); d.setDate(d.getDate() + settimane * 7); setInizioSett(d); setCella(null) }
  const turniDi = (p: string, g: string) => turni.filter((t) => t.dipendente_id === p && iso(new Date(t.inizio)) === g)

  async function aggiungi() {
    if (!cella) return
    const m = modelli.find((x) => x.id === nuovo.modello)
    const dalle = m ? m.ora_inizio.slice(0, 5) : nuovo.dalle
    const alle = m ? m.ora_fine.slice(0, 5) : nuovo.alle
    try {
      await salva.mutateAsync({ values: { modulo, dipendente_id: cella.persona, modello_id: m?.id ?? null, reparto: m?.reparto ?? (nuovo.reparto || null),
        inizio: istante(cella.giorno, dalle), fine: istante(cella.giorno, alle, alle <= dalle), pausa_minuti: m?.pausa_minuti ?? (Number(nuovo.pausa) || 0) } })
      toast.success('Turno aggiunto'); setCella(null)
    } catch (e) { toast.error(messaggioErrore(e)) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => sposta(-1)} aria-label="Settimana precedente"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="w-56 text-center text-sm font-medium tabular-nums">{new Date(`${giorni[0]}T12:00`).toLocaleDateString('it-IT')} – {new Date(`${giorni[6]}T12:00`).toLocaleDateString('it-IT')}</span>
          <Button variant="outline" size="icon" onClick={() => sposta(1)} aria-label="Settimana successiva"><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" onClick={() => setInizioSett(lunedi(new Date()))}>Questa settimana</Button>
        </div>
        {carenze.length > 0 && <Badge tone="warning"><AlertTriangle className="mr-1 h-3.5 w-3.5" /> {carenze.length} fasce scoperte</Badge>}
      </div>

      {persone.length === 0 ? (
        <EmptyState icon={Plus} title="Nessun dipendente" description="I dipendenti si registrano in Amministrazione → Personale; qui si pianificano i loro turni."
          action={isManager ? <Button asChild variant="outline"><Link to="/personale">Vai al personale</Link></Button> : undefined} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left text-label uppercase text-muted-foreground">Persona</th>
                {giorni.map((g, i) => {
                  const scoperte = carenze.filter((c) => c.data === g)
                  return <th key={g} className="px-2 py-2 text-left text-label uppercase text-muted-foreground">
                    {GIORNI[i]} {new Date(`${g}T12:00`).getDate()}{scoperte.length > 0 && <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-warning-testo" aria-label={`${scoperte.length} fasce scoperte`} />}
                  </th>
                })}
                <th className="px-3 py-2 text-right text-label uppercase text-muted-foreground">Ore</th>
              </tr>
            </thead>
            <tbody>
              {persone.map((p) => {
                const o = ore.find((x) => x.dipendente_id === p.id)
                return (
                  <tr key={p.id} className="border-b border-border align-top">
                    <td className="px-3 py-2"><span className="font-medium text-foreground">{p.nome} {p.cognome ?? ''}</span><span className="block text-xs text-muted-foreground">{p.qualifica ?? ''}</span></td>
                    {giorni.map((g) => {
                      const sel = cella?.persona === p.id && cella.giorno === g
                      return (
                        <td key={g} className={cn('px-1.5 py-1.5', sel && 'bg-accent')}>
                          <div className="space-y-1">
                            {turniDi(p.id, g).map((t) => (
                              <div key={t.id} className={cn('rounded-md border px-1.5 py-1 text-xs', t.stato === 'annullato' ? 'border-dashed border-border text-muted-foreground line-through'
                                : t.stato === 'assente' ? 'border-destructive text-destructive-testo' : 'border-border bg-card text-foreground')}>
                                <span className="tabular-nums">{ora(t.inizio)}–{ora(t.fine)}</span>
                                {t.reparto && <span className="block text-muted-foreground">{t.reparto}</span>}
                                {isManager && t.stato !== 'annullato' && (
                                  <span className="mt-0.5 flex gap-1">
                                    <button type="button" className="underline-offset-2 hover:underline" onClick={() => salva.mutate({ id: t.id, values: { stato: 'svolto', inizio_effettivo: t.inizio, fine_effettivo: t.fine } })}>svolto</button>
                                    <button type="button" className="underline-offset-2 hover:underline" onClick={() => salva.mutate({ id: t.id, values: { stato: 'assente' } })}>assente</button>
                                    <button type="button" className="underline-offset-2 hover:underline" onClick={() => setSostituendo(sostituendo === t.id ? null : t.id)}>sostituisci</button>
                                    <button type="button" className="underline-offset-2 hover:underline" onClick={() => salva.mutate({ id: t.id, values: { stato: 'annullato' } })}>togli</button>
                                  </span>
                                )}
                                {sostituendo === t.id && (
                                  <Select onValueChange={(v) => salva.mutate({ id: t.id, values: { dipendente_id: v } }, {
                                    onSuccess: () => { setSostituendo(null); toast.success('Sostituzione fatta') }, onError: (e) => toast.error(messaggioErrore(e)) })}>
                                    <SelectTrigger className="mt-1 h-7 text-xs" aria-label="Chi sostituisce"><SelectValue placeholder="Chi lo sostituisce…" /></SelectTrigger>
                                    <SelectContent>{persone.filter((x) => x.id !== t.dipendente_id).map((x) => <SelectItem key={x.id} value={x.id}>{x.nome} {x.cognome ?? ''}</SelectItem>)}</SelectContent>
                                  </Select>
                                )}
                              </div>
                            ))}
                            {isManager && (
                              <button type="button" onClick={() => setCella(sel ? null : { persona: p.id, giorno: g })} aria-label={`Aggiungi un turno a ${p.nome} il ${g}`}
                                className="flex w-full items-center justify-center rounded-md border border-dashed border-border py-0.5 text-muted-foreground hover:text-foreground">
                                <Plus className="h-3 w-3" /></button>
                            )}
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-right tabular-nums">{o ? `${Number(o.ore_previste ?? 0)}${o.ore_effettive != null ? ` / ${Number(o.ore_effettive)}` : ''}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {cella && (
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <p className="w-full text-sm font-medium text-foreground">Turno di {persone.find((p) => p.id === cella.persona)?.nome} · {new Date(`${cella.giorno}T12:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          {modelli.length > 0 && (
            <div className="w-48 space-y-1.5"><Label>Modello</Label>
              <Select value={nuovo.modello || 'libero'} onValueChange={(v) => setNuovo({ ...nuovo, modello: v === 'libero' ? '' : v })}>
                <SelectTrigger aria-label="Modello di turno"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="libero">Orario libero</SelectItem>{modelli.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome} ({m.ora_inizio.slice(0, 5)}–{m.ora_fine.slice(0, 5)})</SelectItem>)}</SelectContent>
              </Select></div>
          )}
          {!nuovo.modello && <>
            <div className="w-28 space-y-1.5"><Label htmlFor="tn-d">Dalle</Label><Input id="tn-d" type="time" value={nuovo.dalle} onChange={(e) => setNuovo({ ...nuovo, dalle: e.target.value })} /></div>
            <div className="w-28 space-y-1.5"><Label htmlFor="tn-a">Alle</Label><Input id="tn-a" type="time" value={nuovo.alle} onChange={(e) => setNuovo({ ...nuovo, alle: e.target.value })} /></div>
            <div className="w-40 space-y-1.5"><Label>Reparto</Label>
              <Select value={nuovo.reparto} onValueChange={(v) => setNuovo({ ...nuovo, reparto: v })}><SelectTrigger aria-label="Reparto"><SelectValue /></SelectTrigger>
                <SelectContent>{reparti.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
            <div className="w-24 space-y-1.5"><Label htmlFor="tn-p">Pausa (min)</Label><Input id="tn-p" type="number" min={0} value={nuovo.pausa} onChange={(e) => setNuovo({ ...nuovo, pausa: e.target.value })} /></div>
          </>}
          <BottoneScrittura onClick={aggiungi}>Aggiungi</BottoneScrittura>
          <Button variant="ghost" onClick={() => setCella(null)}>Annulla</Button>
          {extra && <div className="w-full">{extra(cella.giorno)}</div>}
        </Card>
      )}

      {isManager && <ConfigurazioneTurni modulo={modulo} reparti={reparti} modelli={modelli} carenze={carenze} />}
    </div>
  )
}

function ConfigurazioneTurni({ modulo, reparti, modelli, carenze }: { modulo: string; reparti: string[]; modelli: Modello[]; carenze: Carenza[] }) {
  const { data: fabbisogno = [] } = useElenco<Fabbisogno>('turni_fabbisogno', { filtri: { modulo }, ordine: [{ colonna: 'giorno_settimana' }, { colonna: 'ora_inizio' }] })
  const salvaModello = useSalva('turni_modelli')
  const salvaFab = useSalva('turni_fabbisogno', ['fond-rpc'])
  const [m, setM] = useState({ nome: '', dalle: '', alle: '', reparto: reparti[0] ?? '', pausa: '0' })
  const [fb, setFb] = useState({ reparto: reparti[0] ?? '', giorni: [1, 2, 3, 4, 5, 6, 7], dalle: '12:00', alle: '15:00', persone: '2' })

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-2 text-title text-foreground">Modelli di turno</h3>
        <ul className="mb-3 flex flex-wrap gap-1.5">{modelli.map((x) => <li key={x.id}><Badge tone="neutral">{x.nome} · {x.ora_inizio.slice(0, 5)}–{x.ora_fine.slice(0, 5)}{x.reparto ? ` · ${x.reparto}` : ''}</Badge></li>)}</ul>
        <div className="flex flex-wrap items-end gap-2">
          <Input className="w-36" value={m.nome} onChange={(e) => setM({ ...m, nome: e.target.value })} placeholder="Mattina, Sera…" aria-label="Nome del modello" />
          <Input className="w-28" type="time" value={m.dalle} onChange={(e) => setM({ ...m, dalle: e.target.value })} aria-label="Dalle" />
          <Input className="w-28" type="time" value={m.alle} onChange={(e) => setM({ ...m, alle: e.target.value })} aria-label="Alle" />
          <Select value={m.reparto} onValueChange={(v) => setM({ ...m, reparto: v })}><SelectTrigger className="w-32" aria-label="Reparto"><SelectValue /></SelectTrigger>
            <SelectContent>{reparti.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
          <BottoneScrittura variant="outline" disabled={!m.nome.trim() || !m.dalle || !m.alle} onClick={() => salvaModello.mutate({ values: { modulo, nome: m.nome.trim(), ora_inizio: m.dalle,
            ora_fine: m.alle, reparto: m.reparto || null, pausa_minuti: Number(m.pausa) || 0 } }, { onSuccess: () => setM({ ...m, nome: '', dalle: '', alle: '' }), onError: (e) => toast.error(messaggioErrore(e)) })}>Aggiungi</BottoneScrittura>
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="mb-1 text-title text-foreground">Fabbisogno di personale</h3>
        <p className="mb-2 text-sm text-muted-foreground">Quante persone servono per reparto e fascia: le fasce scoperte compaiono nella settimana.</p>
        <ul className="mb-3 space-y-1 text-sm">
          {fabbisogno.map((f) => <li key={f.id} className="flex justify-between gap-2"><span>{GIORNI[f.giorno_settimana - 1]} · {f.ora_inizio.slice(0, 5)}–{f.ora_fine.slice(0, 5)} · {f.reparto ?? 'tutti'}</span><span className="tabular-nums">{f.persone_minime} persone</span></li>)}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <Select value={fb.reparto} onValueChange={(v) => setFb({ ...fb, reparto: v })}><SelectTrigger className="w-32" aria-label="Reparto"><SelectValue /></SelectTrigger>
            <SelectContent>{reparti.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
          <Input className="w-28" type="time" value={fb.dalle} onChange={(e) => setFb({ ...fb, dalle: e.target.value })} aria-label="Dalle" />
          <Input className="w-28" type="time" value={fb.alle} onChange={(e) => setFb({ ...fb, alle: e.target.value })} aria-label="Alle" />
          <Input className="w-20" type="number" min={1} value={fb.persone} onChange={(e) => setFb({ ...fb, persone: e.target.value })} aria-label="Persone" />
          <BottoneScrittura variant="outline" onClick={async () => {
            try {
              for (const g of fb.giorni) await salvaFab.mutateAsync({ values: { modulo, reparto: fb.reparto || null, giorno_settimana: g, ora_inizio: fb.dalle, ora_fine: fb.alle, persone_minime: Number(fb.persone) } })
              toast.success('Fabbisogno impostato per tutti i giorni')
            } catch (e) { toast.error(messaggioErrore(e)) }
          }}>Tutti i giorni</BottoneScrittura>
        </div>
        {carenze.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-warning-testo">
            {carenze.map((c, i) => <li key={i}>{new Date(`${c.data}T12:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })} · {c.ora_inizio.slice(0, 5)}–{c.ora_fine.slice(0, 5)} · {c.reparto ?? 'tutti'}: {c.coperte} su {c.richieste}</li>)}
          </ul>
        )}
      </Card>
    </div>
  )
}
