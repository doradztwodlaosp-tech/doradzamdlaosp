# -*- coding: utf-8 -*-
"""
klasyfikator.py — ocena rekordu EUREKA względem WSZYSTKICH profili ulg naraz
=============================================================================
Wejście: rekord z odpowiedzi API (słownik z polami PRZEPISY, TEZA, ...).
Wyjście: `Wynik` z jedną z trzech kategorii:

  POTWIERDZONE    pole PRZEPISY cytuje artykuł ulgi z ustawy CIT/PIT zgodnej z
                  regułą profilu. Tylko takie rekordy mają pobierany PDF.
  DO_WERYFIKACJI  PRZEPISY nie potwierdza żadnego profilu, ale rekord dotyczy
                  podatków dochodowych (lub PRZEPISY jest puste), a TEZA/słowa
                  kluczowe zawierają frazę z profilu. Trafia TYLKO do raportu
                  (bez PDF) — człowiek decyduje.
  ODRZUCONE       rekord dotyczy wyłącznie innych ustaw (VAT, akcyza, PCC...)
                  albo nie ma ani przepisu, ani frazy ulgi. Zapamiętywany
                  w rejestrze (żeby nie oceniać go drugi raz), bez PDF.

Dzięki temu "1-2 słowa o grze komputerowej w interpretacji VAT" nigdy nie
kończy jako pobrany plik: decyduje, co interpretacja CYTUJE, a nie to, co
wspomina.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from profiles import PROFILE, Profil


@dataclass(frozen=True)
class Dopasowanie:
    profil_klucz: str
    fraza: str
    ustawa: str
    etykieta_artykulu: str
    pewnosc: str                 # "POTWIERDZONE" | "DO_WERYFIKACJI"


@dataclass
class Wynik:
    kategoria: str               # "POTWIERDZONE" | "DO_WERYFIKACJI" | "ODRZUCONE"
    dopasowania: list[Dopasowanie] = field(default_factory=list)
    powod: str = ""

    @property
    def profil_glowny(self) -> str | None:
        return self.dopasowania[0].profil_klucz if self.dopasowania else None

    @property
    def profile(self) -> list[str]:
        widziane: list[str] = []
        for d in self.dopasowania:
            if d.profil_klucz not in widziane:
                widziane.append(d.profil_klucz)
        return widziane


# ---------------------------------------------------------------------------
# POMOCNICZE
# ---------------------------------------------------------------------------
def ustawa_wpisu(przepis: str) -> str | None:
    """'CIT' / 'PIT' / None (inna ustawa) dla jednego wpisu pola PRZEPISY.
    Wpisy zaczynają się od np. '[CIT] Ustawa o podatku dochodowym od osób
    prawnych...' albo '[VAT] Ustawa o podatku od towarów i usług...'."""
    p = przepis.lower()
    if "[cit]" in p or "osób prawnych" in p:
        return "CIT"
    if "[pit]" in p or "osób fizycznych" in p:
        return "PIT"
    return None


def etykieta_z_wzorca(wzorzec: str, awaryjnie: str) -> str:
    surowy = wzorzec.replace(r"\s*", "")
    zakres = re.search(r"(\d+)\[([a-z])-([a-z])\]", surowy)
    if zakres:
        cyfry, od, do = zakres.groups()
        return f"art. {cyfry}{od}–{cyfry}{do}"
    pojedynczy = re.search(r"(\d+[a-z]*)", surowy)
    return f"art. {pojedynczy.group(1)}" if pojedynczy else awaryjnie


def lista_przepisow(rekord: dict) -> list[str]:
    surowe = rekord.get("PRZEPISY")
    if not surowe:
        return []
    if isinstance(surowe, str):
        return [surowe]
    return [str(p) for p in surowe if p]


def tekst_pomocniczy(rekord: dict) -> str:
    """TEZA + SŁOWA KLUCZOWE, odporne na null-e i na to, że słowa kluczowe
    bywają listą albo pojedynczym tekstem."""
    teza = rekord.get("TEZA") or ""
    slowa = rekord.get("SLOWA_KLUCZOWE") or []
    if isinstance(slowa, str):
        slowa = [slowa]
    return " ".join([str(teza)] + [str(s) for s in slowa if s]).lower()


def _kolejnosc_profili() -> list[Profil]:
    """Estoński CIT zawsze pierwszy (ma osobny folder i raport), reszta wg priorytetu."""
    return sorted(PROFILE.values(),
                  key=lambda p: (p.klucz != "estonski_cit", p.priorytet, p.klucz))


_PROFILE_W_KOLEJNOSCI = _kolejnosc_profili()


# ---------------------------------------------------------------------------
# GŁÓWNA FUNKCJA
# ---------------------------------------------------------------------------
def klasyfikuj(rekord: dict) -> Wynik:
    przepisy = lista_przepisow(rekord)

    # 1) POTWIERDZONE: artykuł ulgi w PRZEPISY, z właściwej ustawy.
    potwierdzone: list[Dopasowanie] = []
    for profil in _PROFILE_W_KOLEJNOSCI:
        widziane: set[tuple[str, str]] = set()
        for regula in profil.reguly:
            klucz = (regula.wzorzec, regula.ustawa)
            if klucz in widziane:
                continue
            widziane.add(klucz)
            if any(ustawa_wpisu(p) == regula.ustawa and re.search(regula.wzorzec, p, re.IGNORECASE)
                   for p in przepisy):
                potwierdzone.append(Dopasowanie(
                    profil_klucz=profil.klucz, fraza=regula.fraza, ustawa=regula.ustawa,
                    etykieta_artykulu=etykieta_z_wzorca(regula.wzorzec, regula.fraza),
                    pewnosc="POTWIERDZONE"))
    if potwierdzone:
        return Wynik("POTWIERDZONE", potwierdzone, "przepis ulgi w polu PRZEPISY")

    # 2) Rekord cytuje przepisy, ale ŻADEN nie jest z ustawy CIT/PIT -> to VAT,
    #    akcyza, PCC, ordynacja itd. Nie interesuje nas.
    if przepisy and all(ustawa_wpisu(p) is None for p in przepisy):
        return Wynik("ODRZUCONE", [], "przepisy wyłącznie spoza ustaw o CIT/PIT")

    # 3) Rekord o podatkach dochodowych (albo bez przepisów): szukamy fraz
    #    z profili w tezie i słowach kluczowych. Tylko do weryfikacji, bez PDF.
    tekst = tekst_pomocniczy(rekord)
    slabe: list[Dopasowanie] = []
    for profil in _PROFILE_W_KOLEJNOSCI:
        if any(fw.lower() in tekst for fw in profil.frazy_wykluczajace):
            continue
        for fraza in profil.frazy():
            if fraza.lower() in tekst:
                regula = next(r for r in profil.reguly if r.fraza == fraza)
                slabe.append(Dopasowanie(
                    profil_klucz=profil.klucz, fraza=fraza, ustawa=regula.ustawa,
                    etykieta_artykulu=profil.podstawa_prawna, pewnosc="DO_WERYFIKACJI"))
                break  # jedna fraza na profil wystarczy
    if slabe:
        return Wynik("DO_WERYFIKACJI", slabe, "fraza profilu w tezie/słowach kluczowych")

    return Wynik("ODRZUCONE", [], "brak przepisu ulgi i fraz z profili")
