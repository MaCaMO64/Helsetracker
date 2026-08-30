// Offline-kø («utboks») for daglig logging. Online-først: vi skriver rett til
// Supabase, men hvis enheten er uten nett (eller kallet feiler med nettverksfeil)
// legges skrivingen i en localStorage-kø og sendes når nettet er tilbake.
//
// Kun de to daglige loggeskrivingene køes (dose + symptomverdi). Alt køes som en
// idempotent upsert, så «flush» kan trygt kjøres flere ganger.

export type KoTabell = 'medication_doses' | 'symptom_entries'

export interface KoElement {
  id: string
  tabell: KoTabell
  konflikt: string // onConflict-kolonner for upsert
  rad: Record<string, unknown>
  opprettet: string
}

const NOKKEL = 'helsetracker:utboks:v1'

export function hentKo(): KoElement[] {
  try {
    const raw = localStorage.getItem(NOKKEL)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as KoElement[]) : []
  } catch {
    return []
  }
}

function lagreKo(ko: KoElement[]): void {
  try {
    localStorage.setItem(NOKKEL, JSON.stringify(ko))
  } catch {
    // Ignorer lagringsfeil (full disk / privat modus).
  }
}

export function leggIKo(el: KoElement): void {
  lagreKo([...hentKo(), el])
}

export function fjernFraKo(id: string): void {
  lagreKo(hentKo().filter((e) => e.id !== id))
}

export function tomKo(): void {
  lagreKo([])
}

/** Ser en feil ut som en midlertidig nettverksfeil (verdt å prøve igjen)? */
export function erNettverksfeil(e: unknown): boolean {
  const m = (e as { message?: string } | null)?.message?.toLowerCase() ?? ''
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network error') ||
    m.includes('load failed') ||
    m.includes('fetch failed') ||
    m.includes('timeout')
  )
}

// Minimal klient-form flush trenger (lett å mocke i tester).
interface UpsertKlient {
  from(tabell: string): {
    upsert(
      rad: Record<string, unknown>,
      opts: { onConflict: string },
    ): PromiseLike<{ error: unknown }>
  }
}

/**
 * Send køede skrivinger. Stopper ved første vedvarende nettverksfeil (beholder
 * resten til neste forsøk). Andre feil (f.eks. validering) dropper elementet for
 * å unngå en evig loop. Returnerer hvor mange som ble sendt og hvor mange som står igjen.
 */
export async function flushKo(klient: UpsertKlient): Promise<{ sendt: number; gjenstar: number }> {
  let sendt = 0
  for (const el of hentKo()) {
    try {
      const { error } = await klient
        .from(el.tabell)
        .upsert(el.rad, { onConflict: el.konflikt })
      if (error && erNettverksfeil(error)) break // fortsatt nede → prøv igjen senere
      // Ellers: enten OK, eller en ekte feil vi ikke kan løse ved retry → fjern.
    } catch (e) {
      if (erNettverksfeil(e)) break
      // ukjent kastet feil → dropp elementet (fall through til fjern)
    }
    fjernFraKo(el.id)
    sendt++
  }
  return { sendt, gjenstar: hentKo().length }
}
