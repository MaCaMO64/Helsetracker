import { describe, expect, it } from 'vitest'
import { byggCsv, byggRapportHtml, type EksportData } from './eksport'
import type { Medisin, Symptom, Dose, SymptomOppforing, GarminDag } from './types'

function med(over: Partial<Medisin>): Medisin {
  return {
    id: 'm1',
    navn: 'Levaxin',
    formaal: 'stoffskifte',
    enhet: 'µg',
    standard_dose: 50,
    farge: null,
    aktiv: true,
    doser_per_dag: 1,
    sortering: 0,
    opprettet: '',
    ...over,
  }
}
function sym(over: Partial<Symptom>): Symptom {
  return {
    id: 's1',
    navn: 'Trøtthet',
    skala_type: 'skala_0_10',
    kategori: 'symptom',
    min_verdi: 0,
    maks_verdi: 10,
    farge: null,
    aktiv: true,
    sortering: 0,
    opprettet: '',
    ...over,
  }
}

const data: EksportData = {
  fra: '2026-01-01',
  til: '2026-01-03',
  generert: '2026-01-04 10:00',
  bruker: 'meg@epost.no',
  medisiner: [med({})],
  symptomer: [sym({})],
  doser: [
    { id: 'd1', medication_id: 'm1', dato: '2026-01-01', dose: 50, tidspunkt: null, notat: null, opprettet: '' },
    { id: 'd2', medication_id: 'm1', dato: '2026-01-02', dose: 75, tidspunkt: null, notat: null, opprettet: '' },
  ] as Dose[],
  oppforinger: [
    { id: 'o1', symptom_id: 's1', dato: '2026-01-02', verdi: 4, notat: null, opprettet: '' },
  ] as SymptomOppforing[],
  garmin: [
    { dato: '2026-01-02', hvilepuls: 58 } as GarminDag,
  ],
}

describe('byggCsv', () => {
  it('har header og én rad per dato', () => {
    const csv = byggCsv(data)
    const linjer = csv.split('\r\n')
    expect(linjer[0]).toContain('Dato')
    expect(linjer[0]).toContain('Levaxin (µg)')
    expect(linjer[0]).toContain('Trøtthet')
    expect(linjer).toHaveLength(1 + 3) // header + 3 dager
    expect(linjer[1]).toContain('2026-01-01')
    expect(linjer[2]).toContain('75') // dose 2026-01-02
  })
})

describe('byggRapportHtml', () => {
  it('lager HTML med doseendring og ansvarsfraskrivelse', () => {
    const html = byggRapportHtml(data)
    expect(html).toContain('<h1>Helserapport</h1>')
    expect(html).toContain('Levaxin')
    expect(html).toContain('50 → 75') // doseendring
    expect(html.toLowerCase()).toContain('ikke årsak') // forbehold
  })
})
