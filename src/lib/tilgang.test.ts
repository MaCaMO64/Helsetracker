import { describe, expect, it } from 'vitest'
import { hashEpost, normaliserEpost, sjekkTilgang } from './tilgang'

// Kjent SHA-256 for «test@example.com» (lowercase) – låser algoritmen.
const TEST_HASH = '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b'

describe('normaliserEpost', () => {
  it('trimmer og gjør om til små bokstaver', () => {
    expect(normaliserEpost('  Test@Example.COM ')).toBe('test@example.com')
    expect(normaliserEpost(null)).toBe('')
  })
})

describe('hashEpost', () => {
  it('gir kjent SHA-256, uavhengig av store bokstaver og mellomrom', async () => {
    expect(await hashEpost('test@example.com')).toBe(TEST_HASH)
    expect(await hashEpost('  TEST@Example.com  ')).toBe(TEST_HASH)
  })
})

describe('sjekkTilgang', () => {
  it('slipper inn alle når ingen lister er satt', async () => {
    expect(await sjekkTilgang('hvemsomhelst@x.no', [], [])).toBe(true)
  })

  it('godtar e-post som matcher hash', async () => {
    expect(await sjekkTilgang('test@example.com', [TEST_HASH], [])).toBe(true)
    expect(await sjekkTilgang('TEST@EXAMPLE.COM', [TEST_HASH], [])).toBe(true)
  })

  it('avviser e-post som ikke matcher', async () => {
    expect(await sjekkTilgang('annen@example.com', [TEST_HASH], [])).toBe(false)
    expect(await sjekkTilgang(null, [TEST_HASH], [])).toBe(false)
    expect(await sjekkTilgang('', [TEST_HASH], [])).toBe(false)
  })

  it('støtter klartekst-liste (lokal utvikling)', async () => {
    expect(await sjekkTilgang('a@b.no', [], ['a@b.no'])).toBe(true)
    expect(await sjekkTilgang('c@d.no', [], ['a@b.no'])).toBe(false)
  })

  it('godtar treff i én av listene', async () => {
    expect(await sjekkTilgang('a@b.no', [TEST_HASH], ['a@b.no'])).toBe(true)
    expect(await sjekkTilgang('test@example.com', [TEST_HASH], ['a@b.no'])).toBe(true)
  })
})
