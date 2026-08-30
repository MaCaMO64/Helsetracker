// Datohjelpere. Alt bruker LOKAL dato (ikke UTC) for å unngå off-by-one når
// klokka nærmer seg midnatt i norsk tidssone.

/** Dato-nøkkel «YYYY-MM-DD» fra et Date-objekt (lokal tid). */
export function datoNokkel(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dag = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dag}`
}

/** Dagens dato som «YYYY-MM-DD». */
export function iDag(): string {
  return datoNokkel(new Date())
}

/** Legg til (eller trekk fra) n dager på en «YYYY-MM-DD»-streng. */
export function leggTilDager(dato: string, n: number): string {
  const [y, m, d] = dato.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return datoNokkel(dt)
}

/** Antall dager mellom to «YYYY-MM-DD»-datoer (til − fra). */
export function dagerMellom(fra: string, til: string): number {
  const [fy, fm, fd] = fra.split('-').map(Number)
  const [ty, tm, td] = til.split('-').map(Number)
  const a = Date.UTC(fy, fm - 1, fd)
  const b = Date.UTC(ty, tm - 1, td)
  return Math.round((b - a) / 86_400_000)
}

/** Kort norsk visning, f.eks. «ons 30. aug». */
export function formaterDatoKort(dato: string): string {
  const [y, m, d] = dato.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('nb-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
