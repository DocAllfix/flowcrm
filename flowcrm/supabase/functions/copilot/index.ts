// ═══════════════════════════════════════════════════════════════════
// F12a — Copilot Q&A con tool-use.
// SICUREZZA: i tool eseguono query con il CLIENT AUTENTICATO COL JWT
// DELL'UTENTE → la RLS resta la barriera. Un operatore che chiede dati
// economici riceve zero righe (non li vede nemmeno il modello).
// Nessun SQL libero: solo un set chiuso di tool parametrici.
// Modello: Azure OpenAI GPT-4.1-mini (v1 OpenAI-compatible).
// ═══════════════════════════════════════════════════════════════════
import { createClient } from 'jsr:@supabase/supabase-js@2'

// CORS ristretto: solo le origini in COPILOT_ALLOWED_ORIGINS (CSV).
// Se la variabile non è configurata si torna a '*' (difesa in profondità:
// la barriera vera resta il JWT utente, non il CORS).
const ALLOWED_ORIGINS = (Deno.env.get('COPILOT_ALLOWED_ORIGINS') ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean)

function corsHeaders(origin: string | null): Record<string, string> {
  let allow = '*'
  if (ALLOWED_ORIGINS.length > 0) {
    allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  }
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

// ── Tool disponibili al modello (set chiuso, parametrico) ─────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'conta_entita',
      description: 'Conta i record di una tabella CRM. Usa per "quanti/quante".',
      parameters: {
        type: 'object',
        properties: {
          tabella: { type: 'string', enum: ['organizzazioni', 'contatti', 'deals', 'commesse', 'fatture', 'scadenze_pagamento', 'scadenze_tasse'] },
        },
        required: ['tabella'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'somma_incassi_da_incassare',
      description: 'Somma degli incassi ancora da incassare (importo totale atteso). Solo dati amministrativi.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deal_per_stage',
      description: 'Elenca i deal aperti raggruppati per fase con importo totale.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scadenze_prossime',
      description: 'Scadenze fiscali e incassi in arrivo entro N giorni (default 30).',
      parameters: {
        type: 'object',
        properties: { giorni: { type: 'number', description: 'Finestra in giorni' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cerca_guida',
      description: 'Cerca nel manuale di FlowCRM. USA SEMPRE questo per domande su COME si fa qualcosa (es. "come creo una fattura", "come funziona il kanban", "come importo i dati").',
      parameters: {
        type: 'object',
        properties: { domanda: { type: 'string', description: "La domanda dell'utente su come usare FlowCRM" } },
        required: ['domanda'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'proponi_attivita',
      description: "Quando l'utente CHIEDE DI CREARE un task, una nota o un promemoria (es. 'creami un task', 'ricordami di chiamare X', 'aggiungi una nota'), NON crearlo: proponi i dettagli con questo tool. L'utente confermerà prima della creazione.",
      parameters: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['task', 'chiamata', 'email', 'nota'], description: 'Tipo di attività' },
          titolo: { type: 'string', description: 'Titolo conciso' },
          descrizione: { type: 'string', description: 'Dettagli opzionali' },
          scadenza: { type: 'string', description: 'Data ISO YYYY-MM-DD se indicata (opzionale)' },
        },
        required: ['tipo', 'titolo'],
      },
    },
  },
]

// Embedding della query via Azure (risorsa dedicata agli embedding)
async function embedQuery(text: string): Promise<number[] | null> {
  const ep = Deno.env.get('AZURE_EMBED_ENDPOINT')
  const key = Deno.env.get('AZURE_EMBED_API_KEY')
  const dep = Deno.env.get('AZURE_EMBED_DEPLOYMENT')
  if (!ep || !key || !dep) return null
  try {
    const res = await fetch(`${ep}/embeddings`, {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: dep, input: text }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.data[0].embedding
  } catch {
    return null
  }
}

async function eseguiTool(name: string, args: Record<string, unknown>, sb: ReturnType<typeof createClient>): Promise<unknown> {
  switch (name) {
    case 'conta_entita': {
      const t = String(args.tabella)
      const { count, error } = await sb.from(t).select('id', { count: 'exact', head: true })
      // Se la RLS nega (operatore su tabella economica) count è 0/null: risposta onesta
      return error ? { errore: 'non accessibile' } : { tabella: t, conteggio: count ?? 0 }
    }
    case 'somma_incassi_da_incassare': {
      const { data, error } = await sb
        .from('scadenze_pagamento')
        .select('importo')
        .neq('stato', 'incassato')
      if (error) return { errore: 'non accessibile' }
      const tot = (data ?? []).reduce((s: number, r: { importo: number }) => s + Number(r.importo), 0)
      return { totale_da_incassare: tot, valuta: 'EUR' }
    }
    case 'deal_per_stage': {
      const { data, error } = await sb
        .from('deals')
        .select('importo, stage:pipeline_stages(nome)')
        .eq('attivo', true)
      if (error) return { errore: 'non accessibile' }
      const map: Record<string, { n: number; tot: number }> = {}
      for (const d of (data ?? []) as { importo: number; stage: { nome: string } | null }[]) {
        const s = d.stage?.nome ?? '—'
        map[s] ??= { n: 0, tot: 0 }
        map[s].n++; map[s].tot += Number(d.importo)
      }
      return map
    }
    case 'scadenze_prossime': {
      const giorni = Number(args.giorni ?? 30)
      const limite = new Date(Date.now() + giorni * 86400000).toISOString().slice(0, 10)
      const [tasse, incassi] = await Promise.all([
        sb.from('scadenze_tasse').select('tipo_tassa, importo, scadenza').lte('scadenza', limite).neq('stato', 'pagata'),
        sb.from('scadenze_pagamento').select('descrizione, importo, data_prevista').lte('data_prevista', limite).neq('stato', 'incassato'),
      ])
      return {
        tasse: tasse.error ? 'non accessibile' : tasse.data,
        incassi: incassi.error ? 'non accessibile' : incassi.data,
      }
    }
    case 'cerca_guida': {
      const emb = await embedQuery(String(args.domanda))
      if (!emb) return { errore: 'ricerca guida non disponibile' }
      const { data, error } = await sb.rpc('match_kb_guida', {
        query_embedding: emb as unknown as string,
        match_count: 4,
        soglia: 0.25,
      })
      if (error || !data?.length) return { sezioni: [], nota: 'Nessuna sezione pertinente nel manuale.' }
      return { sezioni: data }
    }
    default:
      return { errore: 'tool sconosciuto' }
  }
}

const OGGI = new Date().toISOString().slice(0, 10)
const SYSTEM = `Sei l'assistente di FlowCRM, un gestionale per PMI italiane. Oggi è ${OGGI}.
Rispondi in italiano, conciso e concreto.
- Per domande sui DATI (quanti, quanto, quali) usa SEMPRE i tool di query: non inventare numeri.
- Per domande su COME si fa qualcosa, usa il tool cerca_guida e rispondi basandoti sulle sezioni trovate.
- Quando l'utente CHIEDE DI CREARE un task/nota/promemoria/chiamata/email, DEVI SEMPRE chiamare il tool proponi_attivita con i dettagli (converti date relative come "domani"/"venerdì" in formato ISO YYYY-MM-DD usando la data di oggi). NON descrivere il task a parole: chiama il tool. Sarà l'utente a confermare.
- Se un tool restituisce {"errore":"non accessibile"}, conteggio 0 o nessuna sezione, dillo onestamente: non stimare né inventare.
Formatta gli importi in euro.`

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors })

  // Client Supabase autenticato COL JWT DELL'UTENTE → la RLS si applica
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  // Verifica che il JWT sia valido
  const { data: userData } = await sb.auth.getUser()
  if (!userData?.user) return new Response('Unauthorized', { status: 401, headers: cors })

  // Rate-limit per utente (backstop anti-abuso/costi). auth.uid() dal JWT.
  const { data: rl } = await sb.rpc('copilot_rate_check')
  if (rl && rl.allowed === false) {
    return new Response(JSON.stringify({ error: rl.motivo ?? 'limite raggiunto' }), {
      status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { messages } = await req.json()
  const endpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')!
  const apiKey = Deno.env.get('AZURE_OPENAI_API_KEY')!
  const model = Deno.env.get('AZURE_OPENAI_DEPLOYMENT') ?? 'gpt-4.1-mini'

  const convo: Record<string, unknown>[] = [{ role: 'system', content: SYSTEM }, ...messages]

  // ── Chiamata 1: il modello decide se serve un tool ───────────────
  const res1 = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: convo, tools: TOOLS, temperature: 0.2, max_tokens: 700 }),
  })
  if (!res1.ok) {
    // Log dettagliato solo lato server; al client un messaggio generico
    // (il testo grezzo rivelerebbe provider/endpoint).
    console.error('LLM error', res1.status, (await res1.text()).slice(0, 500))
    return new Response(JSON.stringify({ error: 'Assistente temporaneamente non disponibile' }), {
      status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  const msg1 = (await res1.json()).choices[0].message
  convo.push(msg1)

  // Se NON servono tool, il modello ha già risposto → invio diretto (1 sola chiamata)
  if (!msg1.tool_calls?.length) {
    return new Response(msg1.content ?? '', {
      headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  // ── AZIONE CON CONFERMA: se il modello propone un'attività, NON la
  // creiamo. Ritorniamo la proposta al client, che chiederà conferma.
  const propostaCall = msg1.tool_calls.find(
    (tc: { function: { name: string } }) => tc.function.name === 'proponi_attivita',
  )
  if (propostaCall) {
    const azione = JSON.parse(propostaCall.function.arguments || '{}')
    return new Response(
      JSON.stringify({ tipo: 'proposta', azione }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // Esegui i tool (in parallelo) e aggiungi i risultati
  await Promise.all(msg1.tool_calls.map(async (tc: { id: string; function: { name: string; arguments: string } }) => {
    const args = JSON.parse(tc.function.arguments || '{}')
    const risultato = await eseguiTool(tc.function.name, args, sb)
    convo.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(risultato) })
  }))

  // ── Chiamata 2: risposta finale IN STREAMING (senza altri tool) ──
  const streamRes = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: convo, temperature: 0.2, max_tokens: 700, stream: true }),
  })
  if (!streamRes.ok || !streamRes.body) {
    return new Response(JSON.stringify({ error: 'LLM stream non disponibile' }), {
      status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Trasforma l'SSE di Azure in un flusso di testo semplice (i token).
  // Pump in start(): legge tutto l'upstream e chiude in modo affidabile.
  const stream = new ReadableStream({
    async start(controller) {
      const reader = streamRes.body!.getReader()
      const decoder = new TextDecoder()
      const encoder = new TextEncoder()
      let buffer = ''
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const righe = buffer.split('\n')
          buffer = righe.pop() ?? ''
          for (const riga of righe) {
            const t = riga.trim()
            if (!t.startsWith('data:')) continue
            const payload = t.slice(5).trim()
            if (payload === '[DONE]') { controller.close(); return }
            try {
              const delta = JSON.parse(payload).choices?.[0]?.delta?.content
              if (delta) controller.enqueue(encoder.encode(delta))
            } catch { /* chunk SSE parziale: ignora */ }
          }
        }
        controller.close()
      } catch (e) {
        controller.error(e)
      }
    },
  })

  return new Response(stream, {
    headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' },
  })
})
