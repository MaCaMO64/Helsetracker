// Datalag: React Query-hooks mot Supabase (online-først). Daglig logging (dose
// + symptomverdi) går via en offline-bevisst upsert som faller tilbake til
// utboks-køen (offlineKo.ts) når nettet er nede.

import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { nyId } from './id'
import { erNettverksfeil, flushKo, leggIKo, type KoTabell } from './offlineKo'
import type {
  Dose,
  GarminDag,
  GarminSynkLogg,
  Hendelse,
  LabResultat,
  Medisin,
  Symptom,
  SymptomOppforing,
} from './types'

function klient(): SupabaseClient {
  if (!supabase) throw new Error('Supabase er ikke konfigurert – sett opp .env.local')
  return supabase
}

/** Query-nøkler samlet ett sted, så invalidering blir konsistent. */
export const noekler = {
  medisiner: ['medisiner'] as const,
  doser: (dato: string) => ['doser', dato] as const,
  doserPeriode: (fra: string, til: string) => ['doser-periode', fra, til] as const,
  symptomer: ['symptomer'] as const,
  symptomOppf: (dato: string) => ['symptomOppf', dato] as const,
  symptomOppfPeriode: (fra: string, til: string) => ['symptomOppf-periode', fra, til] as const,
  hendelser: (fra: string, til: string) => ['hendelser', fra, til] as const,
  garmin: (fra: string, til: string) => ['garmin', fra, til] as const,
  sisteSynk: ['garmin-siste-synk'] as const,
}

/** Offline-bevisst upsert for de daglige loggeskrivingene. */
async function upsertMedOffline(
  tabell: KoTabell,
  rad: Record<string, unknown>,
  onConflict: string,
): Promise<void> {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (!offline) {
    try {
      const { error } = await klient().from(tabell).upsert(rad, { onConflict })
      if (!error) return
      if (!erNettverksfeil(error)) throw error // ekte feil (RLS/validering) → boble opp
    } catch (e) {
      if (!erNettverksfeil(e)) throw e
    }
  }
  // Offline eller nettverksfeil → legg i utboks for senere sending.
  leggIKo({ id: nyId(), tabell, konflikt: onConflict, rad, opprettet: new Date().toISOString() })
}

// ── Medisiner ──────────────────────────────────────────────────────
export interface MedisinInn {
  id?: string
  navn: string
  formaal?: string | null
  enhet: string
  standard_dose?: number | null
  farge?: string | null
  aktiv?: boolean
  sortering?: number
}

export function useMedisiner() {
  return useQuery({
    queryKey: noekler.medisiner,
    queryFn: async (): Promise<Medisin[]> => {
      const { data, error } = await klient()
        .from('medications')
        .select('*')
        .order('sortering')
        .order('navn')
      if (error) throw error
      return (data ?? []) as Medisin[]
    },
  })
}

export function useLagreMedisin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (m: MedisinInn): Promise<void> => {
      const felter = {
        navn: m.navn,
        formaal: m.formaal ?? null,
        enhet: m.enhet,
        standard_dose: m.standard_dose ?? null,
        farge: m.farge ?? null,
        aktiv: m.aktiv ?? true,
        sortering: m.sortering ?? 0,
      }
      const q = m.id
        ? klient().from('medications').update(felter).eq('id', m.id)
        : klient().from('medications').insert(felter)
      const { error } = await q
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: noekler.medisiner }),
  })
}

export function useSlettMedisin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await klient().from('medications').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: noekler.medisiner }),
  })
}

// ── Medisindoser ───────────────────────────────────────────────────
export interface DoseInn {
  id?: string
  medication_id: string
  dato: string
  dose: number
  tidspunkt?: string | null
  notat?: string | null
}

export function useDoser(dato: string) {
  return useQuery({
    queryKey: noekler.doser(dato),
    queryFn: async (): Promise<Dose[]> => {
      const { data, error } = await klient()
        .from('medication_doses')
        .select('*')
        .eq('dato', dato)
      if (error) throw error
      return (data ?? []) as Dose[]
    },
  })
}

