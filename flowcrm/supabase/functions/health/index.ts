// ═══════════════════════════════════════════════════════════════════
// Health check — sonda per il monitoraggio esterno.
//
// È l'unico endpoint volutamente APERTO (verify_jwt = false in config.toml):
// una sonda di uptime non può portarsi dietro un JWT, e un health check che
// richiede autenticazione non può dire se l'autenticazione è caduta.
//
// Verifica i tre pezzi che possono rompersi separatamente in uno stack
// Supabase self-hostato: PostgREST+Postgres, GoTrue, Storage. Controllare
// solo che il sito risponda direbbe "vivo" anche con il database a terra.
//
// CONTENT-FREE per scelta: nessun dato, nessun conteggio, nessuna versione,
// nessun messaggio d'errore verso l'esterno. L'endpoint è pubblico, quindi
// tutto ciò che restituisce è pubblico. Chi ha bisogno del dettaglio lo
// trova nei log dell'istanza, non nella risposta.
// ═══════════════════════════════════════════════════════════════════
import { createClient } from 'jsr:@supabase/supabase-js@2'

const TIMEOUT_MS = 5000

/** Esito booleano di una sonda: mai eccezioni verso l'alto, mai dettagli. */
async function sonda(fn: () => Promise<boolean>): Promise<boolean> {
  try {
    return await Promise.race([
      fn(),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), TIMEOUT_MS)),
    ])
  } catch {
    return false
  }
}

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, serviceKey)

  const [db, auth, storage] = await Promise.all([
    // Query fissa, `head: true` → nessuna riga trasferita, solo il round-trip
    // fino a Postgres e ritorno.
    sonda(async () => {
      const { error } = await supabase
        .from('impostazioni_istanza')
        .select('id', { count: 'exact', head: true })
      return !error
    }),
    sonda(async () => {
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: serviceKey },
      })
      return res.ok
    }),
    sonda(async () => {
      const { error } = await supabase.storage.getBucket('allegati')
      return !error
    }),
  ])

  const tuttoBene = db && auth && storage

  return new Response(
    JSON.stringify({
      status: tuttoBene ? 'ok' : 'degraded',
      componenti: {
        db: db ? 'ok' : 'ko',
        auth: auth ? 'ok' : 'ko',
        storage: storage ? 'ok' : 'ko',
      },
    }),
    {
      // 503 quando è degradato: la sonda deve poterlo capire dal codice HTTP,
      // senza interpretare il corpo.
      status: tuttoBene ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  )
})
