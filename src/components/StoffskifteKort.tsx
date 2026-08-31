import { useNavigate } from 'react-router-dom'
import type { LabResultat } from '../lib/types'
import { labSerie, ratioSerie, sistePunkt } from '../lib/analyse'
import { formaterDatoKort } from '../lib/dates'
import { Card, Button } from '../components/ui'
import { Graf, type GrafMarkor } from './Graf'

const RATIO_FARGE = '#0d7d72'

function Tile({ etikett, verdi, dato }: { etikett: string; verdi: string; dato?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{etikett}</div>
      <div className="text-lg font-semibold text-slate-800">{verdi}</div>
      {dato && <div className="text-xs text-slate-400">{formaterDatoKort(dato)}</div>}
    </div>
  )
}

export function StoffskifteKort({
  fra,
  til,
  labs,
  markorer,
}: {
  fra: string
  til: string
  labs: LabResultat[]
  markorer: GrafMarkor[]
}) {
  const navigate = useNavigate()

  const tsh = sistePunkt(labSerie(labs, 'tsh'))
  const ft4 = sistePunkt(labSerie(labs, 'ft4'))
  const ft3 = sistePunkt(labSerie(labs, 'ft3'))
  const ratio = ratioSerie(labs)
  const sisteRatio = sistePunkt(ratio)

  // Kun relevant hvis det finnes stoffskifte-prøver.
  if (!tsh && !ft4 && !ft3) return null

  return (
    <Card className="p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">🦋 Stoffskifte-oppfølging</h2>
        <Button variant="secondary" onClick={() => navigate('/historikk?ny=regimeendring')}>
          + Logg regimeendring
        </Button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tsh && <Tile etikett="TSH" verdi={`${tsh.verdi}`} dato={tsh.dato} />}
        {ft4 && <Tile etikett="Fritt T4" verdi={`${ft4.verdi}`} dato={ft4.dato} />}
        {ft3 && <Tile etikett="Fritt T3" verdi={`${ft3.verdi}`} dato={ft3.dato} />}
        {sisteRatio && <Tile etikett="FT3/FT4-ratio" verdi={`${sisteRatio.verdi}`} dato={sisteRatio.dato} />}
      </div>

      {ratio.length >= 2 ? (
        <Graf
          fra={fra}
          til={til}
          venstre={{ label: 'FT3/FT4-ratio', farge: RATIO_FARGE, punkter: ratio }}
          markorer={markorer}
        />
      ) : (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-400">
          Trenger fritt T3 og fritt T4 fra minst to prøver for å vise ratio over tid.
        </p>
      )}

      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
        Uten skjoldbruskkjertel er FT3/FT4-ratioen ofte lav selv om TSH er normal – derfor er
        <strong> fritt T3 og fritt T4 (ikke bare TSH)</strong> verdt å følge, særlig rundt
        regimeendringer (oppstart/justering av T3/Thybon eller preparatbytte). Logg endringen som en
        hendelse, så ser du responsen her. Dette er underlag for samtale med lege, ikke råd.
      </p>
    </Card>
  )
}
