import { useMemo } from 'react'
import {
  useDoserPeriode,
  useHendelser,
  useMedisiner,
  useSymptomer,
  useSymptomOppfPeriode,
} from '../lib/db'
import { formaterDatoKort, iDag, leggTilDager } from '../lib/dates'
import { SideTittel, Card, TomTilstand } from '../components/ui'

const DAGER = 30

export function HistorikkPage() {
  const til = iDag()
  const fra = leggTilDager(til, -(DAGER - 1))

  const { data: medisiner = [] } = useMedisiner()
  const { data: symptomer = [] } = useSymptomer()
  const { data: doser = [] } = useDoserPeriode(fra, til)
  const { data: oppforinger = [] } = useSymptomOppfPeriode(fra, til)
  const { data: hendelser = [] } = useHendelser(fra, til)

  const medNavn = useMemo(() => new Map(medisiner.map((m) => [m.id, m])), [medisiner])
  const symNavn = useMemo(() => new Map(symptomer.map((s) => [s.id, s])), [symptomer])

  // Grupper alt per dato.
  const perDato = useMemo(() => {
    const kart = new Map<
      string,
      { doser: typeof doser; symptomer: typeof oppforinger; hendelser: typeof hendelser }
    >()
    const sikre = (d: string) => {
      if (!kart.has(d)) kart.set(d, { doser: [], symptomer: [], hendelser: [] })
      return kart.get(d)!
    }
    for (const d of doser) sikre(d.dato).doser.push(d)
    for (const o of oppforinger) sikre(o.dato).symptomer.push(o)
    for (const h of hendelser) sikre(h.dato).hendelser.push(h)
    return [...kart.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [doser, oppforinger, hendelser])

  return (
    <div className="space-y-4">
      <SideTittel tittel="Historikk" undertittel={`Siste ${DAGER} dager`} />

      {perDato.length === 0 ? (
        <TomTilstand
          ikon="📆"
          tittel="Ingen loggføringer ennå"
          tekst="Når du logger doser og symptomer på «I dag», dukker de opp her."
        />
      ) : (
        perDato.map(([d, innhold]) => (
          <Card key={d} className="p-4">
            <div className="mb-2 font-semibold text-slate-800">{formaterDatoKort(d)}</div>
            <div className="space-y-1.5 text-sm">
              {innhold.doser.map((dose) => (
                <div key={dose.id} className="flex justify-between gap-3 text-slate-600">
                  <span>💊 {medNavn.get(dose.medication_id)?.navn ?? 'Ukjent'}</span>
                  <span className="font-medium text-slate-800">
                    {dose.dose} {medNavn.get(dose.medication_id)?.enhet ?? ''}
                  </span>
                </div>
              ))}
              {innhold.symptomer.map((o) => {
                const s = symNavn.get(o.symptom_id)
                const verdi = s?.skala_type === 'ja_nei' ? (o.verdi ? 'Ja' : 'Nei') : o.verdi
                return (
                  <div key={o.id} className="flex justify-between gap-3 text-slate-600">
                    <span>🤒 {s?.navn ?? 'Ukjent'}</span>
                    <span className="font-medium text-slate-800">{verdi}</span>
                  </div>
                )
              })}
              {innhold.hendelser.map((h) => (
                <div key={h.id} className="text-slate-600">
                  📌 {h.tittel}
                  {h.notat ? ` – ${h.notat}` : ''}
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
