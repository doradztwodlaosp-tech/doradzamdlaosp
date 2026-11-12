# -*- coding: utf-8 -*-
"""
sprawdz_api.py — test na prawdziwej EUREKA przed pierwszym biegiem
====================================================================
Wysyła JEDNO zapytanie (ostatnie 7 dni, 10 rekordów) i pokazuje:
  - czy API odpowiada i ile jest interpretacji w tygodniu,
  - jak naprawdę wygląda pole PRZEPISY (od tego zależy klasyfikacja),
  - jak bot oceniłby każdy z tych rekordów.
Nic nie zapisuje i nie pobiera PDF-ów.

    python sprawdz_api.py
"""
from datetime import date, timedelta

from eureka_client import nowa_sesja, wyszukaj
from klasyfikator import klasyfikuj, lista_przepisow

do = date.today()
od = do - timedelta(days=6)
wynik = wyszukaj(nowa_sesja(), "", 0, 10, zakres_dat=(od.isoformat(), do.isoformat()))
print(f"Interpretacji wydanych {od}..{do}: {wynik.get('totalHits')}")
print(f"Klucze odpowiedzi: {list(wynik.keys())}\n")

for r in wynik.get("results") or []:
    w = klasyfikuj(r)
    print(f"[{w.kategoria}] {r.get('SYG')}  (wydana {r.get('DT_WYD')}, kategoria: {r.get('KATEGORIA_INFORMACJI')})")
    print(f"    profile: {', '.join(w.profile) or '-'}  | powód: {w.powod}")
    for p in lista_przepisow(r)[:4]:
        print(f"    PRZEPIS: {p[:140]}")
    print(f"    TEZA: {(r.get('TEZA') or '')[:140]}\n")
