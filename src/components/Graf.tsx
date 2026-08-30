import type { Punkt } from '../lib/analyse'
import { dagerMellom, formaterDatoKort, leggTilDager } from '../lib/dates'

export interface GrafSerie {
  label: string
  farge: string
  enhet?: string
  punkter: Punkt[]
}
export interface GrafMarkor {
  dato: string
  label?: string
}

const B = 720
const H = 300
const PL = 46
const PR = 46
const PT = 28
const PB = 36
const innerW = B - PL - PR
const innerH = H - PT - PB

interface Skala {
  min: number
  max: number
}

function skala(punkter: Punkt[]): Skala {
  const ys = punkter.map((p) => p.verdi)
  let min = Math.min(...ys)
  let max = Math.max(...ys)
  if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1 }
  if (min === max) return { min: min - 1, max: max + 1 }
  const pad = (max - min) * 0.1
  return { min: min - pad, max: max + pad }
}

function fmt(v: number): string {
  const a = Math.abs(v)
  if (a >= 100) return String(Math.round(v))
  if (a >= 10) return v.toFixed(0)
  return v.toFixed(1)
}

/**
 * Tidsserie-graf med opptil to serier (venstre/høyre y-akse) og vertikale
 * markører (typisk doseendringer). Rent SVG, responsiv via viewBox.
 */
export function Graf({
  fra,
  til,
  venstre,
  hoyre,
  markorer = [],
}: {
  fra: string
  til: string
  venstre: GrafSerie
  hoyre?: GrafSerie
  markorer?: GrafMarkor[]
}) {
  const totalDager = Math.max(1, dagerMellom(fra, til))
  const x = (dato: string) => PL + (dagerMellom(fra, dato) / totalDager) * innerW
  const skV = skala(venstre.punkter)
  const skH = hoyre && hoyre.punkter.length ? skala(hoyre.punkter) : null
  const y = (verdi: number, sk: Skala) =>
    PT + innerH - ((verdi - sk.min) / (sk.max - sk.min)) * innerH

  const linje = (punkter: Punkt[], sk: Skala) =>
    punkter
      .slice()
      .sort((a, b) => (a.dato < b.dato ? -1 : 1))
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.dato).toFixed(1)},${y(p.verdi, sk).toFixed(1)}`)
      .join(' ')

  const tomt = venstre.punkter.length === 0 && (!hoyre || hoyre.punkter.length === 0)
  const ticks = (sk: Skala) => [0, 0.25, 0.5, 0.75, 1].map((t) => sk.min + t * (sk.max - sk.min))
  const xEtiketter = [fra, leggTilDager(fra, Math.round(totalDager / 2)), til]

  return (
    <div>
      {/* Tegnforklaring */}
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: venstre.farge }} />
          {venstre.label}
          {venstre.enhet ? ` (${venstre.enhet})` : ''}
        </span>
        {hoyre && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: hoyre.farge }} />
            {hoyre.label}
            {hoyre.enhet ? ` (${hoyre.enhet})` : ''}
          </span>
        )}
        {markorer.length > 0 && (
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="inline-block h-3 w-0 border-l-2 border-dashed border-slate-400" />
            Doseendring
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${B} ${H}`} className="h-auto w-full" role="img">
        {tomt ? (
          <text x={B / 2} y={H / 2} textAnchor="middle" className="fill-slate-400 text-sm">
            Ingen data i perioden
          </text>
        ) : (
          <>
            {/* Rutenett + venstre akse */}
            {ticks(skV).map((v, i) => (
              <g key={`v${i}`}>
                <line
                  x1={PL}
                  x2={B - PR}
                  y1={y(v, skV)}
                  y2={y(v, skV)}
                  className="stroke-slate-100"
                />
                <text x={PL - 6} y={y(v, skV) + 3} textAnchor="end" className="fill-slate-400 text-[10px]">
                  {fmt(v)}
                </text>
              </g>
            ))}
            {/* Høyre akse */}
            {skH &&
              ticks(skH).map((v, i) => (
                <text
                  key={`h${i}`}
                  x={B - PR + 6}
                  y={y(v, skH) + 3}
                  textAnchor="start"
                  className="text-[10px]"
                  style={{ fill: hoyre!.farge }}
                >
                  {fmt(v)}
                </text>
              ))}

            {/* Markører (doseendringer) */}
            {markorer.map((m, i) => (
              <line
                key={`m${i}`}
                x1={x(m.dato)}
                x2={x(m.dato)}
                y1={PT}
                y2={PT + innerH}
                className="stroke-slate-300"
                strokeDasharray="4 3"
              />
            ))}

            {/* X-akse-etiketter */}
            {xEtiketter.map((d, i) => (
              <text
                key={`x${i}`}
                x={x(d)}
                y={H - 12}
                textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
                className="fill-slate-400 text-[10px]"
              >
                {formaterDatoKort(d)}
              </text>
            ))}

            {/* Serier */}
            {venstre.punkter.length > 0 && (
              <path d={linje(venstre.punkter, skV)} fill="none" stroke={venstre.farge} strokeWidth={2} />
            )}
            {venstre.punkter.map((p, i) => (
              <circle key={`pv${i}`} cx={x(p.dato)} cy={y(p.verdi, skV)} r={2.5} fill={venstre.farge} />
            ))}
            {skH && hoyre && (
              <path d={linje(hoyre.punkter, skH)} fill="none" stroke={hoyre.farge} strokeWidth={2} />
            )}
            {skH &&
              hoyre &&
              hoyre.punkter.map((p, i) => (
                <circle key={`ph${i}`} cx={x(p.dato)} cy={y(p.verdi, skH)} r={2.5} fill={hoyre.farge} />
              ))}
          </>
        )}
      </svg>
    </div>
  )
}
