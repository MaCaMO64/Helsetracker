import { describe, expect, it } from 'vitest'
import { finnProvedato, kanoniser, parseLabTekst, tilTall } from './blodprove'

describe('tilTall', () => {
  it('tolker norsk komma-desimal', () => {
    expect(tilTall('2,3')).toBe(2.3)
    expect(tilTall('0,04')).toBe(0.04)
    expect(tilTall('12')).toBe(12)
    expect(tilTall('abc')).toBeNull()
  })
})

describe('kanoniser', () => {
  it('normaliserer vanlige stoffskifte-analyser', () => {
    expect(kanoniser('S-TSH')).toBe('tsh')
    expect(kanoniser('Fritt T4')).toBe('ft4')
    expect(kanoniser('FT3')).toBe('ft3')
    expect(kanoniser('Anti-TPO')).toBe('anti_tpo')
    expect(kanoniser('Hemoglobin')).toBeNull()
  })
})

describe('parseLabTekst', () => {
  const tekst = `Analyse            Resultat   Enhet     Referanse
S-TSH              0,04       mIE/L     0,27 - 4,20
Fritt T4           23,5       pmol/L    12,0 - 22,0
Fritt T3           6,1        pmol/L    3,1 - 6,8
Anti-TPO           12         kIE/L     < 34
Prøvetakingsdato: 12.03.2026`

  it('trekker ut analyser med verdi, enhet og referanse', () => {
    const r = parseLabTekst(tekst)
    const tsh = r.find((x) => x.analyse_kanon === 'tsh')
    expect(tsh).toMatchObject({ verdi: 0.04, enhet: 'mIE/L', ref_lav: 0.27, ref_hoy: 4.2 })

    const ft4 = r.find((x) => x.analyse_kanon === 'ft4')
    expect(ft4).toMatchObject({ verdi: 23.5, enhet: 'pmol/L', ref_lav: 12, ref_hoy: 22 })

    // «< 34» skal tolkes som øvre referanse, ikke som verdien
    const tpo = r.find((x) => x.analyse_kanon === 'anti_tpo')
    expect(tpo).toMatchObject({ verdi: 12, ref_hoy: 34 })
  })

  it('hopper over overskrift og datolinje', () => {
    const r = parseLabTekst(tekst)
    expect(r.every((x) => /[A-Za-z]/.test(x.analyse))).toBe(true)
    expect(r.find((x) => x.analyse.toLowerCase().includes('analyse'))).toBeUndefined()
    expect(r).toHaveLength(4)
  })
})

describe('finnProvedato', () => {
  it('finner dato på norsk format', () => {
    expect(finnProvedato('Prøvetakingsdato: 12.03.2026')).toBe('2026-03-12')
    expect(finnProvedato('2026-03-12 kl 08:00')).toBe('2026-03-12')
    expect(finnProvedato('ingen dato her')).toBeNull()
  })
})
