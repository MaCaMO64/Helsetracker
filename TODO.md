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

## Database
- [x] `supabase/setup.sql` kjørt (idempotent samlefil; migrasjoner 0001–0004)

## Gjenstår – dine valgfrie oppsett (når du vil bruke dem)
- [ ] Garmin auto-synk: `bootstrap.py` + 4 GitHub-secrets + backfill (`GARMIN.md`)
- [ ] E-postsending av rapport: Resend-nøkkel + deploy `send-rapport` + `VITE_FUNCTIONS_URL` (`EPOST.md`)
- [ ] AI-import av blodprøve-bilder: deploy `parse-blodprove` + AI-nøkkel i Innstillinger
- [ ] iOS: skarpt PNG-hjemskjermikon (SVG brukes nå)

## Forbedringer (fra åpen gjennomgang)

Robusthet / arkitektur:
- [ ] **#1 Ekte offline** – persistér data (IndexedDB / React Query-persister), ikke bare skrive-kø
- [ ] **#2 Optimistisk UI** (`onMutate`) for dose/symptom; skriv om fler-dose-DoseLogger med stabile utkast-rader
- [~] **#3 Verifiser risikable grenser** – flere parser-fixtures (blodprøve/Garmin),
      `scripts/db-smoke.mjs`, E2E-sjekkliste (`TESTING.md`); gjenstår: kjør mot ekte Fürst-PDF + Garmin-zip
- [ ] **#4 Kodesplitting** – lazy-load `pdfjs-dist` (Prøver), `fflate` (Garmin), graf/analyse
- [ ] **#5 Garmin-cron-fallgruve** – GH Actions deaktiverer planlagte workflows etter 60 dager uten
      repo-aktivitet; vurder mer robust scheduler / dokumentér tydelig
- [x] **#6 Lås registrering** – app-allowlist (`VITE_TILLATT_EPOST`) + skru av offentlig signup i Supabase

Nye funksjoner:
- [ ] **Påminnelser om å logge** (PWA-varsler) – viktigst for etterlevelse
- [ ] **Dose-plan med planlagte klokkeslett** (ikke bare antall) → meningsfulle påminnelser + «tatt / ikke tatt»
- [ ] **Full dataeksport + slett konto** (GDPR-portabilitet/sletting)
- [ ] **Delbar skrivebeskyttet legelenke** (øyeblikksbilde) i stedet for e-postvedlegg
- [ ] **Hjem-skjerm-sammendrag/trender** (hvilepuls 7 d, TSH-trend, siste doseendring)

## Senere / idébank
- [ ] «Creon / fordøyelsesenzymer» som loggbar hurtigfaktor
- [ ] Regimeendring (T3/Thybon) som eget hendelsestips + FT3/FT4-oppfølging
- [ ] Kobling mot Matplanlegger (daglig ernæringsoppsummering join på dato)
- [ ] Intraday Garmin-data (søvnfaser, HRV om natten) hvis daglig ikke er nok
- [ ] Påminnelser om å logge
