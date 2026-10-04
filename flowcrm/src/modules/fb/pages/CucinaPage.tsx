/**
 * CucinaPage — schermo di cucina e banco (Ristorante §12-13, Bar §9-10).
 * Ogni postazione vede solo ciò che deve preparare, in tre colonne; un
 * tocco porta il piatto al passo successivo e l'ora resta registrata
 * (presa in carico, preparazione, pronto, servito). Il ritardo si misura
 * sul tempo di preparazione del prodotto; «2/3» dice quanti piatti della
 * stessa uscita del tavolo sono pronti, per farli uscire insieme.
 */
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ChefHat, RotateCcw, Timer } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useElenco, useSalva, useDalVivo, fondKeys, messaggioErrore } from '@/lib/queries/fondamenta'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale, SelettoreLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { CANALE_LABEL, RIGA_PROSSIMO, etichettaAllergene, etichettaUscita, oggiIso } from '@/modules/fb/stati'
import { TABELLE_SERVIZIO, type RigaKds, type Stazione, type RigaComanda } from '@/modules/fb/queries'

const PESO_PRIORITA: Record<string, number> = { urgente: 0, alta: 1, normale: 2 }

function useOra(ogni = 30_000) {
  const [ora, setOra] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setOra(Date.now()), ogni); return () => clearInterval(t) }, [ogni])
  return ora
}

export function CucinaPage() {
  return <ConLocale><Cucina_ /></ConLocale>
}

