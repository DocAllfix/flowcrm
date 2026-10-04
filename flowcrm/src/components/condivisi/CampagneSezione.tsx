/**
 * Campagne (fondamenta F0.6): newsletter, promozioni, clienti inattivi,
 * ricorrenze. Si sceglie un segmento, si scrive il testo ({{nome}} diventa
 * il nome del cliente), si vede chi la riceve e chi è escluso e perché; la
 * mail parte solo a chi ha dato il consenso, con il link di disiscrizione.
 * SMS, WhatsApp e notifiche push sono predisposti, non collegati.
 */
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Megaphone, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import { useElenco, useSalva, useAzione, useRpc, messaggioErrore } from '@/lib/queries/fondamenta'

type Campagna = Tables<'campagne'>
type Segmento = Tables<'campagne_segmenti'>
interface Riepilogo { in_coda: number; inviati: number; consegnati_al_relay: number; falliti: number; esclusi: number }
type ParametriSegmento = Record<string, { etichetta: string; default: number }>
const STATO: Record<string, { label: string; tone: 'neutral' | 'info' | 'success' | 'danger' }> = {
  bozza: { label: 'Bozza', tone: 'neutral' }, programmata: { label: 'Programmata', tone: 'info' }, inviata: { label: 'Inviata', tone: 'success' }, annullata: { label: 'Annullata', tone: 'danger' } }

