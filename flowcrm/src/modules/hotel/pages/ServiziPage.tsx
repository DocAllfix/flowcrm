/**
 * Servizi (documento Hotel §18, §27, §35, §36): agenda di SPA, massaggi e
 * servizi extra con cabina e operatore (mai due prenotazioni sovrapposte),
 * catalogo con prezzi e durate, parcheggio con ingressi e uscite, transfer.
 * Ogni servizio erogato va sul conto della camera (o su un conto del
 * cliente esterno).
 */
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Car, CircleCheck, Plane, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/lib/queries/users'
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useSalva, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { useHotel } from '@/modules/hotel/contesto'
import { ConStruttura, SelettoreStruttura } from '@/modules/hotel/componenti/ConStruttura'
import { type Servizio, type ServizioPrenotazione } from '@/modules/hotel/queries'
import { SERVIZIO_STATO, SERVIZIO_TIPO, TRANSFER_STATO, TRANSFER_TIPO, fmtEuro, fmtGiornoOra, fmtOra, oggiIso, piuGiorni } from '@/modules/hotel/stati'

type InCasa = Database['public']['Views']['hotel_conti_in_casa']['Row']
const TABELLE_SERVIZI = ['hotel_servizi_prenotazioni', 'hotel_parcheggio', 'hotel_transfer', 'conti', 'conti_righe', 'conti_saldi']

export function ServiziPage() {
  return <ConStruttura><Servizi_ /></ConStruttura>
}

function Servizi_() {
  const { isManager } = useAuth()
  return (
    <div>
      <PageHeader title="Servizi" description="SPA e benessere, servizi extra, parcheggio e transfer: tutto sul conto della camera." actions={<SelettoreStruttura />} />
      <Tabs defaultValue="agenda">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="agenda">Agenda</TabsTrigger><TabsTrigger value="parcheggio">Parcheggio</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>{isManager && <TabsTrigger value="catalogo">Catalogo</TabsTrigger>}
        </TabsList>
        <TabsContent value="agenda"><Agenda /></TabsContent>
        <TabsContent value="parcheggio"><Parcheggio /></TabsContent>
        <TabsContent value="transfer"><Transfer /></TabsContent>
        {isManager && <TabsContent value="catalogo"><Catalogo /></TabsContent>}
      </Tabs>
    </div>
  )
}

/** Ospiti in casa (per addebitare sulla camera). */
function useInCasa() {
  const { strutturaId } = useHotel()
  return useElenco<InCasa>('hotel_conti_in_casa', { filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'camera' }], abilitato: !!strutturaId }).data ?? []
}

