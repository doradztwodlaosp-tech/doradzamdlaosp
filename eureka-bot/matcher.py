# -*- coding: utf-8 -*-
"""
matcher.py — ocena rekordu EUREKA względem WSZYSTKICH profili
================================================================
Wersja z 12.11.2026. Co się zmieniło względem poprzedniej:

  PRZEDTEM: rekord był oceniany tylko względem profilu, którego fraza go
  znalazła, a gdy pole PRZEPISY nie potwierdzało artykułu, i tak dostawał
  status DO_WERYFIKACJI i był pobierany. Skutek: pobierane było wszystko,
  co zwróciła wyszukiwarka, a interpretacje IP Box trafiały do ulga_br.

  TERAZ: każdy rekord dostaje jeden z trzech wyroków, zanim pobierzemy PDF.
  Do oceny wystarczą metadane, które przychodzą razem z wynikiem wyszukiwania.

    POTWIERDZONE    pole PRZEPISY zawiera artykuł któregoś profilu
                    (np. art. 30ca ustawy o PIT -> ip_box_pit), niezależnie
                    od tego, który profil rekord znalazł.
    DO_WERYFIKACJI  PRZEPISY nie potwierdza, ale opis rekordu (teza, słowa
                    kluczowe, zagadnienia) zawiera rdzeń tematyczny profilu
                    albo PRZEPISY zawiera przepis pomocniczy (patrz
                    tematy.py). Także rekord, którego nie da się ocenić,
                    bo nie ma opisu: wątpliwość działa na korzyść pobrania.
    ODRZUCONE       żadne z powyższych. Funkcja zwraca pustą listę, scraper
                    nie pobiera PDF-u i zapisuje w rejestrze sam wpis
                    (status 'odrzucone'), żeby nic nie zginęło bez śladu.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

import tematy
from profiles import PROFILE, Profil, Regula


@dataclass(frozen=True)
class Dopasowanie:
    profil_klucz: str
    fraza: str                   # fraza, która zwróciła rekord z wyszukiwarki
    ustawa: str
    etykieta_artykulu: str       # np. "art. 18d" albo powód słabszego dopasowania
    pewnosc: str                 # "POTWIERDZONE" | "DO_WERYFIKACJI"


# Symbol w sygnaturze KIS: .4010. = CIT, .4011. = PIT. Pozostałe poniżej to
# inne podatki (VAT, akcyza, PCC, spadki i darowizny).
_KODY_DOCHODOWE = {"4010": "CIT", "4011": "PIT"}
_KODY_INNYCH_PODATKOW = {"4012", "4013", "4014", "4015"}

_PROFILE_WG_PRIORYTETU = sorted(PROFILE.values(), key=lambda p: (p.priorytet, p.klucz))


# ---------------------------------------------------------------------------
# NARZĘDZIA
# ---------------------------------------------------------------------------
def _lista(wartosc) -> list[str]:
    """Pole z API bywa listą, pojedynczym tekstem albo None. Zawsze lista."""
    if not wartosc:
        return []
    if isinstance(wartosc, str):
        return [wartosc]
    return [str(x) for x in wartosc]


def tekst_opisowy(rekord: dict) -> str:
    """Teza + słowa kluczowe + zagadnienia jako jeden tekst do szukania tematu."""
    czesci = [rekord.get("TEZA") or ""]
    czesci += _lista(rekord.get("SLOWA_KLUCZOWE"))
    czesci += _lista(rekord.get("ZAGADNIENIA"))
    return " ".join(czesci)


def pasuje_ustawa(przepis: str, ustawa: str) -> bool:
    """Czy dany wpis pola PRZEPISY pochodzi z właściwej ustawy (CIT/PIT)?
    Wpisy zaczynają się od '[CIT] Ustawa o podatku dochodowym od osób
    prawnych...' albo '[PIT] Ustawa o podatku dochodowym od osób fizycznych...'."""
    p = przepis.lower()
    if ustawa == "CIT":
        return "[cit]" in p or "osób prawnych" in p
    if ustawa == "PIT":
        return "[pit]" in p or "osób fizycznych" in p
    return False


