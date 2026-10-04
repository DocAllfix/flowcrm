/**
 * Feedback e soddisfazione (fondamenta F0.4): NPS del mese, valutazioni,
 * recensioni, questionari, reclami e suggerimenti collegati alla visita,
 * alla prenotazione o all'ordine. Reclami e clienti insoddisfatti arrivano
 * subito in notifica alla direzione; il reclamo si gestisce fino alla
 * risoluzione.
 */
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { MessageSquareHeart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { CercaContatto, type ContattoScelto } from '@/components/condivisi/CercaContatto'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import { useElenco, useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'

type Feedback = Tables<'feedback'>
type Nps = Database['public']['Views']['feedback_nps']['Row']
const TIPI: Record<string, string> = { nps: 'NPS', questionario: 'Questionario', recensione: 'Recensione', reclamo: 'Reclamo', suggerimento: 'Suggerimento' }
const STATI: Record<string, { label: string; tone: 'warning' | 'info' | 'success' | 'neutral' }> = {
  ricevuto: { label: 'Ricevuto', tone: 'warning' }, in_gestione: { label: 'In gestione', tone: 'info' }, risolto: { label: 'Risolto', tone: 'success' }, chiuso: { label: 'Chiuso', tone: 'neutral' } }

export function FeedbackSezione({ modulo, canali }: { modulo: string; canali: string[] }) {
  const { data: nps = [] } = useElenco<Nps>('feedback_nps', { filtri: { modulo }, ordine: [{ colonna: 'mese', crescente: false }], limite: 6 })
  const { data: elenco = [] } = useElenco<Feedback>('feedback', { filtri: { modulo }, ordine: [{ colonna: 'ricevuto_at', crescente: false }], limite: 100 })
  const salva = useSalva('feedback', ['feedback_nps'])
  const [tipo, setTipo] = useState('nps')
  const [voto, setVoto] = useState<number | null>(null)
  const [stelle, setStelle] = useState<number | null>(null)
  const [testo, setTesto] = useState('')
  const [canale, setCanale] = useState(canali[0] ?? 'banco')
  const [nome, setNome] = useState('')
  const [contatto, setContatto] = useState<ContattoScelto | null>(null)
  const [risposte, setRisposte] = useState<Record<string, string>>({})
  const corrente = nps[0]

  async function registra(e: FormEvent) {
    e.preventDefault()
    if (tipo === 'nps' && voto === null) { toast.error('Scegli il voto da 0 a 10'); return }
    try {
      await salva.mutateAsync({ values: { modulo, tipo: tipo as Feedback['tipo'], nps: voto, valutazione: stelle, testo: testo.trim() || null, canale, contatto_id: contatto?.id ?? null } })
      toast.success('Registrato'); setVoto(null); setStelle(null); setTesto(''); setContatto(null); setNome('')
    } catch (err) { toast.error(messaggioErrore(err)) }
  }

  return (
    <div className="space-y-4">
      {corrente && (
        <dl className="flex flex-wrap gap-8 rounded-lg border border-border bg-card px-5 py-4">
          <div><dt className="text-sm text-muted-foreground">NPS del mese</dt><dd data-slot="kpi" className="text-title">{corrente.nps}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Risposte</dt><dd data-slot="kpi" className="text-title">{corrente.risposte}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Promotori · passivi · detrattori</dt><dd data-slot="kpi" className="text-title">{corrente.promotori} · {corrente.passivi} · {corrente.detrattori}</dd></div>
          {corrente.valutazione_media != null && <div><dt className="text-sm text-muted-foreground">Valutazione media</dt><dd data-slot="kpi" className="text-title">{new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(Number(corrente.valutazione_media))} / 5</dd></div>}
        </dl>
      )}
      <Card className="p-5">
        <form onSubmit={registra} className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40 space-y-1.5"><Label>Tipo</Label><Select value={tipo} onValueChange={setTipo}><SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TIPI).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="w-36 space-y-1.5"><Label>Canale</Label><Select value={canale} onValueChange={setCanale}><SelectTrigger aria-label="Canale"><SelectValue /></SelectTrigger>
              <SelectContent>{canali.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="min-w-56 flex-1 space-y-1.5"><Label htmlFor="fb-c">Cliente (facoltativo)</Label>
              <CercaContatto id="fb-c" valore={nome} contattoId={contatto?.id ?? null} onTesto={(v) => { setNome(v); setContatto(null) }}
                onScegli={(c) => { setContatto(c); setNome(`${c.nome} ${c.cognome ?? ''}`.trim()) }} /></div>
          </div>
          {(tipo === 'nps' || tipo === 'questionario') && (
            <div><p className="mb-1.5 text-sm text-foreground">Quanto ci consiglierebbe a un amico? (0–10)</p>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Voto NPS">
                {Array.from({ length: 11 }, (_, i) => (
                  <button key={i} type="button" role="radio" aria-checked={voto === i} onClick={() => setVoto(i)}
                    className={cn('size-9 rounded-md border text-sm tabular-nums', voto === i ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{i}</button>
                ))}
              </div></div>
          )}
          {(tipo === 'recensione' || tipo === 'questionario') && (
            <div><p className="mb-1.5 text-sm text-foreground">Valutazione (1–5)</p>
              <div className="flex gap-1" role="radiogroup" aria-label="Valutazione">{[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" role="radio" aria-checked={stelle === i} onClick={() => setStelle(i)}
                  className={cn('size-9 rounded-md border text-sm', stelle === i ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground')}>{i}</button>))}</div></div>
          )}
          <div className="space-y-1.5"><Label htmlFor="fb-t">{tipo === 'reclamo' ? 'Cosa non è andato' : 'Commento'}</Label><Textarea id="fb-t" rows={2} value={testo} onChange={(e) => setTesto(e.target.value)} /></div>
          <BottoneScrittura type="submit">Registra</BottoneScrittura>
        </form>
      </Card>
      {elenco.length === 0 ? <EmptyState compatto icon={MessageSquareHeart} title="Ancora nessun riscontro" description="Voti, recensioni e reclami dei clienti compariranno qui." /> : (
        <Card className="divide-y divide-border">
          {elenco.map((f) => {
            const st = STATI[f.stato] ?? STATI.ricevuto
            const gestibile = f.tipo === 'reclamo' || (f.nps !== null && f.nps <= 6)
            return (
              <div key={f.id} className="space-y-2 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone={f.tipo === 'reclamo' ? 'danger' : 'neutral'}>{TIPI[f.tipo]}</Badge>
                  {f.nps !== null && <span className="tabular-nums text-foreground">NPS {f.nps}</span>}
                  {f.valutazione !== null && <span className="tabular-nums text-foreground">{f.valutazione}/5</span>}
                  <span className="min-w-40 flex-1 text-muted-foreground">{f.testo ?? '—'}</span>
                  <span className="text-xs text-muted-foreground">{new Date(f.ricevuto_at).toLocaleDateString('it-IT')} · {f.canale ?? ''}</span>
                  {gestibile && <Badge tone={st.tone}>{st.label}</Badge>}
                </div>
                {gestibile && f.stato !== 'chiuso' && (
                  <div className="flex flex-wrap gap-2 pl-1">
                    <Input className="h-8 min-w-60 flex-1" placeholder="Risposta al cliente, azione presa…" aria-label="Risposta" defaultValue={f.risposta ?? ''}
                      onChange={(e) => setRisposte({ ...risposte, [f.id]: e.target.value })} />
                    {f.stato === 'ricevuto' && <Button size="sm" variant="outline" onClick={() => salva.mutate({ id: f.id, values: { stato: 'in_gestione' } })}>Prendi in carico</Button>}
                    <BottoneScrittura size="sm" onClick={() => salva.mutate({ id: f.id, values: { stato: 'risolto', risposta: risposte[f.id] ?? f.risposta } },
                      { onSuccess: () => toast.success('Segnato come risolto') })}>Risolto</BottoneScrittura>
                  </div>
                )}
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
