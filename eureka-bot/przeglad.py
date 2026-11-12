# -*- coding: utf-8 -*-
"""
przeglad.py — jeden bieg bota
==============================
1. WYSZUKIWANIE: każda fraza z profili (profiles.py) jest wysyłana do EUREKI
   z filtrem daty wydania [dziś - OKNO_DNI, dziś]. Ta sama fraza w kilku
   profilach (np. „IP Box” w CIT i PIT) idzie tylko raz. Interpretacje już
   znane z rejestru (po ID) są pomijane.
2. POBRANIE: każda nowa znaleziona interpretacja jest pobierana (PDF).
3. OCENA TREŚCI (klasyfikator.py): osobno dla każdego profilu, który ją
   znalazł. Trafne -> folder profilu. Nietrafne -> folder `_odrzucone`
   (nic nie jest kasowane, żeby dało się sprawdzić ocenę).

Tryb podglądu wykonuje tylko wyszukiwanie i pokazuje, co by pobrał —
nie pobiera PDF-ów i niczego nie zapisuje.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import config
import db
from eureka_client import BlokadaError, nowa_sesja, pauza, pobierz_pdf, wyszukaj
from klasyfikator import (Ocena, data_publikacji, dopasowanie_z_oceny, inna_ustawa, kolejnosc_profili,
                          lista_przepisow, ocen, profile_z_przepisow, tekst_z_pdf)
from profiles import PROFILE

LINK_EUREKA = "https://eureka.mf.gov.pl/informacje/{id}"


class LimitPobranError(Exception):
    """Osiągnięto LIMIT_NOWYCH_NA_RUN — reszta zostanie pobrana w kolejnym biegu."""


@dataclass
class Znaleziona:
    rekord: dict
    profile: set[str] = field(default_factory=set)        # profile, których fraza ją znalazła
    frazy: dict[str, str] = field(default_factory=dict)   # profil -> pierwsza fraza, która ją znalazła


# ===========================================================================
# PLIKI
# ===========================================================================
def bezpieczna_nazwa(tekst: str) -> str:
    return re.sub(r'[\\/:*?"<>|]', "_", str(tekst)).strip()


def folder_dla(profil_klucz: str, rekord: dict, trafna: bool) -> Path:
    rok = (str(rekord.get("DT_WYD") or "") or "brak-daty")[:4]
    if profil_klucz == "estonski_cit":
        baza = config.FOLDER_ESTONSKI_CIT
        return baza / rok if trafna else baza / "_odrzucone" / rok
    nazwa = bezpieczna_nazwa(PROFILE[profil_klucz].nazwa)
    return config.BAZA_DANYCH / nazwa / rok if trafna else config.BAZA_DANYCH / "_odrzucone" / nazwa / rok


def nazwa_pliku(rekord: dict) -> str:
    id_inf = str(rekord.get("ID_INFORMACJI"))
    syg = rekord.get("SYG") or "brak_sygnatury"
    data = (str(rekord.get("DT_WYD") or "") or "brak_daty")[:10]
    return bezpieczna_nazwa(f"{data}_{syg}_ID{id_inf}") + ".pdf"


# ===========================================================================
# WYSZUKIWANIE
# ===========================================================================
def frazy_do_wyszukania(profile_klucze: list[str]) -> dict[str, list[str]]:
    """{fraza: [profile, które jej używają]} — każda fraza raz, kolejność stała."""
    frazy: dict[str, list[str]] = {}
    for klucz in kolejnosc_profili(profile_klucze):
        for fraza in PROFILE[klucz].frazy():
            frazy.setdefault(fraza, []).append(klucz)
    return frazy


def szukaj_frazy(sesja, fraza: str, od: str, do: str) -> list[dict]:
    rekordy: dict[str, dict] = {}
    strona = 0
    while True:
        wynik = wyszukaj(sesja, fraza, strona, config.ROZMIAR_STRONY, zakres_dat=(od, do))
        wszystkich = wynik.get("totalHits") or 0
        partia = wynik.get("results") or []
        for r in partia:
            if r.get("ID_INFORMACJI") is not None:
                rekordy[str(r["ID_INFORMACJI"])] = r
        strona += 1
        if not partia or strona * config.ROZMIAR_STRONY >= wszystkich:
            return list(rekordy.values())
        pauza(config.PRZERWA, powod=f"'{fraza}': kolejna strona ({strona + 1})")


# ===========================================================================
# WIERSZ RAPORTU
# ===========================================================================
def wiersz_raportu(z: Znaleziona, oceny: list[Ocena], profil_glowny: str, trafna: bool,
                   status: str, plik: Path | None) -> dict:
    r = z.rekord
    id_inf = str(r.get("ID_INFORMACJI"))
    glowna = next(o for o in oceny if o.profil_klucz == profil_glowny)
    trafne_profile = [o.profil_klucz for o in oceny if o.trafna]
    pokaz = trafne_profile if trafna else [profil_glowny]
    return {
        "id": id_inf,
        "sygnatura": r.get("SYG") or "",
        "data_wydania": (str(r.get("DT_WYD") or ""))[:10],
        "organ": r.get("AUTOR") or "",
        "teza": r.get("TEZA") or "",
        "trafna": trafna,
        "profile": pokaz,
        "profile_nazwy": [PROFILE[k].nazwa for k in pokaz],
        "podstawa": PROFILE[profil_glowny].podstawa_prawna,
        "frazy": sorted({z.frazy[k] for k in z.frazy}),
        "art": glowna.art, "fraz": glowna.frazy, "dochodowe": glowna.dochodowe, "vat": glowna.vat,
        "powod": glowna.powod,
        "grupa": "estonski_cit" if profil_glowny == "estonski_cit" else "ulgi",
        "status": status,
        "przepisy": "; ".join(p[:120] for p in lista_przepisow(r)[:4]),
        "plik": str(plik.relative_to(config.BAZA_DANYCH)) if plik else "",
        "link": LINK_EUREKA.format(id=id_inf),
    }


def wiersz_pominiety(z: Znaleziona, ustawy: str) -> dict:
    """Interpretacja pominięta przed pobraniem (przepisy tylko spoza CIT/PIT)."""
    r = z.rekord
    id_inf = str(r.get("ID_INFORMACJI"))
    profil = kolejnosc_profili(z.profile)[0]
    return {
        "id": id_inf, "sygnatura": r.get("SYG") or "", "data_wydania": (str(r.get("DT_WYD") or ""))[:10],
        "organ": r.get("AUTOR") or "", "teza": r.get("TEZA") or "", "trafna": False,
        "profile": [profil], "profile_nazwy": [PROFILE[k].nazwa for k in kolejnosc_profili(z.profile)],
        "podstawa": PROFILE[profil].podstawa_prawna, "frazy": sorted(set(z.frazy.values())),
        "art": "", "fraz": "", "dochodowe": "", "vat": "",
        "powod": f"przepisy wyłącznie z: {ustawy}",
        "grupa": "estonski_cit" if profil == "estonski_cit" else "ulgi",
        "status": "pominieta",
        "przepisy": "; ".join(p[:120] for p in lista_przepisow(r)[:4]),
        "plik": "", "link": LINK_EUREKA.format(id=id_inf),
    }


# ===========================================================================
# GŁÓWNY BIEG
# ===========================================================================
def uruchom_przeglad(od: date, do: date, profile_klucze: list[str] | None = None,
                     tryb: str = "automatyczny") -> dict:
    podglad = config.TRYB_PODGLAD
    profile_klucze = profile_klucze or list(PROFILE)
    if not podglad:
        config.upewnij_sie_ze_foldery_istnieja()

    licznik = {"zapytania": 0, "znaleziono": 0, "duplikaty": 0, "pominiete": 0,
               "trafne": 0, "odrzucone": 0, "bledy": 0}
    wiersze: list[dict] = []
    bledy: list[dict] = []
    komunikat = ""
    status = "sukces"
    sesja = nowa_sesja()
    frazy = frazy_do_wyszukania(profile_klucze)

    with db.polacz(config.SCIEZKA_DB) as conn:
        znane = db.znane_id(conn)
        bieg_id = 0 if podglad else db.rozpocznij_bieg(conn, tryb, profile_klucze, [od.isoformat(), do.isoformat()])
        conn.commit()
        print(f"Rejestr: {len(znane)} znanych. Okno dat wydania: {od} .. {do}. "
              f"Fraz do sprawdzenia: {len(frazy)} (profile: {len(profile_klucze)})."
              + (" [PODGLĄD — tylko wyszukiwanie]" if podglad else ""))

        def blad(id_inf, profil, tekst):
            licznik["bledy"] += 1
            bledy.append({"id": id_inf or "", "profil": profil or "", "komunikat": tekst, "czas": db.teraz()})
            if not podglad:
                db.zapisz_blad(conn, bieg_id, id_inf, profil, tekst)
                conn.commit()

        try:
            # --- 1. WYSZUKIWANIE ---
            znalezione: dict[str, Znaleziona] = {}
            juz_znane: set[str] = set()
            for nr, (fraza, profile_frazy) in enumerate(frazy.items()):
                if nr:
                    pauza(config.PRZERWA)
                try:
                    wyniki = szukaj_frazy(sesja, fraza, od.isoformat(), do.isoformat())
                except RuntimeError as e:
                    blad(None, ",".join(profile_frazy), f"Wyszukiwanie '{fraza}': {e}")
                    status = "czesciowy"
                    continue
                licznik["zapytania"] += 1
                for r in wyniki:
                    id_inf = str(r["ID_INFORMACJI"])
                    if id_inf in znane:
                        juz_znane.add(id_inf)
                        continue
                    z = znalezione.setdefault(id_inf, Znaleziona(r))
                    for k in profile_frazy:
                        z.profile.add(k)
                        z.frazy.setdefault(k, fraza)
                print(f"  '{fraza}' [{', '.join(profile_frazy)}]: {len(wyniki)} w oknie, "
                      f"nowych łącznie: {len(znalezione)}")

            licznik["znaleziono"] = len(znalezione)
            licznik["duplikaty"] = len(juz_znane)
            print(f"\nNowych interpretacji do pobrania i oceny: {len(znalezione)}")

            # --- 2+3. FILTR PO PRZEPISACH, POBRANIE I OCENA ---
            for id_inf, z in znalezione.items():
                ustawy = inna_ustawa(z.rekord)
                if ustawy:
                    licznik["pominiete"] += 1
                    wiersz = wiersz_pominiety(z, ustawy)
                    wiersze.append(wiersz)
                    if podglad:
                        print(f"  [POMINIĘTA — {ustawy}] {z.rekord.get('SYG')}")
                    else:
                        _zapisz_pominieta(conn, bieg_id, z, wiersz, znane)
                    continue
                if podglad:
                    print(f"  [PODGLĄD] {z.rekord.get('SYG')} ({z.rekord.get('DT_WYD')}) — "
                          f"{', '.join(kolejnosc_profili(z.profile))} — fraza: {', '.join(sorted(set(z.frazy.values())))}")
                    continue
                if config.LIMIT_NOWYCH_NA_RUN and (licznik["trafne"] + licznik["odrzucone"]) >= config.LIMIT_NOWYCH_NA_RUN:
                    raise LimitPobranError(f"Osiągnięto limit {config.LIMIT_NOWYCH_NA_RUN} pobrań w biegu — "
                                           f"pozostałe zostaną pobrane w kolejnym.")
                _pobierz_ocen_zapisz(conn, sesja, bieg_id, z, licznik, wiersze, znane, blad)
                pauza(config.PRZERWA, powod=f"po pobraniu {id_inf}")

        except BlokadaError as e:
            komunikat = f"EUREKA zablokowała zapytania mimo 15-minutowej przerwy: {e} Bieg przerwany."
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
                # Tabela `biegi` ma stare nazwy kolumn: „nowe” = trafne, „do_weryfikacji” = odrzucone.
                db.zakoncz_bieg(conn, bieg_id, status, {
                    "znaleziono": licznik["znaleziono"], "nowe": licznik["trafne"],
                    "do_weryfikacji": licznik["odrzucone"], "duplikaty": licznik["duplikaty"],
                    "bledy": licznik["bledy"]})
                conn.commit()

    return {"bieg_id": bieg_id, "status": status, "od": od.isoformat(), "do": do.isoformat(),
            "profile": profile_klucze, "licznik": licznik, "wiersze": wiersze, "bledy": bledy,
            "komunikat": komunikat, "podglad": podglad}


def _zapisz_pominieta(conn, bieg_id, z: Znaleziona, wiersz: dict, znane) -> None:
    r = z.rekord
    id_inf = wiersz["id"]
    db.zapisz_interpretacje(conn, {
        "id": id_inf, "sygnatura": r.get("SYG"), "tytul": (r.get("TEZA") or "")[:300],
        "data_wydania": wiersz["data_wydania"], "data_publikacji": None, "organ": r.get("AUTOR"),
        "link": wiersz["link"], "plik_sciezka": None, "data_pobrania": None,
        "status_pobrania": "odrzucona", "tresc_skrot": (r.get("TEZA") or "")[:400],
    })
    db.zapisz_wynik_biegu(conn, bieg_id, id_inf, wiersz)
    conn.commit()
    znane.add(id_inf)


def _pobierz_ocen_zapisz(conn, sesja, bieg_id, z: Znaleziona, licznik, wiersze, znane, blad) -> None:
    r = z.rekord
    id_inf = str(r["ID_INFORMACJI"])
    z_przepisow = profile_z_przepisow(r)
    # Treść oceniamy względem WSZYSTKICH profili (fraza B+R często znajduje IP Box itp.).
    kandydaci = kolejnosc_profili(PROFILE)
    znalazcy = kolejnosc_profili(z.profile | set(z_przepisow))

    try:
        dane = pobierz_pdf(sesja, id_inf)
    except BlokadaError:
        raise
    except Exception as e:  # noqa: BLE001
        blad(id_inf, znalazcy[0], f"Pobieranie PDF: {e}")
        return

    tekst = tekst_z_pdf(dane)
    oceny = [ocen(tekst, k, k in z_przepisow) for k in kandydaci]
    # Kolejność: estoński CIT (gdy trafny) zawsze pierwszy, potem najsilniejsze dopasowanie.
    trafne = sorted((o for o in oceny if o.trafna),
                    key=lambda o: (o.profil_klucz != "estonski_cit", tuple(-x for x in o.sila)))
    trafna = bool(trafne)
    if trafna:
        profil_glowny = trafne[0].profil_klucz
    else:
        # Odrzucona: do folderu _odrzucone profilu, którego fraza ją znalazła.
        profil_glowny = max((o for o in oceny if o.profil_klucz in znalazcy), key=lambda o: o.sila).profil_klucz

    plik = folder_dla(profil_glowny, r, trafna) / nazwa_pliku(r)
    plik.parent.mkdir(parents=True, exist_ok=True)
    plik.write_bytes(dane)
    licznik["trafne" if trafna else "odrzucone"] += 1
    glowna = next(o for o in oceny if o.profil_klucz == profil_glowny)
    print(f"  [{'TRAFNA' if trafna else 'odrzucona'}] {r.get('SYG')} — {profil_glowny}: {glowna.powod}")

    status = "pobrano" if trafna else "odrzucona"
    wiersz = wiersz_raportu(z, oceny, profil_glowny, trafna, status, plik)
    wiersz["data_publikacji"] = data_publikacji(tekst)
    wiersze.append(wiersz)

    db.zapisz_interpretacje(conn, {
        "id": id_inf, "sygnatura": r.get("SYG"), "tytul": (r.get("TEZA") or "")[:300],
        "data_wydania": (str(r.get("DT_WYD") or ""))[:10], "data_publikacji": wiersz["data_publikacji"] or None,
        "organ": r.get("AUTOR"), "link": LINK_EUREKA.format(id=id_inf),
        "plik_sciezka": str(plik), "data_pobrania": db.teraz(),
        "status_pobrania": status, "tresc_skrot": (r.get("TEZA") or "")[:400],
    })
    for o in trafne:
        db.dopisz_dopasowanie(conn, id_inf, dopasowanie_z_oceny(o, z.frazy.get(o.profil_klucz, "(treść PDF)")))
    db.zapisz_wynik_biegu(conn, bieg_id, id_inf, wiersz)
    conn.commit()
    znane.add(id_inf)
