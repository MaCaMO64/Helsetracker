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

import os
import sys
from datetime import date, datetime, timedelta, timezone

import requests
from garminconnect import Garmin


class Cfg:
    def __init__(self) -> None:
        self.tokens = os.environ["GARMIN_TOKENS"]
        self.url = os.environ["SUPABASE_URL"].rstrip("/")
        self.key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        self.uid = os.environ["HT_USER_ID"]
        self.dager = int(os.environ.get("DAGER", "3"))


def prov(f, *args):
    """Kjør en Garmin-henter og svelg feil (dager uten data gir 404 e.l.)."""
    try:
        return f(*args)
    except Exception:
        return None


def minutter(sekunder):
    return round(sekunder / 60) if sekunder else None


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
    r.raise_for_status()


def skriv_logg(cfg: Cfg, status: str, fra: str, til: str, antall: int, melding: str) -> None:
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

        if rader:
            upsert_daily(cfg, rader)

        melding = f"{len(rader)} av {len(datoer)} dager hadde data"
        skriv_logg(cfg, "ok", fra, til, len(rader), melding)
        print(f"Ferdig: {melding} ({fra} → {til})")
    except Exception as e:
        print(f"FEIL: {e}", file=sys.stderr)
        skriv_logg(cfg, "feil", fra, til, 0, str(e))
        raise


if __name__ == "__main__":
    main()