def podatki_rekordu(rekord: dict) -> set[str]:
    """Zbiór {'CIT','PIT'} ustalony z pola PRZEPISY i z symbolu w sygnaturze.
    Pusty zbiór = nie wiadomo albo inny podatek."""
    wynik: set[str] = set()
    for p in _lista(rekord.get("PRZEPISY")):
        for ustawa in ("CIT", "PIT"):
            if pasuje_ustawa(p, ustawa):
                wynik.add(ustawa)
    for kod in re.findall(r"\.(40\d\d)\.", rekord.get("SYG") or ""):
        if kod in _KODY_DOCHODOWE:
            wynik.add(_KODY_DOCHODOWE[kod])
    return wynik


def inny_podatek(rekord: dict) -> bool:
    """True, gdy sygnatura wskazuje VAT/akcyzę/PCC/SD i nic nie wskazuje na
    CIT ani PIT. Taki rekord nie przechodzi przez próg tematyczny."""
    kody = set(re.findall(r"\.(40\d\d)\.", rekord.get("SYG") or ""))
    return bool(kody & _KODY_INNYCH_PODATKOW) and not podatki_rekordu(rekord)


def opis_nieczytelny(rekord: dict) -> bool:
    """True, gdy z opisu nie da się nic wyczytać: teza pusta, bardzo krótka
    albo ogólnikowa ("Interpretacja indywidualna w zakresie...") i brak słów
    kluczowych."""
    teza = (rekord.get("TEZA") or "").strip()
    if _lista(rekord.get("SLOWA_KLUCZOWE")):
        return False
    if len(teza) < 25:
        return True
    return bool(re.match(r"interpretacja indywidualna\b", teza, re.IGNORECASE)) and len(teza) < 120


def _etykieta_z_wzorca(regula: Regula) -> str:
    """Czytelna etykieta artykułu z wzorca reguły, do raportów
    (np. 'art. 18d' albo 'art. 28c–28t' dla estońskiego CIT)."""
    surowy = regula.wzorzec.replace(r"\s*", "")
    zakres = re.search(r"(\d+)\[([a-z])-([a-z])\]", surowy)
    if zakres:
        cyfry, od, do = zakres.groups()
        return f"art. {cyfry}{od}–{cyfry}{do}"
    pojedynczy = re.search(r"(\d+[a-z]*)", surowy)
    return f"art. {pojedynczy.group(1)}" if pojedynczy else regula.fraza


def dopasuj_regula(przepisy: list[str], regula: Regula) -> bool:
    """True, jeśli KTÓRYKOLWIEK wpis PRZEPISY pasuje do tej pojedynczej
    reguły (właściwa ustawa + wzorzec artykułu)."""
    for p in przepisy or []:
        if pasuje_ustawa(p, regula.ustawa) and re.search(regula.wzorzec, p, re.IGNORECASE):
            return True
    return False


def rekord_wykluczony(rekord_tekst: str, profil: Profil) -> bool:
    """Frazy wykluczające profilu względem opisu rekordu (np. 'ryczałt od
    przychodów ewidencjonowanych' wyklucza estoński CIT)."""
    if not profil.frazy_wykluczajace:
        return False
    tekst = rekord_tekst.lower()
    return any(fw.lower() in tekst for fw in profil.frazy_wykluczajace)


