/**
 * ComandePage — comande aperte del locale (sala, banco, asporto,
 * consegne) e apertura delle comande senza tavolo: al banco, da asporto
 * (orario di ritiro) e a domicilio (indirizzo, fascia, rider, costo).
 * Ristorante §14-15, Bar §10-12.
 */
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ClipboardList, Coffee, Package, Plus, Truck } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, CollegamentoRiga } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { supabase } from '@/lib/supabase'
import { useElenco, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { useQueryClient } from '@tanstack/react-query'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale, SelettoreLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { CANALE_LABEL, CONSEGNA_STATO, fmtEuro, fmtOra, minutiDa, oggiIso } from '@/modules/fb/stati'
import type { Comanda, ContoSaldo, RigaComanda } from '@/modules/fb/queries'

type ComandaElenco = Comanda & {
  tavolo: { numero: string } | null
  righe: Pick<RigaComanda, 'stato' | 'padre_id'>[]
  consegna: { stato: string; indirizzo: string }[] | null
}

export function ComandePage() {
  return <ConLocale><Comande_ /></ConLocale>
}

function Comande_() {
  const navigate = useNavigate()
  const { localeId, base, modulo } = useFb()
  const [vista, setVista] = useState<'aperte' | 'chiuse'>('aperte')
  const [nuova, setNuova] = useState<'banco' | 'asporto' | 'delivery' | null>(null)
  useDalVivo(['fb_comande', 'fb_comande_righe'])

  const { data: comande = [], isLoading } = useElenco<ComandaElenco>('fb_comande', {
    filtri: { locale_id: localeId ?? undefined, stato: vista === 'aperte' ? 'aperta' : ['chiusa', 'annullata'] },
    select: '*, tavolo:fb_tavoli(numero), righe:fb_comande_righe(stato, padre_id), consegna:fb_consegne(stato, indirizzo)',
    ordine: [{ colonna: 'aperta_at', crescente: vista === 'aperte' }], abilitato: !!localeId, limite: 200,
  })
  const elenco = useMemo(() => vista === 'aperte' ? comande
    : comande.filter((c) => (c.chiusa_at ?? '').slice(0, 10) >= oggiIso()), [comande, vista])
  const contiIds = elenco.map((c) => c.conto_id).filter(Boolean) as string[]
  const { data: saldi = [] } = useElenco<ContoSaldo>('conti_saldi', { filtri: { conto_id: contiIds }, abilitato: contiIds.length > 0 })
  const saldo = (id: string | null) => saldi.find((s) => s.conto_id === id)

  return (
    <div>
      <PageHeader title="Comande" description="Tutto ciò che è in servizio adesso: tavoli, banco, asporto e consegne."
        numeri={vista === 'aperte' ? [
          { etichetta: 'aperte', valore: elenco.length, inCaricamento: isLoading },
          { etichetta: 'in sala', valore: elenco.filter((c) => c.canale === 'sala').length, inCaricamento: isLoading },
          { etichetta: 'asporto e consegne', valore: elenco.filter((c) => ['asporto', 'delivery', 'online', 'telefono', 'app'].includes(c.canale)).length, inCaricamento: isLoading },
        ] : undefined}
        actions={<>
          <SelettoreLocale />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button><Plus className="h-4 w-4" /> Nuova comanda</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => navigate(`${base}/sala`)}><ClipboardList className="h-4 w-4" /> Al tavolo (dalla sala)</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setNuova('banco')}><Coffee className="h-4 w-4" /> Al banco</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setNuova('asporto')}><Package className="h-4 w-4" /> Da asporto</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setNuova('delivery')}><Truck className="h-4 w-4" /> A domicilio</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>} />

      <Tabs value={vista} onValueChange={(v) => setVista(v as 'aperte')} className="mb-4">
        <TabsList><TabsTrigger value="aperte">Aperte</TabsTrigger><TabsTrigger value="chiuse">Chiuse oggi</TabsTrigger></TabsList>
      </Tabs>

      {elenco.length === 0 && !isLoading ? (
        <EmptyState icon={ClipboardList} title={vista === 'aperte' ? 'Nessuna comanda aperta' : 'Nessuna comanda chiusa oggi'}
          description="Le comande si aprono dalla sala toccando un tavolo, oppure qui per banco, asporto e consegne."
          action={<Button variant="outline" onClick={() => navigate(`${base}/sala`)}>Vai alla sala</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N.</TableHead>
                <TableHead>Dove</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Avanzamento</TableHead>
                <TableHead className="text-right">Aperta</TableHead>
                <TableHead className="text-right">Conto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {elenco.map((c) => {
                const righe = c.righe.filter((r) => r.stato !== 'annullata' && !r.padre_id)
                const servite = righe.filter((r) => r.stato === 'servita').length
                const cons = c.consegna?.[0]
                return (
                  <TableRow key={c.id} onActivate={() => navigate(`${base}/comande/${c.id}`)}>
                    <TableCell><CollegamentoRiga to={`${base}/comande/${c.id}`} className="font-mono text-xs font-semibold">{c.numero}</CollegamentoRiga></TableCell>
                    <TableCell className="font-medium text-foreground">
                      {c.tavolo ? `Tavolo ${c.tavolo.numero}` : CANALE_LABEL[c.canale] ?? c.canale}
                      {c.conto_richiesto_at && <Badge tone="danger" className="ml-2">Conto</Badge>}
                      {cons && <Badge tone={(CONSEGNA_STATO[cons.stato] ?? CONSEGNA_STATO.da_assegnare).tone} className="ml-2">{(CONSEGNA_STATO[cons.stato] ?? CONSEGNA_STATO.da_assegnare).label}</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.cliente_nome ?? (c.coperti ? `${c.coperti} coperti` : '—')}
                      {c.ritiro_at && <span className="ml-1">· ritiro {fmtOra(c.ritiro_at)}</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{righe.length ? `${servite}/${righe.length} serviti` : 'nessun ordine'}</TableCell>
                    <TableCell numerica>{vista === 'aperte' ? `${minutiDa(c.aperta_at)} min` : fmtOra(c.chiusa_at)}</TableCell>
                    <TableCell numerica className="font-medium">{fmtEuro(saldo(c.conto_id)?.totale)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <NuovaComandaDialog tipo={nuova} onChiudi={() => setNuova(null)}
        onCreata={(id) => navigate(`${base}/comande/${id}`)} localeId={localeId!} modulo={modulo} />
    </div>
  )
}

function NuovaComandaDialog({ tipo, onChiudi, onCreata, localeId, modulo }: {
  tipo: 'banco' | 'asporto' | 'delivery' | null; onChiudi: () => void; onCreata: (id: string) => void
  localeId: string; modulo: string
}) {
  const qc = useQueryClient()
  const [nome, setNome] = useState('')
  const [telefono, setTelefono] = useState('')
  const [ritiro, setRitiro] = useState('')
  const [indirizzo, setIndirizzo] = useState('')
  const [zona, setZona] = useState('')
  const [dalle, setDalle] = useState('')
  const [alle, setAlle] = useState('')
  const [rider, setRider] = useState('')
  const [costo, setCosto] = useState('')
  const [inCorso, setInCorso] = useState(false)

  const oggiAlle = (hhmm: string) => {
    if (!hhmm) return null
    const [h, m] = hhmm.split(':').map(Number)
    const d = new Date(); d.setHours(h, m, 0, 0)
    return d.toISOString()
  }

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (tipo === 'delivery' && !indirizzo.trim()) { toast.error('Serve l\'indirizzo di consegna'); return }
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const { data: c, error } = await supabase.from('fb_comande').insert({
        locale_id: localeId, modulo, canale: tipo!, cliente_nome: nome.trim() || null, cliente_telefono: telefono.trim() || null,
        ritiro_at: tipo === 'asporto' ? oggiAlle(ritiro) : null, created_by: auth.user!.id,
      }).select().single()
      if (error) throw error
      if (tipo === 'delivery') {
        const { error: e2 } = await supabase.from('fb_consegne').insert({
          comanda_id: c.id, locale_id: localeId, modulo, indirizzo: indirizzo.trim(), zona: zona.trim() || null,
          fascia_dalle: oggiAlle(dalle), fascia_alle: oggiAlle(alle), rider_esterno: rider.trim() || null,
          costo_consegna: Number(costo.replace(',', '.')) || 0, created_by: auth.user!.id,
        })
        if (e2) throw e2
      }
      qc.invalidateQueries({ queryKey: ['fond'] })
      onChiudi()
      onCreata(c.id)
    } catch (err) { toast.error(messaggioErrore(err)) } finally { setInCorso(false) }
  }

  const titolo = tipo === 'banco' ? 'Comanda al banco' : tipo === 'asporto' ? 'Ordine da asporto' : 'Consegna a domicilio'
  return (
    <Dialog open={!!tipo} onOpenChange={(o) => { if (!o) onChiudi() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{titolo}</DialogTitle></DialogHeader>
        <form onSubmit={crea} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nc-nome">Cliente</Label>
              <Input id="nc-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-tel">Telefono</Label>
              <Input id="nc-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>
          {tipo === 'asporto' && (
            <div className="space-y-1.5">
              <Label htmlFor="nc-ritiro">Orario di ritiro</Label>
              <Input id="nc-ritiro" type="time" value={ritiro} onChange={(e) => setRitiro(e.target.value)} className="w-40" />
            </div>
          )}
          {tipo === 'delivery' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="nc-ind">Indirizzo *</Label>
                <Input id="nc-ind" value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label htmlFor="nc-zona">Zona</Label>
                  <Input id="nc-zona" value={zona} onChange={(e) => setZona(e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="nc-dalle">Dalle</Label>
                  <Input id="nc-dalle" type="time" value={dalle} onChange={(e) => setDalle(e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="nc-alle">Alle</Label>
                  <Input id="nc-alle" type="time" value={alle} onChange={(e) => setAlle(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label htmlFor="nc-rider">Rider</Label>
                  <Input id="nc-rider" value={rider} onChange={(e) => setRider(e.target.value)} placeholder="Nome o servizio" /></div>
                <div className="space-y-1.5"><Label htmlFor="nc-costo">Costo di consegna (€)</Label>
                  <Input id="nc-costo" inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Le piattaforme esterne di consegna si collegano su richiesta: per ora gli ordini si registrano qui.</p>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onChiudi}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={inCorso}>{inCorso ? 'Apertura…' : 'Apri e prendi l\'ordine'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