function Agenda() {
  const { strutturaId } = useHotel()
  const { data: persone = [] } = useUsers()
  const inCasa = useInCasa()
  useDalVivo(['hotel_servizi_prenotazioni'])
  const [giorno, setGiorno] = useState(oggiIso())
  const { data: servizi = [] } = useElenco<Servizio>('hotel_servizi', { filtri: { struttura_id: strutturaId ?? undefined, attivo: true }, ordine: [{ colonna: 'nome' }], abilitato: !!strutturaId })
  const { data: agenda = [], isLoading } = useElenco<ServizioPrenotazione>('hotel_servizi_prenotazioni', {
    filtri: { struttura_id: strutturaId ?? undefined }, tra: { colonna: 'inizio', da: `${giorno}T00:00:00`, a: `${piuGiorni(giorno, 1)}T00:00:00` },
    ordine: [{ colonna: 'inizio' }], abilitato: !!strutturaId,
  })
  const salva = useSalva('hotel_servizi_prenotazioni', TABELLE_SERVIZI)
  const [f, setF] = useState({ servizio: '', chi: 'esterno', nome: '', ora: '10:00', operatore: 'nessuno', risorsa: 'nessuna', quantita: '1' })
  const servizio = servizi.find((s) => s.id === f.servizio)
  const nomeServizio = (id: string) => servizi.find((s) => s.id === id)?.nome ?? 'Servizio'
  const nomeOperatore = (id: string | null) => { const u = persone.find((x) => x.id === id); return u ? `${u.nome} ${u.cognome ?? ''}`.trim() : null }

  function prenota(e: FormEvent) {
    e.preventDefault()
    const ospite = f.chi === 'esterno' ? f.nome.trim() : inCasa.find((x) => x.prenotazione_id === f.chi)?.ospite_nome
    if (!servizio || !ospite) { toast.error('Servizio e cliente'); return }
    const inizio = new Date(`${giorno}T${f.ora}`)
    salva.mutate({ values: { struttura_id: strutturaId!, servizio_id: servizio.id, prenotazione_id: f.chi === 'esterno' ? null : f.chi, ospite_nome: ospite,
      inizio: inizio.toISOString(), fine: new Date(inizio.getTime() + (servizio.durata_min ?? 60) * 60_000).toISOString(),
      quantita: Number(f.quantita) || 1, operatore_id: f.operatore === 'nessuno' ? null : f.operatore, risorsa: f.risorsa === 'nessuna' ? null : f.risorsa } }, {
      onSuccess: () => { toast.success(`${servizio.nome} alle ${f.ora} per ${ospite}`); setF({ ...f, nome: '' }) },
      onError: (err) => toast.error(/23P01|hotel_risorsa_libera/.test(JSON.stringify(err)) ? `${f.risorsa} è già occupata a quell'ora`
        : /hotel_operatore_libero/.test(JSON.stringify(err)) ? 'L\'operatore è già impegnato a quell\'ora' : messaggioErrore(err)),
    })
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={prenota} className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          <div className="space-y-1.5"><Label htmlFor="ag-g">Giorno</Label><Input id="ag-g" type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Servizio</Label>
            <Select value={f.servizio} onValueChange={(v) => setF({ ...f, servizio: v, risorsa: 'nessuna' })}><SelectTrigger aria-label="Servizio"><SelectValue placeholder="Scegli…" /></SelectTrigger>
              <SelectContent>{servizi.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome} · {fmtEuro(s.prezzo)}{s.durata_min ? ` · ${s.durata_min}′` : ''}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5"><Label>Per</Label>
            <Select value={f.chi} onValueChange={(v) => setF({ ...f, chi: v })}><SelectTrigger aria-label="Cliente"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="esterno">Cliente esterno</SelectItem>{inCasa.map((x) => <SelectItem key={x.prenotazione_id!} value={x.prenotazione_id!}>Camera {x.camera} · {x.ospite_nome}</SelectItem>)}</SelectContent></Select></div>
          {f.chi === 'esterno' && <div className="space-y-1.5"><Label htmlFor="ag-n">Nome</Label><Input id="ag-n" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>}
          <div className="space-y-1.5"><Label htmlFor="ag-o">Ora</Label><Input id="ag-o" type="time" value={f.ora} onChange={(e) => setF({ ...f, ora: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ag-q">Quantità</Label><Input id="ag-q" type="number" min={1} value={f.quantita} onChange={(e) => setF({ ...f, quantita: e.target.value })} /></div>
          {servizio && servizio.risorse.length > 0 && (
            <div className="space-y-1.5"><Label>Cabina</Label>
              <Select value={f.risorsa} onValueChange={(v) => setF({ ...f, risorsa: v })}><SelectTrigger aria-label="Cabina"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="nessuna">—</SelectItem>{servizio.risorse.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
          )}
          {servizio?.richiede_operatore && (
            <div className="space-y-1.5"><Label>Operatore</Label>
              <Select value={f.operatore} onValueChange={(v) => setF({ ...f, operatore: v })}><SelectTrigger aria-label="Operatore"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="nessuno">—</SelectItem>{persone.filter((u) => u.attivo).map((u) => <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>)}</SelectContent></Select></div>
          )}
          <div className="col-span-2 flex items-end justify-end sm:col-span-4 xl:col-span-8"><BottoneScrittura type="submit">Prenota</BottoneScrittura></div>
        </form>
      </Card>
      {isLoading ? <Skeleton className="h-40" /> : agenda.length === 0 ? (
        <EmptyState compatto icon={Sparkles} filtrato title="Nessun servizio in agenda" description="Cambia giorno, oppure prenota qui sopra." />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Ora</TableHead><TableHead>Servizio</TableHead><TableHead>Cliente</TableHead><TableHead>Cabina e operatore</TableHead><TableHead>Stato</TableHead><TableHead className="text-right">Prezzo</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{agenda.map((a) => {
              const st = SERVIZIO_STATO[a.stato]
              return (
                <TableRow key={a.id}>
                  <TableCell className="tabular-nums text-foreground">{fmtOra(a.inizio)}–{fmtOra(a.fine)}</TableCell>
                  <TableCell className="text-foreground">{nomeServizio(a.servizio_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{a.ospite_nome}{a.prenotazione_id ? '' : ' · esterno'}</TableCell>
                  <TableCell className="text-muted-foreground">{[a.risorsa, nomeOperatore(a.operatore_id)].filter(Boolean).join(' · ') || '—'}</TableCell>
                  <TableCell><Badge tone={st.tone}>{st.label}</Badge></TableCell>
                  <TableCell numerica>{fmtEuro(Number(a.prezzo_unitario ?? 0) * Number(a.quantita))}</TableCell>
                  <TableCell className="text-right">
                    {['prenotato', 'confermato'].includes(a.stato) && (
                      <span className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => salva.mutate({ id: a.id, values: { stato: 'erogato' } }, {
                          onSuccess: () => toast.success(a.prenotazione_id ? 'Erogato: sul conto della camera' : 'Erogato: conto del cliente pronto in cassa'),
                          onError: (e) => toast.error(messaggioErrore(e)) })}><CircleCheck className="h-3.5 w-3.5" /> Erogato</Button>
                        <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: a.id, values: { stato: 'annullato' } })}>Annulla</Button>
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Parcheggio() {
  const { strutturaId, struttura } = useHotel()
  const inCasa = useInCasa()
  useDalVivo(['hotel_parcheggio'])
  const { data: soste = [], isLoading } = useElenco<Tables<'hotel_parcheggio'>>('hotel_parcheggio', {
    filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'ingresso_at', crescente: false }], limite: 200, abilitato: !!strutturaId,
  })
  const salva = useSalva('hotel_parcheggio', TABELLE_SERVIZI)
  const [f, setF] = useState({ chi: 'nessuno', targa: '', veicolo: '', posto: '', tariffa: '15' })
  const dentro = soste.filter((s) => !s.uscita_at)
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); if (!f.targa.trim()) return
          salva.mutate({ values: { struttura_id: strutturaId!, prenotazione_id: f.chi === 'nessuno' ? null : f.chi, targa: f.targa, veicolo: f.veicolo || null,
            posto: f.posto || null, tariffa_giorno: Number(f.tariffa.replace(',', '.')) || 0 } }, {
            onSuccess: () => { toast.success(`${f.targa.toUpperCase()} entrato`); setF({ ...f, targa: '', veicolo: '', posto: '' }) },
            onError: (err) => toast.error(/uq_hotel_parcheggio_posto/.test(JSON.stringify(err)) ? 'Posto già occupato' : messaggioErrore(err)) }) }}
          className="flex flex-wrap items-end gap-3">
          <div className="w-56 space-y-1.5"><Label>Ospite</Label>
            <Select value={f.chi} onValueChange={(v) => setF({ ...f, chi: v })}><SelectTrigger aria-label="Ospite"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">Senza camera</SelectItem>{inCasa.map((x) => <SelectItem key={x.prenotazione_id!} value={x.prenotazione_id!}>Camera {x.camera} · {x.ospite_nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="w-32 space-y-1.5"><Label htmlFor="pk-t">Targa</Label><Input id="pk-t" value={f.targa} onChange={(e) => setF({ ...f, targa: e.target.value })} className="font-mono uppercase" /></div>
          <div className="w-40 space-y-1.5"><Label htmlFor="pk-v">Veicolo</Label><Input id="pk-v" value={f.veicolo} onChange={(e) => setF({ ...f, veicolo: e.target.value })} /></div>
          <div className="w-24 space-y-1.5"><Label htmlFor="pk-p">Posto</Label><Input id="pk-p" value={f.posto} onChange={(e) => setF({ ...f, posto: e.target.value })} /></div>
          <div className="w-28 space-y-1.5"><Label htmlFor="pk-tar">€ al giorno</Label><Input id="pk-tar" inputMode="decimal" value={f.tariffa} onChange={(e) => setF({ ...f, tariffa: e.target.value })} /></div>
          <BottoneScrittura type="submit" variant="outline"><Car className="h-4 w-4" /> Ingresso</BottoneScrittura>
          <p className="ml-auto text-sm text-muted-foreground">{dentro.length}{struttura?.posti_auto ? ` su ${struttura.posti_auto}` : ''} posti occupati · targhe e telecamere predisposte</p>
        </form>
      </Card>
      {isLoading ? <Skeleton className="h-40" /> : soste.length === 0 ? (
        <EmptyState compatto icon={Car} filtrato title="Nessun veicolo" description="Ingressi e uscite del parcheggio dell'hotel." />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Targa</TableHead><TableHead>Posto</TableHead><TableHead>Ingresso</TableHead><TableHead>Uscita</TableHead><TableHead className="text-right">Addebito</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{soste.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-foreground">{s.targa}<span className="block font-sans text-xs text-muted-foreground">{s.veicolo}</span></TableCell>
                <TableCell className="text-muted-foreground">{s.posto ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{fmtGiornoOra(s.ingresso_at)}</TableCell>
                <TableCell className="text-muted-foreground">{s.uscita_at ? fmtGiornoOra(s.uscita_at) : <Badge tone="info">Dentro</Badge>}</TableCell>
                <TableCell numerica>{s.giorni ? `${s.giorni} × ${fmtEuro(s.tariffa_giorno)}` : '—'}</TableCell>
                <TableCell className="text-right">{!s.uscita_at && (
                  <Button size="sm" variant="outline" onClick={() => salva.mutate({ id: s.id, values: { uscita_at: new Date().toISOString() } }, {
                    onSuccess: () => toast.success(s.prenotazione_id ? 'Uscito: giornate sul conto della camera' : 'Uscito'), onError: (e) => toast.error(messaggioErrore(e)) })}>Uscita</Button>
                )}</TableCell>
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Transfer() {
  const { strutturaId } = useHotel()
  const { isManager } = useAuth()
  const inCasa = useInCasa()
  const { data: elenco = [], isLoading } = useElenco<Tables<'hotel_transfer'>>('hotel_transfer', {
    filtri: { struttura_id: strutturaId ?? undefined }, tra: { colonna: 'data_ora', da: `${piuGiorni(oggiIso(), -7)}T00:00:00` },
    ordine: [{ colonna: 'data_ora' }], limite: 300, abilitato: !!strutturaId,
  })
  const salva = useSalva('hotel_transfer', TABELLE_SERVIZI)
  const [f, setF] = useState({ chi: 'nessuno', nome: '', tipo: 'aeroporto', direzione: 'arrivo', data: oggiIso(), ora: '10:00', luogo: '', riferimento: '',
    passeggeri: '1', autista: '', veicolo: '', costo: '', prezzo: '' })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const futuri = useMemo(() => elenco.filter((t) => t.stato !== 'annullato'), [elenco])
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={(e) => { e.preventDefault()
          const ospite = f.chi === 'nessuno' ? f.nome.trim() : inCasa.find((x) => x.prenotazione_id === f.chi)?.ospite_nome
          if (!ospite || !f.luogo.trim()) { toast.error('Ospite e luogo'); return }
          salva.mutate({ values: { struttura_id: strutturaId!, prenotazione_id: f.chi === 'nessuno' ? null : f.chi, ospite_nome: ospite, tipo: f.tipo, direzione: f.direzione,
            data_ora: new Date(`${f.data}T${f.ora}`).toISOString(), luogo: f.luogo.trim(), riferimento: f.riferimento || null, passeggeri: Number(f.passeggeri) || 1,
            autista: f.autista || null, veicolo: f.veicolo || null, costo: f.costo ? Number(f.costo.replace(',', '.')) : null, prezzo: f.prezzo ? Number(f.prezzo.replace(',', '.')) : null } }, {
            onSuccess: () => { toast.success('Transfer registrato'); setF({ ...f, luogo: '', riferimento: '', nome: '' }) }, onError: (err) => toast.error(messaggioErrore(err)) }) }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          <div className="col-span-2 space-y-1.5"><Label>Ospite</Label>
            <Select value={f.chi} onValueChange={(v) => setF({ ...f, chi: v })}><SelectTrigger aria-label="Ospite"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="nessuno">In arrivo (scrivi il nome)</SelectItem>{inCasa.map((x) => <SelectItem key={x.prenotazione_id!} value={x.prenotazione_id!}>Camera {x.camera} · {x.ospite_nome}</SelectItem>)}</SelectContent></Select></div>
          {f.chi === 'nessuno' && <div className="space-y-1.5"><Label htmlFor="tr-n">Nome</Label><Input id="tr-n" value={f.nome} onChange={set('nome')} /></div>}
          <div className="space-y-1.5"><Label>Tipo</Label><Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger aria-label="Tipo di transfer"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(TRANSFER_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Direzione</Label><Select value={f.direzione} onValueChange={(v) => setF({ ...f, direzione: v })}><SelectTrigger aria-label="Direzione"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="arrivo">Arrivo</SelectItem><SelectItem value="partenza">Partenza</SelectItem><SelectItem value="andata_ritorno">Andata e ritorno</SelectItem><SelectItem value="giro">Giro</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="tr-d">Giorno</Label><Input id="tr-d" type="date" value={f.data} onChange={set('data')} /></div>
          <div className="space-y-1.5"><Label htmlFor="tr-o">Ora</Label><Input id="tr-o" type="time" value={f.ora} onChange={set('ora')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="tr-l">Luogo</Label><Input id="tr-l" value={f.luogo} onChange={set('luogo')} placeholder="Aeroporto di Pisa" /></div>
          <div className="space-y-1.5"><Label htmlFor="tr-r">Volo o treno</Label><Input id="tr-r" value={f.riferimento} onChange={set('riferimento')} /></div>
          <div className="space-y-1.5"><Label htmlFor="tr-p">Passeggeri</Label><Input id="tr-p" type="number" min={1} value={f.passeggeri} onChange={set('passeggeri')} /></div>
          <div className="space-y-1.5"><Label htmlFor="tr-a">Autista</Label><Input id="tr-a" value={f.autista} onChange={set('autista')} /></div>
          <div className="space-y-1.5"><Label htmlFor="tr-v">Veicolo</Label><Input id="tr-v" value={f.veicolo} onChange={set('veicolo')} /></div>
          {isManager && <div className="space-y-1.5"><Label htmlFor="tr-c">Costo (€)</Label><Input id="tr-c" inputMode="decimal" value={f.costo} onChange={set('costo')} /></div>}
          <div className="space-y-1.5"><Label htmlFor="tr-pr">Prezzo all'ospite (€)</Label><Input id="tr-pr" inputMode="decimal" value={f.prezzo} onChange={set('prezzo')} /></div>
          <div className="col-span-2 flex items-end justify-end sm:col-span-4 xl:col-span-6"><BottoneScrittura type="submit" variant="outline"><Plane className="h-4 w-4" /> Registra il transfer</BottoneScrittura></div>
        </form>
      </Card>
      {isLoading ? <Skeleton className="h-40" /> : futuri.length === 0 ? (
        <EmptyState compatto icon={Plane} filtrato title="Nessun transfer" description="Arrivi e partenze da aeroporto, stazione e porto, escursioni e navette." />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Ospite</TableHead><TableHead>Tragitto</TableHead><TableHead>Autista</TableHead><TableHead>Stato</TableHead><TableHead className="text-right">Prezzo</TableHead></TableRow></TableHeader>
            <TableBody>{futuri.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-foreground">{fmtGiornoOra(t.data_ora)}</TableCell>
                <TableCell className="text-muted-foreground">{t.ospite_nome} · {t.passeggeri} pers.</TableCell>
                <TableCell className="text-muted-foreground">{TRANSFER_TIPO[t.tipo]} · {t.luogo}{t.riferimento ? ` · ${t.riferimento}` : ''}</TableCell>
                <TableCell className="text-muted-foreground">{[t.autista, t.veicolo].filter(Boolean).join(' · ') || '—'}</TableCell>
                <TableCell><Select value={t.stato} onValueChange={(v) => salva.mutate({ id: t.id, values: { stato: v } }, {
                  onSuccess: () => v === 'svolto' && toast.success(t.prenotazione_id ? 'Svolto: sul conto della camera' : 'Svolto'), onError: (e) => toast.error(messaggioErrore(e)) })}>
                  <SelectTrigger className="h-8 w-32" aria-label="Stato del transfer"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TRANSFER_STATO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></TableCell>
                <TableCell numerica>{fmtEuro(t.prezzo)}</TableCell>
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function Catalogo() {
  const { strutturaId } = useHotel()
  const { data: servizi = [] } = useElenco<Servizio>('hotel_servizi', { filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'nome' }], abilitato: !!strutturaId })
  const salva = useSalva('hotel_servizi', ['hotel_servizi'])
  const [f, setF] = useState({ nome: '', tipo: 'massaggio', prezzo: '', iva: '22', unita: 'volta', durata: '', operatore: false, risorse: '' })
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={(e) => { e.preventDefault(); if (!f.nome.trim()) return
          salva.mutate({ values: { struttura_id: strutturaId!, nome: f.nome.trim(), tipo: f.tipo, prezzo: Number(f.prezzo.replace(',', '.')) || 0, aliquota_iva: Number(f.iva) || 22,
            unita: f.unita, durata_min: f.durata ? Number(f.durata) : null, richiede_operatore: f.operatore,
            risorse: f.risorse.split(',').map((x) => x.trim()).filter(Boolean) } }, {
            onSuccess: () => { toast.success('Servizio aggiunto'); setF({ ...f, nome: '', prezzo: '' }) }, onError: (err) => toast.error(messaggioErrore(err)) }) }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="sv-n">Servizio</Label><Input id="sv-n" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Massaggio decontratturante" /></div>
          <div className="space-y-1.5"><Label>Tipo</Label><Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger aria-label="Tipo di servizio"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(SERVIZIO_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="sv-p">Prezzo (€)</Label><Input id="sv-p" inputMode="decimal" value={f.prezzo} onChange={(e) => setF({ ...f, prezzo: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="sv-i">IVA %</Label><Input id="sv-i" type="number" value={f.iva} onChange={(e) => setF({ ...f, iva: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Per</Label><Select value={f.unita} onValueChange={(v) => setF({ ...f, unita: v })}><SelectTrigger aria-label="Unità"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="volta">Volta</SelectItem><SelectItem value="persona">Persona</SelectItem><SelectItem value="notte">Notte</SelectItem><SelectItem value="ora">Ora</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="sv-d">Durata (min)</Label><Input id="sv-d" type="number" value={f.durata} onChange={(e) => setF({ ...f, durata: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="sv-r">Cabine (separate da virgola)</Label><Input id="sv-r" value={f.risorse} onChange={(e) => setF({ ...f, risorse: e.target.value })} placeholder="Cabina 1, Cabina 2" /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.operatore} onCheckedChange={(v) => setF({ ...f, operatore: v })} /> Serve un operatore</label>
          <div className="col-span-2 flex justify-end sm:col-span-3"><BottoneScrittura type="submit" variant="outline">Aggiungi</BottoneScrittura></div>
        </form>
      </Card>
      {servizi.length === 0 ? <EmptyState compatto icon={Sparkles} title="Catalogo vuoto" description="SPA, massaggi, noleggio biciclette, escursioni, late check-out…"
        action={<Button variant="outline" onClick={() => document.getElementById('sv-n')?.focus()}>Aggiungi il primo</Button>} /> : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Servizio</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Prezzo</TableHead><TableHead>Durata e cabine</TableHead><TableHead>Attivo</TableHead></TableRow></TableHeader>
            <TableBody>{servizi.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-foreground">{s.nome}</TableCell><TableCell className="text-muted-foreground">{SERVIZIO_TIPO[s.tipo]}</TableCell>
                <TableCell numerica>{fmtEuro(s.prezzo)} <span className="text-xs text-muted-foreground">/ {s.unita}</span></TableCell>
                <TableCell className="text-muted-foreground">{s.durata_min ? `${s.durata_min}′` : '—'}{s.risorse.length ? ` · ${s.risorse.join(', ')}` : ''}{s.richiede_operatore ? ' · operatore' : ''}</TableCell>
                <TableCell><Switch checked={s.attivo} aria-label={`${s.nome} attivo`} onCheckedChange={(v) => salva.mutate({ id: s.id, values: { attivo: v } })} /></TableCell>
              </TableRow>))}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
