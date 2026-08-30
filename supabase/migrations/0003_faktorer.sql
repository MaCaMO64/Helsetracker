-- Helsetracker – loggbare faktorer (M8)
-- Gjenbruker symptoms/symptom_entries, men skiller «symptom» (hvordan du har det)
-- fra «faktor» (ytre ting du gjorde/ble utsatt for: kaffe nær tablett, biotin …)
-- via en kategori-kolonne. Analyse og logging behandler begge likt.

alter table symptoms add column if not exists kategori text not null default 'symptom';
-- verdier: 'symptom' | 'faktor'
