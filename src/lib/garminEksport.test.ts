import { describe, expect, it } from 'vitest'
import { parseGarminEksport } from './garminEksport'

describe('parseGarminEksport', () => {
  it('slår sammen felter per dato på tvers av filer, og sekunder → minutter', () => {
    const uds = JSON.stringify([
      {
        calendarDate: '2026-01-01',
        restingHeartRate: 54,
        totalSteps: 8200,
        averageStressLevel: 28,
        bodyBatteryHighestValue: 85,
        bodyBatteryLowestValue: 18,
      },
      { calendarDate: '2026-01-02', restingHeartRate: 57, totalSteps: 5100 },
    ])
    const sleep = JSON.stringify([
      {
        calendarDate: '2026-01-01',
        sleepTimeSeconds: 27000, // 450 min
        deepSleepSeconds: 5400, // 90 min
        overallSleepScore: 78,
      },
    ])

    const rader = parseGarminEksport([
      { navn: 'UDSFile_1.json', tekst: uds },
      { navn: 'sleepData.json', tekst: sleep },
    ])

    expect(rader).toHaveLength(2)
    const d1 = rader.find((r) => r.dato === '2026-01-01')!
    expect(d1).toMatchObject({
      hvilepuls: 54,
      skritt: 8200,
      stress_snitt: 28,
      body_battery_hoy: 85,
      body_battery_lav: 18,
      sovn_min: 450,
      dyp_sovn_min: 90,
      sovn_score: 78,
    })
  })

  it('finner poster nøstet i objekter og hopper over ugyldig JSON', () => {
    const nøstet = JSON.stringify({ wrapper: { days: [{ calendarDate: '2026-02-10', totalSteps: 999 }] } })
    const rader = parseGarminEksport([
      { navn: 'a.json', tekst: nøstet },
      { navn: 'b.json', tekst: '{ ikke gyldig json' },
    ])
    expect(rader).toEqual([{ dato: '2026-02-10', skritt: 999 }])
  })

  it('kjenner alternative feltnavn, calendarDateLocal, sekund-varianter og vekt i gram', () => {
    const fil = JSON.stringify([
      {
        calendarDateLocal: '2026-04-01',
        restingHeartRateInBeatsPerMinute: 52,
        averageHeartRate: 68,
        deepSleepDurationInSeconds: 6000, // 100 min
        maxBodyBattery: 90,
        weight: 74200, // gram → 74,2 kg
      },
    ])
    const rader = parseGarminEksport([{ navn: 'x.json', tekst: fil }])
    expect(rader[0]).toMatchObject({
      dato: '2026-04-01',
      hvilepuls: 52,
      puls_snitt: 68,
      dyp_sovn_min: 100,
      body_battery_hoy: 90,
      vekt_kg: 74.2,
    })
  })

  it('ignorerer datoer uten målinger', () => {
    const bare = JSON.stringify([{ calendarDate: '2026-03-01', irrelevantFelt: 'x' }])
    expect(parseGarminEksport([{ navn: 'c.json', tekst: bare }])).toEqual([])
  })
})
