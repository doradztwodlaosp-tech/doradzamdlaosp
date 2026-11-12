# -*- coding: utf-8 -*-
"""
klasyfikator.py — druga warstwa: ocena PEŁNEJ TREŚCI pobranego PDF
===================================================================
Pierwszą warstwą jest matcher.ocen_rekord (metadane z wyszukiwarki, przed
pobraniem): POTWIERDZONE / DO_WERYFIKACJI / ODRZUCONE.

Ta warstwa działa tylko dla rekordów DO_WERYFIKACJI, już po pobraniu PDF.
Liczy w treści, osobno dla każdego profilu:
  art      — wzmianki artykułu ulgi (bez wyliczeń „z zastrzeżeniem art. …”,
             które cytują art. 7 ust. 2 ustawy o CIT w setkach interpretacji)
  frazy    — wzmianki fraz profilu, z odmianą
  cit/pit/vat — odwołania do ustaw o CIT, PIT, VAT/akcyzie
Jeśli treść potwierdza temat (progi w config.py), interpretacja trafia do
folderu profilu jak potwierdzona. Jeśli nie — do folderu `_do_weryfikacji`
(nic nie jest kasowane; raport pokazuje liczby, żeby dało się kalibrować).
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass

import config
from profiles import PROFILE, Profil

_CIT = re.compile(r"osób prawnych|u\.?\s?p\.?\s?d\.?\s?o\.?\s?p\b|\bcit\b", re.IGNORECASE)
_PIT = re.compile(r"osób fizycznych|u\.?\s?p\.?\s?d\.?\s?o\.?\s?f\b|\bpit\b", re.IGNORECASE)
_VAT_AKCYZA = re.compile(r"towarów i usług|\bvat\b|u\.?\s?p\.?\s?t\.?\s?u\b|akcyz", re.IGNORECASE)
_ZASTRZEZENIE = re.compile(
    r"z\s+zastrzeżeniem\s+(?:art\.\s*[\w–-]+(?:\s+(?:ust|pkt|lit)\.?\s*[\w–-]+)*\s*(?:,|\bi\b|\boraz\b)?\s*)+",
    re.IGNORECASE)
_DATA_PUBLIKACJI = re.compile(r"Data publikacji:\s*(\d{4}-\d{2}-\d{2})")


@dataclass
class Ocena:
    profil_klucz: str
    art: int = 0
    frazy: int = 0
    cit: int = 0
    pit: int = 0
    vat: int = 0
    trafna: bool = False
    powod: str = ""

    @property
    def dochodowe(self) -> int:
        return self.cit + self.pit

    @property
    def sila(self) -> tuple:
        return (self.art, self.frazy)


def wzorzec_frazy(fraza: str) -> re.Pattern:
    """Fraza -> regex tolerancyjny na odmianę: dłuższe słowa skracamy do rdzenia.
    Krótkie słowa, skróty i liczby ('IP', 'B+R', '5%') muszą wystąpić dokładnie."""
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


_WZORCE_FRAZ = {k: [wzorzec_frazy(f) for f in p.frazy() if not _czy_fraza_artykulu(f)] for k, p in PROFILE.items()}
_WZORCE_ART = {k: [re.compile(w, re.IGNORECASE) for w in dict.fromkeys(r.wzorzec for r in p.reguly)]
               for k, p in PROFILE.items()}


def kolejnosc_profili(klucze) -> list[str]:
    """Estoński CIT zawsze pierwszy (osobny folder i raport), reszta wg priorytetu."""
    return sorted(set(klucze), key=lambda k: (k != "estonski_cit", PROFILE[k].priorytet, k))


def tekst_z_pdf(dane: bytes) -> str:
    try:
        from pypdf import PdfReader
        return "\n".join((s.extract_text() or "") for s in PdfReader(io.BytesIO(dane)).pages)
    except Exception:  # noqa: BLE001 — uszkodzony PDF nie może przerwać biegu
        return ""


def bez_zastrzezen(tekst: str) -> str:
    return _ZASTRZEZENIE.sub(" ", tekst)


def data_publikacji(tekst: str) -> str:
    """Data publikacji z nagłówka PDF EUREKI (API jej nie udostępnia)."""
    m = _DATA_PUBLIKACJI.search(tekst)
    return m.group(1) if m else ""


def ocen(tekst: str, profil_klucz: str) -> Ocena:
    profil: Profil = PROFILE[profil_klucz]
    o = Ocena(profil_klucz)
    o.art = sum(len(w.findall(bez_zastrzezen(tekst))) for w in _WZORCE_ART[profil_klucz])
    o.frazy = sum(len(w.findall(tekst)) for w in _WZORCE_FRAZ[profil_klucz])
    o.cit = len(_CIT.findall(tekst))
    o.pit = len(_PIT.findall(tekst))
    o.vat = len(_VAT_AKCYZA.findall(tekst))
    zgodna_ustawa = {"CIT": o.cit >= o.pit, "PIT": o.pit >= o.cit}.get(profil.podatek, True)

    if not tekst.strip():
        o.trafna, o.powod = True, "brak tekstu w PDF (np. skan) — do ręcznego sprawdzenia"
    elif o.vat > 2 * o.dochodowe and o.art < config.PROG_ART + 1:
        o.powod = "treść dotyczy głównie VAT/akcyzy"
    elif o.art >= config.PROG_ART:
        o.trafna, o.powod = True, f"artykuł ulgi wymieniony {o.art}×"
    elif o.art >= 1 and o.frazy >= config.PROG_FRAZ_Z_ART and zgodna_ustawa:
        o.trafna, o.powod = True, f"artykuł {o.art}× i frazy {o.frazy}×"
    elif o.frazy >= config.PROG_FRAZ and o.dochodowe >= o.vat and zgodna_ustawa:
        o.trafna, o.powod = True, f"frazy profilu {o.frazy}×"
    elif not zgodna_ustawa:
        o.powod = f"treść dotyczy innej ustawy niż profil ({profil.podatek}); artykuł {o.art}×, frazy {o.frazy}×"
    else:
        o.powod = f"za mało wzmianek w treści (artykuł {o.art}×, frazy {o.frazy}×)"
    return o
