import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

/** Offentlig, skrivebeskyttet visning av en delt rapport (uten innlogging).
 *  RLS gir kun ut ikke-utløpte rader, så utløpt/ukjent lenke viser en melding. */
export function PublicRapportPage() {
  const { token } = useParams()
  const [html, setHtml] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!supabase || !token) {
      setHtml(null)
      return
    }
    let avbrutt = false
    ;(async () => {
      try {
        const { data } = await supabase!
          .from('report_shares')
          .select('html')
          .eq('id', token)
          .maybeSingle()
        if (!avbrutt) setHtml((data?.html as string | undefined) ?? null)
      } catch {
        if (!avbrutt) setHtml(null)
      }
    })()
    return () => {
      avbrutt = true
    }
  }, [token])

  if (html === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-400">
        Laster …
      </div>
    )
  }
  if (html === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-100 px-4 text-center">
        <div className="text-4xl" aria-hidden>
          🔒
        </div>
        <p className="text-slate-700">Lenken er utløpt eller finnes ikke.</p>
        <p className="max-w-sm text-sm text-slate-500">
          Delte rapporter er tilgjengelige i en begrenset periode. Be om en ny lenke.
        </p>
      </div>
    )
  }
  return <iframe srcDoc={html} title="Helserapport" className="h-screen w-full border-0" />
}
