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
  python main.py --tylko-raport 7        # odtwórz raporty i mail z zapisanego biegu nr 7
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
    p.add_argument("--tylko-raport", type=int, metavar="BIEG", help="odtwórz raporty (i wyślij) z zapisanego biegu")
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

    if args.tylko_raport:
        wynik = wynik_z_rejestru(args.tylko_raport)
        if wynik is None:
            print(f"BŁĄD: brak biegu nr {args.tylko_raport} w rejestrze.")
            return 1
        return _raporty_i_wysylka(wynik, args.bez_wysylki)

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
    reczny = bool(args.profil or args.od or args.do or args.okno)
    wynik = uruchom_przeglad(od, do, args.profil, tryb="reczny" if reczny else "automatyczny")
    l = wynik["licznik"]
    print(f"\n=== PODSUMOWANIE (bieg #{wynik['bieg_id']}, status: {wynik['status']}) ===")
    print(f"  Zapytań: {l['zapytania']} | nowych znalezionych: {l['znaleziono']} | już w rejestrze: {l['duplikaty']}")
    print(f"  Potwierdzone: {l['potwierdzone']} | do weryfikacji: {l['do_weryfikacji']} | "
          f"odrzucone bez pobierania: {l['odrzucone']} | błędy: {l['bledy']}")

    if wynik["podglad"]:
        print(f"Podgląd: wg metadanych zostałoby pobranych {l['potwierdzone'] + l['do_weryfikacji']} PDF-ów "
              f"(ok. {(l['potwierdzone'] + l['do_weryfikacji']) * config.PRZERWA / 60:.0f} min). "
              f"Nie tworzę raportów i niczego nie wysyłam.")
        return 0
    kod = _raporty_i_wysylka(wynik, args.bez_wysylki)
    print(f"--- KONIEC {datetime.now():%Y-%m-%d %H:%M:%S} ---")
    return kod if kod else (0 if wynik["status"] == "sukces" else 2)


def _raporty_i_wysylka(wynik: dict, bez_wysylki: bool) -> int:
    sciezki = reports.zapisz_raporty(wynik)
    for s in sciezki:
        print(f"Raport: {s}")
    if not bez_wysylki:
        drive_ok = wysylka.synchronizuj_dysk()
        wysylka.wyslij_mail(reports.temat_maila(wynik), reports.tresc_maila_html(wynik, drive_ok), sciezki)
    return 0


def wynik_z_rejestru(bieg_id: int) -> dict | None:
    """Odtwarza strukturę wyniku biegu z tabel biegi / wyniki_biegu / bledy_pobierania."""
    import db
    import json
    with db.polacz(config.SCIEZKA_DB) as conn:
        b = conn.execute("SELECT * FROM biegi WHERE id = ?", (bieg_id,)).fetchone()
        if b is None:
            return None
        wiersze = db.wyniki_biegu(conn, bieg_id)
        bledy = [dict(r) for r in conn.execute(
            "SELECT id_informacji AS id, profil_klucz AS profil, komunikat, czas FROM bledy_pobierania WHERE bieg_id = ?",
            (bieg_id,))]
        lata = json.loads(b["lata_json"] or "[]")
    licznik = {"zapytania": 0, "znaleziono": b["znaleziono"] or 0, "duplikaty": b["duplikaty"] or 0,
               "odrzucone": sum(w["status"] == "odrzucona" for w in wiersze),
               "potwierdzone": b["nowe"] or 0, "do_weryfikacji": b["do_weryfikacji"] or 0, "bledy": b["bledy"] or 0}
    return {"bieg_id": bieg_id, "status": b["status"] or "blad", "od": lata[0] if lata else "", "do": lata[-1] if lata else "",
            "profile": json.loads(b["profile_json"] or "[]"), "licznik": licznik, "wiersze": wiersze,
            "bledy": bledy, "komunikat": "", "podglad": False}


if __name__ == "__main__":
    sys.exit(main())
