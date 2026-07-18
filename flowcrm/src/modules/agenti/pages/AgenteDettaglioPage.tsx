/**
 * AgenteDettaglioPage — fascicolo agente (documento §1-§15): panoramica
 * con KPI, mandati (manager), portafoglio clienti, rapporti visita,
 * offerte con conversione in ordine, ordini con righe, PROVVIGIONI
 * (piano, regole, calcolo dal venduto — manager; l'agente vede le sue),
 * obiettivi, note spese con approvazione, documenti, scadenze, attività,
 * commenti, storico. È anche il Portale Agente (stessa pagina, RLS).
 */
import { useState, type FormEvent } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, Pencil, Trash2, Plus, Building2, MapPin,
  Calculator, ShoppingCart, Receipt,
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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AgenteDialog } from '@/modules/agenti/dialogs/AgenteDialog'
import {
  TIPOLOGIA_LABEL, AGENTE_STATO, VISITA_ESITO, OFFERTA_STATO, ORDINE_STATO,
  NOTA_SPESE_TIPO, NOTA_SPESE_STATO, fmtImporto, fmtData, periodoCorrente,
} from '@/modules/agenti/stati'
import {
  useAgente, useAgenteCorrente, useAgentiKpi,
  useFigliAgente, useCreaFiglioAgente, useAggiornaFiglioAgente, useEliminaFiglioAgente,
  useAgentePiano, useSalvaAgentePiano, useCalcolaProvvigioni,
  type Agente, type AgenteMandato, type AgenteCliente, type AgenteVisita,
  type AgenteOrdine, type AgenteOfferta, type AgenteRegola,
  type AgenteProvvigione, type AgenteObiettivo, type AgenteNotaSpese,
} from '@/modules/agenti/queries/agenti'

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

// ── Panoramica ───────────────────────────────────────────────────
function TabPanoramica({ agente }: { agente: Agente }) {
  const { data: kpi = [] } = useAgentiKpi()
  const mio = kpi.find((k) => k.agente_id === agente.id)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Fascicolo</h3>
        <Riga label="Tipologia">{TIPOLOGIA_LABEL[agente.tipologia]}</Riga>
        <Riga label="P.IVA / CF">{[agente.piva, agente.codice_fiscale].filter(Boolean).join(' / ') || '—'}</Riga>
        <Riga label="ENASARCO">{agente.enasarco ?? '—'}</Riga>
        <Riga label="CCIAA">{agente.cciaa ?? '—'}</Riga>
        <Riga label="Inizio collaborazione">{fmtData(agente.data_inizio)}</Riga>
        <Riga label="Area / Zone">{[agente.area_geografica, agente.zone].filter(Boolean).join(' · ') || '—'}</Riga>
        <Riga label="Settori">{agente.settori ?? '—'}</Riga>
        <Riga label="Contatti">{[agente.email, agente.telefono].filter(Boolean).join(' · ') || '—'}</Riga>
        <Riga label="Portale agente">{agente.user_id ? 'Accesso attivo' : 'Non attivo'}</Riga>
      </div>

      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Andamento anno</h3>
        <Riga label="Visite">{mio?.visite ?? 0}</Riga>
        <Riga label="Ordini">{mio?.ordini ?? 0}</Riga>
        <Riga label="Valore ordinato">{fmtImporto(Number(mio?.valore_ordini ?? 0))}</Riga>
        <Riga label="Offerte inviate / accettate">
          {mio?.offerte_inviate ?? 0} / {mio?.offerte_accettate ?? 0}
        </Riga>
        <Riga label="Tasso di conversione">
          {mio?.tasso_conversione != null ? `${mio.tasso_conversione}%` : '—'}
        </Riga>
        <Riga label="Clienti in portafoglio">{mio?.clienti ?? 0}</Riga>
        <Riga label="Fatturato per visita">
          {mio?.fatturato_per_visita != null ? fmtImporto(Number(mio.fatturato_per_visita)) : '—'}
        </Riga>
        <Riga label="Provvigioni maturate (anno)">{fmtImporto(Number(mio?.provvigioni_anno ?? 0))}</Riga>
      </div>

      {agente.note && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Note</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{agente.note}</p>
        </div>
      )}
    </div>
  )
}

