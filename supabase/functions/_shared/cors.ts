export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function feil(melding: string, status: number): Response {
  return new Response(JSON.stringify({ error: melding }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
