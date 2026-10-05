/**
 * Banco (documento Fioraio §18, §24): vendita di articoli e composizioni già
 * pronte dal catalogo visuale, poi la cassa con acconti, pagamenti misti,
 * gift card e coupon. Qui si incassano anche gli ordini.
 */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { CassaSezione } from '@/components/condivisi/CassaSezione'
import { CercaContatto, type ContattoScelto } from '@/components/condivisi/CercaContatto'
import { useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import { ConNegozio } from '@/modules/fioraio/componenti/ConNegozio'
import { CatalogoVisuale } from '@/modules/fioraio/componenti/CatalogoVisuale'
import { useCatalogoFioraio, TABELLE_ORDINE } from '@/modules/fioraio/queries'
import { fmtEuro } from '@/modules/fioraio/stati'

export function BancoPage() {
  return <ConNegozio><Banco_ /></ConNegozio>
}

interface Voce { chiave: string; nome: string; prezzo: number; quantita: number; articolo_id?: string; distinta_id?: string }

function Banco_() {
  const [params, setParams] = useSearchParams()
  const { articoli, composizioni } = useCatalogoFioraio()
  const vendi = useAzione('fior_vendi_banco', TABELLE_ORDINE)
  const [carrello, setCarrello] = useState<Voce[]>([])
  const [nome, setNome] = useState('')
  const [contatto, setContatto] = useState<ContattoScelto | null>(null)
  const [cerca, setCerca] = useState('')
  const scheda = params.get('conto') ? 'cassa' : (params.get('scheda') ?? 'vendita')
  const vendibili = articoli.filter((a) => a.vendibile && a.prezzo_vendita !== null
    && (!cerca.trim() || `${a.descrizione} ${a.categoria ?? ''}`.toLowerCase().includes(cerca.trim().toLowerCase())))
  const inVendita = composizioni.filter((c) => c.prezzo != null)
  const totale = carrello.reduce((s, v) => s + v.prezzo * v.quantita, 0)
  const aggiungi = (v: Omit<Voce, 'quantita'>) => setCarrello((c) => c.some((x) => x.chiave === v.chiave)
    ? c.map((x) => x.chiave === v.chiave ? { ...x, quantita: x.quantita + 1 } : x) : [...c, { ...v, quantita: 1 }])

  return (
    <div>
      <PageHeader title="Banco e cassa" description="Vendita al banco dal catalogo, incasso degli ordini, chiusura di cassa a fine giornata." />
      <Tabs value={scheda} onValueChange={(v) => setParams({ scheda: v }, { replace: true })}>
        <TabsList className="mb-4"><TabsTrigger value="vendita">Vendita al banco</TabsTrigger><TabsTrigger value="cassa">Cassa</TabsTrigger></TabsList>
        <TabsContent value="vendita">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              {inVendita.length > 0 && (
                <section aria-label="Composizioni"><h2 className="mb-2 text-label uppercase text-muted-foreground">Composizioni</h2>
                  <CatalogoVisuale composizioni={inVendita} azione={(c) => (
                    <Button size="sm" variant="outline" className="mt-1" onClick={() => aggiungi({ chiave: `c:${c.distinta_id}`, nome: c.nome, prezzo: Number(c.prezzo), distinta_id: c.distinta_id })}>
                      <Plus className="h-3.5 w-3.5" /> Aggiungi</Button>)} />
                </section>
              )}
              <section aria-label="Articoli">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-label uppercase text-muted-foreground">Fiori, piante e accessori</h2>
                  <Input className="h-9 w-56" value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca un articolo" aria-label="Cerca un articolo" /></div>
                {vendibili.length === 0 ? (
                  <Card className="p-4 text-sm text-muted-foreground">{cerca ? 'Nessun articolo con questo nome.' : <>Nessun articolo in vendita: gli articoli con un prezzo di vendita si creano in <Link to="/fioraio/magazzino" className="underline underline-offset-2">Magazzino</Link>.</>}</Card>
                ) : (
                  <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-4">{vendibili.map((a) => (
                    <li key={a.id}><button type="button" onClick={() => aggiungi({ chiave: `a:${a.id}`, nome: a.descrizione, prezzo: Number(a.prezzo_vendita), articolo_id: a.id })}
                      className="flex h-full w-full flex-col rounded-lg border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted">
                      <span className="font-medium text-foreground">{a.descrizione}</span>
                      <span className="text-xs text-muted-foreground">{a.categoria ?? ''}</span>
                      <span className="mt-auto pt-1 tabular-nums text-foreground">{fmtEuro(a.prezzo_vendita)}<span className="text-xs text-muted-foreground"> / {a.unita_misura}</span></span>
                    </button></li>))}</ul>
                )}
              </section>
            </div>

            <Card className="h-fit p-4 xl:sticky xl:top-4">
              <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><ShoppingBag className="h-4 w-4 text-primary-testo" /> Scontrino</h2>
              {carrello.length === 0 ? <p className="text-sm text-muted-foreground">Tocca una composizione o un articolo per aggiungerlo.</p> : (
                <ul className="divide-y divide-border text-sm">{carrello.map((v) => (
                  <li key={v.chiave} className="flex items-center gap-2 py-2">
                    <span className="min-w-0 flex-1 truncate text-foreground">{v.nome}</span>
                    <Input type="number" min={1} className="h-8 w-16" value={v.quantita} aria-label={`Quantità di ${v.nome}`}
                      onChange={(e) => setCarrello(carrello.map((x) => x.chiave === v.chiave ? { ...x, quantita: Math.max(1, Number(e.target.value) || 1) } : x))} />
                    <span className="w-16 text-right tabular-nums text-foreground">{fmtEuro(v.prezzo * v.quantita)}</span>
                    <Button size="sm" variant="ghost" aria-label={`Togli ${v.nome}`} onClick={() => setCarrello(carrello.filter((x) => x.chiave !== v.chiave))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </li>))}</ul>
              )}
              <div className="mt-3 space-y-1.5"><Label htmlFor="bn-cliente">Cliente (facoltativo)</Label>
                <CercaContatto id="bn-cliente" valore={nome} contattoId={contatto?.id ?? null} segnaposto="Per lo storico e la fidelity"
                  onTesto={(v) => { setNome(v); setContatto(null) }} onScegli={(c) => { setContatto(c); setNome(`${c.nome} ${c.cognome ?? ''}`.trim()) }} /></div>
              <div className="mt-4 flex items-center justify-between"><span className="text-sm text-muted-foreground">Totale</span><strong className="text-title tabular-nums text-foreground">{fmtEuro(totale)}</strong></div>
              <BottoneScrittura className="mt-3 w-full" disabled={carrello.length === 0 || vendi.isPending}
                onClick={() => vendi.mutate({ p_righe: carrello.map((v) => ({ quantita: v.quantita, ...(v.distinta_id ? { distinta_id: v.distinta_id } : { articolo_id: v.articolo_id }) })),
                  p_contatto: contatto?.id ?? undefined }, {
                  onSuccess: (conto) => { toast.success('Merce scaricata dal magazzino: ora l\'incasso'); setCarrello([]); setNome(''); setContatto(null); setParams({ conto: String(conto) }) },
                  onError: (e) => toast.error(messaggioErrore(e)) })}>Vai all'incasso</BottoneScrittura>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="cassa"><CassaSezione modulo="fioraio" /></TabsContent>
      </Tabs>
    </div>
  )
}
