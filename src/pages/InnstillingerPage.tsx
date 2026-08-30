import { useAuth } from '../lib/auth'
import { APP_VERSJON } from '../lib/versjon'
import { SideTittel, Card, Button } from '../components/ui'
import { MedisinerSeksjon } from '../components/MedisinerSeksjon'
import { SymptomerSeksjon } from '../components/SymptomerSeksjon'
import { GarminSeksjon } from '../components/GarminSeksjon'

export function InnstillingerPage() {
  const { bruker, loggUt } = useAuth()
  return (
    <div className="space-y-4">
      <SideTittel tittel="Innstillinger" />

      <MedisinerSeksjon />
      <SymptomerSeksjon />
      <GarminSeksjon />

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-800">Konto</h2>
        <p className="mt-1 text-sm text-slate-500">
          Innlogget som <strong>{bruker?.email ?? 'ukjent'}</strong>
        </p>
        <div className="mt-3">
          <Button variant="secondary" onClick={loggUt}>
            Logg ut
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-800">Kommer</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-500">
          <li>Analyse: grafer, doseendring-markører og korrelasjon (M5)</li>
          <li>Eksport til lege: CSV/PDF (M6)</li>
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-800">Om personvern</h2>
        <p className="mt-1 text-sm text-slate-500">
          Dette er private helsedata. De lagres i din egen Supabase-database (EU-region) og
          deles ikke med andre tjenester. Ingen data sendes til AI-leverandører.
        </p>
      </Card>

      <p className="px-1 text-center text-xs text-slate-400">Helsetracker {APP_VERSJON}</p>
    </div>
  )
}
