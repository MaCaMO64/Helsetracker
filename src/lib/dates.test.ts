import { describe, expect, it } from 'vitest'
import { dagerMellom, datoNokkel, leggTilDager } from './dates'

describe('datoNokkel', () => {
  it('gir lokal YYYY-MM-DD (ikke UTC)', () => {
    // 30. aug 2026 kl 23:30 lokal tid skal fortsatt bli 2026-08-30.
    expect(datoNokkel(new Date(2026, 7, 30, 23, 30))).toBe('2026-08-30')
    expect(datoNokkel(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })
})

describe('leggTilDager', () => {
  it('legger til og trekker fra dager, håndterer månedsskifte', () => {
    expect(leggTilDager('2026-08-30', 2)).toBe('2026-09-01')
    expect(leggTilDager('2026-03-01', -1)).toBe('2026-02-28')
    expect(leggTilDager('2026-01-01', 0)).toBe('2026-01-01')
  })
})

describe('dagerMellom', () => {
  it('teller dager mellom datoer', () => {
    expect(dagerMellom('2026-08-30', '2026-09-01')).toBe(2)
    expect(dagerMellom('2026-01-01', '2026-01-01')).toBe(0)
    expect(dagerMellom('2026-09-01', '2026-08-30')).toBe(-2)
  })
})
