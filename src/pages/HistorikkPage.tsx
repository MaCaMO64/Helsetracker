import { SideTittel, Card } from '../components/ui'

/** Historikk: tidslinje over doser, symptomer og hendelser. Bygges i M2/M5. */
export function HistorikkPage() {
  return (
    <div>
      <SideTittel tittel="Historikk" undertittel="Doser, symptomer og hendelser over tid" />
      <Card className="p-6">
        <p className="text-sm text-slate-600">
          Her kommer en tidslinje/kalender over det du har logget, med markører for
          doseendringer og legebesøk. Bygges i M2/M5.
        </p>
      </Card>
    </div>
  )
}
