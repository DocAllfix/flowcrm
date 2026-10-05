/**
 * Ospiti e CRM alberghiero (documento Hotel §5–6, §37–39): profilo con
 * soggiorni, spesa, camera e canale preferiti, servizi usati, reclami e
 * ricorrenze; fidelizzazione, recensioni e campagne (inattivi, abituali,
 * compleanni, anniversari).
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, HeartHandshake, Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { FidelizzazioneSezione } from '@/components/condivisi/FidelizzazioneSezione'
import { FeedbackSezione } from '@/components/condivisi/FeedbackSezione'
import { CampagneSezione } from '@/components/condivisi/CampagneSezione'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'
import { useElenco, useRpc } from '@/lib/queries/fondamenta'
import { ConStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { CANALE, fmtData, fmtEuro } from '@/modules/hotel/stati'

type Riepilogo = Database['public']['Views']['hotel_ospiti_riepilogo']['Row']
interface Profilo {
  soggiorni: number; notti: number; ultimo_soggiorno: string | null; spesa_totale: number; spesa_media: number | null; durata_media: number | null
  tipologia_preferita: string | null; canale_preferito: string | null; servizi: { servizio: string; volte: number }[]; reclami: number
  nps_medio: number | null; compleanno: string | null; preferenze: string | null; allergie: string | null; vip: boolean | null
  prossime: { codice: string; arrivo: string; partenza: string }[]
}

export function OspitiPage() {
  return (
    <ConStruttura>
      <PageHeader title="Ospiti" description="Chi torna, quanto spende, cosa preferisce; fidelity, recensioni e campagne." />
      <Tabs defaultValue="ospiti">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="ospiti">Ospiti</TabsTrigger><TabsTrigger value="fidelity">Fidelity</TabsTrigger>
          <TabsTrigger value="feedback">Recensioni e reclami</TabsTrigger><TabsTrigger value="campagne">Campagne</TabsTrigger>
        </TabsList>
        <TabsContent value="ospiti"><Ospiti /></TabsContent>
        <TabsContent value="fidelity"><FidelizzazioneSezione modulo="hotel" /></TabsContent>
        <TabsContent value="feedback"><FeedbackSezione modulo="hotel" canali={['check-out', 'email', 'telefono', 'portale di prenotazione', 'recensione online', 'questionario in camera']} /></TabsContent>
        <TabsContent value="campagne"><CampagneSezione modulo="hotel" /></TabsContent>
      </Tabs>
    </ConStruttura>
  )
}

function Ospiti() {
  const { data: elenco = [], isLoading } = useElenco<Riepilogo>('hotel_ospiti_riepilogo', { ordine: [{ colonna: 'ultimo_soggiorno', crescente: false }], limite: 1000 })
  const [cerca, setCerca] = useState('')
  const [sceltoId, setSceltoId] = useState<string | null>(null)
  const filtrati = useMemo(() => { const q = cerca.trim().toLowerCase(); return q ? elenco.filter((o) => `${o.nome} ${o.email ?? ''} ${o.telefono ?? ''}`.toLowerCase().includes(q)) : elenco }, [elenco, cerca])
  const scelto = elenco.find((o) => o.contatto_id === sceltoId) ?? null
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Nome, email o telefono" className="pl-9" aria-label="Cerca ospite" />
        </div>
        {isLoading ? <Skeleton className="h-64" /> : filtrati.length === 0 ? (
          <EmptyState icon={HeartHandshake} title="Nessun ospite" filtrato={!!cerca}
            action={cerca ? undefined : <Button asChild variant="outline"><Link to="/hotel/prenotazioni">Vai alle prenotazioni</Link></Button>}
            description={cerca ? 'Nessuna corrispondenza.' : 'Gli ospiti compaiono con il primo soggiorno collegato all\'anagrafica.'} />
        ) : (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Ospite</TableHead><TableHead className="text-right">Soggiorni</TableHead><TableHead className="text-right">Notti</TableHead><TableHead>Ultimo</TableHead><TableHead className="text-right">Spesa</TableHead></TableRow></TableHeader>
              <TableBody>{filtrati.map((o) => (
                <TableRow key={o.contatto_id} className={cn('cursor-pointer', o.contatto_id === sceltoId && 'bg-muted')} onClick={() => setSceltoId(o.contatto_id)}>
                  <TableCell><button type="button" className="text-left font-medium text-foreground" onClick={() => setSceltoId(o.contatto_id)}>{o.nome}</button>
                    {o.vip && <Badge tone="warning" className="ml-2"><Crown className="mr-1 h-3 w-3" />VIP</Badge>}
                    <span className="block text-xs text-muted-foreground">{o.email ?? o.telefono ?? ''}</span></TableCell>
                  <TableCell numerica>{o.soggiorni}</TableCell><TableCell numerica>{o.notti}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtData(o.ultimo_soggiorno)}{o.prossimo_arrivo ? <span className="block text-xs">torna il {fmtData(o.prossimo_arrivo)}</span> : null}</TableCell>
                  <TableCell numerica>{fmtEuro(o.spesa)}</TableCell>
                </TableRow>))}</TableBody>
            </Table>
          </Card>
        )}
      </div>
      <div>{scelto ? <ProfiloOspite contattoId={scelto.contatto_id!} nome={scelto.nome ?? ''} /> : (
        <Card className="border-dashed p-5 text-sm text-muted-foreground">Scegli un ospite per il profilo completo.</Card>
      )}</div>
    </div>
  )
}

function ProfiloOspite({ contattoId, nome }: { contattoId: string; nome: string }) {
  const { data: p, isLoading } = useRpc<Profilo>('hotel_ospite_profilo', { p_contatto: contattoId })
  if (isLoading || !p) return <Skeleton className="h-80" />
  const voce = (l: string, v: string) => <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">{l}</dt><dd className="text-right text-foreground">{v}</dd></div>
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-title text-foreground">{nome}</h2>
        <Link to={`/contatti/${contattoId}`} className="text-sm text-muted-foreground underline underline-offset-2">Anagrafica</Link>
      </div>
      <dl className="divide-y divide-border text-sm">
        {voce('Soggiorni', `${p.soggiorni} · ${p.notti} notti`)}
        {voce('Ultimo soggiorno', fmtData(p.ultimo_soggiorno))}
        {voce('Spesa complessiva', fmtEuro(p.spesa_totale))}
        {voce('Spesa media', fmtEuro(p.spesa_media))}
        {voce('Durata media', p.durata_media ? `${p.durata_media} notti` : '—')}
        {voce('Camera preferita', p.tipologia_preferita ?? '—')}
        {voce('Canale preferito', p.canale_preferito ? CANALE[p.canale_preferito] ?? p.canale_preferito : '—')}
        {voce('Compleanno', p.compleanno ?? '—')}
        {voce('Reclami', String(p.reclami))}
        {voce('Soddisfazione (NPS medio)', p.nps_medio != null ? String(p.nps_medio) : '—')}
      </dl>
      {(p.preferenze || p.allergie) && (
        <div className="space-y-1 text-sm">
          {p.preferenze && <p className="text-foreground">Preferenze: {p.preferenze}</p>}
          {p.allergie && <p className="font-medium text-destructive-testo">Allergie: {p.allergie}</p>}
        </div>
      )}
      {p.servizi.length > 0 && <p className="text-sm text-muted-foreground">Servizi usati: {p.servizi.map((s) => `${s.servizio} (${s.volte})`).join(', ')}</p>}
      {p.prossime.length > 0 && <p className="text-sm text-foreground">Prossimi arrivi: {p.prossime.map((x) => `${fmtData(x.arrivo)} (${x.codice})`).join(', ')}</p>}
    </Card>
  )
}
