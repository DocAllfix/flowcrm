/**
 * Impostazione della nuova password, dopo il collegamento ricevuto per email.
 *
 * Ci si arriva con una sessione di RECUPERO: GoTrue verifica il token e
 * reindirizza qui con la sessione nel frammento dell'URL, che il client
 * raccoglie perché `detectSessionInUrl: true` (src/lib/supabase.ts).
 *
 * Senza quella sessione la pagina non mostra il modulo: non è un dettaglio
 * di comodità, è ciò che impedisce a chiunque di aprire questo indirizzo e
 * cambiare una password.
 */
import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { APP_CONFIG } from '@/config/app.config'
import { MarchioCliente } from '@/components/layout/MarchioCliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

const LUNGHEZZA_MINIMA = 12

export function NuovaPasswordPage() {
  const navigate = useNavigate()
  const [pronta, setPronta] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // `detectSessionInUrl` lavora in modo asincrono all'avvio: si attende
    // l'evento invece di leggere subito la sessione, che altrimenti sarebbe
    // ancora vuota e mostrerebbe "collegamento non valido" a chi ne ha uno
    // perfettamente valido.
    let vivo = true
    supabase.auth.getSession().then(({ data }) => {
      if (vivo && data.session) setPronta(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evento, sessione) => {
      if (!vivo) return
      if (evento === 'PASSWORD_RECOVERY' || sessione) setPronta(true)
      else if (evento === 'INITIAL_SESSION') setPronta(false)
    })
    const scadenza = setTimeout(() => vivo && setPronta((p) => p ?? false), 3000)
    return () => {
      vivo = false
      clearTimeout(scadenza)
      sub.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < LUNGHEZZA_MINIMA) {
      setError(`La password deve avere almeno ${LUNGHEZZA_MINIMA} caratteri.`)
      return
    }
    if (password !== conferma) {
      setError('Le due password non coincidono.')
      return
    }

    setSubmitting(true)
    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(
        /same|different/i.test(err.message)
          ? 'La nuova password deve essere diversa dalla precedente.'
          : 'Non è stato possibile aggiornare la password. Il collegamento potrebbe essere scaduto.'
      )
      setSubmitting(false)
      return
    }

    // Si chiude la sessione di recupero e si torna all'accesso: l'utente deve
    // provare la password nuova adesso, non scoprire domani che non la ricorda.
    await supabase.auth.signOut()
    navigate('/login', { replace: true, state: { errorAccount: 'Password aggiornata. Accedi con la nuova password.' } })
  }

  const cornice = (contenuto: React.ReactNode) => (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <MarchioCliente dimensione="lg" />
          <h1 className="text-headline text-foreground">{APP_CONFIG.appName}</h1>
        </div>
        {contenuto}
      </div>
    </div>
  )

  if (pronta === null) {
    return cornice(
      <p className="text-center text-sm text-muted-foreground">Verifica del collegamento…</p>
    )
  }

  if (pronta === false) {
    return cornice(
      <Card className="space-y-4 p-6 text-center">
        <p className="text-sm text-foreground">
          Collegamento non valido o scaduto.
        </p>
        <Link to="/recupero" className="inline-block text-sm font-medium text-primary hover:underline">
          Richiedine uno nuovo
        </Link>
      </Card>
    )
  }

  return cornice(
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Scegli una nuova password
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Nuova password</Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="nuova-password"
        />
        <p className="text-sm text-muted-foreground">Almeno {LUNGHEZZA_MINIMA} caratteri.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="conferma">Ripeti la password</Label>
        <Input
          id="conferma"
          type="password"
          required
          autoComplete="new-password"
          value={conferma}
          onChange={(e) => setConferma(e.target.value)}
          data-testid="nuova-password-conferma"
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={submitting} data-testid="nuova-password-submit">
        {submitting ? 'Aggiornamento…' : 'Imposta la password'}
      </Button>
    </form>
  )
}
