-- Helsetracker – planlagte dosetidspunkter (M11)
-- Valgfrie faste klokkeslett per medisin (f.eks. Levaxin 08:00, Thybon 08:00+20:00).
-- Brukes til å forhåndsutfylle dosefeltene på «I dag» med riktig tidspunkt.

alter table medications add column if not exists standard_tidspunkter text[] not null default '{}';
