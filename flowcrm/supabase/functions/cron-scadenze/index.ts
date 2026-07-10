// ═══════════════════════════════════════════════════════════════════
// F10 — Edge Function cron-scadenze
// Esegue processa_scadenze() (stati + notifiche in-app) e, se configurata
// la chiave Resend, invia un'email di riepilogo agli admin/manager.
// DEGRADA con grazia: senza RESEND_API_KEY fa solo le notifiche in-app.
// ═══════════════════════════════════════════════════════════════════
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Protezione fail-closed: senza CRON_SECRET configurato, o con header
  // errato, si nega. L'endpoint usa il service_role → mai aperto.
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1. Aggiorna stati + crea notifiche in-app (idempotente)
  const { data: nCreate, error } = await supabase.rpc('processa_scadenze')
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Email di riepilogo (solo se configurata la chiave Resend)
  let emailInviate = 0
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const emailFrom = Deno.env.get('EMAIL_FROM') // es. "FlowCRM <noreply@tuodominio.it>"

  if (resendKey && emailFrom && (nCreate ?? 0) > 0) {
    // Notifiche non lette di oggi per admin/manager → email di digest
    const { data: profili } = await supabase
      .from('user_profiles')
      .select('id')
      .in('ruolo', ['admin', 'manager'])
      .eq('attivo', true)

    for (const p of profili ?? []) {
      const { data: authUser } = await supabase.auth.admin.getUserById(p.id)
      const email = authUser?.user?.email
      if (!email) continue

      const { count } = await supabase
        .from('notifiche')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', p.id)
        .eq('letta', false)
      if (!count) continue

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: emailFrom,
            to: email,
            subject: `FlowCRM — ${count} scadenze da controllare`,
            html: `<p>Hai <strong>${count}</strong> notifiche non lette su scadenze e incassi.</p>
                   <p>Accedi a FlowCRM per i dettagli.</p>`,
          }),
        })
        // Un fallimento email NON deve bloccare il resto (le notifiche in-app ci sono già)
        if (res.ok) emailInviate++
      } catch (_) { /* ignora: degradazione graziosa */ }
    }
  }

  return new Response(
    JSON.stringify({ notifiche_create: nCreate, email_inviate: emailInviate }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
