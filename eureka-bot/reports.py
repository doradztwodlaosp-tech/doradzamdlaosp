# -*- coding: utf-8 -*-
"""
reports.py — raporty biegu: Excel (osobno ulgi i estoński CIT) + treść maila
=============================================================================
Każdy bieg daje DWA pliki Excel (zawsze, nawet gdy pusty — żeby było widać,
że bieg się odbył):
  _raporty/RAPORT_<data>_bieg<id>_ulgi.xlsx
  Estoński CIT/_raporty/RAPORT_<data>_bieg<id>_estonski_cit.xlsx

Arkusze: Podsumowanie | Potwierdzone (z PDF) | Do weryfikacji (bez PDF,
z kolumną na decyzję) | Błędy.
"""
from __future__ import annotations

from datetime import date
from html import escape
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

import config

STATUSY = {"sukces": "Zakończony poprawnie", "czesciowy": "Zakończony częściowo",
           "przerwany": "PRZERWANY", "blad": "BŁĄD"}
GRUPY = {"ulgi": "Ulgi podatkowe", "estonski_cit": "Estoński CIT"}

_NAGLOWEK = PatternFill("solid", fgColor="1F4E78")
_NAGLOWEK_FONT = Font(bold=True, color="FFFFFF")
_LINK_FONT = Font(color="0563C1", underline="single")

KOLUMNY_WYNIKOW = [
    ("Data wydania", 12), ("Sygnatura", 30), ("Profil", 34), ("Przepis ulgi", 22),
    ("Organ", 22), ("Teza", 80), ("Link EUREKA", 16), ("Plik", 45),
]


def _naglowki(ws, kolumny) -> None:
    for i, (nazwa, szer) in enumerate(kolumny, start=1):
        c = ws.cell(row=1, column=i, value=nazwa)
        c.fill, c.font = _NAGLOWEK, _NAGLOWEK_FONT
        c.alignment = Alignment(vertical="center", wrap_text=True)
        ws.column_dimensions[get_column_letter(i)].width = szer
    ws.freeze_panes = "A2"


def _arkusz_wynikow(wb: Workbook, tytul: str, wiersze: list[dict], z_decyzja: bool) -> None:
    ws = wb.create_sheet(tytul)
    kolumny = list(KOLUMNY_WYNIKOW)
    if z_decyzja:
        kolumny[7] = ("Trafiona fraza", 30)
        kolumny.append(("Decyzja (TAK/NIE)", 14))
    _naglowki(ws, kolumny)
    for n, w in enumerate(sorted(wiersze, key=lambda x: (x["data_wydania"], x["sygnatura"]), reverse=True), start=2):
        wartosci = [
            w["data_wydania"], w["sygnatura"], "\n".join(w["profile_nazwy"]),
            ", ".join(w["przepisy_ulg"]), w["organ"], w["teza"], "otwórz",
            ", ".join(w["frazy"]) if z_decyzja else w["plik"],
        ]
        if z_decyzja:
            wartosci.append("")
        for k, v in enumerate(wartosci, start=1):
            c = ws.cell(row=n, column=k, value=v)
            c.alignment = Alignment(vertical="top", wrap_text=k in (3, 6))
        link = ws.cell(row=n, column=7)
        link.hyperlink, link.font = w["link"], _LINK_FONT
    if wiersze:
        ws.auto_filter.ref = f"A1:{get_column_letter(len(kolumny))}{len(wiersze) + 1}"
    else:
        ws.cell(row=2, column=1, value="(brak pozycji w tym biegu)")


def _arkusz_bledow(wb: Workbook, bledy: list[dict]) -> None:
    ws = wb.create_sheet("Błędy")
    _naglowki(ws, [("Czas", 26), ("ID informacji", 16), ("Profil", 20), ("Komunikat", 100)])
    for n, b in enumerate(bledy, start=2):
        for k, v in enumerate([b.get("czas"), b.get("id"), b.get("profil"), b.get("komunikat")], start=1):
            ws.cell(row=n, column=k, value=v)
    if not bledy:
        ws.cell(row=2, column=1, value="(brak błędów)")


def _liczniki_grupy(wiersze: list[dict]) -> dict:
    return {
        "potwierdzone": sum(w["status"] == "pobrano" for w in wiersze),
        "do_weryfikacji": sum(w["status"] == "do_weryfikacji" for w in wiersze),
        "bledy_pdf": sum(w["status"] == "blad" for w in wiersze),
    }


