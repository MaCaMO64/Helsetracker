-- Helsetracker – blodprøver (M7)
-- Én rad per (analyse, dato). Importeres fra Fürst/Helsenorge (PDF-tekst lokalt,
-- eller bilde via vision-AI med samtykke), eller tastes manuelt.

create table lab_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dato date not null,
  "analyse" text not null,             -- vist navn, f.eks. 'S-TSH'. «analyse» er reservert → siteres
  analyse_kanon text,                  -- normalisert nøkkel: 'tsh','ft4','ft3','anti_tpo' …
  verdi numeric not null,
  enhet text,
  ref_lav numeric,
  ref_hoy numeric,
  kilde text not null default 'manuell', -- 'pdf' | 'bilde' | 'furst' | 'helsenorge' | 'manuell'
  notat text,
  opprettet timestamptz not null default now(),
  unique (user_id, dato, "analyse")    -- upsert ved re-import av samme prøve
);
create index lab_results_user_dato_idx on lab_results(user_id, dato);

alter table lab_results enable row level security;
create policy "egne data" on lab_results
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