// ── Mandati (manager; l'agente li vede) ──────────────────────────
function TabMandati({ agente }: { agente: Agente }) {
  const { isManager } = useAuth()
  const { data: mandati = [] } = useFigliAgente<AgenteMandato>(agente.id, 'agenti_mandati')
  const crea = useCreaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const [descrizione, setDescrizione] = useState('')
  const [zone, setZone] = useState('')
  const [fine, setFine] = useState('')
  const [esclusiva, setEsclusiva] = useState(false)
  const [prodotti, setProdotti] = useState('')
  const [obiettivoAnnuo, setObiettivoAnnuo] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Mandati e contratti</h3>
      {mandati.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          Registra i mandati: alla scadenza parte il promemoria di rinnovo automatico.
        </p>
      )}
      {mandati.map((m) => (
        <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              {m.descrizione}{m.esclusiva && <Badge tone="primary" className="ml-2">Esclusiva</Badge>}
            </p>
            <p className="text-xs text-muted-foreground">
              {[m.zone, m.prodotti].filter(Boolean).join(' · ')}
              {' · '}dal {fmtData(m.data_inizio)}{m.data_fine ? ` al ${fmtData(m.data_fine)}` : ''}
            </p>
          </div>
          {m.obiettivo_annuo != null && (
            <span className="text-xs text-muted-foreground">obiettivo {fmtImporto(Number(m.obiettivo_annuo))}</span>
          )}
          {isManager && (
            <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_mandati', id: m.id })} />
          )}
        </div>
      ))}
      {isManager && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!descrizione.trim()) { toast.error('Descrivi il mandato'); return }
            crea.mutate({
              agenteId: agente.id, tabella: 'agenti_mandati',
              values: {
                descrizione: descrizione.trim(), zone: zone.trim() || null, data_fine: fine || null,
                esclusiva, prodotti: prodotti.trim() || null,
                obiettivo_annuo: obiettivoAnnuo === '' ? null : Number(obiettivoAnnuo),
              },
            }, {
              onSuccess: () => {
                setDescrizione(''); setZone(''); setFine(''); setEsclusiva(false)
                setProdotti(''); setObiettivoAnnuo('')
              },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Mandato</Label>
            <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Es. Mandato linea industriale" />
          </div>
          <div className="w-32 space-y-1">
            <Label>Zone</Label>
            <Input value={zone} onChange={(e) => setZone(e.target.value)} />
          </div>
          <div className="w-40 space-y-1">
            <Label>Prodotti assegnati</Label>
            <Input value={prodotti} onChange={(e) => setProdotti(e.target.value)} />
          </div>
          <div className="w-32 space-y-1">
            <Label>Obiettivo annuo (€)</Label>
            <Input type="number" step="0.01" value={obiettivoAnnuo}
              onChange={(e) => setObiettivoAnnuo(e.target.value)} />
          </div>
          <div className="w-36 space-y-1">
            <Label>Fine</Label>
            <Input type="date" value={fine} onChange={(e) => setFine(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
            <Checkbox checked={esclusiva} onCheckedChange={(v) => setEsclusiva(v === true)} />
            Esclusiva
          </label>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      )}
    </div>
  )
}