export function useDoserPeriode(fra: string, til: string) {
  return useQuery({
    queryKey: noekler.doserPeriode(fra, til),
    queryFn: async (): Promise<Dose[]> => {
      const { data, error } = await klient()
        .from('medication_doses')
        .select('*')
        .gte('dato', fra)
        .lte('dato', til)
        .order('dato')
      if (error) throw error
      return (data ?? []) as Dose[]
    },
  })
}

export function useLagreDose() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: DoseInn): Promise<void> => {
      const rad = {
        id: d.id ?? nyId(), // klient-generert id → idempotent upsert (også offline)
        medication_id: d.medication_id,
        dato: d.dato,
        dose: d.dose,
        tidspunkt: d.tidspunkt ?? null,
        notat: d.notat ?? null,
      }
      await upsertMedOffline('medication_doses', rad, 'id')
    },
    onSuccess: (_r, d) =>
      qc.invalidateQueries({ queryKey: ['doser'], predicate: (q) => q.queryKey[1] === d.dato }),
  })
}

export function useSlettDose() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await klient().from('medication_doses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doser'] }),
  })
}

// ── Symptomer ──────────────────────────────────────────────────────
export interface SymptomInn {
  id?: string
  navn: string
  skala_type?: string
  min_verdi?: number
  maks_verdi?: number
  farge?: string | null
  aktiv?: boolean
  sortering?: number
}

export function useSymptomer() {
  return useQuery({
    queryKey: noekler.symptomer,
    queryFn: async (): Promise<Symptom[]> => {
      const { data, error } = await klient()
        .from('symptoms')
        .select('*')
        .order('sortering')
        .order('navn')
      if (error) throw error
      return (data ?? []) as Symptom[]
    },
  })
}

export function useLagreSymptom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (s: SymptomInn): Promise<void> => {
      const felter = {
        navn: s.navn,
        skala_type: s.skala_type ?? 'skala_0_10',
        min_verdi: s.min_verdi ?? 0,
        maks_verdi: s.maks_verdi ?? 10,
        farge: s.farge ?? null,
        aktiv: s.aktiv ?? true,
        sortering: s.sortering ?? 0,
      }
      const q = s.id
        ? klient().from('symptoms').update(felter).eq('id', s.id)
        : klient().from('symptoms').insert(felter)
      const { error } = await q
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: noekler.symptomer }),
  })
}

export function useSlettSymptom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await klient().from('symptoms').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: noekler.symptomer }),
  })
}

// ── Symptomoppføringer (én verdi per symptom per dag) ──────────────
export interface SymptomOppfInn {
  symptom_id: string
  dato: string
  verdi: number
  notat?: string | null
}

export function useSymptomOppforinger(dato: string) {
  return useQuery({
    queryKey: noekler.symptomOppf(dato),
    queryFn: async (): Promise<SymptomOppforing[]> => {
      const { data, error } = await klient()
        .from('symptom_entries')
        .select('*')
        .eq('dato', dato)
      if (error) throw error
      return (data ?? []) as SymptomOppforing[]
    },
  })
}

export function useSymptomOppfPeriode(fra: string, til: string) {
  return useQuery({
    queryKey: noekler.symptomOppfPeriode(fra, til),
    queryFn: async (): Promise<SymptomOppforing[]> => {
      const { data, error } = await klient()
        .from('symptom_entries')
        .select('*')
        .gte('dato', fra)
        .lte('dato', til)
        .order('dato')
      if (error) throw error
      return (data ?? []) as SymptomOppforing[]
    },
  })
}

export function useLagreSymptomOppf() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (s: SymptomOppfInn): Promise<void> => {
      // Upsert på (symptom_id, dato): oppdaterer dagens verdi eller lager ny.
      const rad = {
        symptom_id: s.symptom_id,
        dato: s.dato,
        verdi: s.verdi,
        notat: s.notat ?? null,
      }
      await upsertMedOffline('symptom_entries', rad, 'symptom_id,dato')
    },
    onSuccess: (_r, s) =>
      qc.invalidateQueries({ queryKey: ['symptomOppf'], predicate: (q) => q.queryKey[1] === s.dato }),
  })
}

export function useSlettSymptomOppf() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await klient().from('symptom_entries').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['symptomOppf'] }),
  })
}

// ── Hendelser ──────────────────────────────────────────────────────
export interface HendelseInn {
  id?: string
  dato: string
  type?: string
  tittel: string
  notat?: string | null
}

