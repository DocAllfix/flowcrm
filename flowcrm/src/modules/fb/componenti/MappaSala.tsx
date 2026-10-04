/**
 * Mappa grafica della sala (Ristorante §7, Bar §7). Le coordinate dei
 * tavoli sono in unità della sala e diventano percentuali: la mappa si
 * adatta al tablet come al monitor. In modalità disposizione i tavoli si
 * trascinano (puntatore o tastiera con le frecce) e la posizione si salva
 * al rilascio; durante il trascinamento si muove solo con `transform`.
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'
import { TAVOLO_STATO, fmtOra, minutiDa } from '@/modules/fb/stati'
import type { Sala, TavoloStato } from '@/modules/fb/queries'

interface Props {
  sala: Sala
  tavoli: TavoloStato[]
  selezionato: string | null
  onSeleziona: (id: string) => void
  disposizione: boolean
  onSposta: (id: string, x: number, y: number) => void
}

export function MappaSala({ sala, tavoli, selezionato, onSeleziona, disposizione, onSposta }: Props) {
  const area = useRef<HTMLDivElement>(null)
  const [trascina, setTrascina] = useState<{ id: string; dx: number; dy: number; x0: number; y0: number } | null>(null)

  const scala = () => {
    const r = area.current?.getBoundingClientRect()
    return r ? { sx: sala.larghezza / r.width, sy: sala.altezza / r.height } : { sx: 1, sy: 1 }
  }
  const limita = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v / 10) * 10))

  function giu(e: PointerEvent<HTMLButtonElement>, t: TavoloStato) {
    if (!disposizione) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setTrascina({ id: t.tavolo_id!, dx: 0, dy: 0, x0: e.clientX, y0: e.clientY })
  }
  function muovi(e: PointerEvent<HTMLButtonElement>) {
    if (!trascina) return
    setTrascina({ ...trascina, dx: e.clientX - trascina.x0, dy: e.clientY - trascina.y0 })
  }
  function su(t: TavoloStato) {
    if (!trascina) return
    const { sx, sy } = scala()
    if (Math.abs(trascina.dx) + Math.abs(trascina.dy) > 3) {
      onSposta(t.tavolo_id!, limita((t.x ?? 0) + trascina.dx * sx, sala.larghezza - (t.larghezza ?? 80)),
        limita((t.y ?? 0) + trascina.dy * sy, sala.altezza - (t.altezza ?? 80)))
    } else {
      onSeleziona(t.tavolo_id!)
    }
    setTrascina(null)
  }
  function tasto(e: KeyboardEvent<HTMLButtonElement>, t: TavoloStato) {
    if (!disposizione) return
    const passo = e.shiftKey ? 50 : 10
    const d = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[e.key]
    if (!d) return
    e.preventDefault()
    onSposta(t.tavolo_id!, limita((t.x ?? 0) + d[0], sala.larghezza - (t.larghezza ?? 80)),
      limita((t.y ?? 0) + d[1], sala.altezza - (t.altezza ?? 80)))
  }

  return (
    <div ref={area} role="group" aria-label={`Mappa di ${sala.nome}`}
      className={cn('relative w-full overflow-hidden rounded-xl border border-border bg-card',
        disposizione && 'bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px]')}
      style={{ aspectRatio: `${sala.larghezza} / ${sala.altezza}` }}>
      {tavoli.map((t) => {
        const st = TAVOLO_STATO[t.stato ?? 'libero'] ?? TAVOLO_STATO.libero
        const inMovimento = trascina?.id === t.tavolo_id
        const attivo = selezionato === t.tavolo_id
        const minuti = t.aperta_at ? minutiDa(t.aperta_at) : null
        return (
          <button key={t.tavolo_id} type="button"
            onClick={() => { if (!disposizione) onSeleziona(t.tavolo_id!) }}
            onPointerDown={(e) => giu(e, t)} onPointerMove={muovi} onPointerUp={() => su(t)}
            onKeyDown={(e) => tasto(e, t)}
            aria-pressed={attivo}
            aria-label={`Tavolo ${t.numero}, ${st.label.toLowerCase()}, ${t.posti} posti${t.prenotazione_nome ? `, prenotato da ${t.prenotazione_nome} alle ${fmtOra(t.prenotazione_inizio)}` : ''}`}
            className={cn(
              '@container absolute flex select-none flex-col items-center justify-center overflow-hidden border-2 text-center transition-[box-shadow,border-color] duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              t.forma === 'rotondo' ? 'rounded-full' : 'rounded-lg',
              st.riempimento, st.bordo,
              attivo && 'shadow-sospeso ring-2 ring-ring ring-offset-2 ring-offset-card',
              disposizione ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-pointer hover:shadow-risposta',
            )}
            style={{
              left: `${((t.x ?? 0) / sala.larghezza) * 100}%`,
              top: `${((t.y ?? 0) / sala.altezza) * 100}%`,
              width: `${((t.larghezza ?? 80) / sala.larghezza) * 100}%`,
              height: `${((t.altezza ?? 80) / sala.altezza) * 100}%`,
              transform: `${inMovimento ? `translate(${trascina!.dx}px, ${trascina!.dy}px) ` : ''}rotate(${t.rotazione ?? 0}deg)`,
              zIndex: inMovimento ? 10 : undefined,
            }}>
            <span className="text-sm font-semibold leading-none text-foreground">{t.numero}</span>
            <span className="mt-0.5 hidden text-xs leading-tight text-muted-foreground @min-[3.25rem]:block">
              {t.coperti ? `${t.coperti}/${t.posti}` : `${t.posti} p.`}
            </span>
            {!disposizione && t.stato === 'prenotato' && t.prenotazione_inizio && (
              <span className="hidden text-xs font-medium leading-tight text-info-testo @min-[3.25rem]:block">{fmtOra(t.prenotazione_inizio)}</span>
            )}
            {!disposizione && minuti !== null && t.stato !== 'libero' && (
              <span className="hidden text-xs leading-tight text-muted-foreground @min-[3.25rem]:block">{minuti}′</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function LegendaTavoli() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Legenda">
      {Object.entries(TAVOLO_STATO).map(([k, s]) => (
        <li key={k} className="flex items-center gap-1.5">
          <span className={cn('inline-block size-3 rounded-sm border-2', s.riempimento, s.bordo)} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  )
}
