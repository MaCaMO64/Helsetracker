// Analyse-logikk: bygger daglige tidsserier og regner enkle, etterprøvbare mål.
// Bevisst forsiktig: dette skal støtte SAMTALE med lege (mønstre), ikke påstå
// årsak. Korrelasjon på autokorrelerte tidsserier overdriver lett sammenhenger,
// og å skanne mange forskyvninger (lag) finner tilfeldige «funn» – derfor
// rammer UI-et alltid tallene med forbehold.

import type { GarminDag } from './types'
import { dagerMellom, leggTilDager } from './dates'

export interface Punkt {
  dato: string
  verdi: number
}
export type Serie = Punkt[]

const byDato = (a: Punkt, b: Punkt) => (a.dato < b.dato ? -1 : a.dato > b.dato ? 1 : 0)

/** Gjennomsnitt, eller null for tom liste. */
export function snitt(xs: number[]): number | null {
  if (xs.length === 0) return null
  return xs.reduce((s, x) => s + x, 0) / xs.length
}

/** Pearson-korrelasjon. Null hvis < 3 par eller ingen varians. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  const mx = snitt(xs.slice(0, n))!
  const my = snitt(ys.slice(0, n))!
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx === 0 || syy === 0) return null
  return sxy / Math.sqrt(sxx * syy)
}

/** Daglig sum av doser for én medisin. */
export function doseSumPerDag(
  doser: { dato: string; dose: number; medication_id: string }[],
  medId: string,
): Serie {
  const kart = new Map<string, number>()
  for (const d of doser) {
    if (d.medication_id !== medId) continue
    kart.set(d.dato, (kart.get(d.dato) ?? 0) + d.dose)
  }
  return [...kart.entries()].map(([dato, verdi]) => ({ dato, verdi })).sort(byDato)
}

/** Serie for én Garmin-metrikk (hopper over dager uten verdi). */
export function garminSerie(dager: GarminDag[], felt: keyof GarminDag): Serie {
  const out: Serie = []
  for (const d of dager) {
    const v = d[felt]
    if (typeof v === 'number') out.push({ dato: d.dato, verdi: v })
  }
  return out.sort(byDato)
}

export interface Doseendring {
  dato: string
  fra: number
  til: number
}

/** Finn dager der (den loggede) dosen endret seg fra forrige loggede verdi. */
export function finnDoseendringer(serie: Serie): Doseendring[] {
  const sortert = serie.slice().sort(byDato)
  const endringer: Doseendring[] = []
  for (let i = 1; i < sortert.length; i++) {
    if (sortert[i].verdi !== sortert[i - 1].verdi) {
      endringer.push({ dato: sortert[i].dato, fra: sortert[i - 1].verdi, til: sortert[i].verdi })
    }
  }
  return endringer
}

export interface LagResultat {
  lag: number
  r: number | null
  n: number
}

/**
 * Korrelasjon mellom serie a (f.eks. dose) og b (respons) der b forskyves `lag`
 * dager FRAM i tid (responsen kommer etter dosen). Returnerer r og antall par
 * for hver forskyvning 0..maxLag.
 */
export function korrelasjonPerLag(a: Serie, b: Serie, maxLag: number): LagResultat[] {
  const aKart = new Map(a.map((p) => [p.dato, p.verdi]))
  const bKart = new Map(b.map((p) => [p.dato, p.verdi]))
  const res: LagResultat[] = []
  for (let lag = 0; lag <= maxLag; lag++) {
    const xs: number[] = []
    const ys: number[] = []
    for (const [dato, av] of aKart) {
      const bv = bKart.get(leggTilDager(dato, lag))
      if (bv !== undefined) {
        xs.push(av)
        ys.push(bv)
      }
    }
    res.push({ lag, r: pearson(xs, ys), n: xs.length })
  }
  return res
}

/** Forskjøvne (dose, respons)-par ved gitt lag – til spredningsplott. */
export function parVedLag(a: Serie, b: Serie, lag: number): { x: number; y: number }[] {
  const bKart = new Map(b.map((p) => [p.dato, p.verdi]))
  const par: { x: number; y: number }[] = []
  for (const p of a) {
    const bv = bKart.get(leggTilDager(p.dato, lag))
    if (bv !== undefined) par.push({ x: p.verdi, y: bv })
  }
  return par
}

/** Forskyvningen (0..maxLag) med sterkest |r|, blant de med nok datapunkter. */
export function besteLag(resultater: LagResultat[], minN = 5): LagResultat | null {
  const gyldige = resultater.filter((r) => r.r !== null && r.n >= minN)
  if (gyldige.length === 0) return null
  return gyldige.reduce((best, r) => (Math.abs(r.r!) > Math.abs(best.r!) ? r : best))
}

export interface Sammenheng {
  styrke: 0 | 1 | 2 | 3 // 0 ingen, 1 svak, 2 tydelig, 3 sterk
  retning: 'opp' | 'ned' | null
  ord: string // plain-språk, uten tall
}

/**
 * Oversett en korrelasjon (r) til vanlige ord – UI skal ALDRI vise selve
 * r-verdien. Terskler er bevisst grove; poenget er en forsiktig pekepinn, ikke
 * presisjon.
 */
export function sammenhengOrd(r: number | null): Sammenheng {
  if (r === null) return { styrke: 0, retning: null, ord: 'for lite data ennå' }
  const a = Math.abs(r)
  const styrke: 0 | 1 | 2 | 3 = a >= 0.7 ? 3 : a >= 0.4 ? 2 : a >= 0.2 ? 1 : 0
  const retning = styrke === 0 ? null : r > 0 ? 'opp' : 'ned'
  const ord =
    styrke === 0
      ? 'ingen tydelig sammenheng'
      : styrke === 1
        ? 'en svak tendens'
        : styrke === 2
          ? 'en tydelig tendens'
          : 'en sterk tendens'
  return { styrke, retning, ord }
}

export interface FoerEtter {
  foer: number | null
  etter: number | null
  diff: number | null
  effekt: number | null // Cohen's d (grov effektstørrelse)
  nFoer: number
  nEtter: number
}

/**
 * Sammenlign en metrikk i vinduet FØR mot ETTER en doseendring (endringsdagen
 * selv utelates). `vindu` = antall dager på hver side.
 */
export function foerEtter(serie: Serie, endringsdato: string, vindu: number): FoerEtter {
  const foerV: number[] = []
  const etterV: number[] = []
  for (const p of serie) {
    const avstand = dagerMellom(endringsdato, p.dato) // < 0 før, > 0 etter
    if (avstand < 0 && avstand >= -vindu) foerV.push(p.verdi)
    else if (avstand > 0 && avstand <= vindu) etterV.push(p.verdi)
  }
  const foer = snitt(foerV)
  const etter = snitt(etterV)
  let effekt: number | null = null
  if (foer !== null && etter !== null && foerV.length >= 2 && etterV.length >= 2) {
    const varians = (xs: number[], m: number) =>
      xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1)
    const pooled = Math.sqrt((varians(foerV, foer) + varians(etterV, etter)) / 2)
    if (pooled > 0) effekt = (etter - foer) / pooled
  }
  return {
    foer,
    etter,
    diff: foer !== null && etter !== null ? etter - foer : null,
    effekt,
    nFoer: foerV.length,
    nEtter: etterV.length,
  }
}
