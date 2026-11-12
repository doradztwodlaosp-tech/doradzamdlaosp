# -*- coding: utf-8 -*-
"""Testy bez sieci: ocena treści + pełny bieg na symulowanym API.
Uruchom z folderu eureka-bot:  python -m unittest discover -s tests -v"""
from __future__ import annotations

import os
import sqlite3
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest import mock

TMP = tempfile.mkdtemp(prefix="eureka-test-")
os.environ["EUREKA_BAZA"] = TMP
os.environ["EUREKA_PRZERWA"] = "0"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import config  # noqa: E402
import eureka_client  # noqa: E402
import przeglad  # noqa: E402
import reports  # noqa: E402
from klasyfikator import ocen, profile_z_przepisow, tekst_z_pdf, wzorzec_frazy  # noqa: E402

CIT = "[CIT] Ustawa z dnia 15 lutego 1992 r. o podatku dochodowym od osób prawnych"
VAT = "[VAT] Ustawa z dnia 11 marca 2004 r. o podatku od towarów i usług"

TEKST_VAT_Z_GRA = ("Interpretacja indywidualna w zakresie podatku od towarów i usług. Stawka VAT dla "
                   "sprzedaży licencji. Wnioskodawca prowadzi sprzedaż, m.in. gra komputerowa. Zgodnie z art. 41 "
                   "ustawy o podatku od towarów i usług stawka VAT wynosi 23%. Podatek VAT należy rozliczyć.")
TEKST_IP_BOX = ("Interpretacja w zakresie podatku dochodowego od osób fizycznych. Wnioskodawca tworzy gra "
                "komputerowa i chce stosować preferencyjne opodatkowanie IP Box. Zgodnie z art. 30ca ust. 1 "
                "ustawy o podatku dochodowym od osób fizycznych dochód z kwalifikowanych praw własności "
                "intelektualnej opodatkowany jest stawką 5%. Art. 30ca ust. 2 wymienia autorskie prawo do "
                "programu komputerowego. Ewidencja zgodnie z art. 30cb.")


def rek(id_, przepisy=None, teza="", dt="2026-11-02"):
    return {"ID_INFORMACJI": id_, "SYG": f"0111-KDIB1-3.4010.{id_}.2026.1.AB", "DT_WYD": dt,
            "AUTOR": "Dyrektor KIS", "TEZA": teza, "SLOWA_KLUCZOWE": None, "PRZEPISY": przepisy}


class TestOcena(unittest.TestCase):
    def test_odmiana_frazy(self):
        w = wzorzec_frazy("ulga badawczo-rozwojowa")
        self.assertTrue(w.search("skorzystania z ulgi badawczo-rozwojowej"))
        self.assertTrue(wzorzec_frazy("IP Box").search("opodatkowanie IP Box"))
        self.assertFalse(wzorzec_frazy("IP Box").search("IP Boxer"[:2]))

    def test_vat_z_jedna_wzmianka_odrzucony(self):
        o = ocen(TEKST_VAT_Z_GRA, "ip_box_pit", z_przepisow=False)
        self.assertFalse(o.trafna, o)

    def test_ip_box_trafny(self):
        o = ocen(TEKST_IP_BOX, "ip_box_pit", z_przepisow=False)
        self.assertTrue(o.trafna, o)
        self.assertGreaterEqual(o.art, 3)

    def test_metadane_przesadzaja(self):
        self.assertTrue(ocen("", "ulga_br", z_przepisow=True).trafna)

    def test_profile_z_przepisow(self):
        self.assertEqual(profile_z_przepisow(rek(1, [f"{CIT} - art. 18d ust. 1"])), ["ulga_br"])
        self.assertEqual(profile_z_przepisow(rek(1, [f"{VAT} - art. 18d"])), [])
        self.assertEqual(profile_z_przepisow(rek(1, None)), [])

    def test_18da_nie_lapie_18d(self):
        self.assertEqual(ocen("art. 18da ust. 1, art. 18da", "ulga_br", False).art, 2)
        self.assertEqual(ocen("art. 18da ust. 1", "innowacyjni_pracownicy", False).art, 0)

    def test_estonski_wykluczenie(self):
        o = ocen("ryczałt od przychodów ewidencjonowanych; ukryte zyski ukryte zyski ukryte zyski "
                 "ukryte zyski ukryte zyski", "estonski_cit", False)
        self.assertFalse(o.trafna)

    def test_pdf_tekst(self):
        self.assertEqual(tekst_z_pdf(b"to nie jest pdf"), "")
        self.assertIn("art. 18d", tekst_z_pdf(_maly_pdf("Ulga B+R art. 18d updop")))


def _maly_pdf(tekst: str) -> bytes:
    strumien = f"BT /F1 12 Tf 50 700 Td ({tekst}) Tj ET".encode()
    obiekty = [b"<< /Type /Catalog /Pages 2 0 R >>",
               b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
               b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
               b"/Resources << /Font << /F1 5 0 R >> >> >>",
               b"<< /Length " + str(len(strumien)).encode() + b" >>stream\n" + strumien + b"\nendstream",
               b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    out, pozycje = b"%PDF-1.4\n", []
    for i, o in enumerate(obiekty, 1):
        pozycje.append(len(out))
        out += f"{i} 0 obj\n".encode() + o + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(obiekty) + 1}\n0000000000 65535 f \n".encode()
    out += b"".join(f"{p:010d} 00000 n \n".encode() for p in pozycje)
    out += f"trailer << /Size {len(obiekty) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()
    return out


