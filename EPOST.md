# E-postsending av rapport – oppsett

Nedlasting av CSV og «Skriv ut / PDF» virker uten oppsett. For å sende rapporten
til en e-postadresse direkte fra appen, trengs en e-postleverandør. Vi bruker
[Resend](https://resend.com) via en Supabase Edge Function (`send-rapport`).

> **Personvern:** rapporten er helsedata og sendes som vanlig (ukryptert) e-post
> via Resend. Send kun til en mottaker du stoler på. Vurder Resend sin EU-region.

## Steg

### 1. Lag Resend-konto og API-nøkkel
- Registrer deg på [resend.com](https://resend.com), lag en **API key**.
- For test kan du sende fra `onboarding@resend.dev` (Resend tillater da kun din
  egen konto-e-post som mottaker). For reell bruk: verifiser et eget domene og
  sett en avsender som `Helsetracker <rapport@dittdomene.no>`.

### 2. Sett Supabase-secrets
```bash
npx supabase login
npx supabase link --project-ref akqfkxzohedamexmcblc
npx supabase secrets set RESEND_API_KEY=<din-resend-nøkkel>
# valgfritt – egen avsender (krever verifisert domene i Resend):
npx supabase secrets set RAPPORT_FRA="Helsetracker <rapport@dittdomene.no>"
```

### 3. Deploy funksjonen
```bash
npx supabase functions deploy send-rapport --no-verify-jwt
```
(Innlogging kreves i koden via `_shared/auth.ts`; `--no-verify-jwt` slår bare av
plattformens egen sjekk.)

### 4. Sett funksjons-URL i appen
Legg til i `.env.local` **og** som miljøvariabel i Vercel:
```
VITE_FUNCTIONS_URL=https://akqfkxzohedamexmcblc.functions.supabase.co
```
Deploy på nytt (push til `main`). Da dukker «Send» opp som aktiv under
**Analyse → 📄 Eksport til lege**.

## Feilsøking
- «E-postsending er ikke satt opp» → `VITE_FUNCTIONS_URL` mangler i miljøet.
- «RESEND_API_KEY mangler» → secret ikke satt / funksjon ikke re-deployet.
- Kommer ikke fram → sjekk spam, og at avsender/mottaker er tillatt i Resend
  (test-avsenderen `onboarding@resend.dev` kan kun sende til din egen konto-e-post).
