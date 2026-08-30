import { useState, type FormEvent } from 'react'
import {
  useLagreMedisin,
  useMedisiner,
  useSlettMedisin,
  type MedisinInn,
} from '../lib/db'
import type { Medisin } from '../lib/types'
import { Button, Card, Modal, feltKlasse } from './ui'

const ENHETER = ['µg', 'mg', 'ml', 'tablett', 'dråper', 'IE']

function tomForm(): MedisinInn {
  return { navn: '', formaal: '', enhet: 'µg', standard_dose: null, aktiv: true }
}

export function MedisinerSeksjon() {
  const { data: medisiner = [], isLoading } = useMedisiner()
  const lagre = useLagreMedisin()
  const slett = useSlettMedisin()
  const [redigerer, setRedigerer] = useState<MedisinInn | null>(null)

  function lagreForm(e: FormEvent) {
    e.preventDefault()
    if (!redigerer || !redigerer.navn.trim()) return
    lagre.mutate(
      { ...redigerer, navn: redigerer.navn.trim() },
      { onSuccess: () => setRedigerer(null) },
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">💊 Medisiner</h2>
        <Button variant="secondary" onClick={() => setRedigerer(tomForm())}>
          + Ny medisin
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Laster …</p>
      ) : medisiner.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ingen medisiner ennå. Legg til den første – f.eks. stoffskiftemedisinen din.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {medisiner.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{m.navn}</span>
                  {!m.aktiv && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">
                      inaktiv
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {[m.formaal, m.standard_dose != null && `${m.standard_dose} ${m.enhet}`]
                    .filter(Boolean)
                    .join(' · ') || m.enhet}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" onClick={() => setRedigerer(tilForm(m))}>
                  Rediger
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Slette «${m.navn}»? Loggede doser for denne slettes også.`))
                      slett.mutate(m.id)
                  }}
                >
                  🗑️
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        åpen={redigerer !== null}
        onClose={() => setRedigerer(null)}
        tittel={redigerer?.id ? 'Rediger medisin' : 'Ny medisin'}
      >
        {redigerer && (
          <form onSubmit={lagreForm} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Navn</span>
              <input
                autoFocus
                className={feltKlasse}
                value={redigerer.navn}
                onChange={(e) => setRedigerer({ ...redigerer, navn: e.target.value })}
                placeholder="f.eks. Levaxin"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Formål (valgfritt)</span>
              <input
                className={feltKlasse}
                value={redigerer.formaal ?? ''}
                onChange={(e) => setRedigerer({ ...redigerer, formaal: e.target.value })}
                placeholder="f.eks. stoffskifte"
              />
            </label>
            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="mb-1 block text-sm font-medium text-slate-700">Enhet</span>
                <select
                  className={feltKlasse}
                  value={redigerer.enhet}
                  onChange={(e) => setRedigerer({ ...redigerer, enhet: e.target.value })}
                >
                  {ENHETER.map((en) => (
                    <option key={en} value={en}>
                      {en}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block flex-1">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Standarddose (valgfritt)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  className={feltKlasse}
                  value={redigerer.standard_dose ?? ''}
                  onChange={(e) =>
                    setRedigerer({
                      ...redigerer,
                      standard_dose: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="f.eks. 50"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={redigerer.aktiv ?? true}
                onChange={(e) => setRedigerer({ ...redigerer, aktiv: e.target.checked })}
              />
              Aktiv (vises på «I dag»)
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setRedigerer(null)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={lagre.isPending || !redigerer.navn.trim()}>
                {lagre.isPending ? 'Lagrer …' : 'Lagre'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </Card>
  )
}

function tilForm(m: Medisin): MedisinInn {
  return {
    id: m.id,
    navn: m.navn,
    formaal: m.formaal ?? '',
    enhet: m.enhet,
    standard_dose: m.standard_dose,
    aktiv: m.aktiv,
    sortering: m.sortering,
  }
}
