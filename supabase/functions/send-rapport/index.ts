// Edge Function: send helserapport (HTML-kropp + CSV-vedlegg) på e-post via Resend.
// Krever innlogget bruker. Secrets: RESEND_API_KEY (påkrevd), RAPPORT_FRA (valgfri).
import { CORS, feil } from '../_shared/cors.ts'
import { kreverInnlogging } from '../_shared/auth.ts'

function base64(tekst: string): string {
  const bytes = new TextEncoder().encode(tekst)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return feil('Kun POST', 405)

  const uautorisert = await kreverInnlogging(req)
  if (uautorisert) return uautorisert

  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return feil('E-postsending er ikke konfigurert (RESEND_API_KEY mangler).', 500)

  let body: { epost?: string; emne?: string; html?: string; csv?: string; filnavn?: string }
  try {
    body = await req.json()
  } catch {
    return feil('Ugyldig forespørsel.', 400)
  }

  const { epost, emne, html, csv, filnavn } = body
  if (!epost || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(epost)) return feil('Ugyldig e-postadresse.', 400)
  if (!html) return feil('Mangler rapportinnhold.', 400)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('RAPPORT_FRA') ?? 'Helsetracker <onboarding@resend.dev>',
      to: [epost],
      subject: emne ?? 'Helserapport',
      html,
      attachments: csv
        ? [{ filename: filnavn ?? 'helserapport.csv', content: base64(csv) }]
        : [],
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    return feil(`E-posttjenesten svarte med feil: ${t.slice(0, 200)}`, 502)
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