# ---------------------------------------------------------------------------
# GŁÓWNA FUNKCJA
# ---------------------------------------------------------------------------
def ocen_rekord(rekord: dict, profil_szukajacy: Profil, fraza: str) -> list[Dopasowanie]:
    """Ocenia rekord względem WSZYSTKICH profili. Zwraca listę dopasowań
    (rekord może należeć do kilku profili) albo pustą listę = ODRZUCONE.

    Kolejność listy: profile wg priorytetu. Pierwszy element decyduje
    o folderze, do którego trafi plik."""
    przepisy = _lista(rekord.get("PRZEPISY"))
    tekst = tekst_opisowy(rekord)

    # --- STOPIEŃ 1: pole PRZEPISY (dowód mocny) ---
    # Frazy wykluczające sprawdzamy dopiero w stopniu 2. Interpretacja, która
    # cytuje art. 28j ustawy o CIT, dotyczy estońskiego CIT także wtedy, gdy
    # w tezie wspomina o przejściu z ryczałtu ewidencjonowanego.
    potwierdzone: list[Dopasowanie] = []
    for profil in _PROFILE_WG_PRIORYTETU:
        for regula in profil.reguly:
            if dopasuj_regula(przepisy, regula):
                potwierdzone.append(Dopasowanie(
                    profil_klucz=profil.klucz, fraza=fraza, ustawa=regula.ustawa,
                    etykieta_artykulu=_etykieta_z_wzorca(regula), pewnosc="POTWIERDZONE",
                ))
                break
    if potwierdzone:
        return potwierdzone

    # --- Rekordy z innego podatku i WIS (stawki VAT) nie idą dalej ---
    if inny_podatek(rekord) or re.match(r"\s*WIS\b", rekord.get("TEZA") or ""):
        return []

    # --- STOPIEŃ 2: temat w opisie albo przepis pomocniczy (dowód słabszy) ---
    podatki = podatki_rekordu(rekord)
    slabe: list[Dopasowanie] = []
    for profil in _PROFILE_WG_PRIORYTETU:
        if rekord_wykluczony(tekst, profil):
            continue
        ustawy_profilu = set(profil.podatek.split("+"))
        if podatki and not (podatki & ustawy_profilu):
            continue  # np. rekord PIT nie trafi do profilu wyłącznie CIT
        powod = None
        for ustawa, wzorzec in tematy.PRZEPISY_POMOCNICZE.get(profil.klucz, ()):
            if any(pasuje_ustawa(p, ustawa) and re.search(wzorzec, p, re.IGNORECASE) for p in przepisy):
                powod = "przepis pomocniczy (definicja)"
                break
        if powod is None and any(w.search(tekst) for w in tematy.TEMATY_SKOMPILOWANE.get(profil.klucz, ())):
            powod = "temat w opisie rekordu"
        if powod:
            slabe.append(Dopasowanie(
                profil_klucz=profil.klucz, fraza=fraza,
                ustawa=sorted((podatki & ustawy_profilu) or ustawy_profilu)[0],
                etykieta_artykulu=powod, pewnosc="DO_WERYFIKACJI",
            ))
    if slabe:
        return slabe

    # --- Wątpliwość na korzyść pobrania: rekord bez opisu ---
    if opis_nieczytelny(rekord):
        return [Dopasowanie(
            profil_klucz=profil_szukajacy.klucz, fraza=fraza,
            ustawa=profil_szukajacy.podatek.split("+")[0],
            etykieta_artykulu="brak opisu, nie da się ocenić", pewnosc="DO_WERYFIKACJI",
        )]

    return []  # ODRZUCONE


def dopasuj_rekord(przepisy: list[str], profil: Profil, znaleziony_przez_fraze: str) -> Dopasowanie | None:
    """Zgodność wsteczna: ścisłe potwierdzenie względem JEDNEGO profilu.
    Zwraca dopasowanie POTWIERDZONE albo None. Nowy kod używa ocen_rekord."""
    for regula in profil.reguly:
        if dopasuj_regula(przepisy, regula):
            return Dopasowanie(profil.klucz, znaleziony_przez_fraze, regula.ustawa,
                               _etykieta_z_wzorca(regula), "POTWIERDZONE")
    return None
