import { useLagreSymptomOppf, useSlettSymptomOppf } from '../lib/db'
import type { Symptom, SymptomOppforing } from '../lib/types'

/** Én rad på «I dag»: dagens verdi for ett symptom. Lagres umiddelbart ved trykk. */
export function SymptomLogger({
  symptom,
  oppforing,
  dato,
}: {
  symptom: Symptom
  oppforing?: SymptomOppforing
  dato: string
}) {
  const lagre = useLagreSymptomOppf()
  const slett = useSlettSymptomOppf()
  const valgt = oppforing?.verdi ?? null

  function velg(v: number) {
    if (oppforing && oppforing.verdi === v) {
      slett.mutate(oppforing.id) // trykk på valgt verdi igjen → nullstill
      return
    }
    lagre.mutate({ symptom_id: symptom.id, dato, verdi: v })
  }

  const jaNei = symptom.skala_type === 'ja_nei'
  const verdier = jaNei ? [0, 1] : Array.from({ length: 11 }, (_, i) => i)

  return (
    <div className="py-2.5">
      <div className="mb-1.5 font-medium text-slate-800">{symptom.navn}</div>
      <div className="flex flex-wrap gap-1.5">
        {verdier.map((v) => {
          const aktiv = valgt === v
          const etikett = jaNei ? (v === 0 ? 'Nei' : 'Ja') : String(v)
          return (
            <button
              key={v}
              onClick={() => velg(v)}
              className={`min-w-9 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                aktiv
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {etikett}
            </button>
          )
        })}
      </div>
    </div>
  )
}
