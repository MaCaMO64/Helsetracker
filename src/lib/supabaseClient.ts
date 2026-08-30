import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Konfigureres via .env.local. Uten disse kan ikke appen logge inn / lagre.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const erSupabaseKonfigurert = Boolean(url && anon)

export const supabase: SupabaseClient | null = erSupabaseKonfigurert
  ? createClient(url!, anon!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

/** Authorization-token for Edge Function-kall: brukerens sesjon hvis innlogget,
 *  ellers anon-nøkkelen. */
export async function hentAuthToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? anon ?? null
}
