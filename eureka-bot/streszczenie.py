# -*- coding: utf-8 -*-
"""
streszczenie.py — streszczenie interpretacji z treści PDF
==========================================================
PDF z EUREKI ma stałą strukturę (sprawdzone na prawdziwych plikach):
  „Interpretacja indywidualna – stanowisko prawidłowe / nieprawidłowe / w części …”
  „Opis stanu faktycznego…” → „Pytania” → „Państwa stanowisko w sprawie”
  → „Ocena stanowiska” → „Uzasadnienie interpretacji indywidualnej” → „Pouczenie…”

Z tego budujemy streszczenie:
  rozstrzygniecie  — prawidłowe / nieprawidłowe / w części prawidłowe
  pytania          — lista pytań podatnika (to najlepiej mówi, czego dotyczy sprawa)
  stan_faktyczny   — początek opisu (kim jest wnioskodawca, co robi)
  ocena            — pierwsze zdania oceny KIS (ocena stanowiska)
  kluczowe_zdania  — zdania z uzasadnienia KIS, w których pada artykuł ulgi
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from profiles import PROFILE

_NAGLOWKI = {
    "opis": r"Opis (?:stanu faktycznego|zdarzenia przyszłego)[^\n]*",
    "pytania": r"Pytani[ae][^\n]{0,40}",
    "stanowisko": r"(?:Państwa|Pani|Pana) stanowisko w sprawie[^\n]*|Stanowisko Wnioskodawc[^\n]*",
    "ocena": r"Ocena stanowiska[^\n]*",
    "uzasadnienie": r"Uzasadnienie interpretacji indywidualnej[^\n]*",
    "koniec": r"Informacja o zakresie rozstrzygnięcia|Pouczenie o funkcji ochronnej|Pouczenie o prawie do"
              r"|Podstawa prawna dla wydania interpretacji|Dodatkowe informacje",
}
# Zdania wnioskodawcy (nie KIS) — nie nadają się na „kluczowe zdania” ani konkluzję.
_ZDANIE_WNIOSKODAWCY = re.compile(
    r"\?\s*$|W ocenie Wnioskodawc|zdaniem Wnioskodawc|Państwa zdaniem|W Państwa ocenie|Wnioskodawca uważa"
    r"|Wnioskodawca stoi na stanowisku|stanowisko Wnioskodawc|Jej zdaniem|Jego zdaniem|w uzupełnieniu wniosku"
    r"|^\s*(?:Ad\.?\s*)?\d+[.)]?\s*Czy\b", re.IGNORECASE)
# Zdania „wnioskowe” KIS — najlepsze na konkluzję.
_ZDANIE_WNIOSKU = re.compile(
    r"\b(Tym samym|W związku z powyższym|Podsumowując|Reasumując|W konsekwencji|Zatem|Mając na uwadze"
    r"|Biorąc pod uwagę|Wobec powyższego|Stąd|W świetle powyższego)\b", re.IGNORECASE)
_ZNACZNIK = "\x00"
_ROZSTRZYGNIECIE = re.compile(
    r"Interpretacja indywidualna\s*[–-]\s*stanowisko\s+([^\n]+?)\s*\n", re.IGNORECASE)
_ROZSTRZYGNIECIE_2 = re.compile(
    r"Stanowisko, które przedstawili?(?:ście)? (?:Państwo|Pan|Pani)[^.]{0,80}?jest\s+([^.\n]+)", re.IGNORECASE)


@dataclass
class Streszczenie:
    rozstrzygniecie: str = ""
    pytania: list[str] = field(default_factory=list)
    stan_faktyczny: str = ""
    ocena: str = ""
    konkluzja: str = ""
    kluczowe_zdania: list[str] = field(default_factory=list)

    def tekst(self, max_pytan: int = 6) -> str:
        """Jedno czytelne streszczenie (do Excela i maila)."""
        czesci = []
        if self.rozstrzygniecie:
            czesci.append(f"ROZSTRZYGNIĘCIE: {self.rozstrzygniecie}")
        if self.pytania:
            czesci.append("PYTANIA:\n" + "\n".join(f"  {i}. {p}" for i, p in enumerate(self.pytania[:max_pytan], 1)))
            if len(self.pytania) > max_pytan:
                czesci.append(f"  (… i {len(self.pytania) - max_pytan} kolejnych)")
        if self.stan_faktyczny:
            czesci.append(f"STAN FAKTYCZNY: {self.stan_faktyczny}")
        if self.ocena:
            czesci.append(f"OCENA KIS: {self.ocena}")
        if self.konkluzja:
            czesci.append(f"KONKLUZJA UZASADNIENIA: {self.konkluzja}")
        if self.kluczowe_zdania:
            czesci.append("KLUCZOWE ZDANIA Z UZASADNIENIA:\n" + "\n".join(f"  • {z}" for z in self.kluczowe_zdania))
        return "\n".join(czesci)


def _sekcja(tekst: str, od: str, do_: tuple[str, ...]) -> str:
    m = re.search(_NAGLOWKI[od], tekst)
    if not m:
        return ""
    reszta = tekst[m.end():]
    konce = [re.search(_NAGLOWKI[k], reszta) for k in do_]
    pozycje = [k.start() for k in konce if k]
    return reszta[:min(pozycje)] if pozycje else reszta


def _bez_numerow_stron(tekst: str) -> str:
    """PDF wkleja numer strony jako osobną linię („…podatku\\n2\\ndochodowego”)."""
    return re.sub(r"\n\s*\d{1,3}\s*\n", "\n", tekst)


def _zdania(tekst: str) -> list[str]:
    tekst = re.sub(r"\s+", " ", tekst).strip()
    # nie dzielimy po „art.”, „ust.”, „pkt.”, „r.”, „tj.”, „np.” itd.
    tekst = re.sub(r"\b(art|ust|pkt|lit|poz|tj|t\.\s?j|np|tzw|ww|nr|r|zm|dz|u|zd|str|ok|m\.in|ad)\.\s",
                   lambda m: m.group(1) + "." + _ZNACZNIK, tekst, flags=re.I)
    zdania = re.split(r"(?<=[.!?])\s+(?=[A-ZŁŚŻŹĆŃÓĘĄ„(\d])", tekst)
    return [z.replace(_ZNACZNIK, " ").strip() for z in zdania if len(z.strip()) > 20]


def _skroc(tekst: str, limit: int) -> str:
    tekst = re.sub(r"\s+", " ", tekst).strip()
    if len(tekst) <= limit:
        return tekst
    ciecie = tekst[:limit].rsplit(". ", 1)
    return (ciecie[0] + "." if len(ciecie) == 2 and len(ciecie[0]) > limit // 2 else tekst[:limit].rstrip()) + " (…)"


def _pytania(sekcja: str) -> list[str]:
    sekcja = re.sub(r"[ \t]+", " ", sekcja).strip()
    if not sekcja:
        return []
    # pytania numerowane „1.”, „1)”, „Pytanie 1” — albo jedno pytanie bez numeru
    czesci = re.split(r"\n\s*(?:\d{1,2}[.)]|Pytanie\s+nr\s*\d+[.:]?|Pytanie\s+\d+[.:]?)\s*", "\n" + sekcja)
    pytania = [re.sub(r"\s+", " ", c).strip() for c in czesci if c.strip()]
    if len(pytania) <= 1:
        calosc = re.sub(r"\s+", " ", sekcja)
        pytania = [p.strip() + "?" for p in calosc.split("?") if len(p.strip()) > 15]
    return [_skroc(p, 600) for p in pytania if "?" in p or len(p) > 40][:12]


def streszcz(tekst: str, profile_klucze: list[str]) -> Streszczenie:
    s = Streszczenie()
    if not tekst or not tekst.strip():
        return s
    tekst = _bez_numerow_stron(tekst)

    m = _ROZSTRZYGNIECIE.search(tekst) or _ROZSTRZYGNIECIE_2.search(tekst)
    if m:
        s.rozstrzygniecie = re.sub(r"\s+", " ", m.group(1)).strip(" .")

    s.pytania = _pytania(_sekcja(tekst, "pytania", ("stanowisko", "ocena")))
    opis = _sekcja(tekst, "opis", ("pytania", "stanowisko", "ocena"))
    s.stan_faktyczny = _skroc(opis, 700)

    ocena = _sekcja(tekst, "ocena", ("uzasadnienie", "koniec"))
    s.ocena = _skroc(ocena, 500)

    # Część KIS: „Ocena stanowiska” + „Uzasadnienie interpretacji” aż do pouczeń.
    # Gdy KIS odstąpił od uzasadnienia (art. 14c § 1 Op), uzasadnienia nie ma —
    # wtedy całe rozumowanie KIS jest w części „Ocena stanowiska”.
    czesc_kis = (_sekcja(tekst, "ocena", ("koniec",)) or _sekcja(tekst, "uzasadnienie", ("koniec",)))
    zdania_kis = [z for z in _zdania(czesc_kis) if not _ZDANIE_WNIOSKODAWCY.search(z)
                  and not re.search(r"Odstępuję od uzasadnienia|art\.\s*14c", z)]

    # Konkluzja: ostatnie zdania wnioskowe KIS; gdy ich nie ma — ostatnie zdania części KIS.
    wnioski = [z for z in zdania_kis if _ZDANIE_WNIOSKU.search(z)]
    s.konkluzja = _skroc(" ".join((wnioski or zdania_kis)[-2:]), 700) if zdania_kis else ""

    wzorce = []
    for k in profile_klucze:
        wzorce += [re.compile(r.wzorzec, re.IGNORECASE) for r in PROFILE[k].reguly]
    kluczowe = []
    for z in zdania_kis:
        if any(w.search(z) for w in wzorce) and not re.search(r"z zastrzeżeniem", z, re.I) and z not in s.konkluzja:
            # zdania z oceną KIS są cenniejsze niż sam cytat przepisu
            waga = 2 if (_ZDANIE_WNIOSKU.search(z) or re.search(
                r"\b(mogą Państwo|może Pan|może Pani|nie mogą|nie może|przysługuje|nie przysługuje|stanowi|nie stanowi"
                r"|spełnia|nie spełnia|należy uznać|uprawni)", z, re.I)) else 1
            kluczowe.append((waga, z))
    kluczowe.sort(key=lambda x: -x[0])
    s.kluczowe_zdania = [_skroc(z, 400) for _, z in kluczowe[:4]]
    return s
