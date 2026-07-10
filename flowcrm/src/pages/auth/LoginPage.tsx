import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { APP_CONFIG } from '@/config/app.config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(
    (location.state as { errorAccount?: string } | null)?.errorAccount ?? null
  )

  if (!isLoading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Email o password non validi.'
          : 'Errore di accesso. Riprova tra qualche istante.'
      )
      setSubmitting(false)
    }
    // In caso di successo AuthProvider aggiorna lo stato e il Navigate sopra reindirizza
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-600 shadow-lg shadow-primary/25">
            <Zap className="h-7 w-7 text-white" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {APP_CONFIG.appName}
          </h1>
          {APP_CONFIG.clienteName && (
            <p className="text-sm text-muted-foreground">{APP_CONFIG.clienteName}</p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting}
            data-testid="login-submit"
          >
            {submitting ? 'Accesso in corso…' : 'Accedi'}
          </Button>
        </form>
      </div>
    </div>
  )
}
