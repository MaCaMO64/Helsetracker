import { describe, expect, it } from 'vitest'
import {
  besteLag,
  doseSumPerDag,
  finnDoseendringer,
  foerEtter,
  korrelasjonPerLag,
  pearson,
  sammenhengOrd,
  type Serie,
} from './analyse'

describe('pearson', () => {
  it('gir 1 / -1 for perfekt lineære data', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1)
    expect(pearson([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1)
  })
  it('null ved for få par eller ingen varians', () => {
    expect(pearson([1, 2], [1, 2])).toBeNull()
    expect(pearson([5, 5, 5], [1, 2, 3])).toBeNull()
  })
})

describe('doseSumPerDag', () => {
  it('summerer doser per dag for riktig medisin', () => {
    const doser = [
      { dato: '2026-01-01', dose: 50, medication_id: 'a' },
      { dato: '2026-01-01', dose: 25, medication_id: 'a' },
      { dato: '2026-01-02', dose: 50, medication_id: 'a' },
      { dato: '2026-01-01', dose: 10, medication_id: 'b' },
    ]
    expect(doseSumPerDag(doser, 'a')).toEqual([
      { dato: '2026-01-01', verdi: 75 },
      { dato: '2026-01-02', verdi: 50 },
    ])
  })
})

describe('finnDoseendringer', () => {
  it('finner dager der dosen endres', () => {
    const serie: Serie = [
      { dato: '2026-01-01', verdi: 50 },
      { dato: '2026-01-02', verdi: 50 },
      { dato: '2026-01-03', verdi: 75 },
      { dato: '2026-01-04', verdi: 100 },
    ]
    expect(finnDoseendringer(serie)).toEqual([
      { dato: '2026-01-03', fra: 50, til: 75 },
      { dato: '2026-01-04', fra: 75, til: 100 },
    ])
  })
})

describe('korrelasjonPerLag', () => {
  it('finner perfekt korrelasjon ved riktig forskyvning', () => {
    const a: Serie = [
      { dato: '2026-01-01', verdi: 1 },
      { dato: '2026-01-02', verdi: 2 },
      { dato: '2026-01-03', verdi: 3 },
    ]
    const b: Serie = [
      { dato: '2026-01-02', verdi: 1 },
      { dato: '2026-01-03', verdi: 2 },
      { dato: '2026-01-04', verdi: 3 },
    ]
    const res = korrelasjonPerLag(a, b, 1)
    expect(res[0]).toEqual({ lag: 0, r: null, n: 2 }) // for få par
    expect(res[1].lag).toBe(1)
    expect(res[1].n).toBe(3)
    expect(res[1].r).toBeCloseTo(1)
    expect(besteLag(res, 3)?.lag).toBe(1)
  })
})

describe('sammenhengOrd', () => {
  it('oversetter r til ord og retning uten tall', () => {
    expect(sammenhengOrd(null).ord).toBe('for lite data ennå')
    expect(sammenhengOrd(0.05)).toMatchObject({ styrke: 0, retning: null })
    expect(sammenhengOrd(0.3)).toMatchObject({ styrke: 1, retning: 'opp' })
    expect(sammenhengOrd(-0.5)).toMatchObject({ styrke: 2, retning: 'ned' })
    expect(sammenhengOrd(-0.9)).toMatchObject({ styrke: 3, retning: 'ned', ord: 'en sterk tendens' })
  })
})

describe('foerEtter', () => {
  it('sammenligner snitt før og etter, utelater endringsdagen', () => {
    const serie: Serie = [
      { dato: '2026-01-01', verdi: 10 },
      { dato: '2026-01-02', verdi: 10 },
      { dato: '2026-01-03', verdi: 99 }, // endringsdag – utelates
      { dato: '2026-01-04', verdi: 20 },
      { dato: '2026-01-05', verdi: 20 },
    ]
    const r = foerEtter(serie, '2026-01-03', 2)
    expect(r.foer).toBe(10)
    expect(r.etter).toBe(20)
    expect(r.diff).toBe(10)
    expect(r.nFoer).toBe(2)
    expect(r.nEtter).toBe(2)
  })
})
