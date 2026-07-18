/**
 * PazienteDettaglioPage — Fascicolo Digitale del paziente (documento
 * §1-§2, §6-§7, §12, §15): anagrafica, fascicolo sanitario e cartelle
 * cliniche/referti (SOLO medici — la segreteria vede l'avviso), consensi,
 * appuntamenti, comunicazioni, documenti, storico (= registro accessi).
 */
import { useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, Pencil, Trash2, Plus, Lock, Stethoscope,
  FileSignature, Send, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { StoricoSection } from '@/components/StoricoSection'
import { useAuth } from '@/hooks/useAuth'
import { PazienteDialog } from '@/modules/poliambulatori/dialogs/PazienteDialog'
import { AppuntamentoDialog } from '@/modules/poliambulatori/dialogs/AppuntamentoDialog'
import {
  CONDIZIONE_LABEL, CONSENSO_LABEL, CANALE_LABEL, APPUNTAMENTO_STATO,
  REFERTO_STATO, fmtData, fmtDataOra,
} from '@/modules/poliambulatori/stati'
import {
  usePaziente, useSonoMedico, useFigliPaziente,
  useCreaFiglioPaziente, useAggiornaFiglioPaziente, useEliminaFiglioPaziente,
  usePoliLista,
  type Paziente, type PazienteConsenso, type PazienteCondizione,
  type PazienteComunicazione, type Visita, type Referto, type Appuntamento,
  type Professionista,
} from '@/modules/poliambulatori/queries/poliambulatorio'

const card = 'rounded-xl border border-border bg-card p-5 shadow-sm'

function Riga({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  )
}

function BtnElimina({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Rimuovi"
      className="rounded-md p-1 text-muted-foreground hover:text-destructive">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

function AvvisoClinica() {
  return (
    <div className={card}>
      <div className="flex items-center gap-3">
        <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">Contenuto clinico riservato</p>
          <p className="text-sm text-muted-foreground">
            Fascicolo sanitario, cartelle e referti sono accessibili solo ai professionisti
            sanitari e all'amministratore (GDPR art. 9). Ogni accesso è registrato.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Panoramica ───────────────────────────────────────────────────
function TabPanoramica({ paziente }: { paziente: Paziente }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Dati anagrafici</h3>
        <Riga label="Codice fiscale">{paziente.codice_fiscale ?? '—'}</Riga>
        <Riga label="Documento">{paziente.documento ?? '—'}</Riga>
        <Riga label="Nascita">
          {fmtData(paziente.data_nascita)}{paziente.luogo_nascita ? ` — ${paziente.luogo_nascita}` : ''}
        </Riga>
        <Riga label="Sesso">{paziente.sesso?.toUpperCase() ?? '—'}</Riga>
        <Riga label="Residenza">{paziente.residenza ?? '—'}</Riga>
      </div>
      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Riferimenti</h3>
        <Riga label="Telefono">{paziente.telefono ?? '—'}</Riga>
        <Riga label="Email">{paziente.email ?? '—'}</Riga>
        <Riga label="Medico curante">{paziente.medico_curante ?? '—'}</Riga>
        <Riga label="Contatto emergenza">{paziente.contatto_emergenza ?? '—'}</Riga>
        <Riga label="Convenzione">{paziente.convenzione?.nome ?? 'Privato'}</Riga>
      </div>
      {paziente.note_amministrative && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Note amministrative</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{paziente.note_amministrative}</p>
        </div>
      )}
    </div>
  )
}

// ── Fascicolo sanitario (clinica) ────────────────────────────────
function TabFascicolo({ paziente }: { paziente: Paziente }) {
  const { isAdmin } = useAuth()
  const { data: sonoMedico } = useSonoMedico()
  const { data: condizioni = [] } = useFigliPaziente<PazienteCondizione>(paziente.id, 'pazienti_condizioni')
  const crea = useCreaFiglioPaziente()
  const elimina = useEliminaFiglioPaziente()
  const [tipo, setTipo] = useState('patologia')
  const [descrizione, setDescrizione] = useState('')

  if (!sonoMedico && !isAdmin) return <AvvisoClinica />

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Fascicolo sanitario</h3>
      {condizioni.map((c) => (
        <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Badge tone={c.tipo === 'allergia' ? 'danger' : 'neutral'}>{CONDIZIONE_LABEL[c.tipo]}</Badge>
          <span className="flex-1 text-foreground">{c.descrizione}</span>
          {c.data && <span className="text-xs text-muted-foreground">{fmtData(c.data)}</span>}
          <BtnElimina onClick={() => elimina.mutate({ pazienteId: paziente.id, tabella: 'pazienti_condizioni', id: c.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!descrizione.trim()) { toast.error('Descrivi la voce'); return }
          crea.mutate({
            pazienteId: paziente.id, tabella: 'pazienti_condizioni',
            values: { tipo, descrizione: descrizione.trim() },
          }, { onSuccess: () => setDescrizione(''), onError: (err) => toast.error((err as Error).message) })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="w-40 space-y-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CONDIZIONE_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <Label>Descrizione</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Es. Allergia alla penicillina" />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}

// ── Visite e referti (clinica) ───────────────────────────────────
function TabVisiteReferti({ paziente }: { paziente: Paziente }) {
  const { isAdmin } = useAuth()
  const { data: sonoMedico } = useSonoMedico()
  const { data: visite = [] } = useFigliPaziente<Visita>(paziente.id, 'visite')
  const { data: referti = [] } = useFigliPaziente<Referto>(paziente.id, 'referti')
  const { data: professionisti = [] } = usePoliLista<Professionista>('professionisti')
  const crea = useCreaFiglioPaziente()
  const aggiorna = useAggiornaFiglioPaziente()
  const [motivo, setMotivo] = useState('')
  const [diagnosi, setDiagnosi] = useState('')
  const [anamnesi, setAnamnesi] = useState('')
  const [esameObiettivo, setEsameObiettivo] = useState('')
  const [prescrizioni, setPrescrizioni] = useState('')
  const [profId, setProfId] = useState('')
  const [titoloRef, setTitoloRef] = useState('')
  const [contenutoRef, setContenutoRef] = useState('')

  if (!sonoMedico && !isAdmin) return <AvvisoClinica />

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Cartella clinica — visite</h3>
        {visite.map((v) => (
          <div key={v.id} className="border-b border-border py-2 text-sm last:border-0">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">{v.motivo ?? 'Visita'}</span>
              <span className="ml-auto text-xs text-muted-foreground">{fmtData(v.data)}</span>
            </div>
            {v.anamnesi && <p className="mt-0.5 text-xs text-muted-foreground">Anamnesi: {v.anamnesi}</p>}
            {v.esame_obiettivo && <p className="mt-0.5 text-xs text-muted-foreground">E.O.: {v.esame_obiettivo}</p>}
            {v.diagnosi && <p className="mt-0.5 text-xs text-muted-foreground">Diagnosi: {v.diagnosi}</p>}
            {v.prescrizioni && <p className="mt-0.5 text-xs text-muted-foreground">Prescrizioni: {v.prescrizioni}</p>}
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!motivo.trim()) { toast.error('Indica il motivo'); return }
            crea.mutate({
              pazienteId: paziente.id, tabella: 'visite',
              values: {
                motivo: motivo.trim(), diagnosi: diagnosi.trim() || null,
                anamnesi: anamnesi.trim() || null,
                esame_obiettivo: esameObiettivo.trim() || null,
                prescrizioni: prescrizioni.trim() || null,
                professionista_id: profId || null,
              },
            }, {
              onSuccess: () => {
                setMotivo(''); setDiagnosi(''); setAnamnesi('')
                setEsameObiettivo(''); setPrescrizioni('')
              },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 space-y-2"
        >
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-36 flex-1 space-y-1">
              <Label>Motivo dell'accesso</Label>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
            <div className="w-44 space-y-1">
              <Label>Professionista</Label>
              <Select value={profId || 'nessuno'} onValueChange={(v) => setProfId(v === 'nessuno' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">—</SelectItem>
                  {professionisti.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome} {p.cognome ?? ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Anamnesi</Label>
              <Input value={anamnesi} onChange={(e) => setAnamnesi(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Esame obiettivo</Label>
              <Input value={esameObiettivo} onChange={(e) => setEsameObiettivo(e.target.value)} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label>Diagnosi</Label>
              <Input value={diagnosi} onChange={(e) => setDiagnosi(e.target.value)} />
            </div>
            <div className="flex-1 space-y-1">
              <Label>Prescrizioni / terapia</Label>
              <Input value={prescrizioni} onChange={(e) => setPrescrizioni(e.target.value)} />
            </div>
            <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Registra visita</Button>
          </div>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Referti</h3>
        {referti.map((r) => {
          const st = REFERTO_STATO[r.stato] ?? REFERTO_STATO.bozza
          return (
            <div key={r.id} className="border-b border-border py-2 text-sm last:border-0">
              <div className="flex items-center gap-2">
                <FileSignature className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="font-medium text-foreground">{r.titolo}</span>
                <Badge tone={st.tone}>{st.label}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{fmtData(r.created_at)}</span>
                {r.stato === 'da_validare' && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs"
                    onClick={() => aggiorna.mutate({
                      pazienteId: paziente.id, tabella: 'referti', id: r.id,
                      values: { stato: 'validato' },
                    }, { onSuccess: () => toast.success('Referto validato (contenuto congelato)') })}>
                    <CheckCircle2 className="h-3 w-3" /> Valida
                  </Button>
                )}
                {r.stato === 'validato' && (
                  <Button size="sm" variant="ghost" className="gap-1 text-xs"
                    onClick={() => aggiorna.mutate({
                      pazienteId: paziente.id, tabella: 'referti', id: r.id,
                      values: { stato: 'inviato' },
                    }, { onSuccess: () => toast.success('Referto segnato come inviato al paziente') })}>
                    <Send className="h-3 w-3" /> Invia
                  </Button>
                )}
              </div>
              <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{r.contenuto}</p>
            </div>
          )
        })}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!titoloRef.trim() || !contenutoRef.trim()) {
              toast.error('Titolo e contenuto obbligatori'); return
            }
            crea.mutate({
              pazienteId: paziente.id, tabella: 'referti',
              values: { titolo: titoloRef.trim(), contenuto: contenutoRef.trim(), stato: 'da_validare' },
            }, {
              onSuccess: () => { setTitoloRef(''); setContenutoRef('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 space-y-2"
        >
          <div className="space-y-1">
            <Label>Titolo referto</Label>
            <Input value={titoloRef} onChange={(e) => setTitoloRef(e.target.value)}
              placeholder="Es. Referto ecografia addome" />
          </div>
          <div className="space-y-1">
            <Label>Contenuto</Label>
            <Textarea value={contenutoRef} onChange={(e) => setContenutoRef(e.target.value)} rows={3} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Crea (da validare)</Button>
        </form>
      </div>
    </div>
  )
}

// ── Appuntamenti del paziente ────────────────────────────────────
function TabAppuntamenti({ paziente }: { paziente: Paziente }) {
  const { data: appuntamenti = [] } = useFigliPaziente<Appuntamento>(paziente.id, 'appuntamenti')
  const [nuovoOpen, setNuovoOpen] = useState(false)

  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Appuntamenti</h3>
        <Button size="sm" onClick={() => setNuovoOpen(true)}>
          <Plus className="h-4 w-4" /> Prenota
        </Button>
      </div>
      {appuntamenti.map((a) => {
        const st = APPUNTAMENTO_STATO[a.stato] ?? APPUNTAMENTO_STATO.prenotato
        return (
          <div key={a.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="font-medium text-foreground">{fmtDataOra(a.inizio)}</span>
            <span className="flex-1 text-muted-foreground">{a.durata_minuti}'</span>
            {a.urgente && <Badge tone="danger">Urgente</Badge>}
            {a.lista_attesa && <Badge tone="warning">Lista attesa</Badge>}
            <Badge tone={st.tone}>{st.label}</Badge>
          </div>
        )
      })}
      <AppuntamentoDialog open={nuovoOpen} onOpenChange={setNuovoOpen} pazienteIniziale={paziente.id} />
    </div>
  )
}

// ── Consensi ─────────────────────────────────────────────────────
function TabConsensi({ paziente }: { paziente: Paziente }) {
  const { data: consensi = [] } = useFigliPaziente<PazienteConsenso>(paziente.id, 'pazienti_consensi')
  const crea = useCreaFiglioPaziente()
  const aggiorna = useAggiornaFiglioPaziente()
  const [tipo, setTipo] = useState('privacy')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Consensi</h3>
      {consensi.map((c) => (
        <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <span className="flex-1 font-medium text-foreground">{CONSENSO_LABEL[c.tipo] ?? c.tipo}</span>
          <span className="text-xs text-muted-foreground">firmato il {fmtData(c.firmato_il)}</span>
          {c.revocato_il ? (
            <Badge tone="danger">Revocato il {fmtData(c.revocato_il)}</Badge>
          ) : (
            <>
              <Badge tone="success">Attivo</Badge>
              <Button size="sm" variant="ghost" className="text-xs text-destructive"
                onClick={() => aggiorna.mutate({
                  pazienteId: paziente.id, tabella: 'pazienti_consensi', id: c.id,
                  values: { revocato_il: new Date().toISOString().slice(0, 10) },
                })}>
                Revoca
              </Button>
            </>
          )}
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          crea.mutate({
            pazienteId: paziente.id, tabella: 'pazienti_consensi', values: { tipo },
          }, { onError: (err) => toast.error((err as Error).message) })
        }}
        className="mt-3 flex items-end gap-2"
      >
        <div className="w-56 space-y-1">
          <Label>Tipo di consenso</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CONSENSO_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Registra firma</Button>
      </form>
    </div>
  )
}

// ── Comunicazioni ────────────────────────────────────────────────
function TabComunicazioni({ paziente }: { paziente: Paziente }) {
  const { data: comunicazioni = [] } = useFigliPaziente<PazienteComunicazione>(paziente.id, 'pazienti_comunicazioni')
  const crea = useCreaFiglioPaziente()
  const elimina = useEliminaFiglioPaziente()
  const [canale, setCanale] = useState('telefono')
  const [oggetto, setOggetto] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Storico comunicazioni</h3>
      {comunicazioni.map((c) => (
        <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Badge tone="neutral">{CANALE_LABEL[c.canale] ?? c.canale}</Badge>
          <span className="flex-1 text-foreground">{c.oggetto}</span>
          <span className="text-xs text-muted-foreground">{fmtDataOra(c.data)}</span>
          <BtnElimina onClick={() => elimina.mutate({ pazienteId: paziente.id, tabella: 'pazienti_comunicazioni', id: c.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!oggetto.trim()) { toast.error('Descrivi la comunicazione'); return }
          crea.mutate({
            pazienteId: paziente.id, tabella: 'pazienti_comunicazioni',
            values: { canale, oggetto: oggetto.trim() },
          }, { onSuccess: () => setOggetto(''), onError: (err) => toast.error((err as Error).message) })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="w-36 space-y-1">
          <Label>Canale</Label>
          <Select value={canale} onValueChange={setCanale}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CANALE_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <Label>Oggetto</Label>
          <Input value={oggetto} onChange={(e) => setOggetto(e.target.value)}
            placeholder="Es. Promemoria appuntamento del 12/08" />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}

// ── Pagina ───────────────────────────────────────────────────────
export function PazienteDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: paziente, isLoading } = usePaziente(id)
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }
  if (!paziente) return <p className="text-sm text-muted-foreground">Paziente non trovato (o modulo non attivo).</p>

  return (
    <div className="mx-auto max-w-6xl">
      <button onClick={() => navigate('/pazienti')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Pazienti
      </button>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-muted-foreground">{paziente.codice}</p>
            <h1 className="mt-0.5 text-2xl font-bold text-foreground">
              {paziente.nome} {paziente.cognome ?? ''}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {paziente.data_nascita && <span>nato/a il {fmtData(paziente.data_nascita)}</span>}
              {paziente.telefono && <span>{paziente.telefono}</span>}
              <span>{paziente.convenzione?.nome ?? 'Privato'}</span>
            </div>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Modifica
          </Button>
        </div>
      </div>

      <Tabs defaultValue="panoramica">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="panoramica">Anagrafica</TabsTrigger>
          <TabsTrigger value="fascicolo">Fascicolo sanitario</TabsTrigger>
          <TabsTrigger value="visite">Visite e referti</TabsTrigger>
          <TabsTrigger value="appuntamenti">Appuntamenti</TabsTrigger>
          <TabsTrigger value="consensi">Consensi</TabsTrigger>
          <TabsTrigger value="comunicazioni">Comunicazioni</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger value="storico">Registro accessi</TabsTrigger>
        </TabsList>
        <TabsContent value="panoramica" className="mt-4"><TabPanoramica paziente={paziente} /></TabsContent>
        <TabsContent value="fascicolo" className="mt-4"><TabFascicolo paziente={paziente} /></TabsContent>
        <TabsContent value="visite" className="mt-4"><TabVisiteReferti paziente={paziente} /></TabsContent>
        <TabsContent value="appuntamenti" className="mt-4"><TabAppuntamenti paziente={paziente} /></TabsContent>
        <TabsContent value="consensi" className="mt-4"><TabConsensi paziente={paziente} /></TabsContent>
        <TabsContent value="comunicazioni" className="mt-4"><TabComunicazioni paziente={paziente} /></TabsContent>
        <TabsContent value="documenti" className="mt-4">
          <AllegatiSection entita="pazienti" entitaId={paziente.id}
            categorie={['Documenti identità', 'Impegnative', 'Certificati', 'Modulistica', 'Altro']} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="pazienti" entitaId={paziente.id} />
        </TabsContent>
      </Tabs>

      <PazienteDialog open={editOpen} onOpenChange={setEditOpen} paziente={paziente} />
    </div>
  )
}
