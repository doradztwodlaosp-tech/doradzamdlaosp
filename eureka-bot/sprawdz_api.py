# -*- coding: utf-8 -*-
"""
sprawdz_api.py — test na prawdziwej EUREKA przed pierwszym biegiem
====================================================================
Dwa żądania (z przerwą 15 s): jedno wyszukiwanie frazą z profilu i jeden PDF.
Pokazuje:
  - ile interpretacji znajduje fraza w ostatnich 45 dniach,
  - jak wygląda pole PRZEPISY,
  - czy z PDF-a da się wyciągnąć tekst i jak bot oceniłby tę interpretację.
Nic nie zapisuje.

    ./uruchom.sh sprawdz_api.py                 # domyślnie fraza "art. 18d" (ulga B+R)
    ./uruchom.sh sprawdz_api.py "IP Box" ip_box_pit
"""
import sys
from datetime import date, timedelta

import config
from eureka_client import nowa_sesja, pauza, pobierz_pdf, wyszukaj
from klasyfikator import lista_przepisow, ocen, profile_z_przepisow, tekst_z_pdf

fraza = sys.argv[1] if len(sys.argv) > 1 else "art. 18d"
profil = sys.argv[2] if len(sys.argv) > 2 else "ulga_br"
do = date.today()
od = do - timedelta(days=config.OKNO_DNI - 1)

sesja = nowa_sesja()
wynik = wyszukaj(sesja, fraza, 0, 10, zakres_dat=(od.isoformat(), do.isoformat()))
rekordy = wynik.get("results") or []
print(f"Fraza '{fraza}', wydane {od}..{do}: {wynik.get('totalHits')} interpretacji\n")
for r in rekordy[:5]:
    print(f"{r.get('SYG')} (wydana {r.get('DT_WYD')}), profile z PRZEPISY: {profile_z_przepisow(r) or '-'}")
    for p in lista_przepisow(r)[:3]:
        print(f"    PRZEPIS: {p[:140]}")
    print(f"    TEZA: {(r.get('TEZA') or '')[:140]}\n")

if rekordy:
    r = rekordy[0]
    pauza(config.PRZERWA, powod="przed pobraniem jednego PDF")
    tekst = tekst_z_pdf(pobierz_pdf(sesja, str(r["ID_INFORMACJI"])))
    o = ocen(tekst, profil, profil in profile_z_przepisow(r))
    print(f"PDF {r.get('SYG')}: {len(tekst)} znaków tekstu")
    print(f"Ocena dla profilu {profil}: {'TRAFNA' if o.trafna else 'ODRZUCONA'} — {o.powod}")
    print(f"    wzmianki artykułu: {o.art}, fraz: {o.frazy}, CIT/PIT: {o.dochodowe}, VAT/akcyza: {o.vat}")
    print(f"    początek tekstu: {tekst[:300]!r}")
