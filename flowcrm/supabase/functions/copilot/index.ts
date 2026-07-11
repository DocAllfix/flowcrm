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

// Tabelle leggibili e le colonne sicure che il modello può ottenere.
// La RLS del JWT utente resta la barriera (operatore: economici/HR vuoti).
const TABELLE_LEGGIBILI: Record<string, string> = {
  organizzazioni: 'id, ragione_sociale, citta, settore, telefono, email',
  contatti: 'id, nome, cognome, email, telefono, ruolo_aziendale',
  deals: 'id, nome, importo, stage:pipeline_stages(nome)',
  commesse: 'codice, descrizione, importo, stato',
  progetti: 'nome, tipo, stato, budget',
  attivita: 'titolo, tipo, stato, scadenza',
  fatture: 'numero, totale, stato, data, direzione',
  scadenze_pagamento: 'descrizione, importo, data_prevista, stato',
  scadenze_tasse: 'tipo_tassa, importo, scadenza, stato',
  dipendenti: 'nome, cognome, qualifica, tipo_contratto',
}
const TABELLE_TESTO: Record<string, string> = {
  organizzazioni: 'ragione_sociale', contatti: 'nome', deals: 'nome',
  commesse: 'descrizione', progetti: 'nome', attivita: 'titolo',
  fatture: 'numero', scadenze_pagamento: 'descrizione', scadenze_tasse: 'tipo_tassa',
  dipendenti: 'nome',
}
const TABELLE = Object.keys(TABELLE_LEGGIBILI)

// Pagine navigabili (percorso → il widget fa il redirect).
const PAGINE: Record<string, string> = {
  dashboard: '/', 'dashboard economica': '/dashboard-economica', organizzazioni: '/organizzazioni',
  contatti: '/contatti', deal: '/deal', kanban: '/kanban', attivita: '/attivita',
  calendario: '/calendario', riunioni: '/riunioni', progetti: '/progetti', commesse: '/commesse',
  team: '/team', fatture: '/fatture', incassi: '/incassi', tasse: '/tasse', personale: '/personale',
  profilo: '/profilo', utenti: '/utenti',
}

