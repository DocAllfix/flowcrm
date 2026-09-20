import NumberFlow from '@number-flow/react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'

/**
 * Scheda KPI — la cifra singola in cima a un cruscotto.
 *
 * ── Perché esiste ───────────────────────────────────────────────────
 * Ne esistevano CINQUE copie: `KpiCard` nella dashboard operativa e
 * quattro componenti locali `Kpi`/`KpiEco` in DashboardEconomicaPage,
 * ParcoDashboardPage, GareDashboardPage e PoliambulatorioDashboardPage.
 * Gli ultimi quattro erano identici byte per byte — stesso md5 del corpo.
 * Con cinque copie, una correzione ne raggiunge una e le altre quattro
 * restano indietro: è esattamente ciò che era successo, vedi sotto.
 *
 * ── Il difetto che questa primitiva chiude ──────────────────────────
 * Le copie ricevevano il valore GIÀ formattato in stringa, con
 * `?? 0` a coprire il caso «dato non ancora arrivato»:
 *
 *     value={String(kpi?.appuntamenti_oggi ?? 0)}
 *
 * Finché la query non risponde, `kpi` è `undefined` e la scheda mostra
 * **0 appuntamenti oggi**. Non è un difetto di stile: è un numero falso,
 * leggibile, sotto un'etichetta che lo dichiara vero — e chi lo legge non
 * ha modo di sapere che fra un istante diventerà 14. Sulla dashboard
 * operativa l'avevo corretto; negli altri 22 punti no.
 *
 * Qui il tipo stesso lo impedisce: `valore` è `number | string |
 * undefined`, e `undefined` significa «non è ancora arrivato» e produce un
 * segnaposto, mai una cifra. Chi chiama non può più passare uno zero per
 * distrazione, perché non deve più scrivere `?? 0`.
 *
 * ── Perché il numero è animato ──────────────────────────────────────
 * `NumberFlow` anima la CIFRA, non la posizione: quando un aggiornamento
 * realtime cambia un conteggio la cifra si trasforma invece di sostituirsi
 * di scatto, e si vede che è cambiata senza confrontare due schermate a
 * memoria. Rispetta `prefers-reduced-motion` per conto suo. Il pacchetto
 * era già installato e usato in un solo file su sette.
 */

export type FormatoKpi = 'conteggio' | 'euro' | 'percentuale' | 'giorni'

/* NumberFlow accetta un sottoinsieme di Intl.NumberFormatOptions (niente
   notazione scientifica), quindi il tipo e' il suo, non quello di Intl. */
type OpzioniCifra = Intl.NumberFormatOptions & { notation?: 'standard' | 'compact' }

const FORMATI: Record<FormatoKpi, OpzioniCifra | undefined> = {
  conteggio: undefined,
  euro: { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 },
  percentuale: { style: 'unit', unit: 'percent', maximumFractionDigits: 1 },
  giorni: { style: 'unit', unit: 'day', unitDisplay: 'short' },
}

/** Come si legge il valore ad alta voce, per il nome accessibile. */
function valoreParlato(valore: number | string | undefined, formato: FormatoKpi): string {
  if (valore === undefined) return 'dato in arrivo'
  if (typeof valore === 'string') return valore
  return new Intl.NumberFormat('it-IT', FORMATI[formato]).format(valore)
}

export function SchedaKpi({
  icona: Icona,
  etichetta,
  valore,
  formato = 'conteggio',
  nota,
  tinta,
  a,
  ampia = false,
}: {
  icona: React.ElementType
  etichetta: string
  /**
   * `undefined` finché il dato non è arrivato: NON zero, NON stringa vuota.
   * Un `number` viene animato e allineato a cifre tabellari; una `string`
   * è per i valori che numeri non sono (un «—» quando la metrica non è
   * calcolabile, o un intervallo).
   */
  valore: number | string | undefined
  formato?: FormatoKpi
  /** Dettaglio secondario, es. «+3 nel mese». Mai il dato principale. */
  nota?: string
  /** Classi di sfondo/testo dell'icona: SEMPRE token, mai colori a mano. */
  tinta: string
  /** Se presente, l'intera scheda diventa un collegamento a quella pagina. */
  a?: string
  /** Variante alta, per la scheda di atterraggio. Default: compatta. */
  ampia?: boolean
}) {
  const inArrivo = valore === undefined

  const cifra = inArrivo ? (
    // Segnaposto della forma del numero, non uno spinner: la scatola non
    // cambia dimensione quando il dato arriva, quindi niente salto.
    <span
      aria-hidden
      className={`block rounded-md bg-muted motion-safe:animate-pulse ${ampia ? 'h-8 w-16' : 'h-7 w-20'}`}
    />
  ) : typeof valore === 'number' ? (
    <NumberFlow
      data-slot="kpi"
      value={valore}
      locales="it-IT"
      format={FORMATI[formato]}
      className={ampia ? 'text-3xl font-semibold text-foreground' : 'text-title text-foreground'}
    />
  ) : (
    <span data-slot="kpi" className={ampia ? 'text-3xl font-semibold text-foreground' : 'text-title text-foreground'}>
      {valore}
    </span>
  )

  // Nome esplicito: mentre il dato arriva la cifra è un segnaposto nascosto
  // e l'icona è decorativa, quindi il nome calcolato sarebbe la sola
  // etichetta — e due schede diverse suonerebbero identiche a chi usa uno
  // screen reader.
  const nome = `${etichetta}: ${valoreParlato(valore, formato)}${nota ? `, ${nota}` : ''}`

  if (ampia) {
    const corpo = (
      <>
        <div className="mb-3 flex items-center justify-between">
          <div className={`flex size-11 items-center justify-center rounded-md ${tinta}`}>
            <Icona className="size-5" aria-hidden />
          </div>
          {cifra}
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {etichetta}
          {nota && !inArrivo && <span className="ml-1 font-normal">({nota})</span>}
        </p>
      </>
    )
    return a ? (
      <Link
        to={a}
        aria-label={`${nome}. Apri l'elenco`}
        className="group rounded-lg border border-border bg-card p-5 transition-[box-shadow,border-color] hover:border-input hover:shadow-risposta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {corpo}
      </Link>
    ) : (
      <Card className="p-5" aria-label={nome}>{corpo}</Card>
    )
  }

  return (
    <Card className="p-4" aria-label={nome}>
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tinta}`}>
          <Icona className="h-4 w-4" aria-hidden />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{etichetta}</span>
      </div>
      <p>{cifra}</p>
      {nota && !inArrivo && <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>}
    </Card>
  )
}
