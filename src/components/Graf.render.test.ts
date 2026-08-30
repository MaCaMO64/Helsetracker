import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Graf } from './Graf'
import { Spredning } from './Spredning'

// Røyktester: sikrer at graf-komponentene faktisk kjører (skalering, path-bygging)
// uten å kaste, og at de produserer forventet SVG-struktur.

describe('Graf', () => {
  it('rendrer SVG med linje og punkter for data', () => {
    const html = renderToStaticMarkup(
      createElement(Graf, {
        fra: '2026-01-01',
        til: '2026-01-10',
        venstre: {
          label: 'Dose',
          farge: '#0d9488',
          punkter: [
            { dato: '2026-01-01', verdi: 50 },
            { dato: '2026-01-05', verdi: 75 },
            { dato: '2026-01-10', verdi: 75 },
          ],
        },
        hoyre: {
          label: 'Hvilepuls',
          farge: '#6366f1',
          punkter: [
            { dato: '2026-01-02', verdi: 60 },
            { dato: '2026-01-08', verdi: 58 },
          ],
        },
        markorer: [{ dato: '2026-01-05' }],
      }),
    )
    expect(html).toContain('<svg')
    expect(html).toContain('<path')
    expect(html).toContain('<circle')
  })

  it('viser tomtilstand uten data', () => {
    const html = renderToStaticMarkup(
      createElement(Graf, {
        fra: '2026-01-01',
        til: '2026-01-10',
        venstre: { label: 'x', farge: '#000', punkter: [] },
      }),
    )
    expect(html).toContain('Ingen data')
  })
})

describe('Spredning', () => {
  it('rendrer punkter når det er nok par', () => {
    const html = renderToStaticMarkup(
      createElement(Spredning, {
        par: [
          { x: 1, y: 2 },
          { x: 2, y: 3 },
          { x: 3, y: 1 },
        ],
        xLabel: 'Dose',
        yLabel: 'Puls',
      }),
    )
    expect(html).toContain('<circle')
  })

  it('viser hjelpetekst ved for få par', () => {
    const html = renderToStaticMarkup(
      createElement(Spredning, { par: [{ x: 1, y: 2 }], xLabel: 'Dose', yLabel: 'Puls' }),
    )
    expect(html).toContain('For få datapunkter')
  })
})
