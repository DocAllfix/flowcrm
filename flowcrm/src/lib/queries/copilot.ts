import { supabase } from '@/lib/supabase'
import { APP_CONFIG } from '@/config/app.config'
import type { AttivitaTipo } from '@/lib/queries/attivita'

export interface CopilotMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Proposta d'azione: il copilot suggerisce, l'utente conferma prima di creare. */
export interface AzioneProposta {
  tipo: AttivitaTipo
  titolo: string
  descrizione?: string
  scadenza?: string
}

export type CopilotResult =
  | { kind: 'text' }
  | { kind: 'proposta'; azione: AzioneProposta }
  | { kind: 'navigazione'; percorso: string; pagina: string }

/**
 * Invia la conversazione alla Edge Function `copilot`.
 * - Risposta normale → streaming di testo (via onToken), ritorna {kind:'text'}.
 * - Richiesta di creazione → ritorna {kind:'proposta'} SENZA scrivere nulla:
 *   la scrittura avviene solo dopo conferma esplicita dell'utente.
 * I tool lato server girano col JWT della sessione → la RLS è la barriera.
 */
export async function askCopilot(
  messages: CopilotMessage[],
  onToken: (chunk: string) => void,
): Promise<CopilotResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sessione non valida')

  const res = await fetch(`${APP_CONFIG.supabaseUrl}/functions/v1/copilot`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: APP_CONFIG.supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  const contentType = res.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const j = await res.json()
    if (!res.ok || j.error) throw new Error(j.error ?? `Errore assistente (${res.status})`)
    if (j.tipo === 'proposta') return { kind: 'proposta', azione: j.azione as AzioneProposta }
    if (j.tipo === 'navigazione') return { kind: 'navigazione', percorso: j.percorso as string, pagina: j.pagina as string }
    // fallback: json inatteso
    return { kind: 'text' }
  }

  if (!res.ok) throw new Error(`Errore assistente (${res.status})`)
  if (!res.body) throw new Error('Nessuna risposta dallo stream')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    onToken(decoder.decode(value, { stream: true }))
  }
  return { kind: 'text' }
}
