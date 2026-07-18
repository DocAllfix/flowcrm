/**
 * CantiereDettaglioPage — fascicolo del cantiere (documento §1-§17):
 * panoramica con KPI ed economia (manager), cronoprogramma, rapportini,
 * personale con presenze, imprese, mezzi e materiali, contabilità
 * (SAL → fattura, costi), sicurezza, qualità e ambiente, documenti a 5
 * archivi, scadenze, attività, commenti, storico.
 */
import { useMemo, useState, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, Pencil, Building2, MapPin, Trash2, Plus,
  HardHat, ShieldAlert, FileText, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useOrganizzazioni } from '@/lib/queries/organizzazioni'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { CantiereDialog } from '@/modules/cantiere/dialogs/CantiereDialog'
import { RapportinoDialog } from '@/modules/cantiere/dialogs/RapportinoDialog'
import {
  CANTIERE_STATI, statoCantiere, fmtImporto, fmtData,
  METEO_LABEL, SICUREZZA_LABEL, QUALITA_TIPO_LABEL, AMBIENTE_LABEL,
  MEZZO_TIPO_LABEL, MOVIMENTO_LABEL, SAL_STATO_LABEL,
  CANTIERE_CATEGORIE_DOC, CANTIERE_TIPI_SCADENZA,
} from '@/modules/cantiere/stati'
import {
  useCantiere, useUpdateCantiere, useCantiereEconomia, useCantiereKpi,
  useFigliCantiere, useCreaFiglioCantiere, useAggiornaFiglioCantiere,
  useEliminaFiglioCantiere, cantieriKeys,
  type Cantiere, type CantiereStato, type CantiereFase, type CantierePersonale,
  type CantierePresenza, type CantiereImpresa, type CantiereMezzo,
  type CantiereMateriale, type CantiereSal, type CantiereCosto,
  type CantiereRapportino, type CantiereEventoSicurezza,
  type CantiereControlloQualita, type CantiereRegistroAmbiente,
} from '@/modules/cantiere/queries/cantieri'

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

// ── Panoramica (info + KPI + economia manager) ───────────────────
function TabPanoramica({ cantiere }: { cantiere: Cantiere }) {
  const { isManager } = useAuth()
  const { data: kpi } = useCantiereKpi(cantiere.id)
  const { data: eco } = useCantiereEconomia(cantiere.id)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Committenza e riferimenti</h3>
        <Riga label="Cliente">
          {cantiere.cliente ? (
            <Link to={`/organizzazioni/${cantiere.cliente.id}`} className="text-primary hover:underline">
              {cantiere.cliente.ragione_sociale}
            </Link>
          ) : '—'}
        </Riga>
        <Riga label="Committente">{cantiere.committente?.ragione_sociale ?? '—'}</Riga>
        <Riga label="Direttore lavori">{cantiere.direttore_lavori ?? '—'}</Riga>
        <Riga label="RUP">{cantiere.rup ?? '—'}</Riga>
        <Riga label="CIG / CUP">{[cantiere.cig, cantiere.cup].filter(Boolean).join(' / ') || '—'}</Riga>
        <Riga label="Categoria lavori">{cantiere.categoria_lavori ?? '—'}</Riga>
        <Riga label="Responsabile interno">
          {cantiere.responsabile ? `${cantiere.responsabile.nome} ${cantiere.responsabile.cognome ?? ''}` : '—'}
        </Riga>
        <Riga label="Capocantiere">
          {cantiere.capocantiere ? `${cantiere.capocantiere.nome} ${cantiere.capocantiere.cognome ?? ''}` : '—'}
        </Riga>
        <Riga label="Direttore tecnico">{cantiere.direttore_tecnico ?? '—'}</Riga>
        <Riga label="Resp. sicurezza">{cantiere.responsabile_sicurezza ?? '—'}</Riga>
      </div>

      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Andamento</h3>
        <Riga label="Apertura">{fmtData(cantiere.data_apertura)}</Riga>
        <Riga label="Fine prevista">{fmtData(cantiere.data_fine_prevista)}</Riga>
        {cantiere.data_chiusura && <Riga label="Chiusura">{fmtData(cantiere.data_chiusura)}</Riga>}
        <Riga label="Avanzamento medio">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-24 overflow-hidden rounded-full bg-muted align-middle">
              <span className="block h-full rounded-full bg-primary"
                style={{ width: `${kpi?.avanzamento_medio ?? 0}%` }} />
            </span>
            {kpi?.avanzamento_medio ?? 0}%
          </span>
        </Riga>
        <Riga label="Ore lavorate">{Number(kpi?.ore_totali ?? 0)} h</Riga>
        <Riga label="Rapportini">{kpi?.rapportini ?? 0}</Riga>
        <Riga label="Sicurezza: eventi aperti">
          {(kpi?.sicurezza_aperti ?? 0) > 0
            ? <Badge tone="danger">{kpi?.sicurezza_aperti}</Badge>
            : <Badge tone="success">0</Badge>}
        </Riga>
        <Riga label="Non conformità qualità">{kpi?.qualita_non_conformi ?? 0}</Riga>
        {(cantiere.commessa_id || cantiere.gara_id) && (
          <Riga label="Collegamenti">
            <span className="space-x-2">
              {cantiere.commessa_id && (
                <Link to={`/commesse/${cantiere.commessa_id}`} className="text-primary hover:underline">commessa</Link>
              )}
              {cantiere.gara_id && (
                <Link to={`/gare/${cantiere.gara_id}`} className="text-primary hover:underline">gara</Link>
              )}
            </span>
          </Riga>
        )}
      </div>

      {isManager && eco && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Gestione economica (riservata)</h3>
          <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-5">
            <Riga label="Contratto">{fmtImporto(Number(eco.importo_contrattuale ?? 0))}</Riga>
            <Riga label="SAL emessi">{fmtImporto(Number(eco.sal_emessi ?? 0))}</Riga>
            <Riga label="SAL pagati">{fmtImporto(Number(eco.sal_pagati ?? 0))}</Riga>
            <Riga label="Costi totali">{fmtImporto(Number(eco.costi_totali ?? 0))}</Riga>
            <Riga label="Utile maturato">
              <span className={Number(eco.utile_maturato ?? 0) >= 0 ? 'text-success' : 'text-destructive'}>
                {fmtImporto(Number(eco.utile_maturato ?? 0))}
              </span>
            </Riga>
          </div>
        </div>
      )}

      {cantiere.note && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Note</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{cantiere.note}</p>
        </div>
      )}
    </div>
  )
}

