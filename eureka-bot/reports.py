# -*- coding: utf-8 -*-
"""
reports.py — raporty biegu: Excel + plik ze streszczeniami + treść maila
=========================================================================
Osobno dla ulg i dla estońskiego CIT (zawsze oba, nawet puste):
  _raporty/RAPORT_<data>_bieg<id>_ulgi.xlsx                 arkusze: Podsumowanie |
  Estoński CIT/_raporty/RAPORT_<data>_bieg<id>_estonski_cit.xlsx   Potwierdzone | Do weryfikacji |
                                                                   Odrzucone (bez PDF) | Błędy
  _raporty/STRESZCZENIA_<data>_bieg<id>_ulgi.txt            czytelny tekst: jedna interpretacja
  Estoński CIT/_raporty/STRESZCZENIA_<data>_bieg<id>_estonski_cit.txt   = jeden blok ze streszczeniem
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
    ("Data wydania", 12), ("Data publikacji", 12), ("Sygnatura", 30), ("Profil", 30),
    ("Podstawa prawna profilu", 28), ("Teza", 60), ("Streszczenie", 100), ("Słowa kluczowe", 30),
    ("Dlaczego pobrano / odrzucono", 40), ("Dopasowania (profil: przepis [pewność])", 40),
    ("Fraza wyszukiwania", 24), ("Przepisy (metadane EUREKA)", 50),
    ("Wzm. artykułu w treści", 9), ("Wzm. fraz w treści", 9), ("CIT/PIT", 8), ("VAT", 8),
    ("Link EUREKA", 12), ("Plik", 50),
]
_ZAWIJANE = {4, 5, 6, 7, 8, 9, 10, 12}


def _naglowki(ws, kolumny) -> None:
    for i, (nazwa, szer) in enumerate(kolumny, start=1):
        c = ws.cell(row=1, column=i, value=nazwa)
        c.fill, c.font = _NAGLOWEK, _NAGLOWEK_FONT
        c.alignment = Alignment(vertical="center", wrap_text=True)
        ws.column_dimensions[get_column_letter(i)].width = szer
    ws.freeze_panes = "A2"


def _arkusz(wb: Workbook, tytul: str, wiersze: list[dict], z_ocena: bool) -> None:
    ws = wb.create_sheet(tytul)
    kolumny = KOLUMNY + ([("Twoja ocena (TAK/NIE)", 14)] if z_ocena else [])
    _naglowki(ws, kolumny)
    for n, w in enumerate(sorted(wiersze, key=lambda x: (x["data_wydania"], x["sygnatura"]), reverse=True), start=2):
        wartosci = [w["data_wydania"], w.get("data_publikacji", ""), w["sygnatura"], "\n".join(w["profile_nazwy"]),
                    w["podstawa"], w["teza"], w.get("streszczenie", ""), w.get("slowa_kluczowe", ""),
                    w.get("powod", ""), w.get("dopasowania", ""), ", ".join(w["frazy"]), w.get("przepisy", ""),
                    w["art"], w["fraz"], w["dochodowe"], w["vat"], "otwórz", w["plik"]]
        if z_ocena:
            wartosci.append("")
        for k, v in enumerate(wartosci, start=1):
            ws.cell(row=n, column=k, value=v).alignment = Alignment(vertical="top", wrap_text=k in _ZAWIJANE)
        link = ws.cell(row=n, column=17)
        link.hyperlink, link.font = w["link"], _LINK_FONT
        ws.row_dimensions[n].height = min(400, 15 * max(3, len(w.get("streszczenie", "")) // 90 + 1))
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


def _grupa(wynik: dict, grupa: str) -> dict[str, list[dict]]:
    w = [x for x in wynik["wiersze"] if x["grupa"] == grupa]
    return {"pobrano": [x for x in w if x["status"] == "pobrano"],
            "do_weryfikacji": [x for x in w if x["status"] == "do_weryfikacji"],
            "odrzucona": [x for x in w if x["status"] == "odrzucona"]}


def zapisz_xlsx(wynik: dict, grupa: str, sciezka: Path) -> Path:
    g = _grupa(wynik, grupa)
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
        (f"POTWIERDZONE ({GRUPY[grupa]}) — PDF w folderze profilu", len(g["pobrano"])),
        (f"DO WERYFIKACJI ({GRUPY[grupa]}) — PDF w folderze _do_weryfikacji", len(g["do_weryfikacji"])),
        (f"ODRZUCONE ({GRUPY[grupa]}) — bez pobierania, tylko lista", len(g["odrzucona"])),
        ("", ""),
        ("Cały bieg: zapytań do EUREKI (fraz)", l["zapytania"]),
        ("Cały bieg: nowych interpretacji znalezionych", l["znaleziono"]),
        ("Cały bieg: znalezionych, ale już w rejestrze (pominięte)", l["duplikaty"]),
        ("Cały bieg: błędy", l["bledy"]),
        ("", ""),
        ("Jak czytać", "POTWIERDZONE: przepis ulgi w metadanych EUREKI albo treść PDF potwierdza temat. "
                       "DO WERYFIKACJI: temat tylko w tezie/słowach kluczowych, treść PDF go nie potwierdza — "
                       "plik jest pobrany, oceń sam. ODRZUCONE: ani przepisu ulgi, ani tematu profilu w opisie."),
        ("Progi oceny treści", f"artykuł ≥ {config.PROG_ART}; albo artykuł ≥ 1 i frazy ≥ {config.PROG_FRAZ_Z_ART}; "
                               f"albo frazy ≥ {config.PROG_FRAZ} (gdy CIT/PIT ≥ VAT)"),
    ]
    if wynik.get("komunikat"):
        dane.append(("Uwaga", wynik["komunikat"]))
    ws.column_dimensions["A"].width = 62
    ws.column_dimensions["B"].width = 90
    for n, (k, v) in enumerate(dane, start=1):
        ws.cell(row=n, column=1, value=k).font = Font(bold=True)
        ws.cell(row=n, column=2, value=v).alignment = Alignment(wrap_text=True, vertical="top")

    _arkusz(wb, "Potwierdzone", g["pobrano"], z_ocena=False)
    _arkusz(wb, "Do weryfikacji", g["do_weryfikacji"], z_ocena=True)
    _arkusz(wb, "Odrzucone (bez PDF)", g["odrzucona"], z_ocena=True)
    _arkusz_bledow(wb, wynik["bledy"])
    sciezka.parent.mkdir(parents=True, exist_ok=True)
    wb.save(sciezka)
    return sciezka


def zapisz_streszczenia(wynik: dict, grupa: str, sciezka: Path) -> Path:
    g = _grupa(wynik, grupa)
    linie = [f"STRESZCZENIA — {GRUPY[grupa]} — bieg #{wynik['bieg_id']} ({wynik['od']} .. {wynik['do']})",
             "=" * 100, ""]
    for naglowek, klucz in (("POTWIERDZONE", "pobrano"), ("DO WERYFIKACJI", "do_weryfikacji")):
        linie += [f"##### {naglowek}: {len(g[klucz])} #####", ""]
        for w in sorted(g[klucz], key=lambda x: (x["data_wydania"], x["sygnatura"]), reverse=True):
            linie += [
                f"{w['sygnatura']}   wydana {w['data_wydania']}" + (f", opublikowana {w['data_publikacji']}" if w.get("data_publikacji") else ""),
                f"Profil: {', '.join(w['profile_nazwy'])}",
                f"Teza: {w['teza']}",
                f"Dlaczego: {w.get('powod', '')}",
                f"Plik: {w['plik']}",
                f"Link: {w['link']}",
                "",
                w.get("streszczenie") or "(brak tekstu w PDF)",
                "",
                "-" * 100,
                "",
            ]
    sciezka.parent.mkdir(parents=True, exist_ok=True)
    sciezka.write_text("\n".join(linie), encoding="utf-8")
    return sciezka


def zapisz_raporty(wynik: dict) -> list[Path]:
    przedrostek = f"{date.today().isoformat()}_bieg{wynik['bieg_id']}"
    return [
        zapisz_xlsx(wynik, "ulgi", config.FOLDER_RAPORTOW / f"RAPORT_{przedrostek}_ulgi.xlsx"),
        zapisz_xlsx(wynik, "estonski_cit", config.FOLDER_RAPORTOW_ESTONSKI / f"RAPORT_{przedrostek}_estonski_cit.xlsx"),
        zapisz_streszczenia(wynik, "ulgi", config.FOLDER_RAPORTOW / f"STRESZCZENIA_{przedrostek}_ulgi.txt"),
        zapisz_streszczenia(wynik, "estonski_cit", config.FOLDER_RAPORTOW_ESTONSKI / f"STRESZCZENIA_{przedrostek}_estonski_cit.txt"),
    ]


# ===========================================================================
# MAIL
# ===========================================================================
def temat_maila(wynik: dict, grupy: tuple[str, ...] = ("ulgi", "estonski_cit")) -> str:
    znacznik = "" if wynik["status"] == "sukces" else f"[{STATUSY.get(wynik['status'], wynik['status'])}] "
    czesci = []
    for grupa, nazwa in (("ulgi", "ulgi"), ("estonski_cit", "estoński CIT")):
        if grupa in grupy:
            g = _grupa(wynik, grupa)
            czesci.append(f"{nazwa} {len(g['pobrano'])} potwierdzonych (+{len(g['do_weryfikacji'])} do weryf.)")
    return f"{znacznik}EUREKA {date.today().isoformat()}: " + ", ".join(czesci)


def _blok(w: dict) -> str:
    s = escape(w.get("streszczenie") or "").replace("\n", "<br>")
    return (f"<li style='margin-bottom:14px'><b><a href='{escape(w['link'])}'>{escape(w['sygnatura'])}</a></b> "
            f"({w['data_wydania']}) — <i>{escape(', '.join(w['profile_nazwy']))}</i>"
            f"<br><b>Teza:</b> {escape(w['teza'])}"
            f"<br><small style='color:#555'>{escape(w.get('powod', ''))} · plik: {escape(w['plik'])}</small>"
            f"<div style='margin:6px 0 0 10px;padding:6px 10px;border-left:3px solid #ccc;font-size:90%'>{s}</div></li>")


def tresc_maila_html(wynik: dict, drive_ok: bool | None,
                     grupy: tuple[str, ...] = ("estonski_cit", "ulgi"), drive_link: str | None = None) -> str:
    l = wynik["licznik"]
    tytul = "EUREKA" if len(grupy) > 1 else f"EUREKA — {GRUPY[grupy[0]]}"
    czesci = [f"<h2>{tytul} — raport z biegu #{wynik['bieg_id']}</h2>",
              f"<p><b>Status:</b> {escape(STATUSY.get(wynik['status'], wynik['status']))}<br>"
              f"<b>Okno dat wydania:</b> {wynik['od']} .. {wynik['do']}<br>"]
    if len(grupy) > 1:
        czesci[-1] += (f"<b>Nowych znalezionych:</b> {l['znaleziono']} — potwierdzonych {l['potwierdzone']}, "
                       f"do weryfikacji {l['do_weryfikacji']}, odrzuconych bez pobierania {l['odrzucone']}, "
                       f"błędów {l['bledy']}</p>")
    else:
        g = _grupa(wynik, grupy[0])
        czesci[-1] += (f"<b>{GRUPY[grupy[0]]}:</b> potwierdzonych {len(g['pobrano'])}, do weryfikacji "
                       f"{len(g['do_weryfikacji'])}, odrzuconych bez pobierania {len(g['odrzucona'])}</p>")
    if wynik.get("komunikat"):
        czesci.append(f"<p style='color:#b00'><b>Uwaga:</b> {escape(wynik['komunikat'])}</p>")

    for grupa in grupy:
        g = _grupa(wynik, grupa)
        czesci.append(f"<h3>{GRUPY[grupa]}: {len(g['pobrano'])} potwierdzonych, "
                      f"{len(g['do_weryfikacji'])} do weryfikacji</h3>")
        for naglowek, klucz in (("Potwierdzone", "pobrano"), ("Do weryfikacji (PDF pobrany, oceń sam)", "do_weryfikacji")):
            if g[klucz]:
                czesci.append(f"<h4>{naglowek}</h4><ul style='list-style:none;padding-left:0'>")
                for w in sorted(g[klucz], key=lambda x: x["data_wydania"], reverse=True)[:30]:
                    czesci.append(_blok(w))
                if len(g[klucz]) > 30:
                    czesci.append(f"<li>… i {len(g[klucz]) - 30} więcej — w załączonym Excelu i pliku STRESZCZENIA.</li>")
                czesci.append("</ul>")
        if g["odrzucona"]:
            czesci.append(f"<p><small>Odrzuconych bez pobierania: {len(g['odrzucona'])} — lista w Excelu "
                          f"(arkusz „Odrzucone (bez PDF)”).</small></p>")

    link = drive_link or config.DRIVE_LINK
    if drive_ok is True and link:
        czesci.append(f"<p>Pliki PDF i raporty: <a href='{escape(link)}'>folder na Dysku Google</a></p>")
    elif drive_ok is False:
        czesci.append("<p style='color:#b00'>Wysyłka na Dysk Google nie powiodła się — pliki są na serwerze.</p>")
    return "\n".join(czesci)
