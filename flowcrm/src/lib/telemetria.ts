/**
 * Telemetria (GlitchTip, API compatibile Sentry) — privacy-by-design.
 *
 * Regole fissate insieme agli altri due prodotti che condividono la macchina
 * di controllo. Il collettore è NOSTRO ma serve PIÙ titolari del trattamento:
 * ciò che esce da un'istanza cliente non deve poter identificare una persona.
 *
 *   - `sendDefaultPii: false` — niente IP, niente dati utente automatici.
 *   - Corpo richiesta, query string, cookie: ELIMINATI. In un CRM il corpo di
 *     una richiesta è il nome, la mail e il telefono di una persona fisica.
 *   - Header: lista di PERMESSI (solo user-agent e content-type), non di
 *     divieti. Una denylist dimentica sempre qualcosa.
 *   - URL normalizzati: /contatti/7f3a-… → /contatti/:id. Un UUID aggregato
 *     su un collettore condiviso è un identificativo, quindi tracciamento.
 *   - Nessun `user` reale: solo un identificativo OPACO (vedi sotto).
 *   - Breadcrumb senza payload.
 *
 * Interruttore per cliente: DSN vuoto = telemetria spenta, tutto no-op. È ciò
 * che permette di rispondere «si disattiva» a un DPO invece di «è obbligatoria».
 */
import * as Sentry from '@sentry/react'
import { APP_CONFIG } from '@/config/app.config'

/** Header che possono uscire dall'istanza. Tutto il resto viene scartato. */
const HEADER_AMMESSI = ['user-agent', 'content-type']

const RE_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const RE_NUMERICO = /\/\d{2,}(?=\/|$)/g

/**
 * Toglie dagli URL tutto ciò che identifica una riga o una persona:
 * identificativi di percorso e query string per intero.
 */
export function normalizzaUrl(url: string): string {
  if (!url) return url
  const senzaQuery = url.split('?')[0].split('#')[0]
  return senzaQuery.replace(RE_UUID, ':id').replace(RE_NUMERICO, '/:id')
}

/** Lascia passare solo gli header in lista. */
function filtraHeader(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    if (HEADER_AMMESSI.includes(k.toLowerCase())) out[k] = v
  }
  return out
}

/**
 * Identificativo opaco e stabile per l'utente, derivato dall'id con SHA-256 e
 * troncato. Serve solo a capire se due errori vengono dalla stessa persona
 * DENTRO la stessa istanza; non è riconducibile all'utente né confrontabile
 * fra istanze diverse, perché il sale è la chiave d'istanza.
 */
async function identificativoOpaco(userId: string): Promise<string> {
  const sale = APP_CONFIG.appName + '|' + APP_CONFIG.supabaseUrl
  const dati = new TextEncoder().encode(sale + '|' + userId)
  const digest = await crypto.subtle.digest('SHA-256', dati)
  return Array.from(new Uint8Array(digest).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Vero se la telemetria è attiva su questa istanza. */
export const telemetriaAttiva = (): boolean => Boolean(APP_CONFIG.sentryDsn)

export function inizializzaTelemetria(): void {
  if (!telemetriaAttiva()) return

  Sentry.init({
    dsn: APP_CONFIG.sentryDsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_RELEASE ?? undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,

    // I breadcrumb di console e fetch trasportano corpi e URL completi.
    integrations: (predefinite) =>
      predefinite.filter(
        (i) => i.name !== 'Breadcrumbs' && i.name !== 'BrowserApiErrors',
      ),

    beforeBreadcrumb(crumb) {
      if (crumb.data?.url) crumb.data.url = normalizzaUrl(String(crumb.data.url))
      // Il messaggio di un breadcrumb può contenere il payload: via.
      if (crumb.category === 'console' || crumb.category === 'xhr') return null
      return crumb
    },

    beforeSend(event) {
      if (event.request) {
        // Il corpo e la query string sono la fuga di dati più probabile.
        delete event.request.data
        delete event.request.query_string
        delete event.request.cookies
        if (event.request.url) event.request.url = normalizzaUrl(event.request.url)
        if (event.request.headers) {
          event.request.headers = filtraHeader(event.request.headers)
        }
      }
      // Nessun indirizzo IP, in nessun caso.
      if (event.user) delete event.user.ip_address
      // Anche la URL "logica" della transazione va normalizzata.
      if (event.transaction) event.transaction = normalizzaUrl(event.transaction)
      return event
    },
  })
}

/** Associa gli eventi a un identificativo opaco (mai id o email reali). */
export async function identificaUtente(userId: string): Promise<void> {
  if (!telemetriaAttiva()) return
  try {
    Sentry.setUser({ id: await identificativoOpaco(userId) })
  } catch {
    // crypto.subtle non disponibile (contesto non sicuro): meglio nessun
    // identificativo che uno in chiaro.
    Sentry.setUser(null)
  }
}

export function dimenticaUtente(): void {
  if (!telemetriaAttiva()) return
  Sentry.setUser(null)
}
