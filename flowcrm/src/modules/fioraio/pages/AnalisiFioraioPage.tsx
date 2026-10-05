/**
 * Analisi della direzione (documento Fioraio §26): indicatori commerciali,
 * di prodotto, operativi, di magazzino e degli eventi.
 */
import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { ManagerOnly } from '@/components/ManagerOnly'
import { useRpc } from '@/lib/queries/fondamenta'
import { ConNegozio } from '@/modules/fioraio/componenti/ConNegozio'
import { fmtEuro, fmtNumero, oggiIso, piuGiorni } from '@/modules/fioraio/stati'

type N = number | null
interface Kpi {
  commerciali: { fatturato: number; ordini: number; valore_medio: N; margine: number; online: number; clienti_attivi: number; clienti_nuovi: number; clienti_ricorrenti: number }
  prodotti: { articoli: { descrizione: string; quantita: number; ricavo: number }[]
    composizioni: { descrizione: string; quantita: number; ricavo: number; margine: number; margine_pct: N }[]
    bassa_rotazione: { descrizione: string; giacenza: number; valore: number }[] }
  operativi: { evasi: number; annullati: number; minuti_preparazione: N; pronte_in_tempo_pct: N; consegne: number; consegne_puntuali_pct: N; consegne_fallite: number; resi: number; resi_importo: number }
  magazzino: { valore_stock: number; sprechi: number; deterioramento: number; rotazione: N; sotto_scorta: number }
  eventi: { matrimoni: number; funerali: number; aziendali: number; ricavi: number; margine: number }
}
const pct = (v: N) => (v == null ? '—' : `${fmtNumero(v, 1)}%`)

export function AnalisiFioraioPage() {
  return <ManagerOnly><ConNegozio><Analisi_ /></ConNegozio></ManagerOnly>
}

