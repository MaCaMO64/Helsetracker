import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDoser, useMedisiner, useSymptomer, useSymptomOppforinger } from '../lib/db'
import { formaterDatoKort, iDag, leggTilDager } from '../lib/dates'
import { SideTittel, Card, Button, TomTilstand } from '../components/ui'
import { DoseLogger } from '../components/DoseLogger'
import { SymptomLogger } from '../components/SymptomLogger'

export function IdagPage() {
  const [dato, setDato] = useState(iDag())
  const erIdag = dato === iDag()

  const { data: medisiner = [], isLoading: lasterMed } = useMedisiner()
  const { data: symptomer = [], isLoading: lasterSym } = useSymptomer()
  const { data: doser = [] } = useDoser(dato)
  const { data: oppforinger = [] } = useSymptomOppforinger(dato)

  const aktiveMed = medisiner.filter((m) => m.aktiv)
  const aktiveSym = symptomer.filter((s) => s.aktiv && (s.kategori ?? 'symptom') === 'symptom')
  const aktiveFaktorer = symptomer.filter((s) => s.aktiv && s.kategori === 'faktor')
  const laster = lasterMed || lasterSym
  const ingenDefinisjoner =
    !laster && aktiveMed.length === 0 && aktiveSym.length === 0 && aktiveFaktorer.length === 0

  return (
    <div className="space-y-4">
      <SideTittel tittel="I dag" />

      {/* Datovelger */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => setDato(leggTilDager(dato, -1))}>
          ← Forrige
        </Button>
        <div className="text-center">
          <div className="font-semibold text-slate-800">
            {erIdag ? 'I dag' : formaterDatoKort(dato)}
          </div>
          {!erIdag && (
            <button className="text-xs text-teal-600" onClick={() => setDato(iDag())}>
              Gå til i dag
            </button>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={() => setDato(leggTilDager(dato, 1))}
          disabled={erIdag}
        >
          Neste →
        </Button>
      </div>

      {ingenDefinisjoner ? (
        <TomTilstand
          ikon="💊"
          tittel="Ingenting å logge ennå"
          tekst="Legg inn medisinene og symptomene du vil følge, så dukker de opp her for daglig logging."
          handling={
            <Link to="/innstillinger">
              <Button>Åpne Innstillinger</Button>
            </Link>
          }
        />
      ) : (
        <>
          {aktiveMed.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-1 text-sm font-semibold text-slate-800">💊 Doser</h2>
              <div className="divide-y divide-slate-100">
                {aktiveMed.map((m) => (
                  <DoseLogger
                    key={m.id}
                    medisin={m}
                    dose={doser.find((d) => d.medication_id === m.id)}
                    dato={dato}
                  />
                ))}
              </div>
            </Card>
          )}

          {aktiveSym.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-1 text-sm font-semibold text-slate-800">🤒 Symptomer</h2>
              <div className="divide-y divide-slate-100">
                {aktiveSym.map((s) => (
                  <SymptomLogger
                    key={s.id}
                    symptom={s}
                    oppforing={oppforinger.find((o) => o.symptom_id === s.id)}
                    dato={dato}
                  />
                ))}
              </div>
            </Card>
          )}

          {aktiveFaktorer.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-1 text-sm font-semibold text-slate-800">🧭 Faktorer</h2>
              <div className="divide-y divide-slate-100">
                {aktiveFaktorer.map((s) => (
                  <SymptomLogger
                    key={s.id}
                    symptom={s}
                    oppforing={oppforinger.find((o) => o.symptom_id === s.id)}
                    dato={dato}
                  />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
