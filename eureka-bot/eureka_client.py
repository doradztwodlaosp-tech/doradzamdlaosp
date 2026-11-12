# -*- coding: utf-8 -*-
"""
eureka_client.py — komunikacja z API EUREKA (wyszukiwanie + eksport PDF)
=========================================================================
Kształt żądania odpowiada temu, co wysyła sama strona (sprawdzone w DevTools):
przy pustej frazie nie wysyłamy `searchQuery`, a bez wybranych przepisów nie
wysyłamy klucza `PRZEPISY`.
"""
from __future__ import annotations

import random
import time

import requests

import config


class BlokadaError(Exception):
    """EUREKA zwróciła 403/429 (limit lub blokada IP). Bieg kończymy od razu —
    nie próbujemy przeć dalej, żeby nie pogłębiać blokady."""


def _jitter(sekundy: float) -> float:
    delta = sekundy * config.JITTER
    return max(1.0, sekundy + random.uniform(-delta, delta))


def pauza(bazowe_sekundy: float, powod: str = "") -> None:
    ile = _jitter(bazowe_sekundy)
    if powod:
        print(f"      [PAUZA] {powod} — czekam ~{ile:.0f}s...")
    time.sleep(ile)


def nowa_sesja() -> requests.Session:
    sesja = requests.Session()
    sesja.headers.update({
        "User-Agent": "Mozilla/5.0 (compatible; eureka-monitor/3.0)",
        "Content-Type": "application/json",
    })
    return sesja


def _blokada(odpowiedz: requests.Response, co: str) -> BlokadaError:
    retry = odpowiedz.headers.get("Retry-After")
    dopisek = f" (Retry-After: {retry}s)" if retry else ""
    return BlokadaError(f"HTTP {odpowiedz.status_code} przy {co} — limit/blokada IP{dopisek}.")


def _czekaj_po_blokadzie(odpowiedz: requests.Response) -> None:
    """Po 403/429 czekamy tyle, ile każe serwer (Retry-After), a gdy nie poda —
    BLOKADA_CZEKAJ_S (domyślnie 15 minut). Celowo długo: to zalecenie serwera."""
    try:
        sekundy = float(odpowiedz.headers.get("Retry-After") or config.BLOKADA_CZEKAJ_S)
    except ValueError:
        sekundy = config.BLOKADA_CZEKAJ_S
    print(f"      [HTTP {odpowiedz.status_code}] serwer prosi o przerwę — czekam {sekundy / 60:.0f} min, "
          f"potem JEDNA próba; przy kolejnej blokadzie kończę bieg.")
    time.sleep(sekundy)


def zbuduj_cialo(fraza: str = "", zakres_dat: tuple[str, str] | None = None,
                 przepisy_filtr: list[str] | None = None) -> dict:
    """Ciało żądania wyszukiwania. Wydzielone, żeby dało się je przetestować."""
    filtr: dict = {}
    if przepisy_filtr:
        filtr["PRZEPISY"] = przepisy_filtr
    if zakres_dat:
        filtr["DT_WYD_start"], filtr["DT_WYD_end"] = zakres_dat
    cialo: dict = {
        "columns": config.KOLUMNY,
        "filter": filtr,
        "searchInContent": False,
        "searchInFullPhrase": True,
        "searchInSynonyms": False,
        "warunkiDodatkowe": [],
    }
    if fraza:
        cialo["searchQuery"] = fraza
    return cialo


def wyszukaj(sesja: requests.Session, fraza: str, strona: int, rozmiar: int,
             zakres_dat: tuple[str, str] | None = None,
             przepisy_filtr: list[str] | None = None,
             proby: int = config.MAX_PROB) -> dict:
    parametry = {"page": strona, "size": rozmiar, "sort": "parametryPozycjonowania,asc"}
    cialo = zbuduj_cialo(fraza, zakres_dat, przepisy_filtr)

    czekal_po_blokadzie = False
    for nr in range(1, proby + 1):
        try:
            odp = sesja.post(config.URL_WYSZUKIWARKA, params=parametry, json=cialo, timeout=30)
            if odp.status_code in (403, 429):
                if czekal_po_blokadzie:
                    raise _blokada(odp, "wyszukiwaniu")
                _czekaj_po_blokadzie(odp)
                czekal_po_blokadzie = True
                continue
            odp.raise_for_status()
            return odp.json()
        except BlokadaError:
            raise
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as blad:
            print(f"      wyszukiwanie: próba {nr}/{proby} nieudana ({blad})")
            if nr < proby:
                drabinka = config.COOLDOWN_BLEDY_POLACZENIA
                pauza(drabinka[min(nr - 1, len(drabinka) - 1)], powod="odzyskiwanie po błędzie połączenia")
        except (requests.exceptions.RequestException, ValueError) as blad:
            print(f"      wyszukiwanie: próba {nr}/{proby} nieudana ({blad})")
            if nr < proby:
                pauza(config.PRZERWA * (nr + 1))
    raise RuntimeError(f"Wyszukiwanie ({zakres_dat}, fraza={fraza!r}, strona {strona}) nie powiodło się po {proby} próbach.")


def pobierz_pdf(sesja: requests.Session, id_informacji: str, proby: int = config.MAX_PROB) -> bytes:
    url = config.URL_EKSPORT_PDF.format(id=id_informacji)
    czekal_po_blokadzie = False
    for nr in range(1, proby + 1):
        try:
            odp = sesja.get(url, timeout=60)
            if odp.status_code in (403, 429):
                if czekal_po_blokadzie:
                    raise _blokada(odp, f"pobieraniu ID {id_informacji}")
                _czekaj_po_blokadzie(odp)
                czekal_po_blokadzie = True
                continue
            odp.raise_for_status()
            return odp.content
        except BlokadaError:
            raise
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as blad:
            print(f"      pobieranie ID {id_informacji}: próba {nr}/{proby} nieudana ({blad})")
            if nr < proby:
                drabinka = config.COOLDOWN_BLEDY_POLACZENIA
                pauza(drabinka[min(nr - 1, len(drabinka) - 1)], powod=f"przed ponowieniem pobrania {id_informacji}")
        except requests.exceptions.RequestException as blad:
            print(f"      pobieranie ID {id_informacji}: próba {nr}/{proby} nieudana ({blad})")
            if nr < proby:
                pauza(config.PRZERWA * (nr + 1))
    raise RuntimeError(f"Nie udało się pobrać ID {id_informacji} po {proby} próbach.")
