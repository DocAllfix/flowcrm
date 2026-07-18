/**
 * GaraDettaglioPage — fascicolo digitale della gara (documento §1-§16):
 * panoramica+esito, valutazione Go/No-Go, requisiti, team, chiarimenti,
 * offerta (economica manager-only, ATI/RTI, cauzioni), documenti a 3
 * archivi, scadenze, attività, commenti, storico. Da una gara aggiudicata
 * si crea la commessa (avvio commessa §14).
 */
import { useState, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, Pencil, Building2, Landmark, Trash2, Plus,
  CheckCircle2, Briefcase, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { StoricoSection } from '@/components/StoricoSection'
import { FeedSection } from '@/components/FeedSection'
import { TimelineSection } from '@/components/TimelineSection'
import { ApprovalSection } from '@/components/ApprovalSection'
import { ScadenzeModuliSection } from '@/components/ScadenzeModuliSection'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/lib/queries/users'
import { useOrganizzazioni } from '@/lib/queries/organizzazioni'
import { useCreateCommessa } from '@/lib/queries/commesse'
import { GaraDialog } from '@/modules/gare/dialogs/GaraDialog'
import { GARA_STATI, statoGara, fmtImporto, fmtData } from '@/modules/gare/stati'
import {
  useGara, useUpdateGara, useMoveGaraStato,
  useGaraValutazioni, useGaraRequisiti, useGaraTeam, useGaraChiarimenti,
  useGaraPartecipanti, useGaraCauzioni, useGaraOfferta, useSalvaGaraOfferta,
  useCreaFiglioGara, useAggiornaFiglioGara, useEliminaFiglioGara,
  type Gara, type GaraStato, type GaraRequisitoTipo,
} from '@/modules/gare/queries/gare'

// Criteri Go/No-Go suggeriti (documento §3)
const CRITERI_GO_NO_GO = [
  'Compatibilità con l\'attività aziendale', 'Requisiti economici', 'Requisiti tecnici',
  'Requisiti SOA', 'Capacità finanziaria', 'Disponibilità delle risorse',
  'Marginalità prevista', 'Livello di concorrenza', 'Rischi contrattuali', 'Interesse strategico',
]
const REQUISITO_TIPI: { value: GaraRequisitoTipo; label: string }[] = [
  { value: 'generale', label: 'Generale' },
  { value: 'economico_finanziario', label: 'Economico-finanziario' },
  { value: 'tecnico_professionale', label: 'Tecnico-professionale' },
  { value: 'certificazione', label: 'Certificazione ISO' },
  { value: 'soa', label: 'Attestazione SOA' },
  { value: 'referenze', label: 'Referenze' },
  { value: 'personale', label: 'Personale qualificato' },
  { value: 'attrezzature', label: 'Attrezzature' },
  { value: 'altro', label: 'Altro' },
]
const RUOLI_TEAM = [
  'Responsabile di gara', 'Ufficio tecnico', 'Ufficio amministrativo',
  'Direzione commerciale', 'Consulente esterno', 'Progettista', 'Legale',
]
const CAUZIONE_TIPI = [
  { value: 'provvisoria', label: 'Cauzione provvisoria' },
  { value: 'definitiva', label: 'Cauzione definitiva' },
  { value: 'fideiussione', label: 'Polizza fideiussoria' },
  { value: 'polizza_assicurativa', label: 'Garanzia assicurativa' },
]
const ATI_RUOLI = [
  { value: 'mandataria', label: 'Mandataria' },
  { value: 'mandante', label: 'Mandante' },
  { value: 'consorziata', label: 'Consorziata' },
]

const card = 'rounded-xl border border-border bg-card p-5 shadow-sm'

function Riga({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  )
}

// ── Panoramica ───────────────────────────────────────────────────
function TabPanoramica({ gara }: { gara: Gara }) {
  const navigate = useNavigate()
  const update = useUpdateGara()
  const creaCommessa = useCreateCommessa()
  const { data: offerta } = useGaraOfferta(gara.id)

  async function handleCreaCommessa() {
    if (!gara.ente_appaltante_id) {
      toast.error('Per creare la commessa collega l\'ente appaltante a un\'organizzazione in anagrafica')
      return
    }
    try {
      const commessa = await creaCommessa.mutateAsync({
        organizzazione_id: gara.ente_appaltante_id,
        descrizione: `${gara.codice} — ${gara.titolo}`,
        importo: Number(offerta?.importo_offerto ?? gara.importo_base),
      })
      await update.mutateAsync({ id: gara.id, values: { commessa_id: commessa.id } })
      toast.success(`Commessa ${commessa.codice} creata dalla gara`)
      navigate(`/commesse/${commessa.id}`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Procedura</h3>
        <Riga label="Tipologia">{gara.tipologia}</Riga>
        <Riga label="Procedura">{gara.procedura.replaceAll('_', ' ')}</Riga>
        <Riga label="CIG">{gara.cig ?? '—'}</Riga>
        <Riga label="CUP">{gara.cup ?? '—'}</Riga>
        <Riga label="CPV">{gara.cpv ?? '—'}</Riga>
        <Riga label="RUP">{gara.rup ?? '—'}</Riga>
        <Riga label="Piattaforma">
          {gara.piattaforma_url ? (
            <a href={gara.piattaforma_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline">
              {gara.piattaforma ?? 'link'} <ExternalLink className="h-3 w-3" />
            </a>
          ) : (gara.piattaforma ?? '—')}
        </Riga>
        <Riga label="Luogo di esecuzione">{gara.luogo_esecuzione ?? '—'}</Riga>
        <Riga label="Durata">{gara.durata_mesi != null ? `${gara.durata_mesi} mesi` : '—'}</Riga>
      </div>

      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Importi e termini</h3>
        <Riga label="Importo a base d'asta">{fmtImporto(Number(gara.importo_base))}</Riga>
        <Riga label="Oneri sicurezza">{gara.oneri_sicurezza != null ? fmtImporto(Number(gara.oneri_sicurezza)) : '—'}</Riga>
        <Riga label="Pubblicazione">{fmtData(gara.data_pubblicazione)}</Riga>
        <Riga label="Termine chiarimenti">{fmtData(gara.termine_chiarimenti)}</Riga>
        <Riga label="Termine presentazione">
          {gara.termine_presentazione
            ? new Date(gara.termine_presentazione).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
            : '—'}
        </Riga>
        <Riga label="Apertura offerte">
          {gara.data_apertura_offerte
            ? new Date(gara.data_apertura_offerte).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
            : '—'}
        </Riga>
        <Riga label="Classificazione">
          {[gara.settore, gara.categoria_soa, gara.territorio].filter(Boolean).join(' · ') || '—'}
        </Riga>
        <Riga label="Fonte">{gara.fonte ?? '—'}</Riga>
      </div>

      {['presentata', 'aggiudicata', 'non_aggiudicata'].includes(gara.stato) && (
        <div className={card}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Presentazione ed esito</h3>
          <Riga label="Presentata il">{gara.presentata_at ? fmtData(gara.presentata_at) : '—'}</Riga>
          <Riga label="Protocollo invio">{gara.protocollo_invio ?? '—'}</Riga>
          {gara.esito_at && <Riga label="Esito il">{fmtData(gara.esito_at)}</Riga>}
          {gara.posizione_graduatoria != null && <Riga label="Posizione in graduatoria">{gara.posizione_graduatoria}°</Riga>}
          {gara.aggiudicatario && <Riga label="Aggiudicatario">{gara.aggiudicatario}</Riga>}
          {gara.ricorso && <Riga label="Ricorso">In corso</Riga>}
          {gara.note_esito && <p className="mt-2 text-sm text-muted-foreground">{gara.note_esito}</p>}
        </div>
      )}

      {gara.stato === 'aggiudicata' && (
        <div className={card}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Avvio commessa</h3>
          {gara.commessa_id ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-muted-foreground">Commessa creata:</span>
              <Link to={`/commesse/${gara.commessa_id}`} className="font-medium text-primary hover:underline">
                apri la commessa
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                La gara è aggiudicata: crea la commessa per avviare l'esecuzione
                (codice automatico, importo dall'offerta).
              </p>
              <Button onClick={() => void handleCreaCommessa()} disabled={creaCommessa.isPending}>
                <Briefcase className="h-4 w-4" />
                {creaCommessa.isPending ? 'Creazione…' : 'Crea commessa'}
              </Button>
            </>
          )}
        </div>
      )}

      {gara.note && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Note</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{gara.note}</p>
        </div>
      )}
    </div>
  )
}

// ── Valutazione Go/No-Go ─────────────────────────────────────────
function TabValutazione({ gara }: { gara: Gara }) {
  const { data: valutazioni = [] } = useGaraValutazioni(gara.id)
  const crea = useCreaFiglioGara()
  const elimina = useEliminaFiglioGara()
  const [criterio, setCriterio] = useState('')
  const [punteggio, setPunteggio] = useState('3')
  const [note, setNote] = useState('')

  const media = valutazioni.length
    ? (valutazioni.reduce((s, v) => s + v.punteggio, 0) / valutazioni.length).toFixed(1)
    : null
  const criteriDisponibili = CRITERI_GO_NO_GO.filter(
    (c) => !valutazioni.some((v) => v.criterio === c)
  )

  async function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!criterio) { toast.error('Scegli il criterio'); return }
    try {
      await crea.mutateAsync({
        garaId: gara.id, tabella: 'gare_valutazioni',
        values: { criterio, punteggio: Number(punteggio), note: note.trim() || null },
      })
      setCriterio(''); setPunteggio('3'); setNote('')
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Criteri di valutazione (Go / No-Go)</h3>
          {media && (
            <Badge tone={Number(media) >= 3.5 ? 'success' : Number(media) >= 2.5 ? 'warning' : 'danger'}>
              Media {media} / 5
            </Badge>
          )}
        </div>

        {valutazioni.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            Valuta i criteri (1–5), poi chiedi l'approvazione della Direzione qui sotto.
          </p>
        )}
        {valutazioni.map((v) => (
          <div key={v.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="flex-1 text-foreground">{v.criterio}</span>
            {v.note && <span className="max-w-[200px] truncate text-xs text-muted-foreground">{v.note}</span>}
            <Badge tone={v.punteggio >= 4 ? 'success' : v.punteggio >= 3 ? 'warning' : 'danger'}>
              {v.punteggio}/5
            </Badge>
            <button
              onClick={() => elimina.mutate({ garaId: gara.id, tabella: 'gare_valutazioni', id: v.id })}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <form onSubmit={handleAggiungi} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1 space-y-1">
            <Label>Criterio</Label>
            <Select value={criterio} onValueChange={setCriterio}>
              <SelectTrigger><SelectValue placeholder="Scegli un criterio…" /></SelectTrigger>
              <SelectContent>
                {criteriDisponibili.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24 space-y-1">
            <Label>Voto</Label>
            <Select value={punteggio} onValueChange={setPunteggio}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opzionale" />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
        </form>
      </div>

      <ApprovalSection
        modulo="gare" entita="gare" entitaId={gara.id}
        tipiRichiesta={[{ value: 'go_no_go', label: 'Decisione di partecipazione (Go/No-Go)' }]}
        azioneUrl={`/gare/${gara.id}`}
      />
    </div>
  )
}

// ── Requisiti ────────────────────────────────────────────────────
function TabRequisiti({ gara }: { gara: Gara }) {
  const { data: requisiti = [] } = useGaraRequisiti(gara.id)
  const crea = useCreaFiglioGara()
  const aggiorna = useAggiornaFiglioGara()
  const elimina = useEliminaFiglioGara()
  const [tipo, setTipo] = useState<GaraRequisitoTipo>('generale')
  const [descrizione, setDescrizione] = useState('')

  const soddisfatti = requisiti.filter((r) => r.soddisfatto).length
  const pct = requisiti.length ? Math.round((soddisfatti / requisiti.length) * 100) : 0

  async function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!descrizione.trim()) { toast.error('Descrivi il requisito'); return }
    try {
      await crea.mutateAsync({
        garaId: gara.id, tabella: 'gare_requisiti',
        values: { tipo, descrizione: descrizione.trim() },
      })
      setDescrizione('')
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Requisiti di partecipazione</h3>
        {requisiti.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{soddisfatti}/{requisiti.length}</span>
          </div>
        )}
      </div>

      {requisiti.map((r) => (
        <div key={r.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Checkbox
            checked={r.soddisfatto}
            onCheckedChange={(v) => aggiorna.mutate({
              garaId: gara.id, tabella: 'gare_requisiti', id: r.id,
              values: { soddisfatto: v === true },
            })}
          />
          <span className={r.soddisfatto ? 'flex-1 text-muted-foreground line-through' : 'flex-1 text-foreground'}>
            {r.descrizione}
          </span>
          <Badge tone="neutral">{REQUISITO_TIPI.find((t) => t.value === r.tipo)?.label ?? r.tipo}</Badge>
          <button
            onClick={() => elimina.mutate({ garaId: gara.id, tabella: 'gare_requisiti', id: r.id })}
            className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <form onSubmit={handleAggiungi} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="w-52 space-y-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as GaraRequisitoTipo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REQUISITO_TIPI.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-56 flex-1 space-y-1">
          <Label>Requisito</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Es. Fatturato minimo triennio € 1M" />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
      </form>
    </div>
  )
}

// ── Team ─────────────────────────────────────────────────────────
function TabTeam({ gara }: { gara: Gara }) {
  const { data: team = [] } = useGaraTeam(gara.id)
  const { data: utenti = [] } = useUsers()
  const crea = useCreaFiglioGara()
  const elimina = useEliminaFiglioGara()
  const [userId, setUserId] = useState('')
  const [ruolo, setRuolo] = useState(RUOLI_TEAM[0])

  const disponibili = utenti.filter((u) => u.attivo && !team.some((m) => m.user_id === u.id))

  async function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!userId) { toast.error('Scegli un membro del team'); return }
    try {
      await crea.mutateAsync({
        garaId: gara.id, tabella: 'gare_team', values: { user_id: userId, ruolo },
      })
      setUserId('')
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Team di gara</h3>
        {team.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">Assegna le responsabilità: le attività si collegano dalla tab Attività.</p>
        )}
        {team.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-semibold text-white">
              {(m.utente?.nome[0] ?? '?')}{(m.utente?.cognome?.[0] ?? '')}
            </div>
            <span className="flex-1 font-medium text-foreground">
              {m.utente ? `${m.utente.nome} ${m.utente.cognome ?? ''}` : '—'}
            </span>
            <Badge tone="neutral">{m.ruolo}</Badge>
            <button
              onClick={() => elimina.mutate({ garaId: gara.id, tabella: 'gare_team', id: m.id })}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <form onSubmit={handleAggiungi} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1 space-y-1">
            <Label>Utente</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
              <SelectContent>
                {disponibili.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-56 space-y-1">
            <Label>Ruolo</Label>
            <Select value={ruolo} onValueChange={setRuolo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RUOLI_TEAM.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
        </form>
      </div>
    </div>
  )
}

// ── Chiarimenti ──────────────────────────────────────────────────
function TabChiarimenti({ gara }: { gara: Gara }) {
  const { data: chiarimenti = [] } = useGaraChiarimenti(gara.id)
  const crea = useCreaFiglioGara()
  const aggiorna = useAggiornaFiglioGara()
  const elimina = useEliminaFiglioGara()
  const [domanda, setDomanda] = useState('')
  const [rispostaDraft, setRispostaDraft] = useState<Record<string, string>>({})

  async function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!domanda.trim()) { toast.error('Scrivi la domanda'); return }
    try {
      await crea.mutateAsync({
        garaId: gara.id, tabella: 'gare_chiarimenti', values: { domanda: domanda.trim() },
      })
      setDomanda('')
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Richieste di chiarimento</h3>
      {chiarimenti.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">Registra le domande inviate alla stazione appaltante e le risposte ricevute.</p>
      )}
      {chiarimenti.map((c) => (
        <div key={c.id} className="border-b border-border py-3 last:border-0">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{c.domanda}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Inviata il {fmtData(c.data_invio)}</p>
            </div>
            <button
              onClick={() => elimina.mutate({ garaId: gara.id, tabella: 'gare_chiarimenti', id: c.id })}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          {c.risposta ? (
            <p className="mt-2 rounded-lg bg-muted/50 p-3 text-sm text-foreground">
              {c.risposta}
              <span className="mt-1 block text-xs text-muted-foreground">Risposta del {fmtData(c.data_risposta)}</span>
            </p>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={rispostaDraft[c.id] ?? ''}
                onChange={(e) => setRispostaDraft((p) => ({ ...p, [c.id]: e.target.value }))}
                placeholder="Registra la risposta ricevuta…"
              />
              <Button size="sm" variant="outline" disabled={!rispostaDraft[c.id]?.trim() || aggiorna.isPending}
                onClick={() => aggiorna.mutate({
                  garaId: gara.id, tabella: 'gare_chiarimenti', id: c.id,
                  values: { risposta: rispostaDraft[c.id].trim(), data_risposta: new Date().toISOString().slice(0, 10) },
                })}>
                Salva
              </Button>
            </div>
          )}
        </div>
      ))}
      <form onSubmit={handleAggiungi} className="mt-3 flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label>Nuova domanda</Label>
          <Input value={domanda} onChange={(e) => setDomanda(e.target.value)}
            placeholder="Es. Si chiede conferma che…" />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Registra</Button>
      </form>
    </div>
  )
}

// ── Offerta (economica manager-only + ATI + cauzioni) ────────────
function TabOfferta({ gara }: { gara: Gara }) {
  const { isManager } = useAuth()
  const { data: offerta } = useGaraOfferta(gara.id)
  const salva = useSalvaGaraOfferta()
  const { data: partecipanti = [] } = useGaraPartecipanti(gara.id)
  const { data: cauzioni = [] } = useGaraCauzioni(gara.id)
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const crea = useCreaFiglioGara()
  const elimina = useEliminaFiglioGara()
  const aggiornaFiglio = useAggiornaFiglioGara()
  const update = useUpdateGara()

  const [ribasso, setRibasso] = useState<string | null>(null)
  const [importoOfferto, setImportoOfferto] = useState<string | null>(null)
  const [manodopera, setManodopera] = useState<string | null>(null)
  const [marginalita, setMarginalita] = useState<string | null>(null)
  const [noteTecnica, setNoteTecnica] = useState<string | null>(null)
  const [protocollo, setProtocollo] = useState<string | null>(null)
  // ATI
  const [orgId, setOrgId] = useState('')
  const [ruoloAti, setRuoloAti] = useState('mandante')
  const [quota, setQuota] = useState('')
  // Cauzioni
  const [tipoCauzione, setTipoCauzione] = useState('provvisoria')
  const [importoCauzione, setImportoCauzione] = useState('')
  const [garante, setGarante] = useState('')
  const [scadenzaCauzione, setScadenzaCauzione] = useState('')

  const v = {
    ribasso: ribasso ?? (offerta?.ribasso_percentuale != null ? String(offerta.ribasso_percentuale) : ''),
    importoOfferto: importoOfferto ?? (offerta?.importo_offerto != null ? String(offerta.importo_offerto) : ''),
    manodopera: manodopera ?? (offerta?.costi_manodopera != null ? String(offerta.costi_manodopera) : ''),
    marginalita: marginalita ?? (offerta?.marginalita_percentuale != null ? String(offerta.marginalita_percentuale) : ''),
    noteTecnica: noteTecnica ?? (gara.offerta_tecnica_note ?? ''),
    protocollo: protocollo ?? (gara.protocollo_invio ?? ''),
  }

  async function salvaOfferta() {
    const num = (s: string) => (s.trim() === '' ? null : Number(s))
    try {
      await salva.mutateAsync({
        garaId: gara.id,
        values: {
          ribasso_percentuale: num(v.ribasso),
          importo_offerto: num(v.importoOfferto),
          costi_manodopera: num(v.manodopera),
          marginalita_percentuale: num(v.marginalita),
        },
      })
      await update.mutateAsync({
        id: gara.id,
        values: { offerta_tecnica_note: v.noteTecnica.trim() || null, protocollo_invio: v.protocollo.trim() || null },
      })
      toast.success('Offerta salvata')
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      {isManager ? (
        <div className={card}>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Offerta economica (riservata)</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Ribasso (%)</Label>
              <Input type="number" step="0.001" value={v.ribasso} onChange={(e) => setRibasso(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Importo offerto (€)</Label>
              <Input type="number" step="0.01" value={v.importoOfferto} onChange={(e) => setImportoOfferto(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Costi manodopera (€)</Label>
              <Input type="number" step="0.01" value={v.manodopera} onChange={(e) => setManodopera(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Marginalità prevista (%)</Label>
              <Input type="number" step="0.01" value={v.marginalita} onChange={(e) => setMarginalita(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Offerta tecnica — sintesi/capitoli</Label>
              <Textarea rows={2} value={v.noteTecnica} onChange={(e) => setNoteTecnica(e.target.value)}
                placeholder="Struttura capitoli, migliorie offerte… (gli elaborati vanno nei Documenti, archivio Offerta)" />
            </div>
            <div className="space-y-1.5">
              <Label>Protocollo di invio</Label>
              <Input value={v.protocollo} onChange={(e) => setProtocollo(e.target.value)}
                placeholder="Ricevuta/protocollo della piattaforma" />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={() => void salvaOfferta()} disabled={salva.isPending}>
              {salva.isPending ? 'Salvataggio…' : 'Salva offerta'}
            </Button>
          </div>
        </div>
      ) : (
        <div className={card}>
          <p className="text-sm text-muted-foreground">
            L'offerta economica (ribasso, margini) è riservata ad admin e manager.
          </p>
        </div>
      )}

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">ATI / RTI / Consorzio</h3>
        {partecipanti.length === 0 && (
          <p className="py-1 text-sm text-muted-foreground">Partecipazione singola. Aggiungi i partner per una partecipazione aggregata.</p>
        )}
        {partecipanti.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 font-medium text-foreground">{p.organizzazione?.ragione_sociale ?? '—'}</span>
            <Badge tone={p.ruolo === 'mandataria' ? 'primary' : 'neutral'}>
              {ATI_RUOLI.find((r) => r.value === p.ruolo)?.label}
            </Badge>
            {p.quota_percentuale != null && (
              <span className="text-xs text-muted-foreground">{Number(p.quota_percentuale)}%</span>
            )}
            <button
              onClick={() => elimina.mutate({ garaId: gara.id, tabella: 'gare_partecipanti', id: p.id })}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!orgId) { toast.error('Scegli il partner'); return }
            crea.mutate({
              garaId: gara.id, tabella: 'gare_partecipanti',
              values: { organizzazione_id: orgId, ruolo: ruoloAti, quota_percentuale: quota === '' ? null : Number(quota) },
            }, { onSuccess: () => { setOrgId(''); setQuota('') }, onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-48 flex-1 space-y-1">
            <Label>Partner</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue placeholder="Organizzazione…" /></SelectTrigger>
              <SelectContent>
                {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-1">
            <Label>Ruolo</Label>
            <Select value={ruoloAti} onValueChange={setRuoloAti}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ATI_RUOLI.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24 space-y-1">
            <Label>Quota %</Label>
            <Input type="number" min="0" max="100" value={quota} onChange={(e) => setQuota(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Cauzioni e garanzie</h3>
        {cauzioni.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-foreground">
              {CAUZIONE_TIPI.find((t) => t.value === c.tipo)?.label}
              {c.garante && <span className="text-muted-foreground"> · {c.garante}</span>}
            </span>
            <span className="font-medium text-foreground">{fmtImporto(Number(c.importo))}</span>
            {c.data_scadenza && (
              <span className="text-xs text-muted-foreground">scad. {fmtData(c.data_scadenza)}</span>
            )}
            {c.restituita ? (
              <Badge tone="success">Restituita</Badge>
            ) : (
              <Button size="sm" variant="ghost" className="text-xs"
                onClick={() => aggiornaFiglio.mutate({
                  garaId: gara.id, tabella: 'gare_cauzioni', id: c.id, values: { restituita: true },
                })}>
                Segna restituita
              </Button>
            )}
            <button
              onClick={() => elimina.mutate({ garaId: gara.id, tabella: 'gare_cauzioni', id: c.id })}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const imp = Number(importoCauzione)
            if (!importoCauzione || Number.isNaN(imp)) { toast.error('Importo non valido'); return }
            crea.mutate({
              garaId: gara.id, tabella: 'gare_cauzioni',
              values: {
                tipo: tipoCauzione, importo: imp, garante: garante.trim() || null,
                data_scadenza: scadenzaCauzione || null,
              },
            }, {
              onSuccess: () => { setImportoCauzione(''); setGarante(''); setScadenzaCauzione('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-48 space-y-1">
            <Label>Tipo</Label>
            <Select value={tipoCauzione} onValueChange={setTipoCauzione}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAUZIONE_TIPI.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1">
            <Label>Importo (€)</Label>
            <Input type="number" step="0.01" value={importoCauzione} onChange={(e) => setImportoCauzione(e.target.value)} />
          </div>
          <div className="min-w-36 flex-1 space-y-1">
            <Label>Garante</Label>
            <Input value={garante} onChange={(e) => setGarante(e.target.value)} placeholder="Banca/assicurazione" />
          </div>
          <div className="w-40 space-y-1">
            <Label>Scadenza</Label>
            <Input type="date" value={scadenzaCauzione} onChange={(e) => setScadenzaCauzione(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
        </form>
      </div>

      <ApprovalSection
        modulo="gare" entita="gare" entitaId={gara.id}
        tipiRichiesta={[
          { value: 'offerta_tecnica', label: 'Approvazione offerta tecnica' },
          { value: 'offerta_economica', label: 'Approvazione offerta economica' },
          { value: 'presentazione', label: 'Autorizzazione alla presentazione' },
          { value: 'accettazione_aggiudicazione', label: 'Accettazione aggiudicazione' },
        ]}
        azioneUrl={`/gare/${gara.id}`}
      />
    </div>
  )
}

// ── Pagina ───────────────────────────────────────────────────────
export function GaraDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: gara, isLoading } = useGara(id)
  const move = useMoveGaraStato()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }
  if (!gara) return <p className="text-sm text-muted-foreground">Gara non trovata (o modulo non attivo).</p>

  const st = statoGara(gara.stato)

  return (
    <div className="mx-auto max-w-6xl">
      <button onClick={() => navigate('/gare')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Gare
      </button>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-muted-foreground">{gara.codice}</p>
            <h1 className="mt-0.5 text-2xl font-bold text-foreground">{gara.titolo}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {gara.ente?.ragione_sociale ?? gara.ente_appaltante ?? 'Ente non indicato'}
              </span>
              <span className="font-semibold text-foreground">{fmtImporto(Number(gara.importo_base))}</span>
              {gara.termine_presentazione && ['in_analisi', 'in_preparazione'].includes(gara.stato) && (
                <span>termine: {new Date(gara.termine_presentazione).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span>
              )}
              {gara.responsabile && (
                <span>resp. {gara.responsabile.nome} {gara.responsabile.cognome ?? ''}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={st.tone} className="text-sm">{st.label}</Badge>
            <Select value={gara.stato}
              onValueChange={(v) => move.mutate({ id: gara.id, stato: v as GaraStato }, {
                onError: (e) => toast.error((e as Error).message),
              })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GARA_STATI.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Modifica
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="panoramica">
        <TabsList className="flex-wrap">
          <TabsTrigger value="panoramica">Panoramica</TabsTrigger>
          <TabsTrigger value="valutazione">Go/No-Go</TabsTrigger>
          <TabsTrigger value="requisiti">Requisiti</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="chiarimenti">Chiarimenti</TabsTrigger>
          <TabsTrigger value="offerta">Offerta</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger value="scadenze">Scadenze</TabsTrigger>
          <TabsTrigger value="attivita">Attività</TabsTrigger>
          <TabsTrigger value="commenti">Commenti</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>
        <TabsContent value="panoramica" className="mt-4"><TabPanoramica gara={gara} /></TabsContent>
        <TabsContent value="valutazione" className="mt-4"><TabValutazione gara={gara} /></TabsContent>
        <TabsContent value="requisiti" className="mt-4"><TabRequisiti gara={gara} /></TabsContent>
        <TabsContent value="team" className="mt-4"><TabTeam gara={gara} /></TabsContent>
        <TabsContent value="chiarimenti" className="mt-4"><TabChiarimenti gara={gara} /></TabsContent>
        <TabsContent value="offerta" className="mt-4"><TabOfferta gara={gara} /></TabsContent>
        <TabsContent value="documenti" className="mt-4">
          <AllegatiSection entita="gare" entitaId={gara.id}
            categorie={['Documentazione di gara', 'Documentazione aziendale', 'Offerta']} />
        </TabsContent>
        <TabsContent value="scadenze" className="mt-4">
          <ScadenzeModuliSection modulo="gare" entita="gare" entitaId={gara.id}
            tipi={['Cauzione', 'Polizza', 'Validità offerta', 'Firma contratto', 'Avvio lavori', 'Adempimento', 'Altro']}
            azioneUrl={`/gare/${gara.id}`} />
        </TabsContent>
        <TabsContent value="attivita" className="mt-4">
          <TimelineSection scope={{ gara_id: gara.id }} />
        </TabsContent>
        <TabsContent value="commenti" className="mt-4">
          <FeedSection target={{ entita: 'gare', entitaId: gara.id }} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="gare" entitaId={gara.id} />
        </TabsContent>
      </Tabs>

      <GaraDialog open={editOpen} onOpenChange={setEditOpen} gara={gara} />
    </div>
  )
}
