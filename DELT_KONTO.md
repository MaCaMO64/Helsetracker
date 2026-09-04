# Delt konto – to personer, ett datasett

Modellen: **én «eier»** eier dataene, og **medlemmer** ser og skriver til samme
datasett. Typisk bruk her: familiemedlemmet er eier (det er deres helsedata), og
du er medlem/medhjelper som setter opp import og analyse.

> **Hvorfor eieren bør være personen dataene handler om:** sletter en medhjelper
> sin egen konto, står dataene igjen. Sletter *eieren* kontoen sin, slettes alt
> (kaskade) – som det skal være for den registrerte.
>
> **Vær klar over:** et medlem ser ALLE helsedataene i kontoen. Det er hele
> poenget, men det bør være avtalt.

## Oppsett (én gang)

### 1. Sørg for at begge har en bruker i Supabase
Enklest: la begge logge inn i appen **én gang** med magisk lenke mens
registrering fortsatt er på. Alternativt: Supabase → **Authentication → Users →
Add user / Invite**.

Sjekk at begge står under **Authentication → Users**.

### 2. Finn begge bruker-ID-ene (UID)
Supabase → **Authentication → Users** → klikk hver bruker → kopier **UID**.

- `EIER_UID` = familiemedlemmet (anbefalt eier)
- `MEDLEM_UID` = deg (medhjelper)

### 3. Kjør databaseoppsettet
Kjør hele **`supabase/setup.sql`** i SQL Editor (inneholder migrasjon 0007).
Det er trygt: så lenge `konto_medlemmer` er tom, oppfører alt seg som før.

### 4. Koble medlemmet til eieren
Kjør i SQL Editor (bytt inn UID-ene):

```sql
insert into konto_medlemmer (medlem_uid, eier_uid, navn)
values ('MEDLEM_UID', 'EIER_UID', 'Medhjelper')
on conflict (medlem_uid) do update set eier_uid = excluded.eier_uid;
```

Fra nå av havner alt du logger inn i **eierens** datasett, og begge ser det samme.

### 5. Flytt eventuelle eksisterende data til eieren
Har du testet appen på din egen konto, ligger de radene på din UID. Flytt dem:

```sql
update medications      set user_id = 'EIER_UID' where user_id = 'MEDLEM_UID';
update medication_doses  set user_id = 'EIER_UID' where user_id = 'MEDLEM_UID';
update symptoms          set user_id = 'EIER_UID' where user_id = 'MEDLEM_UID';
update symptom_entries   set user_id = 'EIER_UID' where user_id = 'MEDLEM_UID';
update events            set user_id = 'EIER_UID' where user_id = 'MEDLEM_UID';
update garmin_daily      set user_id = 'EIER_UID' where user_id = 'MEDLEM_UID';
update garmin_sync_log   set user_id = 'EIER_UID' where user_id = 'MEDLEM_UID';
update lab_results       set user_id = 'EIER_UID' where user_id = 'MEDLEM_UID';
update report_shares     set user_id = 'EIER_UID' where user_id = 'MEDLEM_UID';
```

Vil du heller starte rent: bruk **Innstillinger → Dine data → «Slett alle data»**
før du kobler kontoene.

### 6. Lås tilgangen til de to e-postene
Lag hasher (e-poster skal ikke ligge i klartekst i appen – `VITE_*` er offentlig
lesbart i nettleseren):

```bash
node scripts/hash-epost.mjs deg@epost.no familiemedlem@epost.no
```

- **Vercel** → prosjektet → **Settings → Environment Variables** → legg inn
  `VITE_TILLATT_EPOST_HASH` med verdien scriptet skriver ut. Velg **Type: Config**
  (ikke Secret – verdien er offentlig uansett, og Config kan leses tilbake).
  Kryss av for alle miljøene. Fjern en eventuell gammel `VITE_TILLATT_EPOST`.
  **Redeploy** etterpå – `VITE_*` bakes inn ved bygg.
- **Supabase** → **Authentication → Sign In / Providers → Email** → skru **AV**
  «Allow new users to sign up». Begge brukerne finnes allerede, så de kommer inn.

### 7. Garmin-synken må skrive til eieren
I GitHub-secretsene: **`HT_USER_ID` = `EIER_UID`** (ikke medhjelperens).
Se `GARMIN.md`. Bulk-import fra appen treffer riktig konto automatisk.

## Verifisering
1. Logg inn som medlem → **Innstillinger → Konto** skal vise
   «👥 Delt konto».
2. Legg inn en medisin som én bruker → den skal dukke opp hos den andre.
3. `npm run smoke` skal fortsatt være grønn.

## Endre eller fjerne koblingen
```sql
-- fjern medlemmet (får da sitt eget, tomme datasett igjen)
delete from konto_medlemmer where medlem_uid = 'MEDLEM_UID';

-- se hvem som er koblet
select * from konto_medlemmer;
```

## Merk
- **«Slett alle data»** i appen sletter det *delte* datasettet – for begge.
- **Delbare legelenker** er felles: begge kan lage og oppheve dem.
- Legger du til en tredje person senere, er det bare én ny rad i
  `konto_medlemmer` (og e-posten i `VITE_TILLATT_EPOST`).