// ── Portafoglio clienti ──────────────────────────────────────────
function TabPortafoglio({ agente }: { agente: Agente }) {
  const { data: clienti = [] } = useFigliAgente<AgenteCliente>(agente.id, 'agenti_clienti')
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const crea = useCreaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const [orgId, setOrgId] = useState('')
  const [classificazione, setClassificazione] = useState('B')

  const disponibili = organizzazioni.filter(
    (o) => !clienti.some((c) => c.organizzazione_id === o.id)
  )

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Portafoglio clienti</h3>
        {clienti.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            {c.organizzazione ? (
              <Link to={`/organizzazioni/${c.organizzazione.id}`}
                className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-primary">
                {c.organizzazione.ragione_sociale}
              </Link>
            ) : <span className="flex-1">—</span>}
            {c.classificazione && <Badge tone="neutral">Classe {c.classificazione}</Badge>}
            <span className="text-xs text-muted-foreground">dal {fmtData(c.dal)}</span>
            <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_clienti', id: c.id })} />
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!orgId) { toast.error('Scegli il cliente'); return }
            crea.mutate({
              agenteId: agente.id, tabella: 'agenti_clienti',
              values: { organizzazione_id: orgId, classificazione },
            }, { onSuccess: () => setOrgId(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-48 flex-1 space-y-1">
            <Label>Cliente</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue placeholder="Organizzazione…" /></SelectTrigger>
              <SelectContent>
                {disponibili.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1">
            <Label>Classe</Label>
            <Select value={classificazione} onValueChange={setClassificazione}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['A', 'B', 'C'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Assegna</Button>
        </form>
      </div>

      <ApprovalSection
        modulo="agenti" entita="agenti" entitaId={agente.id}
        tipiRichiesta={[
          { value: 'riassegnazione_portafoglio', label: 'Riassegnazione portafoglio' },
          { value: 'sconto_oltre_soglia', label: 'Sconto oltre soglia' },
          { value: 'deroga_commerciale', label: 'Deroga commerciale' },
          { value: 'liquidazione_provvigioni', label: 'Liquidazione provvigioni' },
          { value: 'nuovo_mandato', label: 'Nuovo mandato / rinnovo' },
        ]}
        azioneUrl={`/agenti/${agente.id}`}
      />
    </div>
  )
}

// ── Visite ───────────────────────────────────────────────────────
function TabVisite({ agente }: { agente: Agente }) {
  const { data: visite = [] } = useFigliAgente<AgenteVisita>(agente.id, 'agenti_visite')
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const crea = useCreaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const [orgId, setOrgId] = useState('')
  const [esito, setEsito] = useState('positivo')
  const [argomenti, setArgomenti] = useState('')
  const [referenti, setReferenti] = useState('')
  const [opportunita, setOpportunita] = useState('')
  const [criticita, setCriticita] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Rapporti visita</h3>
      {visite.map((v) => {
        const es = VISITA_ESITO[v.esito] ?? VISITA_ESITO.neutro
        return (
          <div key={v.id} className="border-b border-border py-2 text-sm last:border-0">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {v.organizzazione?.ragione_sociale ?? '—'}
              </span>
              <Badge tone={es.tone}>{es.label}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(v.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
              <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_visite', id: v.id })} />
            </div>
            {v.argomenti && <p className="mt-0.5 text-xs text-muted-foreground">{v.argomenti}</p>}
            {v.referenti && <p className="mt-0.5 text-xs text-muted-foreground">Referenti: {v.referenti}</p>}
            {v.opportunita && <p className="mt-0.5 text-xs text-success">Opportunità: {v.opportunita}</p>}
            {v.criticita && <p className="mt-0.5 text-xs text-warning-foreground">Criticità: {v.criticita}</p>}
          </div>
        )
      })}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!orgId) { toast.error('Scegli il cliente visitato'); return }
          crea.mutate({
            agenteId: agente.id, tabella: 'agenti_visite',
            values: {
              organizzazione_id: orgId, esito, argomenti: argomenti.trim() || null,
              referenti: referenti.trim() || null,
              opportunita: opportunita.trim() || null,
              criticita: criticita.trim() || null,
            },
          }, {
            onSuccess: () => { setArgomenti(''); setReferenti(''); setOpportunita(''); setCriticita('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="min-w-40 flex-1 space-y-1">
          <Label>Cliente</Label>
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger><SelectValue placeholder="Organizzazione…" /></SelectTrigger>
            <SelectContent>
              {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36 space-y-1">
          <Label>Esito</Label>
          <Select value={esito} onValueChange={setEsito}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(VISITA_ESITO).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-36 flex-1 space-y-1">
          <Label>Argomenti</Label>
          <Input value={argomenti} onChange={(e) => setArgomenti(e.target.value)} />
        </div>
        <div className="w-40 space-y-1">
          <Label>Referenti incontrati</Label>
          <Input value={referenti} onChange={(e) => setReferenti(e.target.value)} />
        </div>
        <div className="w-40 space-y-1">
          <Label>Opportunità</Label>
          <Input value={opportunita} onChange={(e) => setOpportunita(e.target.value)} />
        </div>
        <div className="w-40 space-y-1">
          <Label>Criticità</Label>
          <Input value={criticita} onChange={(e) => setCriticita(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Registra</Button>
      </form>
    </div>
  )
}

// Righe di un ordine (§8): prodotti, quantità, prezzi — il valore
// dell'ordine si ricalcola dal trigger sul DB.
function RigheOrdine({ agenteId, ordineId }: { agenteId: string; ordineId: string }) {
  const qc = useQueryClient()
  const { data: righe = [] } = useQuery({
    queryKey: ['agenti', agenteId, 'righe', ordineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenti_ordini_righe')
        .select('*')
        .eq('ordine_id', ordineId)
        .order('created_at')
      if (error) throw error
      return data
    },
  })
  const [prodotto, setProdotto] = useState('')
  const [quantita, setQuantita] = useState('1')
  const [prezzo, setPrezzo] = useState('')

  async function invalida() {
    await qc.invalidateQueries({ queryKey: ['agenti', agenteId, 'righe', ordineId] })
    await qc.invalidateQueries({ queryKey: ['agenti', agenteId, 'agenti_ordini'] })
  }

  async function aggiungi(e: FormEvent) {
    e.preventDefault()
    const q = Number(quantita); const p = Number(prezzo)
    if (!prodotto.trim() || Number.isNaN(q) || Number.isNaN(p) || !prezzo) {
      toast.error('Prodotto, quantità e prezzo obbligatori'); return
    }
    const { data: auth } = await supabase.auth.getUser()
    const { error } = await supabase.from('agenti_ordini_righe').insert({
      ordine_id: ordineId, prodotto: prodotto.trim(), quantita: q,
      prezzo_unitario: p, created_by: auth.user!.id,
    })
    if (error) { toast.error(error.message); return }
    setProdotto(''); setQuantita('1'); setPrezzo('')
    await invalida()
  }

  async function rimuovi(id: string) {
    const { error } = await supabase.from('agenti_ordini_righe').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    await invalida()
  }

  return (
    <div className="mt-2 rounded-lg bg-muted/40 p-3">
      {righe.map((r) => (
        <div key={r.id} className="flex items-center gap-3 border-b border-border/60 py-1.5 text-sm last:border-0">
          <span className="min-w-0 flex-1 truncate text-foreground">{r.prodotto}</span>
          <span className="text-muted-foreground">
            {Number(r.quantita)} × {fmtImporto(Number(r.prezzo_unitario))}
          </span>
          <span className="font-medium text-foreground">
            {fmtImporto(Number(r.quantita) * Number(r.prezzo_unitario))}
          </span>
          <button onClick={() => void rimuovi(r.id)} aria-label="Rimuovi riga"
            className="rounded-md p-1 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <form onSubmit={aggiungi} className="mt-2 flex flex-wrap items-end gap-2">
        <div className="min-w-36 flex-1 space-y-1">
          <Label className="text-xs">Prodotto</Label>
          <Input className="h-8 text-sm" value={prodotto} onChange={(e) => setProdotto(e.target.value)} />
        </div>
        <div className="w-20 space-y-1">
          <Label className="text-xs">Q.tà</Label>
          <Input className="h-8 text-sm" type="number" step="0.01" value={quantita}
            onChange={(e) => setQuantita(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label className="text-xs">Prezzo (€)</Label>
          <Input className="h-8 text-sm" type="number" step="0.01" value={prezzo}
            onChange={(e) => setPrezzo(e.target.value)} />
        </div>
        <Button type="submit" size="sm"><Plus className="h-3.5 w-3.5" /> Riga</Button>
      </form>
    </div>
  )
}

// ── Offerte e ordini ─────────────────────────────────────────────
function TabOfferteOrdini({ agente }: { agente: Agente }) {
  const { data: offerte = [] } = useFigliAgente<AgenteOfferta>(agente.id, 'agenti_offerte')
  const { data: ordini = [] } = useFigliAgente<AgenteOrdine>(agente.id, 'agenti_ordini')
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const crea = useCreaFiglioAgente()
  const aggiorna = useAggiornaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const [orgOff, setOrgOff] = useState('')
  const [descOff, setDescOff] = useState('')
  const [impOff, setImpOff] = useState('')
  const [scontoOff, setScontoOff] = useState('')
  const [validitaOff, setValiditaOff] = useState('')
  const [righeAperte, setRigheAperte] = useState<Record<string, boolean>>({})

  async function convertiInOrdine(off: AgenteOfferta) {
    try {
      await crea.mutateAsync({
        agenteId: agente.id, tabella: 'agenti_ordini',
        values: {
          organizzazione_id: off.organizzazione_id, stato: 'confermato',
          note: `Da offerta: ${off.descrizione}`,
        },
      })
      await aggiorna.mutateAsync({
        agenteId: agente.id, tabella: 'agenti_offerte', id: off.id,
        values: { stato: 'accettata' },
      })
      toast.success('Offerta accettata e convertita in ordine (aggiungi le righe)')
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Offerte e preventivi</h3>
        {offerte.map((o) => {
          const st = OFFERTA_STATO[o.stato] ?? OFFERTA_STATO.bozza
          return (
            <div key={o.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{o.descrizione}</p>
                <p className="text-xs text-muted-foreground">
                  {o.organizzazione?.ragione_sociale ?? '—'}
                  {o.sconto_percentuale != null && ` · sconto ${Number(o.sconto_percentuale)}%`}
                </p>
              </div>
              <span className="font-medium text-foreground">{fmtImporto(Number(o.importo))}</span>
              <Badge tone={st.tone}>{st.label}</Badge>
              {o.stato === 'bozza' && (
                <Button size="sm" variant="ghost" className="text-xs"
                  onClick={() => aggiorna.mutate({
                    agenteId: agente.id, tabella: 'agenti_offerte', id: o.id, values: { stato: 'inviata' },
                  })}>
                  Invia
                </Button>
              )}
              {o.stato === 'inviata' && (
                <Button size="sm" variant="outline" className="gap-1 text-xs"
                  onClick={() => void convertiInOrdine(o)}>
                  <ShoppingCart className="h-3 w-3" /> Converti
                </Button>
              )}
              <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_offerte', id: o.id })} />
            </div>
          )
        })}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            const imp = Number(impOff)
            if (!orgOff || !descOff.trim() || !impOff || Number.isNaN(imp)) {
              toast.error('Cliente, descrizione e importo obbligatori'); return
            }
            const sconto = scontoOff === '' ? null : Number(scontoOff)
            crea.mutate({
              agenteId: agente.id, tabella: 'agenti_offerte',
              values: {
                organizzazione_id: orgOff, descrizione: descOff.trim(), importo: imp,
                sconto_percentuale: sconto, validita: validitaOff || null,
              },
            }, {
              onSuccess: () => {
                setDescOff(''); setImpOff(''); setScontoOff(''); setValiditaOff('')
                if (sconto != null && sconto > 10) {
                  toast.warning('Sconto oltre il 10%: richiedi l\'approvazione dal tab Portafoglio')
                }
              },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-36 flex-1 space-y-1">
            <Label>Cliente</Label>
            <Select value={orgOff} onValueChange={setOrgOff}>
              <SelectTrigger><SelectValue placeholder="Organizzazione…" /></SelectTrigger>
              <SelectContent>
                {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32 flex-1 space-y-1">
            <Label>Descrizione</Label>
            <Input value={descOff} onChange={(e) => setDescOff(e.target.value)} />
          </div>
          <div className="w-28 space-y-1">
            <Label>Importo (€)</Label>
            <Input type="number" step="0.01" value={impOff} onChange={(e) => setImpOff(e.target.value)} />
          </div>
          <div className="w-24 space-y-1">
            <Label>Sconto %</Label>
            <Input type="number" step="0.01" value={scontoOff} onChange={(e) => setScontoOff(e.target.value)} />
          </div>
          <div className="w-36 space-y-1">
            <Label>Validità</Label>
            <Input type="date" value={validitaOff} onChange={(e) => setValiditaOff(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Ordini</h3>
        {ordini.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            Gli ordini nascono dalla conversione di un'offerta (o si registrano qui accanto).
          </p>
        )}
        {ordini.map((o) => {
          const st = ORDINE_STATO[o.stato] ?? ORDINE_STATO.bozza
          return (
            <div key={o.id} className="border-b border-border py-2 text-sm last:border-0">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{o.organizzazione?.ragione_sociale ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{fmtData(o.data)}{o.note ? ` · ${o.note}` : ''}</p>
                </div>
                <span className="font-semibold text-foreground">{fmtImporto(Number(o.valore))}</span>
                <Select value={o.stato}
                  onValueChange={(v) => aggiorna.mutate({
                    agenteId: agente.id, tabella: 'agenti_ordini', id: o.id, values: { stato: v },
                  })}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORDINE_STATO).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge tone={st.tone}>{st.label}</Badge>
                <Button size="sm" variant="ghost" className="text-xs"
                  onClick={() => setRigheAperte((p) => ({ ...p, [o.id]: !p[o.id] }))}>
                  {righeAperte[o.id] ? 'Chiudi righe' : 'Righe'}
                </Button>
                <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_ordini', id: o.id })} />
              </div>
              {righeAperte[o.id] && <RigheOrdine agenteId={agente.id} ordineId={o.id} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Provvigioni (manager gestisce; l'agente vede le sue) ─────────
function TabProvvigioni({ agente }: { agente: Agente }) {
  const { isManager } = useAuth()
  const { data: piano } = useAgentePiano(agente.id)
  const { data: regole = [] } = useFigliAgente<AgenteRegola>(agente.id, 'agenti_provvigioni_regole')
  const { data: provvigioni = [] } = useFigliAgente<AgenteProvvigione>(agente.id, 'agenti_provvigioni')
  const salvaPiano = useSalvaAgentePiano()
  const calcola = useCalcolaProvvigioni()
  const crea = useCreaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const aggiorna = useAggiornaFiglioAgente()
  const [base, setBase] = useState<string | null>(null)
  const [ambito, setAmbito] = useState('cliente')
  const [riferimento, setRiferimento] = useState('')
  const [percentuale, setPercentuale] = useState('')
  const [periodo, setPeriodo] = useState(periodoCorrente())

  const vBase = base ?? (piano ? String(Number(piano.percentuale_base)) : '')

  return (
    <div className="space-y-4">
      {isManager && (
        <div className={card}>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Piano provvigionale (riservato)</h3>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40 space-y-1">
              <Label>Percentuale base (%)</Label>
              <Input type="number" step="0.01" value={vBase} onChange={(e) => setBase(e.target.value)} />
            </div>
            <Button
              onClick={() => {
                const n = Number(vBase)
                if (Number.isNaN(n)) { toast.error('Percentuale non valida'); return }
                salvaPiano.mutate({ agenteId: agente.id, percentualeBase: n }, {
                  onSuccess: () => toast.success('Piano salvato'),
                  onError: (err) => toast.error((err as Error).message),
                })
              }}
              disabled={salvaPiano.isPending}
            >
              Salva piano
            </Button>
          </div>

          <h4 className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Regole differenziate
          </h4>
          {regole.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-b border-border py-1.5 text-sm last:border-0">
              <Badge tone="neutral">{r.ambito}</Badge>
              <span className="flex-1 text-foreground">{r.riferimento}</span>
              <span className="font-medium text-foreground">{Number(r.percentuale)}%</span>
              <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_provvigioni_regole', id: r.id })} />
            </div>
          ))}
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              const p = Number(percentuale)
              if (!riferimento.trim() || !percentuale || Number.isNaN(p)) {
                toast.error('Riferimento e percentuale obbligatori'); return
              }
              crea.mutate({
                agenteId: agente.id, tabella: 'agenti_provvigioni_regole',
                values: { ambito, riferimento: riferimento.trim(), percentuale: p },
              }, {
                onSuccess: () => { setRiferimento(''); setPercentuale('') },
                onError: (err) => toast.error((err as Error).message),
              })
            }}
            className="mt-2 flex flex-wrap items-end gap-2"
          >
            <div className="w-36 space-y-1">
              <Label>Ambito</Label>
              <Select value={ambito} onValueChange={setAmbito}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['cliente', 'zona', 'prodotto', 'fascia_fatturato'].map((a) => (
                    <SelectItem key={a} value={a}>{a.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-36 flex-1 space-y-1">
              <Label>Riferimento</Label>
              <Input value={riferimento} onChange={(e) => setRiferimento(e.target.value)}
                placeholder="Es. ragione sociale del cliente" />
            </div>
            <div className="w-24 space-y-1">
              <Label>%</Label>
              <Input type="number" step="0.01" value={percentuale}
                onChange={(e) => setPercentuale(e.target.value)} />
            </div>
            <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
          </form>

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
            <div className="w-40 space-y-1">
              <Label>Periodo (AAAA-MM)</Label>
              <Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
            </div>
            <Button variant="outline" className="gap-1.5"
              disabled={calcola.isPending}
              onClick={() => calcola.mutate({ agenteId: agente.id, periodo }, {
                onSuccess: (tot) => toast.success(`Provvigioni del periodo: ${fmtImporto(tot)} (dal venduto consegnato/fatturato)`),
                onError: (err) => toast.error((err as Error).message),
              })}>
              <Calculator className="h-4 w-4" />
              {calcola.isPending ? 'Calcolo…' : 'Calcola dal venduto'}
            </Button>
          </div>
        </div>
      )}

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Provvigioni per periodo</h3>
        {provvigioni.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            {isManager
              ? 'Usa "Calcola dal venduto" per maturare il periodo corrente.'
              : 'Le provvigioni maturate compariranno qui.'}
          </p>
        )}
        {provvigioni.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="font-mono text-xs font-semibold text-muted-foreground">{p.periodo}</span>
            <span className="flex-1 text-foreground">
              maturato <span className="font-semibold">{fmtImporto(Number(p.importo_maturato))}</span>
              {Number(p.anticipi) > 0 && <> · anticipi {fmtImporto(Number(p.anticipi))}</>}
            </span>
            {Number(p.importo_liquidato) > 0 ? (
              <Badge tone="success">Liquidate {fmtImporto(Number(p.importo_liquidato))}</Badge>
            ) : isManager ? (
              <Button size="sm" variant="outline" className="text-xs"
                onClick={() => aggiorna.mutate({
                  agenteId: agente.id, tabella: 'agenti_provvigioni', id: p.id,
                  values: {
                    importo_liquidato: p.importo_maturato,
                    liquidata_at: new Date().toISOString().slice(0, 10),
                  },
                }, { onSuccess: () => toast.success('Provvigioni liquidate') })}>
                Liquida
              </Button>
            ) : (
              <Badge tone="primary">Da liquidare</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Obiettivi ────────────────────────────────────────────────────
function TabObiettivi({ agente }: { agente: Agente }) {
  const { isManager } = useAuth()
  const { data: obiettivi = [] } = useFigliAgente<AgenteObiettivo>(agente.id, 'agenti_obiettivi')
  const { data: kpi = [] } = useAgentiKpi()
  const crea = useCreaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const [anno, setAnno] = useState(String(new Date().getFullYear()))
  const [mese, setMese] = useState('')
  const [importo, setImporto] = useState('')

  const venduto = Number(kpi.find((k) => k.agente_id === agente.id)?.valore_ordini ?? 0)

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Obiettivi commerciali</h3>
      {obiettivi.map((o) => {
        const pct = Number(o.importo_obiettivo) > 0
          ? Math.min(100, Math.round(venduto * 100 / Number(o.importo_obiettivo)))
          : 0
        return (
          <div key={o.id} className="border-b border-border py-2 last:border-0">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-foreground">
                {o.anno}{o.mese ? `-${String(o.mese).padStart(2, '0')}` : ''}
                {o.ambito ? ` · ${o.ambito}` : ''}
              </span>
              <span className="ml-auto text-muted-foreground">
                {fmtImporto(venduto)} / {fmtImporto(Number(o.importo_obiettivo))}
              </span>
              <Badge tone={pct >= 100 ? 'success' : pct >= 60 ? 'warning' : 'neutral'}>{pct}%</Badge>
              {isManager && (
                <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_obiettivi', id: o.id })} />
              )}
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
      {isManager && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            const imp = Number(importo)
            if (!importo || Number.isNaN(imp)) { toast.error('Importo obiettivo non valido'); return }
            crea.mutate({
              agenteId: agente.id, tabella: 'agenti_obiettivi',
              values: {
                anno: Number(anno), importo_obiettivo: imp,
                mese: mese === '' ? null : Number(mese),
              },
            }, { onSuccess: () => setImporto(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-24 space-y-1">
            <Label>Anno</Label>
            <Input type="number" value={anno} onChange={(e) => setAnno(e.target.value)} />
          </div>
          <div className="w-36 space-y-1">
            <Label>Mese (opz.)</Label>
            <Select value={mese || 'annuale'} onValueChange={(v) => setMese(v === 'annuale' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annuale">Annuale</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{String(i + 1).padStart(2, '0')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-1">
            <Label>Obiettivo (€)</Label>
            <Input type="number" step="0.01" value={importo} onChange={(e) => setImporto(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      )}
    </div>
  )
}

// ── Note spese ───────────────────────────────────────────────────
function TabNoteSpese({ agente }: { agente: Agente }) {
  const { isManager } = useAuth()
  const { data: note = [] } = useFigliAgente<AgenteNotaSpese>(agente.id, 'agenti_note_spese')
  const crea = useCreaFiglioAgente()
  const aggiorna = useAggiornaFiglioAgente()
  const elimina = useEliminaFiglioAgente()
  const [tipo, setTipo] = useState('carburante')
  const [descrizione, setDescrizione] = useState('')
  const [importo, setImporto] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-1 text-sm font-semibold text-foreground">Note spese</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Le ricevute si allegano nei Documenti. Solo admin e manager approvano.
      </p>
      {note.map((n) => {
        const st = NOTA_SPESE_STATO[n.stato] ?? NOTA_SPESE_STATO.presentata
        return (
          <div key={n.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{n.descrizione}</p>
              <p className="text-xs text-muted-foreground">{NOTA_SPESE_TIPO[n.tipo]} · {fmtData(n.data)}</p>
            </div>
            <span className="font-medium text-foreground">{fmtImporto(Number(n.importo))}</span>
            <Badge tone={st.tone}>{st.label}</Badge>
            {isManager && n.stato === 'presentata' && (
              <>
                <Button size="sm" variant="outline" className="text-xs"
                  onClick={() => aggiorna.mutate({
                    agenteId: agente.id, tabella: 'agenti_note_spese', id: n.id,
                    values: { stato: 'approvata' },
                  })}>
                  Approva
                </Button>
                <Button size="sm" variant="ghost" className="text-xs text-destructive"
                  onClick={() => aggiorna.mutate({
                    agenteId: agente.id, tabella: 'agenti_note_spese', id: n.id,
                    values: { stato: 'rifiutata' },
                  })}>
                  Rifiuta
                </Button>
              </>
            )}
            {isManager && n.stato === 'approvata' && (
              <Button size="sm" variant="ghost" className="text-xs"
                onClick={() => aggiorna.mutate({
                  agenteId: agente.id, tabella: 'agenti_note_spese', id: n.id,
                  values: { stato: 'rimborsata' },
                })}>
                Segna rimborsata
              </Button>
            )}
            <BtnElimina onClick={() => elimina.mutate({ agenteId: agente.id, tabella: 'agenti_note_spese', id: n.id })} />
          </div>
        )
      })}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          const imp = Number(importo)
          if (!descrizione.trim() || !importo || Number.isNaN(imp)) {
            toast.error('Descrizione e importo obbligatori'); return
          }
          crea.mutate({
            agenteId: agente.id, tabella: 'agenti_note_spese',
            values: { tipo, descrizione: descrizione.trim(), importo: imp },
          }, {
            onSuccess: () => { setDescrizione(''); setImporto('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="w-36 space-y-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(NOTA_SPESE_TIPO).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-36 flex-1 space-y-1">
          <Label>Descrizione</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label>Importo (€)</Label>
          <Input type="number" step="0.01" value={importo} onChange={(e) => setImporto(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Presenta</Button>
      </form>
    </div>
  )
}

// ── Pagina ───────────────────────────────────────────────────────
export function AgenteDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: agente, isLoading } = useAgente(id)
  const { data: me } = useAgenteCorrente()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }
  if (!agente) return <p className="text-sm text-muted-foreground">Agente non trovato (o accesso non consentito).</p>

  const st = AGENTE_STATO[agente.stato] ?? AGENTE_STATO.attivo
  const sonoIo = me?.id === agente.id

  return (
    <div className="mx-auto max-w-6xl">
      {!sonoIo && (
        <button onClick={() => navigate('/agenti')}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Agenti
        </button>
      )}

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-muted-foreground">{agente.codice}</p>
            <h1 className="mt-0.5 text-2xl font-bold text-foreground">
              {sonoIo ? `Il mio portale — ${agente.nome} ${agente.cognome ?? ''}` : `${agente.nome} ${agente.cognome ?? ''}`}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{TIPOLOGIA_LABEL[agente.tipologia]}</span>
              {agente.zone && <span>{agente.zone}</span>}
              {agente.email && <span>{agente.email}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={st.tone} className="text-sm">{st.label}</Badge>
            {!sonoIo && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Modifica
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="panoramica">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="panoramica">Panoramica</TabsTrigger>
          <TabsTrigger value="mandati">Mandati</TabsTrigger>
          <TabsTrigger value="portafoglio">Portafoglio</TabsTrigger>
          <TabsTrigger value="visite">Visite</TabsTrigger>
          <TabsTrigger value="offerte">Offerte e ordini</TabsTrigger>
          <TabsTrigger value="provvigioni">Provvigioni</TabsTrigger>
          <TabsTrigger value="obiettivi">Obiettivi</TabsTrigger>
          <TabsTrigger value="spese">Note spese</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger value="scadenze">Scadenze</TabsTrigger>
          <TabsTrigger value="attivita">Attività</TabsTrigger>
          <TabsTrigger value="commenti">Commenti</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>
        <TabsContent value="panoramica" className="mt-4"><TabPanoramica agente={agente} /></TabsContent>
        <TabsContent value="mandati" className="mt-4"><TabMandati agente={agente} /></TabsContent>
        <TabsContent value="portafoglio" className="mt-4"><TabPortafoglio agente={agente} /></TabsContent>
        <TabsContent value="visite" className="mt-4"><TabVisite agente={agente} /></TabsContent>
        <TabsContent value="offerte" className="mt-4"><TabOfferteOrdini agente={agente} /></TabsContent>
        <TabsContent value="provvigioni" className="mt-4"><TabProvvigioni agente={agente} /></TabsContent>
        <TabsContent value="obiettivi" className="mt-4"><TabObiettivi agente={agente} /></TabsContent>
        <TabsContent value="spese" className="mt-4"><TabNoteSpese agente={agente} /></TabsContent>
        <TabsContent value="documenti" className="mt-4">
          <AllegatiSection entita="agenti" entitaId={agente.id}
            categorie={['Contratti', 'Cataloghi e listini', 'Note spese', 'Formazione', 'Altro']} />
        </TabsContent>
        <TabsContent value="scadenze" className="mt-4">
          <ScadenzeModuliSection modulo="agenti" entita="agenti" entitaId={agente.id}
            tipi={['Rinnovo mandato', 'Obiettivo', 'Formazione', 'Documento', 'Altro']}
            azioneUrl={`/agenti/${agente.id}`} />
        </TabsContent>
        <TabsContent value="attivita" className="mt-4">
          <TimelineSection scope={{ agente_id: agente.id }} />
        </TabsContent>
        <TabsContent value="commenti" className="mt-4">
          <FeedSection target={{ entita: 'agenti', entitaId: agente.id }} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="agenti" entitaId={agente.id} />
        </TabsContent>
      </Tabs>

      <AgenteDialog open={editOpen} onOpenChange={setEditOpen} agente={agente} />
    </div>
  )
}
