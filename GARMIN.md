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

```bash
cd garmin_sync
python -m pip install -r requirements.txt
python bootstrap.py
```

Skriv inn Garmin-e-post, passord og MFA-koden. Scriptet skriver ut en lang
token-streng. Kopier **hele** strengen.

### 2. Finn din bruker-id og service-role-nøkkel i Supabase

- **HT_USER_ID**: Supabase → **Authentication → Users** → klikk brukeren din →
  kopier `UID` (en uuid).
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
