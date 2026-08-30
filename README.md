# 💓 Helsetracker

Personlig helse-tracker for å følge hvordan endringer i **medisindoser** (særlig
stoffskifte) påvirker allmenntilstanden – puls, søvn, energinivå og symptomer –
slik at mønstre kan diskuteres med lege.

Fungerer på PC og mobil som **PWA** (kan installeres på hjemskjermen). Én privat
bruker, innlogging med magisk lenke på e-post.

> **Ikke medisinsk verktøy.** Appen viser mønstre og sammenhenger for samtale med
> lege – den gir ikke diagnoser eller behandlingsråd, og korrelasjon er ikke
> årsak.

## Hva den gjør

- **Daglig logging**: medisindoser med klokkeslett (flere doser per dag),
  symptomer (0–10) og ytre **faktorer** (kaffe/kalsium/jern-timing, biotin …)
- **Blodprøver**: import fra Fürst/Helsenorge – PDF med tekst leses lokalt,
  skjermbilder via AI (med samtykke). TSH/FT4/FT3 m.m. blir kurver i analysen
- **Garmin**: dagssammendrag (hvilepuls, søvn, HRV, stress, Body Battery, skritt,
  vekt) automatisk via `python-garminconnect`, pluss bulk-import fra Garmins
  manuelle dataeksport (zip)
- **Hendelser**: doseendring, legebesøk, preparatbytte – som markører på tidslinjen
- **Analyse**: alt dato-nøklet – doseendringer og hendelser lagt oppå
  vitaler/lab/symptomer, før/etter-sammenligning, korrelasjon med valgbar
  tidsforskyvning – i **vanlig språk**, ikke p-verdi-jaging
- **Eksport**: CSV + utskrifts-/PDF-rapport + e-post til legetime

Kunnskapsgrunnlag: se `research/` (litteraturoppsummering om langtidsrespons på
levotyroksin, eksogene faktorer, kombinasjonsbehandling m.m.).

## Teknologi

React 19 + TypeScript + Vite (PWA) · Tailwind CSS v4 · React Router ·
React Query · Supabase (Postgres + RLS, Auth magic link) · vitest · oxlint

**Online-først**: databasen er sannheten, med optimistisk UI og en liten
offline-kø for daglig logging (så en dose tastet uten dekning ikke går tapt).
Ingen JSON-blob-store (til forskjell fra søsterprosjektet Matplanlegger).

Garmin-innhenting kjører som **Python + GitHub Actions** (daglig), skriver til
Supabase med service-role-nøkkel (se `GARMIN.md`). Blodprøve-bilder tolkes av en
Edge Function med egen AI-nøkkel (se `EPOST.md` for e-postsending av rapport).
Ekstra: `pdfjs-dist` (lokal PDF-lesing), `fflate` (Garmin-zip).

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

Alle planlagte milepæler (**M0–M10**) er bygget og live på Vercel – daglig
logging, faktorer, Garmin (synk + bulk-import), blodprøver, analyse, hendelser og
eksport. Se `TODO.md` for detaljer.

Gjenstår kun **valgfrie** integrasjonsoppsett når du vil bruke dem: Garmin-secrets
for auto-synk (`GARMIN.md`), Resend for e-postsending (`EPOST.md`), og AI-nøkkel
for bilde-import av blodprøver.
