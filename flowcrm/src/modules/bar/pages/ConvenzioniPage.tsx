/**
 * ConvenzioniPage — clienti aziendali e convenzioni (documento Bar §20 e §19).
 * Un'azienda vicina autorizza i suoi dipendenti a consumare sul proprio
 * conto: listino riservato, limiti di spesa controllati alla cassa e una
 * fattura periodica con tutte le consumazioni non ancora fatturate.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, FileText, Pencil, Plus, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import { useElenco, useSalva, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale, SelettoreLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { fmtEuro, fmtGiornoOra, oggiIso } from '@/modules/fb/stati'
import type { Menu } from '@/modules/fb/queries'

type Convenzione = Tables<'bar_convenzioni'>
type Riepilogo = Database['public']['Views']['bar_convenzioni_riepilogo']['Row']
type DipendenteSaldo = Database['public']['Views']['bar_convenzioni_dipendenti_saldi']['Row']
type Addebito = Pick<Tables<'bar_convenzioni_addebiti'>, 'id' | 'importo' | 'addebitato_at' | 'fattura_id' | 'dipendente_id'>
type Azienda = Pick<Tables<'organizzazioni'>, 'id' | 'ragione_sociale'>

const TABELLE = ['bar_convenzioni', 'bar_convenzioni_riepilogo', 'bar_convenzioni_dipendenti', 'bar_convenzioni_dipendenti_saldi',
  'bar_convenzioni_addebiti', 'fb_menu']
const FATTURAZIONE: Record<string, string> = { settimanale: 'Ogni settimana', quindicinale: 'Ogni quindici giorni', mensile: 'Ogni mese' }
const n = (s: string) => { const v = Number(s.replace(',', '.')); return s.trim() === '' || Number.isNaN(v) ? null : v }

export function ConvenzioniPage() {
  return <ConLocale><Convenzioni_ /></ConLocale>
}

function Convenzioni_() {
  const { localeId } = useFb()
  const { isManager } = useAuth()
  const { data: convenzioni = [], isLoading } = useElenco<Convenzione>('bar_convenzioni', {
    filtri: { locale_id: localeId ?? undefined }, ordine: [{ colonna: 'created_at' }], abilitato: !!localeId,
  })
  const { data: riepiloghi = [] } = useElenco<Riepilogo>('bar_convenzioni_riepilogo', {
    filtri: { locale_id: localeId ?? undefined }, abilitato: !!localeId,
  })
  const [sceltaId, setSceltaId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ aperto: boolean; convenzione?: Convenzione }>({ aperto: false })
  const r = (id: string) => riepiloghi.find((x) => x.convenzione_id === id)
  // Senza scelta valida vale la prima; quella appena creata si aspetta che arrivi nell'elenco.
  const [appenaCreata, setAppenaCreata] = useState<string | null>(null)
  const scelta = convenzioni.find((c) => c.id === sceltaId) ?? (sceltaId && sceltaId === appenaCreata ? undefined : convenzioni[0])
  const attive = convenzioni.filter((c) => c.attiva)

  return (
    <div>
      <PageHeader title="Convenzioni" description="Aziende convenzionate: chi può consumare, a quale listino, entro quali limiti, e la fattura periodica."
        numeri={[
          { etichetta: 'convenzioni attive', valore: attive.length, inCaricamento: isLoading },
          { etichetta: 'dipendenti autorizzati', valore: riepiloghi.reduce((s, x) => s + Number(x.dipendenti_attivi ?? 0), 0), inCaricamento: isLoading },
          { etichetta: 'consumato nel mese', valore: fmtEuro(riepiloghi.reduce((s, x) => s + Number(x.speso_mese ?? 0), 0)), inCaricamento: isLoading },
          { etichetta: 'da fatturare', valore: fmtEuro(riepiloghi.reduce((s, x) => s + Number(x.da_fatturare ?? 0), 0)), inCaricamento: isLoading },
        ]}
        actions={<>
          <SelettoreLocale />
          {isManager && <BottoneScrittura onClick={() => setDialog({ aperto: true })}><Plus className="h-4 w-4" /> Nuova convenzione</BottoneScrittura>}
        </>} />

      {isLoading ? <Card className="h-48 animate-pulse bg-muted/40" aria-hidden /> : convenzioni.length === 0 ? (
        <EmptyState icon={Building2} title="Nessuna convenzione"
          description={isManager ? 'Collega un\'azienda vicina: i suoi dipendenti consumano sul conto aziendale e a fine periodo parte una sola fattura.'
            : 'Le convenzioni con le aziende le crea la direzione.'}
          action={isManager ? <Button variant="outline" onClick={() => setDialog({ aperto: true })}><Plus className="h-4 w-4" /> Crea la prima</Button> : undefined} filtrato={!isManager} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="h-fit overflow-hidden">
            <ul className="divide-y divide-border">
              {convenzioni.map((c) => {
                const x = r(c.id)
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => setSceltaId(c.id)} aria-current={c.id === scelta?.id}
                      className={cn('flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50',
                        c.id === scelta?.id && 'bg-muted')}>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{x?.azienda ?? '…'}</span>
                        <span className="block font-mono text-xs text-muted-foreground">{c.codice}</span>
                      </span>
                      <span className="text-right">
                        <span className="block tabular-nums text-foreground">{fmtEuro(x?.speso_mese)}</span>
                        {!c.attiva && <Badge tone="neutral">Sospesa</Badge>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
          {scelta && <Dettaglio convenzione={scelta} riepilogo={r(scelta.id)} onModifica={() => setDialog({ aperto: true, convenzione: scelta })} />}
        </div>
      )}

      {dialog.aperto && <ConvenzioneDialog convenzione={dialog.convenzione} onChiudi={() => setDialog({ aperto: false })} onCreata={(id) => { setAppenaCreata(id); setSceltaId(id) }} />}
    </div>
  )
}

function Dettaglio({ convenzione: c, riepilogo, onModifica }: { convenzione: Convenzione; riepilogo?: Riepilogo; onModifica: () => void }) {
  const { isManager } = useAuth()
  const { base } = useFb()
  const { data: dipendenti = [] } = useElenco<DipendenteSaldo>('bar_convenzioni_dipendenti_saldi', {
    filtri: { convenzione_id: c.id }, ordine: [{ colonna: 'nome' }],
  })
  const { data: addebiti = [] } = useElenco<Addebito>('bar_convenzioni_addebiti', {
    filtri: { convenzione_id: c.id }, select: 'id, importo, addebitato_at, fattura_id, dipendente_id',
    ordine: [{ colonna: 'addebitato_at', crescente: false }], limite: 200,
  })
  const { data: menu = [] } = useElenco<Pick<Menu, 'id' | 'nome'>>('fb_menu', { filtri: { id: c.menu_id ?? undefined }, select: 'id, nome', abilitato: !!c.menu_id })
  const salvaDip = useSalva('bar_convenzioni_dipendenti', TABELLE)
  const fattura = useAzione('bar_fattura_convenzione', [...TABELLE, 'fatture'])
  const [nuovo, setNuovo] = useState({ nome: '', tessera: '', limite: '' })
  const [fino, setFino] = useState(oggiIso)
  const [numero, setNumero] = useState('')
  const speso = Number(riepilogo?.speso_mese ?? 0)
  const limite = c.limite_mensile_azienda === null ? null : Number(c.limite_mensile_azienda)
  const quota = limite ? Math.min(100, Math.round((speso / limite) * 100)) : 0
  const nomeDip = (id: string) => dipendenti.find((d) => d.dipendente_id === id)?.nome ?? '—'

  function aggiungi(e: FormEvent) {
    e.preventDefault()
    if (!nuovo.nome.trim()) { toast.error('Scrivi il nome del dipendente'); return }
    salvaDip.mutate({ values: { convenzione_id: c.id, nome: nuovo.nome.trim(), codice_tessera: nuovo.tessera.trim() || null, limite_mensile: n(nuovo.limite) } }, {
      onSuccess: () => { toast.success(`${nuovo.nome.trim()} può consumare in convenzione`); setNuovo({ nome: '', tessera: '', limite: '' }) },
      onError: (err) => toast.error(messaggioErrore(err)),
    })
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-title text-foreground">{riepilogo?.azienda ?? 'Convenzione'}</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{c.codice}</span> · {FATTURAZIONE[c.fatturazione]} · pagamento a {c.giorni_pagamento} giorni
              {c.valida_al ? ` · fino al ${new Date(`${c.valida_al}T12:00`).toLocaleDateString('it-IT')}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!c.attiva && <Badge tone="warning">Sospesa</Badge>}
            {isManager && <Button variant="outline" size="sm" onClick={onModifica}><Pencil className="h-3.5 w-3.5" /> Modifica</Button>}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><dt className="text-muted-foreground">Consumato nel mese</dt><dd className="text-lg font-semibold tabular-nums text-foreground">{fmtEuro(speso)}</dd></div>
          <div><dt className="text-muted-foreground">Tetto dell'azienda</dt><dd className="text-lg font-semibold tabular-nums text-foreground">{limite === null ? 'Nessuno' : fmtEuro(limite)}</dd></div>
          <div><dt className="text-muted-foreground">Per dipendente</dt>
            <dd className="tabular-nums text-foreground">{c.limite_mensile_dipendente ? `${fmtEuro(c.limite_mensile_dipendente)} al mese` : 'Nessun limite mensile'}
              {c.limite_giornaliero_dipendente ? <span className="block text-muted-foreground">{fmtEuro(c.limite_giornaliero_dipendente)} al giorno</span> : null}</dd></div>
          <div><dt className="text-muted-foreground">Listino</dt>
            <dd className="text-foreground">{menu[0]
              ? <Link to={`${base}/catalogo?scheda=menu`} className="underline underline-offset-2">{menu[0].nome}</Link> : 'Prezzi normali'}</dd></div>
        </dl>
        {limite !== null && (
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={quota} aria-valuemin={0} aria-valuemax={100}
            aria-label={`Tetto mensile usato al ${quota}%`}>
            <div className={quota >= 90 ? 'h-full bg-warning' : 'h-full bg-primary'} style={{ width: `${quota}%` }} />
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <h3 className="border-b border-border px-5 py-3 text-title text-foreground">Dipendenti autorizzati</h3>
        {dipendenti.length > 0 && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Dipendente</TableHead><TableHead>Tessera</TableHead><TableHead className="text-right">Oggi</TableHead>
              <TableHead className="text-right">Nel mese</TableHead><TableHead className="text-right">Limite</TableHead><TableHead>Autorizzato</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dipendenti.map((d) => (
                <TableRow key={d.dipendente_id}>
                  <TableCell className="font-medium text-foreground">{d.nome}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{d.codice_tessera ?? '—'}</TableCell>
                  <TableCell numerica>{fmtEuro(d.speso_oggi)}</TableCell>
                  <TableCell numerica>{fmtEuro(d.speso_mese)}</TableCell>
                  <TableCell numerica>{d.limite_mensile ? fmtEuro(d.limite_mensile) : '—'}</TableCell>
                  <TableCell><Switch checked={!!d.attivo} disabled={!isManager} aria-label={`${d.nome} autorizzato`}
                    onCheckedChange={(v) => salvaDip.mutate({ id: d.dipendente_id!, values: { attivo: v } }, { onError: (err) => toast.error(messaggioErrore(err)) })} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {dipendenti.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">Ancora nessun dipendente: senza, nessuno può consumare in convenzione.</p>}
        {isManager && (
          <form onSubmit={aggiungi} className="flex flex-wrap items-end gap-3 border-t border-border p-4">
            <div className="min-w-44 flex-1 space-y-1.5"><Label htmlFor="cd-nome">Nome e cognome</Label>
              <Input id="cd-nome" value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })} /></div>
            <div className="w-36 space-y-1.5"><Label htmlFor="cd-tessera">Tessera o badge</Label>
              <Input id="cd-tessera" value={nuovo.tessera} onChange={(e) => setNuovo({ ...nuovo, tessera: e.target.value })} className="font-mono" /></div>
            <div className="w-40 space-y-1.5"><Label htmlFor="cd-limite">Limite mensile (€)</Label>
              <Input id="cd-limite" inputMode="decimal" value={nuovo.limite} onChange={(e) => setNuovo({ ...nuovo, limite: e.target.value })} placeholder="Quello della convenzione" /></div>
            <BottoneScrittura type="submit" variant="outline" disabled={salvaDip.isPending}><UserPlus className="h-4 w-4" /> Autorizza</BottoneScrittura>
          </form>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-3">
          <div>
            <h3 className="text-title text-foreground">Consumazioni</h3>
            <p className="text-sm text-muted-foreground">Da fatturare: <span className="font-semibold tabular-nums text-foreground">{fmtEuro(riepilogo?.da_fatturare)}</span>
              {' '}({riepilogo?.consumazioni_da_fatturare ?? 0})</p>
          </div>
          {isManager && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5"><Label htmlFor="cf-fino">Fino al</Label>
                <Input id="cf-fino" type="date" value={fino} onChange={(e) => setFino(e.target.value)} className="w-40" /></div>
              <div className="space-y-1.5"><Label htmlFor="cf-numero">N. fattura</Label>
                <Input id="cf-numero" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-32" /></div>
              <BottoneScrittura variant="outline" disabled={!numero.trim() || fattura.isPending || !Number(riepilogo?.da_fatturare)}
                onClick={() => fattura.mutate({ p_convenzione: c.id, p_al: fino, p_numero: numero.trim() }, {
                  onSuccess: () => { toast.success('Fattura emessa nel modulo amministrativo'); setNumero('') },
                  onError: (err) => toast.error(messaggioErrore(err)) })}>
                <FileText className="h-4 w-4" /> Emetti la fattura
              </BottoneScrittura>
            </div>
          )}
        </div>
        {addebiti.length === 0 ? <p className="px-5 py-4 text-sm text-muted-foreground">Nessuna consumazione: gli addebiti arrivano dalla cassa, scegliendo il dipendente.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Quando</TableHead><TableHead>Dipendente</TableHead><TableHead className="text-right">Importo</TableHead><TableHead>Stato</TableHead></TableRow></TableHeader>
            <TableBody>
              {addebiti.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-muted-foreground">{fmtGiornoOra(a.addebitato_at)}</TableCell>
                  <TableCell className="text-foreground">{nomeDip(a.dipendente_id)}</TableCell>
                  <TableCell numerica>{fmtEuro(a.importo)}</TableCell>
                  <TableCell>{a.fattura_id ? <Badge tone="success">Fatturata</Badge> : <Badge tone="info">Da fatturare</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}

function ConvenzioneDialog({ convenzione, onChiudi, onCreata }: { convenzione?: Convenzione; onChiudi: () => void; onCreata: (id: string) => void }) {
  const { localeId } = useFb()
  const { data: aziende = [] } = useElenco<Azienda>('organizzazioni', {
    filtri: { attivo: true }, select: 'id, ragione_sociale', ordine: [{ colonna: 'ragione_sociale' }], limite: 1000,
  })
  const { data: listini = [] } = useElenco<Pick<Menu, 'id' | 'nome' | 'tipo'>>('fb_menu', {
    filtri: { locale_id: localeId ?? undefined, attivo: true }, select: 'id, nome, tipo', ordine: [{ colonna: 'nome' }], abilitato: !!localeId,
  })
  const salva = useSalva('bar_convenzioni', TABELLE)
  const c = convenzione
  const [f, setF] = useState({
    azienda: c?.organizzazione_id ?? '', listino: c?.menu_id ?? 'nessuno',
    azMese: c?.limite_mensile_azienda?.toString() ?? '', dipMese: c?.limite_mensile_dipendente?.toString() ?? '',
    dipGiorno: c?.limite_giornaliero_dipendente?.toString() ?? '', fatturazione: c?.fatturazione ?? 'mensile',
    giorni: String(c?.giorni_pagamento ?? 30), al: c?.valida_al ?? '', attiva: c?.attiva ?? true, note: c?.note ?? '',
  })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  function invia(e: FormEvent) {
    e.preventDefault()
    if (!f.azienda) { toast.error('Scegli l\'azienda'); return }
    const values = {
      locale_id: localeId!, organizzazione_id: f.azienda, menu_id: f.listino === 'nessuno' ? null : f.listino,
      limite_mensile_azienda: n(f.azMese), limite_mensile_dipendente: n(f.dipMese), limite_giornaliero_dipendente: n(f.dipGiorno),
      fatturazione: f.fatturazione, giorni_pagamento: Number(f.giorni) || 0, valida_al: f.al || null, attiva: f.attiva, note: f.note.trim() || null,
    }
    salva.mutate(c ? { id: c.id, values } : { values }, {
      onSuccess: (riga) => { toast.success(c ? 'Convenzione aggiornata' : 'Convenzione creata: ora autorizza i dipendenti'); if (!c) onCreata(riga.id); onChiudi() },
      onError: (err) => toast.error(/23505/.test(JSON.stringify(err)) ? 'Questa azienda ha già una convenzione con il locale' : messaggioErrore(err)),
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onChiudi() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{c ? 'Modifica la convenzione' : 'Nuova convenzione'}</DialogTitle>
          <DialogDescription>I limiti vuoti non si applicano. Il listino scelto diventa riservato a questa azienda.</DialogDescription>
        </DialogHeader>
        <form onSubmit={invia} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5"><Label>Azienda *</Label>
            <Select value={f.azienda} onValueChange={(v) => setF({ ...f, azienda: v })} disabled={!!c}>
              <SelectTrigger aria-label="Azienda"><SelectValue placeholder="Scegli dall'anagrafica" /></SelectTrigger>
              <SelectContent>{aziende.map((a) => <SelectItem key={a.id} value={a.id}>{a.ragione_sociale}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="col-span-2 space-y-1.5"><Label>Listino convenzionato</Label>
            <Select value={f.listino} onValueChange={(v) => setF({ ...f, listino: v })}>
              <SelectTrigger aria-label="Listino convenzionato"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nessuno">Prezzi normali</SelectItem>
                {listini.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label htmlFor="cv-az">Tetto mensile dell'azienda (€)</Label><Input id="cv-az" inputMode="decimal" value={f.azMese} onChange={set('azMese')} /></div>
          <div className="space-y-1.5"><Label htmlFor="cv-dm">Limite mensile per dipendente (€)</Label><Input id="cv-dm" inputMode="decimal" value={f.dipMese} onChange={set('dipMese')} /></div>
          <div className="space-y-1.5"><Label htmlFor="cv-dg">Limite giornaliero per dipendente (€)</Label><Input id="cv-dg" inputMode="decimal" value={f.dipGiorno} onChange={set('dipGiorno')} /></div>
          <div className="space-y-1.5"><Label>Fatturazione</Label>
            <Select value={f.fatturazione} onValueChange={(v) => setF({ ...f, fatturazione: v })}>
              <SelectTrigger aria-label="Fatturazione"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(FATTURAZIONE).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label htmlFor="cv-gg">Pagamento a (giorni)</Label><Input id="cv-gg" type="number" min={0} max={180} value={f.giorni} onChange={set('giorni')} /></div>
          <div className="space-y-1.5"><Label htmlFor="cv-al">Valida fino al</Label><Input id="cv-al" type="date" value={f.al} onChange={set('al')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="cv-note">Note</Label><Input id="cv-note" value={f.note} onChange={set('note')} /></div>
          {c && (
            <label className="col-span-2 flex items-center gap-2 text-sm text-foreground">
              <Switch checked={f.attiva} onCheckedChange={(v) => setF({ ...f, attiva: v })} aria-label="Convenzione attiva" /> Convenzione attiva
            </label>
          )}
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={onChiudi}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={salva.isPending}>{c ? 'Salva' : 'Crea la convenzione'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
