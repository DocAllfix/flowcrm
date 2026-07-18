/**
 * StrutturaPage — configurazione della struttura (documento §4-§5, §9,
 * §11, §13, §16): professionisti, prestazioni con tariffe, ambulatori,
 * convenzioni, apparecchiature (con scadenze tarature), magazzino
 * sanitario (lotti → scadenzario automatico), registro qualità.
 */
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/lib/queries/users'
import { ScadenzeModuliSection } from '@/components/ScadenzeModuliSection'
import {
  PRESTAZIONE_TIPO_LABEL, ARTICOLO_TIPO_LABEL, QUALITA_TIPO_LABEL,
  APPARECCHIATURA_STATO, fmtImporto, fmtData,
} from '@/modules/poliambulatori/stati'
import {
  usePoliLista, useCreaPoli, useAggiornaPoli, useEliminaPoli,
  type Professionista, type Prestazione, type Ambulatorio, type Convenzione,
  type Apparecchiatura, type ArticoloSanitario, type EventoQualita,
} from '@/modules/poliambulatori/queries/poliambulatorio'

const card = 'rounded-xl border border-border bg-card p-5 shadow-sm'

function BtnElimina({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Rimuovi"
      className="rounded-md p-1 text-muted-foreground hover:text-destructive">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

function TabProfessionisti() {
  const { isAdmin } = useAuth()
  const { data: professionisti = [] } = usePoliLista<Professionista>('professionisti')
  const { data: utenti = [] } = useUsers()
  const crea = useCreaPoli()
  const elimina = useEliminaPoli()
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [specializzazione, setSpecializzazione] = useState('')
  const [userId, setUserId] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-1 text-sm font-semibold text-foreground">Professionisti</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Il professionista collegato a un utente accede ai contenuti clinici (fascicoli, cartelle, referti).
      </p>
      {professionisti.map((p) => (
        <div key={p.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.colore ?? '#94a3b8' }} />
          <span className="flex-1 font-medium text-foreground">
            {p.nome} {p.cognome ?? ''}
            {p.specializzazione && <span className="ml-2 text-xs font-normal text-muted-foreground">{p.specializzazione}</span>}
          </span>
          {p.user_id ? <Badge tone="success">Accesso clinico</Badge> : <Badge tone="neutral">Senza accesso</Badge>}
          <BtnElimina onClick={() => elimina.mutate({ tabella: 'professionisti', id: p.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!nome.trim()) { toast.error('Il nome è obbligatorio'); return }
          const colori = ['#ff5c35', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#0ea5e9']
          crea.mutate({
            tabella: 'professionisti',
            values: {
              nome: nome.trim(), cognome: cognome.trim() || null,
              specializzazione: specializzazione.trim() || null,
              user_id: userId || null,
              colore: colori[professionisti.length % colori.length],
            },
          }, {
            onSuccess: () => { setNome(''); setCognome(''); setSpecializzazione(''); setUserId('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="w-32 space-y-1">
          <Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="w-32 space-y-1">
          <Label>Cognome</Label>
          <Input value={cognome} onChange={(e) => setCognome(e.target.value)} />
        </div>
        <div className="min-w-36 flex-1 space-y-1">
          <Label>Specializzazione</Label>
          <Input value={specializzazione} onChange={(e) => setSpecializzazione(e.target.value)}
            placeholder="Es. Cardiologia" />
        </div>
        {isAdmin && (
          <div className="w-48 space-y-1">
            <Label>Utente (accesso clinico)</Label>
            <Select value={userId || 'nessuno'} onValueChange={(v) => setUserId(v === 'nessuno' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nessuno">— Nessuno —</SelectItem>
                {utenti.filter((u) => u.attivo).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}

function TabPrestazioni() {
  const { data: prestazioni = [] } = usePoliLista<Prestazione>('prestazioni')
  const crea = useCreaPoli()
  const elimina = useEliminaPoli()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('visita')
  const [durata, setDurata] = useState('30')
  const [tariffa, setTariffa] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Catalogo prestazioni</h3>
      {prestazioni.map((p) => (
        <div key={p.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <span className="flex-1 font-medium text-foreground">{p.nome}</span>
          <Badge tone="neutral">{PRESTAZIONE_TIPO_LABEL[p.tipo]}</Badge>
          <span className="text-xs text-muted-foreground">{p.durata_minuti}'</span>
          {p.tariffa_privata != null && (
            <span className="font-medium text-foreground">{fmtImporto(Number(p.tariffa_privata))}</span>
          )}
          <BtnElimina onClick={() => elimina.mutate({ tabella: 'prestazioni', id: p.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!nome.trim()) { toast.error('Il nome è obbligatorio'); return }
          crea.mutate({
            tabella: 'prestazioni',
            values: {
              nome: nome.trim(), tipo, durata_minuti: Number(durata) || 30,
              tariffa_privata: tariffa === '' ? null : Number(tariffa),
            },
          }, {
            onSuccess: () => { setNome(''); setTariffa('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="min-w-40 flex-1 space-y-1">
          <Label>Prestazione</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Visita cardiologica" />
        </div>
        <div className="w-48 space-y-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRESTAZIONE_TIPO_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-24 space-y-1">
          <Label>Durata (')</Label>
          <Input type="number" min="5" step="5" value={durata} onChange={(e) => setDurata(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label>Tariffa (€)</Label>
          <Input type="number" step="0.01" value={tariffa} onChange={(e) => setTariffa(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}

function TabSale() {
  const { data: ambulatori = [] } = usePoliLista<Ambulatorio>('ambulatori')
  const { data: convenzioni = [] } = usePoliLista<Convenzione>('convenzioni')
  const crea = useCreaPoli()
  const elimina = useEliminaPoli()
  const [nomeSala, setNomeSala] = useState('')
  const [nomeConv, setNomeConv] = useState('')
  const [enteTipo, setEnteTipo] = useState('assicurazione')

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Ambulatori / sale</h3>
        {ambulatori.map((a) => (
          <div key={a.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="flex-1 font-medium text-foreground">{a.nome}</span>
            <BtnElimina onClick={() => elimina.mutate({ tabella: 'ambulatori', id: a.id })} />
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!nomeSala.trim()) { toast.error('Il nome è obbligatorio'); return }
            crea.mutate({ tabella: 'ambulatori', values: { nome: nomeSala.trim() } }, {
              onSuccess: () => setNomeSala(''),
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex items-end gap-2"
        >
          <div className="flex-1 space-y-1">
            <Label>Sala</Label>
            <Input value={nomeSala} onChange={(e) => setNomeSala(e.target.value)}
              placeholder="Es. Ambulatorio 2" />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Convenzioni</h3>
        {convenzioni.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <span className="flex-1 font-medium text-foreground">{c.nome}</span>
            {c.ente_tipo && <Badge tone="neutral">{c.ente_tipo}</Badge>}
            <BtnElimina onClick={() => elimina.mutate({ tabella: 'convenzioni', id: c.id })} />
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!nomeConv.trim()) { toast.error('Il nome è obbligatorio'); return }
            crea.mutate({ tabella: 'convenzioni', values: { nome: nomeConv.trim(), ente_tipo: enteTipo } }, {
              onSuccess: () => setNomeConv(''),
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-36 flex-1 space-y-1">
            <Label>Convenzione</Label>
            <Input value={nomeConv} onChange={(e) => setNomeConv(e.target.value)}
              placeholder="Es. Fondo Est" />
          </div>
          <div className="w-40 space-y-1">
            <Label>Ente</Label>
            <Select value={enteTipo} onValueChange={setEnteTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['SSN', 'fondo sanitario', 'assicurazione', 'azienda', 'cassa professionale'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  )
}

function TabApparecchiature() {
  const { data: apparecchiature = [] } = usePoliLista<Apparecchiatura>('apparecchiature')
  const crea = useCreaPoli()
  const aggiorna = useAggiornaPoli()
  const elimina = useEliminaPoli()
  const [nome, setNome] = useState('')
  const [ubicazione, setUbicazione] = useState('')
  const [selezionata, setSelezionata] = useState<Apparecchiatura | null>(null)

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Apparecchiature medicali</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Seleziona un'apparecchiatura per gestirne tarature e verifiche nel riquadro Scadenze.
        </p>
        {apparecchiature.map((a) => {
          const st = APPARECCHIATURA_STATO[a.stato_operativo] ?? APPARECCHIATURA_STATO.operativa
          return (
            <div key={a.id}
              onClick={() => setSelezionata(a)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border-b border-border px-2 py-2 text-sm transition-colors last:border-0 hover:bg-muted/40 ${selezionata?.id === a.id ? 'bg-muted/50' : ''}`}>
              <span className="flex-1 font-medium text-foreground">{a.nome}</span>
              {a.ubicazione && <span className="text-xs text-muted-foreground">{a.ubicazione}</span>}
              <Select value={a.stato_operativo}
                onValueChange={(v) => aggiorna.mutate({
                  tabella: 'apparecchiature', id: a.id, values: { stato_operativo: v },
                })}>
                <SelectTrigger className="h-8 w-40 text-xs" onClick={(e) => e.stopPropagation()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(APPARECCHIATURA_STATO).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge tone={st.tone}>{st.label}</Badge>
              <BtnElimina onClick={() => elimina.mutate({ tabella: 'apparecchiature', id: a.id })} />
            </div>
          )
        })}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!nome.trim()) { toast.error('Il nome è obbligatorio'); return }
            crea.mutate({
              tabella: 'apparecchiature',
              values: { nome: nome.trim(), ubicazione: ubicazione.trim() || null },
            }, {
              onSuccess: () => { setNome(''); setUbicazione('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Apparecchiatura</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Ecografo GE" />
          </div>
          <div className="w-40 space-y-1">
            <Label>Ubicazione</Label>
            <Input value={ubicazione} onChange={(e) => setUbicazione(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
      </div>

      {selezionata && (
        <ScadenzeModuliSection
          modulo="poliambulatori" entita="apparecchiature" entitaId={selezionata.id}
          tipi={['Taratura', 'Manutenzione', 'Verifica periodica', 'Certificazione', 'Altro']}
          azioneUrl="/poliambulatorio-struttura"
        />
      )}
    </div>
  )
}

function TabMagazzino() {
  const { data: articoli = [] } = usePoliLista<ArticoloSanitario>('magazzino_sanitario')
  const crea = useCreaPoli()
  const aggiorna = useAggiornaPoli()
  const elimina = useEliminaPoli()
  const [descrizione, setDescrizione] = useState('')
  const [tipo, setTipo] = useState('consumo')
  const [lotto, setLotto] = useState('')
  const [scadenza, setScadenza] = useState('')
  const [quantita, setQuantita] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-1 text-sm font-semibold text-foreground">Magazzino sanitario</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        I lotti con scadenza finiscono da soli nello scadenzario (notifiche a 30/7/1 giorni).
      </p>
      {articoli.map((a) => (
        <div key={a.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Badge tone="neutral">{ARTICOLO_TIPO_LABEL[a.tipo]}</Badge>
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{a.descrizione}</span>
          {a.lotto && <span className="text-xs text-muted-foreground">lotto {a.lotto}</span>}
          {a.scadenza && (
            <Badge tone={new Date(a.scadenza) < new Date(Date.now() + 30 * 86400000) ? 'warning' : 'neutral'}>
              {fmtData(a.scadenza)}
            </Badge>
          )}
          <span className="font-medium text-foreground">{Number(a.quantita)}</span>
          {a.soglia_riordino != null && Number(a.quantita) <= Number(a.soglia_riordino) && (
            <Badge tone="danger">Riordinare</Badge>
          )}
          <Button size="sm" variant="ghost" className="text-xs"
            onClick={() => aggiorna.mutate({
              tabella: 'magazzino_sanitario', id: a.id,
              values: { quantita: Math.max(0, Number(a.quantita) - 1) },
            })}>
            −1
          </Button>
          <BtnElimina onClick={() => elimina.mutate({ tabella: 'magazzino_sanitario', id: a.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!descrizione.trim()) { toast.error('Descrivi l\'articolo'); return }
          crea.mutate({
            tabella: 'magazzino_sanitario',
            values: {
              descrizione: descrizione.trim(), tipo, lotto: lotto.trim() || null,
              scadenza: scadenza || null, quantita: quantita === '' ? 0 : Number(quantita),
            },
          }, {
            onSuccess: () => { setDescrizione(''); setLotto(''); setScadenza(''); setQuantita('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="min-w-40 flex-1 space-y-1">
          <Label>Articolo</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
        </div>
        <div className="w-44 space-y-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ARTICOLO_TIPO_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-28 space-y-1">
          <Label>Lotto</Label>
          <Input value={lotto} onChange={(e) => setLotto(e.target.value)} />
        </div>
        <div className="w-36 space-y-1">
          <Label>Scadenza</Label>
          <Input type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} />
        </div>
        <div className="w-20 space-y-1">
          <Label>Q.tà</Label>
          <Input type="number" step="1" value={quantita} onChange={(e) => setQuantita(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  )
}

function TabQualita() {
  const { data: eventi = [] } = usePoliLista<EventoQualita>('eventi_qualita')
  const crea = useCreaPoli()
  const aggiorna = useAggiornaPoli()
  const elimina = useEliminaPoli()
  const [tipo, setTipo] = useState('reclamo')
  const [descrizione, setDescrizione] = useState('')

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Qualità e rischio clinico</h3>
      {eventi.map((ev) => (
        <div key={ev.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Badge tone={ev.tipo === 'evento_avverso' ? 'danger' : 'neutral'}>
            {QUALITA_TIPO_LABEL[ev.tipo]}
          </Badge>
          <span className="min-w-0 flex-1 truncate text-foreground">{ev.descrizione}</span>
          <span className="text-xs text-muted-foreground">{fmtData(ev.data)}</span>
          {ev.chiuso ? (
            <Badge tone="success">Chiuso</Badge>
          ) : (
            <Button size="sm" variant="ghost" className="gap-1 text-xs"
              onClick={() => aggiorna.mutate({ tabella: 'eventi_qualita', id: ev.id, values: { chiuso: true } })}>
              <CheckCircle2 className="h-3 w-3" /> Chiudi
            </Button>
          )}
          <BtnElimina onClick={() => elimina.mutate({ tabella: 'eventi_qualita', id: ev.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (!descrizione.trim()) { toast.error('Descrivi l\'evento'); return }
          crea.mutate({
            tabella: 'eventi_qualita', values: { tipo, descrizione: descrizione.trim() },
          }, { onSuccess: () => setDescrizione(''), onError: (err) => toast.error((err as Error).message) })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="w-44 space-y-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(QUALITA_TIPO_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <Label>Descrizione</Label>
          <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Registra</Button>
      </form>
    </div>
  )
}

export function StrutturaPage() {
  return (
    <div>
      <PageHeader
        title="Struttura"
        description="Professionisti, prestazioni, sale, convenzioni, apparecchiature, magazzino e qualità."
      />
      <Tabs defaultValue="professionisti">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="professionisti">Professionisti</TabsTrigger>
          <TabsTrigger value="prestazioni">Prestazioni</TabsTrigger>
          <TabsTrigger value="sale">Sale e convenzioni</TabsTrigger>
          <TabsTrigger value="apparecchiature">Apparecchiature</TabsTrigger>
          <TabsTrigger value="magazzino">Magazzino</TabsTrigger>
          <TabsTrigger value="qualita">Qualità</TabsTrigger>
        </TabsList>
        <TabsContent value="professionisti" className="mt-4"><TabProfessionisti /></TabsContent>
        <TabsContent value="prestazioni" className="mt-4"><TabPrestazioni /></TabsContent>
        <TabsContent value="sale" className="mt-4"><TabSale /></TabsContent>
        <TabsContent value="apparecchiature" className="mt-4"><TabApparecchiature /></TabsContent>
        <TabsContent value="magazzino" className="mt-4"><TabMagazzino /></TabsContent>
        <TabsContent value="qualita" className="mt-4"><TabQualita /></TabsContent>
      </Tabs>
    </div>
  )
}
