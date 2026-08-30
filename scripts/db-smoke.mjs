// Datalag-røyktest: pinger alle tabeller/kolonner via REST med anon-nøkkelen.
// Bekrefter at hver tabell (og en nøkkelkolonne) finnes OG at RLS blokkerer
// uinnlogget lesing (forventet svar: HTTP 200 med tom liste []).
//
// Kjør:  node scripts/db-smoke.mjs        (leser .env.local)
//        npm run smoke

import { readFileSync } from 'node:fs'

function lesEnv() {
  const env = {}
  try {
    const tekst = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const linje of tekst.split(/\r?\n/)) {
      const m = linje.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m) env[m[1]] = m[2]
    }
  } catch {
    /* ingen .env.local */
  }
  return env
}

const env = lesEnv()
const BASE = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY
if (!BASE || !KEY) {
  console.error('Mangler VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY i .env.local')
  process.exit(2)
}

// tabell → en kolonne som må finnes (fanger f.eks. glemte migrasjoner)
const SJEKK = {
  medications: 'doser_per_dag',
  medication_doses: 'tidspunkt',
  symptoms: 'kategori',
  symptom_entries: 'verdi',
  events: 'type',
  garmin_daily: 'hvilepuls',
  garmin_sync_log: 'status',
  lab_results: 'analyse',
}

let feil = 0
for (const [tabell, kol] of Object.entries(SJEKK)) {
  try {
    const r = await fetch(`${BASE}/rest/v1/${tabell}?select=${kol}&limit=1`, {
      headers: { apikey: KEY },
    })
    const body = (await r.text()).trim()
    const ok = r.status === 200 && body === '[]'
    if (!ok) feil++
    console.log(`${ok ? 'OK  ' : 'FEIL'} ${tabell}.${kol} → HTTP ${r.status} ${body.slice(0, 80)}`)
  } catch (e) {
    feil++
    console.log(`FEIL ${tabell}.${kol} → ${e.message}`)
  }
}

console.log(
  feil === 0
    ? '\n✓ Alt OK: alle tabeller/kolonner finnes og RLS blokkerer anon-lesing.'
    : `\n✗ ${feil} problem(er) – sjekk at supabase/setup.sql er kjørt.`,
)
process.exit(feil === 0 ? 0 : 1)
