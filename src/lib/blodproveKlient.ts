import { hentAuthToken } from './supabaseClient'
import { hentAiNokkel } from './aiNokkel'
import { kanoniser, type LabUttrekk } from './blodprove'

/** Send blodprøve-bilde(r) til AI-tolkning via Edge Function. Krever egen
 *  AI-nøkkel (BYO) og eksplisitt brukersamtykke i UI før dette kalles. */
export async function lesBlodproveBilde(
  bilder: string[],
): Promise<{ dato: string | null; verdier: LabUttrekk[] }> {
  const base = import.meta.env.VITE_FUNCTIONS_URL as string | undefined
  if (!base) throw new Error('AI-import er ikke satt opp (VITE_FUNCTIONS_URL mangler).')
  const nokkel = hentAiNokkel()
  if (!nokkel) throw new Error('Mangler AI-nøkkel – legg den inn i Innstillinger → Bildeimport.')

  const token = await hentAuthToken()
  const r = await fetch(`${base}/parse-blodprove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ images: bilder, nokkel }),
  })
  if (!r.ok) {
    const t = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(t.error ?? `AI-tolkning feilet (${r.status})`)
  }
  const data = (await r.json()) as { dato?: string | null; verdier?: LabUttrekk[] }
  const verdier = (data.verdier ?? []).map((v) => ({
    ...v,
    analyse_kanon: v.analyse_kanon ?? kanoniser(v.analyse),
  }))
  return { dato: data.dato ?? null, verdier }
}
