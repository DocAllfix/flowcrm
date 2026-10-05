/**
 * Pagamenti del socio (documento Palestra §30–32): rate con scadenza,
 * incasso in cassa, esito dell'addebito ricorrente con i nuovi tentativi,
 * insoluti che bloccano l'accesso.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { useElenco, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import { TABELLE_SOCIO, type Rata, type SocioStato } from '@/modules/palestra/queries'
import { METODO, RATA_STATO, fmtData, fmtEuro, oggiIso } from '@/modules/palestra/stati'

const METODI_CASSA = ['pos', 'contanti', 'carta', 'bonifico', 'online', 'buono'] as const

export function PagamentiSocio({ socio }: { socio: SocioStato }) {
  const { isManager } = useAuth()
  const { data: rate = [] } = useElenco<Rata>('pal_rate', { filtri: { socio_id: socio.socio_id! }, ordine: [{ colonna: 'scadenza', crescente: false }] })
  const incassa = useAzione('pal_incassa_rata', TABELLE_SOCIO)
  const esito = useAzione('pal_esito_addebito', TABELLE_SOCIO)
  const [metodo, setMetodo] = useState<(typeof METODI_CASSA)[number]>('pos')
  const aperte = rate.filter((r) => r.pagatore === 'socio' && ['da_pagare', 'fallita', 'insoluta'].includes(r.stato))
  const totaleAperte = aperte.filter((r) => r.scadenza <= oggiIso()).reduce((s, r) => s + Number(r.importo), 0)

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-foreground">
          {totaleAperte > 0 ? <>Scaduto da incassare: <strong className="tabular-nums">{fmtEuro(totaleAperte)}</strong>.</> : 'Nessun pagamento scaduto.'}
          {aperte.some((r) => r.stato === 'insoluta') && <span className="text-destructive-testo"> Con un insoluto l'accesso è bloccato finché non si paga.</span>}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Incasso con</span>
          <Select value={metodo} onValueChange={(v) => setMetodo(v as typeof metodo)}>
            <SelectTrigger className="w-36" aria-label="Metodo d'incasso"><SelectValue /></SelectTrigger>
            <SelectContent>{METODI_CASSA.map((k) => <SelectItem key={k} value={k}>{METODO[k]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>
      <Card className="overflow-x-auto">
        {rate.length === 0 ? <p className="px-5 py-6 text-sm text-muted-foreground">Nessuna rata: nascono con la vendita di abbonamenti, carnet e servizi.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Voce</TableHead><TableHead>Scadenza</TableHead><TableHead>Pagamento</TableHead><TableHead>Stato</TableHead>
              <TableHead className="text-right">Importo</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{rate.map((r) => {
              const st = RATA_STATO[r.stato]
              const daIncassare = r.pagatore === 'socio' && ['da_pagare', 'fallita', 'insoluta'].includes(r.stato)
              return (
                <TableRow key={r.id}>
                  <TableCell><span className="text-foreground">{r.descrizione}</span>
                    {r.pagatore === 'azienda' && <span className="block text-xs text-muted-foreground">a carico dell'azienda</span>}
                    {r.ultimo_esito && r.stato !== 'pagata' && <span className="block text-xs text-muted-foreground">{r.ultimo_esito}{r.tentativi ? ` · ${r.tentativi} tentativi` : ''}</span>}</TableCell>
                  <TableCell className={r.scadenza < oggiIso() && daIncassare ? 'text-destructive-testo' : 'text-muted-foreground'}>{fmtData(r.scadenza)}
                    {r.prossimo_tentativo && <span className="block text-xs text-muted-foreground">nuovo tentativo il {fmtData(r.prossimo_tentativo)}</span>}</TableCell>
                  <TableCell className="text-muted-foreground">{METODO[r.metodo]}{r.pagata_il ? ` · ${fmtData(r.pagata_il)}` : ''}</TableCell>
                  <TableCell><Badge tone={st.tone}>{st.label}</Badge></TableCell>
                  <TableCell numerica>{fmtEuro(r.importo)}</TableCell>
                  <TableCell className="text-right">{daIncassare && (
                    <span className="inline-flex flex-wrap justify-end gap-1">
                      {isManager && r.metodo === 'addebito_ricorrente' && r.stato !== 'insoluta' && <>
                        <Button size="sm" variant="ghost" onClick={() => esito.mutate({ p_rata: r.id, p_riuscito: true, p_esito: 'Addebito riuscito' },
                          { onSuccess: () => toast.success('Addebito riuscito: rata pagata'), onError: (e) => toast.error(messaggioErrore(e)) })}>Addebito riuscito</Button>
                        <Button size="sm" variant="ghost" onClick={() => esito.mutate({ p_rata: r.id, p_riuscito: false, p_esito: 'Addebito respinto' },
                          { onSuccess: (x) => toast.warning(x === 'insoluta' ? 'Tentativi finiti: insoluta, socio avvisato' : 'Addebito fallito: nuovo tentativo programmato'),
                            onError: (e) => toast.error(messaggioErrore(e)) })}>Respinto</Button>
                      </>}
                      <BottoneScrittura size="sm" variant="outline" disabled={incassa.isPending}
                        onClick={() => incassa.mutate({ p_rata: r.id, p_metodo: metodo }, {
                          onSuccess: () => toast.success(`${fmtEuro(r.importo)} incassati con ${METODO[metodo]}`), onError: (e) => toast.error(messaggioErrore(e)) })}>
                        Incassa</BottoneScrittura>
                    </span>)}</TableCell>
                </TableRow>
              )
            })}</TableBody>
          </Table>
        )}
      </Card>
      <p className="text-xs text-muted-foreground">L'incasso entra nella cassa della palestra (chiusura a fine turno). L'addebito ricorrente con il gestore dei pagamenti è predisposto: oggi l'esito si registra qui. La ricevuta fiscale si emette dal registratore telematico.</p>
    </div>
  )
}
