/**
 * Elenco delle prenotazioni (documento Hotel §7): arrivi, ospiti in casa,
 * partenze, opzioni e richieste da lavorare, con ricerca e periodo.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useElenco, useDalVivo } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { PrenotazioneDialog } from '@/modules/hotel/dialogs/PrenotazioneDialog'
import { useCatalogoHotel, type Prenotazione } from '@/modules/hotel/queries'
import { CANALE, PRENOTAZIONE_STATO, fmtData, fmtEuro, notti, oggiIso, piuGiorni } from '@/modules/hotel/stati'

type Vista = 'arrivi' | 'in_casa' | 'partenze' | 'da_lavorare' | 'tutte'

export function PrenotazioniPage() {
  return <ConStruttura><Prenotazioni_ /></ConStruttura>
}

function Prenotazioni_() {
  const { strutturaId } = useHotel()
  const { tipologie, camere } = useCatalogoHotel(strutturaId)
  useDalVivo(['hotel_prenotazioni'])
  const oggi = oggiIso()
  const [vista, setVista] = useState<Vista>('arrivi')
  const [cerca, setCerca] = useState('')
  const [dal, setDal] = useState(oggi)
  const [al, setAl] = useState(piuGiorni(oggi, 30))
  const [nuova, setNuova] = useState(false)
  const { data: tutte = [], isLoading } = useElenco<Prenotazione>('hotel_prenotazioni', {
    filtri: { struttura_id: strutturaId ?? undefined }, tra: { colonna: 'arrivo', da: piuGiorni(dal, -60), a: piuGiorni(al, 1) },
    ordine: [{ colonna: 'arrivo' }, { colonna: 'ospite_nome' }], limite: 3000, abilitato: !!strutturaId,
  })
  const filtrate = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return tutte.filter((p) => {
      const ok = vista === 'arrivi' ? p.arrivo === oggi && ['opzionata', 'confermata', 'in_soggiorno'].includes(p.stato)
        : vista === 'in_casa' ? p.stato === 'in_soggiorno'
        : vista === 'partenze' ? p.partenza === oggi && ['in_soggiorno', 'partita'].includes(p.stato)
        : vista === 'da_lavorare' ? ['richiesta', 'opzionata'].includes(p.stato)
        : p.arrivo <= al && p.partenza > dal
      return ok && (!q || `${p.codice} ${p.ospite_nome} ${p.canale_riferimento ?? ''}`.toLowerCase().includes(q))
    })
  }, [tutte, vista, cerca, oggi, dal, al])
  const conta = (v: Vista) => tutte.filter((p) => (v === 'arrivi' ? p.arrivo === oggi && ['opzionata', 'confermata', 'in_soggiorno'].includes(p.stato)
    : v === 'in_casa' ? p.stato === 'in_soggiorno' : v === 'partenze' ? p.partenza === oggi && ['in_soggiorno', 'partita'].includes(p.stato)
    : ['richiesta', 'opzionata'].includes(p.stato))).length

  return (
    <div>
      <PageHeader title="Prenotazioni" description="Arrivi, ospiti in casa, partenze e trattative da chiudere."
        numeri={[
          { etichetta: 'arrivi oggi', valore: conta('arrivi'), inCaricamento: isLoading },
          { etichetta: 'in casa', valore: conta('in_casa'), inCaricamento: isLoading },
          { etichetta: 'partenze oggi', valore: conta('partenze'), inCaricamento: isLoading },
          { etichetta: 'opzioni e richieste', valore: conta('da_lavorare'), inCaricamento: isLoading },
        ]}
        actions={<><SelettoreStruttura /><BottoneScrittura onClick={() => setNuova(true)}><Plus className="h-4 w-4" /> Nuova prenotazione</BottoneScrittura></>} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={vista} onValueChange={(v) => setVista(v as Vista)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="arrivi">Arrivi di oggi</TabsTrigger><TabsTrigger value="in_casa">In casa</TabsTrigger>
            <TabsTrigger value="partenze">Partenze di oggi</TabsTrigger><TabsTrigger value="da_lavorare">Opzioni e richieste</TabsTrigger>
            <TabsTrigger value="tutte">Periodo</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          {vista === 'tutte' && (
            <>
              <Input type="date" className="w-40" value={dal} onChange={(e) => setDal(e.target.value)} aria-label="Dal" />
              <Input type="date" className="w-40" value={al} onChange={(e) => setAl(e.target.value)} aria-label="Al" />
            </>
          )}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Ospite o codice" className="pl-9" aria-label="Cerca prenotazione" />
          </div>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : filtrate.length === 0 ? (
        <EmptyState icon={BedDouble} title="Nessuna prenotazione" filtrato={!!cerca || vista !== 'tutte'}
          description={cerca ? 'Nessuna corrispondenza: cambia la ricerca.' : 'Qui non c\'è nulla: guarda le altre schede o il periodo.'}
          action={!cerca && vista === 'tutte' ? <Button variant="outline" onClick={() => setNuova(true)}><Plus className="h-4 w-4" /> Prenota</Button> : undefined} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Ospite</TableHead><TableHead>Soggiorno</TableHead><TableHead>Camera</TableHead><TableHead>Canale</TableHead>
              <TableHead>Stato</TableHead><TableHead className="text-right">Totale</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtrate.map((p) => {
                const st = PRENOTAZIONE_STATO[p.stato]
                const camera = camere.find((c) => c.id === p.camera_id)
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link to={`/hotel/prenotazioni/${p.id}`} className="font-medium text-foreground underline-offset-2 hover:underline">{p.ospite_nome}</Link>
                      <span className="block font-mono text-xs text-muted-foreground">{p.codice}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtData(p.arrivo)} → {fmtData(p.partenza)}<span className="block text-xs">{notti(p.notti)} · {p.adulti + p.bambini} persone</span></TableCell>
                    <TableCell>{camera ? <span className="text-foreground">{camera.numero}</span> : <Badge tone="warning">Da assegnare</Badge>}
                      <span className="block text-xs text-muted-foreground">{tipologie.find((t) => t.id === p.tipologia_id)?.nome}</span></TableCell>
                    <TableCell className="text-muted-foreground">{CANALE[p.canale] ?? p.canale}</TableCell>
                    <TableCell><Badge tone={st?.tone ?? 'neutral'}>{st?.label ?? p.stato}</Badge></TableCell>
                    <TableCell numerica>{fmtEuro(p.prezzo_totale)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      <PrenotazioneDialog open={nuova} onOpenChange={setNuova} />
    </div>
  )
}
