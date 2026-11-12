# -*- coding: utf-8 -*-
"""
config.py — konfiguracja bota EUREKA (wersja serwerowa, Linux)
================================================================
Wszystkie ustawienia nadpisuje się zmiennymi środowiskowymi (plik
/etc/eureka-bot.env na serwerze — patrz INSTALACJA.md). Sekretów (hasło do
poczty) NIE wpisuje się do kodu.
"""
from __future__ import annotations

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# ŚCIEŻKI
# ---------------------------------------------------------------------------
BAZA_DANYCH = Path(os.environ.get("EUREKA_BAZA", str(Path.home() / "eureka-dane")))
SCIEZKA_DB = Path(os.environ.get("EUREKA_DB_PATH", str(BAZA_DANYCH / "_rejestr" / "eureka.sqlite3")))
FOLDER_RAPORTOW = Path(os.environ.get("EUREKA_RAPORTY", str(BAZA_DANYCH / "_raporty")))
# Estoński CIT: osobny folder na pliki i osobny na raporty.
FOLDER_ESTONSKI_CIT = Path(os.environ.get("EUREKA_FOLDER_ESTONSKI", str(BAZA_DANYCH / "Estoński CIT")))
FOLDER_RAPORTOW_ESTONSKI = FOLDER_ESTONSKI_CIT / "_raporty"
PLIK_BLOKADY = BAZA_DANYCH / "_rejestr" / "bot.lock"

# ---------------------------------------------------------------------------
# OKNO PRZESUWNE
# ---------------------------------------------------------------------------
# EUREKA nie pozwala filtrować po dacie publikacji (filtr po DATA_REJESTRACJI
# zwraca 0 wyników — sprawdzone w DevTools). Dlatego każda fraza z profili
# jest wyszukiwana z filtrem daty WYDANIA z ostatnich OKNO_DNI dni, a nowe
# interpretacje rozpoznajemy po tym, że ich ID nie ma jeszcze w rejestrze.
# Interpretacja publikowana jest kilka do kilkunastu dni po wydaniu, stąd zapas.
OKNO_DNI = int(os.environ.get("EUREKA_OKNO_DNI", "45"))

# ---------------------------------------------------------------------------
# LIMITY API (zalecenia KIS/MF): 10 wyszukiwań/min, 10 eksportów/min,
# 30 żądań zbiorczych/min, 300 żądań zbiorczych/godz. z jednego IP.
# PRZERWA=15 s (~4 żądania/min) zostawia duży zapas pod każdym z limitów.
# ---------------------------------------------------------------------------
ROZMIAR_STRONY = int(os.environ.get("EUREKA_ROZMIAR_STRONY", "50"))
PRZERWA = float(os.environ.get("EUREKA_PRZERWA", "15"))
JITTER = float(os.environ.get("EUREKA_JITTER", "0.30"))
MAX_PROB = int(os.environ.get("EUREKA_MAX_PROB", "3"))
# Po odpowiedzi 403/429 bez nagłówka Retry-After czekamy 15 minut (celowo).
BLOKADA_CZEKAJ_S = float(os.environ.get("EUREKA_BLOKADA_CZEKAJ_S", str(15 * 60)))
COOLDOWN_BLEDY_POLACZENIA = [
    float(x) for x in os.environ.get("EUREKA_COOLDOWN_POLACZENIA", "45,120,300").split(",")
]
# Zabezpieczenie: tyle PDF-ów maksymalnie pobieramy w jednym biegu (0 = bez limitu).
# Reszta zostanie pobrana w kolejnym biegu (jest nadal w oknie dat).
LIMIT_NOWYCH_NA_RUN = int(os.environ.get("EUREKA_LIMIT_NOWYCH", "400"))

# ---------------------------------------------------------------------------
# PROGI OCENY TREŚCI (klasyfikator.py) — WARTOŚCI STARTOWE, DO KALIBRACJI
# na przykładowych PDF-ach (dobrych i złych).
# ---------------------------------------------------------------------------
PROG_ART = int(os.environ.get("EUREKA_PROG_ART", "2"))                 # tyle wzmianek artykułu ulgi wystarcza
PROG_FRAZ_Z_ART = int(os.environ.get("EUREKA_PROG_FRAZ_Z_ART", "2"))   # 1 artykuł + tyle fraz
PROG_FRAZ = int(os.environ.get("EUREKA_PROG_FRAZ", "5"))               # same frazy (bez artykułu)

BAZA_API = "https://eureka.mf.gov.pl/api"
URL_WYSZUKIWARKA = BAZA_API + "/public/v1/wyszukiwarka/informacje/"
URL_EKSPORT_PDF = BAZA_API + "/public/v1/informacje/{id}/eksport/pdf"

# Kolumny zwracane przez API (te, które wysyła sama strona EUREKA).
KOLUMNY = [
    "KATEGORIA_INFORMACJI", "SYG", "DT_WYD", "AUTOR", "ID_INFORMACJI",
    "TEZA", "SLOWA_KLUCZOWE", "PRZEPISY", "ZAGADNIENIA",
    "NOMENKLATURA_SCALONA", "KLASYFIKACJA_PKWIU", "KLASYFIKACJA_PKOB",
    "RODZAJ_WYROBU_AKCYZOWEGO", "STATUS_INFORMACJI", "DATA_REJESTRACJI",
    "KOMENTARZE_BIP", "KOM_BIP_OPIS", "NR_INTERP_ZAPYT", "SYGN_ODP",
    "DATA_ODP", "SYGNATURA_ORZECZENIA", "DATA_ORZECZENIA", "SADY",
    "DATA_WYSLANIA_NEWSLETTERA",
]

# ---------------------------------------------------------------------------
# WYSYŁKA: MAIL (Gmail przez hasło aplikacji) i DYSK GOOGLE (rclone)
# ---------------------------------------------------------------------------
SMTP_HOST = os.environ.get("EUREKA_SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("EUREKA_SMTP_PORT", "465"))
SMTP_UZYTKOWNIK = os.environ.get("EUREKA_SMTP_UZYTKOWNIK", "")   # adres konta Gmail, z którego wysyłamy
SMTP_HASLO = os.environ.get("EUREKA_SMTP_HASLO", "")             # HASŁO APLIKACJI Google (nie zwykłe hasło)
MAIL_DO = [a.strip() for a in os.environ.get("EUREKA_MAIL_DO", "").split(",") if a.strip()]

# Cel rclone, np. "gdrive:EUREKA" (nazwa zdalnego z `rclone config` + folder na Dysku).
RCLONE_CEL = os.environ.get("EUREKA_RCLONE_CEL", "")
# Link do folderu na Dysku — tylko do wstawienia w treść maila.
DRIVE_LINK = os.environ.get("EUREKA_DRIVE_LINK", "")

# ---------------------------------------------------------------------------
# TRYB PRACY
# ---------------------------------------------------------------------------
TRYB_PODGLAD = os.environ.get("EUREKA_TRYB_PODGLAD", "0") == "1"


def upewnij_sie_ze_foldery_istnieja() -> None:
    for folder in (BAZA_DANYCH, SCIEZKA_DB.parent, FOLDER_RAPORTOW,
                   FOLDER_ESTONSKI_CIT, FOLDER_RAPORTOW_ESTONSKI):
        folder.mkdir(parents=True, exist_ok=True)
