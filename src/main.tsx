import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { get, set, del } from 'idb-keyval'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth.tsx'
import { APP_VERSJON } from './lib/versjon.ts'

// Online-først, men med ekte offline: React Query-cachen persisteres til
// IndexedDB, så appen kan åpnes uten nett og vise/logge mot siste kjente data.
// (Skriving går uansett via offline-køen i offlineKo.ts.)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
      gcTime: 1000 * 60 * 60 * 24 * 14, // behold i cache i 14 dager (må ≥ maxAge)
    },
  },
})

const persister = createAsyncStoragePersister({
  key: 'helsetracker-rq',
  storage: {
    getItem: (k) => get<string>(k).then((v) => v ?? null),
    setItem: (k, v) => set(k, v),
    removeItem: (k) => del(k),
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 14,
        buster: APP_VERSJON, // forkast persistert cache ved ny appversjon
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
)
