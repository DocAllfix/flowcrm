/**
 * AutomezzoDettaglioPage — fascicolo del veicolo (documento §1-§19):
 * panoramica con KPI consumi e costo/km (manager), assegnazioni,
 * manutenzioni, rifornimenti (aggiornano i km), utilizzi, sinistri e
 * multe, pneumatici e attrezzature, costi (manager), documenti,
 * scadenze (revisione/bollo/assicurazione…), commenti, storico.
 */
import { useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, Pencil, Trash2, Plus, Fuel, Wrench, User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { StoricoSection } from '@/components/StoricoSection'
import { FeedSection } from '@/components/FeedSection'
import { ApprovalSection } from '@/components/ApprovalSection'
import { ScadenzeModuliSection } from '@/components/ScadenzeModuliSection'
import { useAuth } from '@/hooks/useAuth'
import { AutomezzoDialog } from '@/modules/automezzi/dialogs/AutomezzoDialog'
import {
  AUTOMEZZO_STATI, statoAutomezzo, CATEGORIA_LABEL, ALIMENTAZIONE_LABEL,
  ACQUISIZIONE_LABEL, COSTO_VOCE_LABEL, SINISTRO_STATO_LABEL,
  AUTOMEZZO_TIPI_SCADENZA, fmtImporto, fmtData,
} from '@/modules/automezzi/stati'
import {
  useAutomezzo, useUpdateAutomezzo, useAutomezzoConsumi, useAutomezzoCostoKm,
  useFigliAutomezzo, useCreaFiglioAutomezzo, useAggiornaFiglioAutomezzo,
  useEliminaFiglioAutomezzo,
  type Automezzo, type AutomezzoStato, type AutomezzoAssegnazione,
  type AutomezzoManutenzione, type AutomezzoRifornimento, type AutomezzoUtilizzo,
  type AutomezzoSinistro, type AutomezzoMulta, type AutomezzoCosto,
  type AutomezzoPneumatico, type AutomezzoAttrezzatura,
} from '@/modules/automezzi/queries/automezzi'

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

const fmtKm = (n: number | null) => (n != null ? new Intl.NumberFormat('it-IT').format(n) + ' km' : '—')

// ── Panoramica ───────────────────────────────────────────────────
function TabPanoramica({ mezzo }: { mezzo: Automezzo }) {
  const { isManager } = useAuth()
  const { data: consumi } = useAutomezzoConsumi(mezzo.id)
  const { data: costoKm } = useAutomezzoCostoKm(mezzo.id)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Anagrafica</h3>
        <Riga label="Targa">{mezzo.targa ?? '—'}</Riga>
        <Riga label="Telaio (VIN)">{mezzo.telaio ?? '—'}</Riga>
        <Riga label="Categoria">{CATEGORIA_LABEL[mezzo.categoria]}</Riga>
        <Riga label="Alimentazione">{mezzo.alimentazione ? ALIMENTAZIONE_LABEL[mezzo.alimentazione] : '—'}</Riga>
        <Riga label="Classe ambientale">{mezzo.classe_euro ?? '—'}</Riga>
        <Riga label="Immatricolazione">{mezzo.anno_immatricolazione ?? '—'}</Riga>
        <Riga label="Acquisizione">
          {ACQUISIZIONE_LABEL[mezzo.acquisizione]}{mezzo.data_acquisto ? ` (${fmtData(mezzo.data_acquisto)})` : ''}
        </Riga>
        <Riga label="Proprietario">{mezzo.proprietario ?? '—'}</Riga>
        <Riga label="Centro di costo">{mezzo.centro_costo ?? '—'}</Riga>
        <Riga label="Sede">{mezzo.sede ?? '—'}</Riga>
      </div>

      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Utilizzo e consumi</h3>
        <Riga label="Km attuali">{fmtKm(mezzo.km_attuali)}</Riga>
        <Riga label="Litri totali">{Number(consumi?.litri_totali ?? 0)} l</Riga>
        <Riga label="Spesa carburante">{fmtImporto(Number(consumi?.costo_carburante ?? 0))}</Riga>
        <Riga label="Consumo medio">
          {consumi?.consumo_medio_100km != null ? `${consumi.consumo_medio_100km} l/100km` : '—'}
        </Riga>
        <Riga label="Ore di fermo">{Number(consumi?.ore_fermo ?? 0)} h</Riga>
        <Riga label="Guasti (straordinarie)">{consumi?.n_guasti ?? 0}</Riga>
        <Riga label="Spesa manutenzione">{fmtImporto(Number(consumi?.costo_manutenzione ?? 0))}</Riga>
      </div>

      {isManager && costoKm && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Costi del mezzo (riservato)</h3>
          <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-5">
            <Riga label="Costi fissi">{fmtImporto(Number(costoKm.costi_fissi ?? 0))}</Riga>
            <Riga label="Carburante">{fmtImporto(Number(costoKm.carburante ?? 0))}</Riga>
            <Riga label="Manutenzione">{fmtImporto(Number(costoKm.manutenzione ?? 0))}</Riga>
            <Riga label="Costo totale">{fmtImporto(Number(costoKm.costo_totale ?? 0))}</Riga>
            <Riga label="Costo / km">
              {costoKm.costo_km != null ? `€ ${Number(costoKm.costo_km).toFixed(3)}` : '—'}
            </Riga>
          </div>
        </div>
      )}

      {mezzo.stato === 'dismesso' && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Dismissione</h3>
          <Riga label="Data">{fmtData(mezzo.dismesso_il)}</Riga>
          <Riga label="Modalità">{mezzo.dismissione_tipo ?? '—'}</Riga>
          {mezzo.dismissione_valore != null && (
            <Riga label="Valore realizzato">{fmtImporto(Number(mezzo.dismissione_valore))}</Riga>
          )}
          {mezzo.dismissione_note && <p className="mt-1 text-sm text-muted-foreground">{mezzo.dismissione_note}</p>}
        </div>
      )}
    </div>
  )
}

