// Edge Function: tolk blodprøve-bilde(r) med en vision-modell og returner
// strukturerte verdier. Krever innlogging + husstandens/brukerens EGEN
// AI-nøkkel (BYO) sendt i body – vertens nøkkel er ikke fallback.
import { CORS, feil } from '../_shared/cors.ts'
import { kreverInnlogging } from '../_shared/auth.ts'

const MODELL = Deno.env.get('OPENROUTER_MODEL') ?? 'google/gemini-2.5-flash'

const SYSTEM = `Du leser norske blodprøvesvar (Fürst/Helsenorge) fra bilder.
Returner KUN gyldig JSON på formen:
{"dato":"YYYY-MM-DD eller null","verdier":[{"analyse":"S-TSH","verdi":2.3,"enhet":"mIE/L","ref_lav":0.27,"ref_hoy":4.2}]}
Regler: bruk punktum som desimaltegn. Utelat felt du ikke finner (bruk null).
Ikke finn på verdier. Ta med alle analyser du ser (ikke bare stoffskifte).`

function balansertJson(tekst: string): string {
  const start = tekst.indexOf('{')
  if (start < 0) return tekst
  let dybde = 0
  for (let i = start; i < tekst.length; i++) {
    if (tekst[i] === '{') dybde++
    else if (tekst[i] === '}') {
      dybde--
      if (dybde === 0) return tekst.slice(start, i + 1)
    }
  }
  return tekst.slice(start)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return feil('Kun POST', 405)

  const uautorisert = await kreverInnlogging(req)
  if (uautorisert) return uautorisert

  let body: { images?: string[]; nokkel?: string }
  try {
    body = await req.json()
  } catch {
    return feil('Ugyldig forespørsel.', 400)
  }
  const { images, nokkel } = body
  if (!nokkel) return feil('Mangler AI-nøkkel.', 400)
  if (!Array.isArray(images) || images.length === 0) return feil('Mangler bilde.', 400)

  const innhold = [
    { type: 'text', text: 'Les av blodprøveverdiene i bildet/bildene.' },
    ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
  ]

  let svar: Response
  try {
    svar = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${nokkel}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELL,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: innhold },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
    })
  } catch (e) {
    return feil(`Klarte ikke å nå AI-leverandøren: ${(e as Error).message}`, 502)
  }

  if (!svar.ok) {
    const t = await svar.text()
    return feil(`AI-leverandøren svarte med feil: ${t.slice(0, 200)}`, 502)
  }

  const data = await svar.json()
  const raa = data?.choices?.[0]?.message?.content ?? ''
  let parsed: unknown
  try {
    parsed = JSON.parse(balansertJson(raa))
  } catch {
    return feil('Klarte ikke å tolke svaret fra AI-en.', 502)
  }

  return new Response(JSON.stringify(parsed), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
