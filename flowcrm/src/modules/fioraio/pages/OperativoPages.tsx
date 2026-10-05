/**
 * Il lavoro di ogni giorno del fiorista: cruscotto del negozio (§27),
 * laboratorio con le commesse di produzione (§22), giro delle consegne (§8),
 * agenda (§21).
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarDays, ChevronLeft, ChevronRight, Check, Flower2, MapPin, Play, Plus, Scissors, Truck, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'
import { useElenco, useRpc, useSalva, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { ConNegozio } from '@/modules/fioraio/componenti/ConNegozio'
import { NuovoOrdineDialog } from '@/modules/fioraio/dialogs/NuovoOrdineDialog'
import { useCatalogoFioraio, useImpostazioni, nomePersona, TABELLE_ORDINE, type Consegna, type Materiale, type Ordine, type Produzione, type RigaOrdine } from '@/modules/fioraio/queries'
import { AGENDA_TIPO, CONSEGNA_STATO, PRODUZIONE_STATO, fmtData, fmtEuro, fmtGiornoOra, fmtNumero, fmtOra, isoLocale, oggiIso, piuGiorni } from '@/modules/fioraio/stati'

type VoceAgenda = Database['public']['Functions']['fior_agenda']['Returns'][number]
interface Cruscotto {
  ordini_oggi: number; da_confermare: number; da_preparare: number; in_ritardo: number; consegne_oggi: number; consegne_fatte_oggi: number; ritiri_oggi: number
  ordini_online: number; fatturato_oggi: number; fatturato_mese: number; margine_mese: number | null; incassi_oggi: number; sotto_scorta: number; in_scadenza: number
  sprechi_mese: number; eventi: { id: string; titolo: string; inizio: string; tipo: string | null }[]; personale: { nome: string; composizioni: number; consegne: number }[]
}

// ── Cruscotto ───────────────────────────────────────────────────────────
export function NegozioPage() {
  return <ConNegozio><Negozio_ /></ConNegozio>
}

function Negozio_() {
  const { impostazioni } = useImpostazioni()
  useDalVivo(['fior_ordini', 'fior_produzione', 'fior_consegne'], [['fond-rpc']])
  const { data: c, isLoading } = useRpc<Cruscotto>('fior_cruscotto', {}, { intervallo: 60_000 })
  const oggi = oggiIso()
  const { data: agenda = [] } = useRpc<VoceAgenda[]>('fior_agenda', { p_dal: oggi, p_al: oggi })
  const [nuovo, setNuovo] = useState(false)
  const n = (v: number | undefined) => (isLoading ? undefined : v ?? 0)
  const avvisi: [number | undefined, string, string][] = [
    [c?.da_confermare, 'ordini da confermare', '/fioraio/ordini?vista=ricevuto'],
    [c?.ordini_online, 'ordini arrivati dai canali online', '/fioraio/ordini?vista=ricevuto'],
    [c?.in_ritardo, 'composizioni in ritardo', '/fioraio/produzione'],
    [c?.in_scadenza, 'lotti di fiori a fine vita entro due giorni', '/fioraio/magazzino'],
    [c?.sotto_scorta, 'articoli sotto la scorta minima', '/fioraio/magazzino'],
  ]
  const aperti = avvisi.filter(([v]) => Number(v) > 0)

  return (
    <div>
      <PageHeader title={impostazioni?.negozio ? `Oggi · ${impostazioni.negozio}` : 'Oggi in negozio'} description={`Ordini, laboratorio e consegne del ${fmtData(oggi)}.`}
        numeri={[
          { etichetta: 'ordini per oggi', valore: n(c?.ordini_oggi), inCaricamento: isLoading },
          { etichetta: 'da preparare', valore: n(c?.da_preparare), inCaricamento: isLoading },
          { etichetta: 'consegne da fare', valore: n(c?.consegne_oggi), inCaricamento: isLoading },
          { etichetta: 'incassato oggi', valore: isLoading ? undefined : fmtEuro(c?.incassi_oggi ?? 0), inCaricamento: isLoading },
        ]}
        actions={<><Button asChild variant="outline"><Link to="/fioraio/banco">Banco</Link></Button>
          <BottoneScrittura onClick={() => setNuovo(true)}><Plus className="h-4 w-4" /> Nuovo ordine</BottoneScrittura></>} />
      <NuovoOrdineDialog open={nuovo} onOpenChange={setNuovo} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><CalendarDays className="h-4 w-4 text-primary-testo" /> La giornata</h2>
          {agenda.length === 0 ? <p className="py-2 text-sm text-muted-foreground">Niente in agenda per oggi.</p> : (
            <ul className="divide-y divide-border text-sm">{agenda.map((v, i) => {
              const t = AGENDA_TIPO[v.tipo] ?? AGENDA_TIPO.evento
              return (
                <li key={`${v.riferimento}-${v.tipo}-${i}`}><Link to={v.percorso} className="flex items-center gap-3 py-2 hover:text-primary-testo">
                  <span className="w-12 tabular-nums text-muted-foreground">{fmtOra(v.quando)}</span>
                  <Badge tone={t.tone}>{t.label}</Badge>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium text-foreground">{v.titolo}</span>
                    <span className="block truncate text-xs text-muted-foreground">{v.dettaglio}</span></span>
                </Link></li>
              )
            })}</ul>
          )}
          <Button asChild variant="link" className="mt-1 px-0"><Link to="/fioraio/agenda">Tutta l'agenda</Link></Button>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><TriangleAlert className="h-4 w-4 text-primary-testo" /> Da sistemare</h2>
          {isLoading ? <Skeleton className="h-24" /> : aperti.length === 0 ? <p className="py-2 text-sm text-muted-foreground">Niente in sospeso.</p> : (
            <ul className="space-y-1 text-sm">{aperti.map(([v, l, to]) => (
              <li key={l}><Link to={to} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"><span className="text-foreground">{l}</span><Badge tone="warning">{v}</Badge></Link></li>))}</ul>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            <div><dt className="text-muted-foreground">Fatturato del mese</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtEuro(c?.fatturato_mese ?? 0)}</dd></div>
            {c?.margine_mese != null && <div><dt className="text-muted-foreground">Margine del mese</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtEuro(c.margine_mese)}</dd></div>}
            <div><dt className="text-muted-foreground">Sprechi del mese</dt><dd data-slot="kpi" className="text-title text-foreground">{fmtEuro(c?.sprechi_mese ?? 0)}</dd></div>
            <div><dt className="text-muted-foreground">Ritiri di oggi</dt><dd data-slot="kpi" className="text-title text-foreground">{c?.ritiri_oggi ?? 0}</dd></div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><Flower2 className="h-4 w-4 text-primary-testo" /> Eventi in arrivo</h2>
          {(c?.eventi.length ?? 0) === 0 ? <p className="py-2 text-sm text-muted-foreground">Nessun matrimonio o evento nei prossimi 14 giorni.</p> : (
            <ul className="divide-y divide-border text-sm">{c!.eventi.map((e) => (
              <li key={e.id}><Link to="/fioraio/eventi" className="flex items-center gap-3 py-2 hover:text-primary-testo">
                <span className="w-32 text-muted-foreground">{fmtGiornoOra(e.inizio)}</span><span className="min-w-0 flex-1 truncate font-medium text-foreground">{e.titolo}</span>
                {e.tipo && <Badge tone="success">{AGENDA_TIPO[e.tipo]?.label ?? e.tipo}</Badge>}</Link></li>))}</ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-title text-foreground">Il lavoro del mese</h2>
          {(c?.personale.length ?? 0) === 0 ? <p className="py-2 text-sm text-muted-foreground">Ancora nessuna composizione o consegna registrata questo mese.</p> : (
            <ul className="divide-y divide-border text-sm">{c!.personale.map((p) => (
              <li key={p.nome} className="flex items-center justify-between gap-3 py-2"><span className="font-medium text-foreground">{p.nome}</span>
                <span className="tabular-nums text-muted-foreground">{p.composizioni} composizioni · {p.consegne} consegne</span></li>))}</ul>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── Laboratorio ─────────────────────────────────────────────────────────
export function ProduzionePage() {
  return <ConNegozio><Produzione_ /></ConNegozio>
}

function Produzione_() {
  useDalVivo(['fior_produzione', 'fior_ordini'])
  const { persone } = useCatalogoFioraio()
  const { data: commesse = [], isLoading } = useElenco<Produzione>('fior_produzione', { filtri: { stato: ['da_fare', 'in_corso'] }, ordine: [{ colonna: 'pronta_entro' }] })
  const { data: fatte = [] } = useElenco<Produzione>('fior_produzione', { filtri: { stato: 'pronta' }, tra: { colonna: 'fine_at', da: `${oggiIso()}T00:00` }, ordine: [{ colonna: 'fine_at', crescente: false }] })
  const ids = commesse.map((c) => c.riga_id)
  const { data: righe = [] } = useElenco<RigaOrdine>('fior_ordini_righe', { filtri: { id: ids }, abilitato: ids.length > 0 })
  const { data: materiali = [] } = useElenco<Materiale & { mag_articoli: { descrizione: string; unita_misura: string } | null }>('fior_righe_materiali', {
    filtri: { riga_id: ids }, select: '*, mag_articoli(descrizione, unita_misura)', abilitato: ids.length > 0 })
  const { data: ordini = [] } = useElenco<Ordine>('fior_ordini', { filtri: { id: [...new Set(commesse.map((c) => c.ordine_id))] }, abilitato: commesse.length > 0 })
  const salva = useSalva('fior_produzione', TABELLE_ORDINE)
  const adesso = new Date()

  return (
    <div>
      <PageHeader title="Laboratorio" description="Le composizioni da preparare, in ordine di consegna: finita la composizione, fiori e materiali escono dal magazzino."
        numeri={[
          { etichetta: 'da fare', valore: isLoading ? undefined : commesse.filter((c) => c.stato === 'da_fare').length, inCaricamento: isLoading },
          { etichetta: 'in corso', valore: isLoading ? undefined : commesse.filter((c) => c.stato === 'in_corso').length, inCaricamento: isLoading },
          { etichetta: 'pronte oggi', valore: fatte.length },
        ]} />
      {isLoading ? <Skeleton className="h-64" /> : commesse.length === 0 ? (
        <EmptyState icon={Scissors} filtrato title="Niente da preparare" description="Le commesse nascono quando un ordine con composizioni viene confermato." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {commesse.map((c) => {
            const riga = righe.find((r) => r.id === c.riga_id)
            const ordine = ordini.find((o) => o.id === c.ordine_id)
            const richiesta = (riga?.richiesta ?? {}) as Record<string, string>
            const miei = materiali.filter((m) => m.riga_id === c.riga_id)
            const tardi = c.pronta_entro && new Date(c.pronta_entro) < adesso
            const st = PRODUZIONE_STATO[c.stato]
            return (
              <li key={c.id}><Card className={cn('flex h-full flex-col gap-3 p-4', tardi && 'border-destructive')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><h3 className="text-title text-foreground">{c.descrizione} × {fmtNumero(c.quantita)}</h3>
                    <p className="text-sm text-muted-foreground">{ordine ? <Link to={`/fioraio/ordini/${ordine.id}`} className="hover:text-primary-testo">{ordine.codice} · {ordine.committente_nome}</Link> : c.codice}</p></div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <p className={cn('text-sm', tardi ? 'text-destructive-testo' : 'text-foreground')}>Pronta entro {fmtGiornoOra(c.pronta_entro)}{c.minuti_previsti ? ` · ${c.minuti_previsti} minuti` : ''}</p>
                {Object.keys(richiesta).length > 0 && (
                  <dl className="space-y-0.5 text-sm">{Object.entries(richiesta).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex gap-2"><dt className="w-24 shrink-0 capitalize text-muted-foreground">{k}</dt><dd className="text-foreground">{v}</dd></div>))}</dl>
                )}
                {miei.length > 0 && <p className="text-sm text-muted-foreground">Materiali: {miei.map((m) => `${fmtNumero(Number(m.quantita) * Number(c.quantita), 1)} ${m.mag_articoli?.unita_misura ?? ''} ${m.mag_articoli?.descrizione ?? ''}`).join(', ')}</p>}
                {riga?.tipo === 'composizione' && <p className="text-xs text-muted-foreground">Fiori e materiali dalla ricetta della composizione.</p>}
                {ordine?.messaggio && <p className="rounded-md bg-muted px-3 py-2 text-sm italic text-foreground">«{ordine.messaggio}»{ordine.biglietto_stampato ? '' : ' — biglietto da stampare'}</p>}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{nomePersona(persone, c.operatore_id) ?? 'Non assegnata'}</span>
                  {c.stato === 'da_fare'
                    ? <BottoneScrittura size="sm" variant="outline" onClick={() => salva.mutate({ id: c.id, values: { stato: 'in_corso' } }, { onError: (e) => toast.error(messaggioErrore(e)) })}><Play className="h-3.5 w-3.5" /> Inizia</BottoneScrittura>
                    : <BottoneScrittura size="sm" variant="outline" onClick={() => salva.mutate({ id: c.id, values: { stato: 'pronta' } }, {
                        onSuccess: () => toast.success(`${c.descrizione}: pronta, materiali scaricati`), onError: (e) => toast.error(messaggioErrore(e)) })}><Check className="h-3.5 w-3.5" /> Pronta</BottoneScrittura>}
                </div>
              </Card></li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Consegne ────────────────────────────────────────────────────────────
export function ConsegnePage() {
  return <ConNegozio><Consegne_ /></ConNegozio>
}

function Consegne_() {
  const [giorno, setGiorno] = useState(oggiIso())
  useDalVivo(['fior_consegne', 'fior_ordini'])
  const { persone, zone } = useCatalogoFioraio()
  const { data: consegne = [], isLoading } = useElenco<Consegna>('fior_consegne', { filtri: { data: giorno }, ordine: [{ colonna: 'sequenza' }, { colonna: 'fascia' }] })
  const { data: ordini = [] } = useElenco<Ordine>('fior_ordini', { filtri: { id: consegne.map((c) => c.ordine_id) }, abilitato: consegne.length > 0 })
  const salva = useSalva('fior_consegne', TABELLE_ORDINE)
  const [esito, setEsito] = useState<Record<string, string>>({})
  const [ricevuta, setRicevuta] = useState<Record<string, string>>({})
  const zona = (id: string | null) => zone.find((z) => z.id === id)
  // Il giro: prima per zona (nell'ordine scelto dal negozio), poi per CAP e fascia.
  const giro = [...consegne].sort((a, b) => {
    const oa = ordini.find((o) => o.id === a.ordine_id), ob = ordini.find((o) => o.id === b.ordine_id)
    return (a.sequenza ?? 999) - (b.sequenza ?? 999) || (zona(a.zona_id)?.ordine ?? 99) - (zona(b.zona_id)?.ordine ?? 99)
      || (oa?.cap ?? '').localeCompare(ob?.cap ?? '') || (a.fascia ?? '').localeCompare(b.fascia ?? '')
  })
  const cambia = (c: Consegna, values: Partial<Consegna>, ok?: string) => salva.mutate({ id: c.id, values }, {
    onSuccess: () => ok && toast.success(ok), onError: (e) => toast.error(messaggioErrore(e)) })

  return (
    <div>
      <PageHeader title="Consegne" description="Il giro del giorno, ordinato per zona: chi consegna, a chi, e com'è andata."
        numeri={[
          { etichetta: 'da fare', valore: isLoading ? undefined : consegne.filter((c) => !['consegnata', 'fallita'].includes(c.stato)).length, inCaricamento: isLoading },
          { etichetta: 'consegnate', valore: isLoading ? undefined : consegne.filter((c) => c.stato === 'consegnata').length, inCaricamento: isLoading },
          { etichetta: 'non riuscite', valore: isLoading ? undefined : consegne.filter((c) => c.stato === 'fallita').length, inCaricamento: isLoading },
        ]} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Giorno precedente" onClick={() => setGiorno(piuGiorni(giorno, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <Input type="date" className="w-44" value={giorno} onChange={(e) => e.target.value && setGiorno(e.target.value)} aria-label="Giorno" />
        <Button variant="outline" size="icon" aria-label="Giorno successivo" onClick={() => setGiorno(piuGiorni(giorno, 1))}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={() => setGiorno(oggiIso())}>Oggi</Button>
      </div>
      {isLoading ? <Skeleton className="h-64" /> : giro.length === 0 ? (
        <EmptyState icon={Truck} filtrato title="Nessuna consegna in questo giorno" description="Le consegne entrano qui quando si conferma un ordine a domicilio." />
      ) : (
        <ol className="space-y-3">
          {giro.map((c, i) => {
            const o = ordini.find((x) => x.id === c.ordine_id)
            const st = CONSEGNA_STATO[c.stato]
            const indirizzo = [o?.indirizzo, o?.cap, o?.citta].filter(Boolean).join(', ')
            const aperta = !['consegnata', 'fallita'].includes(c.stato)
            return (
              <li key={c.id}><Card className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium tabular-nums text-foreground" aria-label={`Tappa ${i + 1}`}>{i + 1}</span>
                  <div className="min-w-56 flex-1">
                    <p className="font-medium text-foreground">{o?.destinatario_nome ?? '…'}{o?.destinatario_telefono ? <span className="font-normal text-muted-foreground"> · {o.destinatario_telefono}</span> : null}</p>
                    <p className="text-sm text-foreground">{indirizzo}</p>
                    <p className="text-xs text-muted-foreground">{zona(c.zona_id)?.nome ?? 'Fuori zona'}{c.fascia ? ` · ${c.fascia}` : ''}{o?.indicazioni ? ` · ${o.indicazioni}` : ''} ·{' '}
                      {o && <Link to={`/fioraio/ordini/${o.id}`} className="underline underline-offset-2">{o.codice}</Link>}{o && o.stato !== 'pronto' && aperta && c.stato !== 'in_consegna' ? ' · ordine non ancora pronto' : ''}</p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                  {indirizzo && <Button asChild size="sm" variant="ghost"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(indirizzo)}`} target="_blank" rel="noreferrer"><MapPin className="h-3.5 w-3.5" /> Mappa</a></Button>}
                </div>
                {aperta && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                    <Select value={c.autista_id ?? 'nessuno'} onValueChange={(v) => cambia(c, { autista_id: v === 'nessuno' ? null : v })}>
                      <SelectTrigger className="h-9 w-48" aria-label={`Chi consegna a ${o?.destinatario_nome ?? ''}`}><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="nessuno">Da assegnare</SelectItem>{persone.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} {p.cognome ?? ''}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className="h-9 w-32" placeholder="Mezzo" defaultValue={c.veicolo ?? ''} aria-label="Mezzo" onBlur={(e) => e.target.value !== (c.veicolo ?? '') && cambia(c, { veicolo: e.target.value || null })} />
                    <Input className="h-9 w-20" type="number" min={1} placeholder="N." defaultValue={c.sequenza ?? ''} aria-label="Posizione nel giro" onBlur={(e) => { const n = Number(e.target.value) || null; if (n !== c.sequenza) cambia(c, { sequenza: n }) }} />
                    {c.stato !== 'in_consegna' ? (
                      <BottoneScrittura size="sm" variant="outline" disabled={o?.stato !== 'pronto'} onClick={() => cambia(c, { stato: 'in_consegna' }, 'In consegna')}><Truck className="h-3.5 w-3.5" /> Parti</BottoneScrittura>
                    ) : <>
                      <Input className="h-9 min-w-40 flex-1" placeholder="Ricevuta da (nome o firma)" value={ricevuta[c.id] ?? ''} onChange={(e) => setRicevuta({ ...ricevuta, [c.id]: e.target.value })} aria-label="Ricevuta da" />
                      <BottoneScrittura size="sm" variant="outline" onClick={() => cambia(c, { stato: 'consegnata', ricevuta_da: ricevuta[c.id]?.trim() || null }, 'Consegnata')}><Check className="h-3.5 w-3.5" /> Consegnata</BottoneScrittura>
                      <Input className="h-9 min-w-40 flex-1" placeholder="Se non riesce: assente, indirizzo errato…" value={esito[c.id] ?? ''} onChange={(e) => setEsito({ ...esito, [c.id]: e.target.value })} aria-label="Motivo della mancata consegna" />
                      <Button size="sm" variant="ghost" disabled={!esito[c.id]?.trim()} onClick={() => cambia(c, { stato: 'fallita', esito: esito[c.id].trim() }, 'Segnata come non riuscita')}>Non riuscita</Button>
                    </>}
                  </div>
                )}
                {!aperta && <p className="mt-2 text-xs text-muted-foreground">{c.stato === 'consegnata' ? `Consegnata ${fmtGiornoOra(c.consegnata_at)}${c.ricevuta_da ? ` a ${c.ricevuta_da}` : ''}` : `Non riuscita: ${c.esito}`}
                  {nomePersona(persone, c.autista_id) ? ` · ${nomePersona(persone, c.autista_id)}` : ''}. Foto e firma si caricano nella scheda dell'ordine.</p>}
              </Card></li>
            )
          })}
        </ol>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Il giro segue le zone e i CAP; il numero di tappa si può cambiare a mano. Il calcolo del percorso su strada è predisposto.</p>
    </div>
  )
}

// ── Agenda ──────────────────────────────────────────────────────────────
export function AgendaFioraioPage() {
  return <ConNegozio><Agenda_ /></ConNegozio>
}

function Agenda_() {
  const [dal, setDal] = useState(oggiIso())
  const al = piuGiorni(dal, 13)
  const { data: voci = [], isLoading } = useRpc<VoceAgenda[]>('fior_agenda', { p_dal: dal, p_al: al })
  const giorni = [...new Set(voci.map((v) => isoLocale(new Date(v.quando))))]
  return (
    <div>
      <PageHeader title="Agenda" description="Composizioni da preparare, consegne, ritiri, matrimoni, funerali, allestimenti, abbonamenti e arrivi dai fornitori."
        numeri={[{ etichetta: 'impegni in due settimane', valore: isLoading ? undefined : voci.length, inCaricamento: isLoading }]} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Due settimane prima" onClick={() => setDal(piuGiorni(dal, -14))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" aria-label="Due settimane dopo" onClick={() => setDal(piuGiorni(dal, 14))}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={() => setDal(oggiIso())}>Da oggi</Button>
        <span className="text-sm text-muted-foreground">{fmtData(dal)} – {fmtData(al)}</span>
      </div>
      {isLoading ? <Skeleton className="h-64" /> : voci.length === 0 ? (
        <EmptyState icon={CalendarDays} filtrato title="Agenda libera" description="In queste due settimane non c'è nulla in programma." />
      ) : giorni.map((g) => (
        <section key={g} className="mb-5" aria-label={fmtData(g)}>
          <h2 className={cn('mb-2 text-label uppercase', g === oggiIso() ? 'text-primary-testo' : 'text-muted-foreground')}>
            {new Date(`${g}T12:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          <Card className="divide-y divide-border">
            {voci.filter((v) => isoLocale(new Date(v.quando)) === g).map((v, i) => {
              const t = AGENDA_TIPO[v.tipo] ?? AGENDA_TIPO.evento
              return (
                <Link key={`${v.riferimento}-${v.tipo}-${i}`} to={v.percorso} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50">
                  <span className="w-12 tabular-nums text-muted-foreground">{fmtOra(v.quando)}</span>
                  <Badge tone={t.tone}>{t.label}</Badge>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium text-foreground">{v.titolo}</span>
                    <span className="block truncate text-xs text-muted-foreground">{v.dettaglio}</span></span>
                </Link>
              )
            })}
          </Card>
        </section>
      ))}
    </div>
  )
}
