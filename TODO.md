# TODO / Veikart – Helsetracker

Milepæler. Hakk av og oppdater ved fullført arbeid.

## M0 – Scaffold + innlogging ✅
- [x] Vite + React 19 + TS + Tailwind v4 + PWA
- [x] Supabase magic link-auth med innloggingsgate
- [x] App-shell: nav (I dag / Historikk / Analyse / Innstillinger)
- [x] React Query-provider (online-først)
- [ ] Opprett Supabase-prosjekt (EU-region), GitHub-repo og Vercel-prosjekt
- [ ] Fyll `.env.local`, verifiser innlogging mot ekte Supabase

## M1 – Datamodell + datalag ✅
- [x] Migrasjoner: `medications`, `medication_doses`, `symptoms`,
      `symptom_entries`, `garmin_daily`, `garmin_sync_log`, `events` (+ RLS `user_id = auth.uid()`)
- [x] React Query-hooks (les/skriv) per tabell (`src/lib/db.ts`)
- [x] Offline-kø for daglig logging (`src/lib/offlineKo.ts` + tester)
- [x] Dato-hjelpere (`src/lib/dates.ts` + tester)
- [ ] Kjør migrasjonen mot Supabase (SQL Editor) og verifiser tabellene

## M2 – Daglig logging ✅
- [x] «I dag»: rask inntasting av doser + symptomer (store knapper, mobil), med datovelger
- [x] Historikk: liste over siste 30 dager med doser/symptomer/hendelser
- [ ] Historikk: redigering direkte fra lista (kommer)

## M3 – Definisjoner ✅ (delvis)
- [x] Innstillinger: definer egne medisiner (enhet, standarddose) og symptomer (skala)
- [ ] Hendelser (events): «økte dose til X», legebesøk – UI for å legge inn (vises alt i Historikk)

## M4 – Garmin-synk
- [ ] Python-script (`python-garminconnect`/`garth`) – dagssammendrag
- [ ] GitHub Actions: daglig cron + `workflow_dispatch` (manuell «synk nå»)
- [ ] Backfill av historikk ved første kjøring (f.eks. 90 dager)
- [ ] `GARMIN.md`: token-bootstrap (MFA lokalt → base64 → GitHub-secret)
- [ ] Skriv til `garmin_daily` via service-role; logg til `garmin_sync_log`
- [ ] Vis «siste vellykkede synk: X dager siden» i appen (dødmannsknapp)

## M5 – Analyse
- [ ] Tidsseriegrafer med doseendring-markører (SVG)
- [ ] Før/etter-sammenligning ved doseendring (effektstørrelse, rullende snitt)
- [ ] Korrelasjon med valgbar lag (uker) + spredningsplott, med tydelige forbehold

## M6 – Eksport + polish
- [ ] CSV-eksport
- [ ] Utskrifts-/PDF-rapport for legetime
- [ ] PWA-polish, ikoner, tomtilstander

## Senere / idébank
- [ ] Kobling mot Matplanlegger (daglig ernæringsoppsummering join på dato)
- [ ] Intraday Garmin-data (søvnfaser, HRV om natten) hvis daglig ikke er nok
- [ ] Påminnelser om å logge
