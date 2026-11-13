# -*- coding: utf-8 -*-
"""
przeglad.py — jeden bieg bota
==============================
1. WYSZUKIWANIE: każda fraza z profili (profiles.py) z filtrem daty wydania
   [od, do]. Ta sama fraza w kilku profilach idzie raz. Interpretacje znane
   z rejestru (pobrane / do weryfikacji) są pomijane.
2. OCENA NA METADANYCH (matcher.ocen_rekord — przed pobraniem, bez kosztu),
   względem WSZYSTKICH profili:
     POTWIERDZONE   artykuł ulgi w polu PRZEPISY
     DO_WERYFIKACJI temat w tezie/słowach kluczowych albo przepis pomocniczy
     ODRZUCONE      nic z powyższych (np. interpretacja VAT) — bez pobierania,
                    sam wpis w rejestrze i w arkuszu „Odrzucone”
3. POBRANIE PDF każdej potwierdzonej i każdej do weryfikacji — plik zawsze
   leży u Ciebie. Dla DO_WERYFIKACJI dodatkowo ocena pełnej treści
   (klasyfikator.ocen): gdy treść potwierdza temat → folder profilu;
   gdy nie → folder `_do_weryfikacji/<profil>/<rok>`.
4. STRESZCZENIE z treści PDF (streszczenie.py) do raportu i maila.

Tryb podglądu: tylko wyszukiwanie i ocena metadanych; nie pobiera, nie zapisuje.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import config
import db
import matcher
import tematy
from eureka_client import BlokadaError, nowa_sesja, pauza, pobierz_pdf, wyszukaj
from klasyfikator import data_publikacji, kolejnosc_profili, ocen, tekst_z_pdf
from profiles import PROFILE
from streszczenie import streszcz

LINK_EUREKA = "https://eureka.mf.gov.pl/informacje/{id}"


class LimitPobranError(Exception):
    """Osiągnięto LIMIT_NOWYCH_NA_RUN — reszta zostanie pobrana w kolejnym biegu."""


@dataclass
class Znaleziona:
    rekord: dict
    profile: list[str] = field(default_factory=list)       # profile, których fraza ją znalazła (kolejność)
    frazy: dict[str, str] = field(default_factory=dict)    # profil -> pierwsza fraza, która ją znalazła


# ===========================================================================
# PLIKI
# ===========================================================================
def bezpieczna_nazwa(tekst: str) -> str:
    return re.sub(r'[\\/:*?"<>|]', "_", str(tekst)).strip()


def folder_dla(profil_klucz: str, rekord: dict, status: str) -> Path:
    """pobrano -> <profil>/<rok>; do_weryfikacji -> _do_weryfikacji/<profil>/<rok>.
    Estoński CIT ma własne drzewo w FOLDER_ESTONSKI_CIT."""
    rok = (str(rekord.get("DT_WYD") or "") or "brak-daty")[:4]
    if profil_klucz == "estonski_cit":
        baza = config.FOLDER_ESTONSKI_CIT
        return baza / rok if status == "pobrano" else baza / "_do_weryfikacji" / rok
    nazwa = bezpieczna_nazwa(PROFILE[profil_klucz].nazwa)
    if status == "pobrano":
        return config.BAZA_DANYCH / nazwa / rok
    return config.BAZA_DANYCH / "_do_weryfikacji" / nazwa / rok


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


# Pola, które mają być pojedynczym tekstem. EUREKA zwraca część z nich jako
# listę (np. AUTOR = ["Dyrektor Krajowej Informacji Skarbowej"]). Pola listowe
# (PRZEPISY, SLOWA_KLUCZOWE, ZAGADNIENIA) zostają listami — matcher tego oczekuje.
_POLA_TEKSTOWE = ("SYG", "AUTOR", "TEZA", "DT_WYD", "KATEGORIA_INFORMACJI", "STATUS_INFORMACJI", "DATA_REJESTRACJI")


def normalizuj(rekord: dict) -> dict:
    r = dict(rekord)
    for pole in _POLA_TEKSTOWE:
        v = r.get(pole)
        if isinstance(v, (list, tuple)):
            r[pole] = ", ".join(str(x) for x in v if x)
        elif v is not None and not isinstance(v, str):
            r[pole] = str(v)
    return r


def szukaj_frazy(sesja, fraza: str, od: str, do: str) -> list[dict]:
    rekordy: dict[str, dict] = {}
    strona = 0
    while True:
        wynik = wyszukaj(sesja, fraza, strona, config.ROZMIAR_STRONY, zakres_dat=(od, do))
        wszystkich = wynik.get("totalHits") or 0
        partia = wynik.get("results") or []
        for r in partia:
            if r.get("ID_INFORMACJI") is not None:
                rekordy[str(r["ID_INFORMACJI"])] = normalizuj(r)
        strona += 1
        if not partia or strona * config.ROZMIAR_STRONY >= wszystkich:
            return list(rekordy.values())
        pauza(config.PRZERWA, powod=f"'{fraza}': kolejna strona ({strona + 1})")


# ===========================================================================
# WIERSZ RAPORTU
# ===========================================================================
def _lista(wartosc) -> list[str]:
    if not wartosc:
        return []
    return [wartosc] if isinstance(wartosc, str) else [str(x) for x in wartosc]


def wiersz_raportu(z: Znaleziona, dopasowania: list, status: str, plik: Path | None,
                   ocena=None, podsumowanie: str = "", data_pub: str = "", powod: str = "") -> dict:
    r = z.rekord
    id_inf = str(r.get("ID_INFORMACJI"))
    profile = kolejnosc_profili(d.profil_klucz for d in dopasowania) if dopasowania else kolejnosc_profili(z.profile)
    glowny = profile[0]
    return {
        "id": id_inf,
        "sygnatura": r.get("SYG") or "",
        "data_wydania": (str(r.get("DT_WYD") or ""))[:10],
        "data_publikacji": data_pub,
        "organ": r.get("AUTOR") or "",
        "teza": r.get("TEZA") or "",
        "slowa_kluczowe": ", ".join(_lista(r.get("SLOWA_KLUCZOWE"))),
        "profile": profile,
        "profile_nazwy": [PROFILE[k].nazwa for k in profile],
        "podstawa": PROFILE[glowny].podstawa_prawna,
        "dopasowania": "; ".join(f"{d.profil_klucz}: {d.etykieta_artykulu} [{d.pewnosc}]" for d in dopasowania),
        "frazy": sorted(set(z.frazy.values())),
        "status": status,
        "powod": powod,
        "art": ocena.art if ocena else "", "fraz": ocena.frazy if ocena else "",
        "dochodowe": ocena.dochodowe if ocena else "", "vat": ocena.vat if ocena else "",
        "streszczenie": podsumowanie,
        "grupa": "estonski_cit" if glowny == "estonski_cit" else "ulgi",
        "przepisy": "; ".join(p[:120] for p in _lista(r.get("PRZEPISY"))[:6]),
        "plik": str(plik.relative_to(config.BAZA_DANYCH)) if plik else "",
        "link": LINK_EUREKA.format(id=id_inf),
    }


def dopasowania_z_frazy_jednoznacznej(z: Znaleziona) -> list:
    """Rekord odrzucony na metadanych, ale znaleziony frazą jednoznaczną profilu
    (tematy.FRAZY_JEDNOZNACZNE) -> DO_WERYFIKACJI: bot go pobierze i oceni po treści.
    Nie dotyczy rekordów z innego podatku (VAT, akcyza, PCC — wg sygnatury)."""
    if matcher.inny_podatek(z.rekord):
        return []
    wynik = []
    for k in kolejnosc_profili(z.profile):
        fraza = z.frazy.get(k, "")
        if fraza in tematy.FRAZY_JEDNOZNACZNE.get(k, ()):
            wynik.append(matcher.Dopasowanie(
                profil_klucz=k, fraza=fraza, ustawa=PROFILE[k].podatek.split("+")[0],
                etykieta_artykulu=f"znaleziona frazą jednoznaczną „{fraza}” (metadane jej nie pokazują)",
                pewnosc="DO_WERYFIKACJI"))
    return wynik


# ===========================================================================
# GŁÓWNY BIEG
# ===========================================================================
def uruchom_przeglad(od: date, do: date, profile_klucze: list[str] | None = None,
                     tryb: str = "automatyczny") -> dict:
    podglad = config.TRYB_PODGLAD
    profile_klucze = profile_klucze or list(PROFILE)
    if not podglad:
        config.upewnij_sie_ze_foldery_istnieja()

    licznik = {"zapytania": 0, "znaleziono": 0, "duplikaty": 0, "odrzucone": 0,
               "potwierdzone": 0, "do_weryfikacji": 0, "bledy": 0}
    wiersze: list[dict] = []
    bledy: list[dict] = []
    komunikat = ""
    status = "sukces"
    sesja = nowa_sesja()
    frazy = frazy_do_wyszukania(profile_klucze)

    with db.polacz(config.SCIEZKA_DB) as conn:
        znane = db.znane_id(conn)
        w_rejestrze = db.wszystkie_id(conn)
        bieg_id = 0 if podglad else db.rozpocznij_bieg(conn, tryb, profile_klucze, [od.isoformat(), do.isoformat()])
        conn.commit()
        print(f"Rejestr: {len(znane)} znanych. Okno dat wydania: {od} .. {do}. "
              f"Fraz do sprawdzenia: {len(frazy)} (profile: {len(profile_klucze)})."
              + (" [PODGLĄD — nic nie pobieram, nic nie zapisuję]" if podglad else ""))

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
                        if k not in z.profile:
                            z.profile.append(k)
                        z.frazy.setdefault(k, fraza)
                print(f"  '{fraza}' [{', '.join(profile_frazy)}]: {len(wyniki)} w oknie, nowych łącznie: {len(znalezione)}")

            licznik["znaleziono"] = len(znalezione)
            licznik["duplikaty"] = len(juz_znane)
            print(f"\nNowych interpretacji do oceny: {len(znalezione)}")

            # --- 2. OCENA METADANYCH, 3. POBRANIE, 4. STRESZCZENIE ---
            for id_inf, z in znalezione.items():
                profil_szukajacy = PROFILE[kolejnosc_profili(z.profile)[0]]
                dopasowania = matcher.ocen_rekord(z.rekord, profil_szukajacy, z.frazy[profil_szukajacy.klucz])
                if not dopasowania:
                    dopasowania = dopasowania_z_frazy_jednoznacznej(z)

                if not dopasowania:
                    if id_inf in w_rejestrze:
                        continue  # odrzucona już wcześniej — nie powtarzamy w raporcie
                    licznik["odrzucone"] += 1
                    wiersz = wiersz_raportu(z, [], "odrzucona", None,
                                            powod="metadane: brak przepisu ulgi i tematu profilu w opisie")
                    wiersze.append(wiersz)
                    if podglad:
                        print(f"  [ODRZUCONA] {z.rekord.get('SYG')} — {(z.rekord.get('TEZA') or '')[:80]}")
                    else:
                        db.zapisz_odrzucona(conn, _wiersz_rejestru(z.rekord, "odrzucone", None, None))
                        db.zapisz_wynik_biegu(conn, bieg_id, id_inf, wiersz)
                        conn.commit()
                        w_rejestrze.add(id_inf)
                    continue

                if podglad:
                    # w podglądzie liczymy wg metadanych (bez oceny treści PDF)
                    licznik["potwierdzone" if any(d.pewnosc == "POTWIERDZONE" for d in dopasowania)
                            else "do_weryfikacji"] += 1
                    print(f"  [PODGLĄD] {z.rekord.get('SYG')} ({z.rekord.get('DT_WYD')}) — "
                          + "; ".join(f"{d.profil_klucz} {d.etykieta_artykulu} [{d.pewnosc}]" for d in dopasowania))
                    continue
                pobranych = licznik["potwierdzone"] + licznik["do_weryfikacji"]
                if config.LIMIT_NOWYCH_NA_RUN and pobranych >= config.LIMIT_NOWYCH_NA_RUN:
                    raise LimitPobranError(f"Osiągnięto limit {config.LIMIT_NOWYCH_NA_RUN} pobrań w biegu — "
                                           f"pozostałe zostaną pobrane w kolejnym.")
                _pobierz_ocen_zapisz(conn, sesja, bieg_id, z, dopasowania, licznik, wiersze, znane, blad)
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
                db.zakoncz_bieg(conn, bieg_id, status, {
                    "znaleziono": licznik["znaleziono"], "nowe": licznik["potwierdzone"],
                    "do_weryfikacji": licznik["do_weryfikacji"], "duplikaty": licznik["duplikaty"],
                    "bledy": licznik["bledy"]})
                conn.commit()

    return {"bieg_id": bieg_id, "status": status, "od": od.isoformat(), "do": do.isoformat(),
            "profile": profile_klucze, "licznik": licznik, "wiersze": wiersze, "bledy": bledy,
            "komunikat": komunikat, "podglad": podglad}


def _wiersz_rejestru(r: dict, status: str, plik: Path | None, data_pub: str | None) -> dict:
    id_inf = str(r.get("ID_INFORMACJI"))
    return {
        "id": id_inf, "sygnatura": r.get("SYG"), "tytul": (r.get("TEZA") or "")[:300],
        "data_wydania": (str(r.get("DT_WYD") or ""))[:10], "data_publikacji": data_pub or None,
        "organ": r.get("AUTOR"), "link": LINK_EUREKA.format(id=id_inf),
        "plik_sciezka": str(plik) if plik else None,
        "data_pobrania": db.teraz() if plik else None,
        "status_pobrania": status, "tresc_skrot": (r.get("TEZA") or "")[:400],
    }


def _pobierz_ocen_zapisz(conn, sesja, bieg_id, z: Znaleziona, dopasowania: list,
                         licznik, wiersze, znane, blad) -> None:
    r = z.rekord
    id_inf = str(r["ID_INFORMACJI"])
    profile = kolejnosc_profili(d.profil_klucz for d in dopasowania)
    potwierdzone_meta = [d.profil_klucz for d in dopasowania if d.pewnosc == "POTWIERDZONE"]

    try:
        dane = pobierz_pdf(sesja, id_inf)
    except BlokadaError:
        raise
    except Exception as e:  # noqa: BLE001
        blad(id_inf, profile[0], f"Pobieranie PDF: {e}")
        return

    tekst = tekst_z_pdf(dane)
    data_pub = data_publikacji(tekst)
    ocena = None
    if potwierdzone_meta:
        status = "pobrano"
        glowny = kolejnosc_profili(potwierdzone_meta)[0]
        powod = "przepis ulgi w metadanych: " + "; ".join(
            f"{d.profil_klucz} {d.etykieta_artykulu}" for d in dopasowania if d.pewnosc == "POTWIERDZONE")
    else:
        # DO_WERYFIKACJI wg metadanych → decyduje pełna treść PDF
        oceny = sorted((ocen(tekst, k) for k in profile),
                       key=lambda o: (o.profil_klucz != "estonski_cit", tuple(-x for x in o.sila)))
        trafne = [o for o in oceny if o.trafna]
        ocena = trafne[0] if trafne else oceny[0]
        glowny = ocena.profil_klucz
        status = "pobrano" if trafne else "do_weryfikacji"
        powod = ("treść PDF potwierdza: " if trafne else "treść PDF nie potwierdza: ") + ocena.powod

    plik = folder_dla(glowny, r, status) / nazwa_pliku(r)
    plik.parent.mkdir(parents=True, exist_ok=True)
    plik.write_bytes(dane)
    licznik["potwierdzone" if status == "pobrano" else "do_weryfikacji"] += 1
    print(f"  [{'POTWIERDZONA' if status == 'pobrano' else 'do weryfikacji'}] {r.get('SYG')} — {glowny}: {powod}")

    podsumowanie = streszcz(tekst, profile).tekst()
    wiersz = wiersz_raportu(z, dopasowania, status, plik, ocena, podsumowanie, data_pub, powod)
    wiersze.append(wiersz)

    db.zapisz_interpretacje(conn, _wiersz_rejestru(r, status, plik, data_pub))
    for d in dopasowania:
        db.dopisz_dopasowanie(conn, id_inf, d)
    db.zapisz_wynik_biegu(conn, bieg_id, id_inf, wiersz)
    conn.commit()
    znane.add(id_inf)
