# -*- coding: utf-8 -*-
"""
sprawdz_api.py — test na prawdziwej EUREKA przed pierwszym biegiem
====================================================================
Dwa żądania (z przerwą 15 s): wyszukiwanie jedną frazą i pobranie jednego PDF.
Pokazuje werdykt matchera dla każdego wyniku, a dla pierwszego pobranego —
ocenę treści i streszczenie. Nic nie zapisuje.

    ./uruchom.sh sprawdz_api.py                    # fraza "art. 18d", profil ulga_br
    ./uruchom.sh sprawdz_api.py "IP Box" ip_box_pit
"""
import sys
from datetime import date, timedelta

import config
import matcher
from eureka_client import nowa_sesja, pauza, pobierz_pdf, wyszukaj
from klasyfikator import ocen, tekst_z_pdf
from profiles import PROFILE
from streszczenie import streszcz

fraza = sys.argv[1] if len(sys.argv) > 1 else "art. 18d"
profil = sys.argv[2] if len(sys.argv) > 2 else "ulga_br"
do = date.today()
od = do - timedelta(days=config.OKNO_DNI - 1)

sesja = nowa_sesja()
wynik = wyszukaj(sesja, fraza, 0, 10, zakres_dat=(od.isoformat(), do.isoformat()))
rekordy = wynik.get("results") or []
print(f"Fraza '{fraza}', wydane {od}..{do}: {wynik.get('totalHits')} interpretacji\n")
pierwszy_pasujacy = None
for r in rekordy:
    dop = matcher.ocen_rekord(r, PROFILE[profil], fraza)
    werdykt = "ODRZUCONA" if not dop else "; ".join(f"{d.profil_klucz} {d.etykieta_artykulu} [{d.pewnosc}]" for d in dop)
    print(f"{r.get('SYG')} (wydana {str(r.get('DT_WYD'))[:10]}) -> {werdykt}")
    print(f"    TEZA: {(r.get('TEZA') or '')[:150]}")
    for p in (r.get("PRZEPISY") or [])[:3]:
        print(f"    PRZEPIS: {str(p)[:140]}")
    print()
    if dop and pierwszy_pasujacy is None:
        pierwszy_pasujacy = (r, dop)

if pierwszy_pasujacy:
    r, dop = pierwszy_pasujacy
    pauza(config.PRZERWA, powod="przed pobraniem jednego PDF")
    tekst = tekst_z_pdf(pobierz_pdf(sesja, str(r["ID_INFORMACJI"])))
    profile = [d.profil_klucz for d in dop]
    print(f"===== PDF {r.get('SYG')}: {len(tekst)} znaków tekstu")
    for k in profile:
        o = ocen(tekst, k)
        print(f"ocena treści dla {k}: {'TRAFNA' if o.trafna else 'nie'} — {o.powod} "
              f"(art {o.art}, frazy {o.frazy}, CIT {o.cit}, PIT {o.pit}, VAT {o.vat})")
    print("\n" + streszcz(tekst, profile).tekst())
