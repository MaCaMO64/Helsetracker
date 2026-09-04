# TODO / Veikart – Helsetracker

Milepæler. Hakk av og oppdater ved fullført arbeid.
Live: https://helsetracker.vercel.app · Repo: github.com/MaCaMO64/Helsetracker

## Fullførte milepæler

### M0 – Scaffold + innlogging ✅
- Vite + React 19 + TS + Tailwind v4 + PWA; Supabase magic link + innloggingsgate
- App-shell, React Query (online-først); Supabase (EU), GitHub og Vercel satt opp

### M1 – Datamodell + datalag ✅
- Migrasjoner + RLS (`user_id = auth.uid()`), React Query-hooks (`db.ts`)
- Offline-kø (`offlineKo.ts`) + dato-hjelpere (`dates.ts`) med tester

### M2 – Daglig logging ✅
- «I dag» med datovelger; Historikk (siste 30 dager)

### M3 – Definisjoner ✅
- Innstillinger: medisiner og symptomer

### M4 – Garmin-synk ✅ (kode)
- `garmin_sync/` (Python) + GitHub Actions (daglig + backfill) + `GARMIN.md`
- Synk-status som dødmannsknapp i appen

### M5 – Analyse ✅
- SVG-grafer, doseendring-markører, før/etter, korrelasjon m/ lag – i plainspråk
- Etterprøvbar statistikk i `analyse.ts` (+ tester)

### M6 – Eksport ✅
- CSV + utskrift/PDF + e-post (`send-rapport` via Resend); PWA-polish + velkomstguide

### M7 – Blodprøver ✅
- `lab_results`; lokal PDF-parsing + AI-fallback (`parse-blodprove`); Prøver-side
- Integrert i Analyse + eksport; biotin-varsel

### M8 – Faktorer + Garmin bulk-import ✅
- Loggbare faktorer (kategori på symptoms); bulk-import fra Garmin-dataeksport (zip)

### M9 – Hendelser ✅
- Legg til/rediger/slett hendelser i Historikk; markører i Analyse

### M10 – Klokkeslett + flere doser per dag ✅
- Dose med tidspunkt; `doser_per_dag` per medisin; flere doser/dag på «I dag»

### Forskning ✅
- `research/skjoldbrusk-langtidsrespons.md` + delbar nettside (Artifact):
  langtidsrespons, eksogene faktorer, Creon, kombinasjonsbehandling (T4+T3/Thybon)

### M13 – Delt konto ✅
- Migrasjon 0007: `konto_medlemmer` + `eier_id()`; defaults/RLS peker på eier_id()
- To (eller flere) e-poster i allowlisten deler ett datasett; «Delt konto» vises
  i Innstillinger. Oppsett: `DELT_KONTO.md`

## Database
- [x] `supabase/setup.sql` kjørt (idempotent samlefil; migrasjoner 0001–0006)
- [ ] DU: kjør `setup.sql` på nytt for delt konto (0007), og følg `DELT_KONTO.md`

## Gjenstår – dine valgfrie oppsett (når du vil bruke dem)
- [ ] Garmin auto-synk: `bootstrap.py` + 4 GitHub-secrets + backfill (`GARMIN.md`)
- [ ] E-postsending av rapport: Resend-nøkkel + deploy `send-rapport` + `VITE_FUNCTIONS_URL` (`EPOST.md`)
- [ ] AI-import av blodprøve-bilder: deploy `parse-blodprove` + AI-nøkkel i Innstillinger
- [ ] iOS: skarpt PNG-hjemskjermikon (SVG brukes nå)

## Forbedringer (fra åpen gjennomgang)

Robusthet / arkitektur:
- [x] **#1 Ekte offline** – React Query-cache persistert til IndexedDB (14 d, forkastes
      ved ny appversjon); appen kan åpnes uten nett og vise/logge mot siste data
- [x] **#2 Optimistisk UI** (`onMutate`) for dose/symptom + robust fler-dose-DoseLogger (stabile utkast-rader)
- [~] **#3 Verifiser risikable grenser** – flere parser-fixtures (blodprøve/Garmin),
      `scripts/db-smoke.mjs`, E2E-sjekkliste (`TESTING.md`); gjenstår: kjør mot ekte Fürst-PDF + Garmin-zip
- [x] **#4 Kodesplitting** – dynamisk import av pdf.js + fflate, lazy Prøver/Analyse;
      pdf.js ute av precache (precache ~995→576 KiB)
- [x] **#5 Garmin-cron-robusthet** – `keepalive.yml` (tom commit før 60-dagers-grensen holder
      planlagte workflows aktive), `timeout-minutes` på synk-jobben, dødmannsknapp i appen,
      GitHub-e-post ved feil; dokumentert i GARMIN.md
- [x] **#6 Lås registrering** – app-allowlist (`VITE_TILLATT_EPOST`) + skru av offentlig signup i Supabase

Nye funksjoner:
- [x] **Påminnelser om å logge** – nudge på hjem-skjerm + nettleservarsel ved åpning
      etter valgt tid (catch-up; ekte bakgrunnsvarsler er begrenset i PWA/iOS)
- [x] **Hjem-skjerm-sammendrag/trender** – «gjenstår å logge» + trend-fliser
      (hvilepuls 7 d, søvn, Body Battery, vekt, siste TSH, siste doseendring)
- [x] **Dose-plan med planlagte klokkeslett** – valgfrie faste tidspunkter per medisin
      (migrasjon 0005) forhåndsutfyller riktig klokkeslett på «I dag»
- [x] **Full dataeksport + slett konto** (GDPR) – JSON-eksport av alt, «slett alle data»
      (klient), og «slett konto helt» via Edge Function `slett-konto` (kaskade)
- [x] **Delbar skrivebeskyttet legelenke** – tidsbegrenset øyeblikksbilde (migrasjon 0006
      `report_shares`), offentlig rute `/r/:token`, opprett/kopier/opphev i Eksport

## Senere / idébank
- [ ] «Creon / fordøyelsesenzymer» som loggbar hurtigfaktor
- [x] Regimeendring (T3/Thybon) som egen hendelsestype (🔀) + «Stoffskifte-oppfølging»-kort
      i Analyse (siste TSH/FT4/FT3 + FT3/FT4-ratio over tid med markører)
- [ ] Kobling mot Matplanlegger (daglig ernæringsoppsummering join på dato)
- [ ] Intraday Garmin-data (søvnfaser, HRV om natten) hvis daglig ikke er nok
- [ ] Påminnelser om å logge
