"""Engangs-bootstrap for Garmin-innlogging.

Kjøres LOKALT på din egen maskin (ikke i CI). Logger inn på Garmin Connect med
e-post/passord og MFA-kode, og skriver ut en token-streng. Denne strengen lagres
som GitHub-secret `GARMIN_TOKENS`, slik at den daglige synken kan logge inn uten
passord (og uten MFA hver gang).

Bruk:
    cd garmin_sync
    python -m pip install -r requirements.txt
    python bootstrap.py

Passordet og MFA-koden brukes kun her og lagres ALDRI – kun det resulterende
token-et skal kopieres videre.

Bruk helst et virtuelt miljø, så Garmin-avhengighetene ikke rører resten av
Python-oppsettet ditt:
    python -m venv .venv
    .venv\\Scripts\\python -m pip install -r requirements.txt
    .venv\\Scripts\\python bootstrap.py
"""

import getpass
from pathlib import Path

from garminconnect import Garmin


def main() -> None:
    print("Garmin Connect – engangsinnlogging for å hente et token.\n")
    email = input("Garmin Connect e-post: ").strip()
    password = getpass.getpass("Garmin Connect passord: ")

    garmin = Garmin(
        email=email,
        password=password,
        prompt_mfa=lambda: input("MFA-kode (fra e-post/autentiseringsapp): ").strip(),
    )
    garmin.login()

    # garminconnect ≥0.3 har egen tokenhåndtering (ikke garth): client.dumps()
    # gir en JSON-streng som login() kan ta imot direkte.
    token = garmin.client.dumps()

    # Lagre lokalt (gitignorert) så `DRY_RUN=1 python sync.py` kan testes uten
    # å måtte lime token inn i miljøvariabler først.
    filsti = Path(__file__).with_name("garmin_tokens.b64")
    filsti.write_text(token, encoding="utf-8")

    print("\n===== GARMIN_TOKENS =====")
    print("Kopier HELE strengen under og lim den inn som GitHub-secret GARMIN_TOKENS:\n")
    print(token)
    print("\n===== slutt =====")
    print(f"\nLagret også lokalt i {filsti.name} (gitignorert) for lokal testing:")
    print("    DRY_RUN=1 python sync.py")
    print("\nTips: token-et varer ca. ett år. Kjør dette scriptet på nytt når synken")
    print("begynner å feile med innloggingsfeil, og oppdater secret-en.")


if __name__ == "__main__":
    main()
