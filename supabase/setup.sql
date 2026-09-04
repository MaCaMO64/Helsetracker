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
  standard_tidspunkter text[] not null default '{}',  -- valgfrie faste klokkeslett
  sortering int not null default 0,
  opprettet timestamptz not null default now()
);
-- For databaser som fikk medications før disse kolonnene fantes:
alter table medications add column if not exists doser_per_dag int not null default 1;
alter table medications add column if not exists standard_tidspunkter text[] not null default '{}';
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

-- ── Delbar skrivebeskyttet legerapport ─────────────────────────────
create table if not exists report_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  html text not null,
  opprettet timestamptz not null default now(),
  utloper timestamptz
);
alter table report_shares enable row level security;
drop policy if exists "egne delinger" on report_shares;
create policy "egne delinger" on report_shares
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "offentlig lesing" on report_shares;
create policy "offentlig lesing" on report_shares
  for select using (utloper is null or utloper > now());

-- ── Delt konto (migrasjon 0007) ────────────────────────────────────
-- Én «eier» eier dataene; medlemmer ser/skriver til samme datasett.
-- Er konto_medlemmer tom, gir eier_id() = auth.uid() → som før. Se DELT_KONTO.md.
create table if not exists konto_medlemmer (
  medlem_uid uuid primary key references auth.users(id) on delete cascade,
  eier_uid uuid not null references auth.users(id) on delete cascade,
  navn text,
  opprettet timestamptz not null default now()
);
alter table konto_medlemmer enable row level security;
drop policy if exists "se egen kobling" on konto_medlemmer;
create policy "se egen kobling" on konto_medlemmer
  for select using (medlem_uid = auth.uid() or eier_uid = auth.uid());

create or replace function eier_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select m.eier_uid from konto_medlemmer m where m.medlem_uid = auth.uid()),
    auth.uid()
  );
$$;
grant execute on function eier_id() to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'medications','medication_doses','symptoms','symptom_entries',
    'events','garmin_daily','garmin_sync_log','lab_results','report_shares'
  ] loop
    execute format('alter table %I alter column user_id set default eier_id()', t);
    execute format('drop policy if exists "egne data" on %I', t);
    execute format('drop policy if exists "egne delinger" on %I', t);
    execute format(
      $f$create policy "egne data" on %I for all
         using (user_id = eier_id()) with check (user_id = eier_id())$f$, t);
  end loop;
end $$;
