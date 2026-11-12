# -*- coding: utf-8 -*-
"""
przeglad.py — jeden bieg: zrzut z okna dat -> klasyfikacja -> pobranie PDF
===========================================================================
1. Okno [dziś - OKNO_DNI, dziś] dzielimy na kawałki po KROK_DNI dni i dla
   każdego pytamy EUREKĘ o WSZYSTKIE interpretacje wydane w tym czasie (bez
   frazy). To kilkadziesiąt zapytań zamiast setek (po jednym na frazę).
2. Każdy rekord, którego ID nie ma w rejestrze, klasyfikujemy lokalnie
   (klasyfikator.py) — dla wszystkich profili naraz.
3. PDF pobieramy tylko dla POTWIERDZONYCH. DO_WERYFIKACJI idzie do raportu
   bez pliku. ODRZUCONE zapamiętujemy, żeby nie oceniać ich znowu.

Wznowienie po awarii nie jest potrzebne: kolejny bieg i tak przejdzie całe
okno, a rekordy już zapisane pominie po ID. Zapis (commit) robimy po każdym
kawałku okna.

Tryb podglądu niczego nie zapisuje: ani w bazie, ani na dysku.
"""
from __future__ import annotations

import re
from datetime import date, timedelta
from pathlib import Path

import config
import db
from eureka_client import BlokadaError, nowa_sesja, pauza, pobierz_pdf, wyszukaj
from klasyfikator import Wynik, klasyfikuj
from profiles import PROFILE

LINK_EUREKA = "https://eureka.mf.gov.pl/informacje/{id}"


# ===========================================================================
# DATY
# ===========================================================================
def okna_dat(od: date, do: date, krok: int) -> list[tuple[str, str]]:
    """Dzieli [od, do] (włącznie) na kawałki po `krok` dni, od najnowszych."""
    okna: list[tuple[str, str]] = []
    koniec = do
    while koniec >= od:
        poczatek = max(od, koniec - timedelta(days=krok - 1))
        okna.append((poczatek.isoformat(), koniec.isoformat()))
        koniec = poczatek - timedelta(days=1)
    return okna


# ===========================================================================
# PLIKI
# ===========================================================================
def bezpieczna_nazwa(tekst: str) -> str:
    return re.sub(r'[\\/:*?"<>|]', "_", str(tekst)).strip()


def folder_dla(profil_klucz: str, rekord: dict) -> Path:
    rok = (str(rekord.get("DT_WYD") or "") or "brak-daty")[:4]
    if profil_klucz == "estonski_cit":
        return config.FOLDER_ESTONSKI_CIT / rok
    return config.BAZA_DANYCH / bezpieczna_nazwa(PROFILE[profil_klucz].nazwa) / rok


def sciezka_pliku(profil_klucz: str, rekord: dict) -> Path:
    id_inf = str(rekord.get("ID_INFORMACJI"))
    syg = rekord.get("SYG") or "brak_sygnatury"
    data = (str(rekord.get("DT_WYD") or "") or "brak_daty")[:10]
    return folder_dla(profil_klucz, rekord) / (bezpieczna_nazwa(f"{data}_{syg}_ID{id_inf}") + ".pdf")


# ===========================================================================
# ZRZUT JEDNEGO OKNA
# ===========================================================================
def pobierz_okno(sesja, start: str, koniec: str) -> tuple[dict[str, dict], int]:
    """Wszystkie rekordy wydane w [start, koniec]. Zwraca ({ID: rekord}, totalHits).
    Jeśli zebrano mniej unikalnych ID niż totalHits, wypisuje ostrzeżenie
    (np. niestabilne sortowanie między stronami)."""
    rekordy: dict[str, dict] = {}
    strona = 0
    wszystkich = 0
    while True:
        wynik = wyszukaj(sesja, "", strona, config.ROZMIAR_STRONY, zakres_dat=(start, koniec))
        wszystkich = wynik.get("totalHits") or 0
        partia = wynik.get("results") or []
        for r in partia:
            if r.get("ID_INFORMACJI") is not None:
                rekordy[str(r["ID_INFORMACJI"])] = r
        strona += 1
        if not partia or strona * config.ROZMIAR_STRONY >= wszystkich:
            break
        pauza(config.PRZERWA, powod=f"okno {start}..{koniec}, kolejna strona ({strona + 1})")
    if len(rekordy) < wszystkich:
        print(f"    UWAGA: okno {start}..{koniec}: zebrano {len(rekordy)} z {wszystkich} rekordów.")
    return rekordy, wszystkich


