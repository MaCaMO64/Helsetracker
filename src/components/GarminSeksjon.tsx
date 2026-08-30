import { useState, type ChangeEvent } from 'react'
import { useLagreGarminDager, useSisteSynk } from '../lib/db'
import { dagerMellom, datoNokkel, formaterDatoKort, iDag } from '../lib/dates'
import { lesGarminZip } from '../lib/garminZip'
import { parseGarminEksport, type GarminDagInn } from '../lib/garminEksport'
import { Card, Button } from './ui'

/** Garmin: synk-status (dødmannsknapp) + bulk-import fra manuell dataeksport. */
export function GarminSeksjon() {
  const { data: synk, isLoading } = useSisteSynk()
  const lagreDager = useLagreGarminDager()

  const [bulk, setBulk] = useState<{ rader: GarminDagInn[]; fra: string; til: string } | null>(null)
  const [laster, setLaster] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function håndterZip(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFeil(null)
    setInfo(null)
    setBulk(null)
    setLaster(true)
    try {
      const filer = await lesGarminZip(file)
      const rader = parseGarminEksport(filer)
      if (rader.length === 0) {
        setFeil('Fant ingen dagsdata i zip-en. Er det riktig fil («Be om dataeksport» fra Garmin)?')
      } else {
        setBulk({ rader, fra: rader[0].dato, til: rader[rader.length - 1].dato })
      }
    } catch {
      setFeil('Klarte ikke å lese zip-fila.')
    } finally {
      setLaster(false)
    }
  }

  async function importer() {
    if (!bulk) return
    const n = await lagreDager.mutateAsync(bulk.rader as unknown as Record<string, unknown>[])
    setBulk(null)
    setInfo(`Importerte ${n} dager med Garmin-data.`)
  }

  let status
  if (isLoading) {
    status = <p className="text-sm text-slate-400">Laster …</p>
  } else if (!synk) {
    status = (
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
        Ingen automatisk Garmin-synk ennå. Se <code>GARMIN.md</code> for oppsett – eller importer
        historikk manuelt nedenfor.
      </p>
    )
  } else {
    const synkDato = datoNokkel(new Date(synk.kjort_kl))
    const dagerSiden = dagerMellom(synkDato, iDag())
    const naar = dagerSiden <= 0 ? 'i dag' : dagerSiden === 1 ? 'i går' : `for ${dagerSiden} dager siden`
    if (synk.status === 'feil') {
      status = (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          <p className="font-semibold">Siste synk feilet ({naar})</p>
          {synk.melding && <p className="mt-1">{synk.melding}</p>}
        </div>
      )
    } else {
      const gammel = dagerSiden > 2
      status = (
        <div
          className={`rounded-xl p-3 text-sm ${
            gammel ? 'bg-amber-50 text-amber-800' : 'bg-teal-50 text-teal-800'
          }`}
        >
          <p className="font-semibold">
            Siste vellykkede synk: {naar} ({formaterDatoKort(synkDato)})
          </p>
          {gammel && <p className="mt-1">Ingen ny data på {dagerSiden} dager – sjekk GitHub Actions.</p>}
        </div>
      )
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-2 text-sm font-semibold text-slate-800">⌚ Garmin</h2>
      {status}

      {/* Bulk-import fra manuell dataeksport */}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-medium text-slate-700">Importer historikk (dataeksport)</h3>
        <p className="mt-1 text-xs text-slate-500">
          På Garmin Connect: Kontoinnstillinger → «Be om dataeksport». Last opp zip-fila her – den
          leses lokalt på enheten.
        </p>
        <input
          type="file"
          accept=".zip,application/zip"
          onChange={håndterZip}
          className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        {laster && <p className="mt-2 text-sm text-slate-500">Leser zip …</p>}
        {feil && <p className="mt-2 text-sm text-red-600">{feil}</p>}
        {info && !feil && <p className="mt-2 text-sm text-teal-700">{info}</p>}

        {bulk && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
            <p className="text-slate-700">
              Fant <strong>{bulk.rader.length} dager</strong> ({formaterDatoKort(bulk.fra)} –{' '}
              {formaterDatoKort(bulk.til)}).
            </p>
            <div className="mt-2 flex gap-2">
              <Button onClick={importer} disabled={lagreDager.isPending}>
                {lagreDager.isPending ? 'Importerer …' : 'Importer'}
              </Button>
              <Button variant="secondary" onClick={() => setBulk(null)}>
                Avbryt
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Automatisk synk kjører hver morgen; kjør manuelt eller hent nyere historikk via GitHub →
        Actions → «Garmin-synk».
      </p>
    </Card>
  )
}
