/**
 * Pagine di gestione dell'hotel sulle sezioni condivise delle fondamenta:
 * magazzino con la dotazione del minibar (documento Hotel §22), impianti,
 * registri e sicurezza (§24, §42), personale e turni (§40).
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { MagazzinoSezione } from '@/components/condivisi/MagazzinoSezione'
import { ControlliSezione } from '@/components/condivisi/ControlliSezione'
import { TurniSezione } from '@/components/condivisi/TurniSezione'
import { useAuth } from '@/hooks/useAuth'
import type { Tables } from '@/lib/supabase'
import { useElenco, useInserisci, useElimina, messaggioErrore } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { useCatalogoHotel } from '@/modules/hotel/queries'
import { fmtEuro } from '@/modules/hotel/stati'

export function MagazzinoHotelPage() {
  return (
    <ConStruttura>
      <PageHeader title="Magazzino" description="Minibar, amenities, prodotti di pulizia e materiali: lotti, scadenze, ordini, inventari." actions={<SelettoreStruttura />} />
      <MagazzinoSezione modulo="hotel" moduli={['hotel']} extra={[{ valore: 'minibar', etichetta: 'Dotazione del minibar', contenuto: <Minibar /> }]} />
    </ConStruttura>
  )
}

function Minibar() {
  const { strutturaId } = useHotel()
  const { isManager } = useAuth()
  const { tipologie } = useCatalogoHotel(strutturaId)
  const { data: articoli = [] } = useElenco<Pick<Tables<'mag_articoli'>, 'id' | 'descrizione'>>('mag_articoli', { filtri: { modulo: 'hotel', attivo: true }, select: 'id, descrizione', ordine: [{ colonna: 'descrizione' }] })
  const { data: dotazioni = [] } = useElenco<Tables<'hotel_minibar_dotazioni'>>('hotel_minibar_dotazioni', { filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'ordine' }], abilitato: !!strutturaId })
  const salva = useInserisci('hotel_minibar_dotazioni', ['hotel_minibar_dotazioni'])
  const elimina = useElimina('hotel_minibar_dotazioni')
  const [f, setF] = useState({ articolo: '', tipologia: 'tutte', quantita: '2', prezzo: '' })
  return (
    <div className="space-y-4">
      {isManager && (
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1.5"><Label>Prodotto</Label>
              <Select value={f.articolo} onValueChange={(v) => setF({ ...f, articolo: v })}><SelectTrigger aria-label="Prodotto"><SelectValue placeholder="Dagli articoli del magazzino" /></SelectTrigger>
                <SelectContent>{articoli.map((a) => <SelectItem key={a.id} value={a.id}>{a.descrizione}</SelectItem>)}</SelectContent></Select></div>
            <div className="w-44 space-y-1.5"><Label>Camere</Label>
              <Select value={f.tipologia} onValueChange={(v) => setF({ ...f, tipologia: v })}><SelectTrigger aria-label="Tipologia"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="tutte">Tutte</SelectItem>{tipologie.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="w-24 space-y-1.5"><Label htmlFor="mb-q">Pezzi</Label><Input id="mb-q" type="number" min={1} value={f.quantita} onChange={(e) => setF({ ...f, quantita: e.target.value })} /></div>
            <div className="w-28 space-y-1.5"><Label htmlFor="mb-p">Prezzo (€)</Label><Input id="mb-p" inputMode="decimal" value={f.prezzo} onChange={(e) => setF({ ...f, prezzo: e.target.value })} /></div>
            <BottoneScrittura variant="outline" disabled={!f.articolo || !f.prezzo}
              onClick={() => salva.mutate({ struttura_id: strutturaId!, articolo_id: f.articolo, tipologia_id: f.tipologia === 'tutte' ? null : f.tipologia,
                quantita: Number(f.quantita) || 1, prezzo: Number(f.prezzo.replace(',', '.')), ordine: dotazioni.length }, {
                onSuccess: () => { toast.success('Nel minibar'); setF({ ...f, articolo: '', prezzo: '' }) },
                onError: (e) => toast.error(/23505/.test(JSON.stringify(e)) ? 'Già nella dotazione' : messaggioErrore(e)) })}>Aggiungi</BottoneScrittura>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">I minibar automatici (con sensore) sono predisposti; oggi i consumi si registrano dalla camera o dalla pulizia.</p>
        </Card>
      )}
      <Card className="overflow-x-auto">
        {dotazioni.length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">Dotazione vuota: crea gli articoli nel magazzino e aggiungili qui.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Prodotto</TableHead><TableHead>Camere</TableHead><TableHead className="text-right">Pezzi</TableHead><TableHead className="text-right">Prezzo</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{dotazioni.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-foreground">{articoli.find((a) => a.id === d.articolo_id)?.descrizione}</TableCell>
                <TableCell className="text-muted-foreground">{d.tipologia_id ? tipologie.find((t) => t.id === d.tipologia_id)?.nome : 'Tutte'}</TableCell>
                <TableCell numerica>{d.quantita}</TableCell><TableCell numerica>{fmtEuro(d.prezzo)}</TableCell>
                <TableCell className="text-right">{isManager && <Button size="sm" variant="ghost" onClick={() => elimina.mutate(d.id)}>Togli</Button>}</TableCell>
              </TableRow>))}</TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}

export function ControlliHotelPage() {
  return (
    <ConStruttura>
      <PageHeader title="Impianti, controlli e sicurezza" description="Facility management (impianti, ascensori, caldaie, piscina, antincendio), registri dei controlli, incidenti e non conformità."
        actions={<SelettoreStruttura />} />
      <ControlliSezione modulo="hotel" moduli={['hotel']}
        categorieAsset={['Climatizzazione', 'Ascensori', 'Caldaie', 'Piscina', 'Impianti elettrici', 'Antincendio', 'Cucina', 'SPA', 'Lavanderia', 'Arredi', 'Altro']} />
    </ConStruttura>
  )
}

export function PersonaleHotelPage() {
  return (
    <ConStruttura>
      <PageHeader title="Personale e turni" description="Ricevimento, piani, manutenzione, sala, cucina, bar e SPA: turni, presenze, ore e sostituzioni." actions={<SelettoreStruttura />} />
      <TurniSezione modulo="hotel" reparti={['ricevimento', 'concierge', 'piani', 'manutenzione', 'sala', 'cucina', 'bar', 'spa', 'direzione']} />
    </ConStruttura>
  )
}
