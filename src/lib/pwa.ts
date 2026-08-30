import { useEffect, useState } from 'react'

// PWA-installasjon: fang «beforeinstallprompt» (Android/Chrome) slik at vi kan
// tilby en installer-knapp, og oppdag iOS (som krever manuell «Legg til på
// hjemskjerm»).

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Hendelsen kan komme før React har montert – fang den på modulnivå.
let lagret: InstallPrompt | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    lagret = e as InstallPrompt
  })
}

export function erStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function erIOS(): boolean {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function useInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(lagret)
  const [installert, setInstallert] = useState(erStandalone())

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault()
      lagret = e as InstallPrompt
      setPrompt(lagret)
    }
    const onInstalled = () => {
      setInstallert(true)
      lagret = null
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function installer() {
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice
    lagret = null
    setPrompt(null)
  }

  return { kanInstallere: !!prompt && !installert, installer, installert, erIOS: erIOS() }
}
