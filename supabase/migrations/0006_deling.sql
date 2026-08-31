-- Helsetracker – delbar skrivebeskyttet legerapport (M12)
-- Lagrer et øyeblikksbilde (ferdig HTML) av rapporten med en tilfeldig, uraudbar
-- id. Alle med lenken kan lese den TIL den utløper (uten innlogging). Eieren kan
-- opprette/slette; anon kan kun lese ikke-utløpte rader.

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

-- Offentlig lesing kun av ikke-utløpte deling (må kjenne den tilfeldige id-en).
drop policy if exists "offentlig lesing" on report_shares;
create policy "offentlig lesing" on report_shares
  for select using (utloper is null or utloper > now());
