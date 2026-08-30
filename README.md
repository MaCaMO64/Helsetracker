# 💓 Helsetracker

Personlig helse-tracker for å følge hvordan endringer i **medisindoser** (særlig
stoffskifte) påvirker allmenntilstanden – puls, søvn, energinivå og symptomer –
slik at mønstre kan diskuteres med lege.

Fungerer på PC og mobil som **PWA** (kan installeres på hjemskjermen). Én privat
bruker, innlogging med magisk lenke på e-post.

> **Ikke medisinsk verktøy.** Appen viser mønstre og sammenhenger for samtale med
> lege – den gir ikke diagnoser eller behandlingsråd, og korrelasjon er ikke
> årsak.

## Hva den skal gjøre

- **Logg daglig**: medisindoser (med doseendringer over tid) og symptomer
  (kvalme, trøtthet, hjernetåke … på skala 0–10)
- **Garmin-data**: henter dagssammendrag (hvilepuls, søvn, HRV, stress, Body
  Battery, skritt, vekt) automatisk via `python-garminconnect`
- **Analyse**: tidsseriegrafer med doseendringer lagt oppå vitaler/symptomer,
  før/etter-sammenligning ved doseendring, korrelasjon med valgbar
  tidsforskyvning (lag) – bevisst visuelt og forsiktig, ikke p-verdi-jaging
- **Eksport** (CSV/PDF) til legetime

## Teknologi

React 19 + TypeScript + Vite (PWA) · Tailwind CSS v4 · React Router ·
React Query · Supabase (Postgres + RLS, Auth magic link) · vitest · oxlint

**Online-først**: databasen er sannheten, med optimistisk UI og en liten
offline-kø for daglig logging (så en dose tastet uten dekning ikke går tapt).
Ingen JSON-blob-store (til forskjell fra søsterprosjektet Matplanlegger).

Garmin-innhenting kjører som **Python + GitHub Actions** (daglig), skriver til
Supabase med service-role-nøkkel. Se `GARMIN.md` (kommer i M4).

## Kom i gang (utvikling)

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run lint       # oxlint
npm run build      # typecheck + produksjonsbygg
```

Kopier `.env.example` → `.env.local` og fyll inn `VITE_SUPABASE_URL` og
`VITE_SUPABASE_ANON_KEY` (velg **EU-region** i Supabase – helsedata er
særkategori under GDPR).

## Database

Kjør hele **`supabase/setup.sql`** i Supabase → SQL Editor. Fila er idempotent
(trygg å kjøre flere ganger, og på en delvis oppsatt database) og samler alle
migrasjonene i `supabase/migrations/`. Ved endringer senere: legg til en ny
nummerert migrasjon *og* speil endringen i `setup.sql`.

## Publisering

Repoet kobles til **Vercel**: hver push til `main` bygger og publiserer.
Miljøvariablene settes i Vercel-prosjektet.

## Kobling mot Matplanlegger (senere)

Egne prosjekter/databaser. Alt her er dato-nøklet, så en fremtidig kobling kan
joine en daglig ernæringsoppsummering fra Matplanleggeren på dato. Ingen kobling
bygges nå. Se `AGENTS.md`.

## Status

Se `TODO.md` for veikart (M0–M6). Nå: **M0 – scaffold + innlogging** ✅
