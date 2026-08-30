import { useEffect, useRef } from 'react'
import { useDoser, useMedisiner, useSymptomer, useSymptomOppforinger } from '../lib/db'
import { iDag } from '../lib/dates'
import { gjenstaar, hentPaaminnelse, settSistVarslet, sistVarslet } from '../lib/paaminnelse'

/** Usynlig: varsler (nettleservarsel) når appen åpnes/vises etter
 *  påminnelsestidspunktet og noe fortsatt ikke er logget – maks én gang per dag. */
export function Paaminnelse() {
  const dato = iDag()
  const { data: meds = [] } = useMedisiner()
  const { data: doser = [] } = useDoser(dato)
  const { data: symptomer = [] } = useSymptomer()
  const { data: oppf = [] } = useSymptomOppforinger(dato)

  const ref = useRef({ meds, doser, symptomer, oppf, dato })
  useEffect(() => {
    ref.current = { meds, doser, symptomer, oppf, dato }
  })

  useEffect(() => {
    function sjekk() {
      const p = hentPaaminnelse()
      if (!p.på) return
      if (!('Notification' in window) || Notification.permission !== 'granted') return
      const { dato: d, meds: m, doser: dz, symptomer: s, oppf: o } = ref.current
      if (sistVarslet() === d) return
      const nå = new Date()
      const [t, min] = p.tid.split(':').map(Number)
      const forbi = nå.getHours() > t || (nå.getHours() === t && nå.getMinutes() >= min)
      if (!forbi) return
      const g = gjenstaar(m, s, dz, o)
      if (g.altLogget || !g.harDefinisjoner) return
      new Notification('Helsetracker', {
        body: 'Husk å logge doser og symptomer for i dag.',
      })
      settSistVarslet(d)
    }

    sjekk()
    const onVis = () => {
      if (document.visibilityState === 'visible') sjekk()
    }
    document.addEventListener('visibilitychange', onVis)
    const id = window.setInterval(sjekk, 5 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(id)
    }
  }, [])

  return null
}
