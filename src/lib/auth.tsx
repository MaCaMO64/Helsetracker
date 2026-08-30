import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { erSupabaseKonfigurert, supabase } from './supabaseClient'

// Valgfri allowlist: kommaseparerte e-poster i VITE_TILLATT_EPOST. Er den satt,
// logges alle andre ut umiddelbart etter innlogging (forsvar i dybden på toppen
// av at offentlig signup bør være AV i Supabase). Tom = slipp inn alle som klarer
// å registrere seg (stol da på Supabase-innstillingen alene).
const TILLATTE = ((import.meta.env.VITE_TILLATT_EPOST as string | undefined) ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

function epostTillatt(epost?: string | null): boolean {
  if (TILLATTE.length === 0) return true
  return !!epost && TILLATTE.includes(epost.toLowerCase())
}

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
    // Godta kun sesjoner med tillatt e-post; ellers logg ut.
    const godta = (s: Session | null) => {
      if (s && !epostTillatt(s.user.email)) {
        setAvvist(true)
        setSession(null)
        void supabase!.auth.signOut()
        return
      }
      setAvvist(false)
      setSession(s)
    }
    supabase.auth.getSession().then(({ data }) => {
      godta(data.session)
      setLaster(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => godta(s))
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
