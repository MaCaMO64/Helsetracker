// Lokal PDF-tekstuttrekk (pdf.js) – kjører i nettleseren, ingen data ut.
// Rekonstruerer linjer ut fra tekstens y-posisjon så tabell-strukturen bevares
// for blodprøve-parseren.
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

interface TekstItem {
  str: string
  transform: number[]
}

export async function lesPdfTekst(file: File): Promise<string> {
  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise
  let ut = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const side = await pdf.getPage(i)
    const innhold = await side.getTextContent()
    const items = innhold.items as TekstItem[]

    // Grupper i linjer etter y-posisjon (avrundet), sorter linjer topp→bunn.
    const linjer = new Map<number, { x: number; str: string }[]>()
    for (const it of items) {
      if (!it.str.trim()) continue
      const y = Math.round(it.transform[5] / 2) * 2
      if (!linjer.has(y)) linjer.set(y, [])
      linjer.get(y)!.push({ x: it.transform[4], str: it.str })
    }
    for (const [, arr] of [...linjer.entries()].sort((a, b) => b[0] - a[0])) {
      arr.sort((a, b) => a.x - b.x)
      ut += arr.map((a) => a.str).join(' ').replace(/\s+/g, ' ').trim() + '\n'
    }
  }
  return ut
}
