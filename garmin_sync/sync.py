"""Daglig Garmin-synk: henter dagssammendrag fra Garmin Connect og skriver dem
til Supabase-tabellen `garmin_daily`. Kjøres av GitHub Actions (daglig + manuelt).

Env (settes som GitHub-secrets/variabler):
    GARMIN_TOKENS               token fra bootstrap.py
    SUPABASE_URL                https://<ref>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY   service-role-nøkkel (omgår RLS – kun her!)
    HT_USER_ID                  din auth-bruker-uuid (Supabase → Authentication → Users)
    DAGER                       antall dager bakover å hente (default 3; sett høyt for backfill)

Garmin har intet offisielt API – biblioteket er uoffisielt og kan brekke hvis
Garmin endrer noe. Derfor er alt her defensivt: manglende felter blir NULL, og
en dag uten data hoppes over. Uansett utfall skrives en rad til garmin_sync_log.
"""

import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests
from garminconnect import Garmin

# Windows-konsollen bruker ofte cp1252, som ikke takler æøå eller «→».
# Uten dette kan et ellers vellykket kjør krasje på siste utskrift.
for _strom in (sys.stdout, sys.stderr):
    try:
        _strom.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass

# DRY_RUN=1: hent fra Garmin og skriv ut hva som VILLE blitt lagret, uten å røre
# databasen. Da trengs kun et token (env GARMIN_TOKENS eller filen
# garmin_tokens.b64 som bootstrap.py lager) – ingen Supabase-nøkler.
DRY_RUN = os.environ.get("DRY_RUN", "").strip().lower() in ("1", "true", "yes")


def les_token() -> str:
    t = os.environ.get("GARMIN_TOKENS")
    if t:
        return t
    fil = Path(__file__).with_name("garmin_tokens.b64")
    if fil.exists():
        return fil.read_text(encoding="utf-8").strip()
    raise SystemExit(
        "Mangler Garmin-token. Kjør `python bootstrap.py` først, "
        "eller sett miljøvariabelen GARMIN_TOKENS."
    )


UUID_MONSTER = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


def krev(navn: str) -> str:
    """Hent en påkrevd miljøvariabel, trimmet – med tydelig feil hvis den mangler."""
    verdi = (os.environ.get(navn) or "").strip()
    if not verdi:
        raise SystemExit(
            f"KONFIGFEIL: mangler {navn}.\n"
            "Sjekk GitHub → Settings → Secrets and variables → Actions at alle fire finnes\n"
            "med EKSAKT disse navnene: GARMIN_TOKENS, SUPABASE_URL,\n"
            "SUPABASE_SERVICE_ROLE_KEY, HT_USER_ID."
        )
    return verdi


class Cfg:
    def __init__(self) -> None:
        self.tokens = les_token()
        # .strip(): «set DAGER=7 && …» i cmd.exe gir verdien «7 » med mellomrom.
        self.dager = int((os.environ.get("DAGER") or "3").strip() or 3)
        if DRY_RUN:
            self.url = self.key = ""
            self.uid = "dry-run"
        else:
            self.url = krev("SUPABASE_URL").rstrip("/")
            self.key = krev("SUPABASE_SERVICE_ROLE_KEY")
            self.uid = krev("HT_USER_ID")
            if not UUID_MONSTER.match(self.uid):
                raise SystemExit(
                    f"KONFIGFEIL: HT_USER_ID ser ikke ut som en uuid (fikk {len(self.uid)} tegn).\n"
                    "Hent «User UID» fra Supabase → Authentication → Users, uten mellomrom."
                )
            if not self.url.startswith("https://"):
                raise SystemExit(f"KONFIGFEIL: SUPABASE_URL må starte med https:// (fikk: {self.url[:30]})")


def prov(f, *args):
    """Kjør en Garmin-henter og svelg feil (dager uten data gir 404 e.l.)."""
    try:
        return f(*args)
    except Exception:
        return None


def minutter(sekunder):
    return round(sekunder / 60) if sekunder else None


# Kolonner som er «integer» i garmin_daily. Garmin sender flyttall for flere av
# dem (f.eks. totalKilocalories = 1602.0), og Postgres avviser da HELE skrivingen
# med «invalid input syntax for type integer». Vi runder derfor eksplisitt.
INT_FELT = (
    "hvilepuls",
    "puls_snitt",
    "sovn_score",
    "sovn_min",
    "dyp_sovn_min",
    "lett_sovn_min",
    "rem_sovn_min",
    "vaaken_min",
    "stress_snitt",
    "body_battery_hoy",
    "body_battery_lav",
    "skritt",
    "kalorier",
    "spo2_snitt",
)

# Kolonner som er «numeric» – tåler desimaler, men må være tall (ikke tekst).
FLOAT_FELT = ("hrv", "respirasjon_snitt", "vekt_kg")


def tving_typer(rad: dict) -> dict:
    """Rund int-kolonner og sikre at numeric-kolonner er tall. Ugyldige verdier
    settes til None framfor å velte hele importen."""
    for felt in INT_FELT:
        v = rad.get(felt)
        if v is None:
            continue
        try:
            rad[felt] = int(round(float(v)))
        except (TypeError, ValueError):
            rad[felt] = None
    for felt in FLOAT_FELT:
        v = rad.get(felt)
        if v is None:
            continue
        try:
            rad[felt] = float(v)
        except (TypeError, ValueError):
            rad[felt] = None
    return rad


