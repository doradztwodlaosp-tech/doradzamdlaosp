# -*- coding: utf-8 -*-
"""
main.py — punkt wejścia bota EUREKA
====================================
  python main.py                         # bieg standardowy: wszystkie profile, ostatnie OKNO_DNI dni
  python main.py --profil ulga_br estonski_cit   # tylko wybrane profile
  python main.py --podglad               # tylko wyszukiwanie: pokaż, co by pobrał — nic nie zapisuje
  python main.py --okno 14               # okno 14 dni zamiast domyślnego
  python main.py --od 2026-10-01 --do 2026-10-31   # konkretny zakres dat wydania
  python main.py --bez-wysylki           # bez maila i bez Dysku
  python main.py --test-maila            # wyślij próbny mail (sprawdzenie konfiguracji)
  python main.py --lista-profili

Kody wyjścia: 0 sukces, 2 bieg częściowy/przerwany/błąd, 3 inny bieg już trwa.
"""
from __future__ import annotations

import argparse
import fcntl
import sys
from datetime import date, datetime, timedelta

import config
import reports
import wysylka
from profiles import PROFILE, PROFILE_DO_PRZETWORZENIA, sprawdz_profile
from przeglad import uruchom_przeglad


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Bot monitorujący interpretacje w EUREKA (ulgi podatkowe).",
                                formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    p.add_argument("--profil", nargs="+", metavar="KLUCZ", help="tylko te profile (patrz --lista-profili)")
    p.add_argument("--podglad", action="store_true", help="tylko wyszukiwanie; nic nie pobiera i nie zapisuje")
    p.add_argument("--okno", type=int, metavar="DNI", help=f"ile dni wstecz (domyślnie {config.OKNO_DNI})")
    p.add_argument("--od", metavar="RRRR-MM-DD")
    p.add_argument("--do", metavar="RRRR-MM-DD")
    p.add_argument("--bez-wysylki", action="store_true", help="bez maila i bez Dysku Google")
    p.add_argument("--test-maila", action="store_true", help="wyślij próbny mail i zakończ")
    p.add_argument("--lista-profili", action="store_true")
    return p


def _zakres(args) -> tuple[date, date]:
    do = datetime.strptime(args.do, "%Y-%m-%d").date() if args.do else date.today()
    if args.od:
        return datetime.strptime(args.od, "%Y-%m-%d").date(), do
    return do - timedelta(days=(args.okno or config.OKNO_DNI) - 1), do


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)

    if args.lista_profili:
        for k in PROFILE_DO_PRZETWORZENIA:
            print(f"{k:26} {PROFILE[k].podatek:8} {PROFILE[k].nazwa}\n{'':35}{PROFILE[k].podstawa_prawna}")
        return 0

    if args.test_maila:
        ok = wysylka.wyslij_mail("EUREKA — mail testowy",
                                 "<p>Konfiguracja wysyłki działa.</p>", [])
        return 0 if ok else 1

    ostrzezenia = sprawdz_profile()
    if ostrzezenia:
        print("BŁĘDY w profiles.py:\n  " + "\n  ".join(ostrzezenia))
        return 1

    if args.podglad:
        config.TRYB_PODGLAD = True

    od, do = _zakres(args)
    if od > do:
        print("BŁĄD: data --od jest późniejsza niż --do.")
        return 1
    nieznane = [k for k in (args.profil or []) if k not in PROFILE]
    if nieznane:
        print(f"BŁĄD: nieznane profile: {', '.join(nieznane)}. Dostępne: {', '.join(PROFILE_DO_PRZETWORZENIA)}")
        return 1

    # Blokada: jeśli poprzedni bieg jeszcze trwa (np. bardzo długi), nowy nie startuje.
    config.PLIK_BLOKADY.parent.mkdir(parents=True, exist_ok=True)
    plik_blokady = open(config.PLIK_BLOKADY, "w")
    try:
        fcntl.flock(plik_blokady, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print("Inny bieg bota właśnie trwa — kończę bez działania.")
        return 3

    print(f"--- START {datetime.now():%Y-%m-%d %H:%M:%S} ---")
    wynik = uruchom_przeglad(od, do, args.profil, tryb="reczny" if args.profil else "automatyczny")
    l = wynik["licznik"]
    print(f"\n=== PODSUMOWANIE (bieg #{wynik['bieg_id']}, status: {wynik['status']}) ===")
    print(f"  Zapytań: {l['zapytania']} | nowych znalezionych: {l['znaleziono']} | już w rejestrze: {l['duplikaty']}")
    print(f"  Trafne: {l['trafne']} | odrzucone po ocenie treści: {l['odrzucone']} | błędy: {l['bledy']}")

    if wynik["podglad"]:
        print("Podgląd: nie tworzę raportów i niczego nie wysyłam.")
        return 0

    sciezki = reports.zapisz_raporty(wynik)
    for s in sciezki:
        print(f"Raport: {s}")

    if not args.bez_wysylki:
        drive_ok = wysylka.synchronizuj_dysk()
        wysylka.wyslij_mail(reports.temat_maila(wynik), reports.tresc_maila_html(wynik, drive_ok), sciezki)

    print(f"--- KONIEC {datetime.now():%Y-%m-%d %H:%M:%S} ---")
    return 0 if wynik["status"] == "sukces" else 2


if __name__ == "__main__":
    sys.exit(main())
