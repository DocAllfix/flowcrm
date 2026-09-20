// ═══════════════════════════════════════════════════════════════════
// Drenaggio della coda di posta (mail_outbox).
//
// GoTrue non spedisce più: il suo hook accoda (migrazione 20260918000004).
// Questo worker è l'unico che parla con il servizio di invio, e il suo
// fallimento non tocca mai la richiesta dell'utente.
//
// Tre regole, tutte contro-intuitive e tutte necessarie:
//
//   1. Il TENTATIVO SI INCREMENTA PRIMA DELL'INVIO (lo fa la funzione SQL
//      preleva_mail_da_inviare). Se il processo muore a metà invio, il
//      contatore è già salito: un messaggio velenoso non può bloccare la
//      coda in un ciclo infinito. È l'errore classico dell'outbox.
//   2. UN FALLIMENTO NON INTERROMPE IL LOTTO. Un destinatario che rifiuta
//      non deve fermare la posta di tutti gli altri.
//   3. Il prelievo usa FOR UPDATE SKIP LOCKED: due worker si dividono la
//      coda invece di spedire due volte.
//
// ── Limite noto, da leggere prima di configurare il relay ──────────
// Qui si invia via API HTTP (Resend), non via SMTP: le Edge Functions
// girano in Deno su runtime gestito e non aprono in modo affidabile
// connessioni TCP grezze verso una porta SMTP. Lo standard condiviso fra i
// tre prodotti prevede un relay SMTP: se si vuole quello, il drenaggio va
// spostato in un piccolo container accanto allo stack, riusando le stesse
// funzioni SQL — la coda e le sue garanzie non cambiano, cambia solo chi
// la svuota.
// ═══════════════════════════════════════════════════════════════════
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface Mail {
  id: string
  destinatario: string
  oggetto: string
  corpo_testo: string
  corpo_html: string | null
  tentativi: number
}

Deno.serve(async (req) => {
  // Stessa protezione fail-closed di cron-scadenze: l'endpoint usa il
  // service_role e legge token di recupero, quindi non è mai aperto.
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const mittente = Deno.env.get('EMAIL_FROM')
  if (!apiKey || !mittente) {
    // Senza configurazione non si consuma la coda: i messaggi restano in
    // attesa e partiranno quando il relay sarà configurato. Meglio una coda
    // che cresce di messaggi persi in silenzio.
    return new Response(
      JSON.stringify({ errore: 'invio non configurato', inviate: 0 }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { data: daInviare, error } = await supabase
    .rpc('preleva_mail_da_inviare', { quante: 20 })

  if (error) {
    return new Response(JSON.stringify({ errore: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  let inviate = 0
  let fallite = 0

  for (const mail of (daInviare ?? []) as Mail[]) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: mittente,
          to: mail.destinatario,
          subject: mail.oggetto,
          text: mail.corpo_testo,
          ...(mail.corpo_html ? { html: mail.corpo_html } : {}),
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)

      await supabase.rpc('segna_mail_inviata', { mail_id: mail.id })
      inviate++
    } catch (e) {
      // Regola 2: si registra e si prosegue. Il messaggio resta in coda e
      // sarà ritentato al giro successivo, fino a 5 tentativi.
      await supabase.rpc('segna_mail_fallita', {
        mail_id: mail.id,
        errore: e instanceof Error ? e.message : String(e),
      })
      fallite++
    }
  }

  return new Response(JSON.stringify({ inviate, fallite }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
