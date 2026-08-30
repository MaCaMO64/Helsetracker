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

## M4 – Garmin-synk ✅ (kode) – gjenstår din bootstrap
- [x] Python-script (`garmin_sync/sync.py`) – dagssammendrag, defensivt
- [x] GitHub Actions: daglig cron + `workflow_dispatch` (manuell + backfill-dager)
- [x] Backfill via manuell kjøring (`dager`-input)
- [x] `bootstrap.py` + `GARMIN.md`: token-bootstrap (MFA lokalt → GitHub-secret)
- [x] Skriv til `garmin_daily` via service-role; logg til `garmin_sync_log`
- [x] Vis «siste vellykkede synk» i appen (GarminSeksjon, dødmannsknapp)
- [ ] DU: kjør `bootstrap.py`, legg inn 4 GitHub-secrets, kjør backfill (se GARMIN.md)

## M5 – Analyse ✅
- [x] Tidsseriegrafer med doseendring-markører (SVG, to akser) – `Graf.tsx`
- [x] Før/etter-sammenligning ved doseendring (snitt + diff; effektstørrelse i `analyse.ts`)
- [x] Korrelasjon med valgbar lag + spredningsplott, med tydelige forbehold
- [x] Etterprøvbar statistikk i `analyse.ts` (+ tester: pearson, lag, før/etter)

## M6 – Eksport ✅
- [x] CSV-eksport (`eksport.ts` + tester)
- [x] Utskrifts-/PDF-rapport for legetime (plainspråk, forbehold)
- [x] Send CSV/rapport på e-post (Edge Function `send-rapport` via Resend)
- [ ] DU: sett opp Resend + secrets + VITE_FUNCTIONS_URL (se EPOST.md) for e-post
- [x] PWA-polish: offline-varsel, installer-knapp, «kom i gang»-guide (Velkomst)
- [ ] PNG-ikoner for iOS (mangler rasteriserings-verktøy lokalt – SVG brukes nå)

## M7 – Import av blodprøver ✅
- [x] Migrasjon 0002 `lab_results` + RLS
- [x] Lokal PDF-tekst-parsing (`blodprove.ts` + `pdf.ts`) + tester
- [x] AI-fallback for bilder (Edge Function `parse-blodprove`, BYO-nøkkel + samtykke)
- [x] «Prøver»-side: last opp → forhåndsvis/rediger → lagre; liste med referanseflagg
- [x] Integrert i Analyse (TSH/FT4 som kurver) og i eksport (CSV + rapport)
- [ ] DU: kjør migrasjon 0002 i SQL Editor; (valgfritt) deploy `parse-blodprove` + AI-nøkkel for bildeimport

## M8 – Faktorer + Garmin bulk-import ✅
- [x] Loggbare «faktorer» (kaffe/kalsium/jern-timing, biotin, glutenbrudd …) via
      kategori på symptoms (migrasjon 0003); egen seksjon i Innstillinger + «I dag»
- [x] Hurtigknapp «legg til vanlige faktorer» (fra forskningen)
- [x] Biotin-varsel på Prøver-siden (statisk tips + sterkt varsel hvis biotin logget nylig)
- [x] Bulk-import av Garmin-historikk fra manuell dataeksport (zip → lokal parsing
      `garminEksport.ts` + `garminZip.ts` → garmin_daily via RLS; forhåndsvisning) + tester
- [ ] DU: kjør migrasjon 0003 i SQL Editor

## M9 – Hendelser ✅
- [x] Legg til/rediger/slett hendelser (doseendring/legebesøk/notat) i Historikk
- [x] Hendelser vist som markører i Analyse-grafen (lilla), doseendringer (grå)

## Senere / idébank
- [ ] Kobling mot Matplanlegger (daglig ernæringsoppsummering join på dato)
- [ ] Intraday Garmin-data (søvnfaser, HRV om natten) hvis daglig ikke er nok
- [ ] Påminnelser om å logge