// ── Tool disponibili al modello (set chiuso, parametrico) ─────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'conta_entita',
      description: 'Conta i record di una tabella. Usa per "quanti/quante".',
      parameters: {
        type: 'object',
        properties: { tabella: { type: 'string', enum: TABELLE } },
        required: ['tabella'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'elenca_record',
      description: 'Elenca/cerca record di una tabella (per "quali/mostrami/elenca/trova"). Filtro testo opzionale (ricerca sul campo principale). Restituisce fino a 15 righe.',
      parameters: {
        type: 'object',
        properties: {
          tabella: { type: 'string', enum: TABELLE },
          cerca: { type: 'string', description: 'Testo da cercare (opzionale)' },
          limite: { type: 'number', description: 'Max righe (default 15, max 25)' },
        },
        required: ['tabella'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'panoramica',
      description: 'Numeri chiave del CRM: conteggi (organizzazioni, contatti, deal aperti, commesse, progetti) e, per admin/manager, i dati economici (fatturato anno, da incassare, scaduto, incassato nel mese, tasse in arrivo). Usa per "come vanno le cose", "quanto ho fatturato", "quanto devo incassare", "riepilogo".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deal_per_stage',
      description: 'Deal aperti raggruppati per fase, con conteggio e importo.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mie_attivita',
      description: "Le attività/task ancora da fare dell'utente corrente.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prossime_riunioni',
      description: 'Le prossime riunioni in programma (con data e ora).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scadenze_prossime',
      description: 'Scadenze fiscali e incassi in arrivo entro N giorni (default 30). Solo admin/manager.',
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
      description: 'Cerca nel manuale di FlowCRM per domande su COME si fa qualcosa.',
      parameters: {
        type: 'object',
        properties: { domanda: { type: 'string', description: "La domanda su come usare FlowCRM" } },
        required: ['domanda'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'vai_a_pagina',
      description: "Apri/porta l'utente a una pagina dell'app quando lo chiede (es. 'portami ai deal', 'apri il calendario', 'vai alle fatture').",
      parameters: {
        type: 'object',
        properties: { pagina: { type: 'string', enum: Object.keys(PAGINE) } },
        required: ['pagina'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'proponi_attivita',
      description: "Quando l'utente CHIEDE DI CREARE un task/nota/promemoria/chiamata/email, NON crearlo: proponi i dettagli con questo tool. L'utente confermerà.",
      parameters: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['task', 'chiamata', 'email', 'nota'] },
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

async function eseguiTool(name: string, args: Record<string, unknown>, sb: ReturnType<typeof createClient>, uid: string): Promise<unknown> {
  switch (name) {
    case 'conta_entita': {
      const t = String(args.tabella)
      if (!TABELLE.includes(t)) return { errore: 'tabella non valida' }
      const { count, error } = await sb.from(t).select('id', { count: 'exact', head: true })
      return error ? { errore: 'non accessibile' } : { tabella: t, conteggio: count ?? 0 }
    }
    case 'elenca_record': {
      const t = String(args.tabella)
      if (!TABELLE.includes(t)) return { errore: 'tabella non valida' }
      const limite = Math.min(Number(args.limite ?? 15) || 15, 25)
      let q = sb.from(t).select(TABELLE_LEGGIBILI[t]).limit(limite)
      const cerca = args.cerca ? String(args.cerca).trim() : ''
      if (cerca) q = q.ilike(TABELLE_TESTO[t], `%${cerca}%`)
      const { data, error } = await q
      if (error) return { errore: 'non accessibile' }
      return { tabella: t, righe: data ?? [], nota: (data?.length ?? 0) === 0 ? 'Nessun risultato (o non accessibile con i tuoi permessi).' : undefined }
    }
    case 'panoramica': {
      const [org, con, deal, comm, prog, eco] = await Promise.all([
        sb.from('organizzazioni').select('id', { count: 'exact', head: true }).eq('attivo', true),
        sb.from('contatti').select('id', { count: 'exact', head: true }).eq('attivo', true),
        sb.from('deals').select('id', { count: 'exact', head: true }).eq('attivo', true),
        sb.from('commesse').select('id', { count: 'exact', head: true }).eq('stato', 'attiva'),
        sb.from('progetti').select('id', { count: 'exact', head: true }).eq('attivo', true).neq('stato', 'completato'),
        sb.from('vw_kpi_economici').select('*').maybeSingle(),
      ])
      return {
        conteggi: {
          organizzazioni: org.count ?? 0, contatti: con.count ?? 0, deal_aperti: deal.count ?? 0,
          commesse_attive: comm.count ?? 0, progetti_attivi: prog.count ?? 0,
        },
        economici: eco.data ?? 'non accessibile (servono permessi admin/manager)',
      }
    }
    case 'mie_attivita': {
      const { data, error } = await sb.from('attivita')
        .select('titolo, tipo, stato, scadenza')
        .eq('assegnato_a', uid).eq('attivo', true).in('stato', ['da_fare', 'in_corso'])
        .order('scadenza', { nullsFirst: false }).limit(15)
      if (error) return { errore: 'non accessibile' }
      return { da_fare: data ?? [] }
    }
    case 'prossime_riunioni': {
      const oggi = new Date().toISOString()
      const { data, error } = await sb.from('attivita')
        .select('titolo, inizio, durata_minuti, luogo')
        .eq('tipo', 'riunione').eq('attivo', true).gte('inizio', oggi)
        .order('inizio').limit(8)
      if (error) return { errore: 'non accessibile' }
      return { riunioni: data ?? [] }
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
const SYSTEM = `Sei l'assistente di FlowCRM, un gestionale + controllo di gestione per PMI italiane. Oggi è ${OGGI}.
Rispondi in italiano, conciso e concreto. Usa SEMPRE i tool: non inventare numeri, nomi o procedure.

REGOLE:
- Dati (quanti/quali/mostrami): usa conta_entita, elenca_record, panoramica, deal_per_stage, mie_attivita, prossime_riunioni, scadenze_prossime.
- "Come vanno le cose", riepilogo, fatturato, quanto devo incassare/scaduto/tasse: usa panoramica.
- Come si fa qualcosa: usa cerca_guida; se il manuale non copre il tema, rispondi con la MAPPA FUNZIONI qui sotto.
- L'utente vuole aprire/andare a una pagina: usa vai_a_pagina.
- L'utente vuole creare un task/nota/promemoria: usa proponi_attivita (converti date relative in ISO YYYY-MM-DD). Sarà lui a confermare, non descriverlo a parole.
- Rispetta i PERMESSI: se un tool torna "non accessibile"/vuoto, dillo onestamente (probabile che l'utente sia operatore e non veda fatture/incassi/tasse/HR). Non stimare.
- Formatta gli importi in euro.

MAPPA FUNZIONI (dove si fa cosa):
- Organizzazioni: anagrafica clienti/fornitori/partner; scheda 360° con contatti, deal, attività, allegati, storico, fatturato annuale.
- Contatti: persone; import/export CSV; scheda dettaglio.
- Deal + Kanban: offerte per fase (drag&drop); da un deal vinto si crea la commessa.
- Attività: task/chiamate/email/riunioni/note; "Le mie attività".
- Calendario: vista mese/settimana con riunioni, attività con scadenza e scadenze economiche; si crea un evento cliccando un giorno, si sposta trascinandolo.
- Riunioni: elenco riunioni prossime/passate con luogo/orario ed export nel calendario (.ics).
- Progetti: cliente/interno; nella scheda le Milestone con barra di avanzamento.
- Commesse: codice automatico COMM-AAAA-NNNN; scheda con allegati/storico.
- Amministrazione (solo admin/manager): Registro fatture (attive/passive), Incassi previsti (anche manuali), Scadenze tasse (segna pagata).
- Dashboard: operativa (KPI + pipeline + le mie attività + prossime riunioni) e economica (fatturato, cash flow, top clienti).
- HR / Personale (solo admin/manager): anagrafica dipendenti, ferie/permessi (richiesta→approva/rifiuta), formazione.
- Ogni lista ha il menu Azioni per Modificare/Archiviare/Eliminare (elimina solo admin). Import/Export CSV su varie liste.
- Profilo: dati e cambio password. Gestione utenti (solo admin): ruoli, stato, creazione nuovi utenti.
- Ruoli: admin (tutto), manager (tutto tranne utenti/eliminazioni definitive), operatore (CRM/vendite/attività, NIENTE amministrazione né HR).`

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

  let body: { messages?: unknown }
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Richiesta non valida' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  // Validazione: messages deve essere un array; tetto sulla lunghezza dello
  // storico (anti-abuso costi). Si tengono solo gli ultimi 20 turni.
  if (!Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ error: 'Formato conversazione non valido' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  const messages = (body.messages as Record<string, unknown>[])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Nessun messaggio' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
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

  // ── NAVIGAZIONE: apri una pagina dell'app ────────────────────────
  const navCall = msg1.tool_calls.find(
    (tc: { function: { name: string } }) => tc.function.name === 'vai_a_pagina',
  )
  if (navCall) {
    const { pagina } = JSON.parse(navCall.function.arguments || '{}')
    const percorso = PAGINE[String(pagina)]
    if (percorso) {
      return new Response(
        JSON.stringify({ tipo: 'navigazione', percorso, pagina }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
  }

  // Esegui i tool (in parallelo) e aggiungi i risultati
  const uid = userData.user.id
  await Promise.all(msg1.tool_calls.map(async (tc: { id: string; function: { name: string; arguments: string } }) => {
    const args = JSON.parse(tc.function.arguments || '{}')
    const risultato = await eseguiTool(tc.function.name, args, sb, uid)
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
