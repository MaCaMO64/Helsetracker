import { useState, type FormEvent } from 'react'
import {
  useLagreSymptom,
  useSlettSymptom,
  useSymptomer,
  type SymptomInn,
} from '../lib/db'
import type { Symptom } from '../lib/types'
import { Button, Card, Modal, feltKlasse } from './ui'

type Kategori = 'symptom' | 'faktor'

interface Config {
  tittel: string
  addLabel: string
  tomTekst: string
  standardSkala: string
  navnHint: string
}

const CONFIG: Record<Kategori, Config> = {
  symptom: {
    tittel: '🤒 Symptomer',
    addLabel: '+ Nytt symptom',
    tomTekst: 'Ingen symptomer ennå. Legg til det du vil følge – f.eks. trøtthet, kvalme, hjernetåke.',
    standardSkala: 'skala_0_10',
    navnHint: 'f.eks. Trøtthet',
  },
  faktor: {
    tittel: '🧭 Faktorer',
    addLabel: '+ Ny faktor',
    tomTekst:
      'Faktorer er ytre ting som kan påvirke effekten av medisinen – f.eks. kaffe nær tabletten, kalsium/jern, eller biotin-tilskudd.',
    standardSkala: 'ja_nei',
    navnHint: 'f.eks. Kaffe nær tablett',
  },
}

// Vanlige faktorer (fra forskningen) – tilbys som hurtigoppsett.
const VANLIGE_FAKTORER = [
  'Kaffe nær tablett',
  'Kalsium/jern nær tablett',
  'Biotin-tilskudd',
  'Glutenbrudd',
]

export function SymptomerSeksjon({ kategori = 'symptom' }: { kategori?: Kategori }) {
  const cfg = CONFIG[kategori]
  const { data: alle = [], isLoading } = useSymptomer()
  const lagre = useLagreSymptom()
  const slett = useSlettSymptom()
  const [redigerer, setRedigerer] = useState<SymptomInn | null>(null)

  const liste = alle.filter((s) => (s.kategori ?? 'symptom') === kategori)

  function tomForm(): SymptomInn {
    return { navn: '', skala_type: cfg.standardSkala, kategori, aktiv: true }
  }

  function lagreForm(e: FormEvent) {
    e.preventDefault()
    if (!redigerer || !redigerer.navn.trim()) return
    const jaNei = redigerer.skala_type === 'ja_nei'
    lagre.mutate(
      { ...redigerer, kategori, navn: redigerer.navn.trim(), min_verdi: 0, maks_verdi: jaNei ? 1 : 10 },
      { onSuccess: () => setRedigerer(null) },
    )
  }

  function leggTilVanlige() {
    const finnes = new Set(liste.map((s) => s.navn.toLowerCase()))
    for (const navn of VANLIGE_FAKTORER) {
      if (!finnes.has(navn.toLowerCase())) {
        lagre.mutate({ navn, kategori: 'faktor', skala_type: 'ja_nei', min_verdi: 0, maks_verdi: 1 })
      }
    }
  }

  const manglerVanlige =
    kategori === 'faktor' &&
    VANLIGE_FAKTORER.some((n) => !liste.some((s) => s.navn.toLowerCase() === n.toLowerCase()))

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">{cfg.tittel}</h2>
        <div className="flex gap-2">
          {manglerVanlige && (
            <Button variant="ghost" onClick={leggTilVanlige}>
              Legg til vanlige
            </Button>
          )}
          <Button variant="secondary" onClick={() => setRedigerer(tomForm())}>
            {cfg.addLabel}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Laster …</p>
      ) : liste.length === 0 ? (
        <p className="text-sm text-slate-500">{cfg.tomTekst}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {liste.map((s) => (
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
                <div className="text-xs text-slate-500">
                  {s.skala_type === 'ja_nei' ? 'Ja/Nei' : `Skala ${s.min_verdi}–${s.maks_verdi}`}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" onClick={() => setRedigerer(tilForm(s))}>
                  Rediger
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Slette «${s.navn}»? Loggede verdier slettes også.`)) slett.mutate(s.id)
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
        tittel={redigerer?.id ? `Rediger ${kategori}` : cfg.addLabel.replace('+ ', '')}
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
                placeholder={cfg.navnHint}
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
    kategori: s.kategori,
    min_verdi: s.min_verdi,
    maks_verdi: s.maks_verdi,
    aktiv: s.aktiv,
    sortering: s.sortering,
  }
}
