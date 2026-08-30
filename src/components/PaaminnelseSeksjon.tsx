import { useState } from 'react'
import { hentPaaminnelse, settPaaminnelse } from '../lib/paaminnelse'
import { Card, Button, feltKlasse } from './ui'

const harVarsler = typeof window !== 'undefined' && 'Notification' in window

export function PaaminnelseSeksjon() {
  const [innst, setInnst] = useState(hentPaaminnelse)
  const [tillatelse, setTillatelse] = useState<string>(
    harVarsler ? Notification.permission : 'unsupported',
  )

  function oppdater(endring: Partial<typeof innst>) {
    const ny = { ...innst, ...endring }
    setInnst(ny)
    settPaaminnelse(ny)
  }

  async function beOmTillatelse() {
    if (!harVarsler) return
    const r = await Notification.requestPermission()
    setTillatelse(r)
    if (r === 'granted') new Notification('Helsetracker', { body: 'Varsler er på ✓' })
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-800">🔔 Påminnelser</h2>
      <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={innst.på}
          onChange={(e) => oppdater({ på: e.target.checked })}
        />
        Minn meg på å logge
      </label>

      {innst.på && (
        <>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Tidspunkt</span>
            <input
              type="time"
              value={innst.tid}
              onChange={(e) => oppdater({ tid: e.target.value })}
              className={`${feltKlasse} w-32`}
            />
          </label>

          {tillatelse !== 'granted' && harVarsler && (
            <div className="mt-3">
              <Button variant="secondary" onClick={beOmTillatelse}>
                Tillat varsler
              </Button>
              {tillatelse === 'denied' && (
                <p className="mt-1 text-xs text-red-600">
                  Varsler er blokkert i nettleseren – skru på for dette nettstedet i
                  nettleserinnstillingene.
                </p>
              )}
            </div>
          )}
          {!harVarsler && (
            <p className="mt-2 text-xs text-amber-700">
              Denne nettleseren støtter ikke varsler. Du ser uansett «gjenstår å logge» på hjem-skjermen.
            </p>
          )}

          <p className="mt-3 text-xs text-slate-400">
            Varselet vises når du åpner eller vender tilbake til appen etter tidspunktet, én gang
            per dag. Ekte bakgrunnsvarsler (mens appen er lukket) er begrenset i nettapper, særlig
            på iPhone.
          </p>
        </>
      )}
    </Card>
  )
}
