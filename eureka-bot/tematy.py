# -*- coding: utf-8 -*-
"""
tematy.py — druga warstwa profili: rdzenie tematyczne i przepisy pomocnicze
==============================================================================
profiles.py mówi, O CO PYTAĆ wyszukiwarkę (frazy) i jaki artykuł w polu
PRZEPISY daje pewność. Ten plik mówi, PO CZYM POZNAĆ temat profilu w opisie
rekordu (teza, słowa kluczowe, zagadnienia), gdy pole PRZEPISY go nie
potwierdza.

Analogia: PRZEPISY to podstawa prawna wskazana w sentencji (dowód mocny),
a rdzeń tematyczny to przedmiot sprawy opisany w tezie (dowód słabszy).
Rekord bez żadnego z nich nie należy do profilu i nie jest pobierany.

Rdzenie to wyrażenia regularne pisane tak, żeby łapały polską odmianę,
np. "badawczo[\\s\\-–]*rozwojow" pasuje do "badawczo-rozwojowa",
"badawczo-rozwojowej", "badawczo rozwojowych". Wielkość liter nie ma znaczenia.

Zestaw rdzeni został sprawdzony na tezach 25 420 interpretacji z rejestru
(listopad 2026). Żeby dodać nowy rdzeń, dopisz go do krotki danego profilu.
"""
from __future__ import annotations

import re

from profiles import PROFILE, wzorzec_artykulu as _art

# Wspólne dla IP Box w CIT i w PIT. O tym, czy rekord trafi do ip_box_cit,
# czy do ip_box_pit, decyduje podatek rekordu (patrz matcher.podatki_rekordu).
_IP_BOX = (
    r"IP[\s\-]*BOX",
    r"Innovation Box",
    r"własności intelektualn",
    r"nexus",
    # "5% stawka ... autorskich praw / programu" bez słów "IP Box"
    r"(stawk\w* 5\s*%|5\s*%\s*stawk\w*|preferencyjn\w* (stawk|opodatkowan)).{0,140}(autorsk|program|praw)",
    r"autorski\w* praw\w* (majątkow\w* )?do (oprogramowani|program\w* komputerow)",
)

TEMATY: dict[str, tuple[str, ...]] = {
    "ulga_br": (
        r"badawczo[\s\-–]*rozwojow", r"\bB\s*\+\s*R\b", r"prac\w* rozwojow",
        _art("18d"), _art("18da"), _art("18e"), _art("26e"), _art("26ea"), _art("26f"),
    ),
    "innowacyjni_pracownicy": (r"innowacyjn\w* pracownik", _art("18db"), _art("26eb")),
    "ulga_prototyp": (r"prototyp", r"produkcj\w* próbn", _art("18ea"), _art("26ga")),
    "ulga_prowzrostowa": (r"ulg\w* prowzrostow", r"ulg\w* na ekspansj", _art("18eb"), _art("26gb")),
    "ulga_termomodernizacyjna": (r"termomodernizac", _art("26h")),
    "ulga_konsolidacyjna": (r"ulg\w* konsolidacyjn", _art("18ec")),
    "ulga_csr": (r"ulg\w* sponsoringow", r"ulg\w* (na )?CSR", _art("18ee"), _art("26ha")),
    "estonski_cit": (
        r"ryczałt\w* od dochodów spółek", r"estońsk", r"ukryt\w* zysk", r"podzielon\w* zysk",
        r"art\.?\s*28\s*[c-t](?![a-z0-9])", r"korekt\w* wstępn", r"wstępn\w* korekt",
    ),
    "ulga_robotyzacja": (r"robotyzacj", r"robot\w* przemysłow", _art("38eb"), _art("52jb")),
    "ulga_ipo": (
        r"ulg\w* na IPO", r"pierwsz\w* ofert\w* publiczn", r"prospekt\w* emisyjn",
        r"ulg\w* emisyjn", _art("18ed"),
    ),
    "ip_box_cit": _IP_BOX + (_art("24d"), _art("24e")),
    "ip_box_pit": _IP_BOX + (_art("30ca"), _art("30cb")),
}

# Przepisy, które same nie dają pewności, ale wskazują na temat profilu.
# Definicje działalności badawczo-rozwojowej: art. 4a pkt 26-28 ustawy o CIT
# oraz art. 5a pkt 38-40 ustawy o PIT. W teście z 12.11.2026 część interpretacji
# o uldze B+R miała w PRZEPISY wyłącznie taki wpis, bez art. 18d.
PRZEPISY_POMOCNICZE: dict[str, tuple[tuple[str, str], ...]] = {
    "ulga_br": (
        ("CIT", r"art\.?\s*4a(?![a-z0-9]).*pkt\s*2[678](?!\d)"),
        ("PIT", r"art\.?\s*5a(?![a-z0-9]).*pkt\s*(38|39|40)(?!\d)"),
    ),
}

# Kompilacja przy imporcie: literówka w rdzeniu wyjdzie od razu przy starcie,
# a nie w połowie biegu.
TEMATY_SKOMPILOWANE = {
    klucz: tuple(re.compile(w, re.IGNORECASE) for w in wzorce) for klucz, wzorce in TEMATY.items()
}
for _klucz in list(TEMATY) + list(PRZEPISY_POMOCNICZE):
    if _klucz not in PROFILE:
        raise ValueError(f"tematy.py: nieznany profil '{_klucz}' (brak go w profiles.py)")
for _lista_wzorcow in PRZEPISY_POMOCNICZE.values():
    for _ustawa, _wzorzec in _lista_wzorcow:
        re.compile(_wzorzec)
