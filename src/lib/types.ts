// Domenetyper – speiler tabellene i supabase/migrations/0001_init.sql.
// user_id utelates bevisst: det settes automatisk (default auth.uid()) og
// filtreres av RLS, så klienten trenger det ikke.

export interface Medisin {
  id: string
  navn: string
  formaal: string | null
  enhet: string
  standard_dose: number | null
  farge: string | null
  aktiv: boolean
  sortering: number
  opprettet: string
}

export interface Dose {
  id: string
  medication_id: string
  dato: string
  dose: number
  tidspunkt: string | null
  notat: string | null
  opprettet: string
}

export interface Symptom {
  id: string
  navn: string
  skala_type: string
  min_verdi: number
  maks_verdi: number
  farge: string | null
  aktiv: boolean
  sortering: number
  opprettet: string
}

export interface SymptomOppforing {
  id: string
  symptom_id: string
  dato: string
  verdi: number
  notat: string | null
  opprettet: string
}

export interface Hendelse {
  id: string
  dato: string
  type: string
  tittel: string
  notat: string | null
  opprettet: string
}

export interface GarminDag {
  dato: string
  hvilepuls: number | null
  puls_snitt: number | null
  hrv: number | null
  hrv_status: string | null
  sovn_score: number | null
  sovn_min: number | null
  dyp_sovn_min: number | null
  lett_sovn_min: number | null
  rem_sovn_min: number | null
  vaaken_min: number | null
  stress_snitt: number | null
  body_battery_hoy: number | null
  body_battery_lav: number | null
  skritt: number | null
  kalorier: number | null
  spo2_snitt: number | null
  respirasjon_snitt: number | null
  vekt_kg: number | null
  oppdatert: string
}

export interface LabResultat {
  id: string
  dato: string
  analyse: string
  analyse_kanon: string | null
  verdi: number
  enhet: string | null
  ref_lav: number | null
  ref_hoy: number | null
  kilde: string
  notat: string | null
  opprettet: string
}

export interface GarminSynkLogg {
  id: string
  kjort_kl: string
  status: string
  fra_dato: string | null
  til_dato: string | null
  antall_dager: number | null
  melding: string | null
}
