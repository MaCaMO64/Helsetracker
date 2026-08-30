// Les JSON-filene ut av en Garmin-dataeksport (.zip) i nettleseren. Bruker
// fflate og filtrerer til .json-filer, så vi slipper å pakke ut store FIT-filer.
import { unzip, strFromU8 } from 'fflate'

export function lesGarminZip(file: File): Promise<{ navn: string; tekst: string }[]> {
  return file.arrayBuffer().then(
    (ab) =>
      new Promise((res, rej) => {
        unzip(
          new Uint8Array(ab),
          { filter: (f) => f.name.toLowerCase().endsWith('.json') },
          (err, data) => {
            if (err) return rej(err)
            res(
              Object.entries(data).map(([navn, u8]) => ({
                navn,
                tekst: strFromU8(u8 as Uint8Array),
              })),
            )
          },
        )
      }),
  )
}
