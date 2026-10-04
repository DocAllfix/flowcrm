/**
 * ClientiPage — CRM del locale (Ristorante §16-18, §36-37; Bar §14-15):
 * chi torna, quanto spende, cosa preferisce, allergie e ricorrenze sempre
 * sott'occhio; fidelizzazione, feedback e campagne.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ExternalLink, HeartHandshake, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { CercaContatto, type ContattoScelto } from '@/components/condivisi/CercaContatto'
import { FidelizzazioneSezione } from '@/components/condivisi/FidelizzazioneSezione'
import { FeedbackSezione } from '@/components/condivisi/FeedbackSezione'
import { CampagneSezione } from '@/components/condivisi/CampagneSezione'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import { useElenco, useRpc, useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { ALLERGENI, PRENOTAZIONE_STATO, etichettaAllergene, fmtData, fmtEuro } from '@/modules/fb/stati'

type Riepilogo = Database['public']['Views']['fb_clienti_riepilogo']['Row']
type Contatto = Pick<Tables<'contatti'>, 'id' | 'nome' | 'cognome' | 'telefono' | 'email' | 'consenso_marketing'>
type ClienteFb = Tables<'fb_clienti'>
interface Profilo {
  visite: number; prima_visita: string | null; ultima_visita: string | null; spesa_totale: number; ticket_medio: number | null
  visite_al_mese: number | null; prenotazioni: number; no_show: number; piatti_preferiti: string[]; vini_preferiti: string[]
  feedback: { tipo: string; nps: number | null; testo: string | null; stato: string; ricevuto_at: string }[]
}

export function ClientiPage() {
  const { modulo } = useFb()
  return (
    <ConLocale>
      <PageHeader title="Clienti e fidelity" description="Storico, preferenze e allergie dei clienti; tessere, gift card e coupon; recensioni e reclami; campagne." />
      <Tabs defaultValue="clienti">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="clienti">Clienti</TabsTrigger>
          <TabsTrigger value="fidelity">Fidelity</TabsTrigger>
          <TabsTrigger value="feedback">Recensioni e reclami</TabsTrigger>
          <TabsTrigger value="campagne">Campagne</TabsTrigger>
        </TabsList>
        <TabsContent value="clienti"><Clienti /></TabsContent>
        <TabsContent value="fidelity"><FidelizzazioneSezione modulo={modulo} /></TabsContent>
        <TabsContent value="feedback"><FeedbackSezione modulo={modulo} canali={['sala', 'banco', 'telefono', 'email', 'QR al tavolo', 'recensione online']} /></TabsContent>
        <TabsContent value="campagne"><CampagneSezione modulo={modulo} /></TabsContent>
      </Tabs>
    </ConLocale>
  )
}

function Clienti() {
  const { modulo, base } = useFb()
  const { data: riepilogo = [] } = useElenco<Riepilogo>('fb_clienti_riepilogo', { filtri: { modulo }, ordine: [{ colonna: 'ultima_visita', crescente: false }], limite: 500 })
  const ids = riepilogo.map((r) => r.contatto_id).filter(Boolean) as string[]
  const { data: contatti = [] } = useElenco<Contatto>('contatti', { filtri: { id: ids }, select: 'id, nome, cognome, telefono, email, consenso_marketing', abilitato: ids.length > 0 })
  const [sceltoId, setSceltoId] = useState<string | null>(null)
  const [cerca, setCerca] = useState('')
  const [nome, setNome] = useState('')
  const [trovato, setTrovato] = useState<ContattoScelto | null>(null)
  const contatto = (id: string | null) => contatti.find((c) => c.id === id)
  const elenco = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return riepilogo.filter((r) => { const c = contatto(r.contatto_id); return !q || `${c?.nome} ${c?.cognome} ${c?.telefono}`.toLowerCase().includes(q) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riepilogo, contatti, cerca])

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Filtra i clienti abituali…" className="pl-9" aria-label="Filtra clienti" /></div>
          <div className="min-w-56 flex-1"><CercaContatto id="cl-cerca" valore={nome} contattoId={trovato?.id ?? null} segnaposto="Apri un cliente dall'anagrafica…"
            onTesto={(v) => { setNome(v); setTrovato(null) }} onScegli={(c) => { setTrovato(c); setNome(`${c.nome} ${c.cognome ?? ''}`.trim()); setSceltoId(c.id) }} /></div>
        </div>
        {elenco.length === 0 ? <EmptyState icon={HeartHandshake} title="Ancora nessun cliente identificato" description="Collega il cliente alla prenotazione o al conto: qui comparirà con visite e spesa."
          action={<Button asChild variant="outline"><Link to={`${base}/prenotazioni`}>Vai alle prenotazioni</Link></Button>} /> : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-right">Visite</TableHead><TableHead className="text-right">Ultima</TableHead><TableHead className="text-right">Spesa</TableHead><TableHead className="text-right">Ticket medio</TableHead></TableRow></TableHeader>
              <TableBody>
                {elenco.map((r) => {
                  const c = contatto(r.contatto_id)
                  return (
                    <TableRow key={r.contatto_id} onActivate={() => setSceltoId(r.contatto_id)} className={cn(r.contatto_id === sceltoId && 'bg-muted')}>
                      <TableCell><span className="font-medium text-foreground">{c ? `${c.nome} ${c.cognome ?? ''}` : '—'}</span><span className="block text-xs text-muted-foreground">{c?.telefono ?? c?.email ?? ''}</span></TableCell>
                      <TableCell numerica>{r.visite}</TableCell>
                      <TableCell numerica>{fmtData(r.ultima_visita)}</TableCell>
                      <TableCell numerica>{fmtEuro(r.spesa_totale)}</TableCell>
                      <TableCell numerica>{fmtEuro(r.ticket_medio)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
      {sceltoId ? <SchedaCliente contattoId={sceltoId} /> : <EmptyState icon={HeartHandshake} title="Scegli un cliente" description="Visite, spesa, piatti e vini preferiti, allergie, ricorrenze, recensioni." />}
    </div>
  )
}

function SchedaCliente({ contattoId }: { contattoId: string }) {
  const { data: profilo } = useRpc<Profilo>('fb_cliente_profilo', { p_contatto: contattoId })
  const { data: contatti = [] } = useElenco<Contatto>('contatti', { filtri: { id: contattoId }, select: 'id, nome, cognome, telefono, email, consenso_marketing' })
  const { data: schede = [] } = useElenco<ClienteFb>('fb_clienti', { filtri: { contatto_id: contattoId } })
  const salva = useSalva('fb_clienti', ['fond-rpc'])
  const { localeId } = useFb()
  const { data: tavoli = [] } = useElenco<Tables<'fb_tavoli'>>('fb_tavoli', { filtri: { locale_id: localeId ?? undefined, attivo: true }, ordine: [{ colonna: 'numero' }] })
  const { data: visite = [] } = useElenco<Tables<'fb_comande'>>('fb_comande', { filtri: { contatto_id: contattoId, stato: 'chiusa' },
    ordine: [{ colonna: 'chiusa_at', crescente: false }], limite: 6 })
  const contiVisite = visite.map((v) => v.conto_id).filter(Boolean) as string[]
  const { data: saldiVisite = [] } = useElenco<Database['public']['Views']['conti_saldi']['Row']>('conti_saldi', { filtri: { conto_id: contiVisite }, abilitato: contiVisite.length > 0 })
  const { data: prenotazioni = [] } = useElenco<Tables<'fb_prenotazioni'>>('fb_prenotazioni', { filtri: { contatto_id: contattoId },
    ordine: [{ colonna: 'inizio', crescente: false }], limite: 6 })
  const c = contatti[0]
  const s = schede[0]
  const [f, setF] = useState({ preferenze: '', alimentari: '', intolleranze: '', compleanno: '', anniversario: '', note: '', tavolo: '' })
  const [allergie, setAllergie] = useState<string[]>([])
  useEffect(() => {
    setF({ preferenze: s?.preferenze ?? '', alimentari: s?.preferenze_alimentari ?? '', intolleranze: s?.intolleranze ?? '', compleanno: s?.compleanno ?? '',
      anniversario: s?.anniversario ?? '', note: s?.note ?? '', tavolo: s?.tavolo_preferito_id ?? '' })
    setAllergie(s?.allergie ?? [])
  }, [s, contattoId])

  async function salvaPreferenze() {
    try {
      await salva.mutateAsync({ id: s?.id, values: { ...(s ? {} : { contatto_id: contattoId }), preferenze: f.preferenze || null, preferenze_alimentari: f.alimentari || null,
        intolleranze: f.intolleranze || null, compleanno: f.compleanno || null, anniversario: f.anniversario || null, note: f.note || null, allergie,
        tavolo_preferito_id: f.tavolo || null } })
      toast.success('Preferenze salvate')
    } catch (e) { toast.error(messaggioErrore(e)) }
  }

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-title text-foreground">{c ? `${c.nome} ${c.cognome ?? ''}` : 'Cliente'}</h2>
          <p className="text-sm text-muted-foreground">{[c?.telefono, c?.email].filter(Boolean).join(' · ')}</p>
          {c && <Badge tone={c.consenso_marketing ? 'success' : 'neutral'} className="mt-1">{c.consenso_marketing ? 'Riceve promozioni' : 'Senza consenso alle promozioni'}</Badge>}
        </div>
        <Link to={`/contatti/${contattoId}`} className="flex items-center gap-1 text-sm text-primary-testo hover:underline">Anagrafica <ExternalLink className="h-3.5 w-3.5" /></Link>
      </div>
      {profilo && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">Visite</dt><dd data-slot="kpi" className="text-title">{profilo.visite}</dd></div>
          <div><dt className="text-muted-foreground">Spesa totale</dt><dd data-slot="kpi" className="text-title">{fmtEuro(profilo.spesa_totale)}</dd></div>
          <div><dt className="text-muted-foreground">Ticket medio</dt><dd data-slot="kpi" className="text-title">{fmtEuro(profilo.ticket_medio)}</dd></div>
          <div><dt className="text-muted-foreground">Ultima visita</dt><dd className="text-foreground">{fmtData(profilo.ultima_visita)}</dd></div>
          <div><dt className="text-muted-foreground">Frequenza</dt><dd className="text-foreground">{profilo.visite_al_mese != null ? `${profilo.visite_al_mese} al mese` : '—'}</dd></div>
          <div><dt className="text-muted-foreground">Prenotazioni · no-show</dt><dd className="text-foreground">{profilo.prenotazioni} · {profilo.no_show}</dd></div>
        </dl>
      )}
      {profilo && (profilo.piatti_preferiti.length > 0 || profilo.vini_preferiti.length > 0) && (
        <div className="space-y-1 text-sm">
          {profilo.piatti_preferiti.length > 0 && <p><span className="text-muted-foreground">Piatti preferiti:</span> {profilo.piatti_preferiti.join(', ')}</p>}
          {profilo.vini_preferiti.length > 0 && <p><span className="text-muted-foreground">Vini preferiti:</span> {profilo.vini_preferiti.join(', ')}</p>}
        </div>
      )}
      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="text-label uppercase text-muted-foreground">Preferenze e allergie</h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Allergie dichiarate">
          {ALLERGENI.map((a) => <button key={a.valore} type="button" aria-pressed={allergie.includes(a.valore)}
            onClick={() => setAllergie(allergie.includes(a.valore) ? allergie.filter((x) => x !== a.valore) : [...allergie, a.valore])}
            className={cn('rounded-full border px-2.5 py-0.5 text-xs', allergie.includes(a.valore) ? 'border-destructive bg-destructive-tenue text-destructive-testo' : 'border-border text-muted-foreground')}>{a.label}</button>)}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="sc-int">Intolleranze</Label><Input id="sc-int" value={f.intolleranze} onChange={(e) => setF({ ...f, intolleranze: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="sc-al">Preferenze alimentari</Label><Input id="sc-al" value={f.alimentari} onChange={(e) => setF({ ...f, alimentari: e.target.value })} placeholder="Vegetariano, senza glutine…" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sc-pr">Preferenze</Label><Input id="sc-pr" value={f.preferenze} onChange={(e) => setF({ ...f, preferenze: e.target.value })} placeholder="Tavolo vicino alla finestra, acqua frizzante, caffè macchiato…" /></div>
          <div className="space-y-1.5"><Label htmlFor="sc-cp">Compleanno</Label><Input id="sc-cp" type="date" value={f.compleanno} onChange={(e) => setF({ ...f, compleanno: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="sc-an">Anniversario</Label><Input id="sc-an" type="date" value={f.anniversario} onChange={(e) => setF({ ...f, anniversario: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Tavolo preferito</Label>
            <Select value={f.tavolo || 'nessuno'} onValueChange={(v) => setF({ ...f, tavolo: v === 'nessuno' ? '' : v })}>
              <SelectTrigger aria-label="Tavolo preferito"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">Nessuno</SelectItem>{tavoli.map((t) => <SelectItem key={t.id} value={t.id}>Tavolo {t.numero}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label htmlFor="sc-no">Note</Label><Input id="sc-no" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        </div>
        <BottoneScrittura onClick={salvaPreferenze}>Salva</BottoneScrittura>
        {allergie.length > 0 && <p className="text-xs text-muted-foreground">Allergie: {allergie.map(etichettaAllergene).join(', ')} — compaiono al personale in prenotazione e in comanda.</p>}
      </div>
      {(visite.length > 0 || prenotazioni.length > 0) && (
        <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
          <div>
            <h3 className="mb-1 text-label uppercase text-muted-foreground">Ultime visite</h3>
            <ul className="space-y-0.5">{visite.map((v) => (
              <li key={v.id} className="flex justify-between gap-2"><span>{fmtData(v.chiusa_at)}{v.coperti ? ` · ${v.coperti} coperti` : ''}</span>
                <span className="tabular-nums">{fmtEuro(saldiVisite.find((x) => x.conto_id === v.conto_id)?.totale)}</span></li>))}</ul>
          </div>
          <div>
            <h3 className="mb-1 text-label uppercase text-muted-foreground">Ultime prenotazioni</h3>
            <ul className="space-y-0.5">{prenotazioni.map((p) => (
              <li key={p.id} className="flex justify-between gap-2"><span>{fmtData(p.inizio)} · {p.persone} persone{p.occasione ? ` · ${p.occasione}` : ''}</span>
                <Badge tone={(PRENOTAZIONE_STATO[p.stato] ?? PRENOTAZIONE_STATO.richiesta).tone}>{(PRENOTAZIONE_STATO[p.stato] ?? PRENOTAZIONE_STATO.richiesta).label}</Badge></li>))}</ul>
          </div>
        </div>
      )}
      {profilo && profilo.feedback.length > 0 && (
        <div className="space-y-1 border-t border-border pt-4 text-sm">
          <h3 className="text-label uppercase text-muted-foreground">Recensioni e reclami</h3>
          {profilo.feedback.map((x, i) => <p key={i}><Badge tone={x.tipo === 'reclamo' ? 'danger' : 'neutral'}>{x.tipo}</Badge> {x.nps != null ? `NPS ${x.nps} · ` : ''}{x.testo ?? ''}</p>)}
        </div>
      )}
    </Card>
  )
}
