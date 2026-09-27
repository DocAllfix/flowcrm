import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DEMO_PUBBLICA } from '@/lib/demo'
import { MarchioCliente } from '@/components/layout/MarchioCliente'
import { Spinner } from '@/components/ui/spinner'

/**
 * Ingresso con un clic nella demo pubblica: la landing porta qui con «Entra nella
 * demo», si apre la sessione dell'ospite e si va al cruscotto, dove il giro guidato
 * parte da solo (le chiavi del tour non sono salvate in questo browser).
 *
 * La rotta esiste solo se l'istanza ha le credenziali dell'ospite (vedi App.tsx e
 * `lib/demo.ts`): su un'istanza cliente `/demo` è una pagina non trovata.
 */
export function DemoPubblicaPage() {
  const { user, isLoading } = useAuth()
  const [errore, setErrore] = useState(false)
  // In sviluppo React esegue gli effetti due volte: un solo tentativo di accesso.
  const avviato = useRef(false)

  useEffect(() => {
    if (isLoading || user || avviato.current) return
    avviato.current = true
    supabase.auth
      .signInWithPassword({ email: DEMO_PUBBLICA.email, password: DEMO_PUBBLICA.password })
      .then(({ error }) => {
        if (error) setErrore(true)
        // Con successo, onAuthStateChange carica il profilo e questa pagina
        // si ridisegna con `user` presente: il redirect sotto fa il resto.
      })
  }, [isLoading, user])

  if (!isLoading && user) return <Navigate to="/" replace />

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <MarchioCliente dimensione="lg" />
        </div>
        {errore ? (
          <div role="alert" className="space-y-4">
            <h1 className="text-lg font-semibold text-foreground">La demo non è raggiungibile in questo momento</h1>
            <p className="text-sm text-muted-foreground">Riprova fra qualche minuto.</p>
            <a href={DEMO_PUBBLICA.sito} className="inline-block text-sm font-medium text-primary-testo hover:underline">
              Torna al sito
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4" role="status">
            {/* Decorativo: l'annuncio lo dà già il testo qui sotto, dentro role="status". */}
            <Spinner dimensione="lg" className="text-primary-testo" />
            <p className="text-sm text-muted-foreground">Apertura della demo…</p>
          </div>
        )}
      </div>
    </main>
  )
}
