import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageSquare, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CONTATTI_DEMO, EVENTO_APRI_INVITO, LEGALI_DEMO } from '@/lib/demo'

/**
 * Invito al contatto dentro la demo pubblica: «ti sta piacendo? scrivici».
 *
 * Compare solo all'OSPITE e solo se c'è dove spedire (`VITE_DEMO_PUBBLICA_CONTATTI`),
 * dopo 3 minuti nella demo o 5 pagine visitate, la prima delle due. Si apre subito
 * anche dal link della fascia (evento `EVENTO_APRI_INVITO`).
 *
 * ⚠️ Il conteggio sta in `sessionStorage` sotto una sola chiave, dichiarata nella
 * pagina Cookie del sito: se cambia il nome, si cambia anche lì.
 *
 * ⚠️ Carta discreta in basso a SINISTRA, niente finestra modale: a destra c'è il
 * Copilot, e un visitatore che sta provando non va interrotto.
 *
 * La spedizione è di `pmiflow.eu/api/contatti` (stessi freni del modulo del sito):
 * qui non si salva niente.
 */
const CHIAVE = 'pmiflow-invito-contatto'
const DOPO_MS = 3 * 60_000
const DOPO_PAGINE = 5

type Memoria = { inizio: number; pagine: number; chiuso: boolean }
type Fase = 'nascosto' | 'invito' | 'modulo' | 'invio' | 'grazie'

function leggi(): Memoria {
  try {
    const m = JSON.parse(sessionStorage.getItem(CHIAVE) ?? 'null') as Memoria | null
    if (m && typeof m.inizio === 'number') return m
  } catch {
    // Memoria del browser bloccata o illeggibile: si riparte da zero.
  }
  return { inizio: Date.now(), pagine: 0, chiuso: false }
}

function scrivi(m: Memoria) {
  try {
    sessionStorage.setItem(CHIAVE, JSON.stringify(m))
  } catch {
    // Senza memoria l'invito funziona lo stesso, solo non ricorda la chiusura.
  }
}

