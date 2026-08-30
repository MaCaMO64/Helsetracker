import { useEffect, useState } from 'react'
import { useLagreDose, useSlettDose } from '../lib/db'
import type { Dose, Medisin } from '../lib/types'

/** Én rad på «I dag»: dagens dose for én medisin. Lagres når feltet forlates. */
export function DoseLogger({
  medisin,
  dose,
  dato,
}: {
  medisin: Medisin
  dose?: Dose
  dato: string
}) {
  const lagre = useLagreDose()
  const slett = useSlettDose()
  const [verdi, setVerdi] = useState(dose ? String(dose.dose) : '')

  // Synk feltet når dosen/datoen endres utenfra (datobytte, ferdig innlasting).
  useEffect(() => {
    setVerdi(dose ? String(dose.dose) : '')
  }, [dose, dato])

  function lagreVedBlur() {
    const t = verdi.trim().replace(',', '.')
    if (t === '') {
      if (dose) slett.mutate(dose.id) // tømt felt → fjern dagens dose
      return
    }
    const n = Number(t)
    if (!Number.isFinite(n)) return
    if (dose && n === dose.dose) return // uendret
    lagre.mutate({ id: dose?.id, medication_id: medisin.id, dato, dose: n })
  }

  const lagret =
    !!dose && verdi.trim().replace(',', '.') === String(dose.dose) && !lagre.isPending

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="font-medium text-slate-800">{medisin.navn}</div>
        {medisin.formaal && <div className="text-xs text-slate-500">{medisin.formaal}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={verdi}
          onChange={(e) => setVerdi(e.target.value)}
          onBlur={lagreVedBlur}
          placeholder={medisin.standard_dose != null ? String(medisin.standard_dose) : '–'}
          className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          aria-label={`Dose for ${medisin.navn} (${medisin.enhet})`}
        />
        <span className="w-12 text-sm text-slate-500">{medisin.enhet}</span>
        <span className="w-4 text-teal-600" aria-hidden>
          {lagret ? '✓' : ''}
        </span>
      </div>
    </div>
  )
}
