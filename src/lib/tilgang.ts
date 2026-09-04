// Tilgangsliste for appen. Alt som starter med VITE_ bakes inn i JavaScript-koden
// og er dermed offentlig lesbart – derfor lagres tillatte e-poster som
// SHA-256-hasher (VITE_TILLATT_EPOST_HASH), ikke i klartekst.
//
// Klartekst-varianten (VITE_TILLATT_EPOST) støttes fortsatt for lokal utvikling
// og bakoverkompatibilitet, men bør ikke brukes i produksjon.
//
// Merk: dette er et ekstra lag. Den autoritative sperren er å skru av ny
// registrering i Supabase (Authentication → Sign In / Providers → Email).

function liste(raa: string | undefined): string[] {
  return (raa ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

const HASHER = liste(import.meta.env.VITE_TILLATT_EPOST_HASH as string | undefined)
const KLARTEKST = liste(import.meta.env.VITE_TILLATT_EPOST as string | undefined)

export function normaliserEpost(epost?: string | null): string {
  return (epost ?? '').trim().toLowerCase()
}

/** SHA-256 (hex) av normalisert e-post. Krever secure context (https/localhost). */
export async function hashEpost(epost: string): Promise<string> {
  const data = new TextEncoder().encode(normaliserEpost(epost))
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Ren sjekk mot gitte lister – skilt ut for å kunne testes uten env. */
export async function sjekkTilgang(
  epost: string | null | undefined,
  hasher: string[],
  klartekst: string[],
): Promise<boolean> {
  // Ingen lister satt = ingen lås (f.eks. lokal utvikling).
  if (hasher.length === 0 && klartekst.length === 0) return true
  const n = normaliserEpost(epost)
  if (!n) return false
  if (klartekst.includes(n)) return true
  if (hasher.length === 0) return false
  try {
    return hasher.includes(await hashEpost(n))
  } catch {
    // Feiler hashing (usikker kontekst), nekter vi heller enn å slippe inn.
    return false
  }
}

export function erTillatt(epost?: string | null): Promise<boolean> {
  return sjekkTilgang(epost, HASHER, KLARTEKST)
}
