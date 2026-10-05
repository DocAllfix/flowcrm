/**
 * Soci (documento Palestra §1, §5–6): elenco con lo stato, le scadenze in
 * arrivo e le sospensioni da autorizzare.
 */
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Search, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { useElenco, useSalva, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import { usePalestra } from '@/modules/palestra/contesto'
import { ConSede, SelettoreSede } from '@/modules/palestra/componenti/ConSede'
import { NuovoSocioDialog } from '@/modules/palestra/dialogs/NuovoSocioDialog'
import { TABELLE_SOCIO, type Abbonamento, type SocioStato, type Sospensione } from '@/modules/palestra/queries'
import { SOCIO_STATO, SOSPENSIONE_TIPO, fmtData, fmtEuro, oggiIso, piuGiorni } from '@/modules/palestra/stati'

export function SociPage() {
  return <ConSede><Soci_ /></ConSede>
}

const FILTRI = ['tutti', 'attivo', 'sospeso', 'moroso', 'scaduto', 'senza_titolo', 'ex'] as const

function Soci_() {
  const { sedeId } = usePalestra()
  const { isManager } = useAuth()
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') ?? 'soci'
  const filtro = (params.get('stato') ?? 'tutti') as (typeof FILTRI)[number]
  const [cerca, setCerca] = useState('')
  const [nuovo, setNuovo] = useState(false)
  const { data: soci = [], isLoading } = useElenco<SocioStato>('pal_soci_stato', { filtri: { sede_id: sedeId ?? undefined }, ordine: [{ colonna: 'nome' }], abilitato: !!sedeId })
  const conta = (s: string) => soci.filter((x) => x.stato === s).length
  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return soci.filter((s) => (filtro === 'tutti' || s.stato === filtro)
      && (!q || `${s.nome} ${s.codice} ${s.email ?? ''} ${s.telefono ?? ''}`.toLowerCase().includes(q)))
  }, [soci, filtro, cerca])
  const imposta = (k: string, v: string) => { const p = new URLSearchParams(params); p.set(k, v); setParams(p, { replace: true }) }

  return (
    <div>
      <PageHeader title="Soci" description="Iscritti con lo stato dell'abbonamento, le scadenze e le sospensioni."
        numeri={[
          { etichetta: 'attivi', valore: isLoading ? undefined : conta('attivo'), inCaricamento: isLoading },
          { etichetta: 'sospesi', valore: isLoading ? undefined : conta('sospeso'), inCaricamento: isLoading },
          { etichetta: 'morosi', valore: isLoading ? undefined : conta('moroso'), inCaricamento: isLoading },
          { etichetta: 'scaduti', valore: isLoading ? undefined : conta('scaduto'), inCaricamento: isLoading },
        ]}
        actions={<><SelettoreSede /><BottoneScrittura onClick={() => setNuovo(true)}><UserPlus className="h-4 w-4" /> Nuovo socio</BottoneScrittura></>} />
      <NuovoSocioDialog open={nuovo} onOpenChange={setNuovo} />

      <Tabs value={vista} onValueChange={(v) => imposta('vista', v)}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="soci">Elenco</TabsTrigger>
          <TabsTrigger value="scadenze">Scadenze e rinnovi</TabsTrigger>
          <TabsTrigger value="sospensioni">Sospensioni</TabsTrigger>
        </TabsList>
        <TabsContent value="soci">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Nome, codice, email, telefono" className="pl-9" aria-label="Cerca socio" />
            </div>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filtra per stato">
              {FILTRI.map((s) => (
                <Button key={s} size="sm" variant={filtro === s ? 'secondary' : 'ghost'} aria-pressed={filtro === s} onClick={() => imposta('stato', s)}>
                  {s === 'tutti' ? 'Tutti' : SOCIO_STATO[s].label}</Button>
              ))}
            </div>
          </div>
          {isLoading ? <Skeleton className="h-64" /> : visibili.length === 0 ? (
            <EmptyState icon={Users} title={soci.length ? 'Nessun socio con questo filtro' : 'Nessun socio'} filtrato={soci.length > 0}
              description={soci.length ? 'Cambia il filtro o la ricerca.' : 'Il primo iscritto si registra da qui o dalla reception.'}
              action={soci.length ? undefined : <Button variant="outline" onClick={() => setNuovo(true)}>Iscrivi il primo socio</Button>} />
          ) : (
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Socio</TableHead><TableHead>Stato</TableHead><TableHead>Scadenza</TableHead>
                  <TableHead>Ultimo ingresso</TableHead><TableHead>Certificato</TableHead><TableHead className="text-right">Da pagare</TableHead></TableRow></TableHeader>
                <TableBody>{visibili.map((s) => {
                  const st = SOCIO_STATO[s.stato ?? 'senza_titolo'] ?? SOCIO_STATO.senza_titolo
                  const certScaduto = s.certificato_scadenza && s.certificato_scadenza < oggiIso()
                  return (
                    <TableRow key={s.socio_id}>
                      <TableCell><Link to={`/palestra/soci/${s.socio_id}`} className="font-medium text-foreground hover:text-primary-testo">{s.nome}</Link>
                        <span className="block font-mono text-xs text-muted-foreground">{s.codice}</span></TableCell>
                      <TableCell><Badge tone={st.tone}>{st.label}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{fmtData(s.scadenza)}</TableCell>
                      <TableCell className="text-muted-foreground">{s.ultimo_accesso ? fmtData(s.ultimo_accesso) : 'mai'}</TableCell>
                      <TableCell className={certScaduto ? 'text-destructive-testo' : 'text-muted-foreground'}>{s.certificato_scadenza ? fmtData(s.certificato_scadenza) : 'manca'}</TableCell>
                      <TableCell numerica>{Number(s.da_pagare) > 0 ? fmtEuro(s.da_pagare) : '—'}</TableCell>
                    </TableRow>
                  )
                })}</TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="scadenze"><Scadenze /></TabsContent>
        <TabsContent value="sospensioni"><Sospensioni puoAutorizzare={isManager} /></TabsContent>
      </Tabs>
    </div>
  )
}

/** Abbonamenti che scadono nei prossimi 30 giorni senza un rinnovo (§6). */
function Scadenze() {
  const oggi = oggiIso()
  const { data: abb = [], isLoading } = useElenco<Abbonamento & { pal_formule: { nome: string } | null }>('pal_abbonamenti', {
    filtri: { stato: ['attivo', 'sospeso'] }, tra: { colonna: 'fine', da: piuGiorni(oggi, -1), a: piuGiorni(oggi, 31) },
    select: '*, pal_formule(nome)', ordine: [{ colonna: 'fine' }],
  })
  const { data: rinnovati = [] } = useElenco<Pick<Abbonamento, 'rinnovo_di'>>('pal_abbonamenti', {
    filtri: { rinnovo_di: abb.map((a) => a.id) }, select: 'rinnovo_di', abilitato: abb.length > 0,
  })
  const { data: soci = [] } = useElenco<SocioStato>('pal_soci_stato', { filtri: { socio_id: abb.map((a) => a.socio_id) }, abilitato: abb.length > 0 })
  const rinnova = useAzione('pal_rinnova', TABELLE_SOCIO)
  const daRinnovare = abb.filter((a) => !rinnovati.some((r) => r.rinnovo_di === a.id))
  if (isLoading) return <Skeleton className="h-48" />
  if (daRinnovare.length === 0) {
    return <EmptyState compatto icon={Users} filtrato title="Nessun abbonamento in scadenza" description="Nei prossimi 30 giorni non scade nulla senza rinnovo." />
  }
  return (
    <Card className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Socio</TableHead><TableHead>Formula</TableHead><TableHead>Scade</TableHead><TableHead>Rinnovo</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>{daRinnovare.map((a) => {
          const s = soci.find((x) => x.socio_id === a.socio_id)
          return (
            <TableRow key={a.id}>
              <TableCell><Link to={`/palestra/soci/${a.socio_id}`} className="font-medium text-foreground hover:text-primary-testo">{s?.nome ?? '…'}</Link></TableCell>
              <TableCell className="text-muted-foreground">{a.pal_formule?.nome}</TableCell>
              <TableCell className="text-muted-foreground">{fmtData(a.fine)}</TableCell>
              <TableCell>{a.rinnovo_automatico ? <Badge tone="info">Automatico</Badge> : <Badge tone="warning">Da proporre</Badge>}</TableCell>
              <TableCell className="text-right">
                <BottoneScrittura size="sm" variant="outline" disabled={rinnova.isPending}
                  onClick={() => rinnova.mutate({ p_abbonamento: a.id }, { onSuccess: () => toast.success(`${s?.nome ?? 'Socio'}: rinnovato, rate generate`), onError: (e) => toast.error(messaggioErrore(e)) })}>
                  Rinnova</BottoneScrittura></TableCell>
            </TableRow>
          )
        })}</TableBody>
      </Table>
    </Card>
  )
}

/** Sospensioni richieste dalla reception e autorizzate dalla direzione (§5). */
function Sospensioni({ puoAutorizzare }: { puoAutorizzare: boolean }) {
  const { data: elenco = [], isLoading } = useElenco<Sospensione & { pal_abbonamenti: { socio_id: string; codice: string; fine: string } | null }>('pal_sospensioni', {
    select: '*, pal_abbonamenti(socio_id, codice, fine)', ordine: [{ colonna: 'created_at', crescente: false }], limite: 100,
  })
  const ids = [...new Set(elenco.map((x) => x.pal_abbonamenti?.socio_id).filter(Boolean))] as string[]
  const { data: soci = [] } = useElenco<SocioStato>('pal_soci_stato', { filtri: { socio_id: ids }, abilitato: ids.length > 0 })
  const salva = useSalva('pal_sospensioni', TABELLE_SOCIO)
  if (isLoading) return <Skeleton className="h-48" />
  if (elenco.length === 0) {
    return <EmptyState compatto icon={Users} filtrato title="Nessuna sospensione" description="Si chiedono dalla scheda del socio, sull'abbonamento." />
  }
  return (
    <Card className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Socio</TableHead><TableHead>Tipo</TableHead><TableHead>Periodo</TableHead><TableHead>Motivo</TableHead><TableHead>Stato</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>{elenco.map((z) => {
          const s = soci.find((x) => x.socio_id === z.pal_abbonamenti?.socio_id)
          return (
            <TableRow key={z.id}>
              <TableCell><Link to={`/palestra/soci/${z.pal_abbonamenti?.socio_id}`} className="font-medium text-foreground hover:text-primary-testo">{s?.nome ?? '…'}</Link>
                <span className="block font-mono text-xs text-muted-foreground">{z.pal_abbonamenti?.codice}</span></TableCell>
              <TableCell className="text-muted-foreground">{SOSPENSIONE_TIPO[z.tipo]}</TableCell>
              <TableCell className="text-muted-foreground">{z.dal ? `${fmtData(z.dal)} → ${fmtData(z.al)}` : `${z.giorni} giorni`}</TableCell>
              <TableCell className="max-w-64 truncate text-muted-foreground">{z.motivo}</TableCell>
              <TableCell><Badge tone={z.stato === 'approvata' ? 'success' : z.stato === 'rifiutata' ? 'neutral' : 'warning'}>
                {z.stato === 'approvata' ? 'Autorizzata' : z.stato === 'rifiutata' ? 'Rifiutata' : 'Da autorizzare'}</Badge></TableCell>
              <TableCell className="text-right">{z.stato === 'richiesta' && puoAutorizzare && (
                <span className="inline-flex gap-1">
                  <BottoneScrittura size="sm" variant="outline" onClick={() => salva.mutate({ id: z.id, values: { stato: 'approvata' } },
                    { onSuccess: () => toast.success(`Autorizzata: la scadenza si sposta di ${z.giorni ?? ''} giorni`), onError: (e) => toast.error(messaggioErrore(e)) })}>Autorizza</BottoneScrittura>
                  <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: z.id, values: { stato: 'rifiutata' } }, { onError: (e) => toast.error(messaggioErrore(e)) })}>Rifiuta</Button>
                </span>)}</TableCell>
            </TableRow>
          )
        })}</TableBody>
      </Table>
    </Card>
  )
}
