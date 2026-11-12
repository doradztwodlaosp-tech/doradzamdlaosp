# -*- coding: utf-8 -*-
"""
reports.py — raporty biegu: Excel (osobno ulgi i estoński CIT) + treść maila
=============================================================================
Każdy bieg daje DWA pliki Excel (zawsze, nawet pusty):
  _raporty/RAPORT_<data>_bieg<id>_ulgi.xlsx
  Estoński CIT/_raporty/RAPORT_<data>_bieg<id>_estonski_cit.xlsx

Arkusze: Podsumowanie | Trafne | Odrzucone | Błędy.
W „Trafne” i „Odrzucone” są liczby wzmianek (artykuł, frazy, CIT/PIT, VAT)
i powód decyzji, a w „Odrzucone” kolumna na Twoją ocenę — to materiał do
kalibracji progów.
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

KOLUMNY = [
    ("Data wydania", 12), ("Data publikacji", 12), ("Sygnatura", 30), ("Profil", 32), ("Podstawa prawna", 30),
    ("Organ", 20), ("Teza", 70), ("Wzmianki artykułu", 10), ("Wzmianki fraz", 10),
    ("CIT/PIT", 9), ("VAT/akcyza", 9), ("Powód decyzji", 34), ("Fraza wyszukiwania", 26),
    ("Link EUREKA", 12), ("Plik", 45), ("Przepisy (metadane EUREKA)", 60),
]


def _naglowki(ws, kolumny) -> None:
    for i, (nazwa, szer) in enumerate(kolumny, start=1):
        c = ws.cell(row=1, column=i, value=nazwa)
        c.fill, c.font = _NAGLOWEK, _NAGLOWEK_FONT
        c.alignment = Alignment(vertical="center", wrap_text=True)
        ws.column_dimensions[get_column_letter(i)].width = szer
    ws.freeze_panes = "A2"


def _arkusz(wb: Workbook, tytul: str, wiersze: list[dict], z_ocena: bool) -> None:
    ws = wb.create_sheet(tytul)
    kolumny = KOLUMNY + ([("Twoja ocena (TAK = powinna być trafna)", 16)] if z_ocena else [])
    _naglowki(ws, kolumny)
    for n, w in enumerate(sorted(wiersze, key=lambda x: (x["data_wydania"], x["sygnatura"]), reverse=True), start=2):
        wartosci = [w["data_wydania"], w.get("data_publikacji", ""), w["sygnatura"], "\n".join(w["profile_nazwy"]),
                    w["podstawa"], w["organ"], w["teza"], w["art"], w["fraz"], w["dochodowe"], w["vat"], w["powod"],
                    ", ".join(w["frazy"]), "otwórz", w["plik"], w.get("przepisy", "")]
        if z_ocena:
            wartosci.append("")
        for k, v in enumerate(wartosci, start=1):
            ws.cell(row=n, column=k, value=v).alignment = Alignment(vertical="top", wrap_text=k in (4, 5, 7, 12, 16))
        link = ws.cell(row=n, column=14)
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


def _grupa(wynik: dict, grupa: str) -> tuple[list[dict], list[dict], list[dict]]:
    """(trafne, odrzucone po ocenie treści, pominięte przed pobraniem)."""
    w = [x for x in wynik["wiersze"] if x["grupa"] == grupa]
    return ([x for x in w if x["trafna"]],
            [x for x in w if not x["trafna"] and x["status"] != "pominieta"],
            [x for x in w if x["status"] == "pominieta"])


def zapisz_xlsx(wynik: dict, grupa: str, sciezka: Path) -> Path:
    trafne, odrzucone, pominiete = _grupa(wynik, grupa)
    l = wynik["licznik"]
    wb = Workbook()
    ws = wb.active
    ws.title = "Podsumowanie"
    dane = [
        ("Raport", f"{GRUPY[grupa]} — bieg #{wynik['bieg_id']}"),
        ("Wygenerowano", date.today().isoformat()),
        ("Status biegu", STATUSY.get(wynik["status"], wynik["status"])),
        ("Okno dat wydania", f"{wynik['od']} .. {wynik['do']}"),
        ("", ""),
        (f"Trafne ({GRUPY[grupa]})", len(trafne)),
        (f"Odrzucone po ocenie treści ({GRUPY[grupa]}) — PDF w folderze _odrzucone", len(odrzucone)),
        (f"Pominięte bez pobierania — przepisy tylko spoza CIT/PIT (np. VAT)", len(pominiete)),
        ("", ""),
        ("Cały bieg: zapytań (fraz)", l["zapytania"]),
        ("Cały bieg: nowych interpretacji znalezionych", l["znaleziono"]),
        ("Cały bieg: znalezionych, ale już w rejestrze", l["duplikaty"]),
        ("Cały bieg: błędy", l["bledy"]),
        ("", ""),
        ("Progi oceny", f"artykuł ≥ {config.PROG_ART}; albo artykuł ≥ 1 i frazy ≥ {config.PROG_FRAZ_Z_ART}; "
                        f"albo frazy ≥ {config.PROG_FRAZ} (gdy CIT/PIT ≥ VAT)"),
    ]
    if wynik.get("komunikat"):
        dane.append(("Uwaga", wynik["komunikat"]))
    ws.column_dimensions["A"].width = 60
    ws.column_dimensions["B"].width = 70
    for n, (k, v) in enumerate(dane, start=1):
        ws.cell(row=n, column=1, value=k).font = Font(bold=True)
        ws.cell(row=n, column=2, value=v)

    _arkusz(wb, "Trafne", trafne, z_ocena=False)
    _arkusz(wb, "Odrzucone", odrzucone, z_ocena=True)
    _arkusz(wb, "Pominięte – inna ustawa", pominiete, z_ocena=True)
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
# MAIL
# ===========================================================================
def temat_maila(wynik: dict) -> str:
    tu, _, _ = _grupa(wynik, "ulgi")
    te, _, _ = _grupa(wynik, "estonski_cit")
    znacznik = "" if wynik["status"] == "sukces" else f"[{STATUSY.get(wynik['status'], wynik['status'])}] "
    return f"{znacznik}EUREKA {date.today().isoformat()}: ulgi {len(tu)} nowych, estoński CIT {len(te)} nowych"


def tresc_maila_html(wynik: dict, drive_ok: bool | None) -> str:
    l = wynik["licznik"]
    czesci = [f"<h2>EUREKA — raport z biegu #{wynik['bieg_id']}</h2>",
              f"<p><b>Status:</b> {escape(STATUSY.get(wynik['status'], wynik['status']))}<br>"
              f"<b>Okno dat wydania:</b> {wynik['od']} .. {wynik['do']}<br>"
              f"<b>Nowych znalezionych:</b> {l['znaleziono']} — trafnych {l['trafne']}, "
              f"odrzuconych po ocenie treści {l['odrzucone']}, pominiętych (tylko VAT/inne ustawy, "
              f"bez pobierania) {l['pominiete']}, błędów {l['bledy']}</p>"]
    if wynik.get("komunikat"):
        czesci.append(f"<p style='color:#b00'><b>Uwaga:</b> {escape(wynik['komunikat'])}</p>")

    for grupa in ("ulgi", "estonski_cit"):
        trafne, odrzucone, _ = _grupa(wynik, grupa)
        czesci.append(f"<h3>{GRUPY[grupa]}: {len(trafne)} nowych</h3>")
        if trafne:
            czesci.append("<ul>")
            for w in sorted(trafne, key=lambda x: x["data_wydania"], reverse=True)[:50]:
                czesci.append(
                    f"<li><a href='{escape(w['link'])}'>{escape(w['sygnatura'])}</a> ({w['data_wydania']}) — "
                    f"<i>{escape(', '.join(w['profile_nazwy']))}</i><br><small>{escape(w['teza'][:220])}</small></li>")
            if len(trafne) > 50:
                czesci.append(f"<li>… i {len(trafne) - 50} więcej — pełna lista w Excelu.</li>")
            czesci.append("</ul>")
        if odrzucone:
            czesci.append(f"<p><small>Odrzuconych: {len(odrzucone)} — lista z powodami w Excelu "
                          f"(arkusz „Odrzucone”), PDF-y w folderze _odrzucone.</small></p>")

    if drive_ok is True and config.DRIVE_LINK:
        czesci.append(f"<p>Pliki PDF i raporty: <a href='{escape(config.DRIVE_LINK)}'>folder na Dysku Google</a></p>")
    elif drive_ok is False:
        czesci.append("<p style='color:#b00'>Wysyłka na Dysk Google nie powiodła się — pliki są na serwerze.</p>")
    return "\n".join(czesci)