def zapisz_xlsx(wynik: dict, grupa: str, sciezka: Path) -> Path:
    wiersze = [w for w in wynik["wiersze"] if w["grupa"] == grupa]
    lg = _liczniki_grupy(wiersze)
    lb = wynik["licznik"]

    wb = Workbook()
    ws = wb.active
    ws.title = "Podsumowanie"
    dane = [
        ("Raport", f"{GRUPY[grupa]} — bieg #{wynik['bieg_id']}"),
        ("Wygenerowano", date.today().isoformat()),
        ("Status biegu", STATUSY.get(wynik["status"], wynik["status"])),
        ("Okno dat wydania", f"{wynik['od']} .. {wynik['do']}"),
        ("", ""),
        (f"Nowe potwierdzone ({GRUPY[grupa]}) — pobrane PDF", lg["potwierdzone"]),
        (f"Do weryfikacji ({GRUPY[grupa]}) — bez PDF", lg["do_weryfikacji"]),
        ("Błędy pobierania PDF w tej grupie", lg["bledy_pdf"]),
        ("", ""),
        ("Cały bieg: przejrzano interpretacji", lb["znaleziono"]),
        ("Cały bieg: już znane (pominięte)", lb["duplikaty"]),
        ("Cały bieg: odrzucone (nie dotyczą ulg)", lb["odrzucone"]),
        ("Cały bieg: błędy", lb["bledy"]),
    ]
    if wynik.get("komunikat"):
        dane.append(("Uwaga", wynik["komunikat"]))
    ws.column_dimensions["A"].width = 48
    ws.column_dimensions["B"].width = 60
    for n, (k, v) in enumerate(dane, start=1):
        ws.cell(row=n, column=1, value=k).font = Font(bold=True)
        ws.cell(row=n, column=2, value=v)

    _arkusz_wynikow(wb, "Potwierdzone", [w for w in wiersze if w["status"] == "pobrano"], z_decyzja=False)
    _arkusz_wynikow(wb, "Do weryfikacji", [w for w in wiersze if w["status"] == "do_weryfikacji"], z_decyzja=True)
    _arkusz_bledow(wb, wynik["bledy"])

    sciezka.parent.mkdir(parents=True, exist_ok=True)
    wb.save(sciezka)
    return sciezka


def zapisz_raporty(wynik: dict) -> list[Path]:
    przedrostek = f"RAPORT_{date.today().isoformat()}_bieg{wynik['bieg_id']}"
    return [
        zapisz_xlsx(wynik, "ulgi", config.FOLDER_RAPORTOW / f"{przedrostek}_ulgi.xlsx"),
        zapisz_xlsx(wynik, "estonski_cit", config.FOLDER_RAPORTOW_ESTONSKI / f"{przedrostek}_estonski_cit.xlsx"),
    ]


# ===========================================================================
# TREŚĆ MAILA
# ===========================================================================
def temat_maila(wynik: dict) -> str:
    lg_u = _liczniki_grupy([w for w in wynik["wiersze"] if w["grupa"] == "ulgi"])
    lg_e = _liczniki_grupy([w for w in wynik["wiersze"] if w["grupa"] == "estonski_cit"])
    znacznik = "" if wynik["status"] == "sukces" else f"[{STATUSY.get(wynik['status'], wynik['status'])}] "
    return (f"{znacznik}EUREKA {date.today().isoformat()}: ulgi {lg_u['potwierdzone']} nowych"
            f" (+{lg_u['do_weryfikacji']} do weryf.), estoński CIT {lg_e['potwierdzone']}"
            f" (+{lg_e['do_weryfikacji']})")


def tresc_maila_html(wynik: dict, drive_ok: bool | None) -> str:
    lb = wynik["licznik"]
    czesci = [f"<h2>EUREKA — raport z biegu #{wynik['bieg_id']}</h2>",
              f"<p><b>Status:</b> {escape(STATUSY.get(wynik['status'], wynik['status']))}<br>"
              f"<b>Okno dat wydania:</b> {wynik['od']} .. {wynik['do']}<br>"
              f"<b>Przejrzano:</b> {lb['znaleziono']} (już znane: {lb['duplikaty']}, "
              f"odrzucone jako niedotyczące ulg: {lb['odrzucone']}, błędy: {lb['bledy']})</p>"]
    if wynik.get("komunikat"):
        czesci.append(f"<p style='color:#b00'><b>Uwaga:</b> {escape(wynik['komunikat'])}</p>")

    for grupa in ("ulgi", "estonski_cit"):
        wiersze = [w for w in wynik["wiersze"] if w["grupa"] == grupa]
        potw = [w for w in wiersze if w["status"] == "pobrano"]
        weryf = [w for w in wiersze if w["status"] == "do_weryfikacji"]
        czesci.append(f"<h3>{GRUPY[grupa]}: {len(potw)} nowych, {len(weryf)} do weryfikacji</h3>")
        if potw:
            czesci.append("<ul>")
            for w in sorted(potw, key=lambda x: x["data_wydania"], reverse=True)[:40]:
                czesci.append(
                    f"<li><a href='{escape(w['link'])}'>{escape(w['sygnatura'])}</a> "
                    f"({w['data_wydania']}) — <i>{escape(', '.join(w['profile_nazwy']))}</i>"
                    f"<br><small>{escape(w['teza'][:220])}</small></li>")
            if len(potw) > 40:
                czesci.append(f"<li>… i {len(potw) - 40} więcej — pełna lista w załączonym Excelu.</li>")
            czesci.append("</ul>")

    if drive_ok is True and config.DRIVE_LINK:
        czesci.append(f"<p>Pliki PDF i raporty: <a href='{escape(config.DRIVE_LINK)}'>folder na Dysku Google</a></p>")
    elif drive_ok is False:
        czesci.append("<p style='color:#b00'>Wysyłka na Dysk Google nie powiodła się — pliki są na serwerze.</p>")
    czesci.append("<p><small>Pełne listy (z tezami i linkami) w załączonych plikach Excel. "
                  "„Do weryfikacji” = bez PDF, do ręcznej oceny.</small></p>")
    return "\n".join(czesci)
