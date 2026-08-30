-- Helsetracker – flere doser per dag (M10)
-- medication_doses støtter allerede tidspunkt + flere rader per dag; dette legger
-- bare til hvor mange doser en medisin normalt tas per dag (for å forhåndsvise
-- riktig antall felter på «I dag»). F.eks. Thybon/T3 tas gjerne 2 ganger daglig.

alter table medications add column if not exists doser_per_dag int not null default 1;
