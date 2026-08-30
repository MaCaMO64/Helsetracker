import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useOfflineFlush } from '../lib/db'
import { APP_VERSJON } from '../lib/versjon'
import { LoggInn } from './LoggInn'

const nav = [
  { to: '/', label: 'I dag', ikon: '📝', end: true },
  { to: '/historikk', label: 'Historikk', ikon: '📆', end: false },
  { to: '/analyse', label: 'Analyse', ikon: '📊', end: false },
  { to: '/innstillinger', label: 'Innstillinger', ikon: '⚙️', end: false },
]

export function Layout() {
  const { laster, session } = useAuth()
  useOfflineFlush() // sender køede offline-skrivinger ved oppstart / når nettet er tilbake

  // Innloggingsgate: hele appen krever innlogging (online-først, privat helsedata).
  if (laster) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-400">
        Laster …
      </div>
    )
  }
  if (!session) return <LoggInn />

  return (
    <div className="min-h-full bg-slate-100">
      {/* Toppheader */}
      <header className="safe-top sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              💓
            </span>
            <span className="text-lg font-bold text-slate-900">Helsetracker</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              {APP_VERSJON}
            </span>
          </div>
          {/* Desktop-nav */}
          <nav className="hidden gap-1 md:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Innhold */}
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:pb-10">
        <Outlet />
      </main>

      {/* Mobil bunnavigasjon */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white md:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition ${
                  isActive ? 'text-teal-600' : 'text-slate-500'
                }`
              }
            >
              <span className="text-xl" aria-hidden>
                {n.ikon}
              </span>
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
