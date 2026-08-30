import { useEffect, useState } from 'react'
import { useLagreDose, useSlettDose } from '../lib/db'
import type { Dose, Medisin } from '../lib/types'

/** Én dose-rad (klokkeslett + mengde). Lagres når et felt forlates. */
function DoseRad({
  medisin,
  dato,
  dose,
}: {
  medisin: Medisin
  dato: string
  dose?: Dose
}) {
  const lagre = useLagreDose()
  const slett = useSlettDose()
  const [tid, setTid] = useState(dose?.tidspunkt ?? '')
  const [verdi, setVerdi] = useState(dose ? String(dose.dose) : '')

  useEffect(() => {
    setTid(dose?.tidspunkt ?? '')
    setVerdi(dose ? String(dose.dose) : '')
  }, [dose, dato])

  function lagreRad() {
    const t = verdi.trim().replace(',', '.')
    if (t === '') {
      if (dose) slett.mutate(dose.id) // tømt mengde → fjern dosen
      return
    }
    const n = Number(t)
    if (!Number.isFinite(n)) return
    const nyTid = tid || null
    if (dose && n === dose.dose && nyTid === (dose.tidspunkt ?? null)) return // uendret
    lagre.mutate({ id: dose?.id, medication_id: medisin.id, dato, dose: n, tidspunkt: nyTid })
  }

  const lagret = !!dose && verdi.trim().replace(',', '.') === String(dose.dose) && !lagre.isPending

  return (
    <div className="flex items-center gap-2 py-1.5">
      <input
        type="time"
        value={tid}
        onChange={(e) => setTid(e.target.value)}
        onBlur={lagreRad}
        className="w-28 rounded-xl border border-slate-300 px-2 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
        aria-label={`Tidspunkt for ${medisin.navn}`}
      />
      <input
        type="number"
        inputMode="decimal"
        step="any"
        value={verdi}
        onChange={(e) => setVerdi(e.target.value)}
        onBlur={lagreRad}
        placeholder={medisin.standard_dose != null ? String(medisin.standard_dose) : '–'}
        className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
        aria-label={`Dose for ${medisin.navn} (${medisin.enhet})`}
      />
      <span className="w-12 text-sm text-slate-500">{medisin.enhet}</span>
      <span className="w-4 text-teal-600" aria-hidden>
        {lagret ? '✓' : ''}
      </span>
      {dose && (
        <button
          onClick={() => slett.mutate(dose.id)}
          className="text-slate-300 hover:text-red-500"
          aria-label="Fjern dose"
        >
          ✕
        </button>
      )}
    </div>
  )
}

/** Alle doser for én medisin på en dag: viser eksisterende + tomme felter opp til
 *  medisinens «doser per dag», og lar deg legge til flere. */
export function DoseLogger({
  medisin,
  doser,
  dato,
}: {
  medisin: Medisin
  doser: Dose[]
  dato: string
}) {
  const [ekstra, setEkstra] = useState(0)

  const mine = doser
    .filter((d) => d.medication_id === medisin.id)
    .sort((a, b) => (a.tidspunkt ?? '').localeCompare(b.tidspunkt ?? ''))

  const tommeSlots = Math.max(0, Math.max(medisin.doser_per_dag, 1) - mine.length) + ekstra

  return (
    <div className="py-2.5">
      <div className="mb-0.5 flex items-center justify-between">
        <div>
          <div className="font-medium text-slate-800">{medisin.navn}</div>
          {medisin.formaal && <div className="text-xs text-slate-500">{medisin.formaal}</div>}
        </div>
        <button
          onClick={() => setEkstra((e) => e + 1)}
          className="rounded-lg px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
        >
          + Ny dose
        </button>
      </div>
      {mine.map((d) => (
        <DoseRad key={d.id} medisin={medisin} dato={dato} dose={d} />
      ))}
      {Array.from({ length: tommeSlots }).map((_, i) => (
        <DoseRad key={`ny-${mine.length}-${i}`} medisin={medisin} dato={dato} />
      ))}
    </div>
  )
}
