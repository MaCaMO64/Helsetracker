import { useSisteSynk } from '../lib/db'
import { dagerMellom, datoNokkel, formaterDatoKort, iDag } from '../lib/dates'
import { Card } from './ui'

/** Viser status for Garmin-synken – en «dødmannsknapp»: hvis det er lenge siden
 *  siste vellykkede synk, varsles det tydelig. */
export function GarminSeksjon() {
  const { data: synk, isLoading } = useSisteSynk()

  let innhold
  if (isLoading) {
    innhold = <p className="text-sm text-slate-400">Laster …</p>
  } else if (!synk) {
    innhold = (
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
        Ingen Garmin-synk ennå. Se <code>GARMIN.md</code> for oppsett (token + GitHub-secrets).
      </p>
    )
  } else {
    const synkDato = datoNokkel(new Date(synk.kjort_kl))
    const dagerSiden = dagerMellom(synkDato, iDag())
    const naarTekst =
      dagerSiden <= 0 ? 'i dag' : dagerSiden === 1 ? 'i går' : `for ${dagerSiden} dager siden`

    if (synk.status === 'feil') {
      innhold = (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          <p className="font-semibold">Siste synk feilet ({naarTekst})</p>
          {synk.melding && <p className="mt-1">{synk.melding}</p>}
        </div>
      )
    } else {
      const gammel = dagerSiden > 2
      innhold = (
        <div
          className={`rounded-xl p-3 text-sm ${
            gammel ? 'bg-amber-50 text-amber-800' : 'bg-teal-50 text-teal-800'
          }`}
        >
          <p className="font-semibold">
            Siste vellykkede synk: {naarTekst} ({formaterDatoKort(synkDato)})
          </p>
          {synk.antall_dager != null && (
            <p className="mt-0.5">{synk.melding ?? `${synk.antall_dager} dager`}</p>
          )}
          {gammel && (
            <p className="mt-1">
              Ingen ny data på {dagerSiden} dager – sjekk kjøringene i GitHub Actions.
            </p>
          )}
        </div>
      )
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-2 text-sm font-semibold text-slate-800">⌚ Garmin</h2>
      {innhold}
      <p className="mt-2 text-xs text-slate-400">
        Synken kjører automatisk hver morgen. Kjør manuelt eller hent historikk via GitHub →
        Actions → «Garmin-synk».
      </p>
    </Card>
  )
}
