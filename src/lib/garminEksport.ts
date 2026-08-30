// Parser for Garmins manuelle dataeksport (zip → JSON-filer). Garmins format
// varierer over tid, så dette er bevisst defensivt: vi leter etter kjente
// feltnavn (med aliaser), slår sammen alt per dato, og hopper over det vi ikke
// kjenner igjen. Rene funksjoner (testbare); selve utpakkingen ligger i pdf-fri
// util (garminZip.ts).

export interface GarminDagInn {
  dato: string
  hvilepuls?: number
  puls_snitt?: number
  hrv?: number
  sovn_score?: number
  sovn_min?: number
  dyp_sovn_min?: number
  lett_sovn_min?: number
  rem_sovn_min?: number
  vaaken_min?: number
  stress_snitt?: number
  body_battery_hoy?: number
  body_battery_lav?: number
  skritt?: number
  kalorier?: number
  spo2_snitt?: number
  respirasjon_snitt?: number
  vekt_kg?: number
}

const DATO_ALIAS = ['calendarDate', 'calendarDateLocal', 'calendar_date', 'wellnessDate']

// Direkte numeriske felter (verdi brukes som den er).
const FELT_ALIAS: Record<keyof GarminDagInn, string[]> = {
  dato: [],
  hvilepuls: ['restingHeartRate', 'restingHeartRateInBeatsPerMinute'],
  puls_snitt: ['averageHeartRate', 'avgHeartRate'],
  hrv: ['avgOvernightHrv', 'lastNightAvg', 'avgHrv', 'weeklyAvgHrv'],
  sovn_score: ['overallSleepScore', 'sleepScore'],
  stress_snitt: ['averageStressLevel', 'avgStressLevel'],
  body_battery_hoy: ['bodyBatteryHighestValue', 'maxBodyBattery', 'bodyBatteryHigh'],
  body_battery_lav: ['bodyBatteryLowestValue', 'minBodyBattery', 'bodyBatteryLow'],
  skritt: ['totalSteps', 'steps'],
  kalorier: ['totalKilocalories', 'totalCalories'],
  spo2_snitt: ['averageSpo2', 'avgSpo2', 'averageSpO2'],
  respirasjon_snitt: ['avgWakingRespirationValue', 'avgRespirationValue', 'averageRespirationValue'],
  // Sekund-felter og vekt håndteres spesielt under.
  sovn_min: [],
  dyp_sovn_min: [],
  lett_sovn_min: [],
  rem_sovn_min: [],
  vaaken_min: [],
  vekt_kg: [],
}

// Felter oppgitt i sekunder → minutter.
const SEKUND_ALIAS: Partial<Record<keyof GarminDagInn, string[]>> = {
  sovn_min: ['sleepTimeSeconds', 'totalSleepSeconds'],
  dyp_sovn_min: ['deepSleepSeconds', 'deepSleepDurationInSeconds'],
  lett_sovn_min: ['lightSleepSeconds', 'lightSleepDurationInSeconds'],
  rem_sovn_min: ['remSleepSeconds', 'remSleepDurationInSeconds'],
  vaaken_min: ['awakeSleepSeconds', 'awakeDurationInSeconds', 'awakeSleepDurationInSeconds'],
}

function finnTall(obj: Record<string, unknown>, aliaser: string[]): number | undefined {
  for (const a of aliaser) {
    const v = obj[a]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return undefined
}

function normaliserDato(v: unknown): string | null {
  const s = String(v)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

/** Finn objekt-poster som har et dato-felt, også når de ligger nøstet i arrays. */
function samlPoster(x: unknown, ut: Record<string, unknown>[], dybde = 0): void {
  if (dybde > 4 || x == null) return
  if (Array.isArray(x)) {
    for (const el of x) samlPoster(el, ut, dybde + 1)
    return
  }
  if (typeof x === 'object') {
    const obj = x as Record<string, unknown>
    if (DATO_ALIAS.some((d) => obj[d] != null)) ut.push(obj)
    else for (const v of Object.values(obj)) if (v && typeof v === 'object') samlPoster(v, ut, dybde + 1)
  }
}

type LøsRad = Record<string, number | string>

/** Slå sammen alle JSON-filer fra eksporten til én rad per dato. */
export function parseGarminEksport(filer: { navn: string; tekst: string }[]): GarminDagInn[] {
  const kart = new Map<string, LøsRad>()

  for (const fil of filer) {
    let data: unknown
    try {
      data = JSON.parse(fil.tekst)
    } catch {
      continue
    }
    const poster: Record<string, unknown>[] = []
    samlPoster(data, poster)

    for (const post of poster) {
      const datoRaa = DATO_ALIAS.map((d) => post[d]).find((v) => v != null)
      const dato = normaliserDato(datoRaa)
      if (!dato) continue

      const rad: LøsRad = kart.get(dato) ?? { dato }

      for (const felt of Object.keys(FELT_ALIAS) as (keyof GarminDagInn)[]) {
        if (felt === 'dato' || rad[felt] != null) continue
        const v = finnTall(post, FELT_ALIAS[felt])
        if (v !== undefined) rad[felt] = v
      }
      for (const felt of Object.keys(SEKUND_ALIAS) as (keyof GarminDagInn)[]) {
        if (rad[felt] != null) continue
        const v = finnTall(post, SEKUND_ALIAS[felt]!)
        if (v !== undefined) rad[felt] = Math.round(v / 60)
      }
      // Vekt: ofte i gram under 'weight'.
      if (rad.vekt_kg == null) {
        const w = finnTall(post, ['weight', 'weightInGrams'])
        if (w !== undefined) rad.vekt_kg = w > 1000 ? Math.round((w / 1000) * 10) / 10 : w
      }

      kart.set(dato, rad)
    }
  }

  // Behold kun dager som faktisk fikk minst én måling.
  return [...kart.values()]
    .filter((r) => Object.keys(r).length > 1)
    .sort((a, b) => (a.dato < b.dato ? -1 : 1)) as unknown as GarminDagInn[]
}
