import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { eksporterAlt, lastNedJson, slettAlleData, slettKonto } from '../lib/konto'
import { iDag } from '../lib/dates'
import { Card, Button } from './ui'

export function KontoDataSeksjon() {
  const qc = useQueryClient()
  const { loggUt } = useAuth()
  const [jobber, setJobber] = useState<string | null>(null)
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null)

  async function eksporter() {
    setJobber('eksport')
    setMelding(null)
    try {
      lastNedJson(await eksporterAlt(), `helsetracker_data_${iDag()}.json`)
    } catch (e) {
      setMelding({ ok: false, tekst: (e as Error).message })
    } finally {
      setJobber(null)
    }
  }

  async function slettData() {
    if (
      !confirm(
        'Slette ALLE dine data (medisiner, doser, symptomer, faktorer, blodprøver, Garmin, hendelser, delinger)? Kontoen beholdes. Dette kan ikke angres.',
      )
    )
      return
    setJobber('slettdata')
    setMelding(null)
    try {
      await slettAlleData()
      await qc.invalidateQueries()
      setMelding({ ok: true, tekst: 'Alle data er slettet.' })
    } catch (e) {
      setMelding({ ok: false, tekst: (e as Error).message })
    } finally {
      setJobber(null)
    }
  }

  async function slettHele() {
    if (!confirm('Slette hele kontoen og ALLE data permanent? Du blir logget ut. Kan ikke angres.'))
      return
    setJobber('slettkonto')
    setMelding(null)
    const res = await slettKonto()
    if (res.error) {
      setMelding({ ok: false, tekst: res.error })
      setJobber(null)
      return
    }
    await loggUt()
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-800">Dine data</h2>
      <p className="mt-1 text-xs text-slate-500">
        Last ned alt du har lagret (GDPR-dataportabilitet), eller slett det.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={eksporter} disabled={jobber !== null}>
          {jobber === 'eksport' ? 'Eksporterer …' : '⬇️ Last ned alle data (JSON)'}
        </Button>
        <Button variant="secondary" onClick={slettData} disabled={jobber !== null}>
          {jobber === 'slettdata' ? 'Sletter …' : '🗑️ Slett alle data'}
        </Button>
        <Button variant="danger" onClick={slettHele} disabled={jobber !== null}>
          {jobber === 'slettkonto' ? 'Sletter …' : 'Slett konto helt'}
        </Button>
      </div>
      {melding && (
        <p className={`mt-2 text-sm ${melding.ok ? 'text-teal-700' : 'text-red-600'}`}>
          {melding.tekst}
        </p>
      )}
    </Card>
  )
}
