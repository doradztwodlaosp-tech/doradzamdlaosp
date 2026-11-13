# -*- coding: utf-8 -*-
"""Testy bez sieci. Uruchom z folderu eureka-bot:  python -m unittest discover -s tests -v"""
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
import matcher  # noqa: E402
import przeglad  # noqa: E402
import reports  # noqa: E402
from klasyfikator import bez_zastrzezen, ocen, tekst_z_pdf, wzorzec_frazy  # noqa: E402
from profiles import PROFILE  # noqa: E402
from streszczenie import streszcz  # noqa: E402

CIT = "[CIT] Ustawa o podatku dochodowym od osób prawnych"
PIT = "[PIT] Ustawa o podatku dochodowym od osób fizycznych"
VAT = "[VAT] Ustawa o podatku od towarów i usług"

TEKST_IP_BOX = ("Interpretacja indywidualna – stanowisko prawidłowe\nData publikacji: 2026-11-05T10:00:00\n"
                "Opis stanu faktycznego\nWnioskodawca prowadzi działalność programistyczną i tworzy gra komputerowa.\n"
                "Pytania\n1. Czy dochód z kwalifikowanego prawa może być opodatkowany stawką 5% (IP Box)?\n"
                "2. Czy ewidencja prowadzona przez Wnioskodawcę spełnia wymogi art. 30cb?\n"
                "Państwa stanowisko w sprawie\nTak.\nOcena stanowiska\n"
                "Stanowisko, które przedstawili Państwo we wniosku jest prawidłowe.\n"
                "Uzasadnienie interpretacji indywidualnej\nZgodnie z art. 30ca ust. 1 ustawy o podatku dochodowym "
                "od osób fizycznych dochód z kwalifikowanych praw własności intelektualnej opodatkowany jest stawką 5%. "
                "Art. 30ca ust. 2 wymienia autorskie prawo do programu komputerowego. Tym samym mogą Państwo stosować "
                "preferencyjną stawkę na podstawie art. 30ca.\nPouczenie o funkcji ochronnej interpretacji\n...")
TEKST_SSE = ("Interpretacja indywidualna – stanowisko nieprawidłowe\nOpis stanu faktycznego\nSpółka działa w PSI.\n"
             "Pytanie\nCzy dochody zwolnione należy uwzględnić we wskaźniku art. 24ca?\nOcena stanowiska\n"
             "Stanowisko, które przedstawili Państwo we wniosku jest nieprawidłowe.\nUzasadnienie interpretacji indywidualnej\n"
             "Zgodnie z art. 7 ust. 2 ustawy o CIT, dochodem ze źródła przychodów, z zastrzeżeniem art. 11c, art. 11i, "
             "art. 24a, art. 24b, art. 24ca, art. 24d i art. 24f, jest nadwyżka sumy przychodów. " * 2
             + "Zwolnienie na podstawie art. 17 ust. 1 pkt 34a ustawy o podatku dochodowym od osób prawnych.\n"
             "Informacja o zakresie rozstrzygnięcia\n")


def rek(id_, przepisy=None, teza="", dt="2026-11-02", syg_kod="4010", slowa=None):
    return {"ID_INFORMACJI": id_, "SYG": f"0111-KDIB1-3.{syg_kod}.{id_}.2026.1.AB", "DT_WYD": dt,
            # AUTOR jako lista — tak zwraca prawdziwa EUREKA
            "AUTOR": ["Dyrektor Krajowej Informacji Skarbowej"], "TEZA": teza, "SLOWA_KLUCZOWE": slowa, "ZAGADNIENIA": None, "PRZEPISY": przepisy}