export function CampagneSezione({ modulo }: { modulo: string }) {
  const { isManager } = useAuth()
  const { data: campagne = [] } = useElenco<Campagna>('campagne', { filtri: { modulo }, ordine: [{ colonna: 'created_at', crescente: false }] })
  const { data: segmenti = [] } = useElenco<Segmento>('campagne_segmenti', { ordine: [{ colonna: 'etichetta' }] })
  const salva = useSalva('campagne')
  const [sceltaId, setSceltaId] = useState<string | null>(null)
  const [f, setF] = useState({ nome: '', segmento: 'tutti', oggetto: '', corpo: 'Ciao {{nome}},\n\n' })
  const [parametri, setParametri] = useState<Record<string, number>>({})
  const segmento = segmenti.find((s) => s.slug === f.segmento)
  const scelta = campagne.find((c) => c.id === sceltaId) ?? null

  if (!isManager) return <EmptyState icon={Megaphone} title="Campagne" description="Le campagne le prepara e le invia la direzione." />

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim() || !f.oggetto.trim() || !f.corpo.trim()) { toast.error('Nome, oggetto e testo'); return }
    try {
      const c = await salva.mutateAsync({ values: { modulo, nome: f.nome.trim(), segmento: f.segmento, parametri, oggetto: f.oggetto.trim(), corpo: f.corpo, canale: 'email',
        url_base: window.location.origin } })
      setSceltaId(c.id); setF({ nome: '', segmento: f.segmento, oggetto: '', corpo: 'Ciao {{nome}},\n\n' })
    } catch (err) { toast.error(messaggioErrore(err)) }
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-3 text-title text-foreground">Nuova campagna</h2>
          <form onSubmit={crea} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="cm-n">Nome interno</Label><Input id="cm-n" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Menu d'autunno" /></div>
              <div className="space-y-1.5"><Label>A chi</Label>
                <Select value={f.segmento} onValueChange={(v) => { setF({ ...f, segmento: v }); setParametri({}) }}><SelectTrigger aria-label="Segmento"><SelectValue /></SelectTrigger>
                  <SelectContent>{segmenti.map((s) => <SelectItem key={s.slug} value={s.slug}>{s.etichetta}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {segmento?.descrizione && <p className="text-xs text-muted-foreground">{segmento.descrizione}</p>}
            {segmento && Object.entries(segmento.parametri as ParametriSegmento).map(([k, p]) => (
              <div key={k} className="w-56 space-y-1.5"><Label htmlFor={`cm-p-${k}`}>{p.etichetta}</Label>
                <Input id={`cm-p-${k}`} type="number" min={1} value={parametri[k] ?? p.default} onChange={(e) => setParametri({ ...parametri, [k]: Number(e.target.value) })} /></div>
            ))}
            <div className="space-y-1.5"><Label htmlFor="cm-o">Oggetto della mail</Label><Input id="cm-o" value={f.oggetto} onChange={(e) => setF({ ...f, oggetto: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="cm-c">Testo</Label><Textarea id="cm-c" rows={8} value={f.corpo} onChange={(e) => setF({ ...f, corpo: e.target.value })} />
              <p className="text-xs text-muted-foreground">{'{{nome}}'} diventa il nome del cliente. In fondo si aggiunge da solo il link per disiscriversi.</p></div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">SMS, WhatsApp e notifiche push si attivano su richiesta.</p>
              <BottoneScrittura type="submit">Crea la bozza</BottoneScrittura>
            </div>
          </form>
        </Card>
        {campagne.length > 0 && (
          <Card className="divide-y divide-border">
            {campagne.map((c) => (
              <button key={c.id} type="button" onClick={() => setSceltaId(c.id)} aria-current={c.id === sceltaId}
                className={cn('flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted/50', c.id === sceltaId && 'bg-muted')}>
                <span><span className="block font-medium text-foreground">{c.nome}</span>
                  <span className="block text-xs text-muted-foreground">{c.codice} · {segmenti.find((s) => s.slug === c.segmento)?.etichetta ?? c.segmento}
                    {c.inviata_at ? ` · inviata il ${new Date(c.inviata_at).toLocaleDateString('it-IT')}` : c.programmata_at ? ` · il ${new Date(c.programmata_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</span></span>
                <Badge tone={STATO[c.stato]?.tone ?? 'neutral'}>{STATO[c.stato]?.label ?? c.stato}</Badge>
              </button>
            ))}
          </Card>
        )}
      </div>
      {scelta ? <DettaglioCampagna campagna={scelta} /> : <EmptyState icon={Megaphone} title="Scegli una campagna" description="Anteprima del testo, destinatari ed esclusi, invio subito o programmato." />}
    </div>
  )
}

function DettaglioCampagna({ campagna }: { campagna: Campagna }) {
  const prepara = useAzione('prepara_campagna', ['campagne', 'fond-rpc'])
  const invia = useAzione('invia_campagna', ['campagne', 'fond-rpc'])
  const salva = useSalva('campagne')
  const { data: riepilogo } = useRpc<Riepilogo[]>('campagna_riepilogo', { p_campagna: campagna.id })
  const { data: esclusi = [] } = useElenco<Pick<Tables<'campagne_destinatari'>, 'motivo_esclusione'>>('campagne_destinatari', {
    filtri: { campagna_id: campagna.id, stato: 'escluso' }, select: 'motivo_esclusione' })
  const [quando, setQuando] = useState('')
  const r = riepilogo?.[0]
  const motivi = esclusi.reduce<Record<string, number>>((acc, e) => { const k = e.motivo_esclusione ?? 'Altro'; acc[k] = (acc[k] ?? 0) + 1; return acc }, {})
  const anteprima = campagna.corpo.replaceAll('{{nome}}', 'Maria')
  const modificabile = campagna.stato === 'bozza' || campagna.stato === 'programmata'

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-title text-foreground">{campagna.nome}</h2><p className="text-sm text-muted-foreground">Oggetto: {campagna.oggetto}</p></div>
        <Badge tone={STATO[campagna.stato]?.tone ?? 'neutral'}>{STATO[campagna.stato]?.label}</Badge>
      </div>
      <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-sm text-foreground">{anteprima}
        <p className="mt-4 text-xs text-muted-foreground">Non vuoi più ricevere queste comunicazioni? Disiscriviti</p></div>
      {r && (r.in_coda + r.inviati + r.esclusi > 0) ? (
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-muted-foreground">Da inviare</dt><dd data-slot="kpi" className="text-title">{r.in_coda}</dd></div>
          <div><dt className="text-muted-foreground">Inviate</dt><dd data-slot="kpi" className="text-title">{r.inviati}</dd></div>
          <div><dt className="text-muted-foreground">Partite dal server</dt><dd data-slot="kpi" className="text-title">{r.consegnati_al_relay}</dd></div>
          <div><dt className="text-muted-foreground">Escluse</dt><dd data-slot="kpi" className="text-title">{r.esclusi}</dd></div>
        </dl>
      ) : <p className="text-sm text-muted-foreground">Prepara l'elenco per vedere quante persone la ricevono.</p>}
      {Object.keys(motivi).length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted-foreground">{Object.entries(motivi).map(([m, k]) => <li key={m}>{m}: {k}</li>)}</ul>
      )}
      {modificabile && (
        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => prepara.mutate({ p_campagna: campagna.id }, { onSuccess: (k) => toast.success(`${k} destinatari con il consenso`), onError: (e) => toast.error(messaggioErrore(e)) })}>
            Prepara l'elenco</Button>
          <BottoneScrittura onClick={() => invia.mutate({ p_campagna: campagna.id }, { onSuccess: (k) => toast.success(`${k} mail in partenza`), onError: (e) => toast.error(messaggioErrore(e)) })}>
            <Send className="h-4 w-4" /> Invia adesso</BottoneScrittura>
          <div className="ml-auto flex items-end gap-2">
            <div className="space-y-1.5"><Label htmlFor="cm-q">Oppure il</Label><Input id="cm-q" type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} /></div>
            <Button variant="outline" disabled={!quando} onClick={() => salva.mutate({ id: campagna.id, values: { stato: 'programmata', programmata_at: new Date(quando).toISOString() } },
              { onSuccess: () => toast.success('Campagna programmata'), onError: (e) => toast.error(messaggioErrore(e)) })}>Programma</Button>
          </div>
        </div>
      )}
    </Card>
  )
}
