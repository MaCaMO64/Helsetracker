-- Helsetracker – delt konto (M13)
-- Én «eier» eier dataene; medlemmer (f.eks. et familiemedlem + en som hjelper
-- til) ser og skriver til SAMME datasett. Erstatter `auth.uid()` med `eier_id()`
-- i defaults og RLS.
--
-- TRYGT Å KJØRE: er konto_medlemmer tom, gir eier_id() = auth.uid(), altså
-- eksakt samme oppførsel som før. Ingenting endres før du legger inn en kobling.
--
-- Eieren bør være personen dataene handler om (den registrerte): sletter en
-- medhjelper sin egen konto, blir dataene stående. Sletter EIEREN kontoen sin,
-- slettes alt (kaskade) – som det skal være.

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

-- Hvilken konto tilhører innlogget bruker? (Uten kobling: seg selv.)
create or replace function eier_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select m.eier_uid from konto_medlemmer m where m.medlem_uid = auth.uid()),
    auth.uid()
  );
$$;

grant execute on function eier_id() to authenticated;

-- Pek defaults og RLS på eier_id() i stedet for auth.uid().
do $$
declare t text;
begin
  foreach t in array array[
    'medications','medication_doses','symptoms','symptom_entries',
    'events','garmin_daily','garmin_sync_log','lab_results','report_shares'
  ] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table %I alter column user_id set default eier_id()', t);
    execute format('drop policy if exists "egne data" on %I', t);
    execute format('drop policy if exists "egne delinger" on %I', t);
    execute format(
      $f$create policy "egne data" on %I for all
         using (user_id = eier_id()) with check (user_id = eier_id())$f$, t);
  end loop;
end $$;
