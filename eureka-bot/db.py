# -*- coding: utf-8 -*-
"""
db.py — rejestr SQLite: dedup + wznowienie + historia biegów
===============================================================
DLACZEGO SQLite ZAMIAST CSV/JSON (uzasadnienie, patrz README pkt. „Dlaczego
SQLite”): dałeś obie opcje do wyboru. Wybrałem SQLite, bo:
  1. Zapis jest atomowy (transakcja) — przerwanie prądu w środku zapisu
     nie zostawia na wpół zapisanego wiersza, jak może się zdarzyć z CSV
     dopisywanym z wielu miejsc.
  2. Naturalnie wspiera relację wiele-do-wielu: jedna interpretacja może
     pasować do KILKU profili (np. cytuje i art. 18d, i art. 24d) — CSV
     "jeden wiersz = jedna interpretacja" wymuszał przypisanie tylko do
     PIERWSZEGO profilu, który ją znalazł (tak było w v6). Tabela
     `dopasowania` niżej rozwiązuje to bez utraty informacji.
  3. Stan wznowienia (`postep`) i historia biegów (`biegi`) to naturalnie
     osobne tabele z zapytaniami, a nie ręczne parsowanie plików tekstowych.
  4. Raport dzienny to proste zapytania SQL, a nie ponowne wczytywanie
     całego CSV do pamięci przy każdym starcie.
Koszt: SQLite to jeden plik binarny, więc "podejrzenie rejestru okiem" jest
mniej wygodne niż w CSV — dlatego reports.py i tools eksportują widoki do
czytelnego CSV/JSON/tekstu przy każdym raporcie (patrz reports.py).
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

SCHEMA = """
CREATE TABLE IF NOT EXISTS interpretacje (
    id                  TEXT PRIMARY KEY,
    sygnatura           TEXT,
    tytul               TEXT,
    data_wydania        TEXT,
    data_publikacji     TEXT,
    organ               TEXT,
    link                TEXT,
    plik_sciezka        TEXT,
    data_pobrania       TEXT,
    status_pobrania     TEXT NOT NULL,   -- 'pobrano' | 'blad' | 'do_weryfikacji'
    tresc_skrot         TEXT
);

CREATE TABLE IF NOT EXISTS dopasowania (
    id_informacji       TEXT NOT NULL,
    profil_klucz        TEXT NOT NULL,
    fraza               TEXT NOT NULL,
    ustawa              TEXT NOT NULL,
    etykieta_artykulu   TEXT,
    pewnosc             TEXT NOT NULL,   -- 'POTWIERDZONE' | 'DO_WERYFIKACJI'
    PRIMARY KEY (id_informacji, profil_klucz, fraza),
    FOREIGN KEY (id_informacji) REFERENCES interpretacje(id)
);

CREATE TABLE IF NOT EXISTS postep (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    bieg_id             INTEGER NOT NULL,
    znacznik_czasu      TEXT NOT NULL,
    profil_klucz        TEXT,
    rok                 INTEGER,
    fraza               TEXT,
    strona              INTEGER,
    status              TEXT NOT NULL   -- 'w_toku' | 'zakonczone'
);

CREATE TABLE IF NOT EXISTS biegi (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    start_czas          TEXT NOT NULL,
    koniec_czas         TEXT,
    tryb                TEXT,            -- 'automatyczny' | 'reczny'
    profile_json        TEXT,
    lata_json           TEXT,
    znaleziono          INTEGER DEFAULT 0,
    nowe                INTEGER DEFAULT 0,
    do_weryfikacji      INTEGER DEFAULT 0,
    duplikaty           INTEGER DEFAULT 0,
    bledy               INTEGER DEFAULT 0,
    status              TEXT             -- 'w_toku' | 'sukces' | 'przerwany' | 'blad'
);

CREATE TABLE IF NOT EXISTS bledy_pobierania (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    bieg_id             INTEGER,
    id_informacji       TEXT,
    profil_klucz        TEXT,
    komunikat           TEXT,
    czas                TEXT
);

-- Wyniki konkretnego biegu (do raportu). Nowa tabela — istniejące dane
-- nie są ruszane. `dane` to JSON z wierszem raportu.
CREATE TABLE IF NOT EXISTS wyniki_biegu (
    bieg_id             INTEGER NOT NULL,
    id_informacji       TEXT NOT NULL,
    dane                TEXT NOT NULL,
    PRIMARY KEY (bieg_id, id_informacji)
);

