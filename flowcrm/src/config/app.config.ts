/**
 * Configurazione white-label per istanza cliente.
 *
 * ── Perché a RUNTIME e non da variabili VITE_* ──────────────────────
 * Vite sostituisce `import.meta.env.VITE_*` con il valore letterale **al
 * momento della build**: le variabili finiscono cotte dentro il bundle JS.
 * Con un'immagine Docker per cliente questo significherebbe ricostruire
 * l'applicazione a ogni nuovo cliente e a ogni cambio di logo, e soprattutto
 * che due clienti non girerebbero mai lo stesso binario — quindi un difetto
 * che compare da uno solo potrebbe sempre essere la sua build.
 *
 * Qui la configurazione arriva invece da `/config.json`, servito accanto
 * all'applicazione e montato dal deploy. Una sola immagine per tutti, e una
 * riconfigurazione è un riavvio, non una ricostruzione.
 *
 * ── Perché `.strict()` ──────────────────────────────────────────────
 * Per impostazione predefinita zod **scarta in silenzio** le chiavi che non
 * conosce. Un `config.json` con `nomeCliente` invece di `clienteName` non
 * darebbe alcun errore: darebbe il valore di default, e ogni cliente si
 * chiamerebbe come il default. Con `.strict()` una chiave sconosciuta ferma
 * l'avvio, che è esattamente ciò che si vuole da un errore di battitura in
 * un file di configurazione scritto a mano.
 */
import { z } from 'zod'

const SchemaConfig = z
  .object({
    // Supabase dell'istanza. Self-hostato, Caddy lo serve sullo STESSO
    // dominio dell'applicazione: qui va l'URL pubblico dell'istanza
    // (es. "https://acme.flowcrm.it"), non un indirizzo interno al Docker.
    supabaseUrl: z.string().min(1),
    supabaseAnonKey: z.string().min(1),

    // Identità
    appName: z.string().default('FlowCRM'),
    clienteName: z.string().default(''),
    logoUrl: z.string().default('/logo-default.svg'),
    faviconUrl: z.string().default('/favicon.svg'),

    // Tema
    primaryColor: z.string().default('#ff5c35'),
    accentColor: z.string().default('#33475b'),

    // Funzionalità
    demoMode: z.boolean().default(false),
    tourEnabled: z.boolean().default(false),

    // Moduli verticali attivi in questa istanza. La UI mostra solo questi;
    // la barriera vera è la licenza nel DB (moduli_licenze + RLS
    // modulo_licenziato). Vuoto = solo CRM base.
    moduli: z.array(z.string()).default([]),

    // Osservabilità. DSN vuoto = telemetria SPENTA su questa istanza.
    sentryDsn: z.string().default(''),
    release: z.string().default(''),
  })
  .strict()

export type Config = z.infer<typeof SchemaConfig>

/** Valori da variabili d'ambiente: servono solo in sviluppo (vedi sotto). */
function daAmbiente(): Config {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    appName: import.meta.env.VITE_APP_NAME ?? 'FlowCRM',
    clienteName: import.meta.env.VITE_CLIENTE_NAME ?? '',
    logoUrl: import.meta.env.VITE_LOGO_URL ?? '/logo-default.svg',
    faviconUrl: import.meta.env.VITE_FAVICON_URL ?? '/favicon.svg',
    primaryColor: import.meta.env.VITE_PRIMARY_COLOR ?? '#ff5c35',
    accentColor: import.meta.env.VITE_ACCENT_COLOR ?? '#33475b',
    demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
    tourEnabled: import.meta.env.VITE_TOUR_ENABLED === 'true',
    moduli: (import.meta.env.VITE_MODULES ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean),
    sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
    release: import.meta.env.VITE_RELEASE ?? '',
  }
}

/**
 * Oggetto letto dal resto dell'applicazione. L'identità non cambia mai — chi
 * lo importa continua a vedere lo stesso riferimento — ma il contenuto viene
 * riempito da `caricaConfigurazione()` prima che React monti qualcosa.
 */
export const APP_CONFIG: Config = daAmbiente()

/**
 * Carica e valida `/config.json`, poi popola APP_CONFIG.
 * Va chiamata (e attesa) PRIMA di importare l'applicazione.
 *
 * In produzione il file è obbligatorio: se manca o non è valido l'avvio si
 * ferma con un messaggio esplicito. Un'istanza che parte con la
 * configurazione del cliente sbagliata è peggio di un'istanza che non parte.
 * In sviluppo il file è facoltativo e si ricade su `.env.local`.
 */
export async function caricaConfigurazione(): Promise<void> {
  let grezzo: unknown

  try {
    const res = await fetch('/config.json', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    grezzo = await res.json()
  } catch (causa) {
    if (import.meta.env.DEV) {
      // In sviluppo si lavora con .env.local: nessun config.json da montare.
      validaMinimo(APP_CONFIG)
      return
    }
    throw new Error(
      `Configurazione non caricata: /config.json non è raggiungibile o non è JSON valido (${String(causa)}). ` +
        `Il file va montato dal deploy accanto all'applicazione.`,
    )
  }

  const esito = SchemaConfig.safeParse(grezzo)
  if (!esito.success) {
    const dettagli = esito.error.issues
      .map((i) => `  - ${i.path.join('.') || '(radice)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Configurazione /config.json non valida:\n${dettagli}`)
  }

  Object.assign(APP_CONFIG, esito.data)
  validaMinimo(APP_CONFIG)
}

/** Senza questi due valori l'applicazione non può parlare con il database. */
function validaMinimo(c: Config): void {
  if (!c.supabaseUrl || !c.supabaseAnonKey) {
    throw new Error(
      'Configurazione incompleta: supabaseUrl e supabaseAnonKey sono obbligatori ' +
        '(in sviluppo: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY in .env.local).',
    )
  }
}