# ===========================================================================
# WIERSZ RAPORTU
# ===========================================================================
def wiersz_raportu(rekord: dict, wynik: Wynik, status: str, plik: Path | None) -> dict:
    id_inf = str(rekord.get("ID_INFORMACJI"))
    profile = wynik.profile
    return {
        "id": id_inf,
        "sygnatura": rekord.get("SYG") or "",
        "data_wydania": (str(rekord.get("DT_WYD") or ""))[:10],
        "organ": rekord.get("AUTOR") or "",
        "kategoria_informacji": rekord.get("KATEGORIA_INFORMACJI") or "",
        "teza": rekord.get("TEZA") or "",
        "pewnosc": wynik.kategoria,
        "profile": profile,
        "profile_nazwy": [PROFILE[k].nazwa for k in profile],
        "przepisy_ulg": sorted({d.etykieta_artykulu for d in wynik.dopasowania}),
        "frazy": sorted({d.fraza for d in wynik.dopasowania}),
        "grupa": "estonski_cit" if "estonski_cit" in profile else "ulgi",
        "status": status,
        "plik": str(plik.relative_to(config.BAZA_DANYCH)) if plik else "",
        "link": LINK_EUREKA.format(id=id_inf),
    }


# ===========================================================================
# GŁÓWNY BIEG
# ===========================================================================
def uruchom_przeglad(od: date, do: date, tryb: str = "automatyczny") -> dict:
    """Wykonuje bieg dla okna [od, do]. Zwraca słownik z licznikami, statusem,
    listą wierszy raportu i komunikatem (dla maila)."""
    podglad = config.TRYB_PODGLAD
    if not podglad:
        config.upewnij_sie_ze_foldery_istnieja()

    licznik = {"znaleziono": 0, "nowe": 0, "do_weryfikacji": 0, "odrzucone": 0,
               "duplikaty": 0, "bledy": 0}
    wiersze: list[dict] = []
    bledy: list[dict] = []
    komunikat = ""
    status = "sukces"
    sesja = nowa_sesja()
    okna = okna_dat(od, do, config.KROK_DNI)

    with db.polacz(config.SCIEZKA_DB) as conn:
        znane = db.znane_id(conn)
        bieg_id = 0 if podglad else db.rozpocznij_bieg(conn, tryb, list(PROFILE), [od.isoformat(), do.isoformat()])
        conn.commit()
        print(f"Rejestr: {len(znane)} znanych interpretacji. Okno: {od} .. {do} ({len(okna)} części)."
              + (" [PODGLĄD — nic nie zapisuję]" if podglad else ""))

        def blad(id_inf: str | None, profil: str | None, tekst: str) -> None:
            licznik["bledy"] += 1
            bledy.append({"id": id_inf or "", "profil": profil or "", "komunikat": tekst, "czas": db.teraz()})
            if not podglad:
                db.zapisz_blad(conn, bieg_id, id_inf, profil, tekst)

        try:
            for nr_okna, (start, koniec) in enumerate(okna):
                if nr_okna:
                    pauza(config.PRZERWA, powod="przed kolejną częścią okna")
                try:
                    rekordy, wszystkich = pobierz_okno(sesja, start, koniec)
                except RuntimeError as e:
                    blad(None, None, f"Okno {start}..{koniec}: {e}")
                    status = "czesciowy"
                    continue

                nowe_w_oknie = {k: v for k, v in rekordy.items() if k not in znane}
                licznik["znaleziono"] += len(rekordy)
                licznik["duplikaty"] += len(rekordy) - len(nowe_w_oknie)
                print(f"  {start}..{koniec}: {wszystkich} interpretacji, nowych {len(nowe_w_oknie)}")

                for id_inf, rekord in nowe_w_oknie.items():
                    wynik = klasyfikuj(rekord)
                    _obsluz_rekord(conn, sesja, bieg_id, rekord, wynik, licznik, wiersze, znane, blad, podglad)

                if not podglad:
                    conn.commit()

        except BlokadaError as e:
            komunikat = f"EUREKA zablokowała zapytania: {e} Bieg przerwany — kolejny spróbuje ponownie."
            print(f"\n!!! {komunikat}")
            blad(None, None, komunikat)
            status = "przerwany"
        except LimitPobranError as e:
            komunikat = str(e)
            print(f"\n!!! {komunikat}")
            status = "czesciowy"
        except KeyboardInterrupt:
            komunikat = "Przerwano ręcznie (Ctrl+C)."
            print(f"\n!!! {komunikat}")
            status = "przerwany"
        except Exception as e:  # noqa: BLE001 — każdy inny błąd ma skończyć się raportem i mailem
            komunikat = f"Nieoczekiwany błąd: {type(e).__name__}: {e}"
            print(f"\n!!! {komunikat}")
            blad(None, None, komunikat)
            status = "blad"
        finally:
            if not podglad:
                db.zakoncz_bieg(conn, bieg_id, status, licznik)
                conn.commit()

    return {"bieg_id": bieg_id, "status": status, "od": od.isoformat(), "do": do.isoformat(),
            "licznik": licznik, "wiersze": wiersze, "bledy": bledy, "komunikat": komunikat,
            "podglad": podglad}


