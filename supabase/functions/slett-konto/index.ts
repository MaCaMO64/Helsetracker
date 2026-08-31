// Edge Function: slett innlogget brukers konto permanent. Kaskade (FK on delete
// cascade) fjerner all data. SUPABASE_SERVICE_ROLE_KEY er auto-tilgjengelig i
// Supabase Edge Functions.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS, feil } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return feil('Kun POST', 405)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return feil('Ikke innlogget.', 401)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Verifiser hvem som ringer.
  const { data, error } = await createClient(url, anon).auth.getUser(token)
  if (error || !data.user) return feil('Innloggingen er utløpt – logg inn på nytt.', 401)

  // Slett brukeren med admin-rettigheter (kaskade fjerner alle rader).
  const admin = createClient(url, service)
  const { error: slettFeil } = await admin.auth.admin.deleteUser(data.user.id)
  if (slettFeil) return feil(`Klarte ikke å slette kontoen: ${slettFeil.message}`, 500)

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
