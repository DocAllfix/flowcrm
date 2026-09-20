import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { APP_CONFIG } from '@/config/app.config'

// Il client si crea alla PRIMA USO, non all'import del modulo.
//
// Serve perché la configurazione ora arriva a runtime da /config.json: se il
// client nascesse all'import, questo modulo andrebbe importato solo DOPO il
// caricamento della configurazione, cioè in modo asincrono. E l'avvio
// asincrono ha un effetto collaterale che è costato caro: `window.__supabase`
// — che i test end-to-end usano in 20 punti — comparirebbe qualche istante
// DOPO il caricamento della pagina, e un `page.evaluate()` subito dopo una
// navigazione lo troverebbe `undefined`.
//
// Con la creazione pigra il modulo si importa in modo statico (quindi
// `window.__supabase` esiste da subito), mentre le credenziali vengono lette
// solo quando qualcuno fa davvero una query — a configurazione già caricata.
let istanza: SupabaseClient<Database> | null = null

function client(): SupabaseClient<Database> {
  if (istanza) return istanza

  const { supabaseUrl, supabaseAnonKey } = APP_CONFIG
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Client Supabase usato prima del caricamento della configurazione ' +
        "(attendere caricaConfigurazione() prima di eseguire query)."
    )
  }

  istanza = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  })
  return istanza
}

// I metodi vanno LEGATI al client reale: senza `bind`, chiamare
// `supabase.from(...)` passerebbe il proxy come `this` e il client non
// funzionerebbe.
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_bersaglio, prop) {
    const c = client() as unknown as Record<string | symbol, unknown>
    const valore = c[prop]
    return typeof valore === 'function' ? valore.bind(c) : valore
  },
})

// Solo in sviluppo: espone il client ai test end-to-end (Playwright).
// Assegnato all'import del modulo, quindi disponibile appena la pagina carica.
if (import.meta.env.DEV) {
  ;(window as unknown as { __supabase: typeof supabase }).__supabase = supabase
}

// ── Type helpers ────────────────────────────────────────────────
// Uso: Tables<'pratiche'> → tipo Row della tabella pratiche
//      Inserts<'pratiche'> → tipo Insert della tabella pratiche
//      Updates<'pratiche'> → tipo Update della tabella pratiche

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// ── Enum helpers ────────────────────────────────────────────────
// Uso: DbEnum<'user_role'> → 'admin' | 'responsabile' | 'operatore'

export type DbEnum<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
