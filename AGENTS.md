# AGENTS.md – teknisk guide for AI-assistenter

Denne filen lar en annen LLM/agent ta over utviklingen uten å gjette. Les den
hele før du endrer noe. Søsterprosjektet **Matplanlegger** (`c:\matplanlegger`)
er malen for stack og deploy, men helsetrackeren avviker bevisst på datalaget.

## Hva prosjektet er

Personlig helse-tracker (én privat bruker) for å se hvordan endringer i
medisindoser – særlig stoffskifte – påvirker allmenntilstand (puls, søvn,
energi) og symptomer, for samtale med lege. Se `README.md`.

## Stack

- **Vite 8 + React 19 + TypeScript** (strict), entry `src/main.tsx`
- **Tailwind CSS v4** via `@tailwindcss/vite` – tema: **teal** (#0d9488)
- **React Router v7**, **@tanstack/react-query**, **@supabase/supabase-js**
- **vite-plugin-pwa** (`injectManifest`) → egen SW i `src/sw.ts`
- **vitest** (`npm test`), **oxlint** (`npm run lint`)
- Backend: **Supabase** (Postgres + RLS, Auth magic link) – **EU-region**
- Deploy: **Vercel** koblet til GitHub – push til `main` bygger produksjon
- Garmin-synk: **Python + GitHub Actions** (eget spor, se M4/`GARMIN.md`)

## Kommandoer

```bash
npm run dev      # dev-server (5173)
npm test         # vitest run
npm run lint     # oxlint
npm run build    # tsc -b && vite build
```

## Arkitektur – bevisste valg (les før du koder)

1. **Online-først, IKKE lokal-først.** Matplanleggeren pakker hele tilstanden i
   én JSON-blob i localStorage og synker den. Det gjør vi **ikke** her:
   helsedata er en voksende tidsserie som trenger relasjonstabeller og
   DB-spørringer for korrelasjon. Sannheten er Supabase; UI er optimistisk via
   React Query. En liten **offline-kø** (M1) mellomlagrer kun *daglig logging*
   lokalt og sender når nett er tilbake – ikke en full synk-motor.

2. **Single-user + RLS.** Alt knyttes til `user_id`; RLS-policy
   `user_id = auth.uid()` på alle tabeller. Deling med lege = eksport, ikke delt
   konto. (Matplanleggerens husstands-/join-kode-modell brukes IKKE.)

3. **Personvern (helsedata = særkategori GDPR).** EU-region i Supabase. **Ingen
   AI** i dataflyten. Analyse skal være deterministisk og etterprøvbar.
   Service-role-nøkkelen finnes KUN i GitHub Actions (Garmin-skriveren), aldri i
   nettleseren.

4. **Analyse-filosofi.** Bygg visuelt og hendelsesdrevet: doseendringer som
   markører, før/etter-vinduer, rullende snitt. Unngå p-verdi-jaging (mange
   sammenligninger × lag = falske funn). Ram alltid som «mønstre å diskutere med
   lege», aldri årsak. Dette er også et sikkerhetshensyn (rører medisinering).

5. **Garmin er uoffisielt** (`python-garminconnect`). Isoler alt bak
   `garmin_daily`, så resten av appen fungerer om Garmin brekker. Vis
   synk-status som en dødmannsknapp.

## Datamodell (planlagt, M1) – alt med RLS `user_id = auth.uid()`

- `medications` – navn, formål, enhet (µg/mg), standarddose, aktiv
- `medication_doses` – dato, medication_id, dose, tidspunkt, notat (fanger doseendringer)
- `symptoms` – navn, skala (0–10 / kategorisk)
- `symptom_entries` – dato, symptom_id, verdi, notat
- `garmin_daily` – én bred rad per (user_id, dato): hvilepuls, hrv, søvn (score/faser/min),
  stress, body_battery, skritt, spo2, respirasjon, vekt. Upsert på (user_id, dato)
- `garmin_sync_log` – siste synk, dekket intervall, feil
- `events` – dato, type, tekst (doseendring, legebesøk) → grafmarkører

Alt **dato-nøklet** → fremtidig kobling til Matplanleggerens ernæringsdata blir
en join på dato.

## Konvensjoner

- Norsk over alt: navn, kommentarer, UI-tekster
- Kommentarer forklarer «hvorfor», ikke «hva»
- Ren logikk i `src/lib/*` med tester i `*.test.ts`; UI-komponenter tynne
- Versjon i `src/lib/versjon.ts → APP_VERSJON`, vises i topplinja – bump ved deploy
- `TODO.md` er veikartet – hakk av ved fullført arbeid

## Gotchas

1. **PowerShell 5.1 ødelegger UTF-8** (æøå → mojibake) ved `Get-Content`/`Set-Content`
   på filer uten BOM. Bruk Edit/Write-verktøyene.
2. **Tailwind v4**: unngå å blande to width-klasser (rekkefølge i generert CSS
   er ikke garantert). Legg `w-full` eksplisitt der det trengs.
3. `verbatimModuleSyntax` er på → bruk `import type` for typer.
4. `src/sw.ts` er ekskludert fra `tsconfig.app.json` (egen webworker-kontekst).

## Struktur

```
src/
  lib/         supabaseClient, auth, id, versjon (+ datalag/hooks kommer i M1)
  components/  Layout (innloggingsgate), LoggInn, ui
  pages/       Idag, Historikk, Analyse, Innstillinger
  sw.ts        service worker (precache + SPA-navigasjon)
supabase/
  migrations/  SQL-skjema + RLS (kommer i M1)
```
