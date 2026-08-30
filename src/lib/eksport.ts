// Eksport til lege: CSV (rådata) + en ryddig rapport (HTML → utskrift/PDF), og
// klientfunksjoner for nedlasting og e-postsending. Rapporten er i plainspråk,
// på linje med analysen ellers.

import type { Dose, GarminDag, Medisin, Symptom, SymptomOppforing } from './types'
import { dagerMellom, formaterDatoKort, leggTilDager } from './dates'
import { doseSumPerDag, finnDoseendringer, foerEtter, garminSerie, type Serie } from './analyse'
import { hentAuthToken } from './supabaseClient'

export interface EksportData {
  fra: string
  til: string
  generert: string // f.eks. new Date().toLocaleString('nb-NO') – sendes inn for testbarhet
  bruker?: string
  medisiner: Medisin[]
  symptomer: Symptom[]
  doser: Dose[]
  oppforinger: SymptomOppforing[]
  garmin: GarminDag[]
}

const GARMIN_KOL: { felt: keyof GarminDag; label: string }[] = [
  { felt: 'hvilepuls', label: 'Hvilepuls' },
  { felt: 'hrv', label: 'HRV' },
  { felt: 'sovn_score', label: 'Søvnscore' },
  { felt: 'sovn_min', label: 'Søvn (min)' },
  { felt: 'stress_snitt', label: 'Stress' },
  { felt: 'body_battery_lav', label: 'Body Battery (lav)' },
  { felt: 'body_battery_hoy', label: 'Body Battery (høy)' },
  { felt: 'skritt', label: 'Skritt' },
  { felt: 'vekt_kg', label: 'Vekt (kg)' },
  { felt: 'spo2_snitt', label: 'SpO2' },
  { felt: 'respirasjon_snitt', label: 'Respirasjon' },
]

function datoerIntervall(fra: string, til: string): string[] {
  const n = Math.max(0, dagerMellom(fra, til))
  return Array.from({ length: n + 1 }, (_, i) => leggTilDager(fra, i))
}

function csvFelt(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return ''
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Bygg CSV (én rad per dato i perioden). Kommaseparert, punktum som desimal. */
export function byggCsv(data: EksportData): string {
  const { fra, til, medisiner, symptomer, doser, oppforinger, garmin } = data

  const doseKart = new Map(
    medisiner.map((m) => [m.id, new Map(doseSumPerDag(doser, m.id).map((p) => [p.dato, p.verdi]))]),
  )
  const symKart = new Map(
    symptomer.map((s) => [
      s.id,
      new Map(oppforinger.filter((o) => o.symptom_id === s.id).map((o) => [o.dato, o.verdi])),
    ]),
  )
  const garminKart = new Map(garmin.map((g) => [g.dato, g]))

  const header = [
    'Dato',
    ...medisiner.map((m) => `${m.navn} (${m.enhet})`),
    ...symptomer.map((s) => s.navn),
    ...GARMIN_KOL.map((g) => g.label),
  ]

  const linjer = [header.map(csvFelt).join(',')]
  for (const d of datoerIntervall(fra, til)) {
    const g = garminKart.get(d)
    const rad = [
      d,
      ...medisiner.map((m) => doseKart.get(m.id)?.get(d) ?? ''),
      ...symptomer.map((s) => symKart.get(s.id)?.get(d) ?? ''),
      ...GARMIN_KOL.map((k) => (g ? (g[k.felt] as number | null) ?? '' : '')),
    ]
    linjer.push(rad.map(csvFelt).join(','))
  }
  return linjer.join('\r\n')
}

function h(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c)
}

function tall(v: number | null): string {
  return v == null ? '–' : (Math.round(v * 10) / 10).toString()
}

