import { beforeEach, describe, expect, it } from 'vitest'
import {
  erNettverksfeil,
  fjernFraKo,
  flushKo,
  hentKo,
  leggIKo,
  tomKo,
  type KoElement,
} from './offlineKo'

// Enkel in-memory localStorage-mock for node-miljøet.
function mockLocalStorage() {
  const kart = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => kart.get(k) ?? null,
    setItem: (k: string, v: string) => void kart.set(k, v),
    removeItem: (k: string) => void kart.delete(k),
    clear: () => kart.clear(),
    key: () => null,
    length: 0,
  } as Storage
}

function element(id: string): KoElement {
  return {
    id,
    tabell: 'medication_doses',
    konflikt: 'id',
    rad: { id, dose: 50 },
    opprettet: '2026-08-30T10:00:00Z',
  }
}

describe('offlineKo – lagring', () => {
  beforeEach(() => {
    mockLocalStorage()
    tomKo()
  })

  it('legger til og henter i rekkefølge', () => {
    leggIKo(element('a'))
    leggIKo(element('b'))
    expect(hentKo().map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('fjerner ett element', () => {
    leggIKo(element('a'))
    leggIKo(element('b'))
    fjernFraKo('a')
    expect(hentKo().map((e) => e.id)).toEqual(['b'])
  })

  it('tømmer køen', () => {
    leggIKo(element('a'))
    tomKo()
    expect(hentKo()).toEqual([])
  })
})

describe('erNettverksfeil', () => {
  it('kjenner igjen typiske nettverksfeil', () => {
    expect(erNettverksfeil(new Error('Failed to fetch'))).toBe(true)
    expect(erNettverksfeil({ message: 'NetworkError when attempting' })).toBe(true)
    expect(erNettverksfeil(new Error('Load failed'))).toBe(true)
  })
  it('regner andre feil som ikke-nettverk', () => {
    expect(erNettverksfeil(new Error('duplicate key value'))).toBe(false)
    expect(erNettverksfeil(null)).toBe(false)
  })
})

describe('flushKo', () => {
  beforeEach(() => {
    mockLocalStorage()
    tomKo()
  })

  it('sender alle ved suksess og tømmer køen', async () => {
    leggIKo(element('a'))
    leggIKo(element('b'))
    const klient = { from: () => ({ upsert: async () => ({ error: null }) }) }
    const res = await flushKo(klient)
    expect(res).toEqual({ sendt: 2, gjenstar: 0 })
    expect(hentKo()).toEqual([])
  })

  it('stopper ved nettverksfeil og beholder resten', async () => {
    leggIKo(element('a'))
    leggIKo(element('b'))
    const klient = { from: () => ({ upsert: async () => ({ error: { message: 'Failed to fetch' } }) }) }
    const res = await flushKo(klient)
    expect(res.sendt).toBe(0)
    expect(hentKo().map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('dropper element ved ekte (ikke-nettverks) feil', async () => {
    leggIKo(element('a'))
    leggIKo(element('b'))
    const klient = { from: () => ({ upsert: async () => ({ error: { message: 'invalid input' } }) }) }
    const res = await flushKo(klient)
    expect(res.sendt).toBe(2)
    expect(hentKo()).toEqual([])
  })
})
