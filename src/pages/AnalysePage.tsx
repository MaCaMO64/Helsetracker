import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useDoserPeriode,
  useGarminPeriode,
  useLabResultater,
  useMedisiner,
  useSymptomer,
  useSymptomOppfPeriode,
} from '../lib/db'
import { iDag, leggTilDager } from '../lib/dates'
import {
  besteLag,
  doseSumPerDag,
  finnDoseendringer,
  foerEtter,
  garminSerie,
  korrelasjonPerLag,
  parVedLag,
  sammenhengOrd,
  type Serie,
} from '../lib/analyse'
import type { GarminDag } from '../lib/types'
import { SideTittel, Card, Button, TomTilstand, feltKlasse } from '../components/ui'
import { Graf, type GrafMarkor } from '../components/Graf'
import { Spredning } from '../components/Spredning'
import { EksportSeksjon } from '../components/EksportSeksjon'

const FARGE_A = '#0d9488' // teal (venstre akse)
const FARGE_B = '#6366f1' // indigo (høyre akse)

const GARMIN_METRIKKER: { felt: keyof GarminDag; label: string; enhet?: string }[] = [
  { felt: 'hvilepuls', label: 'Hvilepuls', enhet: 'slag/min' },
  { felt: 'hrv', label: 'HRV', enhet: 'ms' },
  { felt: 'sovn_score', label: 'Søvnscore' },
  { felt: 'sovn_min', label: 'Søvnlengde', enhet: 'min' },
  { felt: 'stress_snitt', label: 'Stress' },
  { felt: 'body_battery_hoy', label: 'Body Battery (høy)' },
  { felt: 'body_battery_lav', label: 'Body Battery (lav)' },
  { felt: 'skritt', label: 'Skritt' },
  { felt: 'vekt_kg', label: 'Vekt', enhet: 'kg' },
  { felt: 'spo2_snitt', label: 'SpO₂', enhet: '%' },
  { felt: 'respirasjon_snitt', label: 'Respirasjon' },
]

interface SerieValg {
  id: string
  label: string
  enhet?: string
  serie: Serie
  erDose: boolean
}

const PERIODER = [
  { dager: 30, label: '30 dager' },
  { dager: 60, label: '60 dager' },
  { dager: 90, label: '90 dager' },
]

