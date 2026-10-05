/**
 * SalaPage — mappa dal vivo dei tavoli per sala e zona (Ristorante §7,
 * Bar §7): stato calcolato dal database (libero, prenotato, in attesa,
 * occupato, in servizio, conto richiesto, chiuso), aggiornato in tempo
 * reale; la direzione dispone i tavoli trascinandoli.
 */
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { LayoutGrid, Move, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { useElenco, useSalva, useDalVivo, fondKeys, messaggioErrore } from '@/lib/queries/fondamenta'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale, SelettoreLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { MappaSala, LegendaTavoli } from '@/modules/fb/componenti/MappaSala'
import { PannelloTavolo } from '@/modules/fb/componenti/PannelloTavolo'
import { useTavoliStato, type Sala } from '@/modules/fb/queries'

export function SalaPage() {
  return <ConLocale><Sala_ /></ConLocale>
}

function Sala_() {
  const { localeId, locale, modulo, nome } = useFb()
  const { isManager } = useAuth()
  const { data: sale = [], isLoading: saleInCaricamento } = useElenco<Sala>('fb_sale', {
    filtri: { locale_id: localeId ?? undefined, attiva: true }, ordine: [{ colonna: 'ordine' }], abilitato: !!localeId,
  })
  const { data: tavoli = [], isLoading } = useTavoliStato(localeId)
  useDalVivo(['fb_tavoli', 'fb_comande', 'fb_comande_righe', 'fb_prenotazioni'], [fondKeys.tabella('fb_tavoli_stato')])
  const salvaTavolo = useSalva('fb_tavoli', ['fb_tavoli_stato'])
  const salvaSala = useSalva('fb_sale')
  const [salaId, setSalaId] = useState<string | null>(null)
  const [selezionato, setSelezionato] = useState<string | null>(null)
  const [disposizione, setDisposizione] = useState(false)
  const [nuovaSala, setNuovaSala] = useState('')

  useEffect(() => {
    if (sale.length && !sale.some((s) => s.id === salaId)) setSalaId(sale[0].id)
  }, [sale, salaId])

  // Prima che l'effetto scelga la sala vale la prima: niente «Nessuna sala» di passaggio.
  const sala = sale.find((s) => s.id === salaId) ?? sale[0] ?? null
  const tavoliSala = useMemo(() => tavoli.filter((t) => t.sala_id === sala?.id), [tavoli, sala?.id])
  const tavolo = tavoli.find((t) => t.tavolo_id === selezionato) ?? null
  const conta = (stati: string[]) => tavoli.filter((t) => stati.includes(t.stato ?? '')).length

  async function aggiungiTavolo() {
    if (!sala) return
    const numeri = tavoli.map((t) => Number(t.numero)).filter((n) => !Number.isNaN(n))
    const numero = String((numeri.length ? Math.max(...numeri) : 0) + 1)
    try {
      const t = await salvaTavolo.mutateAsync({ values: {
        sala_id: sala.id, locale_id: localeId!, modulo, numero, posti: 4, x: 40, y: 40 } })
      setSelezionato(t.id)
      toast.success(`Tavolo ${numero} aggiunto: trascinalo dove serve`)
    } catch (e) { toast.error(messaggioErrore(e)) }
  }
  async function aggiungiSala() {
    if (!nuovaSala.trim()) return
    try {
      const s = await salvaSala.mutateAsync({ values: { locale_id: localeId!, modulo, nome: nuovaSala.trim(), ordine: sale.length } })
      setSalaId(s.id); setNuovaSala('')
    } catch (e) { toast.error(messaggioErrore(e)) }
  }

  return (
    <div>
      <PageHeader title="Sala" description={`${locale?.nome ?? nome}: tavoli in tempo reale. Tocca un tavolo per aprire o seguire la comanda.`}
        numeri={[
          { etichetta: 'liberi', valore: conta(['libero']), inCaricamento: isLoading },
          { etichetta: 'occupati', valore: conta(['occupato', 'in_servizio', 'in_attesa', 'conto_richiesto']), inCaricamento: isLoading },
          { etichetta: 'prenotati', valore: conta(['prenotato']), inCaricamento: isLoading },
          { etichetta: 'coperti presenti', valore: tavoli.reduce((s, t) => s + (t.coperti ?? 0), 0), inCaricamento: isLoading },
        ]}
        actions={<>
          <SelettoreLocale />
          {isManager && (
            <Button variant={disposizione ? 'default' : 'outline'} onClick={() => { setDisposizione(!disposizione); setSelezionato(null) }}>
              <Move className="h-4 w-4" /> {disposizione ? 'Fine disposizione' : 'Disponi i tavoli'}
            </Button>
          )}
        </>} />

      {sale.length > 1 && (
        <Tabs value={sala?.id ?? ''} onValueChange={(v) => { setSalaId(v); setSelezionato(null) }} className="mb-4">
          <TabsList>{sale.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.nome}</TabsTrigger>)}</TabsList>
        </Tabs>
      )}

      {saleInCaricamento ? (
        <Skeleton className="aspect-[10/7] w-full rounded-xl xl:w-[calc(100%-340px)]" />
      ) : !sala ? (
        <EmptyState icon={LayoutGrid} title="Nessuna sala" description="Aggiungi una sala per disporre i tavoli."
          action={isManager ? (
            <div className="flex gap-2">
              <Input value={nuovaSala} onChange={(e) => setNuovaSala(e.target.value)} placeholder="Nome della sala" aria-label="Nome della sala" />
              <BottoneScrittura onClick={aggiungiSala}>Aggiungi</BottoneScrittura>
            </div>) : undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            {isLoading ? (
              <Skeleton className="aspect-[10/7] w-full rounded-xl" />
            ) : tavoliSala.length === 0 && !disposizione ? (
              <EmptyState icon={LayoutGrid} title="Sala senza tavoli" description="Entra in disposizione e aggiungi i tavoli."
                action={isManager ? <Button onClick={() => setDisposizione(true)}>Disponi i tavoli</Button> : undefined} />
            ) : (
              <MappaSala sala={sala} tavoli={tavoliSala} selezionato={selezionato} onSeleziona={setSelezionato}
                disposizione={disposizione}
                onSposta={(id, x, y) => salvaTavolo.mutate({ id, values: { x, y } }, { onError: (e) => toast.error(messaggioErrore(e)) })} />
            )}
            <LegendaTavoli />
          </div>
          <div>
            {tavolo ? (
              <PannelloTavolo tavolo={tavolo} tavoli={tavoli} disposizione={disposizione} onChiudi={() => setSelezionato(null)} />
            ) : disposizione ? (
              <aside className="space-y-4 rounded-xl border border-border bg-card p-5">
                <h2 className="text-title text-foreground">Disposizione</h2>
                <p className="text-sm text-muted-foreground">Trascina i tavoli; tocca un tavolo per numero, posti e forma.</p>
                <BottoneScrittura className="w-full" onClick={aggiungiTavolo}><Plus className="h-4 w-4" /> Aggiungi un tavolo</BottoneScrittura>
                <div className="space-y-1.5 border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground">Nuova sala o zona</p>
                  <div className="flex gap-2">
                    <Input value={nuovaSala} onChange={(e) => setNuovaSala(e.target.value)} placeholder="Terrazza, Dehor…" aria-label="Nome della nuova sala" />
                    <BottoneScrittura variant="outline" onClick={aggiungiSala}>Aggiungi</BottoneScrittura>
                  </div>
                </div>
              </aside>
            ) : (
              <aside className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Tocca un tavolo per vederne prenotazione, comanda e conto.
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
