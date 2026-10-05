/**
 * CruscottoPage — la giornata del locale (Ristorante §39, Bar §33): sala,
 * cucina, magazzino per tutti; vendite e incasso solo per la direzione.
 * Si aggiorna da solo ogni trenta secondi e a ogni cambiamento in sala.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarClock, ChefHat, LayoutGrid, Package, Receipt, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { useScadenzeAperteModulo } from '@/lib/queries/scadenzeModuli'
import { useElenco, useDalVivo } from '@/lib/queries/fondamenta'
import { useFb } from '@/modules/fb/contesto'
import { ConLocale, SelettoreLocale } from '@/modules/fb/componenti/SelettoreLocale'
import { PRENOTAZIONE_STATO, fmtEuro, fmtNumero, fmtOra, fmtData, oggiIso } from '@/modules/fb/stati'
import { useCruscotto, type Prenotazione, type RigaKds } from '@/modules/fb/queries'

const tooltipStyle = { borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }

export function CruscottoPage() {
  return <ConLocale><Cruscotto_ /></ConLocale>
}

function Voce({ etichetta, valore, a }: { etichetta: string; valore: ReactNode; a?: string }) {
  const corpo = (
    <>
      <dt className="text-sm text-muted-foreground">{etichetta}</dt>
      <dd data-slot="kpi" className="text-title text-foreground">{valore}</dd>
    </>
  )
  return a
    ? <Link to={a} className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50">{corpo}</Link>
    : <div className="flex items-baseline justify-between gap-3 px-2 py-1.5">{corpo}</div>
}

function Cruscotto_() {
  const { localeId, base, modulo, locale } = useFb()
  const { data: c, isLoading } = useCruscotto(localeId)
  useDalVivo(['fb_comande', 'fb_comande_righe', 'fb_prenotazioni'], [['fond-rpc']])
  const oggi = oggiIso()
  const domani = new Date(`${oggi}T00:00`); domani.setDate(domani.getDate() + 1)
  const { data: prenotazioni = [] } = useElenco<Prenotazione>('fb_prenotazioni', {
    filtri: { locale_id: localeId ?? undefined, stato: ['richiesta', 'confermata'] },
    tra: { colonna: 'inizio', da: new Date(Date.now() - 30 * 60000).toISOString(), a: domani.toISOString() },
    ordine: [{ colonna: 'inizio' }], limite: 8, abilitato: !!localeId,
  })
  const { data: ritardi = [] } = useElenco<RigaKds>('fb_kds', {
    filtri: { locale_id: localeId ?? undefined, in_ritardo: true }, limite: 6, abilitato: !!localeId,
  })
  const { data: scadenze = [] } = useScadenzeAperteModulo(modulo, 6)
  const { data: scadenzeFb = [] } = useScadenzeAperteModulo('fb', 6)
  const tutteScadenze = [...scadenze, ...scadenzeFb].sort((a, b) => a.data_scadenza.localeCompare(b.data_scadenza)).slice(0, 6)
  const n = (v: number | null | undefined) => (isLoading ? undefined : v ?? 0)
  const bar = modulo === 'bar'
  const banco = `${base}/${bar ? 'banco' : 'cucina'}`
  const pct = (v: number | null | undefined) => v == null ? '—' : `${fmtNumero(v, 1)}%`

  const fasce = c?.vendite ? Object.entries(c.vendite.per_fascia_oraria ?? {}).map(([ora, v]) => ({ ora: `${ora}:00`, incasso: Number(v) })) : []

  return (
    <div>
      <PageHeader title={`Oggi da ${locale?.nome ?? ''}`} description={`Situazione del ${fmtData(new Date().toISOString())}, aggiornata in tempo reale.`}
        numeri={[
          ...(bar ? [
            { etichetta: 'tavoli occupati', valore: n(c?.sala.tavoli_occupati), inCaricamento: isLoading },
            { etichetta: 'tavoli liberi', valore: n(c?.sala.tavoli_liberi), inCaricamento: isLoading },
            { etichetta: 'clienti presenti', valore: n(c?.sala.coperti_presenti), inCaricamento: isLoading },
          ] : [
            { etichetta: 'prenotazioni', valore: n(c?.sala.prenotazioni), inCaricamento: isLoading },
            { etichetta: 'coperti previsti', valore: n(c?.sala.coperti_previsti), inCaricamento: isLoading },
            { etichetta: 'coperti presenti', valore: n(c?.sala.coperti_presenti), inCaricamento: isLoading },
          ]),
          { etichetta: bar ? 'ordini aperti' : 'comande aperte', valore: n(c?.cucina.comande_aperte as number), inCaricamento: isLoading },
          ...(c?.vendite ? [{ etichetta: 'incasso', valore: fmtEuro(c.vendite.incasso, 0) }] : []),
        ]}
        actions={<SelettoreLocale />} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><LayoutGrid className="h-4 w-4 text-primary-testo" /> Sala</h2>
          <dl className="mb-4 grid grid-cols-2 gap-x-4">
            <Voce etichetta="Tavoli liberi" valore={n(c?.sala.tavoli_liberi)} a={`${base}/sala`} />
            <Voce etichetta="Tavoli occupati" valore={n(c?.sala.tavoli_occupati)} a={`${base}/sala`} />
            <Voce etichetta="Seduti senza ordine" valore={n(c?.sala.tavoli_in_attesa)} a={`${base}/sala`} />
            <Voce etichetta="Lista d'attesa" valore={n(c?.sala.lista_attesa)} a={`${base}/prenotazioni`} />
          </dl>
          <h3 className="mb-1 text-label uppercase text-muted-foreground">Prossimi arrivi</h3>
          {prenotazioni.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">Nessun arrivo in programma per oggi.</p>
          ) : (
            <ul className="divide-y divide-border">
              {prenotazioni.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-12 font-mono font-semibold tabular-nums">{fmtOra(p.inizio)}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{p.nome} · {p.persone} persone</span>
                  {p.allergie.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-destructive-testo" aria-label="Allergie comunicate" />}
                  <Badge tone={(PRENOTAZIONE_STATO[p.stato] ?? PRENOTAZIONE_STATO.richiesta).tone}>{(PRENOTAZIONE_STATO[p.stato] ?? PRENOTAZIONE_STATO.richiesta).label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><ChefHat className="h-4 w-4 text-primary-testo" /> {bar ? 'Banco' : 'Cucina'}</h2>
          <dl className="mb-4 grid grid-cols-2 gap-x-4">
            <Voce etichetta="Da preparare" valore={n(c?.cucina.piatti_da_preparare as number)} a={banco} />
            <Voce etichetta="In preparazione" valore={n(c?.cucina.piatti_in_preparazione as number)} a={banco} />
            <Voce etichetta="Pronti da servire" valore={n(c?.cucina.piatti_pronti as number)} a={banco} />
            <Voce etichetta="Tempo medio" valore={c?.cucina.tempo_medio_preparazione_min != null ? `${fmtNumero(c.cucina.tempo_medio_preparazione_min, 1)} min` : '—'} />
          </dl>
          <h3 className="mb-1 flex items-center gap-2 text-label uppercase text-muted-foreground">
            In ritardo {(c?.cucina.ritardi ?? 0) > 0 && <Badge tone="danger">{c?.cucina.ritardi}</Badge>}
          </h3>
          {ritardi.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">{bar ? 'Nessun ordine oltre il tempo previsto.' : 'Nessun piatto oltre il tempo previsto.'}</p>
          ) : (
            <ul className="divide-y divide-border">
              {ritardi.map((r) => (
                <li key={r.riga_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate text-foreground">{Number(r.quantita)}× {r.descrizione}</span>
                  <span className="shrink-0 text-xs text-destructive-testo">{r.tavolo ? `Tavolo ${r.tavolo}` : `n. ${r.comanda_numero}`} · {r.minuti}′</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {c?.vendite && (
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><Receipt className="h-4 w-4 text-primary-testo" /> Vendite di oggi</h2>
            <dl className="mb-4 grid grid-cols-2 gap-x-4">
              <Voce etichetta="Incasso" valore={fmtEuro(c.vendite.incasso)} />
              <Voce etichetta="Conti chiusi" valore={c.vendite.conti_chiusi} />
              <Voce etichetta="Ticket medio" valore={fmtEuro(c.vendite.ticket_medio)} />
              <Voce etichetta="Spesa per coperto" valore={fmtEuro(c.vendite.spesa_per_coperto)} />
              <Voce etichetta="Margine" valore={fmtEuro(c.vendite.margine)} />
              <Voce etichetta="Food cost" valore={pct(c.vendite.food_cost_pct)} />
              <Voce etichetta="Beverage cost" valore={pct(c.vendite.beverage_cost_pct)} />
            </dl>
            {fasce.length === 0 ? (
              <p className="text-sm text-muted-foreground">L'andamento per fascia oraria compare con le prime vendite.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={fasce}>
                  <XAxis dataKey="ora" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip formatter={(v) => [fmtEuro(Number(v)), 'Venduto']} contentStyle={tooltipStyle} />
                  <Bar dataKey="incasso" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><Package className="h-4 w-4 text-primary-testo" /> Magazzino</h2>
          <dl className="mb-4 grid grid-cols-2 gap-x-4">
            <Voce etichetta="Sotto scorta" valore={n(c?.magazzino.sotto_scorta)} a={`${base}/magazzino`} />
            <Voce etichetta="In scadenza (3 giorni)" valore={n(c?.magazzino.in_scadenza)} a={`${base}/magazzino`} />
            <Voce etichetta="Scaduti in giacenza" valore={n(c?.magazzino.scaduti)} a={`${base}/magazzino`} />
            <Voce etichetta="Ordini in arrivo" valore={n(c?.magazzino.ordini_in_arrivo)} a={`${base}/magazzino`} />
            {bar && <Voce etichetta="Bottiglie in uso" valore={n(c?.magazzino.mescite_aperte)} a={`${base}/mescita`} />}
            {bar && <Voce etichetta="Consumi anomali (7 giorni)" valore={n(c?.magazzino.consumi_anomali)} a={`${base}/mescita`} />}
          </dl>
          <h3 className="mb-1 flex items-center gap-2 text-label uppercase text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" /> Scadenze</h3>
          {tutteScadenze.length === 0 ? (
            <EmptyState compatto icon={CalendarClock} title="Nessuna scadenza aperta" description="Garanzie, manutenzioni e acconti degli eventi compariranno qui." />
          ) : (
            <ul className="divide-y divide-border">
              {tutteScadenze.map((s) => (
                <li key={s.id}>
                  <Link to={s.azione_url ?? base} className="flex items-center gap-3 py-2 text-sm hover:text-foreground">
                    <Badge tone={s.data_scadenza <= oggi ? 'danger' : 'warning'}>{fmtData(s.data_scadenza)}</Badge>
                    <span className="min-w-0 flex-1 truncate text-foreground">{s.tipo}</span>
                    <span className="truncate text-xs text-muted-foreground">{s.descrizione}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><Users className="h-4 w-4 text-primary-testo" /> Personale</h2>
          <dl className="grid grid-cols-2 gap-x-4">
            <Voce etichetta="In turno adesso" valore={n(c?.personale?.in_turno_ora)} a={`${base}/personale`} />
            <Voce etichetta="Turni di oggi" valore={n(c?.personale?.turni_oggi)} a={`${base}/personale`} />
            <Voce etichetta="Ore previste" valore={isLoading ? undefined : fmtNumero(c?.personale?.ore_previste ?? 0, 1)} />
            <Voce etichetta="Ore lavorate" valore={isLoading ? undefined : fmtNumero(c?.personale?.ore_lavorate ?? 0, 1)} />
            <Voce etichetta="Assenti" valore={n(c?.personale?.assenti)} a={`${base}/personale`} />
          </dl>
        </Card>
      </div>
    </div>
  )
}

