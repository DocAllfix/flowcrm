/**
 * Abbonamenti e carnet del socio (documento Palestra §3–6): vendita con le
 * rate, sospensioni e proroghe, rinnovo, disdetta; carnet con i residui.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarPlus, PauseCircle, RefreshCw, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { useElenco, useInserisci, useSalva, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import { usePalestra } from '@/modules/palestra/contesto'
import { useCatalogoPalestra, TABELLE_SOCIO, type Abbonamento, type CarnetStato, type SocioStato, type Sospensione } from '@/modules/palestra/queries'
import { ABBONAMENTO_STATO, CARNET_SERVIZIO, METODO, SOSPENSIONE_TIPO, fmtData, fmtEuro, oggiIso, giorniTra } from '@/modules/palestra/stati'

type AbbonamentoF = Abbonamento & { pal_formule: { nome: string; servizi: string[] } | null }

export function AbbonamentiSocio({ socio }: { socio: SocioStato }) {
  const { sedeId } = usePalestra()
  const { isManager } = useAuth()
  const { formule, pacchetti } = useCatalogoPalestra(sedeId)
  const { data: abb = [] } = useElenco<AbbonamentoF>('pal_abbonamenti', {
    filtri: { socio_id: socio.socio_id! }, select: '*, pal_formule(nome, servizi)', ordine: [{ colonna: 'inizio', crescente: false }] })
  const { data: sosp = [] } = useElenco<Sospensione>('pal_sospensioni', { filtri: { abbonamento_id: abb.map((a) => a.id) }, ordine: [{ colonna: 'created_at' }], abilitato: abb.length > 0 })
  const { data: carnet = [] } = useElenco<CarnetStato>('pal_carnet_stato', { filtri: { socio_id: socio.socio_id! }, ordine: [{ colonna: 'acquistato_il', crescente: false }] })
  const vendi = useInserisci('pal_abbonamenti', TABELLE_SOCIO)
  const salva = useSalva('pal_abbonamenti', TABELLE_SOCIO)
  const rinnova = useAzione('pal_rinnova', TABELLE_SOCIO)
  const vendiPacchetto = useAzione('pal_vendi_pacchetto', TABELLE_SOCIO)
  const [v, setV] = useState({ formula: '', inizio: oggiIso(), metodo: 'pos', prezzo: '' })
  const [p, setP] = useState({ pacchetto: '', metodo: 'pos' })
  const [sospendi, setSospendi] = useState<AbbonamentoF | null>(null)
  const formula = formule.find((x) => x.id === v.formula)

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-title text-foreground"><CalendarPlus className="h-4 w-4 text-primary-testo" /> Vendi un abbonamento</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5"><Label>Formula</Label>
            <Select value={v.formula} onValueChange={(x) => setV({ ...v, formula: x })}>
              <SelectTrigger aria-label="Formula"><SelectValue placeholder="Scegli la formula" /></SelectTrigger>
              <SelectContent>{formule.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome} · {fmtEuro(x.prezzo)}{x.accessi ? ` · ${x.accessi} ingressi` : ''}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="w-40 space-y-1.5"><Label htmlFor="va-inizio">Dal</Label><Input id="va-inizio" type="date" value={v.inizio} onChange={(e) => setV({ ...v, inizio: e.target.value })} /></div>
          <div className="w-44 space-y-1.5"><Label>Pagamento</Label>
            <Select value={v.metodo} onValueChange={(x) => setV({ ...v, metodo: x })}><SelectTrigger aria-label="Metodo di pagamento"><SelectValue /></SelectTrigger>
              <SelectContent>{['contanti', 'pos', 'carta', 'bonifico', 'online', 'addebito_ricorrente'].map((k) => <SelectItem key={k} value={k}>{METODO[k]}</SelectItem>)}</SelectContent></Select></div>
          {isManager && <div className="w-32 space-y-1.5"><Label htmlFor="va-prezzo">Prezzo speciale</Label>
            <Input id="va-prezzo" inputMode="decimal" value={v.prezzo} onChange={(e) => setV({ ...v, prezzo: e.target.value })} placeholder="Listino" /></div>}
          <BottoneScrittura variant="outline" disabled={!formula || vendi.isPending}
            onClick={() => vendi.mutate({ socio_id: socio.socio_id!, formula_id: v.formula, inizio: v.inizio, metodo_pagamento: v.metodo as 'pos',
              ...(v.prezzo ? { prezzo: Number(v.prezzo.replace(',', '.')) } : {}) }, {
              onSuccess: (a) => { toast.success(`${formula!.nome} venduto fino al ${fmtData(a.fine)}: rate in «Pagamenti»`); setV({ ...v, formula: '', prezzo: '' }) },
              onError: (e) => toast.error(messaggioErrore(e)) })}>Vendi</BottoneScrittura>
        </div>
        {formula && <p className="mt-2 text-xs text-muted-foreground">{formula.durata_mesi} {formula.durata_mesi === 1 ? 'mese' : 'mesi'}
          {formula.rate > 1 ? `, ${formula.rate} rate` : ', rata unica'}{Number(formula.quota_iscrizione) > 0 && abb.length === 0 ? ` più ${fmtEuro(formula.quota_iscrizione)} d'iscrizione` : ''}
          {formula.limitazioni ? ` · ${formula.limitazioni}` : ''}.</p>}
      </Card>

      <Card className="overflow-x-auto">
        <h3 className="px-5 pt-4 text-title text-foreground">Abbonamenti</h3>
        {abb.length === 0 ? <p className="px-5 py-4 text-sm text-muted-foreground">Ancora nessun abbonamento: si vende qui sopra.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Formula</TableHead><TableHead>Periodo</TableHead><TableHead>Stato</TableHead><TableHead>Ingressi</TableHead>
              <TableHead>Rinnovo automatico</TableHead><TableHead className="text-right">Prezzo</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{abb.map((a) => {
              const st = ABBONAMENTO_STATO[a.stato]
              const mieSosp = sosp.filter((z) => z.abbonamento_id === a.id)
              const vivo = a.stato === 'attivo' || a.stato === 'sospeso'
              return (
                <TableRow key={a.id}>
                  <TableCell><span className="font-medium text-foreground">{a.pal_formule?.nome}</span><span className="block font-mono text-xs text-muted-foreground">{a.codice}</span>
                    {mieSosp.map((z) => <span key={z.id} className="block text-xs text-muted-foreground">{SOSPENSIONE_TIPO[z.tipo]} {z.dal ? `${fmtData(z.dal)}–${fmtData(z.al)}` : `+${z.giorni} gg`} · {z.stato === 'approvata' ? 'autorizzata' : z.stato === 'rifiutata' ? 'rifiutata' : 'da autorizzare'}</span>)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtData(a.inizio)} → {fmtData(a.fine)}</TableCell>
                  <TableCell><Badge tone={st.tone}>{st.label}</Badge></TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{a.accessi_totali ? `${a.accessi_usati}/${a.accessi_totali}` : 'illimitati'}</TableCell>
                  <TableCell><Switch checked={!!a.rinnovo_automatico} disabled={!vivo} aria-label="Rinnovo automatico"
                    onCheckedChange={(x) => salva.mutate({ id: a.id, values: { rinnovo_automatico: x } }, { onError: (e) => toast.error(messaggioErrore(e)) })} /></TableCell>
                  <TableCell numerica>{fmtEuro(a.prezzo)}{Number(a.quota_azienda) > 0 && <span className="block text-xs text-muted-foreground">di cui azienda {fmtEuro(a.quota_azienda)}</span>}</TableCell>
                  <TableCell className="text-right">{vivo && (
                    <span className="inline-flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setSospendi(a)}><PauseCircle className="h-3.5 w-3.5" /> Sospendi</Button>
                      <Button size="sm" variant="ghost" disabled={rinnova.isPending} onClick={() => rinnova.mutate({ p_abbonamento: a.id }, {
                        onSuccess: () => toast.success('Rinnovato: nuovo abbonamento dal giorno dopo la scadenza'), onError: (e) => toast.error(messaggioErrore(e)) })}>
                        <RefreshCw className="h-3.5 w-3.5" /> Rinnova</Button>
                      <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: a.id, values: { stato: 'disdetto' } }, {
                        onSuccess: () => toast.success('Abbonamento disdetto: niente rinnovo automatico'), onError: (e) => toast.error(messaggioErrore(e)) })}>Disdici</Button>
                    </span>)}</TableCell>
                </TableRow>
              )
            })}</TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-title text-foreground"><Ticket className="h-4 w-4 text-primary-testo" /> Carnet</h3>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5"><Label>Pacchetto</Label>
            <Select value={p.pacchetto} onValueChange={(x) => setP({ ...p, pacchetto: x })}>
              <SelectTrigger aria-label="Pacchetto"><SelectValue placeholder="10 ingressi, 10 lezioni PT…" /></SelectTrigger>
              <SelectContent>{pacchetti.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome} · {fmtEuro(x.prezzo)}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="w-40 space-y-1.5"><Label>Pagamento</Label>
            <Select value={p.metodo} onValueChange={(x) => setP({ ...p, metodo: x })}><SelectTrigger aria-label="Pagamento del carnet"><SelectValue /></SelectTrigger>
              <SelectContent>{['contanti', 'pos', 'carta', 'bonifico'].map((k) => <SelectItem key={k} value={k}>{METODO[k]}</SelectItem>)}</SelectContent></Select></div>
          <BottoneScrittura variant="outline" disabled={!p.pacchetto || vendiPacchetto.isPending}
            onClick={() => vendiPacchetto.mutate({ p_socio: socio.socio_id!, p_pacchetto: p.pacchetto, p_metodo: p.metodo }, {
              onSuccess: () => { toast.success('Carnet venduto: la rata è in «Pagamenti»'); setP({ ...p, pacchetto: '' }) },
              onError: (e) => toast.error(messaggioErrore(e)) })}>Vendi il carnet</BottoneScrittura>
        </div>
        {carnet.length === 0 ? <p className="text-sm text-muted-foreground">Nessun carnet.</p> : (
          <ul className="divide-y divide-border text-sm">{carnet.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1"><span className="font-medium text-foreground">{c.nome}</span>
                <span className="block text-xs text-muted-foreground">{CARNET_SERVIZIO[c.servizio ?? '']} · acquistato il {fmtData(c.acquistato_il)}{c.scadenza ? ` · scade il ${fmtData(c.scadenza)}` : ''}</span></span>
              <span className="tabular-nums text-foreground">{c.residui} su {c.totale}</span>
              <Badge tone={c.stato === 'attivo' ? 'success' : 'neutral'}>{c.stato === 'attivo' ? 'Attivo' : c.stato === 'esaurito' ? 'Esaurito' : c.stato === 'scaduto' ? 'Scaduto' : 'Annullato'}</Badge>
            </li>))}</ul>
        )}
      </Card>

      {sospendi && <SospensioneDialog abbonamento={sospendi} onChiudi={() => setSospendi(null)} />}
    </div>
  )
}

function SospensioneDialog({ abbonamento: a, onChiudi }: { abbonamento: AbbonamentoF; onChiudi: () => void }) {
  const { isManager } = useAuth()
  const inserisci = useInserisci('pal_sospensioni', TABELLE_SOCIO)
  const [f, setF] = useState({ tipo: 'sospensione', dal: oggiIso(), al: '', giorni: '7', motivo: '' })
  const periodo = f.tipo === 'sospensione' || f.tipo === 'congelamento'
  const giorni = periodo ? (f.al ? giorniTra(f.dal, f.al) + 1 : 0) : Number(f.giorni) || 0
  return (
    <Dialog open onOpenChange={(o) => !o && onChiudi()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sospensione o proroga</DialogTitle>
          <DialogDescription>{a.pal_formule?.nome} fino al {fmtData(a.fine)}. {isManager ? 'Autorizzata subito: la scadenza si sposta da sola.' : 'La autorizza la direzione; poi la scadenza si sposta da sola.'}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5"><Label>Tipo</Label>
            <Select value={f.tipo} onValueChange={(x) => setF({ ...f, tipo: x })}><SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(SOSPENSIONE_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
          {periodo ? <>
            <div className="space-y-1.5"><Label htmlFor="sp-dal">Dal</Label><Input id="sp-dal" type="date" value={f.dal} onChange={(e) => setF({ ...f, dal: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="sp-al">Al</Label><Input id="sp-al" type="date" min={f.dal} value={f.al} onChange={(e) => setF({ ...f, al: e.target.value })} /></div>
          </> : <div className="space-y-1.5"><Label htmlFor="sp-gg">Giorni</Label><Input id="sp-gg" type="number" min={1} value={f.giorni} onChange={(e) => setF({ ...f, giorni: e.target.value })} /></div>}
          <div className="col-span-2 space-y-1.5"><Label htmlFor="sp-mot">Motivo *</Label>
            <Input id="sp-mot" value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Infortunio, viaggio di lavoro, gravidanza…" /></div>
          {giorni > 0 && <p className="col-span-2 text-sm text-muted-foreground">La scadenza passa dal {fmtData(a.fine)} a {giorni} giorni più avanti.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onChiudi}>Annulla</Button>
          <BottoneScrittura disabled={!f.motivo.trim() || giorni <= 0 || inserisci.isPending}
            onClick={() => inserisci.mutate({ abbonamento_id: a.id, tipo: f.tipo, motivo: f.motivo.trim(), stato: isManager ? 'approvata' : 'richiesta',
              ...(periodo ? { dal: f.dal, al: f.al } : { giorni }) }, {
              onSuccess: () => { toast.success(isManager ? `Autorizzata: +${giorni} giorni` : 'Richiesta inviata alla direzione'); onChiudi() },
              onError: (e) => toast.error(messaggioErrore(e)) })}>{isManager ? 'Registra e autorizza' : 'Chiedi alla direzione'}</BottoneScrittura>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
