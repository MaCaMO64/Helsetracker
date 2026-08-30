// Påminnelser om å logge. Ekte planlagte bakgrunnsvarsler er ikke pålitelig
// mulig i en PWA (særlig iOS), så dette er bevisst «catch-up»: vi varsler når
// appen åpnes/vises etter påminnelsestidspunktet, maks én gang per dag.
// Innstillinger lagres per enhet i localStorage.

import type { Dose, Medisin, Symptom, SymptomOppforing } from './types'

const NOKKEL = 'helsetracker:paaminnelse:v1'
const VARSLET = 'helsetracker:paaminnelse-sist:v1'

export interface PaaminnelseInnst {
  på: boolean
  tid: string // 'HH:MM'
}

export function hentPaaminnelse(): PaaminnelseInnst {
  try {
    const r = localStorage.getItem(NOKKEL)
    if (r) return { på: false, tid: '20:00', ...(JSON.parse(r) as Partial<PaaminnelseInnst>) }
  } catch {
    /* ignorer */
  }
  return { på: false, tid: '20:00' }
}

export function settPaaminnelse(p: PaaminnelseInnst): void {
  try {
    localStorage.setItem(NOKKEL, JSON.stringify(p))
  } catch {
    /* ignorer */
  }
}

export function sistVarslet(): string | null {
  try {
    return localStorage.getItem(VARSLET)
  } catch {
    return null
  }
}

export function settSistVarslet(dato: string): void {
  try {
    localStorage.setItem(VARSLET, dato)
  } catch {
    /* ignorer */
  }
}

/** Hva gjenstår å logge i dag (aktive medisiner/symptomer uten oppføring). */
export function gjenstaar(
  meds: Medisin[],
  symptomer: Symptom[],
  doser: Dose[],
  oppf: SymptomOppforing[],
) {
  const aktiveMed = meds.filter((m) => m.aktiv)
  const loggetMed = new Set(doser.map((d) => d.medication_id))
  const medMangler = aktiveMed.filter((m) => !loggetMed.has(m.id))

  const aktiveSym = symptomer.filter((s) => s.aktiv)
  const loggetSym = new Set(oppf.map((o) => o.symptom_id))
  const symMangler = aktiveSym.filter((s) => !loggetSym.has(s.id))

  const harDefinisjoner = aktiveMed.length + aktiveSym.length > 0
  return {
    medMangler,
    symMangler,
    harDefinisjoner,
    altLogget: harDefinisjoner && medMangler.length === 0 && symMangler.length === 0,
  }
}
