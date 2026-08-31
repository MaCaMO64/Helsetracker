import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { useDelinger, useOpprettDeling, useSlettDeling } from '../lib/db'
import { formaterDatoKort } from '../lib/dates'
import type {
  Dose,
  GarminDag,
  LabResultat,
  Medisin,
  Symptom,
  SymptomOppforing,
} from '../lib/types'
import {
  byggCsv,
  byggRapportHtml,
  lastNedCsv,
  sendRapportPaaEpost,
  skrivUtRapport,
  type EksportData,
} from '../lib/eksport'
import { Button, Card, feltKlasse } from './ui'

export function EksportSeksjon(props: {
  fra: string
  til: string
  medisiner: Medisin[]
  symptomer: Symptom[]
  doser: Dose[]
  oppforinger: SymptomOppforing[]
  garmin: GarminDag[]
  labResultater: LabResultat[]
}) {
  const { bruker } = useAuth()
  const [epost, setEpost] = useState('')
  const [sender, setSender] = useState(false)
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null)

  const { data: delinger = [] } = useDelinger()
  const opprettDeling = useOpprettDeling()
  const slettDeling = useSlettDeling()
  const [kopiert, setKopiert] = useState<string | null>(null)

  function lagLenke() {
    opprettDeling.mutate({ html: byggRapportHtml(data()), dager: 30 })
  }
  function kopier(id: string, url: string) {
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setKopiert(id)
        setTimeout(() => setKopiert(null), 1500)
      })
      .catch(() => {})
  }

  function data(): EksportData {
    return {
      fra: props.fra,
      til: props.til,
      generert: new Date().toLocaleString('nb-NO'),
      bruker: bruker?.email ?? undefined,
      medisiner: props.medisiner,
      symptomer: props.symptomer,
      doser: props.doser,
      oppforinger: props.oppforinger,
      garmin: props.garmin,
      labResultater: props.labResultater,
    }
  }

  const filnavn = `helserapport_${props.fra}_${props.til}.csv`

  function lastNed() {
    lastNedCsv(byggCsv(data()), filnavn)
  }
  function skrivUt() {
    skrivUtRapport(byggRapportHtml(data()))
  }

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!epost.trim()) return
    setSender(true)
    setMelding(null)
    const d = data()
    const res = await sendRapportPaaEpost({
      epost: epost.trim(),
      emne: `Helserapport ${props.fra} – ${props.til}`,
      html: byggRapportHtml(d),
      csv: byggCsv(d),
      filnavn,
    })
    setSender(false)
    setMelding(
      res.error
        ? { ok: false, tekst: res.error }
        : { ok: true, tekst: `Rapport sendt til ${epost.trim()}.` },
    )
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">📄 Eksport til lege</h2>
      <p className="mb-3 text-xs text-slate-500">
        Rapport med doseendringer og før/etter-tall, pluss rådata som CSV. Perioden følger valget
        øverst.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={lastNed}>
          ⬇️ Last ned CSV
        </Button>
        <Button variant="secondary" onClick={skrivUt}>
          🖨️ Skriv ut / PDF
        </Button>
      </div>

      <form onSubmit={send} className="mt-4 border-t border-slate-100 pt-4">
        <label className="mb-1 block text-xs font-medium text-slate-700">Send på e-post</label>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={epost}
            onChange={(e) => setEpost(e.target.value)}
            placeholder="lege@eksempel.no"
            className={`${feltKlasse} flex-1`}
          />
          <Button type="submit" disabled={sender || !epost.trim()}>
            {sender ? 'Sender …' : 'Send'}
          </Button>
        </div>
        {melding && (
          <p className={`mt-2 text-sm ${melding.ok ? 'text-teal-700' : 'text-red-600'}`}>
            {melding.tekst}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Vanlig e-post er ikke kryptert. Send bare til en mottaker du stoler på.
        </p>
      </form>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-medium text-slate-700">Delbar lenke til lege</label>
          <Button variant="secondary" onClick={lagLenke} disabled={opprettDeling.isPending}>
            {opprettDeling.isPending ? 'Lager …' : 'Lag lenke (30 dager)'}
          </Button>
        </div>

        {delinger.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {delinger.map((d) => {
              const url = `${window.location.origin}/r/${d.id}`
              const utlopt = d.utloper != null && new Date(d.utloper) < new Date()
              return (
                <li key={d.id} className="flex items-center gap-2">
                  <input
                    readOnly
                    value={url}
                    onFocus={(e) => e.currentTarget.select()}
                    className={`${feltKlasse} flex-1 text-xs`}
                  />
                  <button
                    onClick={() => kopier(d.id, url)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                  >
                    {kopiert === d.id ? '✓' : 'Kopier'}
                  </button>
                  <span className="w-20 shrink-0 text-right text-[11px] text-slate-400">
                    {utlopt ? 'utløpt' : d.utloper ? `til ${formaterDatoKort(d.utloper.slice(0, 10))}` : ''}
                  </span>
                  <button
                    onClick={() => slettDeling.mutate(d.id)}
                    className="shrink-0 text-slate-300 hover:text-red-500"
                    aria-label="Opphev lenke"
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <p className="mt-2 text-xs text-slate-400">
          Et skrivebeskyttet øyeblikksbilde. Alle med lenken kan se rapporten til den utløper – del
          kun med legen din. Trykk ✕ for å oppheve.
        </p>
      </div>
    </Card>
  )
}
