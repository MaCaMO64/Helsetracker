import { SideTittel, Card } from '../components/ui'

/** Analyse: sammenhenger mellom dose, symptomer og Garmin-data. Bygges i M5. */
export function AnalysePage() {
  return (
    <div>
      <SideTittel
        tittel="Analyse"
        undertittel="Mønstre å diskutere med legen – ikke bevis på årsak"
      />
      <Card className="p-6">
        <p className="text-sm text-slate-600">
          Her kommer tidsseriegrafer med doseendringer lagt oppå vitaler (hvilepuls, søvn,
          Body Battery) og symptomer, før/etter-sammenligning ved doseendring, og
          korrelasjon med valgbar tidsforskyvning. Til slutt eksport (CSV/PDF) for legen.
          Bygges i M5.
        </p>
      </Card>
    </div>
  )
}