CREATE INDEX IF NOT EXISTS idx_dopasowania_profil ON dopasowania(profil_klucz);
CREATE INDEX IF NOT EXISTS idx_interpretacje_status ON interpretacje(status_pobrania);
"""


@contextmanager
def polacz(sciezka_db: Path) -> Iterator[sqlite3.Connection]:
    """Kontekst połączenia z automatycznym commit/rollback. WAL mode, żeby
    równoczesne odczyty (np. generowanie raportu) nie blokowały zapisu."""
    sciezka_db.parent.mkdir(parents=True, exist_ok=True)
    polaczenie = sqlite3.connect(str(sciezka_db), timeout=30)
    polaczenie.row_factory = sqlite3.Row
    polaczenie.execute("PRAGMA journal_mode=WAL")
    polaczenie.execute("PRAGMA foreign_keys=ON")
    try:
        polaczenie.executescript(SCHEMA)
        yield polaczenie
        polaczenie.commit()
    except Exception:
        polaczenie.rollback()
        raise
    finally:
        polaczenie.close()


def teraz() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# DEDUPLIKACJA / REJESTR INTERPRETACJI
# ---------------------------------------------------------------------------
def znane_id(conn: sqlite3.Connection) -> set[str]:
    """ID, których bot nie ocenia drugi raz: pobrane, do weryfikacji
    i odrzucone. Rekordy ze statusem 'blad' NIE są tu ujęte, więc kolejny
    bieg spróbuje je pobrać ponownie."""
    return {r["id"] for r in conn.execute(
        "SELECT id FROM interpretacje WHERE status_pobrania IN ('pobrano', 'do_weryfikacji', 'odrzucona')"
    )}


def zapisz_wynik_biegu(conn: sqlite3.Connection, bieg_id: int, id_informacji: str, dane: dict) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO wyniki_biegu (bieg_id, id_informacji, dane) VALUES (?, ?, ?)",
        (bieg_id, id_informacji, json.dumps(dane, ensure_ascii=False)),
    )


def wyniki_biegu(conn: sqlite3.Connection, bieg_id: int) -> list[dict]:
    return [json.loads(r["dane"]) for r in conn.execute(
        "SELECT dane FROM wyniki_biegu WHERE bieg_id = ? ORDER BY id_informacji", (bieg_id,)
    )]


def bieg(conn: sqlite3.Connection, bieg_id: int) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM biegi WHERE id = ?", (bieg_id,)).fetchone()


def bledy_biegu(conn: sqlite3.Connection, bieg_id: int) -> list[dict]:
    return [dict(r) for r in conn.execute(
        "SELECT * FROM bledy_pobierania WHERE bieg_id = ? ORDER BY czas", (bieg_id,)
    )]


def zapisz_interpretacje(conn: sqlite3.Connection, wiersz: dict) -> None:
    """UPSERT jednej interpretacji. Bezpieczne do wywołania wielokrotnie dla
    tego samego ID (np. gdy kolejny profil też ją dopasuje) — nie nadpisuje
    plik_sciezka/data_pobrania, jeśli już są ustawione."""
    
    # Bezpieczne prostowanie list (np. słów kluczowych) na zwykły tekst dla SQLite
    wiersz_czysty = {}
    for k, v in wiersz.items():
        if isinstance(v, list):
            wiersz_czysty[k] = ", ".join(map(str, v))
        else:
            wiersz_czysty[k] = v

    conn.execute("""
        INSERT INTO interpretacje
            (id, sygnatura, tytul, data_wydania, data_publikacji, organ,
             link, plik_sciezka, data_pobrania, status_pobrania, tresc_skrot)
        VALUES (:id, :sygnatura, :tytul, :data_wydania, :data_publikacji, :organ,
                :link, :plik_sciezka, :data_pobrania, :status_pobrania, :tresc_skrot)
        ON CONFLICT(id) DO UPDATE SET
            plik_sciezka   = COALESCE(interpretacje.plik_sciezka, excluded.plik_sciezka),
            data_pobrania  = COALESCE(interpretacje.data_pobrania, excluded.data_pobrania),
            status_pobrania = CASE
                WHEN interpretacje.status_pobrania = 'pobrano' THEN 'pobrano'
                ELSE excluded.status_pobrania
            END
    """, wiersz_czysty)


def dopisz_dopasowanie(conn: sqlite3.Connection, id_informacji: str, dopasowanie) -> None:
    conn.execute("""
        INSERT OR IGNORE INTO dopasowania
            (id_informacji, profil_klucz, fraza, ustawa, etykieta_artykulu, pewnosc)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (id_informacji, dopasowanie.profil_klucz, dopasowanie.fraza,
          dopasowanie.ustawa, dopasowanie.etykieta_artykulu, dopasowanie.pewnosc))