function Analisi_() {
  const [dal, setDal] = useState(piuGiorni(oggiIso(), -29))
  const [al, setAl] = useState(oggiIso())
  const { data: k, isLoading } = useRpc<Kpi>('fior_kpi', { p_dal: dal, p_al: al })
  const voce = (l: string, v: string) => <div key={l} className="flex items-center justify-between py-1.5"><dt className="text-muted-foreground">{l}</dt><dd className="tabular-nums text-foreground">{v}</dd></div>
  return (
    <div>
      <PageHeader title="Analisi" description="Fatturato e margine, prodotti e composizioni, laboratorio e consegne, magazzino e sprechi, eventi."
        numeri={[
          { etichetta: 'fatturato', valore: k ? fmtEuro(k.commerciali.fatturato) : undefined, inCaricamento: isLoading },
          { etichetta: 'ordini evasi', valore: k?.commerciali.ordini, inCaricamento: isLoading },
          { etichetta: 'valore medio', valore: k ? fmtEuro(k.commerciali.valore_medio ?? 0) : undefined, inCaricamento: isLoading },
          { etichetta: 'sprechi', valore: k ? fmtEuro(k.magazzino.sprechi) : undefined, inCaricamento: isLoading },
        ]} />
      <Card className="mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label htmlFor="af-dal">Dal</Label><Input id="af-dal" type="date" value={dal} onChange={(e) => e.target.value && setDal(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="af-al">Al</Label><Input id="af-al" type="date" value={al} onChange={(e) => e.target.value && setAl(e.target.value)} /></div>
        {([['30 giorni', 29], ['90 giorni', 89], ['12 mesi', 364]] as const).map(([l, g]) => (
          <Button key={l} variant="ghost" onClick={() => { setDal(piuGiorni(oggiIso(), -g)); setAl(oggiIso()) }}>{l}</Button>))}
      </Card>
      {isLoading || !k ? <Skeleton className="h-96" /> : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Commerciali</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Fatturato', fmtEuro(k.commerciali.fatturato)), voce('Margine sulle vendite', fmtEuro(k.commerciali.margine)), voce('Ordini evasi', fmtNumero(k.commerciali.ordini)),
              voce('Valore medio dell\'ordine', k.commerciali.valore_medio != null ? fmtEuro(k.commerciali.valore_medio) : '—'), voce('Ordini dai canali online', fmtNumero(k.commerciali.online)),
              voce('Clienti attivi', fmtNumero(k.commerciali.clienti_attivi)), voce('Nuovi clienti', fmtNumero(k.commerciali.clienti_nuovi)), voce('Clienti ricorrenti', fmtNumero(k.commerciali.clienti_ricorrenti)),
            ]}</dl></Card>
          <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Laboratorio e consegne</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Tempo medio di preparazione', k.operativi.minuti_preparazione != null ? `${fmtNumero(k.operativi.minuti_preparazione)} minuti` : '—'),
              voce('Composizioni pronte in tempo', pct(k.operativi.pronte_in_tempo_pct)), voce('Consegne fatte', fmtNumero(k.operativi.consegne)),
              voce('Consegne puntuali', pct(k.operativi.consegne_puntuali_pct)), voce('Consegne non riuscite', fmtNumero(k.operativi.consegne_fallite)),
              voce('Ordini annullati', fmtNumero(k.operativi.annullati)), voce('Resi', `${fmtNumero(k.operativi.resi)} · ${fmtEuro(k.operativi.resi_importo)}`),
            ]}</dl></Card>
          <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Composizioni più vendute</h2>
            {k.prodotti.composizioni.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna composizione venduta nel periodo.</p> : (
              <div className="overflow-x-auto"><Table>
                <TableHeader><TableRow><TableHead>Composizione</TableHead><TableHead className="text-right">Vendute</TableHead><TableHead className="text-right">Ricavo</TableHead><TableHead className="text-right">Margine</TableHead></TableRow></TableHeader>
                <TableBody>{k.prodotti.composizioni.map((c) => <TableRow key={c.descrizione}><TableCell className="text-foreground">{c.descrizione}</TableCell><TableCell numerica>{fmtNumero(c.quantita)}</TableCell>
                  <TableCell numerica>{fmtEuro(c.ricavo)}</TableCell><TableCell numerica>{fmtEuro(c.margine)}<span className="block text-xs text-muted-foreground">{pct(c.margine_pct)}</span></TableCell></TableRow>)}</TableBody>
              </Table></div>)}</Card>
          <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Fiori e articoli più venduti</h2>
            {k.prodotti.articoli.length === 0 ? <p className="text-sm text-muted-foreground">Nessun articolo venduto nel periodo.</p> : (
              <div className="overflow-x-auto"><Table>
                <TableHeader><TableRow><TableHead>Articolo</TableHead><TableHead className="text-right">Quantità</TableHead><TableHead className="text-right">Ricavo</TableHead></TableRow></TableHeader>
                <TableBody>{k.prodotti.articoli.map((c) => <TableRow key={c.descrizione}><TableCell className="text-foreground">{c.descrizione}</TableCell><TableCell numerica>{fmtNumero(c.quantita, 1)}</TableCell><TableCell numerica>{fmtEuro(c.ricavo)}</TableCell></TableRow>)}</TableBody>
              </Table></div>)}</Card>
          <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Magazzino</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Valore dello stock', fmtEuro(k.magazzino.valore_stock)), voce('Costo degli sprechi', fmtEuro(k.magazzino.sprechi)), voce('di cui fiori deteriorati', fmtEuro(k.magazzino.deterioramento)),
              voce('Rotazione nel periodo', k.magazzino.rotazione != null ? `${fmtNumero(k.magazzino.rotazione, 2)} volte` : '—'), voce('Articoli sotto scorta', fmtNumero(k.magazzino.sotto_scorta)),
            ]}</dl>
            {k.prodotti.bassa_rotazione.length > 0 && <p className="mt-2 text-sm text-muted-foreground">Fermi da 30 giorni: {k.prodotti.bassa_rotazione.slice(0, 6).map((x) => `${x.descrizione} (${fmtEuro(x.valore)})`).join(', ')}.</p>}
          </Card>
          <Card className="p-5"><h2 className="mb-2 text-title text-foreground">Eventi</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Matrimoni', fmtNumero(k.eventi.matrimoni)), voce('Funerali e commemorazioni', fmtNumero(k.eventi.funerali)), voce('Eventi aziendali', fmtNumero(k.eventi.aziendali)),
              voce('Ricavi degli eventi', fmtEuro(k.eventi.ricavi)), voce('Margine degli eventi', fmtEuro(k.eventi.margine)),
            ]}</dl></Card>
        </div>
      )}
    </div>
  )
}
