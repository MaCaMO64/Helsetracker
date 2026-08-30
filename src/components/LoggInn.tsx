import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { Button, Card } from './ui'

/** Innloggingsskjerm: magic link til e-post (ingen passord). Vises når ingen
 *  bruker er innlogget – hele appen krever innlogging (online-først, privat). */
export function LoggInn() {
  const { loggInn, konfigurert } = useAuth()
  const [epost, setEpost] = useState('')
  const [sender, setSender] = useState(false)
  const [sendt, setSendt] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!epost.trim()) return
    setSender(true)
    setFeil(null)
    const { error } = await loggInn(epost.trim())
    setSender(false)
    if (error) setFeil(error)
    else setSendt(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-5 flex flex-col items-center text-center">
          <span className="text-4xl" aria-hidden>
            💓
          </span>
          <h1 className="mt-2 text-xl font-bold text-slate-900">Helsetracker</h1>
          <p className="mt-1 text-sm text-slate-500">
            Følg medisindoser, symptomer og helsedata – logg inn for å komme i gang.
          </p>
        </div>

        {!konfigurert ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Innlogging er ikke satt opp ennå. Fyll inn <code>VITE_SUPABASE_URL</code> og{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> i <code>.env.local</code>.
          </p>
        ) : sendt ? (
          <div className="rounded-xl bg-teal-50 p-4 text-center text-sm text-teal-800">
            <p className="font-semibold">Sjekk e-posten din 📧</p>
            <p className="mt-1">
              Vi har sendt en innloggingslenke til <strong>{epost}</strong>. Åpne den på denne
              enheten for å logge inn.
            </p>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">E-post</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={epost}
                onChange={(e) => setEpost(e.target.value)}
                placeholder="din@epost.no"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              />
            </label>
            {feil && <p className="text-sm text-red-600">{feil}</p>}
            <Button type="submit" disabled={sender} className="w-full">
              {sender ? 'Sender …' : 'Send meg en innloggingslenke'}
            </Button>
            <p className="text-center text-xs text-slate-400">
              Ingen passord – du får en magisk lenke på e-post.
            </p>
          </form>
        )}
      </Card>
    </div>
  )
}
