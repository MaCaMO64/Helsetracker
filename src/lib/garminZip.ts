// Les JSON-filene ut av en Garmin-dataeksport (.zip) i nettleseren. fflate
// dynamisk-importeres først når en zip faktisk lastes opp. Filtrerer til
// .json-filer, så vi slipper å pakke ut store FIT-filer.

export async function lesGarminZip(file: File): Promise<{ navn: string; tekst: string }[]> {
  const { unzip, strFromU8 } = await import('fflate')
  const ab = await file.arrayBuffer()
  return new Promise((res, rej) => {
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
  })
}
