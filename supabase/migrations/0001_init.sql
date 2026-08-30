-- Helsetracker – grunnskjema (M1)
-- Single-user modell: alle rader er knyttet til auth-brukeren via user_id, med
-- Row Level Security (user_id = auth.uid()). user_id defaulter til auth.uid()
-- slik at nettleser-innsettinger slipper å sette det.
--
-- MERK: Garmin-skriveren bruker service_role-nøkkelen, som OMGÅR RLS. Den MÅ
-- derfor sette user_id eksplisitt (auth.uid() er null uten en innlogget bruker).

create extension if not exists pgcrypto;

-- ── Medisiner (definisjoner) ───────────────────────────────────────
create table medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  navn text not null,
  formaal text,                                  -- f.eks. «stoffskifte»
  enhet text not null default 'µg',              -- µg / mg / ml / tablett …
  standard_dose numeric,                         -- forhåndsutfyll ved logging
  farge text,                                    -- for grafer
  aktiv boolean not null default true,
  sortering int not null default 0,
  opprettet timestamptz not null default now()
);
create index medications_user_idx on medications(user_id);

-- ── Medisindoser (daglig logg; flere per dag mulig) ────────────────
create table medication_doses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  medication_id uuid not null references medications(id) on delete cascade,
  dato date not null,
  dose numeric not null,
  tidspunkt text,                                -- valgfritt: «morgen»/«kveld»/klokkeslett
  notat text,
  opprettet timestamptz not null default now()
);
create index medication_doses_user_dato_idx on medication_doses(user_id, dato);
create index medication_doses_med_idx on medication_doses(medication_id);

-- ── Symptomer (definisjoner) ───────────────────────────────────────
create table symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  navn text not null,
  skala_type text not null default 'skala_0_10', -- 'skala_0_10' | 'ja_nei'
  min_verdi int not null default 0,
  maks_verdi int not null default 10,
  farge text,
  aktiv boolean not null default true,
  sortering int not null default 0,
  opprettet timestamptz not null default now()
);
create index symptoms_user_idx on symptoms(user_id);

-- ── Symptomoppføringer (én verdi per symptom per dag) ──────────────
create table symptom_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  symptom_id uuid not null references symptoms(id) on delete cascade,
  dato date not null,
  verdi numeric not null,
  notat text,
  opprettet timestamptz not null default now(),
  unique (symptom_id, dato)                       -- muliggjør upsert på dagens verdi
);
create index symptom_entries_user_dato_idx on symptom_entries(user_id, dato);

-- ── Hendelser (tidslinjemarkører for grafene) ──────────────────────
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dato date not null,
  type text not null default 'notat',            -- 'doseendring' | 'legebesok' | 'notat'
  tittel text not null,
  notat text,
  opprettet timestamptz not null default now()
);
create index events_user_dato_idx on events(user_id, dato);

-- ── Garmin dagssammendrag (én rad per bruker per dag) ──────────────
create table garmin_daily (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dato date not null,
  hvilepuls int,
  puls_snitt int,
  hrv numeric,
  hrv_status text,
  sovn_score int,
  sovn_min int,
  dyp_sovn_min int,
  lett_sovn_min int,
  rem_sovn_min int,
  vaaken_min int,
  stress_snitt int,
  body_battery_hoy int,
  body_battery_lav int,
  skritt int,
  kalorier int,
  spo2_snitt int,
  respirasjon_snitt numeric,
  vekt_kg numeric,
  oppdatert timestamptz not null default now(),
  primary key (user_id, dato)                     -- upsert-nøkkel for synken
);

-- ── Garmin synk-logg (dødmannsknapp: «siste vellykkede synk») ──────
create table garmin_sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kjort_kl timestamptz not null default now(),
  status text not null,                           -- 'ok' | 'feil'
  fra_dato date,
  til_dato date,
  antall_dager int,
  melding text
);
create index garmin_sync_log_user_idx on garmin_sync_log(user_id, kjort_kl desc);

-- ── Row Level Security: hver bruker ser og endrer kun egne rader ───
alter table medications enable row level security;
alter table medication_doses enable row level security;
alter table symptoms enable row level security;
alter table symptom_entries enable row level security;
alter table events enable row level security;
alter table garmin_daily enable row level security;
alter table garmin_sync_log enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'medications','medication_doses','symptoms','symptom_entries',
    'events','garmin_daily','garmin_sync_log'
  ] loop
    execute format($f$
      create policy "egne data" on %I
        for all
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $f$, t);
  end loop;
end $$;
