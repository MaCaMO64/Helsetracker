# Garmin-synk – oppsett

Henter dagssammendrag fra Garmin Connect (hvilepuls, søvn, HRV, stress, Body
Battery, skritt, vekt m.m.) og skriver dem til Supabase-tabellen `garmin_daily`.
Kjøres av GitHub Actions daglig, og kan kjøres manuelt for å hente historikk.

> Garmin har **ikke** et offisielt API. Vi bruker det uoffisielle biblioteket
> `python-garminconnect`. Det kan slutte å virke hvis Garmin endrer noe – da
> fungerer resten av appen fortsatt, men `garmin_daily` blir ikke oppdatert.

## Slik virker det

- Innlogging skjer med et **token** (ikke passord i skyen). Du lager token-et
  én gang lokalt med MFA; det varer ca. **ett år**.
- Token-et og Supabase-nøkkelen ligger som **GitHub-secrets**. Synken bruker
  Supabase sin **service-role-nøkkel**, som omgår RLS – derfor ligger den KUN
  her, aldri i nettleseren/appen.

## Engangsoppsett

### 1. Lag Garmin-token lokalt

Bruk et **virtuelt miljø** – Garmin-pakkene drar med seg `curl_cffi`, som kan
kollidere med andre Python-verktøy (f.eks. `yfinance`) hvis de installeres globalt:

```bash
cd garmin_sync
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python bootstrap.py
```

Skriv inn Garmin-e-post, passord og MFA-koden. Scriptet skriver ut en
token-streng (JSON) **og** lagrer den i `garmin_sync/garmin_tokens.b64`
(gitignorert) for lokal testing. Kopier **hele** strengen til GitHub-secret senere.

### 1b. Test lokalt før du setter opp secrets (anbefalt)

```bash
DRY_RUN=1 .venv\Scripts\python sync.py
```

Dette logger inn på Garmin, henter siste dager og **skriver ut hva som ville blitt
lagret** – uten å røre databasen og uten at du trenger Supabase-nøkler. Ser
tallene riktige ut, går du videre. (Sett `DAGER=7` for flere dager.)

### 2. Finn din bruker-id og service-role-nøkkel i Supabase

- **HT_USER_ID**: Supabase → **Authentication → Users** → kopier `UID` (en uuid)
  til **kontoeieren**. Ved delt konto må dette være *eierens* UID, ikke en
  medhjelpers – se `DELT_KONTO.md`. Bytter du eier senere, må denne oppdateres og
  eksisterende `garmin_daily`-rader flyttes.
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase → **Project Settings → API** →
  «service_role» / «secret» (den hemmelige, IKKE den publishable). Behandle den
  som et passord.
- **SUPABASE_URL**: `https://akqfkxzohedamexmcblc.supabase.co`

### 3. Legg inn GitHub-secrets

GitHub → repoet → **Settings → Secrets and variables → Actions → New repository
secret**. Legg inn disse fire:

| Navn | Verdi |
|---|---|
| `GARMIN_TOKENS` | token-strengen fra steg 1 |
| `SUPABASE_URL` | `https://akqfkxzohedamexmcblc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role-nøkkelen |
| `HT_USER_ID` | din bruker-uuid |

### 4. Hent historikk (backfill) og verifiser

GitHub → **Actions → Garmin-synk → Run workflow** → sett **dager** til f.eks.
`90` → **Run**. Følg loggen. Deretter kjører synken automatisk hver morgen (3
dager om gangen, så sent innkomne data også fanges opp).

Sjekk i appen under **Innstillinger → Garmin** at «siste vellykkede synk» vises,
eller i Supabase **Table Editor → garmin_daily**.

## Vedlikehold

- **Token utløper (~årlig):** synken begynner å feile med innloggingsfeil. Kjør
  `bootstrap.py` på nytt og oppdater `GARMIN_TOKENS`-secret-en.
- **Feilsøking:** se kjøringene i Actions-fanen. Hver kjøring skriver også en rad
  til `garmin_sync_log` (status + melding), som appen bruker til å vise
  «siste synk».
- **Personvern:** service-role-nøkkelen gir full databasetilgang. Del den aldri,
  og ikke legg den i `.env`/koden – kun som GitHub-secret.

## Robusthet – hvis synken stopper

Tre lag med sikring:

1. **Auto-deaktivering etter 60 dager (viktigst å kjenne til).** GitHub
   deaktiverer *planlagte* workflows automatisk hvis repoet ikke har hatt
   aktivitet på 60 dager, og sender deg en e-post om det. Workflowen
   `keepalive.yml` motvirker dette: den lager en tom commit når repoet nærmer seg
   grensen, så både den og Garmin-synken holdes aktive. Skjer det likevel: åpne
   **Actions → Garmin-synk** og trykk **Enable workflow** (eller push en hvilken
   som helst commit).
2. **Dødmannsknapp i appen.** Hver kjøring skriver til `garmin_sync_log`, og
   **Innstillinger → ⌚ Garmin** viser «siste vellykkede synk: X dager siden» –
   gult varsel hvis det er mer enn 2 dager. Blir det stille, vet du det.
3. **E-post ved feil.** GitHub varsler repo-eieren når en workflow-kjøring
   feiler. Jobben har også `timeout-minutes: 15` så den ikke henger.

Kjør uansett en **manuell synk** («Run workflow») etter lengre pauser for å tette
hull, og re-bootstrap Garmin-token-et ca. årlig (se over).