def hent_dag(garmin: Garmin, d: str, uid: str):
    """Bygg én garmin_daily-rad for dato d ('YYYY-MM-DD'), eller None hvis tom."""
    summary = prov(garmin.get_user_summary, d) or {}
    sleep = prov(garmin.get_sleep_data, d) or {}
    hrv = prov(garmin.get_hrv_data, d) or {}

    dto = (sleep or {}).get("dailySleepDTO") or {}
    sovn_score = ((dto.get("sleepScores") or {}).get("overall") or {}).get("value")
    hrv_sum = (hrv or {}).get("hrvSummary") or {}

    vekt_kg = None
    bc = prov(garmin.get_body_composition, d, d) or {}
    ta = bc.get("totalAverage") if isinstance(bc, dict) else None
    if isinstance(ta, dict) and ta.get("weight"):
        vekt_kg = round(ta["weight"] / 1000, 1)

    rad = {
        "user_id": uid,
        "dato": d,
        "hvilepuls": summary.get("restingHeartRate"),
        "puls_snitt": summary.get("averageHeartRate"),
        "hrv": hrv_sum.get("lastNightAvg"),
        "hrv_status": hrv_sum.get("status"),
        "sovn_score": sovn_score,
        "sovn_min": minutter(dto.get("sleepTimeSeconds")),
        "dyp_sovn_min": minutter(dto.get("deepSleepSeconds")),
        "lett_sovn_min": minutter(dto.get("lightSleepSeconds")),
        "rem_sovn_min": minutter(dto.get("remSleepSeconds")),
        "vaaken_min": minutter(dto.get("awakeSleepSeconds")),
        "stress_snitt": summary.get("averageStressLevel"),
        "body_battery_hoy": summary.get("bodyBatteryHighestValue"),
        "body_battery_lav": summary.get("bodyBatteryLowestValue"),
        "skritt": summary.get("totalSteps"),
        "kalorier": summary.get("totalKilocalories"),
        "spo2_snitt": summary.get("averageSpo2"),
        "respirasjon_snitt": summary.get("avgWakingRespirationValue"),
        "vekt_kg": vekt_kg,
        "oppdatert": datetime.now(timezone.utc).isoformat(),
    }

    tving_typer(rad)

    # Hopp over dager helt uten data (unngår tomme rader).
    maalte = {k: v for k, v in rad.items() if k not in ("user_id", "dato", "oppdatert")}
    if not any(v is not None for v in maalte.values()):
        return None
    return rad


def upsert_daily(cfg: Cfg, rader: list) -> None:
    r = requests.post(
        f"{cfg.url}/rest/v1/garmin_daily",
        params={"on_conflict": "user_id,dato"},
        headers={
            "apikey": cfg.key,
            "Authorization": f"Bearer {cfg.key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        json=rader,
        timeout=60,
    )
    if not r.ok:
        # Ta med Supabase sin egen feilmelding – raise_for_status() skjuler den,
        # og det er nettopp den som forteller hva som er galt (nøkkel, uuid, kolonne).
        hint = ""
        if r.status_code in (401, 403):
            hint = "\nHint: SUPABASE_SERVICE_ROLE_KEY er feil eller ikke en service/secret-nøkkel."
        elif r.status_code == 400:
            hint = (
                "\nHint: typefeil eller ukjent kolonne. Sier meldingen «invalid input syntax»,"
                "\nsender Garmin en verdi som ikke passer kolonnetypen (se tving_typer())."
                "\nSjekk ellers HT_USER_ID (gyldig uuid) og at setup.sql er kjørt."
            )
        elif r.status_code == 404:
            hint = "\nHint: tabellen garmin_daily finnes ikke – kjør supabase/setup.sql."
        raise RuntimeError(
            f"Supabase svarte {r.status_code} på skriving til garmin_daily: "
            f"{r.text[:500]}{hint}"
        )


def skriv_logg(cfg: Cfg, status: str, fra: str, til: str, antall: int, melding: str) -> None:
    if DRY_RUN:
        return
    try:
        requests.post(
            f"{cfg.url}/rest/v1/garmin_sync_log",
            headers={
                "apikey": cfg.key,
                "Authorization": f"Bearer {cfg.key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json={
                "user_id": cfg.uid,
                "status": status,
                "fra_dato": fra,
                "til_dato": til,
                "antall_dager": antall,
                "melding": melding[:500],
            },
            timeout=30,
        )
    except Exception as e:  # loggskriving skal aldri velte hele jobben
        print(f"Klarte ikke å skrive synk-logg: {e}", file=sys.stderr)


def main() -> None:
    cfg = Cfg()
    idag = date.today()
    datoer = [(idag - timedelta(days=i)).isoformat() for i in range(cfg.dager)]
    fra, til = datoer[-1], datoer[0]

    try:
        garmin = Garmin()
        garmin.login(cfg.tokens)  # base64-token fra bootstrap

        rader = []
        for d in datoer:
            rad = hent_dag(garmin, d, cfg.uid)
            if rad:
                rader.append(rad)
                print(f"  {d}: hvilepuls={rad['hvilepuls']} søvn={rad['sovn_min']}min "
                      f"bodybattery={rad['body_battery_lav']}-{rad['body_battery_hoy']}")
            else:
                print(f"  {d}: ingen data")

        if rader and not DRY_RUN:
            upsert_daily(cfg, rader)
        elif rader:
            print("\n--- DRY RUN: dette ville blitt lagret i garmin_daily ---")
            print(json.dumps(rader, indent=2, ensure_ascii=False))
            print("--- ingenting er skrevet til databasen ---")

        melding = f"{len(rader)} av {len(datoer)} dager hadde data"
        skriv_logg(cfg, "ok", fra, til, len(rader), melding)
        print(f"Ferdig: {melding} ({fra} - {til})")
    except Exception as e:
        print(f"FEIL: {e}", file=sys.stderr)
        skriv_logg(cfg, "feil", fra, til, 0, str(e))
        raise


if __name__ == "__main__":
    main()
