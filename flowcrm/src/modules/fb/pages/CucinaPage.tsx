/**
 * CucinaPage — schermo di cucina e banco (Ristorante §12-13, Bar §9-10).
 * Ogni postazione vede solo ciò che deve preparare. Due viste:
 *  - per piatto (cucina): tre colonne, un tocco porta il piatto al passo
 *    successivo e l'ora resta registrata; «2/3» dice quanti piatti della
 *    stessa uscita del tavolo sono pronti, per farli uscire insieme;
 *  - per ordine (banco): uno scontrino per ordine con tutte le sue voci,
 *    «Tutto pronto» e «Consegnato» in un tocco, e gli ultimi completati.
 * Il ritardo si misura sul tempo di preparazione del prodotto.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, ChefHat, RotateCcw, Timer } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useElenco, useSalva, useDalVivo, fondKeys, messaggioErrore } from '@/lib/queries/fondamenta'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale, SelettoreLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { CANALE_LABEL, RIGA_PROSSIMO, RIGA_STATO, etichettaAllergene, etichettaUscita, fmtOra, oggiIso } from '@/modules/fb/stati'
import { TABELLE_SERVIZIO, type Comanda, type RigaKds, type Stazione, type RigaComanda } from '@/modules/fb/queries'

const PESO_PRIORITA: Record<string, number> = { urgente: 0, alta: 1, normale: 2 }
type Vista = 'piatto' | 'ordine'
type Servita = Pick<RigaComanda, 'id' | 'servita_at' | 'comanda_id' | 'descrizione' | 'quantita'>
interface Ordine { comandaId: string; righe: RigaKds[]; titolo: string; inviata: string; priorita: string; inRitardo: boolean; pronto: boolean }

function useOra(ogni = 30_000) {
  const [ora, setOra] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setOra(Date.now()), ogni); return () => clearInterval(t) }, [ogni])
  return ora
}

const titoloOrdine = (r: { tavolo?: string | null; canale?: string | null; comanda_numero?: number | null }) =>
  r.tavolo ? `Tavolo ${r.tavolo}` : `${CANALE_LABEL[r.canale ?? ''] ?? r.canale} n. ${r.comanda_numero}`

export function CucinaPage() {
  return <ConLocale><Cucina_ /></ConLocale>
}

function Cucina_() {
  const { localeId, modulo, base } = useFb()
  const ora = useOra()
  const qc = useQueryClient()
  const chiaveVista = `fb-kds-vista-${modulo}`
  const [vista, setVista] = useState<Vista>(() => {
    try { const v = localStorage.getItem(chiaveVista); if (v === 'piatto' || v === 'ordine') return v } catch { /* senza memoria locale vale il predefinito */ }
    return modulo === 'bar' ? 'ordine' : 'piatto'
  })
  function scegliVista(v: string) {
    setVista(v as Vista)
    try { localStorage.setItem(chiaveVista, v) } catch { /* come sopra */ }
  }

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
  const { data: servite = [] } = useElenco<Servita>('fb_comande_righe', {
    filtri: { stazione_id: stazioneId ?? undefined, stato: 'servita' }, select: 'id, servita_at, comanda_id, descrizione, quantita',
    ordine: [{ colonna: 'servita_at', crescente: false }], limite: 500, abilitato: !!stazioneId,
  })
  const salva = useSalva('fb_comande_righe', TABELLE_SERVIZIO)
  const [inCorso, setInCorso] = useState(false)

  const ordina = (a: RigaKds, b: RigaKds) =>
    (PESO_PRIORITA[a.priorita ?? 'normale'] - PESO_PRIORITA[b.priorita ?? 'normale'])
    || (a.inviata_at ?? '').localeCompare(b.inviata_at ?? '')
  const colonne = useMemo(() => ([
    { titolo: 'Da preparare', righe: righe.filter((r) => r.stato === 'da_preparare').sort(ordina) },
    { titolo: 'In lavorazione', righe: righe.filter((r) => r.stato === 'presa_in_carico' || r.stato === 'in_preparazione').sort(ordina) },
    { titolo: 'Pronti', righe: righe.filter((r) => r.stato === 'pronta').sort(ordina) },
  ]), [righe])

  // Per ordine: tutte le voci dello stesso scontrino insieme.
  const ordini = useMemo(() => {
    const per = new Map<string, RigaKds[]>()
    for (const r of righe) per.set(r.comanda_id!, [...(per.get(r.comanda_id!) ?? []), r])
    return [...per.entries()].map(([comandaId, rs]): Ordine => ({
      comandaId, righe: rs, titolo: titoloOrdine(rs[0]),
      inviata: rs.map((r) => r.inviata_at ?? '').sort()[0],
      priorita: rs.map((r) => r.priorita ?? 'normale').sort((a, b) => PESO_PRIORITA[a] - PESO_PRIORITA[b])[0],
      inRitardo: rs.some((r) => r.in_ritardo), pronto: rs.every((r) => r.stato === 'pronta'),
    })).sort((a, b) => (PESO_PRIORITA[a.priorita] - PESO_PRIORITA[b.priorita]) || a.inviata.localeCompare(b.inviata))
  }, [righe])

  const serviteOggi = useMemo(() => servite.filter((s) => (s.servita_at ?? '').slice(0, 10) >= oggiIso()), [servite])
  const completati = useMemo(() => {
    const per = new Map<string, Servita[]>()
    for (const s of serviteOggi) per.set(s.comanda_id, [...(per.get(s.comanda_id) ?? []), s])
    return [...per.entries()].map(([comandaId, rs]) => ({ comandaId, righe: rs, quando: rs.map((r) => r.servita_at ?? '').sort().reverse()[0] }))
      .filter((o) => !ordini.some((x) => x.comandaId === o.comandaId))
      .sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 8)
  }, [serviteOggi, ordini])
  const idCompletati = completati.map((o) => o.comandaId)
  const { data: comandeCompletate = [] } = useElenco<Pick<Comanda, 'id' | 'numero' | 'canale'>>('fb_comande', {
    filtri: { id: idCompletati }, select: 'id, numero, canale', abilitato: vista === 'ordine' && idCompletati.length > 0,
  })
  const inRitardo = righe.filter((r) => r.in_ritardo).length

  function avanza(r: RigaKds) {
    const p = RIGA_PROSSIMO[r.stato ?? '']
    if (!p) return
    salva.mutate({ id: r.riga_id!, values: { stato: p.stato as RigaComanda['stato'] } },
      { onError: (e) => toast.error(messaggioErrore(e)) })
  }
  async function avanzaOrdine(o: Ordine) {
    const stato = o.pronto ? 'servita' : 'pronta'
    const ids = o.righe.filter((r) => o.pronto || r.stato !== 'pronta').map((r) => r.riga_id!)
    setInCorso(true)
    const { error } = await supabase.from('fb_comande_righe').update({ stato }).in('id', ids)
    setInCorso(false)
    if (error) { toast.error(messaggioErrore(error)); return }
    for (const t of TABELLE_SERVIZIO) qc.invalidateQueries({ queryKey: fondKeys.tabella(t) })
  }

  const numeri = vista === 'ordine' ? [
    { etichetta: 'ordini da preparare', valore: ordini.filter((o) => !o.pronto).length, inCaricamento: isLoading },
    { etichetta: 'pronti da consegnare', valore: ordini.filter((o) => o.pronto).length, inCaricamento: isLoading },
    { etichetta: 'in ritardo', valore: ordini.filter((o) => o.inRitardo).length, inCaricamento: isLoading },
    { etichetta: 'in attesa di partire', valore: trattenute.length },
    { etichetta: 'voci completate oggi', valore: serviteOggi.length },
  ] : [
    { etichetta: 'da preparare', valore: colonne[0].righe.length, inCaricamento: isLoading },
    { etichetta: 'in lavorazione', valore: colonne[1].righe.length, inCaricamento: isLoading },
    { etichetta: 'pronti', valore: colonne[2].righe.length, inCaricamento: isLoading },
    { etichetta: 'in ritardo', valore: inRitardo, inCaricamento: isLoading },
    { etichetta: 'trattenuti in attesa di marcia', valore: trattenute.length },
  ]

  return (
    <div>
      <PageHeader title={modulo === 'bar' ? 'Banco' : 'Cucina'}
        description={vista === 'ordine' ? 'Un tocco segna pronto tutto l\'ordine, un altro lo consegna. Lo schermo si aggiorna da solo.'
          : 'Tocca un piatto per farlo avanzare. Lo schermo si aggiorna da solo.'}
        numeri={numeri}
        actions={<SelettoreLocale />} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {stazioni.length > 1 ? (
          <Tabs value={stazioneId ?? ''} onValueChange={setStazioneId}>
            <TabsList>{stazioni.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.nome}</TabsTrigger>)}</TabsList>
          </Tabs>
        ) : <span />}
        {stazioni.length > 0 && (
          <Tabs value={vista} onValueChange={scegliVista}>
            <TabsList aria-label="Vista"><TabsTrigger value="ordine">Per ordine</TabsTrigger><TabsTrigger value="piatto">Per voce</TabsTrigger></TabsList>
          </Tabs>
        )}
      </div>

      {stazioni.length === 0 ? (
        <EmptyState icon={ChefHat} title="Nessuna postazione" description="Crea le postazioni (cucina, griglia, pizzeria, banco) dal catalogo."
          action={<Button asChild variant="outline"><Link to={`${base}/catalogo?scheda=struttura`}>Crea le postazioni</Link></Button>} />
      ) : vista === 'ordine' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[{ titolo: 'Da preparare', elenco: ordini.filter((o) => !o.pronto) }, { titolo: 'Pronti da consegnare', elenco: ordini.filter((o) => o.pronto) }].map((col) => (
            <section key={col.titolo} aria-label={col.titolo} className="rounded-xl border border-border bg-muted/40 p-3">
              <h2 className="mb-3 flex items-center justify-between px-1 text-label uppercase text-muted-foreground">
                {col.titolo}<span className="tabular-nums">{col.elenco.length}</span>
              </h2>
              {col.elenco.length === 0 ? <p className="px-1 py-6 text-center text-sm text-muted-foreground">Niente qui.</p> : (
                <ul className="space-y-2">
                  {col.elenco.map((o) => {
                    const minuti = o.inviata ? Math.max(0, Math.floor((ora - new Date(o.inviata).getTime()) / 60000)) : 0
                    return (
                      <li key={o.comandaId} className={cn('rounded-lg border bg-card p-3',
                        o.inRitardo ? 'border-destructive' : o.priorita !== 'normale' ? 'border-warning' : 'border-border')}>
                        <div className="flex items-start justify-between gap-2">
                          <Link to={`${base}/comande/${o.comandaId}`} className="text-sm font-semibold text-foreground underline-offset-2 hover:underline">{o.titolo}</Link>
                          <span className={cn('flex items-center gap-1 text-xs tabular-nums', o.inRitardo ? 'font-semibold text-destructive-testo' : 'text-muted-foreground')}>
                            {o.inRitardo ? <AlertTriangle className="h-3.5 w-3.5" aria-label="In ritardo" /> : <Timer className="h-3.5 w-3.5" aria-hidden />}{minuti}′
                          </span>
                        </div>
                        <ul className="mt-2 space-y-1.5">
                          {o.righe.map((r) => (
                            <li key={r.riga_id} className="text-sm">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="font-medium text-foreground">{Number(r.quantita)}× {r.descrizione}</span>
                                {!o.pronto && r.stato !== 'da_preparare' && <span className="shrink-0 text-xs text-muted-foreground">{RIGA_STATO[r.stato ?? '']?.label}</span>}
                              </span>
                              {r.personalizzazioni && <span className="block text-foreground">{r.personalizzazioni}</span>}
                              {r.note && <span className="block text-xs text-muted-foreground">{r.note}</span>}
                              {r.allergie && r.allergie.length > 0 && (
                                <span className="block font-semibold text-destructive-testo">Allergie: {r.allergie.map(etichettaAllergene).join(', ')}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {o.priorita !== 'normale' && <Badge tone="warning">{o.priorita === 'urgente' ? 'Urgente' : 'Priorità alta'}</Badge>}
                          {o.righe[0].ritiro_at && <Badge tone="info">Ritiro {fmtOra(o.righe[0].ritiro_at)}</Badge>}
                        </div>
                        <Button variant="ghost" className="mt-3 w-full bg-accent font-semibold text-accent-foreground hover:bg-accent/80"
                          disabled={inCorso} onClick={() => avanzaOrdine(o)}>
                          {o.pronto ? 'Consegnato' : 'Tutto pronto'}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          ))}
          <section aria-label="Completati" className="rounded-xl border border-border bg-muted/40 p-3">
            <h2 className="mb-3 flex items-center justify-between px-1 text-label uppercase text-muted-foreground">
              Completati<span className="tabular-nums">{completati.length}</span>
            </h2>
            {completati.length === 0 ? <p className="px-1 py-6 text-center text-sm text-muted-foreground">Ancora nessuno oggi.</p> : (
              <ul className="space-y-2">
                {completati.map((o) => {
                  const k = comandeCompletate.find((c) => c.id === o.comandaId)
                  return (
                    <li key={o.comandaId} className="rounded-lg border border-border bg-card p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <Check className="h-3.5 w-3.5 text-success-testo" aria-hidden />
                          {k ? `${CANALE_LABEL[k.canale] ?? k.canale} n. ${k.numero}` : 'Ordine'}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">{fmtOra(o.quando)}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{o.righe.map((r) => `${Number(r.quantita)}× ${r.descrizione}`).join(', ')}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
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
                            <span className="text-sm font-semibold text-foreground">{titoloOrdine(r)}</span>
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
                            {r.ritiro_at && <Badge tone="info">Ritiro {fmtOra(r.ritiro_at)}</Badge>}
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
      {vista === 'piatto' && (
        <p className="mt-4 text-sm text-muted-foreground">Completati oggi in questa postazione: <span className="tabular-nums">{serviteOggi.length}</span></p>
      )}
      <div className="sr-only" aria-live="polite">{righe.length} voci in coda</div>
    </div>
  )
}