class TestMatcher(unittest.TestCase):
    def test_przepis_potwierdza_dowolny_profil(self):
        d = matcher.ocen_rekord(rek(1, [f"{PIT}-Rozdział 7a-art. 30ca-ust. 2"]), PROFILE["ulga_br"], "prace rozwojowe")
        self.assertEqual([(x.profil_klucz, x.pewnosc) for x in d], [("ip_box_pit", "POTWIERDZONE")])

    def test_vat_z_tematem_odrzucony(self):
        d = matcher.ocen_rekord(rek(2, [f"{VAT}-art. 86"], teza="Odliczenie VAT od działalności badawczo-rozwojowej",
                                    syg_kod="4012"), PROFILE["ulga_br"], "działalność badawczo-rozwojowa")
        self.assertEqual(d, [])

    def test_cit_bez_ulgi_bez_tematu_odrzucony(self):
        d = matcher.ocen_rekord(rek(3, [f"{CIT}-art. 15-ust. 1"], teza="Zaliczenie do kosztów uzyskania przychodów "
                                    "wydatków na najem powierzchni biurowej"), PROFILE["ulga_br"], "art. 18d")
        self.assertEqual(d, [])

    def test_krotka_teza_watpliwosc_na_korzysc_pobrania(self):
        d = matcher.ocen_rekord(rek(3, [f"{CIT}-art. 15-ust. 1"], teza="Koszty najmu"), PROFILE["ulga_br"], "art. 18d")
        self.assertEqual(d[0].pewnosc, "DO_WERYFIKACJI")

    def test_temat_w_tezie_do_weryfikacji(self):
        d = matcher.ocen_rekord(rek(4, [f"{CIT}-art. 15-ust. 1"], teza="Ulga na robotyzację a leasing robota"),
                                PROFILE["ulga_br"], "prace rozwojowe")
        self.assertEqual([(x.profil_klucz, x.pewnosc) for x in d], [("ulga_robotyzacja", "DO_WERYFIKACJI")])

    def test_estonski_potwierdzony_mimo_frazy_wykluczajacej(self):
        d = matcher.ocen_rekord(rek(5, [f"{CIT}-Rozdział 6b-art. 28j-ust. 1"],
                                    teza="Przejście z ryczałtu od przychodów ewidencjonowanych na estoński CIT"),
                                PROFILE["estonski_cit"], "estoński CIT")
        self.assertEqual(d[0].profil_klucz, "estonski_cit")
        self.assertEqual(d[0].pewnosc, "POTWIERDZONE")


class TestTresc(unittest.TestCase):
    def test_odmiana_frazy(self):
        self.assertTrue(wzorzec_frazy("ulga badawczo-rozwojowa").search("z ulgi badawczo-rozwojowej"))

    def test_zastrzezenie_nie_liczy_sie(self):
        self.assertEqual(ocen(TEKST_SSE, "ip_box_cit").art, 0)
        self.assertFalse(ocen(TEKST_SSE, "ip_box_cit").trafna)
        self.assertEqual(bez_zastrzezen("x, z zastrzeżeniem art. 24 ust. 1 pkt 2, art. 30ca oraz art. 30da, jest"), "x,  jest")

    def test_ip_box_potwierdzony_trescia(self):
        o = ocen(TEKST_IP_BOX, "ip_box_pit")
        self.assertTrue(o.trafna, o)
        self.assertFalse(ocen(TEKST_IP_BOX, "ip_box_cit").trafna)

    def test_pdf_uszkodzony(self):
        self.assertEqual(tekst_z_pdf(b"to nie jest pdf"), "")

    def test_streszczenie(self):
        s = streszcz(TEKST_IP_BOX, ["ip_box_pit"])
        self.assertEqual(s.rozstrzygniecie, "prawidłowe")
        self.assertEqual(len(s.pytania), 2)
        self.assertIn("stawką 5%", s.pytania[0])
        self.assertIn("programistyczną", s.stan_faktyczny)
        self.assertIn("prawidłowe", s.ocena)
        self.assertTrue(any("art. 30ca" in z for z in s.kluczowe_zdania))
        self.assertIn("ROZSTRZYGNIĘCIE", s.tekst())
        s2 = streszcz(TEKST_SSE, ["ip_box_cit"])
        self.assertEqual(s2.rozstrzygniecie, "nieprawidłowe")
        self.assertEqual(s2.kluczowe_zdania, [])


class TestZapytanie(unittest.TestCase):
    def test_cialo(self):
        c = eureka_client.zbuduj_cialo("art. 18d", ("2026-10-01", "2026-11-12"))
        self.assertEqual(c["searchQuery"], "art. 18d")
        self.assertEqual(c["filter"], {"DT_WYD_start": "2026-10-01", "DT_WYD_end": "2026-11-12"})

    def test_kazda_fraza_raz(self):
        self.assertEqual(przeglad.frazy_do_wyszukania(["ip_box_cit", "ip_box_pit"])["IP Box"], ["ip_box_cit", "ip_box_pit"])

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


# Symulowana EUREKA: fraza -> rekordy; ID -> treść PDF
API = {
    "art. 18d": [rek(201, [f"{CIT}-Rozdział 4a-art. 18d-ust. 2"], teza="Koszty kwalifikowane B+R")],
    "prace rozwojowe": [rek(202, [f"{PIT}-art. 9"], teza="Preferencyjne opodatkowanie IP Box", syg_kod="4011"),   # DO_WERYF → treść potwierdza
                        rek(203, [f"{VAT}-art. 86"], teza="Odliczenie VAT, działalność badawczo-rozwojowa", syg_kod="4012"),  # odrzucona
                        rek(204, [f"{CIT}-art. 17-ust. 1-pkt 34a"], teza="Zwolnienie SSE a ulga B+R", syg_kod="4010")],  # DO_WERYF → treść nie potwierdza
    "ryczałt od dochodów spółek": [rek(205, [f"{CIT}-Rozdział 6b-art. 28m-ust. 1"], teza="Estoński CIT — ukryte zyski")],
}
PDF = {"201": "krótki tekst", "202": TEKST_IP_BOX, "204": TEKST_SSE,
       "205": "Ryczałt od dochodów spółek, art. 28m ust. 1 updop, ukryte zyski."}


