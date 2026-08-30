import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { IdagPage } from './pages/IdagPage'
import { HistorikkPage } from './pages/HistorikkPage'
import { ProverPage } from './pages/ProverPage'
import { AnalysePage } from './pages/AnalysePage'
import { InnstillingerPage } from './pages/InnstillingerPage'

export default function App() {
  return (
    <Routes>
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
