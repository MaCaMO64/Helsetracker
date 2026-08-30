import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInstall } from '../lib/pwa'
import { Button, Modal } from './ui'

const NOKKEL = 'helsetracker:velkomst-sett:v1'
/** Custom event for å åpne guiden igjen (fra Innstillinger). */
export const VIS_VELKOMST = 'vis-velkomst'

const STEG = [
  {
    ikon: '💊',
    tittel: 'Definer det du vil følge',
    tekst:
      'Gå til Innstillinger og legg inn medisinene og symptomene dine – f.eks. stoffskiftemedisin, trøtthet og kvalme.',
  },
  {
    ikon: '📝',
    tittel: 'Logg hver dag',
    tekst:
      'På «I dag» taster du dagens doser og hvordan du føler deg. Det tar noen sekunder, og du kan også logge for gårsdagen.',
  },
  {
    ikon: '⌚',
    tittel: 'Koble til Garmin (valgfritt)',
    tekst:
      'Hvilepuls, søvn og energinivå kan hentes automatisk fra Garmin-klokka. Se GARMIN.md for oppsett.',
  },
  {
    ikon: '📊',
    tittel: 'Se mønstre – og del med legen',
    tekst:
      'Under Analyse ser du hvordan doseendringer henger sammen med hvordan du har det, forklart i vanlig språk. Eksporter en rapport til legetimen.',
  },
]

export function Velkomst() {
  const navigate = useNavigate()
  const [åpen, setÅpen] = useState(false)
  const { kanInstallere, installer, installert, erIOS } = useInstall()

  useEffect(() => {
    let sett = false
    try {
      sett = localStorage.getItem(NOKKEL) === '1'
    } catch {
      /* privat modus e.l. */
    }
    if (!sett) setÅpen(true)
    const vis = () => setÅpen(true)
    window.addEventListener(VIS_VELKOMST, vis)
    return () => window.removeEventListener(VIS_VELKOMST, vis)
  }, [])

  function lukk() {
    try {
      localStorage.setItem(NOKKEL, '1')
    } catch {
      /* ignorer */
    }
    setÅpen(false)
  }

  return (
    <Modal åpen={åpen} onClose={lukk} tittel="👋 Velkommen til Helsetracker">
      <p className="mb-4 text-sm text-slate-600">
        Følg hvordan endringer i medisindoser påvirker hvordan du har det – for å ta bedre
        samtaler med legen.
      </p>
      <ol className="space-y-3">
        {STEG.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="text-xl" aria-hidden>
              {s.ikon}
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {i + 1}. {s.tittel}
              </div>
              <p className="text-xs leading-relaxed text-slate-500">{s.tekst}</p>
            </div>
          </li>
        ))}
      </ol>

      {!installert && (kanInstallere || erIOS) && (
        <div className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
          {kanInstallere ? (
            <div className="flex items-center justify-between gap-2">
              <span>Installer appen på hjemskjermen for rask tilgang.</span>
              <Button onClick={installer}>Installer</Button>
            </div>
          ) : (
            <span>📱 På iPhone: trykk Del-knappen og velg «Legg til på hjemskjerm».</span>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            lukk()
            navigate('/innstillinger')
          }}
        >
          Åpne Innstillinger
        </Button>
        <Button variant="secondary" onClick={lukk}>
          Kom i gang
        </Button>
      </div>
    </Modal>
  )
}
