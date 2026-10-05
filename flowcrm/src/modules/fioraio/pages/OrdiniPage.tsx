/**
 * Ordini (documento Fioraio §6): elenco per stato e per giorno, con chi
 * ordina e chi riceve.
 */
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Flower2, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useElenco, useDalVivo } from '@/lib/queries/fondamenta'
import { ConNegozio } from '@/modules/fioraio/componenti/ConNegozio'
import { NuovoOrdineDialog } from '@/modules/fioraio/dialogs/NuovoOrdineDialog'
import type { Ordine } from '@/modules/fioraio/queries'
import { CANALE, MODALITA, OCCASIONE, ORDINE_STATO, fmtData, fmtEuro, oggiIso, piuGiorni } from '@/modules/fioraio/stati'

export function OrdiniPage() {
  return <ConNegozio><Ordini_ /></ConNegozio>
}

const VISTE = [
  { valore: 'aperti', label: 'Da evadere', stati: ['ricevuto', 'confermato', 'in_preparazione', 'pronto', 'in_consegna'] },
  { valore: 'ricevuto', label: 'Da confermare', stati: ['ricevuto'] },
  { valore: 'consegnato', label: 'Da incassare', stati: ['consegnato'] },
  { valore: 'chiuso', label: 'Chiusi', stati: ['chiuso'] },
  { valore: 'annullato', label: 'Annullati', stati: ['annullato'] },
] as const

function Ordini_() {
  const [params, setParams] = useSearchParams()
  const vista = VISTE.find((v) => v.valore === params.get('vista')) ?? VISTE[0]
  const [cerca, setCerca] = useState('')
  const [nuovo, setNuovo] = useState(false)
  useDalVivo(['fior_ordini'])
  const { data: ordini = [], isLoading } = useElenco<Ordine>('fior_ordini', {
    filtri: { stato: [...vista.stati] }, tra: ['chiuso', 'annullato'].includes(vista.valore) ? { colonna: 'data_richiesta', da: piuGiorni(oggiIso(), -90) } : undefined,
    ordine: [{ colonna: 'data_richiesta', crescente: !['chiuso', 'annullato'].includes(vista.valore) }, { colonna: 'ora_richiesta' }], limite: 300,
  })
  const { data: aperti = [] } = useElenco<Pick<Ordine, 'id' | 'stato' | 'data_richiesta'>>('fior_ordini', {
    filtri: { stato: ['ricevuto', 'confermato', 'in_preparazione', 'pronto', 'in_consegna', 'consegnato'] }, select: 'id, stato, data_richiesta' })
  const oggi = oggiIso()
  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return ordini.filter((o) => !q || `${o.codice} ${o.committente_nome} ${o.destinatario_nome ?? ''} ${o.indirizzo ?? ''}`.toLowerCase().includes(q))
  }, [ordini, cerca])

  return (
    <div>
      <PageHeader title="Ordini" description="Dal ricevimento alla chiusura: chi ordina, chi riceve, quando e dove."
        numeri={[
          { etichetta: 'per oggi', valore: aperti.filter((o) => o.data_richiesta === oggi && o.stato !== 'consegnato').length },
          { etichetta: 'da confermare', valore: aperti.filter((o) => o.stato === 'ricevuto').length },
          { etichetta: 'in lavorazione', valore: aperti.filter((o) => ['confermato', 'in_preparazione'].includes(o.stato)).length },
          { etichetta: 'da incassare', valore: aperti.filter((o) => o.stato === 'consegnato').length },
        ]}
        actions={<BottoneScrittura onClick={() => setNuovo(true)}><Plus className="h-4 w-4" /> Nuovo ordine</BottoneScrittura>} />
      <NuovoOrdineDialog open={nuovo} onOpenChange={setNuovo} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Codice, cliente, destinatario, via" className="pl-9" aria-label="Cerca ordine" />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtra per stato">
          {VISTE.map((v) => <Button key={v.valore} size="sm" variant={vista.valore === v.valore ? 'secondary' : 'ghost'} aria-pressed={vista.valore === v.valore}
            onClick={() => setParams({ vista: v.valore }, { replace: true })}>{v.label}</Button>)}
        </div>
      </div>

      {isLoading ? <Skeleton className="h-64" /> : visibili.length === 0 ? (
        <EmptyState icon={Flower2} title={vista.valore === 'aperti' && !cerca ? 'Nessun ordine da evadere' : 'Nessun ordine in questa vista'}
          filtrato={vista.valore !== 'aperti' || !!cerca} description={vista.valore === 'aperti' && !cerca ? 'Gli ordini presi in negozio, al telefono o dai canali online compaiono qui.' : 'Cambia vista o ricerca.'}
          action={vista.valore === 'aperti' && !cerca ? <Button variant="outline" onClick={() => setNuovo(true)}>Apri il primo ordine</Button> : undefined} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Ordine</TableHead><TableHead>Per quando</TableHead><TableHead>Chi riceve</TableHead><TableHead>Modalità</TableHead>
              <TableHead>Stato</TableHead><TableHead className="text-right">Totale</TableHead></TableRow></TableHeader>
            <TableBody>{visibili.map((o) => {
              const st = ORDINE_STATO[o.stato]
              const inRitardo = o.data_richiesta < oggi && !['consegnato', 'chiuso', 'annullato'].includes(o.stato)
              return (
                <TableRow key={o.id}>
                  <TableCell><Link to={`/fioraio/ordini/${o.id}`} className="font-medium text-foreground hover:text-primary-testo">{o.committente_nome}</Link>
                    <span className="block font-mono text-xs text-muted-foreground">{o.codice} · {CANALE[o.canale]}{o.occasione ? ` · ${OCCASIONE[o.occasione] ?? o.occasione}` : ''}</span></TableCell>
                  <TableCell className={inRitardo ? 'text-destructive-testo' : 'text-muted-foreground'}>{fmtData(o.data_richiesta)}{o.ora_richiesta ? ` · ${o.ora_richiesta.slice(0, 5)}` : o.fascia ? ` · ${o.fascia}` : ''}</TableCell>
                  <TableCell className="text-muted-foreground">{o.destinatario_nome ?? '—'}{o.indirizzo ? <span className="block text-xs">{o.indirizzo}{o.citta ? `, ${o.citta}` : ''}</span> : null}</TableCell>
                  <TableCell className="text-muted-foreground">{MODALITA[o.modalita]}</TableCell>
                  <TableCell><Badge tone={st.tone}>{st.label}</Badge></TableCell>
                  <TableCell numerica>{fmtEuro(o.totale)}</TableCell>
                </TableRow>
              )
            })}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
