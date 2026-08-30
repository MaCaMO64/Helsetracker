-- Helsetracker – komplett skjema i én kjørbar fil.
-- Idempotent: trygt å kjøre på en fersk database ELLER en som allerede har kjørt
-- noen av migrasjonene (0001–0003). Bruker «if not exists» og dropper/gjenoppretter
-- RLS-policyene. Kjør hele fila i Supabase → SQL Editor.
--
-- Tilsvarer migrasjonene 0001_init + 0002_blodprover + 0003_faktorer samlet.

create extension if not exists pgcrypto;

-- ── Medisiner ──────────────────────────────────────────────────────
create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  navn text not null,
  formaal text,
  enhet text not null default 'µg',
  standard_dose numeric,
  farge text,
  aktiv boolean not null default true,
  doser_per_dag int not null default 1,
  sortering int not null default 0,
  opprettet timestamptz not null default now()
);
-- For databaser som fikk medications før doser_per_dag fantes:
alter table medications add column if not exists doser_per_dag int not null default 1;
create index if not exists medications_user_idx on medications(user_id);

-- ── Medisindoser ───────────────────────────────────────────────────
create table if not exists medication_doses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  medication_id uuid not null references medications(id) on delete cascade,
  dato date not null,
  dose numeric not null,
  tidspunkt text,
  notat text,
  opprettet timestamptz not null default now()
);
create index if not exists medication_doses_user_dato_idx on medication_doses(user_id, dato);
create index if not exists medication_doses_med_idx on medication_doses(medication_id);

-- ── Symptomer og faktorer ──────────────────────────────────────────
create table if not exists symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  navn text not null,
  skala_type text not null default 'skala_0_10',
  kategori text not null default 'symptom',   -- 'symptom' | 'faktor'
  min_verdi int not null default 0,
  maks_verdi int not null default 10,
  farge text,
  aktiv boolean not null default true,
  sortering int not null default 0,
  opprettet timestamptz not null default now()
);
-- For databaser som fikk symptoms før kategori-kolonnen fantes:
alter table symptoms add column if not exists kategori text not null default 'symptom';
create index if not exists symptoms_user_idx on symptoms(user_id);

create table if not exists symptom_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  symptom_id uuid not null references symptoms(id) on delete cascade,
  dato date not null,
  verdi numeric not null,
  notat text,
  opprettet timestamptz not null default now(),
  unique (symptom_id, dato)
);
create index if not exists symptom_entries_user_dato_idx on symptom_entries(user_id, dato);

-- ── Hendelser ──────────────────────────────────────────────────────
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dato date not null,
  type text not null default 'notat',
  tittel text not null,
  notat text,
  opprettet timestamptz not null default now()
);
create index if not exists events_user_dato_idx on events(user_id, dato);

-- ── Garmin dagssammendrag ──────────────────────────────────────────
create table if not exists garmin_daily (
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
  primary key (user_id, dato)
);

-- ── Garmin synk-logg ───────────────────────────────────────────────
create table if not exists garmin_sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kjort_kl timestamptz not null default now(),
  status text not null,
  fra_dato date,
  til_dato date,
  antall_dager int,
  melding text
);
create index if not exists garmin_sync_log_user_idx on garmin_sync_log(user_id, kjort_kl desc);

-- ── Blodprøver ─────────────────────────────────────────────────────
create table if not exists lab_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dato date not null,
  "analyse" text not null,          -- «analyse» er reservert ord i Postgres → siteres
  analyse_kanon text,
  verdi numeric not null,
  enhet text,
  ref_lav numeric,
  ref_hoy numeric,
  kilde text not null default 'manuell',
  notat text,
  opprettet timestamptz not null default now(),
  unique (user_id, dato, "analyse")
);
create index if not exists lab_results_user_dato_idx on lab_results(user_id, dato);

-- ── Row Level Security: hver bruker ser/endrer kun egne rader ──────
do $$
declare t text;
begin
  foreach t in array array[
    'medications','medication_doses','symptoms','symptom_entries',
    'events','garmin_daily','garmin_sync_log','lab_results'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "egne data" on %I', t);
    execute format(
      $f$create policy "egne data" on %I for all
         using (user_id = auth.uid()) with check (user_id = auth.uid())$f$, t);
  end loop;
end $$;
