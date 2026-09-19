/**
 * Richiesta di recupero password.
 *
 * La mail NON parte da qui e nemmeno da GoTrue: l'hook `send_email_hook`
 * la ACCODA in `mail_outbox` e un worker la drena (migrazione
 * 20260918000004). È la ragione per cui questa pagina può rispondere
 * "fatto" anche con il relay di posta irraggiungibile — altrimenti un
 * timeout SMTP lascerebbe l'utente chiuso fuori proprio mentre tenta
 * l'unica strada che ha per rientrare.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { APP_CONFIG } from '@/config/app.config'
import { MarchioCliente } from '@/components/layout/MarchioCliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RecuperoPasswordPage() {
  const [email, setEmail] = useState('')
  const [inviata, setInviata] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/recupero`,
    })

    // Si conferma SEMPRE, anche se l'indirizzo non esiste: rispondere in modo
    // diverso trasformerebbe questa pagina in un modo per scoprire quali
    // email hanno un account sull'istanza del cliente.
    if (err && !/rate|limit/i.test(err.message)) {
      setInviata(true)
    } else if (err) {
      setError('Troppe richieste. Riprova fra qualche minuto.')
    } else {
      setInviata(true)
    }
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <MarchioCliente dimensione="lg" />
          <h1 className="text-2xl font-bold text-foreground">{APP_CONFIG.appName}</h1>
        </div>

        {inviata ? (
          <div
            className="space-y-4 rounded-xl border border-border bg-card p-6 text-center shadow-sm"
            data-testid="recupero-inviato"
          >
            <MailCheck className="mx-auto h-10 w-10 text-primary" />
            <p className="text-sm text-foreground">
              Se esiste un account con questo indirizzo, riceverai un messaggio
              con il collegamento per reimpostare la password.
            </p>
            <p className="text-sm text-muted-foreground">
              Il collegamento vale un'ora. Controlla anche la posta indesiderata.
            </p>
            <Link to="/login" className="inline-block text-sm font-medium text-primary hover:underline">
              Torna all'accesso
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Indirizzo email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="recupero-email"
              />
              <p className="text-sm text-muted-foreground">
                Ti invieremo un collegamento per impostare una nuova password.
              </p>
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitting} data-testid="recupero-submit">
              {submitting ? 'Invio in corso…' : 'Invia il collegamento'}
            </Button>

            <Link to="/login" className="block text-center text-sm text-muted-foreground hover:underline">
              Torna all'accesso
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
