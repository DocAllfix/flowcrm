// ═══════════════════════════════════════════════════════════════════
// Creazione utente da parte di un ADMIN (il signup pubblico è disabilitato).
// Sicurezza: il chiamante deve essere admin (verificato col SUO JWT via
// get_user_role); l'utente viene creato con la service_role key, mai esposta
// al client. Il trigger handle_new_user crea il profilo; qui si rifiniscono
// nome/cognome/ruolo.
// ═══════════════════════════════════════════════════════════════════
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = (Deno.env.get('COPILOT_ALLOWED_ORIGINS') ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean)
function corsHeaders(origin: string | null): Record<string, string> {
  let allow = '*'
  if (ALLOWED_ORIGINS.length > 0) allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

const RUOLI = ['admin', 'manager', 'operatore']

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Non autorizzato' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Non autorizzato' }, 401)

  // Il chiamante DEVE essere admin (verifica lato DB, non fidarsi del client)
  const { data: ruoloChiamante } = await userClient.rpc('get_user_role')
  if (ruoloChiamante !== 'admin') return json({ error: 'Riservato agli amministratori' }, 403)

  let payload: { email?: string; password?: string; nome?: string; cognome?: string; ruolo?: string }
  try { payload = await req.json() } catch { return json({ error: 'Richiesta non valida' }, 400) }
  const email = (payload.email ?? '').trim().toLowerCase()
  const password = payload.password ?? ''
  const nome = (payload.nome ?? '').trim()
  const cognome = (payload.cognome ?? '').trim()
  const ruolo = payload.ruolo ?? ''

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Email non valida' }, 400)
  if (password.length < 8) return json({ error: 'La password deve avere almeno 8 caratteri' }, 400)
  if (!nome) return json({ error: 'Il nome è obbligatorio' }, 400)
  if (!RUOLI.includes(ruolo)) return json({ error: 'Ruolo non valido' }, 400)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { ruolo, nome, cognome },
  })
  if (error || !created?.user) {
    console.error('createUser error', error?.message)
    const msg = error?.message?.includes('already') ? 'Esiste già un utente con questa email' : 'Impossibile creare l\'utente'
    return json({ error: msg }, 400)
  }
  // Rifinisce il profilo (il trigger l'ha già creato)
  await admin.from('user_profiles')
    .update({ nome, cognome: cognome || null, ruolo })
    .eq('id', created.user.id)

  return json({ id: created.user.id, email })
})
