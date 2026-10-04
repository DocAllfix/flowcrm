/**
 * Fidelizzazione (fondamenta F0.4), condivisa dai moduli: programmi a punti
 * e a timbri («10 caffè → 1 omaggio»), livelli, presentazioni; tessere con
 * saldo calcolato; gift card con codice casuale e credito scalato in cassa;
 * coupon con validità e limiti di utilizzo.
 */
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { CreditCard, Gift, Plus, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { CercaContatto, type ContattoScelto } from '@/components/condivisi/CercaContatto'
import { useAuth } from '@/hooks/useAuth'
import type { Tables } from '@/lib/supabase'
import { useElenco, useInserisci, useSalva, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'

type Programma = Tables<'fid_programmi'>
type Saldo = Database['public']['Views']['fid_saldi']['Row']
type GiftCard = Tables<'gift_card'>
type SaldoGift = Database['public']['Views']['gift_card_saldi']['Row']
type Coupon = Tables<'coupon'>
type Contatto = Pick<Tables<'contatti'>, 'id' | 'nome' | 'cognome'>
const n = (s: string) => Number(s.replace(',', '.'))
const euro = (v: number | string | null | undefined) => v == null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(v))

export function FidelizzazioneSezione({ modulo }: { modulo: string }) {
  return (
    <Tabs defaultValue="tessere">
      <TabsList className="mb-4 flex-wrap">
        <TabsTrigger value="tessere">Tessere</TabsTrigger>
        <TabsTrigger value="programmi">Programmi</TabsTrigger>
        <TabsTrigger value="gift">Gift card</TabsTrigger>
        <TabsTrigger value="coupon">Coupon</TabsTrigger>
      </TabsList>
      <TabsContent value="tessere"><Tessere modulo={modulo} /></TabsContent>
      <TabsContent value="programmi"><Programmi modulo={modulo} /></TabsContent>
      <TabsContent value="gift"><GiftCards modulo={modulo} /></TabsContent>
      <TabsContent value="coupon"><Coupons modulo={modulo} /></TabsContent>
    </Tabs>
  )
}

function useProgrammi(modulo: string) {
  return useElenco<Programma>('fid_programmi', { filtri: { modulo }, ordine: [{ colonna: 'nome' }] }).data ?? []
}

function Tessere({ modulo }: { modulo: string }) {
  const programmi = useProgrammi(modulo)
  const { data: saldi = [] } = useElenco<Saldo>('fid_saldi', { filtri: { modulo }, ordine: [{ colonna: 'punti', crescente: false }] })
  const ids = saldi.map((s) => s.contatto_id).filter(Boolean) as string[]
  const { data: clienti = [] } = useElenco<Contatto>('contatti', { filtri: { id: ids }, select: 'id, nome, cognome', abilitato: ids.length > 0 })
  const emetti = useSalva('fid_tessere', ['fid_saldi'])
  const movimento = useInserisci('fid_movimenti', ['fid_saldi'])
  const premio = useAzione('fid_riscatta_premio', ['fid_saldi'])
  const [nome, setNome] = useState('')
  const [contatto, setContatto] = useState<ContattoScelto | null>(null)
  const [programma, setProgramma] = useState('')
  const [presentata, setPresentata] = useState('')
  const [riscatto, setRiscatto] = useState<Record<string, string>>({})
  const cliente = (id: string | null) => { const c = clienti.find((x) => x.id === id); return c ? `${c.nome} ${c.cognome ?? ''}`.trim() : '—' }

  if (!programmi.length) return <EmptyState icon={CreditCard} title="Nessun programma fedeltà" description="Crea prima un programma nella scheda «Programmi»: punti, timbri o livelli." />
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1 space-y-1.5"><Label htmlFor="ts-c">Cliente</Label>
          <CercaContatto id="ts-c" valore={nome} contattoId={contatto?.id ?? null} segnaposto="Cerca in anagrafica…"
            onTesto={(v) => { setNome(v); setContatto(null) }} onScegli={(c) => { setContatto(c); setNome(`${c.nome} ${c.cognome ?? ''}`.trim()) }} /></div>
        <div className="w-52 space-y-1.5"><Label>Programma</Label>
          <Select value={programma || programmi[0].id} onValueChange={setProgramma}><SelectTrigger aria-label="Programma"><SelectValue /></SelectTrigger>
            <SelectContent>{programmi.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent></Select></div>
        <div className="w-52 space-y-1.5"><Label>Presentato da (facoltativo)</Label>
          <Select value={presentata || 'nessuno'} onValueChange={(v) => setPresentata(v === 'nessuno' ? '' : v)}><SelectTrigger aria-label="Presentato da"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nessuno">Nessuno</SelectItem>{saldi.map((s) => <SelectItem key={s.tessera_id!} value={s.tessera_id!}>{cliente(s.contatto_id)} · {s.codice}</SelectItem>)}</SelectContent></Select></div>
        <BottoneScrittura disabled={!contatto} onClick={() => emetti.mutate({ values: { programma_id: programma || programmi[0].id, modulo, contatto_id: contatto!.id, presentata_da: presentata || null } },
          { onSuccess: (t) => { toast.success(`Tessera ${t.codice} emessa`); setContatto(null); setNome(''); setPresentata('') }, onError: (e) => toast.error(messaggioErrore(e)) })}>
          <Plus className="h-4 w-4" /> Emetti tessera</BottoneScrittura>
      </Card>
      {saldi.length === 0 ? <EmptyState compatto icon={CreditCard} title="Nessuna tessera" description="Le tessere accumulano punti e timbri alla chiusura del conto." /> : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Tessera</TableHead><TableHead>Cliente</TableHead><TableHead className="text-right">Punti</TableHead><TableHead className="text-right">Timbri</TableHead><TableHead>Livello</TableHead><TableHead>Riscatti</TableHead></TableRow></TableHeader>
            <TableBody>
              {saldi.map((s) => (
                <TableRow key={s.tessera_id}>
                  <TableCell className="font-mono text-xs font-semibold">{s.codice}{!s.attiva && <Badge tone="neutral" className="ml-2">Sospesa</Badge>}</TableCell>
                  <TableCell className="text-foreground">{cliente(s.contatto_id)}</TableCell>
                  <TableCell numerica>{s.punti}</TableCell>
                  <TableCell numerica>{s.timbri}{(s.premi_disponibili ?? 0) > 0 && <Badge tone="success" className="ml-2">{s.premi_disponibili} premi</Badge>}</TableCell>
                  <TableCell>{s.livello ? <Badge tone="info">{s.livello}</Badge> : '—'}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {(s.premi_disponibili ?? 0) > 0 && <BottoneScrittura size="sm" onClick={() => premio.mutate({ p_tessera: s.tessera_id! },
                        { onSuccess: (p) => toast.success(`Premio consegnato: ${p ?? 'omaggio'}`), onError: (e) => toast.error(messaggioErrore(e)) })}><Gift className="h-3.5 w-3.5" /> Premio</BottoneScrittura>}
                      <Input className="h-8 w-20" inputMode="numeric" placeholder="Punti" aria-label="Punti da riscattare" value={riscatto[s.tessera_id!] ?? ''}
                        onChange={(e) => setRiscatto({ ...riscatto, [s.tessera_id!]: e.target.value })} />
                      <Button size="sm" variant="outline" disabled={!(Number(riscatto[s.tessera_id!]) > 0)} onClick={() => movimento.mutate({ tessera_id: s.tessera_id!, modulo,
                        tipo: 'riscatto', punti: -Number(riscatto[s.tessera_id!]), note: 'Riscatto in cassa' },
                        { onSuccess: () => { setRiscatto({ ...riscatto, [s.tessera_id!]: '' }); toast.success('Punti riscattati') }, onError: (e) => toast.error(messaggioErrore(e)) })}>Riscatta</Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Programmi({ modulo }: { modulo: string }) {
  const { isManager } = useAuth()
  const programmi = useProgrammi(modulo)
  const salva = useSalva('fid_programmi', ['fid_saldi'])
  const [f, setF] = useState({ nome: '', puntiEuro: '1', timbri: '', premio: '', benvenuto: '0', referral: '0', livelli: '', valore: '' })
  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) return
    const livelli = f.livelli.split(',').map((x) => x.split(':').map((y) => y.trim())).filter((x) => x[0] && x[1])
      .map(([nome, soglia]) => ({ nome, soglia: Number(soglia) }))
    try {
      await salva.mutateAsync({ values: { modulo, nome: f.nome.trim(), punti_per_euro: n(f.puntiEuro) || 0, timbri_soglia: f.timbri ? Number(f.timbri) : null,
        premio_timbri: f.premio || null, benvenuto_punti: Number(f.benvenuto) || 0, referral_punti: Number(f.referral) || 0, livelli,
        valore_punto: f.valore ? n(f.valore) : null } })
      setF({ nome: '', puntiEuro: '1', timbri: '', premio: '', benvenuto: '0', referral: '0', livelli: '', valore: '' })
      toast.success('Programma creato')
    } catch (err) { toast.error(messaggioErrore(err)) }
  }
  return (
    <div className="space-y-4">
      {isManager && (
        <Card className="p-5">
          <form onSubmit={crea} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 space-y-1.5"><Label htmlFor="pg-n">Nome del programma</Label><Input id="pg-n" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Amici del bar" /></div>
            <div className="space-y-1.5"><Label htmlFor="pg-pe">Punti per euro</Label><Input id="pg-pe" inputMode="decimal" value={f.puntiEuro} onChange={(e) => setF({ ...f, puntiEuro: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="pg-b">Punti di benvenuto</Label><Input id="pg-b" type="number" min={0} value={f.benvenuto} onChange={(e) => setF({ ...f, benvenuto: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="pg-t">Timbri per un premio</Label><Input id="pg-t" type="number" min={1} value={f.timbri} onChange={(e) => setF({ ...f, timbri: e.target.value })} placeholder="10" /></div>
            <div className="space-y-1.5"><Label htmlFor="pg-pr">Premio</Label><Input id="pg-pr" value={f.premio} onChange={(e) => setF({ ...f, premio: e.target.value })} placeholder="Caffè omaggio" /></div>
            <div className="space-y-1.5"><Label htmlFor="pg-r">Punti per chi presenta un amico</Label><Input id="pg-r" type="number" min={0} value={f.referral} onChange={(e) => setF({ ...f, referral: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="pg-v">Valore di un punto in cassa (€)</Label><Input id="pg-v" inputMode="decimal" value={f.valore} onChange={(e) => setF({ ...f, valore: e.target.value })} placeholder="0,01 = cashback" /></div>
            <div className="space-y-1.5"><Label htmlFor="pg-l">Livelli (nome:punti)</Label><Input id="pg-l" value={f.livelli} onChange={(e) => setF({ ...f, livelli: e.target.value })} placeholder="Argento:500, Oro:1500" /></div>
            <div className="col-span-2 flex justify-end sm:col-span-4"><BottoneScrittura type="submit">Crea programma</BottoneScrittura></div>
          </form>
        </Card>
      )}
      {programmi.length === 0 ? <EmptyState compatto icon={CreditCard} title="Nessun programma" description="Punti sulla spesa, timbri («10 caffè → 1 omaggio»), livelli e presentazioni." /> : (
        <Card className="divide-y divide-border">
          {programmi.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="min-w-48 flex-1 font-medium text-foreground">{p.nome}</span>
              <span className="text-muted-foreground">{[Number(p.punti_per_euro) > 0 && `${Number(p.punti_per_euro)} punti/€`, p.timbri_soglia && `${p.timbri_soglia} timbri → ${p.premio_timbri ?? 'premio'}`,
                p.benvenuto_punti > 0 && `benvenuto ${p.benvenuto_punti}`, p.referral_punti > 0 && `presentazione ${p.referral_punti}`,
                p.valore_punto && `cashback ${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(Number(p.punti_per_euro) * Number(p.valore_punto) * 100)}%`,
                (p.livelli as { nome: string; soglia: number }[]).map((l) => `${l.nome} da ${l.soglia}`).join(', ')].filter(Boolean).join(' · ')}</span>
              {isManager && <Switch checked={p.attivo} aria-label="Attivo" onCheckedChange={(v) => salva.mutate({ id: p.id, values: { attivo: v } })} />}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function GiftCards({ modulo }: { modulo: string }) {
  const { data: carte = [] } = useElenco<GiftCard>('gift_card', { filtri: { modulo }, ordine: [{ colonna: 'created_at', crescente: false }], limite: 200 })
  const { data: saldi = [] } = useElenco<SaldoGift>('gift_card_saldi', { filtri: { modulo } })
  const salva = useSalva('gift_card', ['gift_card_saldi'])
  const [f, setF] = useState({ importo: '50', scadenza: '', beneficiario: '', messaggio: '' })
  const saldo = (id: string) => saldi.find((s) => s.gift_card_id === id)
  const TONO: Record<string, 'success' | 'neutral' | 'warning' | 'danger'> = { attiva: 'success', esaurita: 'neutral', scaduta: 'warning', annullata: 'danger' }
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="w-28 space-y-1.5"><Label htmlFor="gc-i">Importo (€)</Label><Input id="gc-i" inputMode="decimal" value={f.importo} onChange={(e) => setF({ ...f, importo: e.target.value })} /></div>
        <div className="w-40 space-y-1.5"><Label htmlFor="gc-s">Valida fino al</Label><Input id="gc-s" type="date" value={f.scadenza} onChange={(e) => setF({ ...f, scadenza: e.target.value })} /></div>
        <div className="min-w-40 flex-1 space-y-1.5"><Label htmlFor="gc-b">Per</Label><Input id="gc-b" value={f.beneficiario} onChange={(e) => setF({ ...f, beneficiario: e.target.value })} /></div>
        <div className="min-w-40 flex-1 space-y-1.5"><Label htmlFor="gc-m">Messaggio</Label><Input id="gc-m" value={f.messaggio} onChange={(e) => setF({ ...f, messaggio: e.target.value })} /></div>
        <BottoneScrittura disabled={!(n(f.importo) > 0)} onClick={() => salva.mutate({ values: { modulo, importo_iniziale: n(f.importo), scadenza: f.scadenza || null,
          beneficiario: f.beneficiario || null, messaggio: f.messaggio || null } }, { onSuccess: (g) => { toast.success(`Gift card emessa: ${g.codice}`); setF({ ...f, beneficiario: '', messaggio: '' }) },
            onError: (e) => toast.error(messaggioErrore(e)) })}><Gift className="h-4 w-4" /> Emetti</BottoneScrittura>
      </Card>
      {carte.length === 0 ? <EmptyState compatto icon={Gift} title="Nessuna gift card" description="Il codice si legge alla cassa: il credito si scala e torna se il pagamento viene stornato." /> : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Codice</TableHead><TableHead>Per</TableHead><TableHead className="text-right">Valore</TableHead><TableHead className="text-right">Residuo</TableHead><TableHead className="text-right">Scadenza</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
            <TableBody>
              {carte.map((g) => {
                const s = saldo(g.id)
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-sm font-semibold">{g.codice}</TableCell>
                    <TableCell className="text-muted-foreground">{g.beneficiario ?? '—'}</TableCell>
                    <TableCell numerica>{euro(g.importo_iniziale)}</TableCell>
                    <TableCell numerica>{euro(s?.residuo)}</TableCell>
                    <TableCell numerica>{g.scadenza ? new Date(g.scadenza).toLocaleDateString('it-IT') : '—'}</TableCell>
                    <TableCell><span className="flex items-center gap-2"><Badge tone={TONO[s?.stato ?? 'attiva'] ?? 'neutral'}>{s?.stato ?? '—'}</Badge>
                      {s?.stato === 'attiva' && <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: g.id, values: { stato: 'annullata' } })}>Annulla</Button>}</span></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Coupons({ modulo }: { modulo: string }) {
  const { isManager } = useAuth()
  const { data: coupon = [] } = useElenco<Coupon>('coupon', { filtri: { modulo }, ordine: [{ colonna: 'created_at', crescente: false }] })
  const { data: utilizzi = [] } = useElenco<Pick<Tables<'coupon_utilizzi'>, 'coupon_id'>>('coupon_utilizzi', { filtri: { modulo }, select: 'coupon_id' })
  const salva = useSalva('coupon')
  const [f, setF] = useState({ codice: '', tipo: 'percentuale', valore: '10', minima: '', dal: '', al: '', usi: '', perCliente: '' })
  return (
    <div className="space-y-4">
      {isManager && (
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <div className="w-36 space-y-1.5"><Label htmlFor="cp-c">Codice</Label><Input id="cp-c" value={f.codice} onChange={(e) => setF({ ...f, codice: e.target.value.toUpperCase() })} placeholder="BENVENUTO10" className="font-mono" /></div>
          <div className="w-36 space-y-1.5"><Label>Tipo</Label><Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="percentuale">Percentuale</SelectItem><SelectItem value="importo">Importo fisso</SelectItem></SelectContent></Select></div>
          <div className="w-24 space-y-1.5"><Label htmlFor="cp-v">{f.tipo === 'percentuale' ? '%' : '€'}</Label><Input id="cp-v" inputMode="decimal" value={f.valore} onChange={(e) => setF({ ...f, valore: e.target.value })} /></div>
          <div className="w-28 space-y-1.5"><Label htmlFor="cp-m">Spesa minima €</Label><Input id="cp-m" inputMode="decimal" value={f.minima} onChange={(e) => setF({ ...f, minima: e.target.value })} /></div>
          <div className="w-36 space-y-1.5"><Label htmlFor="cp-d">Dal</Label><Input id="cp-d" type="date" value={f.dal} onChange={(e) => setF({ ...f, dal: e.target.value })} /></div>
          <div className="w-36 space-y-1.5"><Label htmlFor="cp-a">Al</Label><Input id="cp-a" type="date" value={f.al} onChange={(e) => setF({ ...f, al: e.target.value })} /></div>
          <div className="w-24 space-y-1.5"><Label htmlFor="cp-u">Usi totali</Label><Input id="cp-u" type="number" min={1} value={f.usi} onChange={(e) => setF({ ...f, usi: e.target.value })} /></div>
          <div className="w-24 space-y-1.5"><Label htmlFor="cp-pc">Per cliente</Label><Input id="cp-pc" type="number" min={1} value={f.perCliente} onChange={(e) => setF({ ...f, perCliente: e.target.value })} /></div>
          <BottoneScrittura disabled={!f.codice.trim()} onClick={() => salva.mutate({ values: { modulo, codice: f.codice.trim(), tipo: f.tipo as Coupon['tipo'], valore: n(f.valore),
            spesa_minima: f.minima ? n(f.minima) : 0, valido_dal: f.dal || null, valido_al: f.al || null, usi_massimi: f.usi ? Number(f.usi) : null,
            usi_per_cliente: f.perCliente ? Number(f.perCliente) : null } }, { onSuccess: () => { toast.success('Coupon creato'); setF({ ...f, codice: '' }) }, onError: (e) => toast.error(messaggioErrore(e)) })}>
            <Ticket className="h-4 w-4" /> Crea</BottoneScrittura>
        </Card>
      )}
      {coupon.length === 0 ? <EmptyState compatto icon={Ticket} title="Nessun coupon" description="Lo sconto si applica alla cassa scrivendo il codice." /> : (
        <Card className="divide-y divide-border">
          {coupon.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="font-mono font-semibold">{c.codice}</span>
              <span className="min-w-40 flex-1 text-muted-foreground">{c.tipo === 'percentuale' ? `−${Number(c.valore)}%` : `−${euro(c.valore)}`}
                {Number(c.spesa_minima) > 0 ? ` · da ${euro(c.spesa_minima)}` : ''}{c.valido_al ? ` · fino al ${new Date(c.valido_al).toLocaleDateString('it-IT')}` : ''}</span>
              <span className="tabular-nums text-muted-foreground">{utilizzi.filter((u) => u.coupon_id === c.id).length}{c.usi_massimi ? `/${c.usi_massimi}` : ''} usi</span>
              {isManager && <Switch checked={c.attivo} aria-label="Attivo" onCheckedChange={(v) => salva.mutate({ id: c.id, values: { attivo: v } })} />}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
