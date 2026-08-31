import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { IdagPage } from './pages/IdagPage'
import { HistorikkPage } from './pages/HistorikkPage'
import { InnstillingerPage } from './pages/InnstillingerPage'
import { PublicRapportPage } from './pages/PublicRapportPage'

// Tunge sider lastes ved behov (Prøver drar inn pdf.js, Analyse drar inn grafene).
const ProverPage = lazy(() => import('./pages/ProverPage').then((m) => ({ default: m.ProverPage })))
const AnalysePage = lazy(() =>
  import('./pages/AnalysePage').then((m) => ({ default: m.AnalysePage })),
)

export default function App() {
  return (
    <Routes>
      {/* Offentlig, uten innloggingsgate */}
      <Route path="/r/:token" element={<PublicRapportPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<IdagPage />} />
        <Route path="/historikk" element={<HistorikkPage />} />
        <Route path="/prover" element={<ProverPage />} />
        <Route path="/analyse" element={<AnalysePage />} />
        <Route path="/innstillinger" element={<InnstillingerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