function Cucina_() {
  const { localeId, modulo } = useFb()
  const ora = useOra()
  const { data: stazioni = [] } = useElenco<Stazione>('fb_stazioni', {
    filtri: { locale_id: localeId ?? undefined, attiva: true }, ordine: [{ colonna: 'ordine' }], abilitato: !!localeId,
  })
  const [stazioneId, setStazioneId] = useState<string | null>(null)
  useEffect(() => {
    if (stazioni.length && !stazioni.some((s) => s.id === stazioneId)) setStazioneId(stazioni[0].id)
  }, [stazioni, stazioneId])

  useDalVivo(['fb_comande_righe', 'fb_comande'], [fondKeys.tabella('fb_kds')])
  const { data: righe = [], isLoading } = useElenco<RigaKds>('fb_kds', {
    filtri: { stazione_id: stazioneId ?? undefined }, abilitato: !!stazioneId, intervallo: 20_000,
  })
  const { data: trattenute = [] } = useElenco<Pick<RigaComanda, 'id'>>('fb_comande_righe', {
    filtri: { stazione_id: stazioneId ?? undefined, stato: 'in_attesa' }, select: 'id', abilitato: !!stazioneId,
  })
  const { data: servite = [] } = useElenco<Pick<RigaComanda, 'id' | 'servita_at'>>('fb_comande_righe', {
    filtri: { stazione_id: stazioneId ?? undefined, stato: 'servita' }, select: 'id, servita_at',
    ordine: [{ colonna: 'servita_at', crescente: false }], limite: 500, abilitato: !!stazioneId,
  })
  const salva = useSalva('fb_comande_righe', TABELLE_SERVIZIO)

  const ordina = (a: RigaKds, b: RigaKds) =>
    (PESO_PRIORITA[a.priorita ?? 'normale'] - PESO_PRIORITA[b.priorita ?? 'normale'])
    || (a.inviata_at ?? '').localeCompare(b.inviata_at ?? '')
  const colonne = useMemo(() => ([
    { titolo: 'Da preparare', righe: righe.filter((r) => r.stato === 'da_preparare').sort(ordina) },
    { titolo: 'In lavorazione', righe: righe.filter((r) => r.stato === 'presa_in_carico' || r.stato === 'in_preparazione').sort(ordina) },
    { titolo: 'Pronti', righe: righe.filter((r) => r.stato === 'pronta').sort(ordina) },
  ]), [righe])
  const completateOggi = servite.filter((s) => (s.servita_at ?? '').slice(0, 10) >= oggiIso()).length
  const inRitardo = righe.filter((r) => r.in_ritardo).length

  function avanza(r: RigaKds) {
    const p = RIGA_PROSSIMO[r.stato ?? '']
    if (!p) return
    salva.mutate({ id: r.riga_id!, values: { stato: p.stato as RigaComanda['stato'] } },
      { onError: (e) => toast.error(messaggioErrore(e)) })
  }

  return (
    <div>
      <PageHeader title={modulo === 'bar' ? 'Banco e cucina' : 'Cucina'}
        description="Tocca un piatto per farlo avanzare. Lo schermo si aggiorna da solo."
        numeri={[
          { etichetta: 'da preparare', valore: colonne[0].righe.length, inCaricamento: isLoading },
          { etichetta: 'in lavorazione', valore: colonne[1].righe.length, inCaricamento: isLoading },
          { etichetta: 'pronti', valore: colonne[2].righe.length, inCaricamento: isLoading },
          { etichetta: 'in ritardo', valore: inRitardo, inCaricamento: isLoading },
          { etichetta: 'trattenuti in attesa di marcia', valore: trattenute.length },
        ]}
        actions={<SelettoreLocale />} />

      {stazioni.length > 1 && (
        <Tabs value={stazioneId ?? undefined} onValueChange={setStazioneId} className="mb-4">
          <TabsList>{stazioni.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.nome}</TabsTrigger>)}</TabsList>
        </Tabs>
      )}

      {stazioni.length === 0 ? (
        <EmptyState icon={ChefHat} title="Nessuna postazione" description="Crea le postazioni (cucina, griglia, pizzeria, banco) dal catalogo." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {colonne.map((col) => (
            <section key={col.titolo} aria-label={col.titolo} className="rounded-xl border border-border bg-muted/40 p-3">
              <h2 className="mb-3 flex items-center justify-between px-1 text-label uppercase text-muted-foreground">
                {col.titolo}<span className="tabular-nums">{col.righe.length}</span>
              </h2>
              {col.righe.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted-foreground">Niente qui.</p>
              ) : (
                <ul className="space-y-2">
                  {col.righe.map((r) => {
                    const minuti = r.inviata_at ? Math.max(0, Math.floor((ora - new Date(r.inviata_at).getTime()) / 60000)) : 0
                    const prossimo = RIGA_PROSSIMO[r.stato ?? '']
                    return (
                      <li key={r.riga_id}>
                        <button type="button" onClick={() => avanza(r)} disabled={salva.isPending}
                          className={cn('w-full rounded-lg border bg-card p-3 text-left transition-[box-shadow,border-color]',
                            'hover:shadow-risposta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                            r.in_ritardo ? 'border-destructive' : r.priorita !== 'normale' ? 'border-warning' : 'border-border')}
                          aria-label={`${r.quantita} ${r.descrizione}, ${r.tavolo ? `tavolo ${r.tavolo}` : CANALE_LABEL[r.canale ?? ''] ?? ''}. ${prossimo?.azione ?? ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {r.tavolo ? `Tavolo ${r.tavolo}` : `${CANALE_LABEL[r.canale ?? ''] ?? r.canale} n. ${r.comanda_numero}`}
                            </span>
                            <span className={cn('flex items-center gap-1 text-xs tabular-nums',
                              r.in_ritardo ? 'font-semibold text-destructive-testo' : 'text-muted-foreground')}>
                              {r.in_ritardo ? <AlertTriangle className="h-3.5 w-3.5" aria-label="In ritardo" /> : <Timer className="h-3.5 w-3.5" aria-hidden />}
                              {minuti}′{r.tempo_preparazione_min ? ` / ${r.tempo_preparazione_min}′` : ''}
                            </span>
                          </div>
                          <p className="mt-1.5 text-base font-semibold leading-snug text-foreground">
                            {Number(r.quantita)}× {r.descrizione}
                          </p>
                          {r.personalizzazioni && <p className="text-sm text-foreground">{r.personalizzazioni}</p>}
                          {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
                          {r.allergie && r.allergie.length > 0 && (
                            <p className="mt-1 text-sm font-semibold text-destructive-testo">Allergie: {r.allergie.map(etichettaAllergene).join(', ')}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge tone="neutral">{etichettaUscita(r.uscita)}</Badge>
                            {(r.piatti_uscita ?? 0) > 1 && (
                              <Badge tone={r.pronti_uscita === r.piatti_uscita ? 'success' : 'info'}>
                                {r.pronti_uscita}/{r.piatti_uscita} dell'uscita pronti
                              </Badge>
                            )}
                            {r.priorita !== 'normale' && <Badge tone="warning">{r.priorita === 'urgente' ? 'Urgente' : 'Priorità alta'}</Badge>}
                            {r.rifacimento_di && <Badge tone="warning"><RotateCcw className="mr-1 h-3 w-3" />Rifacimento</Badge>}
                            {r.ritiro_at && <Badge tone="info">Ritiro {new Date(r.ritiro_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</Badge>}
                          </div>
                          {prossimo && (
                            <span className="mt-3 flex h-9 items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-foreground">
                              {prossimo.azione}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
      <p className="mt-4 text-sm text-muted-foreground">Completati oggi in questa postazione: <span className="tabular-nums">{completateOggi}</span></p>
      <div className="sr-only" aria-live="polite">{righe.length} piatti in coda</div>
    </div>
  )
}
