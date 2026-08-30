import { useState, type FormEvent } from 'react'
import {
  useLagreSymptom,
  useSlettSymptom,
  useSymptomer,
  type SymptomInn,
} from '../lib/db'
import type { Symptom } from '../lib/types'
import { Button, Card, Modal, feltKlasse } from './ui'

function tomForm(): SymptomInn {
  return { navn: '', skala_type: 'skala_0_10', aktiv: true }
}

function skalaTekst(s: Symptom): string {
  return s.skala_type === 'ja_nei' ? 'Ja/Nei' : `Skala ${s.min_verdi}–${s.maks_verdi}`
}

export function SymptomerSeksjon() {
  const { data: symptomer = [], isLoading } = useSymptomer()
  const lagre = useLagreSymptom()
  const slett = useSlettSymptom()
  const [redigerer, setRedigerer] = useState<SymptomInn | null>(null)

  function lagreForm(e: FormEvent) {
    e.preventDefault()
    if (!redigerer || !redigerer.navn.trim()) return
    // Sett min/maks ut fra skalatype (0–10 eller 0/1 for ja/nei).
    const jaNei = redigerer.skala_type === 'ja_nei'
    lagre.mutate(
      {
        ...redigerer,
        navn: redigerer.navn.trim(),
        min_verdi: 0,
        maks_verdi: jaNei ? 1 : 10,
      },
      { onSuccess: () => setRedigerer(null) },
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">🤒 Symptomer</h2>
        <Button variant="secondary" onClick={() => setRedigerer(tomForm())}>
          + Nytt symptom
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Laster …</p>
      ) : symptomer.length === 0 ? (
        <p className="text-sm text-slate-500">
          Ingen symptomer ennå. Legg til det du vil følge – f.eks. trøtthet, kvalme, hjernetåke.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {symptomer.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{s.navn}</span>
                  {!s.aktiv && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">
                      inaktiv
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">{skalaTekst(s)}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" onClick={() => setRedigerer(tilForm(s))}>
                  Rediger
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Slette «${s.navn}»? Loggede verdier for dette slettes også.`))
                      slett.mutate(s.id)
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
        tittel={redigerer?.id ? 'Rediger symptom' : 'Nytt symptom'}
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
                placeholder="f.eks. Trøtthet"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Skala</span>
              <select
                className={feltKlasse}
                value={redigerer.skala_type}
                onChange={(e) => setRedigerer({ ...redigerer, skala_type: e.target.value })}
              >
                <option value="skala_0_10">Skala 0–10</option>
                <option value="ja_nei">Ja / Nei</option>
              </select>
            </label>
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

function tilForm(s: Symptom): SymptomInn {
  return {
    id: s.id,
    navn: s.navn,
    skala_type: s.skala_type,
    min_verdi: s.min_verdi,
    maks_verdi: s.maks_verdi,
    aktiv: s.aktiv,
    sortering: s.sortering,
  }
}
