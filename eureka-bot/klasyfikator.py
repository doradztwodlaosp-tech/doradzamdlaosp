# -*- coding: utf-8 -*-
"""
klasyfikator.py — czy interpretacja NAPRAWDĘ dotyczy ulgi z profilu?
=====================================================================
Profile mają szerokie frazy celowo (nie pominąć niczego z dziedziny). Dlatego
filtrujemy WYNIKI, nie frazy — w dwóch krokach:

1. PRZED POBRANIEM (metadane, bez kosztu): jeśli pole PRZEPISY powołuje się
   wyłącznie na ustawy inne niż o CIT/PIT (np. tylko VAT), interpretacja nie
   może dotyczyć żadnej ulgi z profili -> nie pobieramy (`inna_ustawa`).
   Trafia do raportu (arkusz „Pominięte – inna ustawa”) z linkiem, żeby
   można było sprawdzić, że filtr niczego nie gubi.

2. PO POBRANIU: PEŁNA TREŚĆ PDF oceniana dla KAŻDEGO z profili (nie tylko
   tego, którego fraza ją znalazła — np. fraza B+R często znajduje IP Box):

  art      — ile razy w treści pada artykuł ulgi z profilu (np. „art. 18d”)
  frazy    — ile razy padają frazy profilu (z odmianą: „ulgi badawczo-rozwojowej”
             też liczy się jako „ulga badawczo-rozwojowa”)
  dochodowe / vat — ile razy treść odwołuje się do ustaw o CIT/PIT,
             a ile do VAT/akcyzy

Decyzja (progi w config.py, do kalibracji na Twoich przykładach):
  TRAFNA, gdy:
    - pole PRZEPISY w metadanych cytuje artykuł ulgi z właściwej ustawy, albo
    - art >= PROG_ART, albo
    - art >= 1 i frazy >= PROG_FRAZ_Z_ART, albo
    - frazy >= PROG_FRAZ i treść dotyczy bardziej CIT/PIT niż VAT/akcyzy.
  ODRZUCONA w pozostałych przypadkach — np. interpretacja VAT, w której
  „gra komputerowa” pada raz czy dwa razy.

Odrzucone PDF-y NIE są kasowane — trafiają do folderu `_odrzucone`, żeby
można było sprawdzić, czy progi są dobre.
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass

import config
from profiles import PROFILE, Profil

# ---------------------------------------------------------------------------
# USTAWY W TREŚCI
# ---------------------------------------------------------------------------
_CIT = re.compile(r"osób prawnych|u\.?\s?p\.?\s?d\.?\s?o\.?\s?p\b|\bcit\b", re.IGNORECASE)
_PIT = re.compile(r"osób fizycznych|u\.?\s?p\.?\s?d\.?\s?o\.?\s?f\b|\bpit\b", re.IGNORECASE)
_VAT_AKCYZA = re.compile(r"towarów i usług|\bvat\b|u\.?\s?p\.?\s?t\.?\s?u\b|akcyz", re.IGNORECASE)


@dataclass(frozen=True)
class Dopasowanie:
    """Wiersz tabeli `dopasowania` w rejestrze (zgodny z db.dopisz_dopasowanie)."""
    profil_klucz: str
    fraza: str
    ustawa: str
    etykieta_artykulu: str
    pewnosc: str


@dataclass
class Ocena:
    profil_klucz: str
    art: int = 0
    frazy: int = 0
    cit: int = 0
    pit: int = 0
    vat: int = 0
    przepisy: bool = False        # potwierdzone w metadanych PRZEPISY
    trafna: bool = False
    powod: str = ""

    @property
    def dochodowe(self) -> int:
        return self.cit + self.pit

    @property
    def sila(self) -> tuple:
        """Do wyboru profilu głównego, gdy trafnych jest kilka."""
        return (self.przepisy, self.art, self.frazy)


# ---------------------------------------------------------------------------
# POMOCNICZE
# ---------------------------------------------------------------------------
def ustawa_wpisu(przepis: str) -> str | None:
    """'CIT' / 'PIT' / None dla wpisu pola PRZEPISY ('[CIT] Ustawa o podatku...')."""
    p = przepis.lower()
    if "[cit]" in p or "osób prawnych" in p:
        return "CIT"
    if "[pit]" in p or "osób fizycznych" in p:
        return "PIT"
    return None


def lista_przepisow(rekord: dict) -> list[str]:
    surowe = rekord.get("PRZEPISY")
    if not surowe:
        return []
    if isinstance(surowe, str):
        return [surowe]
    return [str(p) for p in surowe if p]


def wzorzec_frazy(fraza: str) -> re.Pattern:
    """Fraza -> regex tolerancyjny na odmianę: każde dłuższe słowo skracamy
    do rdzenia ('rozwojowa' -> 'rozwojo' + dowolna końcówka). Krótkie słowa,
    skróty i liczby ('IP', 'B+R', '5%') muszą wystąpić dokładnie."""
    czesci = []
    for slowo in fraza.split():
        if len(slowo) <= 3 or re.search(r"\d", slowo):
            czesci.append(re.escape(slowo))
        else:
            rdzen = slowo[:-2] if len(slowo) >= 6 else slowo[:-1]
            czesci.append(re.escape(rdzen) + r"[\w-]*")
    return re.compile(r"\b" + r"\s+".join(czesci), re.IGNORECASE)


def _czy_fraza_artykulu(fraza: str) -> bool:
    return bool(re.match(r"art\.?\s*\d", fraza.strip(), re.IGNORECASE))


_WZORCE_FRAZ: dict[str, list[re.Pattern]] = {
    k: [wzorzec_frazy(f) for f in p.frazy() if not _czy_fraza_artykulu(f)] for k, p in PROFILE.items()
}
_WZORCE_ART: dict[str, list[re.Pattern]] = {
    k: [re.compile(w, re.IGNORECASE) for w in dict.fromkeys(r.wzorzec for r in p.reguly)]
    for k, p in PROFILE.items()
}


def kolejnosc_profili(klucze) -> list[str]:
    """Estoński CIT zawsze pierwszy (osobny folder i raport), reszta wg priorytetu."""
    return sorted(set(klucze), key=lambda k: (k != "estonski_cit", PROFILE[k].priorytet, k))


# ---------------------------------------------------------------------------
# METADANE (PRZEPISY) — przed pobraniem, bez kosztu
# ---------------------------------------------------------------------------
def inna_ustawa(rekord: dict) -> str | None:
    """Jeśli interpretacja powołuje się WYŁĄCZNIE na ustawy inne niż o CIT/PIT
    (VAT, akcyza, PCC...), zwraca ich listę — taka interpretacja nie może
    dotyczyć żadnej ulgi z profili, więc nie pobieramy PDF. Gdy pole PRZEPISY
    jest puste (np. stare rekordy z SIP), zwraca None: nie wiemy, więc pobieramy
    i oceniamy treść."""
    przepisy = lista_przepisow(rekord)
    if not przepisy or any(ustawa_wpisu(p) for p in przepisy):
        return None
    ustawy = []
    for p in przepisy:
        m = re.match(r"\s*\[([^\]]+)\]", p)
        nazwa = m.group(1) if m else p[:60]
        if nazwa not in ustawy:
            ustawy.append(nazwa)
    return ", ".join(ustawy)


def profile_z_przepisow(rekord: dict) -> list[str]:
    """Profile, których artykuł (z właściwej ustawy) jest w polu PRZEPISY."""
    przepisy = lista_przepisow(rekord)
    wynik = []
    for klucz, profil in PROFILE.items():
        for regula in profil.reguly:
            if any(ustawa_wpisu(p) == regula.ustawa and re.search(regula.wzorzec, p, re.IGNORECASE)
                   for p in przepisy):
                wynik.append(klucz)
                break
    return kolejnosc_profili(wynik)


# ---------------------------------------------------------------------------
# TREŚĆ PDF
# ---------------------------------------------------------------------------
def tekst_z_pdf(dane: bytes) -> str:
    try:
        from pypdf import PdfReader
        return "\n".join((s.extract_text() or "") for s in PdfReader(io.BytesIO(dane)).pages)
    except Exception:  # noqa: BLE001 — uszkodzony PDF nie może przerwać biegu
        return ""


# Wyliczenia typu „z zastrzeżeniem art. 11c, art. 11i, art. 24a, art. 24b, art. 24ca,
# art. 24d i art. 24f” (cytat art. 7 ust. 2 ustawy o CIT, analogicznie art. 9 w PIT)
# są w setkach interpretacji niezwiązanych z ulgą — nie liczymy z nich wzmianek artykułu.
_ZASTRZEZENIE = re.compile(
    r"z\s+zastrzeżeniem\s+(?:art\.\s*[\w–-]+(?:\s+(?:ust|pkt|lit)\.?\s*[\w–-]+)*\s*(?:,|\bi\b|\boraz\b)?\s*)+",
    re.IGNORECASE)
_DATA_PUBLIKACJI = re.compile(r"Data publikacji:\s*(\d{4}-\d{2}-\d{2})")


def bez_zastrzezen(tekst: str) -> str:
    return _ZASTRZEZENIE.sub(" ", tekst)


def data_publikacji(tekst: str) -> str:
    """Data publikacji z nagłówka PDF EUREKI (API jej nie udostępnia)."""
    m = _DATA_PUBLIKACJI.search(tekst)
    return m.group(1) if m else ""


def ocen(tekst: str, profil_klucz: str, z_przepisow: bool) -> Ocena:
    profil: Profil = PROFILE[profil_klucz]
    o = Ocena(profil_klucz, przepisy=z_przepisow)
    o.art = sum(len(w.findall(bez_zastrzezen(tekst))) for w in _WZORCE_ART[profil_klucz])
    o.frazy = sum(len(w.findall(tekst)) for w in _WZORCE_FRAZ[profil_klucz])
    o.cit = len(_CIT.findall(tekst))
    o.pit = len(_PIT.findall(tekst))
    o.vat = len(_VAT_AKCYZA.findall(tekst))
    t = tekst.lower()
    # Czy treść dotyczy ustawy właściwej dla profilu (IP Box CIT vs IP Box PIT itd.)
    zgodna_ustawa = {"CIT": o.cit >= o.pit, "PIT": o.pit >= o.cit}.get(profil.podatek, True)

    if z_przepisow:
        o.trafna, o.powod = True, "artykuł ulgi w metadanych PRZEPISY"
    elif not tekst.strip():
        o.trafna, o.powod = True, "brak tekstu w PDF (np. skan) — sprawdź ręcznie"
    elif profil.frazy_wykluczajace and o.art == 0 and any(fw.lower() in t for fw in profil.frazy_wykluczajace):
        o.powod = "fraza wykluczająca profilu, brak artykułu"
    elif o.vat > 2 * o.dochodowe and o.art < config.PROG_ART + 1:
        o.powod = "interpretacja dotyczy głównie VAT/akcyzy"
    elif o.art >= config.PROG_ART:
        o.trafna, o.powod = True, f"artykuł ulgi wymieniony {o.art}×"
    elif o.art >= 1 and o.frazy >= config.PROG_FRAZ_Z_ART and zgodna_ustawa:
        o.trafna, o.powod = True, f"artykuł {o.art}× i frazy {o.frazy}×"
    elif o.frazy >= config.PROG_FRAZ and o.dochodowe >= o.vat and zgodna_ustawa:
        o.trafna, o.powod = True, f"frazy profilu {o.frazy}×"
    elif not zgodna_ustawa:
        o.powod = f"treść dotyczy innej ustawy niż profil ({profil.podatek}); artykuł {o.art}×, frazy {o.frazy}×"
    else:
        o.powod = f"za mało wzmianek (artykuł {o.art}×, frazy {o.frazy}×)"
    return o


def dopasowanie_z_oceny(o: Ocena, fraza: str) -> Dopasowanie:
    profil = PROFILE[o.profil_klucz]
    return Dopasowanie(o.profil_klucz, fraza, profil.podatek.split("+")[0],
                       profil.podstawa_prawna, "POTWIERDZONE")
