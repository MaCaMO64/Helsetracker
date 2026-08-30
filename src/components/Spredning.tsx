const B = 320
const H = 260
const P = 40

function omraade(vs: number[]): { min: number; max: number } {
  let min = Math.min(...vs)
  let max = Math.max(...vs)
  if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1 }
  if (min === max) return { min: min - 1, max: max + 1 }
  const pad = (max - min) * 0.1
  return { min: min - pad, max: max + pad }
}

/** Spredningsplott for (x, y)-par – dose mot respons ved valgt forskyvning. */
export function Spredning({
  par,
  xLabel,
  yLabel,
  farge = '#0d9488',
}: {
  par: { x: number; y: number }[]
  xLabel: string
  yLabel: string
  farge?: string
}) {
  if (par.length < 3) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-400">
        For få datapunkter til å vise spredning ennå.
      </p>
    )
  }
  const xr = omraade(par.map((p) => p.x))
  const yr = omraade(par.map((p) => p.y))
  const px = (x: number) => P + ((x - xr.min) / (xr.max - xr.min)) * (B - P - 10)
  const py = (y: number) => H - P - ((y - yr.min) / (yr.max - yr.min)) * (H - P - 10)

  return (
    <svg viewBox={`0 0 ${B} ${H}`} className="h-auto w-full" role="img">
      {/* Akser */}
      <line x1={P} y1={H - P} x2={B - 10} y2={H - P} className="stroke-slate-300" />
      <line x1={P} y1={10} x2={P} y2={H - P} className="stroke-slate-300" />
      {par.map((p, i) => (
        <circle key={i} cx={px(p.x)} cy={py(p.y)} r={3} fill={farge} fillOpacity={0.6} />
      ))}
      <text x={(B + P) / 2} y={H - 6} textAnchor="middle" className="fill-slate-500 text-[11px]">
        {xLabel}
      </text>
      <text
        x={12}
        y={H / 2}
        textAnchor="middle"
        transform={`rotate(-90 12 ${H / 2})`}
        className="fill-slate-500 text-[11px]"
      >
        {yLabel}
      </text>
    </svg>
  )
}
