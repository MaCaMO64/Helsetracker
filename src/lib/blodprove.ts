// Lokal parsing av blodprøve-tekst (fra PDF-tekstlag). Heuristisk, men dekker de
// vanlige norske formatene (Fürst/Helsenorge): «Analyse  Verdi  Enhet  Ref».
// Ingen AI – dette kjører i nettleseren uten at data forlater enheten.

export interface LabUttrekk {
  analyse: string
  verdi: number
  enhet?: string | null
  ref_lav?: number | null
  ref_hoy?: number | null
  analyse_kanon?: string | null
}

/** Norsk tallformat → number (komma som desimal). Null hvis ugyldig. */
export function tilTall(s: string): number | null {
  const n = Number(s.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Normaliser analysenavn til en nøkkel for gruppering/analyse. */
export function kanoniser(navn: string): string | null {
  const n = navn
    .toLowerCase()
    .replace(/^(s|p|b|fs|f|serum|plasma)\s*-\s*/, '')
    .trim()
  if (/tsh/.test(n)) return 'tsh'
  if (/ft4|(fritt|free|^f)\s*t4/.test(n)) return 'ft4'
  if (/ft3|(fritt|free|^f)\s*t3/.test(n)) return 'ft3'
  if (/anti.?tpo|tpo.?ab/.test(n)) return 'anti_tpo'
  if (/anti.?tg|thyreoglobulin/.test(n)) return 'anti_tg'
  if (/\bt4\b|tyroksin|tyroxin/.test(n)) return 't4'
  if (/\bt3\b|trijod/.test(n)) return 't3'
  return null
}

const ER_TALL = /^-?\d+(?:[.,]\d+)?$/

function parseLinje(linje: string): LabUttrekk | null {
  let rest = linje
  let ref_lav: number | null = null
  let ref_hoy: number | null = null

  // Referanseområde bakerst: «0,27 - 4,20», «(0,27-4,20)», «< 34», «> 2».
  const område = rest.match(/\(?\s*(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*\)?\s*$/)
  if (område) {
    ref_lav = tilTall(område[1])
    ref_hoy = tilTall(område[2])
    rest = rest.slice(0, område.index).trim()
  } else {
    const under = rest.match(/[<]\s*(\d+(?:[.,]\d+)?)\s*$/)
    const over = rest.match(/[>]\s*(\d+(?:[.,]\d+)?)\s*$/)
    if (under) {
      ref_hoy = tilTall(under[1])
      rest = rest.slice(0, under.index).trim()
    } else if (over) {
      ref_lav = tilTall(over[1])
      rest = rest.slice(0, over.index).trim()
    }
  }

  const tokens = rest.split(/\s+/)
  // Verdien er siste rene tall-token (analysenavn kan inneholde tall, f.eks. «T4», «B12»).
  let vi = -1
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (ER_TALL.test(tokens[i])) {
      vi = i
      break
    }
  }
  if (vi <= 0) return null // trenger minst én token før verdien som analysenavn
  const verdi = tilTall(tokens[vi])
  if (verdi === null) return null

  const analyse = tokens
    .slice(0, vi)
    .join(' ')
    .replace(/[:*]/g, '')
    .trim()
  if (!/[A-Za-zÆØÅæøå]/.test(analyse) || analyse.length > 40) return null

  // Enhet: første token etter verdien som ser ut som en enhet (ikke et flagg som «H»/«L»).
  let enhet: string | null = null
  for (let i = vi + 1; i < tokens.length; i++) {
    const t = tokens[i]
    if (/[A-Za-zµ%]/.test(t) && !/^\d/.test(t) && (/[/%µ]/.test(t) || t.length >= 2)) {
      enhet = t
      break
    }
  }

  return { analyse, verdi, enhet, ref_lav, ref_hoy, analyse_kanon: kanoniser(analyse) }
}

/** Trekk ut blodprøveverdier fra rå tekst. Dedupliserer på analysenavn. */
export function parseLabTekst(tekst: string): LabUttrekk[] {
  const ut: LabUttrekk[] = []
  const sett = new Set<string>()
  for (const raa of tekst.split(/\r?\n/)) {
    const linje = raa.trim()
    if (!linje) continue
    const r = parseLinje(linje)
    if (!r) continue
    const nøkkel = r.analyse.toLowerCase()
    if (sett.has(nøkkel)) continue
    sett.add(nøkkel)
    ut.push(r)
  }
  return ut
}

/** Finn prøvedato i teksten (dd.mm.åååå eller åååå-mm-dd). Null hvis ingen. */
export function finnProvedato(tekst: string): string | null {
  const m = tekst.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/)
  if (m) {
    const d = m[1].padStart(2, '0')
    const mo = m[2].padStart(2, '0')
    let y = m[3]
    if (y.length === 2) y = '20' + y
    return `${y}-${mo}-${d}`
  }
  const iso = tekst.match(/(\d{4})-(\d{2})-(\d{2})/)
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null
}
