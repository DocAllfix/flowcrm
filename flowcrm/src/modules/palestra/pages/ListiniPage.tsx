/**
 * Listini e regole (documento Palestra §3–4, §8, §13, §27, §32): formule di
 * abbonamento con fasce orarie, ingressi e servizi; pacchetti e carnet anche
 * combinati; regole d'accesso, d'incasso e dei no-show della sede; sale.
 */
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { ManagerOnly } from '@/components/ManagerOnly'
import { useElenco, useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import { usePalestra, type Sede } from '@/modules/palestra/contesto'
import { ConSede, SelettoreSede } from '@/modules/palestra/componenti/ConSede'
import type { Formula, Pacchetto, Sala } from '@/modules/palestra/queries'
import { CARNET_SERVIZIO, FORMULA_TIPO, SALA_TIPO, SERVIZIO, fmtEuro } from '@/modules/palestra/stati'

export function ListiniPage() {
  return <ManagerOnly><ConSede><Listini_ /></ConSede></ManagerOnly>
}

function Listini_() {
  return (
    <div>
      <PageHeader title="Listini e regole" description="Formule, carnet, regole di accesso e d'incasso, sale." actions={<SelettoreSede />} />
      <Tabs defaultValue="formule">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="formule">Abbonamenti</TabsTrigger><TabsTrigger value="pacchetti">Pacchetti e carnet</TabsTrigger>
          <TabsTrigger value="regole">Regole della sede</TabsTrigger><TabsTrigger value="sale">Sale</TabsTrigger>
        </TabsList>
        <TabsContent value="formule"><Formule /></TabsContent>
        <TabsContent value="pacchetti"><Pacchetti /></TabsContent>
        <TabsContent value="regole"><Regole /></TabsContent>
        <TabsContent value="sale"><Sale /></TabsContent>
      </Tabs>
    </div>
  )
}

const num = (s: string) => Number(s.replace(',', '.')) || 0

function Formule() {
  const { data: formule = [] } = useElenco<Formula>('pal_formule', { ordine: [{ colonna: 'ordine' }, { colonna: 'nome' }] })
  const salva = useSalva('pal_formule')
  const vuoto = { nome: '', tipo: 'mensile', mesi: '1', prezzo: '', iscrizione: '0', rate: '1', accessi: '', dalle: '', alle: '', servizi: ['sala_pesi'] as string[], rinnovo: false, limitazioni: '' }
  const [f, setF] = useState(vuoto)

  function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim() || !f.prezzo) { toast.error('Nome e prezzo sono obbligatori'); return }
    if (!f.servizi.length) { toast.error('Scegli almeno un servizio compreso'); return }
    salva.mutate({ values: { nome: f.nome.trim(), tipo: f.tipo, durata_mesi: Number(f.mesi) || 1, prezzo: num(f.prezzo), quota_iscrizione: num(f.iscrizione),
      rate: Number(f.rate) || 1, accessi: f.accessi ? Number(f.accessi) : null, servizi: f.servizi, rinnovo_automatico: f.rinnovo, limitazioni: f.limitazioni.trim() || null,
      fasce: f.dalle && f.alle ? [{ giorni: [1, 2, 3, 4, 5, 6, 7], dalle: f.dalle, alle: f.alle }] : null, ordine: formule.length } }, {
      onSuccess: () => { toast.success('Formula aggiunta al listino'); setF(vuoto) }, onError: (err) => toast.error(messaggioErrore(err)) })
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form onSubmit={crea} className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 xl:grid-cols-6">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="fo-nome">Formula</Label><Input id="fo-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Semestrale open" /></div>
          <div className="space-y-1.5"><Label>Tipo</Label><Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger aria-label="Tipo di formula"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(FORMULA_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="fo-mesi">Durata (mesi)</Label><Input id="fo-mesi" type="number" min={1} value={f.mesi} onChange={(e) => setF({ ...f, mesi: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="fo-prezzo">Prezzo (€)</Label><Input id="fo-prezzo" inputMode="decimal" value={f.prezzo} onChange={(e) => setF({ ...f, prezzo: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="fo-iscr">Iscrizione (€)</Label><Input id="fo-iscr" inputMode="decimal" value={f.iscrizione} onChange={(e) => setF({ ...f, iscrizione: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="fo-rate">Rate</Label><Input id="fo-rate" type="number" min={1} max={24} value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="fo-acc">Ingressi</Label><Input id="fo-acc" type="number" min={1} value={f.accessi} onChange={(e) => setF({ ...f, accessi: e.target.value })} placeholder="Illimitati" /></div>
          <div className="space-y-1.5"><Label htmlFor="fo-dalle">Fascia dalle</Label><Input id="fo-dalle" type="time" value={f.dalle} onChange={(e) => setF({ ...f, dalle: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="fo-alle">alle</Label><Input id="fo-alle" type="time" value={f.alle} onChange={(e) => setF({ ...f, alle: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="fo-lim">Limitazioni</Label><Input id="fo-lim" value={f.limitazioni} onChange={(e) => setF({ ...f, limitazioni: e.target.value })} placeholder="Solo con tessera universitaria…" /></div>
          <fieldset className="col-span-2 md:col-span-4"><legend className="mb-1.5 text-sm font-medium text-foreground">Servizi compresi</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">{Object.entries(SERVIZIO).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.servizi.includes(k)}
                onCheckedChange={(v) => setF({ ...f, servizi: v === true ? [...f.servizi, k] : f.servizi.filter((x) => x !== k) })} />{l}</label>))}
              <label className="flex items-center gap-2 text-sm text-foreground"><Switch checked={f.rinnovo} onCheckedChange={(v) => setF({ ...f, rinnovo: v })} aria-label="Rinnovo automatico" />Rinnovo automatico</label>
            </div></fieldset>
          <div className="col-span-2 flex justify-end"><BottoneScrittura type="submit" variant="outline" disabled={salva.isPending}>Aggiungi la formula</BottoneScrittura></div>
        </form>
      </Card>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Formula</TableHead><TableHead>Comprende</TableHead><TableHead>Regole</TableHead><TableHead className="text-right">Prezzo</TableHead><TableHead>In vendita</TableHead></TableRow></TableHeader>
          <TableBody>{formule.map((x) => {
            const fasce = (x.fasce as { dalle: string; alle: string }[] | null) ?? []
            return (
              <TableRow key={x.id}>
                <TableCell><span className="font-medium text-foreground">{x.nome}</span><span className="block text-xs text-muted-foreground">{FORMULA_TIPO[x.tipo]} · {x.durata_mesi} {x.durata_mesi === 1 ? 'mese' : 'mesi'}</span></TableCell>
                <TableCell className="text-muted-foreground">{x.servizi.map((s) => SERVIZIO[s] ?? s).join(', ')}</TableCell>
                <TableCell className="text-muted-foreground">{[x.accessi ? `${x.accessi} ingressi` : 'ingressi illimitati', fasce.length ? `dalle ${fasce[0].dalle} alle ${fasce[0].alle}` : null,
                  x.rate > 1 ? `${x.rate} rate` : null, x.rinnovo_automatico ? 'rinnovo automatico' : null, x.limitazioni].filter(Boolean).join(' · ')}</TableCell>
                <TableCell numerica>{fmtEuro(x.prezzo)}{Number(x.quota_iscrizione) > 0 && <span className="block text-xs text-muted-foreground">+ {fmtEuro(x.quota_iscrizione)} iscrizione</span>}</TableCell>
                <TableCell><Switch checked={x.attiva} aria-label={`${x.nome} in vendita`} onCheckedChange={(v) => salva.mutate({ id: x.id, values: { attiva: v } }, { onError: (e) => toast.error(messaggioErrore(e)) })} /></TableCell>
              </TableRow>
            )
          })}</TableBody>
        </Table>
      </Card>
    </div>
  )
}

function Pacchetti() {
  const { data: pacchetti = [] } = useElenco<Pacchetto>('pal_pacchetti', { ordine: [{ colonna: 'nome' }] })
  const salva = useSalva('pal_pacchetti')
  const vuoto = { nome: '', prezzo: '', giorni: '180', s1: 'ingressi', q1: '10', s2: 'nessuno', q2: '' }
  const [f, setF] = useState(vuoto)
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 xl:grid-cols-8" onSubmit={(e) => { e.preventDefault()
          if (!f.nome.trim() || !f.prezzo || !Number(f.q1)) { toast.error('Nome, prezzo e quantità sono obbligatori'); return }
          const voci = [{ servizio: f.s1, quantita: Number(f.q1) }, ...(f.s2 !== 'nessuno' && Number(f.q2) ? [{ servizio: f.s2, quantita: Number(f.q2) }] : [])]
          salva.mutate({ values: { nome: f.nome.trim(), prezzo: num(f.prezzo), validita_giorni: Number(f.giorni) || 180, voci } }, {
            onSuccess: () => { toast.success('Pacchetto aggiunto'); setF(vuoto) }, onError: (err) => toast.error(messaggioErrore(err)) }) }}>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="pk-nome">Pacchetto</Label><Input id="pk-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="10 ingressi + 5 massaggi" /></div>
          <div className="space-y-1.5"><Label>Cosa</Label><Select value={f.s1} onValueChange={(v) => setF({ ...f, s1: v })}><SelectTrigger aria-label="Prima prestazione"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(CARNET_SERVIZIO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="pk-q1">Quante</Label><Input id="pk-q1" type="number" min={1} value={f.q1} onChange={(e) => setF({ ...f, q1: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Più (combinato)</Label><Select value={f.s2} onValueChange={(v) => setF({ ...f, s2: v })}><SelectTrigger aria-label="Seconda prestazione"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nessuno">Niente</SelectItem>{Object.entries(CARNET_SERVIZIO).filter(([k]) => k !== f.s1).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="pk-q2">Quante</Label><Input id="pk-q2" type="number" min={1} value={f.q2} onChange={(e) => setF({ ...f, q2: e.target.value })} disabled={f.s2 === 'nessuno'} /></div>
          <div className="space-y-1.5"><Label htmlFor="pk-pr">Prezzo (€)</Label><Input id="pk-pr" inputMode="decimal" value={f.prezzo} onChange={(e) => setF({ ...f, prezzo: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="pk-gg">Valido (giorni)</Label><Input id="pk-gg" type="number" min={1} value={f.giorni} onChange={(e) => setF({ ...f, giorni: e.target.value })} /></div>
          <div className="col-span-2 flex justify-end md:col-span-4 xl:col-span-8"><BottoneScrittura type="submit" variant="outline" disabled={salva.isPending}>Aggiungi il pacchetto</BottoneScrittura></div>
        </form>
      </Card>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Pacchetto</TableHead><TableHead>Contiene</TableHead><TableHead>Validità</TableHead><TableHead className="text-right">Prezzo</TableHead><TableHead>In vendita</TableHead></TableRow></TableHeader>
          <TableBody>{pacchetti.map((x) => (
            <TableRow key={x.id}>
              <TableCell className="font-medium text-foreground">{x.nome}</TableCell>
              <TableCell className="text-muted-foreground">{(x.voci as { servizio: string; quantita: number }[]).map((v) => `${v.quantita} ${CARNET_SERVIZIO[v.servizio]?.toLowerCase() ?? v.servizio}`).join(' + ')}</TableCell>
              <TableCell className="text-muted-foreground">{x.validita_giorni} giorni</TableCell>
              <TableCell numerica>{fmtEuro(x.prezzo)}</TableCell>
              <TableCell><Switch checked={x.attivo} aria-label={`${x.nome} in vendita`} onCheckedChange={(v) => salva.mutate({ id: x.id, values: { attivo: v } })} /></TableCell>
            </TableRow>))}</TableBody>
        </Table>
      </Card>
    </div>
  )
}

function Regole() {
  const { sede } = usePalestra()
  const salva = useSalva('pal_sedi')
  const [f, setF] = useState<Partial<Sede> | null>(null)
  if (!sede) return null
  const v = { ...sede, ...f }
  const campo = (k: keyof Sede, etichetta: string, aiuto: string, decimale = false) => (
    <div className="space-y-1.5"><Label htmlFor={`rg-${k}`}>{etichetta}</Label>
      <Input id={`rg-${k}`} inputMode={decimale ? 'decimal' : 'numeric'} value={String(v[k] ?? '')} onChange={(e) => setF({ ...f, [k]: decimale ? e.target.value : Number(e.target.value) || 0 })} />
      <p className="text-xs text-muted-foreground">{aiuto}</p></div>
  )
  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="flex items-start gap-2 text-sm text-foreground sm:col-span-2 xl:col-span-3"><Switch checked={v.richiede_certificato} onCheckedChange={(x) => setF({ ...f, richiede_certificato: x })} aria-label="Certificato medico obbligatorio" />
          <span>Certificato medico obbligatorio<span className="block text-xs text-muted-foreground">Senza certificato valido l'ingresso è negato.</span></span></label>
        {campo('tolleranza_insoluto_giorni', 'Tolleranza prima dell\'insoluto (giorni)', 'Dopo la scadenza della rata, quanti giorni prima di bloccare l\'accesso.')}
        {campo('retry_giorni', 'Nuovo tentativo di addebito (giorni)', 'Quanto si aspetta dopo un addebito ricorrente fallito.')}
        {campo('tentativi_max', 'Tentativi di addebito', 'Finiti i tentativi la rata diventa insoluta.')}
        {campo('cancellazione_ore', 'Disdetta dei corsi (ore prima)', 'Entro questo termine il credito torna e il posto passa alla lista d\'attesa.')}
        {campo('noshow_penale', 'Penale per assenza (€)', 'Zero = nessuna penale.', true)}
        {campo('noshow_soglia', 'Assenze prima del blocco', 'Assenze senza disdetta nella finestra qui sotto.')}
        {campo('noshow_finestra_giorni', 'Finestra delle assenze (giorni)', 'Periodo in cui si contano le assenze.')}
        {campo('noshow_blocco_giorni', 'Blocco delle prenotazioni (giorni)', 'Zero = nessun blocco.')}
        {campo('referral_giorni', 'Porta un amico (giorni in regalo)', 'Al primo abbonamento dell\'amico; zero = spento.')}
        <label className="flex items-start gap-2 text-sm text-foreground"><Switch checked={v.noshow_consuma_credito} onCheckedChange={(x) => setF({ ...f, noshow_consuma_credito: x })} aria-label="L'assenza consuma il credito" />
          <span>L'assenza consuma il credito del carnet</span></label>
        <label className="flex items-start gap-2 text-sm text-foreground"><Switch checked={v.avvisi_email} onCheckedChange={(x) => setF({ ...f, avvisi_email: x })} aria-label="Avvisi per email" />
          <span>Avvisi per email ai soci<span className="block text-xs text-muted-foreground">Conferme, promemoria, scadenze, pagamenti. SMS, WhatsApp e notifiche dell'app sono predisposti.</span></span></label>
      </div>
      <div className="mt-4 flex justify-end">
        <BottoneScrittura disabled={!f || salva.isPending} onClick={() => salva.mutate({ id: sede.id, values: { ...f, ...(f?.noshow_penale !== undefined ? { noshow_penale: num(String(f.noshow_penale)) } : {}) } }, {
          onSuccess: () => { toast.success('Regole aggiornate'); setF(null) }, onError: (e) => toast.error(messaggioErrore(e)) })}>Salva le regole</BottoneScrittura>
      </div>
    </Card>
  )
}

function Sale() {
  const { sedeId } = usePalestra()
  const { data: sale = [] } = useElenco<Sala>('pal_sale', { filtri: { sede_id: sedeId ?? undefined }, ordine: [{ colonna: 'nome' }], abilitato: !!sedeId })
  const salva = useSalva('pal_sale')
  const [f, setF] = useState({ nome: '', tipo: 'multifunzione', capienza: '20', attrezzature: '' })
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (!f.nome.trim()) return
          salva.mutate({ values: { sede_id: sedeId!, nome: f.nome.trim(), tipo: f.tipo, capienza: Number(f.capienza) || null,
            attrezzature: f.attrezzature.split(',').map((x) => x.trim()).filter(Boolean) } }, {
            onSuccess: () => { toast.success('Sala aggiunta'); setF({ ...f, nome: '', attrezzature: '' }) }, onError: (err) => toast.error(/23505/.test(JSON.stringify(err)) ? 'C\'è già una sala con questo nome' : messaggioErrore(err)) }) }}>
          <div className="min-w-48 flex-1 space-y-1.5"><Label htmlFor="sl-nome">Sala o ambiente</Label><Input id="sl-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div className="w-44 space-y-1.5"><Label>Tipo</Label><Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}><SelectTrigger aria-label="Tipo di sala"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(SALA_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="w-28 space-y-1.5"><Label htmlFor="sl-cap">Capienza</Label><Input id="sl-cap" type="number" min={1} value={f.capienza} onChange={(e) => setF({ ...f, capienza: e.target.value })} /></div>
          <div className="min-w-48 flex-1 space-y-1.5"><Label htmlFor="sl-att">Attrezzature</Label><Input id="sl-att" value={f.attrezzature} onChange={(e) => setF({ ...f, attrezzature: e.target.value })} placeholder="Specchi, impianto audio, 20 bike" /></div>
          <BottoneScrittura type="submit" variant="outline" disabled={!f.nome.trim()}>Aggiungi</BottoneScrittura>
        </form>
      </Card>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Sala</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Capienza</TableHead><TableHead>Attrezzature</TableHead><TableHead>Disponibile</TableHead></TableRow></TableHeader>
          <TableBody>{sale.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium text-foreground">{s.nome}</TableCell>
              <TableCell><Badge tone="neutral">{SALA_TIPO[s.tipo]}</Badge></TableCell>
              <TableCell numerica>{s.capienza ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{s.attrezzature.join(', ') || '—'}</TableCell>
              <TableCell><Switch checked={s.attiva} aria-label={`${s.nome} disponibile`} onCheckedChange={(v) => salva.mutate({ id: s.id, values: { attiva: v } })} /></TableCell>
            </TableRow>))}</TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground">Spogliatoi e armadietti si gestiscono in «Spogliatoi»; le attrezzature fitness con la loro manutenzione in «Attrezzature e pulizie».</p>
    </div>
  )
}