// ── Assegnazioni ─────────────────────────────────────────────────
function TabAssegnazioni({ mezzo }: { mezzo: Automezzo }) {
  const { data: assegnazioni = [] } = useFigliAutomezzo<AutomezzoAssegnazione>(mezzo.id, 'automezzi_assegnazioni')
  const crea = useCreaFiglioAutomezzo()
  const aggiorna = useAggiornaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [assegnatario, setAssegnatario] = useState('')
  const [motivo, setMotivo] = useState('')

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Assegnazioni</h3>
        {assegnazioni.map((a) => (
          <div key={a.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">
                {a.dipendente ? `${a.dipendente.nome} ${a.dipendente.cognome ?? ''}` : a.assegnatario ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                dal {fmtData(a.data_inizio)}{a.data_fine ? ` al ${fmtData(a.data_fine)}` : ' (in corso)'}
                {a.motivo ? ` · ${a.motivo}` : ''}
              </p>
            </div>
            {!a.data_fine && (
              <Button size="sm" variant="ghost" className="text-xs"
                onClick={() => aggiorna.mutate({
                  automezzoId: mezzo.id, tabella: 'automezzi_assegnazioni', id: a.id,
                  values: { data_fine: new Date().toISOString().slice(0, 10), km_finali: mezzo.km_attuali },
                })}>
                Chiudi assegnazione
              </Button>
            )}
            <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_assegnazioni', id: a.id })} />
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!assegnatario.trim()) { toast.error("Indica l'assegnatario"); return }
            crea.mutate({
              automezzoId: mezzo.id, tabella: 'automezzi_assegnazioni',
              values: {
                assegnatario: assegnatario.trim(), motivo: motivo.trim() || null,
                km_iniziali: mezzo.km_attuali,
              },
            }, {
              onSuccess: () => { setAssegnatario(''); setMotivo('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-44 flex-1 space-y-1">
            <Label>Assegnatario</Label>
            <Input value={assegnatario} onChange={(e) => setAssegnatario(e.target.value)}
              placeholder="Nome del conducente/reparto" />
          </div>
          <div className="min-w-36 flex-1 space-y-1">
            <Label>Motivo</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Assegna</Button>
        </form>
      </div>

      <ApprovalSection
        modulo="automezzi" entita="automezzi" entitaId={mezzo.id}
        tipiRichiesta={[
          { value: 'utilizzo', label: 'Richiesta utilizzo mezzo' },
          { value: 'prenotazione', label: 'Prenotazione' },
          { value: 'manutenzione', label: 'Autorizzazione manutenzione' },
          { value: 'ricambi', label: 'Acquisto ricambi' },
          { value: 'riparazione', label: 'Approvazione riparazione' },
        ]}
        azioneUrl={`/automezzi/${mezzo.id}`}
      />
    </div>
  )
}

// ── Manutenzioni ─────────────────────────────────────────────────
function TabManutenzioni({ mezzo }: { mezzo: Automezzo }) {
  const { data: manutenzioni = [] } = useFigliAutomezzo<AutomezzoManutenzione>(mezzo.id, 'automezzi_manutenzioni')
  const crea = useCreaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [tipo, setTipo] = useState('ordinaria')
  const [descrizione, setDescrizione] = useState('')
  const [officina, setOfficina] = useState('')
  const [costoMan, setCostoMan] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Registro manutenzioni</h3>
      {manutenzioni.map((m) => (
        <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{m.descrizione}</p>
            <p className="text-xs text-muted-foreground">
              {fmtData(m.data)}{m.officina ? ` · ${m.officina}` : ''}{m.km != null ? ` · ${fmtKm(m.km)}` : ''}
            </p>
          </div>
          <Badge tone={m.tipo === 'straordinaria' ? 'warning' : 'neutral'}>{m.tipo}</Badge>
          {(m.costo_manodopera != null || m.costo_materiali != null) && (
            <span className="font-medium text-foreground">
              {fmtImporto(Number(m.costo_manodopera ?? 0) + Number(m.costo_materiali ?? 0))}
            </span>
          )}
          <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_manutenzioni', id: m.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!descrizione.trim()) { toast.error("Descrivi l'intervento"); return }
          crea.mutate({
            automezzoId: mezzo.id, tabella: 'automezzi_manutenzioni',
            values: {
              tipo, descrizione: descrizione.trim(), officina: officina.trim() || null,
              costo_manodopera: costoMan === '' ? null : Number(costoMan),
            },
          }, {
            onSuccess: () => { setDescrizione(''); setOfficina(''); setCostoMan('') },
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
              <SelectItem value="ordinaria">Ordinaria</SelectItem>
              <SelectItem value="straordinaria">Straordinaria</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-40 flex-1 space-y-1">
          <Label>Intervento</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Es. Tagliando 60.000 km" />
        </div>
        <div className="w-36 space-y-1">
          <Label>Officina</Label>
          <Input value={officina} onChange={(e) => setOfficina(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label>Costo (€)</Label>
          <Input type="number" step="0.01" value={costoMan} onChange={(e) => setCostoMan(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}

// ── Rifornimenti ─────────────────────────────────────────────────
function TabRifornimenti({ mezzo }: { mezzo: Automezzo }) {
  const { data: rifornimenti = [] } = useFigliAutomezzo<AutomezzoRifornimento>(mezzo.id, 'automezzi_rifornimenti')
  const crea = useCreaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [litri, setLitri] = useState('')
  const [costo, setCosto] = useState('')
  const [km, setKm] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-1 text-sm font-semibold text-foreground">Rifornimenti</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        I km inseriti aggiornano automaticamente il contachilometri del mezzo.
      </p>
      {rifornimenti.map((r) => (
        <div key={r.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Fuel className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{fmtData(r.data)}</span>
          <span className="flex-1 text-foreground">{Number(r.litri)} l</span>
          <span className="font-medium text-foreground">{fmtImporto(Number(r.costo))}</span>
          {r.km != null && <span className="text-xs text-muted-foreground">{fmtKm(r.km)}</span>}
          <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_rifornimenti', id: r.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          const l = Number(litri); const c = Number(costo)
          if (!litri || Number.isNaN(l) || !costo || Number.isNaN(c)) {
            toast.error('Litri e costo obbligatori'); return
          }
          crea.mutate({
            automezzoId: mezzo.id, tabella: 'automezzi_rifornimenti',
            values: { litri: l, costo: c, km: km === '' ? null : Number(km) },
          }, {
            onSuccess: () => { setLitri(''); setCosto(''); setKm('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="w-24 space-y-1">
          <Label>Litri</Label>
          <Input type="number" step="0.01" value={litri} onChange={(e) => setLitri(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label>Costo (€)</Label>
          <Input type="number" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} />
        </div>
        <div className="w-32 space-y-1">
          <Label>Km attuali</Label>
          <Input type="number" value={km} onChange={(e) => setKm(e.target.value)}
            placeholder={String(mezzo.km_attuali)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Registra</Button>
      </form>
    </div>
  )
}

// ── Utilizzi ─────────────────────────────────────────────────────
function TabUtilizzi({ mezzo }: { mezzo: Automezzo }) {
  const { data: utilizzi = [] } = useFigliAutomezzo<AutomezzoUtilizzo>(mezzo.id, 'automezzi_utilizzi')
  const crea = useCreaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [conducente, setConducente] = useState('')
  const [destinazione, setDestinazione] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Registro utilizzi</h3>
      {utilizzi.map((u) => (
        <div key={u.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <span className="text-xs text-muted-foreground">{fmtData(u.data)}</span>
          <span className="flex-1 text-foreground">
            {[u.conducente, u.destinazione].filter(Boolean).join(' → ') || '—'}
          </span>
          {u.km_iniziali != null && u.km_finali != null && (
            <span className="text-xs text-muted-foreground">{u.km_finali - u.km_iniziali} km</span>
          )}
          {u.anomalie && <Badge tone="warning">Anomalie</Badge>}
          <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_utilizzi', id: u.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!conducente.trim()) { toast.error('Indica il conducente'); return }
          crea.mutate({
            automezzoId: mezzo.id, tabella: 'automezzi_utilizzi',
            values: { conducente: conducente.trim(), destinazione: destinazione.trim() || null },
          }, {
            onSuccess: () => { setConducente(''); setDestinazione('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="min-w-40 flex-1 space-y-1">
          <Label>Conducente</Label>
          <Input value={conducente} onChange={(e) => setConducente(e.target.value)} />
        </div>
        <div className="min-w-40 flex-1 space-y-1">
          <Label>Destinazione</Label>
          <Input value={destinazione} onChange={(e) => setDestinazione(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}

// ── Sinistri e multe ─────────────────────────────────────────────
function TabSinistriMulte({ mezzo }: { mezzo: Automezzo }) {
  const { data: sinistri = [] } = useFigliAutomezzo<AutomezzoSinistro>(mezzo.id, 'automezzi_sinistri')
  const { data: multe = [] } = useFigliAutomezzo<AutomezzoMulta>(mezzo.id, 'automezzi_multe')
  const crea = useCreaFiglioAutomezzo()
  const aggiorna = useAggiornaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [descSinistro, setDescSinistro] = useState('')
  const [importoMulta, setImportoMulta] = useState('')
  const [enteMulta, setEnteMulta] = useState('')

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Sinistri</h3>
        {sinistri.map((s) => {
          const st = SINISTRO_STATO_LABEL[s.stato]
          return (
            <div key={s.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{s.descrizione}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtData(s.data)}{s.luogo ? ` · ${s.luogo}` : ''}{s.pratica ? ` · pratica ${s.pratica}` : ''}
                </p>
              </div>
              <Select value={s.stato}
                onValueChange={(v) => aggiorna.mutate({
                  automezzoId: mezzo.id, tabella: 'automezzi_sinistri', id: s.id, values: { stato: v },
                })}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SINISTRO_STATO_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge tone={st.tone}>{st.label}</Badge>
              <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_sinistri', id: s.id })} />
            </div>
          )
        })}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!descSinistro.trim()) { toast.error('Descrivi il sinistro'); return }
            crea.mutate({
              automezzoId: mezzo.id, tabella: 'automezzi_sinistri',
              values: { descrizione: descSinistro.trim() },
            }, { onSuccess: () => setDescSinistro(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex items-end gap-2"
        >
          <div className="flex-1 space-y-1">
            <Label>Nuovo sinistro</Label>
            <Input value={descSinistro} onChange={(e) => setDescSinistro(e.target.value)}
              placeholder="Es. Tamponamento in via Roma" />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Multe</h3>
        {multe.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="text-xs text-muted-foreground">{fmtData(m.data)}</span>
            <span className="flex-1 text-foreground">{m.ente ?? '—'}</span>
            <span className="font-medium text-foreground">{fmtImporto(Number(m.importo))}</span>
            {m.punti_decurtati != null && m.punti_decurtati > 0 && (
              <Badge tone="warning">-{m.punti_decurtati} punti</Badge>
            )}
            {m.pagata ? (
              <Badge tone="success">Pagata</Badge>
            ) : (
              <Button size="sm" variant="ghost" className="text-xs"
                onClick={() => aggiorna.mutate({
                  automezzoId: mezzo.id, tabella: 'automezzi_multe', id: m.id, values: { pagata: true },
                })}>
                Segna pagata
              </Button>
            )}
            <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_multe', id: m.id })} />
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            const imp = Number(importoMulta)
            if (!importoMulta || Number.isNaN(imp)) { toast.error('Importo obbligatorio'); return }
            crea.mutate({
              automezzoId: mezzo.id, tabella: 'automezzi_multe',
              values: { importo: imp, ente: enteMulta.trim() || null },
            }, {
              onSuccess: () => { setImportoMulta(''); setEnteMulta('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-36 flex-1 space-y-1">
            <Label>Ente accertatore</Label>
            <Input value={enteMulta} onChange={(e) => setEnteMulta(e.target.value)} />
          </div>
          <div className="w-28 space-y-1">
            <Label>Importo (€)</Label>
            <Input type="number" step="0.01" value={importoMulta}
              onChange={(e) => setImportoMulta(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  )
}

// ── Pneumatici e attrezzature ────────────────────────────────────
function TabPneumaticiAttrezzature({ mezzo }: { mezzo: Automezzo }) {
  const { data: pneumatici = [] } = useFigliAutomezzo<AutomezzoPneumatico>(mezzo.id, 'automezzi_pneumatici')
  const { data: attrezzature = [] } = useFigliAutomezzo<AutomezzoAttrezzatura>(mezzo.id, 'automezzi_attrezzature')
  const crea = useCreaFiglioAutomezzo()
  const aggiorna = useAggiornaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [tipologia, setTipologia] = useState('estivi')
  const [misura, setMisura] = useState('')
  const [descrAttr, setDescrAttr] = useState('')

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Pneumatici</h3>
        {pneumatici.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="flex-1 text-foreground">
              {p.tipologia}{p.misura ? ` ${p.misura}` : ''}{p.marca ? ` · ${p.marca}` : ''}
            </span>
            <span className="text-xs text-muted-foreground">{fmtData(p.data_installazione)}</span>
            {p.montati ? (
              <Badge tone="success">Montati</Badge>
            ) : (
              <Badge tone="neutral">A deposito</Badge>
            )}
            <Button size="sm" variant="ghost" className="text-xs"
              onClick={() => aggiorna.mutate({
                automezzoId: mezzo.id, tabella: 'automezzi_pneumatici', id: p.id,
                values: { montati: !p.montati },
              })}>
              {p.montati ? 'Smonta' : 'Monta'}
            </Button>
            <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_pneumatici', id: p.id })} />
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            crea.mutate({
              automezzoId: mezzo.id, tabella: 'automezzi_pneumatici',
              values: { tipologia, misura: misura.trim() || null },
            }, { onSuccess: () => setMisura(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-36 space-y-1">
            <Label>Tipologia</Label>
            <Select value={tipologia} onValueChange={setTipologia}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="estivi">Estivi</SelectItem>
                <SelectItem value="invernali">Invernali</SelectItem>
                <SelectItem value="4 stagioni">4 stagioni</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32 flex-1 space-y-1">
            <Label>Misura</Label>
            <Input value={misura} onChange={(e) => setMisura(e.target.value)} placeholder="205/65 R16" />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Attrezzature installate</h3>
        {attrezzature.map((a) => (
          <div key={a.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="flex-1 text-foreground">{a.descrizione}</span>
            {a.matricola && <span className="text-xs text-muted-foreground">matr. {a.matricola}</span>}
            <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_attrezzature', id: a.id })} />
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!descrAttr.trim()) { toast.error("Descrivi l'attrezzatura"); return }
            crea.mutate({
              automezzoId: mezzo.id, tabella: 'automezzi_attrezzature',
              values: { descrizione: descrAttr.trim() },
            }, { onSuccess: () => setDescrAttr(''), onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex items-end gap-2"
        >
          <div className="flex-1 space-y-1">
            <Label>Attrezzatura</Label>
            <Input value={descrAttr} onChange={(e) => setDescrAttr(e.target.value)}
              placeholder="Es. Gru retrocabina, sponda idraulica" />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  )
}

// ── Costi (manager) ──────────────────────────────────────────────
function TabCosti({ mezzo }: { mezzo: Automezzo }) {
  const { isManager } = useAuth()
  const { data: costi = [] } = useFigliAutomezzo<AutomezzoCosto>(mezzo.id, 'automezzi_costi')
  const crea = useCreaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [voce, setVoce] = useState('assicurazione')
  const [descrizione, setDescrizione] = useState('')
  const [importo, setImporto] = useState('')

  if (!isManager) {
    return (
      <div className={card}>
        <p className="text-sm text-muted-foreground">
          I costi analitici del mezzo sono riservati ad admin e manager.
        </p>
      </div>
    )
  }

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Costi analitici (riservato)</h3>
      <p className="mb-2 text-xs text-muted-foreground">
        Carburante e manutenzioni si sommano da soli: qui le voci fisse (assicurazione, bollo, leasing, pedaggi…).
      </p>
      {costi.map((c) => (
        <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Badge tone="neutral">{COSTO_VOCE_LABEL[c.voce]}</Badge>
          <span className="flex-1 text-foreground">{c.descrizione}</span>
          <span className="font-medium text-foreground">{fmtImporto(Number(c.importo))}</span>
          <span className="text-xs text-muted-foreground">{fmtData(c.data)}</span>
          <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_costi', id: c.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          const imp = Number(importo)
          if (!descrizione.trim() || !importo || Number.isNaN(imp)) {
            toast.error('Descrizione e importo obbligatori'); return
          }
          crea.mutate({
            automezzoId: mezzo.id, tabella: 'automezzi_costi',
            values: { voce, descrizione: descrizione.trim(), importo: imp },
          }, {
            onSuccess: () => { setDescrizione(''); setImporto('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="w-40 space-y-1">
          <Label>Voce</Label>
          <Select value={voce} onValueChange={setVoce}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(COSTO_VOCE_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-36 flex-1 space-y-1">
          <Label>Descrizione</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
        </div>
        <div className="w-32 space-y-1">
          <Label>Importo (€)</Label>
          <Input type="number" step="0.01" value={importo} onChange={(e) => setImporto(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}

// ── Pagina ───────────────────────────────────────────────────────
export function AutomezzoDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: mezzo, isLoading } = useAutomezzo(id)
  const update = useUpdateAutomezzo()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }
  if (!mezzo) return <p className="text-sm text-muted-foreground">Mezzo non trovato (o modulo non attivo).</p>

  const st = statoAutomezzo(mezzo.stato)

  return (
    <div className="mx-auto max-w-6xl">
      <button onClick={() => navigate('/automezzi')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Parco automezzi
      </button>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-muted-foreground">
              {mezzo.codice}{mezzo.targa ? ` · ${mezzo.targa}` : ''}
            </p>
            <h1 className="mt-0.5 text-2xl font-bold text-foreground">
              {mezzo.marca} {mezzo.modello}{mezzo.versione ? ` ${mezzo.versione}` : ''}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{CATEGORIA_LABEL[mezzo.categoria]}</span>
              <span>{fmtKm(mezzo.km_attuali)}</span>
              {mezzo.centro_costo && <span>{mezzo.centro_costo}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={st.tone} className="text-sm">{st.label}</Badge>
            <Select value={mezzo.stato}
              onValueChange={(v) => update.mutate({ id: mezzo.id, values: { stato: v as AutomezzoStato } }, {
                onError: (e) => toast.error((e as Error).message),
              })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUTOMEZZO_STATI.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
          <TabsTrigger value="assegnazioni">Assegnazioni</TabsTrigger>
          <TabsTrigger value="manutenzioni">Manutenzioni</TabsTrigger>
          <TabsTrigger value="rifornimenti">Rifornimenti</TabsTrigger>
          <TabsTrigger value="utilizzi">Utilizzi</TabsTrigger>
          <TabsTrigger value="sinistri">Sinistri e multe</TabsTrigger>
          <TabsTrigger value="pneumatici">Pneumatici e attrezzature</TabsTrigger>
          <TabsTrigger value="costi">Costi</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger value="scadenze">Scadenze</TabsTrigger>
          <TabsTrigger value="commenti">Commenti</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>
        <TabsContent value="panoramica" className="mt-4"><TabPanoramica mezzo={mezzo} /></TabsContent>
        <TabsContent value="assegnazioni" className="mt-4"><TabAssegnazioni mezzo={mezzo} /></TabsContent>
        <TabsContent value="manutenzioni" className="mt-4"><TabManutenzioni mezzo={mezzo} /></TabsContent>
        <TabsContent value="rifornimenti" className="mt-4"><TabRifornimenti mezzo={mezzo} /></TabsContent>
        <TabsContent value="utilizzi" className="mt-4"><TabUtilizzi mezzo={mezzo} /></TabsContent>
        <TabsContent value="sinistri" className="mt-4"><TabSinistriMulte mezzo={mezzo} /></TabsContent>
        <TabsContent value="pneumatici" className="mt-4"><TabPneumaticiAttrezzature mezzo={mezzo} /></TabsContent>
        <TabsContent value="costi" className="mt-4"><TabCosti mezzo={mezzo} /></TabsContent>
        <TabsContent value="documenti" className="mt-4">
          <AllegatiSection entita="automezzi" entitaId={mezzo.id}
            categorie={['Circolazione', 'Proprietà', 'Assicurazione', 'Contratti', 'Manuali', 'Altro']} />
        </TabsContent>
        <TabsContent value="scadenze" className="mt-4">
          <ScadenzeModuliSection modulo="automezzi" entita="automezzi" entitaId={mezzo.id}
            tipi={AUTOMEZZO_TIPI_SCADENZA} azioneUrl={`/automezzi/${mezzo.id}`} />
        </TabsContent>
        <TabsContent value="commenti" className="mt-4">
          <FeedSection target={{ entita: 'automezzi', entitaId: mezzo.id }} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="automezzi" entitaId={mezzo.id} />
        </TabsContent>
      </Tabs>

      <AutomezzoDialog open={editOpen} onOpenChange={setEditOpen} automezzo={mezzo} />
    </div>
  )
}