export function AnalysePage() {
  const [dager, setDager] = useState(90)
  const til = iDag()
  const fra = leggTilDager(til, -(dager - 1))

  const { data: medisiner = [] } = useMedisiner()
  const { data: symptomer = [] } = useSymptomer()
  const { data: doser = [] } = useDoserPeriode(fra, til)
  const { data: oppforinger = [] } = useSymptomOppfPeriode(fra, til)
  const { data: garminDager = [] } = useGarminPeriode(fra, til)
  const { data: labResultater = [] } = useLabResultater(fra, til)

  // Bygg alle valgbare serier.
  const valg = useMemo<SerieValg[]>(() => {
    const ut: SerieValg[] = []
    for (const m of medisiner) {
      ut.push({
        id: `med:${m.id}`,
        label: `${m.navn} (dose)`,
        enhet: m.enhet,
        serie: doseSumPerDag(doser, m.id),
        erDose: true,
      })
    }
    for (const s of symptomer) {
      const serie: Serie = oppforinger
        .filter((o) => o.symptom_id === s.id)
        .map((o) => ({ dato: o.dato, verdi: o.verdi }))
      ut.push({ id: `sym:${s.id}`, label: s.navn, serie, erDose: false })
    }
    for (const g of GARMIN_METRIKKER) {
      ut.push({
        id: `garmin:${g.felt}`,
        label: g.label,
        enhet: g.enhet,
        serie: garminSerie(garminDager, g.felt),
        erDose: false,
      })
    }
    // Blodprøver: én serie per analyse (gruppert på kanon-nøkkel der den finnes).
    const labGrupper = new Map<string, { label: string; enhet: string | null; serie: Serie }>()
    for (const r of labResultater) {
      const key = r.analyse_kanon ?? r.analyse.toLowerCase()
      if (!labGrupper.has(key)) labGrupper.set(key, { label: r.analyse, enhet: r.enhet, serie: [] })
      labGrupper.get(key)!.serie.push({ dato: r.dato, verdi: r.verdi })
    }
    for (const [key, g] of labGrupper) {
      ut.push({
        id: `lab:${key}`,
        label: `${g.label} (prøve)`,
        enhet: g.enhet ?? undefined,
        serie: g.serie,
        erDose: false,
      })
    }
    return ut
  }, [medisiner, symptomer, doser, oppforinger, garminDager, labResultater])

  const doseValg = valg.filter((v) => v.erDose)
  const responsValg = valg.filter((v) => !v.erDose && v.serie.length > 0)

  // Doseendring-markører fra alle medisiner.
  const markorer = useMemo<GrafMarkor[]>(
    () =>
      doseValg.flatMap((v) =>
        finnDoseendringer(v.serie).map((e) => ({
          dato: e.dato,
          label: `${v.label}: ${e.fra}→${e.til}`,
        })),
      ),
    [doseValg],
  )

  // Overlay-valg (A/B).
  const medData = valg.filter((v) => v.serie.length > 0)
  const [aId, setAId] = useState('')
  const [bId, setBId] = useState('')
  const valgtA = valg.find((v) => v.id === aId) ?? doseValg.find((v) => v.serie.length) ?? medData[0]
  const valgtB =
    valg.find((v) => v.id === bId) ??
    responsValg.find((v) => v.id === 'garmin:hvilepuls') ??
    responsValg.find((v) => v.id !== valgtA?.id) ??
    responsValg[0]

  // Dose vs respons.
  const [doseId, setDoseId] = useState('')
  const [respId, setRespId] = useState('')
  const [lag, setLag] = useState(7)
  const valgtDose = doseValg.find((v) => v.id === doseId) ?? doseValg[0]
  const valgtResp =
    responsValg.find((v) => v.id === respId) ??
    responsValg.find((v) => v.id === 'garmin:hvilepuls') ??
    responsValg[0]

  const lagResultater = useMemo(
    () =>
      valgtDose && valgtResp ? korrelasjonPerLag(valgtDose.serie, valgtResp.serie, 28) : [],
    [valgtDose, valgtResp],
  )
  const beste = besteLag(lagResultater)
  const rVedLag = lagResultater.find((l) => l.lag === lag)
  const par = valgtDose && valgtResp ? parVedLag(valgtDose.serie, valgtResp.serie, lag) : []
  const doseendringer = valgtDose ? finnDoseendringer(valgtDose.serie) : []

  // Plain-språk (ingen r-/t-verdier i UI).
  const samm = sammenhengOrd(rVedLag?.r ?? null)
  const lagOrd = lag === 0 ? 'samme dag' : `etter ${lag} ${lag === 1 ? 'dag' : 'dager'}`
  const bestBeskr = beste ? sammenhengOrd(beste.r) : null

  const ingenData =
    medisiner.length === 0 &&
    symptomer.length === 0 &&
    garminDager.length === 0 &&
    labResultater.length === 0

  if (ingenData) {
    return (
      <div>
        <SideTittel tittel="Analyse" />
        <TomTilstand
          ikon="📊"
          tittel="Ingen data å analysere ennå"
          tekst="Logg doser og symptomer, og koble til Garmin. Når det finnes noen dagers data, dukker grafene opp her."
          handling={
            <Link to="/innstillinger">
              <Button>Åpne Innstillinger</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SideTittel
        tittel="Analyse"
        undertittel="Mønstre å diskutere med legen – ikke bevis på årsak"
      />

      {/* Periodevelger */}
      <div className="flex gap-1">
        {PERIODER.map((p) => (
          <Button
            key={p.dager}
            variant={dager === p.dager ? 'primary' : 'secondary'}
            onClick={() => setDager(p.dager)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Overlay-graf */}
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Utvikling over tid</h2>
        <div className="mb-3 flex flex-wrap gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium" style={{ color: FARGE_A }}>
              Vis (grønn)
            </span>
            <select
              className={feltKlasse}
              value={valgtA?.id ?? ''}
              onChange={(e) => setAId(e.target.value)}
            >
              {medData.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium" style={{ color: FARGE_B }}>
              Sammenlign med (lilla)
            </span>
            <select
              className={feltKlasse}
              value={valgtB?.id ?? ''}
              onChange={(e) => setBId(e.target.value)}
            >
              <option value="">(ingen)</option>
              {responsValg.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {valgtA && (
          <Graf
            fra={fra}
            til={til}
            venstre={{ label: valgtA.label, farge: FARGE_A, enhet: valgtA.enhet, punkter: valgtA.serie }}
            hoyre={
              valgtB && valgtB.id !== valgtA.id
                ? { label: valgtB.label, farge: FARGE_B, enhet: valgtB.enhet, punkter: valgtB.serie }
                : undefined
            }
            markorer={markorer}
          />
        )}
      </Card>

      {/* Dose vs respons */}
      {doseValg.length > 0 && responsValg.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Dose vs. respons</h2>
          <div className="mb-3 flex flex-wrap gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-600">Dose</span>
              <select
                className={feltKlasse}
                value={valgtDose?.id ?? ''}
                onChange={(e) => setDoseId(e.target.value)}
              >
                {doseValg.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-600">Respons</span>
              <select
                className={feltKlasse}
                value={valgtResp?.id ?? ''}
                onChange={(e) => setRespId(e.target.value)}
              >
                {responsValg.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Før/etter doseendring */}
          {doseendringer.length > 0 && valgtResp && (
            <div className="mb-4">
              <h3 className="mb-1.5 text-sm font-semibold text-slate-700">
                Gjennomsnittlig {valgtResp.label.toLowerCase()}: 14 dager før → 14 dager etter hver
                doseendring
              </h3>
              <div className="space-y-1.5">
                {doseendringer.map((e, i) => {
                  const fe = foerEtter(valgtResp.serie, e.dato, 14)
                  return (
                    <div
                      key={i}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="text-slate-600">
                        {e.dato}: {e.fra}→{e.til} {valgtDose?.enhet}
                      </span>
                      <span className="text-slate-800">
                        {fe.foer != null ? fe.foer.toFixed(1) : '–'} →{' '}
                        {fe.etter != null ? fe.etter.toFixed(1) : '–'}
                        {fe.diff != null && (
                          <span className={fe.diff >= 0 ? 'text-teal-700' : 'text-indigo-700'}>
                            {' '}
                            ({fe.diff >= 0 ? '+' : ''}
                            {fe.diff.toFixed(1)})
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Henger dose og respons sammen? (plain-språk, ingen tallverdier) */}
          {valgtDose && valgtResp && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                Henger {valgtDose.label.toLowerCase()} og {valgtResp.label.toLowerCase()} sammen?
              </h3>

              <label className="mb-2 block">
                <span className="mb-1 block text-xs text-slate-600">
                  Se på responsen så mange dager etter dosen:{' '}
                  <strong>{lag === 0 ? 'samme dag' : `${lag} ${lag === 1 ? 'dag' : 'dager'}`}</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={28}
                  value={lag}
                  onChange={(e) => setLag(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </label>

              <p className="text-sm text-slate-700">
                {rVedLag == null || rVedLag.r == null ? (
                  'For lite data til å si noe om dette ennå.'
                ) : samm.styrke === 0 ? (
                  <>
                    Ingen tydelig sammenheng mellom {valgtDose.label.toLowerCase()} og{' '}
                    {valgtResp.label.toLowerCase()} {lagOrd}.
                  </>
                ) : (
                  <>
                    Når <strong>{valgtDose.label.toLowerCase()}</strong> er høyere, er{' '}
                    <strong>{valgtResp.label.toLowerCase()}</strong> som regel{' '}
                    {samm.retning === 'opp' ? 'høyere' : 'lavere'} {lagOrd} – {samm.ord}.
                  </>
                )}
              </p>
              <div className="mb-2 mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span aria-hidden>
                  {'●'.repeat(samm.styrke)}
                  {'○'.repeat(3 - samm.styrke)}
                </span>
                <span>Basert på {rVedLag?.n ?? 0} dager med data.</span>
              </div>
              {bestBeskr && bestBeskr.styrke >= 1 && beste && (
                <p className="mb-2 text-xs text-slate-500">
                  Tydeligst når vi ser på {valgtResp.label.toLowerCase()} omtrent {beste.lag}{' '}
                  {beste.lag === 1 ? 'dag' : 'dager'} etter dosen.
                </p>
              )}

              <p className="mb-1 mt-2 text-xs text-slate-400">
                Hvert punkt er én dag: dosen (vannrett) mot {valgtResp.label.toLowerCase()} {lagOrd}{' '}
                (loddrett).
              </p>
              <Spredning
                par={par}
                xLabel={`Dose (${valgtDose.enhet ?? ''})`}
                yLabel={valgtResp.label}
              />
            </div>
          )}

          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            ⚠️ <strong>Tolk med forsiktighet.</strong> Dette viser samvariasjon, ikke årsak.
            Dag-til-dag-data henger sammen, og når man prøver mange forskyvninger vil noen se
            «sterke» ut ved ren tilfeldighet. Stoffskifteendringer slår dessuten inn over uker.
            Bruk grafene som utgangspunkt for en samtale med legen din – ikke som en konklusjon.
          </p>
        </Card>
      )}

      <EksportSeksjon
        fra={fra}
        til={til}
        medisiner={medisiner}
        symptomer={symptomer}
        doser={doser}
        oppforinger={oppforinger}
        garmin={garminDager}
        labResultater={labResultater}
      />
    </div>
  )
}
