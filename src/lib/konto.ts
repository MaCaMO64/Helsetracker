// Datamyndighet (GDPR): eksporter alt, slett alle data, eller slett hele kontoen.
import { hentAuthToken, supabase } from './supabaseClient'

const TABELLER = [
  'medications',
  'medication_doses',
  'symptoms',
  'symptom_entries',
  'events',
  'garmin_daily',
  'garmin_sync_log',
  'lab_results',
  'report_shares',
] as const

function klient() {
  if (!supabase) throw new Error('Supabase er ikke konfigurert')
  return supabase
}

/** Hent alle radene brukeren eier, tabell for tabell (RLS gir kun egne). */
export async function eksporterAlt(): Promise<Record<string, unknown[]>> {
  const ut: Record<string, unknown[]> = {}
  for (const t of TABELLER) {
    const { data, error } = await klient().from(t).select('*')
    if (error) throw error
    ut[t] = data ?? []
  }
  return ut
}

/** Slett alle brukerens data (beholder selve kontoen). */
export async function slettAlleData(): Promise<void> {
  for (const t of TABELLER) {
    const { error } = await klient().from(t).delete().not('user_id', 'is', null)
    if (error) throw error
  }
}

/** Slett hele kontoen (auth-bruker) via Edge Function – kaskade fjerner all data. */
export async function slettKonto(): Promise<{ error?: string }> {
  const base = import.meta.env.VITE_FUNCTIONS_URL as string | undefined
  if (!base)
    return { error: 'Kontosletting krever Edge Function (deploy slett-konto) – VITE_FUNCTIONS_URL mangler.' }
  try {
    const token = await hentAuthToken()
    const r = await fetch(`${base}/slett-konto`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!r.ok) {
      const t = (await r.json().catch(() => ({}))) as { error?: string }
      return { error: t.error ?? `Feil (${r.status})` }
    }
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

/** Last ned et objekt som JSON-fil. */
export function lastNedJson(obj: unknown, filnavn: string): void {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filnavn
  a.click()
  URL.revokeObjectURL(url)
}
