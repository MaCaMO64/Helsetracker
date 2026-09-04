import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { erSupabaseKonfigurert, supabase } from './supabaseClient'
import { erTillatt } from './tilgang'

interface AuthVerdi {
  konfigurert: boolean
  laster: boolean
  session: Session | null
  bruker: User | null
  /** Satt hvis innlogget e-post ikke står på allowlisten (ble logget ut). */
  avvist: boolean
  loggInn: (epost: string) => Promise<{ error?: string }>
  loggUt: () => Promise<void>
}

const AuthContext = createContext<AuthVerdi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [laster, setLaster] = useState(erSupabaseKonfigurert)
  const [avvist, setAvvist] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setLaster(false)
      return
    }
    // Godta kun sesjoner med tillatt e-post; ellers logg ut. Sjekken er asynkron
    // fordi tilgangslista sammenlignes med SHA-256-hasher (se tilgang.ts).
    let avbrutt = false
    const godta = async (s: Session | null) => {
      if (s && !(await erTillatt(s.user.email))) {
        if (avbrutt) return
        setAvvist(true)
        setSession(null)
        void supabase!.auth.signOut()
        return
      }
      if (avbrutt) return
      setAvvist(false)
      setSession(s)
    }
    supabase.auth.getSession().then(async ({ data }) => {
      await godta(data.session)
      if (!avbrutt) setLaster(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => void godta(s))
    return () => {
      avbrutt = true
      data.subscription.unsubscribe()
    }
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
    setAvvist(false)
    await supabase?.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        konfigurert: erSupabaseKonfigurert,
        laster,
        session,
        bruker: session?.user ?? null,
        avvist,
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