export function useHendelser(fra: string, til: string) {
  return useQuery({
    queryKey: noekler.hendelser(fra, til),
    queryFn: async (): Promise<Hendelse[]> => {
      const { data, error } = await klient()
        .from('events')
        .select('*')
        .gte('dato', fra)
        .lte('dato', til)
        .order('dato')
      if (error) throw error
      return (data ?? []) as Hendelse[]
    },
  })
}

export function useLagreHendelse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (h: HendelseInn): Promise<void> => {
      const felter = {
        dato: h.dato,
        type: h.type ?? 'notat',
        tittel: h.tittel,
        notat: h.notat ?? null,
      }
      const q = h.id
        ? klient().from('events').update(felter).eq('id', h.id)
        : klient().from('events').insert(felter)
      const { error } = await q
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hendelser'] }),
  })
}

export function useSlettHendelse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await klient().from('events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hendelser'] }),
  })
}

// ── Garmin (kun lesing i appen; skrives av synken via service_role) ─
export function useGarminPeriode(fra: string, til: string) {
  return useQuery({
    queryKey: noekler.garmin(fra, til),
    queryFn: async (): Promise<GarminDag[]> => {
      const { data, error } = await klient()
        .from('garmin_daily')
        .select('*')
        .gte('dato', fra)
        .lte('dato', til)
        .order('dato')
      if (error) throw error
      return (data ?? []) as GarminDag[]
    },
  })
}

export function useSisteSynk() {
  return useQuery({
    queryKey: noekler.sisteSynk,
    queryFn: async (): Promise<GarminSynkLogg | null> => {
      const { data, error } = await klient()
        .from('garmin_sync_log')
        .select('*')
        .order('kjort_kl', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as GarminSynkLogg) ?? null
    },
  })
}

// ── Blodprøver ─────────────────────────────────────────────────────
export interface LabInn {
  dato: string
  analyse: string
  analyse_kanon?: string | null
  verdi: number
  enhet?: string | null
  ref_lav?: number | null
  ref_hoy?: number | null
  kilde?: string
  notat?: string | null
}

export function useLabResultater(fra: string, til: string) {
  return useQuery({
    queryKey: ['lab', fra, til],
    queryFn: async (): Promise<LabResultat[]> => {
      const { data, error } = await klient()
        .from('lab_results')
        .select('*')
        .gte('dato', fra)
        .lte('dato', til)
        .order('dato')
      if (error) throw error
      return (data ?? []) as LabResultat[]
    },
  })
}

export function useLagreLabResultater() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rader: LabInn[]): Promise<void> => {
      if (rader.length === 0) return
      const rows = rader.map((r) => ({
        dato: r.dato,
        analyse: r.analyse,
        analyse_kanon: r.analyse_kanon ?? null,
        verdi: r.verdi,
        enhet: r.enhet ?? null,
        ref_lav: r.ref_lav ?? null,
        ref_hoy: r.ref_hoy ?? null,
        kilde: r.kilde ?? 'manuell',
        notat: r.notat ?? null,
      }))
      const { error } = await klient()
        .from('lab_results')
        .upsert(rows, { onConflict: 'user_id,dato,analyse' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab'] }),
  })
}

export function useSlettLabResultat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await klient().from('lab_results').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab'] }),
  })
}

// ── Offline-flush: send utboksen ved oppstart og når nettet er tilbake ─
export function useOfflineFlush(): void {
  const qc = useQueryClient()
  useEffect(() => {
    const klient = supabase
    if (!klient) return
    const flush = async () => {
      // Send kun når vi faktisk er innlogget – ellers ville upsert feile på RLS
      // og køede elementer bli droppet før de kunne lagres.
      const { data } = await klient.auth.getSession()
      if (!data.session) return
      const r = await flushKo(klient)
      if (r.sendt > 0) {
        qc.invalidateQueries({ queryKey: ['doser'] })
        qc.invalidateQueries({ queryKey: ['symptomOppf'] })
      }
    }
    const kjor = () => void flush().catch(() => {})
    kjor()
    window.addEventListener('online', kjor)
    return () => window.removeEventListener('online', kjor)
  }, [qc])
}