export function InvitoContatto() {
  const { ospiteDemo } = useAuth()
  const attivo = ospiteDemo && CONTATTI_DEMO !== ''
  const { pathname } = useLocation()
  const [fase, setFase] = useState<Fase>('nascosto')
  const [errore, setErrore] = useState('')
  const memoria = useRef<Memoria | null>(null)
  const apertoIl = useRef(0)

  const attesa = useRef(0)
  const mostra = useCallback(() => {
    if (memoria.current?.chiuso) return
    // ⚠️ Durante il giro guidato l'overlay di driver.js copre la pagina e l'invito
    // non sarebbe cliccabile: si aspetta che il giro finisca.
    if (document.body.classList.contains('driver-active')) {
      window.clearTimeout(attesa.current)
      attesa.current = window.setTimeout(mostra, 2000)
      return
    }
    setFase((f) => (f === 'nascosto' ? 'invito' : f))
  }, [])

  useEffect(() => () => window.clearTimeout(attesa.current), [])

  // Tempo: parte dal primo ingresso nella sessione, non da ogni ricarica.
  useEffect(() => {
    if (!attivo) return
    memoria.current ??= leggi()
    scrivi(memoria.current)
    const resta = memoria.current.inizio + DOPO_MS - Date.now()
    const t = window.setTimeout(mostra, Math.max(resta, 0))
    return () => window.clearTimeout(t)
  }, [attivo, mostra])

  // Pagine: ogni cambio di percorso conta una visita.
  useEffect(() => {
    if (!attivo) return
    const m = (memoria.current ??= leggi())
    m.pagine += 1
    scrivi(m)
    if (m.pagine >= DOPO_PAGINE) mostra()
  }, [attivo, pathname, mostra])

  // Dalla fascia: si apre direttamente il modulo, anche dopo un «Più tardi».
  useEffect(() => {
    if (!attivo) return
    const apri = () => {
      apertoIl.current = Date.now()
      setErrore('')
      setFase((f) => (f === 'grazie' || f === 'invio' ? f : 'modulo'))
    }
    window.addEventListener(EVENTO_APRI_INVITO, apri)
    return () => window.removeEventListener(EVENTO_APRI_INVITO, apri)
  }, [attivo])

  if (!attivo || fase === 'nascosto') return null

  function chiudi() {
    const m = (memoria.current ??= leggi())
    m.chiuso = true
    scrivi(m)
    setFase('nascosto')
  }

  function scrivici() {
    apertoIl.current = Date.now()
    setFase('modulo')
  }

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFase('invio')
    setErrore('')
    const d = new FormData(e.currentTarget)
    try {
      const r = await fetch(CONTATTI_DEMO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: d.get('nome'),
          azienda: d.get('azienda'),
          email: d.get('email'),
          utenti: d.get('utenti'),
          messaggio: d.get('messaggio'),
          motivo: 'presentazione',
          origine: 'demo',
          sito: d.get('sito'),
          trascorsi: Date.now() - apertoIl.current,
        }),
      })
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; errore?: string }
      if (r.ok && j.ok) {
        const m = (memoria.current ??= leggi())
        m.chiuso = true
        scrivi(m)
        setFase('grazie')
        return
      }
      setErrore(j.errore ?? 'Non siamo riusciti a inviare la richiesta. Riprova fra qualche minuto.')
    } catch {
      setErrore('Connessione assente. Controlla la rete e riprova.')
    }
    setFase('modulo')
  }

  const etichetta = 'block text-xs font-medium text-foreground'

  return (
    <aside
      aria-label="Richiedi una presentazione"
      className="fixed bottom-4 left-4 z-40 w-[340px] max-w-[calc(100vw-6rem)] rounded-lg border border-border bg-card p-4 text-card-foreground shadow-2xl sm:bottom-6 sm:left-6"
    >
      <button
        type="button"
        onClick={chiudi}
        aria-label="Chiudi"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      {fase === 'invito' && (
        <div className="space-y-3 pr-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-primary-testo" aria-hidden />
            Ti sta piacendo?
          </p>
          <p className="text-sm text-muted-foreground">
            Te lo mostriamo sui tuoi dati, con i moduli che servono alla tua azienda.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={scrivici}>
              Scrivici
            </Button>
            <Button size="sm" variant="ghost" onClick={chiudi}>
              Più tardi
            </Button>
          </div>
        </div>
      )}

      {(fase === 'modulo' || fase === 'invio') && (
        <form onSubmit={invia} className="space-y-3">
          <p className="pr-6 text-sm font-semibold">Richiedi una presentazione</p>
          <label className={etichetta}>
            Nome e cognome
            <Input name="nome" required minLength={2} maxLength={120} autoComplete="name" className="mt-1 h-9" />
          </label>
          <label className={etichetta}>
            Azienda
            <Input name="azienda" required minLength={2} maxLength={160} autoComplete="organization" className="mt-1 h-9" />
          </label>
          <label className={etichetta}>
            Email di lavoro
            <Input name="email" type="email" required maxLength={200} autoComplete="email" className="mt-1 h-9" />
          </label>
          <label className={etichetta}>
            Quante persone lo useranno
            <select
              name="utenti"
              required
              defaultValue=""
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="" disabled>
                Scegli
              </option>
              <option value="1-5">Da 1 a 5</option>
              <option value="6-15">Da 6 a 15</option>
              <option value="oltre-15">Più di 15</option>
            </select>
          </label>
          <label className={etichetta}>
            Qualcosa da sapere prima <span className="font-normal text-muted-foreground">(facoltativo)</span>
            <Textarea name="messaggio" rows={2} maxLength={2000} className="mt-1 min-h-0" />
          </label>

          {/* Trappola per i robot: un umano non la vede e non la compila. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Sito web
              <input name="sito" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          {/* Informativa art. 13 GDPR al momento della raccolta. */}
          <p className="text-[11px] leading-snug text-muted-foreground">
            Usiamo questi dati solo per risponderti: arrivano come email, non li salviamo altrove.{' '}
            <a href={LEGALI_DEMO.privacy} target="_blank" rel="noopener" className="underline underline-offset-2">
              Informativa sulla privacy
            </a>
          </p>

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={fase === 'invio'}>
              {fase === 'invio' ? 'Invio in corso' : 'Invia'}
            </Button>
            <p role="status" aria-live="polite" className="text-xs text-destructive">
              {errore}
            </p>
          </div>
        </form>
      )}

      {fase === 'grazie' && (
        <div role="status" className="space-y-1 pr-5">
          <p className="text-sm font-semibold">Grazie, ti scriviamo noi.</p>
          <p className="text-sm text-muted-foreground">Intanto puoi continuare a provare la demo.</p>
        </div>
      )}
    </aside>
  )
}
