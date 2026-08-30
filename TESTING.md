# Testing

## Automatisk
```bash
npm test          # ren logikk: parsere (blodprøve/Garmin), statistikk, offline-kø, datoer
npm run lint
npm run build
npm run smoke     # datalag-røyktest: pinger alle tabeller/kolonner via REST (leser .env.local)
```

`npm run smoke` bekrefter at `supabase/setup.sql` er kjørt (alle tabeller +
nøkkelkolonner finnes) og at RLS blokkerer uinnlogget lesing.

## Manuell E2E-sjekkliste (innlogget, mot ekte Supabase)

Enhetstestene dekker ren logikk; den innloggede flyten må sjekkes manuelt:

- [ ] Logg inn (magic link). Med `VITE_TILLATT_EPOST` satt: en annen e-post skal avvises.
- [ ] Innstillinger: legg til en medisin (enhet, standarddose, **doser per dag = 2**).
- [ ] Innstillinger: legg til et symptom (0–10) og trykk «Legg til vanlige» faktorer.
- [ ] «I dag»: to dosefelter vises; sett **klokkeslett + dose** på begge → ✓. Legg til en ekstra dose. Logg symptom + faktor.
- [ ] Bytt dato med pilene og logg for i går. Sjekk at det havner på riktig dag i Historikk.
- [ ] Historikk: legg til en **hendelse** (doseendring), rediger og slett den.
- [ ] Prøver: last opp en **ekte Fürst-/Helsenorge-PDF** → verifiser at verdiene (TSH/FT4 …) leses riktig. Rett ev. feil i forhåndsvisningen før lagring.
- [ ] Innstillinger → Garmin: last opp en **ekte Garmin-dataeksport-zip** → sjekk at antall dager/datointervall stemmer før import.
- [ ] Analyse: velg dose + respons; sjekk at doseendringer/hendelser vises som markører og at grafene ser riktige ut.
- [ ] Eksport: last ned CSV og «Skriv ut / PDF» – kontroller at rapporten ser doktor-vennlig ut.

## Kjente uverifiserte grenser (jf. TODO #3)
- Blodprøve- og Garmin-parserne er hardnet med fixtures, men **ikke kjørt mot dine
  ekte filer** ennå – gjør det via sjekklista over og meld fra om avvik.
