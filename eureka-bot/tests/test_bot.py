# -*- coding: utf-8 -*-
"""Testy bez sieci: klasyfikacja + pełny bieg na symulowanym API.
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
from klasyfikator import klasyfikuj  # noqa: E402

CIT = "[CIT] Ustawa z dnia 15 lutego 1992 r. o podatku dochodowym od osób prawnych"
PIT = "[PIT] Ustawa z dnia 26 lipca 1991 r. o podatku dochodowym od osób fizycznych"
VAT = "[VAT] Ustawa z dnia 11 marca 2004 r. o podatku od towarów i usług"


def rek(id_, przepisy, teza="", dt="2026-11-02", slowa=None):
    return {"ID_INFORMACJI": id_, "SYG": f"0111-KDIB1-3.4010.{id_}.2026.1.AB", "DT_WYD": dt,
            "AUTOR": "Dyrektor KIS", "TEZA": teza, "SLOWA_KLUCZOWE": slowa, "PRZEPISY": przepisy}


class TestKlasyfikacja(unittest.TestCase):
    def test_br_potwierdzone(self):
        w = klasyfikuj(rek(1, [f"{CIT} - art. 18d ust. 1"]))
        self.assertEqual(w.kategoria, "POTWIERDZONE")
        self.assertEqual(w.profile, ["ulga_br"])

    def test_18da_nie_lapie_18d(self):
        w = klasyfikuj(rek(1, [f"{CIT} - art. 18da ust. 1"]))
        self.assertEqual(w.dopasowania[0].etykieta_artykulu, "art. 18da")

    def test_vat_z_gra_komputerowa_odrzucony(self):
        w = klasyfikuj(rek(2, [f"{VAT} - art. 41 ust. 1"], teza="Stawka VAT dla sprzedaży gra komputerowa"))
        self.assertEqual(w.kategoria, "ODRZUCONE")

    def test_art_18d_w_vat_nie_jest_ulga(self):
        w = klasyfikuj(rek(3, [f"{VAT} - art. 18d"]))
        self.assertEqual(w.kategoria, "ODRZUCONE")

    def test_ip_box_pit_potwierdzone(self):
        w = klasyfikuj(rek(4, [f"{PIT} - art. 30ca ust. 2"]))
        self.assertEqual(w.profile, ["ip_box_pit"])

    def test_estonski_pierwszy(self):
        w = klasyfikuj(rek(5, [f"{CIT} - art. 18d", f"{CIT} - art. 28m ust. 1 pkt 2"]))
        self.assertEqual(w.profil_glowny, "estonski_cit")
        self.assertEqual(set(w.profile), {"estonski_cit", "ulga_br"})

    def test_estonski_wykluczenie_tylko_dla_slabych(self):
        w = klasyfikuj(rek(6, [f"{PIT} - art. 9"], teza="ryczałt od przychodów ewidencjonowanych, estoński CIT"))
        self.assertNotIn("estonski_cit", w.profile)

    def test_cit_bez_ulgi_ale_z_fraza_do_weryfikacji(self):
        w = klasyfikuj(rek(7, [f"{CIT} - art. 15 ust. 1"], teza="Ulga na robotyzację a koszty leasingu"))
        self.assertEqual(w.kategoria, "DO_WERYFIKACJI")
        self.assertIn("ulga_robotyzacja", w.profile)

    def test_cit_bez_ulgi_bez_frazy_odrzucony(self):
        self.assertEqual(klasyfikuj(rek(8, [f"{CIT} - art. 15 ust. 1"], teza="Koszty najmu")).kategoria, "ODRZUCONE")

    def test_nulle_nie_wywracaja(self):
        r = rek(9, None, teza=None)
        r["SLOWA_KLUCZOWE"] = "IP Box"
        self.assertEqual(klasyfikuj(r).kategoria, "DO_WERYFIKACJI")


class TestZapytanie(unittest.TestCase):
    def test_pusta_fraza_bez_searchQuery_i_PRZEPISY(self):
        c = eureka_client.zbuduj_cialo("", ("2026-11-01", "2026-11-07"))
        self.assertNotIn("searchQuery", c)
        self.assertEqual(c["filter"], {"DT_WYD_start": "2026-11-01", "DT_WYD_end": "2026-11-07"})

    def _odp(self, kod, json_=None, retry=None):
        o = mock.Mock(status_code=kod, headers={"Retry-After": retry} if retry else {})
        o.json.return_value = json_
        o.raise_for_status.return_value = None
        return o

    def test_429_czeka_15_min_i_probuje_raz(self):
        sesja = mock.Mock()
        sesja.post.side_effect = [self._odp(429), self._odp(200, {"results": [], "totalHits": 0})]
        with mock.patch.object(eureka_client.time, "sleep") as spij:
            wynik = eureka_client.wyszukaj(sesja, "", 0, 50, ("2026-11-01", "2026-11-01"))
        spij.assert_called_once_with(15 * 60)
        self.assertEqual(wynik["totalHits"], 0)

    def test_druga_blokada_konczy(self):
        sesja = mock.Mock()
        sesja.post.side_effect = [self._odp(429, retry="120"), self._odp(429)]
        with mock.patch.object(eureka_client.time, "sleep") as spij:
            with self.assertRaises(eureka_client.BlokadaError):
                eureka_client.wyszukaj(sesja, "", 0, 50)
        spij.assert_called_once_with(120.0)

    def test_okna(self):
        o = przeglad.okna_dat(date(2026, 10, 1), date(2026, 10, 15), 7)
        self.assertEqual(o, [("2026-10-09", "2026-10-15"), ("2026-10-02", "2026-10-08"), ("2026-10-01", "2026-10-01")])


BAZA_API = [
    rek(101, [f"{CIT} - art. 18d ust. 2"], teza="Koszty kwalifikowane B+R"),
    rek(102, [f"{CIT} - art. 28c pkt 1"], teza="Estoński CIT — warunki"),
    rek(103, [f"{VAT} - art. 43"], teza="Zwolnienie VAT, gra komputerowa"),
    rek(104, [f"{CIT} - art. 12"], teza="IP Box a przychody"),
    rek(105, [f"{PIT} - art. 26h"], teza="Termomodernizacja", dt="2026-10-20"),
]


def falszywe_wyszukaj(sesja, fraza, strona, rozmiar, zakres_dat=None, **_):
    start, koniec = zakres_dat
    pasujace = [r for r in BAZA_API if start <= r["DT_WYD"] <= koniec]
    return {"results": pasujace[strona * rozmiar:(strona + 1) * rozmiar], "totalHits": len(pasujace)}


class TestBieg(unittest.TestCase):
    def setUp(self):
        config.TRYB_PODGLAD = False

    def _bieg(self):
        with mock.patch.object(przeglad, "wyszukaj", falszywe_wyszukaj), \
             mock.patch.object(przeglad, "pobierz_pdf", lambda s, i: b"%PDF-1.4 test"), \
             mock.patch.object(przeglad, "pauza", lambda *a, **k: None):
            return przeglad.uruchom_przeglad(date(2026, 10, 1), date(2026, 11, 12))

    def test_1_podglad_nic_nie_zapisuje(self):
        config.TRYB_PODGLAD = True
        w = self._bieg()
        self.assertEqual(w["licznik"]["nowe"], 3)
        con = sqlite3.connect(config.SCIEZKA_DB)
        self.assertEqual(con.execute("select count(*) from interpretacje").fetchone()[0], 0)
        self.assertEqual(con.execute("select count(*) from biegi").fetchone()[0], 0)
        self.assertFalse(list(Path(TMP).rglob("*.pdf")))

    def test_2_bieg_i_powtorka(self):
        w = self._bieg()
        l = w["licznik"]
        self.assertEqual((l["znaleziono"], l["nowe"], l["do_weryfikacji"], l["odrzucone"]), (5, 3, 1, 1))
        self.assertEqual(w["status"], "sukces")
        pdfy = sorted(p.relative_to(TMP).as_posix() for p in Path(TMP).rglob("*.pdf"))
        self.assertEqual(len(pdfy), 3)
        self.assertTrue(any(p.startswith("Estoński CIT/2026/") for p in pdfy))
        sciezki = reports.zapisz_raporty(w)
        self.assertTrue(all(s.exists() for s in sciezki))
        self.assertIn("Estoński CIT", str(sciezki[1]))
        self.assertIn("estoński CIT 1", reports.temat_maila(w))
        self.assertIn("0111-KDIB1", reports.tresc_maila_html(w, True))

        w2 = self._bieg()
        self.assertEqual(w2["licznik"]["duplikaty"], 5)
        self.assertEqual(w2["licznik"]["nowe"], 0)

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