class LimitPobranError(Exception):
    """Osiągnięto LIMIT_NOWYCH_NA_RUN — reszta zostanie pobrana w kolejnym biegu."""


def _obsluz_rekord(conn, sesja, bieg_id, rekord, wynik: Wynik, licznik, wiersze, znane, blad, podglad) -> None:
    id_inf = str(rekord.get("ID_INFORMACJI"))
    podstawowe = {
        "id": id_inf,
        "sygnatura": rekord.get("SYG"),
        "tytul": (rekord.get("TEZA") or "")[:300],
        "data_wydania": (str(rekord.get("DT_WYD") or ""))[:10],
        "data_publikacji": None,
        "organ": rekord.get("AUTOR"),
        "link": LINK_EUREKA.format(id=id_inf),
        "plik_sciezka": None,
        "data_pobrania": None,
        "tresc_skrot": (rekord.get("TEZA") or "")[:400],
    }

    if wynik.kategoria == "ODRZUCONE":
        licznik["odrzucone"] += 1
        if not podglad:
            db.zapisz_interpretacje(conn, {**podstawowe, "status_pobrania": "odrzucona"})
            znane.add(id_inf)
        return

    plik: Path | None = None
    if wynik.kategoria == "DO_WERYFIKACJI":
        status = "do_weryfikacji"
        licznik["do_weryfikacji"] += 1
    else:
        if config.LIMIT_NOWYCH_NA_RUN and licznik["nowe"] >= config.LIMIT_NOWYCH_NA_RUN:
            raise LimitPobranError(
                f"Osiągnięto limit {config.LIMIT_NOWYCH_NA_RUN} pobrań w jednym biegu — "
                f"pozostałe zostaną pobrane w kolejnym.")
        plik = sciezka_pliku(wynik.profil_glowny, rekord)
        status = "pobrano"
        if podglad:
            print(f"  [PODGLĄD] {rekord.get('SYG')} — {', '.join(wynik.profile)} -> {plik.name}")
        else:
            try:
                dane = pobierz_pdf(sesja, id_inf)
                plik.parent.mkdir(parents=True, exist_ok=True)
                plik.write_bytes(dane)
                print(f"  [NOWA] {plik.name} ({len(dane)} B) — {', '.join(wynik.profile)}")
            except BlokadaError:
                raise
            except Exception as e:  # noqa: BLE001
                blad(id_inf, wynik.profil_glowny, f"Pobieranie PDF: {e}")
                status, plik = "blad", None
            pauza(config.PRZERWA, powod=f"po pobraniu {id_inf}")
        if status == "pobrano":
            licznik["nowe"] += 1

    wiersz = wiersz_raportu(rekord, wynik, status, plik)
    wiersze.append(wiersz)
    if podglad:
        return

    db.zapisz_interpretacje(conn, {
        **podstawowe,
        "plik_sciezka": str(plik) if plik else None,
        "data_pobrania": db.teraz() if status == "pobrano" else None,
        "status_pobrania": status,
    })
    for d in wynik.dopasowania:
        db.dopisz_dopasowanie(conn, id_inf, d)
    db.zapisz_wynik_biegu(conn, bieg_id, id_inf, wiersz)
    if status != "blad":
        znane.add(id_inf)
