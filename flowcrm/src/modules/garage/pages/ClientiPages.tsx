/**
 * Clienti del garage (§4) con la loro scheda: veicoli (§5), contratti
 * (§6), accessi autorizzati (§14), pagamenti e insoluti (§12), accessi
 * (§7), prenotazioni, chiavi, gomme, danni e servizi, documenti (§22).
 */
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, Car, KeyRound, Pencil, Plus, UserRound, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { FotoDialog } from '@/components/condivisi/FotoDialog'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'
import { useElenco, useRiga, useSalva, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import { ConStruttura } from '@/modules/garage/componenti/ConStruttura'
import { AutorizzazioneDialog, ClienteDialog, ContrattoDialog, VeicoloDialog, testoFasce } from '@/modules/garage/dialogs/AnagraficaDialogs'
import { TABELLE_CONTRATTO, type Autorizzazione, type Chiave, type Cliente, type ClienteRiepilogo, type Contratto, type Danno, type Pneumatici,
  type PostoStato, type Prenotazione, type Rata, type Servizio, type Sosta, type Veicolo } from '@/modules/garage/queries'
import { ALIMENTAZIONE, AUTORIZZAZIONE_TIPO, CHIAVE_STATO, CONTRATTO_STATO, CONTRATTO_TIPO, DANNO_TIPO, LIVELLO, PERIODICITA, PNEUMATICI_STATO, PRENOTAZIONE_STATO,
  RATA_STATO, SERVIZIO_STATO, SOSTA_STATO, STAGIONE, VEICOLO_TIPO, durata, fmtData, fmtEuro, fmtGiornoOra, oggiIso } from '@/modules/garage/stati'

type Metodo = Database['public']['Enums']['pagamento_metodo']
const METODI: [Metodo, string][] = [['pos', 'POS'], ['contanti', 'Contanti'], ['carta', 'Carta'], ['bonifico', 'Bonifico'], ['online', 'Online']]

// ── Elenco ──────────────────────────────────────────────────────────────
export function ClientiGaragePage() {
  return <ConStruttura><Clienti_ /></ConStruttura>
}

function Clienti_() {
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') ?? 'tutti'
  const [q, setQ] = useState('')
  const [nuovo, setNuovo] = useState(false)
  const { data: clienti = [], isLoading } = useElenco<ClienteRiepilogo>('gar_clienti_riepilogo', { ordine: [{ colonna: 'nome' }] })
  const cerca = q.trim().toLowerCase()
  const visibili = clienti.filter((c) => (vista === 'tutti' || (vista === 'abbonati' ? (c.contratti_attivi ?? 0) > 0 : vista === 'insoluti' ? Number(c.insoluto) > 0
      : vista === 'aziende' ? c.tipo === 'azienda' : !c.attivo)) && (vista === 'archiviati' || c.attivo)
    && (!cerca || [c.nome, c.codice, c.targhe, c.telefono, c.email].some((x) => x?.toLowerCase().includes(cerca))))
  const filtri: [string, string, number][] = [
    ['tutti', 'Tutti', clienti.filter((c) => c.attivo).length],
    ['abbonati', 'Con contratto', clienti.filter((c) => c.attivo && (c.contratti_attivi ?? 0) > 0).length],
    ['aziende', 'Aziende', clienti.filter((c) => c.attivo && c.tipo === 'azienda').length],
    ['insoluti', 'Con insoluti', clienti.filter((c) => c.attivo && Number(c.insoluto) > 0).length],
    ['archiviati', 'Archiviati', clienti.filter((c) => !c.attivo).length],
  ]
  return (
    <div>
      <PageHeader title="Clienti e veicoli" description="Privati e aziende con i loro veicoli, posti, contratti, accessi e pagamenti."
        numeri={[
          { etichetta: 'clienti', valore: isLoading ? undefined : filtri[0][2], inCaricamento: isLoading },
          { etichetta: 'con contratto', valore: isLoading ? undefined : filtri[1][2], inCaricamento: isLoading },
          { etichetta: 'con insoluti', valore: isLoading ? undefined : filtri[3][2], inCaricamento: isLoading },
        ]}
        actions={<BottoneScrittura onClick={() => setNuovo(true)}><Plus className="h-4 w-4" /> Nuovo cliente</BottoneScrittura>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Nome, targa, telefono…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca" />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtra">
          {filtri.map(([k, l, n]) => <Button key={k} size="sm" variant={vista === k ? 'default' : 'outline'} aria-pressed={vista === k}
            onClick={() => setParams(k === 'tutti' ? {} : { vista: k })}>{l} <span className="tabular-nums opacity-70">{n}</span></Button>)}
        </div>
      </div>
      {isLoading ? <Skeleton className="h-64" /> : visibili.length === 0 ? (
        cerca || vista !== 'tutti'
          ? <EmptyState icon={Users} filtrato title="Nessun cliente trovato" description="Cambia la ricerca o il filtro." />
          : <EmptyState icon={Users} title="Ancora nessun cliente" description="Chi entra a tariffa non serve registrarlo; abbonati, aziende e chi lascia le chiavi sì."
              action={<BottoneScrittura variant="outline" onClick={() => setNuovo(true)}>Nuovo cliente</BottoneScrittura>} />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Veicoli</TableHead><TableHead>Posti</TableHead><TableHead>Prossima scadenza</TableHead>
            <TableHead numerica>Insoluto</TableHead><TableHead>Ultimo accesso</TableHead></TableRow></TableHeader>
          <TableBody>{visibili.map((c) => (
            <TableRow key={c.cliente_id}>
              <TableCell><Link to={`/garage/clienti/${c.cliente_id}`} className="font-medium text-foreground hover:text-primary-testo">{c.nome}</Link>
                <span className="block text-xs text-muted-foreground">{c.codice} · {c.tipo === 'azienda' ? 'Azienda' : 'Privato'}{c.telefono ? ` · ${c.telefono}` : ''}</span></TableCell>
              <TableCell className="font-mono text-sm">{c.targhe ?? '—'}</TableCell>
              <TableCell>{c.posti ?? (c.contratti_attivi ? 'a rotazione' : '—')}</TableCell>
              <TableCell>{fmtData(c.prossima_scadenza)}</TableCell>
              <TableCell numerica>{Number(c.insoluto) > 0 ? <Badge tone="danger">{fmtEuro(c.insoluto)}</Badge> : '—'}</TableCell>
              <TableCell>{c.dentro ? <Badge tone="info">Dentro</Badge> : c.ultimo_accesso ? fmtGiornoOra(c.ultimo_accesso) : '—'}</TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      <ClienteDialog open={nuovo} onOpenChange={setNuovo} />
    </div>
  )
}

// ── Scheda del cliente ──────────────────────────────────────────────────
export function ClienteGaragePage() {
  return <ConStruttura><Cliente_ /></ConStruttura>
}

function Cliente_() {
  const { id } = useParams<{ id: string }>()
  const { isManager } = useAuth()
  const { data: k, isLoading } = useRiga<Cliente>('gar_clienti', id)
  const { data: riep } = useRiga<ClienteRiepilogo>('gar_clienti_riepilogo', id, '*', 'cliente_id')
  const [modifica, setModifica] = useState(false)
  const salva = useSalva('gar_clienti', ['gar_clienti_riepilogo'])
  if (isLoading) return <Skeleton className="h-96" />
  if (!k) return <EmptyState icon={Users} filtrato title="Cliente non trovato" description="Potrebbe essere stato eliminato." />
  return (
    <div>
      <PageHeader title={k.nome} briciole={[{ label: 'Clienti e veicoli', to: '/garage/clienti' }, { label: k.nome }]}
        description={`${k.codice} · ${k.tipo === 'azienda' ? 'Azienda' : 'Privato'}${k.attivo ? '' : ' · archiviato'}`}
        numeri={[
          { etichetta: 'veicoli', valore: riep?.veicoli ?? 0 },
          { etichetta: 'contratti in corso', valore: riep?.contratti_attivi ?? 0 },
          { etichetta: 'da pagare', valore: fmtEuro(Number(riep?.da_pagare ?? 0) + Number(riep?.insoluto ?? 0)) },
        ]}
        actions={<><Button variant="outline" onClick={() => setModifica(true)}><Pencil className="h-4 w-4" /> Modifica</Button>
          {isManager && <Button variant="ghost" onClick={() => salva.mutate({ id: k.id, values: { attivo: !k.attivo } }, { onSuccess: () => toast.success(k.attivo ? 'Cliente archiviato' : 'Cliente riattivato'), onError: (e) => toast.error(messaggioErrore(e)) })}>
            {k.attivo ? 'Archivia' : 'Riattiva'}</Button>}</>} />
      <ClienteDialog key={`${k.id}-${k.updated_at}`} open={modifica} onOpenChange={setModifica} cliente={k} />
      <Tabs defaultValue="veicoli">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="veicoli">Veicoli</TabsTrigger><TabsTrigger value="contratti">Contratti</TabsTrigger><TabsTrigger value="autorizzati">Accessi autorizzati</TabsTrigger>
          <TabsTrigger value="pagamenti">Pagamenti</TabsTrigger><TabsTrigger value="accessi">Ingressi</TabsTrigger><TabsTrigger value="altro">Prenotazioni e servizi</TabsTrigger>
          <TabsTrigger value="profilo">Anagrafica</TabsTrigger><TabsTrigger value="documenti">Documenti</TabsTrigger>
        </TabsList>
        <TabsContent value="veicoli"><Veicoli cliente={k} /></TabsContent>
        <TabsContent value="contratti"><ContrattiCliente cliente={k} /></TabsContent>
        <TabsContent value="autorizzati"><Autorizzati cliente={k} /></TabsContent>
        <TabsContent value="pagamenti"><Pagamenti cliente={k} /></TabsContent>
        <TabsContent value="accessi"><Ingressi cliente={k} /></TabsContent>
        <TabsContent value="altro"><Altro cliente={k} /></TabsContent>
        <TabsContent value="profilo"><Profilo cliente={k} /></TabsContent>
        <TabsContent value="documenti"><Card className="p-5">
          <AllegatiSection entita="gar_clienti" entitaId={k.id} categorie={['contratto', 'documento cliente', 'documento veicolo', 'assicurazione', 'delega', 'autorizzazione', 'verbale', 'ricevuta']} />
        </Card></TabsContent>
      </Tabs>
    </div>
  )
}

function Profilo({ cliente: k }: { cliente: Cliente }) {
  const voce = (l: string, v: string | null) => <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">{l}</dt><dd className="text-right text-foreground">{v || '—'}</dd></div>
  return (
    <Card className="max-w-2xl p-5">
      <dl className="divide-y divide-border text-sm">
        {voce('Codice fiscale', k.codice_fiscale)}{voce('Partita IVA', k.partita_iva)}{voce('Telefono', k.telefono)}{voce('Email', k.email)}{voce('Indirizzo', k.indirizzo)}{voce('Note', k.note)}
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">Comunicazioni, attività e fatture del cliente sono nella sua scheda del CRM:{' '}
        {k.contatto_id ? <Link className="text-foreground underline underline-offset-2" to={`/contatti/${k.contatto_id}`}><UserRound className="mr-1 inline h-3.5 w-3.5" />contatto</Link>
          : k.organizzazione_id ? <Link className="text-foreground underline underline-offset-2" to={`/organizzazioni/${k.organizzazione_id}`}><Building2 className="mr-1 inline h-3.5 w-3.5" />organizzazione</Link> : 'non collegata'}.
        Gli avvisi automatici (scadenze, solleciti, prenotazioni, veicolo pronto) partono per email; SMS e app sono predisposti.</p>
    </Card>
  )
}

function Veicoli({ cliente }: { cliente: Cliente }) {
  const { data: veicoli = [], isLoading } = useElenco<Veicolo>('gar_veicoli', { filtri: { cliente_id: cliente.id }, ordine: [{ colonna: 'targa' }] })
  const [aperto, setAperto] = useState<Veicolo | 'nuovo' | null>(null)
  const oggi = oggiIso()
  return (
    <div>
      <div className="mb-3 flex justify-end"><BottoneScrittura variant="outline" onClick={() => setAperto('nuovo')}><Plus className="h-4 w-4" /> Aggiungi un veicolo</BottoneScrittura></div>
      {isLoading ? <Skeleton className="h-32" /> : veicoli.length === 0 ? (
        <EmptyState icon={Car} title="Nessun veicolo" description="Un cliente può avere più veicoli: l'abbonamento vale per quello indicato o per tutti."
          action={<BottoneScrittura variant="outline" onClick={() => setAperto('nuovo')}>Aggiungi un veicolo</BottoneScrittura>} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{veicoli.map((v) => (
          <li key={v.id}><Card className="flex h-full flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-mono text-title text-foreground">{v.targa}</p>
                <p className="text-sm text-muted-foreground">{[v.marca, v.modello, v.colore].filter(Boolean).join(' · ') || 'Marca e modello non indicati'}</p></div>
              <div className="flex gap-1"><FotoDialog entita="gar_veicoli" entitaId={v.id} titolo={`Veicolo ${v.targa}`} categorie={['foto', 'libretto', 'assicurazione', 'delega']} />
                <Button size="sm" variant="ghost" aria-label={`Modifica ${v.targa}`} onClick={() => setAperto(v)}><Pencil className="h-3.5 w-3.5" /></Button></div>
            </div>
            <p className="text-sm text-foreground">{VEICOLO_TIPO[v.tipo]}{v.alimentazione ? ` · ${ALIMENTAZIONE[v.alimentazione]}` : ''}{v.cilindrata ? ` · ${v.cilindrata} cc` : ''}
              {v.lunghezza_m ? ` · ${String(v.lunghezza_m).replace('.', ',')}×${String(v.larghezza_m ?? '?').replace('.', ',')}×${String(v.altezza_m ?? '?').replace('.', ',')} m` : ''}{v.peso_kg ? ` · ${v.peso_kg} kg` : ''}</p>
            {(v.proprietario || v.utilizzatore) && <p className="text-sm text-muted-foreground">{v.proprietario ? `Proprietario: ${v.proprietario}` : ''}{v.utilizzatore ? ` · Utilizzatore: ${v.utilizzatore}` : ''}</p>}
            {v.assicurazione && <p className="text-sm text-muted-foreground">Assicurazione: {v.assicurazione}{v.assicurazione_scadenza ? <> fino al {fmtData(v.assicurazione_scadenza)} {v.assicurazione_scadenza < oggi && <Badge tone="danger">scaduta</Badge>}</> : ''}</p>}
            {v.note && <p className="text-sm text-muted-foreground">{v.note}</p>}
          </Card></li>))}</ul>
      )}
      {aperto && <VeicoloDialog key={aperto === 'nuovo' ? 'nuovo' : aperto.id} open onOpenChange={(o) => !o && setAperto(null)} clienteId={cliente.id} veicolo={aperto === 'nuovo' ? null : aperto} />}
    </div>
  )
}

function ContrattiCliente({ cliente }: { cliente: Cliente }) {
  const { isManager } = useAuth()
  const { data: contratti = [], isLoading } = useElenco<Contratto>('gar_contratti', { filtri: { cliente_id: cliente.id }, ordine: [{ colonna: 'inizio', crescente: false }] })
  const { data: posti = [] } = useElenco<PostoStato>('gar_posti_stato', { select: 'posto_id, codice' })
  const { data: veicoli = [] } = useElenco<Veicolo>('gar_veicoli', { filtri: { cliente_id: cliente.id } })
  const [nuovo, setNuovo] = useState(false)
  return (
    <div>
      {isManager && <div className="mb-3 flex justify-end"><BottoneScrittura variant="outline" onClick={() => setNuovo(true)}><Plus className="h-4 w-4" /> Nuovo contratto</BottoneScrittura></div>}
      {isLoading ? <Skeleton className="h-32" /> : contratti.length === 0 ? (
        <EmptyState icon={KeyRound} title="Nessun contratto" description="Abbonamenti, posti riservati, custodia e noleggio del posto: li stipula la direzione."
          action={isManager ? <BottoneScrittura variant="outline" onClick={() => setNuovo(true)}>Nuovo contratto</BottoneScrittura> : undefined} filtrato={!isManager} />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Contratto</TableHead><TableHead>Posto</TableHead><TableHead>Veicolo</TableHead><TableHead>Periodo</TableHead><TableHead numerica>Canone</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
          <TableBody>{contratti.map((c) => (
            <TableRow key={c.id}>
              <TableCell><Link className="font-medium text-foreground hover:text-primary-testo" to={`/garage/contratti?id=${c.id}`}>{c.codice}</Link><span className="block text-xs text-muted-foreground">{CONTRATTO_TIPO[c.tipo]}</span></TableCell>
              <TableCell>{posti.find((p) => p.posto_id === c.posto_id)?.codice ?? 'A rotazione'}</TableCell>
              <TableCell className="font-mono">{veicoli.find((v) => v.id === c.veicolo_id)?.targa ?? 'Tutti'}</TableCell>
              <TableCell>{fmtData(c.inizio)} – {c.recesso_il ? `${fmtData(c.recesso_il)} (recesso)` : c.fine ? fmtData(c.fine) : 'indeterminato'}{c.rinnovo_automatico && <span className="block text-xs text-muted-foreground">rinnovo automatico</span>}</TableCell>
              <TableCell numerica>{fmtEuro(c.canone)}<span className="block text-xs text-muted-foreground">{PERIODICITA[c.periodicita].toLowerCase()}</span></TableCell>
              <TableCell><Badge tone={CONTRATTO_STATO[c.stato].tone}>{CONTRATTO_STATO[c.stato].label}</Badge></TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      {isManager && <ContrattoDialog open={nuovo} onOpenChange={setNuovo} clienteId={cliente.id} />}
    </div>
  )
}

function Autorizzati({ cliente }: { cliente: Cliente }) {
  const { data: aut = [], isLoading } = useElenco<Autorizzazione>('gar_autorizzazioni', { filtri: { cliente_id: cliente.id }, ordine: [{ colonna: 'created_at' }] })
  const { data: veicoli = [] } = useElenco<Veicolo>('gar_veicoli', { filtri: { cliente_id: cliente.id } })
  const salva = useSalva('gar_autorizzazioni')
  const [aperta, setAperta] = useState<Autorizzazione | 'nuova' | null>(null)
  const oggi = oggiIso()
  return (
    <div>
      <div className="mb-3 flex justify-end"><BottoneScrittura variant="outline" onClick={() => setAperta('nuova')}><Plus className="h-4 w-4" /> Autorizza un accesso</BottoneScrittura></div>
      {isLoading ? <Skeleton className="h-32" /> : aut.length === 0 ? (
        <EmptyState icon={KeyRound} title="Nessun accesso autorizzato" description="Delegati, familiari, dipendenti e ospiti che possono entrare con il titolo del cliente, anche solo in certe ore."
          action={<BottoneScrittura variant="outline" onClick={() => setAperta('nuova')}>Autorizza un accesso</BottoneScrittura>} />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Chi</TableHead><TableHead>Veicolo</TableHead><TableHead>Quando</TableHead><TableHead>Livello</TableHead><TableHead>Validità</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>{aut.map((a) => {
            const valida = a.attiva && a.dal <= oggi && (!a.al || a.al >= oggi)
            return (
              <TableRow key={a.id}>
                <TableCell className="text-foreground">{a.persona ?? '—'}<span className="block text-xs text-muted-foreground">{AUTORIZZAZIONE_TIPO[a.tipo]}{a.codice ? ` · ${a.codice}` : ''}{a.convenzione_id ? ' · convenzione' : ''}</span></TableCell>
                <TableCell className="font-mono">{veicoli.find((v) => v.id === a.veicolo_id)?.targa ?? a.targa ?? 'Qualsiasi'}</TableCell>
                <TableCell className="text-sm">{testoFasce(a.fasce)}</TableCell>
                <TableCell className="text-sm">{LIVELLO[a.livello]}</TableCell>
                <TableCell>{valida ? <Badge tone="success">Valida</Badge> : <Badge tone="neutral">{a.attiva ? (a.dal > oggi ? 'Non ancora' : 'Scaduta') : 'Revocata'}</Badge>}
                  <span className="block text-xs text-muted-foreground">dal {fmtData(a.dal)}{a.al ? ` al ${fmtData(a.al)}` : ''}</span></TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <Button size="sm" variant="ghost" aria-label="Modifica" onClick={() => setAperta(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: a.id, values: { attiva: !a.attiva } }, { onSuccess: () => toast.success(a.attiva ? 'Autorizzazione revocata' : 'Autorizzazione riattivata'), onError: (e) => toast.error(messaggioErrore(e)) })}>
                    {a.attiva ? 'Revoca' : 'Riattiva'}</Button>
                </TableCell>
              </TableRow>
            )
          })}</TableBody>
        </Table></Card>
      )}
      {aperta && <AutorizzazioneDialog key={aperta === 'nuova' ? 'nuova' : aperta.id} open onOpenChange={(o) => !o && setAperta(null)} clienteId={cliente.id}
        convenzioneId={aperta === 'nuova' ? null : aperta.convenzione_id} autorizzazione={aperta === 'nuova' ? null : aperta} />}
    </div>
  )
}

/** Incasso di una rata: metodo e conferma. */
export function IncassaRata({ rata }: { rata: Rata }) {
  const [metodo, setMetodo] = useState<Metodo>('pos')
  const incassa = useAzione('gar_incassa_rata', [...TABELLE_CONTRATTO, 'gar_clienti_riepilogo'])
  return (
    <span className="inline-flex items-center gap-1.5">
      <Select value={metodo} onValueChange={(v) => setMetodo(v as Metodo)}>
        <SelectTrigger className="h-8 w-28" aria-label={`Metodo per ${rata.descrizione}`}><SelectValue /></SelectTrigger>
        <SelectContent>{METODI.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
      </Select>
      <BottoneScrittura size="sm" variant="outline" disabled={incassa.isPending} onClick={() => incassa.mutate({ p_rata: rata.id, p_metodo: metodo }, {
        onSuccess: () => toast.success(`${fmtEuro(rata.importo)} incassati`), onError: (e) => toast.error(messaggioErrore(e)) })}>Incassa</BottoneScrittura>
    </span>
  )
}

function Pagamenti({ cliente }: { cliente: Cliente }) {
  const { data: rate = [], isLoading } = useElenco<Rata>('gar_rate', { filtri: { cliente_id: cliente.id }, ordine: [{ colonna: 'scadenza', crescente: false }], limite: 60 })
  const { data: soste = [] } = useElenco<Sosta>('gar_soste', { filtri: { cliente_id: cliente.id, stato: 'da_pagare' } })
  return (
    <div className="space-y-4">
      {soste.length > 0 && <Card className="p-4"><h3 className="mb-2 text-title text-foreground">Soste da incassare</h3>
        <ul className="divide-y divide-border text-sm">{soste.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-3 py-2"><span className="font-mono">{s.targa}</span>
          <span className="text-muted-foreground">{fmtGiornoOra(s.uscita_at)} · {durata(s.minuti)}</span><span className="ml-auto tabular-nums text-foreground">{fmtEuro(s.importo)}</span>
          <Button asChild size="sm"><Link to={`/garage/incassi?conto=${s.conto_id}`}>Incassa</Link></Button></li>)}</ul></Card>}
      {isLoading ? <Skeleton className="h-32" /> : rate.length === 0 ? (
        <EmptyState icon={KeyRound} filtrato title="Nessun canone" description="Le rate nascono dai contratti, a ogni periodo." />
      ) : (
        <Card className="overflow-x-auto"><Table>
          <TableHeader><TableRow><TableHead>Periodo</TableHead><TableHead>Scadenza</TableHead><TableHead numerica>Importo</TableHead><TableHead>Stato</TableHead><TableHead><span className="sr-only">Azioni</span></TableHead></TableRow></TableHeader>
          <TableBody>{rate.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-foreground">{r.descrizione}</TableCell><TableCell>{fmtData(r.scadenza)}</TableCell><TableCell numerica>{fmtEuro(r.importo)}</TableCell>
              <TableCell><Badge tone={RATA_STATO[r.stato].tone}>{RATA_STATO[r.stato].label}</Badge>{r.pagata_il && <span className="block text-xs text-muted-foreground">il {fmtData(r.pagata_il)}</span>}</TableCell>
              <TableCell className="text-right">{['da_pagare', 'insoluta'].includes(r.stato) && <IncassaRata rata={r} />}</TableCell>
            </TableRow>))}</TableBody>
        </Table></Card>
      )}
      <p className="text-xs text-muted-foreground">Ricevute e fatture si emettono dal conto in cassa; i pagamenti online e l'addebito ricorrente sono predisposti.</p>
    </div>
  )
}

function Ingressi({ cliente }: { cliente: Cliente }) {
  const { data: soste = [], isLoading } = useElenco<Sosta>('gar_soste', { filtri: { cliente_id: cliente.id }, ordine: [{ colonna: 'ingresso_at', crescente: false }], limite: 50 })
  if (isLoading) return <Skeleton className="h-32" />
  if (soste.length === 0) return <EmptyState icon={Car} filtrato title="Nessun ingresso" description="Gli ingressi dei veicoli del cliente compaiono qui." />
  return (
    <Card className="overflow-x-auto"><Table>
      <TableHeader><TableRow><TableHead>Targa</TableHead><TableHead>Ingresso</TableHead><TableHead>Uscita</TableHead><TableHead>Permanenza</TableHead><TableHead numerica>Importo</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
      <TableBody>{soste.map((s) => (
        <TableRow key={s.id}><TableCell className="font-mono">{s.targa}</TableCell><TableCell>{fmtGiornoOra(s.ingresso_at)}</TableCell><TableCell>{s.uscita_at ? fmtGiornoOra(s.uscita_at) : '—'}</TableCell>
          <TableCell>{durata(s.minuti)}</TableCell><TableCell numerica>{s.importo != null ? fmtEuro(s.importo) : '—'}</TableCell>
          <TableCell><Badge tone={SOSTA_STATO[s.stato].tone}>{SOSTA_STATO[s.stato].label}</Badge></TableCell></TableRow>))}</TableBody>
    </Table></Card>
  )
}

function Altro({ cliente }: { cliente: Cliente }) {
  const f = { filtri: { cliente_id: cliente.id }, limite: 20 }
  const { data: pren = [] } = useElenco<Prenotazione>('gar_prenotazioni', { ...f, ordine: [{ colonna: 'ingresso', crescente: false }] })
  const { data: chiavi = [] } = useElenco<Chiave>('gar_chiavi', { ...f, ordine: [{ colonna: 'created_at', crescente: false }] })
  const { data: gomme = [] } = useElenco<Pneumatici>('gar_pneumatici', { ...f, ordine: [{ colonna: 'data_deposito', crescente: false }] })
  const { data: danni = [] } = useElenco<Danno>('gar_danni', { ...f, ordine: [{ colonna: 'rilevato_at', crescente: false }] })
  const { data: servizi = [] } = useElenco<Servizio>('gar_servizi', { ...f, ordine: [{ colonna: 'created_at', crescente: false }] })
  const blocco = (titolo: string, to: string, righe: [string, string, { label: string; tone: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'serie' }][]) => (
    <Card className="p-4">
      <h3 className="mb-2 flex items-center justify-between text-title text-foreground">{titolo}<Button asChild variant="link" size="sm" className="px-0"><Link to={to}>Apri</Link></Button></h3>
      {righe.length === 0 ? <p className="text-sm text-muted-foreground">Niente.</p> : (
        <ul className="divide-y divide-border text-sm">{righe.map(([a, b, st], i) => <li key={i} className="flex items-center gap-3 py-1.5"><span className="min-w-0 flex-1 truncate text-foreground">{a}</span>
          <span className="text-muted-foreground">{b}</span><Badge tone={st.tone}>{st.label}</Badge></li>)}</ul>)}
    </Card>
  )
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {blocco('Prenotazioni', '/garage/prenotazioni', pren.map((p) => [`${p.codice} · ${p.targa ?? ''}`, fmtGiornoOra(p.ingresso), PRENOTAZIONE_STATO[p.stato]]))}
      {blocco('Chiavi in custodia', '/garage/chiavi', chiavi.map((c) => [`Chiave ${c.numero} · ${c.targa ?? ''}`, c.armadietto ?? '', CHIAVE_STATO[c.stato]]))}
      {blocco('Servizi', '/garage/servizi', servizi.map((s) => [`${s.descrizione ?? ''} · ${s.targa ?? ''}`, fmtEuro(s.prezzo), SERVIZIO_STATO[s.stato]]))}
      {blocco('Deposito gomme', '/garage/pneumatici', gomme.map((g) => [`${g.codice} · ${STAGIONE[g.stagione]} ${g.misura ?? ''}`, g.posizione ?? '', PNEUMATICI_STATO[g.stato]]))}
      {blocco('Danni e anomalie', '/garage/danni', danni.map((d) => [`${d.codice} · ${d.descrizione}`, fmtData(d.rilevato_at), DANNO_TIPO[d.tipo]]))}
    </div>
  )
}
