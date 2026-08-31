import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { APP_VERSJON } from '../lib/versjon'
import { hentAiNokkel, settAiNokkel } from '../lib/aiNokkel'
import { SideTittel, Card, Button, feltKlasse } from '../components/ui'
import { MedisinerSeksjon } from '../components/MedisinerSeksjon'
import { SymptomerSeksjon } from '../components/SymptomerSeksjon'
import { GarminSeksjon } from '../components/GarminSeksjon'
import { PaaminnelseSeksjon } from '../components/PaaminnelseSeksjon'
import { KontoDataSeksjon } from '../components/KontoDataSeksjon'
import { VIS_VELKOMST } from '../components/Velkomst'
import { useInstall } from '../lib/pwa'

export function InnstillingerPage() {
  const { bruker, loggUt } = useAuth()
  const { kanInstallere, installer, installert, erIOS } = useInstall()
  const [aiNokkel, setAiNokkelLokal] = useState(hentAiNokkel())
  return (
    <div className="space-y-4">
      <SideTittel tittel="Innstillinger" />

      <MedisinerSeksjon />
      <SymptomerSeksjon kategori="symptom" />
      <SymptomerSeksjon kategori="faktor" />
      <GarminSeksjon />
      <PaaminnelseSeksjon />

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-800">🔬 Bildeimport (AI)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Kun nødvendig hvis du vil tolke blodprøve-<em>skjermbilder</em> automatisk (PDF-er med
          tekst leses uten AI). Nøkkelen lagres kun på denne enheten – aldri i databasen.
        </p>
        <input
          type="password"
          value={aiNokkel}
          onChange={(e) => {
            setAiNokkelLokal(e.target.value)
            settAiNokkel(e.target.value)
          }}
          placeholder="API-nøkkel (f.eks. OpenRouter)"
          className={`${feltKlasse} mt-2`}
        />
      </Card>

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

      <KontoDataSeksjon />

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-800">📱 Appen</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {!installert && kanInstallere && (
            <Button variant="secondary" onClick={installer}>
              Installer på hjemskjerm
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => window.dispatchEvent(new Event(VIS_VELKOMST))}
          >
            Vis «kom i gang»-guide
          </Button>
        </div>
        {installert ? (
          <p className="mt-2 text-xs text-slate-500">Appen er installert på denne enheten ✓</p>
        ) : (
          !kanInstallere &&
          erIOS && (
            <p className="mt-2 text-xs text-slate-500">
              På iPhone: trykk Del-knappen og velg «Legg til på hjemskjerm».
            </p>
          )
        )}
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
