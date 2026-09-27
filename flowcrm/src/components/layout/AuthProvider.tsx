import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { identificaUtente, dimenticaUtente } from '@/lib/telemetria'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile, UserRole } from '@/types/app.types'
import { DEMO_PUBBLICA, demoPubblicaAttiva } from '@/lib/demo'

// ── Tipo del Context ─────────────────────────────────────────────

export interface AuthContextValue {
  user: User | null
  userProfile: UserProfile | null
  isLoading: boolean
  isAdmin: boolean
  isManager: boolean
  /**
   * Istanza dimostrativa in sola lettura per l'utente corrente: la barriera
   * vera è il trigger `blocca_scrittura_demo()` in Postgres; questo flag serve
   * solo a UI (banner, bottoni disabilitati). Deriva da `puo_scrivere()`.
   */
  solaLettura: boolean
  /** L'istanza è una demo (interruttore `impostazioni_istanza.sola_lettura`): fa comparire la fascia. */
  istanzaDemo: boolean
  /** Account ospite della demo pubblica: prova il CRM, non cancella; i dati si ripristinano ogni notte. */
  ospiteDemo: boolean
  errorAccount: string | null
  logout: () => Promise<void>
}

// ── Creazione Context ────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null)

// ── Hook interno per consumare il context ────────────────────────
// Esportato qui per comodità — useAuth.ts fa re-export con guard

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext deve essere usato dentro <AuthProvider>')
  }
  return ctx
}

// ── Helper ruoli ─────────────────────────────────────────────────
// admin ⊂ manager: chi è admin ha anche i permessi manager.
// L'enforcement reale è nella RLS Postgres; qui solo visibilità UI.

function computeRuoli(ruolo: UserRole | undefined) {
  return {
    isAdmin: ruolo === 'admin',
    isManager: ruolo === 'admin' || ruolo === 'manager',
  }
}

// ── AuthProvider ─────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [solaLettura, setSolaLettura] = useState(false)
  const [istanzaDemo, setIstanzaDemo] = useState(false)
  const [errorAccount, setErrorAccount] = useState<string | null>(null)

  // Carica il profilo utente dopo il login.
  // Null-safe: se il profilo non esiste o l'utente è disattivato → signOut.
  const loadUserProfile = useCallback(async (authUser: User) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error || !data) {
      setErrorAccount('Profilo utente non trovato. Contatta l\'amministratore.')
      // scope LOCALE: signOut() di supabase-js è globale per impostazione, e
      // sull'account condiviso della demo pubblica butterebbe fuori tutti.
      await supabase.auth.signOut({ scope: 'local' })
      return
    }

    if (!data.attivo) {
      setErrorAccount('Account disattivato. Contatta l\'amministratore.')
      // scope LOCALE: signOut() di supabase-js è globale per impostazione, e
      // sull'account condiviso della demo pubblica butterebbe fuori tutti.
      await supabase.auth.signOut({ scope: 'local' })
      return
    }

    setUserProfile(data)
    setErrorAccount(null)

    // Sola lettura: chiediamo al DB se l'utente può scrivere (istanza demo +
    // whitelist manutentori). È solo per la UI: la barriera è nel trigger.
    try {
      const [{ data: puoScrivere }, { data: istanza }] = await Promise.all([
        supabase.rpc('puo_scrivere'),
        supabase.from('impostazioni_istanza').select('sola_lettura').maybeSingle(),
      ])
      setSolaLettura(puoScrivere === false)
      setIstanzaDemo(Boolean(istanza?.sola_lettura))
    } catch {
      setSolaLettura(false)
      setIstanzaDemo(false)
    }

    // Telemetria: identificativo OPACO, mai id o email reali. Il collettore
    // è condiviso fra più titolari del trattamento (vedi src/lib/telemetria.ts).
    await identificaUtente(authUser.id)
  }, [])

  useEffect(() => {
    // 1. Carica sessione iniziale (evita flash di redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user ?? null
      setUser(authUser)

      if (authUser) {
        loadUserProfile(authUser).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    // 2. Sottoscrizione ai cambi di stato auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const authUser = session?.user ?? null
        setUser(authUser)

        if (event === 'SIGNED_OUT') {
          setUserProfile(null)
          setSolaLettura(false)
          setIstanzaDemo(false)
          setErrorAccount(null)
          setIsLoading(false)
          dimenticaUtente()
          return
        }

        if (authUser && event === 'SIGNED_IN') {
          setIsLoading(true)
          loadUserProfile(authUser).finally(() => setIsLoading(false))
        } else if (authUser && event === 'TOKEN_REFRESHED') {
          // Refresh silenzioso: ricarico il profilo senza spinner/remount
          // (altrimenti a ogni rinnovo token la pagina lampeggia).
          void loadUserProfile(authUser)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadUserProfile])

  const logout = useCallback(async () => {
    setIsLoading(true)
    const ospite = userProfile?.ospite_demo === true
    // Esce solo QUESTO browser: sull'account condiviso della demo pubblica
    // l'uscita globale butterebbe fuori ogni altro visitatore.
    await supabase.auth.signOut({ scope: 'local' })
    // Il visitatore della demo pubblica che esce torna al sito: altrimenti il
    // rientro automatico lo riporterebbe dentro subito.
    if (ospite && demoPubblicaAttiva()) window.location.assign(DEMO_PUBBLICA.sito)
    // onAuthStateChange gestirà il reset dello stato
  }, [userProfile])

  const { isAdmin, isManager } = computeRuoli(userProfile?.ruolo)

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        isAdmin,
        isManager,
        solaLettura,
        istanzaDemo,
        ospiteDemo: userProfile?.ospite_demo === true,
        errorAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