/** Bygg en selvstendig HTML-rapport (for utskrift/PDF og e-post-kropp). */
export function byggRapportHtml(data: EksportData): string {
  const { fra, til, generert, bruker, medisiner, symptomer, doser, oppforinger, garmin } = data

  const responser = [
    { label: 'Hvilepuls', serie: garminSerie(garmin, 'hvilepuls') },
    { label: 'Søvn (min)', serie: garminSerie(garmin, 'sovn_min') },
    { label: 'Body Battery (lav)', serie: garminSerie(garmin, 'body_battery_lav') },
    ...symptomer.map((s) => ({
      label: s.navn,
      serie: oppforinger
        .filter((o) => o.symptom_id === s.id)
        .map((o) => ({ dato: o.dato, verdi: o.verdi })) as Serie,
    })),
  ].filter((r) => r.serie.length > 0)

  const medBlokker = medisiner
    .map((m) => {
      const serie = doseSumPerDag(doser, m.id)
      const endringer = finnDoseendringer(serie)
      const endringsListe = endringer.length
        ? `<ul>${endringer
            .map((e) => `<li>${h(formaterDatoKort(e.dato))}: ${e.fra} → ${e.til} ${h(m.enhet)}</li>`)
            .join('')}</ul>`
        : '<p class="muted">Ingen doseendringer i perioden.</p>'

      const endringsTabeller = endringer
        .map((e) => {
          const rader = responser
            .map((r) => {
              const fe = foerEtter(r.serie, e.dato, 14)
              if (fe.foer == null && fe.etter == null) return ''
              const diff = fe.diff == null ? '' : `${fe.diff >= 0 ? '+' : ''}${tall(fe.diff)}`
              return `<tr><td>${h(r.label)}</td><td>${tall(fe.foer)}</td><td>${tall(
                fe.etter,
              )}</td><td>${diff}</td></tr>`
            })
            .join('')
          if (!rader) return ''
          return `<h4>Rundt doseendring ${h(formaterDatoKort(e.dato))} (${e.fra}→${e.til} ${h(
            m.enhet,
          )})</h4>
          <table><thead><tr><th>Mål</th><th>14 dager før</th><th>14 dager etter</th><th>Endring</th></tr></thead>
          <tbody>${rader}</tbody></table>`
        })
        .join('')

      return `<section><h3>${h(m.navn)}${m.formaal ? ` <span class="muted">– ${h(m.formaal)}</span>` : ''}</h3>
        ${endringsListe}${endringsTabeller}</section>`
    })
    .join('')

  return `<!doctype html><html lang="no"><head><meta charset="utf-8">
<title>Helserapport</title>
<style>
  body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#0f172a;max-width:800px;margin:24px auto;padding:0 16px;line-height:1.5}
  h1{color:#0d9488;margin-bottom:4px}
  h3{color:#0f172a;border-bottom:2px solid #99f6e4;padding-bottom:4px;margin-top:28px}
  h4{margin:16px 0 6px}
  table{border-collapse:collapse;width:100%;font-size:14px;margin:6px 0 14px}
  th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
  th{background:#f0fdfa}
  .muted{color:#64748b}
  .topp{color:#64748b;font-size:14px}
  .ansvar{margin-top:32px;padding:12px;background:#fffbeb;border-radius:8px;font-size:13px;color:#92400e}
  @media print{body{margin:0}}
</style></head><body>
<h1>Helserapport</h1>
<p class="topp">Periode: ${h(formaterDatoKort(fra))} – ${h(formaterDatoKort(til))}${
    bruker ? ` · ${h(bruker)}` : ''
  } · Generert ${h(generert)}</p>
${medBlokker || '<p class="muted">Ingen medisiner registrert.</p>'}
<p class="muted" style="margin-top:24px">Fullstendige daglige data (doser, symptomer og Garmin-målinger) ligger i den vedlagte CSV-fila.</p>
<div class="ansvar">Dette er egenregistrerte data ment som utgangspunkt for samtale med lege. Tallene viser
mønstre og samvariasjon – ikke årsak. Stoffskifteendringer slår gjerne inn over uker, og
dag-til-dag-svingninger kan ha mange forklaringer.</div>
</body></html>`
}

// ── Klientfunksjoner ───────────────────────────────────────────────

/** Last ned CSV-fil (BOM foran så Excel leser æøå riktig). */
export function lastNedCsv(csv: string, filnavn: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filnavn
  a.click()
  URL.revokeObjectURL(url)
}

/** Åpne rapporten i et nytt vindu og trigg utskrift (bruker «Lagre som PDF»). */
export function skrivUtRapport(html: string): void {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
}

/** Send rapport (HTML-kropp + CSV-vedlegg) til en e-postadresse via Edge Function. */
export async function sendRapportPaaEpost(params: {
  epost: string
  emne: string
  html: string
  csv: string
  filnavn: string
}): Promise<{ error?: string }> {
  const base = import.meta.env.VITE_FUNCTIONS_URL as string | undefined
  if (!base) return { error: 'E-postsending er ikke satt opp ennå (se EPOST.md).' }
  try {
    const token = await hentAuthToken()
    const r = await fetch(`${base}/send-rapport`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    })
    if (!r.ok) {
      const t = (await r.json().catch(() => ({}))) as { error?: string }
      return { error: t.error ?? `Sending feilet (${r.status})` }
    }
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}
