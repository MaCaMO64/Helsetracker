import { useEffect, useState } from 'react'

/** Slankt varsel når enheten er offline – bekrefter at logging køes trygt. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine)

  useEffect(() => {
    const på = () => setOffline(false)
    const av = () => setOffline(true)
    window.addEventListener('online', på)
    window.addEventListener('offline', av)
    return () => {
      window.removeEventListener('online', på)
      window.removeEventListener('offline', av)
    }
  }, [])

  if (!offline) return null
  return (
    <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-800">
      📴 Du er offline – logging lagres og sendes automatisk når nettet er tilbake.
    </div>
  )
}
