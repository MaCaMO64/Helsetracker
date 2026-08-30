import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { erSupabaseKonfigurert, supabase } from './supabaseClient'

interface AuthVerdi {
  /** Er Supabase satt opp (env-variabler)? Ellers kan appen ikke logge inn. */
  konfigurert: boolean
  laster: boolean
  session: Session | null
  bruker: User | null
  /** Send magic link til e-post. */
  loggInn: (epost: string) => Promise<{ error?: string }>
  loggUt: () => Promise<void>
}

const AuthContext = createContext<AuthVerdi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [laster, setLaster] = useState(erSupabaseKonfigurert)

  useEffect(() => {
    if (!supabase) {
      setLaster(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLaster(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  async function loggInn(epost: string): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Innlogging er ikke satt opp (Supabase mangler).' }
    const { error } = await supabase.auth.signInWithOtp({
      email: epost,
      options: { emailRedirectTo: window.location.origin },
    })
    return error ? { error: error.message } : {}
  }

  async function loggUt(): Promise<void> {
    await supabase?.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        konfigurert: erSupabaseKonfigurert,
        laster,
        session,
        bruker: session?.user ?? null,
        loggInn,
        loggUt,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthVerdi {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth må brukes innenfor <AuthProvider>')
  return ctx
}