// ── Cronoprogramma (fasi con barre e dipendenze) ─────────────────
function TabCronoprogramma({ cantiere }: { cantiere: Cantiere }) {
  const { data: fasi = [] } = useFigliCantiere<CantiereFase>(cantiere.id, 'cantiere_fasi')
  const crea = useCreaFiglioCantiere()
  const aggiorna = useAggiornaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [nome, setNome] = useState('')
  const [inizio, setInizio] = useState('')
  const [fine, setFine] = useState('')

  async function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Dai un nome alla fase'); return }
    try {
      await crea.mutateAsync({
        cantiereId: cantiere.id, tabella: 'cantiere_fasi',
        values: {
          nome: nome.trim(), data_inizio: inizio || null, data_fine: fine || null,
          ordine: fasi.length + 1,
        },
      })
      setNome(''); setInizio(''); setFine('')
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Cronoprogramma</h3>
      {fasi.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          Suddividi i lavori in fasi: l'avanzamento del cantiere è la media delle fasi.
        </p>
      )}
      <div className="space-y-2">
        {fasi.map((f) => (
          <div key={f.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm font-medium text-foreground">{f.nome}</span>
              <span className="text-xs text-muted-foreground">
                {fmtData(f.data_inizio)} → {fmtData(f.data_fine)}
              </span>
              <Select value={String(f.avanzamento)}
                onValueChange={(v) => aggiorna.mutate({
                  cantiereId: cantiere.id, tabella: 'cantiere_fasi', id: f.id,
                  values: { avanzamento: Number(v) },
                })}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_fasi', id: f.id })} />
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${f.avanzamento}%` }} />
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleAggiungi} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1 space-y-1">
          <Label>Fase</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Scavi e fondazioni" />
        </div>
        <div className="w-40 space-y-1">
          <Label>Inizio</Label>
          <Input type="date" value={inizio} onChange={(e) => setInizio(e.target.value)} />
        </div>
        <div className="w-40 space-y-1">
          <Label>Fine</Label>
          <Input type="date" value={fine} onChange={(e) => setFine(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi fase</Button>
      </form>
    </div>
  )
}

// ── Rapportini ───────────────────────────────────────────────────
function TabRapportini({ cantiere }: { cantiere: Cantiere }) {
  const { data: rapportini = [] } = useFigliCantiere<CantiereRapportino>(cantiere.id, 'cantiere_rapportini')
  const elimina = useEliminaFiglioCantiere()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [edit, setEdit] = useState<CantiereRapportino | null>(null)
  const { isAdmin } = useAuth()

  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Rapportini giornalieri</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Rapportino di oggi
        </Button>
      </div>
      {rapportini.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          Il capocantiere registra ogni giorno lavorazioni, presenze, mezzi, meteo e problemi — anche dal telefono.
        </p>
      )}
      {rapportini.map((r) => (
        <div key={r.id} className="border-b border-border py-3 last:border-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{fmtData(r.data)}</span>
            {r.meteo && <Badge tone="neutral">{METEO_LABEL[r.meteo] ?? r.meteo}</Badge>}
            {r.problemi && <Badge tone="warning">Problemi</Badge>}
            <span className="ml-auto text-xs text-muted-foreground">
              {r.capocantiere ? `${r.capocantiere.nome} ${r.capocantiere.cognome ?? ''}` : ''}
            </span>
            <button onClick={() => setEdit(r)} aria-label="Modifica"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {isAdmin && (
              <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_rapportini', id: r.id })} />
            )}
          </div>
          <p className="mt-1 text-sm text-foreground">{r.lavorazioni}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[r.personale && `Personale: ${r.personale}`, r.mezzi && `Mezzi: ${r.mezzi}`,
              r.materiali && `Materiali: ${r.materiali}`].filter(Boolean).join(' · ')}
          </p>
          {r.problemi && <p className="mt-1 text-sm text-warning-foreground">⚠ {r.problemi}</p>}
        </div>
      ))}
      <RapportinoDialog
        open={dialogOpen || !!edit}
        cantiereId={cantiere.id}
        rapportino={edit ?? undefined}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEdit(null) } }}
      />
    </div>
  )
}

// ── Personale + presenze ─────────────────────────────────────────
function TabPersonale({ cantiere }: { cantiere: Cantiere }) {
  const { data: personale = [] } = useFigliCantiere<CantierePersonale>(cantiere.id, 'cantiere_personale')
  const { data: presenze = [] } = useFigliCantiere<CantierePresenza>(cantiere.id, 'cantiere_presenze')
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const crea = useCreaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [nominativo, setNominativo] = useState('')
  const [ruolo, setRuolo] = useState('')
  const [impresaId, setImpresaId] = useState('')

  const oggi = new Date().toISOString().slice(0, 10)
  const presentiOggi = new Set(presenze.filter((p) => p.data === oggi).map((p) => p.personale_id))

  async function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!nominativo.trim()) { toast.error('Inserisci il nominativo'); return }
    try {
      await crea.mutateAsync({
        cantiereId: cantiere.id, tabella: 'cantiere_personale',
        values: {
          nominativo: nominativo.trim(), ruolo: ruolo.trim() || null,
          impresa_id: impresaId || null,
        },
      })
      setNominativo(''); setRuolo(''); setImpresaId('')
    } catch (err) { toast.error((err as Error).message) }
  }

  function segnaPresenza(p: CantierePersonale) {
    crea.mutate({
      cantiereId: cantiere.id, tabella: 'cantiere_presenze',
      values: { personale_id: p.id, data: oggi, ore: 8 },
    }, {
      onSuccess: () => toast.success('Presenza registrata (8 ore)'),
      onError: (err) => toast.error((err as Error).message),
    })
  }

  const oreTotali = presenze.reduce((s, p) => s + Number(p.ore), 0)

  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Personale di cantiere</h3>
        <span className="text-xs text-muted-foreground">{oreTotali} ore registrate</span>
      </div>
      {personale.map((p) => (
        <div key={p.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <HardHat className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              {p.dipendente ? `${p.dipendente.nome} ${p.dipendente.cognome ?? ''}` : p.nominativo}
            </p>
            <p className="text-xs text-muted-foreground">
              {[p.ruolo, p.impresa?.ragione_sociale].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          {presentiOggi.has(p.id) ? (
            <Badge tone="success">Presente oggi</Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={() => segnaPresenza(p)}>
              Segna presente
            </Button>
          )}
          <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_personale', id: p.id })} />
        </div>
      ))}
      <form onSubmit={handleAggiungi} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-44 flex-1 space-y-1">
          <Label>Nominativo</Label>
          <Input value={nominativo} onChange={(e) => setNominativo(e.target.value)} placeholder="Nome e cognome" />
        </div>
        <div className="w-36 space-y-1">
          <Label>Ruolo</Label>
          <Input value={ruolo} onChange={(e) => setRuolo(e.target.value)} placeholder="Es. Operaio" />
        </div>
        <div className="w-52 space-y-1">
          <Label>Impresa</Label>
          <Select value={impresaId || 'interna'} onValueChange={(v) => setImpresaId(v === 'interna' ? '' : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="interna">— Interno —</SelectItem>
              {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
      </form>
    </div>
  )
}

// ── Imprese e subappaltatori ─────────────────────────────────────
function TabImprese({ cantiere }: { cantiere: Cantiere }) {
  const { data: imprese = [] } = useFigliCantiere<CantiereImpresa>(cantiere.id, 'cantiere_imprese')
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const crea = useCreaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [orgId, setOrgId] = useState('')
  const [lavorazioni, setLavorazioni] = useState('')
  const [importo, setImporto] = useState('')

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Imprese e subappaltatori</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          DURC, SOA e assicurazioni si caricano nei Documenti e si monitorano nelle Scadenze.
        </p>
        {imprese.map((i) => (
          <div key={i.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{i.organizzazione?.ragione_sociale ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{i.lavorazioni ?? '—'}</p>
            </div>
            {i.importo_affidato != null && (
              <span className="text-sm font-medium text-foreground">{fmtImporto(Number(i.importo_affidato))}</span>
            )}
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_imprese', id: i.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!orgId) { toast.error("Scegli l'impresa"); return }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_imprese',
              values: {
                organizzazione_id: orgId, lavorazioni: lavorazioni.trim() || null,
                importo_affidato: importo === '' ? null : Number(importo),
              },
            }, {
              onSuccess: () => { setOrgId(''); setLavorazioni(''); setImporto('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-48 flex-1 space-y-1">
            <Label>Impresa</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue placeholder="Organizzazione…" /></SelectTrigger>
              <SelectContent>
                {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Lavorazioni</Label>
            <Input value={lavorazioni} onChange={(e) => setLavorazioni(e.target.value)}
              placeholder="Es. Impianti elettrici" />
          </div>
          <div className="w-36 space-y-1">
            <Label>Importo (€)</Label>
            <Input type="number" step="0.01" value={importo} onChange={(e) => setImporto(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
        </form>
      </div>

      <ApprovalSection
        modulo="cantiere" entita="cantieri" entitaId={cantiere.id}
        tipiRichiesta={[
          { value: 'acquisto', label: 'Approvazione acquisto' },
          { value: 'variante', label: 'Approvazione variante' },
          { value: 'sal', label: 'Approvazione SAL' },
          { value: 'documento', label: 'Approvazione documento' },
          { value: 'ordine', label: 'Approvazione ordine' },
        ]}
        azioneUrl={`/cantieri/${cantiere.id}`}
      />
    </div>
  )
}

// ── Mezzi e materiali ────────────────────────────────────────────
function TabMezziMateriali({ cantiere }: { cantiere: Cantiere }) {
  const { data: mezzi = [] } = useFigliCantiere<CantiereMezzo>(cantiere.id, 'cantiere_mezzi')
  const { data: materiali = [] } = useFigliCantiere<CantiereMateriale>(cantiere.id, 'cantiere_materiali')
  const crea = useCreaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [tipoMezzo, setTipoMezzo] = useState('automezzo')
  const [descMezzo, setDescMezzo] = useState('')
  const [movimento, setMovimento] = useState('consegna')
  const [descMat, setDescMat] = useState('')
  const [quantita, setQuantita] = useState('')
  const [unita, setUnita] = useState('')

  // Giacenze per materiale: consegne − consumi − resi (§7)
  const giacenze = useMemo(() => {
    const m: Record<string, { unita: string | null; q: number }> = {}
    for (const r of materiali) {
      const k = r.descrizione.toLowerCase()
      m[k] ??= { unita: r.unita, q: 0 }
      const q = Number(r.quantita)
      if (r.movimento === 'consegna') m[k].q += q
      else if (r.movimento === 'consumo' || r.movimento === 'reso') m[k].q -= q
    }
    return Object.entries(m).filter(([, v]) => v.q !== 0)
  }, [materiali])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Mezzi e attrezzature</h3>
        {mezzi.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{m.descrizione}</p>
              <p className="text-xs text-muted-foreground">
                {MEZZO_TIPO_LABEL[m.tipo]} · dal {fmtData(m.dal)}{m.al ? ` al ${fmtData(m.al)}` : ''}
              </p>
            </div>
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_mezzi', id: m.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!descMezzo.trim()) { toast.error('Descrivi il mezzo'); return }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_mezzi',
              values: { tipo: tipoMezzo, descrizione: descMezzo.trim() },
            }, { onSuccess: () => setDescMezzo(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-44 space-y-1">
            <Label>Tipo</Label>
            <Select value={tipoMezzo} onValueChange={setTipoMezzo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MEZZO_TIPO_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Descrizione</Label>
            <Input value={descMezzo} onChange={(e) => setDescMezzo(e.target.value)}
              placeholder="Es. Escavatore CAT 320" />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Materiali</h3>
        {giacenze.length > 0 && (
          <div className="mb-3 rounded-lg bg-muted/50 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Giacenze</p>
            {giacenze.map(([desc, v]) => (
              <p key={desc} className="text-sm text-foreground">
                {desc}: <span className="font-semibold">{v.q}{v.unita ? ` ${v.unita}` : ''}</span>
              </p>
            ))}
          </div>
        )}
        {materiali.slice(0, 10).map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Badge tone={m.movimento === 'consegna' ? 'success' : m.movimento === 'consumo' ? 'primary' : 'neutral'}>
              {MOVIMENTO_LABEL[m.movimento]}
            </Badge>
            <span className="min-w-0 flex-1 truncate text-foreground">{m.descrizione}</span>
            <span className="text-muted-foreground">{Number(m.quantita)}{m.unita ? ` ${m.unita}` : ''}</span>
            <span className="text-xs text-muted-foreground">{fmtData(m.data)}</span>
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_materiali', id: m.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const q = Number(quantita)
            if (!descMat.trim() || !quantita || Number.isNaN(q)) { toast.error('Materiale e quantità obbligatori'); return }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_materiali',
              values: { descrizione: descMat.trim(), movimento, quantita: q, unita: unita.trim() || null },
            }, {
              onSuccess: () => { setDescMat(''); setQuantita(''); setUnita('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-32 space-y-1">
            <Label>Movimento</Label>
            <Select value={movimento} onValueChange={setMovimento}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MOVIMENTO_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32 flex-1 space-y-1">
            <Label>Materiale</Label>
            <Input value={descMat} onChange={(e) => setDescMat(e.target.value)} placeholder="Es. Calcestruzzo" />
          </div>
          <div className="w-20 space-y-1">
            <Label>Q.tà</Label>
            <Input type="number" step="0.01" value={quantita} onChange={(e) => setQuantita(e.target.value)} />
          </div>
          <div className="w-20 space-y-1">
            <Label>Unità</Label>
            <Input value={unita} onChange={(e) => setUnita(e.target.value)} placeholder="mc" />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  )
}

// ── Contabilità (manager): SAL → fattura + costi ─────────────────
function TabContabilita({ cantiere }: { cantiere: Cantiere }) {
  const { isManager } = useAuth()
  const qc = useQueryClient()
  const { data: sal = [] } = useFigliCantiere<CantiereSal>(cantiere.id, 'cantiere_sal')
  const { data: costi = [] } = useFigliCantiere<CantiereCosto>(cantiere.id, 'cantiere_costi')
  const crea = useCreaFiglioCantiere()
  const aggiorna = useAggiornaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [importoSal, setImportoSal] = useState('')
  const [descSal, setDescSal] = useState('')
  const [tipoCosto, setTipoCosto] = useState('materiali')
  const [descCosto, setDescCosto] = useState('')
  const [importoCosto, setImportoCosto] = useState('')
  const [fatturando, setFatturando] = useState<string | null>(null)

  if (!isManager) {
    return (
      <div className={card}>
        <p className="text-sm text-muted-foreground">
          La contabilità di cantiere (SAL, costi, margini) è riservata ad admin e manager.
        </p>
      </div>
    )
  }

  async function generaFattura(s: CantiereSal) {
    if (!cantiere.cliente_id) {
      toast.error('Per fatturare il SAL collega il Cliente del cantiere a un\'organizzazione')
      return
    }
    setFatturando(s.id)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const scadenza = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      const { data: fattura, error } = await supabase.from('fatture').insert({
        direzione: 'attiva',
        numero: `${cantiere.codice}-SAL${s.numero}`,
        organizzazione_id: cantiere.cliente_id,
        commessa_id: cantiere.commessa_id,
        imponibile: Number(s.importo),
        scadenza,
        note: `SAL ${s.numero} — ${cantiere.denominazione}`,
        created_by: auth.user!.id,
      }).select('id, numero').single()
      if (error) throw error
      await aggiorna.mutateAsync({
        cantiereId: cantiere.id, tabella: 'cantiere_sal', id: s.id,
        values: { fattura_id: fattura.id },
      })
      qc.invalidateQueries({ queryKey: cantieriKeys.figli(cantiere.id, 'economia') })
      toast.success(`Fattura ${fattura.numero} creata (con incasso previsto automatico)`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setFatturando(null)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">SAL — Stati di avanzamento lavori</h3>
        {sal.map((s) => {
          const st = SAL_STATO_LABEL[s.stato] ?? SAL_STATO_LABEL.bozza
          return (
            <div key={s.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
              <span className="font-mono text-xs font-semibold text-muted-foreground">SAL {s.numero}</span>
              <span className="min-w-0 flex-1 truncate text-foreground">{s.descrizione ?? fmtData(s.data)}</span>
              <span className="font-semibold text-foreground">{fmtImporto(Number(s.importo))}</span>
              <Badge tone={st.tone}>{st.label}</Badge>
              {s.stato === 'bozza' && (
                <Button size="sm" variant="ghost" className="text-xs"
                  onClick={() => aggiorna.mutate({
                    cantiereId: cantiere.id, tabella: 'cantiere_sal', id: s.id, values: { stato: 'emesso' },
                  })}>
                  Emetti
                </Button>
              )}
              {s.stato === 'emesso' && !s.fattura_id && (
                <Button size="sm" variant="outline" className="gap-1 text-xs"
                  disabled={fatturando === s.id}
                  onClick={() => void generaFattura(s)}>
                  <FileText className="h-3 w-3" /> {fatturando === s.id ? 'Creazione…' : 'Genera fattura'}
                </Button>
              )}
              {s.fattura_id && (
                <Link to={`/fatture/${s.fattura_id}`} className="text-xs text-primary hover:underline">
                  fattura
                </Link>
              )}
              <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_sal', id: s.id })} />
            </div>
          )
        })}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const imp = Number(importoSal)
            if (!importoSal || Number.isNaN(imp)) { toast.error('Importo SAL non valido'); return }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_sal',
              values: { importo: imp, descrizione: descSal.trim() || null, stato: 'bozza' },
            }, {
              onSuccess: () => { setImportoSal(''); setDescSal('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Descrizione</Label>
            <Input value={descSal} onChange={(e) => setDescSal(e.target.value)}
              placeholder="Es. Lavori al 30 giugno" />
          </div>
          <div className="w-36 space-y-1">
            <Label>Importo (€)</Label>
            <Input type="number" step="0.01" value={importoSal} onChange={(e) => setImportoSal(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Nuovo SAL</Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Costi di cantiere</h3>
        {costi.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Badge tone="neutral">{c.tipo}</Badge>
            <span className="min-w-0 flex-1 truncate text-foreground">{c.descrizione}</span>
            <span className="font-medium text-foreground">{fmtImporto(Number(c.importo))}</span>
            <span className="text-xs text-muted-foreground">{fmtData(c.data)}</span>
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_costi', id: c.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const imp = Number(importoCosto)
            if (!descCosto.trim() || !importoCosto || Number.isNaN(imp)) {
              toast.error('Descrizione e importo obbligatori'); return
            }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_costi',
              values: { tipo: tipoCosto, descrizione: descCosto.trim(), importo: imp },
            }, {
              onSuccess: () => { setDescCosto(''); setImportoCosto('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-36 space-y-1">
            <Label>Voce</Label>
            <Select value={tipoCosto} onValueChange={setTipoCosto}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['personale', 'materiali', 'mezzi', 'subappalti', 'altro'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32 flex-1 space-y-1">
            <Label>Descrizione</Label>
            <Input value={descCosto} onChange={(e) => setDescCosto(e.target.value)} />
          </div>
          <div className="w-32 space-y-1">
            <Label>Importo (€)</Label>
            <Input type="number" step="0.01" value={importoCosto} onChange={(e) => setImportoCosto(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  )
}

// ── Sicurezza ────────────────────────────────────────────────────
function TabSicurezza({ cantiere }: { cantiere: Cantiere }) {
  const { data: eventi = [] } = useFigliCantiere<CantiereEventoSicurezza>(cantiere.id, 'cantiere_eventi_sicurezza')
  const crea = useCreaFiglioCantiere()
  const aggiorna = useAggiornaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [tipo, setTipo] = useState('sopralluogo')
  const [descrizione, setDescrizione] = useState('')
  const [gravita, setGravita] = useState('media')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Registro sicurezza</h3>
      <p className="mb-2 text-xs text-muted-foreground">
        Incidenti e infortuni notificano immediatamente admin e manager.
      </p>
      {eventi.map((ev) => (
        <div key={ev.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <ShieldAlert className={ev.tipo === 'incidente' || ev.tipo === 'infortunio'
            ? 'h-4 w-4 shrink-0 text-destructive' : 'h-4 w-4 shrink-0 text-muted-foreground'} />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              {SICUREZZA_LABEL[ev.tipo] ?? ev.tipo}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{fmtData(ev.data)}</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">{ev.descrizione}</p>
          </div>
          <Badge tone={ev.gravita === 'critica' ? 'danger' : ev.gravita === 'alta' ? 'warning' : 'neutral'}>
            {ev.gravita}
          </Badge>
          {ev.chiuso ? (
            <Badge tone="success">Chiuso</Badge>
          ) : (
            <Button size="sm" variant="ghost" className="gap-1 text-xs"
              onClick={() => aggiorna.mutate({
                cantiereId: cantiere.id, tabella: 'cantiere_eventi_sicurezza', id: ev.id,
                values: { chiuso: true },
              })}>
              <CheckCircle2 className="h-3 w-3" /> Chiudi
            </Button>
          )}
          <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_eventi_sicurezza', id: ev.id })} />
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!descrizione.trim()) { toast.error('Descrivi l\'evento'); return }
          crea.mutate({
            cantiereId: cantiere.id, tabella: 'cantiere_eventi_sicurezza',
            values: { tipo, descrizione: descrizione.trim(), gravita },
          }, {
            onSuccess: () => setDescrizione(''),
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="w-52 space-y-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SICUREZZA_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <Label>Descrizione</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
        </div>
        <div className="w-32 space-y-1">
          <Label>Gravità</Label>
          <Select value={gravita} onValueChange={setGravita}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['bassa', 'media', 'alta', 'critica'].map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Registra</Button>
      </form>
    </div>
  )
}

// ── Qualità e ambiente ───────────────────────────────────────────
function TabQualitaAmbiente({ cantiere }: { cantiere: Cantiere }) {
  const { data: controlli = [] } = useFigliCantiere<CantiereControlloQualita>(cantiere.id, 'cantiere_controlli_qualita')
  const { data: registri = [] } = useFigliCantiere<CantiereRegistroAmbiente>(cantiere.id, 'cantiere_registri_ambiente')
  const crea = useCreaFiglioCantiere()
  const aggiorna = useAggiornaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [tipoQ, setTipoQ] = useState('corso_opera')
  const [descQ, setDescQ] = useState('')
  const [tipoA, setTipoA] = useState('rifiuti')
  const [descA, setDescA] = useState('')

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Controlli qualità</h3>
        {controlli.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{QUALITA_TIPO_LABEL[c.tipo]}</p>
              <p className="truncate text-xs text-muted-foreground">{c.descrizione} · {fmtData(c.data)}</p>
            </div>
            <Select value={c.esito}
              onValueChange={(v) => aggiorna.mutate({
                cantiereId: cantiere.id, tabella: 'cantiere_controlli_qualita', id: c.id,
                values: { esito: v },
              })}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_attesa">In attesa</SelectItem>
                <SelectItem value="conforme">Conforme</SelectItem>
                <SelectItem value="non_conforme">Non conforme</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <Checkbox checked={c.approvato_dl}
                onCheckedChange={(v) => aggiorna.mutate({
                  cantiereId: cantiere.id, tabella: 'cantiere_controlli_qualita', id: c.id,
                  values: { approvato_dl: v === true },
                })} />
              DL
            </label>
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_controlli_qualita', id: c.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!descQ.trim()) { toast.error('Descrivi il controllo'); return }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_controlli_qualita',
              values: { tipo: tipoQ, descrizione: descQ.trim() },
            }, { onSuccess: () => setDescQ(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-48 space-y-1">
            <Label>Tipo</Label>
            <Select value={tipoQ} onValueChange={setTipoQ}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(QUALITA_TIPO_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-36 flex-1 space-y-1">
            <Label>Descrizione</Label>
            <Input value={descQ} onChange={(e) => setDescQ(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Registro ambiente</h3>
        {registri.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Badge tone="neutral">{AMBIENTE_LABEL[r.tipo]}</Badge>
            <span className="min-w-0 flex-1 truncate text-foreground">{r.descrizione}</span>
            {r.quantita != null && (
              <span className="text-muted-foreground">{Number(r.quantita)}{r.unita ? ` ${r.unita}` : ''}</span>
            )}
            <span className="text-xs text-muted-foreground">{fmtData(r.data)}</span>
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_registri_ambiente', id: r.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!descA.trim()) { toast.error('Descrivi la registrazione'); return }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_registri_ambiente',
              values: { tipo: tipoA, descrizione: descA.trim() },
            }, { onSuccess: () => setDescA(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-40 space-y-1">
            <Label>Tipo</Label>
            <Select value={tipoA} onValueChange={setTipoA}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(AMBIENTE_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-36 flex-1 space-y-1">
            <Label>Descrizione</Label>
            <Input value={descA} onChange={(e) => setDescA(e.target.value)}
              placeholder="Es. Formulario FIR n. 123" />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  )
}

// ── Pagina ───────────────────────────────────────────────────────
export function CantiereDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: cantiere, isLoading } = useCantiere(id)
  const update = useUpdateCantiere()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }
  if (!cantiere) return <p className="text-sm text-muted-foreground">Cantiere non trovato (o modulo non attivo).</p>

  const st = statoCantiere(cantiere.stato)

  return (
    <div className="mx-auto max-w-6xl">
      <button onClick={() => navigate('/cantieri')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Cantieri
      </button>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-muted-foreground">{cantiere.codice}</p>
            <h1 className="mt-0.5 text-2xl font-bold text-foreground">{cantiere.denominazione}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {(cantiere.indirizzo || cantiere.citta) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {[cantiere.indirizzo, cantiere.citta].filter(Boolean).join(', ')}
                </span>
              )}
              <span className="font-semibold text-foreground">{fmtImporto(Number(cantiere.importo_contrattuale))}</span>
              {cantiere.categoria_lavori && <span>{cantiere.categoria_lavori}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={st.tone} className="text-sm">{st.label}</Badge>
            <Select value={cantiere.stato}
              onValueChange={(v) => update.mutate({ id: cantiere.id, values: { stato: v as CantiereStato } }, {
                onError: (e) => toast.error((e as Error).message),
              })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CANTIERE_STATI.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Modifica
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="panoramica">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="panoramica">Panoramica</TabsTrigger>
          <TabsTrigger value="cronoprogramma">Cronoprogramma</TabsTrigger>
          <TabsTrigger value="rapportini">Rapportini</TabsTrigger>
          <TabsTrigger value="personale">Personale</TabsTrigger>
          <TabsTrigger value="imprese">Imprese</TabsTrigger>
          <TabsTrigger value="mezzi">Mezzi e materiali</TabsTrigger>
          <TabsTrigger value="contabilita">Contabilità</TabsTrigger>
          <TabsTrigger value="sicurezza">Sicurezza</TabsTrigger>
          <TabsTrigger value="qualita">Qualità e ambiente</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger value="scadenze">Scadenze</TabsTrigger>
          <TabsTrigger value="attivita">Attività</TabsTrigger>
          <TabsTrigger value="commenti">Commenti</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>
        <TabsContent value="panoramica" className="mt-4"><TabPanoramica cantiere={cantiere} /></TabsContent>
        <TabsContent value="cronoprogramma" className="mt-4"><TabCronoprogramma cantiere={cantiere} /></TabsContent>
        <TabsContent value="rapportini" className="mt-4"><TabRapportini cantiere={cantiere} /></TabsContent>
        <TabsContent value="personale" className="mt-4"><TabPersonale cantiere={cantiere} /></TabsContent>
        <TabsContent value="imprese" className="mt-4"><TabImprese cantiere={cantiere} /></TabsContent>
        <TabsContent value="mezzi" className="mt-4"><TabMezziMateriali cantiere={cantiere} /></TabsContent>
        <TabsContent value="contabilita" className="mt-4"><TabContabilita cantiere={cantiere} /></TabsContent>
        <TabsContent value="sicurezza" className="mt-4"><TabSicurezza cantiere={cantiere} /></TabsContent>
        <TabsContent value="qualita" className="mt-4"><TabQualitaAmbiente cantiere={cantiere} /></TabsContent>
        <TabsContent value="documenti" className="mt-4">
          <AllegatiSection entita="cantieri" entitaId={cantiere.id} categorie={CANTIERE_CATEGORIE_DOC} />
        </TabsContent>
        <TabsContent value="scadenze" className="mt-4">
          <ScadenzeModuliSection modulo="cantiere" entita="cantieri" entitaId={cantiere.id}
            tipi={CANTIERE_TIPI_SCADENZA} azioneUrl={`/cantieri/${cantiere.id}`} />
        </TabsContent>
        <TabsContent value="attivita" className="mt-4">
          <TimelineSection scope={{ cantiere_id: cantiere.id }} />
        </TabsContent>
        <TabsContent value="commenti" className="mt-4">
          <FeedSection target={{ entita: 'cantieri', entitaId: cantiere.id }} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="cantieri" entitaId={cantiere.id} />
        </TabsContent>
      </Tabs>

      <CantiereDialog open={editOpen} onOpenChange={setEditOpen} cantiere={cantiere} />
    </div>
  )
}
