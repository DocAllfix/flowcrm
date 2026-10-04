/**
 * Pagine di gestione del locale che usano le sezioni condivise delle
 * fondamenta (magazzino, controlli, personale, eventi), con le aggiunte del
 * motore food & beverage: sprechi e richiamo dei lotti (Ristorante §20,
 * §27), fabbisogno di personale dai coperti previsti (§30).
 */
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Search, Trash } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { MagazzinoSezione } from '@/components/condivisi/MagazzinoSezione'
import { ControlliSezione } from '@/components/condivisi/ControlliSezione'
import { TurniSezione } from '@/components/condivisi/TurniSezione'
import { EventiSezione } from '@/components/condivisi/EventiSezione'
import type { Tables } from '@/lib/supabase'
import { useElenco, useInserisci, useRpc, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale, SelettoreLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { ALLERGENI, SPRECO_CAUSALE, etichettaAllergene, fmtEuro, fmtGiornoOra, oggiIso } from '@/modules/fb/stati'
import { useCatalogo } from '@/modules/fb/queries'

type LottoStato = Database['public']['Views']['mag_lotti_stato']['Row']
interface Richiamo { servito_at: string; locale: string; comanda_numero: number; canale: string; tavolo: string | null; prodotto: string
  quantita_lotto: number; cliente: string | null; recapito: string | null; comanda_id: string; riga_id: string }
interface Fabbisogno { reparto: string; coperti_previsti: number; persone_suggerite: number; persone_pianificate: number; differenza: number }

export function MagazzinoFbPage() {
  const { modulo } = useFb()
  return (
    <ConLocale>
      <PageHeader title="Magazzino" description="Materie prime, semilavorati, bevande, vini, packaging: lotti, scadenze, ordini, inventari." actions={<SelettoreLocale />} />
      <MagazzinoSezione modulo="fb" moduli={['fb', modulo]} extra={[
        { valore: 'sprechi', etichetta: 'Sprechi', contenuto: <Sprechi /> },
        { valore: 'richiamo', etichetta: 'Tracciabilità e richiamo', contenuto: <RichiamoLotto /> },
      ]} />
    </ConLocale>
  )
}

function Sprechi() {
  const { localeId, modulo } = useFb()
  const { prodotti } = useCatalogo()
  const { data: articoli = [] } = useElenco<Tables<'mag_articoli'>>('mag_articoli', { filtri: { modulo: ['fb', modulo], attivo: true }, ordine: [{ colonna: 'descrizione' }] })
  const { data: sprechi = [] } = useElenco<Tables<'fb_sprechi'>>('fb_sprechi', { ordine: [{ colonna: 'registrato_at', crescente: false }], limite: 100 })
  const registra = useInserisci('fb_sprechi', ['mag_giacenze', 'mag_lotti_stato', 'mag_movimenti'])
  const [f, setF] = useState({ causale: 'deterioramento', cosa: '', quantita: '', note: '' })

  async function invia(e: FormEvent) {
    e.preventDefault()
    const [tipo, id] = f.cosa.split(':')
    const q = Number(f.quantita.replace(',', '.'))
    if (!id || !(q > 0)) { toast.error('Cosa e quanto'); return }
    try {
      await registra.mutateAsync({ modulo, locale_id: localeId, causale: f.causale, articolo_id: tipo === 'a' ? id : null, prodotto_id: tipo === 'p' ? id : null, quantita: q, note: f.note || null })
      setF({ ...f, quantita: '', note: '' }); toast.success('Spreco registrato e scaricato dal magazzino')
    } catch (err) { toast.error(messaggioErrore(err)) }
  }
  const nome = (s: Tables<'fb_sprechi'>) => s.articolo_id ? articoli.find((a) => a.id === s.articolo_id)?.descrizione : prodotti.find((p) => p.id === s.prodotto_id)?.nome
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={invia} className="flex flex-wrap items-end gap-3">
          <div className="w-52 space-y-1.5"><Label>Causale</Label><Select value={f.causale} onValueChange={(v) => setF({ ...f, causale: v })}><SelectTrigger aria-label="Causale"><SelectValue /></SelectTrigger>
            <SelectContent>{['scarto_preparazione', 'deterioramento', 'scadenza', 'errore_produzione', 'reso', 'omaggio', 'consumo_personale'].map((k) => <SelectItem key={k} value={k}>{SPRECO_CAUSALE[k]}</SelectItem>)}</SelectContent></Select></div>
          <div className="min-w-56 flex-1 space-y-1.5"><Label>Cosa</Label><Select value={f.cosa} onValueChange={(v) => setF({ ...f, cosa: v })}><SelectTrigger aria-label="Articolo o piatto"><SelectValue placeholder="Ingrediente o piatto…" /></SelectTrigger>
            <SelectContent>{prodotti.filter((p) => p.distinta_id || p.articolo_id).map((p) => <SelectItem key={p.id} value={`p:${p.id}`}>Piatto · {p.nome}</SelectItem>)}
              {articoli.map((a) => <SelectItem key={a.id} value={`a:${a.id}`}>{a.descrizione} ({a.unita_misura})</SelectItem>)}</SelectContent></Select></div>
          <div className="w-28 space-y-1.5"><Label htmlFor="sp-q">Quantità</Label><Input id="sp-q" inputMode="decimal" value={f.quantita} onChange={(e) => setF({ ...f, quantita: e.target.value })} /></div>
          <div className="min-w-40 flex-1 space-y-1.5"><Label htmlFor="sp-n">Note</Label><Input id="sp-n" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
          <BottoneScrittura type="submit"><Trash className="h-4 w-4" /> Registra</BottoneScrittura>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Piatti rifatti, annullati dopo la preparazione e omaggi si contano da soli dalle comande: li trovi nelle analisi.</p>
      </Card>
      {sprechi.length > 0 && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead className="text-right">Quando</TableHead><TableHead>Causale</TableHead><TableHead>Cosa</TableHead><TableHead className="text-right">Quantità</TableHead><TableHead className="text-right">Costo</TableHead></TableRow></TableHeader>
            <TableBody>{sprechi.map((s) => (
              <TableRow key={s.id}>
                <TableCell numerica>{fmtGiornoOra(s.registrato_at)}</TableCell><TableCell>{SPRECO_CAUSALE[s.causale] ?? s.causale}</TableCell>
                <TableCell className="text-foreground">{nome(s) ?? '—'}</TableCell><TableCell numerica>{Number(s.quantita)}</TableCell><TableCell numerica>{fmtEuro(s.costo)}</TableCell>
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function RichiamoLotto() {
  const { modulo } = useFb()
  const { data: lotti = [] } = useElenco<LottoStato>('mag_lotti_stato', { filtri: { modulo: ['fb', modulo] }, ordine: [{ colonna: 'data_ricevimento', crescente: false }] })
  const [lotto, setLotto] = useState('')
  const { data: righe = [], isFetching } = useRpc<Richiamo[]>('fb_richiamo_lotto', { p_lotto: lotto }, { abilitato: !!lotto })
  const piatti = Object.entries(righe.reduce<Record<string, number>>((a, r) => { a[r.prodotto] = (a[r.prodotto] ?? 0) + 1; return a }, {}))
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-72 flex-1 space-y-1.5"><Label>Lotto da rintracciare</Label>
          <Select value={lotto} onValueChange={setLotto}><SelectTrigger aria-label="Lotto"><SelectValue placeholder="Scegli il lotto…" /></SelectTrigger>
            <SelectContent>{lotti.map((l) => <SelectItem key={l.lotto_id!} value={l.lotto_id!}>{l.codice_lotto ?? 'senza codice'} · {l.descrizione} · ricevuto {l.data_ricevimento ? new Date(l.data_ricevimento).toLocaleDateString('it-IT') : '—'}</SelectItem>)}</SelectContent>
          </Select></div>
        <p className="w-full text-xs text-muted-foreground">Dal lotto ai piatti, alle comande e ai clienti da avvisare: lo scarico dal magazzino registra sempre la riga di comanda.</p>
      </Card>
      {lotto && !isFetching && righe.length === 0 && <EmptyState compatto icon={Search} title="Lotto non usato in vendita" description="Nessun piatto venduto con questo lotto." />}
      {righe.length > 0 && (
        <>
          <p className="flex flex-wrap items-center gap-1.5 text-sm"><span className="text-muted-foreground">Piatti coinvolti:</span>{piatti.map(([p, k]) => <Badge key={p} tone="warning">{p} × {k}</Badge>)}</p>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead className="text-right">Servito</TableHead><TableHead>Comanda</TableHead><TableHead>Piatto</TableHead><TableHead className="text-right">Quantità del lotto</TableHead><TableHead>Cliente e recapito</TableHead></TableRow></TableHeader>
              <TableBody>{righe.map((r) => (
                <TableRow key={r.riga_id}>
                  <TableCell numerica>{fmtGiornoOra(r.servito_at)}</TableCell>
                  <TableCell>{r.tavolo ? `Tavolo ${r.tavolo}` : r.canale} · n. {r.comanda_numero}</TableCell>
                  <TableCell className="text-foreground">{r.prodotto}</TableCell>
                  <TableCell numerica>{Number(r.quantita_lotto)}</TableCell>
                  <TableCell>{r.cliente ?? <span className="text-muted-foreground">Non identificato</span>}{r.recapito ? <span className="block text-xs text-muted-foreground">{r.recapito}</span> : null}</TableCell>
                </TableRow>))}</TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  )
}

export function ControlliFbPage() {
  const { modulo } = useFb()
  return (
    <ConLocale>
      <PageHeader title="HACCP e attrezzature" description="Autocontrollo (temperature, ricevimento, cottura e raffreddamento, pulizie, sanificazione, infestanti), manutenzioni e sicurezza." actions={<SelettoreLocale />} />
      <ControlliSezione modulo="fb" moduli={['fb', modulo]}
        categorieAsset={['Forni', 'Fornelli', 'Frigoriferi', 'Congelatori', 'Abbattitori', 'Lavastoviglie', 'Cappe', 'Macchine da caffè', 'Spillatori', 'Impianti', 'Attrezzature di cucina', 'Altro']} />
    </ConLocale>
  )
}

export function PersonaleFbPage() {
  const { modulo } = useFb()
  return (
    <ConLocale>
      <PageHeader title="Personale e turni" description="Turni di sala, cucina e bar; riposi, sostituzioni, ore previste ed effettive, fabbisogno dai coperti." actions={<SelettoreLocale />} />
      <FabbisognoCoperti />
      <TurniSezione modulo={modulo} reparti={['sala', 'cucina', 'bar', 'cassa', 'consegne']} />
    </ConLocale>
  )
}

function FabbisognoCoperti() {
  const { localeId } = useFb()
  const [giorno, setGiorno] = useState(oggiIso)
  const { data: righe = [] } = useRpc<Fabbisogno[]>('fb_fabbisogno_personale', { p_locale: localeId, p_giorno: giorno }, { abilitato: !!localeId })
  return (
    <Card className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
      <div className="space-y-1.5"><Label htmlFor="fc-g">Fabbisogno dai coperti del</Label><Input id="fc-g" type="date" className="w-40" value={giorno} onChange={(e) => setGiorno(e.target.value)} /></div>
      {righe.length > 0 && <span className="text-sm text-muted-foreground">{righe[0].coperti_previsti} coperti prenotati</span>}
      {righe.map((r) => (
        <span key={r.reparto} className="text-sm">
          <span className="capitalize text-foreground">{r.reparto}</span>: servono {r.persone_suggerite}, in turno {r.persone_pianificate}{' '}
          {r.differenza < 0 ? <Badge tone="warning">manca{r.differenza < -1 ? 'no' : ''} {-r.differenza}</Badge> : <Badge tone="success">coperto</Badge>}
        </span>
      ))}
    </Card>
  )
}

export function EventiFbPage() {
  const { modulo } = useFb()
  return (
    <ConLocale>
      <PageHeader title="Eventi e banqueting" description="Matrimoni, cene aziendali, compleanni, comunioni, degustazioni: menu, invitati e allergie, personale, preventivo e margine." actions={<SelettoreLocale />} />
      <EventiSezione modulo={modulo} etichettaAllergene={etichettaAllergene} allergeni={ALLERGENI}
        tipi={modulo === 'bar'
          ? ['Aperitivo', 'Festa', 'Compleanno', 'Laurea', 'Evento aziendale', 'Degustazione', 'Serata a tema']
          : ['Matrimonio', 'Cena aziendale', 'Compleanno', 'Comunione', 'Cresima', 'Degustazione', 'Festa', 'Conferenza', 'Evento privato']} />
    </ConLocale>
  )
}