def profile_dla_id(conn: sqlite3.Connection, id_informacji: str) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM dopasowania WHERE id_informacji = ? ORDER BY profil_klucz", (id_informacji,)
    ).fetchall()


# ---------------------------------------------------------------------------
# BIEGI (RUN HISTORY)
# ---------------------------------------------------------------------------
def rozpocznij_bieg(conn: sqlite3.Connection, tryb: str, profile: list[str], lata: list[int]) -> int:
    cur = conn.execute("""
        INSERT INTO biegi (start_czas, tryb, profile_json, lata_json, status)
        VALUES (?, ?, ?, ?, 'w_toku')
    """, (teraz(), tryb, json.dumps(profile, ensure_ascii=False), json.dumps(lata)))
    return cur.lastrowid


def zakoncz_bieg(conn: sqlite3.Connection, bieg_id: int, status: str, liczniki: dict) -> None:
    conn.execute("""
        UPDATE biegi SET koniec_czas=?, status=?, znaleziono=?, nowe=?,
            do_weryfikacji=?, duplikaty=?, bledy=?
        WHERE id=?
    """, (teraz(), status, liczniki.get("znaleziono", 0), liczniki.get("nowe", 0),
          liczniki.get("do_weryfikacji", 0), liczniki.get("duplikaty", 0),
          liczniki.get("bledy", 0), bieg_id))


def zapisz_blad(conn: sqlite3.Connection, bieg_id: int, id_informacji: str | None,
                profil_klucz: str | None, komunikat: str) -> None:
    conn.execute("""
        INSERT INTO bledy_pobierania (bieg_id, id_informacji, profil_klucz, komunikat, czas)
        VALUES (?, ?, ?, ?, ?)
    """, (bieg_id, id_informacji, profil_klucz, komunikat, teraz()))


# ---------------------------------------------------------------------------
# WZNOWIENIE (POSTĘP)
# ---------------------------------------------------------------------------
def zapisz_postep(conn: sqlite3.Connection, bieg_id: int, profil_klucz: str,
                  rok: int, fraza: str, strona: int) -> None:
    """Nadpisuje jeden wiersz stanu 'w_toku' dla danego biegu (upsert ręczny,
    bo SQLite nie ma prostego UPSERT bez unikalnego klucza tu) — trzymamy
    tylko NAJNOWSZY stan w_toku per bieg, więc najpierw czyścimy poprzedni."""
    conn.execute("DELETE FROM postep WHERE bieg_id=? AND status='w_toku'", (bieg_id,))
    conn.execute("""
        INSERT INTO postep (bieg_id, znacznik_czasu, profil_klucz, rok, fraza, strona, status)
        VALUES (?, ?, ?, ?, ?, ?, 'w_toku')
    """, (bieg_id, teraz(), profil_klucz, rok, fraza, strona))


def wyczysc_postep(conn: sqlite3.Connection, bieg_id: int) -> None:
    conn.execute("UPDATE postep SET status='zakonczone' WHERE bieg_id=? AND status='w_toku'", (bieg_id,))


def ostatni_niedokonczony_postep(conn: sqlite3.Connection) -> sqlite3.Row | None:
    """Znajduje najnowszy wiersz postępu ze statusem 'w_toku' NALEŻĄCY DO
    BIEGU, który sam ma status 'w_toku' w tabeli biegi (czyli bieg, który
    nie zdążył się bezpiecznie zakończyć — np. zanik prądu). Używane przy
    starcie, żeby zdecydować od którego (profil, rok, fraza, strona)
    kontynuować, zamiast zaczynać od zera.

    WAŻNE dla bezpieczeństwa: even jeśli to wznowienie nie trafi dokładnie
    w tę samą stronę (np. dlatego, że sortowanie wyników się zmieniło od
    czasu przerwania), i tak NIC się nie zduplikuje — `znane_id()` w
    scraper.py jest ostatecznym strażnikiem przy zapisie każdego pliku.
    Ten mechanizm to tylko przyspieszenie, nie gwarancja poprawności."""
    return conn.execute("""
        SELECT p.* FROM postep p
        JOIN biegi b ON b.id = p.bieg_id
        WHERE p.status='w_toku' AND b.status='w_toku'
        ORDER BY p.id DESC LIMIT 1
    """).fetchone()


def oznacz_bieg_jako_przerwany(conn: sqlite3.Connection, bieg_id: int) -> None:
    conn.execute("UPDATE biegi SET status='przerwany', koniec_czas=? WHERE id=? AND status='w_toku'",
                 (teraz(), bieg_id))