def falszywe_wyszukaj(sesja, fraza, strona, rozmiar, zakres_dat=None, **_):
    wyn = API.get(fraza, [])
    return {"results": wyn[strona * rozmiar:(strona + 1) * rozmiar], "totalHits": len(wyn)}


class TestBieg(unittest.TestCase):
    def setUp(self):
        config.TRYB_PODGLAD = False

    def _bieg(self, pobrane=None):
        def pdf(s, i):
            if pobrane is not None:
                pobrane.append(i)
            return i.encode()
        with mock.patch.object(przeglad, "wyszukaj", falszywe_wyszukaj), \
             mock.patch.object(przeglad, "pobierz_pdf", pdf), \
             mock.patch.object(przeglad, "tekst_z_pdf", lambda b: PDF[b.decode()]), \
             mock.patch.object(przeglad, "pauza", lambda *a, **k: None):
            return przeglad.uruchom_przeglad(date(2026, 10, 1), date(2026, 11, 12))

    def test_1_podglad_nic_nie_pobiera_ani_nie_zapisuje(self):
        config.TRYB_PODGLAD = True
        pobrane = []
        w = self._bieg(pobrane)
        self.assertEqual((w["licznik"]["znaleziono"], w["licznik"]["odrzucone"], w["licznik"]["potwierdzone"] + w["licznik"]["do_weryfikacji"]), (5, 1, 4))
        self.assertEqual(pobrane, [])
        con = sqlite3.connect(config.SCIEZKA_DB)
        self.assertEqual(con.execute("select count(*) from interpretacje").fetchone()[0], 0)
        self.assertEqual(con.execute("select count(*) from biegi").fetchone()[0], 0)

    def test_2_bieg_foldery_raporty_powtorka(self):
        pobrane = []
        w = self._bieg(pobrane)
        l = w["licznik"]
        self.assertEqual((l["znaleziono"], l["odrzucone"], l["potwierdzone"], l["do_weryfikacji"]), (5, 1, 3, 1))
        self.assertNotIn("203", pobrane)
        pdfy = sorted(p.relative_to(TMP).as_posix() for p in Path(TMP).rglob("*.pdf"))
        self.assertEqual(len(pdfy), 4, pdfy)
        self.assertTrue(any(p.startswith("Estoński CIT/2026/") and "ID205" in p for p in pdfy), pdfy)
        self.assertTrue(any(p.startswith("IP Box — PIT") and "ID202" in p for p in pdfy), pdfy)
        self.assertTrue(any(p.startswith("_do_weryfikacji/Ulga B+R") and "ID204" in p for p in pdfy), pdfy)
        w202 = next(x for x in w["wiersze"] if x["id"] == "202")
        self.assertEqual(w202["data_publikacji"], "2026-11-05")
        self.assertIn("ROZSTRZYGNIĘCIE: prawidłowe", w202["streszczenie"])

        sciezki = reports.zapisz_raporty(w)
        self.assertEqual(len(sciezki), 4)
        self.assertTrue(all(s.exists() for s in sciezki))
        self.assertIn("ID202", sciezki[2].read_text(encoding="utf-8"))
        self.assertIn("estoński CIT 1", reports.temat_maila(w))
        html = reports.tresc_maila_html(w, True)
        self.assertIn("ROZSTRZYGNIĘCIE", html)

        w2 = self._bieg()
        self.assertEqual((w2["licznik"]["znaleziono"], w2["licznik"]["duplikaty"]), (1, 4))  # 203 oceniana ponownie,
        self.assertEqual(w2["licznik"]["odrzucone"], 0)                                      # ale nie raportowana drugi raz

    def test_3_blokada_konczy_bieg_czysto(self):
        def blokada(*a, **k):
            raise eureka_client.BlokadaError("HTTP 429")
        with mock.patch.object(przeglad, "wyszukaj", blokada), mock.patch.object(przeglad, "pauza", lambda *a, **k: None):
            w = przeglad.uruchom_przeglad(date(2026, 11, 1), date(2026, 11, 12))
        self.assertEqual(w["status"], "przerwany")
        con = sqlite3.connect(config.SCIEZKA_DB)
        self.assertEqual(con.execute("select status from biegi order by id desc").fetchone()[0], "przerwany")

    def test_4_tylko_raport_z_rejestru(self):
        import main
        w = main.wynik_z_rejestru(1)
        self.assertIsNotNone(w)
        self.assertEqual(len(w["wiersze"]), 5)
        self.assertTrue(all(s.exists() for s in reports.zapisz_raporty(w)))


if __name__ == "__main__":
    unittest.main()
