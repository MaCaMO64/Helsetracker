import { SideTittel, Card } from '../components/ui'

/** «I dag»: rask inntasting av dagens doser + symptomer. Bygges i M2. */
export function IdagPage() {
  const iDag = new Date().toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return (
    <div>
      <SideTittel tittel="I dag" undertittel={iDag} />
      <Card className="p-6">
        <p className="text-sm text-slate-600">
          Her kommer rask logging av dagens <strong>medisindoser</strong> og{' '}
          <strong>symptomer</strong> (kvalme, trøtthet, energinivå …). Bygges i M2.
        </p>
      </Card>
    </div>
  )
}
