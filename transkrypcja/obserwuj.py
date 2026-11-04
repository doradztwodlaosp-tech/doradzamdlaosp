#!/usr/bin/env python3
"""
Obserwator folderu z nagraniami: automatycznie uruchamia transkrypcję,
gdy w folderze pojawi się nowe nagranie.

- Co kilkadziesiąt sekund sprawdza folder (domyślnie podfolder "Nagranie" obok skryptu).
- Nagranie uznaje za nowe, jeśli obok nie ma jeszcze pliku .txt o tej samej nazwie.
- Czeka, aż plik przestanie rosnąć (np. trwa kopiowanie z telefonu).
- Transkrybuje nagrania po kolei, jedno na raz.
- Wszystko zapisuje w dzienniku: <folder>/obserwator.log

Przykłady:
  python obserwuj.py
  python obserwuj.py --folder "C:\\Nagrania" --slownik "B+R, gemba, PWM"
"""

from __future__ import annotations

import argparse
import os
import socket
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROZSZERZENIA = {".mp3", ".m4a", ".wav", ".aac", ".ogg", ".opus", ".flac", ".wma", ".amr", ".3gp", ".mp4"}
PORT_BLOKADY = 47615  # zapobiega uruchomieniu dwóch obserwatorów naraz

KATALOG_SKRYPTU = Path(__file__).resolve().parent
DZIENNIK: Path | None = None


def log(tekst: str) -> None:
    linia = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {tekst}"
    if sys.stdout:  # przy uruchomieniu przez pythonw nie ma konsoli
        print(linia, flush=True)
    if DZIENNIK:
        with DZIENNIK.open("a", encoding="utf-8") as f:
            f.write(linia + "\n")


def znajdz_skrypt_transkrypcji(podany: Path | None) -> Path:
    if podany:
        return podany
    for nazwa in ("transkrybuj.py", "Transkrypcja.py", "transkrypcja.py"):
        p = KATALOG_SKRYPTU / nazwa
        if p.is_file():
            return p
    sys.exit(f"Nie znaleziono skryptu transkrypcji w {KATALOG_SKRYPTU}. Podaj go przez --skrypt.")


def nowe_nagrania(folder: Path) -> list[Path]:
    wynik = []
    for p in sorted(folder.iterdir(), key=lambda x: x.stat().st_mtime):
        if p.is_file() and p.suffix.lower() in ROZSZERZENIA and not p.name.endswith("_przetworzony.wav"):
            if not p.with_suffix(".txt").exists():
                wynik.append(p)
    return wynik


def plik_gotowy(p: Path, odstep: float) -> bool:
    """Plik jest gotowy, gdy jego rozmiar się nie zmienia i można go otworzyć."""
    try:
        r1 = p.stat().st_size
        time.sleep(odstep)
        r2 = p.stat().st_size
        if r1 != r2 or r2 == 0:
            return False
        with p.open("rb"):
            pass
        return True
    except OSError:
        return False


def transkrybuj(skrypt: Path, nagranie: Path, dodatkowe: list[str]) -> bool:
    env = dict(os.environ, PYTHONIOENCODING="utf-8")  # polskie znaki w dzienniku na Windows
    python = Path(sys.executable)
    if python.name.lower() == "pythonw.exe":  # transkrypcja potrzebuje zwykłego pythona
        python = python.with_name("python.exe")
    cmd = [str(python), str(skrypt), str(nagranie), *dodatkowe]
    flagi = getattr(subprocess, "CREATE_NO_WINDOW", 0)  # bez wyskakującego okna na Windows
    with DZIENNIK.open("a", encoding="utf-8") as f:
        wynik = subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, env=env, creationflags=flagi)
    return wynik.returncode == 0


def main() -> None:
    global DZIENNIK
    p = argparse.ArgumentParser(
        allow_abbrev=False,
        description="Automatyczna transkrypcja nowych nagrań w folderze.",
        epilog="Pozostałe opcje (np. --slownik, --odszum, --model) są przekazywane do skryptu transkrypcji.",
    )
    p.add_argument("--folder", type=Path, default=KATALOG_SKRYPTU / "Nagranie",
                   help="folder z nagraniami (domyślnie: Nagranie obok tego skryptu)")
    p.add_argument("--skrypt", type=Path, help="ścieżka do skryptu transkrypcji")
    p.add_argument("--co", type=int, default=30, help="co ile sekund sprawdzać folder (domyślnie 30)")
    a, dodatkowe = p.parse_known_args()

    folder = a.folder.resolve()
    if not folder.is_dir():
        sys.exit(f"Folder nie istnieje: {folder}")
    DZIENNIK = folder / "obserwator.log"
    skrypt = znajdz_skrypt_transkrypcji(a.skrypt)

    blokada = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        blokada.bind(("127.0.0.1", PORT_BLOKADY))
    except OSError:
        log("Obserwator już działa – nie uruchamiam drugiej kopii.")
        return

    log(f"Start. Obserwuję: {folder} (co {a.co} s). Skrypt: {skrypt.name}")
    nieudane: set[Path] = set()
    try:
        while True:
            try:
                for nagranie in nowe_nagrania(folder):
                    if nagranie in nieudane:
                        continue
                    if not plik_gotowy(nagranie, odstep=10):
                        log(f"Czekam, aż {nagranie.name} się skopiuje...")
                        continue
                    log(f"Nowe nagranie: {nagranie.name} – zaczynam transkrypcję.")
                    t0 = time.time()
                    if transkrybuj(skrypt, nagranie, dodatkowe):
                        log(f"Gotowe: {nagranie.with_suffix('.txt').name} ({(time.time() - t0) / 60:.0f} min)")
                    else:
                        nieudane.add(nagranie)
                        log(f"BŁĄD przy {nagranie.name} – szczegóły powyżej w dzienniku. "
                            "Spróbuję ponownie po restarcie obserwatora.")
            except Exception as e:  # obserwator ma działać dalej mimo pojedynczych błędów
                log(f"Nieoczekiwany błąd: {e!r}")
            time.sleep(a.co)
    except KeyboardInterrupt:
        log("Zatrzymano.")


if __name__ == "__main__":
    main()
