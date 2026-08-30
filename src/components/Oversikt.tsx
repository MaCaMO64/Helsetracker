import {
  useDoser,
  useDoserPeriode,
  useGarminPeriode,
  useLabResultater,
  useMedisiner,
  useSymptomer,
  useSymptomOppforinger,
} from '../lib/db'
import { dagerMellom, formaterDatoKort, iDag, leggTilDager } from '../lib/dates'
import { doseSumPerDag, finnDoseendringer, garminSerie, snitt, type Serie } from '../lib/analyse'
import { gjenstaar } from '../lib/paaminnelse'
import { Card } from './ui'

function sisteAv(serie: Serie): number | null {
  return serie.length ? serie[serie.length - 1].verdi : null
}

function sovnTekst(min: number): string {
  const t = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${t}t ${m}m`
}

interface Flis {
  etikett: string
  verdi: string
  under?: string
}

function Fliser({ fliser }: { fliser: Flis[] }) {
  if (fliser.length === 0) return null
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {fliser.map((f) => (
        <div key={f.etikett} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {f.etikett}
          </div>
          <div className="text-lg font-semibold text-slate-800">{f.verdi}</div>
          {f.under && <div className="text-xs text-slate-400">{f.under}</div>}
        </div>
      ))}
    </div>
  )
}

export function Oversikt() {
  const til = iDag()
  const { data: meds = [] } = useMedisiner()
  const { data: doserIdag = [] } = useDoser(til)
  const { data: symptomer = [] } = useSymptomer()
  const { data: oppf = [] } = useSymptomOppforinger(til)
  const { data: garmin = [] } = useGarminPeriode(leggTilDager(til, -13), til)
  const { data: labs = [] } = useLabResultater(leggTilDager(til, -365), til)
  const { data: doserPeriode = [] } = useDoserPeriode(leggTilDager(til, -90), til)

  const g = gjenstaar(meds, symptomer, doserIdag, oppf)

  // Trend-fliser (kun de med data).
  const fliser: Flis[] = []

  const rhr = garminSerie(garmin, 'hvilepuls')
  const siste7 = rhr.filter((p) => dagerMellom(p.dato, til) <= 6).map((p) => p.verdi)
  const forrige7 = rhr
    .filter((p) => dagerMellom(p.dato, til) >= 7 && dagerMellom(p.dato, til) <= 13)
    .map((p) => p.verdi)
  const rhr7 = snitt(siste7)
  if (rhr7 !== null) {
    const forr = snitt(forrige7)
    let trend = '7 dager'
    if (forr !== null) {
      const d = rhr7 - forr
      trend = Math.abs(d) < 0.5 ? '≈ forrige uke' : `${d > 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(0)} vs. forrige uke`
    }
    fliser.push({ etikett: 'Hvilepuls (7 d)', verdi: `${Math.round(rhr7)}`, under: trend })
  }

  const sovn = sisteAv(garminSerie(garmin, 'sovn_min'))
  if (sovn !== null) fliser.push({ etikett: 'Søvn (siste)', verdi: sovnTekst(sovn) })

  const bb = sisteAv(garminSerie(garmin, 'body_battery_hoy'))
  if (bb !== null) fliser.push({ etikett: 'Body Battery', verdi: `${Math.round(bb)}` })

  const vekt = sisteAv(garminSerie(garmin, 'vekt_kg'))
  if (vekt !== null) fliser.push({ etikett: 'Vekt (siste)', verdi: `${vekt} kg` })

  const tsh = labs
    .filter((r) => (r.analyse_kanon ?? '') === 'tsh')
    .sort((a, b) => (a.dato < b.dato ? 1 : -1))[0]
  if (tsh) fliser.push({ etikett: 'Siste TSH', verdi: `${tsh.verdi}`, under: formaterDatoKort(tsh.dato) })

  let sisteEndring: { dato: string; fra: number; til: number; navn: string; enhet: string } | null =
    null
  for (const m of meds) {
    for (const e of finnDoseendringer(doseSumPerDag(doserPeriode, m.id))) {
      if (!sisteEndring || e.dato > sisteEndring.dato)
        sisteEndring = { ...e, navn: m.navn, enhet: m.enhet }
    }
  }
  if (sisteEndring)
    fliser.push({
      etikett: 'Siste doseendring',
      verdi: `${sisteEndring.fra}→${sisteEndring.til} ${sisteEndring.enhet}`,
      under: `${sisteEndring.navn} · ${formaterDatoKort(sisteEndring.dato)}`,
    })

  const mangler = [...g.medMangler.map((m) => m.navn), ...g.symMangler.map((s) => s.navn)]

  return (
    <Card className="p-5">
      {g.altLogget ? (
        <p className="text-sm font-medium text-teal-700">✓ Alt logget for i dag</p>
      ) : g.harDefinisjoner ? (
        <p className="text-sm text-slate-700">
          <span className="font-medium">Gjenstår i dag:</span>{' '}
          {mangler.length <= 4 ? mangler.join(', ') : `${mangler.length} ting å logge`}
        </p>
      ) : null}
      <Fliser fliser={fliser} />
    </Card>
  )
}