class TestZapytanie(unittest.TestCase):
    def test_cialo(self):
        c = eureka_client.zbuduj_cialo("art. 18d", ("2026-10-01", "2026-11-12"))
        self.assertEqual(c["searchQuery"], "art. 18d")
        self.assertEqual(c["filter"], {"DT_WYD_start": "2026-10-01", "DT_WYD_end": "2026-11-12"})

    def test_kazda_fraza_raz(self):
        f = przeglad.frazy_do_wyszukania(["ip_box_cit", "ip_box_pit"])
        self.assertEqual(f["IP Box"], ["ip_box_cit", "ip_box_pit"])

    def _odp(self, kod, json_=None, retry=None):
        o = mock.Mock(status_code=kod, headers={"Retry-After": retry} if retry else {})
        o.json.return_value = json_
        return o

    def test_429_czeka_15_min_i_probuje_raz(self):
        sesja = mock.Mock()
        sesja.post.side_effect = [self._odp(429), self._odp(200, {"results": [], "totalHits": 0})]
        with mock.patch.object(eureka_client.time, "sleep") as spij:
            self.assertEqual(eureka_client.wyszukaj(sesja, "x", 0, 50)["totalHits"], 0)
        spij.assert_called_once_with(15 * 60)

    def test_druga_blokada_konczy(self):
        sesja = mock.Mock()
        sesja.post.side_effect = [self._odp(429, retry="120"), self._odp(429)]
        with mock.patch.object(eureka_client.time, "sleep") as spij:
            with self.assertRaises(eureka_client.BlokadaError):
                eureka_client.wyszukaj(sesja, "x", 0, 50)
        spij.assert_called_once_with(120.0)


# Symulowana EUREKA: która fraza zwraca które rekordy + treść PDF-ów
API = {
    "IP Box": [rek(201, teza="IP Box programisty"), rek(202, teza="Stawka VAT na licencje")],
    "gra komputerowa": [rek(202, teza="Stawka VAT na licencje")],
    "art. 18d": [rek(203, [f"{CIT} - art. 18d ust. 2"], teza="Koszty kwalifikowane")],
    "ryczałt od dochodów spółek": [rek(204, teza="Estoński CIT — ukryte zyski")],
}
PDF = {"201": TEKST_IP_BOX, "202": TEKST_VAT_Z_GRA, "203": "krótki tekst",
       "204": "Ryczałt od dochodów spółek, art. 28m ust. 1 updop, ukryte zyski, art. 28m ust. 3, art. 28c."}


def falszywe_wyszukaj(sesja, fraza, strona, rozmiar, zakres_dat=None, **_):
    wyn = API.get(fraza, [])
    return {"results": wyn[strona * rozmiar:(strona + 1) * rozmiar], "totalHits": len(wyn)}


class TestBieg(unittest.TestCase):
    def setUp(self):
        config.TRYB_PODGLAD = False

    def _bieg(self):
        with mock.patch.object(przeglad, "wyszukaj", falszywe_wyszukaj), \
             mock.patch.object(przeglad, "pobierz_pdf", lambda s, i: i.encode()), \
             mock.patch.object(przeglad, "tekst_z_pdf", lambda b: PDF[b.decode()]), \
             mock.patch.object(przeglad, "pauza", lambda *a, **k: None):
            return przeglad.uruchom_przeglad(date(2026, 10, 1), date(2026, 11, 12))

    def test_1_podglad_nic_nie_pobiera_ani_nie_zapisuje(self):
        config.TRYB_PODGLAD = True
        with mock.patch.object(przeglad, "pobierz_pdf", side_effect=AssertionError("pobrał w podglądzie")):
            w = self._bieg()
        self.assertEqual(w["licznik"]["znaleziono"], 4)
        con = sqlite3.connect(config.SCIEZKA_DB)
        self.assertEqual(con.execute("select count(*) from interpretacje").fetchone()[0], 0)
        self.assertEqual(con.execute("select count(*) from biegi").fetchone()[0], 0)

    def test_2_bieg_foldery_raport_powtorka(self):
        w = self._bieg()
        l = w["licznik"]
        self.assertEqual((l["znaleziono"], l["trafne"], l["odrzucone"]), (4, 3, 1))
        pdfy = sorted(p.relative_to(TMP).as_posix() for p in Path(TMP).rglob("*.pdf"))
        self.assertEqual(len(pdfy), 4)
        self.assertTrue(any(p.startswith("Estoński CIT/2026/") for p in pdfy), pdfy)
        self.assertTrue(any(p.startswith("_odrzucone/") and "ID202" in p for p in pdfy), pdfy)
        self.assertTrue(any(p.startswith("IP Box — PIT") and "ID201" in p for p in pdfy), pdfy)

        sciezki = reports.zapisz_raporty(w)
        self.assertTrue(all(s.exists() for s in sciezki))
        self.assertIn("Estoński CIT", str(sciezki[1]))
        self.assertIn("estoński CIT 1 nowych", reports.temat_maila(w))

        w2 = self._bieg()
        self.assertEqual((w2["licznik"]["znaleziono"], w2["licznik"]["duplikaty"]), (0, 4))

    def test_3_blokada_konczy_bieg_czysto(self):
        def blokada(*a, **k):
            raise eureka_client.BlokadaError("HTTP 429")
        with mock.patch.object(przeglad, "wyszukaj", blokada), \
             mock.patch.object(przeglad, "pauza", lambda *a, **k: None):
            w = przeglad.uruchom_przeglad(date(2026, 11, 1), date(2026, 11, 12))
        self.assertEqual(w["status"], "przerwany")
        con = sqlite3.connect(config.SCIEZKA_DB)
        self.assertEqual(con.execute("select status from biegi order by id desc").fetchone()[0], "przerwany")


if __name__ == "__main__":
    unittest.main()
