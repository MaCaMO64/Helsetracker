// Krever en gyldig innlogget Supabase-bruker (Authorization: Bearer <token>).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { feil } from './cors.ts'

/** Returnerer null hvis gyldig innlogget bruker, ellers en 401-Response. */
export async function kreverInnlogging(req: Request): Promise<Response | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return feil('Ikke innlogget – åpne appen og logg inn først.', 401)
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return feil('Innloggingen er utløpt – logg inn på nytt.', 401)
    return null
  } catch {
    return feil('Klarte ikke å verifisere innloggingen.', 401)
  }
}
